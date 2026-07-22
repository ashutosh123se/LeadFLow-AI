@echo off
cd /d "%~dp0..\.."
if not exist .git (
  git init
  git branch -M main
)
git add scripts/git .gitignore
git commit -F scripts\git\initial-commit-msg.txt
