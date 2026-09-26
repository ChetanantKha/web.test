import { STAT_AXIS_LABEL, type StatAxis } from "@/lib/skillTricks";

const AXES: { key: StatAxis; angle: number }[] = [
  { key: "forward", angle: -90 },
  { key: "turning", angle: 0 },
  { key: "breaking", angle: 90 },
  { key: "backward", angle: 180 },
];

function pointAt(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/** Hand-rolled SVG radar (no charting library — this repo has none, and 4 fixed axes don't
 *  need one) mapping the four skill stat axes onto a Ragnarok-style stat wheel. */
export default function StatRadarChart({ scores, size = 260 }: { scores: Record<StatAxis, number>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.3;
  const rings = [0.25, 0.5, 0.75, 1];

  const dataPoints = AXES.map(({ key, angle }) => pointAt(angle, (Math.max(0, Math.min(100, scores[key])) / 100) * maxR, cx, cy));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full"
      style={{ maxWidth: size }}
      role="img"
      aria-label="กราฟสเตตัสความคล่องตัว"
    >
      {rings.map((r) => (
        <polygon
          key={r}
          points={AXES.map(({ angle }) => {
            const p = pointAt(angle, r * maxR, cx, cy);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}

      {AXES.map(({ key, angle }) => {
        const end = pointAt(angle, maxR, cx, cy);
        const labelPos = pointAt(angle, maxR + 20, cx, cy);
        return (
          <g key={key}>
            <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="#1e3a8a">
              {STAT_AXIS_LABEL[key]}
            </text>
          </g>
        );
      })}

      <polygon points={dataPath} fill="#f97316" fillOpacity={0.35} stroke="#ea580c" strokeWidth={2} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#ea580c" />
      ))}
    </svg>
  );
}
