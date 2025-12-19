import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import type { AIInsights, InsightStats } from "@/types/insights";

const MODEL_ID = "Phi-3.5-mini-instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let initPromise: Promise<MLCEngine> | null = null;

export type InitProgressCallback = (progress: {
  text: string;
  progress: number;
}) => void;

export async function initEngine(
  onProgress?: InitProgressCallback
): Promise<MLCEngine> {
  if (engine) return engine;
  if (initPromise) return initPromise;

  initPromise = CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (report) => {
      onProgress?.({
        text: report.text,
        progress: report.progress,
      });
    },
  });

  engine = await initPromise;
  return engine;
}

export function isEngineReady(): boolean {
  return engine !== null;
}

async function generate(prompt: string, maxTokens = 100): Promise<string> {
  const eng = await initEngine();
  const response = await eng.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.8,
  });
  return response.choices[0]?.message?.content?.trim() || "";
}

export async function generateRoast(stats: InsightStats): Promise<string> {
  const prompt = `You are a witty comedian. Based on this ChatGPT usage data, write a single funny roast (1-2 sentences, max 30 words). Be playful and clever, not mean.

Stats:
- Total messages: ${stats.totalMessages.toLocaleString()}
- Top topics: ${stats.topTopics.slice(0, 3).join(", ")}
- Messages after midnight: ${stats.lateNightCount}
- Most active hour: ${stats.mostActiveHour}:00
- Days active: ${stats.activeDays}

Write only the roast, nothing else:`;

  return generate(prompt, 60);
}

export async function generatePersonality(
  stats: InsightStats
): Promise<string> {
  const prompt = `Based on this ChatGPT usage data, describe the user's "AI personality type" in 2-3 short sentences. Be creative and fun.

Stats:
- ${stats.totalMessages.toLocaleString()} messages sent
- Top interests: ${stats.topTopics.slice(0, 3).join(", ")}
- Most used words: ${stats.topWords.slice(0, 5).join(", ")}
- Active ${stats.activeDays} out of ${stats.periodDays} days
- ${stats.lateNightCount} late-night messages (after midnight)
- Most active at ${stats.mostActiveHour}:00
- Longest streak: ${stats.longestStreak} days

Write only the personality description:`;

  return generate(prompt, 80);
}

export async function generateSummary(stats: InsightStats): Promise<string> {
  const prompt = `Write a brief, engaging 2-sentence summary of this person's year with ChatGPT. Make it feel like a year-in-review highlight.

Stats:
- ${stats.totalMessages.toLocaleString()} messages, ${stats.totalWords.toLocaleString()} words
- Main topics: ${stats.topTopics.slice(0, 3).join(", ")}
- ${stats.activeDays} active days over ${stats.periodDays} day period
- ChatGPT agreed they were right ${stats.rightCount} times

Write only the summary:`;

  return generate(prompt, 70);
}

async function generateSlideText(
  slideKey: string,
  stats: InsightStats
): Promise<string> {
  const prompts: Record<string, string> = {
    intro: `Write a 5-7 word excited opener for someone who sent ${stats.totalMessages.toLocaleString()} messages to ChatGPT. Just the text, no quotes:`,

    topics: `Write a playful 5-7 word comment about someone obsessed with: ${stats.topTopics
      .slice(0, 3)
      .join(", ")}. Just the text:`,

    vocabulary: `Write a witty 5-7 word comment about someone whose favorite words are: ${stats.topWords
      .slice(0, 3)
      .join(", ")}. Just the text:`,

    stupidQuestions: `Write a funny 8-12 word comment about someone who asked ${stats.stupidQuestionCount} "stupid questions". Be playful, not mean. Just the text:`,

    weirdest: `Write a 5-7 word playful reaction to a weird request. Just the text:`,

    validation: `Write a 8-12 word sarcastic comment about ChatGPT telling someone they were right ${stats.rightCount} times. Just the text:`,

    lateNight: `Write a 8-12 word comment about someone who sent ${stats.lateNightCount} messages after midnight. Just the text:`,
  };

  const prompt = prompts[slideKey];
  if (!prompt) return "";

  return generate(prompt, 30);
}

export async function generateAllInsights(
  stats: InsightStats,
  onProgress?: (step: string) => void
): Promise<AIInsights> {
  onProgress?.("Generating your roast...");
  const roast = await generateRoast(stats);

  onProgress?.("Analyzing your AI personality...");
  const personality = await generatePersonality(stats);

  onProgress?.("Writing your year summary...");
  const summary = await generateSummary(stats);

  onProgress?.("Crafting slide text...");
  const slideTexts = {
    intro: await generateSlideText("intro", stats),
    topics: await generateSlideText("topics", stats),
    vocabulary: await generateSlideText("vocabulary", stats),
    stupidQuestions: await generateSlideText("stupidQuestions", stats),
    weirdest: await generateSlideText("weirdest", stats),
    validation: await generateSlideText("validation", stats),
    lateNight: await generateSlideText("lateNight", stats),
  };

  return { roast, personality, summary, slideTexts };
}

export function extractInsightStats(data: {
  summary: {
    totals: { messages: number; userMessages?: number; words: number };
    most_active_hour: number;
    longest_streak_days: number;
    top_topics: Array<{ label: string; pct: number }>;
    fun: {
      top_words?: Array<{ term: string; count: number }>;
      stupid_question_count?: number;
      weirdest_request?: string;
      right_count?: number;
      late_night_count?: number;
      active_days: number;
      period_days: number;
    };
  };
}): InsightStats {
  return {
    totalMessages: data.summary.totals.messages,
    userMessages:
      data.summary.totals.userMessages ?? data.summary.totals.messages,
    totalWords: data.summary.totals.words,
    topTopics: data.summary.top_topics.map((t) => t.label),
    topWords: (data.summary.fun.top_words || []).map((w) => w.term),
    lateNightCount: data.summary.fun.late_night_count ?? 0,
    stupidQuestionCount: data.summary.fun.stupid_question_count ?? 0,
    rightCount: data.summary.fun.right_count ?? 0,
    weirdestRequest: data.summary.fun.weirdest_request,
    mostActiveHour: data.summary.most_active_hour,
    longestStreak: data.summary.longest_streak_days,
    activeDays: data.summary.fun.active_days,
    periodDays: data.summary.fun.period_days,
  };
}
