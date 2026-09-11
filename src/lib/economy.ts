import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { asHttpError, HttpError, isAuthHttpStatus } from "@/lib/http-error";

export type TransactionType = "buy" | "rent" | "bonus" | "bot_purchase";

export type WalletTransaction = {
  id: string;
  senderId: string | null; // null if system
  receiverId: string;
  amount: number;
  type: TransactionType;
  referenceId?: string; // productId
  createdAt: string;
  description: string;
};

export type WalletBalance = {
  balance: number;
};

export type TransferPayload = {
  receiverId: string;
  amount: number;
  type: TransactionType;
  referenceId?: string;
  description: string;
};

export async function fetchWalletBalance(token: string): Promise<number> {
  const response = await fetch("/api/economy/balance", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, "Failed to fetch wallet balance");
  }

  const data = await response.json() as { ok: boolean; balance: number };
  return data.balance;
}

export async function fetchTransactionHistory(token: string): Promise<WalletTransaction[]> {
  const response = await fetch("/api/economy/transactions", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, "Failed to fetch transactions");
  }

  const data = await response.json() as { ok: boolean; transactions: WalletTransaction[] };
  return data.transactions;
}

export async function transferCoins(token: string, payload: TransferPayload): Promise<void> {
  const response = await fetch("/api/economy/transfer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: "Transfer failed" }))) as {
      error?: string;
    };
    throw new HttpError(response.status, error.error || "Transfer failed");
  }
}

export function useWalletBalance() {
  const { user, loading, signOut } = useAuth();

  return useQuery({
    queryKey: ["wallet-balance", user?.uid],
    enabled: Boolean(user && !loading),
    queryFn: async () => {
      if (!user) return 0;
      const token = await user.getIdToken();
      try {
        return await fetchWalletBalance(token);
      } catch (error) {
        const httpError = asHttpError(error);
        if (httpError && isAuthHttpStatus(httpError.status)) {
          await signOut();
        }
        throw error;
      }
    },
  });
}

export function useTransactionHistory() {
  const { user, loading, signOut } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.uid],
    enabled: Boolean(user && !loading),
    queryFn: async () => {
      if (!user) return [];
      const token = await user.getIdToken();
      try {
        return await fetchTransactionHistory(token);
      } catch (error) {
        const httpError = asHttpError(error);
        if (httpError && isAuthHttpStatus(httpError.status)) {
          await signOut();
        }
        throw error;
      }
    },
  });
}

export function useTransferCoins() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransferPayload) => {
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      try {
        await transferCoins(token, payload);
      } catch (error) {
        const httpError = asHttpError(error);
        if (httpError && isAuthHttpStatus(httpError.status)) {
          await signOut();
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}
