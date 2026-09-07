import { describe, expect, it } from "vitest";

import {
  buildReferenceFoodExternalId,
  parseReferenceFoodExternalId
} from "@/lib/nutrition/reference-food-ids";

describe("reference food external ids", () => {
  it("builds stable source/version/source food ids", () => {
    expect(
      buildReferenceFoodExternalId({
        source: "portfir_bdca",
        sourceFoodId: "624",
        sourceVersion: "v_7.1_-_2026"
      })
    ).toBe("portfir_bdca:v_7.1_-_2026:624");
  });

  it("parses stable ids back into lookup parts", () => {
    expect(parseReferenceFoodExternalId("portfir_bdca:v_7.1_-_2026:624", "portfir_bdca")).toEqual({
      sourceFoodId: "624",
      sourceVersion: "v_7.1_-_2026"
    });
  });

  it("rejects ids for another source", () => {
    expect(parseReferenceFoodExternalId("cofid_uk:cofid_2021:13-145", "portfir_bdca")).toBeNull();
  });
});
