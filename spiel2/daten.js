// Inhalte der Szenarien (aus Version 1 übernommen, ohne die Zeichnungen).
const SCALES = [
  ['availability', 'Materialverfügbarkeit', 'Wie leicht bekommst du die Materialien im jeweiligen Land? Müssen sie importiert werden, oder sind sie lokal verfügbar?'],
  ['stability', 'Stabilität', 'Hält das Material dem Wasser stand, oder wird es beschädigt?'],
  ['flood', 'Flutschutz', 'Schützt deine Wahl das Haus vor dem Wasser, oder steht es bei der Flut im Haus?'],
];

// Kurze Zusatzfakten für das Startbild (oben): weltweite Fakten rund ums Bauen und Fakten zum jeweiligen Szenario.
// kind 'ring': value = Anteil in Prozent. kind 'gauge': value = Meter, max = Höhe der Skala.
const WORLD_FACTS = [
  { kind: 'ring', value: 8, label: '8 %', text: 'Rund 8 % des weltweiten CO₂-Ausstoßes kommen aus der Zementherstellung.' },
  { kind: 'ring', value: 33, label: '⅓', text: 'Etwa ein Drittel der Menschen weltweit wohnt in Häusern aus Lehm oder Erde.' },
  { kind: 'ring', value: 57, label: '57 %', text: 'Mehr als die Hälfte der Menschen lebt in Städten. Deshalb wird immer mehr gebaut.' },
];

// Fertige Häuser für den Start (Startseite). Jedes besteht nur aus Auswahlen, die es im Szenario auch gibt:
// pick = id der Option je Bauschritt (kind aus steps). Wer eine Vorlage nimmt, startet mit diesen Antworten und kann sie danach ändern.
// Die Taglines verraten bewusst nicht, wie das Haus die Flut übersteht.
const PRESETS = [
  { id: 'dorf', name: 'Dorfhaus', tagline: 'Erde, Lehm und Gras', pick: { foundation: 'earth', wall: 'mud', roof: 'thatch', extra: 'vetiver' } },
  { id: 'blech', name: 'Blechhaus', tagline: 'So bauen die meisten', pick: { foundation: 'earth', wall: 'tin', roof: 'tinhip', extra: 'platform' } },
  { id: 'pfahl', name: 'Pfahlhaus', tagline: 'Auf Bambusstelzen', pick: { foundation: 'stilts', wall: 'tin', roof: 'tinhip', extra: 'frame' } },
  { id: 'ziegel', name: 'Ziegelhaus', tagline: 'Gemauert mit Ziegeln', pick: { foundation: 'brick', wall: 'brickwall', roof: 'tilegable', extra: 'frame' } },
  { id: 'massiv', name: 'Massivhaus', tagline: 'Zement und Stahl', pick: { foundation: 'brick', wall: 'ferro', roof: 'concreteflat', extra: 'platform' } },
];

