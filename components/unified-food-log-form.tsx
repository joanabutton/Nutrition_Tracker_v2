"use client";

import { useMemo, useState } from "react";

import { logSelectedFood } from "@/app/(app)/food-actions";
import { type FoodRecord } from "@/lib/foods";
import { type ExternalFoodCandidate } from "@/lib/nutrition/external-foods";
import { getExternalFoodSourceLabel } from "@/lib/nutrition/food";
import { mealTypeOptions } from "@/lib/meal-types";

type UnifiedFoodLogFormProps = {
  query: string;
  savedFoods: FoodRecord[];
  databaseFoods: ExternalFoodCandidate[];
};

type FoodOption =
  | {
      kind: "saved";
      id: string;
      label: string;
      detail: string;
      servingQuantity: number;
      servingUnit: string;
    }
  | {
      kind: "external";
      id: string;
      label: string;
      detail: string;
      servingQuantity: number;
      servingUnit: string;
      externalSource: ExternalFoodCandidate["externalSource"];
      externalSourceId: string;
    };

export function UnifiedFoodLogForm({
  query,
  savedFoods,
  databaseFoods
}: UnifiedFoodLogFormProps) {
  const options = useMemo(
    () => [
      ...savedFoods.map(toSavedOption),
      ...databaseFoods.map(toExternalOption)
    ],
    [databaseFoods, savedFoods]
  );
  const [selectedValue, setSelectedValue] = useState(options[0] ? getOptionValue(options[0]) : "");
  const selectedOption = options.find((option) => getOptionValue(option) === selectedValue);
  const unit = selectedOption?.servingUnit ?? "g";

  return (
    <div className="grid gap-3">
      <form action="/today#log-food" className="grid gap-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Find food
          <input
            className="field"
            defaultValue={query}
            name="foodQuery"
            placeholder="bran sticks, Greek yoghurt, banana"
            type="search"
          />
        </label>
        <button className="min-h-11 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-sm font-semibold text-ink shadow-sm">
          Search saved and databases
        </button>
      </form>

      {query ? (
        options.length > 0 ? (
          <form action={logSelectedFood} className="grid gap-3 rounded-md border border-white/70 bg-white/70 p-3">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Food
              <select
                className="field"
                name="foodMatch"
                onChange={(event) => setSelectedValue(event.target.value)}
                required
                value={selectedValue}
              >
                {options.map((option) => (
                  <option key={getOptionValue(option)} value={getOptionValue(option)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedOption ? (
              <p className="text-xs leading-5 text-ink/55">{selectedOption.detail}</p>
            ) : null}

            <div className="grid grid-cols-[1fr_7.5rem] gap-3">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Quantity
                <div className="relative">
                  <input
                    className="field pr-14"
                    min="0.01"
                    name="quantity"
                    placeholder="50"
                    required
                    step="0.01"
                    type="number"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink/45">
                    {unit}
                  </span>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Meal
                <select className="field" name="mealType" required>
                  {mealTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <button className="min-h-12 rounded-md bg-mint px-4 text-base font-semibold text-ink shadow-sm">
              Add to today
            </button>
          </form>
        ) : (
          <div className="rounded-md border border-dashed border-ink/15 bg-white/60 px-4 py-5">
            <p className="text-sm font-semibold text-ink">No matches found</p>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Try fewer words, or add the food manually from Foods.
            </p>
          </div>
        )
      ) : (
        <p className="rounded-md bg-white/55 px-3 py-2 text-sm text-ink/60">
          Search will show your saved foods first, then database matches.
        </p>
      )}
    </div>
  );
}

function toSavedOption(food: FoodRecord): FoodOption {
  const brand = food.brand ? `${food.brand} ` : "";

  return {
    kind: "saved",
    id: food.id,
    label: `${brand}${food.name} · saved`,
    detail: `${Math.round(food.calories)} kcal per ${food.serving_quantity}${food.serving_unit}`,
    servingQuantity: food.serving_quantity,
    servingUnit: food.serving_unit
  };
}

function toExternalOption(food: ExternalFoodCandidate): FoodOption {
  const brand = food.brand ? `${food.brand} · ` : "";
  const source = getExternalFoodSourceLabel(food.externalSource);

  return {
    kind: "external",
    id: `${food.externalSource}:${food.externalSourceId}`,
    label: `${food.name} · ${brand}${source}`,
    detail: `${Math.round(food.calories)} kcal per ${food.servingQuantity}${food.servingUnit}`,
    servingQuantity: food.servingQuantity,
    servingUnit: food.servingUnit,
    externalSource: food.externalSource,
    externalSourceId: food.externalSourceId
  };
}

function getOptionValue(option: FoodOption) {
  if (option.kind === "saved") {
    return `saved:${option.id}`;
  }

  return `external:${option.externalSource}:${encodeURIComponent(option.externalSourceId)}`;
}
