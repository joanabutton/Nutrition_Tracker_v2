import { getFoodParserModel, getOpenAiApiKey } from "@/lib/env";

export type ParsedFoodItem = {
  name: string;
  quantity: number;
  unit: string;
  quantityIsEstimated: boolean;
  portionDescription: string | null;
};

export type ParsedFoodLog = {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  items: ParsedFoodItem[];
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

const foodLogSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mealType: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "snack"]
    },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string"
          },
          quantity: {
            type: "number"
          },
          unit: {
            type: "string"
          },
          quantityIsEstimated: {
            type: "boolean"
          },
          portionDescription: {
            type: ["string", "null"]
          }
        },
        required: ["name", "quantity", "unit", "quantityIsEstimated", "portionDescription"]
      }
    }
  },
  required: ["mealType", "items"]
} as const;

const foodLogParserInstructions = [
  "Extract food logging intent into structured JSON only.",
  "Do not calculate nutrition, calories, or macros.",
  "Prefer quantities in grams for solid foods and millilitres for drinks whenever a reasonable everyday estimate is possible.",
  "Use the user's exact grams or millilitres when provided.",
  "For vague portions such as a small bowl, handful, spoonful, slice, cup, glass, or medium piece, estimate a practical gram or millilitre amount, set quantityIsEstimated to true, and describe the original portion in portionDescription.",
  "If the user names a food without a quantity, estimate a typical single portion, set quantityIsEstimated to true, and use portionDescription to say the amount was not specified.",
  "Examples: 'banana' should be an estimated edible gram amount; '1 tbsp peanut butter' should be an estimated gram amount; 'small bowl oats' should be an estimated gram amount; '50g oats' should stay 50 g with quantityIsEstimated false.",
  "Only preserve simple count or kitchen units such as unit, slice, tsp, tbsp, or cup when converting to grams or millilitres would be unreliable.",
  "Default mealType to snack if the meal is unclear."
].join(" ");

export async function parseFoodLogText(input: string): Promise<ParsedFoodLog> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for conversational food logging.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          role: "system",
          content: foodLogParserInstructions
        },
        {
          role: "user",
          content: input
        }
      ],
      max_output_tokens: 1200,
      model: getFoodParserModel(),
      reasoning: {
        effort: "minimal"
      },
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "food_log_parse",
          strict: true,
          schema: foodLogSchema
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
    throw new Error(body.error?.message || `OpenAI parsing failed with status ${response.status}.`);
  }

  return validateParsedFoodLog(JSON.parse(readStructuredResponseText(body)));
}

export function validateParsedFoodLog(value: unknown): ParsedFoodLog {
  if (!value || typeof value !== "object") {
    throw new Error("Food parser returned an invalid response.");
  }

  const parsed = value as Partial<ParsedFoodLog>;

  if (!isMealType(parsed.mealType)) {
    throw new Error("Food parser returned an invalid meal type.");
  }

  if (!Array.isArray(parsed.items) || parsed.items.length === 0 || parsed.items.length > 8) {
    throw new Error("Food parser returned an invalid food list.");
  }

  return {
    mealType: parsed.mealType,
    items: parsed.items.map(validateParsedFoodItem)
  };
}

function validateParsedFoodItem(item: unknown): ParsedFoodItem {
  if (!item || typeof item !== "object") {
    throw new Error("Food parser returned an invalid food item.");
  }

  const parsed = item as Partial<ParsedFoodItem>;
  const name = String(parsed.name ?? "").trim();
  const unit = normalizeUnit(String(parsed.unit ?? ""));
  const quantity = Number(parsed.quantity);

  if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Food parser returned an invalid food item.");
  }

  return {
    name,
    quantity,
    unit,
    quantityIsEstimated: Boolean(parsed.quantityIsEstimated),
    portionDescription:
      typeof parsed.portionDescription === "string" && parsed.portionDescription.trim()
        ? parsed.portionDescription.trim()
        : null
  };
}

export function readStructuredResponseText(body: ResponsesApiBody) {
  if (body.output_text) {
    return body.output_text;
  }

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.text)?.text;

  if (!text) {
    if (body.status === "incomplete") {
      throw new Error(
        `OpenAI did not finish the food parse: ${body.incomplete_details?.reason ?? "incomplete response"}.`
      );
    }

    throw new Error("OpenAI returned no structured food log.");
  }

  return text;
}

function isMealType(value: unknown): value is ParsedFoodLog["mealType"] {
  return value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack";
}

function normalizeUnit(value: string) {
  return value.trim().toLowerCase();
}
