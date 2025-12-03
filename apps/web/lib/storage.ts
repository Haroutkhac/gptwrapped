import type { Topic, WrappedData } from '@/types/data';
import type { TopicAnalysisResult } from './embeddings';

const STORAGE_KEY = 'chatgpt-wrapped-data-v1';
export const TOPIC_OVERRIDES_KEY = 'chatgpt-wrapped-topic-overrides';
export const EMBEDDING_ANALYSIS_KEY = 'chatgpt-wrapped-embedding-analysis';
export const RAW_CONVERSATIONS_KEY = 'chatgpt-wrapped-raw-conversations';
export const STORAGE_EVENT = 'chatgpt-wrapped:data-updated';
export const TOPIC_OVERRIDES_EVENT = 'chatgpt-wrapped:topics-updated';
export const EMBEDDING_ANALYSIS_EVENT = 'chatgpt-wrapped:embedding-analysis-updated';

export function saveWrappedData(data: WrappedData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: data }));
}

export function loadStoredWrappedData(): WrappedData | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WrappedData;
  } catch (error) {
    console.warn('Failed to parse stored data', error);
    return null;
  }
}

export function clearStoredWrappedData() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: null }));
  clearTopicOverrides();
}

export function subscribeToStoredData(callback: (data: WrappedData | null) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<WrappedData | null>;
    callback(custom.detail ?? loadStoredWrappedData());
  };
  const storageHandler = () => callback(loadStoredWrappedData());
  window.addEventListener(STORAGE_EVENT, handler as EventListener);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler as EventListener);
    window.removeEventListener('storage', storageHandler);
  };
}

export function loadTopicOverrides(): Topic[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TOPIC_OVERRIDES_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Topic[];
  } catch (error) {
    console.warn('Invalid topic overrides payload', error);
    return null;
  }
}

export function saveTopicOverrides(topics: Topic[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOPIC_OVERRIDES_KEY, JSON.stringify(topics));
  window.dispatchEvent(new CustomEvent(TOPIC_OVERRIDES_EVENT, { detail: topics }));
}

export function clearTopicOverrides() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOPIC_OVERRIDES_KEY);
  window.dispatchEvent(new CustomEvent(TOPIC_OVERRIDES_EVENT, { detail: null }));
}

export function saveEmbeddingAnalysis(analysis: TopicAnalysisResult) {
  if (typeof window === 'undefined') return;
  const withoutEmbeddings = {
    ...analysis,
    embeddings: analysis.embeddings.map(e => ({
      ...e,
      embedding: []
    }))
  };
  window.localStorage.setItem(EMBEDDING_ANALYSIS_KEY, JSON.stringify(withoutEmbeddings));
  window.dispatchEvent(new CustomEvent(EMBEDDING_ANALYSIS_EVENT, { detail: analysis }));
}

export function loadEmbeddingAnalysis(): TopicAnalysisResult | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(EMBEDDING_ANALYSIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TopicAnalysisResult;
  } catch (error) {
    console.warn('Failed to parse embedding analysis', error);
    return null;
  }
}

export function clearEmbeddingAnalysis() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(EMBEDDING_ANALYSIS_KEY);
  window.dispatchEvent(new CustomEvent(EMBEDDING_ANALYSIS_EVENT, { detail: null }));
}

export function subscribeToEmbeddingAnalysis(callback: (analysis: TopicAnalysisResult | null) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<TopicAnalysisResult | null>;
    callback(custom.detail ?? loadEmbeddingAnalysis());
  };
  window.addEventListener(EMBEDDING_ANALYSIS_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(EMBEDDING_ANALYSIS_EVENT, handler as EventListener);
  };
}
