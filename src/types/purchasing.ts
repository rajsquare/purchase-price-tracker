export interface Supplier {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface CurrentPrice {
  id: string;
  /** The catalog product's `sr` — the only product identifier used here. */
  productSr: string;
  supplierId: string;
  price: number;
  currency: string;
  remarks: string;
  updatedAt: number | null;
}

export interface PriceHistoryEntry {
  id: string;
  productSr: string;
  supplierId: string;
  price: number;
  currency: string;
  remarks: string;
  effectiveDate: number | null;
  enteredAt: number | null;
  createdAt: number | null;
}

export interface SavePriceInput {
  productSr: string;
  supplierId: string;
  price: number;
  currency: string;
  remarks: string;
}
