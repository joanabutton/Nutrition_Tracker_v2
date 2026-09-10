import { describe, expect, it } from "vitest";

import { getMealTypeLabel, isMealType, mealTypes } from "@/lib/meal-types";

describe("meal types", () => {
  it("includes the additional meal choices", () => {
    expect(mealTypes).toEqual(expect.arrayContaining([
      "pre_run_snack",
      "post_run_snack",
      "elevenses",
      "mid_afternoon_meal",
      "supper"
    ]));
  });

  it("validates and labels an additional meal type", () => {
    expect(isMealType("pre_run_snack")).toBe(true);
    expect(isMealType("brunch")).toBe(false);
    expect(getMealTypeLabel("mid_afternoon_meal")).toBe("Mid afternoon meal");
  });
});
