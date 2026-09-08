import {
  aggregateExerciseCalories,
  aggregateFoodLogs,
  calculateExerciseAdjustment,
  calculateRemainingCalories
} from "@/lib/nutrition/aggregation";
import { getTodayRange } from "@/lib/date/today";
import { getAppTimeZone } from "@/lib/env";
import { getFoods, getRecentFoods } from "@/lib/foods";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type DashboardData = Awaited<ReturnType<typeof getTodayDashboard>>;

export async function getTodayDashboard() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return { profile: null };
  }

  const { start, end, label } = getTodayRange(getAppTimeZone());

  const [
    { data: foodLogs, error: foodLogsError },
    { data: exerciseLogs, error: exerciseLogsError },
    foods,
    recentFoods
  ] =
    await Promise.all([
      supabase
        .from("food_logs")
        .select(
          "id,logged_at,meal_type,display_name,quantity,unit,calories,protein_g,carbohydrate_g,fat_g,saturated_fat_g,fibre_g,added_sugar_g,nutrition_source"
        )
        .eq("user_id", user.id)
        .gte("logged_at", start.toISOString())
        .lt("logged_at", end.toISOString())
        .order("logged_at", { ascending: false }),
      supabase
        .from("exercise_logs")
        .select(
          "id,logged_at,type,duration_minutes,distance_km,calories_estimated,estimation_method,original_user_text"
        )
        .eq("user_id", user.id)
        .gte("logged_at", start.toISOString())
        .lt("logged_at", end.toISOString())
        .order("logged_at", { ascending: false }),
      getFoods(),
      getRecentFoods()
    ]);

  if (foodLogsError) {
    throw new Error(foodLogsError.message);
  }

  if (exerciseLogsError) {
    throw new Error(exerciseLogsError.message);
  }

  const foodTotals = aggregateFoodLogs(foodLogs ?? []);
  const exerciseCalories = aggregateExerciseCalories(exerciseLogs ?? []);
  const exerciseAdjustment = calculateExerciseAdjustment(
    exerciseCalories,
    profile.exercise_eat_back_percentage
  );
  const remainingCalories = calculateRemainingCalories(
    Number(profile.calorie_target),
    foodTotals.calories,
    exerciseAdjustment
  );

  return {
    profile,
    dateLabel: label,
    foodLogs: foodLogs ?? [],
    exerciseLogs: exerciseLogs ?? [],
    foods,
    recentFoods,
    foodTotals,
    exerciseCalories,
    exerciseAdjustment,
    remainingCalories
  };
}
