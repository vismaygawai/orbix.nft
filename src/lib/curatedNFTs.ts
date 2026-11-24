/**
 * @file curatedNFTs.ts
 * @description Registry of verified ocean artifacts for orbix.nft featuring the three characters:
 * - Orby: Common character (#3) — $50 USD / 5 APT (Common)
 * - Orix: Secondary character (#1) — $100 USD / 10 APT (Rare)
 * - Orbix: Main character / highest rarity (#2) — $150 USD / 15 APT (Epic / Rarest)
 *
 * All three artifacts are owned and created by the Petra wallet:
 * 0xde4c5c78def94d326afe8bbbe9215487fc1dabe355e49090594f410c9e09459d
 * When purchased, payment transfers directly on-chain to this Petra wallet address.
 */

import { NFT } from "@/types/marketplace";
import {
  isSameAddress,
  isValidAptosAddress,
  PETRA_SELLER_WALLET,
  sanitizeMediaUri,
} from "./aptosClient";

export { PETRA_SELLER_WALLET };

export interface SalesHistoryEntry {
  nftId: number;
  seller: string;
  buyer: string;
  price: number;
  usdPrice: number;
  rarity: number;
  txHash: string;
  timestamp: number;
}

export const INITIAL_HERO_NFTS: NFT[] = [
  {
    id: 3,
    owner: PETRA_SELLER_WALLET,
    creator: PETRA_SELLER_WALLET,
    name: "Orby",
    description:
      "Orby — Uncommon character. The curious deep-sea companion navigating bioluminescent currents and tidal reefs. Rarity score 8.2/10.",
    uri: "/videos/nft3.mp4",
    price: 500_000_000, // 5 APT ($50 USD)
    usdPrice: 50,
    for_sale: true,
    rarity: 2, // Uncommon character
    in_auction: false,
    onChain: false,
  },
  {
    id: 1,
    owner: PETRA_SELLER_WALLET,
    creator: PETRA_SELLER_WALLET,
    name: "Orix",
    description:
      "Orix — Secondary character. The sentinel explorer guarding the benthic abyssal plain of the Mariana trench. Rarity score 8.7/10.",
    uri: "/videos/nft1.mp4",
    price: 1_000_000_000, // 10 APT ($100 USD)
    usdPrice: 100,
    for_sale: true,
    rarity: 3, // Rare / Secondary character
    in_auction: false,
    onChain: false,
  },
  {
    id: 2,
    owner: PETRA_SELLER_WALLET,
    creator: PETRA_SELLER_WALLET,
    name: "Orbix",
    description:
      "Orbix — Main character & highest rarity. The celestial oceanic core anchored beyond tides and time. Rarity score 9/10.",
    uri: "/videos/nft2.mp4",
    price: 1_500_000_000, // 15 APT ($150 USD)
    usdPrice: 150,
    for_sale: true,
    rarity: 4, // Epic / Highest Rarity Main Character
    in_auction: false,
    onChain: false,
  },
];

const STORAGE_KEY = "orbix:curated_nfts_v5";
const SALES_HISTORY_KEY = "orbix:sales_history";

function getSafeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function"
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

function isValidCuratedNFT(item: unknown): item is NFT {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  const id = candidate["id"];
  const owner = candidate["owner"];
  const name = candidate["name"];
  const description = candidate["description"];
  const uri = candidate["uri"];
  const price = candidate["price"];
  const forSale = candidate["for_sale"];
  const rarity = candidate["rarity"];

  if (typeof id !== "number" || !Number.isInteger(id) || id < 0) return false;
  if (!isValidAptosAddress(owner)) return false;
  if (typeof name !== "string" || !name.trim() || name.length > 128) return false;
  if (typeof description !== "string" || description.length > 1024) return false;
  if (typeof uri !== "string" || !sanitizeMediaUri(uri)) return false;
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) return false;
  if (typeof forSale !== "boolean") return false;
  if (typeof rarity !== "number" || !Number.isInteger(rarity) || rarity < 1 || rarity > 4) {
    return false;
  }
  return true;
}

/**
 * Retrieves the list of curated NFTs, reading and validating local state modifications if present.
 */
export function getCuratedNFTs(): NFT[] {
  const storage = getSafeStorage();
  if (!storage) {
    return INITIAL_HERO_NFTS;
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      storage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HERO_NFTS));
      return INITIAL_HERO_NFTS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_HERO_NFTS;
    }
    const validated = parsed.filter(isValidCuratedNFT).map((item) => ({
      ...item,
      uri: sanitizeMediaUri(item.uri),
      onChain: false,
    }));
    return validated.length > 0 ? validated : INITIAL_HERO_NFTS;
  } catch {
    return INITIAL_HERO_NFTS;
  }
}

