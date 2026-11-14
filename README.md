# Hausbau-Lernspiel

## Aufbau
- `index.html` – Startseite: Einzelspiel, Zwei Bildschirme (auch als extra Fenster), Server-Status und Server-Start-Button
- `spiel/` – das eigentliche Spiel (`spiel.html`, `zwei.html`, `results.html`, Skripte, Styles)
- `server/` – `server.js` und die Start-Dateien `start-mac.command` / `start-windows.bat`
- `data/sessions/` – gespeicherte Testdurchläufe, `archiv/` – alte Version

## Starten
Es reicht, `index.html` im Browser zu öffnen. Der Server (Node.js, https://nodejs.org) wird nur gebraucht für
das Speichern der Testdaten, die Auswertung und die Verbindung zum iPad. Ohne Server läuft das Spiel trotzdem,
und zwei Fenster im selben Browser sind ebenfalls verbunden.

Server starten: auf der Startseite „Server starten“ (erkennt Mac/Windows und lädt die passende Datei), oder direkt
`server/start-mac.command` / `server/start-windows.bat` doppelklicken (Mac beim ersten Mal: Rechtsklick > Öffnen).
Läuft der Server, wechselt die Startseite automatisch auf http://localhost:3000.

## Testdaten
Jeder Durchlauf wird als eigene Datei in `data/sessions/<uuid>.json` gespeichert. Ansehen: Startseite > „Testdaten ansehen“
oder http://localhost:3000/results (dort auch CSV-Export). Zum Zusammenführen `data/sessions/` per Git hochladen.

## Zwei Bildschirme (Laptop oben, iPad unten)
`spiel/zwei.html` baut auf dem Spiel auf, wird aber auf zwei Geräte verteilt:
der Laptop zeigt nur an, auf dem iPad wird per Touch ausgewählt.

1. Auf dem Laptop `server/start-mac.command` doppelklicken (oder `node server/server.js`).
   Der Browser öffnet http://localhost:3000/oben – am besten in den Vollbildmodus schalten.
2. iPad ins selbe WLAN, in Safari die Adresse öffnen, die unten links auf dem Laptop steht
   (z. B. `http://192.168.0.42:3000/unten`). Tipp: „Zum Home-Bildschirm“ hinzufügen, dann ohne Safari-Leisten.
3. Fragt macOS, ob „node“ eingehende Verbindungen annehmen darf: erlauben.

Der Punkt oben rechts zeigt die Verbindung (grün = verbunden). Ohne Server geht es zum Ausprobieren
auch in zwei Tabs desselben Browsers: `spiel/zwei.html?rolle=oben` und `?rolle=unten`.

### Beide Fenster auf einem Rechner
Auf der Startauswahl (http://localhost:3000/zwei) öffnet „In extra Fenster öffnen“ die jeweilige Ansicht als eigenes Fenster,
„Beide in extra Fenstern öffnen“ startet oben und unten zusammen. Die Fenster sind bereits verbunden: Eine Eingabe in „unten“
erscheint sofort in „oben“ (über den Server bzw. beim direkten Öffnen der Datei über BroadcastChannel im selben Browser).
Falls der Browser Pop-ups blockiert, einmal für die Seite erlauben.
