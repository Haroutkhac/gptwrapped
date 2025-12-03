import type { WrappedData } from '@/types/data';

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function buildReportHtml(data: WrappedData) {
  const modeRows = data.summary.modes
    .map((mode) => `<tr><td>${mode.mode}</td><td>${percent(mode.pct)}</td></tr>`) 
    .join('');
  const topicRows = data.summary.top_topics
    .map((topic) => `<tr><td>${topic.label}</td><td>${percent(topic.pct)}</td></tr>`) 
    .join('');

  const styles = `
    body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#05070c; color:#f8fafc; margin:0; padding:32px; }
    h1 { margin-top:0; font-size:32px; }
    section { border:1px solid rgba(255,255,255,0.12); border-radius:24px; padding:24px; margin-bottom:16px; background:linear-gradient(135deg,rgba(73, 97, 230, 0.2), rgba(3, 7, 18, 0.9)); }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { text-align:left; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08); }
    footer { text-align:center; opacity:0.7; margin-top:24px; font-size:12px; }
  `;

  const funLines = [
    `You chatted on ${data.summary.fun.active_days} of ${data.summary.fun.period_days} days in this window.`,
    `Most active hour: ${data.summary.most_active_hour}:00.`,
    `Longest streak: ${data.summary.longest_streak_days} days.`,
    `You wrote ${data.summary.totals.words.toLocaleString()} words (~${data.summary.fun.novel_pages} pages).`,
    `Word split: ${(data.summary.fun.user_words_pct * 100).toFixed(1)}% user / ${(data.summary.fun.assistant_words_pct * 100).toFixed(1)}% assistant.`
  ];
  if (data.summary.fun.top_keyword) {
    funLines.push(
      `Most used keyword: “${data.summary.fun.top_keyword.term}” (${data.summary.fun.top_keyword.count} mentions).`
    );
  }

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>ChatGPT Wrapped – Shareable Report</title>
      <style>${styles}</style>
    </head>
    <body>
      <h1>Your ChatGPT Wrapped</h1>
      <section>
        <h2>Totals</h2>
        <p>Messages: <strong>${data.summary.totals.messages.toLocaleString()}</strong></p>
        <p>Words: <strong>${data.summary.totals.words.toLocaleString()}</strong></p>
        <ul>
          ${funLines.map((line) => `<li>${line}</li>`).join('')}
        </ul>
      </section>
      <section>
        <h2>Top Topics</h2>
        <table>
          <tbody>${topicRows}</tbody>
        </table>
      </section>
      <section>
        <h2>Modes</h2>
        <table>
          <tbody>${modeRows}</tbody>
        </table>
      </section>
      <footer>Generated locally — raw message content omitted for privacy.</footer>
    </body>
  </html>`;
}
