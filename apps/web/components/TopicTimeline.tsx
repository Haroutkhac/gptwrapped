'use client';

import { useMemo, useRef, useState } from 'react';
import type { Topic, TopicSeriesPoint } from '@/types/data';

interface Props {
  topics: Topic[];
  series: TopicSeriesPoint[];
  activeTopicId?: string | null;
  onSelectTopic?: (topicId: string | null) => void;
}

function formatShare(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export default function TopicTimeline({ topics, series, activeTopicId, onSelectTopic }: Props) {
  const [focusedWeek, setFocusedWeek] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineTopics = useMemo(() => topics ?? [], [topics]);
  const timelineSeries = useMemo(() => series ?? [], [series]);
  const hasData = Boolean(timelineSeries.length && timelineTopics.length);

  const topicMap = new Map(timelineTopics.map((topic) => [topic.topic_id, topic]));
  const orderedIds: string[] = [];
  timelineTopics.forEach((topic) => orderedIds.push(topic.topic_id));
  timelineSeries.forEach((point) => {
    point.breakdown.forEach((entry) => {
      if (!orderedIds.includes(entry.topic_id)) {
        orderedIds.push(entry.topic_id);
      }
    });
  });
  const topicOrder: Topic[] = orderedIds.map((topicId) => {
    const existing = topicMap.get(topicId);
    if (existing) return existing;
    const entry = timelineSeries
      .flatMap((point) => point.breakdown)
      .find((breakdownEntry) => breakdownEntry.topic_id === topicId);
    return {
      topic_id: topicId,
      label: entry?.label ?? 'Topic',
      size: 0,
      color: '#94a3b8'
    } as Topic;
  });

  const height = 220;
  const xForIndex = (index: number) =>
    (timelineSeries.length === 1 ? 0 : (index / (timelineSeries.length - 1)) * 100);
  const cumulativeStarts = Array.from({ length: timelineSeries.length }, () => 0);

  const stacks = topicOrder.map((topic) => {
    const segments = timelineSeries.map((point, index) => {
      const entry = point.breakdown.find((item) => item.topic_id === topic.topic_id);
      const value = entry?.share ?? 0;
      const start = cumulativeStarts[index];
      const end = Math.min(1, start + value);
      cumulativeStarts[index] = end;
      return { start, end };
    });
    return { topic, segments };
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

    return { d: `${top} ${bottom} Z`, topicId: stack.topic.topic_id, color: stack.topic.color ?? '#6366f1' };
  });

  const segmentWidth = timelineSeries.length <= 1 ? 100 : 100 / (timelineSeries.length - 1);
  const resolvedWeek = focusedWeek ?? timelineSeries[timelineSeries.length - 1]?.week ?? null;
  const resolvedWeekIndex = resolvedWeek ? timelineSeries.findIndex((point) => point.week === resolvedWeek) : -1;
  const { resolvedBreakdown, tooltipLeft } = useMemo(() => {
    if (resolvedWeekIndex < 0) {
      return { resolvedBreakdown: [] as TopicSeriesPoint['breakdown'], tooltipLeft: 0 };
    }
    const left =
      timelineSeries.length <= 1 ? 50 : (resolvedWeekIndex / Math.max(1, timelineSeries.length - 1)) * 100;
    return {
      resolvedBreakdown: timelineSeries[resolvedWeekIndex].breakdown,
      tooltipLeft: left
    };
  }, [resolvedWeekIndex, timelineSeries]);

  const tooltipData = useMemo(() => resolvedBreakdown.slice(0, 4), [resolvedBreakdown]);

  const handleSelect = (topicId: string) => {
    onSelectTopic?.(topicId);
  };

  if (!hasData) {
    return <p style={{ color: '#94a3b8' }}>Need a full dataset to visualize topic momentum.</p>;
  }

  return (
    <div className="topic-timeline" ref={containerRef}>
      <div className="topic-timeline__chart">
        <svg
          width="100%"
          height={height + 20}
          viewBox={`0 0 100 ${height + 20}`}
          preserveAspectRatio="none"
          aria-label="Topic trend chart"
          onMouseLeave={() => setFocusedWeek(null)}
          style={{ maxWidth: '100%', display: 'block' }}
        >
          {paths.map((path) => (
            <path
              key={path.topicId}
              d={path.d}
              fill={path.color}
              opacity={activeTopicId && path.topicId !== activeTopicId ? 0.25 : 0.6}
              stroke={path.color}
              strokeWidth={1}
            />
          ))}
          {timelineSeries.map((point, index) => (
            <g key={point.week}>
              <rect
                x={Math.max(0, xForIndex(index) - segmentWidth / 2)}
                y={0}
                width={segmentWidth}
                height={height}
                fill="transparent"
                onMouseEnter={() => setFocusedWeek(point.week)}
              />
              <text x={xForIndex(index)} y={height + 15} fill="#94a3b8" fontSize="10" textAnchor="middle">
                {point.week}
              </text>
            </g>
          ))}
        </svg>
        {tooltipData.length > 0 && (
          <div className="topic-timeline__tooltip" style={{ left: `${tooltipLeft}%` }}>
            <p>{resolvedWeek}</p>
            {tooltipData.map((entry) => {
              const topic = topicMap.get(entry.topic_id);
              const isActive = activeTopicId === entry.topic_id;
              return (
                <button
                  key={entry.topic_id}
                  type="button"
                  onClick={() => handleSelect(entry.topic_id)}
                  className={`topic-timeline__tooltip-row${isActive ? ' active' : ''}`}
                >
                  <span className="topic-timeline__legend-swatch" style={{ background: topic?.color ?? '#6366f1' }} />
                  <span>{entry.label}</span>
                  <span style={{ marginLeft: 'auto' }}>{formatShare(entry.share)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="topic-timeline__legend">
        {topicOrder.map((topic) => {
          const recentShare =
            timelineSeries[timelineSeries.length - 1]?.breakdown.find(
              (entry) => entry.topic_id === topic.topic_id
            )?.share ?? 0;
          const isActive = activeTopicId === topic.topic_id;
          return (
            <button
              key={`legend-${topic.topic_id}`}
              type="button"
              className="topic-graph__legend-item"
              onClick={() => handleSelect(topic.topic_id)}
              aria-pressed={isActive}
            >
              <span className="topic-graph__legend-swatch" style={{ background: topic.color }} />
              <span>{topicMap.get(topic.topic_id)?.label ?? topic.label}</span>
              <span style={{ marginLeft: 'auto', opacity: 0.8 }}>{formatShare(recentShare)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
