# Install Windows Task Scheduler job for LeadFlow chunked commits
# Runs Mon/Wed/Fri at 10:30 AM — 2 commits + push per run

param(
    [string]$Schedule = "Mon,Wed,Fri",
    [string]$Time = "10:30"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ScriptPath = Join-Path $PSScriptRoot "scheduled-commit.ps1"
$TaskName = "LeadFlow-ScheduledGitCommits"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Wednesday, Friday -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "LeadFlow: commit 2 queued changes and push to remote" -Force

Write-Host "Scheduled task '$TaskName' installed."
Write-Host "  Runs: $Schedule at $Time"
Write-Host "  Script: $ScriptPath"
Write-Host ""
Write-Host "Test manually:  powershell -File `"$ScriptPath`""
Write-Host "Dry run:        powershell -File `"$ScriptPath`" -DryRun"
Write-Host "Remove task:    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
