# Recherche und Inhalte (Stand 21.11.2026)

Diese Datei sammelt die inhaltliche Grundlage des Spiels an einem Ort. Die fertigen Texte, die im Spiel stehen (Hinweise, Gut/Schlecht, Fakten, Bewertungen),
liegen in `prototyp-userflow-jeremy/app.js` (`SCENARIOS`, dort je Option `info`, `hint`, `good`, `bad`, `tip`, `ratings`, `usage`) und in `spiel2/daten.js`.
Die Wiederverwendbarkeit der Char-Runde steht mit Begründungen und Quellen in `FLOW.md`.

Wichtig: Für **Wände und Dächer** gibt es hier keine eigenen Recherche-Notizen. Ihre Bewertungen und Texte stecken nur in `SCENARIOS` bzw. `daten.js`.
Quellenangaben stehen dort teils in den `info`-Hinweisen der Zahlen (z. B. BBS-Zensus 2022, Sirajganj).

---

# Teil 1: Challenge, Rahmenbedingungen, Skalen

Inhaltliche Grundlage des Lernspiels, vom User vorgegeben (Stand 2026-11-04; noch nicht im Repo). Details: [[sirajganj-fundamente]], [[sirajganj-besonderheiten]].

**Challenge:** Du lebst im Distrikt Sirajganj am Ufer des Jamuna, einem der größten Flüsse Bangladeschs. Jedes Jahr in der Regenzeit steigt der Fluss an, schwere Überschwemmungen sind keine Seltenheit. Baue ein Haus für deine Familie, das der nächsten Flut standhält, mit den Materialien, die dir in Bangladesch zur Verfügung stehen.

**Rahmenbedingungen**
- Ort: Festland am Jamuna-Ufer in Sirajganj
- Hausgröße: Wohnhaus des Hofes, einzelnes eingeschossiges Gebäude, ca. 25 m², Familie mit 4–5 Personen. (Auf dem Land besteht ein Zuhause meist aus mehreren kleinen Gebäuden rund um einen Hof, etwa für Wohnen, Kochen und Vorräte; zusammen bilden sie den Lebensraum der Familie.)
- Überflutungshöhe: ca. 1 m über dem Boden am Haus (Quelle: Max Flood Depth 2019: 0,78 m)
- Überflutungsdauer: optional (Lehm und Holz würden sich entsprechend anders verhalten)
- Strömungsgeschwindigkeit fällt weg: Schäden entstehen bei Flussüberschwemmungen wie am Jamuna vor allem durch Wasserhöhe und Dauer. Das Wasser steigt langsam und bleibt lange stehen; schnell fließt es vor allem direkt im Fluss und am Ufer (Erosion). (Quelle: Studie, S. 44, Cmd+F „depth and duration“)

**Bewertungsskalen**
- Stabilität (Hält das Material?): 1 = hält dem Wasser kaum stand, wird zerstört; 3 = übersteht die Flut, wird aber beschädigt; 5 = übersteht die Flut nahezu unbeschadet
- Flutschutz (Wasserstand im Haus): 1 = über 80 cm; 2 = ca. 50–80 cm; 3 = ca. 20–50 cm; 4 = bis ca. 20 cm, nur der Boden wird nass; 5 = Haus bleibt trocken
- Verfügbarkeit: 1 = muss importiert werden, schwer zu bekommen; 3 = im Land erhältlich, aber nicht überall vor Ort; 5 = lokal überall verfügbar, z. B. Bambus oder Lehm

**Bauschritte:** 1. Fundament, 2. Wände, 3. Dach, 4. Besonderheit. Geliefert sind bisher nur Fundament und Besonderheiten; Wände und Dach fehlen noch.

**Kosten:** Einzelpreise belegt; Mengen, Arbeitszeit und Wechselkurs geschätzt. Arbeit durchgängig 700 Tk/Tag (Financial Express, Cmd+F „Tk 700“).

---

# Teil 2: Fundamente


Bauschritt 1 von [[sirajganj-challenge]]. Vom User vorgegebene Inhalte (2026-11-04).

| Option | Verfügbarkeit | Stabilität | Flutschutz | Kosten |
|---|---|---|---|---|
| 1.1 Gestampfter Erdsockel | 5 | 1 | 3 | ca. 50–100 € |
| 1.2 Ebenerdige Betonplatte | 4 | 4 | 1 | ca. 240–260 € |
| 1.3 Ziegelsockel mit Betonpfeilern | 4 | 4 | 4 | ca. 490–570 € |
| 1.4 Pfahlbau (Stelzen) | 4 | 3 | 3 | ca. 240–280 € |

