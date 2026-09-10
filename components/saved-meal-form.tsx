"use client";

import { useId, useMemo, useState } from "react";

import {
  createSavedMeal,
  saveExternalFoodForSavedMeal,
  updateSavedMeal
} from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";
import { type ExternalFoodCandidate } from "@/lib/nutrition/external-foods";
import { getExternalFoodSourceLabel } from "@/lib/nutrition/food";
import { type SavedMeal } from "@/lib/saved-meals";

type SavedMealFormProps = {
  databaseFoods?: ExternalFoodCandidate[];
  databaseWarnings?: string[];
  foodQuery?: string;
  foods: FoodRecord[];
  meal?: SavedMeal;
};

type FoodOptionRecord = Pick<FoodRecord, "id" | "name" | "brand" | "serving_quantity" | "serving_unit">;

type MealFoodRow = {
  id: number;
  foodText: string;
  foodId: string;
  quantity: string;
  unit: string;
};

export function SavedMealForm({
  databaseFoods = [],
  databaseWarnings = [],
  foodQuery = "",
  foods,
  meal
}: SavedMealFormProps) {
  const listId = useId();
  const initialRows = useMemo(
    () =>
      meal?.items.length
        ? meal.items.map((item, index) => ({
            id: index,
            foodText: formatFoodOption(item.food),
            foodId: item.foodId,
            quantity: String(item.quantity),
            unit: item.unit
          }))
        : [{ id: 0, foodText: "", foodId: "", quantity: "", unit: "" }],
    [meal]
  );
  const [nextId, setNextId] = useState(initialRows.length);
  const [rows, setRows] = useState<MealFoodRow[]>(initialRows);
  const foodOptions = useMemo(() => foods.map((food) => ({
    food,
    label: formatFoodOption(food)
  })), [foods]);
  const action = meal ? updateSavedMeal : createSavedMeal;
  const formClassName = "grid gap-3";

  return (
    <div className="grid gap-4">
      {!meal ? (
        <section className="grid gap-3 rounded-md bg-white/60 p-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Find a food for this meal</h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Search your reference and external food databases, then add the match to your foods.
            </p>
          </div>

          <form action="/meals" className="grid gap-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Search databases
              <input
                className="field"
                defaultValue={foodQuery}
                name="foodQuery"
                placeholder="oats, yoghurt, cereal"
                required
                type="search"
              />
            </label>
            <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
              Search foods
            </button>
          </form>

          {databaseWarnings.map((warning) => (
            <p
              className="rounded-md border border-butter/70 bg-butter/35 px-3 py-2 text-sm text-ink/70"
              key={warning}
            >
              {warning}
            </p>
          ))}

          {foodQuery && databaseFoods.length === 0 ? (
            <p className="rounded-md border border-dashed border-ink/15 bg-white/65 px-3 py-3 text-sm text-ink/60">
              No database matches found. Try a simpler search, or save the food manually first.
            </p>
          ) : null}

          {databaseFoods.length > 0 ? (
            <div className="grid gap-2">
              {databaseFoods.map((food) => (
                <article
                  className="rounded-md border border-white/70 bg-white/75 p-3"
                  key={`${food.externalSource}:${food.externalSourceId}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{food.name}</h4>
                      <p className="mt-1 text-xs text-ink/55">
                        {food.brand ? `${food.brand} · ` : ""}
                        {getExternalFoodSourceLabel(food.externalSource)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink">
                      {Math.round(food.calories)} kcal
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-ink/60">
                    Per {food.servingQuantity}{food.servingUnit}: P {Math.round(food.proteinG)}g · C{" "}
                    {Math.round(food.carbohydrateG)}g · F {Math.round(food.fatG)}g
                  </p>
                  <form action={saveExternalFoodForSavedMeal} className="mt-3">
                    <input name="externalSource" type="hidden" value={food.externalSource} />
                    <input name="externalSourceId" type="hidden" value={food.externalSourceId} />
                    <input name="foodQuery" type="hidden" value={foodQuery} />
                    <button className="min-h-10 w-full rounded-md bg-white px-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10">
                      Add to my foods
                    </button>
                  </form>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <form action={action} className={formClassName}>

        {meal ? <input name="savedMealId" type="hidden" value={meal.id} /> : null}

        <label className="grid gap-2 text-sm font-semibold text-ink">
        Meal name
        <input
          className="field"
          defaultValue={meal?.name}
          name="name"
          placeholder="Usual breakfast"
          required
        />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink">
        Aliases
        <input
          className="field"
          defaultValue={meal?.aliases.join(", ")}
          name="aliases"
          placeholder="porridge, my breakfast"
        />
        </label>

        <input name="itemCount" type="hidden" value={rows.length} />
        <datalist id={listId}>
          {foodOptions.map(({ food, label }) => (
            <option key={food.id} value={label} />
          ))}
        </datalist>

        <div className="grid gap-3">
        {rows.map((row, index) => (
          <div className="grid gap-2 rounded-md border border-white/70 bg-white/60 p-3" key={row.id}>
            <input name={`foodId_${index}`} type="hidden" value={row.foodId} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Food
                <input name={`foodText_${index}`} type="hidden" value={row.foodText} />
                <input
                  className="field min-h-11 py-2 text-sm"
                  list={listId}
                  onChange={(event) => updateFoodRow(index, event.target.value)}
                  placeholder="Type a saved food"
                  required
                  type="search"
                  value={row.foodText}
                />
              </label>
              <button
                className="mt-7 min-h-11 rounded-md border border-white/70 bg-white/75 px-3 text-sm font-semibold text-ink/65 shadow-sm disabled:opacity-40"
                disabled={rows.length === 1}
                onClick={() => removeFoodRow(index)}
                type="button"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-[1fr_5.5rem] gap-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Quantity
                <input
                  className="field min-h-11 py-2 text-sm"
                  min="0.01"
                  name={`quantity_${index}`}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  required
                  step="0.01"
                  type="number"
                  value={row.quantity}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Unit
                <input
                  className="field min-h-11 py-2 text-sm"
                  name={`unit_${index}`}
                  onChange={(event) => updateRow(index, { unit: event.target.value })}
                  placeholder="g"
                  required
                  value={row.unit}
                />
              </label>
            </div>
          </div>
        ))}
        </div>

        <button
        className="min-h-11 rounded-md border border-white/70 bg-white/75 px-4 text-sm font-semibold text-ink shadow-sm"
        onClick={addFoodRow}
        type="button"
        >
          Add food
        </button>

        <button
        className="min-h-12 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-base font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={foods.length === 0}
        >
          {meal ? "Update meal" : "Save meal"}
        </button>
      </form>
    </div>
  );

  function addFoodRow() {
    setRows((current) => [
      ...current,
      { id: nextId, foodText: "", foodId: "", quantity: "", unit: "" }
    ]);
    setNextId((current) => current + 1);
  }

  function removeFoodRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function updateFoodRow(index: number, foodText: string) {
    const selectedFood = foodOptions.find(
      ({ label }) => normalize(label) === normalize(foodText)
    )?.food;

    updateRow(index, {
      foodText,
      foodId: selectedFood?.id ?? "",
      unit: selectedFood?.serving_unit ?? ""
    });
  }

  function updateRow(index: number, patch: Partial<MealFoodRow>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  }
}

function formatFoodOption(food: FoodOptionRecord) {
  const brand = food.brand ? `${food.brand} ` : "";
  return `${brand}${food.name} (${food.serving_quantity}${food.serving_unit})`;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
