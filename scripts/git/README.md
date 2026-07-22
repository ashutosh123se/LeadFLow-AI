# Scheduled Git Commits

Split project updates into small, realistic commits and push them on a regular schedule.

## Why

LeadFlow changes were bundled in one session. This queue breaks them into **12 logical commits** (~2 per scheduled run) so your GitHub activity shows steady, incremental progress.

## Quick start

```powershell
cd LeadFLow-AI-main

# 1. Initialize repo (once)
git init
git branch -M main

# 2. Preview next commits
powershell -ExecutionPolicy Bypass -File scripts/git/scheduled-commit.ps1 -DryRun

# 3. Run 2 commits now
powershell -ExecutionPolicy Bypass -File scripts/git/scheduled-commit.ps1

# 4. Add GitHub remote (once)
git remote add origin https://github.com/YOUR_USER/LeadFlow-AI.git

# 5. Install Windows scheduler (Mon/Wed/Fri 10:30 AM)
powershell -ExecutionPolicy Bypass -File scripts/git/install-scheduler.ps1
```

## Commit queue

| # | ID | Summary |
|---|-----|---------|
| 1 | design-foundation | Tailwind tokens, globals.css, UI components |
| 2 | demo-data-layer | demoData.js, api.js, permissions |
| 3 | demo-auth | Demo mode auth store |
| 4 | dashboard-shell | Sidebar + topbar layout |
| 5 | landing-page | Marketing page + dashboard preview |
| 6 | dashboard-overview | Overview + analytics |
| 7 | leads-calls | Leads + call logs pages |
| 8 | pipeline-whatsapp | Pipeline + WhatsApp |
| 9 | settings-auth | Settings, automations, auth pages |
| 10 | platform-admin-ui | Admin console frontend |
| 11 | platform-admin-api | Platform backend APIs |
| 12 | migration-scripts | Theme migration utilities |

Edit `commit-queue.json` to add future work. Track progress in `.commit-state.json` (local only).

## Options

| Flag | Description |
|------|-------------|
| `-DryRun` | Show what would commit without changing git |
| `-Count 3` | Commit 3 items this run (default: 2) |
| `-Push` | Force push even if `pushAfterRun` is false |

## Notes

- `.env.local` is gitignored — never committed
- Requires a **dedicated repo** in this folder (not your home directory)
- After the queue is empty, add new `{ id, message, paths }` entries for future work
