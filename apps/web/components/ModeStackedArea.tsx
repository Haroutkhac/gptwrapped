'use client';

import type { ModeSeriesPoint } from '@/types/data';

interface Props {
  data: ModeSeriesPoint[];
}

const COLORS = ['#1DB954', '#1ed760', '#b3b3b3', '#535353', '#ffffff', '#282828']; // Spotify palette variants? Maybe stick to colored for distinct modes but muted.

// Let's keep colorful for modes but ensure they pop on dark
const MODE_COLORS = ['#1DB954', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#ec4899'];

export default function ModeStackedArea({ data }: Props) {
  if (!data.length) return <p className="text-[#B3B3B3]">No mode breakdown yet.</p>;
  const modes = Array.from(new Set(data.flatMap((point) => point.breakdown.map((item) => item.mode))));
  const totals = data.map((point) => point.breakdown.reduce((acc, item) => acc + item.messages, 0));
  const height = 220;
  const xForIndex = (index: number) => (index / (Math.max(1, data.length - 1))) * 100;

  const cumulativeStarts = Array.from({ length: data.length }, () => 0);
  const stacks = modes.map((mode, modeIndex) => {
    const segments = data.map((point, index) => {
      const total = totals[index] || 1;
      const entry = point.breakdown.find((item) => item.mode === mode);
      const value = entry ? entry.messages / total : 0;
      const start = cumulativeStarts[index];
      const end = start + value;
      cumulativeStarts[index] = end;
      return { start, end };
    });
    return { mode, segments, color: MODE_COLORS[modeIndex % MODE_COLORS.length] };
  });

  const paths = stacks.map((stack) => {
    const top = stack.segments
      .map((segment, index) => {
        const x = xForIndex(index);
        const y = height * (1 - segment.end);
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

    const bottom = [...stack.segments]
      .reverse()
      .map((segment, idx) => {
        const originalIndex = stack.segments.length - 1 - idx;
        const x = xForIndex(originalIndex);
        const y = height * (1 - segment.start);
        return `L${x},${y}`;
      })
      .join(' ');

    return { d: `${top} ${bottom} Z`, color: stack.color, mode: stack.mode };
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="w-full overflow-hidden">
        <svg width="100%" height={height + 20} viewBox={`0 0 100 ${height + 20}`} preserveAspectRatio="none" className="block max-w-full">
          {paths.map((path) => (
            <path key={path.mode} d={path.d} fill={path.color} opacity={0.8} stroke={path.color} strokeWidth={0.5} />
          ))}
        </svg>
      </div>
      <div className="flex gap-4 flex-wrap">
        {stacks.map((stack) => (
          <span key={stack.mode} className="inline-flex items-center gap-2 text-xs text-[#B3B3B3]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stack.color }} />
            <span className="text-white font-medium uppercase">{stack.mode}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
