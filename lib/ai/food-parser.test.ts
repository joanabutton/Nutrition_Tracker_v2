import { describe, expect, it } from "vitest";

import { readStructuredResponseText, validateParsedFoodLog } from "@/lib/ai/food-parser";

describe("food parser validation", () => {
  it("accepts a valid structured food log", () => {
    expect(
      validateParsedFoodLog({
        mealType: "breakfast",
        items: [
          {
            name: "bran sticks",
            portionDescription: null,
            quantity: 40,
            quantityIsEstimated: false,
            unit: "g"
          }
        ]
      })
    ).toEqual({
      mealType: "breakfast",
      items: [
        {
          name: "bran sticks",
          portionDescription: null,
          quantity: 40,
          quantityIsEstimated: false,
          unit: "g"
        }
      ]
    });
  });

  it("keeps estimated portion context", () => {
    expect(
      validateParsedFoodLog({
        mealType: "lunch",
        items: [
          {
            name: "soup",
            portionDescription: "small bowl",
            quantity: 250,
            quantityIsEstimated: true,
            unit: "g"
          }
        ]
      })
    ).toEqual({
      mealType: "lunch",
      items: [
        {
          name: "soup",
          portionDescription: "small bowl",
          quantity: 250,
          quantityIsEstimated: true,
          unit: "g"
        }
      ]
    });
  });

  it("rejects empty or non-positive parsed quantities", () => {
    expect(() =>
      validateParsedFoodLog({
        mealType: "snack",
        items: [{ name: "apple", quantity: 0, unit: "unit" }]
      })
    ).toThrow("invalid food item");
  });

  it("rejects invalid meal types", () => {
    expect(() =>
      validateParsedFoodLog({
        mealType: "brunch",
        items: [{ name: "apple", quantity: 1, unit: "unit" }]
      })
    ).toThrow("invalid meal type");
  });

  it("reads nested Responses API output text", () => {
    expect(
      readStructuredResponseText({
        output: [
          { type: "reasoning", content: [] },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "{\"mealType\":\"breakfast\",\"items\":[{\"name\":\"bran sticks\",\"quantity\":40,\"unit\":\"g\",\"quantityIsEstimated\":false,\"portionDescription\":null}]}"
              }
            ]
          }
        ]
      })
    ).toBe(
      "{\"mealType\":\"breakfast\",\"items\":[{\"name\":\"bran sticks\",\"quantity\":40,\"unit\":\"g\",\"quantityIsEstimated\":false,\"portionDescription\":null}]}"
    );
  });
});
