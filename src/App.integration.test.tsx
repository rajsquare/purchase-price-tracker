// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock every boundary the real App tree touches, exactly matching the
// "everything succeeds" state reported in production (password screen ok,
// both Firebase projects authenticate, Firestore reads succeed). This lets
// us render the REAL, unmodified App / CatalogProvider / SearchPage
// component tree and observe whether it produces visible DOM content. ---

vi.mock("@/firebase/client", () => ({
  db: {},
  auth: {},
  ensureFirebaseSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/authService", () => ({
  attemptUnlock: vi.fn().mockResolvedValue(undefined),
  changeSharedPassword: vi.fn().mockResolvedValue(undefined),
  IncorrectPasswordError: class IncorrectPasswordError extends Error {},
  MissingPasswordConfigurationError: class MissingPasswordConfigurationError extends Error {},
}));

const REALISTIC_CATALOG = vi.hoisted(() =>
  Array.from({ length: 25 }, (_, i) => ({
    id: `SR-${i}`,
    sr: `SR-${i}`,
    productName: `Product ${i}`,
    material: i % 3 === 0 ? "Brass" : i % 3 === 1 ? null : "Copper",
    priceType: i % 2 === 0 ? "wholesale" : null,
    wPrice: 100 + i,
    rPrice: 150 + i,
  }))
);

vi.mock("@/services/catalogService", () => ({
  CatalogUnavailableError: class CatalogUnavailableError extends Error {},
  loadCatalog: vi.fn().mockResolvedValue({ products: REALISTIC_CATALOG, isFromCache: false }),
  refreshCatalog: vi.fn().mockResolvedValue({ products: REALISTIC_CATALOG, changed: false }),
}));

vi.mock("@/services/supplierService", () => ({
  loadSuppliers: vi.fn().mockResolvedValue([]),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  removeSupplier: vi.fn(),
  moveSupplier: vi.fn(),
}));

vi.mock("@/services/priceService", () => ({
  currentPriceId: vi.fn(),
  validatePriceValue: vi.fn(),
  loadCurrentPricesForProduct: vi.fn().mockResolvedValue([]),
  loadCurrentPricesForSupplier: vi.fn().mockResolvedValue([]),
  saveCurrentPrice: vi.fn(),
  loadPriceHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/syncService", () => ({
  checkFirestoreSync: vi.fn().mockResolvedValue(undefined),
}));

// jsdom has no real IndexedDB; catalogService is mocked above so this is
// only needed in case any module reaches for it directly.
vi.mock("@/utils/catalogDb", () => ({
  readCachedCatalog: vi.fn().mockResolvedValue(null),
  writeCachedCatalog: vi.fn().mockResolvedValue(undefined),
}));

import { App } from "./App";

describe("App — post-unlock render (production-parity integration test)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("documents the failure mode this fix eliminates: <Router> renders nothing (no thrown error) when pathname doesn't start with basename", async () => {
    // Isolated from <App> deliberately: vitest's own Vite instance resolves
    // `import.meta.env.BASE_URL` to "/" (confirmed — this is a vitest test-
    // mode quirk, not real app behavior; the real `vite` dev server and
    // `vite build` both correctly resolve it to "/purchase-price-tracker/",
    // verified directly by probing the dev server and inspecting dist/
    // output), so mounting <App> here would never reproduce a mismatch.
    // This minimal reproduction documents the exact mechanism instead.
    const { BrowserRouter, Routes, Route } = await import("react-router-dom");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.history.pushState({}, "", "/");

    render(
      <BrowserRouter basename="/purchase-price-tracker">
        <Routes>
          <Route path="/" element={<div>Search Products</div>} />
        </Routes>
      </BrowserRouter>
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("is not able to match the URL"));
    expect(document.body.textContent).toBe("");
    warnSpy.mockRestore();
  });

  it("basename is derived from Vite's own BASE_URL, not a second hand-maintained literal", async () => {
    const { readFile } = await import("node:fs/promises");
    const appSource = await readFile("src/App.tsx", "utf-8");
    expect(appSource).toContain("basename={import.meta.env.BASE_URL}");
    expect(appSource).not.toMatch(/basename=["'`]\/purchase-price-tracker/);
  });

  it("renders visible SearchPage content when the pathname matches the app's real base path", async () => {
    window.history.pushState({}, "", "/purchase-price-tracker/");
    const user = userEvent.setup();
    render(<App />);

    const passwordInput = await screen.findByPlaceholderText(/enter password/i);
    await user.type(passwordInput, "correct-password");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Search Products")).toBeInTheDocument();
      expect(screen.getByText("Search Suppliers")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText(/loading products/i)).not.toBeInTheDocument();
    });

    expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it("redirects home instead of rendering blank when navigating to an unmatched path inside the correct basename", async () => {
    window.history.pushState({}, "", "/purchase-price-tracker/this-route-does-not-exist");
    const user = userEvent.setup();
    render(<App />);

    const passwordInput = await screen.findByPlaceholderText(/enter password/i);
    await user.type(passwordInput, "correct-password");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Search Products")).toBeInTheDocument();
    });
  });
});
