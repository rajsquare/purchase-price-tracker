import type { Timestamp } from "firebase/firestore";

export function toMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }

  return null;
}
