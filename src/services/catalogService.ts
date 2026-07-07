import { doc, getDoc } from "firebase/firestore";
import { ensurePriceListSession, priceListDb } from "@/firebase/priceListClient";
import { readCachedCatalog, writeCachedCatalog } from "@/utils/catalogDb";
import type { CatalogProduct, Material } from "@/types/catalog";

const CATALOG_DOC_PATH = ["catalog", "current"] as const;
const LOG_PREFIX = "[Catalog]";

/**
 * Thrown when the catalog cannot be obtained from Firestore AND there is no
 * local cache to fall back to (e.g. very first launch, offline, no network).
 */
export class CatalogUnavailableError extends Error {
  constructor() {
    super("The product catalog could not be loaded and no offline copy is available.");
    this.name = "CatalogUnavailableError";
  }
}

export interface LoadCatalogResult {
  products: CatalogProduct[];
  /** True when this result came from the local cache rather than a fresh read. */
  isFromCache: boolean;
}

export interface RefreshCatalogResult {
  products: CatalogProduct[];
  changed: boolean;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() ? value : null;
  }
  // Serial numbers and similar identifier-like fields are commonly stored
  // as Firestore `number` rather than `string`. Treating that as "missing"
  // silently discards every product from the catalog with no error at all
  // (map/filter never throw) — coerce instead of rejecting.
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toFiniteNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Converts one raw element of `catalog/current.products` into the app's
 * `CatalogProduct` model. Returns a structured reason string instead of
 * `null` on rejection, so the caller can log EXACTLY why a product was
 * dropped — this is the diagnostic gap that made previous silent-empty-
 * catalog failures invisible.
 */
function adaptCatalogProduct(
  raw: unknown,
  index: number
): { ok: true; product: CatalogProduct } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: `element at index ${index} is not an object (got ${typeof raw})` };
  }

  const data = raw as Record<string, unknown>;
  const sr = toStringOrNull(data.sr);

  if (!sr) {
    return {
      ok: false,
      reason: `element at index ${index} has no usable "sr" (raw value: ${JSON.stringify(data.sr)}, typeof: ${typeof data.sr}, available keys: [${Object.keys(data).join(", ")}])`,
    };
  }

  const product: CatalogProduct = {
    id: sr,
    sr,
    productName: typeof data.productName === "string" ? data.productName : "",
    material: (data.material as Material | string | null | undefined) ?? null,
    priceType: toStringOrNull(data.priceType),
    wPrice: toFiniteNumber(data.wPrice),
    rPrice: toFiniteNumber(data.rPrice),
  };

  return { ok: true, product };
}

/**
 * Converts the raw `products` array from `catalog/current` into
 * `CatalogProduct[]`, logging exactly how many entries were accepted vs.
 * rejected and why — so an empty result is always traceable to a specific
 * cause instead of being a silent no-op.
 */
function adaptCatalog(rawProducts: unknown[]): CatalogProduct[] {
  const products: CatalogProduct[] = [];
  const rejections: string[] = [];

  rawProducts.forEach((raw, index) => {
    const result = adaptCatalogProduct(raw, index);
    if (result.ok) {
      products.push(result.product);
    } else {
      rejections.push(result.reason);
    }
  });

  console.log(
    `${LOG_PREFIX} [Parsing] ${products.length} of ${rawProducts.length} raw entries converted successfully.`
  );

  if (rejections.length > 0) {
    console.warn(
      `${LOG_PREFIX} [Parsing] ${rejections.length} entr${rejections.length === 1 ? "y was" : "ies were"} rejected:`,
      rejections.slice(0, 10)
    );
    if (rejections.length > 10) {
      console.warn(`${LOG_PREFIX} [Parsing] ...and ${rejections.length - 10} more rejections (truncated).`);
    }
  }

  if (rawProducts.length > 0 && products.length === 0) {
    console.error(
      `${LOG_PREFIX} [Parsing] EVERY raw product was rejected. The Firestore document has data, but none of it matched the expected shape. See rejection reasons above for the exact field/type mismatch.`
    );
  }

  return products;
}

