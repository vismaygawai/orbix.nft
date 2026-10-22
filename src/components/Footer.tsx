import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MARKETPLACE_CONTRACT_ADDRESS, APTOS_NETWORK, truncateAddress } from "@/lib/aptosClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function Footer() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const explorerUrl = `https://explorer.aptoslabs.com/account/${MARKETPLACE_CONTRACT_ADDRESS}?network=${APTOS_NETWORK}`;

  const handleCopyContract = () => {
    navigator.clipboard.writeText(MARKETPLACE_CONTRACT_ADDRESS);
    setCopied(true);
    toast.success("Contract address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <footer className="w-full bg-space border-t border-white/10 text-cream transition-colors">
        <div className="max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-12 sm:pt-16 pb-10 sm:pb-12">
          {/* Main Upper Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pb-10 sm:pb-14">
            {/* Big Brand Typography styled identically to the navbar */}
            <Link
              to="/"
              className="flex items-center gap-[0.06em] font-grotesk text-5xl sm:text-6xl md:text-7xl lg:text-8xl uppercase tracking-wider text-cream hover:opacity-85 transition-opacity"
            >
              <span>Orbix</span>
              <span className="font-condiment text-neon text-[1.15em] normal-case -rotate-2 relative top-[0.2em]">
                .nft
              </span>
            </Link>

            {/* Navigation & Resources Links */}
            <nav className="flex flex-wrap items-center gap-6 sm:gap-10">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs sm:text-sm uppercase tracking-wider text-cream/70 hover:text-neon transition-colors flex items-center gap-1.5"
              >
                <span>APTOSCAN</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>

              <Link
                to="/market"
                className="font-mono text-xs sm:text-sm uppercase tracking-wider text-cream/70 hover:text-neon transition-colors"
              >
                MARKETPLACE
              </Link>

              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="font-mono text-xs sm:text-sm uppercase tracking-wider text-cream/70 hover:text-neon transition-colors cursor-pointer"
              >
                PRIVACY
              </button>

              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="font-mono text-xs sm:text-sm uppercase tracking-wider text-cream/70 hover:text-neon transition-colors cursor-pointer"
              >
                TERMS
              </button>
            </nav>
          </div>

          {/* Bottom Metabar */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-cream/40">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span>DEPLOYED ON APTOS DEVNET</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <span>CONTRACT {truncateAddress(MARKETPLACE_CONTRACT_ADDRESS, 6, 4)}</span>
                <button
                  type="button"
                  onClick={handleCopyContract}
                  className="hover:text-neon transition-colors p-1 rounded"
                  title="Copy contract address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-neon" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
            </div>

            <div className="text-center sm:text-right">
              © 2026 ORBIX STUDIO. ALL RIGHTS RESERVED.
            </div>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="liquid-glass border-white/20 bg-space text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-grotesk text-xl uppercase tracking-wider text-neon">
              Privacy Policy
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-cream/60">
              Last updated: October 2026 • Decentralized Protocol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs font-mono text-cream/80 leading-relaxed py-2 max-h-[60vh] overflow-y-auto">
            <p>
              Orbix.nft operates on the Aptos distributed blockchain network via verified Move smart
              contracts.
            </p>
            <p>
              <strong className="text-cream">No Data Harvesting:</strong> We do not track, sell, or
              collect personal identity information, emails, or biometric cookies.
            </p>
            <p>
              <strong className="text-cream">Public Blockchain Ledger:</strong> All NFT minting,
              auctions, bids, and royalty parameters are publicly verifiable records permanently
              anchored on the Aptos network.
            </p>
            <p>
              <strong className="text-cream">Self-Custodial:</strong> You interact directly with
              Aptos RPC endpoints through your own wallet (Petra, Pontem, Martian, etc.). You remain
              the sole custodian of your private keys.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="liquid-glass border-white/20 bg-space text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-grotesk text-xl uppercase tracking-wider text-neon">
              Terms of Service
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-cream/60">
              Aptos Smart Contract Terms & Protocol Usage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs font-mono text-cream/80 leading-relaxed py-2 max-h-[60vh] overflow-y-auto">
            <p>
              By accessing Orbix.nft, you agree to interact with the immutable Move smart contract
              deployed on Aptos.
            </p>
            <p>
              <strong className="text-cream">Finality of Transactions:</strong> Blockchain state
              changes, including NFT bids, auctions, and direct transfers, are non-reversible once
              confirmed on the Aptos ledger.
            </p>
            <p>
              <strong className="text-cream">Creator Royalties:</strong> Secondary sales honor
              creator royalty shares up to the 30% cap specified in the on-chain registry.
            </p>
            <p>
              <strong className="text-cream">Risk Disclaimer:</strong> Digital collectibles and
              crypto assets are subject to market volatility. You are solely responsible for
              transaction gas fees and verifying digital artifact legitimacy.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
