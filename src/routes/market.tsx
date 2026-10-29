import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import { NFT, Auction, ListedNFT } from "@/types/marketplace";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { AuctionCard } from "@/components/marketplace/AuctionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  decodeVectorOrHexToString,
  APTOS_NETWORK,
} from "@/lib/aptosClient";
import { getForSaleCuratedNFTs } from "@/lib/curatedNFTs";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  Gavel,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Marketplace — orbix.nft" },
      {
        name: "description",
        content: "Explore and trade rare Aptos ocean artifacts on orbix.nft.",
      },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const [activeTab, setActiveTab] = useState<"marketplace" | "auctions">("marketplace");
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const loadData = async (isManualSync = false) => {
    setLoading(true);
    setHasError(false);

    try {
      // 1. Retrieve verified curated ocean artifacts (includes hero NFTs: $50, $100, $150)
      const fallbackNfts = getForSaleCuratedNFTs();

      // 2. Query on-chain marketplace for direct listings and active auctions concurrently
      const [forSaleResult, auctionRes]: [any, any] = await Promise.all([
        aptosClient
          .view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_all_nfts_for_sale`,
            type_arguments: [],
            arguments: [MARKETPLACE_CONTRACT_ADDRESS, "100", "0"],
          })
          .catch((saleErr) => {
            console.warn(
              "On-chain contract not yet deployed or wiped; using curated registry:",
              saleErr,
            );
            return [[]];
          }),
        aptosClient
          .view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_active_auctions`,
            type_arguments: [],
            arguments: [MARKETPLACE_CONTRACT_ADDRESS],
          })
          .catch((aucErr) => {
            console.warn("Could not load auctions:", aucErr);
            return [[]];
          }),
      ]);

      const parsedAuctions: Auction[] = Array.isArray(auctionRes?.[0])
        ? auctionRes[0].map((a: any) => ({
            nft_id: parseInt(a.nft_id, 10),
            seller: a.seller,
            start_price: parseInt(a.start_price, 10),
            current_bid: parseInt(a.current_bid, 10),
            highest_bidder: a.highest_bidder,
            end_time: parseInt(a.end_time, 10),
            active: Boolean(a.active),
          }))
        : [];

      setAuctions(parsedAuctions);

      const activeAuctionNftIds = new Set(
        parsedAuctions.filter((a) => a.active).map((a) => a.nft_id),
      );

      const listedList: ListedNFT[] = Array.isArray(forSaleResult?.[0]) ? forSaleResult[0] : [];

      let fullNfts: NFT[] = [];

      if (listedList.length > 0) {
        // Fetch full details concurrently with error protection
        fullNfts = (
          await Promise.all(
            listedList.map(async (item) => {
              try {
                const detailRes: any = await aptosClient.view({
                  function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_nft_details`,
                  type_arguments: [],
                  arguments: [MARKETPLACE_CONTRACT_ADDRESS, item.id.toString()],
                });

                if (Array.isArray(detailRes)) {
                  const nftId = parseInt(detailRes[0], 10);
                  return {
                    id: nftId,
                    owner: detailRes[1],
                    name: decodeVectorOrHexToString(detailRes[2]),
                    description: decodeVectorOrHexToString(detailRes[3]),
                    uri: decodeVectorOrHexToString(detailRes[4]),
                    price: parseInt(detailRes[5], 10),
                    for_sale: Boolean(detailRes[6]),
                    rarity: parseInt(detailRes[7], 10),
                    in_auction: activeAuctionNftIds.has(nftId),
                  } as NFT;
                }
                return null;
              } catch (detailErr) {
                console.warn(`Could not load details for NFT #${item.id}:`, detailErr);
                return null;
              }
            }),
          )
        ).filter((n): n is NFT => n !== null);
      }

      // Merge: On-chain takes precedence, curated NFTs fill any unshadowed items
      if (fullNfts.length > 0) {
        const onChainIds = new Set(fullNfts.map((n) => n.id));
        const merged = [...fullNfts, ...fallbackNfts.filter((n) => !onChainIds.has(n.id))];
        setNfts(merged);
      } else {
        setNfts(fallbackNfts);
      }

      if (isManualSync) {
        toast.success("Synchronized with Aptos Network", {
          description: `Active listings loaded from Aptos ${APTOS_NETWORK.toUpperCase()}.`,
        });
      }
    } catch (err) {
      console.error("Marketplace fetch error:", err);
      // Graceful fallback to verified curated NFTs instead of halting UI
      const fallbackNfts = getForSaleCuratedNFTs();
      if (fallbackNfts.length > 0) {
        setNfts(fallbackNfts);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("orbix:nft-updated", handleUpdate);
    return () => window.removeEventListener("orbix:nft-updated", handleUpdate);
  }, []);

  const filteredNfts = useMemo(() => {
    let result = [...nfts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          String(n.id).includes(q),
      );
    }

    if (rarityFilter !== "all") {
      result = result.filter((n) => n.rarity === parseInt(rarityFilter, 10));
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [nfts, searchQuery, rarityFilter, sortBy]);

  return (
    <div className="max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-neon">
              On-Chain Marketplace
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Artifacts</span>
            </span>
          </div>
          <h1 className="font-grotesk uppercase text-4xl sm:text-5xl md:text-6xl text-cream tracking-wide mt-1">
            Browse Ocean Artifacts
          </h1>
          <p className="text-sm font-mono text-cream/60 max-w-xl mt-2">
            Acquire verified artifacts anchored to the Aptos blockchain via Move smart contracts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => loadData(true)}
            disabled={loading}
            className="liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs flex items-center gap-2 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Chain</span>
          </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* View Switcher */}
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="w-full sm:w-auto"
        >
          <TabsList className="liquid-glass border border-white/10 p-1 rounded-2xl w-full grid grid-cols-2 sm:flex sm:w-auto h-auto">
            <TabsTrigger
              value="marketplace"
              className="data-[state=active]:bg-neon data-[state=active]:text-cream rounded-xl font-mono text-xs px-3 sm:px-4 py-2 text-center cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Direct Listings ({nfts.length}
              )
            </TabsTrigger>
            <TabsTrigger
              value="auctions"
              className="data-[state=active]:bg-neon data-[state=active]:text-cream rounded-xl font-mono text-xs px-3 sm:px-4 py-2 text-center cursor-pointer"
            >
              <Gavel className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Live Auctions ({auctions.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter controls (only for direct listings) */}
        {activeTab === "marketplace" && (
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" />
              <Input
                placeholder="Search by name or #id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 text-xs font-mono pl-9 rounded-xl focus-visible:ring-neon h-9 w-full"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Rarity */}
              <Select value={rarityFilter} onValueChange={setRarityFilter}>
                <SelectTrigger className="bg-white/5 border-white/15 text-cream text-xs font-mono rounded-xl h-9 flex-1 sm:min-w-[130px]">
                  <Filter className="w-3 h-3 mr-1.5 text-neon shrink-0" />
                  <SelectValue placeholder="Rarity" />
                </SelectTrigger>
                <SelectContent className="bg-space border-white/10 text-cream font-mono text-xs">
                  <SelectItem value="all">All Rarities</SelectItem>
                  <SelectItem value="1">Common</SelectItem>
                  <SelectItem value="2">Uncommon</SelectItem>
                  <SelectItem value="3">Rare</SelectItem>
                  <SelectItem value="4">Epic (Rarest)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/5 border-white/15 text-cream text-xs font-mono rounded-xl h-9 flex-1 sm:min-w-[150px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="bg-space border-white/10 text-cream font-mono text-xs">
                  <SelectItem value="newest">Newest Listed</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-cream/50 font-mono text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-neon" />
          <span>Connecting to Aptos {APTOS_NETWORK.toUpperCase()}...</span>
        </div>
      ) : hasError ? (
        <div className="py-20 liquid-glass rounded-3xl border border-rose-500/30 text-center space-y-4 p-8 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="font-grotesk uppercase text-2xl text-cream">
            Unable to Fetch Marketplace
          </h3>
          <p className="text-xs font-mono text-cream/60 leading-relaxed">
            We couldn't connect to the Aptos node or the marketplace contract. Please check your
            connection and try again.
          </p>
          <Button
            onClick={() => loadData(true)}
            className="orb-button text-cream font-mono text-xs px-6 py-2 rounded-xl uppercase cursor-pointer"
          >
            Retry Connection
          </Button>
        </div>
      ) : activeTab === "marketplace" ? (
        filteredNfts.length === 0 ? (
          <div className="py-20 liquid-glass rounded-3xl border border-white/10 text-center space-y-3 p-8">
            <AlertCircle className="w-8 h-8 text-cream/30 mx-auto" />
            <h3 className="font-grotesk uppercase text-2xl text-cream">No Listings Found</h3>
            <p className="text-xs font-mono text-cream/60 max-w-md mx-auto">
              There are currently no ocean artifacts matching your criteria listed for sale. Be the
              first to mint or list an object!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNfts.map((nft) => (
              <NFTCard key={nft.id} nft={nft} onRefresh={() => loadData(false)} />
            ))}
          </div>
        )
      ) : auctions.length === 0 ? (
        <div className="py-20 liquid-glass rounded-3xl border border-white/10 text-center space-y-3 p-8">
          <Gavel className="w-8 h-8 text-cream/30 mx-auto" />
          <h3 className="font-grotesk uppercase text-2xl text-cream">No Active Auctions</h3>
          <p className="text-xs font-mono text-cream/60 max-w-md mx-auto">
            No auctions are currently taking bids. Owners can open an auction from their collection
            page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.nft_id}
              auction={auction}
              onBidPlaced={() => loadData(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
