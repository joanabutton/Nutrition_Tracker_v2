import { deleteFood, updateFood } from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";

type FoodCardProps = {
  food: FoodRecord;
};

export function FoodCard({ food }: FoodCardProps) {
  return (
    <details className="rounded-lg border border-white/70 bg-white/82 p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">{food.name}</h3>
            {food.brand ? <p className="mt-1 text-sm text-ink/55">{food.brand}</p> : null}
          </div>
          <p className="text-sm font-semibold text-ink">{Math.round(food.calories)} kcal</p>
        </div>
        <p className="mt-2 text-sm text-ink/60">
          Per {food.serving_quantity}
          {food.serving_unit}: P {Math.round(food.protein_g)}g · C{" "}
          {Math.round(food.carbohydrate_g)}g · F {Math.round(food.fat_g)}g
          {food.total_sugars_g === null ? "" : ` · sugar ${Math.round(food.total_sugars_g)}g`}
        </p>
      </summary>

      <div className="mt-4 border-t border-ink/10 pt-4">
        <form action={updateFood} className="grid gap-3">
          <input name="foodId" type="hidden" value={food.id} />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Food name
            <input className="field" defaultValue={food.name} name="name" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Brand
            <input className="field" defaultValue={food.brand ?? ""} name="brand" />
          </label>
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Serving
              <input
                className="field"
                defaultValue={food.serving_quantity}
                min="0.01"
                name="servingQuantity"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Unit
              <input className="field" defaultValue={food.serving_unit} name="servingUnit" required />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NutrientInput defaultValue={food.calories} label="Calories" name="calories" unit="kcal" />
            <NutrientInput defaultValue={food.protein_g} label="Protein" name="proteinG" unit="g" />
            <NutrientInput defaultValue={food.carbohydrate_g} label="Carbs" name="carbohydrateG" unit="g" />
            <NutrientInput defaultValue={food.fat_g} label="Fat" name="fatG" unit="g" />
            <NutrientInput defaultValue={food.saturated_fat_g} label="Sat fat" name="saturatedFatG" unit="g" />
            <NutrientInput defaultValue={food.fibre_g} label="Fibre" name="fibreG" unit="g" />
            <NutrientInput
              defaultValue={food.total_sugars_g}
              label="Total sugar"
              name="totalSugarsG"
              placeholder="Optional"
              required={false}
              unit="g"
            />
            <NutrientInput
              defaultValue={food.added_sugar_g}
              label="Added sugar"
              name="addedSugarG"
              placeholder="Unknown"
              required={false}
              unit="g"
            />
          </div>
          <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
            Update food
          </button>
        </form>

        <form action={deleteFood} className="mt-2">
          <input name="foodId" type="hidden" value={food.id} />
          <button className="min-h-11 w-full rounded-md border border-tomato/20 bg-rose/70 px-3 text-sm font-semibold text-tomato">
            Delete food
          </button>
        </form>
      </div>
    </details>
  );
}

function NutrientInput({
  defaultValue,
  label,
  name,
  placeholder,
  required = true,
  unit
}: {
  defaultValue: number | null;
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
          defaultValue={defaultValue ?? ""}
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
