import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requiredEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

/** True when all required client env vars are set (real Firebase project). */
export const isFirebaseConfigured = requiredEnvKeys.every((key) => {
  const raw = import.meta.env[key];
  return typeof raw === "string" && raw.trim().length > 0;
});

const devFirebaseFallback = {
  apiKey: "dev-placeholder-api-key",
  authDomain: "dev-placeholder.firebaseapp.com",
  projectId: "dev-placeholder-project",
  appId: "1:111111111111:web:aaaaaaaaaaaaaaaaaaaaaa",
  storageBucket: "dev-placeholder-project.appspot.com",
  messagingSenderId: "111111111111",
} as const;

function envOrEmpty(key: string): string {
  const raw = import.meta.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

const firebaseConfig = {
  apiKey: envOrEmpty("VITE_FIREBASE_API_KEY") || devFirebaseFallback.apiKey,
  authDomain: envOrEmpty("VITE_FIREBASE_AUTH_DOMAIN") || devFirebaseFallback.authDomain,
  projectId: envOrEmpty("VITE_FIREBASE_PROJECT_ID") || devFirebaseFallback.projectId,
  appId: envOrEmpty("VITE_FIREBASE_APP_ID") || devFirebaseFallback.appId,
  storageBucket: envOrEmpty("VITE_FIREBASE_STORAGE_BUCKET") || devFirebaseFallback.storageBucket,
  messagingSenderId: envOrEmpty("VITE_FIREBASE_MESSAGING_SENDER_ID") || devFirebaseFallback.messagingSenderId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function getFirebaseAuthErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
      return "The email or password you entered is incorrect.";
    case "auth/user-not-found":
      return "No account exists for that email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/email-already-in-use":
      return "That email is already registered. Try signing in instead.";
    case "auth/popup-closed-by-user":
      return "Sign-in was canceled before completion.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    default:
      if (code) {
        return `Authentication failed (${code}). Please try again.`;
      }
      return "Authentication failed. Please try again.";
  }
}
