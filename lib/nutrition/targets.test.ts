import { describe, expect, it } from "vitest";

import {
  calculateAge,
  calculateBmr,
  calculateCalorieTarget,
  calculateDefaultTargets,
  calculateTdee
} from "@/lib/nutrition/targets";

describe("nutrition target calculations", () => {
  it("calculates age from birth date", () => {
    expect(calculateAge("1990-09-08", new Date("2026-09-07T12:00:00Z"))).toBe(35);
    expect(calculateAge("1990-09-07", new Date("2026-09-07T12:00:00Z"))).toBe(36);
  });

  it("calculates BMR with the Mifflin-St Jeor equation", () => {
    expect(
      calculateBmr({
        birthDate: "1990-01-01",
        sex: "male",
        heightCm: 180,
        currentWeightKg: 80,
        asOf: new Date("2026-09-07T12:00:00Z")
      })
    ).toBe(1750);

    expect(
      calculateBmr({
        birthDate: "1990-01-01",
        sex: "female",
        heightCm: 165,
        currentWeightKg: 65,
        asOf: new Date("2026-09-07T12:00:00Z")
      })
    ).toBe(1340);
  });

  it("calculates TDEE from BMR and activity level", () => {
    expect(calculateTdee(1600, "sedentary")).toBe(1920);
    expect(calculateTdee(1600, "moderate")).toBe(2480);
  });

  it("adjusts calorie target by goal and weekly rate", () => {
    expect(calculateCalorieTarget(2200, "maintain_weight", 0.5)).toBe(2200);
    expect(calculateCalorieTarget(2200, "lose_weight", 0.5)).toBe(1650);
    expect(calculateCalorieTarget(2200, "gain_weight", 0.25)).toBe(2475);
  });

  it("does not recommend a weight-loss target below the calorie floor", () => {
    expect(calculateCalorieTarget(1300, "lose_weight", 1)).toBe(1200);
  });

  it("creates editable default nutrition targets", () => {
    const targets = calculateDefaultTargets({
      birthDate: "1990-01-01",
      sex: "female",
      heightCm: 165,
      currentWeightKg: 65,
      activityLevel: "light",
      goal: "lose_weight",
      desiredWeightChangeKgPerWeek: 0.25
    });

    expect(targets.calorieTarget).toBeGreaterThanOrEqual(1200);
    expect(targets.proteinTargetG).toBe(105);
    expect(targets.fibreTargetG).toBe(30);
    expect(targets.addedSugarLimitG).toBe(25);
  });
});
