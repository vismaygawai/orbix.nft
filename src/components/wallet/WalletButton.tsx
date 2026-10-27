/**
 * @file WalletButton.tsx
 * @description Primary wallet connection button, social login modal (Continue with Google),
 * and connected account dropdown menu for Orbix NFT Marketplace.
 */

import React, { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { truncateAddress, fetchAptosBalance, APTOS_NETWORK } from "@/lib/aptosClient";
import { toast } from "sonner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function WalletButton() {
  const { connected, account, network, disconnect, connect, wallets } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (connected && account?.address) {
      fetchAptosBalance(account.address).then(setBalance);
    } else {
      setBalance(null);
    }
  }, [connected, account?.address]);

  const handleCopy = () => {
    if (!account?.address) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Wallet disconnected");
    } catch (e) {
      console.error(e);
      toast.error("Failed to disconnect wallet");
    }
  };

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  const handleConnect = async (wallet: any) => {
    if (wallet.readyState === "NotDetected") {
      const targetUrl = isMobile ? "https://petra.app" : wallet.url || "https://petra.app";
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      if (isMobile) {
        toast.info(
          "Opening Petra Mobile App. You can also use Continue with Google for instant login without any app.",
        );
      } else {
        toast.info(`Please install ${wallet.name} extension to proceed.`);
      }
      return;
    }

    try {
      await connect(wallet.name as any);
      setConnectModalOpen(false);
      toast.success(`Connected with ${wallet.name}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || `Failed to connect with ${wallet.name}`);
    }
  };

  const handleGoogleConnect = async () => {
    if (googleWallet) {
      await handleConnect(googleWallet);
      return;
    }
    try {
      await connect("Continue with Google" as any);
      setConnectModalOpen(false);
      toast.success("Connected with Google");
    } catch (err: any) {
      console.error(err);
      const fallback = activeWallets.find(
        (w) => w.name.toLowerCase().includes("google") || (w as any).url?.includes("petra"),
      );
      if (fallback) {
        await handleConnect(fallback);
      } else {
        toast.error(err?.message || "Failed to connect with Google");
      }
    }
  };

  if (!isClient) {
    return (
      <Button
        variant="outline"
        className="liquid-glass text-cream border-white/20 hover:bg-white/10 uppercase tracking-wider font-mono text-xs font-bold"
      >
        <Wallet className="w-4 h-4 mr-2" /> CONNECT WALLET
      </Button>
    );
  }

  // Filter out internal development test wallets
  const activeWallets = (wallets || []).filter(
    (w) => !w.name.includes("Dev T") && w.name !== "T wallet",
  );

  const googleWallet =
    activeWallets.find((w) => w.name.toLowerCase().includes("google")) ||
    activeWallets.find((w) => w.name.toLowerCase().includes("aptos connect"));

  const extensionWallets = activeWallets.filter(
    (w) =>
      !w.name.toLowerCase().includes("google") &&
      !w.name.toLowerCase().includes("apple") &&
      !w.name.toLowerCase().includes("aptos connect"),
  );

  const isNetworkMismatch =
    connected &&
    Boolean(network?.name) &&
    network?.name?.toLowerCase() !== APTOS_NETWORK.toLowerCase();

  if (connected && account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-1.5 sm:py-2 h-auto flex items-center gap-1.5 sm:gap-2 cursor-pointer max-w-[200px] sm:max-w-none ${
              isNetworkMismatch ? "border-amber-400/50" : ""
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isNetworkMismatch ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span className="hidden sm:inline">{balance !== null ? `${balance} APT` : "..."}</span>
            <span className="hidden sm:inline text-cream/50">|</span>
            <span className="text-neon truncate">{truncateAddress(account.address)}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[calc(100vw-2rem)] sm:w-72 max-w-[340px] bg-space/95 border-white/10 text-cream backdrop-blur-xl p-3 space-y-2 rounded-2xl shadow-2xl"
        >
          <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wider text-cream/60">
            Connected Wallet
          </DropdownMenuLabel>

          {isNetworkMismatch && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Network Mismatch</span>
                Wallet is on <span className="underline uppercase">{network?.name}</span>. Contract
                is on <span className="underline uppercase">{APTOS_NETWORK}</span>.
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-mono">
            <div className="flex justify-between items-center text-cream/60 mb-1">
              <span>Account:</span>
              <button
                onClick={handleCopy}
                className="hover:text-neon transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="break-all font-mono text-[11px] text-cream">{account.address}</div>
          </div>

          <div className="flex justify-between items-center px-1 text-xs font-mono text-cream/70">
            <span>Network:</span>
            <span className="text-cream capitalize font-medium">
              {network?.name || APTOS_NETWORK}
            </span>
          </div>

          <div className="flex justify-between items-center px-1 text-xs font-mono text-cream/70">
            <span>Balance:</span>
            <span className="text-neon font-bold">
              {balance !== null ? `${balance} APT` : "0 APT"}
            </span>
          </div>

          <DropdownMenuSeparator className="bg-white/10" />

          <a
            href={`https://explorer.aptoslabs.com/account/${account.address}?network=${APTOS_NETWORK}`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between text-xs font-mono p-2 rounded-lg hover:bg-white/10 text-cream/80 hover:text-cream transition-colors"
          >
            <span>View on Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <DropdownMenuItem
            onClick={handleDisconnect}
            className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 cursor-pointer rounded-lg flex items-center gap-2 p-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button
        onClick={() => setConnectModalOpen(true)}
        className="orb-button text-cream font-mono text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 h-auto rounded-xl hover:scale-105 transition-transform flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider cursor-pointer shrink-0"
      >
        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:inline">CONNECT WALLET</span>
        <span className="sm:hidden">CONNECT</span>
      </Button>

      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="liquid-glass border-white/20 bg-space text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-grotesk text-xl uppercase tracking-wider text-neon">
              Connect to Orbix.nft
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-cream/60">
              Log in seamlessly with your Google account or connect an Aptos wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs font-mono text-cream/80 leading-relaxed py-2 max-h-[60vh] overflow-y-auto pr-1">
            {/* Social Login Section (Google Keyless via Aptos Connect / Petra Web) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neon font-bold block">
                  Instant Web3 Login
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-800">
                  RECOMMENDED
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoogleConnect}
                className="w-full liquid-glass hover:bg-white/15 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between transition-all border border-neon/40 hover:border-neon group text-left cursor-pointer shadow-lg hover:shadow-neon/20"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm shrink-0">
                    <GoogleIcon />
                  </div>
                  <div className="min-w-0">
                    <div className="font-grotesk uppercase text-sm sm:text-base text-cream group-hover:text-neon transition-colors truncate">
                      Continue with Google
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-mono text-cream/60 truncate">
                      Aptos Keyless login • No app or extension needed
                    </div>
                  </div>
                </div>
                <span className="text-neon text-xs font-mono uppercase font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-2">
                  →
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-3 text-cream/40 text-[10px] font-mono uppercase tracking-wider">
                {isMobile ? "Or Connect Wallet App" : "Or Connect Web3 Wallet"}
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            {/* Wallets List */}
            <div className="space-y-2">
              {extensionWallets.length > 0 ? (
                extensionWallets.map((wallet) => {
                  const isInstalled = wallet.readyState === "Installed";
                  return (
                    <button
                      key={wallet.name}
                      type="button"
                      onClick={() => handleConnect(wallet)}
                      className="w-full liquid-glass hover:bg-white/10 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between transition-all border border-white/10 hover:border-white/30 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {wallet.icon ? (
                          <img
                            src={wallet.icon}
                            alt={wallet.name}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain bg-white/5 p-1 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cream/80" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-grotesk uppercase text-xs sm:text-sm text-cream group-hover:text-neon transition-colors truncate">
                            {wallet.name}
                          </div>
                          <div className="text-[10px] font-mono text-cream/50 truncate">
                            {isInstalled
                              ? "Ready to connect"
                              : isMobile
                                ? "Open Petra app"
                                : "Install extension"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] sm:text-xs font-mono text-cream/60 group-hover:text-neon uppercase shrink-0 ml-2">
                        {isInstalled ? "Connect →" : isMobile ? "Open App ↗" : "Install ↗"}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-cream/60 font-mono text-xs">
                  {isMobile
                    ? "Tap Continue with Google above for instant mobile login."
                    : "No extension wallets detected. Use Continue with Google above or install Petra Wallet."}
                </div>
              )}
            </div>

            <div className="pt-2 text-center border-t border-white/10">
              <p className="text-[10px] font-mono text-cream/40">
                Connected to Aptos Devnet • Powered by Aptos Connect & Move
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
