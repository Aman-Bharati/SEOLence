interface ScoreGaugeProps {
  score: number;
  label: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
  if (score >= 80) return { stroke: "#34d399", text: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/5" };
  if (score >= 60) return { stroke: "#fbbf24", text: "text-amber-400", bg: "from-amber-500/20 to-amber-500/5" };
  if (score >= 40) return { stroke: "#fb923c", text: "text-orange-400", bg: "from-orange-500/20 to-orange-500/5" };
  return { stroke: "#fb7185", text: "text-rose-400", bg: "from-rose-500/20 to-rose-500/5" };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

export function ScoreGauge({ score, label, sublabel, size = "md" }: ScoreGaugeProps) {
  const dims = {
    sm: { w: 120, h: 120, stroke: 8, font: "text-2xl" },
    md: { w: 160, h: 160, stroke: 10, font: "text-4xl" },
    lg: { w: 200, h: 200, stroke: 12, font: "text-5xl" },
  }[size];

  const colors = getScoreColor(score);
  const radius = (dims.w - dims.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative bg-gradient-to-b ${colors.bg} rounded-2xl p-2`}>
        <svg width={dims.w} height={dims.h} className="-rotate-90">
          <circle
            cx={dims.w / 2}
            cy={dims.h / 2}
            r={radius}
            fill="none"
            stroke="rgba(30, 41, 59, 0.6)"
            strokeWidth={dims.stroke}
          />
          <circle
            cx={dims.w / 2}
            cy={dims.h / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={dims.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${colors.stroke}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-bold ${dims.font} ${colors.text}`}>
            {Math.round(score)}
          </span>
          <span className="text-xs text-slate-500 font-medium mt-0.5">
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
