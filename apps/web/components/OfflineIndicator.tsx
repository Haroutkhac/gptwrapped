'use client';

import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }

    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <span
      style={{
        padding: '0.4rem 0.8rem',
        borderRadius: 999,
        background: online ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)',
        color: online ? '#34d399' : '#f87171',
        border: `1px solid ${online ? 'rgba(16,185,129,0.5)' : 'rgba(248,113,113,0.5)'}`,
        fontSize: '0.85rem'
      }}
    >
      {online ? 'Offline-capable' : 'Offline mode'}
    </span>
  );
}
