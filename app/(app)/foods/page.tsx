import { FoodCard } from "@/components/food-card";
import { FoodForm } from "@/components/food-form";
import { ExternalFoodSearch } from "@/components/external-food-search";
import { getFoods } from "@/lib/foods";
import { searchExternalFoods } from "@/lib/nutrition/external-foods";
import { searchReferenceFoods } from "@/lib/reference-foods";

type FoodsPageProps = {
  searchParams: Promise<{
    message?: string;
    query?: string;
  }>;
};

export default async function FoodsPage({ searchParams }: FoodsPageProps) {
  const { message, query = "" } = await searchParams;
  const [foods, referenceResult, externalResult] = await Promise.all([
    getFoods({ limit: query ? 50 : 20, query }),
    query ? searchReferenceFoods(query) : Promise.resolve({ foods: [], warnings: [] }),
    query ? searchExternalFoods(query) : Promise.resolve({ foods: [], warnings: [] })
  ]);
  const searchResult = {
    foods: [...referenceResult.foods, ...externalResult.foods],
    warnings: [...referenceResult.warnings, ...externalResult.warnings]
  };

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Foods</h1>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Search food databases or add label values manually.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-mint/70 px-3 py-2 text-sm font-medium text-moss">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">Saved foods</h2>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink/60">
            {query ? `${foods.length} matches` : `${foods.length} recent`}
          </span>
        </div>
        <form action="/foods" className="grid gap-2 rounded-lg bg-white/70 p-3 ring-1 ring-white/70">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Search saved foods
            <input
              className="field"
              defaultValue={query}
              name="query"
              placeholder="bran, iogurte, arroz"
            />
          </label>
          <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
            Search
          </button>
        </form>

        {foods.length > 0 ? (
          foods.map((food) => (
            <FoodCard food={food} key={food.id} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-ink/15 bg-white/65 px-4 py-5">
            <p className="text-sm font-semibold text-ink">No foods yet</p>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {query
                ? "No saved foods matched that search. Try the database results below or add it manually."
                : "Add your regular foods here, then log them from Today."}
            </p>
          </div>
        )}
      </section>

      <ExternalFoodSearch
        query={query}
        results={searchResult.foods}
        warnings={searchResult.warnings}
      />

      <FoodForm />
    </section>
  );
}
