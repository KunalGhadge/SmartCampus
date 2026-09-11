import {
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  collection,
  type Unsubscribe,
} from "firebase/firestore";
import type { AppAuthUser as User } from "@/lib/auth-service";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { CampusName } from "@/lib/campus";

export type PublicProfileDoc = {
  firebaseUid: string;
  displayName: string;
  displayNameLower: string;
  /** Matches `CampusProvider` keys from navbar (e.g. MANIT). Empty if unset. */
  campusKey: string;
  photoUrl: string | null;
  emailVerified: boolean;
};

export async function upsertPublicProfile(user: User, campus: CampusName | null): Promise<void> {
  if (!isFirebaseConfigured) return;

  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "Student";
  const campusKey = campus ?? "";

  await setDoc(
    doc(db, "publicProfiles", user.uid),
    {
      firebaseUid: user.uid,
      displayName,
      displayNameLower: displayName.toLowerCase(),
      campusKey,
      photoUrl: user.photoURL ?? null,
      emailVerified: Boolean(user.emailVerified),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function docToPublicProfile(id: string, data: Record<string, unknown>): PublicProfileDoc | null {
  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (!displayName) return null;

  return {
    firebaseUid: typeof data.firebaseUid === "string" ? data.firebaseUid : id,
    displayName,
    displayNameLower:
      typeof data.displayNameLower === "string"
        ? data.displayNameLower
        : displayName.toLowerCase(),
    campusKey: typeof data.campusKey === "string" ? data.campusKey : "",
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    emailVerified: Boolean(data.emailVerified),
  };
}

export async function fetchPublicProfile(uid: string): Promise<PublicProfileDoc | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, "publicProfiles", uid));
  if (!snap.exists()) return null;
  return docToPublicProfile(snap.id, snap.data() as Record<string, unknown>);
}

export function subscribePublicProfiles(
  onNext: (profiles: PublicProfileDoc[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "publicProfiles"), limit(200));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => docToPublicProfile(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is PublicProfileDoc => x !== null);
      rows.sort((a, b) => a.displayNameLower.localeCompare(b.displayNameLower));
      onNext(rows);
    },
    (err) => {
      console.error(err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    },
  );
}
