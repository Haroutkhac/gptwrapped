import { z } from 'zod';

export const periodSchema = z.object({
  start: z.string(),
  end: z.string()
});

export const totalsSchema = z.object({
  messages: z.number(),
  userMessages: z.number().optional(),
  words: z.number()
});

export const topTopicSchema = z.object({
  label: z.string(),
  pct: z.number().min(0)
});

export const modeSchema = z.object({
  mode: z.string(),
  pct: z.number().min(0)
});

export const funSchema = z.object({
  novel_pages: z.number().min(0),
  avg_words_per_day: z.number().min(0),
  top_keyword: z
    .object({
      term: z.string(),
      count: z.number().min(0)
    })
    .optional(),
  top_words: z.array(
    z.object({
      term: z.string(),
      count: z.number().min(0)
    })
  ).optional(),
  right_count: z.number().min(0).optional(),
  stupid_question_count: z.number().min(0).optional(),
  weirdest_request: z.string().optional(),
  late_night_count: z.number().min(0).optional(),
  active_days: z.number().min(0),
  period_days: z.number().min(0),
  user_words_pct: z.number().min(0).max(1),
  assistant_words_pct: z.number().min(0).max(1)
});

export const summarySchema = z.object({
  period: periodSchema,
  totals: totalsSchema,
  most_active_hour: z.number().min(0).max(23),
  longest_streak_days: z.number().min(0),
  top_topics: z.array(topTopicSchema),
  modes: z.array(modeSchema),
  fun: funSchema
});

export const activityPointSchema = z.object({
  date: z.string(),
  messages: z.number().min(0),
  words: z.number().min(0),
  sentiment: z.number().min(-1).max(1)
});

export const topicSchema = z.object({
  topic_id: z.string(),
  label: z.string(),
  size: z.number().min(0),
  color: z.string(),
  sentiment: z.number().min(-1).max(1).optional(),
  messages: z.number().min(0).optional(),
  keywords: z.array(z.string()).min(1).optional()
});

export const topicSeriesBreakdownSchema = z.object({
  topic_id: z.string(),
  label: z.string(),
  share: z.number().min(0)
});

export const topicSeriesSchema = z.object({
  week: z.string(),
  breakdown: z.array(topicSeriesBreakdownSchema)
});

export const conversationSummarySchema = z.object({
  conversation_id: z.string(),
  title: z.string(),
  messages: z.number().min(0),
  start: z.string()
});

export const hourBucketSchema = z.object({
  hour: z.number().min(0).max(23),
  messages: z.number().min(0)
});

export const modeSeriesSchema = z.object({
  week: z.string(),
  breakdown: z.array(
    z.object({
      mode: z.string(),
      messages: z.number().min(0)
    })
  )
});

export type Summary = z.infer<typeof summarySchema>;
export type ActivityPoint = z.infer<typeof activityPointSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type TopicSeriesPoint = z.infer<typeof topicSeriesSchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type HourBucket = z.infer<typeof hourBucketSchema>;
export type ModeSeriesPoint = z.infer<typeof modeSeriesSchema>;

export interface WrappedData {
  summary: Summary;
  activity: ActivityPoint[];
  topics: Topic[];
  topicSeries?: TopicSeriesPoint[];
  conversations: ConversationSummary[];
  hours?: HourBucket[];
  modeSeries?: ModeSeriesPoint[];
}