## 1.1 Gestampfter Erdsockel
**Aufbau:** Erde bzw. sandiger Lehm, schichtweise festgestampft, oft mit Lehmschicht überzogen. Höhe ca. 45–75 cm. Bambus- oder Holzpfosten stecken direkt im Sockel.
**Verfügbarkeit 5:** Erde direkt vor Ort abgegraben. Lehm liegt dank Flussablagerungen praktisch überall im Boden. Laut Banglapedia landesweit verbreitet und typisch für die traditionelle Bauweise.
**Stabilität 1:** Erde weicht auf und wird ausgespült. Nach der Flut 2024 stellte ShelterBox fest, dass Erdsäulen weggespült wurden und viele Häuser dadurch einstürzten.
**Flutschutz 3:** Bei 1 m Flut steht das Wasser ca. 25–55 cm hoch im Haus.
**Kosten:** Erde kostenlos (Baribhiti Manual, „piling up“). Arbeit ca. 7.000–14.000 Tk (10–20 Tage × 700 Tk). Annahme: ca. 20 m³ Erde, 1–2 m³ pro Person/Tag (Schätzung ohne Quelle). Baut die Familie selbst, fallen praktisch keine Kosten an.

## 1.2 Ebenerdige Betonplatte
**Aufbau:** Beton aus Zement, Flusssand, Ziegelsplitt („Khoa“) und Wasser, oft auf einer flachen Ziegellage gegossen. Dicke ca. 10–15 cm, auf Bodenhöhe.
**Verfügbarkeit 4:** Wasser, Ziegel, Ziegelsplitt, Sand lokal. Zement im Land hergestellt und überall beim Händler, muss aber gekauft werden; Klinker zu ca. 90 % importiert, Preis schwankt mit dem Weltmarkt (Daily Sun 2026, „90% of clinker“).
**Stabilität 4:** Weicht nicht auf, wird nicht weggespült. Abzug wegen Ziegelsplitt: Kaum Natursteinvorkommen, Steinsplitt importiert und teurer; lokaler Ziegelsplitt nimmt mehr Wasser auf, Beton etwas weniger fest und langlebig. Für überflutungsgefährdete Gebiete wird eher Steinsplitt empfohlen.
**Flutschutz 1:** Haus steht fast 1 m tief im Wasser; Platte bleibt heil, Wände, Einrichtung, Vorräte werden nass.
**Kosten:** Zement 9.100–9.900 Tk (Financial Express, „Tk 480“); Sand 800–1.200 Tk (bdstall, „Tk 17 to Tk 27“); Ziegelsplitt ca. 9.700 Tk (Construction Mart, „9 Bricks“ + Daily Star, „Tk 12 per piece“); Ziegel ca. 9.600 Tk (Daily Star); Wasser kaum Kosten; Arbeit ca. 4.200 Tk (6 Tage). Großteil gekauftes Material.

## 1.3 Gemauerter Ziegelsockel mit Betonpfeilern
**Aufbau:** Ca. 90 cm hoher Sockel mit gemauerten Ziegelwänden, innen mit Erde aufgefüllt; tief im Boden verankerte Betonpfeiler. Quellen: ShelterBox („three feet“), CARE („brick-walled“), Kyoto University – Baribhiti Manual („perimeter wall“).
**Verfügbarkeit 4:** Ziegel lokal (Daily Star, „widely used“); Erde vor Ort (Baribhiti, „piling up“); Zement wie oben (Daily Sun); Sand, Wasser lokal; Ziegelsplitt lokal statt Steinsplitt (Journal of Civil Engineering IEB, „locally available brick chips“); Stahlstäbe im Land hergestellt, aber über 90 % des Schrotts importiert (Financial Express, „90 per cent“).
**Stabilität 4:** Ziegelwände schützen die Füllung vor Ausspülung, Pfeiler geben Halt. Abzug: viele Ziegel minderer Qualität und kleiner als Standard. Quellen: Baribhiti („resists erosion“), CARE („added strength“), TBS News („low quality“).
**Flutschutz 4:** Bei 1 m Flut ca. 10 cm Wasser im Haus. Ein Hilfsprogramm in Nordbangladesch baut Sockel rund 60 cm über den höchsten bekannten Flutstand. Quellen: ShelterBox 2025 („three feet“), Down To Earth („60 centimetres“).
**Kosten (ca. 67.000–78.000 Tk):** Ziegel ca. 2.750 Stück, 33.000 Tk (Daily Star, „Tk 12 per piece“); Zement ca. 17 Säcke, 8.200–8.800 Tk (Financial Express, „Tk 480“); Sand ca. 75 cft, 1.300–2.000 Tk (bdstall); Ziegelsplitt ca. 21 cft, 2.500–2.900 Tk (Total Import Solution, „Local Brick Chips“); Stahl ca. 50 kg, 4.300 Tk (Daily Star, „Tk 85,500“); Erde kostenlos; Arbeit 25–38 Tage, 17.500–26.600 Tk. Maße, Ziegelanzahl, Mörtel-/Stahlmenge und Arbeitstage geschätzt.

