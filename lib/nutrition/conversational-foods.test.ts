import { describe, expect, it } from "vitest";

import {
  applyDraftMatchSelections,
  calculateEstimatedDraftItemNutrition,
  calculateDraftItemNutrition,
  decodeDraft,
  encodeDraft,
  type ConversationalFoodDraft,
  type ConversationalFoodDraftItem
} from "@/lib/nutrition/conversational-foods";

describe("conversational estimated food nutrition", () => {
  process.env.APP_DRAFT_SIGNING_SECRET = "test-draft-secret";

  it("scales estimated rows when the user edits quantity", () => {
    const item: ConversationalFoodDraftItem = {
      inputName: "banana",
      quantity: 118,
      unit: "g",
      quantityIsEstimated: true,
      portionDescription: "amount was not specified",
      resolved: {
        kind: "estimated_food",
        name: "banana",
        brand: null,
        servingQuantity: 118,
        servingUnit: "g",
        calories: 105,
        proteinG: 1.3,
        carbohydrateG: 27,
        fatG: 0.4,
        saturatedFatG: 0.1,
        fibreG: 3.1,
        addedSugarG: null,
        reason: "Typical medium banana edible portion."
      },
      alternatives: [],
      warning: "Estimated fallback: Typical medium banana edible portion."
    };

    expect(calculateEstimatedDraftItemNutrition(item, 59, "g")).toEqual({
      calories: 52.5,
      protein_g: 0.65,
      carbohydrate_g: 13.5,
      fat_g: 0.2,
      saturated_fat_g: 0.05,
      fibre_g: 1.55,
      added_sugar_g: null
    });
  });

  it("rejects tampered negative estimated nutrition in encoded drafts", () => {
    const draft: ConversationalFoodDraft = {
      originalText: "banana",
      mealType: "snack",
      items: [
        {
          inputName: "banana",
          quantity: 118,
          unit: "g",
          quantityIsEstimated: true,
          portionDescription: "amount was not specified",
          resolved: {
            kind: "estimated_food",
            name: "banana",
            brand: null,
            servingQuantity: 118,
            servingUnit: "g",
            calories: -105,
            proteinG: 1.3,
            carbohydrateG: 27,
            fatG: 0.4,
            saturatedFatG: 0.1,
            fibreG: 3.1,
            addedSugarG: null,
            reason: "Typical medium banana edible portion."
          },
          alternatives: [],
          warning: "Estimated fallback: Typical medium banana edible portion."
        }
      ]
    };

    const encoded = encodeDraft(draft);

    expect(() => decodeDraft(encoded)).toThrow("estimated calories cannot be negative");
  });

  it("rejects drafts tampered with after signing", () => {
    const draft: ConversationalFoodDraft = {
      originalText: "banana",
      mealType: "snack",
      items: [
        {
          inputName: "banana",
          quantity: 100,
          unit: "g",
          quantityIsEstimated: false,
          portionDescription: null,
          resolved: null,
          alternatives: [],
          warning: null
        }
      ]
    };
    const encoded = encodeDraft(draft);
    const [payload, signature] = encoded.split(".");
    const tamperedDraft = { ...draft, mealType: "dinner" as const };
    const tamperedPayload = Buffer.from(JSON.stringify(tamperedDraft), "utf8").toString("base64url");

    expect(() => decodeDraft(`${tamperedPayload}.${signature}`)).toThrow("could not be verified");
    expect(payload).not.toBe(tamperedPayload);
  });

  it("applies a selected alternative match from the signed draft", () => {
    const draft: ConversationalFoodDraft = {
      originalText: "tomato",
      mealType: "snack",
      items: [
        {
          inputName: "tomato",
          quantity: 80,
          unit: "g",
          quantityIsEstimated: true,
          portionDescription: "part of salad",
          resolved: {
            kind: "external_food",
            externalSource: "open_food_facts",
            externalSourceId: "ketchup",
            name: "Ketchup",
            brand: "Example",
            servingQuantity: 100,
            servingUnit: "g",
            calories: 108
          },
          alternatives: [
            {
              kind: "external_food",
              externalSource: "open_food_facts",
              externalSourceId: "ketchup",
              name: "Ketchup",
              brand: "Example",
              servingQuantity: 100,
              servingUnit: "g",
              calories: 108
            },
            {
              kind: "external_food",
              externalSource: "portfir_bdca",
              externalSourceId: "portfir_bdca:2026:tomato",
              name: "Tomato",
              brand: null,
              servingQuantity: 100,
              servingUnit: "g",
              calories: 18
            }
          ],
          warning: null
        }
      ]
    };

    const updated = applyDraftMatchSelections(draft, [1]);

    expect(updated.items[0]?.resolved?.name).toBe("Tomato");
    expect(updated.items[0]?.warning).toContain("Estimated from");
  });

  it("uses verified nutrition when only the quantity was estimated", () => {
    expect(
      calculateDraftItemNutrition(
        {
          serving_quantity: 100,
          serving_unit: "g",
          calories: 89,
          protein_g: 1.1,
          carbohydrate_g: 22.8,
          fat_g: 0.3,
          saturated_fat_g: 0.1,
          fibre_g: 2.6,
          added_sugar_g: null
        },
        118,
        "g"
      )
    ).toEqual({
      calories: 105.02,
      protein_g: 1.3,
      carbohydrate_g: 26.9,
      fat_g: 0.35,
      saturated_fat_g: 0.12,
      fibre_g: 3.07,
      added_sugar_g: null
    });
  });
});
