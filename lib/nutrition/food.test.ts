import { describe, expect, it } from "vitest";

import { scaleFoodNutrition, scaleLoggedNutrition } from "@/lib/nutrition/food";

describe("food nutrition scaling", () => {
  it("scales food nutrition from serving size to logged quantity", () => {
    expect(
      scaleFoodNutrition(
        {
          serving_quantity: 100,
          serving_unit: "g",
          calories: 250,
          protein_g: 10,
          carbohydrate_g: 30,
          fat_g: 8,
          saturated_fat_g: 2,
          fibre_g: 4,
          added_sugar_g: null
        },
        40
      )
    ).toEqual({
      calories: 100,
      protein_g: 4,
      carbohydrate_g: 12,
      fat_g: 3.2,
      saturated_fat_g: 0.8,
      fibre_g: 1.6,
      added_sugar_g: null
    });
  });

  it("rescales copied log nutrition when editing a quantity", () => {
    expect(
      scaleLoggedNutrition(
        {
          quantity: "50",
          calories: 120,
          protein_g: 6,
          carbohydrate_g: 10,
          fat_g: 4,
          saturated_fat_g: 1,
          fibre_g: 3,
          added_sugar_g: 2
        },
        75
      )
    ).toEqual({
      calories: 180,
      protein_g: 9,
      carbohydrate_g: 15,
      fat_g: 6,
      saturated_fat_g: 1.5,
      fibre_g: 4.5,
      added_sugar_g: 3
    });
  });
});
