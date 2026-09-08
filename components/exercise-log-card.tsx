import { deleteExerciseLog, updateExerciseLog } from "@/app/(app)/exercise-actions";

type ExerciseLogCardProps = {
  log: {
    id: string;
    type: string;
    duration_minutes: number | string | null;
    distance_km: number | string | null;
    calories_estimated: number | string;
    estimation_method: string;
    original_user_text: string | null;
  };
};

export function ExerciseLogCard({ log }: ExerciseLogCardProps) {
  const distanceKm = log.distance_km === null ? null : Number(log.distance_km);
  const durationMinutes = log.duration_minutes === null ? null : Number(log.duration_minutes);

  return (
    <details className="rounded-md border border-white/70 bg-white/82 px-4 py-3 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold capitalize text-ink">{log.type}</p>
            <p className="mt-1 text-sm text-ink/60">
              {formatExerciseDetail(distanceKm, durationMinutes)}
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">
            {Math.round(Number(log.calories_estimated))} kcal
          </p>
        </div>
      </summary>

      <div className="mt-3 border-t border-ink/10 pt-3">
        <p className="text-xs font-medium text-ink/55">
          Estimate: {formatEstimationMethod(log.estimation_method)}
        </p>
        {log.original_user_text ? (
          <p className="mt-1 text-xs text-ink/45">From: {log.original_user_text}</p>
        ) : null}

        <form action={updateExerciseLog} className="mt-3 grid gap-3">
          <input name="logId" type="hidden" value={log.id} />
          <input name="type" type="hidden" value="running" />
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Distance
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-ink/10 bg-white px-3">
                <input
                  className="min-h-11 w-full bg-transparent py-2 text-sm font-semibold text-ink outline-none"
                  defaultValue={distanceKm ?? ""}
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
                  defaultValue={durationMinutes ?? ""}
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
            Update
          </button>
        </form>

        <form action={deleteExerciseLog} className="mt-2">
          <input name="logId" type="hidden" value={log.id} />
          <button className="min-h-11 w-full rounded-md border border-tomato/20 bg-rose/70 px-3 text-sm font-semibold text-tomato">
            Delete exercise
          </button>
        </form>
      </div>
    </details>
  );
}

function formatExerciseDetail(distanceKm: number | null, durationMinutes: number | null) {
  const details = [];

  if (distanceKm !== null) {
    details.push(`${distanceKm} km`);
  }

  if (durationMinutes !== null) {
    details.push(`${Math.round(durationMinutes)} min`);
  }

  return details.length > 0 ? details.join(" · ") : "No distance or duration";
}

function formatEstimationMethod(value: string) {
  if (value === "running_distance_kcal_per_kg_km") {
    return "distance x body weight";
  }

  if (value === "running_duration_met_8_3") {
    return "duration x running MET";
  }

  return value;
}
