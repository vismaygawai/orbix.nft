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
  isSameAddress,
  normalizeAddress,
} from "@/lib/aptosClient";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { Send, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  onSuccess?: (() => void) | undefined;
}

export function TransferNFTModal({ open, onOpenChange, nftId, onSuccess }: Props) {
  const { account, connected } = useWallet();
  const { executeTx, isSubmitting: loading } = useMarketplaceTx();
  const walletAddress = account?.address ? String(account.address) : "";
  const [recipient, setRecipient] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !account || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    const cleanAddress = recipient.trim();
    if (!/^0x[a-fA-F0-9]{1,64}$/.test(cleanAddress)) {
      toast.error("Please enter a valid Aptos wallet address starting with 0x");
      return;
    }

    const normalized = normalizeAddress(cleanAddress);
    if (!normalized || normalized === "0x0") {
      toast.error("Recipient address cannot be zero (0x0)");
      return;
    }

    if (isSameAddress(cleanAddress, walletAddress)) {
      toast.error("Cannot transfer an artifact to your own address");
      return;
    }

    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    const payload = createEntryPayload("transfer_ownership", [
      MARKETPLACE_CONTRACT_ADDRESS,
      nftId.toString(),
      cleanAddress,
    ]);

    const txHash = await executeTx(payload, {
      title: `Transferring Object #${nftId}`,
      description: `Sending artifact to ${cleanAddress.slice(0, 10)}...`,
      successTitle: "Ownership Transferred!",
      successDescription: `Object #${nftId} was permanently transferred to recipient.`,
      onSuccess: () => {
        setRecipient("");
        setConfirmed(false);
        onOpenChange(false);
        onSuccess?.();
      },
    });

    if (txHash && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setConfirmed(false);
        onOpenChange(val);
      }}
    >
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
              onChange={(e) => {
                setRecipient(e.target.value);
                setConfirmed(false);
              }}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono text-xs"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-amber-200/90 leading-relaxed">
              Ownership transfers on Aptos are permanent and irreversible. Ensure the recipient
              address is accurate.
            </p>
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConfirmed(false);
                onOpenChange(false);
              }}
              className="text-cream/70 hover:text-cream hover:bg-white/5 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !connected}
              className={`font-mono text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto ${
                confirmed ? "bg-rose-600 hover:bg-rose-500 text-white" : "orb-button text-cream"
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading
                  ? "Transferring..."
                  : confirmed
                    ? "Yes, Permanently Transfer"
                    : "Review Transfer"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
