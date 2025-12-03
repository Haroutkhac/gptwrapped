'use client';

import { useState } from 'react';
import FileDropZone from '@/components/FileDropZone';
import KpiStat from '@/components/KpiStat';
import { ingestExportFiles } from '@/lib/importer';
import { filterConversationsByDate, runLocalAnalysis, type NormalizedConversation } from '@/lib/analytics';
import { clearTopicOverrides, clearEmbeddingAnalysis, saveWrappedData, RAW_CONVERSATIONS_KEY } from '@/lib/storage';
import type { WrappedData } from '@/types/data';

export default function ImportWorkflow() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [preview, setPreview] = useState<WrappedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<NormalizedConversation[] | null>(null);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [defaultRange, setDefaultRange] = useState<{ start: string; end: string } | null>(null);

  const handleFiles = async (files: File[]) => {
    setStatus('processing');
    setError(null);
    try {
      const normalized = await ingestExportFiles(files);
      if (!normalized.length) {
        throw new Error('No conversations found in provided files.');
      }
      const result = runLocalAnalysis(normalized);
      clearTopicOverrides();
      clearEmbeddingAnalysis();
      saveWrappedData(result);
      localStorage.setItem(RAW_CONVERSATIONS_KEY, JSON.stringify(normalized));
      setPreview(result);
      setConversations(normalized);
      const period = { start: result.summary.period.start, end: result.summary.period.end };
      setRange(period);
      setDefaultRange(period);
      setStatus('ready');
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const handleRangeChange = (key: 'start' | 'end', value: string) => {
    if (!value) return;
    if (!conversations) return;
    setError(null);
    setRange((prev) => {
      const nextBase = { ...(prev ?? { start: value, end: value }), [key]: value };
      let next = nextBase;
      if (next.start && next.end && next.start > next.end) {
        next = key === 'start' ? { ...next, end: next.start } : { ...next, start: next.end };
      }
      const filtered = filterConversationsByDate(conversations, next.start, next.end);
      if (!filtered.length) {
        setError('No conversations found in that range.');
        return prev ?? null;
      }
      const dataset = runLocalAnalysis(filtered);
      setPreview(dataset);
      saveWrappedData(dataset);
      return next;
    });
  };

  const handleResetRange = () => {
    if (!conversations || !defaultRange) return;
    const dataset = runLocalAnalysis(conversations);
    setPreview(dataset);
    setRange(defaultRange);
    saveWrappedData(dataset);
    setError(null);
  };

  const downloadReport = () => {
    if (!preview) return;
    const blob = new Blob([JSON.stringify(preview, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'chatgpt-wrapped.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ display: 'grid', gap: '1.5rem', width: '100%', maxWidth: '100%' }}>
      <FileDropZone onFiles={handleFiles} accept=".zip,.json" />
      {status === 'processing' && <p>Processing locally…</p>}
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {preview && (
        <article style={{ borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2>Preview summary</h2>
          {range && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', gap: '0.3rem' }}>
                Start date
                <input
                  type="date"
                  value={range.start}
                  onChange={(event) => handleRangeChange('start', event.target.value)}
                  min={defaultRange?.start}
                  max={range.end}
                  style={{
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'inherit',
                    padding: '0.4rem 0.6rem'
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', gap: '0.3rem' }}>
                End date
                <input
                  type="date"
                  value={range.end}
                  onChange={(event) => handleRangeChange('end', event.target.value)}
                  min={range.start}
                  max={defaultRange?.end}
                  style={{
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'inherit',
                    padding: '0.4rem 0.6rem'
                  }}
                />
              </label>
              <button className="button" onClick={handleResetRange}>
                Reset range
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '1rem', width: '100%' }}>
            <KpiStat label="Messages" value={preview.summary.totals.messages.toLocaleString()} />
            <KpiStat label="Words" value={preview.summary.totals.words.toLocaleString()} />
            <KpiStat label="Longest streak" value={`${preview.summary.longest_streak_days} days`} />
          </div>
          <p style={{ marginTop: '0.5rem', color: '#a0aec0' }}>
            Active days: {preview.summary.fun.active_days}/{preview.summary.fun.period_days} (
            {((preview.summary.fun.active_days / preview.summary.fun.period_days) * 100 || 0).toFixed(1)}%)
          </p>
          <p style={{ marginTop: '0.2rem', color: '#a0aec0' }}>
            Word split: {(preview.summary.fun.user_words_pct * 100).toFixed(1)}% user /{' '}
            {(preview.summary.fun.assistant_words_pct * 100).toFixed(1)}% assistant
          </p>
          {preview.summary.fun.top_keyword && (
            <p style={{ marginTop: '0.2rem', color: '#a0aec0' }}>
              Most used keyword: &ldquo;{preview.summary.fun.top_keyword.term}&rdquo; ({preview.summary.fun.top_keyword.count} mentions)
            </p>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="button" onClick={downloadReport}>
              Export JSON snapshot
            </button>
            <a href="/" className="button">
              View Wrapped
            </a>
          </div>
        </article>
      )}
    </section>
  );
}
