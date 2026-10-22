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
import { Tag, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  onSuccess?: (() => void) | undefined;
}

export function MakeOfferModal({ open, onOpenChange, nftId, onSuccess }: Props) {
  const { connected, signAndSubmitTransaction } = useWallet();
  const [offerPrice, setOfferPrice] = useState("");
  const [expirationHours, setExpirationHours] = useState("48");
  const [loading, setLoading] = useState(false);

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const priceNum = parseFloat(offerPrice);
    const hoursNum = parseFloat(expirationHours);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid offer price in APT");
      return;
    }

    if (isNaN(hoursNum) || hoursNum < 1) {
      toast.error("Expiration must be at least 1 hour");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Submitting offer on-chain...");

    try {
      const priceInOctas = aptToOctas(priceNum).toString();
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTime + Math.floor(hoursNum * 3600)).toString();

      const payload = createEntryPayload("make_offer", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nftId.toString(),
        priceInOctas,
        expirationTime,
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Waiting for confirmation...", { id: toastId });
      await aptosClient.waitForTransaction(response.hash || response);

      toast.success("Offer submitted successfully!", { id: toastId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Error making offer:", err);
      let msg = err?.message || "Failed to make offer";
      if (msg.includes("1006")) msg = "Offer expiration must be in the future";
      if (msg.includes("1009")) msg = "NFT does not exist";
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
            <Tag className="w-5 h-5 text-neon" /> Make Offer on #{nftId}
          </DialogTitle>
          <DialogDescription className="text-cream/70 font-mono text-xs">
            Send an on-chain offer directly to the owner of this artifact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleMakeOffer} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="offer-price" className="text-xs font-mono uppercase text-cream/80">
              Offer Price (APT) *
            </Label>
            <Input
              id="offer-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 0.8"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-expiration" className="text-xs font-mono uppercase text-cream/80">
              Valid For (Hours) *
            </Label>
            <Input
              id="offer-expiration"
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 48"
              value={expirationHours}
              onChange={(e) => setExpirationHours(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-cream/70 hover:text-cream hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !connected}
              className="orb-button text-cream font-mono text-xs px-6 py-2.5 rounded-xl flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Submitting..." : "Send Offer"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
