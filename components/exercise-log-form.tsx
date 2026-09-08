import { logExerciseFromText, logManualExercise } from "@/app/(app)/exercise-actions";

export function ExerciseLogForm() {
  return (
    <div className="grid gap-3" id="log-exercise">
      <form action={logExerciseFromText} className="grid gap-2 rounded-md bg-white/65 p-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Describe exercise
          <input
            className="field"
            name="exerciseText"
            placeholder="Ran 4 km in 30 minutes"
            required
          />
        </label>
        <button className="min-h-11 rounded-md bg-gradient-to-r from-aqua via-mint to-butter px-3 text-sm font-semibold text-ink shadow-sm">
          Log exercise
        </button>
      </form>

      <details className="rounded-md border border-white/70 bg-white/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Or enter details
        </summary>
        <form action={logManualExercise} className="mt-3 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Type
            <select className="field" name="type" required>
              <option value="running">Running</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
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
          <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
            Save exercise
          </button>
        </form>
      </details>
    </div>
  );
}
