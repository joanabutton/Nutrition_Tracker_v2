"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseFoodLogText } from "@/lib/ai/food-parser";
import {
  type ExternalFoodSource,
  getExternalFoodCandidate
} from "@/lib/nutrition/external-foods";
import { scaleFoodNutrition, scaleLoggedNutrition } from "@/lib/nutrition/food";
import {
  applyDraftMatchSelections,
  calculateEstimatedDraftItemNutrition,
  calculateDraftItemNutrition,
  decodeDraft,
  encodeDraft,
  materializeDraftItemFood,
  resolveParsedFoodLog,
  type ConversationalFoodDraft,
  type ConversationalFoodDraftItem
} from "@/lib/nutrition/conversational-foods";
import { getReferenceFoodCandidate, isReferenceFoodSource } from "@/lib/reference-foods";
import { isMealType, type MealType } from "@/lib/meal-types";
import {
  buildSavedMealDraftItems,
  findSavedMealByText,
  getSavedMeal,
  getSavedMealModificationTerms,
  getSavedMeals
} from "@/lib/saved-meals";
import { createClient } from "@/lib/supabase/server";

type PreparedConversationalFoodLogItem = {
  foodId: string | null;
  mealQuantity: number;
  mealUnit: string;
  row: Record<string, string | number | null>;
};

export type ConversationalFoodLogState = {
  draft: ConversationalFoodDraft | null;
  encodedDraft: string | null;
  input: string;
  message: string | null;
};

export async function parseConversationalFoodLog(
  _state: ConversationalFoodLogState,
  formData: FormData
): Promise<ConversationalFoodLogState> {
  try {
    const input = readRequiredString(formData, "foodText");
    const savedMealDraft = await resolveSavedMealDraft(input);
    const draft =
      savedMealDraft ??
      (await resolveParsedFoodLog(await parseFoodLogText(input), input));

    return {
      draft,
      encodedDraft: encodeDraft(draft),
      input,
      message: null
    };
  } catch (error) {
    return {
      draft: null,
      encodedDraft: null,
      input: String(formData.get("foodText") ?? ""),
      message: getErrorMessage(error)
    };
  }
}

