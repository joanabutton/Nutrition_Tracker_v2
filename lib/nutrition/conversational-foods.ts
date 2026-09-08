import { createHmac, timingSafeEqual } from "crypto";

import {
  estimateFoodFallbacks,
  type FoodFallbackRequestItem
} from "@/lib/ai/food-estimator";
import {
  getExternalFoodCandidate,
  searchExternalFoods,
  type ExternalFoodCandidate,
  type ExternalFoodSource
} from "@/lib/nutrition/external-foods";
import { scaleFoodNutrition, type FoodNutrition } from "@/lib/nutrition/food";
import { type ParsedFoodLog } from "@/lib/ai/food-parser";
import { getFoods, type FoodRecord } from "@/lib/foods";
import {
  getReferenceFoodCandidate,
  isReferenceFoodSource,
  searchReferenceFoods
} from "@/lib/reference-foods";
import { createClient } from "@/lib/supabase/server";

type FoodResolution =
  | {
      kind: "saved_food";
      foodId: string;
      name: string;
      brand: string | null;
      servingQuantity: number;
      servingUnit: string;
      calories: number;
      nutritionSource: FoodRecord["source"];
    }
  | {
      kind: "external_food";
      externalSource: ExternalFoodSource;
      externalSourceId: string;
      name: string;
      brand: string | null;
      servingQuantity: number;
      servingUnit: string;
      calories: number;
    }
  | {
      kind: "estimated_food";
      name: string;
      brand: null;
      servingQuantity: number;
      servingUnit: string;
      calories: number;
      proteinG: number;
      carbohydrateG: number;
      fatG: number;
      saturatedFatG: number;
      fibreG: number;
      addedSugarG: number | null;
      reason: string;
    };

export type ConversationalFoodDraft = {
  originalText: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  items: ConversationalFoodDraftItem[];
};

export type ConversationalFoodDraftItem = {
  inputName: string;
  quantity: number;
  unit: string;
  quantityIsEstimated: boolean;
  portionDescription: string | null;
  resolved: FoodResolution | null;
  alternatives: FoodResolution[];
  warning: string | null;
};

export async function resolveParsedFoodLog(
  parsed: ParsedFoodLog,
  originalText: string
): Promise<ConversationalFoodDraft> {
  const draft = {
    originalText,
    mealType: parsed.mealType,
    items: await Promise.all(parsed.items.map(resolveParsedFoodItem))
  };

  return applyEstimatedFallbacks(draft);
}

export function encodeDraft(draft: ConversationalFoodDraft) {
  const payload = Buffer.from(JSON.stringify(draft), "utf8").toString("base64url");
  const signature = signDraftPayload(payload);

  return `${payload}.${signature}`;
}

