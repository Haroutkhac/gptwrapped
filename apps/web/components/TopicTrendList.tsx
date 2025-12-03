'use client';

import { useMemo } from 'react';
import type { Topic, TopicSeriesPoint } from '@/types/data';

interface Trend {
  topicId: string;
  label: string;
  delta: number;
  latestShare: number;
  color: string;
}

interface Props {
  topics: Topic[];
  series: TopicSeriesPoint[];
  activeTopicId?: string | null;
  onSelectTopic?: (topicId: string | null) => void;
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDelta(value: number) {
  const pct = (value * 100).toFixed(1);
  return value >= 0 ? `+${pct} pts` : `${pct} pts`;
}

export default function TopicTrendList({ topics, series, activeTopicId, onSelectTopic }: Props) {
  const { risers, decliners } = useMemo(() => {
    if (!series?.length || series.length < 2) {
      return { risers: [] as Trend[], decliners: [] as Trend[] };
    }
    const first = series[0];
    const last = series[series.length - 1];
    const start = new Map(first.breakdown.map((entry) => [entry.topic_id, entry.share]));
    const end = new Map(last.breakdown.map((entry) => [entry.topic_id, entry.share]));
    const topicMap = new Map(topics.map((topic) => [topic.topic_id, topic]));
    const ids = new Set<string>([...start.keys(), ...end.keys()]);
    const trends: Trend[] = [];
    ids.forEach((id) => {
      const baseline = start.get(id) ?? 0;
      const latest = end.get(id) ?? 0;
      const delta = latest - baseline;
      const topic = topicMap.get(id);
      trends.push({
        topicId: id,
        label: topic?.label ?? first.breakdown.find((entry) => entry.topic_id === id)?.label ?? 'Topic',
        delta,
        latestShare: latest,
        color: topic?.color ?? '#94a3b8'
      });
    });
    const risers = trends
      .filter((trend) => trend.delta > 0.002)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);
    const decliners = trends
      .filter((trend) => trend.delta < -0.002)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);
    return { risers, decliners };
  }, [topics, series]);

  if ((!risers.length && !decliners.length) || !series?.length) {
    return <p style={{ color: '#94a3b8' }}>Need at least two weeks of data to detect trends.</p>;
  }

  const renderTrend = (trend: Trend) => {
    const isActive = activeTopicId === trend.topicId;
    return (
      <button
        key={trend.topicId}
        type="button"
        className={`topic-trend${isActive ? ' topic-trend--active' : ''}`}
        onClick={() => onSelectTopic?.(trend.topicId)}
      >
        <span className="topic-trend__swatch" style={{ background: trend.color }} />
        <div className="topic-trend__labels">
          <span className="topic-trend__label">{trend.label}</span>
          <span className="topic-trend__share">{formatPct(trend.latestShare)} now</span>
        </div>
        <span className={`topic-trend__delta${trend.delta >= 0 ? ' up' : ' down'}`}>{formatDelta(trend.delta)}</span>
      </button>
    );
  };

  return (
    <div className="topic-trend-grid">
      <div>
        <p className="topic-trend__title">Rising</p>
        {risers.length ? risers.map(renderTrend) : <p className="topic-trend__empty">No notable risers yet.</p>}
      </div>
      <div>
        <p className="topic-trend__title">Cooling off</p>
        {decliners.length ? decliners.map(renderTrend) : <p className="topic-trend__empty">Nothing cooling yet.</p>}
      </div>
    </div>
  );
}
