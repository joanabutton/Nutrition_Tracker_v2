import { logSavedMeal } from "@/app/(app)/food-actions";
import { type SavedMeal } from "@/lib/saved-meals";
import { mealTypeOptions } from "@/lib/meal-types";

type SavedMealCardProps = {
  meal: SavedMeal;
};

export function SavedMealCard({ meal }: SavedMealCardProps) {
  return (
    <article className="rounded-md border border-white/70 bg-white/75 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{meal.name}</h3>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            {meal.items.map((item) => item.food.name).join(", ")}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-ink">
          {Math.round(meal.totals.calories)} kcal
        </p>
      </div>

      {meal.aliases.length > 0 ? (
        <p className="mt-2 text-xs text-ink/45">Also: {meal.aliases.join(", ")}</p>
      ) : null}

      <form action={logSavedMeal} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input name="savedMealId" type="hidden" value={meal.id} />
        <select className="field min-h-11 py-2 text-sm" name="mealType" required>
          {mealTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
          Log
        </button>
      </form>
    </article>
  );
}
