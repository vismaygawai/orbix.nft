import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  PETRA_SELLER_WALLET,
  octasToApt,
  truncateAddress,
  getRarityInfo,
  createEntryPayload,
  resolveMediaUrl,
  isVideoUri,
  isSameAddress,
  isMarketplaceContractAvailable,
} from "@/lib/aptosClient";
import { recordNFTPurchase } from "@/lib/curatedNFTs";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { NFT } from "@/types/marketplace";
import { MakeOfferModal } from "./MakeOfferModal";
import { OffersModal } from "./OffersModal";
import { CreateAuctionModal } from "./CreateAuctionModal";
import { ListNFTModal } from "./ListNFTModal";
import { TransferNFTModal } from "./TransferNFTModal";
import { ShoppingBag, Tag, Gavel, Layers, Loader2, Send } from "lucide-react";

interface Props {
  nft: NFT;
  onRefresh?: (() => void) | undefined;
}

function LazyCardMedia({ src, alt, isVideo }: { src: string; alt: string; isVideo: boolean }) {
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

export function NFTCard({ nft, onRefresh }: Props) {
  const { account, connected } = useWallet();
  const { executeTx, isSubmitting: buying } = useMarketplaceTx();

  const [offerOpen, setOfferOpen] = useState(false);
  const [offersListOpen, setOffersListOpen] = useState(false);
  const [auctionOpen, setAuctionOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const walletAddress = account?.address ? String(account.address) : "";
  const isOwner = Boolean(walletAddress && nft.owner && isSameAddress(walletAddress, nft.owner));
  const rarityInfo = getRarityInfo(nft.rarity);
  const priceApt = octasToApt(nft.price);

  const handleBuyNow = async () => {
    if (!connected) {
      toast.error("Wallet Not Connected", {
        description: "Please connect your Petra or Aptos wallet to buy this artifact.",
      });
      return;
    }

    if (isOwner) {
      toast.error("You already own this artifact.");
      return;
    }

    // Direct seller recipient address (Petra wallet)
    const sellerRecipient = nft.owner || PETRA_SELLER_WALLET;
    const priceLabel = nft.usdPrice ? `$${nft.usdPrice} (${priceApt} APT)` : `${priceApt} APT`;

    // Check if on-chain Move contract is deployed and initialized
    const contractAvailable = await isMarketplaceContractAvailable();

    let payload: any;
    if (contractAvailable) {
      payload = createEntryPayload("purchase_nft", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nft.id.toString(),
        nft.price.toString(),
      ]);
    } else {
      // Native Aptos transfer directly to seller's Petra wallet
      payload = {
        data: {
          function: "0x1::aptos_account::transfer",
          typeArguments: [],
          functionArguments: [sellerRecipient, nft.price.toString()],
        },
      };
    }

    await executeTx(payload, {
      title: `Purchasing ${nft.name || "Artifact"}`,
      description: `Transferring ${priceLabel} to ${truncateAddress(sellerRecipient)} (Petra Wallet)...`,
      successTitle: "Purchase Successful!",
      successDescription: `Transferred ${priceApt} APT ($${nft.usdPrice || 0}) directly to ${truncateAddress(sellerRecipient)}. You now own ${nft.name || `Artifact #${nft.id}`}!`,
      onSuccess: (txHash) => {
        recordNFTPurchase(nft.id, walletAddress, txHash);
        onRefresh?.();
        window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
      },
    });
  };

  const safeUri = resolveMediaUrl(nft.uri) || "/videos/nft1.mp4";
  const isVideo = isVideoUri(safeUri);

  return (
    <>
      <article className="liquid-glass rounded-3xl p-4 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between group">
        <div>
          {/* Media Container */}
          <div className="relative pb-[100%] rounded-2xl overflow-hidden bg-white/5 mb-4">
            <LazyCardMedia src={safeUri} alt={nft.name} isVideo={isVideo} />

            {/* Rarity & Status Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md ${rarityInfo.badgeClass}`}
              >
                {rarityInfo.label}
                {nft.name === "Orbix" || nft.rarity === 4
                  ? " • Rarest • Main"
                  : nft.name === "Orix"
                    ? " • Secondary"
                    : ""}
              </span>

              {nft.in_auction ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-amber-950/80 text-amber-300 border border-amber-700/60 backdrop-blur-md">
                  In Auction
                </span>
              ) : nft.for_sale ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 backdrop-blur-md">
                  For Sale
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-neutral-900/80 text-neutral-400 border border-neutral-700/60 backdrop-blur-md">
                  Not Listed
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-grotesk text-xl uppercase tracking-wide text-cream truncate">
                {nft.name || `Object #${nft.id}`}
              </h3>
              <span className="text-xs font-mono text-cream/40">#{nft.id}</span>
            </div>

            <p className="text-xs font-mono text-cream/70 line-clamp-2 min-h-[32px]">
              {nft.description || "A digital ocean artifact fixed beyond tides and time."}
            </p>

            <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-white/5">
              <span className="text-cream/50">Owner:</span>
              <span className="text-cream font-medium" title={nft.owner}>
                {isOwner ? "You (Connected)" : truncateAddress(nft.owner)}
              </span>
            </div>

            {nft.for_sale && (
              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-cream/50">Price:</span>
                <div className="flex items-baseline gap-1.5">
                  {nft.usdPrice ? (
                    <>
                      <span className="text-cream font-bold text-base">${nft.usdPrice}</span>
                      <span className="text-neon font-bold text-xs">({priceApt} APT)</span>
                    </>
                  ) : (
                    <span className="text-neon font-bold text-base">{priceApt} APT</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          {nft.for_sale && !isOwner && !nft.in_auction && (
            <Button
              onClick={handleBuyNow}
              disabled={buying}
              className="w-full orb-button text-cream font-mono text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              {buying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5" />
              )}
              <span>
                Buy Now{" "}
                {nft.usdPrice ? `($${nft.usdPrice} / ${priceApt} APT)` : `(${priceApt} APT)`}
              </span>
            </Button>
          )}

          {isOwner && nft.for_sale && (
            <div className="py-1 text-center font-mono text-xs text-neon/90 bg-neon/10 rounded-xl border border-neon/20">
              Owned by You • Listed for{" "}
              {nft.usdPrice ? `$${nft.usdPrice} (${priceApt} APT)` : `${priceApt} APT`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!isOwner ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOfferOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl"
              >
                <Tag className="w-3 h-3 text-neon" />
                <span>Make Offer</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(nft.in_auction)}
                onClick={() => setListOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl disabled:opacity-50"
              >
                <ShoppingBag className="w-3 h-3 text-neon" />
                <span>{nft.for_sale ? "Manage Sale" : "List for Sale"}</span>
              </Button>
            )}

            {isOwner ? (
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(nft.in_auction)}
                onClick={() => setAuctionOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl disabled:opacity-50"
              >
                <Gavel className="w-3 h-3 text-neon" />
                <span>{nft.in_auction ? "In Auction" : "Auction"}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffersListOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl"
              >
                <Layers className="w-3 h-3 text-neon" />
                <span>Offers</span>
              </Button>
            )}
          </div>

          {isOwner && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOffersListOpen(true)}
                className="text-cream/70 hover:text-cream hover:bg-white/5 font-mono text-[11px] h-7 flex items-center justify-center gap-1 rounded-lg"
              >
                <Layers className="w-3 h-3 text-neon" />
                <span>Offers</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={Boolean(nft.in_auction)}
                onClick={() => setTransferOpen(true)}
                className="text-cream/70 hover:text-cream hover:bg-white/5 font-mono text-[11px] h-7 flex items-center justify-center gap-1 rounded-lg disabled:opacity-50"
              >
                <Send className="w-3 h-3 text-neon" />
                <span>Transfer</span>
              </Button>
            </div>
          )}
        </div>
      </article>

      <MakeOfferModal
        open={offerOpen}
        onOpenChange={setOfferOpen}
        nftId={nft.id}
        onSuccess={onRefresh}
      />

      <OffersModal
        open={offersListOpen}
        onOpenChange={setOffersListOpen}
        nftId={nft.id}
        isOwner={Boolean(isOwner)}
        onSuccess={onRefresh}
      />

      <CreateAuctionModal
        open={auctionOpen}
        onOpenChange={setAuctionOpen}
        nftId={nft.id}
        onSuccess={onRefresh}
      />

      <ListNFTModal
        open={listOpen}
        onOpenChange={setListOpen}
        nftId={nft.id}
        isAlreadyForSale={nft.for_sale}
        currentPriceApt={priceApt}
        onSuccess={onRefresh}
      />

      <TransferNFTModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        nftId={nft.id}
        onSuccess={onRefresh}
      />
    </>
  );
}
