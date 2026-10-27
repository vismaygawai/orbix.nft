/**
 * @file aptosClient.ts
 * @description Centralized Aptos blockchain client, environment configuration,
 * serialization utilities, and Move smart contract payload builders.
 *
 * Supports Aptos Devnet, Testnet, and Mainnet via VITE_ environment variables.
 */

import { AptosClient } from "aptos";

/**
 * Aptos fullnode RPC endpoint URL.
 * Defaults to Aptos Labs Devnet if not overridden by VITE_APTOS_NODE_URL in .env.
 */
export const APTOS_NODE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env["VITE_APTOS_NODE_URL"]) ||
  "https://fullnode.devnet.aptoslabs.com/v1";

/**
 * Verified NFTMarketplace Move smart contract deployment address.
 * Defaults to Devnet address (0x4bee16faf...) if not configured in .env.
 */
export const MARKETPLACE_CONTRACT_ADDRESS =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env["VITE_MARKETPLACE_CONTRACT_ADDRESS"]) ||
  "0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb";

/**
 * Active Aptos network identifier ('devnet' | 'testnet' | 'mainnet').
 */
export const APTOS_NETWORK =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env["VITE_APTOS_NETWORK"]) ||
  "devnet";

/**
 * Singleton AptosClient instance connected to the configured fullnode RPC.
 */
export const aptosClient = new AptosClient(APTOS_NODE_URL);

/**
 * Number of Octas per 1 APT (1 APT = 10^8 Octas).
 */
export const OCTAS_PER_APT = 100_000_000;

/**
 * Converts native Aptos Octas (smallest unit) into human-readable APT.
 * Formatted to 4 decimal places.
 *
 * @param octas - Raw blockchain value as number, string, or bigint
 * @returns Floating point APT amount
 */
export function octasToApt(octas: number | string | bigint): number {
  try {
    const val = BigInt(octas);
    const whole = Number(val / 100_000_000n);
    const fraction = Number(val % 100_000_000n) / 1e8;
    return Number((whole + fraction).toFixed(4));
  } catch {
    return 0;
  }
}

/**
 * Converts human-readable APT into blockchain Octas (integer).
 * Uses string-based decimal splitting to avoid floating point precision issues (e.g. 0.00000001).
 *
 * @param apt - APT amount as number or string
 * @returns Integer Octas value
 */
export function aptToOctas(apt: number | string): number {
  const str = String(apt).trim();
  if (!str || isNaN(Number(str))) return 0;
  const [whole, fraction = ""] = str.split(".");
  const paddedFraction = fraction.padEnd(8, "0").slice(0, 8);
  const cleanWhole = (whole || "0").replace(/^0+(?=\d)/, "") || "0";
  return Number(BigInt(`${cleanWhole}${paddedFraction}`));
}

/**
 * High-precision string/BigInt conversion for Aptos payloads exceeding Number.MAX_SAFE_INTEGER.
 */
export function aptToOctasBigInt(apt: number | string): bigint {
  const str = String(apt).trim();
  if (!str || isNaN(Number(str))) return 0n;
  const [whole, fraction = ""] = str.split(".");
  const paddedFraction = fraction.padEnd(8, "0").slice(0, 8);
  const cleanWhole = (whole || "0").replace(/^0+(?=\d)/, "") || "0";
  return BigInt(`${cleanWhole}${paddedFraction}`);
}

/**
 * Sanitizes user-supplied media URIs to prevent XSS (e.g. javascript:, data:text/html).
 * Only allows safe protocols: https://, http://, ipfs://, or relative site paths.
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
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  ) {
    return trimmed;
  }
  return "";
}

/**
 * Shortens a blockchain hex address for UI display (e.g., 0x4bee...f6fb).
 *
 * @param address - Full hexadecimal account or contract address
 * @param start - Number of leading characters to preserve (default: 6)
 * @param end - Number of trailing characters to preserve (default: 4)
 */
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return "";
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Encodes a JavaScript string into a vector of UTF-8 byte numbers (vector<u8>)
 * required by Aptos Move smart contract entry functions.
 *
 * @param str - Plain text string
 * @returns Array of byte values [u8]
 */
export function encodeStringToVector(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

/**
 * Decodes on-chain Move string outputs from either raw byte vectors or hex-encoded strings.
 * Safely handles both formats returned by Aptos RPC view functions.
 *
 * @param value - Vector of u8 numbers or hex string ('0x...')
 * @returns Decoded human-readable UTF-8 string
 */
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

/**
 * Constructs an entry function payload compliant with @aptos-labs/wallet-adapter-react v3+.
 * Automatically prefixes the target function with the marketplace contract address and module name.
 *
 * @param functionName - Target Move function name (e.g. 'mint_nft', 'list_for_sale', 'buy_nft')
 * @param functionArguments - Positional arguments passed to the entry function
 * @returns Formatted payload object ready for signAndSubmitTransaction()
 */
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

/**
 * Rarity tier metadata map conforming to NFTMarketplace.move contract definitions.
 * Tiers: 1 = Common, 2 = Uncommon, 3 = Rare, 4 = Epic.
 */
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

/**
 * Resolves rarity information and styling tokens for a given rarity tier number.
 */
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
 * Queries the native APT balance of an Aptos address from the on-chain CoinStore resource.
 *
 * @param address - Aptos account hex address
 * @returns Balance in APT (converted from Octas)
 */
export async function fetchAptosBalance(address: string): Promise<number> {
  try {
    const resources: any[] = await aptosClient.getAccountResources(address);
    const coinStore = resources.find(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
    );
    if (coinStore && coinStore.data?.coin?.value) {
      return octasToApt(coinStore.data.coin.value);
    }
    return 0;
  } catch (err) {
    console.warn("Could not fetch Aptos balance:", err);
    return 0;
  }
}
