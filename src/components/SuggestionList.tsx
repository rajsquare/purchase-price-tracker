import { SuggestionCard } from "./SuggestionCard";
import type { CatalogProduct } from "@/types/catalog";

interface SuggestionListProps {
  results: CatalogProduct[];
  hasQuery: boolean;
}

export function SuggestionList({ results, hasQuery }: SuggestionListProps) {
  if (!hasQuery) return null;

  if (results.length === 0) {
    return <p className="mt-6 text-center text-sm text-neutral-500">No products found.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {results.map((product) => (
        <SuggestionCard key={product.id} product={product} />
      ))}
    </div>
  );
}
