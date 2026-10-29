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
  MARKETPLACE_CONTRACT_ADDRESS,
  aptToOctas,
  createEntryPayload,
  getNowSeconds,
} from "@/lib/aptosClient";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { Tag, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  onSuccess?: (() => void) | undefined;
}

export function MakeOfferModal({ open, onOpenChange, nftId, onSuccess }: Props) {
  const { connected } = useWallet();
  const { executeTx, isSubmitting: loading } = useMarketplaceTx();
  const [offerPrice, setOfferPrice] = useState("");
  const [expirationHours, setExpirationHours] = useState("48");

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const priceNum = parseFloat(offerPrice);
    const octas = aptToOctas(offerPrice);
    const hoursNum = parseFloat(expirationHours);

    if (isNaN(priceNum) || priceNum <= 0 || octas <= 0) {
      toast.error("Please enter a valid offer price in APT (minimum 0.00000001 APT)");
      return;
    }

    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 720) {
      toast.error("Offer expiration must be between 1 hour and 30 days (720 hours)");
      return;
    }

    // Use synchronized ledger timestamp to prevent clock drift aborts
    const currentLedgerSecs = getNowSeconds();
    const expirationTime = currentLedgerSecs + Math.floor(hoursNum * 3600);

    const payload = createEntryPayload("make_offer", [
      MARKETPLACE_CONTRACT_ADDRESS,
      nftId.toString(),
      octas.toString(),
      expirationTime.toString(),
    ]);

    const txHash = await executeTx(payload, {
      title: `Making Offer on #${nftId}`,
      description: `Escrowing ${offerPrice} APT for ${hoursNum} hr(s)...`,
      successTitle: "Offer Submitted!",
      successDescription: `Your offer of ${offerPrice} APT is now locked in contract escrow.`,
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });

    if (txHash) {
      setOfferPrice("");
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
            Submit a binding on-chain offer. Funds are securely locked in marketplace escrow.
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
              step="any"
              min="0.00000001"
              placeholder="e.g. 0.8"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-expiration" className="text-xs font-mono uppercase text-cream/80">
              Valid For (Hours) * (Min. 1 Hour)
            </Label>
            <Input
              id="offer-expiration"
              type="number"
              step="1"
              min="1"
              max="720"
              placeholder="e.g. 48"
              value={expirationHours}
              onChange={(e) => setExpirationHours(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-neon/10 border border-neon/20 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-neon shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-cream/80 leading-relaxed">
              Your APT is safely escrowed in the Move contract. If the seller declines or the offer
              expires, you can reclaim 100% of your funds at any time.
            </p>
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
              <span>{loading ? "Submitting..." : "Submit Offer"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
