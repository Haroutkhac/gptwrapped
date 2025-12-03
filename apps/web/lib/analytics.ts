import type {
  ActivityPoint,
  ConversationSummary,
  HourBucket,
  Summary,
  Topic,
  TopicSeriesPoint,
  WrappedData
} from '@/types/data';

export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

export interface NormalizedMessage {
  id: string;
  conversationId: string;
  role: Role;
  createdAt: number;
  text: string;
  wordCount: number;
}

export interface NormalizedConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt?: number | null;
  messages: NormalizedMessage[];
}

interface RawConversation {
  id: string;
  title: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, { id: string; message?: RawMessage }>;
  messages?: RawMessage[];
}

interface RawMessage {
  id: string;
  create_time?: number;
  author?: { role?: Role };
  content?: {
    content_type?: string;
    parts?: Array<string | { text?: string }>;
  };
}

const sentimentLexicon: Record<string, number> = {
  love: 0.8,
  great: 0.6,
  awesome: 0.6,
  thanks: 0.4,
  good: 0.3,
  nice: 0.3,
  cool: 0.3,
  happy: 0.3,
  excited: 0.5,
  bad: -0.4,
  broken: -0.5,
  bug: -0.4,
  error: -0.5,
  fail: -0.5,
  stuck: -0.3,
  terrible: -0.8,
  sad: -0.5,
  worry: -0.2
};

const TOPIC_COLOR_POOL = ['#8b5cf6', '#f472b6', '#22d3ee', '#facc15', '#34d399', '#f97316', '#2dd4bf', '#c084fc', '#fb7185'];


const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'you',
  'your',
  'are',
  'have',
  'was',
  'were',
  'about',
  'into',
  'what',
  'when',
  'which',
  'their',
  'will',
  'just',
  'but',
  'can',
  'all',
  'any',
  'per',
  'tot',
  'one'
]);

const TOKEN_PATTERN = /[a-z0-9']+/gi;

interface TopicDocument {
  id: string;
  tokens: string[];
  wordCount: number;
  messageCount: number;
  sentiment: number;
  week: string;
}

interface SparseVector {
  weights: Map<number, number>;
}

interface TopicAnalysis {
  topics: Topic[];
  series: TopicSeriesPoint[];
}
function tokenize(text: string) {
  return text.toLowerCase().match(TOKEN_PATTERN) ?? [];
}

function getIsoWeekKey(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
}

export function extractText(raw?: RawMessage): string {
  if (!raw?.content?.parts) return '';
  return raw.content.parts
    .map((part) => {
      if (typeof part === 'string') return part;
      return part?.text ?? '';
    })
    .join('\n')
    .trim();
}

function sanitizeRole(rawRole?: string): Role {
  if (!rawRole) return 'unknown';
  if (['user', 'assistant', 'system', 'tool'].includes(rawRole)) {
    return rawRole as Role;
  }
  return 'unknown';
}

function ensureSeconds(timestamp?: number | null) {
  if (!timestamp) {
    return Math.floor(Date.now() / 1000);
  }
  return timestamp > 10_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
}

export function normalizeExport(payload: unknown): NormalizedConversation[] {
  if (!Array.isArray(payload)) return [];

  return payload.map<NormalizedConversation>((conversation, idx) => {
    const safeConversation = conversation as RawConversation;
    const id = safeConversation.id || `conversation-${idx}`;
    const title = safeConversation.title || 'Untitled conversation';
    const createdAt = ensureSeconds(safeConversation.create_time);
    const updatedAt = safeConversation.update_time ? ensureSeconds(safeConversation.update_time) : null;

    const rawMessages = safeConversation.messages
      ? safeConversation.messages
      : Object.values(safeConversation.mapping || {})
          .map((entry) => entry.message)
          .filter(Boolean) as RawMessage[];

    const messages: NormalizedMessage[] = rawMessages
      .map((message, messageIndex) => {
        const text = extractText(message);
        const created = ensureSeconds(message?.create_time ?? createdAt);
        return {
          id: message?.id || `${id}-message-${messageIndex}`,
          conversationId: id,
          role: sanitizeRole(message?.author?.role),
          createdAt: created,
          text,
          wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0
        };
      })
      .filter((message) => {
        if (!message.text.trim()) return false;
        return message.role === 'user' || message.role === 'assistant' || message.role === 'tool';
      });

    return {
      id,
      title,
      createdAt,
      updatedAt,
      messages
    };
  });
}

function scoreSentiment(text: string): number {
  if (!text) return 0;
  const tokens = tokenize(text);
  if (!tokens.length) return 0;
  let score = 0;
  for (const token of tokens) {
    score += sentimentLexicon[token] ?? 0;
  }
  return Math.max(-1, Math.min(1, score / tokens.length));
}

export function computeDaily(conversations: NormalizedConversation[]): ActivityPoint[] {
  const daily = new Map<string, { messages: number; words: number; sentimentTotal: number; sentimentCount: number }>();

  conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      const date = new Date(message.createdAt * 1000).toISOString().slice(0, 10);
      const bucket = daily.get(date) || { messages: 0, words: 0, sentimentTotal: 0, sentimentCount: 0 };
      bucket.messages += 1;
      bucket.words += message.wordCount;
      const sentiment = scoreSentiment(message.text);
      if (sentiment !== 0) {
        bucket.sentimentTotal += sentiment;
        bucket.sentimentCount += 1;
      }
      daily.set(date, bucket);
    });
  });

  return Array.from(daily.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, stats]) => ({
      date,
      messages: stats.messages,
      words: stats.words,
      sentiment: stats.sentimentCount ? stats.sentimentTotal / stats.sentimentCount : 0
    }));
}

