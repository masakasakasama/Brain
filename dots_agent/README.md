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
4. Optionally configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Without them, important alerts are logged locally but **not pushed** to your phone.
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
- The model cannot perform commands, alter GitHub/Notion, send messages other than configured Telegram notifications, or remotely control a browser
- No credentials are checked in. The existing `agent.py` is a separate old proof of concept; news monitoring uses `news_watch.py`

## Billing

The low-activity estimate of about ¥1,600/month assumes a combined Luna and Sol batch every hour, Luna input 2k/output 300 tokens, Sol input 2k/output 1k tokens, 720 runs and $1=¥158. Real news batches can have significantly longer inputs, especially with high reasoning effort (hidden reasoning tokens are billed as output). One Sol call per article would multiply costs. Check actual `usage` values in the events log and cap monthly API spending. RSS access is generally free; paid APIs and hosting are not required for this MVP. PC power is billed separately.

## Status

The GitHub changes only provide code and scheduling configuration. No process is currently running on the user's PC. This is an MVP, not a complete replacement for Dots: persistent autonomous planning, Gmail/Calendar, full-page verification, browser actions, and approval-gated app writes are not built.

## Remove

`schtasks /Delete /TN TatsuDotsLuna /F`. Local data lives under `%USERPROFILE%\.tatsu-dots`.
