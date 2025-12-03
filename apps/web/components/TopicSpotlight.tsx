'use client';

import type { Topic, TopicSeriesPoint } from '@/types/data';

interface Props {
  topics: Topic[];
  series: TopicSeriesPoint[];
  activeTopicId?: string | null;
}

function formatPct(value?: number) {
  if (value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatDelta(delta?: number) {
  if (delta === undefined) return '—';
  const pct = (delta * 100).toFixed(1);
  return delta >= 0 ? `+${pct} pts` : `${pct} pts`;
}

export default function TopicSpotlight({ topics, series, activeTopicId }: Props) {
  if (!series.length || !topics.length) {
    return (
      <p style={{ color: '#94a3b8', margin: 0 }}>
        Not enough timeline data to highlight a topic yet.
      </p>
    );
  }
  const topic = topics.find((entry) => entry.topic_id === activeTopicId) ?? topics[0];
  if (!topic) {
    return null;
  }

  const latest = series[series.length - 1];
  const earliest = series[0];
  const latestShare = latest?.breakdown.find((entry) => entry.topic_id === topic.topic_id)?.share;
  const earliestShare = earliest?.breakdown.find((entry) => entry.topic_id === topic.topic_id)?.share;
  const delta = latestShare !== undefined && earliestShare !== undefined ? latestShare - earliestShare : undefined;

  return (
    <div className="topic-spotlight">
      <header className="topic-spotlight__header">
        <div className="topic-spotlight__swatch" style={{ background: topic.color }} />
        <div>
          <p className="topic-spotlight__eyebrow">Focused topic</p>
          <h3>{topic.label}</h3>
        </div>
      </header>
      <dl className="topic-spotlight__stats">
        <div>
          <dt>Current share</dt>
          <dd>{formatPct(latestShare)}</dd>
        </div>
        <div>
          <dt>Shift vs start</dt>
          <dd className={delta !== undefined ? (delta >= 0 ? 'positive' : 'negative') : undefined}>{formatDelta(delta)}</dd>
        </div>
        <div>
          <dt>Messages</dt>
          <dd>{topic.messages ?? '—'}</dd>
        </div>
        {topic.sentiment !== undefined && (
          <div>
            <dt>Mood</dt>
            <dd>{topic.sentiment > 0.15 ? 'Positive' : topic.sentiment < -0.15 ? 'Negative' : 'Mixed'}</dd>
          </div>
        )}
      </dl>
      <div className="topic-spotlight__keywords">
        {(topic.keywords ?? []).slice(0, 6).map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
        {!(topic.keywords ?? []).length && <span className="muted">No keywords captured</span>}
      </div>
    </div>
  );
}
