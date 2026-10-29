'use strict';

/* ============================================================
   DATEN – Szenarien, Schritte, Auswahlmöglichkeiten
   r: 2 = optimal, 1 = geht, aber nicht ideal, 0 = ungeeignet
   set: Zustand, der in die Haus-Zeichnung einfließt
   ============================================================ */
const o = (label, info, r, set, why) => ({ label, info, r, set, why });

const SC = {
  eq: {
    title: 'Erdbeben in Japan',
    facts: ['Zweigeschossiges Holzhaus in Japan', 'Erdbebenstärke: Stufe 3', 'Der Boden bebt – das Haus muss die Kräfte aushalten.'],
    goal: 'Entscheide Schritt für Schritt, wie dein Haus gebaut wird. Am Ende siehst du, wie gut deine Wahl zum Szenario passt.',
    vorbild: [
      ['Hausname', '„Holzhaus mit Erdbebenklasse 3“'],
      ['Konstruktionsart', 'Holzbau in Ständer- bzw. traditioneller Pfosten-Riegel-Bauweise, mit Platten und Stahlverbindern ausgesteift'],
      ['Entwurfsmerkmale', 'Kompakter, eher rechteckiger Grundriss; zwei Geschosse; Erdgeschoss nicht zu offen.'],
    ],
    tips: [
      'Tragende Wände gleichmäßig über das Gebäude verteilen.',
      'Dach, Wände und Fundament mit Stahlverbindern und Verankerungen verbinden.',
      'Schwere Dachdeckungen und unnötig schwere Bauteile vermeiden.',
      'Schwere Einrichtung (Schränke, Regale, Warmwasserbereiter) sicher befestigen.',
      'Fundament auf Grundlage einer Baugrunduntersuchung wählen.',
    ],
    hint: 'Kein Material allein garantiert, dass ein Haus ein Erdbeben unbeschädigt übersteht. Entscheidend sind das Zusammenspiel der Materialien, die Verbindungen, der Baugrund und die Bemessung.',
    sketch: { found: 'plain', foundH: 18, wall: 'plain', roofMat: 'plain', shape: 'gable', rh: 62, ro: 12 },
    steps: [
      { name: 'Fundament', q: 'Welches Fundament wählst du?', groups: [
        { label: 'Fundament', part: 'found', opts: [
          o('Durchgehende Betonplatte', 'Stahlbeton-Bodenplatte: Eine Platte aus Beton mit Stahl drin, auf der das ganze Haus steht', 2, { found: 'slab', foundH: 18 },
            'Beton nimmt Druckkräfte auf, Stahl die Zugkräfte. Die zusammenhängende Platte verteilt die Gebäudelasten und verbindet die Konstruktion.'),
          o('Betonstreifen unter den Wänden', 'Streifenfundament: Beton mit Stahl drin, als Streifen genau unter den tragenden Wänden', 2, { found: 'strip', foundH: 26 },
            'In Japan sehr verbreitet für Holzhäuser: durchlaufende, bewehrte Streifen unter allen tragenden Wänden verbinden das Haus fest mit dem Boden – bei passendem Baugrund ebenso geeignet wie die Platte.'),
          o('Betonstützen tief im Boden', 'Stahlbetonpfähle: Lange Stützen aus Beton, die tief in die Erde reichen', 1, { found: 'piles', foundH: 30 },
            'Sinnvoll bei schwierigen Bodenverhältnissen, aber nicht automatisch die beste Wahl – das hängt von der Baugrunduntersuchung ab.'),
          o('Haus liegt auf losen Steinen', 'Natursteinsockel: Das Holzgerüst liegt nur auf Steinen auf, ohne feste Verbindung', 0, { found: 'stone', foundH: 14 },
            'Das Haus ist nicht fest mit dem Boden verbunden und kann bei einem Beben verrutschen oder abheben.'),
        ] },
      ] },
      { name: 'Wand', q: 'Welche Wände wählst du?', groups: [
        { label: 'Außenwände & Tragwerk', part: 'wall', opts: [
          o('Leichte Holzwände, mit Platten verstärkt', 'Holzständerbau: Holzgerüst mit aufgenagelten Sperrholzplatten, Metallwinkeln und Zedernholz-Fassade', 2, { wall: 'timber' },
            'Holz ist leicht und nimmt Erdbebenkräfte durch kontrollierte Verformung auf. Platten und Stahlverbinder stabilisieren gegen seitliche Bewegungen.'),
          o('Stahlgerüst mit Schrägstreben', 'Stahlprofile mit Diagonalverbänden: Stahlrahmen, der durch schräge Streben nicht wackelt', 1, { wall: 'steel' },
            'Funktioniert, braucht aber eine fachgerechte Erdbebenbemessung und ist aufwendiger.'),
          o('Massive Betonwände', 'Bewehrter Stahlbeton: Dicke Wände aus Beton mit Stahl drin', 1, { wall: 'concrete' },
            'Tragfähig, aber schwer: Je mehr Masse, desto größer die Erdbebenkräfte. Ebenfalls nur mit fachgerechter Bemessung.'),
          o('Gemauerte Ziegelwände', 'Ziegelmauerwerk ohne Bewehrung: Gemauerte Wände aus Ziegeln, ohne Stahl darin', 0, { wall: 'brick' },
            'Unbewehrtes Mauerwerk reißt bei seitlichen Kräften und kann einstürzen.'),
        ] },
        { label: 'Innenwände', part: 'win', opts: [
          o('Leichte Trennwand mit Holzgerüst', 'Gipskarton auf Holzständern: Dünne Platten auf einem Holzgerüst, innen mit Dämmwolle gefüllt', 2, { inner: 'gyp' },
            'Leichte, nichttragende Wände entlasten das Tragwerk. Bewegungsverträgliche Anschlüsse verringern Risse.'),
          o('Leichte Trennwand mit Metallgerüst', 'Gipsfaser auf Stahlprofilen: Dünne Platten auf einem schmalen Metallgerüst', 1, { inner: 'gypsteel' },
            'Ebenfalls leicht und nichttragend – aber Holzständer mit flexiblen Anschlüssen sind hier die erste Wahl.'),
          o('Dünne Holzplatten', 'Holzwerkstoffplatten: Platten aus gepressten Holzspänen', 1, { inner: 'wood' },
            'Leicht und möglich, brauchen aber ebenfalls passende Anschlüsse.'),
          o('Schwere gemauerte Wände', 'Massives Mauerwerk: Dicke Wände aus Stein', 0, { inner: 'brick' },
            'Schwer, müssen aufwendig gegen Umkippen und Risse gesichert werden und belasten das Tragwerk.'),
        ] },
      ] },
      { name: 'Dach', q: 'Welches Dach wählst du?', groups: [
        { label: 'Dachmaterial', part: 'roof', opts: [
          o('Leichtes Metalldach aus Stahl', 'Beschichtetes Stahlblech: Dünne Stahlplatten mit Schutzschicht, fest verschraubt', 2, { roofMat: 'steel' },
            'Das geringe Gewicht reduziert die Trägheitskräfte im Erdbeben. Sichere Befestigungen verhindern Verrutschen oder Abheben.'),
          o('Leichtes Metalldach aus Aluminium', 'Aluminiumblech: Dünne Aluminiumplatten, noch leichter als Stahl', 1, { roofMat: 'alu' },
            'Sehr leicht und gut möglich – Stahlblech ist hier aber die bessere Wahl, weil es robuster ist.'),
          o('Leichte Platten aus Zement und Fasern', 'Faserzement-Platten: Dünne Dachplatten aus Zement und Fasern', 1, { roofMat: 'fiber' },
            'Leicht genug, wenn sie für die örtlichen Anforderungen zugelassen und sicher befestigt sind, aber schwerer als Metall.'),
          o('Schwere Dachziegel aus Ton', 'Tonziegel: Klassische, schwere Dachziegel', 0, { roofMat: 'clay' },
            'Schwere Dachdeckungen erzeugen große Kräfte im oberen Geschoss und können herabrutschen.'),
        ] },
        { label: 'Dachform', part: 'roof', opts: [
          o('Klassisches Dach mit zwei Seiten', 'Satteldach: Zwei schräge Dachflächen, symmetrisch – wie ein typisches Hausdach', 2, { shape: 'gable', rh: 62, ro: 14 },
            'Leichte, symmetrische Form; aussteifende Wände lassen sich gleichmäßig in beide Richtungen verteilen.'),
          o('Dach mit vier schrägen Seiten', 'Walmdach: Alle vier Seiten sind geneigt', 1, { shape: 'hip', rh: 60, ro: 14 },
            'Ebenfalls symmetrisch und stabil, aber komplizierter zu bauen – das einfache Satteldach ist hier die beste Wahl.'),
          o('Dach mit nur einer schrägen Seite', 'Pultdach: Eine einzige geneigte Dachfläche', 1, { shape: 'shed', rh: 60, ro: 12 },
            'Möglich, aber die unsymmetrische Form macht gleichmäßige Aussteifung schwieriger.'),
          o('Flaches Dach mit schwerer Kiesschicht', 'Flachdach mit Kies: Fast waagerecht, mit Kies beschwert', 0, { shape: 'flat', rh: 10, ro: 8, heavy: true },
            'Die Kiesschicht macht das Dach schwer – das ergibt hohe Erdbebenkräfte ganz oben im Haus.'),
        ] },
      ] },
      { name: 'Besonderheit', q: 'Welche Besonderheiten bekommt dein Haus?', groups: [
        { label: 'Fenster & Außentüren', part: 'win', opts: [
          o('Alu-Fenster mit bruchsicherem Glas', 'Sicherheitsglas zerfällt nicht in scharfe Scherben; flexibel eingebaut, damit nichts klemmt', 2, { win: 'alu' },
            'Bewegungsverträgliche Anschlüsse verhindern Schäden und verklemmte Türen, Sicherheitsglas verringert die Verletzungsgefahr.'),
          o('Holzfenster mit bruchsicherem Glas', 'Holzrahmen, flexibel eingebaut, mit Sicherheitsglas', 1, { win: 'wood' },
            'Ebenfalls möglich, aber Alu-Rahmen bleiben bei Verformung formstabiler.'),
          o('Kunststoff-Fenster mit normalem Glas', 'Übliche Fenster ohne besondere Sicherung', 1, { win: 'pvc' },
            'Der Rahmen ist in Ordnung, aber Normalglas splittert und erhöht die Verletzungsgefahr.'),
          o('Große Glasfront, fest eingemauert', 'Breite Fensterfläche, die starr in der Wand sitzt', 0, { win: 'pano' },
            'Starre Einbindung verträgt keine Gebäudeverformung – das Glas bricht, Türen klemmen.'),
        ] },
        { label: 'Zusatzmaßnahme', part: 'extra', opts: [
          o('Metallwinkel & Zugstangen', 'Stahlverbinder und Zuganker: Metallteile, die Fundament, Wände und Dach fest zusammenhalten', 2, { extra: 'ties' },
            'Zugfeste Verbindungen verhindern, dass sich Dach, Wände und Fundament bei seitlichen Kräften voneinander lösen.'),
          o('Stabile Wände gleichmäßig verteilen', 'Aussteifende Wände: Feste Wände, die das Haus stabil halten – in beide Richtungen verteilt', 1, { extra: 'shear' },
            'Wichtig und sinnvoll, aber ohne feste Verbindungen zwischen Fundament, Wänden und Dach hilft das allein nicht – die Metallverbinder sind wichtiger.'),
          o('Schwere Möbel und Geräte sichern', 'Schränke, Regale, Warmwasserbereiter an der Wand befestigen', 1, { extra: 'furn' },
            'Wichtig für die Sicherheit der Bewohner, schützt aber das Tragwerk selbst nicht.'),
          o('Offenes Erdgeschoss (Garage)', 'Große Öffnung ohne Wände im Erdgeschoss', 0, { extra: 'open' },
            'Fehlen im Erdgeschoss stabile Wände, kann dieses Geschoss einknicken (ein sogenanntes „weiches Geschoss“).'),
        ] },
      ] },
    ],
  },

  tr: {
    title: 'Dauerregen in den Tropen',
    facts: ['Cairns, Nord-Queensland (Australien)', 'Tropisch-heiß und feucht, es regnet fast ununterbrochen', 'Gefahren: Starkregen, Termiten und mögliche Zyklone'],
    goal: 'Entscheide Schritt für Schritt, wie dein Haus gebaut wird. Am Ende siehst du, wie gut deine Wahl zum Szenario passt.',
    vorbild: [
      ['Hausname', 'Highset Queenslander – erhöhtes Haus auf Stützen. Modern: „cyclone-rated elevated tropical house“, nach regionaler Windlast bemessen.'],
      ['Konstruktionsart', 'Erhöhte Stützenbauweise mit leichtem Holz-, Stahl- oder Mischtragwerk.'],
    ],
    tips: [
      'Große Dachüberstände, gut dimensionierte Rinnen und saubere Fallrohre vorsehen.',
      'Metallteile, Schrauben und Verbinder gegen Korrosion schützen.',
      'Holz nie direkt auf Erde oder dauerhaft feuchten Beton setzen.',
      'Regelmäßig Termiten, Dach und Dichtheit kontrollieren.',
      'Bei Zyklonrisiko Dach, Fenster, Türen und Tragwerk nach der örtlichen Windklasse planen.',
    ],
    hint: 'Es gibt kein allgemein perfektes Tropenhaus. Fundament, Tragwerk und Dach müssen an Boden, Hochwasser, Hanglage, Salzluft, Starkregen und Zyklonlasten angepasst werden.',
    sketch: { found: 'plain', foundH: 30, wall: 'plain', roofMat: 'plain', shape: 'gable', rh: 70, ro: 20 },
    steps: [
      { name: 'Fundament', q: 'Welches Fundament wählst du?', groups: [
        { label: 'Fundament', part: 'found', opts: [
          o('Hohe Betonstützen – Haus schwebt über dem Boden', 'Stahlbetonpfähle: Stützen aus Beton mit Stahl drin; das Haus steht erhöht darauf', 2, { found: 'piles', foundH: 70 },
            'Stahlbeton ist feuchtebeständig und für Termiten uninteressant. Die erhöhte Lage schützt vor Spritzwasser und kleineren Überflutungen.'),
          o('Betonplatte, höher gelegt', 'Stahlbeton-Bodenplatte: Beton mit Stahl drin, mit Sperre gegen Feuchte von unten und Abfluss für Wasser', 1, { found: 'slab', foundH: 44 },
            'Tragfähig und feuchtebeständig, aber die Platte liegt fester am Boden: Wasser und Termiten kommen leichter heran als bei Stützen, die das Haus frei anheben.'),
          o('Betonplatte direkt am Boden', 'Betonplatte ohne Erhöhung', 1, { found: 'slab', foundH: 12 },
            'Robust, aber bei Starkregen und Hochwasser steht das Wasser direkt am Haus.'),
          o('Holzpfosten in der Erde', 'Behandelte Holzstützen, die eingegraben sind', 0, { found: 'wpost', foundH: 44 },
            'Holz im feuchten Boden fault und ist ein Einfallstor für Termiten.'),
        ] },
      ] },
      { name: 'Wand', q: 'Welche Wände wählst du?', groups: [
        { label: 'Außenwände & Tragwerk', part: 'wall', opts: [
          o('Betonwände', 'Stahlbeton bzw. bewehrte Betonsteine: Beton mit Stahl drin; außen Zementplatten oder Putz', 1, { wall: 'concrete' },
            'Robust gegen Feuchtigkeit und Termiten, aber sehr schwer und aufwendig zu bauen. Ein leichtes Stahlgerüst ist praktischer.'),
          o('Stahlgerüst mit Zementplatten', 'Rostgeschützter Stahlrahmen, außen mit Platten aus Zement und Fasern', 2, { wall: 'fiber' },
            'Leicht, termitensicher und typisch für moderne Tropenhäuser – vorausgesetzt, der Korrosionsschutz hält dauerhaft.'),
          o('Holz mit Schutzbehandlung', 'Gegen Termiten und Feuchte imprägniertes Holz', 1, { wall: 'wtreat' },
            'Klassisch für Queenslander-Häuser und leicht, aber der Schutz muss ständig gepflegt werden. Stahl und Zement brauchen weniger Pflege.'),
          o('Holz ohne Schutz', 'Offene Holzwände ohne Schutzbehandlung', 0, { wall: 'wraw' },
            'Quillt, schimmelt und wird von Termiten gefressen – im Dauerregen ungeeignet.'),
        ] },
        { label: 'Innenwände', part: 'win', opts: [
          o('Platten aus Zement', 'Zementgebundene Platten: Bauplatten aus Zement und Fasern, vertragen Nässe', 2, { inner: 'cement' },
            'Mineralisch und zementgebunden: widerstandsfähig gegen Feuchtigkeit, Schimmel und Termiten.'),
          o('Gemauerte, verputzte Wände', 'Verputzte Betonsteinwände: Gemauert und mit Putz überzogen', 1, { inner: 'plaster' },
            'Feuchte- und termitenbeständig, aber schwerer und aufwendiger als Zementplatten.'),
          o('Gipsplatten mit Nässeschutz', 'Feuchtraum-Gipsplatten: Gipsplatten, die gegen Nässe behandelt sind (wie im Bad)', 1, { inner: 'gypw' },
            'Nur in trockeneren Innenbereichen und bei guter Lüftung sinnvoll.'),
          o('Normale Trockenbauplatten', 'Gipskarton und Spanplatten: Die üblichen günstigen Innenplatten', 0, { inner: 'chip' },
            'Spanplatten quellen bei hoher Luftfeuchte, Gipsplatten schimmeln, Termiten lieben beides.'),
        ] },
      ] },
      { name: 'Dach', q: 'Welches Dach wählst du?', groups: [
        { label: 'Dachmaterial', part: 'roof', opts: [
          o('Helles Metalldach', 'Beschichtetes Stahlblech: Dünne Stahlplatten mit Schutzschicht, helle Farbe', 2, { roofMat: 'steelL' },
            'Leitet Starkregen schnell ab, ist leicht und termitensicher. Helle Flächen heizen sich weniger auf.'),
          o('Wellplatten aus Zement und Fasern', 'Faserzement-Platten: Dachplatten aus Zement und Fasern', 1, { roofMat: 'fiber' },
            'Feuchtebeständig, aber schwerer und weniger flexibel; gute Befestigung nötig.'),
          o('Dachziegel', 'Sicher befestigte Ziegel', 1, { roofMat: 'clay' },
            'Möglich bei ausreichend tragfähiger Konstruktion, bei Zyklonen aber ein Risiko, wenn Ziegel sich lösen.'),
          o('Dunkle Holzschindeln', 'Schindeln: Kleine, dünne Holzplättchen als Dachdeckung', 0, { roofMat: 'shingle' },
            'Faulen bei Dauerregen, sind für Termiten attraktiv und heizen sich dunkel stark auf.'),
        ] },
        { label: 'Dachform', part: 'roof', opts: [
          o('Steiles Dach mit zwei Seiten, weit überstehend', 'Satteldach: Zwei steile Dachflächen. Überstand heißt: Das Dach ragt weit über die Wand hinaus', 2, { shape: 'gable', rh: 95, ro: 42 },
            'Steile Dächer leiten Wasser rasch ab, große Überstände schützen die Wände vor Regen und Sonne.'),
          o('Dach mit vier schrägen Seiten, weit überstehend', 'Walmdach: Alle vier Seiten sind geneigt; das Dach ragt weit über die Wand hinaus', 2, { shape: 'hip', rh: 80, ro: 40 },
            'Ebenfalls gut: schnelle Ableitung, geschützte Wände und bei Zyklonen windgünstiger.'),
          o('Normal geneigtes Dach ohne Überstand', 'Dach schließt direkt mit der Wand ab', 1, { shape: 'gable', rh: 55, ro: 0 },
            'Wasser wird abgeleitet, aber ohne Überstände läuft Regen an der Fassade herab.'),
          o('Flachdach', 'Fast waagerechtes Dach', 0, { shape: 'flat', rh: 10, ro: 6 },
            'Starkregen sammelt sich und kann eindringen – ein hohes Risiko bei Dauerregen.'),
        ] },
      ] },
      { name: 'Besonderheit', q: 'Welche Besonderheiten bekommt dein Haus?', groups: [
        { label: 'Fenster & Außentüren', part: 'win', opts: [
          o('Alu-Fenster mit eingebranntem Lack', 'Pulverbeschichtet: Der Lack ist eingebrannt und hält Nässe und Sonne aus. Dicht gegen Regen, mit Insektengitter und Verschattung', 2, { win: 'alu' },
            'Korrosions- und termitenbeständig. Gute Anschlüsse verhindern Wassereintritt bei Starkregen.'),
          o('Kunststoff-Fenster mit Dichtungen', 'Mit Insektengitter', 1, { win: 'pvc' },
            'Geeignet und termitenbeständig, aber weniger belastbar bei Zyklonen und starker UV-Strahlung.'),
          o('Holzfenster aus hartem, geschütztem Holz', 'Hochwertiger Holzrahmen', 1, { win: 'wood' },
            'Möglich, verlangt aber mehr Wartung und Termitenschutz.'),
          o('Einfache Holzfenster ohne Schutz', 'Weiches Holz ohne Behandlung', 0, { win: 'softwood' },
            'Quillt, verzieht sich und wird von Termiten befallen.'),
        ] },
        { label: 'Schutz vor Feuchtigkeit & Termiten', part: 'extra', opts: [
          o('Wasser ableiten und Termiten aussperren', 'Drainage = Abfluss für Wasser. Termitensperre = Sperre aus Metall, die Termiten nicht überwinden. Der Sockel bleibt sichtbar', 2, { extra: 'full' },
            'Wasser sammelt sich weder am Haus noch unter dem Fundament. Termiten sind früh erkennbar und finden keine verdeckten Zugänge.'),
          o('Nur Regenrinnen und Fallrohre', 'Dachwasser ableiten, sonst nichts', 1, { extra: 'gutter' },
            'Hilft gegen Wasser, lässt aber das Termitenrisiko offen.'),
          o('Einmal Termitengift in den Boden', 'Chemische Bodenbehandlung: Schutzmittel rund ums Haus, nur einmal aufgetragen', 1, { extra: 'chem' },
            'Chemie allein lässt nach und ersetzt weder Entwässerung noch Kontrolle.'),
          o('Beete und Rindenmulch direkt am Haus', 'Mulch = Abdeckung aus Rinde oder Pflanzenresten; Bewuchs direkt an der Wand', 0, { extra: 'mulch' },
            'Feuchte Beete direkt am Haus verstecken Termiten und halten den Sockel dauernd nass.'),
        ] },
      ] },
    ],
  },
};

