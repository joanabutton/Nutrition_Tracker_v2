import { describe, expect, it } from "vitest";

import { getTodayRange } from "@/lib/date/today";

describe("today range", () => {
  it("uses the configured time zone for the dashboard day", () => {
    const range = getTodayRange("Europe/Lisbon", new Date("2026-09-07T22:30:00.000Z"));

    expect(range.label).toBe("Monday 7 September");
    expect(range.start.toISOString()).toBe("2026-09-06T23:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-07T23:00:00.000Z");
  });

  it("does not roll over early when UTC has already reached tomorrow", () => {
    const range = getTodayRange("America/New_York", new Date("2026-09-08T02:00:00.000Z"));

    expect(range.label).toBe("Monday 7 September");
    expect(range.start.toISOString()).toBe("2026-09-07T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-08T04:00:00.000Z");
  });
});
