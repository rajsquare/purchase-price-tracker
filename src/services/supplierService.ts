import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Supplier } from "@/types/purchasing";
import { toMillis } from "@/utils/firestore";

const SUPPLIERS_COLLECTION = "suppliers";
const CURRENT_PRICES_COLLECTION = "currentPrices";
const PRICE_HISTORY_COLLECTION = "priceHistory";

interface SupplierPatch {
  name?: string;
  displayOrder?: number;
  active?: boolean;
}

function mapSupplierDoc(snap: QueryDocumentSnapshot<DocumentData>): Supplier {
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data.name ?? ""),
    displayOrder: Number(data.displayOrder ?? 0),
    active: data.active !== false,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function cleanName(name: string): string {
  return name.trim();
}

async function getNextDisplayOrder(): Promise<number> {
  const snap = await getDocs(
    query(collection(db, SUPPLIERS_COLLECTION), orderBy("displayOrder", "desc"), limit(1))
  );
  const currentMax = snap.docs[0] ? Number(snap.docs[0].data().displayOrder ?? 0) : 0;
  return currentMax + 1;
}

async function hasSupplierPriceRecords(supplierId: string): Promise<boolean> {
  const currentSnap = await getDocs(
    query(
      collection(db, CURRENT_PRICES_COLLECTION),
      where("supplierId", "==", supplierId),
      limit(1)
    )
  );

  if (!currentSnap.empty) return true;

  const historySnap = await getDocs(
    query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where("supplierId", "==", supplierId),
      limit(1)
    )
  );

  return !historySnap.empty;
}

export async function loadSuppliers({
  includeInactive = false,
}: { includeInactive?: boolean } = {}): Promise<Supplier[]> {
  const snap = await getDocs(query(collection(db, SUPPLIERS_COLLECTION), orderBy("displayOrder")));
  const suppliers = snap.docs.map(mapSupplierDoc);
  return includeInactive ? suppliers : suppliers.filter((supplier) => supplier.active);
}

export async function createSupplier(name: string): Promise<string> {
  const supplierName = cleanName(name);
  if (!supplierName) {
    throw new Error("Supplier name is required.");
  }

  const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), {
    name: supplierName,
    displayOrder: await getNextDisplayOrder(),
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateSupplier(supplierId: string, patch: SupplierPatch): Promise<void> {
  const next: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (patch.name !== undefined) {
    const supplierName = cleanName(patch.name);
    if (!supplierName) {
      throw new Error("Supplier name is required.");
    }
    next.name = supplierName;
  }

  if (patch.displayOrder !== undefined) {
    next.displayOrder = patch.displayOrder;
  }

  if (patch.active !== undefined) {
    next.active = patch.active;
  }

  await updateDoc(doc(db, SUPPLIERS_COLLECTION, supplierId), next);
}

export async function removeSupplier(supplierId: string): Promise<"deleted" | "disabled"> {
  if (await hasSupplierPriceRecords(supplierId)) {
    await updateSupplier(supplierId, { active: false });
    return "disabled";
  }

  await deleteDoc(doc(db, SUPPLIERS_COLLECTION, supplierId));
  return "deleted";
}

export async function moveSupplier(
  supplierId: string,
  direction: "up" | "down"
): Promise<void> {
  const suppliers = await loadSuppliers({ includeInactive: true });
  const index = suppliers.findIndex((supplier) => supplier.id === supplierId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  const current = suppliers[index];
  const other = suppliers[swapIndex];
  if (!current || !other) return;

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.update(doc(db, SUPPLIERS_COLLECTION, current.id), {
    displayOrder: other.displayOrder,
    updatedAt: now,
  });
  batch.update(doc(db, SUPPLIERS_COLLECTION, other.id), {
    displayOrder: current.displayOrder,
    updatedAt: now,
  });

  await batch.commit();
}
