'use client';

import { useState } from 'react';
import FileDropZone from '@/components/FileDropZone';
import KpiStat from '@/components/KpiStat';
import { ingestExportFiles } from '@/lib/importer';
import { filterConversationsByDate, runLocalAnalysis, type NormalizedConversation } from '@/lib/analytics';
import { clearTopicOverrides, clearEmbeddingAnalysis, clearStoredWrappedData, saveWrappedData, RAW_CONVERSATIONS_KEY } from '@/lib/storage';
import type { WrappedData } from '@/types/data';
import { Settings, Download, Upload, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function ImportGuide() {
  const steps = [
    {
      number: 1,
      icon: Settings,
      title: 'Go to ChatGPT Settings',
      description: 'Open ChatGPT, click your profile icon, and navigate to Settings → Data Controls',
    },
    {
      number: 2,
      icon: Download,
      title: 'Export Your Data',
      description: 'Click "Export data" and confirm. You\'ll receive an email with a download link within a few minutes.',
    },
    {
      number: 3,
      icon: Upload,
      title: 'Upload conversations.json',
      description: 'Extract the ZIP file and drag the conversations.json file into the upload area below.',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-6">How to Import Your ChatGPT Data</h2>
      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div 
            key={step.number}
            className="bg-[#181818] border border-[#282828] rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shrink-0">
              <span className="text-black font-bold text-lg">{step.number}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center shrink-0">
              <step.icon size={20} className="text-[#B3B3B3]" />
              </div>
              <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold">{step.title}</h3>
              <p className="text-[#B3B3B3] text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImportWorkflow() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [preview, setPreview] = useState<WrappedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [conversations, setConversations] = useState<NormalizedConversation[] | null>(null);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [defaultRange, setDefaultRange] = useState<{ start: string; end: string } | null>(null);

  const handleFiles = async (files: File[]) => {
    setStatus('processing');
    setError(null);
    setWarning(null);
    
    clearStoredWrappedData();
    clearEmbeddingAnalysis();
    localStorage.removeItem(RAW_CONVERSATIONS_KEY);
    
    try {
      const normalized = await ingestExportFiles(files);
      if (!normalized.length) {
        throw new Error('No conversations found in provided files.');
      }
      const result = runLocalAnalysis(normalized);
      saveWrappedData(result);
      
      try {
      localStorage.setItem(RAW_CONVERSATIONS_KEY, JSON.stringify(normalized));
      } catch (storageErr) {
        console.warn('Could not save raw conversations:', storageErr);
        localStorage.removeItem(RAW_CONVERSATIONS_KEY);
        setWarning('Your conversation history is too large to store for AI topic analysis. Basic analytics will still work.');
      }
      
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2">Import Your Data</h1>
        <p className="text-[#B3B3B3]">
          Upload your ChatGPT export to see your personalized analytics and wrapped experience.
        </p>
      </div>

      <ImportGuide />

      <section className="space-y-6">
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Upload size={20} className="text-[#1DB954]" />
            Upload Your Export
          </h3>
          <FileDropZone onFiles={handleFiles} accept=".zip,.json" />
          {status === 'processing' && (
            <p className="mt-4 text-[#B3B3B3] flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
              Processing locally…
            </p>
          )}
          {error && <p className="mt-4 text-red-400">{error}</p>}
          {warning && (
            <p className="mt-4 text-yellow-400 text-sm">
              ⚠️ {warning}
            </p>
          )}
        </div>

        {preview && (
          <article className="bg-[#181818] border border-[#282828] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 size={24} className="text-[#1DB954]" />
              Import Successful!
            </h2>
            {range && (
              <div className="flex gap-4 flex-wrap items-end mb-6">
                <label className="flex flex-col text-sm gap-1">
                  <span className="text-[#B3B3B3]">Start date</span>
                  <input
                    type="date"
                    value={range.start}
                    onChange={(event) => handleRangeChange('start', event.target.value)}
                    min={defaultRange?.start}
                    max={range.end}
                    className="rounded-lg border border-[#333] bg-[#242424] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                  />
                </label>
                <label className="flex flex-col text-sm gap-1">
                  <span className="text-[#B3B3B3]">End date</span>
                  <input
                    type="date"
                    value={range.end}
                    onChange={(event) => handleRangeChange('end', event.target.value)}
                    min={range.start}
                    max={defaultRange?.end}
                    className="rounded-lg border border-[#333] bg-[#242424] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                  />
                </label>
                <button 
                  className="px-4 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors text-sm font-medium"
                  onClick={handleResetRange}
                >
                  Reset range
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KpiStat label="Messages" value={preview.summary.totals.messages.toLocaleString()} />
              <KpiStat label="Words" value={preview.summary.totals.words.toLocaleString()} />
              <KpiStat label="Longest streak" value={`${preview.summary.longest_streak_days} days`} />
            </div>
            <div className="space-y-1 text-sm text-[#B3B3B3] mb-6">
              <p>
                Active days: {preview.summary.fun.active_days}/{preview.summary.fun.period_days} (
                {((preview.summary.fun.active_days / preview.summary.fun.period_days) * 100 || 0).toFixed(1)}%)
              </p>
              <p>
                Word split: {(preview.summary.fun.user_words_pct * 100).toFixed(1)}% user /{' '}
                {(preview.summary.fun.assistant_words_pct * 100).toFixed(1)}% assistant
              </p>
              {preview.summary.fun.top_keyword && (
                <p>
                  Most used keyword: &ldquo;{preview.summary.fun.top_keyword.term}&rdquo; ({preview.summary.fun.top_keyword.count} mentions)
                </p>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button 
                className="px-6 py-3 bg-[#333] text-white rounded-full hover:bg-[#444] transition-colors font-bold"
                onClick={downloadReport}
              >
                Export JSON snapshot
              </button>
              <Link 
                href="/" 
                className="px-6 py-3 bg-[#1DB954] text-black rounded-full hover:scale-105 transition-transform font-bold inline-flex items-center gap-2"
              >
                View Wrapped
                <ArrowRight size={18} />
              </Link>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
