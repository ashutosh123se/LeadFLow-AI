# LeadFlow — scheduled chunked git commits
# Usage: .\scripts\git\scheduled-commit.ps1 [-DryRun] [-Count 2] [-Push]

param(
    [switch]$DryRun,
    [int]$Count = 0,
    [switch]$Push
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$QueueFile = Join-Path $PSScriptRoot "commit-queue.json"
$StateFile = Join-Path $PSScriptRoot ".commit-state.json"

Set-Location $RepoRoot

if (-not (Test-Path ".git")) {
    Write-Error "No git repository found at $RepoRoot. Run: git init"
    exit 1
}

$config = Get-Content $QueueFile -Raw | ConvertFrom-Json

if (Test-Path $StateFile) {
    $state = Get-Content $StateFile -Raw | ConvertFrom-Json
} else {
    $state = [PSCustomObject]@{
        completed      = @()
        lastRun        = $null
        totalCommitted = 0
    }
}

if (-not $state.completed) {
    $state | Add-Member -NotePropertyName completed -NotePropertyValue @() -Force
}

$perRun = if ($Count -gt 0) { $Count } else { [int]$config.commitsPerRun }
$pending = @($config.queue | Where-Object { $state.completed -notcontains $_.id })

if ($pending.Count -eq 0) {
    Write-Host "All queued commits are done ($($state.totalCommitted) total)."
    $dirty = git status --porcelain 2>$null
    if ($dirty) {
        Write-Host "Uncommitted changes remain — add new entries to commit-queue.json."
        git status --short | Select-Object -First 20
    }
    exit 0
}

$batch = $pending | Select-Object -First $perRun
Write-Host "Processing $($batch.Count) commit(s) ($($pending.Count) remaining in queue)..."

foreach ($item in $batch) {
    $existing = @()
    foreach ($p in $item.paths) {
        if (Test-Path (Join-Path $RepoRoot $p)) { $existing += $p }
    }

    if ($existing.Count -eq 0) {
        Write-Warning "Skipping '$($item.id)' — no files found."
        $state.completed += $item.id
        continue
    }

    Write-Host ""
    Write-Host "--- Commit: $($item.id) ---"
    Write-Host ($item.message.Split("`n")[0])

    if ($DryRun) {
        Write-Host "[DRY RUN] Would add: $($existing -join ', ')"
        continue
    }

    git add -- $existing
    $staged = git diff --cached --name-only
    if (-not $staged) {
        Write-Warning "Nothing staged for '$($item.id)' — marking complete."
        $state.completed += $item.id
        continue
    }

    if ($config.randomizeAuthorTime) {
        $hour = Get-Random -Minimum $config.timeWindowHours[0] -Maximum ($config.timeWindowHours[1] + 1)
        $minute = Get-Random -Minimum 0 -Maximum 59
        $dateStr = (Get-Date).ToString("yyyy-MM-dd")
        $timeStr = "$dateStr $($hour.ToString('00')):$($minute.ToString('00')):00"
        $env:GIT_AUTHOR_DATE = $timeStr
        $env:GIT_COMMITTER_DATE = $timeStr
    }

    git commit -m $item.message
    Remove-Item Env:GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
    Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue

    if ($state.completed -notcontains $item.id) {
        $state.completed += $item.id
    }
    $state.totalCommitted = [int]$state.totalCommitted + 1
}

if (-not $DryRun) {
    $state.lastRun = (Get-Date).ToString("o")
    $state | ConvertTo-Json -Depth 5 | Set-Content $StateFile -Encoding UTF8

    $shouldPush = $Push -or $config.pushAfterRun
    if ($shouldPush) {
        $remote = git remote 2>$null
        if ($remote) {
            $branch = git rev-parse --abbrev-ref HEAD
            Write-Host ""
            Write-Host "Pushing to origin/$branch..."
            git push origin $branch
        } else {
            Write-Host ""
            Write-Host "No git remote — commits saved locally. Add with:"
            Write-Host "  git remote add origin <your-repo-url>"
        }
    }
}

Write-Host ""
Write-Host "Done. Completed: $($state.completed.Count) / $($config.queue.Count) queued commits."
