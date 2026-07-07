import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

/**
 * The Price List project (`pricelist-a9d70`) is a completely separate
 * Firebase project from the one Purchase Tracker owns (`@/firebase/client`).
 * It is the authoritative, read-only product catalog. Purchase Tracker must
 * NEVER write to it — this module intentionally exposes no write APIs.
 *
 * A *named* secondary Firebase app is used (`initializeApp(config, "priceList")`)
 * so that initializing it can never interfere with, reconfigure, or replace
 * the default app used for Purchase Tracker's own Firestore project.
 */
const PRICE_LIST_APP_NAME = "priceList";
const LOG_PREFIX = "[Catalog:init]";

const priceListConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_PRICELIST_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_PRICELIST_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PRICELIST_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_PRICELIST_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_PRICELIST_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_PRICELIST_FIREBASE_APP_ID,
};

// Logged once, at module load, so a missing/blank env var at build time is
// visible immediately rather than surfacing later as a mysterious empty
// catalog. Never logs the raw apiKey value itself.
console.log(`${LOG_PREFIX} Price List Firebase config resolved:`, {
  projectId: priceListConfig.projectId || "(EMPTY — env var not set at build time)",
  authDomain: priceListConfig.authDomain || "(EMPTY)",
  appId: priceListConfig.appId || "(EMPTY)",
  apiKeyPresent: Boolean(priceListConfig.apiKey),
});

function getOrCreatePriceListApp() {
  const existing = getApps().find((app) => app.name === PRICE_LIST_APP_NAME);
  if (existing) {
    console.log(`${LOG_PREFIX} Reusing existing "${PRICE_LIST_APP_NAME}" Firebase app instance.`);
    return existing;
  }
  console.log(`${LOG_PREFIX} Initializing new "${PRICE_LIST_APP_NAME}" Firebase app instance.`);
  return initializeApp(priceListConfig, PRICE_LIST_APP_NAME);
}

const priceListApp = getOrCreatePriceListApp();

export const priceListDb = (() => {
  try {
    const firestoreInstance = initializeFirestore(priceListApp, {
      experimentalAutoDetectLongPolling: true,
    });
    console.log(`${LOG_PREFIX} Firestore initialized for "${PRICE_LIST_APP_NAME}".`);
    return firestoreInstance;
  } catch (err) {
    // initializeFirestore throws if it was already called on this app
    // (e.g. HMR reload) — fall back to the existing instance.
    console.log(
      `${LOG_PREFIX} initializeFirestore() had already run for this app (expected on HMR reload) — reusing existing instance.`,
      err
    );
    return getFirestore(priceListApp);
  }
})();

const priceListAuth = getAuth(priceListApp);

/**
 * Firestore rules for `catalog/current` are `allow read: if true` (public
 * read) — this sign-in is NOT required for the read to succeed. It's kept
 * as a best-effort, fully-logged step only so auth state is visible in
 * diagnostics and so nothing breaks if the rules are ever tightened later.
 * It always resolves, never blocks or rejects the catalog read.
 */
export function ensurePriceListSession(): Promise<void> {
  console.log(`${LOG_PREFIX} [Auth] Checking Price List auth state...`);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(
      priceListAuth,
      (user) => {
        unsubscribe();
        if (user) {
          console.log(`${LOG_PREFIX} [Auth] Already signed in. uid=${user.uid}, anonymous=${user.isAnonymous}`);
          resolve();
          return;
        }
        console.log(`${LOG_PREFIX} [Auth] No session yet — attempting anonymous sign-in...`);
        signInAnonymously(priceListAuth).then(
          (cred) => {
            console.log(`${LOG_PREFIX} [Auth] Anonymous sign-in succeeded. uid=${cred.user.uid}`);
            resolve();
          },
          (err) => {
            console.error(
              `${LOG_PREFIX} [Auth] Anonymous sign-in FAILED (continuing anyway — catalog/current is public-read, so this should not block the catalog load):`,
              err?.code ?? err
            );
            resolve();
          }
        );
      },
      (err) => {
        console.error(`${LOG_PREFIX} [Auth] onAuthStateChanged listener error:`, err);
        resolve();
      }
    );
  });
}
