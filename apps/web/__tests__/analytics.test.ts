import { describe, it, expect } from 'vitest';
import {
  estimateTopics,
  filterConversationsByDate,
  runLocalAnalysis,
  type NormalizedConversation
} from '@/lib/analytics';

const baseConversation: NormalizedConversation = {
  id: 'c1',
  title: 'Test',
  createdAt: 1704067200, // 2024-01-01 UTC
  updatedAt: 1704153600,
  messages: [
    {
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      createdAt: 1704067200,
      text: 'hello world',
      wordCount: 2
    },
    {
      id: 'm2',
      conversationId: 'c1',
      role: 'assistant',
      createdAt: 1706745600, // 2024-02-01
      text: 'great job',
      wordCount: 2
    }
  ]
};

const topicConversation: NormalizedConversation = {
  id: 'c2',
  title: 'System design chat',
  createdAt: 1704067200,
  updatedAt: 1704067200,
  messages: [
    {
      id: 't1',
      conversationId: 'c2',
      role: 'user',
      createdAt: 1704067200,
      text: 'Let us discuss system scale and throughput strategy',
      wordCount: 8
    },
    {
      id: 't2',
      conversationId: 'c2',
      role: 'assistant',
      createdAt: 1704067600,
      text: 'Great plan for system design',
      wordCount: 5
    }
  ]
};

describe('filterConversationsByDate', () => {
  it('keeps only messages within range', () => {
    const filtered = filterConversationsByDate([baseConversation], '2024-02-01', '2024-02-28');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].messages).toHaveLength(1);
    expect(filtered[0].messages[0].id).toBe('m2');
  });

  it('drops conversations with no messages in range', () => {
    const filtered = filterConversationsByDate([baseConversation], '2024-03-01', '2024-03-31');
    expect(filtered).toHaveLength(0);
  });
});

describe('runLocalAnalysis integration', () => {
  it('recomputes totals after filtering', () => {
    const filtered = filterConversationsByDate([baseConversation], '2024-01-01', '2024-01-31');
    const dataset = runLocalAnalysis(filtered);
    expect(dataset.summary.totals.messages).toBe(1);
    expect(dataset.activity).toHaveLength(1);
    expect(dataset.summary.fun.top_keyword?.term).toBe('hello');
    expect(dataset.summary.fun.active_days).toBe(1);
    expect(dataset.summary.fun.user_words_pct).toBeGreaterThan(0);
    expect(dataset.summary.fun.assistant_words_pct).toBe(0);
  });

  it('computes topic sentiment', () => {
    const { topics, series } = estimateTopics([topicConversation]);
    expect(topics[0].keywords?.length ?? 0).toBeGreaterThan(0);
    expect(topics[0].keywords ?? []).toContain('system');
    expect(topics[0].sentiment).toBeGreaterThan(0);
    expect(topics[0].messages).toBeGreaterThan(0);
    expect(series.length).toBeGreaterThan(0);
    expect(series[0].breakdown.length).toBeGreaterThan(0);
  });
});
