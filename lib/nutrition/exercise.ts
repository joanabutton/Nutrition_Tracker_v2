export type ExerciseType = "running";

export type ParsedExerciseLog = {
  type: ExerciseType;
  distanceKm: number | null;
  durationMinutes: number | null;
  originalText: string;
};

export type ExerciseEstimateInput = {
  type: ExerciseType;
  distanceKm: number | null;
  durationMinutes: number | null;
  weightKg: number;
};

export type ExerciseEstimate = {
  caloriesEstimated: number;
  estimationMethod: string;
};

const runningKcalPerKgKm = 1;

export function parseRunningExerciseText(input: string): ParsedExerciseLog {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const distanceKm = readDistanceKm(normalized);
  const durationMinutes = readDurationMinutes(normalized);

  if (!/\b(run|ran|running|corrida|corri|correr)\b/.test(normalized)) {
    throw new Error("For now, describe running exercise, for example: ran 4 km in 30 minutes.");
  }

  if (distanceKm === null && durationMinutes === null) {
    throw new Error("Add a distance, duration, or both for the run.");
  }

  return {
    type: "running",
    distanceKm,
    durationMinutes,
    originalText: input.trim()
  };
}

export function estimateExerciseCalories(input: ExerciseEstimateInput): ExerciseEstimate {
  if (input.type !== "running") {
    throw new Error("Only running estimates are supported right now.");
  }

  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    throw new Error("A current profile weight is required to estimate exercise calories.");
  }

  if (input.distanceKm !== null) {
    return {
      caloriesEstimated: Math.round(input.weightKg * input.distanceKm * runningKcalPerKgKm),
      estimationMethod: "running_distance_kcal_per_kg_km"
    };
  }

  if (input.durationMinutes !== null) {
    return {
      caloriesEstimated: Math.round(input.weightKg * (input.durationMinutes / 60) * 8.3),
      estimationMethod: "running_duration_met_8_3"
    };
  }

  throw new Error("Add a distance, duration, or both for the run.");
}

export function readExerciseType(value: string): ExerciseType {
  if (value === "running") {
    return value;
  }

  throw new Error("Exercise type is invalid.");
}

function readDistanceKm(value: string) {
  const kmMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilomet(?:er|re)s?)/);

  if (kmMatch?.[1]) {
    return readPositiveMatchNumber(kmMatch[1]);
  }

  const meterMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:m|meters?|metres?)\b/);

  if (meterMatch?.[1]) {
    return readPositiveMatchNumber(meterMatch[1]) / 1000;
  }

  return null;
}

function readDurationMinutes(value: string) {
  const hourMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours|hora|horas)\b/);
  const minuteMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:min|mins|minute|minutes|minuto|minutos)\b/);
  const hours = hourMatch?.[1] ? readPositiveMatchNumber(hourMatch[1]) : 0;
  const minutes = minuteMatch?.[1] ? readPositiveMatchNumber(minuteMatch[1]) : 0;
  const total = hours * 60 + minutes;

  return total > 0 ? total : null;
}

function readPositiveMatchNumber(value: string) {
  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Exercise numbers must be greater than zero.");
  }

  return parsed;
}
