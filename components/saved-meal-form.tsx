"use client";

import { useMemo, useState } from "react";

import { createSavedMeal } from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";

type SavedMealFormProps = {
  foods: FoodRecord[];
};

type MealFoodRow = {
  id: number;
  foodText: string;
  foodId: string;
  unit: string;
};

export function SavedMealForm({ foods }: SavedMealFormProps) {
  const [nextId, setNextId] = useState(1);
  const [rows, setRows] = useState<MealFoodRow[]>([
    { id: 0, foodText: "", foodId: "", unit: "" }
  ]);
  const foodOptions = useMemo(() => foods.map((food) => ({
    food,
    label: formatFoodOption(food)
  })), [foods]);

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

      <input name="itemCount" type="hidden" value={rows.length} />
      <datalist id="saved-meal-foods">
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
                <input
                  className="field min-h-11 py-2 text-sm"
                  list="saved-meal-foods"
                  name={`foodText_${index}`}
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
                  required
                  step="0.01"
                  type="number"
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
        Save meal
      </button>
    </form>
  );

  function addFoodRow() {
    setRows((current) => [...current, { id: nextId, foodText: "", foodId: "", unit: "" }]);
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

function formatFoodOption(food: FoodRecord) {
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
