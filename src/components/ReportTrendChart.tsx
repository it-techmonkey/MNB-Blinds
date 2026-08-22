import type { Granularity, TrendPoint } from "@/server/services/report.service";

function formatBucketLabel(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "day") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (granularity === "month") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return String(d.getUTCFullYear());
}

export function ReportTrendChart({ points, granularity }: { points: TrendPoint[]; granularity: Granularity }) {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[12px] bg-muted text-sm text-muted-foreground">
        No sales in this period.
      </div>
    );
  }

  const width = 960;
  const height = 220;
  const padding = 8;
  const baseline = height - 26;
  const barAreaTop = 14;
  const barAreaHeight = baseline - barAreaTop;
  const gap = points.length > 40 ? 2 : 6;
  const barWidth = Math.max(3, (width - padding * 2) / points.length - gap);
  const max = Math.max(...points.map((p) => Number(p.revenue)), 1);
  const labelEvery = Math.max(1, Math.ceil(points.length / 9));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue trend chart" className="h-56 w-full min-w-150">
        <line x1={padding} y1={baseline} x2={width - padding} y2={baseline} strokeWidth={1} style={{ stroke: "var(--border-strong)" }} />
        {points.map((p, i) => {
          const value = Number(p.revenue);
          const barHeight = max > 0 ? Math.max((value / max) * barAreaHeight, value > 0 ? 2 : 0) : 0;
          const x = padding + i * (barWidth + gap);
          const y = baseline - barHeight;
          const showLabel = i % labelEvery === 0 || i === points.length - 1;
          return (
            <g key={p.bucket}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} style={{ fill: "var(--primary)" }} opacity={0.85}>
                <title>{`${formatBucketLabel(p.bucket, granularity)}: $${value.toFixed(2)} · ${p.units} units`}</title>
              </rect>
              {showLabel ? (
                <text x={x + barWidth / 2} y={height - 8} fontSize={10} textAnchor="middle" style={{ fill: "var(--muted-foreground)" }}>
                  {formatBucketLabel(p.bucket, granularity)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
