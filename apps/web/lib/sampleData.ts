import type { WrappedData } from "@/types/data";

export const sampleData: WrappedData = {
  summary: {
    period: { start: "2024-01-01", end: "2024-12-31" },
    totals: { messages: 4281, words: 713204 },
    most_active_hour: 22,
    longest_streak_days: 18,
    top_topics: [
      { label: "System design", pct: 0.22 },
      { label: "Coding", pct: 0.19 },
      { label: "Debugging", pct: 0.14 },
    ],
    modes: [{ mode: "chat", pct: 1.0 }],
    fun: {
      novel_pages: 284,
      avg_words_per_day: 1951,
      top_keyword: { term: "kafka", count: 42 },
      top_words: [
        { term: "kafka", count: 42 },
        { term: "react", count: 38 },
        { term: "typescript", count: 35 },
        { term: "deploy", count: 30 },
        { term: "backend", count: 25 },
      ],
      right_count: 15,
      stupid_question_count: 124,
      weirdest_request: "Can you explain the difference between useEffect and useLayoutEffect but like I'm a 5 year old pirate?",
      active_days: 280,
      period_days: 366,
      user_words_pct: 0.45,
      assistant_words_pct: 0.55,
    },
  },
  activity: [
    { date: "2024-12-25", messages: 42, words: 6532, sentiment: 0.1 },
    { date: "2024-12-26", messages: 12, words: 1833, sentiment: -0.2 },
    { date: "2024-12-27", messages: 51, words: 9022, sentiment: 0.45 },
    { date: "2024-12-28", messages: 24, words: 4054, sentiment: -0.08 },
    { date: "2024-12-29", messages: 77, words: 12393, sentiment: 0.2 },
    { date: "2024-12-30", messages: 63, words: 10011, sentiment: 0.05 },
    { date: "2024-12-31", messages: 118, words: 18922, sentiment: 0.32 },
  ],
  topics: [
    {
      topic_id: "t1",
      label: "System design",
      size: 1243,
      color: "#8b5cf6",
      sentiment: 0.18,
      messages: 320,
      keywords: ["kafka", "queues", "latency", "backpressure"],
    },
    {
      topic_id: "t2",
      label: "Coding",
      size: 938,
      color: "#f472b6",
      sentiment: 0.12,
      messages: 280,
      keywords: ["typescript", "hooks", "components", "state"],
    },
    {
      topic_id: "t3",
      label: "Debugging",
      size: 612,
      color: "#22d3ee",
      sentiment: -0.05,
      messages: 150,
      keywords: ["error", "stack", "trace", "fix"],
    },
    {
      topic_id: "t4",
      label: "AI research",
      size: 451,
      color: "#facc15",
      sentiment: 0.24,
      messages: 140,
      keywords: ["prompt", "embedding", "model", "token"],
    },
  ],
  conversations: [
    {
      conversation_id: "c1",
      title: "Kafka backpressure",
      messages: 213,
      start: "2024-03-02",
    },
    {
      conversation_id: "c2",
      title: "Infra cost review",
      messages: 87,
      start: "2024-08-19",
    },
    {
      conversation_id: "c3",
      title: "Prompt engineering 101",
      messages: 164,
      start: "2024-11-05",
    },
  ],
  hours: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    messages: Math.round(
      Math.max(5, Math.sin((hour / 24) * Math.PI * 2) * 40 + 40)
    ),
  })),
  modeSeries: [
    {
      week: "2024-48",
      breakdown: [{ mode: "chat", messages: 520 }],
    },
    {
      week: "2024-49",
      breakdown: [{ mode: "chat", messages: 490 }],
    },
    {
      week: "2024-50",
      breakdown: [{ mode: "chat", messages: 500 }],
    },
  ],
  topicSeries: [
    {
      week: "2024-48",
      breakdown: [
        { topic_id: "t1", label: "System design", share: 0.42 },
        { topic_id: "t2", label: "Coding", share: 0.33 },
        { topic_id: "t3", label: "Debugging", share: 0.15 },
        { topic_id: "t4", label: "AI research", share: 0.1 },
      ],
    },
    {
      week: "2024-49",
      breakdown: [
        { topic_id: "t1", label: "System design", share: 0.36 },
        { topic_id: "t2", label: "Coding", share: 0.38 },
        { topic_id: "t3", label: "Debugging", share: 0.18 },
        { topic_id: "t4", label: "AI research", share: 0.08 },
      ],
    },
    {
      week: "2024-50",
      breakdown: [
        { topic_id: "t1", label: "System design", share: 0.4 },
        { topic_id: "t2", label: "Coding", share: 0.34 },
        { topic_id: "t3", label: "Debugging", share: 0.1 },
        { topic_id: "t4", label: "AI research", share: 0.16 },
      ],
    },
  ],
};
