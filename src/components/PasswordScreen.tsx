import { useState, type FormEvent } from "react";
import type { AuthGateStatus } from "@/hooks/useAuthGate";

interface PasswordScreenProps {
  status: AuthGateStatus;
  error: string | null;
  onSubmit: (password: string) => void;
}

export function PasswordScreen({ status, error, onSubmit }: PasswordScreenProps) {
  const [password, setPassword] = useState("");
  const isVerifying = status === "verifying";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || isVerifying) return;
    onSubmit(password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-xl font-bold text-white shadow-sm">
            ₹
          </span>
        </div>
        <h1 className="mb-6 text-center text-lg font-semibold text-neutral-900">
          Purchase Price Finder
        </h1>

        <input
          type="password"
          inputMode="text"
          autoFocus
          autoComplete="current-password"
          value={password}
          disabled={isVerifying}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full rounded-xl border border-neutral-300 bg-white px-5 py-4 text-lg text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 disabled:opacity-60"
        />

        {error && <p className="mt-3 text-center text-sm font-medium text-brand-red">{error}</p>}

        <button
          type="submit"
          disabled={!password || isVerifying}
          className="mt-5 w-full rounded-xl bg-brand-orange px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isVerifying ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
