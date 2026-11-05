# Hausbau-Lernspiel

## Starten (User-Tests)
Node.js muss installiert sein (https://nodejs.org).
- Windows: `start-windows.bat` doppelklicken
- Mac: `start-mac.command` doppelklicken (beim ersten Mal: Rechtsklick > Öffnen)

Der Browser öffnet sich automatisch auf http://localhost:3000.

## Testdaten
Jeder Durchlauf wird als eigene Datei in `data/sessions/<uuid>.json` gespeichert,
darum überschreibt oder kollidiert nichts. Ansehen: im Spiel Taste **E** > „Testdaten ansehen“,
oder http://localhost:3000/results (dort auch CSV-Export).

Ablauf: Tester spielen lassen, dann `data/sessions/` per Git hochladen. Der andere lädt es herunter
und sieht beim Start von `node server.js` alle Durchläufe.
