import { type ExternalFoodCandidate, type ExternalFoodSource } from "@/lib/nutrition/external-foods";
import {
  buildReferenceFoodExternalId,
  parseReferenceFoodExternalId
} from "@/lib/nutrition/reference-food-ids";
import { createClient } from "@/lib/supabase/server";

type ReferenceFoodSource = Extract<ExternalFoodSource, "portfir_bdca" | "cofid_uk">;

type ReferenceFoodRow = {
  id: string;
  source: ReferenceFoodSource;
  source_food_id: string;
  source_version: string;
  name: string;
  brand: string | null;
  serving_quantity: number | string;
  serving_unit: string;
  calories: number | string;
  protein_g: number | string;
  carbohydrate_g: number | string;
  fat_g: number | string;
  saturated_fat_g: number | string | null;
  fibre_g: number | string | null;
  total_sugars_g: number | string | null;
  added_sugar_g: number | string | null;
};

const referenceFoodSelect =
  "id,source,source_food_id,source_version,name,brand,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,total_sugars_g,added_sugar_g";

export function isReferenceFoodSource(source: ExternalFoodSource): source is ReferenceFoodSource {
  return source === "portfir_bdca" || source === "cofid_uk";
}

export async function searchReferenceFoods(query: string) {
  const normalizedQuery = normalizeReferenceSearch(query);

  if (!normalizedQuery) {
    return { foods: [], warnings: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_foods")
    .select(referenceFoodSelect)
    .ilike("normalized_name", `%${normalizedQuery}%`)
    .order("source", { ascending: false })
    .order("name", { ascending: true })
    .limit(8);

  if (error) {
    return {
      foods: [],
      warnings: ["Supabase reference food lookup failed. Saved foods are still available."]
    };
  }

  return {
    foods: (data ?? []).map(mapReferenceFoodRow).filter(isCandidate),
    warnings: []
  };
}

export async function getReferenceFoodCandidate(source: ReferenceFoodSource, id: string) {
  const externalId = parseReferenceFoodExternalId(id, source);
  const supabase = await createClient();
  let request = supabase
    .from("reference_foods")
    .select(referenceFoodSelect)
    .eq("source", source);

  if (externalId) {
    request = request
      .eq("source_version", externalId.sourceVersion)
      .eq("source_food_id", externalId.sourceFoodId);
  } else {
    request = request.eq("id", id);
  }

  const { data, error } = await request.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapReferenceFoodRow(data) : null;
}

function mapReferenceFoodRow(food: ReferenceFoodRow): ExternalFoodCandidate {
  return {
    externalSource: food.source,
    externalSourceId: buildReferenceFoodExternalId({
      source: food.source,
      sourceFoodId: food.source_food_id,
      sourceVersion: food.source_version
    }),
    name: food.name,
    brand: food.brand,
    servingQuantity: toNumber(food.serving_quantity),
    servingUnit: food.serving_unit,
    calories: toNumber(food.calories),
    proteinG: toNumber(food.protein_g),
    carbohydrateG: toNumber(food.carbohydrate_g),
    fatG: toNumber(food.fat_g),
    saturatedFatG: toNumber(food.saturated_fat_g),
    fibreG: toNumber(food.fibre_g),
    totalSugarsG: toNullableNumber(food.total_sugars_g),
    addedSugarG: toNullableNumber(food.added_sugar_g)
  };
}

function isCandidate(candidate: ExternalFoodCandidate) {
  return candidate.calories > 0;
}

function toNumber(value: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: number | string | null) {
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeReferenceSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
