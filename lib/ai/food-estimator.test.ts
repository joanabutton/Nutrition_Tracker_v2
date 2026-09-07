import { describe, expect, it } from "vitest";

import { validateEstimatedFoodFallbacks } from "@/lib/ai/food-estimator";

describe("food fallback estimator validation", () => {
  it("accepts estimated nutrition rows", () => {
    expect(
      validateEstimatedFoodFallbacks({
        items: [
          {
            index: 0,
            name: "banana",
            quantity: 118,
            unit: "g",
            calories: 105,
            proteinG: 1.3,
            carbohydrateG: 27,
            fatG: 0.4,
            saturatedFatG: 0.1,
            fibreG: 3.1,
            addedSugarG: null,
            reason: "Typical medium banana edible portion."
          }
        ]
      })
    ).toEqual([
      {
        index: 0,
        name: "banana",
        quantity: 118,
        unit: "g",
        calories: 105,
        proteinG: 1.3,
        carbohydrateG: 27,
        fatG: 0.4,
        saturatedFatG: 0.1,
        fibreG: 3.1,
        addedSugarG: null,
        reason: "Typical medium banana edible portion."
      }
    ]);
  });

  it("rejects negative nutrient values", () => {
    expect(() =>
      validateEstimatedFoodFallbacks({
        items: [
          {
            index: 0,
            name: "banana",
            quantity: 118,
            unit: "g",
            calories: -1,
            proteinG: 1.3,
            carbohydrateG: 27,
            fatG: 0.4,
            saturatedFatG: 0.1,
            fibreG: 3.1,
            addedSugarG: null,
            reason: "Typical medium banana edible portion."
          }
        ]
      })
    ).toThrow("invalid nutrient");
  });
});
