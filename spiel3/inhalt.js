// Inhalte der Variante „Josua“ (Version 3). Zahlen und Aussagen stammen aus den unten genannten Quellen oder aus dem Schadensmodell
// in spiel2/schaden.js (dort sind die Grundlagen je Material beschrieben). Alle Texte sind Entwürfe.
//
// Quellen (Stand 2026):
//  - Banglapedia „Char“ und „Housing“ (en.banglapedia.org): 56 große und 226 kleine Chars in der Jamuna, Kutcha/Pucca
//  - National Char Alliance (über Mongabay 2022) und Daily Star „The moving islands of the Jamuna“: 10 bis 12 Mio. Menschen auf Chars
//  - Bangladesh Water Development Board: etwa 10 000 Menschen pro Jahr verlieren ihr Zuhause durch Flusserosion
//  - Bangladesh Bureau of Statistics, Socio-Economic and Demographic Survey 2023: Wände, Dächer
//  - Weltbank (Poverty & Equity Brief): nationale Armutsquote 2022 18,7 %, 2016/17 24,3 %
'use strict';

const V3 = {};

V3.CHALLENGE = {
  eyebrow: 'Überschwemmung · Bangladesch',
  title: 'Deine Challenge',
  lead: 'Du baust ein Haus in Bangladesch. In der Regenzeit steigt der Fluss, und dein Haus muss die nächste Flut überstehen.',
  items: [
    { icon: 'task', head: 'Die Aufgabe', text: 'Baue ein Haus für deine Familie: 25 m², eingeschossig, für 4 bis 5 Personen.' },
    { icon: 'wall', head: 'Das Material', text: 'Du wählst Fundament, Wände, Dach und eine Besonderheit, mit dem, was es vor Ort gibt.' },
    { icon: 'drop', head: 'Die Flut', text: 'Ein Sturm zieht auf, der Fluss steigt auf 1 m über dem Boden. Du siehst live, was dabei kaputtgeht.' },
    { icon: 'trophy', head: 'Die Wertung', text: 'Stabilität und Flutschutz ergeben bis zu 10 Punkte. Danach schaust du dir jedes Bauteil einzeln an.' },
  ],
};

V3.GEO = {
  eyebrow: 'Szenario & Grundstück',
  title: 'Sirajganj am Jamuna',
  lead: 'Bangladesch liegt im Delta von Ganges, Brahmaputra und Meghna. Das Land ist flach, der Boden besteht aus Sand und Schlamm, den die Flüsse über Jahrtausende angeschwemmt haben. Der Brahmaputra heißt hier Jamuna.',
  facts: [
    { big: '80 %', label: 'des Landes', text: 'sind flaches Schwemmland. Hier tritt das Wasser leicht über die Ufer.' },
    { big: '68 %', label: 'unter Wasser', text: 'Im Jahr 1998 stand etwa zwei Drittel des Landes unter Wasser.' },
    { big: '1,8 m', label: 'über der Gefahrenmarke', text: 'Höchster gemessener Pegel am Jamuna bei Sirajganj.' },
  ],
  charBox: { head: 'Was sind Chars?', text: 'Inseln aus Sand und Schlamm mitten im Fluss. Tippe, um mehr zu erfahren und dort zu bauen.' },
  src: ['ffwc'],
  // Lageskizze: Zwei Orte, an denen man bauen kann
  spots: {
    ufer: { name: 'Festland am Ufer', sub: 'Dein Grundstück', text: 'Das Haus steht am Westufer der Jamuna, hinter dem Ufer beginnen Dorf und Felder.' },
    char: { name: 'Char (Flussinsel)', sub: 'Mitten im Fluss', text: 'Inseln aus Sand und Schlamm. Sie wandern, wachsen und verschwinden wieder.' },
  },
};

