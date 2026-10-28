/**
 * @file aptosClient.ts
 * @description Centralized Aptos blockchain client, environment configuration,
 * serialization utilities, and Move smart contract payload builders.
 *
 * Supports Aptos Devnet, Testnet, and Mainnet via VITE_ environment variables.
 */

import { AptosClient } from "aptos";

export const APTOS_NODE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env["VITE_APTOS_NODE_URL"]) ||
  "https://fullnode.devnet.aptoslabs.com/v1";

export const MARKETPLACE_CONTRACT_ADDRESS =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env["VITE_MARKETPLACE_CONTRACT_ADDRESS"]) ||
  "0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb";

export const APTOS_NETWORK =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env["VITE_APTOS_NETWORK"]) ||
  "devnet";

export const aptosClient = new AptosClient(APTOS_NODE_URL);

export const OCTAS_PER_APT = 100_000_000;

/**
 * Converts native Aptos Octas (smallest unit) into human-readable APT.
 * Supports up to 8 decimal places without premature truncation to 0.
 */
export function octasToApt(octas: number | string | bigint): number {
  try {
    const val = typeof octas === "bigint" ? octas : BigInt(Math.trunc(Number(octas) || 0));
    if (val <= 0n) return 0;
    const whole = Number(val / 100_000_000n);
    const fraction = Number(val % 100_000_000n) / OCTAS_PER_APT;
    return Number((whole + fraction).toFixed(8));
  } catch {
    return 0;
  }
}

/**
 * Normalizes a number or string into a safe non-scientific decimal string.
 */
function normalizeDecimalInput(apt: number | string): string | null {
  if (typeof apt === "number") {
    if (!Number.isFinite(apt) || apt <= 0) return null;
    return apt.toFixed(8);
  }
  const str = String(apt).trim();
  if (!str) return null;
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 0) return null;
  // Convert scientific notation (e.g. "1e-7") into fixed decimal string
  if (str.includes("e") || str.includes("E")) {
    return num.toFixed(8);
  }
  if (!/^\d+(\.\d+)?$/.test(str)) return null;
  return str;
}

/**
 * Converts human-readable APT into blockchain Octas (integer).
 */
export function aptToOctas(apt: number | string): number {
  const normalized = normalizeDecimalInput(apt);
  if (!normalized) return 0;
  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(8, "0").slice(0, 8);
  const cleanWhole = (whole || "0").replace(/^0+(?=\d)/, "") || "0";
  return Number(BigInt(`${cleanWhole}${paddedFraction}`));
}

/**
 * High-precision string/BigInt conversion for Aptos payloads exceeding Number.MAX_SAFE_INTEGER.
 */
export function aptToOctasBigInt(apt: number | string): bigint {
  const normalized = normalizeDecimalInput(apt);
  if (!normalized) return 0n;
  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(8, "0").slice(0, 8);
  const cleanWhole = (whole || "0").replace(/^0+(?=\d)/, "") || "0";
  return BigInt(`${cleanWhole}${paddedFraction}`);
}

/**
 * Sanitizes user-supplied media URIs to prevent XSS (e.g. javascript:, data:text/html).
 * Also converts ipfs:// protocol URIs to an HTTPS gateway for browser playback.
 */
export function sanitizeMediaUri(uri: string): string {
  if (!uri || typeof uri !== "string") return "";
  const trimmed = uri.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  if (trimmed.startsWith("ipfs://")) {
    return trimmed.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return "";
}

/**
 * Normalizes an Aptos address to a lowercase 64-character hex string prefixed with 0x.
 * Handles addresses with or without leading zeros, or objects returned by wallet adapters.
 */
export function normalizeAddress(addr: unknown): string {
  if (!addr) return "";
  const raw = String(addr).trim().toLowerCase();
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!hex || /^0+$/.test(hex)) return "0x0";
  return `0x${hex.padStart(64, "0")}`;
}

/**
 * Safe equality check between two Aptos addresses.
 * Resolves representation differences (leading zero padding, casing, object wrappers).
 */
export function isSameAddress(a: unknown, b: unknown): boolean {
  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);
  return Boolean(normA && normB && normA !== "0x0" && normA === normB);
}

export function truncateAddress(address: unknown, start = 6, end = 4): string {
  if (!address) return "";
  const str = String(address).trim();
  if (str.length <= start + end) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export function encodeStringToVector(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

export function decodeVectorOrHexToString(value: any): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      try {
        const hex = value.slice(2);
        const bytes = new Uint8Array(hex.match(/[\da-f]{2}/gi)?.map((h) => parseInt(h, 16)) || []);
        return new TextDecoder().decode(bytes);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    try {
      return new TextDecoder().decode(new Uint8Array(value));
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export const decodeVectorToString = decodeVectorOrHexToString;

export function createEntryPayload(
  functionName: string,
  functionArguments: (string | number | number[])[],
): any {
  return {
    data: {
      function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::${functionName}`,
      typeArguments: [],
      functionArguments,
    },
  };
}

export const RARITY_MAP: Record<number, { label: string; color: string; badgeClass: string }> = {
  1: {
    label: "Common",
    color: "text-neutral-400",
    badgeClass: "bg-neutral-800 text-neutral-300 border-neutral-700",
  },
  2: {
    label: "Uncommon",
    color: "text-emerald-400",
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-800",
  },
  3: {
    label: "Rare",
    color: "text-blue-400",
    badgeClass: "bg-blue-950/60 text-blue-300 border-blue-800",
  },
  4: {
    label: "Epic",
    color: "text-neon",
    badgeClass: "bg-pink-950/60 text-pink-300 border-pink-700",
  },
};

export function getRarityInfo(rarity: number) {
  return (
    RARITY_MAP[rarity] || {
      label: "Standard",
      color: "text-neutral-400",
      badgeClass: "bg-neutral-800 text-neutral-300 border-neutral-700",
    }
  );
}

/**
 * Queries the native APT balance of an Aptos address.
 * Uses the `0x1::coin::balance` view function first (supports both Fungible Asset & CoinStore)
 * with a fallback to `getAccountResources`.
 */
export async function fetchAptosBalance(address: unknown): Promise<number> {
  if (!address) return 0;
  const cleanAddr = String(address).trim();
  try {
    const result = await aptosClient.view({
      function: "0x1::coin::balance",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: [cleanAddr],
    });
    if (Array.isArray(result) && result[0] !== undefined) {
      return octasToApt(String(result[0]));
    }
  } catch {
    // Fallback to legacy CoinStore resource lookup
    try {
      const resources: any[] = await aptosClient.getAccountResources(cleanAddr);
      const coinStore = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
      );
      if (coinStore && coinStore.data?.coin?.value) {
        return octasToApt(coinStore.data.coin.value);
      }
    } catch (err) {
      console.warn("Could not fetch Aptos balance:", err);
    }
  }
  return 0;
}

/**
 * Confirms an Aptos transaction on-chain, throwing an error if the transaction aborted or failed.
 */
export async function confirmTransaction(response: any): Promise<string> {
  const txHash = typeof response === "string" ? response : response?.hash;
  if (!txHash) {
    throw new Error("Transaction was not returned by wallet");
  }
  const tx: any = await aptosClient.waitForTransactionWithResult(txHash, {
    checkSuccess: true,
  });
  if (tx && tx.success === false) {
    throw new Error(tx.vm_status || "Transaction aborted on-chain");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
  }
  return txHash;
}
