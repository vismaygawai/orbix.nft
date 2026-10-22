import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { NFT } from "@/types/marketplace";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { MintNFTModal } from "@/components/marketplace/MintNFTModal";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  decodeVectorOrHexToString,
  truncateAddress,
} from "@/lib/aptosClient";
import { RefreshCw, PlusCircle, Loader2, FolderLock, PackageOpen } from "lucide-react";

export const Route = createFileRoute("/my-nfts")({
  head: () => ({
    meta: [
      { title: "My Collection — Orbix.Nft" },
      { name: "description", content: "Manage your owned ocean artifacts on Aptos." },
    ],
  }),
  component: MyNFTsPage,
});

function MyNFTsPage() {
  const { account, connected } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);

  const fetchMyNFTs = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);

    try {
      // get_all_nfts_for_owner(marketplace_addr, owner_addr, limit, offset) -> vector<u64>
      const result: any = await aptosClient.view({
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_all_nfts_for_owner`,
        type_arguments: [],
        arguments: [MARKETPLACE_CONTRACT_ADDRESS, account.address, "100", "0"],
      });

      const nftIds: number[] = Array.isArray(result?.[0])
        ? result[0].map((id: any) => parseInt(id, 10))
        : [];

      const loadedList: NFT[] = [];
      for (const id of nftIds) {
        try {
          const detailRes: any = await aptosClient.view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_nft_details`,
            type_arguments: [],
            arguments: [MARKETPLACE_CONTRACT_ADDRESS, id.toString()],
          });

          if (Array.isArray(detailRes)) {
            loadedList.push({
              id: parseInt(detailRes[0], 10),
              owner: detailRes[1],
              name: decodeVectorOrHexToString(detailRes[2]),
              description: decodeVectorOrHexToString(detailRes[3]),
              uri: decodeVectorOrHexToString(detailRes[4]),
              price: parseInt(detailRes[5], 10),
              for_sale: Boolean(detailRes[6]),
              rarity: parseInt(detailRes[7], 10),
            });
          }
        } catch (detailErr) {
          console.warn(`Could not load details for NFT #${id}:`, detailErr);
        }
      }

      setNfts(loadedList);
    } catch (err) {
      console.error("Error fetching user NFTs:", err);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    if (connected && account?.address) {
      fetchMyNFTs();
    } else {
      setNfts([]);
    }
  }, [connected, account?.address, fetchMyNFTs]);

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="liquid-glass p-12 rounded-3xl border border-white/10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neon">
            <FolderLock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-grotesk uppercase text-3xl sm:text-4xl text-cream tracking-wide">
              Wallet Not Connected
            </h2>
            <p className="font-mono text-xs sm:text-sm text-cream/60 max-w-md mx-auto">
              Connect your Aptos wallet to view and manage your owned space artifacts, list them for
              sale, or review offers.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-neon">
            Personal Inventory
          </span>
          <h1 className="font-grotesk uppercase text-4xl sm:text-5xl md:text-6xl text-cream tracking-wide mt-1">
            My Space Artifacts
          </h1>
          <p className="text-xs font-mono text-cream/60 mt-1">
            Connected as:{" "}
            <span className="text-cream font-bold">{truncateAddress(account?.address || "")}</span>{" "}
            ({nfts.length} objects owned)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setMintOpen(true)}
            className="orb-button text-cream font-mono text-xs px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Mint New Object</span>
          </Button>

          <Button
            variant="outline"
            onClick={fetchMyNFTs}
            disabled={loading}
            className="liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs flex items-center gap-2 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-cream/50 font-mono text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-neon" />
          <span>Retrieving your on-chain inventory...</span>
        </div>
      ) : nfts.length === 0 ? (
        <div className="py-20 liquid-glass rounded-3xl border border-white/10 text-center space-y-4 p-10 max-w-2xl mx-auto">
          <PackageOpen className="w-12 h-12 text-cream/30 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-grotesk uppercase text-2xl text-cream">
              No Artifacts in Inventory
            </h3>
            <p className="text-xs font-mono text-cream/60 max-w-md mx-auto">
              Your Aptos address currently does not own any objects registered in this marketplace.
              You can mint a new one right now.
            </p>
          </div>
          <Button
            onClick={() => setMintOpen(true)}
            className="orb-button text-cream font-mono text-xs px-6 py-2.5 rounded-xl"
          >
            Mint Your First NFT
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} onRefresh={fetchMyNFTs} />
          ))}
        </div>
      )}

      <MintNFTModal open={mintOpen} onOpenChange={setMintOpen} onSuccess={fetchMyNFTs} />
    </div>
  );
}
