@echo off
title Study Planner Server
cls
echo ============================================
echo   Study Planner - Phone Access Setup
echo ============================================
echo.

:: Find local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set IP=%%a
  goto :found
)
:found
set IP=%IP: =%

echo Your IP: %IP%
echo.
echo Open this URL on your phone:
echo   http://%IP%:8080
echo.
echo Both devices must be on the same Wi-Fi network.
echo.
echo ============================================
echo Press Ctrl+C to stop the server
echo ============================================
echo.

:: Add firewall rule if needed (run once)
netsh advfirewall firewall show rule name="Study Planner 8080" >nul 2>&1
if %errorlevel% neq 0 (
  netsh advfirewall firewall add rule name="Study Planner 8080" dir=in action=allow protocol=TCP localport=8080 >nul
  echo [OK] Firewall port 8080 opened
) else (
  echo [OK] Firewall rule already exists
)
echo.

:: Start server
cd /d "%~dp0"
python -m http.server 8080
pause