V3.CHARS = {
  eyebrow: 'Chars entdecken',
  title: 'Leben auf Flussinseln',
  lead: 'Inseln aus Sand und Schlamm, auf denen Millionen Menschen leben. Unten wählst du, wo du bauen willst.',
  src: ['char', 'dailystar', 'mongabay', 'erosion'],
  topics: [
    { id: 'was', icon: 'pin', head: 'Was ist ein Char?', text: 'Ein Char ist eine Insel aus Sand und Schlamm mitten im Fluss. Sie entsteht, wenn der Fluss Sediment ablagert und es sich an einer Stelle auftürmt. Allein in der Jamuna zählt die Banglapedia 56 große und 226 kleine Chars.' },
    { id: 'dauer', icon: 'restart', head: 'Wie lange gibt es sie?', text: 'Die Jamuna teilt sich in viele Arme und verlegt ihren Lauf ständig. Darum bleibt ein Char oft nur Jahre bis wenige Jahrzehnte bestehen: Manche werden weggespült, andere wachsen mit dem Schlamm. Im ruhigeren Padma sind Chars teils über 70 Jahre alt.' },
    { id: 'wer', icon: 'house', head: 'Wer lebt dort, und warum?', text: 'Schätzungen sprechen von 10 bis 12 Millionen Menschen auf Chars. Der Boden ist fruchtbar, und das neue Land ist billig oder frei. Wer kein eigenes Land hat, zieht oft dorthin. Die Menschen auf Chars gehören meist zu den Ärmsten des Landes.' },
    { id: 'risiko', icon: 'drop', head: 'Was ist das Risiko?', text: 'Es gibt keinen Deich. Bei Flut wird die Insel oft ganz überspült, Strömung und Erosion tragen Land ab. Jedes Jahr verlieren etwa 10 000 Menschen in Bangladesch durch Flusserosion ihr Zuhause. Manche bauen ihr Haus im Leben mehr als acht Mal neu auf.' },
    { id: 'bauen', icon: 'foundation', head: 'Wie bauen die Menschen?', text: 'Leicht und mobil: Wellblech, Bambus und Holz lassen sich abbauen und woanders wieder aufstellen. Gegen das Wasser helfen erhöhte Hofstellen aus aufgeschütteter Erde. Teure Materialien wie Zement und Ziegel sind auf der Insel kaum zu bekommen.' },
  ],
  grounds: {
    ufer: { name: 'Festland am Ufer', level: 'Standard', points: ['Ufer und Dorf bremsen das Wasser', 'Material gibt es im Ort', 'Das Haus steht fest auf dem Boden'] },
    char: { name: 'Char', level: 'Schwer', points: ['Wasser kommt von allen Seiten', 'Strömung und Erosion sind stärker', 'Es zählt 1 Punkt weniger Flutschutz'] },
  },
};

// Realitäts-Check: Zahlen als Dashboard, zwei Reiter
// Quellen (Link wird beim Antippen des Quellen-Symbols gezeigt)
V3.SRC = {
  char: { name: 'Banglapedia: Char', url: 'https://en.banglapedia.org/index.php/Char' },
  housing: { name: 'Banglapedia: Housing', url: 'https://en.banglapedia.org/index.php/Housing' },
  dailystar: { name: 'The Daily Star: The moving islands of the Jamuna', url: 'https://www.thedailystar.net/star-weekend/endeavour/the-moving-islands-the-jamuna-1397446' },
  mongabay: { name: 'Mongabay: Elevated homesteads (National Char Alliance)', url: 'https://news.mongabay.com/2022/08/elevated-homesteads-give-hope-to-flood-hit-communities-in-bangladesh/' },
  erosion: { name: 'Prothom Alo: Floods and river erosion in Jamalpur', url: 'https://en.prothomalo.com/environment/climate-change/3bj8vx9rka' },
  survey: { name: 'The Business Standard: BBS-Erhebung 2023 zu Haushalten', url: 'https://www.tbsnews.net/node/881461' },
  worldbank: { name: 'Weltbank: Poverty Assessment Bangladesh', url: 'https://documents1.worldbank.org/curated/en/099408104212512419/pdf/IDU-c56b9657-74d2-45ab-ba59-3dd8d12ff803.pdf' },
  ffwc: { name: 'Flood Forecasting and Warning Centre (BWDB)', url: 'http://www.ffwc.gov.bd' },
};

