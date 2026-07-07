import type { ChangeEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        inputMode="search"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={handleChange}
        placeholder="Search a product…"
        aria-label="Search products"
        className="w-full rounded-2xl border border-neutral-300 bg-white px-6 py-5 text-xl text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 sm:text-2xl"
      />

      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-xl leading-none text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          ×
        </button>
      )}
    </div>
  );
}
