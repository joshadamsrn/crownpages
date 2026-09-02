@echo off
setlocal

set SCRIPT_DIR=%~dp0
set MANIFEST_PATH=%~1

if "%MANIFEST_PATH%"=="" (
  echo Drag the manifest JSON file onto this launcher, or run:
  echo   run_obtain_media_worker.bat C:\path\to\company-desktop-manifest.json
  echo.
  set /p MANIFEST_PATH=Enter the full path to the manifest JSON: 
)

if not exist "%MANIFEST_PATH%" (
  echo.
  echo Manifest not found:
  echo   %MANIFEST_PATH%
  echo.
  pause
  exit /b 1
)

echo.
echo Running Crown Pages Obtain Media worker...
echo Manifest: %MANIFEST_PATH%
echo.

py "%SCRIPT_DIR%desktop_worker.py" --manifest "%MANIFEST_PATH%"
if errorlevel 1 (
  python "%SCRIPT_DIR%desktop_worker.py" --manifest "%MANIFEST_PATH%"
)

echo.
echo Done.
pause
