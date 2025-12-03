import { describe, it, expect } from 'vitest';
import { applyTopicOverrides } from '@/lib/topics';
import { sampleData } from '@/lib/sampleData';

const overrides = [
  {
    topic_id: 't1',
    label: 'Architecture',
    size: 1000,
    color: '#ffedd5',
    sentiment: 0.4,
    messages: 40,
    keywords: ['latency', 'throughput']
  },
  {
    topic_id: 't2',
    label: 'AI Research',
    size: 500,
    color: '#d946ef',
    sentiment: 0.2,
    messages: 25,
    keywords: ['prompt', 'embedding']
  }
];

describe('applyTopicOverrides', () => {
  it('returns original data when no overrides provided', () => {
    const result = applyTopicOverrides(sampleData, null);
    expect(result).toBe(sampleData);
  });

  it('replaces topics and recomputes summary top topics', () => {
    const result = applyTopicOverrides(sampleData, overrides);
    expect(result.topics).toEqual(overrides);
    expect(result.summary.top_topics[0].label).toBe('Architecture');
    expect(result.summary.top_topics[0].pct).toBeCloseTo(1000 / sampleData.summary.totals.words);
    expect(result.topicSeries?.[0].breakdown.map((entry) => entry.label)).toContain('Architecture');
  });
});
