import { redirect } from "next/navigation";

import { ConversationalFoodLogForm } from "@/components/conversational-food-log-form";
import { FoodLogCard } from "@/components/food-log-card";
import { NutritionCylinder } from "@/components/nutrition-cylinder";
import { SavedMealCard } from "@/components/saved-meal-card";
import { UnifiedFoodLogForm } from "@/components/unified-food-log-form";
import { getTodayDashboard } from "@/lib/dashboard";
import { getFoods } from "@/lib/foods";
import { searchExternalFoods } from "@/lib/nutrition/external-foods";
import { searchReferenceFoods } from "@/lib/reference-foods";
import { getSavedMeals } from "@/lib/saved-meals";

type TodayPageProps = {
  searchParams: Promise<{
    foodQuery?: string;
    message?: string;
  }>;
};

type TodayDashboard = NonNullable<Awaited<ReturnType<typeof getTodayDashboard>>>;
type TodayFoodLog = NonNullable<TodayDashboard["foodLogs"]>[number];
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const mealSections: Array<{ type: MealType; label: string }> = [
  { type: "breakfast", label: "Breakfast" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
  { type: "snack", label: "Snacks" }
];

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const { foodQuery = "", message } = await searchParams;
  const trimmedFoodQuery = foodQuery.trim();
  const [dashboard, savedFoods, savedMeals, referenceResult, externalResult] = await Promise.all([
    getTodayDashboard(),
    getFoods({ limit: trimmedFoodQuery ? 20 : 8, query: trimmedFoodQuery }),
    getSavedMeals({ limit: 4 }),
    trimmedFoodQuery
      ? searchReferenceFoods(trimmedFoodQuery)
      : Promise.resolve({ foods: [], warnings: [] }),
    trimmedFoodQuery
      ? searchExternalFoods(trimmedFoodQuery)
      : Promise.resolve({ foods: [], warnings: [] })
  ]);

  if (!dashboard || !dashboard.profile) {
    redirect("/onboarding");
  }

  const { profile, foodTotals } = dashboard;
  const databaseFoods = [...referenceResult.foods, ...externalResult.foods];

  return (
    <section className="grid gap-5" id="top">
      <div className="rounded-lg bg-gradient-to-br from-rose via-lilac to-aqua p-4 text-ink shadow-soft ring-1 ring-white/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-moss">{dashboard.dateLabel}</p>
            <h2 className="mt-1 text-4xl font-semibold tracking-normal">
              {dashboard.remainingCalories}
            </h2>
            <p className="mt-1 text-sm text-ink/65">kcal remaining</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{Math.round(foodTotals.calories)} eaten</p>
            <p className="mt-1 text-xs text-ink/60">{profile.calorie_target} kcal target</p>
            <p className="mt-1 text-xs text-ink/60">+{dashboard.exerciseAdjustment} exercise</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            className="grid min-h-12 place-items-center rounded-md bg-white/90 px-3 text-sm font-semibold text-ink shadow-sm"
            href="/today#log-food"
          >
            + Add food
          </a>
          <button
            className="min-h-12 rounded-md border border-white/70 bg-butter/80 px-3 text-sm font-semibold text-ink shadow-sm disabled:opacity-100"
            disabled
            type="button"
          >
            + Add exercise
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-mint/70 px-3 py-2 text-sm font-medium text-moss">
          {message}
        </p>
      ) : null}

      <section className="grid grid-cols-[6.5rem_1fr] gap-3">
        <NutritionCylinder
          kind="calories"
          label="Calories"
          target={profile.calorie_target}
          unit="kcal"
          value={foodTotals.calories}
        />

        <div className="grid grid-cols-3 gap-2">
          <NutritionCylinder
            kind="target"
            label="Protein"
            target={profile.protein_target_g}
            unit="g"
            value={foodTotals.proteinG}
          />
          <NutritionCylinder
            kind="target"
            label="Carbs"
            target={profile.carbohydrate_target_g}
            unit="g"
            value={foodTotals.carbohydrateG}
          />
          <NutritionCylinder
            kind="target"
            label="Fat"
            target={profile.fat_target_g}
            unit="g"
            value={foodTotals.fatG}
          />
          <NutritionCylinder
            kind="limit"
            label="Sat fat"
            target={profile.saturated_fat_limit_g}
            unit="g"
            value={foodTotals.saturatedFatG}
          />
          <NutritionCylinder
            kind="target"
            label="Fibre"
            target={profile.fibre_target_g}
            unit="g"
            value={foodTotals.fibreG}
          />
          <NutritionCylinder
            kind="limit"
            label="Added sugar"
            target={profile.added_sugar_limit_g}
            unit="g"
            value={foodTotals.addedSugarG}
          />
        </div>
      </section>

      <section
        className="grid gap-4 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70"
        id="log-food"
      >
        <div>
          <h2 className="text-lg font-semibold text-ink">Log food</h2>
        </div>
        <UnifiedFoodLogForm
          databaseFoods={databaseFoods}
          query={trimmedFoodQuery}
          savedFoods={savedFoods}
        />
        {[...referenceResult.warnings, ...externalResult.warnings].map((warning) => (
          <p
            className="rounded-md border border-butter/70 bg-butter/35 px-3 py-2 text-sm text-ink/70"
            key={warning}
          >
            {warning}
          </p>
        ))}
        <details className="rounded-md border border-white/70 bg-white/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Or describe a meal
          </summary>
          <div className="mt-3">
            <ConversationalFoodLogForm embedded />
          </div>
        </details>
      </section>

      {savedMeals.length > 0 ? (
        <section className="grid gap-3 rounded-lg bg-white/70 p-4 shadow-soft ring-1 ring-white/70">
          <SectionHeader title="Saved meals" count={savedMeals.length} />
          <div className="grid gap-2">
            {savedMeals.map((meal) => (
              <SavedMealCard key={meal.id} meal={meal} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 rounded-lg bg-white/70 p-4 shadow-soft ring-1 ring-white/70">
        <SectionHeader title="Meals" count={dashboard.foodLogs.length} />
        {dashboard.foodLogs.length > 0 ? (
          <div className="grid gap-3">
            {groupFoodLogsByMeal(dashboard.foodLogs).map(({ label, logs, calories }) => (
              <div className="grid gap-2" key={label}>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-ink">
                    {label} · {Math.round(calories)} kcal
                  </h4>
                  <span className="text-xs font-semibold text-ink/45">
                    {logs.length} {logs.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="grid gap-2">
                  {logs.map((log) => (
                    <FoodLogCard key={log.id} log={log} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            text="Log a saved food above and daily totals will update here."
            title="No meals logged today"
          />
        )}
      </section>

      <section className="grid gap-3 rounded-lg bg-white/70 p-4 shadow-soft ring-1 ring-white/70">
        <SectionHeader title="Exercise" count={dashboard.exerciseLogs.length} />
        <div className="rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Adjustment</p>
              <p className="mt-1 text-sm text-ink/60">
                {profile.exercise_eat_back_percentage}% of exercise calories
              </p>
            </div>
            <p className="text-2xl font-semibold text-ink">+{dashboard.exerciseAdjustment}</p>
          </div>
        </div>

        {dashboard.exerciseLogs.length > 0 ? (
          dashboard.exerciseLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-white/70 bg-white/82 px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-ink">{log.type}</p>
              <p className="mt-1 text-sm text-ink/60">
                {Math.round(Number(log.calories_estimated))} kcal estimated
              </p>
            </div>
          ))
        ) : (
          <EmptyPanel
            text="Exercise entries are coming in a later phase."
            title="No exercise logged today"
          />
        )}
      </section>
    </section>
  );
}

function groupFoodLogsByMeal(foodLogs: TodayFoodLog[]) {
  return mealSections
    .map(({ type, label }) => ({
      label,
      logs: foodLogs.filter((log) => log.meal_type === type)
    }))
    .map((section) => ({
      ...section,
      calories: section.logs.reduce((total, log) => total + Number(log.calories), 0)
    }))
    .filter((section) => section.logs.length > 0);
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/60">
        {count}
      </span>
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/15 bg-white/65 px-4 py-5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink/60">{text}</p>
    </div>
  );
}
