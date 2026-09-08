import { deleteWeightLog, updateWeightLog } from "@/app/(app)/weight-actions";
import { formatWeightDate, type WeightLog } from "@/lib/weight";

type WeightLogCardProps = {
  log: WeightLog;
};

export function WeightLogCard({ log }: WeightLogCardProps) {
  return (
    <details className="rounded-md border border-white/70 bg-white/82 px-4 py-3 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{formatWeightDate(log.logged_at)}</p>
            {log.note ? <p className="mt-1 text-sm text-ink/55">{log.note}</p> : null}
          </div>
          <p className="text-sm font-semibold text-ink">{Number(log.weight_kg).toFixed(1)} kg</p>
        </div>
      </summary>

      <div className="mt-3 border-t border-ink/10 pt-3">
        <form action={updateWeightLog} className="grid gap-3">
          <input name="logId" type="hidden" value={log.id} />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Weight
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-ink/10 bg-white px-3">
              <input
                className="min-h-11 w-full bg-transparent py-2 text-sm font-semibold text-ink outline-none"
                defaultValue={Number(log.weight_kg)}
                min="20"
                name="weightKg"
                required
                step="0.1"
                type="number"
              />
              <span className="text-sm font-medium text-ink/55">kg</span>
            </div>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Note
            <input className="field" defaultValue={log.note ?? ""} name="note" />
          </label>
          <button className="min-h-11 rounded-md bg-mint px-3 text-sm font-semibold text-ink shadow-sm">
            Update
          </button>
        </form>

        <form action={deleteWeightLog} className="mt-2">
          <input name="logId" type="hidden" value={log.id} />
          <button className="min-h-11 w-full rounded-md border border-tomato/20 bg-rose/70 px-3 text-sm font-semibold text-tomato">
            Delete weight
          </button>
        </form>
      </div>
    </details>
  );
}
