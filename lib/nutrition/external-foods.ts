import { getOpenFoodFactsUserAgent, getUsdaFoodDataApiKey } from "@/lib/env";

export type ExternalFoodSource =
  | "usda_fooddata_central"
  | "open_food_facts"
  | "portfir_bdca"
  | "cofid_uk";

export type ExternalFoodCandidate = {
  externalSource: ExternalFoodSource;
  externalSourceId: string;
  name: string;
  brand: string | null;
  servingQuantity: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  saturatedFatG: number;
  fibreG: number;
  totalSugarsG: number | null;
  addedSugarG: number | null;
};

export type ExternalFoodSearchResult = {
  foods: ExternalFoodCandidate[];
  warnings: string[];
};

type UsdaSearchFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaSearchNutrient[];
};

type UsdaSearchNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  value?: number;
};

type UsdaFoodDetail = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaDetailNutrient[];
};

type UsdaDetailNutrient = {
  amount?: number;
  nutrient?: {
    id?: number;
    name?: string;
  };
};

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
};

type OpenFoodFactsSearchBody = {
  hits?: OpenFoodFactsProduct[];
  products?: OpenFoodFactsProduct[];
};

const maxResultsPerSource = 5;

export async function searchExternalFoods(query: string): Promise<ExternalFoodSearchResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { foods: [], warnings: [] };
  }

  const [openFoodFactsResult, usdaResult] = await Promise.all([
    searchOpenFoodFacts(trimmedQuery),
    searchUsda(trimmedQuery)
  ]);

  return {
    foods: [...openFoodFactsResult.foods, ...usdaResult.foods],
    warnings: [...openFoodFactsResult.warnings, ...usdaResult.warnings]
  };
}

export async function getExternalFoodCandidate(
  source: ExternalFoodSource,
  id: string
): Promise<ExternalFoodCandidate | null> {
  if (source === "open_food_facts") {
    return getOpenFoodFactsProduct(id);
  }

  if (source === "usda_fooddata_central") {
    return getUsdaFood(id);
  }

  throw new Error(`${source} foods are stored in Supabase reference data.`);
}

async function searchUsda(query: string): Promise<ExternalFoodSearchResult> {
  const apiKey = getUsdaFoodDataApiKey();

  if (!apiKey) {
    return {
      foods: [],
      warnings: []
    };
  }

  try {
    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`, {
      body: JSON.stringify({
        dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        pageSize: maxResultsPerSource,
        query
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      return {
        foods: [],
        warnings: [`USDA lookup failed with status ${response.status}.`]
      };
    }

    const body = (await response.json()) as { foods?: UsdaSearchFood[] };
    return {
      foods: (body.foods ?? []).map(mapUsdaSearchFood).filter(isCandidate),
      warnings: []
    };
  } catch {
    return {
      foods: [],
      warnings: ["USDA lookup failed. Saved foods are still available."]
    };
  }
}

async function getUsdaFood(id: string) {
  const apiKey = getUsdaFoodDataApiKey();

  if (!apiKey) {
    throw new Error("USDA_FOODDATA_API_KEY is required to save USDA foods.");
  }

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(id)}?api_key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`USDA lookup failed with status ${response.status}.`);
  }

  return mapUsdaDetailFood((await response.json()) as UsdaFoodDetail);
}

async function searchOpenFoodFacts(query: string): Promise<ExternalFoodSearchResult> {
  try {
    const params = new URLSearchParams({
      action: "process",
      fields: "code,product_name,brands,nutriments",
      json: "1",
      page_size: String(maxResultsPerSource),
      search_simple: "1",
      search_terms: query
    });
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      headers: {
        "User-Agent": getOpenFoodFactsUserAgent()
      }
    });

    if (!response.ok) {
      return searchOpenFoodFactsFallback(query);
    }

    const body = (await response.json()) as OpenFoodFactsSearchBody;
    return {
      foods: readOpenFoodFactsProducts(body).map(mapOpenFoodFactsProduct).filter(isCandidate),
      warnings: []
    };
  } catch {
    return searchOpenFoodFactsFallback(query);
  }
}

async function searchOpenFoodFactsFallback(query: string): Promise<ExternalFoodSearchResult> {
  try {
    const params = new URLSearchParams({
      fields: "code,product_name,brands,nutriments",
      langs: "en,pt",
      page: "1",
      page_size: String(maxResultsPerSource),
      q: query
    });
    const response = await fetch(`https://search.openfoodfacts.org/search?${params}`, {
      headers: {
        "User-Agent": getOpenFoodFactsUserAgent()
      }
    });

    if (!response.ok) {
      return {
        foods: [],
        warnings: [`Open Food Facts lookup failed with status ${response.status}.`]
      };
    }

    const body = (await response.json()) as OpenFoodFactsSearchBody;
    return {
      foods: readOpenFoodFactsProducts(body).map(mapOpenFoodFactsProduct).filter(isCandidate),
      warnings: []
    };
  } catch {
    return {
      foods: [],
      warnings: ["Open Food Facts lookup failed. Saved foods are still available."]
    };
  }
}

