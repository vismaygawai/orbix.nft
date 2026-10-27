import React, { useState, useEffect } from "react";
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
  confirmTransaction,
} from "@/lib/aptosClient";
import { ShoppingBag, Loader2, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  isAlreadyForSale?: boolean;
  currentPriceApt?: number;
  onSuccess?: (() => void) | undefined;
}

export function ListNFTModal({
  open,
  onOpenChange,
  nftId,
  isAlreadyForSale = false,
  currentPriceApt = 0,
  onSuccess,
}: Props) {
  const { connected, signAndSubmitTransaction } = useWallet();
  const [price, setPrice] = useState(currentPriceApt > 0 ? String(currentPriceApt) : "");
  const [loading, setLoading] = useState(false);
  const [delisting, setDelisting] = useState(false);

  useEffect(() => {
    setPrice(currentPriceApt > 0 ? String(currentPriceApt) : "");
  }, [currentPriceApt, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in APT");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      isAlreadyForSale ? "Updating listing price..." : "Listing NFT for sale...",
    );

    try {
      const priceOctas = aptToOctas(priceNum).toString();
      const functionName = isAlreadyForSale ? "set_price" : "list_for_sale";

      const payload = createEntryPayload(functionName, [
        MARKETPLACE_CONTRACT_ADDRESS,
        nftId.toString(),
        priceOctas,
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming on blockchain...", { id: toastId });
      await confirmTransaction(response);

      toast.success(isAlreadyForSale ? "Price updated successfully!" : "NFT listed for sale!", {
        id: toastId,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Listing error:", err);
      let msg = err?.message || "Transaction failed";
      if (msg.includes("100") || msg.includes("200")) msg = "Caller is not the owner";
      if (msg.includes("101")) msg = "NFT is already listed";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setDelisting(true);
    const toastId = toast.loading(`Delisting Object #${nftId} from marketplace...`);

    try {
      const payload = createEntryPayload("cancel_listing", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nftId.toString(),
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming delisting on Aptos...", { id: toastId });
      await confirmTransaction(response);

      toast.success(`Object #${nftId} removed from sale!`, { id: toastId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Cancel listing error:", err);
      toast.error(err?.message || "Failed to cancel listing", { id: toastId });
    } finally {
      setDelisting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-space/95 border-white/10 text-cream backdrop-blur-xl sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-grotesk uppercase tracking-wide text-2xl text-cream flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-neon" />
            {isAlreadyForSale ? `Manage Listing #${nftId}` : `List Object #${nftId} for Sale`}
          </DialogTitle>
          <DialogDescription className="text-cream/70 font-mono text-xs">
            {isAlreadyForSale
              ? "Update your asking price in APT or remove this artifact from fixed-price sale."
              : "Set an asking price in APT for immediate purchase by other collectors."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="list-price" className="text-xs font-mono uppercase text-cream/80">
              Listing Price (APT) *
            </Label>
            <Input
              id="list-price"
              type="number"
              step="any"
              min="0.0001"
              placeholder="e.g. 2.5"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {isAlreadyForSale ? (
              <Button
                type="button"
                variant="outline"
                disabled={delisting || loading || !connected}
                onClick={handleCancelListing}
                className="border-rose-800 bg-rose-950/60 hover:bg-rose-950 text-rose-300 font-mono text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
              >
                {delisting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{delisting ? "Delisting..." : "Delist NFT"}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-cream/70 hover:text-cream hover:bg-white/5 w-full sm:w-auto"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={loading || delisting || !connected}
              className="orb-button text-cream font-mono text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading ? "Processing..." : isAlreadyForSale ? "Update Price" : "List for Sale"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
