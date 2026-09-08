import { describe, expect, it } from "vitest";

import {
  estimateExerciseCalories,
  parseExerciseText,
  parseRunningExerciseText
} from "@/lib/nutrition/exercise";

describe("exercise logging", () => {
  it("parses a running description with distance and duration", () => {
    expect(parseRunningExerciseText("Ran 4.2 km in 30 minutes")).toEqual({
      type: "running",
      distanceKm: 4.2,
      durationMinutes: 30,
      originalText: "Ran 4.2 km in 30 minutes"
    });
  });

  it("parses Portuguese running text", () => {
    expect(parseRunningExerciseText("corri 3km em 25min")).toMatchObject({
      type: "running",
      distanceKm: 3,
      durationMinutes: 25
    });
  });

  it("parses supported non-running exercise text", () => {
    expect(parseExerciseText("walked 40 minutes")).toMatchObject({
      type: "walking",
      distanceKm: null,
      durationMinutes: 40
    });
    expect(parseExerciseText("housework and childcare 2 hours")).toMatchObject({
      type: "housework_childcare",
      durationMinutes: 120
    });
  });

  it("estimates running calories from distance and body weight", () => {
    expect(
      estimateExerciseCalories({
        type: "running",
        distanceKm: 4.2,
        durationMinutes: 30,
        weightKg: 70
      })
    ).toEqual({
      caloriesEstimated: 294,
      estimationMethod: "running_distance_kcal_per_kg_km"
    });
  });

  it("falls back to duration when distance is missing", () => {
    expect(
      estimateExerciseCalories({
        type: "running",
        distanceKm: null,
        durationMinutes: 30,
        weightKg: 70
      })
    ).toEqual({
      caloriesEstimated: 291,
      estimationMethod: "running_met_8_3"
    });
  });

  it("estimates non-running calories from MET, duration, and body weight", () => {
    expect(
      estimateExerciseCalories({
        type: "walking",
        distanceKm: null,
        durationMinutes: 40,
        weightKg: 70
      })
    ).toEqual({
      caloriesEstimated: 163,
      estimationMethod: "walking_met_3_5"
    });
  });
});
