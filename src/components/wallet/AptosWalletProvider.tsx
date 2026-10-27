/**
 * @file AptosWalletProvider.tsx
 * @description Client-safe React context wrapper for Aptos Wallet Adapter.
 *
 * Supports both browser extension wallets (Petra, Pontem, Nightly) and
 * Web3 social logins ("Continue with Google" via Aptos Connect / Keyless).
 *
 * Enforces SSR compatibility by keeping the AptosWalletAdapterProvider context
 * mounted on both server and client, while dynamically injecting browser wallet
 * plugins only after client-side hydration has completed.
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize wallet plugins only on client side
  const wallets = useMemo(() => {
    if (!isClient || typeof window === "undefined") return [];
    try {
      return [new PetraWallet()];
    } catch (e) {
      console.warn("Failed to initialize wallet plugin:", e);
      return [];
    }
  }, [isClient]);

  // Map network string identifier to wallet adapter NetworkName enum
  const targetNetwork = useMemo(() => {
    if (APTOS_NETWORK === "mainnet") return NetworkName.Mainnet;
    if (APTOS_NETWORK === "testnet") return NetworkName.Testnet;
    return NetworkName.Devnet;
  }, []);

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={isClient}
      disableTelemetry={true}
      dappConfig={{
        network: targetNetwork as any,
        aptosConnect: {
          dappName: "orbix.nft",
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
