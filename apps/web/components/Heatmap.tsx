"use client";

import { clsx } from "clsx";
import { useState } from "react";

interface HeatPoint {
  date: string;
  value: number;
}

interface HeatmapProps {
  points: HeatPoint[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function clipIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Heatmap({ points }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  if (!points.length)
    return <p className="text-[#B3B3B3]">No activity recorded.</p>;

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const dataStart = new Date(`${sorted[0].date}T00:00:00`);
  const dataEnd = new Date(`${sorted[sorted.length - 1].date}T00:00:00`);

  const start = new Date(dataStart);
  start.setDate(start.getDate() - start.getDay());

  const totalDays =
    Math.round((dataEnd.getTime() - start.getTime()) / DAY_MS) + 1;
  const totalSlots = Math.ceil(totalDays / 7) * 7;

  const lookup = new Map(sorted.map((point) => [point.date, point.value]));
  const maxValue = Math.max(...sorted.map((point) => point.value), 1);

  const cells = Array.from({ length: totalSlots }, (_, index) => {
    const current = new Date(start.getTime() + index * DAY_MS);
    const iso = clipIso(current);
    const value = lookup.get(iso) ?? 0;
    const inRange = current >= dataStart && current <= dataEnd;
    return { iso, value, inRange };
  });

  const weeks = totalSlots / 7;

  const handleMouseEnter = (
    e: React.MouseEvent,
    cell: { iso: string; value: number }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget
      .closest(".heatmap-container")
      ?.getBoundingClientRect();
    if (parentRect) {
      setTooltip({
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top - 8,
        content: `${formatDate(cell.iso)} • ${cell.value} message${
          cell.value !== 1 ? "s" : ""
        }`,
      });
    }
  };

  return (
    <div className="w-full overflow-visible min-w-0 relative heatmap-container">
      {tooltip && (
        <div
          className="absolute bg-[#282828] text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-[#3e3e3e] whitespace-nowrap pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
          }}
        >
          {tooltip.content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#282828]" />
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(7, 1fr)",
          gridAutoFlow: "column",
          gap: "clamp(2px, 0.5vw, 4px)",
        }}
        className="w-full min-h-[100px] pb-1 min-w-0"
      >
        {cells.map((cell, index) => {
          const intensity = cell.value && maxValue ? cell.value / maxValue : 0;
          const opacity = cell.value ? 0.3 + intensity * 0.7 : 0.1;

          return (
            <div
              key={`${cell.iso}-${index}`}
              onMouseEnter={(e) => handleMouseEnter(e, cell)}
              onMouseLeave={() => setTooltip(null)}
              className={clsx(
                "w-full h-full rounded-[2px] transition-all duration-200 hover:ring-1 hover:ring-white cursor-pointer",
                !cell.inRange && "opacity-25"
              )}
              style={{
                backgroundColor: cell.value
                  ? `rgba(29, 185, 84, ${opacity.toFixed(2)})`
                  : "rgba(255, 255, 255, 0.1)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
