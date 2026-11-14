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

## Zwei Bildschirme (Laptop oben, iPad unten)
`zwei-bildschirme.html` baut auf dem Spiel auf, wird aber auf zwei Geräte verteilt:
der Laptop zeigt nur an, auf dem iPad wird per Touch ausgewählt.

1. Auf dem Laptop `start-zwei-bildschirme-mac.command` doppelklicken (oder `node server.js`).
   Der Browser öffnet http://localhost:3000/oben – am besten in den Vollbildmodus schalten.
2. iPad ins selbe WLAN, in Safari die Adresse öffnen, die unten links auf dem Laptop steht
   (z. B. `http://192.168.0.42:3000/unten`). Tipp: „Zum Home-Bildschirm“ hinzufügen, dann ohne Safari-Leisten.
3. Fragt macOS, ob „node“ eingehende Verbindungen annehmen darf: erlauben.

Der Punkt oben rechts zeigt die Verbindung (grün = verbunden). Ohne Server geht es zum Ausprobieren
auch in zwei Tabs desselben Browsers: `zwei-bildschirme.html?rolle=oben` und `?rolle=unten`.
