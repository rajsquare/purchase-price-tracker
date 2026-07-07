# Purchase Price Tracker

A speed-first purchasing tool for quickly comparing supplier prices for products.

This is not an inventory, accounting, billing, ERP, or CRM system. The primary
workflow is:

Search product -> open product -> tap supplier -> enter price -> save.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with **two** sets of Firebase web app values (see
Architecture below): one for Purchase Tracker's own project, one for the
read-only Price List project.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
```

Deploy (Purchase Tracker project only — see "What is deployed" below):

```bash
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

## Architecture (Phase 3)

Purchase Tracker no longer owns a product catalog. It now consumes an
existing, separate application — **Price List** — as its single source of
truth for product identity and pricing metadata, while continuing to own all
purchasing data itself.

```text
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Firebase Project A          │        │  Firebase Project B          │
│  Price List (pricelist-a9d70)│        │  Purchase Tracker             │
│  — authoritative catalog —   │        │  — this app's own data —      │
│                               │        │                               │
│  catalog/current              │        │  suppliers/{supplierId}       │
│    products: [                │        │  currentPrices/{sr_supplier}  │
│      { sr, productName,       │        │  priceHistory/{historyId}     │
│        material, priceType,   │        │  settings/auth                │
│        wPrice, rPrice }, ...  │        │                               │
│    ]                          │        │                               │
└───────────────┬───────────────┘        └───────────────┬───────────────┘
                │  ONE read at startup                    │  normal CRUD
                │  (catalog/current)                       │  (suppliers, prices,
                │  read-only, never written to             │   history)
                ▼                                          ▼
        ┌───────────────────────────────────────────────────────┐
        │                Purchase Tracker (browser)               │
        │  CatalogContext: in-memory catalog + search index        │
        │  IndexedDB: cached copy of catalog/current                │
        │  Every product reference uses `sr` — never a doc ID,      │
        │  never a name, never a second identifier.                 │
        └───────────────────────────────────────────────────────┘
```

Two independent Firebase apps are initialized in the client
(`src/firebase/client.ts` for Project B, `src/firebase/priceListClient.ts`
for Project A, via a *named* secondary `initializeApp` call) so configuring
one can never affect the other.

### The one-read guarantee

On startup, `catalogService.loadCatalog()` performs **exactly one** Firestore
document read: `getDoc(catalog/current)` against the Price List project.
There is no per-product fetching, no collection scan, and no second read
during normal operation. The "Refresh Catalog" button in Settings performs
one more such read, and only on explicit user action.

### Caching strategy

Immediately after a successful read, the catalog is:
1. kept in memory (`CatalogContext`), and
2. persisted to IndexedDB (`src/utils/catalogDb.ts`).

If the startup read fails (offline, network error, permission error), the
app falls back to the IndexedDB copy and continues operating normally
(search still works from cache). If neither a fresh read nor a cache exists,
the UI shows a clear "catalog cannot be loaded" message instead of guessing.
No further catalog reads happen while the app stays open — every screen
(search, product detail, supplier search) reads from the one in-memory copy.

### Search stays frozen

`src/search/*` (normalization, tokenization, synonyms, fuzzy matching,
scoring, debounce, material filters) is byte-for-byte unchanged from Phase 2.
The only change is what feeds it: `CatalogContext` builds the search index
from `catalog/current.products` (via the existing `buildSearchIndex`)
instead of from a locally-owned Firestore collection. Search behavior,
ranking, and UI are identical to before.

### `sr` as the only identifier

Every `CatalogProduct` has `id === sr`. This isn't a second identifier — it
exists purely so the pre-existing, generic search engine (which expects
`{ id, productName, material }`) can consume catalog data without any
changes to its own code. Every purchasing document
(`currentPrices`, `priceHistory`) stores `productSr`, never a name, never a
Purchase-Tracker-local document ID. Product Detail routes are `/products/:sr`.

### Why there's no duplication

Purchase Tracker's Firestore project has no `products` collection at all —
it was removed. `productName`, `material`, `priceType`, `wPrice`, and
`rPrice` are read live from the cached Price List catalog and never written
back anywhere. The only thing Purchase Tracker stores about a product is a
foreign-key-style reference (`productSr`) inside its own purchasing
documents.

### Confirmed

- Price List (`pricelist-a9d70`) is read **only**: the client code has no
  write path to it at all — `src/firebase/priceListClient.ts` exposes no
  write APIs, and `catalogService.ts` only ever calls `getDoc`.
- Search behavior is unchanged — no files under `src/search/` were modified.
- Purchase Tracker's own Firestore project has no product data of its own.

## Authentication

The only user-facing authentication is the shared password screen.

Firebase Anonymous Authentication must be enabled **on both projects**:
- on Purchase Tracker's project, so its existing Firestore rules
  (`request.auth != null`) continue to work exactly as before;
- on the Price List project, defensively — `ensurePriceListSession()`
  attempts anonymous sign-in before reading `catalog/current`, in case that
  project's rules require it. If Anonymous Auth isn't enabled there and the
  rules are public-read, this sign-in attempt simply fails harmlessly and
  the read proceeds anyway.

Password storage (Purchase Tracker project only):

```text
settings/auth
  passwordHash
  updatedAt
```

Passwords are verified with `bcryptjs`. Password changes generate a new bcrypt
hash and store only that hash.

Do not store plaintext passwords.

## Final Firestore Schema

### Price List project (`pricelist-a9d70`) — read-only, not owned by this app

```text
catalog/current
  products: [
    { sr, productName, material, priceType, wPrice, rPrice },
    ...
  ]
```