const PAGES = ['Startseite', 'Auswahl', 'Szenario', 'Fundament', 'Wand', 'Dach', 'Besonderheit', 'Übersicht'];
const CHIP = ['Ungeeignet', 'Okay, aber nicht ideal', 'Optimal'];
const CHIP_SHORT = ['Ungeeignet', 'Okay', 'Optimal'];

/* ============================================================
   HAUS-ZEICHNUNG (SVG)
   ============================================================ */
const WALL = { timber: '#c79a62', steel: '#b4bec8', concrete: '#b9b9b3', brick: '#a8523a', fiber: '#d8d3c2', wtreat: '#7a5230', wraw: '#dcc191', plain: '#f3f0e8' };
const ROOF = { steel: '#9fb2c4', steelL: '#e3eaf0', alu: '#cfd4d9', fiber: '#8f8f84', clay: '#b5532f', shingle: '#5a4630', plain: '#8d8d8d' };
const FRAME = { alu: '#7f8b93', wood: '#7b4f26', pvc: '#fbfbfb', softwood: '#d9b98a', pano: '#7f8b93', def: '#666' };
const INNER = { gyp: '#f1ece0', gypsteel: '#ece8dc', wood: '#d7b98a', brick: '#b66a52', cement: '#d0d0c8', plaster: '#efe6d2', gypw: '#e4eadf', chip: '#c9a877' };