## 1.4 Pfahlbau (Stelzen)
**Aufbau:** Bambusstelzen, ca. 60 cm hoch, vorher in Borsalz (Borax und Borsäure) eingeweicht gegen Fäulnis und Insekten. Stelzen auf Betonfüßen, darauf Bodenplattform aus lokalem Koroi-Holz. Quellen: ICCAUA PDF („about 2 feet high“, „Koroi wood“), UN Media/UNHCR („boric acid and borax“), The Star/AFP („pass under“).
**Info:** Vor allem in Gebieten mit Staunässe und als traditionelle Holzhäuser (z. B. Munshiganj); deutlich weniger verbreitet als der Erdsockel (Banglapedia, „stilts“, „ubiquitous“).
**Verfügbarkeit 4:** Bambus lokal (Malay Mail/AFP, „locally available“); Borsalz im Handel, importiert (OEC, „most imported product“); Zement wie oben; Sand, Ziegelsplitt lokal (IEB); Koroi-Holz lokal (ICCAUA).
**Stabilität 3:** Wasser fließt unter dem Haus durch. Betonfüße und Borsalz verlängern die Bambus-Lebensdauer auf mehr als das Doppelte. Plattformholz meist unbehandelt; Koroi hält ca. 15–20 Jahre. Quellen: Malay Mail/AFP („resist floods“), UN Media/UNHCR („twice as long“), ICCAUA („untreated timber“, „15 to 20 years“).
**Flutschutz 3:** Bei 1 m Flut ca. 40 cm Wasser im Haus (ICCAUA, The Star/AFP).
**Kosten (ca. 33.000–38.000 Tk):** Annahme: 25 m² Plattform, ca. 12 Stelzen. Bambus ca. 15 Stangen, 6.300–6.500 Tk (Bangladesh Bureau of Statistics, „Bamboo data was reported“); Borsalz ca. 2.000 Tk (Bikroy, „BDT 4,900“); Betonfüße ca. 3.400 Tk (Financial Express, bdstall, Total Import Solution); Koroi-Holz ca. 32 cft, 16.000–19.200 Tk (ICCAUA); Arbeit 8–10 Tage, 5.600–7.000 Tk. Größter Posten: Holz.

---

# Teil 3: Besonderheiten


Bauschritt 4 von [[sirajganj-challenge]], ergänzt [[sirajganj-fundamente]]. Vom User vorgegeben (2026-11-04).

## 4.1 Erdplattform (Verfügbarkeit 5, Stabilität 3, Flutschutz 5, ca. 410–820 €)
**Aufbau:** Gesamte Hausstelle mit Erde aufgeschüttet, ca. 1,8–2,1 m über Gelände, schichtweise aufgetragen, oben mit Lehmschicht abgedeckt. Darauf steht das Haus mit seinem Fundament. (Asia News Network, „seven feet“, „layers of soil“)
**Verfügbarkeit 5:** Erde und Lehm lokal und kostenlos, nichts importiert (Asia News Network, „layers of soil“, „covered in clay“).
**Stabilität 3:** Lehmdeckung macht sie haltbarer, bleibt aber erosionsanfällig, vor allem an den Rändern und in Flussnähe; ohne Bepflanzung an den Kanten kann sie abgetragen werden. (Asia News Network, „more durable“, „riverbank erosion“; Mongabay 2022, „prevent erosion“)
**Flutschutz 5:** Deutlich über 1 m Flut; Haus bleibt komplett trocken, unabhängig vom Fundament darauf. (Asia News Network, „seven feet“)
**Kosten:** Annahme ca. 8 × 8 m (Haus plus Hoffläche), 2 m hoch, schräge Ränder, rund 160 m³ Erde. Erde und Lehm kostenlos; Arbeit 80–160 Tage × 700 Tk = 56.000–112.000 Tk. Teurer als die meisten Fundamente, schützt aber zuverlässig.

