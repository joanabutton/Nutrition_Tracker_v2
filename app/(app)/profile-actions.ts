"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { type ProfileInputs } from "@/lib/nutrition/targets";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const failurePath = getFailurePath(formData);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile: ProfileInputs;
  let payload: Record<string, string | number>;

  try {
    profile = parseProfileForm(formData);
    payload = {
      user_id: user.id,
      birth_date: profile.birthDate,
      sex: profile.sex,
      height_cm: profile.heightCm,
      current_weight_kg: profile.currentWeightKg,
      activity_level: profile.activityLevel,
      goal: profile.goal,
      desired_weight_change_kg_per_week: profile.desiredWeightChangeKgPerWeek,
      calorie_target: readRequiredNumber(formData, "calorieTarget"),
      protein_target_g: readRequiredNumber(formData, "proteinTargetG"),
      carbohydrate_target_g: readRequiredNumber(formData, "carbohydrateTargetG"),
      fat_target_g: readRequiredNumber(formData, "fatTargetG"),
      saturated_fat_limit_g: readRequiredNumber(formData, "saturatedFatLimitG"),
      fibre_target_g: readRequiredNumber(formData, "fibreTargetG"),
      added_sugar_limit_g: readRequiredNumber(formData, "addedSugarLimitG"),
      exercise_eat_back_percentage: readExerciseEatBackPercentage(formData)
    };
  } catch (error) {
    redirectWithMessage(failurePath, getErrorMessage(error));
  }

  const { error } = await supabase.from("profiles").upsert(
    payload,
    { onConflict: "user_id" }
  );

  if (error) {
    redirectWithMessage(failurePath, error.message);
  }

  revalidatePath("/today");
  revalidatePath("/settings");
  redirect("/today");
}

function getFailurePath(formData: FormData) {
  return formData.get("formMode") === "settings" ? "/settings" : "/onboarding";
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

function parseProfileForm(formData: FormData): ProfileInputs {
  return {
    birthDate: readRequiredString(formData, "birthDate"),
    sex: readEnum(formData, "sex", ["female", "male"]),
    heightCm: readRequiredNumber(formData, "heightCm"),
    currentWeightKg: readRequiredNumber(formData, "currentWeightKg"),
    activityLevel: readEnum(formData, "activityLevel", [
      "sedentary",
      "light",
      "moderate",
      "active",
      "very_active"
    ]),
    goal: readEnum(formData, "goal", ["lose_weight", "maintain_weight", "gain_weight"]),
    desiredWeightChangeKgPerWeek: readRequiredNumber(formData, "desiredWeightChangeKgPerWeek")
  };
}

function readRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readRequiredNumber(formData: FormData, key: string) {
  const rawValue = formData.get(key);
  const valueAsString = String(rawValue ?? "").trim();
  const value = Number(valueAsString);

  if (!valueAsString || !Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }

  return value;
}

function readEnum<T extends string>(formData: FormData, key: string, allowed: readonly T[]) {
  const value = String(formData.get(key) ?? "");

  if (!allowed.includes(value as T)) {
    throw new Error(`${key} is invalid.`);
  }

  return value as T;
}

function readExerciseEatBackPercentage(formData: FormData): 0 | 50 | 100 {
  const value = readEnum(formData, "exerciseEatBackPercentage", ["0", "50", "100"]);

  if (value === "100") {
    return 100;
  }

  if (value === "50") {
    return 50;
  }

  return 0;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong while saving.";
}
