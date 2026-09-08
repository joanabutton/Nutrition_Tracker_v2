import { type FoodRecord } from "@/lib/foods";
import { scaleFoodNutrition, type ScaledFoodNutrition } from "@/lib/nutrition/food";
import { createClient } from "@/lib/supabase/server";

export type SavedMealFood = Pick<
  FoodRecord,
  | "id"
  | "name"
  | "brand"
  | "serving_quantity"
  | "serving_unit"
  | "calories"
  | "protein_g"
  | "carbohydrate_g"
  | "fat_g"
  | "saturated_fat_g"
  | "fibre_g"
  | "added_sugar_g"
  | "source"
>;

export type SavedMealItem = {
  id: string;
  foodId: string;
  quantity: number;
  unit: string;
  food: SavedMealFood;
  nutrition: ScaledFoodNutrition;
};

export type SavedMeal = {
  id: string;
  name: string;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
  items: SavedMealItem[];
  totals: ScaledFoodNutrition;
};

type SavedMealRow = {
  id: string;
  name: string;
  aliases: string[] | null;
  created_at: string;
  updated_at: string;
  saved_meal_items?: SavedMealItemRow[] | null;
};

type SavedMealItemRow = {
  id: string;
  food_id: string;
  quantity: number | string;
  unit: string;
  foods: SavedMealFood | SavedMealFood[] | null;
};

type GetSavedMealsOptions = {
  limit?: number;
  query?: string;
};

const savedMealSelect = `
  id,
  name,
  aliases,
  created_at,
  updated_at,
  saved_meal_items (
    id,
    food_id,
    quantity,
    unit,
    foods (
      id,
      name,
      brand,
      source,
      serving_quantity,
      serving_unit,
      calories,
      protein_g,
      carbohydrate_g,
      fat_g,
      saturated_fat_g,
      fibre_g,
      added_sugar_g
    )
  )
`;

export async function getSavedMeals({ limit = 12, query = "" }: GetSavedMealsOptions = {}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_meals")
    .select(savedMealSelect)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = normalize(query);
  const meals = ((data ?? []) as SavedMealRow[]).map(mapSavedMealRow).filter(hasItems);
  const filteredMeals = normalizedQuery
    ? meals.filter((meal) => mealMatchesQuery(meal, normalizedQuery))
    : meals;

  return filteredMeals.slice(0, limit);
}

export async function getSavedMeal(id: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("saved_meals")
    .select(savedMealSelect)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapSavedMealRow(data as SavedMealRow) : null;
}

export function findSavedMealByText(meals: SavedMeal[], text: string) {
  const normalizedText = normalize(text);

  return (
    meals.find((meal) => normalize(meal.name) === normalizedText) ??
    meals.find((meal) => meal.aliases.some((alias) => normalize(alias) === normalizedText)) ??
    meals.find((meal) => normalizedText.includes(normalize(meal.name))) ??
    meals.find((meal) => meal.aliases.some((alias) => normalizedText.includes(normalize(alias)))) ??
    null
  );
}

export function buildSavedMealDraftItems(meal: SavedMeal, text: string) {
  const modifications = getSavedMealModificationTerms(text);
  const omitTerms = [
    ...modifications.omitTerms,
    ...modifications.replacements.map((replacement) => replacement.remove)
  ];

  return meal.items
    .filter((item) => !omitTerms.some((term) => savedMealItemMatchesTerm(item, term)))
    .map((item) => ({
      inputName: item.food.name,
      quantity: item.quantity,
      unit: item.unit,
      quantityIsEstimated: false,
      portionDescription: null,
      resolved: {
        kind: "saved_food" as const,
        foodId: item.food.id,
        name: item.food.name,
        brand: item.food.brand,
        servingQuantity: item.food.serving_quantity,
        servingUnit: item.food.serving_unit,
        calories: item.food.calories,
        nutritionSource: item.food.source
      },
      alternatives: [
        {
          kind: "saved_food" as const,
          foodId: item.food.id,
          name: item.food.name,
          brand: item.food.brand,
          servingQuantity: item.food.serving_quantity,
          servingUnit: item.food.serving_unit,
          calories: item.food.calories,
          nutritionSource: item.food.source
        }
      ],
      warning: omitTerms.length > 0 ? "Saved meal adjusted from your description." : null
    }));
}

