import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

/**
 * Firebase config comes from Vite environment variables so that no secrets
 * or per-environment values are hardcoded into source control.
 * See `.env.example` for the required keys.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

/**
 * `experimentalAutoDetectLongPolling` improves reliability on flaky mobile
 * networks (common for a "quick lookup on the shop floor" tool) without
 * any downside on healthy connections.
 */
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    // initializeFirestore throws if it was already called (e.g. HMR reload).
    return getFirestore(firebaseApp);
  }
})();

export const auth = getAuth(firebaseApp);

/**
 * The app has NO user accounts, Google login, or email/password
 * authentication — that requirement is unchanged from the reference app.
 *
 * This anonymous sign-in is invisible plumbing, not a login flow: its only
 * purpose is to give Firestore Security Rules something to check
 * (`request.auth != null`) so the database cannot be read or written by
 * anyone outside this app, without introducing any user-facing accounts,
 * providers, or credentials. The shared-password screen remains the only
 * thing a person ever sees or interacts with.
 */
export function ensureFirebaseSession(): Promise<void> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve();
        } else {
          signInAnonymously(auth).then(
            () => resolve(),
            (err) => reject(err)
          );
        }
      },
      reject
    );
  });
}