let uid = 0;

function foundation(st, baseY, G, fh) {
  const stroke = 'stroke="#444" stroke-width="2"';
  const xs = [0, 1, 2, 3, 4, 5].map(i => 196 + i * 41.6);
  switch (st.found) {
    case undefined:
      return `<rect x="182" y="${baseY}" width="236" height="${fh}" class="ghost"/>`;
    case 'plain':
      return `<rect x="182" y="${baseY}" width="236" height="${fh}" fill="#bdbab2" ${stroke}/>`;
    case 'slab': {
      let s = `<rect x="182" y="${baseY}" width="236" height="${fh}" fill="#9c9c96" ${stroke}/>`;
      for (let i = 1; i <= 2; i++) s += `<line x1="186" x2="414" y1="${baseY + fh * i / 3}" y2="${baseY + fh * i / 3}" stroke="#555" stroke-width="1.5" stroke-dasharray="3 3"/>`;
      return s;
    }
    case 'strip': {
      let s = `<rect x="182" y="${baseY}" width="236" height="${fh}" fill="#3b3a36"/>`;
      [182, 287, 392].forEach(x => { s += `<rect x="${x}" y="${baseY}" width="26" height="${fh}" fill="#9c9c96" ${stroke}/>`; });
      return s + `<rect x="182" y="${baseY}" width="236" height="6" fill="#8a8a84" ${stroke}/>`;
    }
    case 'piles': {
      let s = '';
      xs.forEach(x => { s += `<rect x="${x - 7}" y="${baseY + 8}" width="14" height="${G - baseY - 8 + 16}" fill="#8e8e88" ${stroke}/>`; });
      return s + `<rect x="182" y="${baseY}" width="236" height="8" fill="#7d7d78" ${stroke}/>`;
    }
    case 'stone': {
      let s = `<rect x="182" y="${baseY}" width="236" height="6" fill="#7a5230" ${stroke}/>`;
      xs.forEach(x => { s += `<ellipse cx="${x}" cy="${G - fh / 2 + 2}" rx="17" ry="${fh / 2 + 3}" fill="#8a8a84" ${stroke}/>`; });
      return s;
    }
    case 'wpost': {
      let s = '';
      xs.forEach(x => { s += `<rect x="${x - 6}" y="${baseY + 8}" width="12" height="${G - baseY - 8 + 22}" fill="#6b4a2b" ${stroke}/>`; });
      return s + `<rect x="182" y="${baseY}" width="236" height="8" fill="#5a3d22" ${stroke}/>`;
    }
  }
  return '';
}

