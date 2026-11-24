import * as React from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";
import { confirmTransaction, parseMoveAbort, APTOS_NETWORK } from "@/lib/aptosClient";

export interface TxOptions {
  title: string;
  description?: string;
  successTitle?: string;
  successDescription?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: unknown) => void;
}

export function useMarketplaceTx() {
  const { signAndSubmitTransaction, connected, network } = useWallet();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const executeTx = React.useCallback(
    async (payload: any, options: TxOptions): Promise<string | null> => {
      if (!connected) {
        toast.error("Wallet Not Connected", {
          description: "Please connect your Aptos wallet to perform this action.",
        });
        return null;
      }

      // Enforce network alignment to prevent signing transactions on an unintended chain (e.g. Mainnet vs Devnet)
      if (network?.name && network.name.toLowerCase() !== APTOS_NETWORK.toLowerCase()) {
        toast.error("Wrong Wallet Network", {
          description: `Wallet is on ${network.name}. Please switch your wallet to Aptos ${APTOS_NETWORK.toUpperCase()} before signing.`,
        });
        return null;
      }

      if (!payload?.data?.function || typeof payload.data.function !== "string") {
        toast.error("Invalid Transaction Payload", {
          description: "The requested contract operation could not be constructed safely.",
        });
        return null;
      }

      setIsSubmitting(true);
      const toastId = toast.loading(options.title, {
        description: options.description || "Submitting to Aptos network...",
      });

      try {
        const response = await signAndSubmitTransaction(payload);
        const txHash = await confirmTransaction(response);

        const explorerUrl = `https://explorer.aptoslabs.com/txn/${txHash}?network=${APTOS_NETWORK}`;

        toast.success(options.successTitle || "Transaction Confirmed", {
          id: toastId,
          description: options.successDescription || "Recorded on the Aptos ledger.",
          action: {
            label: "View Explorer",
            onClick: () => window.open(explorerUrl, "_blank", "noopener,noreferrer"),
          },
        });

        if (options.onSuccess) {
          options.onSuccess(txHash);
        }
        return txHash;
      } catch (err: unknown) {
        const errorMsg = parseMoveAbort(err);
        toast.error("Transaction Failed", {
          id: toastId,
          description: errorMsg,
        });

        if (options.onError) {
          options.onError(err);
        }
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [connected, network, signAndSubmitTransaction],
  );

  return { executeTx, isSubmitting };
}
