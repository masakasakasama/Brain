# Tatsu Dots News (local Windows MVP)

The default agent watches what is trending in Japan and around the world, not repository commits. It runs via Windows Task Scheduler and processes each fresh news batch using one GPT-6 Luna triage call followed by one GPT-6.1 Sol reasoning call.

## News sources by default

- Google News Japan top headlines and AI topic search
- BBC World, Business, Technology
- Google Trends Japan trending-search RSS
- Hacker News RSS (technology community signals)

RSS availability may vary; inaccessible feeds fail individually without stopping healthy sources. The watcher analyzes headlines and feed snippets, **not full articles**. It explicitly treats headlines as unverified leads, so do not use these results as proof of a breaking event. Significant AI items (75/100+) and other significant news (85/100+) are eligible for notifications. Reports and actual model token usage are logged locally.

## Installation on your Lenovo Windows PC

1. Install Python 3.10 or newer. No pip dependencies.
2. Clone the repo or download this directory. Copy `dots_agent/config.example.json` to `dots_agent/config.json`. Edit sources and thresholds if needed.
3. Set a *dedicated low-budget* `OPENAI_API_KEY` as a Windows user environment variable (never in GitHub). Restart PowerShell after setting it.
4. Add `TATSU_HOME_AUTH_TOKEN` to the Windows user environment, with the same value as the existing Tatsu Home Backend `AI_BACKEND_TOKEN`. This is not the OpenAI API key. Do not paste it into GitHub. Without it, the watcher queues deliveries locally.
5. Run `python dots_agent/news_watch.py` once; this builds the initial baseline for each feed, with no API calls or alerts for old headlines.
6. Register the task: `powershell -ExecutionPolicy Bypass -File .\dots_agent\install_windows.ps1`.
7. Check the next scheduled run or run `schtasks /Run /TN TatsuDotsLuna`. Look at `%USERPROFILE%\.tatsu-dots\events.jsonl`, `news.sqlite3`, and Task Scheduler History.

The task is hourly. Windows sleep or shutdown pauses monitoring. Keep the PC on AC power, avoid sleep, and configure Windows updates / restart behavior. A 100W power adapter has a maximum rated output; measured wall consumption depends on actual workload.

## Agent behavior

- RSS feeds are polled on each scheduled run; previously processed items are deduplicated in local SQLite
- Newly encountered items are scored in one **batched** Luna call; the top 12 candidates then receive one **batched** Sol reasoning call, even when Luna scored them low
- No new headlines = **no Luna or Sol calls**. Every Luna run containing new headlines is followed by Sol (not one Sol request for every individual headline)
- Feed errors and model errors do not mark new items as processed; they can be retried at the next run
- Per-run cap: `max_items_per_run` (24 default), per feed: `per_source` (6 default)
- The model cannot perform commands, alter GitHub/Notion, or remotely control a browser. The only outgoing result is to the authenticated Tatsu Home Backend
- No credentials are checked in. The existing `agent.py` is a separate old proof of concept; news monitoring uses `news_watch.py`

## Billing

The low-activity estimate of about ¥1,600/month assumes a combined Luna and Sol batch every hour, Luna input 2k/output 300 tokens, Sol input 2k/output 1k tokens, 720 runs and $1=¥158. Real news batches can have significantly longer inputs, especially with high reasoning effort (hidden reasoning tokens are billed as output). One Sol call per article would multiply costs. Check actual `usage` values in the events log and cap monthly API spending. RSS access is generally free. Tatsu Home reuses its existing Neon database and Vercel deployment. PC power is billed separately.

## Status

The GitHub changes only provide code and scheduling configuration. No process is currently running on the user's PC. This is an MVP, not a complete replacement for Dots: persistent autonomous planning, Gmail/Calendar, full-page verification, browser actions, and approval-gated app writes are not built.

## Existing Home App integration

This watcher sends each analysed batch to the **existing Tatsu Home** `/api/news` endpoint using the Windows-only `TATSU_HOME_AUTH_TOKEN` environment variable. Telegram and LINE are not used. Failed network deliveries remain in a local SQLite outbox and are retried even when there is no new news. The Home Android app handles notification display on the phone via Android's normal local notification system. The Home web and Android apps show history. Deploy the Home endpoint and app changes before expecting news to appear. See `docs/BRAIN_NEWS.md` in the `AI-Assistant_handmade` repository.

## Remove

`schtasks /Delete /TN TatsuDotsLuna /F`. Local data lives under `%USERPROFILE%\.tatsu-dots`.
