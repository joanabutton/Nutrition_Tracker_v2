import { SavedMealForm } from "@/components/saved-meal-form";
import { SavedMealManagementCard } from "@/components/saved-meal-management-card";
import { getFoods } from "@/lib/foods";
import { getSavedMeals } from "@/lib/saved-meals";

type MealsPageProps = {
  searchParams: Promise<{
    message?: string;
    query?: string;
  }>;
};

export default async function MealsPage({ searchParams }: MealsPageProps) {
  const { message, query = "" } = await searchParams;
  const [meals, foods] = await Promise.all([
    getSavedMeals({ limit: query ? 50 : 20, query }),
    getFoods({ limit: 100 })
  ]);

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Meals</h1>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Save common combinations and log them in one tap.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-mint/70 px-3 py-2 text-sm font-medium text-moss">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">Saved meals</h2>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink/60">
            {query ? `${meals.length} matches` : `${meals.length} saved`}
          </span>
        </div>

        <form action="/meals" className="grid gap-2 rounded-lg bg-white/70 p-3 ring-1 ring-white/70">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Search meals
            <input
              className="field"
              defaultValue={query}
              name="query"
              placeholder="usual breakfast, salad"
            />
          </label>
          <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
            Search
          </button>
        </form>

        {meals.length > 0 ? (
          <div className="grid gap-3">
            {meals.map((meal) => (
              <SavedMealManagementCard foods={foods} key={meal.id} meal={meal} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-ink/15 bg-white/65 px-4 py-5">
            <p className="text-sm font-semibold text-ink">No saved meals yet</p>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Save one from a confirmed food description, or build one below.
            </p>
          </div>
        )}
      </section>

      <SavedMealForm foods={foods} />
    </section>
  );
}
