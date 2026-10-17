# Tatsu Dots (Windows-PC proof of concept)

Small local monitor using GPT-6 Luna for **triage only after changes**. This lives alongside Brain and does not change the existing Codex automation. Supports GitHub commits, RSS/Atom feeds and Notion page edit timestamps (with a separately created Notion integration). It is **not yet** equivalent to a full autonomous Dots agent with browser interaction and app-write permissions.

## Windows setup

1. Install Python 3.10 or later; no third-party Python packages required.
2. Copy `config.example.json` to `config.json` and adjust source IDs/targets.
3. Set `OPENAI_API_KEY` in your Windows user environment, not in the repository. Restart PowerShell after using `setx OPENAI_API_KEY "..." `. Use a dedicated low-limit API key.
4. Optionally set `GITHUB_TOKEN` (private repositories or higher rate limits), `NOTION_API_TOKEN` (Notion integration), and `TELEGRAM_BOT_TOKEN` plus `TELEGRAM_CHAT_ID` (notifications). NEVER commit them.
5. Run `python dots_agent/agent.py` once. The first scan **only baselines** existing events, to avoid old-event spam.
6. Run `powershell -ExecutionPolicy Bypass -File .\dots_agent\install_windows.ps1` to register an hourly Windows Task Scheduler task. Set the task to run when the user is not logged in only if the Windows account/permissions allow it.
7. For immediate testing: `schtasks /Run /TN TatsuDotsLuna`. Check `%USERPROFILE%\.tatsu-dots\events.jsonl` and Task Scheduler history.

## How it works

Windows scheduled task → GitHub/RSS/Notion read → local SQLite deduplication → (only for new or modified items) OpenAI Responses API (`gpt-6-luna`) → save local audit log → optional Telegram alert on high-impact changes.

- The model does **not** continuously generate tokens or watch a microphone.
- Data remains locally stored under `%USERPROFILE%\.tatsu-dots`; item excerpts go to OpenAI only for triage. Do not watch sensitive content until its handling is explicitly configured.
- Credential values never belong in GitHub. The Brain repository is public.
- Incoming content is untrusted and cannot directly trigger shell commands, browser actions or writes to other apps.
- The agent is read-only, and no outgoing Telegram notification is sent unless both Telegram variables exist.
- OpenAI API metering is request/token based. External services and PC electricity are separate.
- If the PC sleeps, is offline, Windows Task Scheduler is disabled, or the system reboots without automatic startup, no monitoring occurs.
- The Notion source detects page modification time, but does not currently read the body. For an enabled `notion_page` source, add e.g. `{"id":"my-notion-page","type":"notion_page","page_id":"<page_uuid>","label":"My page"}`.
- Gmail, Google Calendar, semantic memory, real computer/browser control, and approval-gated write actions are **planned**, not implemented. Native ChatGPT connector credentials are not transferrable to a standalone Windows process.

## Cost controls

At most `max_items_per_source` (4 by default) new items per source per hourly run are evaluated. No new items means zero Luna API calls. Even after this cap, API billing depends on content length and actual output token usage. To prevent unexpected costs, set a monthly spend threshold/limit in the API billing console.

## Deactivate

`schtasks /Delete /TN TatsuDotsLuna /F`. Delete `%USERPROFILE%\.tatsu-dots` to remove local event data. The repository itself does not run any code on the PC.
