"use client";

import { useId, useMemo, useState } from "react";

import { createSavedMeal, updateSavedMeal } from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";
import { type SavedMeal } from "@/lib/saved-meals";

type SavedMealFormProps = {
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

export function SavedMealForm({ foods, meal }: SavedMealFormProps) {
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
  const formClassName = meal
    ? "grid gap-3"
    : "grid gap-3 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70";

  return (
    <form action={action} className={formClassName}>
      {!meal ? (
        <div>
          <p className="text-sm leading-6 text-ink/60">
            Build a reusable meal from foods you have already saved.
          </p>
        </div>
      ) : null}

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
