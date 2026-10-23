import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  octasToApt,
  truncateAddress,
  createEntryPayload,
} from "@/lib/aptosClient";
import { Offer } from "@/types/marketplace";
import { Layers, Loader2, CheckCircle, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nftId: number;
  isOwner: boolean;
  onSuccess?: (() => void) | undefined;
}

export function OffersModal({ open, onOpenChange, nftId, isOwner, onSuccess }: Props) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchOffers = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const result: any = await aptosClient.view({
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_offers_for_nft`,
        type_arguments: [],
        arguments: [MARKETPLACE_CONTRACT_ADDRESS, nftId.toString()],
      });

      if (Array.isArray(result) && Array.isArray(result[0])) {
        const rawOffers = result[0];
        const parsed: Offer[] = rawOffers.map((o: any) => ({
          nft_id: parseInt(o.nft_id, 10),
          buyer: o.buyer,
          price: parseInt(o.price, 10),
          expiration: parseInt(o.expiration, 10),
          status: parseInt(o.status, 10),
        }));
        setOffers(parsed);
      } else {
        setOffers([]);
      }
    } catch (err) {
      console.warn("No offers found or failed to fetch:", err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [open, nftId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleAcceptOffer = async (offerIndex: number) => {
    if (!account) return;
    setActionLoading(offerIndex);
    const toastId = toast.loading("Accepting offer on-chain...");

    try {
      const payload = createEntryPayload("accept_offer", [
        MARKETPLACE_CONTRACT_ADDRESS,
        nftId.toString(),
        offerIndex.toString(),
      ]);

      const response: any = await signAndSubmitTransaction(payload);
      toast.loading("Confirming transfer...", { id: toastId });
      await aptosClient.waitForTransaction(response.hash || response);

      toast.success("Offer accepted! NFT ownership transferred.", { id: toastId });
      fetchOffers();
      onSuccess?.();
    } catch (err: any) {
      console.error("Error accepting offer:", err);
      toast.error(err?.message || "Failed to accept offer", { id: toastId });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: number, expiration: number) => {
    const isExpired = Date.now() / 1000 > expiration;
    if (status === 1) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
          Accepted
        </span>
      );
    }
    if (status === 2) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
          Rejected
        </span>
      );
    }
    if (status === 3 || isExpired) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-neutral-700">
          Expired
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
        Pending
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-space/95 border-white/10 text-cream backdrop-blur-xl sm:max-w-lg rounded-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-grotesk uppercase tracking-wide text-2xl text-cream flex items-center gap-2">
            <Layers className="w-5 h-5 text-neon" /> On-Chain Offers (#{nftId})
          </DialogTitle>
          <DialogDescription className="text-cream/70 font-mono text-xs">
            Review active and historical offers made for this artifact.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-cream/50 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-neon" />
              <span>Fetching on-chain offers...</span>
            </div>
          ) : offers.length === 0 ? (
            <div className="py-12 text-center text-cream/50 font-mono text-xs">
              No offers recorded for this object yet.
            </div>
          ) : (
            offers.map((offer, index) => {
              const isExpired = Date.now() / 1000 > offer.expiration;
              const canAccept = isOwner && offer.status === 0 && !isExpired;

              return (
                <div
                  key={index}
                  className="liquid-glass p-3.5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cream/70">From:</span>
                      <span className="font-mono text-xs text-cream font-medium">
                        {truncateAddress(offer.buyer)}
                      </span>
                      {getStatusBadge(offer.status, offer.expiration)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-neon font-bold text-sm">
                        {octasToApt(offer.price)} APT
                      </span>
                      <span className="text-cream/40">•</span>
                      <span className="text-cream/60 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(offer.expiration * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {canAccept && (
                    <Button
                      size="sm"
                      disabled={actionLoading === index}
                      onClick={() => handleAcceptOffer(index)}
                      className="orb-button text-cream font-mono text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                    >
                      {actionLoading === index ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Accept</span>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
