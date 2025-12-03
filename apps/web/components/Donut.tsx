'use client';

interface DonutSegment {
  label: string;
  pct: number;
  color: string;
}

interface DonutProps {
  segments: DonutSegment[];
  size?: number;
}

export default function Donut({ segments, size = 160 }: DonutProps) {
  const gradient = segments
    .reduce<{ start: number; end: number; color: string }[]>((acc, segment) => {
      const start = acc.length ? acc[acc.length - 1].end : 0;
      const end = start + segment.pct * 360;
      return acc.concat({ start, end, color: segment.color });
    }, [])
    .map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`)
    .join(', ');

  return (
    <div className="flex items-center gap-8 flex-wrap">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
        }}
        className="relative shrink-0"
      >
        <div
          style={{
            width: size * 0.6,
            height: size * 0.6,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#181818]"
        />
      </div>
      <ul className="space-y-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-3 text-sm text-[#B3B3B3]">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="font-medium text-white">{segment.label}</span>
            <span>{(segment.pct * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
