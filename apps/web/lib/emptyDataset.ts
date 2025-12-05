import type { WrappedData } from '@/types/data';

export const emptyWrappedData: WrappedData = {
  summary: {
    period: { start: '', end: '' },
    totals: { messages: 0, words: 0 },
    most_active_hour: 0,
    longest_streak_days: 0,
    top_topics: [],
    modes: [],
    fun: {
      novel_pages: 0,
      avg_words_per_day: 0,
      top_keyword: undefined,
      top_words: undefined,
      right_count: undefined,
      stupid_question_count: undefined,
      weirdest_request: undefined,
      active_days: 0,
      period_days: 0,
      user_words_pct: 0,
      assistant_words_pct: 0
    }
  },
  activity: [],
  topics: [],
  topicSeries: [],
  conversations: [],
  hours: Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 })),
  modeSeries: []
};
