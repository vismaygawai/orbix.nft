import React, { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  aptToOctas,
  createEntryPayload,
} from "@/lib/aptosClient";
import { Gavel, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  onSuccess?: (() => void) | undefined;
}

export function CreateAuctionModal({ open, onOpenChange, nftId, onSuccess }: Props) {
  const { connected, signAndSubmitTransaction } = useWallet();
  const [startPrice, setStartPrice] = useState("");
  const [durationHours, setDurationHours] = useState("24");
  const [loading, setLoading] = useState(false);

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const priceNum = parseFloat(startPrice);
    const hoursNum = parseFloat(durationHours);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid starting price in APT");
      return;
    }

    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 720) {
      toast.error("Auction duration must be between 1 hour and 30 days (720 hours)");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating on-chain auction...");

    try {
      const startPriceOctas = aptToOctas(priceNum).toString();
      const durationSeconds = Math.floor(hoursNum * 3600).toString();

      const payload = createEntryPayload("create_auction", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nftId.toString(),
        startPriceOctas,
        durationSeconds,
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Waiting for confirmation...", { id: toastId });
      await aptosClient.waitForTransaction(response.hash || response);

      toast.success("Auction created successfully!", { id: toastId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Error creating auction:", err);
      let msg = err?.message || "Failed to create auction";
      if (msg.includes("1000")) msg = "You are not the owner of this NFT";
      if (msg.includes("1001")) msg = "Auction duration must be at least 1 hour";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-space/95 border-white/10 text-cream backdrop-blur-xl sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-grotesk uppercase tracking-wide text-2xl text-cream flex items-center gap-2">
            <Gavel className="w-5 h-5 text-neon" /> Start Auction for #{nftId}
          </DialogTitle>
          <DialogDescription className="text-cream/70 font-mono text-xs">
            Open this ocean artifact to live decentralized bidding on Aptos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateAuction} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="start-price" className="text-xs font-mono uppercase text-cream/80">
              Starting Price (APT) *
            </Label>
            <Input
              id="start-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 1.5"
              value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duration" className="text-xs font-mono uppercase text-cream/80">
              Duration (Hours) * (Min. 1 Hour)
            </Label>
            <Input
              id="duration"
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 24"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-cream/70 hover:text-cream hover:bg-white/5 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !connected}
              className="orb-button text-cream font-mono text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Starting..." : "Start Auction"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
