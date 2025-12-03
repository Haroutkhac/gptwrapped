'use client';

import { useState } from 'react';
import { clearStoredWrappedData } from '@/lib/storage';

type IndexedDBWithDatabases = typeof indexedDB & {
  databases?: () => Promise<Array<{ name?: string | null }>>;
};

async function clearIndexedDB() {
  if (typeof indexedDB === 'undefined') return;
  const enhanced = indexedDB as IndexedDBWithDatabases;
  if (typeof enhanced.databases !== 'function') return;
  const databases = await enhanced.databases();
  for (const db of databases) {
    if (db?.name) {
      enhanced.deleteDatabase(db.name);
    }
  }
}

export default function ClearLocalData() {
  const [status, setStatus] = useState<'idle' | 'working' | 'done'>('idle');

  const handleClick = async () => {
    setStatus('working');
    clearStoredWrappedData();
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    }
    await clearIndexedDB();
    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button className="button" onClick={handleClick} disabled={status === 'working'}>
      {status === 'working' ? 'Clearing…' : status === 'done' ? 'Purged ✨' : 'Delete local data'}
    </button>
  );
}
