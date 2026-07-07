/**
 * The set of materials that currently exist as filter chips in the UI.
 * This intentionally mirrors the reference implementation exactly — do not
 * add materials here without an explicit product decision; new materials
 * introduced later can be appended without touching search or UI logic
 * elsewhere, since everything reads from this single source of truth.
 */
export const MATERIALS = ["Brass", "Copper", "Kansa"] as const;
export type Material = (typeof MATERIALS)[number];

/**
 * A product as it lives in the Price List Firebase project
 * (`catalog/current`, inside the `products` array).
 *
 * The Price List project is the single, authoritative source for product
 * identity and pricing metadata. Purchase Tracker never writes here and
 * never copies this data into its own Firestore project — it only ever
 * holds an in-memory / IndexedDB-cached copy fetched at startup.
 *
 * `sr` is the permanent, globally-unique serial number that is the only
 * product identifier ever used across both applications. `id` is always
 * set equal to `sr` — it is not a second identifier, it exists purely so
 * this type satisfies the pre-existing, frozen search engine's generic
 * `SearchableProduct` shape (`{ id, productName, material }`) without any
 * changes to the search module itself.
 */
export interface CatalogProduct {
  /** Always equal to `sr`. Exists only to satisfy `SearchableProduct`. */
  id: string;
  /** Globally unique, permanent, immutable. The only product identifier. */
  sr: string;
  productName: string;
  material: Material | string | null;
  priceType: string | null;
  wPrice: number;
  rPrice: number;
}
