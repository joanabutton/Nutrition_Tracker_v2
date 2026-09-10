import { deleteFoodLog, updateFoodLog } from "@/app/(app)/food-actions";
import { getMealTypeLabel, mealTypeOptions, type MealType } from "@/lib/meal-types";

type FoodLogCardProps = {
  log: {
    id: string;
    meal_type: MealType;
    display_name: string;
    quantity: number | string;
    unit: string;
    calories: number | string;
    protein_g: number | string;
    carbohydrate_g: number | string;
    fat_g: number | string;
  };
};

export function FoodLogCard({ log }: FoodLogCardProps) {
  return (
    <details className="rounded-md border border-white/70 bg-white/82 px-4 py-3 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{log.display_name}</p>
            <p className="mt-1 text-sm text-ink/60">
              {getMealTypeLabel(log.meal_type)} · {Number(log.quantity)} {log.unit}
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">{Math.round(Number(log.calories))} kcal</p>
        </div>
      </summary>

      <div className="mt-3 border-t border-ink/10 pt-3">
        <p className="text-xs font-medium text-ink/55">
          P {Math.round(Number(log.protein_g))}g · C {Math.round(Number(log.carbohydrate_g))}g · F{" "}
          {Math.round(Number(log.fat_g))}g
        </p>

        <form action={updateFoodLog} className="mt-3 grid grid-cols-[1fr_7.5rem] gap-3">
          <input name="logId" type="hidden" value={log.id} />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Quantity
            <input
              className="field"
              defaultValue={Number(log.quantity)}
              min="0.01"
              name="quantity"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Meal
            <select className="field" defaultValue={log.meal_type} name="mealType" required>
              {mealTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
            Update
          </button>
        </form>

        <form action={deleteFoodLog} className="mt-2">
          <input name="logId" type="hidden" value={log.id} />
          <button className="min-h-11 w-full rounded-md border border-tomato/20 bg-rose/70 px-3 text-sm font-semibold text-tomato">
            Delete log
          </button>
        </form>
      </div>
    </details>
  );
}