const SCENARIOS = [
  {
    id: 'avalanche', title: 'Lawine', subtitle: 'Alpen', locked: true,
    teaser: { text: 'Dieses Szenario folgt bald.' },
  },
  {
    id: 'flood',
    title: 'Überschwemmung',
    subtitle: 'Bangladesch',
    // Pegelmarke im 3D-Bild: höchster jemals gemessener Pegel der Region (nicht die 1 m des Szenarios, sondern ein Hinweis darauf, wie hoch es werden kann).
    // Quelle: FFWC/BWDB (Hochwasser-Warnzentrum Bangladesch), Station Serajganj am Jamuna: Rekord 14,70 m ü. M., Gefahrenmarke 12,90 m ü. M. = 1,80 m darüber.
    record: { height: 1.8, title: 'Höchster gemessener Pegel', value: '1,8 m', sub: 'über der Gefahrenmarke' },
    // Kurzer Einblick für die Übersicht (ohne die ganze Beschreibung)
    teaser: { big: '1 m', label: 'hoch steht das Wasser', text: 'Jedes Jahr in der Regenzeit steigt der Fluss Jamuna an.' },
    funfacts: [
      { kind: 'gauge', value: 1.8, max: 2, label: '1,8 m', text: 'Höchster gemessener Pegel am Jamuna: 1,8 m über der Gefahrenmarke.' },
      { kind: 'ring', value: 80, label: '80 %', text: 'Rund 80 % von Bangladesch sind flaches Schwemmland. Hier tritt das Wasser leicht über die Ufer.' },
      { kind: 'ring', value: 68, label: '68 %', text: '1998 stand etwa zwei Drittel des Landes unter Wasser, eine der größten Fluten der Geschichte.' },
      { kind: 'ring', value: 75, label: '75 %', text: 'Etwa 75 % der Haushalte in Bangladesch haben ein Dach aus Wellblech.' },
    ],
    challenge: {
      context: 'Du lebst im Distrikt Sirajganj am Ufer des Jamuna, einem der größten Flüsse Bangladeschs. Jedes Jahr in der Regenzeit steigt der Fluss an, und schwere Überschwemmungen sind keine Seltenheit.',
      task: 'Baue ein Haus für deine Familie, das der nächsten Flut standhält, mit den Materialien, die dir in Bangladesch zur Verfügung stehen.',
    },
    region: 'Sirajganj',
    facts: [
      { label: 'Ort', value: 'Sirajganj', detail: 'Festland am Jamuna-Ufer' },
      { label: 'Hausgröße', value: '25 m²', detail: 'eingeschossig, für 4–5 Personen' },
      { label: 'Überflutungshöhe', value: '1 m', detail: 'über dem Boden am Haus' },
    ],
    steps: [
      {
        name: 'Fundament',
        kind: 'foundation',
        question: 'Wähle dein Fundament',
        options: [
          {
            id: 'earth', text: 'Gestampfter Erdsockel', lift: 34,
            info: 'Erde oder sandiger Lehm, schichtweise festgestampft, etwa 45 bis 75 cm hoch.',
            ratings: { availability: 5, stability: 1, flood: 3 },
            usage: { real: { value: 13, label: '≈ 75 €', kind: 'fact', note: 'kostet der Erdsockel grob, fast nur für die Arbeit (50 bis 100 €)', info: 'Grob geschätzt aus deiner Recherche: Einzelpreise belegt, Mengen, Arbeitszeit und Wechselkurs geschätzt. Der Ring zeigt die Kosten im Vergleich zum teuersten Fundament.' } },
            hint: 'Sandiger Lehm wurde über Jahrtausende angeschwemmt. Er ist fast gratis.',
            good: 'Überall vor Ort zu haben und fast kostenlos.',
            bad: 'Weicht im Wasser auf und kann weggespült werden. Bei 1 m Flut stehen 25 bis 55 cm Wasser im Haus.',
            tip: 'Bei der Flut 2024 wurden Erdsäulen einfach weggespült.',
          },
          {
            id: 'concrete', text: 'Ebenerdige Betonplatte', lift: 8,
            info: 'Beton mit Ziegelsplitt, 10 bis 15 cm dick, direkt auf Bodenhöhe.',
            ratings: { availability: 4, stability: 4, flood: 1 },
            usage: { real: { value: 44, label: '≈ 250 €', kind: 'fact', note: 'kostet die Betonplatte grob, vor allem für Zement und Ziegel (240 bis 260 €)', info: 'Grob geschätzt aus deiner Recherche: Einzelpreise belegt, Mengen, Arbeitszeit und Wechselkurs geschätzt. Der Ring zeigt die Kosten im Vergleich zum teuersten Fundament.' } },
            hint: 'Zement gibt es überall beim Händler. Sein Hauptrohstoff Klinker wird aber zu rund 90 % importiert.',
            good: 'Weicht nicht auf und übersteht die Flut meist ohne größere Schäden.',
            bad: 'Liegt auf Bodenhöhe: Bei 1 m Flut steht das Haus fast einen Meter im Wasser.',
            tip: 'Beton allein hält kein Wasser draußen. Dafür musst du höher bauen.',
          },
          {
            id: 'brick', text: 'Ziegelsockel mit Betonpfeilern', lift: 50,
            info: 'Etwa 90 cm hoher Sockel aus Ziegelwänden, innen mit Erde gefüllt und mit tief verankerten Betonpfeilern.',
            ratings: { availability: 4, stability: 4, flood: 4 },
            usage: { real: { value: 93, label: '≈ 530 €', kind: 'fact', note: 'kostet der Ziegelsockel grob, das teuerste Fundament (490 bis 570 €)', info: 'Grob geschätzt aus deiner Recherche: Einzelpreise belegt, Mengen, Arbeitszeit und Wechselkurs geschätzt. Der Ring zeigt die Kosten im Vergleich zum teuersten Fundament.' } },
            hint: 'Die Ziegel kommen aus heimischen Ziegeleien, und die Füllung im Sockel ist einfach Erde von vor Ort.',
            good: 'Hebt das Haus 90 cm an, die Ziegelwände schützen die Erdfüllung vor dem Ausspülen.',
            bad: 'Bei 1 m Flut stehen noch rund 10 cm Wasser im Haus, und es ist das teuerste Fundament.',
            tip: 'Hilfsprogramme bauen 60 cm über den höchsten bekannten Flutstand.',
          },
          {
            id: 'stilts', text: 'Pfahlbau', lift: 34,
            info: 'Behandelte Bambusstelzen auf Betonfüßen, etwa 60 cm hoch, darauf eine Plattform aus Koroi-Holz.',
            ratings: { availability: 4, stability: 3, flood: 3 },
            usage: { real: { value: 46, label: '≈ 260 €', kind: 'fact', note: 'kostet der Pfahlbau grob, vor allem für das Holz der Plattform (240 bis 280 €)', info: 'Grob geschätzt aus deiner Recherche: Einzelpreise belegt, Mengen, Arbeitszeit und Wechselkurs geschätzt. Der Ring zeigt die Kosten im Vergleich zum teuersten Fundament.' } },
            hint: 'Mit Borsalz hält Bambus doppelt so lang.',
            good: 'Das Wasser fließt unter dem Haus durch, und Bambus gibt es vor Ort.',
            bad: 'Bei 1 m Flut stehen rund 40 cm Wasser im Haus, und das Holz der Plattform ist meist unbehandelt.',
            tip: 'Stelzen lassen Wasser durch, aber 60 cm reichen bei 1 m Flut nicht.',
          },
        ],
      },
      {
        name: 'Wand',
        kind: 'wall',
        question: 'Wähle deine Wand',
        options: [
          {
            id: 'mud', text: 'Lehmwand',
            info: 'Erde und Lehm werden schichtweise aufgetragen und verdichtet, teils mit Stroh vermischt. Günstig und überall vor Ort, braucht aber regelmäßige Instandhaltung.',
            ratings: { availability: 2, stability: 1, flood: 1 },
            usage: { real: { value: 3.76, kind: 'measured', info: 'Gemessen: BBS-Zensus 2022, Sirajganj (837.249 Haushalte). 31.519 Haushalte haben Lehmwände.' } },
            hint: 'Lehm ist billig und traditionell, aber er mag kein Wasser.',
            good: 'Traditionell und sehr günstig, der Lehm liegt direkt vor Ort.',
            bad: 'Saugt sich mit Wasser voll und weicht auf. Wird der Wandfuß beschädigt, kann die ganze Wand einstürzen.',
            tip: 'Ist der Fuß einer Erdwand beschädigt, stürzt sie schnell ein.',
          },
          {
            id: 'tin', text: 'Wellblech-Wand',
            info: 'Verzinkte Stahlbleche auf einem Rahmen aus Holz oder Bambus. Sehr leicht, günstig und schnell aufgebaut, heizt sich aber stark auf.',
            ratings: { availability: 5, stability: 2, flood: 3 },
            usage: { real: { value: 76.94, kind: 'measured', info: 'Gemessen: BBS-Zensus 2022, Sirajganj (837.249 Haushalte). 644.211 Haushalte haben Wellblechwände.' } },
            hint: 'Wellblech ist überall zu sehen und hält Wasser ab. Nur an Fugen dringt es ein.',
            good: 'Wasserdicht, günstig und leicht. Lässt sich bei Erosion abbauen und woanders wieder aufstellen.',
            bad: 'Rostet bei Dauerfeuchte, ist wenig stabil gegen Stöße und Wind und heizt sich in der Sonne stark auf.',
            tip: 'Ein Blechhaus lässt sich abbauen und versetzen. Am Flussufer ein Vorteil.',
          },
          {
            id: 'brickwall', text: 'Verputzte Ziegelwand',
            info: 'Gebrannte Ziegel mit Zementmörtel und Zementputz. Robust und langlebig, deutlich widerstandsfähiger als Lehm.',
            ratings: { availability: 4, stability: 4, flood: 3 },
            usage: {
              real: { value: 10, kind: 'estimate', info: 'Schätzwert, nicht gemessen. Zement, Beton, Ziegel und Terrakotta werden im Zensus nur zusammen gezählt (157.380 Haushalte). Der Zensus trennt das nicht auf. Etwa 10 % davon sind verputzte Ziegel (Spanne 7 bis 13 %). Ob verputzt wird, fragt der Zensus nicht.' },
              material: { value: 18.8, kind: 'measured', line: 'Zement/Beton/Ziegel zusammen', info: 'Gemessen: BBS-Zensus 2022, Sirajganj (837.249 Haushalte). Zement, Beton, Ziegel und Terrakotta werden im Zensus nur zusammen gezählt (157.380 Haushalte). Der Zensus trennt das nicht auf.' },
            },
            hint: 'Gebrannte Ziegel behalten im Wasser ihre Form, wasserdicht sind sie aber nicht.',
            good: 'Hohe Druckfestigkeit und deutlich robuster als eine Lehmwand.',
            bad: 'Bei langer Flut werden die unteren Mörtelfugen schwächer, und der Putz kann abblättern.',
            tip: 'Ziegelwände mit Zementputz sind in Sirajganj bei ansässigen Familien üblich.',
          },
          {
            id: 'ferro', text: 'Ferrocement-Wand',
            info: 'Dünne Wand aus engmaschigem Metallgitter, vollständig in mehrere Schichten Zement-Sand-Mörtel eingebettet.',
            ratings: { availability: 1, stability: 4, flood: 5 },
            usage: {
              real: { value: 0.02, label: 'unter 1 %', kind: 'estimate', info: 'Grobe Schätzung, nicht gemessen. Ferrozement hat im Zensus keine eigene Zeile. Es sind wohl nur einige Hundert Häuser (0,01 bis 0,1 %).' },
              material: { value: 18.8, kind: 'measured', line: 'Zement/Beton/Ziegel zusammen', info: 'Gemessen: BBS-Zensus 2022, Sirajganj (837.249 Haushalte). Zement, Beton, Ziegel und Terrakotta werden im Zensus nur zusammen gezählt (157.380 Haushalte). Der Zensus trennt das nicht auf.' },
            },
            hint: 'Das Gitter im Mörtel macht die Wand rissfest und fast wasserdicht.',
            good: 'Sehr wasserbeständig, rissfest, leicht zu reparieren und nicht übermäßig teuer.',
            bad: 'Braucht sorgfältige Verarbeitung und Aushärtung. Nicht jeder Maurer auf dem Land beherrscht sie.',
            tip: 'Auf dem Land fehlen oft geschulte Handwerker für Ferrozement.',
          },
        ],
      },
      {
        name: 'Dach',
        kind: 'roof',
        question: 'Wähle dein Dach',
        options: [
          {
            id: 'tinhip', text: 'Wellblech-Walmdach',
            info: 'Verzinkte Wellbleche auf einem Holz- oder Bambusgerüst, nach allen vier Seiten geneigt.',
            ratings: { availability: 4, stability: 4, flood: 4 },
            usage: { real: { value: 75, kind: 'estimate', note: 'der Haushalte in Bangladesch haben ein Dach aus Wellblech' } },
            hint: 'Wellblech gibt es bei jedem Händler. Die vier Dachseiten bieten dem Wind wenig Angriffsfläche.',
            good: 'Leicht, wasserdicht und windfest. Das Dach bleibt stehen und lässt sich bei Hochwasser abbauen und bergen.',
            bad: 'Heizt sich in der Sonne stark auf, ist bei Regen laut und rostet ohne Pflege an den Nägeln.',
            tip: 'Ein Walmdach aus Wellblech ist die beste realistische Wahl. Die Bleche kann man nach der Flut wiederverwenden.',
          },
          {
            id: 'concreteflat', text: 'Beton-Flachdach',
            info: 'Gegossene Stahlbetondecke, flach und etwa 10 bis 12 cm dick.',
            ratings: { availability: 2, stability: 5, flood: 5 },
            usage: { real: { value: 24, kind: 'estimate', note: 'der Haushalte haben ein Dach aus Zement, Beton oder Ziegeln', info: 'Zement, Beton und Ziegel werden zusammen gezählt. Beton- und Ziegeldach teilen sich deshalb diese Zahl.' } },
            hint: 'Beton ist sehr stark, aber auch sehr schwer. Nicht jede Wand kann ihn tragen.',
            good: 'Maximaler Schutz: Das Dach hält Sturm stand, und die Familie kann sich bei Hochwasser darauf retten.',
            bad: 'Teuer, braucht Stahl und Zement, und es hält nur auf Mauerwerk. Auf Lehm oder Blech wäre es viel zu schwer.',
            tip: 'Ein Betondach passt nur auf ein Haus mit Ziegel- oder Ferrozementwänden.',
          },
          {
            id: 'tilegable', text: 'Tonziegel-Satteldach',
            info: 'Gebrannte Tonziegel auf einem Holzgerüst, nach zwei Seiten geneigt.',
            ratings: { availability: 2, stability: 2, flood: 2 },
            usage: { real: { value: 24, kind: 'estimate', note: 'der Haushalte haben ein Dach aus Zement, Beton oder Ziegeln', info: 'Zement, Beton und Ziegel werden zusammen gezählt. Beton- und Ziegeldach teilen sich deshalb diese Zahl.' } },
            hint: 'Tonziegel halten lange, aber jeder einzelne ist schwer.',
            good: 'Haltbar, kühl im Sommer und leise bei Regen.',
            bad: 'Das Gewicht drückt auf die Wände. Sind sie vom Wasser aufgeweicht, kann das Dach einstürzen. Bei Sturm fliegen einzelne Ziegel weg.',
            tip: 'Schwere Dächer brauchen starke Wände. Bei einer Flut ist das ein Risiko.',
          },
          {
            id: 'thatch', text: 'Gras-Satteldach',
            info: 'Gebündeltes Stroh oder Gras auf einem Bambusgerüst, nach zwei Seiten geneigt.',
            ratings: { availability: 4, stability: 2, flood: 1 },
            usage: { real: { value: 1, kind: 'estimate', note: 'der Haushalte haben ein Dach aus leichten Naturmaterialien wie Stroh oder Gras' } },
            hint: 'Gras und Stroh wachsen direkt vor Ort und kosten fast nichts.',
            good: 'Sehr günstig, leicht und hält das Haus angenehm kühl.',
            bad: 'Verrottet bei Wasserkontakt, muss oft erneuert werden und fängt leicht Feuer.',
            tip: 'Ein Grasdach ist billig, aber nach jeder Flut musst du es neu decken.',
          },
        ],
      },
      {
        name: 'Besonderheit',
        kind: 'extra',
        question: 'Wähle eine Besonderheit',
        options: [
          {
            id: 'platform', text: 'Erdplattform', raise: 112,
            info: 'Die ganze Hausstelle wird mit Erde aufgeschüttet, etwa 1,8 bis 2,1 m hoch, und oben mit Lehm abgedeckt.',
            // Das Haus steht über dem Wasser; die Stabilität hängt nun an der Plattform selbst.
            sets: { flood: 5, stability: 3 },
            scores: { availability: 5, stability: 3, flood: 5 },
            hint: 'Erde und Lehm sind gratis. Teuer ist die Arbeit für rund 160 m³ Erde.',
            good: 'Das Haus bleibt bei 1 m Flut komplett trocken, Erde und Lehm kosten nichts.',
            bad: 'Erde bleibt anfällig für Erosion, vor allem an den Rändern, und das Aufschütten macht viel Arbeit.',
            tip: 'Pflanzen am Rand schützen die Erdplattform vor Erosion.',
            usage: { real: { value: 78.1, kind: 'measured', info: 'Gemessen: Haushaltsumfrage, 78,1 % der Haushalte wohnen auf einer erhöhten Hausplattform.' } },
          },
          {
            id: 'well', text: 'Erhöhter Brunnen und Latrine',
            info: 'Handpumpe und Latrine stehen auf einer Betonplattform, die höher liegt als der Flutstand.',
            hint: 'Jedes Jahr steht das Land unter Wasser. Viele Familien bauen deshalb auch Brunnen und Latrine höher.',
            good: 'Das Trinkwasser bleibt in der Flut sauber, das schützt vor Krankheiten wie Durchfall.',
            bad: 'Wand und Fundament schützt das nicht. Der Brunnen hält kein Wasser vom Haus fern.',
            tip: 'Manche Maßnahmen schützen die Menschen, andere das Haus. Schau genau hin, was wofür gedacht ist.',
            usage: { real: { value: 40, kind: 'estimate', info: 'Grobe Zahl aus einer älteren Studie mit 207 Brunnen in drei Flutgebieten, darunter Sirajganj. Etwa 40 % haben eine Plattform. In einer Umfrage nennen 45,8 % die Maßnahme, sie ist aber nicht überall gebaut.' } },
          },
          {
            id: 'vetiver', text: 'Bepflanzung mit Vetivergras',
            info: 'Rund um die Hausstelle wächst eine Hecke aus Vetivergras. Die Wurzeln reichen bis zu 3 m tief und halten den Boden fest.',
            // Schützt nur Erde vor Erosion, wirkt also nur beim gestampften Erdsockel.
            boost: { stability: 1 }, boostWith: 'earth',
            scores: { availability: 5, stability: 5, flood: 1 },
            hint: 'Vetivergras schützt in Bangladesch schon Flussufer vor Erosion. Als Hecke kann es Hochwasser bremsen.',
            good: 'Hält den Boden dauerhaft fest, wird bis zu 50 Jahre alt, ist heimisch und kostet nur rund 5 €.',
            bad: 'Hebt das Haus nicht an: Bei 1 m Flut steht das Wasser genauso hoch im Haus wie ohne Hecke.',
            tip: 'Beim Erdsockel bringt Vetivergras Stabilität. Bei Fundamenten ohne Erde hilft es nicht.',
            usage: { real: { value: 0, label: 'k. A.', kind: 'none', note: 'Keine Zahl zu Haushalten gefunden', info: 'Keine Erhebung gefunden, wie viele Haushalte Vetivergras nutzen. Belegt ist der Einsatz vor allem an Flussufern und Deichen, ein Routine-Anbau ist es nicht.' } },
          },
          {
            id: 'frame', text: 'Verstärktes Tragwerk',
            info: 'Kreuzverstrebungen halten das Gerüst steif. Die Pfosten bekommen einen Betonfuß und einen Bitumenanstrich gegen Fäulnis.',
            boost: { stability: 1 },
            hint: 'Ein Betonfuß lässt den Pfosten mehr als doppelt so lang halten.',
            good: 'Das Tragwerk wird steifer, und der Pfosten hält mit Betonfuß statt etwa 2 mindestens 5 Jahre.',
            bad: 'Gegen das Wasser an der Wand hilft das nicht. Es braucht zusätzliches Material und Wissen.',
            tip: 'Der Bitumenanstrich ist laut Handbuch nicht weit verbreitet.',
            usage: { real: { value: 12, kind: 'estimate', info: 'Schätzwert, nicht belegt. Es wurde keine Zahl gefunden. Das Handbuch nennt den Bitumenanstrich „nicht weit verbreitet“. Geschätzt sind etwa 5 bis 20 %.' } },
          },
        ],
      },
    ],
  },
  {
    id: 'wildfire', title: 'Waldbrand', subtitle: 'Australien', locked: true,
    teaser: { text: 'Dieses Szenario folgt bald.' },
  },
];