// Realitäts-Check: zwei Reiter, jeweils mit drei Schritten (Wer? Womit? Was bedeutet das?)
V3.REALITAET = {
  eyebrow: 'Gesellschaft',
  title: 'Der Realitäts-Check',
  lead: 'In diesem Spiel kannst du jedes Material wählen. In Wirklichkeit entscheidet das Geld, womit jemand baut. So sieht es aus.',
  tabs: {
    land: {
      name: 'Ganz Bangladesch',
      steps: [
        { n: 1, head: 'Wie viele sind arm?', kind: 'dots', value: 18.7, of: 100, big: '19', label: 'von 100 Menschen leben unter der Armutsgrenze', note: '2022 nach der nationalen Armutsgrenze. 2016/17 waren es noch 24 von 100.', src: ['worldbank'] },
        { n: 2, head: 'Womit wird gebaut?', kind: 'bars', rows: [
          { label: 'Wände aus Erde, Bambus oder Matten', value: 56 },
          { label: 'Dach aus Wellblech', value: 74 },
          { label: 'Dach aus Zement oder Beton', value: 25 },
        ], note: 'Anteil der Haushalte in Prozent, 2023.', src: ['survey', 'housing'] },
        { n: 3, head: 'Was kostet das Fundament?', kind: 'bars', unit: '€', max: 530, rows: [
          { label: 'Gestampfter Erdsockel', value: 75 },
          { label: 'Ebenerdige Betonplatte', value: 250 },
          { label: 'Pfahlbau', value: 260 },
          { label: 'Ziegelsockel mit Pfeilern', value: 530 },
        ], note: 'Grob geschätzt aus Einzelpreisen. Wer wenig hat, baut mit Erde.' },
      ],
      takeaway: 'Dein Haus kann besser sein als die meisten echten Häuser: Ferrozement nutzen weniger als 1 % der Haushalte. Das ist Absicht, sonst wäre die Aufgabe zu schwer.',
    },
    char: {
      name: 'Auf den Chars',
      steps: [
        { n: 1, head: 'Wie viele leben dort?', kind: 'dots', value: 6.5, of: 100, big: '6–7', label: 'von 100 Menschen in Bangladesch leben auf Chars', note: 'Etwa 10 bis 12 Millionen von rund 170 Millionen Menschen.', src: ['mongabay', 'dailystar'] },
        { n: 2, head: 'Was bedroht sie?', kind: 'bigs', rows: [
          { big: '10 000', text: 'Menschen verlieren jedes Jahr durch Flusserosion ihr Zuhause.' },
          { big: '⅓', text: 'der Fläche hat die Jamuna in Kazipur (Sirajganj) in 50 Jahren abgetragen.' },
        ], src: ['erosion', 'dailystar'] },
        { n: 3, head: 'Warum baut man dort?', kind: 'text', text: 'Das Land ist billig oder frei, und der Boden ist fruchtbar. Wer kein eigenes Land besitzt, hat oft keine andere Wahl. Darum baut man leicht und günstig, so dass man das Haus mitnehmen kann.', src: ['char', 'mongabay'] },
      ],
      takeaway: 'Wer auf einer Char baut, rechnet damit, dass die Insel irgendwann weg ist. Darum zählt hier jeder Punkt Flutschutz mehr.',
    },
  },
};

