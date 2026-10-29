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

  it("verifies the 3 hero character NFTs match user price, rarity, and identity requirements", () => {
    const orby = INITIAL_HERO_NFTS.find((n) => n.name === "Orby");
    const orix = INITIAL_HERO_NFTS.find((n) => n.name === "Orix");
    const orbix = INITIAL_HERO_NFTS.find((n) => n.name === "Orbix");

    // Orby: Common character ($50 / 5 APT)
    expect(orby).toBeDefined();
    expect(orby?.usdPrice).toBe(50);
    expect(orby?.rarity).toBe(1); // Common
    expect(orby?.uri).toBe("/videos/nft3.mp4");
    expect(orby?.description).toContain("Common character");

    // Orix: Secondary character ($100 / 10 APT)
    expect(orix).toBeDefined();
    expect(orix?.usdPrice).toBe(100);
    expect(orix?.rarity).toBe(3); // Rare
    expect(orix?.uri).toBe("/videos/nft1.mp4");
    expect(orix?.description).toContain("Secondary character");

    // Orbix: Main character / highest rarity ($150 / 15 APT)
    expect(orbix).toBeDefined();
    expect(orbix?.usdPrice).toBe(150);
    expect(orbix?.rarity).toBe(4); // Epic (Highest)
    expect(orbix?.uri).toBe("/videos/nft2.mp4");
    expect(orbix?.description).toContain("Main character");
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
