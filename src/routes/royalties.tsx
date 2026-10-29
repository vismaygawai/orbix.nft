import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WalletButton } from "@/components/wallet/WalletButton";
import { toast } from "sonner";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  createEntryPayload,
  APTOS_NETWORK,
} from "@/lib/aptosClient";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { Percent, ShieldCheck, Loader2, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/royalties")({
  head: () => ({
    meta: [
      { title: "Creator Royalties — orbix.nft" },
      {
        name: "description",
        content: "Configure creator royalties on secondary NFT sales on Aptos.",
      },
    ],
  }),
  component: RoyaltiesPage,
});

function RoyaltiesPage() {
  const { account, connected } = useWallet();
  const { executeTx, isSubmitting: loading } = useMarketplaceTx();
  const walletAddress = account?.address ? String(account.address) : "";
  const [royalty, setRoyalty] = useState("5");
  const [currentOnChainRoyalty, setCurrentOnChainRoyalty] = useState<number | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);

  useEffect(() => {
    if (!connected || !walletAddress) {
      setCurrentOnChainRoyalty(null);
      return;
    }

    let isMounted = true;
    setFetchingRate(true);
    aptosClient
      .view({
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_creator_royalty`,
        type_arguments: [],
        arguments: [MARKETPLACE_CONTRACT_ADDRESS, walletAddress],
      })
      .then((res: any) => {
        if (isMounted && Array.isArray(res) && res[0] !== undefined) {
          const rate = parseInt(res[0], 10);
          setCurrentOnChainRoyalty(rate);
          setRoyalty(rate.toString());
        }
      })
      .catch((err) => {
        console.warn("Could not load creator royalty rate:", err);
      })
      .finally(() => {
        if (isMounted) setFetchingRate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [connected, walletAddress]);

  const handleSetRoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    const val = parseInt(royalty, 10);
    if (isNaN(val) || val < 0 || val > 30 || !Number.isInteger(Number(royalty))) {
      toast.error("Royalty percentage must be an integer between 0% and 30%");
      return;
    }

    const payload = createEntryPayload("set_creator_royalty", [
      MARKETPLACE_CONTRACT_ADDRESS,
      val.toString(),
    ]);

    await executeTx(payload, {
      title: "Setting Creator Royalty",
      description: `Configuring ${val}% perpetual royalty rate on Aptos...`,
      successTitle: "Royalty Updated!",
      successDescription: `Creator royalty successfully registered at ${val}%.`,
      onSuccess: () => {
        setCurrentOnChainRoyalty(val);
      },
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 py-12 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-mono uppercase tracking-widest text-neon">
          Perpetual Rewards
        </span>
        <h1 className="font-grotesk uppercase text-4xl sm:text-5xl md:text-6xl text-cream tracking-wide">
          Creator Royalties
        </h1>
        <p className="text-xs sm:text-sm font-mono text-cream/70">
          Ensure you receive a dedicated percentage on every secondary market transaction of your
          minted ocean artifacts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Form Card */}
        <div className="liquid-glass p-5 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-grotesk uppercase text-xl sm:text-2xl text-cream">
                Configure Rate
              </h2>
              <p className="text-xs font-mono text-cream/50">
                Stored directly in the Move contract
              </p>
            </div>
          </div>

          {!connected ? (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-4">
              <p className="text-xs font-mono text-cream/70">
                Connect your creator account to configure your royalty rate.
              </p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSetRoyalty} className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="royalty" className="text-xs font-mono uppercase text-cream/80">
                    Royalty Percentage (0% - 30%)
                  </Label>
                  <div className="flex items-center gap-2">
                    {fetchingRate ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-cream/50 border border-white/10">
                        Syncing...
                      </span>
                    ) : (
                      currentOnChainRoyalty !== null && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Current: {currentOnChainRoyalty}%
                        </span>
                      )
                    )}
                    <span className="text-xs font-mono text-neon font-bold">{royalty}%</span>
                  </div>
                </div>
                <Input
                  id="royalty"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={royalty}
                  onChange={(e) => setRoyalty(e.target.value)}
                  className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono text-base h-12"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] font-mono text-cream/60 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-neon shrink-0 mt-0.5" />
                <span>
                  The contract enforces a maximum royalty of 30% to protect marketplace liquidity.
                  The default platform fee is 2%.
                </span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full orb-button text-cream font-mono text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? "Registering on Chain..." : "Update Royalty Rate"}</span>
              </Button>
            </form>
          )}
        </div>

        {/* Informational Card */}
        <div className="space-y-6">
          <div className="liquid-glass p-5 sm:p-8 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-neon text-xs font-mono uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Smart Contract Protection</span>
            </div>
            <h3 className="font-grotesk uppercase text-xl sm:text-2xl text-cream">
              How Royalties Function
            </h3>
            <p className="text-xs font-mono text-cream/70 leading-relaxed">
              When a buyer purchases an NFT or accepts an offer, the Move smart contract checks the
              creator's address in its internal table:
            </p>
            <ul className="space-y-2 text-xs font-mono text-cream/80">
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>The platform takes a baseline 2% marketplace maintenance fee.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>
                  Your custom royalty (e.g. 5%) is automatically deducted from the payment.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>
                  The royalty is transferred directly and atomically to your Aptos wallet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>The remaining proceeds are transferred to the seller.</span>
              </li>
            </ul>
          </div>

          <div className="liquid-glass p-6 rounded-3xl border border-white/10 flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-neon shrink-0" />
            <div className="text-xs font-mono text-cream/70">
              All royalty configurations are decentralized, immutable between changes, and trustless
              on Aptos {APTOS_NETWORK.toUpperCase()}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