export function calculateMealTotals(items: Array<{ nutrition: ScaledFoodNutrition }>) {
  return items.reduce<ScaledFoodNutrition>(
    (totals, item) => ({
      calories: totals.calories + item.nutrition.calories,
      protein_g: totals.protein_g + item.nutrition.protein_g,
      carbohydrate_g: totals.carbohydrate_g + item.nutrition.carbohydrate_g,
      fat_g: totals.fat_g + item.nutrition.fat_g,
      saturated_fat_g: totals.saturated_fat_g + item.nutrition.saturated_fat_g,
      fibre_g: totals.fibre_g + item.nutrition.fibre_g,
      added_sugar_g:
        totals.added_sugar_g === null || item.nutrition.added_sugar_g === null
          ? null
          : totals.added_sugar_g + item.nutrition.added_sugar_g
    }),
    {
      calories: 0,
      protein_g: 0,
      carbohydrate_g: 0,
      fat_g: 0,
      saturated_fat_g: 0,
      fibre_g: 0,
      added_sugar_g: 0
    }
  );
}

function mapSavedMealRow(row: SavedMealRow): SavedMeal {
  const items = (row.saved_meal_items ?? []).flatMap(mapSavedMealItemRow);

  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    totals: calculateMealTotals(items)
  };
}

function mapSavedMealItemRow(row: SavedMealItemRow): SavedMealItem[] {
  const food = Array.isArray(row.foods) ? row.foods[0] : row.foods;

  if (!food) {
    return [];
  }

  const quantity = Number(row.quantity);
  const nutrition = scaleFoodNutrition(food, quantity);

  return [
    {
      id: row.id,
      foodId: row.food_id,
      quantity,
      unit: row.unit,
      food,
      nutrition
    }
  ];
}

function mealMatchesQuery(meal: SavedMeal, normalizedQuery: string) {
  return [
    meal.name,
    ...meal.aliases,
    ...meal.items.flatMap((item) => [item.food.name, item.food.brand ?? ""])
  ].some((value) => normalize(value).includes(normalizedQuery));
}

function hasItems(meal: SavedMeal) {
  return meal.items.length > 0;
}

export function getSavedMealModificationTerms(text: string) {
  const normalized = normalize(text);
  const terms: string[] = [];
  const replacements: Array<{ add: string; remove: string }> = [];

  for (const pattern of [/\b(?:no|without|sem)\s+([^,.]+)/g]) {
    let match = pattern.exec(normalized);

    while (match) {
      if (match[1]) {
        terms.push(match[1].trim());
      }

      match = pattern.exec(normalized);
    }
  }

  for (const pattern of [
    /\b([^,.]+?)\s+instead of\s+([^,.]+)/g,
    /\b([^,.]+?)\s+em vez de\s+([^,.]+)/g
  ]) {
    let match = pattern.exec(normalized);

    while (match) {
      if (match[1] && match[2]) {
        replacements.push({
          add: cleanReplacementAddTerm(match[1]),
          remove: match[2].trim()
        });
      }

      match = pattern.exec(normalized);
    }
  }

  return {
    omitTerms: terms,
    replacements: replacements.filter((replacement) => replacement.add && replacement.remove)
  };
}

function cleanReplacementAddTerm(value: string) {
  const afterConnector = value.split(/\b(?:but|with|add|swap|use)\b/g).at(-1) ?? value;

  return afterConnector
    .replace(/\b(?:and|log|my|the|a|an|o|os|as)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function savedMealItemMatchesTerm(item: SavedMealItem, term: string) {
  const foodText = normalize(`${item.food.brand ?? ""} ${item.food.name}`);

  return normalize(term)
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .some((word) => foodText.includes(word));
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
