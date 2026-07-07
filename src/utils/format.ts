export function formatPrice(price: number | null | undefined, currency = "INR"): string {
  if (price === null || price === undefined) return "No price";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(millis: number | null | undefined): string {
  if (!millis) return "Never";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
}
