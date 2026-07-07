import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/client";

/**
 * A lightweight connectivity ping against Purchase Tracker's own Firestore
 * project. This intentionally reads `settings/auth` — a document that
 * always exists once the shared password has been configured — rather
 * than any catalog-related document, since Purchase Tracker no longer
 * owns or reads its own product data.
 */
export async function checkFirestoreSync(): Promise<void> {
  await getDoc(doc(db, "settings", "auth"));
}
