'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Topic, WrappedData } from '@/types/data';
import { TOPIC_OVERRIDES_EVENT, loadStoredWrappedData, loadTopicOverrides, subscribeToStoredData } from '@/lib/storage';
import { applyTopicOverrides } from '@/lib/topics';
import { emptyWrappedData } from '@/lib/emptyDataset';

interface DataContextValue {
  data: WrappedData;
  hasImportedData: boolean;
  hydrated: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

interface Props {
  initialData: WrappedData | null;
  children: React.ReactNode;
}

export function DataProvider({ initialData, children }: Props) {
  const [state, setState] = useState(() => {
    if (initialData) {
      return { baseData: initialData, hasImportedData: true };
    }
    return { baseData: emptyWrappedData, hasImportedData: false };
  });
  const [topicOverrides, setTopicOverrides] = useState<Topic[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { baseData, hasImportedData } = state;

  useEffect(() => {
    const storedData = loadStoredWrappedData();
    if (storedData) {
      setState({ baseData: storedData, hasImportedData: true });
    } else if (!initialData) {
      setState({ baseData: emptyWrappedData, hasImportedData: false });
    }
    setTopicOverrides(loadTopicOverrides());
    setHydrated(true);

    const unsubscribe = subscribeToStoredData((payload) => {
      if (payload) {
        setState({ baseData: payload, hasImportedData: true });
      } else {
        setState({ baseData: emptyWrappedData, hasImportedData: false });
      }
    });

    const handleTopicOverrides = () => {
      setTopicOverrides(loadTopicOverrides());
    };

    window.addEventListener(TOPIC_OVERRIDES_EVENT, handleTopicOverrides as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener(TOPIC_OVERRIDES_EVENT, handleTopicOverrides as EventListener);
    };
  }, [initialData]);

  const mergedData = useMemo(() => applyTopicOverrides(baseData, topicOverrides), [baseData, topicOverrides]);

  return <DataContext.Provider value={{ data: mergedData, hasImportedData, hydrated }}>{children}</DataContext.Provider>;
}

export function useWrappedData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useWrappedData must be used within DataProvider');
  }
  return context;
}
