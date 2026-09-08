"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  estimateExerciseCalories,
  parseRunningExerciseText,
  readExerciseType
} from "@/lib/nutrition/exercise";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function logExerciseFromText(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const profile = await requireProfile();
  let parsed: ReturnType<typeof parseRunningExerciseText>;

  try {
    parsed = parseRunningExerciseText(readRequiredString(formData, "exerciseText"));
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  try {
    const estimate = estimateExerciseCalories({
      type: parsed.type,
      distanceKm: parsed.distanceKm,
      durationMinutes: parsed.durationMinutes,
      weightKg: Number(profile.current_weight_kg)
    });

    await insertExerciseLog(supabase, {
      userId: user.id,
      type: parsed.type,
      distanceKm: parsed.distanceKm,
      durationMinutes: parsed.durationMinutes,
      originalText: parsed.originalText,
      ...estimate
    });
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  revalidateExercisePaths();
  redirectWithMessage("/today#log-exercise", "Exercise logged.");
}

export async function logManualExercise(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const profile = await requireProfile();
  let type: ReturnType<typeof readExerciseType>;
  let distanceKm: number | null;
  let durationMinutes: number | null;

  try {
    type = readExerciseType(readRequiredString(formData, "type"));
    distanceKm = readOptionalPositiveNumber(formData, "distanceKm");
    durationMinutes = readOptionalPositiveNumber(formData, "durationMinutes");
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  if (distanceKm === null && durationMinutes === null) {
    redirectWithMessage("/today#log-exercise", "Add a distance, duration, or both.");
  }

  try {
    const estimate = estimateExerciseCalories({
      type,
      distanceKm,
      durationMinutes,
      weightKg: Number(profile.current_weight_kg)
    });

    await insertExerciseLog(supabase, {
      userId: user.id,
      type,
      distanceKm,
      durationMinutes,
      originalText: null,
      ...estimate
    });
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  revalidateExercisePaths();
  redirectWithMessage("/today#log-exercise", "Exercise logged.");
}

export async function updateExerciseLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const profile = await requireProfile();
  let logId: string;
  let type: ReturnType<typeof readExerciseType>;
  let distanceKm: number | null;
  let durationMinutes: number | null;

  try {
    logId = readRequiredString(formData, "logId");
    type = readExerciseType(readRequiredString(formData, "type"));
    distanceKm = readOptionalPositiveNumber(formData, "distanceKm");
    durationMinutes = readOptionalPositiveNumber(formData, "durationMinutes");
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  if (distanceKm === null && durationMinutes === null) {
    redirectWithMessage("/today#log-exercise", "Add a distance, duration, or both.");
  }

  try {
    const estimate = estimateExerciseCalories({
      type,
      distanceKm,
      durationMinutes,
      weightKg: Number(profile.current_weight_kg)
    });
    const { error } = await supabase
      .from("exercise_logs")
      .update({
        type,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        calories_estimated: estimate.caloriesEstimated,
        estimation_method: estimate.estimationMethod
      })
      .eq("id", logId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  revalidateExercisePaths();
  redirectWithMessage("/today#log-exercise", "Exercise updated.");
}

export async function deleteExerciseLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let logId: string;

  try {
    logId = readRequiredString(formData, "logId");
  } catch (error) {
    redirectWithMessage("/today#log-exercise", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("exercise_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/today#log-exercise", error.message);
  }

  revalidateExercisePaths();
  redirectWithMessage("/today#log-exercise", "Exercise deleted.");
}

async function insertExerciseLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    userId: string;
    type: string;
    distanceKm: number | null;
    durationMinutes: number | null;
    caloriesEstimated: number;
    estimationMethod: string;
    originalText: string | null;
  }
) {
  const { error } = await supabase.from("exercise_logs").insert({
    user_id: input.userId,
    type: input.type,
    duration_minutes: input.durationMinutes,
    distance_km: input.distanceKm,
    calories_estimated: input.caloriesEstimated,
    estimation_method: input.estimationMethod,
    original_user_text: input.originalText
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  return profile;
}

function redirectWithMessage(path: string, message: string): never {
  const [pathname, hash] = path.split("#");
  redirect(`${pathname}?message=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`);
}

function revalidateExercisePaths() {
  revalidatePath("/today");
  revalidatePath("/settings");
}

function readRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readOptionalPositiveNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) {
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${key} must be greater than zero.`);
  }

  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