async function getOpenFoodFactsProduct(id: string) {
  const params = new URLSearchParams({
    fields: "code,product_name,brands,nutriments"
  });
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(id)}?${params}`,
    {
      headers: {
        "User-Agent": getOpenFoodFactsUserAgent()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Open Food Facts lookup failed with status ${response.status}.`);
  }

  const body = (await response.json()) as { product?: OpenFoodFactsProduct; status?: number };

  if (body.status === 0 || !body.product) {
    return null;
  }

  return mapOpenFoodFactsProduct(body.product);
}

function mapUsdaSearchFood(food: UsdaSearchFood): ExternalFoodCandidate | null {
  if (!food.fdcId || !food.description) {
    return null;
  }

  return {
    externalSource: "usda_fooddata_central",
    externalSourceId: String(food.fdcId),
    name: titleCase(food.description),
    brand: food.brandOwner ?? food.brandName ?? null,
    servingQuantity: food.servingSize && food.servingSize > 0 ? food.servingSize : 100,
    servingUnit: normalizeUnit(food.servingSizeUnit),
    calories: readUsdaSearchNutrient(food, 1008),
    proteinG: readUsdaSearchNutrient(food, 1003),
    carbohydrateG: readUsdaSearchNutrient(food, 1005),
    fatG: readUsdaSearchNutrient(food, 1004),
    saturatedFatG: readUsdaSearchNutrient(food, 1258),
    fibreG: readUsdaSearchNutrient(food, 1079),
    totalSugarsG: readNullableUsdaSearchNutrient(food, 2000),
    addedSugarG: readNullableUsdaSearchNutrient(food, 1235)
  };
}

function mapUsdaDetailFood(food: UsdaFoodDetail): ExternalFoodCandidate | null {
  if (!food.fdcId || !food.description) {
    return null;
  }

  return {
    externalSource: "usda_fooddata_central",
    externalSourceId: String(food.fdcId),
    name: titleCase(food.description),
    brand: food.brandOwner ?? food.brandName ?? null,
    servingQuantity: food.servingSize && food.servingSize > 0 ? food.servingSize : 100,
    servingUnit: normalizeUnit(food.servingSizeUnit),
    calories: readUsdaDetailNutrient(food, 1008),
    proteinG: readUsdaDetailNutrient(food, 1003),
    carbohydrateG: readUsdaDetailNutrient(food, 1005),
    fatG: readUsdaDetailNutrient(food, 1004),
    saturatedFatG: readUsdaDetailNutrient(food, 1258),
    fibreG: readUsdaDetailNutrient(food, 1079),
    totalSugarsG: readNullableUsdaDetailNutrient(food, 2000),
    addedSugarG: readNullableUsdaDetailNutrient(food, 1235)
  };
}

function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct): ExternalFoodCandidate | null {
  if (!product.code || !product.product_name) {
    return null;
  }

  const nutriments = product.nutriments ?? {};

  return {
    externalSource: "open_food_facts",
    externalSourceId: product.code,
    name: product.product_name,
    brand: product.brands || null,
    servingQuantity: 100,
    servingUnit: "g",
    calories: readNutriment(nutriments, "energy-kcal_100g"),
    proteinG: readNutriment(nutriments, "proteins_100g"),
    carbohydrateG: readNutriment(nutriments, "carbohydrates_100g"),
    fatG: readNutriment(nutriments, "fat_100g"),
    saturatedFatG: readNutriment(nutriments, "saturated-fat_100g"),
    fibreG: readNutriment(nutriments, "fiber_100g"),
    totalSugarsG: readNullableNutriment(nutriments, "sugars_100g"),
    addedSugarG: null
  };
}

function readOpenFoodFactsProducts(body: OpenFoodFactsSearchBody) {
  return body.products ?? body.hits ?? [];
}

function readUsdaSearchNutrient(food: UsdaSearchFood, nutrientId: number) {
  return readNullableUsdaSearchNutrient(food, nutrientId) ?? 0;
}

function readNullableUsdaSearchNutrient(food: UsdaSearchFood, nutrientId: number) {
  const value = food.foodNutrients?.find((nutrient) => nutrient.nutrientId === nutrientId)?.value;
  return toNullableNumber(value);
}

function readUsdaDetailNutrient(food: UsdaFoodDetail, nutrientId: number) {
  return readNullableUsdaDetailNutrient(food, nutrientId) ?? 0;
}

function readNullableUsdaDetailNutrient(food: UsdaFoodDetail, nutrientId: number) {
  const value = food.foodNutrients?.find((nutrient) => nutrient.nutrient?.id === nutrientId)?.amount;
  return toNullableNumber(value);
}

function readNutriment(nutriments: Record<string, number | string | undefined>, key: string) {
  return readNullableNutriment(nutriments, key) ?? 0;
}

function readNullableNutriment(
  nutriments: Record<string, number | string | undefined>,
  key: string
) {
  return toNullableNumber(nutriments[key]);
}

function isCandidate(candidate: ExternalFoodCandidate | null): candidate is ExternalFoodCandidate {
  return Boolean(candidate && candidate.calories > 0);
}

function toNullableNumber(value: number | string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function normalizeUnit(unit: string | undefined) {
  return unit?.trim().toLowerCase() || "g";
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
