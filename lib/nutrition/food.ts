export type FoodNutrition = {
  serving_quantity: number | string;
  serving_unit: string;
  calories: number | string;
  protein_g: number | string;
  carbohydrate_g: number | string;
  fat_g: number | string;
  saturated_fat_g: number | string;
  fibre_g: number | string;
  added_sugar_g: number | string | null;
};

export type ScaledFoodNutrition = {
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  saturated_fat_g: number;
  fibre_g: number;
  added_sugar_g: number | null;
};

export function scaleFoodNutrition(food: FoodNutrition, quantity: number): ScaledFoodNutrition {
  const servingQuantity = readPositiveNumber(food.serving_quantity, "serving quantity");
  const ratio = quantity / servingQuantity;

  return {
    calories: roundNutrient(readNumber(food.calories) * ratio),
    protein_g: roundNutrient(readNumber(food.protein_g) * ratio),
    carbohydrate_g: roundNutrient(readNumber(food.carbohydrate_g) * ratio),
    fat_g: roundNutrient(readNumber(food.fat_g) * ratio),
    saturated_fat_g: roundNutrient(readNumber(food.saturated_fat_g) * ratio),
    fibre_g: roundNutrient(readNumber(food.fibre_g) * ratio),
    added_sugar_g: scaleNullableNumber(food.added_sugar_g, ratio)
  };
}

export function scaleLoggedNutrition<T extends ScaledFoodNutrition & { quantity: number | string }>(
  log: T,
  quantity: number
): ScaledFoodNutrition {
  const originalQuantity = readPositiveNumber(log.quantity, "logged quantity");
  const ratio = quantity / originalQuantity;

  return {
    calories: roundNutrient(readNumber(log.calories) * ratio),
    protein_g: roundNutrient(readNumber(log.protein_g) * ratio),
    carbohydrate_g: roundNutrient(readNumber(log.carbohydrate_g) * ratio),
    fat_g: roundNutrient(readNumber(log.fat_g) * ratio),
    saturated_fat_g: roundNutrient(readNumber(log.saturated_fat_g) * ratio),
    fibre_g: roundNutrient(readNumber(log.fibre_g) * ratio),
    added_sugar_g: scaleNullableNumber(log.added_sugar_g, ratio)
  };
}

export function roundNutrient(value: number) {
  return Math.round(value * 100) / 100;
}

export function getExternalFoodSourceLabel(source: string) {
  if (source === "open_food_facts") {
    return "Open Food Facts";
  }

  if (source === "usda_fooddata_central") {
    return "USDA FoodData Central";
  }

  if (source === "portfir_bdca") {
    return "PortFIR / INSA BDCA";
  }

  if (source === "cofid_uk") {
    return "McCance and Widdowson / CoFID";
  }

  return "Manual";
}

function readPositiveNumber(value: number | string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return parsed;
}

function readNumber(value: number | string | null) {
  if (value === null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scaleNullableNumber(value: number | string | null, ratio: number) {
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundNutrient(parsed * ratio) : null;
}
