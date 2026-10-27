import { describe, it, expect } from "vitest";
import {
  octasToApt,
  aptToOctas,
  aptToOctasBigInt,
  sanitizeMediaUri,
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

  it("converts micro fractions of APT without floating point drift", () => {
    expect(aptToOctas("0.00000001")).toBe(1);
    expect(aptToOctasBigInt("100.12345678")).toBe(10012345678n);
  });

  it("sanitizes media URIs to prevent XSS payloads", () => {
    expect(sanitizeMediaUri("https://arweave.net/artifact.png")).toBe("https://arweave.net/artifact.png");
    expect(sanitizeMediaUri("ipfs://QmHash123")).toBe("https://ipfs.io/ipfs/QmHash123");
    expect(sanitizeMediaUri("/videos/nft1.mp4")).toBe("/videos/nft1.mp4");
    expect(sanitizeMediaUri("javascript:alert(1)")).toBe("");
    expect(sanitizeMediaUri("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("truncates addresses for UI display", () => {
    const address = "0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb";
    const truncated = truncateAddress(address);
    expect(truncated).toBe("0x4bee...f6fb");
    expect(truncateAddress("")).toBe("");
  });

  it("encodes and decodes vector<u8> strings", () => {
    const original = "Orbix Celestial #01";
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
