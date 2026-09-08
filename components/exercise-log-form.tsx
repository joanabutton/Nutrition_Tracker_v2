"use client";

import { useState } from "react";

import { logManualExercise } from "@/app/(app)/exercise-actions";
import { exerciseOptions, type ExerciseType } from "@/lib/nutrition/exercise";

export function ExerciseLogForm() {
  const [type, setType] = useState<ExerciseType>("running");
  const exercise = exerciseOptions.find((option) => option.type === type);

  return (
    <div className="grid gap-3" id="log-exercise">
      <form action={logManualExercise} className="grid gap-3 rounded-md bg-white/65 p-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Type
          <select
            className="field"
            name="type"
            onChange={(event) => setType(event.target.value as ExerciseType)}
            required
            value={type}
          >
            {exerciseOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className={exercise?.supportsDistance ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
          {exercise?.supportsDistance ? (
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Distance
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-ink/10 bg-white px-3">
                <input
                  className="min-h-11 w-full bg-transparent py-2 text-sm font-semibold text-ink outline-none"
                  min="0.01"
                  name="distanceKm"
                  step="0.01"
                  type="number"
                />
                <span className="text-sm font-medium text-ink/55">km</span>
              </div>
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Duration
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-ink/10 bg-white px-3">
              <input
                className="min-h-11 w-full bg-transparent py-2 text-sm font-semibold text-ink outline-none"
                min="0.01"
                name="durationMinutes"
                step="1"
                type="number"
              />
              <span className="text-sm font-medium text-ink/55">min</span>
            </div>
          </label>
        </div>
        <button className="min-h-11 rounded-md bg-gradient-to-r from-aqua via-mint to-butter px-3 text-sm font-semibold text-ink shadow-sm">
          Save exercise
        </button>
      </form>
    </div>
  );
}
