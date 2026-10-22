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
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-space/40 border-b border-white/5 transition-colors">
        <div className="max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-3.5 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-1 font-grotesk text-xl uppercase tracking-wider text-cream hover:opacity-80 transition-opacity"
          >
            <span>orbix</span>
            <span className="font-condiment text-neon text-2xl normal-case -rotate-2 relative top-1">
              .nft
            </span>
          </Link>

          {/* Desktop Navigation Links */}
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

          {/* Action Buttons: Mint + Wallet */}
          <div className="hidden sm:flex items-center gap-3">
            <Button
              onClick={() => setMintOpen(true)}
              variant="outline"
              className="liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs font-bold px-3.5 py-2 h-auto flex items-center gap-1.5 rounded-xl uppercase tracking-wider"
            >
              <PlusCircle className="w-4 h-4 text-neon" />
              <span>MINT OBJECT</span>
            </Button>

            <WalletButton />
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <WalletButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-cream hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-4 py-4 space-y-3 bg-space border-b border-white/10">
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block font-grotesk uppercase text-sm py-2 px-3 rounded-lg text-cream hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                setMintOpen(true);
              }}
              variant="outline"
              className="w-full liquid-glass text-cream border-white/20 flex items-center justify-center gap-2 uppercase tracking-wider font-mono text-xs font-bold py-2.5 rounded-xl"
            >
              <PlusCircle className="w-4 h-4 text-neon" />
              <span>MINT OBJECT</span>
            </Button>
          </div>
        )}
      </header>

      <MintNFTModal open={mintOpen} onOpenChange={setMintOpen} />
    </>
  );
}
