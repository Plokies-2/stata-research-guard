@echo off
setlocal

if defined CODEX_MCP_NODE_PATH (
  "%CODEX_MCP_NODE_PATH%" "%~dp0..\mcp\server.cjs"
  exit /b %errorlevel%
)

set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" "%~dp0..\mcp\server.cjs"
  exit /b %errorlevel%
)

where node.exe >nul 2>nul
if not errorlevel 1 (
  node.exe "%~dp0..\mcp\server.cjs"
  exit /b %errorlevel%
)

echo Stata Research Guard requires Node.js. Set CODEX_MCP_NODE_PATH to node.exe. 1>&2
exit /b 1
