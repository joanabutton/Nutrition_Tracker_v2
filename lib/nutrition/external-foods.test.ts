import { describe, expect, it } from "vitest";

import { getExternalFoodSourceLabel } from "@/lib/nutrition/food";

describe("external food labels", () => {
  it("labels external sources for the UI", () => {
    expect(getExternalFoodSourceLabel("open_food_facts")).toBe("Open Food Facts");
    expect(getExternalFoodSourceLabel("usda_fooddata_central")).toBe("USDA FoodData Central");
    expect(getExternalFoodSourceLabel("portfir_bdca")).toBe("PortFIR / INSA BDCA");
    expect(getExternalFoodSourceLabel("cofid_uk")).toBe("McCance and Widdowson / CoFID");
  });
});
