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
import { createClient } from "@/lib/supabase/server";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

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
    const parsed = await parseFoodLogText(input);
    const draft = await resolveParsedFoodLog(parsed, input);

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
}

async function getFoodForLogging(
  supabase: Awaited<ReturnType<typeof createClient>>,
  foodId: string
) {
  const { data, error } = await supabase
    .from("foods")
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .eq("id", foodId)
    .maybeSingle();

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
  redirect(`${path}?message=${encodeURIComponent(message)}`);
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

  if (!mealTypes.includes(value as MealType)) {
    throw new Error("mealType is invalid.");
  }

  return value as MealType;
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
  const value = String(formData.get("externalSource") ?? "");

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
