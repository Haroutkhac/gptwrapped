'use client';

import { useState } from 'react';
import type { WrappedData } from '@/types/data';

interface Props {
  data: WrappedData;
}

function buildSummary(data: WrappedData) {
  const topTopic = data.summary.top_topics[0];
  const keyword = data.summary.fun.top_keyword;
  return [
    `ChatGPT Wrapped ${data.summary.period.start} → ${data.summary.period.end}`,
    `${data.summary.totals.messages.toLocaleString()} messages (${data.summary.totals.words.toLocaleString()} words).`,
    `Longest streak ${data.summary.longest_streak_days} days; most active hour ${data.summary.most_active_hour}:00.`,
    topTopic ? `Top topic: ${topTopic.label} (${(topTopic.pct * 100).toFixed(1)}%).` : '',
    keyword ? `Keyword: “${keyword.term}”.` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

export default function ShareSummaryButton({ data }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const disabled = data.summary.totals.messages === 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary(data));
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.warn('Clipboard unavailable', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button className="button" onClick={handleCopy} aria-live="polite" disabled={disabled}>
      {status === 'copied' ? 'Summary copied ✅' : status === 'error' ? 'Clipboard blocked' : 'Copy summary'}
    </button>
  );
}
