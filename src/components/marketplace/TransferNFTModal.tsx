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
  createEntryPayload,
  confirmTransaction,
  isSameAddress,
} from "@/lib/aptosClient";
import { Send, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  onSuccess?: (() => void) | undefined;
}

export function TransferNFTModal({ open, onOpenChange, nftId, onSuccess }: Props) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !account) {
      toast.error("Please connect your wallet first");
      return;
    }

    const cleanAddress = recipient.trim();
    if (!/^0x[a-fA-F0-9]{1,64}$/.test(cleanAddress)) {
      toast.error("Please enter a valid Aptos wallet address starting with 0x");
      return;
    }

    if (isSameAddress(cleanAddress, account.address)) {
      toast.error("Cannot transfer an NFT to your own address");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(`Transferring Object #${nftId}...`);

    try {
      const payload = createEntryPayload("transfer_ownership", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nftId.toString(),
        cleanAddress,
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming transfer on Aptos...", { id: toastId });
      await confirmTransaction(response);

      toast.success(`Object #${nftId} transferred successfully!`, { id: toastId });
      setRecipient("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Transfer error:", err);
      let msg = err?.message || "Failed to transfer NFT";
      if (msg.includes("403") || msg.includes("ENFT_IN_AUCTION")) {
        msg = "Cannot transfer an NFT while it is in an active auction";
      } else if (msg.includes("301") || msg.includes("ESAME_OWNER")) {
        msg = "Recipient is already the owner";
      }
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
            <Send className="w-5 h-5 text-neon" /> Transfer Object #{nftId}
          </DialogTitle>
          <DialogDescription className="text-cream/70 font-mono text-xs">
            Send this ocean artifact directly to another Aptos wallet address. If currently listed,
            it will be automatically delisted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="recipient-addr" className="text-xs font-mono uppercase text-cream/80">
              Recipient Aptos Address *
            </Label>
            <Input
              id="recipient-addr"
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono text-xs"
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
              <span>{loading ? "Transferring..." : "Confirm Transfer"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