export function computeTopHour(conversations: NormalizedConversation[]): number {
  const hours = new Map<number, number>();
  conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      const hour = new Date(message.createdAt * 1000).getHours();
      hours.set(hour, (hours.get(hour) || 0) + 1);
    });
  });
  let topHour = 0;
  let maxCount = 0;
  for (const [hour, count] of hours.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topHour = hour;
    }
  }
  return topHour;
}

export function computeHourBuckets(conversations: NormalizedConversation[]): HourBucket[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }));
  conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      const hour = new Date(message.createdAt * 1000).getHours();
      buckets[hour].messages += 1;
    });
  });
  return buckets;
}

export function computeTotals(conversations: NormalizedConversation[]) {
  return conversations.reduce(
    (acc, conversation) => {
      conversation.messages.forEach((message) => {
        acc.messages += 1;
        acc.words += message.wordCount;
        if (message.role === 'user') {
          acc.userWords += message.wordCount;
        } else if (message.role === 'assistant') {
          acc.assistantWords += message.wordCount;
        }
      });
      return acc;
    },
    { messages: 0, words: 0, userWords: 0, assistantWords: 0 }
  );
}

export function computeLongestStreak(activity: ActivityPoint[]): number {
  if (!activity.length) return 0;
  let current = 1;
  let longest = 1;
  for (let i = 1; i < activity.length; i++) {
    const prev = new Date(activity[i - 1].date);
    const curr = new Date(activity[i].date);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return longest;
}

export function computeModeBreakdown(conversations: NormalizedConversation[]) {
  let total = 0;
  conversations.forEach((conversation) => {
    conversation.messages.forEach(() => {
      total += 1;
    });
  });
  return total > 0 ? [{ mode: 'chat', pct: 1.0 }] : [];
}

export function computeModeSeries(conversations: NormalizedConversation[]) {
  const buckets = new Map<string, number>();
  conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      const week = getIsoWeekKey(new Date(message.createdAt * 1000));
      buckets.set(week, (buckets.get(week) || 0) + 1);
    });
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, messages]) => ({
      week,
      breakdown: [{ mode: 'chat', messages }]
    }));
}

function buildTopicDocuments(conversations: NormalizedConversation[]): TopicDocument[] {
  return conversations
    .map((conversation) => {
      const tokens: string[] = [];
      let wordCount = 0;
      let messageCount = 0;
      let sentimentTotal = 0;
      let firstTimestamp: number | null = null;
      conversation.messages.forEach((message) => {
        const cleaned = message.text.trim();
        if (!cleaned) return;
        const messageTokens = tokenize(cleaned).filter((token) => token.length > 2 && !STOPWORDS.has(token));
        if (!messageTokens.length) return;
        tokens.push(...messageTokens);
        wordCount += messageTokens.length;
        messageCount += 1;
        sentimentTotal += scoreSentiment(cleaned);
        firstTimestamp = firstTimestamp === null ? message.createdAt : Math.min(firstTimestamp, message.createdAt);
      });
      if (!tokens.length) return null;
      const weekKey = getIsoWeekKey(new Date(((firstTimestamp ?? conversation.createdAt) || conversation.createdAt) * 1000));
      return {
        id: conversation.id,
        tokens,
        wordCount,
        messageCount,
        sentiment: messageCount ? sentimentTotal / messageCount : 0,
        week: weekKey
      };
    })
    .filter((doc): doc is TopicDocument => Boolean(doc));
}

