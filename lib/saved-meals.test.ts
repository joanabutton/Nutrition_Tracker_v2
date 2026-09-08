import { describe, expect, it } from "vitest";

import {
  buildSavedMealDraftItems,
  calculateMealTotals,
  findSavedMealByText,
  type SavedMeal
} from "@/lib/saved-meals";

const usualBreakfast: SavedMeal = {
  id: "meal-1",
  name: "Usual breakfast",
  aliases: ["porridge"],
  createdAt: "2026-09-08T00:00:00Z",
  updatedAt: "2026-09-08T00:00:00Z",
  totals: {
    calories: 255,
    protein_g: 9,
    carbohydrate_g: 43,
    fat_g: 6,
    saturated_fat_g: 1,
    fibre_g: 7,
    added_sugar_g: null
  },
  items: [
    {
      id: "item-1",
      foodId: "food-oats",
      quantity: 40,
      unit: "g",
      nutrition: {
        calories: 150,
        protein_g: 5,
        carbohydrate_g: 27,
        fat_g: 3,
        saturated_fat_g: 0.5,
        fibre_g: 4,
        added_sugar_g: null
      },
      food: {
        id: "food-oats",
        name: "Oats",
        brand: null,
        serving_quantity: 100,
        serving_unit: "g",
        calories: 375,
        protein_g: 12.5,
        carbohydrate_g: 67.5,
        fat_g: 7.5,
        saturated_fat_g: 1.25,
        fibre_g: 10,
        added_sugar_g: null,
        source: "verified"
      }
    },
    {
      id: "item-2",
      foodId: "food-banana",
      quantity: 80,
      unit: "g",
      nutrition: {
        calories: 105,
        protein_g: 4,
        carbohydrate_g: 16,
        fat_g: 3,
        saturated_fat_g: 0.5,
        fibre_g: 3,
        added_sugar_g: null
      },
      food: {
        id: "food-banana",
        name: "Banana",
        brand: null,
        serving_quantity: 100,
        serving_unit: "g",
        calories: 89,
        protein_g: 1,
        carbohydrate_g: 23,
        fat_g: 0.3,
        saturated_fat_g: 0.1,
        fibre_g: 2.6,
        added_sugar_g: null,
        source: "verified"
      }
    }
  ]
};

describe("saved meals", () => {
  it("matches saved meals by name or alias in free text", () => {
    expect(findSavedMealByText([usualBreakfast], "log my usual breakfast")?.id).toBe("meal-1");
    expect(findSavedMealByText([usualBreakfast], "porridge please")?.id).toBe("meal-1");
  });

  it("removes omitted foods from a saved meal draft", () => {
    const items = buildSavedMealDraftItems(usualBreakfast, "usual breakfast without banana");

    expect(items).toHaveLength(1);
    expect(items[0]?.resolved?.name).toBe("Oats");
    expect(items[0]?.warning).toContain("adjusted");
  });

  it("keeps unknown added sugar unknown when meal items include unknown values", () => {
    expect(calculateMealTotals(usualBreakfast.items).added_sugar_g).toBeNull();
  });
});
