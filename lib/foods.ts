import { createClient } from "@/lib/supabase/server";

export type FoodRecord = {
  id: string;
  name: string;
  brand: string | null;
  serving_quantity: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  saturated_fat_g: number;
  fibre_g: number;
  total_sugars_g: number | null;
  added_sugar_g: number | null;
  source: "verified" | "calculated" | "estimated" | "user_provided";
  created_at: string;
};

const foodSelect =
  "id,name,brand,serving_quantity,serving_unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,total_sugars_g,added_sugar_g,source,created_at";

type GetFoodsOptions = {
  limit?: number;
  query?: string;
};

const defaultFoodsLimit = 50;

export async function getFoods({ limit = defaultFoodsLimit, query = "" }: GetFoodsOptions = {}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let request = supabase
    .from("foods")
    .select(foodSelect)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    const terms = buildSearchTerms(trimmedQuery);
    request = request.or(
      terms
        .flatMap((term) => [
          `name.ilike.%${escapeSupabaseFilterValue(term)}%`,
          `brand.ilike.%${escapeSupabaseFilterValue(term)}%`
        ])
        .join(",")
    );
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FoodRecord[];
}

function escapeSupabaseFilterValue(value: string) {
  return value.replace(/[%*,]/g, "");
}

function buildSearchTerms(value: string) {
  return Array.from(
    new Set([
      value,
      ...value
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
    ])
  ).slice(0, 6);
}

export async function getRecentFoods(limit = 5) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("food_logs")
    .select("food_id,display_name,unit,logged_at")
    .eq("user_id", user.id)
    .not("food_id", "is", null)
    .order("logged_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  const seen = new Set<string>();

  return (data ?? [])
    .filter((food) => {
      if (!food.food_id || seen.has(food.food_id)) {
        return false;
      }

      seen.add(food.food_id);
      return true;
    })
    .slice(0, limit);
}
