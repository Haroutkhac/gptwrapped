ChatGPT Wrapped – MVP Spec & Starter Plan

1) Product vision

A personal analytics app that turns your ChatGPT export into a beautiful, interactive “Wrapped”-style experience. It highlights habits, topics, learning arcs, and fun stats across a chosen period (year, quarter, custom range). All processing is local-first and privacy‑preserving. No data leaves the user’s machine.

Implementation note for v0: This spec is written so it can be handed directly to Vercel v0. Keep the surface area small, prefer simple components, and avoid external services. Any network calls must be disallowed by default.

2) Core user stories
	1.	Import my official ChatGPT export (ZIP → folder).
	2.	Preview & clean: see how many conversations/messages will be processed. Filter by date range.
	3.	Analyze: compute metrics (activity, topics, sentiment, “modes”).
	4.	Explore an interactive dashboard (Wrapped carousel + deep‑dive pages).
	5.	Share: export a pretty shareable report (images/HTML) without leaking raw content.

3) Data sources
	•	Official ChatGPT export (Settings → Data Controls → Export Data). Use conversations.json or conversations/*.json.
	•	Optional: per‑chat manual labels (CSV/JSON) to improve topic names.

4) Processing pipeline

4.1 Stages
	1.	Ingest (JSON → normalized message table)
	2.	Enrich (derived metrics: word counts, durations, hourly buckets)
	3.	Classify (topics, “thinking modes”, sentiment)
	4.	Aggregate (time series + top‑N + per‑topic summaries)
	5.	Publish (compact JSON for the frontend + cached images/thumbnails)

4.2 Normalized schema (intermediate)

conversations
	•	id: string
	•	title: string
	•	created_at: datetime
	•	updated_at: datetime | null

messages
	•	id: string
	•	conversation_id: string
	•	role: enum('user','assistant','system','tool','unknown')
	•	created_at: datetime
	•	text: string
	•	word_count: int

message_features (optional wide table)
	•	message_id
	•	sentiment: float (−1..1)
	•	mode: enum('ask','code','debug','plan','reflect','chat','other')
	•	topic_id: string | null

topics
	•	topic_id: string
	•	label: string
	•	keywords: string[]

4.3 Derived metrics (definitions)
	•	Daily messages = count(messages by date)
	•	Daily words = sum(word_count by date)
	•	Most active hour = argmax(hourly histogram of message timestamps)
	•	Conversation length = count(messages per conversation)
	•	User/Assistant word ratio = sum(words by role)/total
	•	Streaks = max consecutive days with ≥1 message
	•	Top topics = top‑k by distinct messages or words
	•	Thinking modes breakdown = distribution over mode
	•	Sentiment heatmap = mean(sentiment by day/hour)

4.4 Topic modeling (simple → advanced)
	•	Baseline: TF‑IDF + k‑means (k≈10–20) with heuristic labeler from top terms.
	•	Better: BERTopic (if you allow embeddings locally). Fall back to TF‑IDF when offline.
	•	Human‑in‑loop: allow renaming/merging topics in UI; persist overrides.

4.5 Sentiment & “modes”
	•	Sentiment: VADER (quick), or small local model. Smooth with 7‑day rolling average.
	•	Thinking mode: rules first, model later. Examples:
	•	code if fenced code blocks present or tokens like def, {}, npm, SELECT.
	•	debug if text contains error, stack trace, exception, failing test.
	•	plan if plan, roadmap, steps, milestone.
	•	reflect if I feel, I realized, lessons.
	•	fallback → ask/chat.

4.6 Privacy & data residency (local‑only)
	•	Local‑only processing: All parsing, analysis, and visualization must run on the user’s device (browser or local Node process). Do not upload the export anywhere.
	•	No telemetry / analytics / crash reporting: Remove third‑party analytics. No Sentry, no GA, no external logs.
	•	No remote model calls: Topic/mode/sentiment must use local heuristics or local models. If a model is added later, it must run in‑browser (WebAssembly/WebGPU) or in a local process.
	•	CSP hardening: Ship a strict Content‑Security‑Policy that blocks all outbound connections except to self. Use system fonts or locally bundled assets only.
	•	Offline‑first UX: App should fully load and operate without internet. Provide an Offline Mode indicator.
	•	Ephemeral storage: Store intermediates in memory, IndexedDB, or a local SQLite/DuckDB file under the user’s control. Provide a “Delete all local data” button that purges caches and intermediates.
	•	Export safety: When exporting shareable images/HTML, never include raw message bodies unless the user explicitly toggles it on.

5) “Wrapped” experience (UX)

A carousel that cycles through 6–10 highlight cards with confetti/particles and bold typography. Each card links into a deep‑dive tab.

Highlight cards (examples)
	1.	Total messages & words + % vs last period.
	2.	Most active day & hour with a sparkline.
	3.	Your top 5 topics (badges) with emoji icons.
	4.	The long one: your longest conversation (title, duration, word count).
	5.	Modes mix donut: code, debug, design, planning, etc.
	6.	Streaks: longest daily streak.
	7.	Curves: momentum chart (rolling weekly words).
	8.	Fun stats: “You typed enough words to fill N pages of a novel.”

Deep‑dive tabs
	•	Activity (calendar heatmap + hourly ridgeline)
	•	Topics (cluster map + timeline)
	•	Modes (stacked area over time)
	•	Sentiment (heatmap + volatility)
	•	Conversations (searchable table, open details)

6) Tech stack

Frontend: Next.js (App Router) + Tailwind + shadcn/ui + recharts. All charts and parsing can run client‑side. Use server actions only for local file I/O when packaged as an Electron app.

Backend: None required for the web build. For an optional desktop variant, use Electron or Tauri to guarantee local filesystem access. No remote servers.

Data: Keep intermediates in memory or browser storage (IndexedDB via Dexie). For desktop, use a local SQLite/DuckDB file. Never write outside the user‑chosen directory.

Packaging: Start as a web app that works fully offline (PWA). Later, offer an Electron wrapper for fully local file access.

7) API / data contracts (frontend‑consumed JSON)

/data/summary.json

{
  "period": {"start": "2025-01-01", "end": "2025-12-31"},
  "totals": {"messages": 4281, "words": 713204},
  "most_active_hour": 22,
  "longest_streak_days": 18,
  "top_topics": [{"label":"System design","pct":0.22},{"label":"Coding","pct":0.19}],
  "modes": [{"mode":"code","pct":0.34},{"mode":"ask","pct":0.28}],
  "fun": {"novel_pages": 284, "avg_words_per_day": 1951}
}

/data/activity_timeseries.json (daily)

[{"date":"2025-06-01","messages":83,"words":12944,"sentiment":0.12}, ...]

/data/topics.json

[{"topic_id":"t12","label":"System design","size":1243,"color":"#8b5cf6"}]

/data/messages_sample.json (for conversation drill‑down; body optional/redacted)

[{"conversation_id":"c1","title":"Kafka backpressure","messages":213,"start":"2025-03-02"}]

8) Pages & components (frontend)
	•	/ Wrapped carousel (cards: Totals, Top Topics, Streaks, Modes, Sentiment, Longest Thread)
	•	/explore/activity Calendar heatmap, hour histogram, streaks
	•	/explore/topics Force‑directed cluster, topic table, rename/merge modal
	•	/explore/modes Stacked area by week, definitions
	•	/explore/sentiment Heatmap + moving average + outlier list
	•	/explore/conversations Searchable table, drawer for details
	•	/import Drag‑drop ZIP or folder → parse → preview → run analysis

Reusable components: FileDropZone, PeriodPicker, KPIStat, Donut, AreaChart, Heatmap, ForceGraph, DataTable

9) MVP milestones

Milestone 1 – Local import & basic Wrapped (1–2 days)
	•	Import export folder
	•	Parse to normalized tables
	•	Compute basics (messages/words by day, top hours, streaks)
	•	Render 6 cards + calendar heatmap

Milestone 2 – Topics & Modes (2–3 days)
	•	TF‑IDF topic clusters + auto labels
	•	Rules‑based “thinking modes”
	•	Topic/mode visuals + drill‑downs

Milestone 3 – Shareables & polish (1–2 days)
	•	Export PNG of each card
	•	Theme selector; privacy toggles (redact bodies)

10) Minimal ETL outline (Python CLI)

Use alongside the earlier Markdown converter; emit compact JSON for the app.

# etl_chatgpt_wrapped.py (outline)
import json, re, math
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict

def words(text):
    return re.findall(r"[A-Za-z0-9_']+", text or "")

def load_conversations(export_dir: Path):
    # reuse your existing loader; return list of {title, create_time, messages:[{role, text, create_time}]}
    ...

def compute_daily(convos):
    daily = defaultdict(lambda: {"messages":0, "words":0})
    for c in convos:
        for m in c["messages"]:
            d = datetime.fromtimestamp(m["create_time"]).date().isoformat()
            daily[d]["messages"] += 1
            daily[d]["words"] += len(words(m.get("content","")))
    return [{"date":k, **v} for k,v in sorted(daily.items())]

def top_hour(convos):
    hours = Counter()
    for c in convos:
        for m in c["messages"]:
            h = datetime.fromtimestamp(m["create_time"]).hour
            hours[h]+=1
    return hours.most_common(1)[0][0] if hours else 0

# TODO: add topics (TF‑IDF) and modes (rules) here

if __name__ == "__main__":
    export = Path("./export_unzipped")
    out = Path("./web/public/data")
    out.mkdir(parents=True, exist_ok=True)
    convos = load_conversations(export)
    with (out/"activity_timeseries.json").open("w") as f:
        json.dump(compute_daily(convos), f)
    summary = {
        "period": {"start": "2025-01-01", "end":"2025-12-31"},
        "totals": {"messages": sum(x["messages"] for x in compute_daily(convos)),
                    "words":   sum(x["words"] for x in compute_daily(convos))},
        "most_active_hour": top_hour(convos),
        "longest_streak_days": 0,
        "top_topics": [],
        "modes": [],
        "fun": {"novel_pages": 0, "avg_words_per_day": 0}
    }
    json.dump(summary, (out/"summary.json").open("w"))

11) Next.js starter (structure)

apps/web
  ├─ app/
  │   ├─ page.tsx                # Wrapped carousel
  │   ├─ explore/
  │   │   ├─ activity/page.tsx
  │   │   ├─ topics/page.tsx
  │   │   ├─ modes/page.tsx
  │   │   └─ sentiment/page.tsx
  │   └─ import/page.tsx
  ├─ components/
  │   ├─ KpiStat.tsx
  │   ├─ Donut.tsx
  │   ├─ AreaChart.tsx
  │   ├─ Heatmap.tsx
  │   ├─ ForceGraph.tsx
  │   └─ FileDropZone.tsx
  └─ public/data/summary.json

12) Fun stats catalog (pick 3–6 for v1)
	•	“You chatted on X of Y days this period.”
	•	“Most nocturnal hour: 22:00.”
	•	“Longest streak: N days.”
	•	“You wrote N words — ~M book pages.”
	•	“Top collaborator mode: code / design / debugging.”
	•	“Most used keyword: ‘kafka’ (appeared N times).”

13) Stretch goals
	•	Knowledge graph (NetworkX + D3 client render)
	•	Search over your corpus with vector index (local embeddings)
	•	Compare periods (Quarter vs Quarter; Year‑over‑Year)
	•	Goal tracking (e.g., “practice system design 3×/week”) with progress ring
	•	Templates to create printable year‑in‑review posters

14) Build with Vercel v0 (handoff notes)
	•	Keep prompts concise. Provide concrete component names: KpiStat, Donut, Heatmap, AreaChart, FileDropZone.
	•	Ask v0 to scaffold pages: /, /explore/*, /import with placeholder data and types matching this spec.
	•	Require a no‑network guard: a small utility that throws if fetch() targets a non‑self origin; include unit tests.
	•	Include a ClearLocalData component wired to purge IndexedDB/localStorage.
	•	Generate minimal TypeScript types for /public/data/*.json contracts and validate with zod client‑side.
	•	Ensure CI checks fail if any external URL or analytics SDK is introduced.