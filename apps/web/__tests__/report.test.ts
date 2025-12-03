import { describe, it, expect } from 'vitest';
import { buildReportHtml } from '@/lib/report';
import { sampleData } from '@/lib/sampleData';

describe('buildReportHtml', () => {
  it('renders totals without raw conversation text', () => {
    const html = buildReportHtml(sampleData);
    expect(html).toContain('ChatGPT Wrapped');
    expect(html).toContain(sampleData.summary.totals.messages.toLocaleString('en-US'));
    expect(html).not.toContain(sampleData.conversations[0].title);
    expect(html).toContain('Generated locally');
    expect(html).toContain('Most used keyword');
    expect(html).toContain('Word split');
  });
});
