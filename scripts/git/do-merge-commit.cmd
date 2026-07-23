@echo off
cd /d "%~dp0..\.."
git commit -F scripts\git\merge-done-msg.txt
exit /b %ERRORLEVEL%
