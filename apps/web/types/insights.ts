export interface AIInsights {
  roast: string;
  personality: string;
  summary: string;
  slideTexts: {
    intro: string;
    topics: string;
    vocabulary: string;
    stupidQuestions: string;
    weirdest: string;
    validation: string;
    lateNight: string;
  };
}

export interface InsightStats {
  totalMessages: number;
  userMessages: number;
  totalWords: number;
  topTopics: string[];
  topWords: string[];
  lateNightCount: number;
  stupidQuestionCount: number;
  rightCount: number;
  weirdestRequest?: string;
  mostActiveHour: number;
  longestStreak: number;
  activeDays: number;
  periodDays: number;
}
