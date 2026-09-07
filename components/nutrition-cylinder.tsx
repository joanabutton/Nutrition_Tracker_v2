type CylinderKind = "target" | "limit" | "calories";

type NutritionCylinderProps = {
  label: string;
  value: number;
  target: number;
  unit: string;
  kind: CylinderKind;
};

export function NutritionCylinder({ label, value, target, unit, kind }: NutritionCylinderProps) {
  const ratio = target > 0 ? value / target : 0;
  const fillPercentage = Math.max(0, Math.min(ratio, 1.15)) * 100;
  const isOverLimit = kind === "limit" && ratio > 1;
  const isCalories = kind === "calories";

  return (
    <div
      className={
        isCalories
          ? "rounded-lg bg-white/85 px-3 py-3 shadow-soft ring-1 ring-white/70"
          : "rounded-md bg-white/75 px-1.5 py-2.5 ring-1 ring-white/65"
      }
    >
      <div className="grid justify-items-center gap-2">
        <div
          className={[
            "relative overflow-hidden border border-ink/15 bg-oat",
            isCalories
              ? "h-48 w-14 rounded-b-2xl rounded-t-md shadow-inner"
              : "h-20 w-7 rounded-b-xl rounded-t"
          ].join(" ")}
          aria-hidden="true"
        >
          <div className="absolute inset-x-1 top-1 h-3 rounded-[50%] border border-white/70 bg-white/40" />
          <div
            className={[
              "absolute inset-x-0 bottom-0 transition-all duration-500",
              isOverLimit
                ? "bg-gradient-to-t from-tomato to-rose"
                : kind === "target"
                  ? "bg-gradient-to-t from-blue to-aqua"
                  : "bg-gradient-to-t from-moss to-mint"
            ].join(" ")}
            style={{ height: `${fillPercentage}%` }}
          >
            <div className="h-4 rounded-[50%] bg-white/25" />
          </div>
        </div>

        <div className="max-w-full text-center">
          <p className={isCalories ? "text-sm font-semibold text-ink" : "text-[0.7rem] font-semibold leading-tight text-ink"}>
            {label}
          </p>
          <p
            className={
              isCalories
                ? "mt-1 text-xl font-semibold text-ink"
                : "mt-0.5 text-base font-semibold leading-tight text-ink"
            }
          >
            {Math.round(value)}
            <span
              className={
                isCalories
                  ? "ml-0.5 text-xs font-medium text-ink/55"
                  : "ml-0.5 text-[0.65rem] font-medium text-ink/55"
              }
            >
              {unit}
            </span>
          </p>
          <p className={isCalories ? "mt-1 text-xs text-ink/55" : "mt-0.5 text-[0.65rem] leading-tight text-ink/55"}>
            {kind === "limit" ? "Limit" : "Target"} {Math.round(target)}
            {unit ? ` ${unit}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
