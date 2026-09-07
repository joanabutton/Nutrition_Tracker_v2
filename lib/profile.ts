import { createClient } from "@/lib/supabase/server";

export type Profile = {
  user_id: string;
  birth_date: string;
  sex: "female" | "male";
  height_cm: number;
  current_weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose_weight" | "maintain_weight" | "gain_weight";
  desired_weight_change_kg_per_week: number;
  calorie_target: number;
  protein_target_g: number;
  carbohydrate_target_g: number;
  fat_target_g: number;
  saturated_fat_limit_g: number;
  fibre_target_g: number;
  added_sugar_limit_g: number;
  exercise_eat_back_percentage: 0 | 50 | 100;
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id,birth_date,sex,height_cm,current_weight_kg,activity_level,goal,desired_weight_change_kg_per_week,calorie_target,protein_target_g,carbohydrate_target_g,fat_target_g,saturated_fat_limit_g,fibre_target_g,added_sugar_limit_g,exercise_eat_back_percentage"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}
