export type NutrientTotals = {
  calories: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  saturatedFatG: number;
  fibreG: number;
  addedSugarG: number;
};

export type FoodLogForTotals = {
  calories: number | string | null;
  protein_g: number | string | null;
  carbohydrate_g: number | string | null;
  fat_g: number | string | null;
  saturated_fat_g: number | string | null;
  fibre_g: number | string | null;
  added_sugar_g: number | string | null;
};

export type ExerciseLogForTotals = {
  calories_estimated: number | string | null;
};

export const emptyNutrientTotals: NutrientTotals = {
  calories: 0,
  proteinG: 0,
  carbohydrateG: 0,
  fatG: 0,
  saturatedFatG: 0,
  fibreG: 0,
  addedSugarG: 0
};

export function aggregateFoodLogs(foodLogs: FoodLogForTotals[]): NutrientTotals {
  return foodLogs.reduce<NutrientTotals>(
    (totals, log) => ({
      calories: totals.calories + toNumber(log.calories),
      proteinG: totals.proteinG + toNumber(log.protein_g),
      carbohydrateG: totals.carbohydrateG + toNumber(log.carbohydrate_g),
      fatG: totals.fatG + toNumber(log.fat_g),
      saturatedFatG: totals.saturatedFatG + toNumber(log.saturated_fat_g),
      fibreG: totals.fibreG + toNumber(log.fibre_g),
      addedSugarG: totals.addedSugarG + toNumber(log.added_sugar_g)
    }),
    emptyNutrientTotals
  );
}

export function aggregateExerciseCalories(exerciseLogs: ExerciseLogForTotals[]) {
  return exerciseLogs.reduce((total, log) => total + toNumber(log.calories_estimated), 0);
}

export function calculateExerciseAdjustment(
  exerciseCalories: number,
  eatBackPercentage: 0 | 50 | 100
) {
  return Math.round(exerciseCalories * (eatBackPercentage / 100));
}

export function calculateCalorieAllowance(calorieTarget: number, exerciseAdjustment: number) {
  return Math.round(calorieTarget + exerciseAdjustment);
}

export function calculateExerciseAdjustedMacroTarget(
  macroTarget: number,
  calorieTarget: number,
  exerciseAdjustment: number
) {
  if (calorieTarget <= 0) {
    return Math.round(macroTarget);
  }

  return Math.round(macroTarget * ((calorieTarget + exerciseAdjustment) / calorieTarget));
}

export function calculateRemainingCalories(
  calorieTarget: number,
  consumedCalories: number,
  exerciseAdjustment: number
) {
  return Math.round(calorieTarget + exerciseAdjustment - consumedCalories);
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
