import { saveExternalFood } from "@/app/(app)/food-actions";
import { type ExternalFoodCandidate } from "@/lib/nutrition/external-foods";
import { getExternalFoodSourceLabel } from "@/lib/nutrition/food";

type ExternalFoodSearchProps = {
  query: string;
  results: ExternalFoodCandidate[];
  warnings: string[];
};

export function ExternalFoodSearch({ query, results, warnings }: ExternalFoodSearchProps) {
  return (
    <section className="grid gap-3 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70">
      <div>
        <h2 className="text-lg font-semibold text-ink">Find food</h2>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Search external databases, then save the best match to your foods.
        </p>
      </div>

      <form action="/foods" className="grid gap-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Search
          <input
            className="field"
            defaultValue={query}
            name="query"
            placeholder="oats, yoghurt, cereal"
            required
          />
        </label>
        <button className="min-h-12 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-base font-semibold text-ink shadow-sm">
          Search foods
        </button>
      </form>

      {warnings.length > 0 ? (
        <div className="grid gap-2">
          {warnings.map((warning) => (
            <p
              className="rounded-md border border-butter/70 bg-butter/35 px-3 py-2 text-sm text-ink/70"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {query && results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink/15 bg-white/65 px-4 py-5">
          <p className="text-sm font-semibold text-ink">No matches yet</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Try a simpler search, or add the food manually below.
          </p>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-2">
          {results.map((food) => (
            <article
              className="rounded-md border border-white/70 bg-white/75 p-3 shadow-sm"
              key={`${food.externalSource}:${food.externalSourceId}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{food.name}</h3>
                  <p className="mt-1 text-xs text-ink/55">
                    {food.brand ? `${food.brand} · ` : ""}
                    {getExternalFoodSourceLabel(food.externalSource)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-ink">{Math.round(food.calories)} kcal</p>
              </div>
              <p className="mt-2 text-sm text-ink/60">
                Per {food.servingQuantity}
                {food.servingUnit}: P {Math.round(food.proteinG)}g · C{" "}
                {Math.round(food.carbohydrateG)}g · F {Math.round(food.fatG)}g
              </p>
              <p className="mt-1 text-xs text-ink/50">
                Total sugar {formatMaybeNutrient(food.totalSugarsG)} · added sugar{" "}
                {formatMaybeNutrient(food.addedSugarG)}
              </p>
              <form action={saveExternalFood} className="mt-3">
                <input name="externalSource" type="hidden" value={food.externalSource} />
                <input name="externalSourceId" type="hidden" value={food.externalSourceId} />
                <button className="min-h-11 w-full rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
                  Save to my foods
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatMaybeNutrient(value: number | null) {
  return value === null ? "unknown" : `${Math.round(value)}g`;
}
