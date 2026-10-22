import { describe, it, expect } from "vitest";
import {
  octasToApt,
  aptToOctas,
  truncateAddress,
  encodeStringToVector,
  decodeVectorOrHexToString,
  getRarityInfo,
} from "../lib/aptosClient";

describe("Aptos Client Utilities", () => {
  it("converts octas to APT correctly", () => {
    expect(octasToApt(100_000_000)).toBe(1);
    expect(octasToApt(50_000_000)).toBe(0.5);
    expect(octasToApt(125_000_000)).toBe(1.25);
  });

  it("converts APT to octas correctly", () => {
    expect(aptToOctas(1)).toBe(100_000_000);
    expect(aptToOctas(0.5)).toBe(50_000_000);
    expect(aptToOctas(2.5)).toBe(250_000_000);
  });

  it("truncates addresses for UI display", () => {
    const address = "0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb";
    const truncated = truncateAddress(address);
    expect(truncated).toBe("0x4bee...f6fb");
    expect(truncateAddress("")).toBe("");
  });

  it("encodes and decodes vector<u8> strings", () => {
    const original = "orbix.nft Celestial #01";
    const encoded = encodeStringToVector(original);
    expect(Array.isArray(encoded)).toBe(true);
    const decoded = decodeVectorOrHexToString(encoded);
    expect(decoded).toBe(original);
  });

  it("decodes hex byte strings", () => {
    const hex = "0x48656c6c6f"; // "Hello"
    const decoded = decodeVectorOrHexToString(hex);
    expect(decoded).toBe("Hello");
  });

  it("returns appropriate rarity metadata", () => {
    expect(getRarityInfo(1).label).toBe("Common");
    expect(getRarityInfo(2).label).toBe("Uncommon");
    expect(getRarityInfo(3).label).toBe("Rare");
    expect(getRarityInfo(4).label).toBe("Epic");
  });
});
