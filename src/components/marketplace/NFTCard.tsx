import React, { useState } from "react";
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
  isValidAptosAddress,
  isMarketplaceContractAvailable,
} from "@/lib/aptosClient";
import { INITIAL_HERO_NFTS, recordNFTPurchase } from "@/lib/curatedNFTs";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { NFT } from "@/types/marketplace";
import { LazyMedia } from "./LazyMedia";
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
  const isOnChainNft = nft.onChain !== false;
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

    const sellerRecipient = isValidAptosAddress(nft.owner) ? nft.owner : PETRA_SELLER_WALLET;
    const canonicalPrice = !isOnChainNft
      ? (INITIAL_HERO_NFTS.find((item) => item.id === nft.id)?.price ?? nft.price)
      : nft.price;

    if (!Number.isFinite(canonicalPrice) || canonicalPrice <= 0) {
      toast.error("Invalid Listing Price", {
        description: "This artifact has an invalid price configuration.",
      });
      return;
    }

    const canonicalApt = octasToApt(canonicalPrice);
    const priceLabel = nft.usdPrice
      ? `$${nft.usdPrice} (${canonicalApt} APT)`
      : `${canonicalApt} APT`;

    const contractAvailable = isOnChainNft ? await isMarketplaceContractAvailable() : false;

    let payload: any;
    if (isOnChainNft && contractAvailable) {
      payload = createEntryPayload("purchase_nft", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nft.id.toString(),
        canonicalPrice.toString(),
      ]);
    } else {
      // Native Aptos transfer directly to seller's Petra wallet for curated showcase artifacts
      payload = {
        data: {
          function: "0x1::aptos_account::transfer",
          typeArguments: [],
          functionArguments: [sellerRecipient, canonicalPrice.toString()],
        },
      };
    }

    await executeTx(payload, {
      title: `Purchasing ${nft.name || "Artifact"}`,
      description: `Transferring ${priceLabel} to ${truncateAddress(sellerRecipient)}...`,
      successTitle: "Purchase Successful!",
      successDescription: `Transferred ${canonicalApt} APT to ${truncateAddress(sellerRecipient)}. You now own ${nft.name || `Artifact #${nft.id}`}!`,
      onSuccess: (txHash) => {
        if (!isOnChainNft) {
          recordNFTPurchase(nft.id, walletAddress, txHash);
        }
        onRefresh?.();
      },
    });
  };

  const safeUri = resolveMediaUrl(nft.uri) || "/videos/nft1_poster.webp";
  const isVideo = isVideoUri(safeUri);

  return (
    <>
      <article className="liquid-glass rounded-3xl p-4 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between group">
        <div>
          {/* Media Container */}
          <div className="relative pb-[100%] rounded-2xl overflow-hidden bg-white/5 mb-4">
            <LazyMedia src={safeUri} alt={nft.name} isVideo={isVideo} />

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
                    : nft.name === "Orby"
                      ? " • Uncommon"
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
                disabled={!isOnChainNft}
                title={
                  !isOnChainNft
                    ? "Escrowed offers are available for artifacts minted on-chain"
                    : undefined
                }
                onClick={() => setOfferOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl disabled:opacity-50"
              >
                <Tag className="w-3 h-3 text-neon" />
                <span>Make Offer</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(nft.in_auction) || !isOnChainNft}
                title={
                  !isOnChainNft
                    ? "On-chain listing controls are available for artifacts minted on-chain"
                    : undefined
                }
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
                disabled={Boolean(nft.in_auction) || !isOnChainNft}
                title={
                  !isOnChainNft
                    ? "On-chain auctions are available for artifacts minted on-chain"
                    : undefined
                }
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
                disabled={!isOnChainNft}
                title={
                  !isOnChainNft
                    ? "On-chain offers are available for artifacts minted on-chain"
                    : undefined
                }
                onClick={() => setOffersListOpen(true)}
                className="liquid-glass text-cream border-white/10 hover:bg-white/10 font-mono text-xs flex items-center justify-center gap-1 rounded-xl disabled:opacity-50"
              >
                <Layers className="w-3 h-3 text-neon" />
                <span>Offers</span>
              </Button>
            )}
          </div>

          {isOwner && isOnChainNft && (
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
