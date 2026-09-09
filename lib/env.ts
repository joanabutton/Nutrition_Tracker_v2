const defaultAppTimeZone = "Europe/Lisbon";
const defaultOpenFoodFactsUserAgent =
  "NutritionTracker/0.1 (production; contact unavailable)";
const defaultFoodParserModel = "gpt-5-mini";
const defaultFoodEstimatorModel = "gpt-5-mini";

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

export function getDraftSigningSecret() {
  const secret = process.env.APP_DRAFT_SIGNING_SECRET;

  if (!secret) {
    throw new Error("APP_DRAFT_SIGNING_SECRET is required to sign food log drafts.");
  }

  return secret;
}