**Einfluss auf das Haus (vom User festgelegt, 2026-11-05):** Die Plattform hebt das Haus über die Überflutungshöhe: Flutschutz wird bei jedem Fundament auf 5 gesetzt. Stabilität hängt dann an der Plattform selbst (Erosion an den Rändern) und wird bei jedem Fundament auf 3 gesetzt, kann also auch steigen oder sinken.

## Noch nicht ausgearbeitet (vom User als „möglich“ markiert)
- 4.3 Dachboden / Zwischenebene

## Bepflanzung mit Vetivergras (Verfügbarkeit 5, Stabilität 5, Flutschutz 1, ca. 5 €; 2026-11-05, ersetzt den Machan)
Hecke um die Hausstelle, Wurzeln bis 3 m, bis zu 50 Jahre alt (Zenodo 2025, „3 m“, „50 years“, „slowing floodwater“; Flora of Bangladesh 2020, „monsoon“). **Einfluss:** +1 Stabilität nur beim gestampften Erdsockel, sonst keiner; Flutschutz unverändert. Zur Verbreitung in Haushalten wurde keine Zahl gefunden, das Spiel zeigt deshalb „k. A.“.

---

# Teil 4: Hintergrund für die Einführung (Geografie und Gesellschaft)

Recherchiert am 21.11.2026 für die geführten Slides. Die Texte im Spiel sind bewusst vorsichtig formuliert, wo die Quellen nicht einheitlich sind.

- **Delta und Schwemmland:** Bangladesch liegt im Delta von Padma (Ganges), Jamuna (Brahmaputra) und Meghna. Die Deltaebene dieser Flüsse und ihrer Nebenflüsse nimmt rund 79 % des Landes ein (Britannica, Wikipedia „Geography of Bangladesh“). Im Spiel: „rund 80 %“.
- **Anzahl der Flüsse:** Keine einheitliche offizielle Zahl in den Quellen. Banglapedia gruppiert die Flüsse in fünf Systeme. Im Spiel steht deshalb nur „hunderte kleinere Flüsse und Nebenarme“.
- **Hügel:** Hügelland im Südosten (Chittagong Hill Tracts) und Nordosten; je nach Quelle rund 10 bis 12 % der Fläche (Britannica, Banglapedia). Höchster Punkt: Quellen widersprechen sich (Saka Haphong 1.052 m gegen Keokradong 1.230 m), deshalb nicht im Spiel genannt.
- **Chars und Erosion am Jamuna:** Eine CEGIS-Satellitenanalyse (zitiert in dialogue.earth, bdnews24): zwischen 1973 und 2026 verlor der Jamuna 94.150 ha Ufer, 14.955 ha neue Sandbänke entstanden. Im Juni 2026 wurden in Sirajganj über 100 Häuser durch Erosion in zwei Char-Unions weggespült (Financial Express, bdnews24).
- **Menschen auf Chars:** Etwa 10 Millionen (National Char Alliance, Mongabay), der Anteil „6 %“ ist eine eigene Rechnung bei rund 178 Millionen Einwohnern, keine Quellenangabe. Ältere Schätzung: 4,3 Millionen (UK-Regierungsbericht 2006), nur als Hinweis auf die Spannweite.
- **Bevölkerung und Fläche (Slide 1):** „knapp 150.000 km²“ und „mehr als 170 Millionen Menschen“ sind gerundete, allgemein bekannte Werte; vor einer Veröffentlichung gegen eine aktuelle Quelle prüfen.
- **Aussagen zur Gesellschaft (Slide 2)** (Wohlstand bestimmt Wohnort und Material; Chars: oft ohne gesicherte Landrechte und ohne Schutz durch Deiche; Hügel: Bambus und Stelzen) sind aus den Fundament- und Char-Recherchen verdichtet. Hier fehlt noch eine eigene Quelle je Aussage.

# Teil 5: Karte

Der Umriss von Bangladesch in `mapArt()` stammt aus `github.com/johan/world.geo.json` (BGD.geo.json, 35 Punkte); die Mündung der Meghna ist von Hand geglättet.
Flüsse und Hügel sind schematisch von Hand gezeichnet, keine Messdaten. Die Lizenz des Datensatzes wurde nicht geprüft.
