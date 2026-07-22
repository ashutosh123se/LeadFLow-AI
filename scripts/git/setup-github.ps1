# Connect LeadFlow local repo to GitHub and push all commits
# Usage: .\scripts\git\setup-github.ps1 -RepoUrl "https://github.com/USERNAME/REPO.git"

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RepoRoot

Write-Host "Checking GitHub CLI auth..."
$ghOk = $false
try {
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ghOk = $true }
} catch {}

if (-not $ghOk) {
    Write-Host ""
    Write-Host "GitHub CLI is not logged in. Run this first:"
    Write-Host "  gh auth login"
    Write-Host ""
    Write-Host "Choose: GitHub.com -> HTTPS -> Login with browser"
    Write-Host "Then re-run this script."
    exit 1
}

# Normalize URL
$url = $RepoUrl.Trim().TrimEnd('/')
if (-not $url.EndsWith('.git')) { $url += '.git' }

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating origin: $existing -> $url"
    git remote set-url origin $url
} else {
    Write-Host "Adding origin: $url"
    git remote add origin $url
}

Write-Host ""
Write-Host "Pushing all commits to GitHub..."
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success. Your commits are now on GitHub."
    Write-Host "Daily scheduler will auto-push future commits at 10:30 AM."
} else {
    Write-Host ""
    Write-Host "Push failed. Common fixes:"
    Write-Host "  1. Repo exists and you have write access"
    Write-Host "  2. If repo has README, run: git pull origin main --rebase && git push -u origin main"
    exit 1
}