function wallArt(k, x, y, w, h, floors) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WALL[k]}" stroke="#444" stroke-width="2"/>`;
  const L = (x1, y1, x2, y2, c, sw = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"/>`;
  if (k === 'timber' || k === 'wtreat' || k === 'wraw') {
    for (let i = 14; i < w; i += 14) s += L(x + i, y, x + i, y + h, 'rgba(0,0,0,.18)');
  } else if (k === 'brick') {
    for (let r = 0, j = 10; j < h; j += 10, r++) {
      s += L(x, y + j, x + w, y + j, 'rgba(255,255,255,.35)');
      for (let i = (r % 2) * 12 + 12; i < w; i += 24) s += L(x + i, y + j - 10, x + i, y + j, 'rgba(255,255,255,.35)');
    }
  } else if (k === 'steel') {
    const ph = h / floors;
    for (let f = 0; f < floors; f++) {
      s += L(x, y + f * ph, x + w, y + (f + 1) * ph, '#5b6670', 3) + L(x + w, y + f * ph, x, y + (f + 1) * ph, '#5b6670', 3);
    }
  } else if (k === 'concrete') {
    for (let j = 40; j < h; j += 40) s += L(x, y + j, x + w, y + j, 'rgba(0,0,0,.12)');
    for (let i = 55; i < w; i += 55) s += L(x + i, y, x + i, y + h, 'rgba(0,0,0,.08)');
  } else if (k === 'fiber') {
    for (let i = 55; i < w; i += 55) s += L(x + i, y, x + i, y + h, '#a9a490', 1.5);
    for (let j = 47; j < h; j += 47) s += L(x, y + j, x + w, y + j, '#a9a490', 1.5);
  }
  if (floors > 1) s += L(x, y + h / floors, x + w, y + h / floors, '#333', 2);
  return s;
}

