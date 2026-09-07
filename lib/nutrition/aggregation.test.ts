import { describe, expect, it } from "vitest";

import {
  aggregateExerciseCalories,
  aggregateFoodLogs,
  calculateExerciseAdjustment,
  calculateRemainingCalories
} from "@/lib/nutrition/aggregation";

describe("daily nutrition aggregation", () => {
  it("aggregates nutrients from copied food log values", () => {
    expect(
      aggregateFoodLogs([
        {
          calories: "250",
          protein_g: "18",
          carbohydrate_g: "30",
          fat_g: "8",
          saturated_fat_g: "2",
          fibre_g: "4",
          added_sugar_g: null
        },
        {
          calories: 120,
          protein_g: 3,
          carbohydrate_g: 15,
          fat_g: 5,
          saturated_fat_g: 1,
          fibre_g: 2,
          added_sugar_g: 6
        }
      ])
    ).toEqual({
      calories: 370,
      proteinG: 21,
      carbohydrateG: 45,
      fatG: 13,
      saturatedFatG: 3,
      fibreG: 6,
      addedSugarG: 6
    });
  });

  it("calculates exercise adjustment from the profile setting", () => {
    expect(
      aggregateExerciseCalories([{ calories_estimated: "180" }, { calories_estimated: 70 }])
    ).toBe(250);
    expect(calculateExerciseAdjustment(250, 0)).toBe(0);
    expect(calculateExerciseAdjustment(250, 50)).toBe(125);
    expect(calculateExerciseAdjustment(250, 100)).toBe(250);
  });

  it("calculates remaining calories with exercise adjustment", () => {
    expect(calculateRemainingCalories(1800, 1200, 100)).toBe(700);
  });
});
