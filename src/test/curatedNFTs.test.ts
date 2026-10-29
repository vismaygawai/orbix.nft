import { describe, it, expect, beforeEach } from "vitest";
import {
  PETRA_SELLER_WALLET,
  INITIAL_HERO_NFTS,
  getCuratedNFTs,
  getForSaleCuratedNFTs,
  getOwnedCuratedNFTs,
  recordNFTPurchase,
  recordNFTListing,
  resetCuratedNFTs,
} from "../lib/curatedNFTs";
import { isSameAddress } from "../lib/aptosClient";

describe("Hero Section & Curated NFTs", () => {
  beforeEach(() => {
    resetCuratedNFTs();
  });

  it("verifies the 3 hero NFTs match user price and rarity requirements", () => {
    const uncommon = INITIAL_HERO_NFTS.find((n) => n.rarity === 2);
    const rare = INITIAL_HERO_NFTS.find((n) => n.rarity === 3);
    const epic = INITIAL_HERO_NFTS.find((n) => n.rarity === 4);

    expect(uncommon).toBeDefined();
    expect(uncommon?.usdPrice).toBe(50);
    expect(uncommon?.uri).toBe("/videos/nft3.mp4");

    expect(rare).toBeDefined();
    expect(rare?.usdPrice).toBe(100);
    expect(rare?.uri).toBe("/videos/nft1.mp4");

    expect(epic).toBeDefined();
    expect(epic?.usdPrice).toBe(150);
    expect(epic?.uri).toBe("/videos/nft2.mp4");
  });

  it("verifies all hero NFTs are owned and created by the user's Petra wallet", () => {
    INITIAL_HERO_NFTS.forEach((nft) => {
      expect(isSameAddress(nft.owner, PETRA_SELLER_WALLET)).toBe(true);
      expect(isSameAddress(nft.creator, PETRA_SELLER_WALLET)).toBe(true);
      expect(nft.for_sale).toBe(true);
    });
  });

  it("filters for sale curated NFTs", () => {
    const forSale = getForSaleCuratedNFTs();
    expect(forSale.length).toBe(3);
    expect(forSale.every((n) => n.for_sale)).toBe(true);
  });

  it("retrieves owned NFTs for the user's Petra wallet", () => {
    const owned = getOwnedCuratedNFTs(PETRA_SELLER_WALLET);
    expect(owned.length).toBe(3);
  });

  it("records a purchase, transfers ownership, and updates for_sale status", () => {
    const buyerWallet = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    recordNFTPurchase(2, buyerWallet, "0xtxhash123");

    const forSaleAfter = getForSaleCuratedNFTs();
    expect(forSaleAfter.find((n) => n.id === 2)).toBeUndefined();

    const buyerOwned = getOwnedCuratedNFTs(buyerWallet);
    expect(buyerOwned.length).toBe(1);
    expect(buyerOwned[0]?.id).toBe(2);
    expect(buyerOwned[0]?.usdPrice).toBe(150);
  });

  it("records relisting an artifact", () => {
    const buyerWallet = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    recordNFTPurchase(1, buyerWallet);
    recordNFTListing(1, 2_000_000_000, 200);

    const forSale = getForSaleCuratedNFTs();
    const relisted = forSale.find((n) => n.id === 1);
    expect(relisted).toBeDefined();
    expect(relisted?.usdPrice).toBe(200);
    expect(relisted?.price).toBe(2_000_000_000);
  });
});
