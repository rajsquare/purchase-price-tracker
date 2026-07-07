import { useCallback, useState } from "react";
import { ensureFirebaseSession } from "@/firebase/client";
import {
  attemptUnlock,
  IncorrectPasswordError,
  MissingPasswordConfigurationError,
} from "@/services/authService";

export type AuthGateStatus = "locked" | "verifying" | "unlocked";

interface UseAuthGateResult {
  status: AuthGateStatus;
  error: string | null;
  submit: (password: string) => Promise<void>;
}

/**
 * Drives the shared-password gate.
 *
 * Per spec, the password screen appears on every launch of the
 * application — there is no "remember me" or persisted bypass, since that
 * was never requested and this is a shared, account-less password.
 */
export function useAuthGate(): UseAuthGateResult {
  const [status, setStatus] = useState<AuthGateStatus>("locked");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (password: string) => {
    setStatus("verifying");
    setError(null);

    try {
      await ensureFirebaseSession();
      await attemptUnlock(password);
      setStatus("unlocked");
    } catch (err) {
      setStatus("locked");
      setError(
        err instanceof IncorrectPasswordError
          ? "Incorrect password."
          : err instanceof MissingPasswordConfigurationError
            ? "Shared password is not configured."
          : "Something went wrong. Please try again."
      );
    }
  }, []);

  return { status, error, submit };
}