// Warum etwas kaputtgeht, je Auswahl (aus dem Schadensmodell in schaden.js und den Quellen dort)
V3.WARUM = {
  earth: { what: 'Strömung und Wellen spülen Ecken und Wasserlinie aus, der Sockel rutscht ab.', why: 'Erde ist nicht verfestigt: Wasser löst sie Korn für Korn. Besonders an den Ecken und an der Wasserlinie bildet sich eine Kerbe, und das Material darüber rutscht nach. Fließt das Wasser länger, wird mehr abgetragen.' },
  concrete: { what: 'Die Platte bleibt heil, aber das Wasser steht im ganzen Haus.', why: 'Beton weicht nicht auf, doch die Platte liegt auf Bodenhöhe. Das Wasser läuft über die Schwelle und steht fast einen Meter hoch im Haus. Zurück bleibt eine Schlammschicht.' },
  brick: { what: 'Der Sockel hält, nur der Mörtel in den Fugen wird ausgewaschen.', why: 'Gebrannter Ziegel mit Zementmörtel behält im Wasser seine Form. Der Sockel hebt den Boden an, so bleibt das Haus länger trocken. Bei langer Flut werden die unteren Fugen schwächer.' },
  stilts: { what: 'Treibgut knickt Pfähle, das Holz der Plattform quillt auf.', why: 'Bambus und Holz sind leicht und halten das Haus über dem Wasser. Dafür trifft Treibgut die Pfähle seitlich, und ein geknickter Pfahl lässt die Plattform kippen.' },
  mud: { what: 'Der Wandfuß weicht auf, die Wand sackt ab und stürzt ein.', why: 'Ungebrannter Lehm verliert durchnässt 70 bis 90 % seiner Druckfestigkeit. Das Wasser zieht zusätzlich 30 bis 60 cm über den Wasserstand in die Wand. Steht es einige Stunden an der Wand, trägt der Fuß das Gewicht nicht mehr. Deshalb stürzen Lehmhäuser bei Fluten am häufigsten ein.' },
  tin: { what: 'Die Bleche werden eingedellt, im Sturm reißen einzelne los.', why: 'Wellblech ist wasserdicht und behält seine Form. Wellen und Treibgut beulen es aber ein, und bei Sturm reißt der Sog zuerst an den Ecken. Bei langer Nässe rosten Kanten und Nägel.' },
  brickwall: { what: 'Der Putz platzt ab, Salze blühen aus. Gibt der Boden nach, reißt die Wand.', why: 'Ziegel mit Zementmörtel halten Wasser aus. Verliert aber das Fundament seinen Halt, reißt die Wand von den Fensterecken schräg auf, und eine Hausecke kann wegbrechen.' },
  ferro: { what: 'Fast nichts, nur ein Schlammrand bleibt.', why: 'Ferrozement ist ein dünner Mörtel auf Drahtgeflecht. Er ist fast wasserdicht und reißt kaum. Dafür ist er in Bangladesch teuer und selten verfügbar.' },
  tinhip: { what: 'Das Dach hält dem Sturm stand, solange die Wände tragen.', why: 'Wellblech ist leicht und fest verschraubt. Gibt eine Wand nach, verliert das Dach sein Auflager und sackt ein.' },
  concreteflat: { what: 'Sicher auf Mauerwerk, auf weichen Wänden drückt es sie ein.', why: 'Ein Betondach wiegt rund 300 kg pro m². Auf Ziegel ist das sicher, und man kann sich bei Flut darauf retten. Auf Lehm oder Blech drückt die Last die Wände ein, und das Dach stürzt ab.' },
  tilegable: { what: 'Einzelne Ziegel fliegen, das Gewicht belastet die Wände.', why: 'Tonziegel wiegen etwa 40 kg pro m². Der Sog an den Rändern ist im Sturm größer als dieses Gewicht, so fliegen einzelne Ziegel. Gibt eine Wand nach, kippt der Dachabschnitt darüber nach innen.' },
  thatch: { what: 'Der Sturm reißt Büschel heraus, nass hängt das Dach durch.', why: 'Gras ist leicht und wird im Sturm leicht herausgesogen. Nass wiegt Stroh drei- bis viermal so viel und hängt zwischen den Sparren durch.' },
  platform: { what: 'Das Haus bleibt trocken. An den Flanken reißt das Wasser Rinnen.', why: 'Die aufgeschüttete Erdplattform hebt das ganze Haus über den Wasserstand. Sie besteht aber aus Erde, und Strömung und Wellen nagen an ihren Seiten.' },
  well: { what: 'Der Brunnen bleibt sauber, das Wasser im Hof steht trotzdem.', why: 'Ein erhöhter Brunnen und eine erhöhte Latrine schützen vor verschmutztem Flutwasser. Das Haus selbst schützen sie nicht.' },
  vetiver: { what: 'Die Wurzeln halten den Boden fest, der Sockel wird weniger abgetragen.', why: 'Vetivergras wurzelt bis zu 3 m tief und bremst die Erosion deutlich. Es braucht aber Zeit zum Anwachsen.' },
  frame: { what: 'Das Tragwerk hält Wand und Dach zusammen.', why: 'Ein verstärktes Tragwerk verbindet Wände und Dach. Es verhindert, dass beim Einsturz einer Wand das ganze Dach mitkippt.' },
};

