/**
 * @file AptosWalletProvider.tsx
 * @description Client-safe React context wrapper for Aptos Wallet Adapter.
 *
 * Supports both browser extension wallets (Petra, Pontem, Nightly) and
 * Web3 social logins ("Continue with Google" via Aptos Connect / Keyless).
 *
 * In TanStack Start / SSR environments, browser wallet extensions rely on `window`
 * and Chrome extension APIs which do not exist during server-side rendering.
 * This component enforces a hydration boundary: rendering raw children on the server
 * and mounting the wallet adapter provider only after client-side hydration has completed.
 */

import React, { useEffect, useState, useMemo } from "react";
import { AptosWalletAdapterProvider, NetworkName } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { APTOS_NETWORK } from "@/lib/aptosClient";

interface Props {
  children: React.ReactNode;
}

export function AptosWalletProvider({ children }: Props) {
  const [isClient, setIsClient] = useState(false);

  // Mount only in browser context after SSR hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize wallet plugins only on client side
  const wallets = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      return [new PetraWallet()];
    } catch (e) {
      console.warn("Failed to initialize wallet plugin:", e);
      return [];
    }
  }, []);

  // Map network string identifier to wallet adapter NetworkName enum
  const targetNetwork = useMemo(() => {
    if (APTOS_NETWORK === "mainnet") return NetworkName.Mainnet;
    if (APTOS_NETWORK === "testnet") return NetworkName.Testnet;
    return NetworkName.Devnet;
  }, []);

  // Server-side fallback: render children directly without wallet context
  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      disableTelemetry={true}
      dappConfig={{
        network: targetNetwork as any,
        aptosConnect: {
          dappName: "Orbix.nft",
        },
      }}
      onError={(error) => {
        console.error("Aptos wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