function buildVocabulary(documents: TopicDocument[], maxFeatures = 1500, minDocumentFrequency = 2) {
  const counts = new Map<string, number>();
  documents.forEach((doc) => {
    const seen = new Set(doc.tokens);
    seen.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count >= minDocumentFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxFeatures)
    .reduce((map, [token], index) => {
      map.set(token, index);
      return map;
    }, new Map<string, number>());
}

function buildVectors(documents: TopicDocument[], vocabulary: Map<string, number>): SparseVector[] {
  if (!vocabulary.size) {
    return documents.map(() => ({ weights: new Map() }));
  }

  const docCount = documents.length;
  const df = new Map<string, number>();
  const reverseVocabulary = new Map<number, string>();
  vocabulary.forEach((index, token) => {
    reverseVocabulary.set(index, token);
  });
  documents.forEach((doc) => {
    const seen = new Set<string>();
    doc.tokens.forEach((token) => {
      if (!vocabulary.has(token) || seen.has(token)) return;
      df.set(token, (df.get(token) || 0) + 1);
      seen.add(token);
    });
  });

  const idf = new Map<string, number>();
  vocabulary.forEach((_, token) => {
    const freq = df.get(token) || 0;
    idf.set(token, Math.log(1 + docCount / (1 + freq)));
  });

  return documents.map((doc) => {
    const weights = new Map<number, number>();
    const counts = new Map<number, number>();
    doc.tokens.forEach((token) => {
      const index = vocabulary.get(token);
      if (index === undefined) return;
      counts.set(index, (counts.get(index) || 0) + 1);
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    if (!total) {
      return { weights };
    }
    counts.forEach((count, index) => {
      const token = reverseVocabulary.get(index);
      const idfWeight = token ? idf.get(token) ?? 0 : 0;
      weights.set(index, (count / total) * idfWeight);
    });
    return { weights: normalizeVector(weights) };
  });
}

function normalizeVector(vector: Map<number, number>) {
  let norm = 0;
  vector.forEach((value) => {
    norm += value * value;
  });
  if (!norm) {
    return vector;
  }
  const scale = 1 / Math.sqrt(norm);
  vector.forEach((value, key) => {
    vector.set(key, value * scale);
  });
  return vector;
}

function cosineSimilarity(vector: SparseVector, centroid: Map<number, number>) {
  if (!vector.weights.size || !centroid.size) {
    return 0;
  }
  let total = 0;
  vector.weights.forEach((value, key) => {
    const centroidValue = centroid.get(key);
    if (centroidValue !== undefined) {
      total += value * centroidValue;
    }
  });
  return total;
}

function recomputeCentroids(assignments: number[], vectors: SparseVector[], k: number, randomIndices: number[]): Map<number, number>[] {
  const totals = Array.from({ length: k }, () => new Map<number, number>());
  const counts = Array.from({ length: k }, () => 0);
  assignments.forEach((clusterIndex, vectorIndex) => {
    counts[clusterIndex] += 1;
    vectors[vectorIndex].weights.forEach((value, key) => {
      totals[clusterIndex].set(key, (totals[clusterIndex].get(key) || 0) + value);
    });
  });
  return totals.map((total, index) => {
    if (!counts[index]) {
      const seedVector = vectors[randomIndices[index % randomIndices.length]];
      return new Map(seedVector.weights);
    }
    const centroid = new Map<number, number>();
    total.forEach((value, key) => {
      centroid.set(key, value / counts[index]);
    });
    return normalizeVector(centroid);
  });
}

function createSeededRandom(seed = 42) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function chooseClusterCount(documents: number) {
  if (documents <= 2) return documents;
  if (documents < 6) return 2;
  return Math.max(3, Math.min(8, Math.floor(Math.sqrt(documents)) + 1));
}

function extractKeywords(indices: number[], documents: TopicDocument[], limit = 5) {
  const counts = new Map<string, number>();
  indices.forEach((index) => {
    documents[index].tokens.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .filter((token, position, arr) => arr.indexOf(token) === position)
    .slice(0, limit);
}

function formatTopicLabel(keywords: string[]) {
  if (!keywords.length) return 'General';
  if (keywords.length === 1) return keywords[0].replace(/^\w/, (char) => char.toUpperCase());
  return `${keywords[0].replace(/^\w/, (char) => char.toUpperCase())} & ${keywords[1].replace(/^\w/, (char) => char.toUpperCase())}`;
}

export function estimateTopics(conversations: NormalizedConversation[]): TopicAnalysis {
  const documents = buildTopicDocuments(conversations);
  if (!documents.length) {
    return { topics: [], series: [] };
  }

  const vocabulary = buildVocabulary(documents);
  const vectors = buildVectors(documents, vocabulary);
  const hasSignal = vectors.some((vector) => vector.weights.size);
  const clusterCount = hasSignal ? chooseClusterCount(documents.length) : 1;

  const random = createSeededRandom();
  const initialOrder = Array.from({ length: vectors.length }, (_, index) => index);
  for (let i = initialOrder.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [initialOrder[i], initialOrder[j]] = [initialOrder[j], initialOrder[i]];
  }
  const seeds = initialOrder.slice(0, clusterCount);

  let centroids = seeds.map((index) => new Map(vectors[index].weights));
  const assignments = new Array(vectors.length).fill(0);
  const iterations = hasSignal ? 40 : 1;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let changed = false;
    vectors.forEach((vector, index) => {
      if (!hasSignal) return;
      let bestIdx = 0;
      let bestScore = -Infinity;
      centroids.forEach((centroid, centroidIdx) => {
        const similarity = cosineSimilarity(vector, centroid);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestIdx = centroidIdx;
        }
      });
      if (assignments[index] !== bestIdx) {
        assignments[index] = bestIdx;
        changed = true;
      }
    });
    if (!hasSignal) break;
    centroids = recomputeCentroids(assignments, vectors, clusterCount, seeds);
    if (!changed) break;
  }

  const grouped = new Map<number, number[]>();
  const weekBuckets = new Map<string, Map<number, number>>();
  assignments.forEach((clusterIndex, docIndex) => {
    const key = hasSignal ? clusterIndex : 0;
    const bucket = grouped.get(key) || [];
    bucket.push(docIndex);
    grouped.set(key, bucket);

    const weekBucket = weekBuckets.get(documents[docIndex].week) || new Map<number, number>();
    weekBucket.set(key, (weekBucket.get(key) || 0) + documents[docIndex].wordCount);
    weekBuckets.set(documents[docIndex].week, weekBucket);
  });

  const clusterMeta = new Map<number, Topic>();
  const topics = Array.from(grouped.entries())
    .map<Topic>(([clusterIndex, indices]) => {
      const keywords = extractKeywords(indices, documents);
      const label = formatTopicLabel(keywords);
      const size = indices.reduce((sum, index) => sum + documents[index].wordCount, 0);
      const messages = indices.reduce((sum, index) => sum + documents[index].messageCount, 0);
      const sentimentTotal = indices.reduce(
        (sum, index) => sum + documents[index].sentiment * documents[index].messageCount,
        0
      );
      const topic: Topic = {
        topic_id: `cluster-${clusterIndex}`,
        label,
        size,
        color: TOPIC_COLOR_POOL[clusterIndex % TOPIC_COLOR_POOL.length],
        messages,
        sentiment: messages ? sentimentTotal / messages : undefined
      };
      if (keywords.length) {
        topic.keywords = keywords.slice(0, 5);
      }
      clusterMeta.set(clusterIndex, topic);
      return topic;
    })
    .sort((a, b) => b.size - a.size);

  const series: TopicSeriesPoint[] = Array.from(weekBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, breakdown]) => {
      const total = Array.from(breakdown.values()).reduce((sum, value) => sum + value, 0) || 1;
      const entries = Array.from(breakdown.entries())
        .map(([_clusterIndex, words]) => {
          const topic = clusterMeta.get(_clusterIndex);
          if (!topic) return null;
          return {
            topic_id: topic.topic_id,
            label: topic.label,
            share: words / total
          };
        })
        .filter((entry): entry is { topic_id: string; label: string; share: number } => Boolean(entry))
        .sort((a, b) => b.share - a.share);
      return { week, breakdown: entries };
    })
    .filter((point) => point.breakdown.length);

  return { topics, series };
}

export function buildConversationSummaries(conversations: NormalizedConversation[]): ConversationSummary[] {
  return conversations
    .map((conversation) => ({
      conversation_id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.length,
      start: new Date(conversation.createdAt * 1000).toISOString().slice(0, 10)
    }))
    .sort((a, b) => b.messages - a.messages);
}

function computeNovelPages(words: number) {
  const wordsPerPage = 250;
  return Math.round(words / wordsPerPage);
}

function computeTopKeyword(conversations: NormalizedConversation[]) {
  const counts = new Map<string, number>();
  conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      const tokens = message.text.toLowerCase().match(/[a-z0-9']+/g);
      tokens?.forEach((token) => {
        if (token.length < 3 || STOPWORDS.has(token)) return;
        counts.set(token, (counts.get(token) || 0) + 1);
      });
    });
  });
  let best: { term: string; count: number } | null = null;
  counts.forEach((count, term) => {
    if (!best || count > best.count) {
      best = { term, count };
    }
  });
  return best;
}

