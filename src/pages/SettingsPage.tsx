import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SupplierManagement } from "@/components/SupplierManagement";
import { useCatalog } from "@/context/CatalogContext";
import { useFirestoreSyncStatus } from "@/hooks/useFirestoreSyncStatus";
import { useSuppliers } from "@/hooks/useSuppliers";
import { changeSharedPassword, IncorrectPasswordError } from "@/services/authService";
import { APP_VERSION } from "@/version";

type FormStatus = "idle" | "saving" | "success" | "error";
type CatalogRefreshStatus = "idle" | "refreshing" | "done" | "error";

export function SettingsPage() {
  const suppliers = useSuppliers();
  const sync = useFirestoreSyncStatus();
  const catalog = useCatalog();
  const [catalogRefreshStatus, setCatalogRefreshStatus] = useState<CatalogRefreshStatus>("idle");
  const [catalogRefreshMessage, setCatalogRefreshMessage] = useState<string | null>(null);

  async function handleRefreshCatalog() {
    setCatalogRefreshStatus("refreshing");
    setCatalogRefreshMessage(null);
    try {
      const { changed, count } = await catalog.refresh();
      setCatalogRefreshStatus("done");
      setCatalogRefreshMessage(changed ? `Catalog updated — ${count} products loaded` : "Catalog already up to date");
    } catch {
      setCatalogRefreshStatus("error");
      setCatalogRefreshMessage("Failed to refresh the catalog. Check your connection and try again.");
    }
  }
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New password and confirmation do not match.");
      return;
    }

    if (!newPassword) {
      setStatus("error");
      setMessage("New password cannot be empty.");
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      await changeSharedPassword(currentPassword, newPassword);
      setStatus("success");
      setMessage("Password updated for everyone.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof IncorrectPasswordError ? "Current password is incorrect." : "Failed to update password.");
    }
  }

  const isSaving = status === "saving";
  const syncLabel =
    sync.status === "checking"
      ? "Checking"
      : sync.status === "online"
        ? "Online"
        : sync.status === "offline"
          ? "Offline"
          : "Connection issue";

  const inputClass =
    "rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 disabled:opacity-60";

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
        >
          ‹ Back to search
        </Link>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-900">Settings</h1>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-neutral-900">Change shared password</h2>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={currentPassword}
              disabled={isSaving}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />

            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={newPassword}
              disabled={isSaving}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />

            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              disabled={isSaving}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />

            {message && (
              <p className={`text-sm font-medium ${status === "success" ? "text-emerald-600" : "text-brand-red"}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="mt-1 min-h-12 rounded-xl bg-brand-orange px-4 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Saving..." : "Update password"}
            </button>
          </form>
        </section>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          {suppliers.status === "error" && (
            <div className="mb-4 rounded-xl border border-brand-red/30 bg-brand-red/5 p-4">
              <p className="text-sm font-medium text-brand-red">{suppliers.error}</p>
              <button
                type="button"
                onClick={() => void suppliers.refresh()}
                className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
              >
                Retry
              </button>
            </div>
          )}

          <SupplierManagement
            suppliers={suppliers.suppliers}
            busy={suppliers.status === "loading"}
            onCreate={suppliers.create}
            onRename={suppliers.update}
            onSetActive={suppliers.setActive}
            onRemove={suppliers.remove}
            onMove={suppliers.move}
          />
        </div>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Product Catalog</h2>
              {catalogRefreshMessage && (
                <p
                  className={`mt-2 text-sm font-medium ${
                    catalogRefreshStatus === "error" ? "text-brand-red" : "text-emerald-600"
                  }`}
                >
                  {catalogRefreshMessage}
                </p>
              )}
              {!catalogRefreshMessage && (
                <p className="mt-2 text-sm text-neutral-500">{catalog.products.length} products loaded</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshCatalog()}
              disabled={catalogRefreshStatus === "refreshing"}
              className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
            >
              {catalogRefreshStatus === "refreshing" ? "Refreshing…" : "Refresh Catalog"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-neutral-900">Application Version</h2>
          <p className="mt-2 text-sm text-neutral-500">{APP_VERSION}</p>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Firestore Sync Status</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    sync.status === "online"
                      ? "bg-emerald-500"
                      : sync.status === "checking"
                        ? "bg-brand-yellow"
                        : "bg-brand-red"
                  }`}
                />
                {syncLabel}
              </p>
              {sync.lastCheckedAt && (
                <p className="mt-1 text-xs text-neutral-400">
                  Checked {new Date(sync.lastCheckedAt).toLocaleTimeString("en-IN")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void sync.refresh()}
              className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