/**
 * Performs the ONE permitted Firestore document read against the Price
 * List project: `catalog/current`. Never call this more than once per
 * startup, and never call it in a loop or per-product.
 */
async function fetchCatalogDocument(): Promise<CatalogProduct[]> {
  console.log(`${LOG_PREFIX} [Read] Starting catalog fetch from project "pricelist-a9d70"...`);

  await ensurePriceListSession();

  console.log(`${LOG_PREFIX} [Read] Calling getDoc(catalog/current)...`);
  const snap = await getDoc(doc(priceListDb, ...CATALOG_DOC_PATH));
  console.log(`${LOG_PREFIX} [Read] getDoc() resolved. Document exists: ${snap.exists()}`);

  if (!snap.exists()) {
    console.error(
      `${LOG_PREFIX} [Read] catalog/current does NOT exist according to this read. If you can see it in the Firestore Console, double-check this app is pointed at project "pricelist-a9d70" and not a different project — see the "[Catalog:init]" log line above for the project ID this app actually resolved.`
    );
    return [];
  }

  const data = snap.data();
  console.log(`${LOG_PREFIX} [Read] Document field keys:`, Object.keys(data ?? {}));

  const rawProducts = Array.isArray(data?.products) ? data.products : [];
  console.log(`${LOG_PREFIX} [Read] "products" array length: ${rawProducts.length}`);

  if (!Array.isArray(data?.products)) {
    console.error(
      `${LOG_PREFIX} [Read] "products" field is not a JS array (typeof: ${typeof data?.products}). If this is a Firestore Map instead of an Array, the data needs to be re-saved as an Array type in the Price List app.`
    );
  }

  return adaptCatalog(rawProducts);
}

/**
 * Loads the catalog for normal application use.
 *
 * Always attempts exactly one Firestore document read first. If that read
 * fails (offline, permission error, etc.), falls back to the IndexedDB
 * cache. If there is no cache either, throws `CatalogUnavailableError` so
 * the UI can show a clear message.
 */
export async function loadCatalog(): Promise<LoadCatalogResult> {
  try {
    const products = await fetchCatalogDocument();
    console.log(`${LOG_PREFIX} [Load] Success — ${products.length} products loaded from Firestore.`);
    await writeCachedCatalog({ products, fetchedAt: Date.now() });
    return { products, isFromCache: false };
  } catch (err) {
    console.error(`${LOG_PREFIX} [Load] Firestore fetch failed, falling back to cache:`, err);
    const cached = await readCachedCatalog();
    if (cached) {
      console.log(`${LOG_PREFIX} [Load] Using cached catalog — ${cached.products.length} products (offline/stale).`);
      return { products: cached.products, isFromCache: true };
    }
    console.error(`${LOG_PREFIX} [Load] No cache available either. Throwing CatalogUnavailableError.`);
    throw new CatalogUnavailableError();
  }
}

/**
 * "Refresh Catalog" — an explicit user action. Performs exactly one more
 * Firestore document read, replaces the cache, and reports whether the
 * catalog actually changed since the previous copy.
 */
export async function refreshCatalog(): Promise<RefreshCatalogResult> {
  console.log(`${LOG_PREFIX} [Refresh] Manual catalog refresh triggered.`);
  const previous = await readCachedCatalog();
  const products = await fetchCatalogDocument();
  await writeCachedCatalog({ products, fetchedAt: Date.now() });

  const changed = !previous || !areCatalogsEqual(previous.products, products);
  console.log(`${LOG_PREFIX} [Refresh] Complete. ${products.length} products, changed: ${changed}.`);
  return { products, changed };
}

function areCatalogsEqual(a: CatalogProduct[], b: CatalogProduct[]): boolean {
  if (a.length !== b.length) return false;

  const canonicalize = (product: CatalogProduct) =>
    [
      product.sr,
      product.productName,
      product.material ?? "",
      product.priceType ?? "",
      product.wPrice,
      product.rPrice,
    ].join("\u0001");

  const sortedA = [...a].map(canonicalize).sort();
  const sortedB = [...b].map(canonicalize).sort();

  return sortedA.length === sortedB.length && sortedA.every((value, i) => value === sortedB[i]);
}
