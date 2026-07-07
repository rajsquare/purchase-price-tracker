import { MATERIALS } from "@/types/catalog";

interface MaterialFilterChipsProps {
  visible: boolean;
  activeMaterial: string | null;
  onToggle: (material: string) => void;
}

const CHIP_ACCENT: Record<string, string> = {
  Brass: "data-[active=true]:bg-material-brass",
  Copper: "data-[active=true]:bg-material-copper",
  Kansa: "data-[active=true]:bg-material-kansa",
};

export function MaterialFilterChips({ visible, activeMaterial, onToggle }: MaterialFilterChipsProps) {
  if (!visible) return null;

  return (
    <div className="mt-4 flex gap-2">
      {MATERIALS.map((material) => {
        const isActive = activeMaterial === material;
        return (
          <button
            key={material}
            type="button"
            data-active={isActive}
            onClick={() => onToggle(material)}
            className={`rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 data-[active=true]:border-transparent data-[active=true]:text-white data-[active=true]:shadow-sm ${CHIP_ACCENT[material] ?? ""}`}
          >
            {material}
          </button>
        );
      })}
    </div>
  );
}
