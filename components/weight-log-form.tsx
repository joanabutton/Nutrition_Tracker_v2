import { logWeight } from "@/app/(app)/weight-actions";
import { type Profile } from "@/lib/profile";

type WeightLogFormProps = {
  profile: Profile | null;
};

export function WeightLogForm({ profile }: WeightLogFormProps) {
  return (
    <form action={logWeight} className="grid gap-3 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70">
      <div>
        <h2 className="text-lg font-semibold text-ink">Log weight</h2>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          A quick check-in is enough; the trend matters more than one reading.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Weight
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-ink/10 bg-white px-3">
          <input
            className="min-h-12 w-full bg-transparent py-2 text-base font-semibold text-ink outline-none"
            defaultValue={profile ? Number(profile.current_weight_kg) : undefined}
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
        <input className="field" name="note" placeholder="Optional" />
      </label>

      <button className="min-h-12 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-base font-semibold text-ink shadow-sm">
        Save weight
      </button>
    </form>
  );
}
