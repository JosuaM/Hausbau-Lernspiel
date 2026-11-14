@echo off
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 goto run

echo Node.js ist nicht installiert. Es wird fuer das Spiel gebraucht.
choice /c JN /m "Jetzt automatisch installieren (J = Ja, N = Nein)"
if errorlevel 2 exit /b 1

where winget >nul 2>nul
if errorlevel 1 (
  echo Automatische Installation geht hier nicht. Die Download-Seite oeffnet sich, bitte dort die LTS-Version installieren.
  start "" https://nodejs.org
  pause
  exit /b 1
)
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
rem Das neu installierte Node ist in diesem Fenster noch nicht im PATH.
set "PATH=%PATH%;%ProgramFiles%\nodejs"
where node >nul 2>nul
if errorlevel 1 (
  echo Installation fehlgeschlagen oder nicht abgeschlossen. Bitte von https://nodejs.org installieren.
  pause
  exit /b 1
)

:run
rem Server unsichtbar im Hintergrund starten (falls er nicht schon laeuft). Beenden: Startseite > "Server beenden".
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/duo/info | Out-Null } catch { Start-Process node -ArgumentList 'server.js' -WindowStyle Hidden; Start-Sleep -Seconds 1 }"
start "" http://localhost:3000
exit /b 0
