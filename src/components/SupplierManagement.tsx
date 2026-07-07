import { useState, type FormEvent } from "react";
import type { Supplier } from "@/types/purchasing";

interface SupplierManagementProps {
  suppliers: Supplier[];
  busy: boolean;
  onCreate: (name: string) => Promise<void>;
  onRename: (supplierId: string, name: string) => Promise<void>;
  onSetActive: (supplierId: string, active: boolean) => Promise<void>;
  onRemove: (supplierId: string) => Promise<"deleted" | "disabled">;
  onMove: (supplierId: string, direction: "up" | "down") => Promise<void>;
}

export function SupplierManagement({
  suppliers,
  busy,
  onCreate,
  onRename,
  onSetActive,
  onRemove,
  onMove,
}: SupplierManagementProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await onCreate(newName);
      setNewName("");
    } catch {
      setMessage("Supplier was not added. Try again.");
    }
  }

  async function runForSupplier(supplierId: string, action: () => Promise<void>) {
    setSavingId(supplierId);
    setMessage(null);
    try {
      await action();
    } catch {
      setMessage("Supplier update failed. Try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-neutral-900">Suppliers</h2>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newName}
          disabled={busy}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Supplier name"
          className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="min-h-12 rounded-xl bg-brand-orange px-5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {message && <p className="mt-3 text-sm font-medium text-brand-red">{message}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
        {suppliers.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No suppliers yet.</p>
        ) : (
          suppliers.map((supplier, index) => {
            const isEditing = editingId === supplier.id;
            const isSaving = savingId === supplier.id || busy;

            return (
              <div
                key={supplier.id}
                className="border-b border-neutral-100 p-4 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving || index === 0}
                    onClick={() => void runForSupplier(supplier.id, () => onMove(supplier.id, "up"))}
                    className="min-h-10 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || index === suppliers.length - 1}
                    onClick={() => void runForSupplier(supplier.id, () => onMove(supplier.id, "down"))}
                    className="min-h-10 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-30"
                  >
                    Down
                  </button>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      disabled={isSaving}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
                    />
                  ) : (
                    <p className="min-w-0 flex-1 truncate text-neutral-900">
                      {supplier.name}
                      {!supplier.active && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Inactive
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={isSaving || !editingName.trim()}
                        onClick={() =>
                          void runForSupplier(supplier.id, async () => {
                            await onRename(supplier.id, editingName);
                            setEditingId(null);
                          })
                        }
                        className="min-h-10 rounded-lg bg-brand-orange px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setEditingId(null)}
                        className="min-h-10 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingId(supplier.id);
                        setEditingName(supplier.name);
                      }}
                      className="min-h-10 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
                    >
                      Rename
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void runForSupplier(supplier.id, () =>
                        onSetActive(supplier.id, !supplier.active)
                      )
                    }
                    className="min-h-10 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
                  >
                    {supplier.active ? "Disable" : "Enable"}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void runForSupplier(supplier.id, async () => {
                        const result = await onRemove(supplier.id);
                        if (result === "disabled") {
                          setMessage("Supplier has price records, so it was disabled.");
                        }
                      })
                    }
                    className="min-h-10 rounded-lg border border-brand-red/30 px-3 text-sm font-medium text-brand-red transition hover:bg-brand-red/5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
