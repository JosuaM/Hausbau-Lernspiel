# Hausbau-Lernspiel

## Aufbau
- `index.html` – Startseite: Einzelspiel, Zwei Bildschirme (auch als extra Fenster), Server-Status und Server-Start-Button
- `spiel/` – Version 1 (Original): `spiel.html`, `zwei.html`, `results.html`, Skripte, Styles
- `spiel2/` – Version 2 (neue Optik, nur zwei Bildschirme): `zwei.html`, `v2.js`/`v2.css` (Oberfläche), `haus3d.js` (3D-Haus mit three.js), `daten.js` (Inhalte), `vendor/three.min.js`
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

## Version 2 (neue Optik)
Auf der Startseite oben zwischen „Version 1“ und „Version 2“ umschalten (wird gemerkt). Version 2 gibt es vorerst nur mit
zwei Bildschirmen: „Starten“ öffnet den oberen Bildschirm im aktuellen Fenster und den unteren als extra Fenster zum Verschieben.
Bedient wird unten, oben wird angezeigt; Speichern der Testdaten und iPad-Verbindung laufen wie bei Version 1 über den Server.

- Das 3D-Haus (`spiel2/haus3d.js`) malt alle Materialien selbst (keine Bilddateien) und baut Fundament, Wand, Dach und Besonderheit
  aus der Auswahl auf. Neue Materialien: in `buildFoundation`, `buildWalls`, `buildRoof` bzw. `buildExtra` ergänzen und die `id` aus `daten.js` verwenden.
- Inhalte (Fragen, Optionen, Bewertungen) liegen in `spiel2/daten.js`. Zur Punktzahl zählen nur Stabilität und Flutschutz,
  die Materialverfügbarkeit wird getrennt als Zusatzinfo gezeigt.
- Ablauf: Start → Szenarien (läuft alle 10 Sekunden von selbst durch, `CYCLE_MS` in `v2.js`; Antippen zeigt oben die Beschreibung) →
  Challenge → vier Bauschritte → Zusammenfassung → Flut-Simulation → Ergebnis.
- Aufteilung: **Oben** (Fernseher) wird alles gezeigt, **unten** (Touch, schräg stehendes iPad) wird nur bedient: sehr große Buttons,
  bei den Bauschritten vier Auswahl-Buttons (2 × 2) plus Zurück/Weiter. Unten gibt es außer auf dem Startbild kein 3D.
- Oben: Glasflächen links (Text oben, Ring unten), Fortschritt als Symbolleiste oben in der Mitte, Querschnitt-Karte mit Legende oben rechts.
- Alle Größen sind in `rem`; die Basisgröße in `v2.css` (`html { font-size … }`) folgt der Bildschirmgröße. Schrift: Inter (lokal in `vendor/fonts/`).
- Querschnitte (`spiel2/schnitte.js`): pro Auswahl eine gezeichnete Schnitt-Grafik, unten als Icon, oben mit Nummern und Legende.
  Neue Auswahl: unter `ICONS` eine Zeichnung mit der `id` aus `daten.js` ergänzen. Später lassen sich die Icons durch 3D-Icons ersetzen (`fillPic` in `v2.js`).
- 3D-Querschnitte (`spiel2/schnitt3d.js`): zweite Variante, im Entwicklermenü (Taste E) unter „Querschnitt-Bilder“ umschaltbar.
  Je Auswahl ein angeschnittenes 3D-Stück aus denselben Materialien wie das Haus (`Haus3D.kit`), einmal fotografiert und gemerkt.
  Neue Auswahl: unter `SCENES` eine Funktion mit der `id` ergänzen (Nummern in derselben Reihenfolge wie die Legende in `schnitte.js`).
