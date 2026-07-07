import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/client";
import type { CurrentPrice, PriceHistoryEntry, SavePriceInput } from "@/types/purchasing";
import { toMillis } from "@/utils/firestore";

const CURRENT_PRICES_COLLECTION = "currentPrices";
const PRICE_HISTORY_COLLECTION = "priceHistory";

function mapCurrentPriceDoc(snap: QueryDocumentSnapshot<DocumentData>): CurrentPrice {
  const data = snap.data();
  return {
    id: snap.id,
    productSr: String(data.productSr ?? ""),
    supplierId: String(data.supplierId ?? ""),
    price: Number(data.price ?? 0),
    currency: String(data.currency ?? "INR"),
    remarks: String(data.remarks ?? ""),
    updatedAt: toMillis(data.updatedAt),
  };
}

function mapHistoryDoc(snap: QueryDocumentSnapshot<DocumentData>): PriceHistoryEntry {
  const data = snap.data();
  return {
    id: snap.id,
    productSr: String(data.productSr ?? ""),
    supplierId: String(data.supplierId ?? ""),
    price: Number(data.price ?? 0),
    currency: String(data.currency ?? "INR"),
    remarks: String(data.remarks ?? ""),
    effectiveDate: toMillis(data.effectiveDate),
    enteredAt: toMillis(data.enteredAt),
    createdAt: toMillis(data.createdAt),
  };
}

export function currentPriceId(productSr: string, supplierId: string): string {
  return `${productSr}_${supplierId}`;
}

export function validatePriceValue(price: number): void {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be greater than zero.");
  }
}

export async function loadCurrentPricesForProduct(productSr: string): Promise<CurrentPrice[]> {
  const snap = await getDocs(
    query(collection(db, CURRENT_PRICES_COLLECTION), where("productSr", "==", productSr))
  );
  return snap.docs.map(mapCurrentPriceDoc);
}

/**
 * Used by Supplier Search: every product a given supplier currently has a
 * price on file for.
 */
export async function loadCurrentPricesForSupplier(supplierId: string): Promise<CurrentPrice[]> {
  const snap = await getDocs(
    query(collection(db, CURRENT_PRICES_COLLECTION), where("supplierId", "==", supplierId))
  );
  return snap.docs.map(mapCurrentPriceDoc);
}

export async function saveCurrentPrice(input: SavePriceInput): Promise<void> {
  validatePriceValue(input.price);

  const priceData = {
    productSr: input.productSr,
    supplierId: input.supplierId,
    price: input.price,
    currency: input.currency.trim() || "INR",
    remarks: input.remarks.trim(),
  };

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.set(doc(db, CURRENT_PRICES_COLLECTION, currentPriceId(input.productSr, input.supplierId)), {
    ...priceData,
    updatedAt: now,
  });

  batch.set(doc(collection(db, PRICE_HISTORY_COLLECTION)), {
    ...priceData,
    effectiveDate: now,
    enteredAt: now,
    createdAt: now,
  });

  await batch.commit();
}

export async function loadPriceHistory(
  productSr: string,
  supplierId: string
): Promise<PriceHistoryEntry[]> {
  // Deliberately no `orderBy("createdAt", "desc")` here: combined with the
  // two equality filters below, that would require a composite Firestore
  // index (productSr, supplierId, createdAt) to exist server-side. Whether
  // that index has actually been deployed is outside what this app's code
  // controls, and its absence surfaces as a generic read failure even
  // though the documents are entirely valid. Since this always queries a
  // single product+supplier pair, the result set is small — sorting it
  // client-side gets the same "newest first" order without depending on
  // any server-side index.
  const snap = await getDocs(
    query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where("productSr", "==", productSr),
      where("supplierId", "==", supplierId)
    )
  );

  return snap.docs
    .map(mapHistoryDoc)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
