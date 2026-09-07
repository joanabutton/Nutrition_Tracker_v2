export type Sex = "female" | "male";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type NutritionGoal = "lose_weight" | "maintain_weight" | "gain_weight";

export type ProfileInputs = {
  birthDate: string;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  desiredWeightChangeKgPerWeek: number;
};

export type NutritionTargets = {
  calorieTarget: number;
  proteinTargetG: number;
  carbohydrateTargetG: number;
  fatTargetG: number;
  saturatedFatLimitG: number;
  fibreTargetG: number;
  addedSugarLimitG: number;
};

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const caloriesPerKgBodyWeight = 7700;

export function calculateAge(birthDate: string, asOf = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(birth.getTime())) {
    throw new Error("Birth date is invalid.");
  }

  let age = asOf.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());

  if (asOf < birthdayThisYear) {
    age -= 1;
  }

  if (age < 13 || age > 120) {
    throw new Error("Age must be between 13 and 120.");
  }

  return age;
}

export function calculateBmr({
  sex,
  heightCm,
  currentWeightKg,
  birthDate,
  asOf
}: Pick<ProfileInputs, "sex" | "heightCm" | "currentWeightKg" | "birthDate"> & {
  asOf?: Date;
}) {
  const age = calculateAge(birthDate, asOf);
  const sexAdjustment = sex === "male" ? 5 : -161;

  return Math.round(10 * currentWeightKg + 6.25 * heightCm - 5 * age + sexAdjustment);
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel) {
  return Math.round(bmr * activityFactors[activityLevel]);
}

export function calculateCalorieTarget(
  tdee: number,
  goal: NutritionGoal,
  desiredWeightChangeKgPerWeek: number
) {
  const dailyAdjustment = Math.round((desiredWeightChangeKgPerWeek * caloriesPerKgBodyWeight) / 7);

  if (goal === "lose_weight") {
    return Math.max(1200, tdee - dailyAdjustment);
  }

  if (goal === "gain_weight") {
    return tdee + dailyAdjustment;
  }

  return tdee;
}

export function calculateDefaultTargets(inputs: ProfileInputs): NutritionTargets {
  const bmr = calculateBmr(inputs);
  const tdee = calculateTdee(bmr, inputs.activityLevel);
  const calorieTarget = calculateCalorieTarget(
    tdee,
    inputs.goal,
    inputs.goal === "maintain_weight" ? 0 : inputs.desiredWeightChangeKgPerWeek
  );

  const proteinTargetG = roundToNearestFive(inputs.currentWeightKg * 1.6);
  const fatTargetG = roundToNearestFive((calorieTarget * 0.3) / 9);
  const proteinCalories = proteinTargetG * 4;
  const fatCalories = fatTargetG * 9;
  const carbohydrateTargetG = roundToNearestFive(
    Math.max(0, (calorieTarget - proteinCalories - fatCalories) / 4)
  );

  return {
    calorieTarget,
    proteinTargetG,
    carbohydrateTargetG,
    fatTargetG,
    saturatedFatLimitG: Math.round((calorieTarget * 0.1) / 9),
    fibreTargetG: 30,
    addedSugarLimitG: 25
  };
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5;
}
