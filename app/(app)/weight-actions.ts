"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function logWeight(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let weightKg: number;
  let note: string | null;

  try {
    weightKg = readWeight(formData, "weightKg");
    note = readOptionalString(formData, "note");
  } catch (error) {
    redirectWithMessage("/weight", getErrorMessage(error));
  }

  const { error } = await supabase.from("weight_logs").insert({
    user_id: user.id,
    weight_kg: weightKg,
    note
  });

  if (error) {
    redirectWithMessage("/weight", error.message);
  }

  await syncCurrentProfileWeight(supabase, user.id);
  revalidateWeightPaths();
  redirectWithMessage("/weight", "Weight logged.");
}

export async function updateWeightLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let logId: string;
  let weightKg: number;
  let note: string | null;

  try {
    logId = readRequiredString(formData, "logId");
    weightKg = readWeight(formData, "weightKg");
    note = readOptionalString(formData, "note");
  } catch (error) {
    redirectWithMessage("/weight", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("weight_logs")
    .update({
      weight_kg: weightKg,
      note
    })
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/weight", error.message);
  }

  await syncCurrentProfileWeight(supabase, user.id);
  revalidateWeightPaths();
  redirectWithMessage("/weight", "Weight updated.");
}

export async function deleteWeightLog(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let logId: string;

  try {
    logId = readRequiredString(formData, "logId");
  } catch (error) {
    redirectWithMessage("/weight", getErrorMessage(error));
  }

  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithMessage("/weight", error.message);
  }

  await syncCurrentProfileWeight(supabase, user.id);
  revalidateWeightPaths();
  redirectWithMessage("/weight", "Weight deleted.");
}

async function syncCurrentProfileWeight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ current_weight_kg: Number(data.weight_kg) })
    .eq("user_id", userId);

  if (profileError) {
    throw new Error(profileError.message);
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

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

function revalidateWeightPaths() {
  revalidatePath("/weight");
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

function readOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readWeight(formData: FormData, key: string) {
  const value = Number(readRequiredString(formData, key));

  if (!Number.isFinite(value) || value < 20 || value > 400) {
    throw new Error("Weight must be between 20 and 400 kg.");
  }

  return Math.round(value * 100) / 100;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
