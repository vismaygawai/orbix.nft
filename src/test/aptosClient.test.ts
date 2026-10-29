import { describe, it, expect } from "vitest";
import {
  octasToApt,
  aptToOctas,
  aptToOctasBigInt,
  sanitizeMediaUri,
  resolveMediaUrl,
  isVideoUri,
  parseMoveAbort,
  truncateAddress,
  encodeStringToVector,
  decodeVectorOrHexToString,
  getRarityInfo,
  normalizeAddress,
  isSameAddress,
  getNowSeconds,
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

  it("sanitizes media URIs without rewriting ipfs:// prematurely", () => {
    expect(sanitizeMediaUri("https://arweave.net/artifact.png")).toBe(
      "https://arweave.net/artifact.png",
    );
    expect(sanitizeMediaUri("ipfs://QmHash123")).toBe("ipfs://QmHash123");
    expect(sanitizeMediaUri("/videos/nft1.mp4")).toBe("/videos/nft1.mp4");
    expect(sanitizeMediaUri("javascript:alert(1)")).toBe("");
    expect(sanitizeMediaUri("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("resolves media URIs for playback and browser rendering", () => {
    expect(resolveMediaUrl("ipfs://QmHash123")).toBe("https://ipfs.io/ipfs/QmHash123");
    expect(resolveMediaUrl("ipfs://ipfs/QmHash123")).toBe("https://ipfs.io/ipfs/QmHash123");
    expect(resolveMediaUrl("/videos/nft1.mp4")).toBe("/videos/nft1.mp4");
    expect(resolveMediaUrl("https://arweave.net/artifact.png")).toBe(
      "https://arweave.net/artifact.png",
    );
  });

  it("detects video URIs ignoring query strings and fragments", () => {
    expect(isVideoUri("https://example.com/art.mp4?v=1#t=10")).toBe(true);
    expect(isVideoUri("https://example.com/ocean.webm")).toBe(true);
    expect(isVideoUri("https://d123.cloudfront.net/stream")).toBe(true);
    expect(isVideoUri("https://example.com/image.png")).toBe(false);
    expect(isVideoUri("")).toBe(false);
  });

  it("parses Move VM abort codes into user-friendly messages", () => {
    expect(parseMoveAbort(new Error("Move abort: 100"))).toBe(
      "You do not own this ocean artifact.",
    );
    expect(parseMoveAbort(new Error("aborted with 1018"))).toBe("Auction has already expired.");
    expect(parseMoveAbort(new Error("User rejected the transaction"))).toBe(
      "Transaction was cancelled in wallet.",
    );
    expect(parseMoveAbort(new Error("Execution failed at 0x64"))).toBe(
      "You do not own this ocean artifact.",
    );
  });

  it("returns current ledger-synchronized timestamp", () => {
    const now = getNowSeconds();
    expect(typeof now).toBe("number");
    expect(now).toBeGreaterThan(1700000000);
  });

  it("truncates addresses for UI display safely even with objects or undefined", () => {
    const address = "0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb";
    const truncated = truncateAddress(address);
    expect(truncated).toBe("0x4bee...f6fb");
    expect(truncateAddress("")).toBe("");
    expect(truncateAddress(null)).toBe("");
    expect(truncateAddress(undefined)).toBe("");
    const mockAccountAddress = {
      toString: () => "0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb",
    };
    expect(truncateAddress(mockAccountAddress)).toBe("0x4bee...f6fb");
  });

  it("normalizes Aptos addresses and checks equality correctly", () => {
    const shortAddr = "0x4bee";
    const paddedAddr = "0x0000000000000000000000000000000000000000000000000000000000004bee";
    expect(normalizeAddress(shortAddr)).toBe(paddedAddr);
    expect(isSameAddress(shortAddr, paddedAddr)).toBe(true);
    expect(isSameAddress("0x0", "0x000")).toBe(false);
    expect(isSameAddress("0x1", "0x2")).toBe(false);
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

  it("maps rarity levels correctly", () => {
    expect(getRarityInfo(1).label).toBe("Common");
    expect(getRarityInfo(2).label).toBe("Uncommon");
    expect(getRarityInfo(3).label).toBe("Rare");
    expect(getRarityInfo(4).label).toBe("Epic");
  });
});
