"use client";

import { useId, useMemo, useState } from "react";

import { logFood } from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";

type FoodLogFormProps = {
  foods: FoodRecord[];
  initialFoodId?: string;
  recentFoodIds?: string[];
  embedded?: boolean;
};

const maxVisibleFoods = 25;

export function FoodLogForm({
  foods,
  initialFoodId = "",
  recentFoodIds = [],
  embedded = false
}: FoodLogFormProps) {
  const foodListId = useId();
  const hasInitialFood = foods.some((food) => food.id === initialFoodId);
  const initialFood = foods.find((food) => food.id === initialFoodId);
  const [foodSearch, setFoodSearch] = useState(initialFood ? formatFoodOption(initialFood) : "");
  const [selectedFoodId, setSelectedFoodId] = useState(hasInitialFood ? initialFoodId : "");
  const selectedFood = useMemo(
    () => foods.find((food) => food.id === selectedFoodId),
    [foods, selectedFoodId]
  );
  const visibleFoods = useMemo(
    () => filterFoods(foods, foodSearch, recentFoodIds, selectedFoodId),
    [foodSearch, foods, recentFoodIds, selectedFoodId]
  );
  const quantityUnit = selectedFood?.serving_unit ?? "unit";

  return (
    <form
      action={logFood}
      className={embedded ? "grid gap-3" : "grid gap-3 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70"}
    >
      {embedded ? null : (
        <div>
          <h2 className="text-lg font-semibold text-ink">Log food</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Pick a saved food and enter how much you ate.
          </p>
        </div>
      )}

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Food
        <input
          className="field"
          list={foodListId}
          disabled={foods.length === 0}
          onChange={(event) => {
            const value = event.target.value;
            setFoodSearch(value);
            setSelectedFoodId(findFoodIdFromSearch(foods, value) ?? "");
          }}
          name="query"
          placeholder="Type or choose a saved food"
          type="search"
          value={foodSearch}
        />
        <datalist id={foodListId}>
          {visibleFoods.map((food) => (
            <option key={food.id} value={formatFoodOption(food)} />
          ))}
        </datalist>
      </label>
      <input name="foodId" required type="hidden" value={selectedFoodId} />
      {foods.length > visibleFoods.length ? (
        <p className="text-xs text-ink/50">
          Showing {visibleFoods.length} of {foods.length}. Type to narrow the list.
        </p>
      ) : null}

      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Quantity
          <div className="relative">
            <input
              className="field pr-14"
              disabled={foods.length === 0}
              min="0.01"
              name="quantity"
              placeholder={selectedFood ? `50` : ""}
              required
              step="0.01"
              type="number"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink/45">
              {quantityUnit}
            </span>
          </div>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Meal
          <select className="field" disabled={foods.length === 0} name="mealType" required>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          className="min-h-12 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-base font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={foods.length === 0 || !selectedFood}
        >
          Add to today
        </button>
        <button
          className="min-h-12 rounded-md border border-white/70 bg-white/75 px-4 text-base font-semibold text-ink/70 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!foodSearch.trim()}
          formAction="/foods"
          formMethod="get"
          formNoValidate
        >
          Search databases
        </button>
      </div>
    </form>
  );
}

function formatFoodOption(food: FoodRecord) {
  const brand = food.brand ? `${food.brand} ` : "";
  return `${brand}${food.name} (${food.serving_quantity}${food.serving_unit})`;
}

function filterFoods(
  foods: FoodRecord[],
  filter: string,
  recentFoodIds: string[],
  selectedFoodId: string
) {
  const normalizedFilter = normalize(filter);
  const recentOrder = new Map(recentFoodIds.map((id, index) => [id, index]));
  const sortedFoods = [...foods].sort((a, b) => {
    const aRecent = recentOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRecent = recentOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

    if (aRecent !== bRecent) {
      return aRecent - bRecent;
    }

    return a.name.localeCompare(b.name);
  });
  const matches = normalizedFilter
    ? sortedFoods.filter((food) => normalize(`${food.brand ?? ""} ${food.name}`).includes(normalizedFilter))
    : sortedFoods;
  const selectedFood = selectedFoodId
    ? sortedFoods.find((food) => food.id === selectedFoodId)
    : undefined;
  const visible = matches.slice(0, maxVisibleFoods);

  if (selectedFood && !visible.some((food) => food.id === selectedFood.id)) {
    return [selectedFood, ...visible.slice(0, maxVisibleFoods - 1)];
  }

  return visible;
}

function findFoodIdFromSearch(foods: FoodRecord[], value: string) {
  const normalizedValue = normalize(value);
  const exactMatch = foods.find((food) => normalize(formatFoodOption(food)) === normalizedValue);
  const nameMatch = foods.find(
    (food) => normalize(`${food.brand ?? ""} ${food.name}`) === normalizedValue
  );

  return exactMatch?.id ?? nameMatch?.id ?? null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
