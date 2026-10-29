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
    return trimmed;
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

let ledgerTimeDelta = 0;

/**
 * Synchronizes the client with the Aptos blockchain ledger time to avoid client clock drift.
 */
export async function syncLedgerTime(): Promise<number> {
  try {
    const ledgerInfo = await aptosClient.getLedgerInfo();
    if (ledgerInfo && ledgerInfo.ledger_timestamp) {
      const ledgerSecs = Math.floor(Number(ledgerInfo.ledger_timestamp) / 1_000_000);
      const nowSecs = Math.floor(Date.now() / 1000);
      ledgerTimeDelta = ledgerSecs - nowSecs;
      return ledgerSecs;
    }
  } catch (err) {
    console.warn("Failed to sync Aptos ledger timestamp:", err);
  }
  return Math.floor(Date.now() / 1000);
}

/**
 * Returns the current time in seconds, synchronized with the Aptos ledger.
 */
export function getNowSeconds(): number {
  return Math.floor(Date.now() / 1000) + ledgerTimeDelta;
}

// Centralized Move abort map for friendly user feedback
export const MOVE_ERROR_MAP: Record<string, string> = {
  ENOT_OWNER: "You do not own this ocean artifact.",
  EALREADY_LISTED: "This artifact is already listed for sale.",
  EINVALID_PRICE: "Price must be greater than zero.",
  EINVALID_RARITY: "Rarity tier must be between 1 (Common) and 4 (Epic).",
  EINVALID_NAME: "Artifact name cannot be empty (max 128 characters).",
  EINVALID_DESCRIPTION: "Artifact description exceeds 1024 characters.",
  EINVALID_URI: "Artifact media URI exceeds 512 characters or is empty.",
  EINVALID_ADDRESS: "Recipient address cannot be zero (0x0).",
  ESAME_OWNER: "Cannot transfer artifact to the current owner.",
  ENOT_FOR_SALE: "This artifact is not currently listed for direct sale.",
  EINSUFFICIENT_PAYMENT: "Insufficient payment or wallet balance.",
  ECANNOT_BUY_OWN_NFT: "You cannot purchase or bid on your own artifact.",
  ENFT_IN_AUCTION: "This artifact is currently locked in an active auction.",
  ENFT_NOT_FOUND: "Artifact not found on-chain.",
  EINVALID_DURATION: "Auction duration must be at least 1 hour.",
  EMAX_ROYALTY_EXCEEDED: "Creator royalty cannot exceed 30%.",
  EINVALID_EXPIRATION: "Offer expiration must be set in the future.",
  EOFFER_EXPIRED: "This offer has already expired.",
  EOFFER_NOT_FOUND: "Offer not found or invalid index.",
  EOFFER_NOT_PENDING: "This offer is no longer pending or active.",
  EALREADY_INITIALIZED: "Marketplace is already initialized.",
  EAUCTION_ALREADY_EXISTS: "An active auction already exists for this artifact.",
  EAUCTION_NOT_ENDED: "Auction duration has not ended yet.",
  EAUCTION_HAS_BIDS: "Auction already has bids and cannot be cancelled.",
  EALREADY_HIGHEST_BIDDER: "You are already the highest bidder.",
  EBID_TOO_LOW: "Bid must be strictly higher than current highest bid.",
  EAUCTION_NOT_ACTIVE: "Auction is no longer active.",
  EAUCTION_EXPIRED: "Auction has already expired.",

  // Decimal codes
  "100": "You do not own this ocean artifact.",
  "101": "This artifact is already listed for sale.",
  "102": "Price must be greater than zero.",
  "103": "Rarity tier must be between 1 and 4.",
  "104": "Artifact name cannot be empty (max 128 characters).",
  "105": "Artifact description exceeds 1024 characters.",
  "106": "Artifact media URI exceeds 512 characters or is empty.",
  "107": "Recipient address cannot be zero (0x0).",
  "108": "Cannot transfer artifact to the current owner.",
  "400": "This artifact is not currently listed for direct sale.",
  "401": "Insufficient payment or wallet balance.",
  "402": "You cannot purchase or bid on your own artifact.",
  "403": "This artifact is currently locked in an active auction.",
  "1000": "Artifact not found on-chain.",
  "1001": "Auction duration must be at least 1 hour.",
  "1005": "Creator royalty cannot exceed 30%.",
  "1006": "Offer expiration must be set in the future.",
  "1008": "This offer has already expired.",
  "1009": "Offer not found or invalid index.",
  "1010": "This offer is no longer pending or active.",
  "1011": "Marketplace is already initialized.",
  "1012": "An active auction already exists for this artifact.",
  "1013": "Auction duration has not ended yet.",
  "1014": "Auction already has bids and cannot be cancelled.",
  "1015": "You are already the highest bidder.",
  "1016": "Bid must be strictly higher than current highest bid.",
  "1017": "Auction is no longer active.",
  "1018": "Auction has already expired.",

  // Hex codes
  "0x64": "You do not own this ocean artifact.",
  "0x65": "This artifact is already listed for sale.",
  "0x66": "Price must be greater than zero.",
  "0x67": "Rarity tier must be between 1 and 4.",
  "0x68": "Artifact name cannot be empty.",
  "0x69": "Artifact description exceeds 1024 characters.",
  "0x6a": "Artifact media URI exceeds 512 characters or is empty.",
  "0x6b": "Recipient address cannot be zero (0x0).",
  "0x6c": "Cannot transfer artifact to the current owner.",
  "0x190": "This artifact is not currently listed for direct sale.",
  "0x191": "Insufficient payment or wallet balance.",
  "0x192": "You cannot purchase or bid on your own artifact.",
  "0x193": "This artifact is currently locked in an active auction.",
  "0x3e8": "Artifact not found on-chain.",
  "0x3e9": "Auction duration must be at least 1 hour.",
  "0x3ed": "Creator royalty cannot exceed 30%.",
  "0x3ee": "Offer expiration must be set in the future.",
  "0x3f0": "This offer has already expired.",
  "0x3f1": "Offer not found or invalid index.",
  "0x3f2": "This offer is no longer pending or active.",
  "0x3f3": "Marketplace is already initialized.",
  "0x3f4": "An active auction already exists for this artifact.",
  "0x3f5": "Auction duration has not ended yet.",
  "0x3f6": "Auction already has bids and cannot be cancelled.",
  "0x3f7": "You are already the highest bidder.",
  "0x3f8": "Bid must be strictly higher than current highest bid.",
  "0x3f9": "Auction is no longer active.",
  "0x3fa": "Auction has already expired.",
};

