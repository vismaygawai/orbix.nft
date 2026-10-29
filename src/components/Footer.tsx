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

  const handleCopyContract = async () => {
    try {
      await navigator.clipboard.writeText(MARKETPLACE_CONTRACT_ADDRESS);
      setCopied(true);
      toast.success("Contract address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy contract address");
    }
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
              className="flex items-center gap-[0.06em] font-grotesk text-4xl sm:text-6xl md:text-7xl lg:text-8xl uppercase tracking-wider text-cream hover:opacity-85 transition-opacity"
            >
              <span>Orbix</span>
              <span
                aria-hidden="true"
                className="font-condiment text-neon text-[1.15em] normal-case -rotate-2 relative top-[0.2em]"
              >
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
                <span>EXPLORER</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>

              <a
                href="https://devfolio.co/projects/nft-digital-assets-marketplace-5e7c"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs sm:text-sm uppercase tracking-wider text-cream/70 hover:text-neon transition-colors flex items-center gap-1.5"
              >
                <span>DEVFOLIO</span>
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
              <span>DEPLOYED ON APTOS {APTOS_NETWORK.toUpperCase()}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <span>CONTRACT {truncateAddress(MARKETPLACE_CONTRACT_ADDRESS, 6, 4)}</span>
                <button
                  type="button"
                  onClick={handleCopyContract}
                  className="hover:text-neon transition-colors p-1 rounded cursor-pointer"
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

          <div className="space-y-4 text-xs font-mono text-cream/80 leading-relaxed py-2 max-h-[60vh] overflow-y-auto pr-1">
            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                1. Data Minimization & Decentralization
              </h4>
              <p>
                Orbix is a decentralized non-custodial NFT marketplace executing on the Aptos
                blockchain via Move smart contracts. We do not collect, store, or sell personal
                identity records, IP logs, cookies, or financial credentials.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                2. On-Chain Transparency
              </h4>
              <p>
                All marketplace transactions—including minting, listing, auctions, bids, and
                offers—are recorded publicly on the Aptos distributed ledger. Your public wallet
                address and transaction history are immutable and accessible to anyone via public
                Aptos node RPCs and block explorers.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                3. Third-Party Wallets & RPC Providers
              </h4>
              <p>
                When connecting your Petra Wallet, Google Keyless account (Aptos Connect), Pontem,
                or Martian, you interact directly with those providers. Their respective privacy
                policies govern their services.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                4. Decentralized Media Storage
              </h4>
              <p>
                Metadata and digital assets are pinned to IPFS and decentralized storage networks.
                Once an artifact is minted, its cryptographic hash is permanent.
              </p>
            </section>
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
              Last updated: October 2026 • Aptos Move Protocol
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs font-mono text-cream/80 leading-relaxed py-2 max-h-[60vh] overflow-y-auto pr-1">
            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                1. Protocol Autonomy & Smart Contracts
              </h4>
              <p>
                Orbix operates as a direct interface to autonomous Move smart contracts deployed on
                Aptos. Transactions executed through the protocol are irrevocable and final once
                confirmed by the Aptos consensus validators.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                2. Non-Custodial Marketplace Escrow
              </h4>
              <p>
                The marketplace never takes custody of your digital artifacts or APT coins. During
                live auctions and pending offers, tokens and NFTs are securely escrowed directly
                inside the on-chain smart contract, refundable at any time in accordance with the
                Move contract logic.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                3. Creator Royalties & Fees
              </h4>
              <p>
                Secondary sales enforce a 2% marketplace protocol fee. Creator royalties (up to 30%)
                are configured on-chain and disbursed atomically on every settled transaction.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-grotesk uppercase text-sm text-cream font-bold">
                4. User Responsibility
              </h4>
              <p>
                You are solely responsible for safeguarding your private keys and verifying
                transaction payloads before signing in your wallet. Orbix cannot reverse blockchain
                transactions or recover funds sent to erroneous addresses.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
