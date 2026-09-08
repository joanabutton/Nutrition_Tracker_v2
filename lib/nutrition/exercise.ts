export type ExerciseType =
  | "running"
  | "walking"
  | "cycling"
  | "swimming"
  | "strength_training"
  | "yoga_pilates"
  | "housework_childcare";

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

export const exerciseOptions: Array<{
  type: ExerciseType;
  label: string;
  met: number;
  aliases: string[];
  supportsDistance: boolean;
}> = [
  {
    type: "running",
    label: "Running",
    met: 8.3,
    aliases: ["run", "ran", "running", "corrida", "corri", "correr"],
    supportsDistance: true
  },
  {
    type: "walking",
    label: "Walking",
    met: 3.5,
    aliases: ["walk", "walked", "walking", "caminhada", "andei"],
    supportsDistance: true
  },
  {
    type: "cycling",
    label: "Cycling",
    met: 6.8,
    aliases: ["cycle", "cycled", "cycling", "bike", "biked", "bicicleta"],
    supportsDistance: true
  },
  {
    type: "swimming",
    label: "Swimming",
    met: 6,
    aliases: ["swim", "swam", "swimming", "natacao", "nadei"],
    supportsDistance: true
  },
  {
    type: "strength_training",
    label: "Strength training",
    met: 3.5,
    aliases: ["weights", "strength", "gym", "musculacao"],
    supportsDistance: false
  },
  {
    type: "yoga_pilates",
    label: "Yoga / Pilates",
    met: 2.5,
    aliases: ["yoga", "pilates"],
    supportsDistance: false
  },
  {
    type: "housework_childcare",
    label: "Housework / childcare",
    met: 3,
    aliases: ["housework", "cleaning", "childcare", "house chores", "limpeza", "tarefas", "criancas"],
    supportsDistance: false
  }
];

export function parseExerciseText(input: string): ParsedExerciseLog {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const option = exerciseOptions.find((exercise) =>
    exercise.aliases.some((alias) => normalized.includes(alias))
  );
  const distanceKm = readDistanceKm(normalized);
  const durationMinutes = readDurationMinutes(normalized);

  if (!option) {
    throw new Error("Choose or describe a supported exercise.");
  }

  if (distanceKm === null && durationMinutes === null) {
    throw new Error("Add a distance, duration, or both.");
  }

  return {
    type: option.type,
    distanceKm,
    durationMinutes,
    originalText: input.trim()
  };
}

export const parseRunningExerciseText = parseExerciseText;

export function estimateExerciseCalories(input: ExerciseEstimateInput): ExerciseEstimate {
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    throw new Error("A current profile weight is required to estimate exercise calories.");
  }

  const option = getExerciseOption(input.type);

  if (input.type === "running" && input.distanceKm !== null) {
    return {
      caloriesEstimated: Math.round(input.weightKg * input.distanceKm * runningKcalPerKgKm),
      estimationMethod: "running_distance_kcal_per_kg_km"
    };
  }

  if (input.durationMinutes !== null) {
    return {
      caloriesEstimated: Math.round(input.weightKg * (input.durationMinutes / 60) * option.met),
      estimationMethod: `${input.type}_met_${String(option.met).replace(".", "_")}`
    };
  }

  throw new Error(`${getExerciseOption(input.type).label} needs a duration to estimate calories.`);
}

export function readExerciseType(value: string): ExerciseType {
  if (exerciseOptions.some((option) => option.type === value)) {
    return value as ExerciseType;
  }

  throw new Error("Exercise type is invalid.");
}

export function getExerciseOption(type: ExerciseType) {
  const option = exerciseOptions.find((exercise) => exercise.type === type);

  if (!option) {
    throw new Error("Exercise type is invalid.");
  }

  return option;
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
