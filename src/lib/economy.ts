import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export type TransactionType = "buy" | "rent" | "bonus" | "bot_purchase" | "perk_redemption" | "sold_reward";

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

const BALANCE_KEY_PREFIX = "campuskart_wallet_balance_";
const TX_KEY_PREFIX = "campuskart_wallet_tx_";

export async function fetchWalletBalance(userId: string): Promise<number> {
  try {
    const raw = localStorage.getItem(`${BALANCE_KEY_PREFIX}${userId}`);
    if (raw !== null) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) return parsed;
    }
    // Default starter campus points balance: 150 points
    localStorage.setItem(`${BALANCE_KEY_PREFIX}${userId}`, "150");
    return 150;
  } catch {
    return 150;
  }
}

export async function saveWalletBalance(userId: string, amount: number): Promise<void> {
  try {
    localStorage.setItem(`${BALANCE_KEY_PREFIX}${userId}`, String(amount));
  } catch {
    // ignore
  }
}

export async function fetchTransactionHistory(userId: string): Promise<WalletTransaction[]> {
  try {
    const raw = localStorage.getItem(`${TX_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
    const defaultTx: WalletTransaction[] = [
      {
        id: "tx_welcome",
        senderId: null,
        receiverId: userId,
        amount: 150,
        type: "bonus",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        description: "Welcome Bonus · MGM Verified Student",
      },
      {
        id: "tx_signup_verify",
        senderId: null,
        receiverId: userId,
        amount: 25,
        type: "bonus",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        description: "Email Verification Reward",
      },
    ];
    localStorage.setItem(`${TX_KEY_PREFIX}${userId}`, JSON.stringify(defaultTx));
    return defaultTx;
  } catch {
    return [];
  }
}

export async function addWalletTransaction(
  userId: string,
  tx: Omit<WalletTransaction, "id" | "createdAt">,
): Promise<void> {
  try {
    const history = await fetchTransactionHistory(userId);
    const newTx: WalletTransaction = {
      ...tx,
      id: `tx_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTx, ...history].slice(0, 50);
    localStorage.setItem(`${TX_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function transferCoins(userId: string, payload: TransferPayload): Promise<void> {
  const currentBalance = await fetchWalletBalance(userId);
  const newBalance = Math.max(0, currentBalance - payload.amount);
  await saveWalletBalance(userId, newBalance);
  await addWalletTransaction(userId, {
    senderId: userId,
    receiverId: payload.receiverId,
    amount: -payload.amount,
    type: payload.type,
    referenceId: payload.referenceId,
    description: payload.description,
  });
}

export function useWalletBalance() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["wallet-balance", user?.uid],
    enabled: Boolean(user && !loading),
    queryFn: async () => {
      if (!user?.uid) return 150;
      return await fetchWalletBalance(user.uid);
    },
    initialData: 150,
  });
}

export function useTransactionHistory() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.uid],
    enabled: Boolean(user && !loading),
    queryFn: async () => {
      if (!user?.uid) return [];
      return await fetchTransactionHistory(user.uid);
    },
    initialData: [],
  });
}

export const CAMPUSKART_INSTAGRAM_URL =
  "https://www.instagram.com/campuskart.business?stkn=MWx0Nms4c2piaGFhaA==";

const IG_CLAIM_PREFIX = "campuskart_ig_claimed_";

export function isInstagramClaimed(userId: string): boolean {
  try {
    return localStorage.getItem(`${IG_CLAIM_PREFIX}${userId}`) === "true";
  } catch {
    return false;
  }
}

export async function claimInstagramBonus(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    if (isInstagramClaimed(userId)) return false;
    const current = await fetchWalletBalance(userId);
    const updated = current + 50;
    await saveWalletBalance(userId, updated);
    await addWalletTransaction(userId, {
      senderId: null,
      receiverId: userId,
      amount: 50,
      type: "bonus",
      description: "Instagram Follow Bonus · @campuskart.business",
    });
    localStorage.setItem(`${IG_CLAIM_PREFIX}${userId}`, "true");
    return true;
  } catch {
    return false;
  }
}

const PROFILE_BONUS_PREFIX = "campuskart_profile_bonus_";

export function isProfileBonusClaimed(userId: string): boolean {
  try {
    return localStorage.getItem(`${PROFILE_BONUS_PREFIX}${userId}`) === "true";
  } catch {
    return false;
  }
}

export async function awardProfileCompletionBonus(userId: string, points = 100): Promise<{ awarded: boolean; points: number }> {
  if (!userId) return { awarded: false, points: 0 };
  try {
    if (isProfileBonusClaimed(userId)) {
      return { awarded: false, points: 0 };
    }
    const current = await fetchWalletBalance(userId);
    const updated = current + points;
    await saveWalletBalance(userId, updated);
    await addWalletTransaction(userId, {
      senderId: null,
      receiverId: userId,
      amount: points,
      type: "bonus",
      description: "Profile Completed Bonus · Campus Identity Verified",
    });
    localStorage.setItem(`${PROFILE_BONUS_PREFIX}${userId}`, "true");
    return { awarded: true, points };
  } catch {
    return { awarded: false, points: 0 };
  }
}

export function useTransferCoins() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransferPayload) => {
      if (!user?.uid) throw new Error("Not authenticated");
      await transferCoins(user.uid, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

