import React, { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  octasToApt,
  truncateAddress,
  getRarityInfo,
  createEntryPayload,
  sanitizeMediaUri,
} from "@/lib/aptosClient";
import { NFT } from "@/types/marketplace";
import { MakeOfferModal } from "./MakeOfferModal";
import { OffersModal } from "./OffersModal";
import { CreateAuctionModal } from "./CreateAuctionModal";
import { ListNFTModal } from "./ListNFTModal";
import { ShoppingBag, Tag, Gavel, Layers, Loader2 } from "lucide-react";

interface Props {
  nft: NFT;
  onRefresh?: (() => void) | undefined;
}

export function NFTCard({ nft, onRefresh }: Props) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [offerOpen, setOfferOpen] = useState(false);
  const [offersListOpen, setOffersListOpen] = useState(false);
  const [auctionOpen, setAuctionOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [buying, setBuying] = useState(false);

  const isOwner =
    account?.address && nft.owner && account.address.toLowerCase() === nft.owner.toLowerCase();
  const rarityInfo = getRarityInfo(nft.rarity);
  const priceApt = octasToApt(nft.price);

  const handleBuyNow = async () => {
    if (!connected || !account) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (isOwner) {
      toast.error("You already own this NFT");
      return;
    }

    setBuying(true);
    const toastId = toast.loading(`Purchasing ${nft.name} for ${priceApt} APT...`);

    try {
      const payload = createEntryPayload("purchase_nft", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nft.id.toString(),
        nft.price.toString(),
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming purchase on Aptos...", { id: toastId });
      await aptosClient.waitForTransaction(response.hash || response);

      toast.success(`Congratulations! You now own ${nft.name}.`, { id: toastId });
      onRefresh?.();
    } catch (err: any) {
      console.error("Purchase error:", err);
      toast.error(err?.message || "Failed to complete purchase", { id: toastId });
    } finally {
      setBuying(false);
    }
  };

  const safeUri = sanitizeMediaUri(nft.uri) || "/videos/nft1.mp4";
  const isVideo =
    safeUri.endsWith(".mp4") || safeUri.endsWith(".webm") || safeUri.includes("cloudfront.net");

  return (
    <>
      <article className="liquid-glass rounded-3xl p-4 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between group">
        <div>
          {/* Media Container */}
          <div className="relative pb-[100%] rounded-2xl overflow-hidden bg-white/5 mb-4">
            {isVideo ? (
              <video
                src={safeUri}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={safeUri}
                alt={nft.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
                }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}

            {/* Rarity & Status Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md ${rarityInfo.badgeClass}`}
              >
                {rarityInfo.label}
              </span>

              {nft.for_sale ? (
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
              <span className="text-cream font-medium">{truncateAddress(nft.owner)}</span>
            </div>

            {nft.for_sale && (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cream/50">Price:</span>
                <span className="text-neon font-bold text-base">{priceApt} APT</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          {nft.for_sale && !isOwner && (
            <Button
              onClick={handleBuyNow}
              disabled={buying || !connected}
              className="w-full orb-button text-cream font-mono text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
            >
              {buying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5" />
              )}
              <span>Buy Now ({priceApt} APT)</span>
            </Button>
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
                onClick={() => setListOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl"
              >
                <ShoppingBag className="w-3 h-3 text-neon" />
                <span>{nft.for_sale ? "Edit Price" : "List for Sale"}</span>
              </Button>
            )}

            {isOwner ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuctionOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl"
              >
                <Gavel className="w-3 h-3 text-neon" />
                <span>Auction</span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOffersListOpen(true)}
              className="w-full text-cream/70 hover:text-cream hover:bg-white/5 font-mono text-[11px] h-7 flex items-center justify-center gap-1"
            >
              <Layers className="w-3 h-3" />
              <span>Review Incoming Offers</span>
            </Button>
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
    </>
  );
}
