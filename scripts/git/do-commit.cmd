@echo off
cd /d "%~dp0..\.."
git add -A
git commit -F scripts\git\merge-commit-msg.txt
exit /b %ERRORLEVEL%