function openings(st, eq, topY, baseY, fh) {
  const fr = FRAME[st.win || 'def'];
  const ic = INNER[st.inner] || '#9ec7de';
  const win = (x, y, w, h) =>
    `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" fill="none" stroke="#444" stroke-width="1"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ic}" stroke="${fr}" stroke-width="4"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe3f5" fill-opacity=".5"/>` +
    `<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${fr}" stroke-width="2"/>`;
  const door = (x, w) => `<rect x="${x}" y="${baseY - 62}" width="${w}" height="62" fill="#6b4a2b" stroke="${st.win === 'pvc' ? '#fbfbfb' : fr}" stroke-width="3"/><circle cx="${x + w - 7}" cy="${baseY - 30}" r="2.5" fill="#e6c15a"/>`;
  let s = '';
  if (eq) {
    if (st.win === 'pano') {
      s += win(205, topY + 16, 180, 44) + win(205, topY + 91, 120, 44) + door(345, 40);
    } else {
      [208, 282, 356].forEach(x => { s += win(x, topY + 16, 36, 44); });
      [208, 356].forEach(x => { s += win(x, topY + 91, 36, 44); });
      s += door(282, 36);
    }
  } else {
    [208, 356].forEach(x => { s += win(x, topY + 22, 36, 40); });
    s += door(282, 36);
    if (fh >= 30) {
      const n = Math.round(fh / 12), dy = fh / n;
      let p = `M410 ${baseY}`;
      for (let k = 1; k <= n; k++) p += ` H${410 + 14 * k} V${baseY + dy * k}`;
      s += `<path d="${p} H410 Z" fill="#a58b66" stroke="#444" stroke-width="2"/>`;
    }
  }
  return s;
}

