"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  calculateDefaultTargets,
  type ActivityLevel,
  type NutritionGoal,
  type NutritionTargets,
  type ProfileInputs,
  type Sex
} from "@/lib/nutrition/targets";
import type { Profile } from "@/lib/profile";

type ProfileFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message?: string;
  mode: "onboarding" | "settings";
  profile?: Profile;
};

const defaultInputs: ProfileInputs = {
  birthDate: "1990-01-01",
  sex: "female",
  heightCm: 165,
  currentWeightKg: 70,
  activityLevel: "light",
  goal: "lose_weight",
  desiredWeightChangeKgPerWeek: 0.25
};

export function ProfileForm({ action, message, mode, profile }: ProfileFormProps) {
  const initialInputs = profile
    ? {
        birthDate: profile.birth_date,
        sex: profile.sex,
        heightCm: Number(profile.height_cm),
        currentWeightKg: Number(profile.current_weight_kg),
        activityLevel: profile.activity_level,
        goal: profile.goal,
        desiredWeightChangeKgPerWeek: Number(profile.desired_weight_change_kg_per_week)
      }
    : defaultInputs;

  const [inputs, setInputs] = useState<ProfileInputs>(initialInputs);
  const [targets, setTargets] = useState<NutritionTargets>(
    profile
      ? {
          calorieTarget: Number(profile.calorie_target),
          proteinTargetG: Number(profile.protein_target_g),
          carbohydrateTargetG: Number(profile.carbohydrate_target_g),
          fatTargetG: Number(profile.fat_target_g),
          saturatedFatLimitG: Number(profile.saturated_fat_limit_g),
          fibreTargetG: Number(profile.fibre_target_g),
          addedSugarLimitG: Number(profile.added_sugar_limit_g)
        }
      : calculateDefaultTargets(defaultInputs)
  );
  const [targetsFollowRecommendation, setTargetsFollowRecommendation] = useState(!profile);

  const recommendedTargets = useMemo(
    () => safeCalculateTargets(inputs, targets),
    [inputs, targets]
  );

  function updateInput<Key extends keyof ProfileInputs>(key: Key, value: ProfileInputs[Key]) {
    setInputs((currentInputs) => {
      const nextInputs = { ...currentInputs, [key]: value };

      if (targetsFollowRecommendation) {
        setTargets((currentTargets) => safeCalculateTargets(nextInputs, currentTargets));
      }

      return nextInputs;
    });
  }

  function updateTarget<Key extends keyof NutritionTargets>(key: Key, value: number) {
    setTargets((current) => ({ ...current, [key]: value }));
    setTargetsFollowRecommendation(false);
  }

  function useRecommendation() {
    setTargets(recommendedTargets);
    setTargetsFollowRecommendation(true);
  }

  function updateGoal(goal: NutritionGoal) {
    setInputs((currentInputs) => {
      const nextInputs = {
        ...currentInputs,
        goal,
        desiredWeightChangeKgPerWeek:
          goal === "maintain_weight" ? 0 : currentInputs.desiredWeightChangeKgPerWeek
      };

      if (targetsFollowRecommendation) {
        setTargets((currentTargets) => safeCalculateTargets(nextInputs, currentTargets));
      }

      return nextInputs;
    });
  }

  return (
    <form action={action} className="grid gap-5">
      <input name="formMode" type="hidden" value={mode} />

      <div className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-sm font-medium text-moss">
          {mode === "onboarding" ? "Profile setup" : "Profile"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">
          {mode === "onboarding" ? "Set your starting targets" : "Edit your targets"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Recommendations use the Mifflin-St Jeor BMR equation, an activity multiplier, and a
          weekly weight-change adjustment. You can override every target before saving.
        </p>
        {message ? (
          <p className="mt-4 rounded-md border border-tomato/30 bg-tomato/10 px-3 py-2 text-sm text-tomato">
            {message}
          </p>
        ) : null}
      </div>

      <section className="grid gap-4 rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-ink">About you</h3>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Birth date
          <input
            className="field"
            name="birthDate"
            type="date"
            value={inputs.birthDate}
            onChange={(event) => updateInput("birthDate", event.target.value)}
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Sex
          <select
            className="field"
            name="sex"
            value={inputs.sex}
            onChange={(event) => updateInput("sex", event.target.value as Sex)}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Height
            <input
              className="field"
              name="heightCm"
              type="number"
              min="120"
              max="230"
              step="0.1"
              value={inputs.heightCm}
              onChange={(event) => updateInput("heightCm", Number(event.target.value))}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Weight
            <input
              className="field"
              name="currentWeightKg"
              type="number"
              min="35"
              max="250"
              step="0.1"
              value={inputs.currentWeightKg}
              onChange={(event) => updateInput("currentWeightKg", Number(event.target.value))}
              required
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Activity level
          <select
            className="field"
            name="activityLevel"
            value={inputs.activityLevel}
            onChange={(event) => updateInput("activityLevel", event.target.value as ActivityLevel)}
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </select>
        </label>
      </section>

      <section className="grid gap-4 rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-ink">Goal</h3>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Direction
          <select
            className="field"
            name="goal"
            value={inputs.goal}
            onChange={(event) => updateGoal(event.target.value as NutritionGoal)}
          >
            <option value="lose_weight">Lose weight</option>
            <option value="maintain_weight">Maintain weight</option>
            <option value="gain_weight">Gain weight</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Weekly rate
          <input
            className="field"
            name="desiredWeightChangeKgPerWeek"
            type="number"
            min="0"
            max="1.5"
            step="0.05"
            value={inputs.desiredWeightChangeKgPerWeek}
            onChange={(event) =>
              updateInput("desiredWeightChangeKgPerWeek", Number(event.target.value))
            }
            readOnly={inputs.goal === "maintain_weight"}
          />
        </label>
      </section>

      <section className="grid gap-4 rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Nutrition targets</h3>
            <p className="mt-1 text-sm text-ink/65">
              Recommended calories: {recommendedTargets.calorieTarget} kcal
            </p>
          </div>
          <button
            className="min-h-11 rounded-md border border-ink/15 px-3 text-sm font-semibold text-ink"
            type="button"
            onClick={useRecommendation}
          >
            Use recommended
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Calories"
            name="calorieTarget"
            value={targets.calorieTarget}
            onChange={updateTarget}
          />
          <NumberField
            label="Protein g"
            name="proteinTargetG"
            value={targets.proteinTargetG}
            onChange={updateTarget}
          />
          <NumberField
            label="Carbs g"
            name="carbohydrateTargetG"
            value={targets.carbohydrateTargetG}
            onChange={updateTarget}
          />
          <NumberField
            label="Fat g"
            name="fatTargetG"
            value={targets.fatTargetG}
            onChange={updateTarget}
          />
          <NumberField
            label="Sat fat g"
            name="saturatedFatLimitG"
            value={targets.saturatedFatLimitG}
            onChange={updateTarget}
          />
          <NumberField
            label="Fibre g"
            name="fibreTargetG"
            value={targets.fibreTargetG}
            onChange={updateTarget}
          />
          <NumberField
            label="Added sugar g"
            name="addedSugarLimitG"
            value={targets.addedSugarLimitG}
            onChange={updateTarget}
          />
        </div>

        <label className="grid gap-2 text-sm font-medium text-ink">
          Eat back exercise calories
          <select
            className="field"
            name="exerciseEatBackPercentage"
            defaultValue={profile?.exercise_eat_back_percentage ?? 50}
          >
            <option value="0">0%</option>
            <option value="50">50%</option>
            <option value="100">100%</option>
          </select>
        </label>
      </section>

      <SubmitButton label={mode === "onboarding" ? "Save and continue" : "Save changes"} />
    </form>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange
}: {
  label: string;
  name: keyof NutritionTargets;
  value: number;
  onChange: (name: keyof NutritionTargets, value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        className="field"
        name={name}
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(name, Number(event.target.value))}
        required
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-12 rounded-md bg-ink px-4 text-base font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function safeCalculateTargets(inputs: ProfileInputs, fallback: NutritionTargets) {
  try {
    return calculateDefaultTargets(inputs);
  } catch {
    return fallback;
  }
}
