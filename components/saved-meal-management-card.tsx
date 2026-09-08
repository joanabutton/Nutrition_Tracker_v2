import {
  deleteSavedMeal,
  logSavedMeal
} from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";
import { type SavedMeal } from "@/lib/saved-meals";
import { SavedMealForm } from "@/components/saved-meal-form";

type SavedMealManagementCardProps = {
  foods: FoodRecord[];
  meal: SavedMeal;
};

export function SavedMealManagementCard({ foods, meal }: SavedMealManagementCardProps) {
  return (
    <article className="grid gap-3 rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{meal.name}</h3>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            {meal.items.length} {meal.items.length === 1 ? "food" : "foods"} ·{" "}
            {Math.round(meal.totals.calories)} kcal
          </p>
        </div>
        <form action={deleteSavedMeal}>
          <input name="savedMealId" type="hidden" value={meal.id} />
          <button className="rounded-md border border-tomato/20 bg-tomato/10 px-3 py-2 text-xs font-semibold text-tomato">
            Delete
          </button>
        </form>
      </div>

      <div className="grid gap-1 rounded-md bg-white/60 px-3 py-2">
        {meal.items.map((item) => (
          <p className="text-sm text-ink/65" key={item.id}>
            {item.quantity}
            {item.unit} {item.food.brand ? `${item.food.brand} ` : ""}
            {item.food.name}
          </p>
        ))}
      </div>

      <form action={logSavedMeal} className="grid grid-cols-[1fr_auto] gap-2">
        <input name="savedMealId" type="hidden" value={meal.id} />
        <select className="field min-h-11 py-2 text-sm" name="mealType" required>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
        <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
          Log meal
        </button>
      </form>

      <div className="border-t border-ink/10 pt-3">
        <SavedMealForm foods={foods} meal={meal} />
      </div>
    </article>
  );
}
