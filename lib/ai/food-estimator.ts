import { getFoodEstimatorModel, getOpenAiApiKey } from "@/lib/env";

export type FoodFallbackRequestItem = {
  index: number;
  inputName: string;
  quantity: number;
  unit: string;
  issue: "unresolved_food" | "unsupported_unit";
  matchedFoodName?: string;
  matchedServingUnit?: string;
};

export type EstimatedFoodFallback = {
  index: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  saturatedFatG: number;
  fibreG: number;
  addedSugarG: number | null;
  reason: string;
};

type ResponsesApiBody = {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  output_text?: string;
  error?: {
    message?: string;
  };
  incomplete_details?: {
    reason?: string;
  } | null;
};

const foodFallbackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "number" },
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          calories: { type: "number" },
          proteinG: { type: "number" },
          carbohydrateG: { type: "number" },
          fatG: { type: "number" },
          saturatedFatG: { type: "number" },
          fibreG: { type: "number" },
          addedSugarG: { type: ["number", "null"] },
          reason: { type: "string" }
        },
        required: [
          "index",
          "name",
          "quantity",
          "unit",
          "calories",
          "proteinG",
          "carbohydrateG",
          "fatG",
          "saturatedFatG",
          "fibreG",
          "addedSugarG",
          "reason"
        ]
      }
    }
  },
  required: ["items"]
} as const;

const estimatorInstructions = [
  "Estimate nutrition only for the requested unresolved or unsupported food log items.",
  "For issue unresolved_food, return total nutrition for the listed quantity, not per 100 g, unless the quantity itself is 100 g.",
  "For issue unsupported_unit, estimate only the quantity conversion into matchedServingUnit, set the returned unit to matchedServingUnit, set nutrition fields to 0 because they will be ignored, and write a reason only about the portion conversion.",
  "Prefer practical grams for solids and millilitres for drinks when the original unit cannot be calculated deterministically and no matchedServingUnit is provided.",
  "Keep estimates conservative and ordinary. Do not invent precision.",
  "Added sugar should be null unless the item is clearly sweetened or the user specified added sugar.",
  "These rows will be displayed to the user as estimated and require confirmation."
].join(" ");

export async function estimateFoodFallbacks(
  originalText: string,
  items: FoodFallbackRequestItem[]
): Promise<EstimatedFoodFallback[]> {
  if (items.length === 0) {
    return [];
  }

  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for estimated food fallback.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          role: "system",
          content: estimatorInstructions
        },
        {
          role: "user",
          content: JSON.stringify({
            originalText,
            items
          })
        }
      ],
      max_output_tokens: 1600,
      model: getFoodEstimatorModel(),
      reasoning: {
        effort: "minimal"
      },
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "estimated_food_fallback",
          strict: true,
          schema: foodFallbackSchema
        }
      }
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const body = (await response.json()) as ResponsesApiBody;

  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI estimation failed with status ${response.status}.`);
  }

  return validateEstimatedFoodFallbacks(JSON.parse(readStructuredResponseText(body)));
}

export function validateEstimatedFoodFallbacks(value: unknown): EstimatedFoodFallback[] {
  if (!value || typeof value !== "object") {
    throw new Error("Food estimator returned an invalid response.");
  }

  const parsed = value as { items?: unknown[] };

  if (!Array.isArray(parsed.items) || parsed.items.length === 0 || parsed.items.length > 8) {
    throw new Error("Food estimator returned an invalid food list.");
  }

  return parsed.items.map(validateEstimatedFoodFallback);
}

function validateEstimatedFoodFallback(item: unknown): EstimatedFoodFallback {
  if (!item || typeof item !== "object") {
    throw new Error("Food estimator returned an invalid food item.");
  }

  const parsed = item as Partial<EstimatedFoodFallback>;
  const fallback = {
    index: Number(parsed.index),
    name: String(parsed.name ?? "").trim(),
    quantity: Number(parsed.quantity),
    unit: String(parsed.unit ?? "").trim().toLowerCase(),
    calories: readNonNegativeNumber(parsed.calories),
    proteinG: readNonNegativeNumber(parsed.proteinG),
    carbohydrateG: readNonNegativeNumber(parsed.carbohydrateG),
    fatG: readNonNegativeNumber(parsed.fatG),
    saturatedFatG: readNonNegativeNumber(parsed.saturatedFatG),
    fibreG: readNonNegativeNumber(parsed.fibreG),
    addedSugarG: parsed.addedSugarG === null ? null : readNonNegativeNumber(parsed.addedSugarG),
    reason: String(parsed.reason ?? "").trim()
  };

  if (
    !Number.isInteger(fallback.index) ||
    fallback.index < 0 ||
    !fallback.name ||
    !fallback.unit ||
    !Number.isFinite(fallback.quantity) ||
    fallback.quantity <= 0 ||
    !fallback.reason
  ) {
    throw new Error("Food estimator returned an invalid food item.");
  }

  return fallback;
}

function readStructuredResponseText(body: ResponsesApiBody) {
  if (body.output_text) {
    return body.output_text;
  }

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.text)?.text;

  if (!text) {
    if (body.status === "incomplete") {
      throw new Error(
        `OpenAI did not finish the food estimate: ${body.incomplete_details?.reason ?? "incomplete response"}.`
      );
    }

    throw new Error("OpenAI returned no estimated food log.");
  }

  return text;
}

function readNonNegativeNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Food estimator returned an invalid nutrient value.");
  }

  return Math.round(parsed * 100) / 100;
}