function roof(st, topY) {
  if (!st.roofMat && !st.shape) return `<polygon points="180,${topY} 300,${topY - 60} 420,${topY}" class="ghost"/>`;
  const sh = st.shape || 'gable', h = st.rh ?? 60, o = st.ro ?? 10;
  const x1 = 190 - o, x2 = 410 + o, w = x2 - x1;
  let pts;
  if (sh === 'hip') pts = `${x1},${topY} ${x1 + w * .2},${topY - h} ${x2 - w * .2},${topY - h} ${x2},${topY}`;
  else if (sh === 'flat') pts = `${x1},${topY} ${x2},${topY} ${x2},${topY - h} ${x1},${topY - h}`;
  else if (sh === 'shed') pts = `${x1},${topY} ${x2},${topY} ${x2},${topY - h * .4} ${x1},${topY - h}`;
  else pts = `${x1},${topY} 300,${topY - h} ${x2},${topY}`;
  const mat = st.roofMat || 'plain', id = 'rc' + (++uid);
  let tex = '';
  if (mat === 'steel' || mat === 'steelL' || mat === 'alu') {
    for (let x = x1; x < x2; x += 11) tex += `<line x1="${x}" y1="${topY - h - 5}" x2="${x}" y2="${topY}" stroke="rgba(0,0,0,.18)"/>`;
  } else if (mat !== 'plain') {
    for (let y = topY - h; y < topY; y += 9) tex += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="rgba(0,0,0,.22)"/>`;
  }
  let s = `<clipPath id="${id}"><polygon points="${pts}"/></clipPath>` +
    `<polygon points="${pts}" fill="${ROOF[mat]}" stroke="#333" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<g clip-path="url(#${id})">${tex}</g>`;
  if (st.heavy) for (let i = 0; i < 30; i++) s += `<circle cx="${x1 + 8 + (i * 37) % (w - 16)}" cy="${topY - 2 - (i * 7) % 7}" r="2" fill="#6a6a64"/>`;
  return s;
}

function extras(st, eq, topY, baseY, G) {
  const ro = st.ro ?? 10, x1 = 190 - ro, x2 = 410 + ro;
  const gutters = () => {
    let s = '';
    [x1, x2].forEach((x, i) => {
      const px = i ? x - 3 : x + 3;
      s += `<rect x="${x - 4}" y="${topY - 2}" width="8" height="5" fill="#6c7a86"/>` +
        `<line x1="${px}" y1="${topY + 3}" x2="${px}" y2="${G}" stroke="#6c7a86" stroke-width="4"/>` +
        `<path d="M${px} ${G} q${i ? 18 : -18} 6 ${i ? 40 : -40} 3" fill="none" stroke="#5aa2d6" stroke-width="2.5"/>`;
    });
    return s;
  };
  switch (st.extra) {
    case 'ties': {
      let s = '<g fill="#e67e22">';
      s += `<rect x="192" y="${topY}" width="5" height="${baseY - topY}"/><rect x="403" y="${topY}" width="5" height="${baseY - topY}"/>`;
      [[190, baseY - 20], [396, baseY - 20], [190, topY], [396, topY], [190, topY + 70], [396, topY + 70]].forEach(([x, y]) => { s += `<rect x="${x}" y="${y}" width="14" height="14" stroke="#333" stroke-width="1.5"/>`; });
      return s + '</g>';
    }
    case 'shear': {
      let s = '<g fill="rgba(44,111,181,.18)" stroke="#2c6fb5" stroke-width="2.5">';
      [[192, topY + 3], [192, topY + 78], [364, topY + 3], [364, topY + 78]].forEach(([x, y]) => {
        s += `<rect x="${x}" y="${y}" width="44" height="${eq ? 70 : 0}"/><line x1="${x}" y1="${y}" x2="${x + 44}" y2="${y + 70}"/><line x1="${x + 44}" y1="${y}" x2="${x}" y2="${y + 70}"/>`;
      });
      return s + '</g>';
    }
    case 'furn':
      return `<rect x="213" y="${topY + 34}" width="20" height="26" fill="#6b4a2b" stroke="#333" stroke-width="1.5"/><line x1="213" y1="${topY + 44}" x2="233" y2="${topY + 44}" stroke="#e67e22" stroke-width="3"/>`;
    case 'open':
      return `<rect x="205" y="${baseY - 66}" width="190" height="66" fill="#2b2b2b" stroke="#111" stroke-width="2"/><rect x="298" y="${baseY - 66}" width="5" height="66" fill="#555"/>`;
    case 'full': {
      let s = gutters();
      if (st.found === 'piles') [196, 237.6, 279.2, 320.8, 362.4, 404].forEach(x => { s += `<rect x="${x - 12}" y="${baseY + 8}" width="24" height="5" fill="#b8c0c6" stroke="#444" stroke-width="1.5"/>`; });
      return s;
    }
    case 'gutter': return gutters();
    case 'chem': return `<line x1="150" y1="${G + 7}" x2="450" y2="${G + 7}" stroke="#7c4dff" stroke-width="3" stroke-dasharray="8 5"/>`;
    case 'mulch': {
      let s = `<ellipse cx="300" cy="${G + 2}" rx="125" ry="9" fill="#6b4a2b"/>`;
      [180, 225, 275, 330, 380, 425].forEach((x, i) => { s += `<circle cx="${x}" cy="${G - 4 - (i % 2) * 5}" r="${12 + (i % 3) * 3}" fill="#2f8a47" stroke="#1f5d30" stroke-width="1.5"/>`; });
      return s;
    }
  }
  return '';
}

function houseInner(st, sc) {
  const G = 330, eq = sc === 'eq', wallH = eq ? 150 : 95;
  const fh = st.foundH ?? (eq ? 18 : 44);
  const baseY = G - fh, topY = baseY - wallH;
  let s = `<g data-p="found">${foundation(st, baseY, G, fh)}</g>`;
  s += `<g data-p="wall">${st.wall ? wallArt(st.wall, 190, topY, 220, wallH, eq ? 2 : 1) : `<rect x="190" y="${topY}" width="220" height="${wallH}" class="ghost"/>`}</g>`;
  if (st.wall) s += `<g data-p="win">${openings(st, eq, topY, baseY, fh)}</g>`;
  s += `<g data-p="roof">${roof(st, topY)}</g>`;
  s += `<g data-p="extra">${extras(st, eq, topY, baseY, G)}</g>`;
  return s;
}

/* ---------- Umgebung ---------- */
const skyGrad = (id, c1, c2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="-500" x2="0" y2="330"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;

function bgEq() {
  const tree = x => `<rect x="${x - 4}" y="292" width="8" height="40" fill="#6b4a2b"/><circle cx="${x}" cy="282" r="30" fill="#f2b8c6"/><circle cx="${x - 18}" cy="296" r="18" fill="#eba3b5"/><circle cx="${x + 18}" cy="294" r="18" fill="#eba3b5"/>`;
  return `<defs>${skyGrad('skyEq', '#bcd9ee', '#f4ead8')}</defs>
    <rect x="-3000" y="-3000" width="6600" height="3330" fill="url(#skyEq)"/>
    <circle cx="500" cy="95" r="26" fill="#e8533f"/>
    <polygon points="-120,330 130,170 380,330" fill="#7e93a8"/>
    <polygon points="130,170 104,200 120,195 135,208 150,196 160,200" fill="#fff"/>
    <polygon points="350,330 470,250 620,330" fill="#8fa3b0"/>
    <rect x="-3000" y="330" width="6600" height="3000" fill="#8a8676"/>
    <rect x="-3000" y="330" width="6600" height="10" fill="#86995f"/>
    ${tree(40)}${tree(560)}
    <path d="M120 345 l25 10 l-12 14 l30 12 M470 350 l-30 12 l16 12 l-24 14" fill="none" stroke="#4a463d" stroke-width="2.5"/>`;
}

function peb() {
  return [[150, 326, 3.5, 0], [162, 328, 3, .12], [135, 329, 2.5, .25], [445, 327, 3.5, .08], [458, 326, 3, .2], [432, 329, 2.5, .3]]
    .map(([x, y, r, d]) => `<circle class="peb" cx="${x}" cy="${y}" r="${r}" fill="#555" style="animation-delay:${d}s"/>`).join('');
}

function bgTr() {
  const palm = (x, h) => {
    const tx = x + 4, ty = 330 - h;
    let s = `<path d="M${x} 330 Q${x + 12} ${330 - h / 2} ${tx} ${ty}" fill="none" stroke="#6b4a2b" stroke-width="8"/>`;
    [[-30, 0, -20], [30, 0, 20], [-22, -12, -50], [22, -12, 50], [0, -16, 0]].forEach(([dx, dy, a]) => {
      s += `<ellipse cx="${tx + dx}" cy="${ty + dy}" rx="34" ry="7" transform="rotate(${a} ${tx + dx} ${ty + dy})" fill="#2f8a47"/>`;
    });
    return s;
  };
  const hills = [[70, 260, 130], [560, 280, 120], [-400, 400, 140], [1000, 400, 140]]
    .map(([cx, rx, ry]) => `<ellipse cx="${cx}" cy="345" rx="${rx}" ry="${ry}" fill="#2d5a3a"/>`).join('');
  const clouds = [[100, 20, 130], [330, 5, 150], [540, 30, 120], [-300, 15, 200], [900, 15, 200]]
    .map(([cx, cy, rx]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="30" fill="#5b716f"/>`).join('');
  return `<defs>${skyGrad('skyTr', '#6e8785', '#a9bfbc')}</defs>
    <rect x="-3000" y="-3000" width="6600" height="3330" fill="url(#skyTr)"/>
    ${clouds}${hills}
    <rect x="-3000" y="330" width="6600" height="3000" fill="#486b38"/>
    <ellipse cx="300" cy="336" rx="175" ry="9" fill="#6a5a3a"/>
    <ellipse cx="110" cy="352" rx="40" ry="6" fill="#7fa1b3"/><ellipse cx="480" cy="358" rx="50" ry="7" fill="#7fa1b3"/>
    ${palm(60, 150)}${palm(545, 135)}
    <circle cx="135" cy="326" r="18" fill="#2f7a3e"/><circle cx="470" cy="326" r="20" fill="#2f7a3e"/><circle cx="105" cy="330" r="14" fill="#256a33"/>`;
}