/**
 * Persists curated NFT state modifications to localStorage.
 */
export function saveCuratedNFTs(nfts: NFT[]): void {
  const storage = getSafeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(nfts));
  } catch (err) {
    console.warn("Failed to persist curated NFTs to localStorage:", err);
  }
}

/**
 * Records an NFT purchase:
 * - Updates the artifact owner to the buyer's address
 * - Sets `for_sale` to false
 * - Dispatches a global window event to update all components
 */
export function recordNFTPurchase(nftId: number, newOwner: string, txHash?: string): void {
  if (!isValidAptosAddress(newOwner)) return;

  const current = getCuratedNFTs();
  const purchasedNft = current.find((n) => n.id === nftId);
  const updated: NFT[] = current.map((item) => {
    if (item.id === nftId) {
      return {
        ...item,
        owner: newOwner,
        for_sale: false,
      };
    }
    return item;
  });
  saveCuratedNFTs(updated);

  const storage = getSafeStorage();
  if (storage && purchasedNft) {
    try {
      const history = getValidatedSalesHistory();
      history.push({
        nftId,
        seller: purchasedNft.owner ?? PETRA_SELLER_WALLET,
        buyer: newOwner,
        price: purchasedNft.price ?? 0,
        usdPrice: purchasedNft.usdPrice ?? 0,
        rarity: purchasedNft.rarity ?? 1,
        txHash: txHash ?? "",
        timestamp: Date.now(),
      });
      storage.setItem(SALES_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage errors
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbix:nft-updated", { detail: { nftId, newOwner } }));
  }
}

/**
 * Retrieves validated local curated sales history entries.
 */
export function getValidatedSalesHistory(): SalesHistoryEntry[] {
  const storage = getSafeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(SALES_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === "object"),
      )
      .map((entry) => {
        const nftId = Number(entry["nftId"]);
        const fallbackRarity = INITIAL_HERO_NFTS.find((h) => h.id === nftId)?.rarity ?? 1;
        const rawRarity = Number(entry["rarity"]);
        const rarity =
          Number.isInteger(rawRarity) && rawRarity >= 1 && rawRarity <= 4
            ? rawRarity
            : fallbackRarity;

        return {
          nftId: Number.isInteger(nftId) && nftId >= 0 ? nftId : 0,
          seller: typeof entry["seller"] === "string" ? entry["seller"] : PETRA_SELLER_WALLET,
          buyer: typeof entry["buyer"] === "string" ? entry["buyer"] : "",
          price:
            typeof entry["price"] === "number" &&
            Number.isFinite(entry["price"]) &&
            entry["price"] >= 0
              ? entry["price"]
              : 0,
          usdPrice:
            typeof entry["usdPrice"] === "number" &&
            Number.isFinite(entry["usdPrice"]) &&
            entry["usdPrice"] >= 0
              ? entry["usdPrice"]
              : 0,
          rarity,
          txHash: typeof entry["txHash"] === "string" ? entry["txHash"] : "",
          timestamp:
            typeof entry["timestamp"] === "number" && Number.isFinite(entry["timestamp"])
              ? entry["timestamp"]
              : Date.now(),
        };
      })
      .filter((entry) => entry.price > 0 && isValidAptosAddress(entry.buyer));
  } catch {
    return [];
  }
}

/**
 * Records listing an NFT for sale.
 */
export function recordNFTListing(nftId: number, priceOctas: number, usdPrice?: number): void {
  if (!Number.isFinite(priceOctas) || priceOctas <= 0) return;
  const current = getCuratedNFTs();
  const updated: NFT[] = current.map((item) => {
    if (item.id === nftId) {
      const updatedItem: NFT = {
        ...item,
        price: priceOctas,
        for_sale: true,
      };
      if (usdPrice !== undefined && Number.isFinite(usdPrice) && usdPrice >= 0) {
        updatedItem.usdPrice = usdPrice;
      }
      return updatedItem;
    }
    return item;
  });
  saveCuratedNFTs(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbix:nft-updated", { detail: { nftId } }));
  }
}

/**
 * Returns all curated/local artifacts owned by a specific address.
 */
export function getOwnedCuratedNFTs(ownerAddress: string): NFT[] {
  if (!ownerAddress) return [];
  const all = getCuratedNFTs();
  return all.filter((n) => isSameAddress(n.owner, ownerAddress));
}

/**
 * Returns all curated artifacts currently listed for sale.
 */
export function getForSaleCuratedNFTs(): NFT[] {
  const all = getCuratedNFTs();
  return all.filter((n) => n.for_sale);
}

/**
 * Resets curated artifacts to default initial state.
 */
export function resetCuratedNFTs(): void {
  const storage = getSafeStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HERO_NFTS));
    storage.removeItem(SALES_HISTORY_KEY);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
  }
}
