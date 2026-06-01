@echo off
title GitHub Setup - Study Planner
cls
echo ============================================
echo   Study Planner - GitHub Repo Setup
echo ============================================
echo.

cd /d "%~dp0"

:: 1. Init git
if not exist ".git" (
  git init
  echo [OK] Git initialized
) else (
  echo [OK] Git already initialized
)

:: 2. Add all files
git add .
echo [OK] Files staged

:: 3. Commit
git commit -m "Initial commit - Study Planner app"
echo [OK] Files committed

:: 4. Check GitHub CLI
where gh >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo ============================================
  echo   GitHub CLI (gh) not found.
  echo.
  echo   Create the repo manually:
  echo   1. Go to https://github.com/new
  echo   2. Name: study-planner
  echo   3. Run these commands:
  echo.
  echo      git remote add origin https://github.com/YOUR_USER/study-planner.git
  echo      git branch -M main
  echo      git push -u origin main
  echo ============================================
  pause
  exit /b
)

:: 5. Check if logged in
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
  echo Logging into GitHub...
  gh auth login
)

:: 6. Create repo
gh repo create study-planner --public --source=. --remote=origin --push

if %errorlevel% equ 0 (
  echo.
  echo ============================================
  echo   ✅ Repo created and pushed!
  echo   https://github.com/%USERNAME%/study-planner
  echo ============================================
) else (
  echo.
  echo [ERROR] Could not create repo. Try manually.
  echo   Create: https://github.com/new
  echo   Then:  git remote add origin https://github.com/YOUR_USER/study-planner.git
  echo          git branch -M main
  echo          git push -u origin main
)

pause
