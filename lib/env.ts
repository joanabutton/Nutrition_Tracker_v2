const supabaseEnvKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const defaultAppTimeZone = "Europe/London";
const defaultOpenFoodFactsUserAgent =
  "NutritionTracker/0.1 (local development; contact unavailable)";
const defaultFoodParserModel = "gpt-5-mini";
const defaultFoodEstimatorModel = "gpt-5-mini";

export function getMissingSupabaseClientEnv() {
  return supabaseEnvKeys.filter((key) => !process.env[key]);
}

export function isSupabaseConfigured() {
  return getMissingSupabaseClientEnv().length === 0;
}

export function getSupabaseClientEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = getMissingSupabaseClientEnv();
    throw new Error(`Missing Supabase environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl,
    supabaseAnonKey
  };
}

export function getAppTimeZone() {
  return process.env.APP_TIME_ZONE || defaultAppTimeZone;
}

export function getUsdaFoodDataApiKey() {
  return process.env.USDA_FOODDATA_API_KEY;
}

export function getOpenFoodFactsUserAgent() {
  return process.env.OPEN_FOOD_FACTS_USER_AGENT || defaultOpenFoodFactsUserAgent;
}

export function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY;
}

export function getFoodParserModel() {
  return process.env.OPENAI_FOOD_PARSER_MODEL || defaultFoodParserModel;
}

export function getFoodEstimatorModel() {
  return process.env.OPENAI_FOOD_ESTIMATOR_MODEL || defaultFoodEstimatorModel;
}
