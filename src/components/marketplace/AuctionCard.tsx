import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  octasToApt,
  aptToOctas,
  truncateAddress,
  createEntryPayload,
  normalizeAddress,
  isSameAddress,
  decodeVectorOrHexToString,
  resolveMediaUrl,
  isVideoUri,
  getRarityInfo,
  getNowSeconds,
} from "@/lib/aptosClient";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { Auction } from "@/types/marketplace";
import { Clock, Gavel, Loader2, Award, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  auction: Auction;
  onBidPlaced?: () => void;
}

interface NFTMetadata {
  name: string;
  description: string;
  uri: string;
  rarity: number;
}

function LazyAuctionMedia({ src, alt, isVideo }: { src: string; alt: string; isVideo: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {isVideo ? (
        isVisible ? (
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-navy-900/60 animate-pulse" />
        )
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
    </div>
  );
}

export function AuctionCard({ auction, onBidPlaced }: Props) {
  const { account, connected } = useWallet();
  const { executeTx, isSubmitting } = useMarketplaceTx();
  const walletAddress = account?.address ? String(account.address) : "";
  const [nftDetails, setNftDetails] = useState<NFTMetadata | null>(null);
  const [bidInput, setBidInput] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const detailRes: any = await aptosClient.view({
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_nft_details`,
          type_arguments: [],
          arguments: [MARKETPLACE_CONTRACT_ADDRESS, auction.nft_id.toString()],
        });
        if (Array.isArray(detailRes) && isMounted) {
          setNftDetails({
            name: decodeVectorOrHexToString(detailRes[2]),
            description: decodeVectorOrHexToString(detailRes[3]),
            uri: decodeVectorOrHexToString(detailRes[4]),
            rarity: parseInt(detailRes[7], 10),
          });
        }
      } catch (err) {
        console.warn(`Could not load details for auction NFT #${auction.nft_id}:`, err);
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [auction.nft_id]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = getNowSeconds();
      const remaining = auction.end_time - now;

      if (remaining <= 0) {
        setTimeLeft("Auction Ended");
        setIsEnded(true);
      } else {
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = remaining % 60;
        setTimeLeft(`${h}h ${m}m ${s}s`);
        setIsEnded(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction.end_time]);

  const hasBids = Boolean(
    auction.highest_bidder && normalizeAddress(auction.highest_bidder) !== "0x0",
  );

  const currentBidApt = octasToApt(auction.current_bid);
  const startPriceApt = octasToApt(auction.start_price);
  const minBidApt = hasBids ? Number((currentBidApt + 0.0001).toFixed(4)) : startPriceApt;

  const isHighestBidder = Boolean(
    walletAddress && hasBids && isSameAddress(walletAddress, auction.highest_bidder),
  );

  const isSeller = Boolean(
    walletAddress && auction.seller && isSameAddress(walletAddress, auction.seller),
  );

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !walletAddress) {
      toast.error("Please connect your wallet to place a bid");
      return;
    }

    if (isSeller) {
      toast.error("You cannot bid on your own auction");
      return;
    }

    if (isHighestBidder) {
      toast.error("You are already the highest bidder");
      return;
    }

    const amount = parseFloat(bidInput);
    if (isNaN(amount) || (hasBids ? amount <= currentBidApt : amount < startPriceApt)) {
      toast.error(
        hasBids
          ? `Bid must be strictly higher than current bid (${currentBidApt} APT)`
          : `First bid must be at least ${startPriceApt} APT`,
      );
      return;
    }

    const octas = aptToOctas(bidInput);
    if (octas <= 0) {
      toast.error("Please enter a valid bid amount");
      return;
    }

    const payload = createEntryPayload("place_bid", [
      MARKETPLACE_CONTRACT_ADDRESS,
      auction.nft_id.toString(),
      octas.toString(),
    ]);

    const txHash = await executeTx(payload, {
      title: `Placing Bid on #${auction.nft_id}`,
      description: `Escrowing ${amount} APT for highest bid...`,
      successTitle: "Bid Accepted!",
      successDescription: `You are now the highest bidder at ${amount} APT.`,
      onSuccess: () => {
        setBidInput("");
        onBidPlaced?.();
      },
    });

    if (txHash && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
    }
  };

  const handleFinalizeAuction = async () => {
    if (!connected || !walletAddress) {
      toast.error("Please connect your wallet to settle this auction");
      return;
    }

    const isEarlyCancel = !hasBids && !isEnded;
    const payload = createEntryPayload("finalize_auction", [
      MARKETPLACE_CONTRACT_ADDRESS,
      auction.nft_id.toString(),
    ]);

    await executeTx(payload, {
      title: isEarlyCancel
        ? `Cancelling Auction for #${auction.nft_id}`
        : `Settling Auction for #${auction.nft_id}`,
      description: isEarlyCancel
        ? "Withdrawing artifact from auction..."
        : "Transferring artifact and disbursing escrowed proceeds...",
      successTitle: isEarlyCancel ? "Auction Cancelled" : "Auction Settled!",
      successDescription: isEarlyCancel
        ? "Artifact restored to your collection."
        : hasBids
          ? "Artifact transferred and proceeds disbursed."
          : "Auction concluded with no bids.",
      onSuccess: () => {
        onBidPlaced?.();
      },
    });
  };

  const safeUri = nftDetails?.uri ? resolveMediaUrl(nftDetails.uri) : "/videos/nft1.mp4";
  const isVideo = isVideoUri(safeUri);
  const rarityInfo = getRarityInfo(nftDetails ? nftDetails.rarity : 1);
  const displayName = nftDetails?.name || `Object #${auction.nft_id}`;

  return (
    <article className="liquid-glass rounded-3xl p-4 sm:p-5 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between group">
      <div>
        {/* Media Preview */}
        <div className="relative pb-[100%] rounded-2xl overflow-hidden bg-white/5 mb-4 group">
          <LazyAuctionMedia src={safeUri} alt={displayName} isVideo={isVideo} />

          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md ${rarityInfo.badgeClass}`}
            >
              {rarityInfo.label}
            </span>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md ${
                isEnded
                  ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                  : "bg-neon/15 text-neon border-neon/30"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{timeLeft}</span>
            </span>
          </div>
        </div>

        {/* Title & NFT ID */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-grotesk text-xl uppercase tracking-wider text-cream truncate">
            {displayName}
          </h3>
          <span className="font-mono text-xs text-cream/40 shrink-0">#{auction.nft_id}</span>
        </div>

        {/* Bidding Stats Box */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/5 mb-4 text-xs font-mono">
          <div className="flex justify-between items-center text-cream/70">
            <span>Starting Price:</span>
            <span className="text-cream">{startPriceApt} APT</span>
          </div>

          <div className="flex justify-between items-center text-cream/70">
            <span>{hasBids ? "Current Highest Bid:" : "Minimum Bid:"}</span>
            <span className="text-neon font-bold text-sm">{currentBidApt} APT</span>
          </div>

          <div className="flex justify-between items-center text-cream/70">
            <span>Highest Bidder:</span>
            <span className="text-cream font-medium">
              {hasBids ? truncateAddress(auction.highest_bidder) : "No bids yet"}
            </span>
          </div>

          {isHighestBidder && (
            <div className="mt-2 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800">
              <Award className="w-4 h-4" /> You hold the highest bid
            </div>
          )}
        </div>
      </div>

      {isEnded ? (
        <div className="mt-2 space-y-2">
          <Button
            type="button"
            disabled={isSubmitting || !connected}
            onClick={handleFinalizeAuction}
            className="w-full orb-button text-cream font-mono text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isSubmitting ? "Settling..." : "Finalize & Settle Auction"}</span>
          </Button>
        </div>
      ) : isSeller && !hasBids ? (
        <div className="mt-2 space-y-2">
          <Button
            type="button"
            disabled={isSubmitting || !connected}
            onClick={handleFinalizeAuction}
            className="w-full border-rose-800 bg-rose-950/60 hover:bg-rose-950 text-rose-300 font-mono text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{isSubmitting ? "Cancelling..." : "Cancel Auction (No Bids)"}</span>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleBid} className="space-y-2 mt-2">
          <div className="flex flex-col min-[380px]:flex-row gap-2">
            <Input
              type="number"
              step="any"
              min={minBidApt}
              placeholder={`Min ${minBidApt} APT`}
              value={bidInput}
              onChange={(e) => setBidInput(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono text-xs flex-1"
              required
            />
            <Button
              type="submit"
              disabled={Boolean(isSubmitting || !connected || isHighestBidder || isSeller)}
              className="orb-button text-cream font-mono text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap w-full min-[380px]:w-auto cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Gavel className="w-3.5 h-3.5" />
              )}
              <span>Place Bid</span>
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}
