@echo off
setlocal
set "PATH=%ProgramFiles%\nodejs;%PATH%"
if not exist "%ProgramFiles%\nodejs\npm.cmd" (
  echo Node.js was not found at "%ProgramFiles%\nodejs".
  echo Install the Node.js LTS version from https://nodejs.org/en/download
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Dependencies are not installed yet. Run install-dependencies.cmd first.
  pause
  exit /b 1
)
call "%ProgramFiles%\nodejs\npm.cmd" run dev
pause
