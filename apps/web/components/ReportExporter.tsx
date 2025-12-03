'use client';

import { useState } from 'react';
import { buildReportHtml } from '@/lib/report';
import type { WrappedData } from '@/types/data';

interface Props {
  data: WrappedData;
}

export default function ReportExporter({ data }: Props) {
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

  const handleExport = () => {
    const html = buildReportHtml(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'chatgpt-wrapped-report.html';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button className="button" onClick={handleExport}>
      {status === 'done' ? 'Report saved ✅' : 'Export shareable report'}
    </button>
  );
}
