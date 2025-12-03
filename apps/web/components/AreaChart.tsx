'use client';

interface AreaPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  points: AreaPoint[];
  height?: number;
  color?: string;
}

export default function AreaChart({ points, height = 160, color = '#1DB954' }: AreaChartProps) {
  if (!points.length) {
    return <p className="text-[#B3B3B3]">No data yet.</p>;
  }

  const max = Math.max(...points.map((point) => point.value));
  const viewHeight = height + 20;
  const denominator = Math.max(points.length - 1, 1);
  const path = points
    .map((point, index) => {
      const x = (index / denominator) * 100;
      const y = height - (point.value / (max || 1)) * height;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  const areaPath = `${path} L100,${height} L0,${height} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg
        width="100%"
        height={viewHeight}
        viewBox={`0 0 100 ${viewHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Activity area chart"
        className="block max-w-full overflow-visible"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGradient)" stroke="none" />
        <path d={path} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => {
          const x = (index / denominator) * 100;
          const y = height - (point.value / (max || 1)) * height;
          return <circle key={point.label} cx={x} cy={y} r={3} fill={color} className="hover:r-4 transition-all duration-200" />;
        })}
      </svg>
    </div>
  );
}
