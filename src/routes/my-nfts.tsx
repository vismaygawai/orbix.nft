import React, { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { MintNFTModal } from "@/components/marketplace/MintNFTModal";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  decodeVectorToString,
  octasToApt,
  createEntryPayload,
  resolveMediaUrl,
  isVideoUri,
  truncateAddress,
  isSameAddress,
  getNowSeconds,
} from "@/lib/aptosClient";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { NFT, Offer } from "@/types/marketplace";
import { getOwnedCuratedNFTs } from "@/lib/curatedNFTs";
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
  Inbox,
  CheckCircle,
  AlertCircle,
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

interface IncomingOfferItem extends Offer {
  offer_index: number;
  nft_name: string;
  nft_uri: string;
}

function formatApt(amount: number): string {
  if (amount === 0) return "0 APT";
  if (amount < 0.0001) return "< 0.0001 APT";
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} APT`;
}

function MyNFTsPage() {
  const { account, connected } = useWallet();
  const { executeTx, isSubmitting } = useMarketplaceTx();
  const walletAddress = account?.address ? String(account.address) : "";

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<OutgoingOfferItem[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<IncomingOfferItem[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const [mintOpen, setMintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("owned");

  // 1. Fetch Owned Artifacts
  const fetchMyNFTs = useCallback(async () => {
    if (!connected || !walletAddress) {
      setNfts([]);
      return;
    }

    setLoadingNfts(true);
    setHasError(false);
    try {
      // 1. Get curated/locally owned artifacts for this wallet (e.g. 0xde4c... owns hero NFTs)
      const localOwned = getOwnedCuratedNFTs(walletAddress);

      // 2. Query on-chain safe view
      let onChainOwned: NFT[] = [];
      try {
        const idsResult: any = await aptosClient
          .view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_all_nfts_for_owner`,
            type_arguments: [],
            arguments: [MARKETPLACE_CONTRACT_ADDRESS, walletAddress, "100", "0"],
          })
          .catch(() => [[]]);

        const rawIds: any[] = Array.isArray(idsResult?.[0]) ? idsResult[0] : [];
        if (rawIds.length > 0) {
          const detailsPromises = rawIds.map(async (idRaw) => {
            try {
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
            } catch (err) {
              console.warn(`Failed to fetch NFT #${idRaw}:`, err);
              return null;
            }
          });

          onChainOwned = (await Promise.all(detailsPromises)).filter((x): x is NFT => x !== null);
        }
      } catch (chainErr) {
        console.warn("Could not query on-chain owned artifacts:", chainErr);
      }

      // Merge on-chain with local owned
      const onChainIds = new Set(onChainOwned.map((n) => n.id));
      const merged = [...onChainOwned, ...localOwned.filter((n) => !onChainIds.has(n.id))];
      setNfts(merged);
    } catch (err) {
      console.error("Failed to fetch owned NFTs:", err);
      const localOwned = getOwnedCuratedNFTs(walletAddress);
      setNfts(localOwned);
      setHasError(false);
    } finally {
      setLoadingNfts(false);
    }
  }, [connected, walletAddress]);

  // 2. Fetch Outgoing Offers via get_user_offers
  const fetchMyOutgoingOffers = useCallback(async () => {
    if (!connected || !walletAddress) {
      setOutgoingOffers([]);
      return;
    }

    setLoadingOffers(true);
    try {
      const userOffersRes: any = await aptosClient
        .view({
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_user_offers`,
          type_arguments: [],
          arguments: [MARKETPLACE_CONTRACT_ADDRESS, walletAddress],
        })
        .catch(() => [[]]);

      const rawUserOffers: any[] = Array.isArray(userOffersRes?.[0]) ? userOffersRes[0] : [];
      if (rawUserOffers.length === 0) {
        setOutgoingOffers([]);
        return;
      }

      const uniqueNftIds = Array.from(new Set(rawUserOffers.map((o: any) => Number(o.nft_id))));

      const enrichedGroups = await Promise.all(
        uniqueNftIds.map(async (nftId) => {
          try {
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

            const nftName = nftDetailsRes
              ? decodeVectorToString(nftDetailsRes[2])
              : `Object #${nftId}`;
            const nftUri = nftDetailsRes
              ? decodeVectorToString(nftDetailsRes[4])
              : "/videos/nft1.mp4";
            const allOffersForNft: any[] = Array.isArray(nftOffersRes?.[0]) ? nftOffersRes[0] : [];

            const matches: OutgoingOfferItem[] = [];
            allOffersForNft.forEach((o: any, idx: number) => {
              const isUser = Boolean(
                o.buyer && walletAddress && isSameAddress(o.buyer, walletAddress),
              );
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
                  nft_uri: resolveMediaUrl(nftUri) || "/videos/nft1.mp4",
                });
              }
            });

            return matches;
          } catch (err) {
            console.warn(`Failed to enrich outgoing offer for NFT #${nftId}:`, err);
            return [];
          }
        }),
      );

      setOutgoingOffers(enrichedGroups.flat());
    } catch (err) {
      console.error("Failed to fetch outgoing offers:", err);
      setOutgoingOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, [connected, walletAddress]);

  // 3. Fetch Incoming Offers on Owned NFTs
  const fetchIncomingOffers = useCallback(async () => {
    if (!connected || !walletAddress || nfts.length === 0) {
      setIncomingOffers([]);
      return;
    }

    setLoadingIncoming(true);
    try {
      const incomingList: IncomingOfferItem[] = [];

      await Promise.all(
        nfts.map(async (nft) => {
          try {
            const nftOffersRes: any = await aptosClient.view({
              function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_offers_for_nft`,
              type_arguments: [],
              arguments: [MARKETPLACE_CONTRACT_ADDRESS, nft.id.toString()],
            });

            const allOffers: any[] = Array.isArray(nftOffersRes?.[0]) ? nftOffersRes[0] : [];
            allOffers.forEach((o: any, idx: number) => {
              const status = Number(o.status);
              const isPending = status === 0;
              const isNotOwner = !isSameAddress(o.buyer, walletAddress);
              const notExpired = Number(o.expiration) > getNowSeconds();

              if (isPending && isNotOwner && notExpired) {
                incomingList.push({
                  nft_id: nft.id,
                  buyer: String(o.buyer),
                  price: Number(o.price),
                  expiration: Number(o.expiration),
                  status,
                  offer_index: idx,
                  nft_name: nft.name || `Object #${nft.id}`,
                  nft_uri: resolveMediaUrl(nft.uri) || "/videos/nft1.mp4",
                });
              }
            });
          } catch (err) {
            console.warn(`Failed to fetch offers for owned NFT #${nft.id}:`, err);
          }
        }),
      );

      setIncomingOffers(incomingList);
    } catch (err) {
      console.error("Failed to fetch incoming offers:", err);
      setIncomingOffers([]);
    } finally {
      setLoadingIncoming(false);
    }
  }, [connected, walletAddress, nfts]);

  const handleRefreshAll = useCallback(() => {
    fetchMyNFTs();
    fetchMyOutgoingOffers();
  }, [fetchMyNFTs, fetchMyOutgoingOffers]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  useEffect(() => {
    if (nfts.length > 0) {
      fetchIncomingOffers();
    } else {
      setIncomingOffers([]);
    }
  }, [nfts, fetchIncomingOffers]);

  useEffect(() => {
    const handleUpdate = () => {
      handleRefreshAll();
    };
    window.addEventListener("orbix:nft-updated", handleUpdate);
    return () => window.removeEventListener("orbix:nft-updated", handleUpdate);
  }, [handleRefreshAll]);

  const handleCancelOutgoingOffer = async (offer: OutgoingOfferItem) => {
    const key = `${offer.nft_id}-${offer.offer_index}`;
    setCancellingKey(key);

    const payload = createEntryPayload("cancel_offer", [
      MARKETPLACE_CONTRACT_ADDRESS,
      offer.nft_id.toString(),
      offer.offer_index.toString(),
    ]);

    await executeTx(payload, {
      title: `Cancelling Offer on ${offer.nft_name}`,
      description: `Refunding ${octasToApt(offer.price)} APT from contract escrow...`,
      successTitle: "Offer Cancelled",
      successDescription: `${octasToApt(offer.price)} APT refunded to your wallet.`,
      onSuccess: () => {
        fetchMyOutgoingOffers();
      },
    });

    setCancellingKey(null);
  };

  const handleAcceptIncomingOffer = async (offer: IncomingOfferItem) => {
    const payload = createEntryPayload("accept_offer", [
      MARKETPLACE_CONTRACT_ADDRESS,
      offer.nft_id.toString(),
      offer.offer_index.toString(),
    ]);

    await executeTx(payload, {
      title: `Accepting Offer on ${offer.nft_name}`,
      description: `Selling artifact for ${octasToApt(offer.price)} APT...`,
      successTitle: "Offer Accepted!",
      successDescription: `Transferred ${offer.nft_name} to ${truncateAddress(offer.buyer)}.`,
      onSuccess: () => {
        handleRefreshAll();
      },
    });
  };

  const handleRejectIncomingOffer = async (offer: IncomingOfferItem) => {
    const payload = createEntryPayload("reject_offer", [
      MARKETPLACE_CONTRACT_ADDRESS,
      offer.nft_id.toString(),
      offer.offer_index.toString(),
    ]);

    await executeTx(payload, {
      title: `Rejecting Offer on ${offer.nft_name}`,
      description: "Returning escrowed APT to the buyer...",
      successTitle: "Offer Rejected",
      successDescription: "Buyer's offer was declined and refunded.",
      onSuccess: () => {
        fetchIncomingOffers();
      },
    });
  };

  // Calculate total APT currently locked in outgoing offers
  const totalEscrowedApt = outgoingOffers.reduce((sum, item) => sum + octasToApt(item.price), 0);

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
              disabled={!connected}
              className="orb-button text-cream font-mono text-xs font-bold px-5 py-2.5 h-auto rounded-xl flex items-center gap-2 uppercase tracking-wider cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Mint Artifact</span>
            </Button>
          </div>
        </div>

        {!connected ? (
          <div className="liquid-glass rounded-3xl p-12 border border-white/10 text-center max-w-xl mx-auto my-12 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neon">
              <Wallet className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream">
                Connect Your Wallet
              </h2>
              <p className="text-sm font-mono text-cream/60">
                Connect an Aptos wallet to view your ocean artifacts, manage listings, and inspect
                pending offers.
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <WalletButton />
            </div>
          </div>
        ) : hasError ? (
          <div className="liquid-glass rounded-3xl p-12 border border-rose-500/30 text-center max-w-lg mx-auto space-y-4">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="font-grotesk text-2xl uppercase tracking-wide text-cream">
              Failed to Load Collection
            </h3>
            <p className="font-mono text-xs text-cream/60">
              There was an issue querying the Aptos node for your artifacts.
            </p>
            <Button
              onClick={handleRefreshAll}
              className="orb-button text-cream font-mono text-xs px-6 py-2.5 rounded-xl uppercase cursor-pointer"
            >
              Retry
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tabs List Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <TabsList className="liquid-glass p-1 rounded-2xl border border-white/10 flex flex-wrap h-auto gap-1">
                <TabsTrigger
                  value="owned"
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-xl data-[state=active]:bg-neon data-[state=active]:text-cream flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Owned Artifacts ({nfts.length})</span>
                </TabsTrigger>

                <TabsTrigger
                  value="incoming"
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-xl data-[state=active]:bg-neon data-[state=active]:text-cream flex items-center gap-2 cursor-pointer"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Incoming Offers ({incomingOffers.length})</span>
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
                  <span className="text-neon font-bold">{formatApt(totalEscrowedApt)}</span>
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
                    You don't own any ocean artifacts yet. Mint a new digital object or explore the
                    marketplace to start your collection.
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

            {/* TAB 2: Incoming Offers */}
            <TabsContent value="incoming" className="mt-0">
              {loadingIncoming ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-cream/60 font-mono text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-neon" />
                  <span>Checking incoming offers on your artifacts...</span>
                </div>
              ) : incomingOffers.length === 0 ? (
                <div className="liquid-glass rounded-3xl p-12 border border-white/10 text-center max-w-lg mx-auto space-y-3">
                  <Inbox className="w-8 h-8 text-neon mx-auto opacity-80" />
                  <h3 className="font-grotesk text-2xl uppercase tracking-wide text-cream">
                    No Incoming Offers
                  </h3>
                  <p className="font-mono text-xs text-cream/60 leading-relaxed">
                    You have no pending offers from other buyers on your artifacts. When collectors
                    submit escrowed offers on your items, you can review and accept them here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {incomingOffers.map((offer) => {
                    const isVideo = isVideoUri(offer.nft_uri);
                    const itemKey = `${offer.nft_id}-${offer.offer_index}`;

                    return (
                      <div
                        key={itemKey}
                        className="liquid-glass rounded-3xl p-5 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
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

                          <div className="min-w-0 flex-1">
                            <h4 className="font-grotesk text-lg uppercase tracking-wide text-cream truncate">
                              {offer.nft_name}
                            </h4>
                            <span className="font-mono text-xs text-cream/40">#{offer.nft_id}</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono text-xs text-cream/60">From:</span>
                              <span className="font-mono text-xs text-cream font-medium">
                                {truncateAddress(offer.buyer)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-cream/60">Offered Price:</span>
                            <span className="text-neon font-bold text-sm">
                              {octasToApt(offer.price)} APT
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cream/60">Expires:</span>
                            <span className="text-cream/80 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neon" />
                              {new Date(offer.expiration * 1000).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            disabled={isSubmitting}
                            onClick={() => handleAcceptIncomingOffer(offer)}
                            className="orb-button text-cream font-mono text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </Button>

                          <Button
                            variant="outline"
                            disabled={isSubmitting}
                            onClick={() => handleRejectIncomingOffer(offer)}
                            className="border-rose-800 bg-rose-950/60 hover:bg-rose-950 text-rose-300 font-mono text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: My Outgoing Offers */}
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
                    const isExpired = getNowSeconds() > offer.expiration;
                    const itemKey = `${offer.nft_id}-${offer.offer_index}`;
                    const isCancelling = cancellingKey === itemKey;
                    const isVideo = isVideoUri(offer.nft_uri);

                    return (
                      <div
                        key={itemKey}
                        className="liquid-glass rounded-3xl p-5 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
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

                        <Button
                          variant="outline"
                          disabled={isCancelling || isSubmitting}
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
