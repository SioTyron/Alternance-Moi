// components/Sparkline.tsx
// Mini-graphe d'évolution (sparkline) sans dépendance.

type Props = {
  data: number[];      // valeurs (ex. moyenne cumulée /20)
  width?: number;
  height?: number;
  max?: number;
  className?: string;
};

export default function Sparkline({ data, width = 132, height = 40, max = 20, className }: Props) {
  if (!data || data.length < 2) return null;

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const n = data.length;

  const x = (i: number) => pad + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => pad + h - (Math.max(0, Math.min(max, v)) / max) * h;

  const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)},${(pad + h).toFixed(1)} L ${x(0).toFixed(1)},${(pad + h).toFixed(1)} Z`;

  const last = data[n - 1];
  const first = data[0];
  const up = last >= first;
  const stroke = up ? '#2563eb' : '#f43f5e';
  const gradId = `spark-${up ? 'up' : 'down'}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Repère à 10/20 */}
      <line x1={pad} x2={width - pad} y1={y(max / 2)} y2={y(max / 2)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(last)} r="3" fill={stroke} />
    </svg>
  );
}
