import { formatWeightDate, type WeightLog } from "@/lib/weight";

type WeightGraphProps = {
  logs: WeightLog[];
};

const width = 320;
const height = 180;
const padding = 24;

export function WeightGraph({ logs }: WeightGraphProps) {
  const points = [...logs]
    .sort((first, second) => Date.parse(first.logged_at) - Date.parse(second.logged_at))
    .slice(-30);

  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-ink/15 bg-white/65 px-4 py-5">
        <p className="text-sm font-semibold text-ink">Trend graph needs two entries</p>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Once you log another weight, the graph will focus on the direction rather than one reading.
        </p>
      </div>
    );
  }

  const weights = points.map((log) => Number(log.weight_kg));
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = Math.max(maxWeight - minWeight, 1);
  const firstTime = Date.parse(points[0].logged_at);
  const lastTime = Date.parse(points.at(-1)?.logged_at ?? points[0].logged_at);
  const timeRange = Math.max(lastTime - firstTime, 1);
  const coordinates = points.map((log) => {
    const x = padding + ((Date.parse(log.logged_at) - firstTime) / timeRange) * (width - padding * 2);
    const y =
      height -
      padding -
      ((Number(log.weight_kg) - minWeight) / range) * (height - padding * 2);

    return { x, y, log };
  });
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="rounded-lg bg-white/75 p-3 shadow-sm ring-1 ring-white/70">
      <svg aria-label="Weight trend graph" className="h-auto w-full" viewBox={`0 0 ${width} ${height}`}>
        <line
          className="stroke-ink/10"
          x1={padding}
          x2={width - padding}
          y1={height - padding}
          y2={height - padding}
        />
        <line
          className="stroke-ink/10"
          x1={padding}
          x2={padding}
          y1={padding}
          y2={height - padding}
        />
        <path className="fill-none stroke-moss" d={path} strokeLinecap="round" strokeWidth="3" />
        {coordinates.map((point) => (
          <circle
            className="fill-lilac stroke-white"
            cx={point.x}
            cy={point.y}
            key={point.log.id}
            r="4"
            strokeWidth="2"
          />
        ))}
        <text className="fill-ink/45 text-[10px]" x={padding} y={height - 6}>
          {formatWeightDate(points[0].logged_at)}
        </text>
        <text className="fill-ink/45 text-[10px]" textAnchor="end" x={width - padding} y={height - 6}>
          {formatWeightDate(points.at(-1)?.logged_at ?? points[0].logged_at)}
        </text>
      </svg>
    </div>
  );
}
