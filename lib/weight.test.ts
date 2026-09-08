import { describe, expect, it } from "vitest";

import { calculateWeightTrend, type WeightLog } from "@/lib/weight";

function weightLog(id: string, loggedAt: string, weightKg: number): WeightLog {
  return {
    id,
    logged_at: loggedAt,
    weight_kg: weightKg,
    note: null,
    created_at: loggedAt
  };
}

describe("weight trend calculations", () => {
  it("returns empty trend values without weight logs", () => {
    expect(calculateWeightTrend([])).toMatchObject({
      latestWeightKg: null,
      sevenDayAverageKg: null,
      thirtyDayTrendKg: null,
      thirtyDayTrendDirection: null
    });
  });

  it("calculates latest weight and a seven-day moving average", () => {
    expect(
      calculateWeightTrend([
        weightLog("old", "2026-09-01T08:00:00Z", 70.4),
        weightLog("mid", "2026-09-06T08:00:00Z", 70.1),
        weightLog("latest", "2026-09-08T08:00:00Z", 69.8)
      ])
    ).toMatchObject({
      latestWeightKg: 69.8,
      sevenDayAverageKg: 70.1
    });
  });

  it("calculates a thirty-day trend direction", () => {
    expect(
      calculateWeightTrend([
        weightLog("start", "2026-08-10T08:00:00Z", 71.2),
        weightLog("latest", "2026-09-08T08:00:00Z", 69.8)
      ])
    ).toMatchObject({
      thirtyDayTrendKg: -1.4,
      thirtyDayTrendDirection: "down"
    });
  });

  it("avoids a thirty-day trend with only one recent log", () => {
    expect(
      calculateWeightTrend([weightLog("latest", "2026-09-08T08:00:00Z", 69.8)])
    ).toMatchObject({
      thirtyDayTrendKg: null,
      thirtyDayTrendDirection: null
    });
  });
});
