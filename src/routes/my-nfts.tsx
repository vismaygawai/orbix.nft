// src/routes/my-nfts.tsx
import React, { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { MintNFTModal } from "@/components/marketplace/MintNFTModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  decodeVectorToString,
  octasToApt,
  createEntryPayload,
  sanitizeMediaUri,
} from "@/lib/aptosClient";
import { NFT, Offer } from "@/types/marketplace";
import {
  Wallet,
  PlusCircle,
  RefreshCw,
  Loader2,
  Layers,
  Clock,
  XCircle,
  Sparkles,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/my-nfts")({
  head: () => ({
    meta: [
      { title: "My Collection — orbix.nft" },
      { name: "description", content: "Manage your owned ocean artifacts on orbix.nft." },
    ],
  }),
  component: MyNFTsPage,
});

interface OutgoingOfferItem extends Offer {
  offer_index: number;
  nft_name: string;
  nft_uri: string;
}

function MyNFTsPage() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<OutgoingOfferItem[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const [mintOpen, setMintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("owned");

  // 1. Fetch Owned Artifacts
  const fetchMyNFTs = useCallback(async () => {
    if (!connected || !account?.address) {
      setNfts([]);
      return;
    }

    setLoadingNfts(true);
    try {
      const idsResult: any = await aptosClient.view({
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_all_nfts_for_owner`,
        type_arguments: [],
        arguments: [MARKETPLACE_CONTRACT_ADDRESS, account.address, "100", "0"],
      });

      const rawIds: any[] = Array.isArray(idsResult?.[0]) ? idsResult[0] : [];
      if (rawIds.length === 0) {
        setNfts([]);
        return;
      }

      const detailsPromises = rawIds.map(async (idRaw) => {
        const nftId = Number(idRaw);
        const res: any = await aptosClient.view({
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_nft_details`,
          type_arguments: [],
          arguments: [MARKETPLACE_CONTRACT_ADDRESS, nftId.toString()],
        });

        return {
          id: Number(res[0]),
          owner: String(res[1]),
          name: decodeVectorToString(res[2]),
          description: decodeVectorToString(res[3]),
          uri: decodeVectorToString(res[4]),
          price: Number(res[5]),
          for_sale: Boolean(res[6]),
          rarity: Number(res[7]),
        } as NFT;
      });

      const resolved = await Promise.all(detailsPromises);
      setNfts(resolved);
    } catch (err) {
      console.error("Failed to fetch owned NFTs:", err);
      setNfts([]);
    } finally {
      setLoadingNfts(false);
    }
  }, [connected, account?.address]);

  // 2. Fetch Outgoing Offers via get_user_offers + resolve exact offer_index & NFT metadata
  const fetchMyOutgoingOffers = useCallback(async () => {
    if (!connected || !account?.address) {
      setOutgoingOffers([]);
      return;
    }

    setLoadingOffers(true);
    try {
      const userOffersRes: any = await aptosClient.view({
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_user_offers`,
        type_arguments: [],
        arguments: [MARKETPLACE_CONTRACT_ADDRESS, account.address],
      });

      const rawUserOffers: any[] = Array.isArray(userOffersRes?.[0]) ? userOffersRes[0] : [];
      if (rawUserOffers.length === 0) {
        setOutgoingOffers([]);
        return;
      }

      // Extract unique NFT IDs where this user has pending offers
      const uniqueNftIds = Array.from(
        new Set(rawUserOffers.map((o: any) => Number(o.nft_id))),
      );

      const enrichedGroups = await Promise.all(
        uniqueNftIds.map(async (nftId) => {
          const [nftDetailsRes, nftOffersRes]: [any, any] = await Promise.all([
            aptosClient.view({
              function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_nft_details`,
              type_arguments: [],
              arguments: [MARKETPLACE_CONTRACT_ADDRESS, nftId.toString()],
            }),
            aptosClient.view({
              function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_offers_for_nft`,
              type_arguments: [],
              arguments: [MARKETPLACE_CONTRACT_ADDRESS, nftId.toString()],
            }),
          ]);

          const nftName = nftDetailsRes ? decodeVectorToString(nftDetailsRes[2]) : `Object #${nftId}`;
          const nftUri = nftDetailsRes ? decodeVectorToString(nftDetailsRes[4]) : "/videos/nft1.mp4";
          const allOffersForNft: any[] = Array.isArray(nftOffersRes?.[0]) ? nftOffersRes[0] : [];

          const matches: OutgoingOfferItem[] = [];
          allOffersForNft.forEach((o: any, idx: number) => {
            const isUser =
              String(o.buyer).toLowerCase() === account.address.toLowerCase();
            const status = Number(o.status);
            if (isUser && status === 0) {
              matches.push({
                nft_id: nftId,
                buyer: String(o.buyer),
                price: Number(o.price),
                expiration: Number(o.expiration),
                status,
                offer_index: idx,
                nft_name: nftName || `Object #${nftId}`,
                nft_uri: sanitizeMediaUri(nftUri) || "/videos/nft1.mp4",
              });
            }
          });

          return matches;
        }),
      );

      setOutgoingOffers(enrichedGroups.flat());
    } catch (err) {
      console.error("Failed to fetch outgoing offers:", err);
      setOutgoingOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, [connected, account?.address]);

  const handleRefreshAll = useCallback(() => {
    fetchMyNFTs();
    fetchMyOutgoingOffers();
  }, [fetchMyNFTs, fetchMyOutgoingOffers]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  const handleCancelOutgoingOffer = async (offer: OutgoingOfferItem) => {
    if (!connected || !account) return;
    const key = `${offer.nft_id}-${offer.offer_index}`;
    setCancellingKey(key);
    const toastId = toast.loading(
      `Cancelling ${octasToApt(offer.price)} APT offer on ${offer.nft_name}...`,
    );

    try {
      const payload = createEntryPayload("cancel_offer", [
        MARKETPLACE_CONTRACT_ADDRESS,
        offer.nft_id.toString(),
        offer.offer_index.toString(),
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming escrow refund on Aptos...", { id: toastId });
      await aptosClient.waitForTransaction(response.hash || response);

      toast.success(
        `Offer cancelled! ${octasToApt(offer.price)} APT refunded to your wallet.`,
        { id: toastId },
      );
      fetchMyOutgoingOffers();
    } catch (err: any) {
      console.error("Error cancelling offer:", err);
      toast.error(err?.message || "Failed to cancel offer", { id: toastId });
    } finally {
      setCancellingKey(null);
    }
  };

  // Calculate total APT currently locked in outgoing offers
  const totalEscrowedApt = outgoingOffers.reduce(
    (sum, item) => sum + octasToApt(item.price),
    0,
  );

  return (
    <main className="min-h-screen bg-space text-cream py-12 px-4 sm:px-6 md:px-10 lg:px-16">
      <div className="max-w-[1831px] mx-auto space-y-8">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neon block mb-2">
              PERSONAL VAULT & ESCROW
            </span>
            <h1 className="font-grotesk text-4xl sm:text-6xl uppercase tracking-wide text-cream">
              My Collection
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={loadingNfts || loadingOffers || !connected}
              className="liquid-glass text-cream border-white/15 hover:bg-white/10 font-mono text-xs px-4 py-2.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingNfts || loadingOffers ? "animate-spin text-neon" : ""}`}
              />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() => setMintOpen(true)}
              className="orb-button text-cream font-mono text-xs font-bold px-5 py-2.5 h-auto rounded-xl flex items-center gap-2 uppercase tracking-wider cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Mint Artifact</span>
            </Button>
          </div>
        </div>

        {!connected ? (
          <div className="liquid-glass rounded-3xl p-12 border border-white/10 text-center max-w-xl mx-auto my-12 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neon/15 border border-neon/30 flex items-center justify-center mx-auto text-neon">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream">
              Connect Your Wallet
            </h2>
            <p className="font-mono text-xs text-cream/70 leading-relaxed">
              Connect your Aptos wallet or sign in with Google to view your owned ocean artifacts
              and manage your active on-chain offers.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="liquid-glass border border-white/10 p-1 rounded-2xl h-auto w-fit">
                <TabsTrigger
                  value="owned"
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-xl data-[state=active]:bg-neon data-[state=active]:text-cream flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Owned Artifacts ({nfts.length})</span>
                </TabsTrigger>

                <TabsTrigger
                  value="offers"
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-xl data-[state=active]:bg-neon data-[state=active]:text-cream flex items-center gap-2 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>My Outgoing Offers ({outgoingOffers.length})</span>
                </TabsTrigger>
              </TabsList>

              {activeTab === "offers" && outgoingOffers.length > 0 && (
                <div className="liquid-glass px-4 py-2 rounded-xl border border-white/10 font-mono text-xs flex items-center gap-2">
                  <span className="text-cream/60">Total Escrowed in Offers:</span>
                  <span className="text-neon font-bold">{totalEscrowedApt.toFixed(2)} APT</span>
                </div>
              )}
            </div>

            {/* TAB 1: Owned Artifacts */}
            <TabsContent value="owned" className="mt-0">
              {loadingNfts ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-cream/60 font-mono text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-neon" />
                  <span>Loading your ocean artifacts from Aptos...</span>
                </div>
              ) : nfts.length === 0 ? (
                <div className="liquid-glass rounded-3xl p-12 border border-white/10 text-center max-w-lg mx-auto space-y-4">
                  <Layers className="w-8 h-8 text-neon mx-auto opacity-80" />
                  <h3 className="font-grotesk text-2xl uppercase tracking-wide text-cream">
                    No Artifacts Found
                  </h3>
                  <p className="font-mono text-xs text-cream/60 leading-relaxed">
                    You don't own any ocean artifacts yet. Mint a new digital object or explore
                    the marketplace to start your collection.
                  </p>
                  <Button
                    onClick={() => setMintOpen(true)}
                    className="orb-button text-cream font-mono text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Mint Your First Artifact
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nfts.map((nft) => (
                    <NFTCard key={nft.id} nft={nft} onRefresh={handleRefreshAll} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: My Outgoing Offers */}
            <TabsContent value="offers" className="mt-0">
              {loadingOffers ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-cream/60 font-mono text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-neon" />
                  <span>Scanning on-chain offer escrow...</span>
                </div>
              ) : outgoingOffers.length === 0 ? (
                <div className="liquid-glass rounded-3xl p-12 border border-white/10 text-center max-w-lg mx-auto space-y-3">
                  <Tag className="w-8 h-8 text-neon mx-auto opacity-80" />
                  <h3 className="font-grotesk text-2xl uppercase tracking-wide text-cream">
                    No Outgoing Offers
                  </h3>
                  <p className="font-mono text-xs text-cream/60 leading-relaxed">
                    You have no pending escrowed offers across the marketplace. When you make an
                    offer on any artifact, it will appear here so you can track or refund your APT
                    at any time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {outgoingOffers.map((offer) => {
                    const isExpired = Date.now() / 1000 > offer.expiration;
                    const itemKey = `${offer.nft_id}-${offer.offer_index}`;
                    const isCancelling = cancellingKey === itemKey;
                    const isVideo =
                      offer.nft_uri.endsWith(".mp4") ||
                      offer.nft_uri.endsWith(".webm") ||
                      offer.nft_uri.includes("cloudfront.net");

                    return (
                      <div
                        key={itemKey}
                        className="liquid-glass rounded-3xl p-5 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0 border border-white/10 relative">
                            {isVideo ? (
                              <video
                                src={offer.nft_uri}
                                muted
                                loop
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={offer.nft_uri}
                                alt={offer.nft_name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>

                          {/* Title & Status */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-grotesk text-lg uppercase tracking-wide text-cream truncate">
                                {offer.nft_name}
                              </h4>
                              <span className="font-mono text-xs text-cream/40 shrink-0">
                                #{offer.nft_id}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              {isExpired ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                                  Expired • Refund Available
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  Active in Escrow
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Offer Metrics */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-cream/60">Escrowed Offer:</span>
                            <span className="text-neon font-bold text-sm">
                              {octasToApt(offer.price)} APT
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cream/60">Expiration:</span>
                            <span className="text-cream/80 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neon" />
                              {new Date(offer.expiration * 1000).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Cancel & Reclaim Escrow Button */}
                        <Button
                          variant="outline"
                          disabled={isCancelling}
                          onClick={() => handleCancelOutgoingOffer(offer)}
                          className="w-full border-rose-800 bg-rose-950/60 hover:bg-rose-950 text-rose-300 font-mono text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isCancelling ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <span>
                            {isCancelling
                              ? "Refunding APT..."
                              : `Cancel Offer & Reclaim ${octasToApt(offer.price)} APT`}
                          </span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <MintNFTModal open={mintOpen} onOpenChange={setMintOpen} onSuccess={handleRefreshAll} />
    </main>
  );
}