export async function confirmConversationalFoodLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let draft: ConversationalFoodDraft;

  try {
    draft = decodeDraft(readRequiredString(formData, "draft"));
    draft = applyDraftMatchSelections(draft, readDraftMatchSelections(formData, draft.items.length));
    draft = applyDraftEdits(draft, formData);
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  if (draft.items.length === 0) {
    redirectWithMessage("/today", "Choose at least one food to add.");
  }

  if (draft.items.some((item) => !item.resolved)) {
    redirectWithMessage("/today", "Resolve all foods before adding this log.");
  }

  try {
    const saveAsMeal = formData.get("saveAsMeal") === "on";
    const savedMealName = saveAsMeal ? readRequiredString(formData, "savedMealName") : null;
    const preparedItems = await Promise.all(
      draft.items.map(async (item) => {
        if (item.resolved?.kind === "estimated_food") {
          if (saveAsMeal) {
            const food = await createEstimatedFoodFromDraftItem(supabase, user.id, item);
            const nutrition = calculateDraftItemNutrition(food, item.quantity, item.unit);

            return {
              foodId: food.id,
              mealQuantity: item.quantity,
              mealUnit: item.unit,
              row: {
                user_id: user.id,
                meal_type: draft.mealType,
                food_id: food.id,
                display_name: item.resolved.name,
                quantity: item.quantity,
                unit: item.unit,
                nutrition_source: "estimated" as const,
                original_user_text: draft.originalText,
                ...nutrition
              }
            };
          }

          const nutrition = calculateEstimatedDraftItemNutrition(item, item.quantity, item.unit);

          return {
            foodId: null,
            mealQuantity: item.quantity,
            mealUnit: item.unit,
            row: {
              user_id: user.id,
              meal_type: draft.mealType,
              food_id: null,
              display_name: item.resolved.name,
              quantity: item.quantity,
              unit: item.unit,
              nutrition_source: "estimated" as const,
              original_user_text: draft.originalText,
              ...nutrition
            }
          };
        }

        const food = await materializeDraftItemFood(item, user.id);
        const nutrition = calculateDraftItemNutrition(food, item.quantity, item.unit);

        return {
          foodId: food.id,
          mealQuantity: item.quantity,
          mealUnit: item.unit,
          row: {
            user_id: user.id,
            meal_type: draft.mealType,
            food_id: food.id,
            display_name: formatFoodName(food.name, food.brand),
            quantity: item.quantity,
            unit: food.serving_unit,
            nutrition_source: food.source,
            original_user_text: draft.originalText,
            ...nutrition
          }
        };
      })
    );

    const { error } = await supabase.from("food_logs").insert(preparedItems.map((item) => item.row));

    if (error) {
      throw new Error(error.message);
    }

    if (saveAsMeal && savedMealName) {
      await createSavedMealFromPreparedItems(supabase, user.id, savedMealName, preparedItems);
    }
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectWithMessage("/today", "Food logged from text.");
}

export async function createFood(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let payload: Record<string, string | number | string[] | null>;

  try {
    payload = {
      user_id: user.id,
      name: readRequiredString(formData, "name"),
      brand: readOptionalString(formData, "brand"),
      aliases: [],
      source: "user_provided",
      serving_quantity: readPositiveNumber(formData, "servingQuantity"),
      serving_unit: readRequiredString(formData, "servingUnit"),
      calories: readNonNegativeNumber(formData, "calories"),
      protein_g: readNonNegativeNumber(formData, "proteinG"),
      carbohydrate_g: readNonNegativeNumber(formData, "carbohydrateG"),
      fat_g: readNonNegativeNumber(formData, "fatG"),
      saturated_fat_g: readNonNegativeNumber(formData, "saturatedFatG"),
      fibre_g: readNonNegativeNumber(formData, "fibreG"),
      total_sugars_g: readOptionalNonNegativeNumber(formData, "totalSugarsG"),
      added_sugar_g: readOptionalNonNegativeNumber(formData, "addedSugarG")
    };
  } catch (error) {
    redirectWithMessage("/foods", getErrorMessage(error));
  }

  const { error } = await supabase.from("foods").insert(payload);

  if (error) {
    redirectWithMessage("/foods", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/foods", "Food saved.");
}

export async function saveExternalFood(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let externalSource: ExternalFoodSource;
  let externalSourceId: string;

  try {
    externalSource = readExternalFoodSource(formData);
    externalSourceId = readRequiredString(formData, "externalSourceId");
  } catch (error) {
    redirectWithMessage("/foods", getErrorMessage(error));
  }

  try {
    await findOrCreateExternalFood(supabase, user.id, externalSource, externalSourceId);
  } catch (error) {
    redirectWithMessage("/foods", getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectWithMessage("/foods", "Food saved from lookup.");
}

export async function saveExternalFoodForSavedMeal(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const foodQuery = readOptionalString(formData, "foodQuery") ?? "";
  let externalSource: ExternalFoodSource;
  let externalSourceId: string;

  try {
    externalSource = readExternalFoodSource(formData);
    externalSourceId = readRequiredString(formData, "externalSourceId");
  } catch (error) {
    redirectToSavedMealBuilder(foodQuery, getErrorMessage(error));
  }

  try {
    await findOrCreateExternalFood(supabase, user.id, externalSource, externalSourceId);
  } catch (error) {
    redirectToSavedMealBuilder(foodQuery, getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectToSavedMealBuilder(foodQuery, "Food added. Select it below to include it in your meal.");
}

export async function updateFood(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let foodId: string;
  let payload: Record<string, string | number | null>;

  try {
    foodId = readRequiredString(formData, "foodId");
    payload = {
      name: readRequiredString(formData, "name"),
      brand: readOptionalString(formData, "brand"),
      serving_quantity: readPositiveNumber(formData, "servingQuantity"),
      serving_unit: readRequiredString(formData, "servingUnit"),
      calories: readNonNegativeNumber(formData, "calories"),
      protein_g: readNonNegativeNumber(formData, "proteinG"),
      carbohydrate_g: readNonNegativeNumber(formData, "carbohydrateG"),
      fat_g: readNonNegativeNumber(formData, "fatG"),
      saturated_fat_g: readNonNegativeNumber(formData, "saturatedFatG"),
      fibre_g: readNonNegativeNumber(formData, "fibreG"),
      total_sugars_g: readOptionalNonNegativeNumber(formData, "totalSugarsG"),
      added_sugar_g: readOptionalNonNegativeNumber(formData, "addedSugarG")
    };
  } catch (error) {
    redirectWithMessage("/foods", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("foods")
    .update(payload)
    .eq("id", foodId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/foods", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/foods", "Food updated.");
}

export async function deleteFood(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let foodId: string;

  try {
    foodId = readRequiredString(formData, "foodId");
  } catch (error) {
    redirectWithMessage("/foods", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("foods")
    .delete()
    .eq("id", foodId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/foods", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/foods", "Food deleted.");
}

export async function logFood(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let foodId: string;
  let quantity: number;
  let mealType: MealType;

  try {
    foodId = readRequiredString(formData, "foodId");
    quantity = readPositiveNumber(formData, "quantity");
    mealType = readMealType(formData);
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .eq("id", foodId)
    .maybeSingle();

  if (foodError) {
    redirectWithMessage("/today", foodError.message);
  }

  if (!food) {
    redirectWithMessage("/today", "Food could not be found.");
  }

  let nutrition: ReturnType<typeof scaleFoodNutrition>;

  try {
    nutrition = scaleFoodNutrition(food, quantity);
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    meal_type: mealType,
    food_id: food.id,
    display_name: formatFoodName(food.name, food.brand),
    quantity,
    unit: food.serving_unit,
    nutrition_source: food.source,
    ...nutrition
  });

  if (error) {
    redirectWithMessage("/today", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/today", "Food logged.");
}

export async function logSelectedFood(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let quantity: number;
  let mealType: MealType;
  let match: FoodMatchSelection;

  try {
    match = readFoodMatchSelection(formData);
    quantity = readPositiveNumber(formData, "quantity");
    mealType = readMealType(formData);
  } catch (error) {
    redirectWithMessage("/today#log-food", getErrorMessage(error));
  }

  try {
    const food =
      match.kind === "saved"
        ? await getFoodForLogging(supabase, match.foodId, user.id)
        : await findOrCreateExternalFood(
            supabase,
            user.id,
            match.externalSource,
            match.externalSourceId
          );

    if (!food) {
      throw new Error("Food could not be found.");
    }

    const nutrition = scaleFoodNutrition(food, quantity);
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      meal_type: mealType,
      food_id: food.id,
      display_name: formatFoodName(food.name, food.brand),
      quantity,
      unit: food.serving_unit,
      nutrition_source: food.source,
      ...nutrition
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithMessage("/today#log-food", getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectWithMessage("/today#log-food", "Food logged.");
}

type FoodMatchSelection =
  | {
      kind: "saved";
      foodId: string;
    }
  | {
      kind: "external";
      externalSource: ExternalFoodSource;
      externalSourceId: string;
    };

export async function logSavedMeal(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let savedMealId: string;
  let mealType: MealType;

  try {
    savedMealId = readRequiredString(formData, "savedMealId");
    mealType = readMealType(formData);
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  try {
    const meal = await getSavedMeal(savedMealId);

    if (!meal || meal.items.length === 0) {
      throw new Error("Saved meal could not be found.");
    }

    const rows = meal.items.map((item) => ({
      user_id: user.id,
      meal_type: mealType,
      food_id: item.food.id,
      display_name: formatFoodName(item.food.name, item.food.brand),
      quantity: item.quantity,
      unit: item.unit,
      nutrition_source: item.food.source,
      ...item.nutrition
    }));

    const { error } = await supabase.from("food_logs").insert(rows);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectWithMessage("/today", "Saved meal logged.");
}

export async function createSavedMeal(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let name: string;
  let aliases: string[];
  let items: Array<{ foodId: string; quantity: number; unit: string }>;

  try {
    name = readRequiredString(formData, "name");
    aliases = readAliases(formData, "aliases");
    items = readSavedMealItems(formData);
  } catch (error) {
    redirectWithMessage("/meals", getErrorMessage(error));
  }

  try {
    await createSavedMealFromItems(supabase, user.id, name, aliases, items);
  } catch (error) {
    redirectWithMessage("/meals", getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectWithMessage("/meals", "Saved meal created.");
}

export async function updateSavedMeal(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let savedMealId: string;
  let name: string;
  let aliases: string[];
  let items: Array<{ foodId: string; quantity: number; unit: string }>;

  try {
    savedMealId = readRequiredString(formData, "savedMealId");
    name = readRequiredString(formData, "name");
    aliases = readAliases(formData, "aliases");
    items = readSavedMealItems(formData);
  } catch (error) {
    redirectWithMessage("/meals", getErrorMessage(error));
  }

  try {
    await validateSavedMealItems(supabase, user.id, items);

    const { data: meal, error: mealError } = await supabase
      .from("saved_meals")
      .update({ name, aliases })
      .eq("id", savedMealId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (mealError) {
      throw new Error(mealError.message);
    }

    if (!meal) {
      throw new Error("Saved meal could not be found.");
    }

    const { error: deleteError } = await supabase
      .from("saved_meal_items")
      .delete()
      .eq("saved_meal_id", savedMealId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await insertSavedMealItems(supabase, savedMealId, items);
  } catch (error) {
    redirectWithMessage("/meals", getErrorMessage(error));
  }

  revalidateFoodPaths();
  redirectWithMessage("/meals", "Saved meal updated.");
}

export async function deleteSavedMeal(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let savedMealId: string;

  try {
    savedMealId = readRequiredString(formData, "savedMealId");
  } catch (error) {
    redirectWithMessage("/meals", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("saved_meals")
    .delete()
    .eq("id", savedMealId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/meals", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/meals", "Saved meal deleted.");
}

export async function updateFoodLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let logId: string;
  let quantity: number;
  let mealType: MealType;

  try {
    logId = readRequiredString(formData, "logId");
    quantity = readPositiveNumber(formData, "quantity");
    mealType = readMealType(formData);
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  const { data: log, error: logError } = await supabase
    .from("food_logs")
    .select(
      "id,user_id,food_id,quantity,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .eq("id", logId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (logError) {
    redirectWithMessage("/today", logError.message);
  }

  if (!log) {
    redirectWithMessage("/today", "Food log could not be found.");
  }

  let nutrition: ReturnType<typeof scaleLoggedNutrition>;
  let unitUpdate: string | undefined;

  try {
    const food = log.food_id ? await getFoodForLogging(supabase, log.food_id) : null;
    nutrition = food ? scaleFoodNutrition(food, quantity) : scaleLoggedNutrition(log, quantity);
    unitUpdate = food?.serving_unit;
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("food_logs")
    .update({
      meal_type: mealType,
      quantity,
      ...(unitUpdate ? { unit: unitUpdate } : {}),
      ...nutrition
    })
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/today", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/today", "Food log updated.");
}

export async function deleteFoodLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let logId: string;

  try {
    logId = readRequiredString(formData, "logId");
  } catch (error) {
    redirectWithMessage("/today", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/today", error.message);
  }

  revalidateFoodPaths();
  redirectWithMessage("/today", "Food log deleted.");
}

function revalidateFoodPaths() {
  revalidatePath("/today");
  revalidatePath("/foods");
  revalidatePath("/meals");
}

async function getFoodForLogging(
  supabase: Awaited<ReturnType<typeof createClient>>,
  foodId: string,
  userId?: string
) {
  let request = supabase
    .from("foods")
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .eq("id", foodId);

  if (userId) {
    request = request.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await request.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findOrCreateExternalFood(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  externalSource: ExternalFoodSource,
  externalSourceId: string
) {
  const { data: existing, error: existingError } = await supabase
    .from("foods")
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .eq("user_id", userId)
    .eq("external_source", externalSource)
    .eq("external_source_id", externalSourceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const candidate = isReferenceFoodSource(externalSource)
    ? await getReferenceFoodCandidate(externalSource, externalSourceId)
    : await getExternalFoodCandidate(externalSource, externalSourceId);

  if (!candidate) {
    throw new Error("Food could not be found.");
  }

  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: userId,
      name: candidate.name,
      brand: candidate.brand,
      aliases: [],
      source: "verified",
      external_source: candidate.externalSource,
      external_source_id: candidate.externalSourceId,
      serving_quantity: candidate.servingQuantity,
      serving_unit: candidate.servingUnit,
      calories: candidate.calories,
      protein_g: candidate.proteinG,
      carbohydrate_g: candidate.carbohydrateG,
      fat_g: candidate.fatG,
      saturated_fat_g: candidate.saturatedFatG,
      fibre_g: candidate.fibreG,
      total_sugars_g: candidate.totalSugarsG,
      added_sugar_g: candidate.addedSugarG
    })
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function createEstimatedFoodFromDraftItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  item: ConversationalFoodDraftItem
) {
  if (!item.resolved || item.resolved.kind !== "estimated_food") {
    throw new Error(`${item.inputName} is not estimated.`);
  }

  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: userId,
      name: item.resolved.name,
      brand: null,
      aliases: item.inputName === item.resolved.name ? [] : [item.inputName],
      source: "estimated",
      serving_quantity: item.resolved.servingQuantity,
      serving_unit: item.resolved.servingUnit,
      calories: item.resolved.calories,
      protein_g: item.resolved.proteinG,
      carbohydrate_g: item.resolved.carbohydrateG,
      fat_g: item.resolved.fatG,
      saturated_fat_g: item.resolved.saturatedFatG,
      fibre_g: item.resolved.fibreG,
      total_sugars_g: null,
      added_sugar_g: item.resolved.addedSugarG
    })
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function createSavedMealFromPreparedItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  items: PreparedConversationalFoodLogItem[]
) {
  const { data: meal, error: mealError } = await supabase
    .from("saved_meals")
    .insert({
      user_id: userId,
      name,
      aliases: []
    })
    .select("id")
    .single();

  if (mealError) {
    throw new Error(mealError.message);
  }

  const rows = items.map((item) => {
    if (!item.foodId) {
      throw new Error("Estimated foods must be saved before creating a reusable meal.");
    }

    return {
      saved_meal_id: meal.id,
      food_id: item.foodId,
      quantity: item.mealQuantity,
      unit: item.mealUnit
    };
  });

  const { error: itemError } = await supabase.from("saved_meal_items").insert(rows);

  if (itemError) {
    throw new Error(itemError.message);
  }
}

async function createSavedMealFromItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  aliases: string[],
  items: Array<{ foodId: string; quantity: number; unit: string }>
) {
  await validateSavedMealItems(supabase, userId, items);

  const { data: meal, error: mealError } = await supabase
    .from("saved_meals")
    .insert({
      user_id: userId,
      name,
      aliases
    })
    .select("id")
    .single();

  if (mealError) {
    throw new Error(mealError.message);
  }

  await insertSavedMealItems(supabase, meal.id, items);
}

async function insertSavedMealItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  savedMealId: string,
  items: Array<{ foodId: string; quantity: number; unit: string }>
) {
  const { error } = await supabase.from("saved_meal_items").insert(
    items.map((item) => ({
      saved_meal_id: savedMealId,
      food_id: item.foodId,
      quantity: item.quantity,
      unit: item.unit
    }))
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function validateSavedMealItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  items: Array<{ foodId: string; quantity: number; unit: string }>
) {
  await Promise.all(
    items.map(async (item) => {
      const food = await getFoodForLogging(supabase, item.foodId, userId);

      if (!food) {
        throw new Error("One of the selected foods could not be found.");
      }

      if (normalizeUnit(item.unit) !== normalizeUnit(food.serving_unit)) {
        throw new Error(
          `${formatFoodName(food.name, food.brand)} is saved per ${food.serving_unit}. Use ${food.serving_unit} for saved meals.`
        );
      }
    })
  );
}

async function resolveSavedMealDraft(input: string): Promise<ConversationalFoodDraft | null> {
  const meals = await getSavedMeals({ limit: 20 });
  const meal = findSavedMealByText(meals, input);

  if (!meal) {
    return null;
  }

  const items: ConversationalFoodDraftItem[] = buildSavedMealDraftItems(meal, input);
  const replacements = getSavedMealModificationTerms(input).replacements;

  for (const replacement of replacements) {
    const replacementDraft = await resolveParsedFoodLog(
      await parseFoodLogText(replacement.add),
      replacement.add
    );
    items.push(
      ...replacementDraft.items.map((item) => ({
        ...item,
        warning: item.warning
          ? `Replacement for ${replacement.remove}. ${item.warning}`
          : `Replacement for ${replacement.remove}.`
      }))
    );
  }

  if (items.length === 0) {
    throw new Error("That saved meal would have no foods after your changes.");
  }

  return {
    originalText: input,
    mealType: inferMealType(input),
    items
  };
}

function inferMealType(input: string): MealType {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("breakfast") || normalized.includes("pequeno almoco")) {
    return "breakfast";
  }

  if (normalized.includes("elevenses")) {
    return "elevenses";
  }

  if (normalized.includes("lunch") || normalized.includes("almoco")) {
    return "lunch";
  }

  if (normalized.includes("dinner") || normalized.includes("jantar")) {
    return "dinner";
  }

  if (normalized.includes("pre-run") || normalized.includes("pre run")) {
    return "pre_run_snack";
  }

  if (normalized.includes("post-run") || normalized.includes("post run")) {
    return "post_run_snack";
  }

  if (normalized.includes("mid afternoon") || normalized.includes("afternoon meal")) {
    return "mid_afternoon_meal";
  }

  if (normalized.includes("supper")) {
    return "supper";
  }

  return "snack";
}

async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

function redirectWithMessage(path: string, message: string): never {
  const [pathname, hash] = path.split("#");
  redirect(`${pathname}?message=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`);
}

function redirectToSavedMealBuilder(foodQuery: string, message: string): never {
  const params = new URLSearchParams({ message });

  if (foodQuery.trim()) {
    params.set("foodQuery", foodQuery.trim());
  }

  redirect(`/meals?${params.toString()}`);
}

function readRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readPositiveNumber(formData: FormData, key: string) {
  const value = readNumber(formData, key);

  if (value <= 0) {
    throw new Error(`${key} must be greater than zero.`);
  }

  return value;
}

function readNonNegativeNumber(formData: FormData, key: string) {
  const value = readNumber(formData, key);

  if (value < 0) {
    throw new Error(`${key} cannot be negative.`);
  }

  return value;
}

function readOptionalNonNegativeNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) {
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }

  if (value < 0) {
    throw new Error(`${key} cannot be negative.`);
  }

  return value;
}

function readNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);

  if (!raw || !Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }

  return value;
}

function readMealType(formData: FormData): MealType {
  const value = String(formData.get("mealType") ?? "");

  if (!isMealType(value)) {
    throw new Error("mealType is invalid.");
  }

  return value as MealType;
}

function readFoodMatchSelection(formData: FormData): FoodMatchSelection {
  const value = readRequiredString(formData, "foodMatch");
  const [kind, sourceOrId, encodedId] = value.split(":");

  if (kind === "saved" && sourceOrId) {
    return {
      kind: "saved",
      foodId: sourceOrId
    };
  }

  if (kind === "external" && sourceOrId && encodedId) {
    const externalSource = readExternalFoodSourceValue(sourceOrId);

    return {
      kind: "external",
      externalSource,
      externalSourceId: decodeURIComponent(encodedId)
    };
  }

  throw new Error("Selected food is invalid.");
}

function readAliases(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function readSavedMealItems(formData: FormData) {
  const itemCount = Math.min(Math.max(Math.trunc(readPositiveNumber(formData, "itemCount")), 1), 25);
  const items = Array.from({ length: itemCount }, (_, index) => {
    const foodId = String(formData.get(`foodId_${index}`) ?? "").trim();
    const foodText = String(formData.get(`foodText_${index}`) ?? "").trim();

    if (!foodId) {
      if (foodText) {
        throw new Error(`Choose a matching saved food for "${foodText}".`);
      }

      return null;
    }

    return {
      foodId,
      quantity: readPositiveNumber(formData, `quantity_${index}`),
      unit: readRequiredString(formData, `unit_${index}`)
    };
  }).filter((item): item is { foodId: string; quantity: number; unit: string } => Boolean(item));

  if (items.length === 0) {
    throw new Error("Choose at least one food for the meal.");
  }

  return items;
}

function normalizeUnit(value: string) {
  return value.trim().toLowerCase();
}

function readDraftMatchSelections(formData: FormData, itemCount: number) {
  return Array.from({ length: itemCount }, (_, index) => {
    const raw = String(formData.get(`match_${index}`) ?? "").trim();

    if (!raw) {
      return null;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Selected food match is invalid.");
    }

    return value;
  });
}

function readExternalFoodSource(formData: FormData): ExternalFoodSource {
  return readExternalFoodSourceValue(String(formData.get("externalSource") ?? ""));
}

function readExternalFoodSourceValue(value: string): ExternalFoodSource {
  if (
    value === "open_food_facts" ||
    value === "usda_fooddata_central" ||
    value === "portfir_bdca" ||
    value === "cofid_uk"
  ) {
    return value;
  }

  throw new Error("externalSource is invalid.");
}

function applyDraftEdits(draft: ConversationalFoodDraft, formData: FormData): ConversationalFoodDraft {
  return {
    ...draft,
    mealType: readMealType(formData),
    items: draft.items
      .map((item, index) => ({
        item,
        index,
        included: formData.get(`include_${index}`) === "on"
      }))
      .filter(({ included }) => included)
      .map(({ item, index }) => ({
        ...item,
        quantity: readPositiveNumber(formData, `quantity_${index}`),
        unit: readRequiredString(formData, `unit_${index}`)
      }))
  };
}

function formatFoodName(name: string, brand: string | null) {
  return brand ? `${brand} ${name}` : name;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
