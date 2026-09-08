import { getAppTimeZone } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type WeightLog = {
  id: string;
  logged_at: string;
  weight_kg: number | string;
  note: string | null;
  created_at: string;
};

export type WeightTrend = {
  latestWeightKg: number | null;
  sevenDayAverageKg: number | null;
  thirtyDayTrendKg: number | null;
  thirtyDayTrendDirection: "down" | "flat" | "up" | null;
  history: WeightLog[];
};

const dayMs = 24 * 60 * 60 * 1000;
const minimumThirtyDayTrendSpan = 14 * dayMs;

export async function getWeightTrend(limit = 120): Promise<WeightTrend> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyWeightTrend([]);
  }

  const { data, error } = await supabase
    .from("weight_logs")
    .select("id,logged_at,weight_kg,note,created_at")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return calculateWeightTrend((data ?? []) as WeightLog[]);
}

export function calculateWeightTrend(logs: WeightLog[]): WeightTrend {
  const sortedDescending = [...logs].sort(
    (first, second) => Date.parse(second.logged_at) - Date.parse(first.logged_at)
  );

  if (sortedDescending.length === 0) {
    return emptyWeightTrend([]);
  }

  const latest = sortedDescending[0];
  const latestDate = new Date(latest.logged_at);
  const sevenDayLogs = logsWithinDays(sortedDescending, latestDate, 7);
  const thirtyDayLogs = logsWithinDays(sortedDescending, latestDate, 30);
  const thirtyDayTrendKg = calculateTrendKg(thirtyDayLogs);

  return {
    latestWeightKg: Number(latest.weight_kg),
    sevenDayAverageKg: calculateDailyAverage(sevenDayLogs),
    thirtyDayTrendKg,
    thirtyDayTrendDirection: getTrendDirection(thirtyDayTrendKg),
    history: sortedDescending
  };
}

export function formatWeightDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: getAppTimeZone()
  }).format(new Date(value));
}

function logsWithinDays(logs: WeightLog[], latestDate: Date, days: number) {
  const earliestTime = latestDate.getTime() - days * dayMs;
  return logs.filter((log) => {
    const time = Date.parse(log.logged_at);
    return time >= earliestTime && time <= latestDate.getTime();
  });
}

function calculateTrendKg(logs: WeightLog[]) {
  if (logs.length < 2) {
    return null;
  }

  const sortedAscending = [...logs].sort(
    (first, second) => Date.parse(first.logged_at) - Date.parse(second.logged_at)
  );
  const first = sortedAscending[0];
  const latest = sortedAscending.at(-1);

  if (!first || !latest) {
    return null;
  }

  if (Date.parse(latest.logged_at) - Date.parse(first.logged_at) < minimumThirtyDayTrendSpan) {
    return null;
  }

  return roundWeight(Number(latest.weight_kg) - Number(first.weight_kg));
}

function calculateDailyAverage(logs: WeightLog[]) {
  const dailyWeights = new Map<string, number[]>();

  for (const log of logs) {
    const key = getWeightDateKey(log.logged_at);
    const weights = dailyWeights.get(key) ?? [];
    weights.push(Number(log.weight_kg));
    dailyWeights.set(key, weights);
  }

  const dailyAverages = Array.from(dailyWeights.values()).map((weights) => averageNumbers(weights));

  if (dailyAverages.length < 2) {
    return null;
  }

  return roundWeight(averageNumbers(dailyAverages));
}

function averageNumbers(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function getWeightDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: getAppTimeZone(),
    year: "numeric"
  }).formatToParts(new Date(value));
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function getTrendDirection(value: number | null): WeightTrend["thirtyDayTrendDirection"] {
  if (value === null) {
    return null;
  }

  if (Math.abs(value) < 0.1) {
    return "flat";
  }

  return value < 0 ? "down" : "up";
}

function emptyWeightTrend(history: WeightLog[]): WeightTrend {
  return {
    latestWeightKg: null,
    sevenDayAverageKg: null,
    thirtyDayTrendKg: null,
    thirtyDayTrendDirection: null,
    history
  };
}

function roundWeight(value: number) {
  return Math.round(value * 10) / 10;
}
