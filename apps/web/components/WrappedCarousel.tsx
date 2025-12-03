'use client';

import KpiStat from '@/components/KpiStat';
import AreaChart from '@/components/AreaChart';
import Heatmap from '@/components/Heatmap';
import ReportExporter from '@/components/ReportExporter';
import ShareSummaryButton from '@/components/ShareSummaryButton';
import type { WrappedData } from '@/types/data';

interface Props {
  data: WrappedData;
  hasData?: boolean;
}

export default function WrappedCarousel({ data, hasData = true }: Props) {
  const latestActivity = data.activity.slice(-14);
  const heatmapPoints = data.activity.map((point) => ({ date: point.date, value: point.messages }));
  const longestConversation = data.conversations[0];

  return (
    <section style={{ display: 'grid', gap: '1rem', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
        <ShareSummaryButton data={data} />
        <ReportExporter data={data} />
      </div>
      {!hasData && (
        <div style={{ borderRadius: '1rem', padding: '0.75rem 1rem', border: '1px dashed rgba(255,255,255,0.3)', color: '#cbd5f5' }}>
          Import your ChatGPT conversations via the <strong>/import</strong> page to populate these stats.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '1rem', width: '100%', minWidth: 0 }}>
        <KpiStat label="Total messages" value={data.summary.totals.messages.toLocaleString()} subLabel="Across all conversations" />
        <KpiStat
          label="Total words"
          value={data.summary.totals.words.toLocaleString()}
          subLabel={`≈ ${data.summary.fun.novel_pages} novel pages`}
        />
        <KpiStat
          label="Longest streak"
          value={`${data.summary.longest_streak_days} days`}
          subLabel={`Most active hour: ${data.summary.most_active_hour}:00`}
        />
        <KpiStat label="Avg words/day" value={data.summary.fun.avg_words_per_day.toLocaleString()} />
        <KpiStat
          label="Active days"
          value={`${data.summary.fun.active_days}/${data.summary.fun.period_days}`}
          subLabel={`${((data.summary.fun.active_days / data.summary.fun.period_days) * 100 || 0).toFixed(1)}% coverage`}
        />
      </div>
      <article style={{ borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, overflow: 'hidden' }}>
        <strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: '#a0aec0' }}>
          Habits
        </strong>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.4rem 0 0', display: 'grid', gap: '0.3rem', color: '#cbd5f5' }}>
          <li>
            Active {data.summary.fun.active_days}/{data.summary.fun.period_days} days (
            {((data.summary.fun.active_days / data.summary.fun.period_days) * 100 || 0).toFixed(1)}%).
          </li>
          <li>
            Word split: {(data.summary.fun.user_words_pct * 100).toFixed(1)}% user /{' '}
            {(data.summary.fun.assistant_words_pct * 100).toFixed(1)}% assistant.
          </li>
          {data.summary.fun.top_keyword && (
            <li>
              Keyword: “{data.summary.fun.top_keyword.term}” ({data.summary.fun.top_keyword.count} mentions).
            </li>
          )}
        </ul>
      </article>

      <article style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, overflow: 'hidden' }}>
        <h3>Top topics</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {data.summary.top_topics.map((topic) => (
            <span
              key={topic.label}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: '0.9rem'
              }}
            >
              {topic.label} • {(topic.pct * 100).toFixed(1)}%
            </span>
          ))}
          {!data.summary.top_topics.length && <span style={{ color: '#94a3b8' }}>No topics detected.</span>}
        </div>
      </article>

      <article style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, overflow: 'hidden' }}>
        <h3>Two-week sprint</h3>
        <AreaChart points={latestActivity.map((point) => ({ label: point.date, value: point.messages }))} color="#60a5fa" />
      </article>

      <article style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, overflow: 'hidden' }}>
        <h3>Yearly heatmap</h3>
        <Heatmap points={heatmapPoints} />
      </article>

      {longestConversation && (
        <article style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, overflow: 'hidden' }}>
          <h3>Deepest rabbit hole</h3>
          <p style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {longestConversation.title} — {longestConversation.messages} messages since {longestConversation.start}
          </p>
        </article>
      )}
    </section>
  );
}