function rain() {
  let s = '<g>', r = 7;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) {
    const x = -900 + rnd() * 2400, y = rnd() * 330, d = .55 + rnd() * .5, dl = -rnd() * 1.2;
    s += `<line class="drop" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 5).toFixed(0)}" y2="${(y + 20).toFixed(0)}" style="animation-duration:${d.toFixed(2)}s;animation-delay:${dl.toFixed(2)}s"/>`;
  }
  return s + '</g>';
}

function sceneSVG(sc, st, vb = '70 60 460 340') {
  const bg = sc === 'eq' ? bgEq() : bgTr();
  const fg = sc === 'eq' ? peb() : rain();
  return `<svg class="scene" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">${bg}<g id="house" class="${sc === 'eq' ? 'shake' : ''}">${houseInner(st, sc)}</g>${fg}</svg>`;
}

/* ============================================================
   ABLAUF
   ============================================================ */
const S = { page: 0, sc: null, picks: {}, first: {}, saved: false };
const app = document.getElementById('app');
const cur = () => SC[S.sc];

function stateNow() {
  const st = {};
  cur().steps.forEach((step, i) => step.groups.forEach((g, gi) => {
    const p = S.picks[`${i}-${gi}`];
    if (p !== undefined) Object.assign(st, g.opts[p].set);
  }));
  return st;
}

function topbar() {
  const crumbs = PAGES.map((n, i) => `<span class="crumb ${i < S.page ? 'done' : ''} ${i === S.page ? 'now' : ''}">${n}</span>`).join('');
  const quake = S.sc === 'eq' && S.page >= 3 ? '<button class="btn sm" id="quake">Erdbeben simulieren</button>' : '';
  return `<div class="topbar"><span class="brand">Haus-Check</span><div class="crumbs">${crumbs}</div>${quake}</div>`;
}

function quake() {
  const btn = document.getElementById('quake');
  if (btn) btn.disabled = true;
  document.querySelectorAll('svg.scene').forEach(s => s.classList.add('quake'));
  Meister.onQuake();
  setTimeout(() => {
    document.querySelectorAll('svg.scene').forEach(s => s.classList.remove('quake'));
    const b = document.getElementById('quake');
    if (b) b.disabled = false;
  }, 4000);
}

const go = p => { S.page = p; render(); window.scrollTo(0, 0); Meister.onPage(p, S.sc, S.pct); };

function render() {
  const p = S.page;
  if (p === 0) {
    app.innerHTML = `<section class="page"><div class="start"><h1>Kannst du das perfekte Haus bauen?</h1><button class="btn big" data-go="1">Let's Go</button></div></section>`;
  } else if (p === 1) {
    const card = k => `<button class="card" data-sc="${k}"><div class="cardimg">${sceneSVG(k, SC[k].sketch)}</div><div class="cardtitle">${SC[k].title}</div></button>`;
    app.innerHTML = `<section class="page">${topbar()}<div class="pagehead"><h2>Wähle dein Szenario</h2><p>Unter welchen Extrembedingungen soll dein Haus bestehen?</p></div>
      <div class="cards">${card('eq')}${card('tr')}<div class="card empty"></div></div></section>`;
  } else if (p === 2) {
    const c = cur();
    app.innerHTML = `<section class="page">${topbar()}<div class="descbody">${sceneSVG(S.sc, c.sketch)}
      <div class="desccard"><span class="kicker">Szenario</span><h2>${c.title}</h2>
      <ul>${c.facts.map(f => `<li>${f}</li>`).join('')}</ul><p class="goal">${c.goal}</p>
      <div style="display:flex;justify-content:space-between"><button class="btn ghost" data-go="1">Zurück</button><button class="btn" data-go="3">Bauen beginnen</button></div></div></div></section>`;
  } else if (p >= 3 && p <= 6) {
    renderStep(p - 3);
  } else {
    renderOverview();
  }
}

function renderStep(i) {
  const c = cur(), step = c.steps[i];
  const groups = step.groups.map((g, gi) => `<h3>${g.label}</h3>` + g.opts.map((op, oi) =>
    `<button class="opt ${S.picks[`${i}-${gi}`] === oi ? 'sel' : ''}" data-g="${gi}" data-o="${oi}"><span class="radio"></span><span><b>${op.label}</b><small>${op.info}</small></span></button>`).join('')).join('');
  const last = i === c.steps.length - 1;
  app.innerHTML = `<section class="page">${topbar()}<div class="split">
    <div class="menu"><span class="kicker">Schritt ${i + 1} von ${c.steps.length}</span><h2>${step.q}</h2>${groups}
      <div class="navrow"><button class="btn ghost" data-go="${S.page - 1}">Zurück</button><button class="btn" id="next" data-go="${S.page + 1}">${last ? 'Zur Übersicht' : 'Weiter'}</button></div></div>
    <div class="stage"><div class="stagecap">${c.title}</div>${sceneSVG(S.sc, stateNow())}</div></div></section>`;
  updateNext();
}

function stepDone(i) { return cur().steps[i].groups.every((_, gi) => S.picks[`${i}-${gi}`] !== undefined); }
function updateNext() { const n = document.getElementById('next'); if (n) n.disabled = !stepDone(S.page - 3); }

function pick(gi, oi) {
  const i = S.page - 3, key = `${i}-${gi}`, g = cur().steps[i].groups[gi];
  if (S.first[key] === undefined) S.first[key] = oi;
  S.picks[key] = oi;
  document.querySelectorAll(`.opt[data-g="${gi}"]`).forEach(b => b.classList.toggle('sel', +b.dataset.o === oi));
  document.getElementById('house').innerHTML = houseInner(stateNow(), S.sc);
  const part = document.querySelector(`#house [data-p="${g.part}"]`);
  if (part) part.classList.add('pop');
  Meister.onPick(g.opts[oi]);
  updateNext();
}

