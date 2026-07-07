import { Link } from "react-router-dom";
import type { CatalogProduct } from "@/types/catalog";

const MATERIAL_BADGE_CLASS: Record<string, string> = {
  Brass: "bg-material-brass/15 text-material-brass",
  Copper: "bg-material-copper/15 text-material-copper",
  Kansa: "bg-material-kansa/15 text-material-kansa",
};

interface SuggestionCardProps {
  product: CatalogProduct;
}

export function SuggestionCard({ product }: SuggestionCardProps) {
  const materialClass = product.material ? MATERIAL_BADGE_CLASS[product.material] : undefined;

  return (
    <Link
      to={`/products/${product.sr}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-card transition hover:border-brand-orange/30 hover:shadow-card-hover"
    >
      <span className="min-w-0 truncate text-base font-medium text-neutral-900">
        {product.productName}
      </span>

      {product.material && (
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${materialClass ?? "bg-neutral-100 text-neutral-600"}`}
        >
          {product.material}
        </span>
      )}
    </Link>
  );
}
