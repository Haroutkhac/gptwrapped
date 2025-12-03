'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Topic, WrappedData } from '@/types/data';
import { TOPIC_OVERRIDES_EVENT, loadStoredWrappedData, loadTopicOverrides, subscribeToStoredData } from '@/lib/storage';
import { applyTopicOverrides } from '@/lib/topics';
import { emptyWrappedData } from '@/lib/emptyDataset';

interface DataContextValue {
  data: WrappedData;
  hasImportedData: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

interface Props {
  initialData: WrappedData | null;
  children: React.ReactNode;
}

export function DataProvider({ initialData, children }: Props) {
  const [baseData, setBaseData] = useState<WrappedData>(initialData ?? emptyWrappedData);
  const [hasImportedData, setHasImportedData] = useState<boolean>(Boolean(initialData));
  const [topicOverrides, setTopicOverrides] = useState<Topic[] | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedData = loadStoredWrappedData();
    if (storedData) {
      setBaseData(storedData);
      setHasImportedData(true);
    }
    setTopicOverrides(loadTopicOverrides());

    const unsubscribe = subscribeToStoredData((payload) => {
      if (payload) {
        setBaseData(payload);
        setHasImportedData(true);
      } else {
        setBaseData(emptyWrappedData);
        setHasImportedData(false);
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

  return <DataContext.Provider value={{ data: mergedData, hasImportedData }}>{children}</DataContext.Provider>;
}

export function useWrappedData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useWrappedData must be used within DataProvider');
  }
  return context;
}
