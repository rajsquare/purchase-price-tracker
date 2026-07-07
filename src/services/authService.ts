import { compare, hash } from "bcryptjs";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/client";

const AUTH_DOC_PATH = ["settings", "auth"] as const;
const BCRYPT_ROUNDS = 12;

interface AuthRecord {
  passwordHash: string;
}

function authDocRef() {
  return doc(db, ...AUTH_DOC_PATH);
}

async function readAuthRecord(): Promise<AuthRecord | null> {
  const snap = await getDoc(authDocRef());
  if (!snap.exists()) return null;

  const data = snap.data();
  if (typeof data.passwordHash !== "string") {
    return null;
  }

  return { passwordHash: data.passwordHash };
}

async function writeAuthRecord(record: AuthRecord): Promise<void> {
  await setDoc(authDocRef(), {
    passwordHash: record.passwordHash,
    updatedAt: serverTimestamp(),
  });
}

async function createPasswordHash(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super("Incorrect password.");
    this.name = "IncorrectPasswordError";
  }
}

export class MissingPasswordConfigurationError extends Error {
  constructor() {
    super("Shared password is not configured.");
    this.name = "MissingPasswordConfigurationError";
  }
}

/**
 * Attempts to unlock the app with the given password.
 *
 * If no shared password has ever been configured (first run against a
 * fresh Firestore project), the first password anyone submits becomes the
 * shared password going forward — there is no separate admin setup step,
 * consistent with "no user accounts."
 */
export async function attemptUnlock(password: string): Promise<void> {
  const existing = await readAuthRecord();

  if (!existing) {
    throw new MissingPasswordConfigurationError();
  }

  const isValid = await compare(password, existing.passwordHash);
  if (!isValid) {
    throw new IncorrectPasswordError();
  }
}

/**
 * Changes the shared password for everyone. Requires the current password
 * to succeed, per the "require current password before allowing password
 * changes" requirement.
 */
export async function changeSharedPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const existing = await readAuthRecord();

  if (!existing) {
    throw new MissingPasswordConfigurationError();
  }

  const isCurrentValid = await compare(currentPassword, existing.passwordHash);
  if (!isCurrentValid) {
    throw new IncorrectPasswordError();
  }

  await writeAuthRecord({ passwordHash: await createPasswordHash(newPassword) });
}
