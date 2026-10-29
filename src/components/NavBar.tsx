import React, { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { WalletButton } from "@/components/wallet/WalletButton";
import { MintNFTModal } from "@/components/marketplace/MintNFTModal";
import { Button } from "@/components/ui/button";
import { PlusCircle, Menu, X } from "lucide-react";

export function NavBar() {
  const [mintOpen, setMintOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navLinks = [
    { label: "Homepage", to: "/" },
    { label: "Marketplace", to: "/market" },
    { label: "My Collection", to: "/my-nfts" },
    { label: "Analytics", to: "/analytics" },
    { label: "Royalties", to: "/royalties" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-space/60 border-b border-white/10 transition-colors">
        <div className="max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-1 font-grotesk text-lg sm:text-xl uppercase tracking-wider text-cream hover:opacity-80 transition-opacity shrink-0"
          >
            <span>Orbix</span>
            <span
              aria-hidden="true"
              className="font-condiment text-neon text-2xl normal-case -rotate-2 relative top-1"
            >
              .nft
            </span>
          </Link>

          {/* Desktop Navigation Links (Large screens only) */}
          <nav className="hidden lg:block liquid-glass rounded-full border border-white/15 px-8 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = currentPath === link.to;
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={`font-grotesk text-xs uppercase tracking-wider transition-colors duration-200 outline-none ${
                        isActive ? "text-neon font-bold" : "text-cream/80 hover:text-neon"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Action Buttons: Desktop Mint + Wallet (lg screens) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Button
              onClick={() => setMintOpen(true)}
              variant="outline"
              className="liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs font-bold px-3.5 py-2 h-auto flex items-center gap-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-neon" />
              <span>MINT OBJECT</span>
            </Button>

            <WalletButton />
          </div>

          {/* Mobile & Tablet Bar (< lg) */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <WalletButton />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-cream hover:bg-white/10 w-9 h-9 rounded-xl border border-white/10 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile & Tablet Full-width dropdown (< lg) */}
        {mobileMenuOpen && (
          <div className="lg:hidden w-full bg-space/95 border-b border-white/10 px-4 sm:px-6 py-4 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => {
                const isActive = currentPath === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`font-grotesk text-sm uppercase tracking-wider py-2 px-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-white/10 text-neon font-bold"
                        : "text-cream/80 hover:bg-white/5 hover:text-neon"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMintOpen(true);
                  }}
                  variant="outline"
                  className="w-full liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs font-bold py-2.5 h-auto flex items-center justify-center gap-2 rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-neon" />
                  <span>MINT NEW ARTIFACT</span>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <MintNFTModal open={mintOpen} onOpenChange={setMintOpen} />
    </>
  );
}