// Stopps in der Simulation: Jeder Stopp erscheint einmal, sobald sein Auslöser eintritt. Text je nach Material.
// when(f, d, cfg): f = Pegel- und Sturmwerte (flut.js), d = Schäden (schaden.js), cfg = Aufbau. Rückgabe true = Stopp.
V3.STOPS = [
  {
    id: 'ufer', part: null, icon: 'drop',
    when: (f) => f.phase >= 2,
    make: (cfg, ground) => ground === 'char'
      ? { title: 'Das Wasser umschließt die Insel', text: 'Auf einer Char gibt es keinen Deich und kein Ufer. Das Wasser steigt von allen Seiten, die Insel wird kleiner. Die Strömung ist hier stärker als am Ufer und trägt Sand ab.' }
      : { title: 'Der Fluss tritt über die Ufer', text: 'In der Regenzeit schwillt die Jamuna an: Monsunregen und Schmelzwasser aus dem Himalaya kommen zusammen. Das Wasser läuft flach über die Ufer in Dorf und Felder.' },
  },
  {
    id: 'sockel', part: 'foundation', icon: 'foundation',
    when: (f) => f.level >= .12,
    make: (cfg) => {
      const t = {
        earth: { title: 'Das Wasser erreicht den Erdsockel', text: 'Erde saugt sich voll und verliert Halt. Die Strömung beginnt, an den Ecken und an der Wasserlinie Kerben auszuspülen. Ab jetzt wird der Sockel Stunde um Stunde schwächer.' },
        concrete: { title: 'Das Wasser steht an der Platte', text: 'Die Betonplatte liegt auf Bodenhöhe. Das Wasser läuft über die Schwelle ins Haus. Die Platte selbst weicht nicht auf, aber drinnen steht jetzt Wasser.' },
        brick: { title: 'Das Wasser erreicht den Ziegelsockel', text: 'Der Sockel hebt den Boden etwa 50 cm an. Ziegel nehmen Wasser auf, der Mörtel in den Fugen wird bei langer Nässe langsam weicher. Das Haus bleibt zunächst trocken.' },
        stilts: { title: 'Das Wasser steht zwischen den Pfählen', text: 'Das Haus steht auf Bambuspfählen über dem Wasser. Die Gefahr ist jetzt Treibgut: Äste und Bretter prallen gegen die Pfähle. Bambus quillt im Wasser auf.' },
      }[cfg.foundation];
      return t || { title: 'Das Wasser erreicht das Haus', text: 'Ohne Fundament steht das Haus direkt auf dem Boden. Das Wasser steht sofort an den Wänden.' };
    },
  },
  {
    id: 'platform', part: 'extra', icon: 'star',
    when: (f, d, cfg) => cfg.extra === 'platform' && f.level >= .45,
    make: () => ({ title: 'Die Erdplattform hält das Haus trocken', text: 'Das Haus steht 2 m über dem Boden und bleibt über dem Wasser. Aber die Flanken der Plattform bestehen aus Erde: Strömung und Wellen reißen Rinnen hinein.' }),
  },
  {
    id: 'wand', part: 'wall', icon: 'wall',
    when: (f, d, cfg) => f.level >= .5,
    make: (cfg) => ({
      mud: { title: 'Die Lehmwand saugt sich voll', text: 'Ungebrannter Lehm verliert durchnässt 70 bis 90 % seiner Festigkeit. Das Wasser steigt in der Wand noch 30 bis 60 cm über den Wasserstand. Der Wandfuß wird weich wie Brei.' },
      tin: { title: 'Wellen beulen das Blech ein', text: 'Das Blech ist wasserdicht, aber Wellen und Treibgut drücken es nach innen. Das Holz und der Bambus dahinter quellen auf, die Nägel beginnen zu rosten.' },
      brickwall: { title: 'Die Ziegelwand steht im Wasser', text: 'Ziegel und Zementputz halten Wasser aus. Der Putz saugt sich aber voll und beginnt abzuplatzen. Wichtig ist jetzt, ob der Boden darunter hält.' },
      ferro: { title: 'Die Ferrozement-Wand bleibt dicht', text: 'Ferrozement ist fast wasserdicht und reißt kaum. Nur ein Schlammrand zeigt, wie hoch das Wasser steht. Das Material gibt es aber fast nirgends zu kaufen.' },
    }[cfg.wall] || { title: 'Die Wände stehen im Wasser', text: 'Das Wasser steht an den Wänden.' }),
  },
  {
    id: 'bruch', part: 'wall', icon: 'x',
    when: (f, d) => (d.events || []).some(e => /^wall:(fluss|tuer|west|ost):(slump|corner|crush)/.test(e.what)),
    make: (cfg) => ({
      mud: { title: 'Die Lehmwand bricht ein', text: 'Nach einigen Stunden im Wasser trägt der aufgeweichte Wandfuß das Gewicht nicht mehr. Die Wand sackt ab und stürzt ein. In Bangladesch ist das der häufigste Schaden bei Überschwemmungen.' },
      brickwall: { title: 'Die Ziegelwand reißt auf', text: 'Der Boden unter dem Fundament wird ausgewaschen und gibt nach. Die Wand reißt von den Fensterecken schräg auf, eine Hausecke bricht weg.' },
      tin: { title: 'Die Blechwand knickt ein', text: 'Das schwere Dach und der Druck des Wassers sind zu viel für die dünne Wand. Sie knickt ein.' },
      ferro: { title: 'Die Wand gibt nach', text: 'Die Wand gibt nach.' },
    }[cfg.wall] || { title: 'Eine Wand gibt nach', text: 'Eine Wand gibt nach.' }),
  },
  {
    id: 'dach', part: 'roof', icon: 'roof',
    when: (f, d) => (d.events || []).some(e => /^roof:/.test(e.what)) || (d.roofLost || 0) > 6,
    make: (cfg, ground, d) => ({
      thatch: { title: 'Der Sturm reißt das Strohdach auf', text: 'Böen von 25 bis 35 m/s erzeugen Sog. Er zieht Büschel aus dem Dach, an Traufe, Rand und First zuerst. Nass wiegt das Stroh drei- bis viermal so viel und hängt durch.' },
      tilegable: { title: 'Dachziegel fliegen weg', text: 'Ziegel wiegen etwa 40 kg pro m². Der Sog an den Rändern ist im Sturm größer als dieses Gewicht, einzelne Ziegel lösen sich. Gibt eine Wand nach, kippt der Dachabschnitt darüber nach innen.' },
      tinhip: { title: 'Das Blechdach kommt ins Wanken', text: 'Wellblech ist leicht. Bei Sturm reißt der Sog zuerst an den Ecken auf der windabgewandten Seite. Verliert das Dach seine Wände, sackt es ein.' },
      concreteflat: { title: 'Das Betondach drückt auf die Wände', text: 'Das Dach wiegt rund 300 kg pro m². Auf weichen Wänden aus Lehm oder Blech drückt es sie ein, und das Dach stürzt ab.' },
    }[cfg.roof] || { title: 'Das Dach wird beschädigt', text: 'Das Dach wird beschädigt.' }),
  },
  {
    id: 'pfahl', part: 'foundation', icon: 'x',
    when: (f, d) => (d.events || []).some(e => e.what === 'found:stilt'),
    make: () => ({ title: 'Ein Pfahl knickt', text: 'Treibgut prallt seitlich gegen einen Bambuspfahl und knickt ihn. Die Plattform neigt sich, die anderen Pfähle müssen jetzt mehr tragen.' }),
  },
  {
    id: 'hoechst', part: null, icon: 'drop', last: true,
    when: (f) => f.done,
    make: (cfg, ground, d, depthCm) => ({ title: 'Der Höchststand ist erreicht', text: depthCm > 2 ? `Das Wasser steht 1 m über dem Boden, im Haus ${depthCm} cm hoch. Gleich siehst du das Ergebnis und kannst jedes Bauteil einzeln ansehen.` : 'Das Wasser steht 1 m über dem Boden, aber der Hausboden bleibt trocken. Gleich siehst du das Ergebnis und kannst jedes Bauteil einzeln ansehen.' }),
  },
];

V3.VERDICT = (points) => points >= 9 ? { word: 'Sehr robust', lead: 'Dein Haus übersteht die Flut sehr gut. Die Auswahl passt zu den Bedingungen vor Ort.' }
  : points >= 7 ? { word: 'Solide', lead: 'Das Haus hält viel aus. An einzelnen Stellen geht noch etwas.' }
  : points >= 5 ? { word: 'Mit Schwächen', lead: 'Das Haus steht, aber bei einer größeren Flut wird es kritisch.' }
  : { word: 'Kritisch', lead: 'Eine Flut setzt diesem Haus stark zu. Überlege, welche Bauteile du ändern kannst.' };
