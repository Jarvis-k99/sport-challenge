export type PieSlice = {
  key: string | number;
  label: string;
  emoji?: string | null;
  value: number;
  color: string;
};

type Props = {
  slices: PieSlice[];
  /** Pixel diameter. */
  size?: number;
};

/**
 * Hand-rolled donut chart in pure SVG. No dependencies.
 *
 * - Single-slice case is rendered as a full circle (a 360° arc is
 *   degenerate for the path command, so we special-case it).
 * - Empty data renders a muted ring with an "empty" label.
 */
export default function PieChart({ slices, size = 200 }: Props) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const innerR = r * 0.55; // donut hole

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} role="img" aria-label="No activities logged yet">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.08} />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-neutral-400"
            fontSize={size * 0.08}
          >
            no data
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} role="img">
        {slices.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
            <circle cx={cx} cy={cy} r={innerR} fill="white" />
          </>
        ) : (
          (() => {
            let cursor = 0; // radians, starting from the top
            return slices.map((s) => {
              const fraction = s.value / total;
              const startAngle = cursor - Math.PI / 2;
              const endAngle = cursor + fraction * 2 * Math.PI - Math.PI / 2;
              cursor += fraction * 2 * Math.PI;

              const x1 = cx + r * Math.cos(startAngle);
              const y1 = cy + r * Math.sin(startAngle);
              const x2 = cx + r * Math.cos(endAngle);
              const y2 = cy + r * Math.sin(endAngle);
              const ix1 = cx + innerR * Math.cos(endAngle);
              const iy1 = cy + innerR * Math.sin(endAngle);
              const ix2 = cx + innerR * Math.cos(startAngle);
              const iy2 = cy + innerR * Math.sin(startAngle);
              const largeArc = fraction > 0.5 ? 1 : 0;

              const d = [
                `M ${x1} ${y1}`,
                `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${ix1} ${iy1}`,
                `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
                "Z",
              ].join(" ");

              return (
                <path
                  key={s.key}
                  d={d}
                  fill={s.color}
                  stroke="white"
                  strokeWidth={1.5}
                >
                  <title>
                    {s.label}: {s.value} ({Math.round(fraction * 100)}%)
                  </title>
                </path>
              );
            });
          })()
        )}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-neutral-900"
          fontSize={size * 0.14}
          fontWeight={700}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + size * 0.08}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-neutral-500"
          fontSize={size * 0.06}
        >
          sessions
        </text>
      </svg>

      <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        {slices.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <li key={s.key} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate text-neutral-700">
                  {s.emoji ? <span>{s.emoji} </span> : null}
                  {s.label}
                </span>
              </span>
              <span className="flex-shrink-0 text-xs text-neutral-500">
                {s.value} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
