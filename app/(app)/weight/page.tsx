import { redirect } from "next/navigation";

import { WeightGraph } from "@/components/weight-graph";
import { WeightLogCard } from "@/components/weight-log-card";
import { WeightLogForm } from "@/components/weight-log-form";
import { getCurrentProfile } from "@/lib/profile";
import { getWeightTrend } from "@/lib/weight";

type WeightPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function WeightPage({ searchParams }: WeightPageProps) {
  const { message } = await searchParams;
  const [profile, trend] = await Promise.all([getCurrentProfile(), getWeightTrend()]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Weight</h1>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Track the direction over time, not the noise of a single day.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-mint/70 px-3 py-2 text-sm font-medium text-moss">
          {message}
        </p>
      ) : null}

      <WeightLogForm profile={profile} />

      <section className="grid gap-3 rounded-lg bg-white/70 p-4 shadow-soft ring-1 ring-white/70">
        <h2 className="text-lg font-semibold text-ink">Trend</h2>
        <div className="grid grid-cols-3 gap-2">
          <TrendTile
            label="Latest"
            value={trend.latestWeightKg === null ? "--" : `${trend.latestWeightKg.toFixed(1)} kg`}
          />
          <TrendTile
            label="7-day avg"
            value={
              trend.sevenDayAverageKg === null ? "--" : `${trend.sevenDayAverageKg.toFixed(1)} kg`
            }
          />
          <TrendTile label="30-day" value={formatTrendValue(trend.thirtyDayTrendKg)} />
        </div>
        <WeightGraph logs={trend.history} />
      </section>

      <section className="grid gap-3 rounded-lg bg-white/70 p-4 shadow-soft ring-1 ring-white/70">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">History</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/60">
            {trend.history.length}
          </span>
        </div>

        {trend.history.length > 0 ? (
          <div className="grid gap-2">
            {trend.history.map((log) => (
              <WeightLogCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-ink/15 bg-white/65 px-4 py-5">
            <p className="text-sm font-semibold text-ink">No weights logged yet</p>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Add your first check-in above and trend summaries will appear here.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function TrendTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/75 px-3 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatTrendValue(value: number | null) {
  if (value === null) {
    return "--";
  }

  if (value > 0) {
    return `+${value.toFixed(1)} kg`;
  }

  return `${value.toFixed(1)} kg`;
}
