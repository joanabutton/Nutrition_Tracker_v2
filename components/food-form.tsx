import { createFood } from "@/app/(app)/food-actions";

export function FoodForm() {
  return (
    <form action={createFood} className="grid gap-4 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70">
      <div>
        <h2 className="text-lg font-semibold text-ink">Add a food</h2>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Enter the nutrition for one normal serving. You can log any quantity from it later.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Food name
        <input className="field" name="name" placeholder="Greek yoghurt" required />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Brand
        <input className="field" name="brand" placeholder="Optional" />
      </label>

      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Serving amount
          <input className="field" min="0.01" name="servingQuantity" required step="0.01" type="number" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Unit
          <input className="field" name="servingUnit" placeholder="g" required />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NutrientInput label="Calories" name="calories" unit="kcal" />
        <NutrientInput label="Protein" name="proteinG" unit="g" />
        <NutrientInput label="Carbs" name="carbohydrateG" unit="g" />
        <NutrientInput label="Fat" name="fatG" unit="g" />
        <NutrientInput label="Sat fat" name="saturatedFatG" unit="g" />
        <NutrientInput label="Fibre" name="fibreG" unit="g" />
        <NutrientInput label="Total sugar" name="totalSugarsG" placeholder="Optional" required={false} unit="g" />
        <NutrientInput label="Added sugar" name="addedSugarG" placeholder="Unknown" required={false} unit="g" />
      </div>

      <button className="min-h-12 rounded-md bg-gradient-to-r from-mint via-aqua to-lilac px-4 text-base font-semibold text-ink shadow-sm">
        Save food
      </button>
    </form>
  );
}

function NutrientInput({
  label,
  name,
  placeholder,
  required = true,
  unit
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  unit: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <div className="relative">
        <input
          className="field pr-11"
          min="0"
          name={name}
          placeholder={placeholder}
          required={required}
          step="0.01"
          type="number"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink/45">
          {unit}
        </span>
      </div>
    </label>
  );
}