### Purchase Tracker project — owned by this app

```text
suppliers/{supplierId}
  name
  displayOrder
  active
  createdAt
  updatedAt

currentPrices/{productSr_supplierId}
  productSr
  supplierId
  price
  currency
  remarks
  updatedAt

priceHistory/{historyId}
  productSr
  supplierId
  price
  currency
  remarks
  effectiveDate
  enteredAt
  createdAt

settings/auth
  passwordHash
  updatedAt
```

There is no `products` collection and no `config/catalogMeta` document in
this project — both were removed when the catalog moved to Price List.

## Read And Write Flow

App startup:

- Reads `catalog/current` from the Price List project exactly once.
- Caches the result to IndexedDB and builds the frozen search index in memory.
- On failure, falls back to the IndexedDB cache; if none exists, shows an error.

Search page (Products tab):

- Runs the frozen local search against the in-memory index. No Firestore reads.

Search page (Suppliers tab):

- Loads active suppliers, filters client-side by name.
- Selecting a supplier reads `currentPrices` filtered by `supplierId`, and
  resolves each `productSr` against the cached catalog.

Product detail:

- Looks up the product from the cached catalog by `sr` — no Firestore read.
- Reads suppliers and `currentPrices` filtered by `productSr`.
- Sorts suppliers by current price ascending (never alphabetically, never by
  `displayOrder`); suppliers with no price yet for this product are omitted
  from that list and offered separately via "+ Add Price".
- Computes Lowest Purchase Price, Wholesale Margin, and Retail Margin on the
  fly. Margins are never stored.

Price edit:

- Validates price is present and greater than zero.
- Uses one Firestore batch:
  - writes `currentPrices/{productSr_supplierId}`
  - creates one new `priceHistory` document

History:

- Loads only after the History button is tapped.
- Queries `priceHistory` by `productSr` and `supplierId`.
- Orders newest first.

Settings:

- Changes shared password in `settings/auth`.
- Manages suppliers in `suppliers`.
- Checks Firestore reachability with a lightweight read of `settings/auth`.
- "Refresh Catalog": performs one more `catalog/current` read, replaces the
  cache, and reports whether anything actually changed.

## Firestore Indexes

Defined in `firestore.indexes.json` (Purchase Tracker project only):

```text
priceHistory
  productSr ASC
  supplierId ASC
  createdAt DESC
```

Single-field indexes cover supplier ordering and current-price lookups by
`productSr` or `supplierId` alone.

## Security Rules

`firestore.rules` in this repo governs the **Purchase Tracker** project only.
It:

- requires anonymous Firebase auth for all app reads and writes
- validates supplier document shape
- validates current price document shape (now keyed by `productSr`)
- rejects non-positive prices
- prevents current price deletes
- allows price history creates only
- prevents price history updates and deletes
- stores only `passwordHash` and `updatedAt` in `settings/auth`
- has **no** rule for a `products` collection — it doesn't exist here

The **Price List** project has its own, separate Firestore rules that this
repo does not manage or deploy. Whoever owns that project needs to confirm
`catalog/current` is readable by this app's requests (either public read, or
anonymous-auth read — see Authentication above).

Because this is a shared-password client-only app, the password gate is a UX
gate for authorized users of this app, not a replacement for a server-side
identity system.

## Performance

- Product search uses a prebuilt in-memory search index, built once per
  catalog load.
- Product detail avoids re-reading the catalog and avoids history reads.
- Current-price lookups read only the relevant `currentPrices` documents for
  one product (or, in Supplier Search, one supplier).
- History is lazy-loaded and unpaginated by requirement.
- Price saves use one batch write for consistency.
- Supplier ordering on Product Detail is always by current price, never by
  name or `displayOrder`; `displayOrder` is used only in Settings.

## What is deployed from this repo

`firebase.json` / `.firebaserc` in this repo point at the **Purchase
Tracker** project only (hosting + this project's Firestore rules/indexes).
Nothing here deploys to or configures the Price List project — that project
is managed independently by its own owners.

## Manual Firebase Setup

Purchase Tracker project (this repo):
1. Create/use the Firebase project, enable Anonymous Authentication.
2. Add the `VITE_FIREBASE_*` values to `.env.local`.
3. Create `settings/auth` with an initial `passwordHash` and `updatedAt`.
4. Deploy Firestore rules and indexes:
   `firebase deploy --only hosting,firestore:rules,firestore:indexes`
5. Add suppliers in the app's Settings screen.

Price List project (external, owned separately):
1. Confirm `catalog/current` exists with a `products` array shaped like
   `{ sr, productName, material, priceType, wPrice, rPrice }`.
2. Confirm its Firestore rules allow this app to read that one document
   (public read, or anonymous-auth read).
3. Add the `VITE_PRICELIST_FIREBASE_*` values to `.env.local`
   (`VITE_PRICELIST_FIREBASE_PROJECT_ID=pricelist-a9d70`).

## Assumptions

- Currency defaults to `INR`.
- Disabled suppliers are hidden from Product Detail but remain visible in
  Settings for reactivation.
- Suppliers with no price on file for a given product are hidden from that
  product's sorted supplier list; a first price for such a supplier is
  entered via the "+ Add Price" picker on Product Detail.
- Products supplied by a given supplier (Supplier Search) are listed
  alphabetically by product name.
- Home screen presents "Search Products" and "Search Suppliers" as in-place
  tabs on a single screen rather than separate routes, to minimize taps.
- Product creation/import remains entirely the Price List application's
  responsibility; this app never writes products anywhere.
