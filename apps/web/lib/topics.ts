import type { Topic, WrappedData } from '@/types/data';

export function applyTopicOverrides(data: WrappedData, overrides?: Topic[] | null): WrappedData {
  if (!overrides?.length) {
    return data;
  }
  const sourceTopics = overrides;

  const totalWords = data.summary.totals.words || 1;
  const nextTopics = sourceTopics.map((topic, index) => ({
    ...topic,
    topic_id: topic.topic_id || `override-${index}`,
    color: topic.color || '#8b5cf6'
  }));
  const labelMap = new Map(nextTopics.map((topic) => [topic.topic_id, topic.label]));

  const nextTopTopics = [...nextTopics]
    .sort((a, b) => b.size - a.size)
    .slice(0, 3)
    .map((topic) => ({
      label: topic.label,
      pct: totalWords ? topic.size / totalWords : 0
    }));

  const nextTopicSeries = data.topicSeries?.map((point) => ({
    ...point,
    breakdown: point.breakdown.map((entry) => ({
      ...entry,
      label: labelMap.get(entry.topic_id) ?? entry.label
    }))
  }));

  return {
    ...data,
    topics: nextTopics,
    topicSeries: nextTopicSeries ?? data.topicSeries,
    summary: {
      ...data.summary,
      top_topics: nextTopTopics
    }
  };
}
