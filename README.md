# ChatGPT Wrapped (MVP)

Local-first analytics that turn your ChatGPT export into a Wrapped-style recap. The frontend lives in `apps/web` (Next.js 14), and all computation stays on-device.

> **Export requirement**: Bring your own ChatGPT data export. The app never calls OpenAI APIs; you import the official ZIP (Settings → Data Controls → Export Data), unpack it locally, and the analysis runs entirely on-device/offline.

> **Notes on environment**: Commands in this README assume you’re running locally on macOS/Linux with Node 22+, Python 3.9+, npm 10+, and a full ChatGPT export available. Some hosted sandboxes block network/filesystem calls, so re-run locally if a command fails due to sandboxing.

## Getting started

```bash
npm install
npm run dev --workspaces
```

The UI boots with empty metrics until you import your own export via the `/import` page.

If a command ever fails because of sandboxed network or filesystem access (common in hosted environments), re-run it locally—this repo assumes you’re on your own machine with your own ChatGPT export.
@@
