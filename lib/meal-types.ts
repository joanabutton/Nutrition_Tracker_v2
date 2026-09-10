export const mealTypes = [
  "breakfast",
  "elevenses",
  "lunch",
  "pre_run_snack",
  "post_run_snack",
  "mid_afternoon_meal",
  "dinner",
  "supper",
  "snack"
] as const;

export type MealType = (typeof mealTypes)[number];

export const mealTypeOptions: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "elevenses", label: "Elevenses" },
  { value: "lunch", label: "Lunch" },
  { value: "pre_run_snack", label: "Pre-run snack" },
  { value: "post_run_snack", label: "Post-run snack" },
  { value: "mid_afternoon_meal", label: "Mid afternoon meal" },
  { value: "dinner", label: "Dinner" },
  { value: "supper", label: "Supper" },
  { value: "snack", label: "Snack" }
];

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && mealTypes.includes(value as MealType);
}

export function getMealTypeLabel(type: MealType) {
  return mealTypeOptions.find((option) => option.value === type)?.label ?? type;
}