/**
 * Parses Move VM abort codes and wallet errors into user-friendly explanations.
 */
export function parseMoveAbort(err: unknown): string {
  if (!err) return "Transaction failed";
  const msg =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as any).message)
      : String(err);

  if (/user rejected/i.test(msg) || /rejected the request/i.test(msg)) {
    return "Transaction was cancelled in wallet.";
  }

  // 1. Check named error identifiers (e.g. EAUCTION_EXPIRED, ENOT_OWNER)
  for (const [key, description] of Object.entries(MOVE_ERROR_MAP)) {
    if (key.startsWith("E") && msg.includes(key)) {
      return description;
    }
  }

  // 2. Check explicit abort clauses: abort 1018, aborted with 1018, abort_code: 1018
  const abortMatch = msg.match(
    /(?:abort(?:ed)?(?:_code)?(?:\s+with)?(?:\s*:)?\s*)(\d+|0x[0-9a-fA-F]+)/i,
  );
  if (abortMatch && abortMatch[1]) {
    const rawCode = abortMatch[1].toLowerCase();
    const mapped = MOVE_ERROR_MAP[rawCode];
    if (mapped) {
      return mapped;
    }
  }

  // 3. Check standalone numeric or hex codes with word boundaries (prevent 101 matching inside 1018)
  const tokenMatch = msg.match(/\b(10\d\d|40[0-3]|10[0-8]|0x[0-9a-fA-F]+)\b/);
  if (tokenMatch && tokenMatch[1]) {
    const rawCode = tokenMatch[1].toLowerCase();
    const mapped = MOVE_ERROR_MAP[rawCode];
    if (mapped) {
      return mapped;
    }
  }

  return msg.length > 120 ? `${msg.slice(0, 117)}...` : msg;
}

/**
 * Checks if a URI represents video media, ignoring query strings and fragments.
 */
export function isVideoUri(uri: string): boolean {
  if (!uri || typeof uri !== "string") return false;
  const urlPart = uri.split("?")[0] ?? "";
  const clean = (urlPart.split("#")[0] ?? "").toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov") ||
    uri.includes("cloudfront.net")
  );
}

/**
 * Resolves media URI for browser rendering (converting IPFS protocols and stripping dangerous schemes).
 */
export function resolveMediaUrl(uri: string): string {
  if (!uri || typeof uri !== "string") return "";
  const trimmed = uri.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  if (trimmed.startsWith("ipfs://")) {
    const hash = trimmed.slice(7).replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${hash}`;
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return trimmed;
}
