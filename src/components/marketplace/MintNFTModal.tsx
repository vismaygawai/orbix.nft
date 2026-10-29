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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { encodeStringToVector, createEntryPayload, sanitizeMediaUri } from "@/lib/aptosClient";
import { useMarketplaceTx } from "@/hooks/useMarketplaceTx";
import { Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (() => void) | undefined;
}

export function MintNFTModal({ open, onOpenChange, onSuccess }: Props) {
  const { connected } = useWallet();
  const { executeTx, isSubmitting: loading } = useMarketplaceTx();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uri, setUri] = useState("");
  const [rarity, setRarity] = useState("1");

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const trimmedUri = uri.trim();

    if (!trimmedName) {
      toast.error("Artifact name is required (max 128 characters)");
      return;
    }
    if (new TextEncoder().encode(trimmedName).length > 128) {
      toast.error("Artifact name exceeds 128 bytes limit");
      return;
    }

    if (new TextEncoder().encode(trimmedDesc).length > 1024) {
      toast.error("Description exceeds 1024 bytes limit");
      return;
    }

    const sanitizedUri = sanitizeMediaUri(trimmedUri);
    if (!sanitizedUri) {
      toast.error("Please enter a valid https:// or ipfs:// media URL");
      return;
    }
    if (new TextEncoder().encode(sanitizedUri).length > 512) {
      toast.error("Media URI exceeds 512 bytes limit");
      return;
    }

    const payload = createEntryPayload("mint_nft", [
      encodeStringToVector(trimmedName),
      encodeStringToVector(trimmedDesc),
      encodeStringToVector(sanitizedUri),
      parseInt(rarity, 10),
    ]);

    const txHash = await executeTx(payload, {
      title: `Minting "${trimmedName}"`,
      description: "Writing artifact metadata to the Aptos blockchain...",
      successTitle: "Artifact Minted!",
      successDescription: `"${trimmedName}" is now registered in your Aptos collection.`,
      onSuccess: () => {
        setName("");
        setDescription("");
        setUri("");
        setRarity("1");
        onOpenChange(false);
        onSuccess?.();
      },
    });

    if (txHash && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-space/95 border-white/10 text-cream backdrop-blur-xl sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-grotesk uppercase tracking-wide text-2xl text-cream flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon" /> Mint New Ocean Artifact
          </DialogTitle>
          <DialogDescription className="text-cream/70 font-mono text-xs">
            Create and permanently register a new digital object on the Aptos blockchain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleMint} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mint-name" className="text-xs font-mono uppercase text-cream/80">
              Object Name * (Max 128 chars)
            </Label>
            <Input
              id="mint-name"
              maxLength={128}
              placeholder="e.g. Abyssal Current #01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mint-desc" className="text-xs font-mono uppercase text-cream/80">
              Description (Max 1024 chars)
            </Label>
            <Textarea
              id="mint-desc"
              maxLength={1024}
              placeholder="Describe this artifact fixed beyond tides and time..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon resize-none h-20 font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mint-uri" className="text-xs font-mono uppercase text-cream/80">
              Media / Metadata URI * (Max 512 chars)
            </Label>
            <Input
              id="mint-uri"
              maxLength={512}
              placeholder="ipfs://... or https://..."
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              className="bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus-visible:ring-neon font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mint-rarity" className="text-xs font-mono uppercase text-cream/80">
              Rarity Tier
            </Label>
            <Select value={rarity} onValueChange={setRarity}>
              <SelectTrigger className="bg-white/5 border-white/15 text-cream font-mono">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent className="bg-space border-white/10 text-cream font-mono">
                <SelectItem value="1">Common (1)</SelectItem>
                <SelectItem value="2">Uncommon (2)</SelectItem>
                <SelectItem value="3">Rare (3)</SelectItem>
                <SelectItem value="4">Epic (4)</SelectItem>
              </SelectContent>
            </Select>
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
              <span>{loading ? "Minting..." : "Mint Object"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
