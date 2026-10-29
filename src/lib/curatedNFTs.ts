/**
 * @file curatedNFTs.ts
 * @description Registry of verified ocean artifacts for orbix.nft.
 *
 * Configured with the three hero section artifacts:
 * - Uncommon: Artifact #3 ($50 USD / 5 APT)
 * - Rare: Artifact #1 ($100 USD / 10 APT)
 * - Rarest (Epic): Artifact #2 ($150 USD / 15 APT)
 *
 * All three artifacts are owned and created by the Petra wallet:
 * 0xde4c5c78def94d326afe8bbbe9215487fc1dabe355e49090594f410c9e09459d
 * When purchased, payment transfers directly on-chain to this Petra wallet address.
 */

import { NFT } from "@/types/marketplace";
import { isSameAddress } from "./aptosClient";

export const PETRA_SELLER_WALLET =
  "0xde4c5c78def94d326afe8bbbe9215487fc1dabe355e49090594f410c9e09459d";

export const INITIAL_HERO_NFTS: NFT[] = [
  {
    id: 3,
    owner: PETRA_SELLER_WALLET,
    creator: PETRA_SELLER_WALLET,
    name: "Abyssal Tide #03",
    description:
      "Captures the deep luminescence of uncharted oceanic currents. Rarity score 8.2/10.",
    uri: "/videos/nft3.mp4",
    price: 500_000_000, // 5 APT ($50 USD)
    usdPrice: 50,
    for_sale: true,
    rarity: 2, // Uncommon
    in_auction: false,
  },
  {
    id: 1,
    owner: PETRA_SELLER_WALLET,
    creator: PETRA_SELLER_WALLET,
    name: "Deep Trench Core #01",
    description:
      "Extracted from the benthic abyssal plain of the Mariana floor. Rarity score 8.7/10.",
    uri: "/videos/nft1.mp4",
    price: 1_000_000_000, // 10 APT ($100 USD)
    usdPrice: 100,
    for_sale: true,
    rarity: 3, // Rare
    in_auction: false,
  },
  {
    id: 2,
    owner: PETRA_SELLER_WALLET,
    creator: PETRA_SELLER_WALLET,
    name: "Celestial Void Sphere #02",
    description: "The rarest ocean artifact anchored beyond tides and time. Rarity score 9/10.",
    uri: "/videos/nft2.mp4",
    price: 1_500_000_000, // 15 APT ($150 USD)
    usdPrice: 150,
    for_sale: true,
    rarity: 4, // Epic / Rarest
    in_auction: false,
  },
];

const STORAGE_KEY = "orbix:curated_nfts_v2";

/**
 * Retrieves the list of curated NFTs, reading local state modifications if present.
 */
export function getCuratedNFTs(): NFT[] {
  if (typeof window === "undefined") {
    return INITIAL_HERO_NFTS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HERO_NFTS));
      return INITIAL_HERO_NFTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_HERO_NFTS;
    }
    return parsed;
  } catch {
    return INITIAL_HERO_NFTS;
  }
}

/**
 * Persists curated NFT state modifications to localStorage.
 */
export function saveCuratedNFTs(nfts: NFT[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nfts));
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
  const current = getCuratedNFTs();
  const updated = current.map((item) => {
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

  if (typeof window !== "undefined") {
    // Record in local sales history for analytics
    try {
      const historyKey = "orbix:sales_history";
      const rawHistory = localStorage.getItem(historyKey);
      const history = rawHistory ? JSON.parse(rawHistory) : [];
      const purchasedNft = current.find((n) => n.id === nftId);
      history.push({
        nftId,
        seller: purchasedNft?.owner || PETRA_SELLER_WALLET,
        buyer: newOwner,
        price: purchasedNft?.price || 0,
        usdPrice: purchasedNft?.usdPrice || 0,
        txHash: txHash || "",
        timestamp: Date.now(),
      });
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch {
      // Ignore storage errors
    }

    window.dispatchEvent(new CustomEvent("orbix:nft-updated", { detail: { nftId, newOwner } }));
  }
}

/**
 * Records listing an NFT for sale.
 */
export function recordNFTListing(nftId: number, priceOctas: number, usdPrice?: number): void {
  const current = getCuratedNFTs();
  const updated = current.map((item) => {
    if (item.id === nftId) {
      return {
        ...item,
        price: priceOctas,
        usdPrice: usdPrice ?? item.usdPrice,
        for_sale: true,
      };
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
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HERO_NFTS));
  window.dispatchEvent(new CustomEvent("orbix:nft-updated"));
}