export function filterConversationsByDate(
  conversations: NormalizedConversation[],
  start?: string,
  end?: string
): NormalizedConversation[] {
  if (!start && !end) {
    return conversations;
  }
  const startTs = start ? new Date(`${start}T00:00:00Z`).getTime() / 1000 : Number.NEGATIVE_INFINITY;
  const endTs = end ? new Date(`${end}T23:59:59Z`).getTime() / 1000 : Number.POSITIVE_INFINITY;

  return conversations
    .map((conversation) => {
      const messages = conversation.messages.filter(
        (message) => message.createdAt >= startTs && message.createdAt <= endTs
      );
      if (!messages.length) {
        return null;
      }
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const updatedConversation: NormalizedConversation = {
        ...conversation,
        createdAt: firstMessage.createdAt,
        updatedAt: lastMessage.createdAt,
        messages
      };
      return updatedConversation;
    })
    .filter((conversation): conversation is NormalizedConversation => conversation !== null);
}

export function runLocalAnalysis(conversations: NormalizedConversation[]): WrappedData {
  const activity = computeDaily(conversations);
  const totals = computeTotals(conversations);
  const longestStreakDays = computeLongestStreak(activity);
  const mostActiveHour = computeTopHour(conversations);
  const modes = computeModeBreakdown(conversations);
  const modeSeries = computeModeSeries(conversations);
  const { topics, series: topicSeries } = estimateTopics(conversations);
  const conversationsSummary = buildConversationSummaries(conversations);
  const hours = computeHourBuckets(conversations);
  const topKeyword = computeTopKeyword(conversations);
  const activeDays = activity.length;
  const periodStart = activity[0]?.date || new Date().toISOString().slice(0, 10);
  const periodEnd = activity[activity.length - 1]?.date || periodStart;
  const periodDays =
    Math.max(1, Math.floor((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000) + 1);

  const summary: Summary = {
    period: {
      start: periodStart,
      end: periodEnd
    },
    totals,
    most_active_hour: mostActiveHour,
    longest_streak_days: longestStreakDays,
    top_topics: topics.slice(0, 3).map((topic) => ({
      label: topic.label,
      pct: totals.words ? topic.size / totals.words : 0
    })),
    modes,
    fun: {
      novel_pages: computeNovelPages(totals.words),
      avg_words_per_day: activeDays ? Math.round(totals.words / activeDays) : 0,
      top_keyword: topKeyword ?? undefined,
      active_days: activeDays,
      period_days: periodDays,
      user_words_pct: totals.words ? totals.userWords / totals.words : 0,
      assistant_words_pct: totals.words ? totals.assistantWords / totals.words : 0
    }
  };

  return {
    summary,
    activity,
    topics,
    topicSeries,
    conversations: conversationsSummary,
    hours,
    modeSeries
  };
}