- Pegelstab im 3D-Bild: zeigt den höchsten gemessenen Pegel der Region (`record` in `daten.js`, Quelle dort vermerkt), nicht die 1 m des Szenarios.
- Schäden (`spiel2/schaden.js`): Das Schadensmodell rechnet je Bauteil aus, was Wasser, Wellen und Sturm anrichten, und zeigt es am
  3D-Haus. Lehmwände weichen auf und brechen an festgelegten Stellen ein (die Risse laufen vorher genau dort entlang), Ziegelwände
  reißen von den Fensterecken aus und verlieren Putz, bei ausgespültem Erdsockel bricht eine Hausecke weg, Blechwände bekommen Dellen
  und ein losgerissenes Blech, Ferrozement bleibt dicht. Gras- und Ziegeldach verlieren im Sturm Bündel bzw. Ziegel (Traufe, Ortgang,
  Windseite zuerst), über eingebrochenen Wänden knickt das Dach ein, fehlen zwei ganze Wände, stürzt es ab; ein Betondach drückt Lehm-
  und Blechwände ein. Erdsockel und Erdplattform werden ausgespült (Rinnen, Kerbe an der Wasserlinie, Schlammfächer), beim Pfahlbau
  knickt ein Pfahl und das Haus neigt sich. Alle Teile behalten einen Wasserrand, Schlammfilm, Rost, Salzausblühungen und Algen,
  auch unter Wasser. Die Werte und Quellen stehen oben in der Datei (`assess()`), Texte für Simulation und Ergebnis liefert
  `stage.damageInfo()`, den aktuellen Zustand `stage.damageState()`.
- Simulation: Das Wasser steigt `SIM_RISE_S` Sekunden auf 1 m; der Text danach kommt aus `simOutcome` (Wasserstand im Haus aus der Bodenhöhe, Zustand aus der Stabilität).
- Vorlagen (Presets): Auf dem Startbild stehen unten fünf fertige Häuser (`PRESETS` in `spiel2/daten.js`: Dorfhaus, Blechhaus, Pfahlhaus,
  Ziegelhaus, Massivhaus), jeweils aus den normalen Auswahlen zusammengesetzt (`pick` = `id` je Bauschritt). Antippen zeigt die Vorlage oben im Bild
  (mit Namen und Bauteilen), „Mit diesem Haus starten“ übernimmt sie als Vorauswahl, die in den Bauschritten noch geändert werden kann. Nochmal antippen
  wählt sie ab, „Jetzt starten“ ohne Vorlage baut wie bisher von null. Die Vorschaubilder entstehen beim ersten Aufruf mit `stage.snapshot`.
  Neue Vorlage: Eintrag in `PRESETS` ergänzen (die Karten unten sind auf fünf Spalten ausgelegt, `.presets` in `v2.css`).
- Fokus aufs Haus: im Entwicklermenü (Taste E) unter „Fokus aufs Haus“ an/aus und Stärke. Dunkelt oben alles um das Haus ab (`#focus` in `v2.css`,
  liegt zwischen 3D-Bild und Oberfläche). Wird wie die anderen Menüwerte im Browser gespeichert.
- Blick durchs Wasser: Im Ergebnis gibt es unten den Schalter „Durchs Wasser schauen“. Oben wird das Wasser dann fast durchsichtig und die Kamera
  schaut steiler nach unten, damit man Schäden unter der Wasserlinie (Sockel, Wandfuß, Erosion) sieht. Technisch `stage.setClear(an)` in `haus3d.js`,
  das `flut.setClarity` in `flut.js` aufruft. Zustand im Spielstand: `durch` (wird bei jedem Seitenwechsel zurückgesetzt).
- Einzelne Seiten zum Ausprobieren: `spiel2/zwei.html?rolle=oben&seite=3&antw=1,2` (Seite -1 Start, 0 Szenarien, 1 Challenge,
  2–5 Bauschritte, 6 Haus, 7 Simulation, 8 Ergebnis; Seite 0 mit `&gewaehlt=flood` zeigt die Szenario-Seite, `&detail=2` setzt im Ergebnis den Fokus, `&preset=blech` wählt auf Seite -1 eine Vorlage, `&durch=1` schaltet im Ergebnis den Blick durchs Wasser ein).