function renderOverview() {
  const c = cur();
  let score = 0, max = 0, firstScore = 0, rows = '', callouts = '';
  const occ = {};
  c.steps.forEach((step, i) => step.groups.forEach((g, gi) => {
    const key = `${i}-${gi}`, op = g.opts[S.picks[key]];
    score += op.r; max += 2; firstScore += g.opts[S.first[key]].r;
    const best = g.opts.filter(x => x.r === 2).map(x => x.label).join(' oder ');
    rows += `<div class="row r${op.r}"><div class="rowtop"><span class="rowstep">${step.name} · ${g.label}</span><span class="chip c${op.r}">${CHIP[op.r]}</span></div>
      <b>${op.label}</b><p>${op.why}</p>${op.r < 2 ? `<p class="better">Optimal gewesen: ${best}</p>` : ''}</div>`;
    const k = occ[g.part] = (occ[g.part] ?? -1) + 1;
    const a = ANCHOR[g.part][k];
    const alts = g.opts.map(x => `<li class="a${x.r}${x === op ? ' sel' : ''}"><span>${x === op ? '➜ ' : ''}${x.label}</span><span class="t">${CHIP_SHORT[x.r]}</span></li>`).join('');
    callouts += `<div class="callout r${op.r}" data-a="${a.join(',')}"><div class="rowtop"><span class="rowstep">${step.name} · ${g.label}</span><span class="chip c${op.r}">${CHIP[op.r]}</span></div>
      <b>${op.label}</b><ul class="alts">${alts}</ul></div>`;
  }));
  const pct = S.pct = score / max;
  const verdict = pct >= .9 ? 'Meisterbauer!' : pct >= .65 ? 'Solide Planung' : pct >= .4 ? 'Noch Luft nach oben' : 'Das Haus hätte es schwer';
  const firstRight = c.steps.reduce((n, step, i) => n + step.groups.filter((g, gi) => g.opts[S.first[`${i}-${gi}`]].r === 2).length, 0);
  const total = c.steps.reduce((n, s) => n + s.groups.length, 0);
  if (!S.saved) {
    S.saved = true;
    try {
      const k = 'hausbau-results', arr = JSON.parse(localStorage.getItem(k) || '[]');
      arr.push({ t: new Date().toISOString(), scenario: S.sc, score, max, firstScore, picks: S.picks, first: S.first });
      localStorage.setItem(k, JSON.stringify(arr));
    } catch (e) { /* Speichern ist optional */ }
  }
  const vorbild = `<div class="info"><h4>So sieht das Vorbild-Haus aus</h4>${c.vorbild.map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join('')}</div>
    <div class="info"><h4>Gut zu wissen</h4><ul>${c.tips.map(t => `<li>${t}</li>`).join('')}</ul><p style="margin:10px 0 0"><i>${c.hint}</i></p></div>`;
  app.innerHTML = `<section class="page">${topbar()}<div class="split">
    <div class="menu"><span class="kicker">Deine Entscheidungen</span><h2>${verdict}</h2>${rows}${vorbild}
      <div class="navrow"><button class="btn ghost" data-go="6">Zurück</button><button class="btn" id="again">Nochmal bauen</button></div></div>
    <div class="stage ov"><div class="ovin"><div class="stagecap">${c.title}</div>
      <div class="score"><div class="big">${score} / ${max}</div><div class="sub">Punkte · beim ersten Klick optimal: ${firstRight} von ${total}</div></div>
      ${sceneSVG(S.sc, stateNow(), '-60 60 720 340')}
      <svg class="leaders"></svg>${callouts}</div></div></div></section>`;
  layoutCallouts();
}

/* Anker je Bauteil: [Bauteil im Haus, x-Anteil, y-Anteil, Seite] – bei mehreren Gruppen je Bauteil in Reihenfolge */
const ANCHOR = {
  found: [['found', .12, .5, 'L']],
  wall: [['wall', .06, .5, 'L']],
  win: [['wall', .62, .55, 'L'], ['wall', .84, .3, 'R']],
  roof: [['roof', .78, .7, 'R'], ['roof', .5, .35, 'R']],
  extra: [['extra', .5, .5, 'R']],
};
const RC = ['var(--bad)', 'var(--mid)', 'var(--good)'];

function layoutCallouts() {
  const ov = document.querySelector('.ovin');
  if (!ov) return;
  const svg = ov.querySelector('.leaders'), boxes = [...ov.querySelectorAll('.callout')];
  svg.innerHTML = '';
  if (innerWidth <= 860) return;
  const R = ov.getBoundingClientRect(), W = R.width, H = R.height;
  const rel = el => { const r = el.getBoundingClientRect(); return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height }; };
  const house = rel(ov.querySelector('#house'));
  const part = p => {
    const el = ov.querySelector(p === 'wall' ? '#house [data-p="wall"]' : `#house [data-p="${p}"]`);
    const r = el && rel(el);
    return r && r.w ? r : house;
  };
  const bw = Math.max(210, Math.min(300, (W - house.w) / 2 - 30));
  const side = { L: [], R: [] };
  boxes.forEach(b => {
    const [p, fx, fy, sd] = b.dataset.a.split(',');
    const r = part(p);
    b.style.width = bw + 'px';
    side[sd].push({ b, ax: r.x + r.w * fx, ay: r.y + r.h * fy, h: b.offsetHeight, rating: +b.className.match(/r(\d)/)[1] });
  });
  const top = 76, bottom = H - 12;
  let lines = '';
  for (const sd of ['L', 'R']) {
    const list = side[sd].sort((a, b) => a.ay - b.ay);
    let y = top;
    list.forEach(it => { it.y = Math.max(it.ay - it.h / 2, y); y = it.y + it.h + 10; });
    let lim = bottom;
    for (let i = list.length - 1; i >= 0; i--) { list[i].y = Math.min(list[i].y, lim - list[i].h); lim = list[i].y - 10; }
    list.forEach(it => {
      const x = sd === 'L' ? 14 : W - 14 - bw, ex = sd === 'L' ? x + bw : x, ey = it.y + it.h / 2;
      it.b.style.left = x + 'px';
      it.b.style.top = Math.max(it.y, 8) + 'px';
      const col = RC[it.rating];
      lines += `<line x1="${it.ax}" y1="${it.ay}" x2="${ex}" y2="${ey}" style="stroke:${col}" stroke-width="2.5"/><circle cx="${it.ax}" cy="${it.ay}" r="5.5" style="fill:${col}" stroke="#fff" stroke-width="2"/>`;
    });
  }
  svg.innerHTML = lines;
}
window.addEventListener('resize', layoutCallouts);

app.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t || t.disabled) return;
  if (t.dataset.sc) { S.sc = t.dataset.sc; S.picks = {}; S.first = {}; S.saved = false; go(2); }
  else if (t.id === 'quake') quake();
  else if (t.classList.contains('opt')) pick(+t.dataset.g, +t.dataset.o);
  else if (t.id === 'again') { S.picks = {}; S.first = {}; S.saved = false; go(1); }
  else if (t.dataset.go) go(+t.dataset.go);
});

render();
