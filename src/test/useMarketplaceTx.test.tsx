import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSignAndSubmitTransaction = vi.fn();
const mockUseWallet = vi.fn();

vi.mock("@aptos-labs/wallet-adapter-react", () => ({
  useWallet: () => mockUseWallet(),
}));

const mockToastError = vi.fn();
const mockToastLoading = vi.fn((..._args: unknown[]) => "toast-id");
const mockToastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    loading: (...args: unknown[]) => mockToastLoading(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

import { useMarketplaceTx } from "../hooks/useMarketplaceTx";

describe("useMarketplaceTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks transaction submission when wallet network does not match configured app network", async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      network: { name: "mainnet" },
      signAndSubmitTransaction: mockSignAndSubmitTransaction,
    });

    const { result } = renderHook(() => useMarketplaceTx());

    let txHash: string | null = null;
    await act(async () => {
      txHash = await result.current.executeTx(
        { data: { function: "0x1::NFTMarketplace::purchase_nft", functionArguments: [] } },
        { title: "Test Tx" },
      );
    });

    expect(txHash).toBeNull();
    expect(mockSignAndSubmitTransaction).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      "Wrong Wallet Network",
      expect.objectContaining({
        description: expect.stringContaining("mainnet"),
      }),
    );
  });

  it("blocks transaction submission when wallet is disconnected", async () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      network: { name: "devnet" },
      signAndSubmitTransaction: mockSignAndSubmitTransaction,
    });

    const { result } = renderHook(() => useMarketplaceTx());

    let txHash: string | null = null;
    await act(async () => {
      txHash = await result.current.executeTx(
        { data: { function: "0x1::NFTMarketplace::purchase_nft", functionArguments: [] } },
        { title: "Test Tx" },
      );
    });

    expect(txHash).toBeNull();
    expect(mockSignAndSubmitTransaction).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("Wallet Not Connected", expect.any(Object));
  });
});
