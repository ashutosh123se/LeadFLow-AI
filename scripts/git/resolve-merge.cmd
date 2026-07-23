@echo off
cd /d "%~dp0..\.."
setlocal EnableDelayedExpansion

for /f "delims=" %%F in ('git diff --name-only --diff-filter=U') do (
  git checkout --ours "%%F"
  git add "%%F"
)

git checkout --theirs frontend/app/dashboard/analytics/page.jsx
git add frontend/app/dashboard/analytics/page.jsx
git checkout --theirs frontend/app/dashboard/automations/page.jsx
git add frontend/app/dashboard/automations/page.jsx
git checkout --theirs frontend/app/dashboard/automations/[id]/page.jsx
git add frontend/app/dashboard/automations/[id]/page.jsx

exit /b 0
