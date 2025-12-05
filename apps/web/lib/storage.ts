import type { Topic, WrappedData } from '@/types/data';
import type { TopicAnalysisResult } from './embeddings';
import type { NormalizedConversation } from './analytics';

const STORAGE_KEY = 'chatgpt-wrapped-data-v1';
export const TOPIC_OVERRIDES_KEY = 'chatgpt-wrapped-topic-overrides';
export const EMBEDDING_ANALYSIS_KEY = 'chatgpt-wrapped-embedding-analysis';
export const RAW_CONVERSATIONS_KEY = 'chatgpt-wrapped-raw-conversations';
export const STORAGE_EVENT = 'chatgpt-wrapped:data-updated';
export const TOPIC_OVERRIDES_EVENT = 'chatgpt-wrapped:topics-updated';
export const EMBEDDING_ANALYSIS_EVENT = 'chatgpt-wrapped:embedding-analysis-updated';

const IDB_NAME = 'chatgpt-wrapped-db';
const IDB_VERSION = 1;
const IDB_STORE = 'conversations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
}

export async function saveRawConversations(conversations: NormalizedConversation[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(conversations, RAW_CONVERSATIONS_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadRawConversations(): Promise<NormalizedConversation[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.get(RAW_CONVERSATIONS_KEY);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

export async function clearRawConversations(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(RAW_CONVERSATIONS_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    return;
  }
}

export async function hasRawConversations(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const conversations = await loadRawConversations();
    return conversations !== null && conversations.length > 0;
  } catch {
    return false;
  }
}

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
