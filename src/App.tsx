import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { PasswordScreen } from "@/components/PasswordScreen";
import { CatalogProvider } from "@/context/CatalogContext";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useAuthGate } from "@/hooks/useAuthGate";

export function App() {
  const { status, error, submit } = useAuthGate();

  if (status !== "unlocked") {
    return <PasswordScreen status={status} error={error} onSubmit={submit} />;
  }

  return (
    <CatalogProvider>
      {/*
        `basename` MUST come from Vite's own resolved base (`import.meta.env.BASE_URL`,
        e.g. "/purchase-price-tracker/" on GitHub Pages, "/" locally) rather
        than a hand-typed literal. react-router-dom's <BrowserRouter> renders
        NOTHING — no thrown error, only a console.warn — whenever the page's
        actual pathname doesn't start with `basename`. A hardcoded string here
        can silently drift out of sync with vite.config.ts's `base` (e.g. a
        repo rename, or simply typing it once and vite.config changing later),
        producing exactly that failure mode: blank page, zero console errors,
        zero network errors. Deriving it from BASE_URL makes the two values
        structurally impossible to disagree.
      */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/products/:sr" element={<ProductDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/*
            Defense in depth: any unmatched path *inside* the correct
            basename (e.g. a stale bookmark, a typo, a future renamed
            route) also renders nothing by default in react-router-dom —
            same silent-blank failure mode, different trigger. Redirect
            home instead of leaving the page empty.
          */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CatalogProvider>
  );
}