export function decodeDraft(value: string): ConversationalFoodDraft {
  const [payload, signature] = value.split(".");

  if (!payload || !signature || !isValidDraftSignature(payload, signature)) {
    throw new Error("Food log draft could not be verified.");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
  return validateDraft(parsed);
}

export function applyDraftMatchSelections(
  draft: ConversationalFoodDraft,
  selections: Array<number | null>
): ConversationalFoodDraft {
  return {
    ...draft,
    items: draft.items.map((item, index) => {
      const selectedIndex = selections[index];

      if (
        selectedIndex === null ||
        selectedIndex === undefined ||
        selectedIndex < 0 ||
        selectedIndex >= item.alternatives.length
      ) {
        return item;
      }

      const resolved = item.alternatives[selectedIndex];

      return {
        ...item,
        resolved,
        warning: buildDraftWarning(
          {
            name: item.inputName,
            quantity: item.quantity,
            unit: item.unit,
            quantityIsEstimated: item.quantityIsEstimated,
            portionDescription: item.portionDescription
          },
          resolved.servingUnit
        )
      };
    })
  };
}

export async function materializeDraftItemFood(
  item: ConversationalFoodDraftItem,
  userId: string
) {
  if (!item.resolved) {
    throw new Error(`${item.inputName} is unresolved.`);
  }

  if (item.resolved.kind === "estimated_food") {
    throw new Error(`${item.inputName} is estimated and does not have a saved food record.`);
  }

  if (item.resolved.kind === "saved_food") {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("foods")
      .select(
        "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
      )
      .eq("id", item.resolved.foodId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error(`${item.inputName} could not be found.`);
    }

    return data;
  }

  const candidate = await refetchCandidate(item.resolved.externalSource, item.resolved.externalSourceId);

  if (!candidate) {
    throw new Error(`${item.inputName} could not be found.`);
  }

  return findOrCreateFoodFromCandidate(candidate, userId);
}

export function calculateDraftItemNutrition(food: FoodNutrition, quantity: number, unit: string) {
  if (normalizeUnit(food.serving_unit) !== normalizeUnit(unit)) {
    throw new Error(`Cannot log ${quantity}${unit} against a ${food.serving_unit} serving yet.`);
  }

  return scaleFoodNutrition(food, quantity);
}

export function calculateEstimatedDraftItemNutrition(
  item: ConversationalFoodDraftItem,
  quantity: number,
  unit: string
) {
  if (!item.resolved || item.resolved.kind !== "estimated_food") {
    throw new Error(`${item.inputName} is not estimated.`);
  }

  if (normalizeUnit(item.resolved.servingUnit) !== normalizeUnit(unit)) {
    throw new Error(`Cannot log ${quantity}${unit} against an estimated ${item.resolved.servingUnit} serving.`);
  }

  return scaleFoodNutrition(
    {
      serving_quantity: item.resolved.servingQuantity,
      serving_unit: item.resolved.servingUnit,
      calories: item.resolved.calories,
      protein_g: item.resolved.proteinG,
      carbohydrate_g: item.resolved.carbohydrateG,
      fat_g: item.resolved.fatG,
      saturated_fat_g: item.resolved.saturatedFatG,
      fibre_g: item.resolved.fibreG,
      added_sugar_g: item.resolved.addedSugarG
    },
    quantity
  );
}

async function resolveParsedFoodItem(
  item: ParsedFoodLog["items"][number]
): Promise<ConversationalFoodDraftItem> {
  const savedMatches = await findSavedFoodMatches(item.name);
  const savedResolutions = savedMatches.map(toSavedResolution);
  const savedMatch = savedResolutions[0];

  if (savedMatch) {
    return {
      inputName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      quantityIsEstimated: item.quantityIsEstimated,
      portionDescription: item.portionDescription,
      resolved: savedMatch,
      alternatives: dedupeResolutions(savedResolutions),
      warning: buildDraftWarning(item, savedMatch.servingUnit)
    };
  }

  const referenceMatches = (await searchReferenceFoods(item.name)).foods.map(toExternalResolution);
  const referenceMatch = referenceMatches[0];

  if (referenceMatch) {
    return {
      inputName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      quantityIsEstimated: item.quantityIsEstimated,
      portionDescription: item.portionDescription,
      resolved: referenceMatch,
      alternatives: dedupeResolutions([...savedResolutions, ...referenceMatches]),
      warning: buildDraftWarning(item, referenceMatch.servingUnit)
    };
  }

  const externalMatches = (await searchExternalFoods(item.name)).foods.map(toExternalResolution);
  const externalMatch = externalMatches[0];

  if (externalMatch) {
    return {
      inputName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      quantityIsEstimated: item.quantityIsEstimated,
      portionDescription: item.portionDescription,
      resolved: externalMatch,
      alternatives: dedupeResolutions([...savedResolutions, ...referenceMatches, ...externalMatches]),
      warning: buildDraftWarning(item, externalMatch.servingUnit)
    };
  }

  return {
    inputName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    quantityIsEstimated: item.quantityIsEstimated,
    portionDescription: item.portionDescription,
    resolved: null,
    alternatives: [],
    warning: buildDraftWarning(item, null) ?? "No saved or database match yet."
  };
}

async function findSavedFoodMatches(name: string) {
  const foods = await getFoods({ limit: 5, query: name });
  const normalizedName = normalize(name);
  return [...foods].sort((first, second) => {
    const firstName = normalize(first.name);
    const secondName = normalize(second.name);
    const firstBrandName = normalize(`${first.brand ?? ""} ${first.name}`);
    const secondBrandName = normalize(`${second.brand ?? ""} ${second.name}`);

    return (
      scoreSavedFoodMatch(firstName, firstBrandName, normalizedName) -
      scoreSavedFoodMatch(secondName, secondBrandName, normalizedName)
    );
  });
}

function scoreSavedFoodMatch(name: string, brandName: string, query: string) {
  if (name === query) {
    return 0;
  }

  if (brandName === query) {
    return 1;
  }

  if (name.startsWith(query)) {
    return 2;
  }

  if (brandName.includes(query)) {
    return 3;
  }

  return 4;
}

function toSavedResolution(food: FoodRecord): FoodResolution {
  return {
    kind: "saved_food",
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    servingQuantity: food.serving_quantity,
    servingUnit: food.serving_unit,
    calories: food.calories,
    nutritionSource: food.source
  };
}

function toExternalResolution(candidate: ExternalFoodCandidate): FoodResolution {
  return {
    kind: "external_food" as const,
    externalSource: candidate.externalSource,
    externalSourceId: candidate.externalSourceId,
    name: candidate.name,
    brand: candidate.brand,
    servingQuantity: candidate.servingQuantity,
    servingUnit: candidate.servingUnit,
    calories: candidate.calories
  };
}

async function applyEstimatedFallbacks(draft: ConversationalFoodDraft): Promise<ConversationalFoodDraft> {
  const fallbackRequests = draft.items
    .map((item, index) => buildFallbackRequest(item, index))
    .filter((item): item is FoodFallbackRequestItem => Boolean(item));

  if (fallbackRequests.length === 0) {
    return draft;
  }

  let estimates: Awaited<ReturnType<typeof estimateFoodFallbacks>>;

  try {
    estimates = await estimateFoodFallbacks(draft.originalText, fallbackRequests);
  } catch {
    return {
      ...draft,
      items: draft.items.map((item, index) =>
        fallbackRequests.some((request) => request.index === index)
          ? {
              ...item,
              warning: [item.warning, "Estimated fallback is unavailable right now."]
                .filter(Boolean)
                .join(" ")
            }
          : item
      )
    };
  }

  const estimatesByIndex = new Map(estimates.map((estimate) => [estimate.index, estimate]));

  return {
    ...draft,
    items: draft.items.map((item, index) => {
      const estimate = estimatesByIndex.get(index);

      if (!estimate) {
        return item;
      }

      return {
        inputName: item.inputName,
        quantity: estimate.quantity,
        unit: estimate.unit,
        quantityIsEstimated: true,
        portionDescription: item.portionDescription ?? item.inputName,
        resolved: item.resolved
          ? item.resolved
          : {
              kind: "estimated_food" as const,
              name: estimate.name,
              brand: null,
              servingQuantity: estimate.quantity,
              servingUnit: estimate.unit,
              calories: estimate.calories,
              proteinG: estimate.proteinG,
              carbohydrateG: estimate.carbohydrateG,
              fatG: estimate.fatG,
              saturatedFatG: estimate.saturatedFatG,
              fibreG: estimate.fibreG,
              addedSugarG: estimate.addedSugarG,
              reason: estimate.reason
            },
        alternatives: item.alternatives,
        warning: item.resolved
          ? `Estimated quantity: ${estimate.reason}`
          : `Estimated fallback: ${estimate.reason}`
      };
    })
  };
}

function buildFallbackRequest(
  item: ConversationalFoodDraftItem,
  index: number
): FoodFallbackRequestItem | null {
  if (!item.resolved) {
    return {
      index,
      inputName: item.inputName,
      issue: "unresolved_food",
      quantity: item.quantity,
      unit: item.unit
    };
  }

  if (
    item.resolved.kind !== "estimated_food" &&
    normalizeUnit(item.unit) !== normalizeUnit(item.resolved.servingUnit)
  ) {
    return {
      index,
      inputName: item.inputName,
      issue: "unsupported_unit",
      matchedFoodName: item.resolved.name,
      matchedServingUnit: item.resolved.servingUnit,
      quantity: item.quantity,
      unit: item.unit
    };
  }

  return null;
}

async function refetchCandidate(source: ExternalFoodSource, id: string) {
  return isReferenceFoodSource(source)
    ? getReferenceFoodCandidate(source, id)
    : getExternalFoodCandidate(source, id);
}

async function findOrCreateFoodFromCandidate(candidate: ExternalFoodCandidate, userId: string) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("foods")
    .select(
      "id,name,brand,source,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g"
    )
    .eq("user_id", userId)
    .eq("external_source", candidate.externalSource)
    .eq("external_source_id", candidate.externalSourceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
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

function validateDraft(value: unknown): ConversationalFoodDraft {
  if (!value || typeof value !== "object") {
    throw new Error("Food log draft is invalid.");
  }

  const draft = value as Partial<ConversationalFoodDraft>;

  if (!isMealType(draft.mealType) || !Array.isArray(draft.items) || draft.items.length === 0) {
    throw new Error("Food log draft is invalid.");
  }

  return {
    originalText: String(draft.originalText ?? ""),
    mealType: draft.mealType,
    items: draft.items.map(validateDraftItem)
  };
}

function validateDraftItem(item: unknown): ConversationalFoodDraftItem {
  if (!item || typeof item !== "object") {
    throw new Error("Food log draft item is invalid.");
  }

  const draftItem = item as ConversationalFoodDraftItem;
  const quantity = Number(draftItem.quantity);

  if (!draftItem.inputName || !draftItem.unit || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Food log draft item is invalid.");
  }

  return {
    inputName: String(draftItem.inputName),
    quantity,
    unit: String(draftItem.unit),
    quantityIsEstimated: Boolean(draftItem.quantityIsEstimated),
    portionDescription:
      typeof draftItem.portionDescription === "string" && draftItem.portionDescription.trim()
        ? draftItem.portionDescription.trim()
        : null,
    resolved: validateResolution(draftItem.resolved),
    alternatives: Array.isArray(draftItem.alternatives)
      ? dedupeResolutions(draftItem.alternatives.map(validateResolution).filter(isResolution))
      : [],
    warning: draftItem.warning ? String(draftItem.warning) : null
  };
}

function validateResolution(
  resolution: ConversationalFoodDraftItem["resolved"]
): ConversationalFoodDraftItem["resolved"] {
  if (!resolution) {
    return null;
  }

  if (resolution.kind === "saved_food") {
    return {
      kind: "saved_food",
      foodId: String(resolution.foodId),
      name: String(resolution.name),
      brand: resolution.brand ? String(resolution.brand) : null,
      servingQuantity: Number(resolution.servingQuantity),
      servingUnit: String(resolution.servingUnit),
      calories: Number(resolution.calories),
      nutritionSource: resolution.nutritionSource
    };
  }

  if (resolution.kind === "estimated_food") {
    return {
      kind: "estimated_food",
      name: String(resolution.name),
      brand: null,
      servingQuantity: readPositiveNumber(resolution.servingQuantity, "estimated serving quantity"),
      servingUnit: String(resolution.servingUnit),
      calories: readNonNegativeNumber(resolution.calories, "estimated calories"),
      proteinG: readNonNegativeNumber(resolution.proteinG, "estimated protein"),
      carbohydrateG: readNonNegativeNumber(resolution.carbohydrateG, "estimated carbohydrate"),
      fatG: readNonNegativeNumber(resolution.fatG, "estimated fat"),
      saturatedFatG: readNonNegativeNumber(resolution.saturatedFatG, "estimated saturated fat"),
      fibreG: readNonNegativeNumber(resolution.fibreG, "estimated fibre"),
      addedSugarG:
        resolution.addedSugarG === null
          ? null
          : readNonNegativeNumber(resolution.addedSugarG, "estimated added sugar"),
      reason: String(resolution.reason)
    };
  }

  return {
    kind: "external_food",
    externalSource: resolution.externalSource,
    externalSourceId: String(resolution.externalSourceId),
    name: String(resolution.name),
    brand: resolution.brand ? String(resolution.brand) : null,
    servingQuantity: Number(resolution.servingQuantity),
    servingUnit: String(resolution.servingUnit),
    calories: Number(resolution.calories)
  };
}

function buildDraftWarning(item: ParsedFoodLog["items"][number], servingUnit: string | null) {
  const warnings: string[] = [];

  if (item.quantityIsEstimated) {
    warnings.push(
      item.portionDescription
        ? `Estimated from "${item.portionDescription}". Adjust before adding if needed.`
        : "Estimated from your description. Adjust before adding if needed."
    );
  }

  if (servingUnit && normalizeUnit(item.unit) !== normalizeUnit(servingUnit)) {
    warnings.push(
      `This match is stored per ${servingUnit}. Change the unit to ${servingUnit} before adding, or adjust the amount if the estimate looks wrong.`
    );
  }

  return warnings.length > 0 ? warnings.join(" ") : null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeUnit(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function dedupeResolutions(resolutions: FoodResolution[]) {
  const seen = new Set<string>();
  const deduped: FoodResolution[] = [];

  for (const resolution of resolutions) {
    const key = getResolutionKey(resolution);

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(resolution);
    }
  }

  return deduped.slice(0, 8);
}

function getResolutionKey(resolution: FoodResolution) {
  if (resolution.kind === "saved_food") {
    return `saved:${resolution.foodId}`;
  }

  if (resolution.kind === "estimated_food") {
    return `estimated:${normalize(resolution.name)}:${resolution.servingQuantity}:${resolution.servingUnit}`;
  }

  return `${resolution.externalSource}:${resolution.externalSourceId}`;
}

function isResolution(resolution: ConversationalFoodDraftItem["resolved"]): resolution is FoodResolution {
  return Boolean(resolution);
}

function signDraftPayload(payload: string) {
  return createHmac("sha256", getDraftSigningSecret()).update(payload).digest("base64url");
}

function isValidDraftSignature(payload: string, signature: string) {
  const expected = signDraftPayload(payload);
  const expectedBuffer = Buffer.from(expected, "base64url");
  const actualBuffer = Buffer.from(signature, "base64url");

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function getDraftSigningSecret() {
  const secret = process.env.APP_DRAFT_SIGNING_SECRET || process.env.OPENAI_API_KEY;

  if (!secret) {
    throw new Error("APP_DRAFT_SIGNING_SECRET or OPENAI_API_KEY is required to sign food log drafts.");
  }

  return secret;
}

function readPositiveNumber(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return parsed;
}

function readNonNegativeNumber(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return parsed;
}

function isMealType(value: unknown): value is ConversationalFoodDraft["mealType"] {
  return value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack";
}
