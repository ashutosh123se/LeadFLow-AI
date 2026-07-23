# Install Windows Task Scheduler job for LeadFlow daily commits
# Runs every day at 10:30 AM — up to 3 queued commits + push per run

param(
    [string]$Time = "10:30"
)

$ErrorActionPreference = "Stop"
$ScriptPath = Join-Path $PSScriptRoot "scheduled-commit.ps1"
$TaskName = "LeadFlow-ScheduledGitCommits"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "LeadFlow: up to 3 queued commits and push each day" -Force

Write-Host "Scheduled task '$TaskName' installed."
Write-Host "  Runs: daily at $Time"
Write-Host "  Script: $ScriptPath"
Write-Host ""
Write-Host "Test manually:  scripts\git\run-scheduled.cmd"
Write-Host "Remove task:    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
