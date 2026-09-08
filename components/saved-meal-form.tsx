import { createSavedMeal } from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";

type SavedMealFormProps = {
  foods: FoodRecord[];
};

export function SavedMealForm({ foods }: SavedMealFormProps) {
  return (
    <form action={createSavedMeal} className="grid gap-3 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70">
      <div>
        <h2 className="text-lg font-semibold text-ink">Create saved meal</h2>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Build a reusable meal from foods you have already saved.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Meal name
        <input className="field" name="name" placeholder="Usual breakfast" required />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Aliases
        <input className="field" name="aliases" placeholder="porridge, my breakfast" />
      </label>

      <div className="grid gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="grid grid-cols-[1fr_5.5rem_4.5rem] gap-2" key={index}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Food {index + 1}
              <select className="field min-h-11 py-2 text-sm" name={`foodId_${index}`}>
                <option value="">Choose food</option>
                {foods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.brand ? `${food.brand} ` : ""}
                    {food.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Qty
              <input
                className="field min-h-11 py-2 text-sm"
                min="0.01"
                name={`quantity_${index}`}
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Unit
              <input
                className="field min-h-11 py-2 text-sm"
                name={`unit_${index}`}
                placeholder="g"
              />
            </label>
          </div>
        ))}
      </div>

      <button
        className="min-h-12 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-base font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={foods.length === 0}
      >
        Save meal
      </button>
    </form>
  );
}
