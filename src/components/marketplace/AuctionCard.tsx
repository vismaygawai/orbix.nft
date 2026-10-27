import React, { useState, useEffect } from "react";
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
} from "@/lib/aptosClient";
import { Auction } from "@/types/marketplace";
import { Clock, Gavel, Loader2, Award } from "lucide-react";

interface Props {
  auction: Auction;
  onBidPlaced?: () => void;
}

export function AuctionCard({ auction, onBidPlaced }: Props) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [bidInput, setBidInput] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [isEnded, setIsEnded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
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

  const currentBidApt = octasToApt(auction.current_bid);
  const startPriceApt = octasToApt(auction.start_price);
  const minBidApt = Number((currentBidApt + 0.1).toFixed(2));
  const isHighestBidder = Boolean(
    account?.address &&
    auction.highest_bidder &&
    account.address.toLowerCase() === auction.highest_bidder.toLowerCase(),
  );

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !account) {
      toast.error("Please connect your wallet to place a bid");
      return;
    }

    if (isHighestBidder) {
      toast.error("You are already the highest bidder");
      return;
    }

    const amount = parseFloat(bidInput);
    if (isNaN(amount) || amount <= currentBidApt) {
      toast.error(`Bid must be strictly higher than current bid (${currentBidApt} APT)`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading(`Placing bid of ${amount} APT...`);

    try {
      const amountInOctas = aptToOctas(amount).toString();

      const payload = createEntryPayload("place_bid", [
        MARKETPLACE_CONTRACT_ADDRESS,
        auction.nft_id.toString(),
        amountInOctas,
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming bid on chain...", { id: toastId });
      await aptosClient.waitForTransaction(response.hash || response);

      toast.success("Bid placed successfully!", { id: toastId });
      setBidInput("");
      onBidPlaced?.();
    } catch (err: any) {
      console.error("Error placing bid:", err);
      let msg = err?.message || "Failed to place bid";
      if (msg.includes("EALREADY_HIGHEST_BIDDER") || msg.includes("0x3ed")) {
        msg = "You are already the highest bidder";
      } else if (msg.includes("EBID_TOO_LOW") || msg.includes("0x3ee")) {
        msg = "Bid amount must exceed current bid";
      } else if (msg.includes("EAUCTION_EXPIRED") || msg.includes("0x3f0")) {
        msg = "Auction has already expired";
      }
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="liquid-glass rounded-3xl p-6 border border-white/10 hover:border-neon/40 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-grotesk text-2xl uppercase tracking-wider text-cream">
            Object #{auction.nft_id}
          </span>
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
              isEnded
                ? "bg-neutral-900 text-neutral-400 border-neutral-700"
                : "bg-neon/15 text-neon border-neon/30"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}</span>
          </span>
        </div>

        <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
          <div className="flex justify-between items-center text-xs font-mono text-cream/70">
            <span>Starting Price:</span>
            <span className="text-cream">{startPriceApt} APT</span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-cream/70">
            <span>Current Highest Bid:</span>
            <span className="text-neon font-bold text-base">{currentBidApt} APT</span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-cream/70">
            <span>Highest Bidder:</span>
            <span className="text-cream font-medium">
              {auction.highest_bidder && auction.highest_bidder !== "0x0"
                ? truncateAddress(auction.highest_bidder)
                : "No bids yet"}
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
        <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-center font-mono text-xs text-cream/60 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-neutral-400" />
          <span>Auction Concluded</span>
        </div>
      ) : (
        <form onSubmit={handleBid} className="space-y-2 mt-2">
          <div className="flex flex-col min-[380px]:flex-row gap-2">
            <Input
              type="number"
              step="0.01"
              min={minBidApt}
              placeholder={`Min ${minBidApt} APT`}
              value={bidInput}
              onChange={(e) => setBidInput(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono text-xs flex-1"
              required
            />
            <Button
              type="submit"
              disabled={Boolean(loading || !connected || isHighestBidder)}
              className="orb-button text-cream font-mono text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap w-full min-[380px]:w-auto cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Gavel className="w-3.5 h-3.5" />
              )}
              <span>Place Bid</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
