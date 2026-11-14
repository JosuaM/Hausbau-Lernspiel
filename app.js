// Prototyp: Start -> Szenario -> Challenge -> 4 Fragen -> Ergebnis -> Simulation
// Die Szene ist an der Ecke unten rechts verankert und läuft diagonal nach unten links aus.
const BUILD_SKY = `
  <circle class="st-glow" cx="104" cy="126" r="72" fill="#ffe08a" opacity=".35"/>
  <circle cx="104" cy="126" r="46" fill="#ffd55e"/>
  <g class="rv-cloud" fill="#cfeaf4">
    <circle cx="20" cy="80" r="24"/><circle cx="54" cy="66" r="32"/><circle cx="92" cy="82" r="22"/>
    <rect x="-2" y="80" width="114" height="24" rx="12"/>
  </g>
  <g class="rv-cloud rv-cloud-b" fill="#dff1f7">
    <circle cx="20" cy="36" r="16"/><circle cx="44" cy="26" r="22"/><circle cx="70" cy="38" r="14"/>
    <rect x="6" y="36" width="76" height="16" rx="8"/>
  </g>

`;

const BUILD_ART = `
<svg class="art" viewBox="0 0 1440 900" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
  <defs>
    <pattern id="st-bricks" width="32" height="20" patternUnits="userSpaceOnUse" y="10">
      <rect width="32" height="20" fill="#e8734c"/>
      <path fill="none" stroke="#f7b597" stroke-width="2" d="M0 0H32M0 10H32M16 0V10M0 10V20M32 10V20"/>
    </pattern>
    <path id="st-leaf" d="M0 0Q16-13 38 1Q16-4 0 0Z"/>
    <g id="st-worker">
      <ellipse cy="2" rx="18" ry="4" fill="#1d3b3a" opacity=".2"/>
      <rect x="-11" y="-14" width="8" height="14" rx="3" fill="#2f4a66"/>
      <rect x="3" y="-14" width="8" height="14" rx="3" fill="#2f4a66"/>
      <rect x="-14" y="-46" width="28" height="38" rx="12"/>
      <circle cy="-58" r="15" fill="#b87a50"/>
      <circle cx="-5" cy="-57" r="2.2" fill="#2b2430"/>
      <circle cx="5" cy="-57" r="2.2" fill="#2b2430"/>
      <path fill="none" stroke="#2b2430" stroke-width="1.8" stroke-linecap="round" d="M-4-51Q0-47.5 4-51"/>
      <path fill="#ffd23f" d="M-16-62A16 16 0 0 1 16-62Z"/>
      <rect x="-19" y="-64" width="38" height="5" rx="2.5" fill="#f5b81f"/>
    </g>
  </defs>

  <!-- Gelände: von oben rechts diagonal nach unten links -->
  <path fill="#bfe9cd" d="M620 900C720 720 900 560 1090 556S1340 520 1440 548V900Z"/>
  <path fill="#4cba74" d="M36 900C200 884 380 850 540 770S760 622 900 604S1300 596 1440 612V900Z"/>
  <path fill="#3aa363" d="M330 900C540 884 760 800 1000 772S1300 740 1440 724V900Z"/>

  <g transform="translate(800 40)">
  ${BUILD_SKY}
  <!-- Palme neben dem Gerüst -->
  <g transform="translate(54 574) scale(2)">
    <g class="rv-sway">
      <path fill="none" stroke="#8a5f3b" stroke-width="4.5" stroke-linecap="round" d="M0 0Q-3-30 6-58"/>
      <g fill="#249a63" transform="translate(6 -58)">
        <use href="#st-leaf" transform="rotate(-165)"/>
        <use href="#st-leaf" transform="rotate(-120) scale(.9)"/>
        <use href="#st-leaf" transform="rotate(-65) scale(.9)"/>
        <use href="#st-leaf" transform="rotate(-20)"/>
        <use href="#st-leaf" transform="rotate(25) scale(.85)"/>
        <use href="#st-leaf" transform="rotate(155) scale(.85)"/>
      </g>
    </g>
  </g>
  <ellipse cx="320" cy="578" rx="226" ry="24" fill="#cd9c66"/>

  <!-- Kran -->
  <g fill="none" stroke="#ffb51f" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M556 122V592M592 122V592"/>
    <path stroke-width="4" d="M556 150L592 186L556 222L592 258L556 294L592 330L556 366L592 402L556 438L592 474L556 510L592 546L556 582"/>
    <path d="M232 104H632M250 122H632"/>
    <path stroke-width="4" d="M250 122L272 104L294 122L316 104L338 122L360 104L382 122L404 104L426 122L448 104L470 122L492 104L514 122L536 104L558 122L580 104L602 122L624 104"/>
    <path stroke="#e89a10" stroke-width="3.5" d="M574 104V58M574 58L250 104M574 58L632 104"/>
  </g>
  <rect x="604" y="122" width="34" height="34" rx="5" fill="#5c7186"/>
  <rect x="540" y="124" width="46" height="36" rx="7" fill="#ff8a2a"/>
  <rect x="546" y="130" width="24" height="18" rx="4" fill="#bdeefc"/>
  <rect x="534" y="586" width="80" height="14" rx="4" fill="#5c7186"/>
  <rect class="st-trolley" x="326" y="118" width="28" height="9" rx="3" fill="#5c7186"/>

  <!-- Vogel auf dem Kran -->
  <g class="st-bird">
    <ellipse cx="452" cy="88" rx="15" ry="13" fill="#ff6f61"/>
    <path fill="#e9544a" d="M442 88Q452 84 460 94Q448 100 442 88Z"/>
    <circle cx="460" cy="84" r="2.2" fill="#2b2430"/>
    <path fill="#ffc233" d="M466 84L476 87L466 91Z"/>
  </g>

  <!-- Hängende Ziegel -->
  <g class="st-swing">
    <path fill="none" stroke="#3c4d5e" stroke-width="3" d="M340 125V204M340 204L304 228M340 204L376 228"/>
    <circle cx="340" cy="204" r="5" fill="#3c4d5e"/>
    <rect x="298" y="226" width="84" height="30" rx="4" fill="url(#st-bricks)"/>
    <rect x="294" y="255" width="92" height="6" rx="2" fill="#a86f3b"/>
  </g>

  <!-- Rohbau -->
  <path fill="url(#st-bricks)" d="M190 572V392H272V422H320V452H368V482H452V572Z"/>
  <path fill="#6d3a2a" d="M290 572V512A25 25 0 0 1 340 512V572Z"/>
  <rect x="212" y="432" width="42" height="42" rx="5" fill="#a9e7f5"/>
  <path stroke="#d99a55" stroke-width="4" d="M233 432V474M212 453H254"/>
  <rect x="384" y="508" width="40" height="38" rx="5" fill="#6d3a2a"/>
  <path fill="#f05a3c" d="M176 386L248 328V386Z"/>
  <path stroke="#c9432a" stroke-width="3" d="M196 386V370M222 386V349"/>
  <g fill="#d99a55">
    <rect x="360" y="386" width="10" height="68" rx="2"/>
    <rect x="442" y="386" width="10" height="98" rx="2"/>
  </g>
  <rect x="166" y="381" width="308" height="11" rx="3" fill="#c98846"/>
  <path fill="none" stroke="#d99a55" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" d="M172 386L320 270L468 386M320 270V386M248 328L320 386L392 328"/>

  <!-- Gerüst -->
  <g fill="none" stroke="#5c7186" stroke-width="6" stroke-linecap="round">
    <path d="M112 356V584M178 356V584"/>
    <path stroke-width="4" d="M112 580L178 478M178 580L112 478"/>
  </g>
  <rect x="96" y="466" width="96" height="10" rx="3" fill="#c98846"/>

  <!-- Bauarbeiter: hämmert am Gerüst -->
  <g transform="translate(146 466)">
    <use href="#st-worker" fill="#ff8a2a"/>
    <g class="st-hammer">
      <path fill="none" stroke="#b87a50" stroke-width="7" stroke-linecap="round" d="M8-36L27-40"/>
      <path stroke="#7a4d2c" stroke-width="4" stroke-linecap="round" d="M27-40L35-56"/>
      <rect x="26" y="-66" width="20" height="11" rx="3" fill="#47586a" transform="rotate(25 36 -60)"/>
    </g>
  </g>

  <!-- Bauarbeiterin: setzt einen Ziegel auf die Mauer -->
  <g transform="translate(406 482)">
    <use href="#st-worker" fill="#2f9fd6"/>
    <g class="st-place">
      <path fill="none" stroke="#b87a50" stroke-width="7" stroke-linecap="round" d="M-8-34L-20-30M8-34L-8-26"/>
      <rect x="-40" y="-36" width="26" height="13" rx="2" fill="#e8734c" stroke="#f7b597" stroke-width="1.5"/>
    </g>
  </g>

  <!-- Bauarbeiter: winkt vom Boden -->
  <g transform="translate(496 618)">
    <use href="#st-worker" fill="#7c5cd6"/>
    <path fill="none" stroke="#b87a50" stroke-width="7" stroke-linecap="round" d="M-10-34L-20-20"/>
    <g class="st-wave">
      <path fill="none" stroke="#b87a50" stroke-width="7" stroke-linecap="round" d="M10-36L25-58"/>
    </g>
  </g>

  <!-- Ziegelstapel und Eimer -->
  <g fill="#e8734c" stroke="#f7b597" stroke-width="1.5">
    <rect x="212" y="628" width="34" height="15" rx="2"/><rect x="248" y="628" width="34" height="15" rx="2"/>
    <rect x="284" y="628" width="34" height="15" rx="2"/><rect x="230" y="613" width="34" height="15" rx="2"/>
    <rect x="266" y="613" width="34" height="15" rx="2"/><rect x="248" y="598" width="34" height="15" rx="2"/>
  </g>
  <path fill="#5c7186" d="M352 616H392L386 646H358Z"/>
  <path fill="none" stroke="#3c4d5e" stroke-width="3" d="M354 616Q372 594 390 616"/>
  </g>

  <!-- Unten links: Material, Pflanzen und ein Arbeiter mit Schubkarre -->
  <g transform="translate(546 772) scale(1.7)">
    <g class="rv-sway rv-sway-b">
      <path fill="none" stroke="#8a5f3b" stroke-width="4.5" stroke-linecap="round" d="M0 0Q-3-30 6-58"/>
      <g fill="#249a63" transform="translate(6 -58)">
        <use href="#st-leaf" transform="rotate(-165)"/>
        <use href="#st-leaf" transform="rotate(-120) scale(.9)"/>
        <use href="#st-leaf" transform="rotate(-65) scale(.9)"/>
        <use href="#st-leaf" transform="rotate(-20)"/>
        <use href="#st-leaf" transform="rotate(25) scale(.85)"/>
        <use href="#st-leaf" transform="rotate(155) scale(.85)"/>
      </g>
    </g>
  </g>
  <g fill="#2f9a5e">
    <circle cx="186" cy="872" r="16"/><circle cx="208" cy="864" r="21"/><circle cx="232" cy="874" r="14"/>
  </g>
  <g fill="#c98846">
    <rect x="340" y="826" width="120" height="11" rx="5"/>
    <rect x="350" y="837" width="120" height="11" rx="5"/>
    <rect x="334" y="848" width="120" height="11" rx="5"/>
  </g>
  <g fill="#ffb51f">
    <path d="M286 868L298 832H304L316 868Z"/>
    <rect x="278" y="866" width="46" height="7" rx="3"/>
  </g>
  <path fill="#fff" fill-opacity=".85" d="M294 850H308L305.500 841H296.500Z"/>
  <g fill="none" stroke="#2f8a54" stroke-width="3" stroke-linecap="round">
    <path d="M110 892Q104 882 100 874M110 892V870M110 892Q116 882 120 874"/>
    <path d="M500 856Q494 846 490 838M500 856V834M500 856Q506 846 510 838"/>
    <path d="M660 800Q654 790 650 782M660 800V778M660 800Q666 790 670 782"/>
  </g>

  <g transform="translate(760 770)"><g class="st-cart">
    <circle cx="-74" cy="-10" r="11" fill="#3c4d5e"/>
    <circle cx="-74" cy="-10" r="4" fill="#cfd8df"/>
    <path fill="#5c7186" d="M-104-44H-44L-58-16H-90Z"/>
    <rect x="-98" y="-58" width="20" height="13" rx="2" fill="#e8734c" stroke="#f7b597" stroke-width="1.5"/>
    <rect x="-74" y="-58" width="20" height="13" rx="2" fill="#e8734c" stroke="#f7b597" stroke-width="1.5"/>
    <path fill="none" stroke="#3c4d5e" stroke-width="5" stroke-linecap="round" d="M-46-40L-16-34"/>
    <use href="#st-worker" fill="#ff8a2a"/>
    <path fill="none" stroke="#b87a50" stroke-width="7" stroke-linecap="round" d="M-8-34L-18-34"/>
  </g></g>
</svg>`;

const FLOOD_ART = `
<svg class="art" viewBox="0 0 560 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34506b"/>
      <stop offset=".42" stop-color="#6d8ea6"/>
      <stop offset=".66" stop-color="#cbd8d4"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f7f9e"/>
      <stop offset="1" stop-color="#1c5573"/>
    </linearGradient>
    <pattern id="drops" width="120" height="120" patternUnits="userSpaceOnUse">
      <g stroke="#fff" stroke-width="1.6" stroke-linecap="round">
        <path d="M18 6l-6 24M78 22l-6 24M46 58l-6 24M108 70l-6 24M24 92l-6 24"/>
      </g>
    </pattern>
    <path id="leaf" d="M0 0Q34-26 78 2Q34-8 0 0Z"/>
  </defs>

  <rect width="560" height="760" fill="url(#sky)"/>

  <!-- Wolken -->
  <g fill="#2a4259">
    <circle cx="60" cy="150" r="72"/><circle cx="170" cy="120" r="88"/><circle cx="300" cy="136" r="78"/>
    <circle cx="420" cy="112" r="92"/><circle cx="530" cy="150" r="70"/><rect width="560" height="130"/>
  </g>
  <g fill="#3d5a75" opacity=".8">
    <circle cx="110" cy="226" r="34"/><circle cx="165" cy="214" r="42"/><circle cx="225" cy="230" r="28"/>
    <rect x="84" y="226" width="166" height="26" rx="13"/>
    <circle cx="400" cy="262" r="26"/><circle cx="445" cy="250" r="34"/><circle cx="492" cy="266" r="22"/>
    <rect x="378" y="262" width="136" height="20" rx="10"/>
  </g>

  <!-- Ferne Uferlinie -->
  <g fill="#7fa090">
    <ellipse cx="40" cy="470" rx="56" ry="24"/><ellipse cx="130" cy="474" rx="48" ry="18"/>
    <ellipse cx="450" cy="470" rx="62" ry="24"/><ellipse cx="530" cy="474" rx="46" ry="20"/>
  </g>
  <path fill="#90ad9b" d="M0 480C80 468 160 480 240 476S420 466 560 480V510H0Z"/>
  <rect y="496" width="560" height="264" fill="#74a9bd"/>

  <!-- Erdhügel -->
  <path fill="#8f6b49" d="M50 650C120 620 140 526 190 520H370C420 526 450 620 520 650Z"/>
  <path fill="#7c9a55" d="M164 534C174 524 182 520 190 520H370C378 520 386 524 396 534Z"/>

  <!-- Bambus -->
  <g fill="none" stroke="#57824f" stroke-width="5" stroke-linecap="round">
    <path d="M120 590Q116 490 100 400"/><path d="M134 586Q134 480 130 370"/><path d="M148 570Q150 490 158 412"/>
  </g>
  <g fill="#6c9a5c">
    <use href="#leaf" transform="translate(100 400) rotate(-150) scale(.62)"/>
    <use href="#leaf" transform="translate(101 412) rotate(-30) scale(.5)"/>
    <use href="#leaf" transform="translate(130 370) rotate(-120) scale(.62)"/>
    <use href="#leaf" transform="translate(130 372) rotate(-40) scale(.62)"/>
    <use href="#leaf" transform="translate(132 420) rotate(-170) scale(.5)"/>
    <use href="#leaf" transform="translate(158 412) rotate(-60) scale(.6)"/>
    <use href="#leaf" transform="translate(156 440) rotate(-10) scale(.45)"/>
  </g>

  <!-- Palme -->
  <path fill="none" stroke="#6d5236" stroke-width="9" stroke-linecap="round" d="M428 560Q424 460 442 372"/>
  <g fill="#4f8350" transform="translate(442 372)">
    <use href="#leaf" transform="rotate(-165) scale(1.05)"/>
    <use href="#leaf" transform="rotate(-125)"/>
    <use href="#leaf" transform="rotate(-70)"/>
    <use href="#leaf" transform="rotate(-20) scale(1.05)"/>
    <use href="#leaf" transform="rotate(25) scale(.95)"/>
    <use href="#leaf" transform="rotate(150) scale(.95)"/>
  </g>

  <!-- Haus -->
  <rect x="178" y="508" width="204" height="14" rx="2" fill="#a98563"/>
  <rect x="192" y="424" width="176" height="86" fill="#dcbd8c"/>
  <path stroke="#c7a673" stroke-width="2" d="M192 440H368M192 456H368M192 472H368M192 488H368"/>
  <rect x="258" y="450" width="44" height="60" fill="#4b3526"/>
  <rect x="210" y="448" width="32" height="30" fill="#4b3526"/>
  <rect x="318" y="448" width="32" height="30" fill="#4b3526"/>
  <path fill="#c1553a" d="M170 430L214 350H346L390 430Z"/>
  <path stroke="#a24530" stroke-width="3" d="M214 350L196 430M238 350L228 430M262 350L260 430M298 350L300 430M322 350L332 430M346 350L364 430"/>
  <path stroke="#8e3a28" stroke-width="5" stroke-linecap="round" d="M170 430H390"/>

  <!-- Regen -->
  <rect class="art-rain" x="-40" y="-520" width="760" height="1300" fill="url(#drops)" opacity=".38"/>

  <!-- Steigendes Wasser mit Boot -->
  <g class="art-rise">
    <path class="art-wave" fill="#4d93ad" d="M-160 566q40-12 80 0t80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0V800H-160Z"/>
    <g class="art-boat">
      <path fill="#c9a36a" d="M424 604C424 572 482 570 484 602Z"/>
      <path fill="#3d2a20" d="M386 590C420 608 482 608 518 584C506 628 404 634 386 590Z"/>
    </g>
    <path class="art-wave art-wave-front" fill="url(#water)" d="M-160 618q40-12 80 0t80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0V800H-160Z"/>
    <path fill="none" stroke="#9fd0df" stroke-width="3" stroke-linecap="round" opacity=".55" d="M50 668h60M210 700h86M400 676h50M90 734h50M340 742h70"/>
  </g>
</svg>`;

const WILDFIRE_KG_ART = `
<svg class="art" viewBox="0 0 560 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="wf-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a4a33"/>
      <stop offset=".34" stop-color="#c0623a"/>
      <stop offset=".58" stop-color="#ec7f3f"/>
      <stop offset=".78" stop-color="#ffb054"/>
      <stop offset="1" stop-color="#ffe08a"/>
    </linearGradient>
    <radialGradient id="wf-halo">
      <stop offset="0" stop-color="#ffe08a" stop-opacity=".95"/>
      <stop offset=".55" stop-color="#ff9a3c" stop-opacity=".45"/>
      <stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/>
    </radialGradient>
    <path id="wf-flame-shape" d="M0 0C-42 0-58-36-42-74C-32-98-14-112-6-152C14-130 18-108 32-94C54-70 50 0 0 0Z"/>
    <g id="wf-fire">
      <use href="#wf-flame-shape" fill="#e8391f"/>
      <use href="#wf-flame-shape" fill="#ff8a1f" transform="scale(.72)"/>
      <use href="#wf-flame-shape" fill="#ffd84a" transform="scale(.42)"/>
    </g>
    <g id="wf-gum">
      <path fill="none" stroke-width="7" stroke-linecap="round" d="M0 0Q-5-58 4-118M0-50L-26-82M2-74L28-104"/>
      <circle cx="-30" cy="-98" r="24"/><circle cx="-8" cy="-126" r="30"/><circle cx="26" cy="-136" r="26"/><circle cx="36" cy="-108" r="22"/>
    </g>
  </defs>

  <rect width="560" height="760" fill="url(#wf-sky)"/>
  <ellipse class="wf-glow" cx="280" cy="520" rx="360" ry="290" fill="url(#wf-halo)"/>

  <!-- Rauchschwaden -->
  <g class="wf-smoke" fill="#6a4238">
    <circle cx="40" cy="120" r="92"/><circle cx="170" cy="92" r="112"/><circle cx="320" cy="116" r="100"/>
    <circle cx="470" cy="88" r="118"/><circle cx="570" cy="130" r="80"/><rect x="-40" width="660" height="120"/>
  </g>
  <g class="wf-smoke wf-smoke-b" fill="#8a5a4a">
    <circle cx="-6" cy="232" r="52"/><circle cx="84" cy="216" r="68"/><circle cx="178" cy="240" r="46"/>
    <circle cx="388" cy="246" r="44"/><circle cx="474" cy="224" r="66"/><circle cx="564" cy="240" r="50"/>
  </g>
  <g class="wf-smoke" fill="#b57a5e" opacity=".75">
    <circle cx="60" cy="300" r="30"/><circle cx="112" cy="288" r="40"/><circle cx="166" cy="306" r="24"/>
    <circle cx="430" cy="316" r="26"/><circle cx="482" cy="300" r="38"/><circle cx="530" cy="318" r="24"/>
  </g>

  <path fill="#a8512f" d="M0 500C90 462 190 488 300 470S480 452 560 482V760H0Z"/>
  <use href="#wf-gum" transform="translate(150 492) scale(.72)" fill="#84391f" stroke="#84391f"/>
  <use href="#wf-gum" transform="translate(412 476) scale(.8)" fill="#84391f" stroke="#84391f"/>

  <!-- Feuerwand -->
  <g transform="translate(-6 584) scale(1.25)"><use class="wf-flame" href="#wf-fire"/></g>
  <g transform="translate(72 590) scale(1.55)"><use class="wf-flame wf-flame-b" href="#wf-fire"/></g>
  <g transform="translate(160 596) scale(1.2)"><use class="wf-flame wf-flame-c" href="#wf-fire"/></g>
  <g transform="translate(244 590) scale(1.45)"><use class="wf-flame" href="#wf-fire"/></g>
  <g transform="translate(332 596) scale(1.2)"><use class="wf-flame wf-flame-b" href="#wf-fire"/></g>
  <g transform="translate(414 590) scale(1.6)"><use class="wf-flame wf-flame-c" href="#wf-fire"/></g>
  <g transform="translate(508 588) scale(1.3)"><use class="wf-flame" href="#wf-fire"/></g>
  <g transform="translate(572 590) scale(1.1)"><use class="wf-flame wf-flame-b" href="#wf-fire"/></g>

  <path fill="#6a3722" d="M0 596C120 566 200 586 300 576S480 562 560 586V760H0Z"/>
  <use href="#wf-gum" transform="translate(58 600) scale(1.5)" fill="#40200f" stroke="#40200f"/>
  <use href="#wf-gum" transform="translate(506 590) scale(1.4)" fill="#40200f" stroke="#40200f"/>

  <!-- Haus mit Regenwassertank -->
  <path fill="#55301c" d="M96 686C170 626 390 626 464 686Z"/>
  <rect x="384" y="590" width="46" height="58" rx="5" fill="#76828f"/>
  <path stroke="#5d6975" stroke-width="2" d="M392 590V648M402 590V648M412 590V648M422 590V648"/>
  <ellipse cx="407" cy="590" rx="23" ry="6" fill="#a0acb7"/>
  <rect x="190" y="572" width="180" height="76" fill="#f4d39b"/>
  <rect x="300" y="572" width="70" height="76" fill="#e0b57c"/>
  <rect x="256" y="592" width="42" height="56" rx="3" fill="#6d3a2a"/>
  <rect x="208" y="590" width="34" height="30" rx="3" fill="#ffe27a"/>
  <rect x="316" y="590" width="34" height="30" rx="3" fill="#ffe27a"/>
  <path stroke="#c98a4b" stroke-width="3" d="M225 590V620M208 605H242M333 590V620M316 605H350"/>
  <rect x="312" y="498" width="22" height="42" rx="3" fill="#8a4a35"/>
  <path fill="#55606e" d="M166 578L220 510H340L394 578Z"/>
  <path fill="#ff9a4d" d="M220 510H340L344 515H216Z"/>
  <path stroke="#434d59" stroke-width="3" d="M240 510L216 578M276 510L268 578M312 510L320 578"/>
  <rect x="166" y="574" width="228" height="7" rx="3.500" fill="#3f4853"/>

  <path fill="#36200f" d="M0 700C170 660 390 680 560 650V760H0Z"/>
  <g transform="translate(34 706) scale(.62)"><use class="wf-flame wf-flame-b" href="#wf-fire"/></g>
  <g transform="translate(92 694) scale(.42)"><use class="wf-flame" href="#wf-fire"/></g>
  <g transform="translate(476 672) scale(.46)"><use class="wf-flame wf-flame-c" href="#wf-fire"/></g>
  <g transform="translate(530 668) scale(.66)"><use class="wf-flame" href="#wf-fire"/></g>

  <g fill="#ffc44d">
    <circle class="wf-ember" cx="96" cy="620" r="3.500"/><circle class="wf-ember wf-ember-b" cx="170" cy="640" r="2.600"/>
    <circle class="wf-ember wf-ember-c" cx="250" cy="600" r="3"/><circle class="wf-ember" cx="330" cy="630" r="2.600"/>
    <circle class="wf-ember wf-ember-b" cx="410" cy="610" r="3.500"/><circle class="wf-ember wf-ember-c" cx="490" cy="630" r="2.800"/>
    <circle class="wf-ember wf-ember-b" cx="44" cy="600" r="2.400"/><circle class="wf-ember wf-ember-c" cx="140" cy="560" r="2.200"/>
    <circle class="wf-ember" cx="440" cy="560" r="2.400"/>
  </g>
</svg>`;

// Waldbrand im ruhigeren Original-Stil, passend zu FLOOD_ART und AVALANCHE_ART.
const WILDFIRE_ART = `
<svg class="art" viewBox="0 0 560 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="wo-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a3a48"/>
      <stop offset=".42" stop-color="#9a5a4a"/>
      <stop offset=".7" stop-color="#d99a6a"/>
    </linearGradient>
    <g id="wo-fire">
      <path fill="#d9602b" d="M0 0C-26-16-18-48 0-76C8-50 28-42 20-12C18-4 8 0 0 0Z"/>
      <path fill="#efb54a" d="M0 0C-12-8-8-26 1-40C4-26 14-20 10-6C9-2 4 0 0 0Z"/>
    </g>
    <g id="wo-tree">
      <path fill="none" stroke="#4b3028" stroke-width="7" stroke-linecap="round" d="M0 0Q-3-44 3-86M1-50L-22-72M2-62L22-84"/>
      <circle cx="-24" cy="-84" r="20" fill="#5e6a4a"/><circle cx="4" cy="-102" r="26" fill="#5e6a4a"/><circle cx="28" cy="-90" r="18" fill="#5e6a4a"/>
    </g>
  </defs>
  <rect width="560" height="760" fill="url(#wo-sky)"/>
  <circle cx="356" cy="350" r="52" fill="#f0c58a" opacity=".85"/>

  <g class="wf-smoke" fill="#3e3440">
    <circle cx="60" cy="150" r="72"/><circle cx="170" cy="120" r="88"/><circle cx="300" cy="136" r="78"/>
    <circle cx="420" cy="112" r="92"/><circle cx="530" cy="150" r="70"/><rect x="-40" width="660" height="130"/>
  </g>
  <g class="wf-smoke wf-smoke-b" fill="#5c4a50" opacity=".8">
    <circle cx="110" cy="226" r="34"/><circle cx="165" cy="214" r="42"/><circle cx="225" cy="230" r="28"/>
    <rect x="84" y="226" width="166" height="26" rx="13"/>
    <circle cx="400" cy="262" r="26"/><circle cx="445" cy="250" r="34"/><circle cx="492" cy="266" r="22"/>
    <rect x="378" y="262" width="136" height="20" rx="10"/>
  </g>

  <path fill="#a9825e" d="M0 520C110 480 220 505 330 490S500 480 560 498V760H0Z"/>
  <use href="#wo-tree" transform="translate(70 524)"/>
  <use href="#wo-tree" transform="translate(478 508) scale(.9)"/>
  <g transform="translate(78 470) scale(.75)"><use class="wf-flame" href="#wo-fire"/></g>
  <g transform="translate(484 452) scale(.7)"><use class="wf-flame wf-flame-b" href="#wo-fire"/></g>

  <path fill="#8a6a48" d="M50 650C120 620 140 606 190 600H370C420 606 450 620 520 650Z"/>
  <rect x="192" y="524" width="176" height="78" fill="#dcbd8c"/>
  <path stroke="#c7a673" stroke-width="2" d="M192 542H368M192 560H368M192 578H368"/>
  <rect x="260" y="550" width="40" height="52" fill="#4b3526"/>
  <rect x="210" y="546" width="32" height="28" fill="#4b3526"/>
  <rect x="318" y="546" width="32" height="28" fill="#4b3526"/>
  <path fill="#8d9a9e" d="M170 530L214 460H346L390 530Z"/>
  <path stroke="#76838a" stroke-width="3" d="M214 460L196 530M250 460L242 530M286 460L288 530M322 460L336 530"/>
  <path stroke="#66737a" stroke-width="5" stroke-linecap="round" d="M170 530H390"/>

  <path fill="#6d5a42" d="M0 668C180 640 380 656 560 630V760H0Z"/>
  <g transform="translate(62 666)"><use class="wf-flame wf-flame-b" href="#wo-fire"/></g>
  <g transform="translate(124 660) scale(.7)"><use class="wf-flame" href="#wo-fire"/></g>
  <g transform="translate(476 642) scale(.9)"><use class="wf-flame" href="#wo-fire"/></g>
  <g transform="translate(526 638) scale(.65)"><use class="wf-flame wf-flame-b" href="#wo-fire"/></g>

  <g fill="#efb54a">
    <circle class="wf-ember" cx="120" cy="620" r="2.800"/><circle class="wf-ember wf-ember-b" cx="210" cy="640" r="2.200"/>
    <circle class="wf-ember wf-ember-c" cx="330" cy="620" r="2.800"/><circle class="wf-ember" cx="420" cy="610" r="2.200"/>
    <circle class="wf-ember wf-ember-b" cx="500" cy="600" r="2.800"/>
  </g>
</svg>`;

const FLOOD_KG_ART = `
<svg class="art" viewBox="0 0 560 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="kf-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3f8fd6"/>
      <stop offset=".34" stop-color="#5aa6e0"/>
      <stop offset=".58" stop-color="#8fd0ee"/>
      <stop offset=".74" stop-color="#d6f2f2"/>
    </linearGradient>
    <linearGradient id="kf-water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1590c9"/>
      <stop offset="1" stop-color="#0b3f7a"/>
    </linearGradient>
    <radialGradient id="kf-halo">
      <stop offset="0" stop-color="#bff1ff" stop-opacity=".75"/>
      <stop offset="1" stop-color="#bff1ff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="kf-drops" width="120" height="120" patternUnits="userSpaceOnUse">
      <path stroke="#ffffff" stroke-width="2.200" stroke-linecap="round" d="M18 6l-6 24M78 22l-6 24M46 58l-6 24M108 70l-6 24M24 92l-6 24"/>
    </pattern>
    <path id="kf-leaf" d="M0 0Q34-26 78 2Q34-8 0 0Z"/>
  </defs>

  <rect width="560" height="760" fill="url(#kf-sky)"/>
  <ellipse cx="280" cy="470" rx="340" ry="170" fill="url(#kf-halo)"/>


  <g fill="#4f73a6">
    <circle cx="40" cy="130" r="92"/><circle cx="170" cy="100" r="112"/><circle cx="320" cy="122" r="100"/>
    <circle cx="470" cy="96" r="118"/><circle cx="570" cy="136" r="80"/><rect x="-40" width="660" height="120"/>
  </g>
  <g class="wf-smoke wf-smoke-b" fill="#6c8fb8">
    <circle cx="-6" cy="228" r="52"/><circle cx="84" cy="214" r="68"/><circle cx="178" cy="236" r="46"/>
    <circle cx="372" cy="240" r="44"/><circle cx="462" cy="218" r="66"/><circle cx="560" cy="236" r="50"/>
  </g>
  <g class="wf-smoke" fill="#9db6cf" opacity=".85">
    <circle cx="66" cy="288" r="28"/><circle cx="116" cy="276" r="38"/><circle cx="170" cy="292" r="22"/>
    <circle cx="418" cy="300" r="26"/><circle cx="470" cy="286" r="36"/><circle cx="520" cy="302" r="22"/>
  </g>

  <path fill="#5fb7c9" d="M0 462C80 436 170 458 260 448S440 430 560 460V540H0Z"/>
  <path fill="#39c98a" d="M0 482C110 466 210 486 320 476S480 468 560 484V540H0Z"/>
  <rect y="498" width="560" height="262" fill="#3fb6d9"/>

  <path fill="#9c6a45" d="M50 650C120 620 140 526 190 520H370C420 526 450 620 520 650Z"/>
  <path fill="#30c98a" d="M160 538C172 524 182 518 190 518H370C378 518 388 524 400 538C350 530 330 544 280 534C230 544 210 530 160 538Z"/>

  <g fill="none" stroke="#1fae76" stroke-width="6" stroke-linecap="round">
    <path d="M120 590Q116 490 100 400"/><path d="M134 586Q134 480 130 370"/><path d="M148 570Q150 490 158 412"/>
  </g>
  <g fill="#2fe08f">
    <use href="#kf-leaf" transform="translate(100 400) rotate(-150) scale(.66)"/>
    <use href="#kf-leaf" transform="translate(101 412) rotate(-30) scale(.54)"/>
    <use href="#kf-leaf" transform="translate(130 370) rotate(-120) scale(.66)"/>
    <use href="#kf-leaf" transform="translate(130 372) rotate(-40) scale(.66)"/>
    <use href="#kf-leaf" transform="translate(132 420) rotate(-170) scale(.54)"/>
    <use href="#kf-leaf" transform="translate(158 412) rotate(-60) scale(.62)"/>
  </g>

  <path fill="none" stroke="#8a4f3a" stroke-width="10" stroke-linecap="round" d="M428 560Q424 460 442 372"/>
  <g fill="#17b877" transform="translate(442 372)">
    <use href="#kf-leaf" transform="rotate(-165) scale(1.08)"/>
    <use href="#kf-leaf" transform="rotate(-125)"/>
    <use href="#kf-leaf" transform="rotate(-70)"/>
    <use href="#kf-leaf" transform="rotate(-20) scale(1.08)"/>
    <use href="#kf-leaf" transform="rotate(25) scale(.96)"/>
    <use href="#kf-leaf" transform="rotate(150) scale(.96)"/>
  </g>

  <rect x="178" y="508" width="204" height="14" rx="3" fill="#8a4f3a"/>
  <rect x="192" y="424" width="176" height="86" fill="#f7d9a6"/>
  <rect x="300" y="424" width="68" height="86" fill="#e3b985"/>
  <rect x="258" y="450" width="44" height="60" rx="3" fill="#6d3a2a"/>
  <rect x="210" y="448" width="32" height="30" rx="3" fill="#9fe0f5"/>
  <rect x="318" y="448" width="32" height="30" rx="3" fill="#9fe0f5"/>
  <path stroke="#c98a4b" stroke-width="3" d="M226 448V478M210 463H242M334 448V478M318 463H350"/>
  <path fill="#ff5f45" d="M168 432L214 350H346L392 432Z"/>
  <path fill="#d9412f" d="M280 350H346L392 432H280Z"/>
  <path stroke="#c23826" stroke-width="3" d="M214 350L196 432M248 350L238 432M312 350L322 432M346 350L366 432"/>
  <rect x="166" y="428" width="228" height="7" rx="3.500" fill="#a83022"/>

  <rect class="art-rain" x="-40" y="-520" width="760" height="1300" fill="url(#kf-drops)" opacity=".6"/>

  <g class="art-rise">
    <path class="art-wave" fill="#1fa5d6" d="M-160 566q40-12 80 0t80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0V800H-160Z"/>
    <g class="art-boat">
      <path fill="#ffd24a" d="M424 604C424 572 482 570 484 602Z"/>
      <path fill="#ff8a3c" d="M386 590C420 608 482 608 518 584C506 628 404 634 386 590Z"/>
    </g>
    <path class="art-wave art-wave-front" fill="url(#kf-water)" d="M-160 618q40-12 80 0t80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0 80 0V800H-160Z"/>
    <path fill="none" stroke="#bff1ff" stroke-width="3.500" stroke-linecap="round" opacity=".75" d="M50 668h60M210 700h86M400 676h50M90 734h50M340 742h70"/>
  </g>
</svg>`;

const AVALANCHE_KG_ART = `
<svg class="art" viewBox="0 0 560 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="ka-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f8fe0"/>
      <stop offset=".3" stop-color="#58b3f0"/>
      <stop offset=".5" stop-color="#a6dcf7"/>
      <stop offset=".66" stop-color="#e9f8fb"/>
    </linearGradient>
    <pattern id="ka-flakes" width="120" height="120" patternUnits="userSpaceOnUse">
      <g fill="#fff"><circle cx="20" cy="18" r="2.800"/><circle cx="80" cy="42" r="2"/><circle cx="48" cy="78" r="3"/><circle cx="104" cy="96" r="2.200"/></g>
    </pattern>
    <g id="ka-fir">
      <rect x="-5" y="-14" width="10" height="16" fill="#5a2f3f"/>
      <path fill="#0f8f78" d="M0-96L26-58H14L34-30H18L40-8H-40L-18-30H-34L-14-58H-26Z"/>
      <path fill="#0a6f62" d="M0-96L26-58H14L34-30H18L40-8H0Z"/>
      <path fill="#fff" d="M0-96L12-78L4-74L0-80L-5-73L-12-78Z"/>
    </g>
  </defs>

  <rect width="560" height="760" fill="url(#ka-sky)"/>
  <circle cx="200" cy="300" r="52" fill="#fff0b8"/>

  <path fill="#6f86c9" d="M0 450L110 280L190 360L300 190L400 320L470 240L560 360V760H0Z"/>
  <path fill="#5269b0" d="M110 280L150 340L120 420L190 360ZM300 190L350 280L310 400L400 320ZM470 240L500 300L480 380L560 360Z"/>
  <path fill="#fff" d="M110 280L80 326L102 318L120 334L140 318L154 326ZM300 190L262 248L288 238L304 258L328 240L346 262ZM470 240L446 276L466 270L482 284L500 272Z"/>

  <path fill="#f5fbff" d="M0 700L560 300V760H0Z"/>
  <path fill="#c9e4f7" d="M560 300L410 408L470 420L392 470L484 468L560 410Z"/>
  <path fill="#dff0fb" d="M300 486L216 546L300 536L250 588L350 540Z"/>

  <g class="av-slide">
    <g fill="#fff">
      <circle cx="470" cy="352" r="42"/><circle cx="412" cy="384" r="54"/><circle cx="494" cy="396" r="38"/>
      <circle cx="356" cy="414" r="36"/><circle cx="446" cy="430" r="42"/>
    </g>
    <g fill="#bfe0f5">
      <circle cx="430" cy="404" r="20"/><circle cx="378" cy="426" r="14"/><circle cx="478" cy="384" r="13"/><circle cx="468" cy="432" r="15"/>
    </g>
  </g>

  <g class="av-tremble"><use href="#ka-fir" transform="translate(90 648) scale(1.2)"/></g>
  <g class="av-tremble av-tremble-b"><use href="#ka-fir" transform="translate(462 634) scale(1.05)"/></g>

  <path fill="#d8edfa" d="M0 640C150 606 380 606 560 636V760H0Z"/>
  <path fill="#bfdff2" d="M0 696C170 664 390 688 560 660V760H0Z"/>

  <rect x="190" y="536" width="176" height="80" fill="#d9773f"/>
  <rect x="290" y="536" width="76" height="80" fill="#b85f30"/>
  <path stroke="#9c4c25" stroke-width="2.500" d="M190 552H366M190 568H366M190 584H366M190 600H366"/>
  <rect x="258" y="562" width="40" height="54" rx="3" fill="#5a2f24"/>
  <rect x="208" y="556" width="32" height="28" rx="3" fill="#ffe27a"/>
  <rect x="316" y="556" width="32" height="28" rx="3" fill="#ffe27a"/>
  <path stroke="#a4551f" stroke-width="3" d="M224 556V584M208 570H240M332 556V584M316 570H348"/>
  <path fill="#7a3f2c" d="M158 552L278 464L398 552Z"/>
  <path fill="#fff" d="M158 552L278 464L398 552C380 540 366 556 346 544C326 532 310 548 278 532C248 548 232 532 212 544C192 556 176 540 158 552Z"/>
  <path fill="#dff0fb" d="M278 464L398 552C380 540 366 556 346 544C326 532 310 548 278 532Z"/>

  <rect class="av-snow" x="-40" y="-260" width="680" height="1200" fill="url(#ka-flakes)" opacity=".9"/>
</svg>`;

const AVALANCHE_ART = `
<svg class="art" viewBox="0 0 560 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="av-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#24405f"/>
      <stop offset=".35" stop-color="#5e8fb2"/>
      <stop offset=".62" stop-color="#d5e8f2"/>
    </linearGradient>
    <pattern id="av-flakes" width="120" height="120" patternUnits="userSpaceOnUse">
      <g fill="#fff"><circle cx="20" cy="18" r="2.4"/><circle cx="80" cy="42" r="1.8"/><circle cx="48" cy="78" r="2.6"/><circle cx="104" cy="96" r="2"/></g>
    </pattern>
    <g id="av-fir">
      <rect x="-5" y="-14" width="10" height="16" fill="#4a3424"/>
      <path fill="#2f5a4a" d="M0-96L26-58H14L34-30H18L40 -8H-40L-18-30H-34L-14-58H-26Z"/>
      <path fill="#f4f9fc" d="M0-96L12-78L4-74L0-80L-5-73L-12-78Z"/>
    </g>
  </defs>
  <rect width="560" height="760" fill="url(#av-sky)"/>

  <path fill="#90aec5" d="M0 450L110 280L190 360L300 190L400 320L470 240L560 360V760H0Z"/>
  <path fill="#eef5fa" d="M110 280L80 326L102 318L120 334L140 318L154 326ZM300 190L262 248L288 238L304 258L328 240L346 262ZM470 240L446 276L466 270L482 284L500 272Z"/>

  <path fill="#f2f7fb" d="M0 700L560 300V760H0Z"/>
  <path fill="#d6e4ee" d="M560 300L410 408L470 420L392 470L484 468L560 410Z"/>

  <g class="av-slide">
    <g fill="#fff">
      <circle cx="470" cy="352" r="40"/><circle cx="412" cy="384" r="52"/><circle cx="494" cy="396" r="36"/>
      <circle cx="356" cy="414" r="34"/><circle cx="446" cy="430" r="40"/>
    </g>
    <g fill="#c6d9e6">
      <circle cx="430" cy="396" r="17"/><circle cx="378" cy="420" r="12"/><circle cx="478" cy="378" r="11"/>
    </g>
  </g>

  <g class="av-tremble"><use href="#av-fir" transform="translate(90 648) scale(1.2)"/></g>
  <g class="av-tremble av-tremble-b"><use href="#av-fir" transform="translate(462 634) scale(1.05)"/></g>

  <path fill="#dce8f1" d="M0 640C150 606 380 606 560 636V760H0Z"/>

  <rect x="190" y="536" width="176" height="80" fill="#a9703f"/>
  <path stroke="#8a5830" stroke-width="2.5" d="M190 552H366M190 568H366M190 584H366M190 600H366"/>
  <rect x="258" y="562" width="40" height="54" fill="#4f3220"/>
  <rect x="208" y="556" width="32" height="28" fill="#cfe7f4"/>
  <rect x="316" y="556" width="32" height="28" fill="#cfe7f4"/>
  <path stroke="#4f3220" stroke-width="3" d="M224 556V584M208 570H240M332 556V584M316 570H348"/>
  <path fill="#6d4526" d="M158 552L278 464L398 552Z"/>
  <path fill="#fff" d="M158 552L278 464L398 552C380 540 366 556 346 544C326 532 310 548 278 532C248 548 232 532 212 544C192 556 176 540 158 552Z"/>

  <rect class="av-snow" x="-40" y="-260" width="680" height="1200" fill="url(#av-flakes)" opacity=".8"/>
</svg>`;

const RIVER_PATH = 'M190 -60C120 70 130 150 260 190S470 270 400 370S120 430 150 540S330 640 370 760';
const RIVER_CLOUDS = `
  <!-- Wolken -->
  <g class="rv-cloud" fill="#fff" opacity=".6">
    <circle cx="20" cy="240" r="24"/><circle cx="52" cy="228" r="30"/><circle cx="86" cy="242" r="20"/>
  </g>
  <g class="rv-cloud rv-cloud-b" fill="#fff" opacity=".5">
    <circle cx="20" cy="470" r="20"/><circle cx="46" cy="460" r="26"/><circle cx="74" cy="472" r="17"/>
  </g>
`;

const RIVER_ART = `
<svg class="art" viewBox="0 0 560 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <path id="rv-leaf" d="M0 0Q16-13 38 1Q16-4 0 0Z"/>
    <g id="rv-hut">
      <ellipse cy="1" rx="34" ry="7" fill="#4f7a40" opacity=".55"/>
      <rect x="-22" y="-26" width="44" height="26" fill="#e3c799"/>
      <path stroke="#cdae7c" stroke-width="1.5" d="M-22-18H22M-22-9H22"/>
      <rect x="-6" y="-17" width="12" height="17" fill="#4b3526"/>
      <path d="M-30-24L-16-46H16L30-24Z"/>
    </g>
    <g id="rv-palm">
      <path fill="none" stroke="#6d5236" stroke-width="4.5" stroke-linecap="round" d="M0 0Q-3-30 6-58"/>
      <g fill="#3f7a46" transform="translate(6 -58)">
        <use href="#rv-leaf" transform="rotate(-165)"/>
        <use href="#rv-leaf" transform="rotate(-120) scale(.9)"/>
        <use href="#rv-leaf" transform="rotate(-65) scale(.9)"/>
        <use href="#rv-leaf" transform="rotate(-20)"/>
        <use href="#rv-leaf" transform="rotate(25) scale(.85)"/>
        <use href="#rv-leaf" transform="rotate(155) scale(.85)"/>
      </g>
    </g>
    <path id="rv-tuft" fill="none" stroke="#5a8a45" stroke-width="2.4" stroke-linecap="round" d="M0 0Q-6-7-9-13M0 0V-16M0 0Q6-7 9-13"/>
    <g id="rv-bush"><circle cx="-10" r="11"/><circle cx="8" r="13"/><circle cx="0" cy="-9" r="11"/></g>
    <g id="rv-boat">
      <path fill="#4b3526" d="M-20 0Q0-10 20 0Q0 10-20 0Z"/>
      <rect x="-8" y="-4" width="14" height="8" rx="3" fill="#d9b67c"/>
    </g>
  </defs>

  <!-- Land und Felder -->
  <rect width="560" height="680" fill="#8fb56b"/>
  <path fill="#a4c67c" d="M300-10H570V130L450 150L340 90Z"/>
  <path fill="#7ea65d" d="M-10 200L90 180L180 260L150 360L-10 390Z"/>
  <path fill="#b3cf88" d="M340 440L570 420V600L430 640L370 560Z"/>
  <path fill="#9dbf74" d="M-10 560L90 540L180 690H-10Z"/>
  <g fill="none" stroke="#8fb56b" stroke-width="3" opacity=".8">
    <path d="M340 30L570 18M350 62L570 50M380 94L570 82M420 124L570 112"/>
    <path d="M380 480L570 464M385 516L570 500M395 552L570 536M420 588L570 572"/>
  </g>

  <!-- Fluss -->
  <path fill="none" stroke="#dcc892" stroke-width="88" stroke-linecap="round" d="${RIVER_PATH}"/>
  <path class="rv-shallow" fill="none" stroke="#7fc3da" stroke-width="88" stroke-linecap="round" d="${RIVER_PATH}"/>
  <path class="rv-river" fill="none" stroke="#3f8fb2" stroke-width="62" stroke-linecap="round" d="${RIVER_PATH}"/>
  <g fill="none" stroke="#a9dcea" stroke-linecap="round" opacity=".75">
    <path class="rv-flow" stroke-width="3" stroke-dasharray="16 44" d="${RIVER_PATH}"/>
    <path class="rv-flow" stroke-width="2" stroke-dasharray="10 50" transform="translate(11 4)" d="${RIVER_PATH}"/>
    <path class="rv-flow" stroke-width="2" stroke-dasharray="12 48" transform="translate(-11 -3)" d="${RIVER_PATH}"/>
  </g>
  <use href="#rv-boat">
    <animateMotion dur="34s" begin="-4s" repeatCount="indefinite" rotate="auto" path="${RIVER_PATH}"/>
  </use>
  <use href="#rv-boat">
    <animateMotion dur="34s" begin="-16s" repeatCount="indefinite" rotate="auto" path="${RIVER_PATH}"/>
  </use>

  <!-- Oben: Häuser rechts vom Fluss -->
  <use href="#rv-tuft" x="60" y="60"/><use href="#rv-tuft" x="52" y="150"/>
  <g transform="translate(46 118)"><use class="rv-sway" href="#rv-palm"/></g>
  <use href="#rv-bush" x="340" y="66" fill="#6b9b58"/>
  <use href="#rv-hut" x="400" y="100" fill="#c1553a"/>
  <g transform="translate(470 118)"><use class="rv-sway rv-sway-b" href="#rv-palm"/></g>
  <use href="#rv-tuft" x="350" y="140"/><use href="#rv-tuft" x="520" y="150"/>
  <use href="#rv-hut" x="480" y="190" fill="#8c9ba2"/>

  <!-- Mitte: Häuser links vom Fluss -->
  <use href="#rv-tuft" x="210" y="290"/>
  <g transform="translate(62 280)"><use class="rv-sway rv-sway-b" href="#rv-palm"/></g>
  <use href="#rv-hut" x="130" y="310" fill="#b8693f"/>
  <use href="#rv-bush" x="46" y="330" fill="#5f9150"/>
  <use href="#rv-tuft" x="240" y="350"/>
  <use href="#rv-hut" x="72" y="398" fill="#c1553a"/>
  <g transform="translate(190 410)"><use class="rv-sway" href="#rv-palm"/></g>
  <use href="#rv-tuft" x="30" y="440"/><use href="#rv-tuft" x="120" y="440"/>

  <!-- Unten -->
  <use href="#rv-tuft" x="60" y="520"/>
  <use href="#rv-bush" x="52" y="600" fill="#6b9b58"/>
  <use href="#rv-tuft" x="130" y="650"/>
  <g transform="translate(340 470)"><use class="rv-sway rv-sway-b" href="#rv-palm"/></g>
  <use href="#rv-hut" x="430" y="500" fill="#8c9ba2"/>
  <use href="#rv-tuft" x="510" y="520"/>
  <g transform="translate(500 590)"><use class="rv-sway" href="#rv-palm"/></g>
  <use href="#rv-hut" x="420" y="612" fill="#c1553a"/>
  <use href="#rv-tuft" x="520" y="650"/>

  ${RIVER_CLOUDS}
</svg>`;

// Seitenansicht im Maßstab 1 m = 56 Einheiten, Boden bei y = 480.
const FD_DEFS = `
    <pattern id="fd-bricks" width="28" height="14" patternUnits="userSpaceOnUse" y="2">
      <rect width="28" height="14" fill="#b5654a"/>
      <path fill="none" stroke="#e3c7a8" stroke-width="1.6" d="M0 0H28M0 7H28M14 0V7M0 7V14M28 7V14"/>
    </pattern>
    <path id="fd-leaf" d="M0 0Q16-13 38 1Q16-4 0 0Z"/>
    <g id="fd-palm">
      <path fill="none" stroke="#6d5236" stroke-width="4.5" stroke-linecap="round" d="M0 0Q-3-30 6-58"/>
      <g fill="#3f7a46" transform="translate(6 -58)">
        <use href="#fd-leaf" transform="rotate(-165)"/>
        <use href="#fd-leaf" transform="rotate(-120) scale(.9)"/>
        <use href="#fd-leaf" transform="rotate(-65) scale(.9)"/>
        <use href="#fd-leaf" transform="rotate(-20)"/>
        <use href="#fd-leaf" transform="rotate(25) scale(.85)"/>
        <use href="#fd-leaf" transform="rotate(155) scale(.85)"/>
      </g>
    </g>
    <mask id="fd-wall-mask" maskUnits="userSpaceOnUse" x="140" y="360" width="280" height="130">
      <rect x="140" y="360" width="280" height="130" fill="#fff"/>
      <path d="M256 480V416H304V480Z"/>
      <rect x="176" y="394" width="44" height="36"/>
      <rect x="340" y="394" width="44" height="36"/>
    </mask>
    <path id="fd-tuft" fill="none" stroke="#5a8a45" stroke-width="2.4" stroke-linecap="round" d="M0 0Q-6-7-9-13M0 0V-16M0 0Q6-7 9-13"/>`;

const FD_BUILD = `
  <!-- Erdplattform: 2 m hoch, darauf steht das Fundament -->
  <g class="fd-platform">
    <path fill="#a47b52" d="M102 368H458L530 490H30Z"/>
    <path fill="#c6a273" d="M102 368H458L466 381H94Z"/>
    <path stroke="#8a6541" stroke-width="2" stroke-dasharray="24 16" fill="none" d="M82 400H478M66 428H494M50 456H510"/>
    <use href="#fd-tuft" x="80" y="404"/><use href="#fd-tuft" x="486" y="432"/><use href="#fd-tuft" x="56" y="452"/>
  </g>
  <circle class="pt-extra" cx="490" cy="470" r="1" fill="none" stroke="none"/>

  <!-- Vetiver-Hecke links und rechts vom Haus, die Wurzeln reichen tief in den Boden -->
  <g class="fd-extra fd-vetiver">
    ${[58, 80, 102, 124, 436, 458, 480, 502].map(x => `<g transform="translate(${x} 482)">
      <path fill="none" stroke="#c9a36a" stroke-width="2" stroke-linecap="round" d="M-5 0Q-11 22-6 56M0 0Q5 26 0 62M5 0Q11 20 8 50"/>
      <path class="rv-sway" fill="#3f7a46" d="M-14 0Q-20-34-28-56Q-8-34-4 0ZM-5 0Q-6-44 0-70Q6-44 5 0ZM4 0Q8-34 28-56Q20-34 14 0Z"/>
    </g>`).join('')}
  </g>

  <!-- Erhöhter Brunnen mit Handpumpe und Latrine auf Betonplattform -->
  <g class="fd-extra fd-well">
    <rect x="456" y="462" width="118" height="18" rx="2" fill="#a9afb3"/>
    <rect x="456" y="462" width="118" height="5" rx="2" fill="#c9ced1"/>
    <rect x="482" y="424" width="9" height="38" fill="#3b6a8f"/>
    <rect x="476" y="416" width="26" height="11" rx="3" fill="#2f5877"/>
    <path fill="#2f5877" d="M500 420H520V426H500Z"/>
    <g class="fd-pump-handle"><path stroke="#24384a" stroke-width="4" stroke-linecap="round" d="M479 419L462 402"/></g>
    <circle class="fd-drip" cx="518" cy="430" r="3" fill="#6fc7ee"/>
    <circle class="fd-drip fd-drip-b" cx="518" cy="430" r="3" fill="#6fc7ee"/>
    <ellipse class="fd-puddle" cx="518" cy="465" rx="9" ry="2.500" fill="#6fc7ee"/>
    <rect x="534" y="424" width="32" height="38" fill="#b08a5a"/>
    <path stroke="#8a6542" stroke-width="2" d="M542 424V462M550 424V462M558 424V462"/>
    <path fill="#7f8e9b" d="M530 426L550 408L570 426Z"/>
    <rect x="543" y="436" width="14" height="26" fill="#6d3a2a"/>
  </g>
  <g class="fd-raise">
    <circle class="pt-base" cx="146" cy="476" r="1" fill="none" stroke="none"/>
  <!-- Noch keine Wahl -->
  <g class="fd-empty">
    <rect x="150" y="490" width="260" height="46" rx="8" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-width="2.5" stroke-dasharray="9 7"/>
    <text x="280" y="523" text-anchor="middle" fill="#fff" font-size="30" font-weight="700">?</text>
  </g>

  <!-- Betonplatte: 15 cm auf einer Ziegellage -->
  <g class="fd-part fd-concrete">
    <rect x="140" y="480" width="280" height="9" fill="url(#fd-bricks)"/>
    <rect x="140" y="472" width="280" height="9" rx="1" fill="#a9afb3"/>
    <path stroke="#8b9296" stroke-width="2" stroke-dasharray="3 11" d="M144 476.5H416"/>
  </g>

  <!-- Erdsockel: ca. 60 cm -->
  <g class="fd-part fd-earth">
    <path fill="#a47b52" d="M138 446H422L456 482H104Z"/>
    <path fill="#c6a273" d="M138 446H422L427 452H133Z"/>
    <path stroke="#8a6541" stroke-width="2" stroke-dasharray="20 14" fill="none" d="M127 460H433M116 471H444"/>
  </g>

  <!-- Ziegelsockel: 90 cm, Betonpfeiler ca. 70 cm im Boden auf kleinem Fundament -->
  <g class="fd-part fd-brick">
    <g fill="#a9afb3" stroke="#858c90" stroke-width="1.5">
      <rect x="150" y="478" width="18" height="42" rx="1"/>
      <rect x="271" y="478" width="18" height="42" rx="1"/>
      <rect x="392" y="478" width="18" height="42" rx="1"/>
      <rect x="141" y="519" width="36" height="11" rx="2"/>
      <rect x="262" y="519" width="36" height="11" rx="2"/>
      <rect x="383" y="519" width="36" height="11" rx="2"/>
    </g>
    <rect x="134" y="430" width="292" height="51" fill="url(#fd-bricks)"/>
    <rect x="130" y="426" width="300" height="6" rx="1" fill="#a9afb3"/>
  </g>

  <!-- Pfahlbau: 60 cm, Bambus auf Betonfüßen -->
  <g class="fd-part fd-stilts">
    <g fill="#a9afb3">
      <path d="M150 490L156 472H172L178 490Z"/><path d="M216 490L222 472H238L244 490Z"/>
      <path d="M316 490L322 472H338L344 490Z"/><path d="M382 490L388 472H404L410 490Z"/>
    </g>
    <g fill="#bda95f">
      <rect x="159" y="450" width="10" height="24"/><rect x="225" y="450" width="10" height="24"/>
      <rect x="325" y="450" width="10" height="24"/><rect x="391" y="450" width="10" height="24"/>
    </g>
    <path stroke="#8e7c3e" stroke-width="2" d="M159 462H169M225 462H235M325 462H335M391 462H401"/>
    <rect x="136" y="445" width="288" height="8" rx="1" fill="#8a6542"/>
  </g>

  <!-- Haus als Umriss -->
  <g class="fd-house" fill="none" stroke="#24384a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="11 8">
    <rect class="fd-walls" x="150" y="368" width="260" height="112" fill="#fff" fill-opacity=".2" stroke="none"/>
    <g class="fd-wallset" stroke="none" stroke-dasharray="none" mask="url(#fd-wall-mask)">
      <g class="fd-wall fd-wall-mud">
        <rect x="150" y="368" width="260" height="112" fill="#a8794c"/>
        <path stroke="#8a6038" stroke-width="3" stroke-dasharray="14 18" d="M150 386H410M150 414H410M150 442H410M150 468H410"/>
        <path stroke="#d2a874" stroke-width="2" stroke-dasharray="6 26" d="M160 400H410M170 428H410M160 456H410"/>
      </g>
      <g class="fd-wall fd-wall-tin">
        <rect x="150" y="368" width="260" height="112" fill="#aeb9c2"/>
        <path stroke="#dfe6eb" stroke-width="4" d="M158 368V480M174 368V480M190 368V480M206 368V480M222 368V480M238 368V480M254 368V480M270 368V480M286 368V480M302 368V480M318 368V480M334 368V480M350 368V480M366 368V480M382 368V480M398 368V480"/>
        <path stroke="#7f8b95" stroke-width="3" d="M166 368V480M182 368V480M198 368V480M214 368V480M230 368V480M246 368V480M262 368V480M278 368V480M294 368V480M310 368V480M326 368V480M342 368V480M358 368V480M374 368V480M390 368V480M406 368V480"/>
        <path stroke="#b5654a" stroke-width="2" d="M150 470L410 470" opacity=".5"/>
      </g>
      <g class="fd-wall fd-wall-brick">
        <rect x="150" y="368" width="260" height="112" fill="url(#fd-bricks)"/>
        <rect x="150" y="368" width="260" height="76" fill="#efe3d0" opacity=".88"/>
        <path stroke="#d8c8ae" stroke-width="2" d="M150 392H410M150 416H410"/>
      </g>
      <g class="fd-wall fd-wall-ferro">
        <rect x="150" y="368" width="260" height="112" fill="#c3c9cc"/>
        <path stroke="#8e979c" stroke-width="1.8" d="M150 384H410M150 400H410M150 416H410M150 432H410M150 448H410M150 464H410M166 368V480M182 368V480M198 368V480M214 368V480M230 368V480M246 368V480M262 368V480M278 368V480M294 368V480M310 368V480M326 368V480M342 368V480M358 368V480M374 368V480M390 368V480"/>
        <rect x="150" y="368" width="260" height="112" fill="#fff" opacity=".18"/>
      </g>
    </g>
    <path class="fd-outline" d="M150 480V368H410V480"/>
    <path class="fd-roof" fill="#fff" fill-opacity=".3" d="M126 368L184 296H376L434 368Z"/>
    <!-- Dächer: Walmdach von vorn als Trapez, Satteldach mit Giebel, Flachdach als Platte -->
    <g class="fd-roofs" stroke="none" stroke-dasharray="none">
      <g class="fd-roofpart fd-roof-tinhip">
        <clipPath id="fd-clip-hip"><path d="M126 368L184 296H376L434 368Z"/></clipPath>
        <path fill="#aeb9c2" d="M126 368L184 296H376L434 368Z"/>
        <g clip-path="url(#fd-clip-hip)">
          <path stroke="#dfe6eb" stroke-width="4" d="M132 290V370M146 290V370M160 290V370M174 290V370M188 290V370M202 290V370M216 290V370M230 290V370M244 290V370M258 290V370M272 290V370M286 290V370M300 290V370M314 290V370M328 290V370M342 290V370M356 290V370M370 290V370M384 290V370M398 290V370M412 290V370M426 290V370"/>
          <path stroke="#7f8b95" stroke-width="3" transform="translate(7 0)" d="M132 290V370M146 290V370M160 290V370M174 290V370M188 290V370M202 290V370M216 290V370M230 290V370M244 290V370M258 290V370M272 290V370M286 290V370M300 290V370M314 290V370M328 290V370M342 290V370M356 290V370M370 290V370M384 290V370M398 290V370M412 290V370M426 290V370"/>
          <path fill="#7f8b95" opacity=".45" d="M126 368L184 296L204 368ZM434 368L376 296L356 368Z"/>
        </g>
        <path stroke="#6b7680" stroke-width="6" stroke-linecap="round" d="M184 296H376"/>
        <path stroke="#6b7680" stroke-width="4" d="M124 368H436"/>
      </g>
      <g class="fd-roofpart fd-roof-concreteflat">
        <rect x="134" y="342" width="292" height="26" rx="1" fill="#a9afb3"/>
        <rect x="130" y="338" width="300" height="7" rx="2" fill="#c3c9cc"/>
        <path stroke="#8b9296" stroke-width="2" stroke-dasharray="3 11" d="M138 356H422"/>
        <path stroke="#6b5a4e" stroke-width="3" stroke-linecap="round" d="M150 338V322M162 338V326M398 338V322M410 338V326"/>
      </g>
      <g class="fd-roofpart fd-roof-tilegable">
        <clipPath id="fd-clip-gable"><path d="M118 372L280 270L442 372Z"/></clipPath>
        <path fill="#c4673f" d="M118 372L280 270L442 372Z"/>
        <g clip-path="url(#fd-clip-gable)" fill="none">
          <path stroke="#a24f2e" stroke-width="3" d="M100 300H460M100 322H460M100 344H460M100 366H460"/>
          <path stroke="#a24f2e" stroke-width="2.5" stroke-dasharray="2 16" d="M100 311H460M100 355H460"/>
          <path stroke="#a24f2e" stroke-width="2.5" stroke-dasharray="2 16" stroke-dashoffset="9" d="M100 289H460M100 333H460"/>
          <path stroke="#e08a5e" stroke-width="2" d="M100 298H460M100 320H460M100 342H460M100 364H460" opacity=".6"/>
        </g>
        <path stroke="#8e3f24" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none" d="M118 372L280 270L442 372"/>
      </g>
      <g class="fd-roofpart fd-roof-thatch">
        <clipPath id="fd-clip-thatch"><path d="M112 378L280 262L448 378Z"/></clipPath>
        <path fill="#d9b25f" d="M112 378L280 262L448 378Z"/>
        <g clip-path="url(#fd-clip-thatch)" fill="none">
          <path stroke="#b8913f" stroke-width="2.5" stroke-dasharray="10 7" d="M90 292H470M90 310H470M90 328H470M90 346H470M90 364H470"/>
          <path stroke="#ecd08a" stroke-width="2" stroke-dasharray="6 12" stroke-dashoffset="5" d="M90 301H470M90 319H470M90 337H470M90 355H470"/>
        </g>
        <path fill="#b8913f" d="M112 378L120 386L128 378L136 387L144 378L152 386L160 378L168 387L176 378L184 386L192 378L200 387L208 378L216 386L224 378L232 387L240 378L248 386L256 378L264 387L272 378L280 386L288 378L296 387L304 378L312 386L320 378L328 387L336 378L344 386L352 378L360 387L368 378L376 386L384 378L392 387L400 378L408 386L416 378L424 387L432 378L440 386L448 378Z"/>
        <path fill="#a8823a" d="M262 274L280 258L298 274Z"/>
      </g>
    </g>
    <path class="fd-door" d="M256 480V416H304V480"/>
    <rect class="fd-window" x="176" y="394" width="44" height="36" rx="1"/>
    <rect class="fd-window" x="340" y="394" width="44" height="36" rx="1"/>
    <circle class="pt-roof" cx="300" cy="334" r="1" fill="none" stroke="none"/>
    <circle class="pt-wall" cx="160" cy="400" r="1" fill="none" stroke="none"/>

    <!-- Verstärktes Tragwerk: Kreuzstreben, Pfosten mit Betonfuß und schwarzem Schutzanstrich -->
    <g class="fd-extra fd-frame" stroke="none" stroke-dasharray="none">
      <rect x="144" y="366" width="272" height="9" rx="2" fill="#8a6542"/>
      <rect x="146" y="366" width="10" height="114" fill="#8a6542"/><rect x="404" y="366" width="10" height="114" fill="#8a6542"/>
      <rect x="146" y="448" width="10" height="22" fill="#2b2b2e"/><rect x="404" y="448" width="10" height="22" fill="#2b2b2e"/>
      <rect x="141" y="470" width="20" height="12" rx="2" fill="#a9afb3"/><rect x="399" y="470" width="20" height="12" rx="2" fill="#a9afb3"/>
      <path class="fd-brace" fill="none" stroke="#8a6542" stroke-width="7" stroke-linecap="round" d="M156 408L192 372M404 408L368 372M156 440L196 400M404 440L364 400"/>
      <path class="fd-gleam" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M151 372V470M409 372V470"/>
    </g>
  </g>
  </g>
`;

const FD_CLOUDS = `
  <g class="rv-cloud" fill="#fff" opacity=".7">
    <circle cx="20" cy="110" r="24"/><circle cx="52" cy="98" r="30"/><circle cx="86" cy="112" r="20"/>
  </g>
  <g class="rv-cloud rv-cloud-b" fill="#fff" opacity=".55">
    <circle cx="20" cy="190" r="18"/><circle cx="44" cy="180" r="24"/><circle cx="70" cy="192" r="15"/>
  </g>
`;

const FOUNDATION_ART = `
<svg class="art fd" data-foundation="" data-extra="" data-wall="" data-roof="" viewBox="-60 20 680 530" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <clipPath id="fd-above-ground"><rect x="-1000" width="2600" height="480"/></clipPath>
    <linearGradient id="fd-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6d8ea6"/>
      <stop offset=".7" stop-color="#d3dfdb"/>
    </linearGradient>
    <linearGradient id="fd-soil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8f6b49"/>
      <stop offset="1" stop-color="#6b4e35"/>
    </linearGradient>
    <pattern id="fd-drops" width="120" height="120" patternUnits="userSpaceOnUse">
      <path stroke="#fff" stroke-width="1.6" stroke-linecap="round" d="M18 6l-6 24M78 22l-6 24M46 58l-6 24M108 70l-6 24M24 92l-6 24"/>
    </pattern>
    ${FD_DEFS}
  </defs>

  <!-- Hintergrund -->
  <rect x="-1000" width="2600" height="680" fill="url(#fd-sky)"/>
  ${FD_CLOUDS}
  <path fill="#9db8a4" d="M-1000 448H0C80 432 170 446 260 442S440 430 560 448H1600V480H-1000Z"/>
  <rect x="-1000" y="458" width="2600" height="24" fill="#74a9bd"/>
  <path class="rv-flow" fill="none" stroke="#c4e6ef" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="16 44" d="M-1020 470H1600"/>
  <g transform="translate(92 480) scale(1.5)"><use class="rv-sway rv-sway-b" href="#fd-palm"/></g>
  <g transform="translate(468 480) scale(1.7)"><use class="rv-sway" href="#fd-palm"/></g>

  <!-- Boden im Schnitt -->
  <rect x="-1000" y="480" width="2600" height="70" fill="url(#fd-soil)"/>
  <path stroke="#7c5c3f" stroke-width="2" stroke-dasharray="26 20" fill="none" d="M-1000 512H1600M-1014 536H1600"/>
  <rect x="-1000" y="476" width="2600" height="9" fill="#7c9a55"/>
  <use href="#fd-tuft" x="74" y="478"/><use href="#fd-tuft" x="116" y="478"/>
  <use href="#fd-tuft" x="446" y="478"/><use href="#fd-tuft" x="488" y="478"/>

  ${FD_BUILD}

  <!-- Regen -->
  <g clip-path="url(#fd-above-ground)">
    <rect class="art-rain" x="-1040" y="-520" width="2800" height="1000" fill="url(#fd-drops)" opacity=".28"/>
  </g>
</svg>`;

// Ferne Häuser, Palmen und Bäume hinter dem Fluss; das Muster ist fest, damit sie nicht springen.
function farSilhouettes(y, scale, fill, shift) {
  const kinds = ['hut', 'palm', 'tree', 'palm', 'hut', 'tree', 'tree', 'palm'];
  return Array.from({ length: 34 }, (_, i) => {
    const x = -1500 + i * 130 + ((i * 47 + shift) % 70);
    const size = scale * (0.82 + ((i * 13 + shift) % 5) * 0.09);
    return `<use href="#st-far-${kinds[(i + shift) % kinds.length]}" transform="translate(${x} ${y}) scale(${size})" fill="${fill}"/>`;
  }).join('');
}

// Das fertige Haus bei Regen. Boden bei y = 810; Lage und Größe des Hauses steuert das CSS.
const SITE_ART = `
<svg class="site-art fd final" data-foundation="" data-extra="" data-wall="" data-roof="" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <defs>
    ${FD_DEFS}
    <pattern id="st-drops" width="160" height="160" patternUnits="userSpaceOnUse">
      <path stroke="#8fb8cb" stroke-width="2" stroke-linecap="round" d="M30 14l-5 20M112 62l-5 20M62 112l-5 20"/>
    </pattern>
    <clipPath id="st-above-ground"><rect x="-3000" y="-3000" width="7000" height="3810"/></clipPath>
    <path id="st-far-hut" d="M-24 0V-20L0-38L24-20V0Z"/>
    <path id="st-far-palm" d="M-2 0L0-44L3-44L3 0ZM1-44Q-16-58-32-46Q-16-50 1-42ZM1-44Q18-58 34-46Q18-50 1-42ZM1-44Q-10-68-26-66Q-10-62 0-42ZM1-44Q12-68 28-66Q12-62 2-42Z"/>
    <g id="st-far-tree"><rect x="-3" y="-16" width="6" height="16"/><circle cy="-30" r="18"/><circle cx="-14" cy="-22" r="12"/><circle cx="14" cy="-22" r="12"/></g>
  </defs>

  <path fill="#e3ece5" d="M-3000 730C-1200 712 -400 738 200 720S900 704 1400 726S2600 716 4500 730V790H-3000Z"/>
  ${farSilhouettes(744, 0.8, '#c3d3c9', 0)}
  <path fill="#d2e0d6" d="M-3000 742C-1000 736 100 750 700 740S1800 734 4500 744V790H-3000Z"/>
  ${farSilhouettes(760, 1.05, '#a8bfb2', 3)}
  <path fill="#bfd3c5" d="M-3000 756C-1000 750 200 760 800 754S2000 750 4500 757V790H-3000Z"/>
  <rect x="-3000" y="768" width="7500" height="44" fill="#6f9fb0"/>
  <path class="rv-flow" fill="none" stroke="#c4dde5" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="16 44" d="M-2000 782H3500"/>
  <path class="rv-flow" fill="none" stroke="#c4dde5" stroke-width="2" stroke-linecap="round" stroke-dasharray="10 50" d="M-1980 798H3500"/>

  <g class="site-center"><g class="site-house">
    <g transform="translate(70 480) scale(1.5)"><use class="rv-sway rv-sway-b" href="#fd-palm"/></g>
    <g class="site-palm-right" transform="translate(494 480) scale(1.7)"><use class="rv-sway" href="#fd-palm"/></g>
  </g></g>

  <rect x="-3000" y="810" width="7500" height="1200" fill="#7f5f42"/>
  <path fill="none" stroke="#6b4e35" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="30 22" d="M-2000 858H3500"/>
  <rect x="-3000" y="804" width="7500" height="12" fill="#6f9a62"/>

  <g class="site-center"><g class="site-house">
    <use href="#fd-tuft" x="46" y="478"/><use href="#fd-tuft" x="104" y="478"/>
    <use href="#fd-tuft" x="452" y="478"/><use href="#fd-tuft" x="520" y="478"/>
    ${FD_BUILD}
  </g></g>

  <g clip-path="url(#st-above-ground)">
    <rect class="site-rain" x="-2400" y="-2200" width="6400" height="3600" fill="url(#st-drops)" opacity=".5"/>
  </g>
</svg>`;

const MASCOT_ART = `
<svg class="mascot-art" viewBox="0 0 110 140" aria-hidden="true">
  <rect x="48" y="44" width="14" height="88" rx="7" fill="#c98846"/>
  <rect x="48" y="112" width="14" height="20" rx="7" fill="#a86f3b"/>
  <path fill="none" stroke="#7f8e9b" stroke-width="6" stroke-linecap="round" d="M50 74Q34 76 26 88M60 74Q78 70 88 56"/>
  <rect x="10" y="8" width="90" height="46" rx="14" fill="#7f8e9b"/>
  <rect x="10" y="8" width="90" height="14" rx="7" fill="#9dacb8"/>
  <g class="mascot-eyes">
    <circle cx="40" cy="30" r="8" fill="#fff"/><circle cx="70" cy="30" r="8" fill="#fff"/>
    <circle cx="42" cy="31" r="3.6" fill="#22272e"/><circle cx="72" cy="31" r="3.6" fill="#22272e"/>
  </g>
  <path fill="none" stroke="#22272e" stroke-width="2.6" stroke-linecap="round" d="M47 43Q55 49 63 43"/>
</svg>`;

const LOREM = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor.';
const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consetetur sadipscing.';

const SCALES = [
  ['availability', 'Materialverfügbarkeit', 'Wie leicht bekommst du die Materialien im jeweiligen Land? Müssen sie importiert werden, oder sind sie lokal verfügbar?'],
  ['stability', 'Stabilität', 'Hält das Material dem Wasser stand, oder wird es beschädigt?'],
  ['flood', 'Flutschutz', 'Schützt deine Wahl das Haus vor dem Wasser, oder steht es bei der Flut im Haus?'],
];

// Kurzgesagt-Look: heller Tag, kräftige Farben und eigene Elemente mit eigener Bewegung.
function recolor(art, colors, { swaps = [], over = '' } = {}) {
  let out = art.replace(/#[0-9a-f]{6}/g, color => colors[color] || color);
  swaps.forEach(([from, to]) => { out = out.split(from).join(to); });
  return out.replace('</svg>', `${over}</svg>`);
}

// Dicke Wolke mit Schattenseite
function kgCloud(x, y, scale, cls = '', main = '#ffffff', shade = '#d6ecfa') {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><g class="kg-cloud ${cls}">
    <g fill="${main}"><circle cx="-46" cy="4" r="26"/><circle cx="-12" cy="-14" r="38"/><circle cx="32" cy="-4" r="30"/><circle cx="62" cy="8" r="20"/><rect x="-72" y="4" width="154" height="26" rx="13"/></g>
    <path fill="${shade}" d="M-72 18C-40 26 -6 14 22 22S70 22 82 16V17A13 13 0 0 1 69 30H-59A13 13 0 0 1 -72 17Z"/>
  </g></g>`;
}

// Sonne mit langsam kreisenden Strahlen
function kgSun(x, y, r) {
  const rays = Array.from({ length: 12 }, (_, i) =>
    `<rect x="-5" y="${-r - 34}" width="10" height="24" rx="5" transform="rotate(${i * 30})"/>`).join('');
  return `<g transform="translate(${x} ${y})"><g class="kg-rays" fill="#ffc53d">${rays}</g>
    <circle r="${r}" fill="#ffc53d"/><circle cx="${-r * 0.2}" cy="${-r * 0.2}" r="${r * 0.68}" fill="#ffdc6b"/></g>`;
}

// Kleine Vogelschar, die durchs Bild zieht
function kgBirds(y, cls, color = '#274472') {
  const bird = (x, dy, size) => `<g transform="translate(${x} ${dy}) scale(${size})"><path fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" d="M-16-3Q-8-13 0 0Q8-13 16-3"/></g>`;
  return `<g transform="translate(0 ${y})"><g class="kg-flock ${cls}">${bird(0, 0, 1)}${bird(-44, 20, .8)}${bird(38, 26, .75)}</g></g>`;
}

function kgRipples(points, cls = '') {
  return points.map(([x, y], i) =>
    `<ellipse class="kg-ripple kg-delay-${i % 3} ${cls}" cx="${x}" cy="${y}" rx="16" ry="4" fill="none" stroke="#ffffff" stroke-width="2.500"/>`).join('');
}

const KG_LAND = { '#3f7a46': '#10b981', '#6d5236': '#a0693c', '#5a8a45': '#14a866' };

const KG_BUILDING = {
  '#b5654a': '#f4693a', '#e3c7a8': '#ffd2b0', '#a9afb3': '#d7dfeb', '#858c90': '#a4b2c6', '#8b9296': '#a4b2c6',
  '#a47b52': '#c98a4a', '#c6a273': '#f0bd74', '#8a6541': '#a56b35', '#bda95f': '#f5cc4d', '#8e7c3e': '#c99a28',
  '#8a6542': '#b86a35',
};

// Fertiges Haus: Fluss mit Boot und Kreisen im Wasser, Vögel ziehen vorbei.
const KG_RIVER_BOAT = `<g transform="translate(0 786)"><g class="kg-boat">
  <path fill="#ffc53d" d="M-8 -12C-8 -30 28 -32 30 -12Z"/><path fill="#f4693a" d="M-30 -14C-8 -2 34 -2 52 -18C46 8 -18 12 -30 -14Z"/>
</g></g>`;

const KG_ARTS = new Map([
  [FLOOD_ART, FLOOD_KG_ART],
  [AVALANCHE_ART, AVALANCHE_KG_ART],
  [WILDFIRE_ART, WILDFIRE_KG_ART],
  [BUILD_ART, recolor(BUILD_ART, {
    '#bfe9cd': '#a6edc4', '#4cba74': '#39d08a', '#3aa363': '#1fb377', '#249a63': '#0fae7a', '#5c7186': '#4a6a94',
    '#3c4d5e': '#274472', '#2f9a5e': '#0fae7a', '#2f8a54': '#0d8f62', '#cd9c66': '#e8a55c', '#1d3b3a': '#0d6b52',
    '#ffb51f': '#ffb000', '#e89a10': '#ee8f00',
  }, {
    swaps: [[BUILD_SKY, `${kgSun(104, 126, 46)}${kgCloud(-40, 70, 1, '')}${kgCloud(300, 40, .7, 'kg-cloud-b')}`]],
    over: `${kgCloud(120, 160, .9, 'kg-cloud-b')}${kgCloud(420, 90, .55, '')}${kgBirds(250, 'kg-flock-wide')}`,
  })],
  [RIVER_ART, recolor(RIVER_ART, {
    ...KG_LAND,
    '#8fb56b': '#5fd97e', '#a4c67c': '#86e893', '#7ea65d': '#43c76d', '#b3cf88': '#a7f0a4', '#9dbf74': '#70de86',
    '#dcc892': '#ffe29c', '#7fc3da': '#7fdcfb', '#3f8fb2': '#1fb0f2', '#a9dcea': '#e6f9ff', '#4b3526': '#6d3a2a',
    '#d9b67c': '#ffc53d', '#c1553a': '#f4593a', '#8c9ba2': '#6a7fc2', '#b8693f': '#ff8a2b', '#e3c799': '#fff0cf',
    '#4f7a40': '#2fae66', '#6b9b58': '#17b873', '#5f9150': '#12a56c',
  }, {
    swaps: [[RIVER_CLOUDS, '']],
    over: `${kgRipples([[270, 192], [420, 350], [190, 500], [340, 660]])}
      ${kgCloud(120, 110, .9, '', '#ffffff', '#d6ecfa')}${kgCloud(380, 520, .7, 'kg-cloud-b', '#ffffff', '#d6ecfa')}
      ${kgBirds(280, 'kg-flock-small')}`,
  })],
  [FOUNDATION_ART, recolor(FOUNDATION_ART, {
    ...KG_LAND, ...KG_BUILDING,
    '#6d8ea6': '#5fb2ea', '#d3dfdb': '#d9f3ff', '#9db8a4': '#79d9a6', '#74a9bd': '#2fb6ea', '#c4e6ef': '#e6f9ff',
    '#8f6b49': '#b3773f', '#6b4e35': '#8a5630', '#7c5c3f': '#a06a38', '#7c9a55': '#3fd07f', '#24384a': '#17305e',
    '#ffffff': '#ffffff',
  }, {
    swaps: [[FD_CLOUDS, `${kgCloud(40, 120, 1.05, '', '#f2fbff', '#c9e3f4')}${kgCloud(380, 80, .8, 'kg-cloud-b', '#f2fbff', '#c9e3f4')}${kgCloud(520, 190, .6, '', '#f2fbff', '#c9e3f4')}${kgBirds(230, 'kg-flock-small')}`]],
    over: kgRipples([[-20, 470], [430, 468], [560, 472]]),
  })],
  [SITE_ART, recolor(SITE_ART, {
    ...KG_LAND, ...KG_BUILDING,
    '#e3ece5': '#b7efc9', '#c3d3c9': '#7fdba4', '#d2e0d6': '#9be9b3', '#a8bfb2': '#2fbf85', '#bfd3c5': '#6fe39a',
    '#6f9fb0': '#2fb6ea', '#c4dde5': '#e6f9ff', '#7f5f42': '#b3773f', '#6b4e35': '#94602f', '#6f9a62': '#3fd07f',
    '#8fb8cb': '#ffffff',
  }, {
    swaps: [['<rect x="-3000" y="810"', `${KG_RIVER_BOAT}${kgRipples([[180, 788], [420, 796], [1160, 790], [1320, 798]])}<rect x="-3000" y="810"`]],
    over: `${kgBirds(150, 'kg-flock-wide')}`,
  })],
]);

const SCENARIOS = [
  {
    id: 'avalanche', title: 'Lawine', subtitle: 'Alpen', art: AVALANCHE_ART, locked: true,
  },
  {
    id: 'flood',
    title: 'Überschwemmung',
    subtitle: 'Bangladesch',
    art: FLOOD_ART,
    briefArt: RIVER_ART,
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
        art: FOUNDATION_ART,
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
        art: FOUNDATION_ART,
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
        art: FOUNDATION_ART,
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
        art: FOUNDATION_ART,
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
    id: 'wildfire', title: 'Waldbrand', subtitle: 'Australien', art: WILDFIRE_ART, locked: true,
  },
];

// User-Testing: Name und Auswahl werden im Hintergrund an den Server geschickt (siehe server.js).
// Ohne Server (z. B. per Datei geöffnet) bleibt das Spiel trotzdem benutzbar.
const session = { id: '', name: '' };

function saveSession(finished = false) {
  if (!session.id) return;
  const choices = {};
  if (scenario) {
    scenario.steps.forEach((step, i) => {
      const o = chosenOption(i);
      if (o) choices[step.name] = { id: o.id || null, text: o.text };
    });
  }
  const body = JSON.stringify({
    id: session.id, name: session.name, scenario: scenario ? scenario.id : null,
    choices, ratings: scenario ? houseRatings() : null, page, finished,
  });
  fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    .catch(() => {});
}

const stage = document.getElementById('stage');
const progress = document.getElementById('progress');

// page index: -1 = Start, 0 = Auswahl, 1 = Challenge, 2..5 = Fragen, 6 = Haus, 7 = Simulation, 8 = Ergebnis
const HOUSE = 6, SIMULATION = 7, RESULT = 8;
const FLOOD_FADE_DELAY_MS = 1500, FLOOD_FADE_MS = 1300;
let page = -1, scenario = null, answers = [], cancelTransition = null;

// Aussehen: Beim Öffnen immer Kurzgesagt, per Kreis oben rechts wechselbar.
const LOOKS = [['original', 'Original'], ['kurzgesagt', 'Kurzgesagt']];
let look = 'kurzgesagt';

// Darstellung, per Taste E umschaltbar (siehe buildSettingsMenu).
const settings = { usage: 'real', info: 'inline', outcome: 'guided' };

function themed(art) {
  return look === 'kurzgesagt' ? KG_ARTS.get(art) || art : art;
}

function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const PAGE_NAMES = ['Szenario', 'Challenge', 'Fundament', 'Wand', 'Dach', 'Besonderheiten', 'Dein Haus', 'Simulation', 'Ergebnis'];
const dots = [], bars = [];

const lookButtons = [];

function setLook(value) {
  look = value;
  document.documentElement.dataset.look = value;
  lookButtons.forEach(([key, button]) => button.setAttribute('aria-pressed', String(key === value)));
}

function buildLookSwitch() {
  const box = el('div', 'look-switch');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Aussehen');
  LOOKS.forEach(([key, name]) => {
    const button = el('button', `look-dot look-${key}`);
    button.type = 'button';
    button.title = name;
    button.setAttribute('aria-label', name);
    button.onclick = () => {
      setLook(key);
      go(page);
    };
    lookButtons.push([key, button]);
    box.append(button);
  });
  document.querySelector('header').append(box);
  setLook(look);
}

function buildProgress() {
  PAGE_NAMES.forEach((name, i) => {
    if (i > 0) {
      const bar = el('div', 'bar');
      bars.push(bar);
      progress.append(bar);
    }
    const dot = el('button', 'dot');
    dot.type = 'button';
    dot.title = name;
    dot.setAttribute('aria-label', name);
    dot.onclick = () => {
      if (!scenario) scenario = SCENARIOS.find(s => !s.locked);
      go(i);
    };
    dots.push(dot);
    progress.append(dot);
  });
}

function renderProgress() {
  progress.hidden = page < 0;
  dots.forEach((dot, i) => {
    dot.classList.toggle('done', i < page);
    dot.classList.toggle('current', i === page);
    if (i === page) dot.setAttribute('aria-current', 'step');
    else dot.removeAttribute('aria-current');
  });
  bars.forEach((bar, i) => bar.classList.toggle('done', i < page));
}

function nav(onBack, onNext, nextLabel = 'Weiter', nextDisabled = false) {
  const n = el('div', 'nav');
  const back = el('button', 'btn ghost', 'Zurück');
  back.onclick = onBack;
  const next = el('button', 'btn', nextLabel);
  next.disabled = nextDisabled;
  next.onclick = onNext;
  n.append(back, next);
  return n;
}

function go(p) {
  if (cancelTransition) cancelTransition();
  cancelTransition = null;
  if (p !== RESULT) guided = null;
  page = p;
  render();
}

// Die neue Seite blendet nur ein, ohne sich zu bewegen.
function softArrival(ms = 1000) {
  stage.lastElementChild.style.animation = `fadein ${ms}ms ease`;
}

// Aktuelle Seite langsam ausblenden, dann die neue einblenden.
function softGo(nextPage, ms = 800) {
  const fades = [...stage.children].map(child =>
    child.animate({ opacity: [1, 0] }, { duration: ms, easing: 'ease-in-out', fill: 'forwards' }));
  const last = fades[fades.length - 1];
  last.onfinish = () => { go(nextPage); softArrival(); };
  cancelTransition = () => { last.onfinish = null; };
}

// Der Fluss wächst noch weiter, während die Seite schon ausblendet.
function playFlood(art, buttons, nextPage) {
  if (reducedMotion()) { go(nextPage); return; }
  buttons.querySelectorAll('button').forEach(b => { b.disabled = true; });
  buttons.classList.add('is-busy');
  const river = art.querySelector('.rv-river');
  art.style.setProperty('--flood-from', getComputedStyle(river).strokeWidth);
  art.classList.add('flooding');
  let fade = null;
  const timer = setTimeout(() => {
    fade = art.closest('.page').animate({ opacity: [1, 0] },
      { duration: FLOOD_FADE_MS, easing: 'ease-in-out', fill: 'forwards' });
    fade.onfinish = () => { go(nextPage); softArrival(); };
  }, FLOOD_FADE_DELAY_MS);
  cancelTransition = () => {
    clearTimeout(timer);
    if (fade) fade.onfinish = null;
  };
}

function chosenOption(i) {
  return answers[i] == null ? null : scenario.steps[i].options[answers[i]];
}

function optionOfKind(kind) {
  const index = scenario.steps.findIndex(step => step.kind === kind);
  return index < 0 ? null : chosenOption(index);
}

// Mittelwert aller bewerteten Antworten; Besonderheiten können einzelne Werte ändern
// (sets: fester Wert, boost: Aufschlag, boostWith: nur bei diesem Fundament). Der Brunnen hat bewusst keinen Wert.
function houseRatings() {
  const chosen = scenario.steps.map((_, i) => chosenOption(i)).filter(Boolean);
  const rated = chosen.map(o => o.ratings).filter(Boolean);
  const result = {};
  SCALES.forEach(([key]) => {
    const sum = rated.reduce((total, r) => total + r[key], 0);
    result[key] = rated.length ? Math.round(sum / rated.length) : 0;
    if (!rated.length) return;
    chosen.forEach(o => {
      if (o.sets && o.sets[key]) result[key] = o.sets[key];
      const foundation = optionOfKind('foundation');
      const applies = !o.boostWith || (foundation && foundation.id === o.boostWith);
      if (o.boost && o.boost[key] && applies) result[key] = Math.min(5, result[key] + o.boost[key]);
    });
  });
  return result;
}

// Überträgt die aktuelle Auswahl auf eine Hausgrafik.
function updateHouse(svg) {
  const foundation = optionOfKind('foundation');
  const extra = optionOfKind('extra');
  const wall = optionOfKind('wall');
  svg.dataset.wall = wall ? wall.id : '';
  const roof = optionOfKind('roof');
  svg.dataset.roof = roof && roof.id ? roof.id : '';
  svg.dataset.foundation = foundation ? foundation.id : '';
  svg.dataset.extra = extra && extra.id ? extra.id : '';
  svg.style.setProperty('--lift', `${foundation ? foundation.lift : 0}px`);
  svg.style.setProperty('--raise', `${extra && extra.raise ? extra.raise : 0}px`);
  return { foundation, extra };
}

// Hausgrafik als feste Bühne hinter der Seite.
function siteScene(backdrop, cls = '') {
  const scene = el('div', `site-scene ${cls}`);
  scene.innerHTML = themed(SITE_ART);
  backdrop.push(scene);
  return { svg: scene.firstElementChild, ...updateHouse(scene.firstElementChild) };
}

function partCard(step, i) {
  const option = chosenOption(i);
  const card = el('div', 'part');
  card.append(el('span', 'part-label', step.name),
    el('span', 'part-name', option ? option.text : 'Noch nicht gewählt'));
  if (option) card.append(el('span', 'part-info', option.info));
  return card;
}

// Ergebnis-Kasten: Was an der Wahl für dieses Szenario gut und was schlecht ist.
function verdictCard(step, i) {
  const option = chosenOption(i);
  const card = el('div', 'part');
  card.append(el('span', 'part-label', step.name),
    el('span', 'part-name', option ? option.text : 'Noch nicht gewählt'));
  if (option) {
    [['good', '+', 'Gut'], ['bad', '–', 'Schlecht']].forEach(([key, mark, label]) => {
      const row = el('span', `verdict verdict-${key}`);
      const sign = el('span', 'verdict-mark', mark);
      sign.title = label;
      sign.setAttribute('aria-label', label);
      row.append(sign, el('span', null, option[key]));
      card.append(row);
    });
  }
  return card;
}

function mascotFigure() {
  const figure = el('div', 'mascot-figure');
  figure.innerHTML = MASCOT_ART;
  return figure;
}

function scaleRow(label, value, info) {
  const row = el('div', 'scale');
  const head = el('div', 'scale-head');
  const title = el('span', 'scale-title');
  const help = el('button', 'scale-info', 'i');
  help.type = 'button';
  help.setAttribute('aria-label', `Was bedeutet ${label}? ${info}`);
  title.append(el('span', 'scale-label', label), help, el('span', 'scale-tip', info));
  head.append(title, el('span', 'scale-value', value ? `${value}/5` : '–'));
  const boxes = el('div', 'scale-boxes');
  boxes.setAttribute('role', 'img');
  boxes.setAttribute('aria-label', value ? `${label}: ${value} von 5` : `${label}: noch keine Bewertung`);
  for (let n = 1; n <= 5; n++) boxes.append(el('span', 'scale-box' + (n === value ? ' active' : '')));
  row.append(head, boxes);
  return row;
}

// Bauteil im Bild und Kasten heben sich beim Überfahren gegenseitig hervor.
// Reihenfolge wichtig: Das Dach liegt innerhalb von .fd-house.
const PART_ZONES = [
  { name: 'Besonderheit', hit: '.fd-extra, .fd-platform', glow: '.fd-extra, .fd-platform' },
  { name: 'Dach', hit: '.fd-roof, .fd-roofs', glow: '.fd-roof, .fd-roofpart' },
  { name: 'Wand', hit: '.fd-house', glow: '.fd-walls, .fd-door, .fd-window' },
  { name: 'Fundament', hit: '.fd-part', glow: '.fd-part' },
];

function linkPartsToCards(svg, cards) {
  const show = name => {
    Object.entries(cards).forEach(([key, card]) => card.classList.toggle('is-active', key === name));
    PART_ZONES.forEach(zone => svg.querySelectorAll(zone.glow).forEach(part =>
      part.classList.toggle('is-lit', zone.name === name)));
  };
  svg.addEventListener('pointerover', e => {
    const zone = PART_ZONES.find(({ hit }) => e.target.closest(hit));
    show(zone ? zone.name : null);
  });
  svg.addEventListener('pointerout', () => show(null));
  Object.entries(cards).forEach(([name, card]) => {
    card.addEventListener('pointerenter', () => show(name));
    card.addEventListener('pointerleave', () => show(null));
  });
}

// Seite vor der Simulation: Auswahl links, Haus rechts, Hammer und Button ganz rechts.
function renderHouse(wrap, backdrop) {
  wrap.classList.add('house');
  const main = el('div', 'house-main');
  main.append(el('h1', null, 'Dein fertiges Haus'));
  const parts = el('div', 'parts');
  const cards = {};
  scenario.steps.forEach((step, i) => {
    cards[step.name] = partCard(step, i);
    parts.append(cards[step.name]);
  });
  const back = el('button', 'btn ghost house-back', 'Zurück');
  back.onclick = () => go(HOUSE - 1);
  main.append(parts, back);
  wrap.append(main);

  const { svg } = siteScene(backdrop, 'site-right');
  linkPartsToCards(svg, cards);
  const mascot = el('div', 'mascot house-mascot');
  mascot.append(mascotFigure());
  const forward = el('button', 'btn house-go', 'Zur Simulation →');
  forward.onclick = () => go(SIMULATION);
  backdrop.push(mascot, forward);
}

// Linien von den Infokästen zu den Bauteilen; gemessen, damit sie bei jeder Fenstergröße treffen.
let drawPointers = () => {};
window.addEventListener('resize', () => drawPointers());
window.addEventListener('scroll', () => drawPointers(), { passive: true });

function pointerLines(svg, targets) {
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lines.setAttribute('class', 'outcome-lines');
  lines.setAttribute('aria-hidden', 'true');
  drawPointers = () => {
    if (!lines.isConnected) return;
    lines.innerHTML = targets.map(([card, selector]) => {
      const from = card.getBoundingClientRect();
      const to = svg.querySelector(selector).getBoundingClientRect();
      const x2 = to.left + to.width / 2, y2 = to.top + to.height / 2;
      const x1 = from.left < x2 ? from.right : from.left;
      const y1 = from.top + Math.min(36, from.height / 2);
      const d = `M${x1} ${y1}L${x2} ${y2}`;
      return `<path class="halo" d="${d}"/><path d="${d}"/><circle cx="${x2}" cy="${y2}" r="6"/>`;
    }).join('');
  };
  return lines;
}

// Ergebnis: Haus in der Mitte, links die Bauteile mit Zeigern, rechts die Wertung.
function renderOutcome(wrap, backdrop) {
  wrap.classList.add('outcome');
  saveSession(true);
  const { svg, foundation, extra } = siteScene(backdrop, 'site-first');

  const place = {
    Dach: ['left', '.pt-roof'], Wand: ['left', '.pt-wall'],
    Fundament: ['left', '.pt-base'], Besonderheit: ['right', '.pt-extra'],
  };
  const left = el('div', 'outcome-left');
  const right = el('div', 'outcome-right');
  const targets = [];
  const cards = {};
  scenario.steps.forEach((step, i) => {
    const card = verdictCard(step, i);
    card.classList.add('callout', `tone-${step.name.toLowerCase()}`);
    cards[step.name] = card;
    targets.push([card, place[step.name][1]]);
  });
  left.append(cards.Dach, cards.Wand, cards.Fundament);

  const ratings = houseRatings();
  const points = SCALES.reduce((sum, [key]) => sum + ratings[key], 0);
  const stats = el('div', 'outcome-stats');
  const score = el('div', 'score');
  score.append(el('span', 'score-number', points ? String(points) : '–'),
    el('span', 'score-total', `von ${SCALES.length * 5} Punkten`));
  const scales = el('div', 'scales');
  SCALES.forEach(([key, label, info]) => scales.append(scaleRow(label, ratings[key], info)));
  stats.append(score, scales);

  const talk = el('div', 'outcome-talk');
  const tip = (extra && extra.tip) || (foundation && foundation.tip)
    || 'Dein Haus ist noch nicht fertig. Sobald du alles ausgewählt hast, verrate ich dir mehr!';
  talk.append(mascotFigure(), el('p', 'bubble bubble-side', tip));

  const actions = el('div', 'outcome-actions');
  const fresh = el('button', 'btn ghost', 'Neues Szenario');
  fresh.onclick = () => { answers = []; go(0); };
  const again = el('button', 'btn', 'Wiederholen');
  again.onclick = () => { answers = []; go(1); };
  actions.append(fresh, again);

  right.append(stats, cards.Besonderheit, talk, actions);
  wrap.append(left, right);
  linkPartsToCards(svg, cards);

  backdrop.push(pointerLines(svg, targets));
  wrap.addEventListener('animationend', () => drawPointers());
}

// Geführte Ergebnis-Seite: Punkte zählen hoch, dann erklären Kreise am Haus Stärken und Schwächen, zum Schluss das Fazit.
// Die alte Fassung ist renderOutcome oben; Umschalten geht im Menü mit Taste E (settings.outcome).
const COUNT_MS = 3000, COUNT_HOLD_MS = 1800, COUNT_FLY_MS = 850;
const GOOD_FROM = 4, BAD_UP_TO = 2;
// Es geht ums Überstehen der Flut: Kreise und Fazit schauen nur auf diese beiden Werte.
const FLOOD_KEYS = ['stability', 'flood'];
const PART_SPOTS = { Dach: '.pt-roof', Wand: '.pt-wall', Fundament: '.pt-base', Besonderheit: '.pt-extra' };
const SPOT_KINDS = {
  good: { mark: '+', label: 'Das lief gut', text: 'good', test: v => v >= GOOD_FROM },
  bad: { mark: '!', label: 'Das lief nicht so gut', text: 'bad', test: v => v <= BAD_UP_TO },
};
// guided: Stand des Ablaufs. Bleibt beim Wechsel des Looks erhalten und wird beim Verlassen der Seite gelöscht.
let guided = null;

function scoreVerdict(points) {
  if (points >= 13) return { word: 'Bombenfest!', lead: `Ey, dein Haus hält! ${points} von 15 Punkten sind richtig stark.` };
  if (points >= 10) return { word: 'Ganz solide!', lead: `${points} von 15 Punkten: Dein Haus hält einiges aus, aber da geht noch was.` };
  if (points >= 7) return { word: 'Da geht noch was!', lead: `${points} von 15 Punkten. Das Haus steht, aber bei der nächsten Flut wird es ungemütlich.` };
  return { word: 'Ui, das wird nass!', lead: `Puh, nur ${points} von 15 Punkten. Die nächste Flut wird für dieses Haus richtig hart.` };
}

function partScores(option) {
  return option.ratings || option.scores || null;
}

// Bauteile, die für diese Runde einen Kreis bekommen. Ohne eigene Werte zählt der Text in beiden Runden.
function spotsFor(kind) {
  const config = SPOT_KINDS[kind];
  return scenario.steps.map((step, i) => {
    const option = chosenOption(i);
    if (!option) return null;
    const scores = partScores(option);
    const hits = scores ? SCALES.filter(([key]) => FLOOD_KEYS.includes(key) && config.test(scores[key])) : [];
    if (scores && !hits.length) return null;
    return { kind, step, option, chips: hits.map(([key, label]) => `${label} ${scores[key]}/5`) };
  }).filter(Boolean);
}

function rankedParts() {
  return scenario.steps
    .map((step, i) => ({ step, option: chosenOption(i) }))
    .filter(({ option }) => option && partScores(option))
    .map(item => ({ ...item, sum: FLOOD_KEYS.reduce((total, key) => total + partScores(item.option)[key], 0) }))
    .sort((a, b) => b.sum - a.sum);
}

// Fazit-Karte: Urteil, Punkte, Stärke, Schwäche und eine Einladung zur nächsten Runde.
function conclusionCard(points, onClose) {
  const max = SCALES.length * 5;
  const verdict = scoreVerdict(points);
  const card = el('div', 'fazit-card');
  card.style.setProperty('--fazit-tone', `hsl(${Math.round((points / max) * 125)} 70% 40%)`);
  const close = el('button', 'spot-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fazit schließen');
  close.onclick = onClose;
  const head = el('div', 'fazit-head');
  const titles = el('div');
  titles.append(el('span', 'fazit-kicker', 'Dein Fazit'), el('strong', 'fazit-word', verdict.word));
  const badge = el('span', 'fazit-score');
  badge.append(el('b', null, String(points)), el('small', null, `/${max}`));
  head.append(titles, badge);
  card.append(close, head, el('p', 'fazit-lead', verdict.lead));
  const ranked = rankedParts();
  const row = (kind, label, item, text) => {
    const line = el('div', `fazit-row fazit-row-${kind}`);
    const body = el('div');
    body.append(el('span', 'fazit-label', label), el('strong', 'fazit-part', `${item.step.name}: ${item.option.text}`));
    if (text) body.append(el('p', 'fazit-text', text));
    line.append(el('span', 'fazit-icon', kind === 'good' ? '+' : '!'), body);
    card.append(line);
  };
  if (ranked.length) row('good', 'Am stärksten', ranked[0], ranked[0].option.good);
  if (ranked.length > 1) {
    const worst = ranked[ranked.length - 1];
    row('bad', 'Luft nach oben', worst, worst.option.tip || worst.option.bad);
  }
  const footer = el('div', 'fazit-footer');
  const back = el('button', 'btn', 'Zurück zur Ergebnisübersicht');
  back.type = 'button';
  back.onclick = onClose;
  const choices = el('div', 'fazit-choices');
  choices.append(back);
  footer.append(choices);
  card.append(footer);
  return card;
}

// Sprechblase füllt sich Buchstabe für Buchstabe. Der Rest steht unsichtbar schon da, damit nichts springt.
const TYPE_MS = 26;
function typeText(target, text, delay = 0) {
  if (target.dataset.text === text) return;
  target.dataset.text = text;
  target.setAttribute('aria-label', text);
  const token = {};
  target.typing = token;
  const shown = el('span', 'typing-shown');
  const rest = el('span', 'typing-rest', text);
  rest.setAttribute('aria-hidden', 'true');
  target.replaceChildren(shown, rest);
  if (reducedMotion()) { shown.textContent = text; rest.textContent = ''; return; }
  let count = 0;
  const step = () => {
    if (target.typing !== token || !target.isConnected) return;
    count = Math.min(text.length, count + (text.length > 120 ? 2 : 1));
    shown.textContent = text.slice(0, count);
    rest.textContent = text.slice(count);
    if (count < text.length) setTimeout(step, TYPE_MS);
  };
  setTimeout(step, delay);
}

function renderGuidedOutcome(wrap, backdrop) {
  wrap.classList.add('guided');
  saveSession(true);
  if (!guided) guided = { phase: 'intro', seen: new Set(), forced: new Set() };
  const { svg } = siteScene(backdrop, 'site-first');
  const ratings = houseRatings();
  const points = SCALES.reduce((sum, [key]) => sum + ratings[key], 0);

  // Hammer oben links
  const hammer = el('div', 'guided-hammer');
  const figure = mascotFigure();
  const speech = el('div', 'guided-speech');
  const bubble = el('p', 'bubble bubble-side');
  const nextButton = el('button', 'btn guided-next');
  nextButton.type = 'button';
  // Freie Ansicht nach dem Fazit: Gutes, Schlechtes und Fazit beliebig oft, ohne Sperren.
  const review = el('div', 'review-tabs');
  review.setAttribute('role', 'group');
  review.setAttribute('aria-label', 'Nochmal ansehen');
  const reviewButtons = [['good', 'Gutes'], ['bad', 'Schlechtes'], ['fazit', 'Fazit']].map(([key, label]) => {
    const b = el('button', `review-tab review-${key}`, label);
    b.type = 'button';
    b.onclick = () => {
      if (key === 'fazit') { enterPhase('fazit'); return; }
      guided.view = guided.view === key ? null : key;
      buildSpots(guided.view);
      updateSpeech();
    };
    review.append(b);
    return [key, b];
  });
  speech.append(bubble, nextButton, review);
  hammer.append(figure, speech);

  // Wertung und Buttons rechts
  const right = el('div', 'guided-right');
  const stats = el('div', 'outcome-stats');
  const score = el('div', 'score');
  const scoreNumber = el('span', 'score-number', points ? String(points) : '–');
  score.append(scoreNumber, el('span', 'score-total', `von ${SCALES.length * 5} Punkten`));
  const scales = el('div', 'scales');
  SCALES.forEach(([key, label, info]) => scales.append(scaleRow(label, ratings[key], info)));
  stats.append(score, scales);
  const actions = el('div', 'outcome-actions');
  const fresh = el('button', 'btn ghost', 'Neues Szenario');
  fresh.onclick = () => { answers = []; go(0); };
  const again = el('button', 'btn', 'Wiederholen');
  again.onclick = () => { answers = []; go(1); };
  actions.append(fresh, again);
  right.append(stats, actions);
  wrap.append(hammer, right);

  // Kreise und Erklärkarte liegen über dem Haus
  const layer = el('div', 'spot-layer');
  backdrop.push(layer);
  let spots = [], openCard = null;

  const light = name => {
    PART_ZONES.forEach(zone => svg.querySelectorAll(zone.glow).forEach(part =>
      part.classList.toggle('is-lit', zone.name === name)));
  };
  const closeCard = () => {
    if (openCard) openCard.remove();
    openCard = null;
    spots.forEach(item => item.button.classList.remove('is-open'));
    light(null);
  };
  const placeCard = (card, button) => {
    const b = button.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;
    const toLeft = b.left + b.width / 2 < window.innerWidth / 2;
    const x = toLeft ? b.left - w - 18 : b.right + 18;
    const margin = 12;
    card.style.left = `${Math.max(margin, Math.min(window.innerWidth - w - margin, x))}px`;
    card.style.top = `${Math.max(margin, Math.min(window.innerHeight - h - margin, b.top + b.height / 2 - h / 2))}px`;
  };
  const placeSpots = () => {
    if (!layer.isConnected) return;
    spots.forEach(({ button, step }) => {
      const r = svg.querySelector(PART_SPOTS[step.name]).getBoundingClientRect();
      button.style.left = `${r.left + r.width / 2}px`;
      button.style.top = `${r.top + r.height / 2}px`;
    });
    if (openCard) placeCard(openCard.card, openCard.button);
  };
  const anySeen = () => spots.some(item => guided.seen.has(`${item.kind}:${item.step.name}`));
  const allSeen = () => spots.every(item => guided.seen.has(`${item.kind}:${item.step.name}`));
  let speechDelay = 0;
  const say = text => { typeText(bubble, text, speechDelay); speechDelay = 0; };
  let fazit = null;
  const closeFazit = () => {
    if (fazit) fazit.remove();
    fazit = null;
  };
  // Der Hammer wandert in die Mitte, daneben erscheint die Fazit-Karte.
  const openFazit = () => {
    closeFazit();
    fazit = el('div', 'fazit');
    const inner = el('div', 'fazit-inner');
    const big = mascotFigure();
    big.classList.add('fazit-figure');
    // Schließen geht über ×, den Button unten oder einen Klick neben die Karte; danach ist alles frei ansehbar.
    const toReview = () => enterPhase('review');
    inner.append(big, conclusionCard(points, toReview));
    const veil = el('div', 'fazit-veil');
    fazit.addEventListener('click', e => { if (e.target === fazit || e.target === veil || e.target === inner) toReview(); });
    fazit.append(veil, inner);
    layer.append(fazit);
    if (!reducedMotion()) {
      const from = figure.getBoundingClientRect(), to = big.getBoundingClientRect();
      if (from.width) {
        big.animate([
          { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` },
          { transform: 'translate(0, -40px) rotate(-8deg)', offset: 0.7 },
          { transform: 'none' },
        ], { duration: 900, easing: 'cubic-bezier(.4, 0, .2, 1)' });
      }
    }
  };

  // Der Weiter-Button erscheint nach dem ersten Kreis blass und gestrichelt; farbig wird er, wenn alle Kreise
  // angesehen sind oder wenn man ihn trotzdem einmal anklickt.
  const PHASE_TEXT = {
    good: {
      button: 'Was lief nicht so gut? →', color: 'grünen',
      none: 'Hmm, richtig stark war diesmal kein Bauteil. Sollen wir mal schauen, was nicht so gut gelaufen ist?',
      start: 'Okay, dann schauen wir uns mal an, was gut gelaufen ist. Klick auf die grünen Kreise!',
      done: 'Stark! Sollen wir mal schauen, was nicht so gut gelaufen ist?',
    },
    bad: {
      button: 'Zum Fazit →', color: 'roten',
      none: 'Kaum zu glauben: Hier gibt es nichts zu meckern! Wenn du bereit bist, zeig ich dir dein Fazit.',
      start: 'Das tut jetzt kurz weh. Klick auf die roten Kreise!',
      done: 'Kein Stress, schau dir ruhig alles in Ruhe an. Wenn du bereit bist, zeig ich dir dein Fazit.',
    },
  };
  const isLocked = () => spots.length > 0 && !allSeen() && !guided.forced.has(guided.phase);
  function updateSpeech() {
    const phase = guided.phase;
    wrap.classList.toggle('is-fazit', phase === 'fazit');
    review.hidden = phase !== 'review';
    if (phase === 'review') {
      nextButton.hidden = true;
      reviewButtons.forEach(([key, b]) => b.setAttribute('aria-pressed', String(guided.view === key)));
      say('Willst du dir die einzelnen Punkte nochmal anschauen? Klick einfach, was dich interessiert.');
      return;
    }
    const words = PHASE_TEXT[phase];
    if (!words) { nextButton.hidden = true; return; }
    nextButton.textContent = words.button;
    nextButton.hidden = spots.length > 0 && !anySeen();
    nextButton.classList.toggle('is-locked', isLocked());
    nextButton.setAttribute('aria-label', isLocked() ? `${words.button.replace(' →', '')} (erst die anderen Kreise ansehen)` : words.button.replace(' →', ''));
    if (!spots.length) say(words.none);
    else if (allSeen()) say(words.done);
    else if (anySeen()) say(`Stark! Schau dir auch noch die anderen ${words.color} Kreise an.`);
    else say(words.start);
  }
  const showCard = item => {
    const wasOpen = openCard && openCard.button === item.button;
    closeCard();
    if (wasOpen) return;
    const config = SPOT_KINDS[item.kind];
    const card = el('div', `spot-card spot-card-${item.kind}`);
    card.setAttribute('role', 'status');
    const close = el('button', 'spot-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Schließen');
    close.onclick = closeCard;
    card.append(close, el('span', 'spot-kicker', config.label),
      el('strong', 'spot-title', `${item.step.name}: ${item.option.text}`),
      el('p', 'spot-text', item.option[config.text]));
    if (item.chips.length) {
      const chips = el('div', 'spot-chips');
      item.chips.forEach(chip => chips.append(el('span', 'spot-chip', chip)));
      card.append(chips);
    }
    layer.append(card);
    openCard = { card, button: item.button, remove: () => card.remove() };
    item.button.classList.add('is-open', 'is-seen');
    item.button.querySelector('.spot-mark').textContent = '✓';
    guided.seen.add(`${item.kind}:${item.step.name}`);
    placeCard(card, item.button);
    light(item.step.name);
    updateSpeech();
  };
  const buildSpots = kind => {
    closeCard();
    spots.forEach(item => item.button.remove());
    spots = (kind ? spotsFor(kind) : []).map((item, index) => {
      const seen = guided.seen.has(`${item.kind}:${item.step.name}`);
      const button = el('button', `spot spot-${kind}${seen ? ' is-seen' : ''}`);
      button.type = 'button';
      button.style.setProperty('--spot-delay', `${index * 120}ms`);
      button.setAttribute('aria-label', `${SPOT_KINDS[kind].label}: ${item.step.name} ansehen`);
      button.append(el('span', 'spot-mark', seen ? '✓' : SPOT_KINDS[kind].mark));
      const entry = { ...item, button };
      button.onclick = e => { e.stopPropagation(); showCard(entry); };
      layer.append(button);
      return entry;
    });
    placeSpots();
  };
  const enterPhase = phase => {
    guided.phase = phase;
    buildSpots(phase === 'good' || phase === 'bad' ? phase : phase === 'review' ? guided.view : null);
    updateSpeech();
    if (phase === 'fazit') openFazit(); else closeFazit();
  };
  nextButton.onclick = () => {
    if (isLocked()) {
      // Erst nachfragen, danach darf man trotzdem weiter.
      guided.forced.add(guided.phase);
      nextButton.classList.remove('is-locked');
      mascotHop(figure);
      const left = spots.filter(item => !guided.seen.has(`${item.kind}:${item.step.name}`)).length;
      say(`Willst du wirklich schon weitermachen? Schau dir doch noch ${left === 1 ? 'den anderen Punkt' : 'die anderen Punkte'} an!`);
      return;
    }
    enterPhase(guided.phase === 'good' ? 'bad' : 'fazit');
  };
  const closeOutside = e => {
    if (!layer.isConnected) { document.removeEventListener('click', closeOutside); return; }
    if (openCard && !openCard.card.contains(e.target)) closeCard();
  };
  document.addEventListener('click', closeOutside);
  drawPointers = placeSpots;
  wrap.addEventListener('animationend', placeSpots);

  // Nach dem Hochzählen fliegt der Hammer herein, die Blase geht auf und der Text tippt sich.
  const reveal = () => {
    wrap.classList.remove('is-waiting');
    if (!reducedMotion()) {
      figure.animate([
        { transform: 'translate(-70vw, -40px) rotate(-540deg) scale(.6)' },
        { transform: 'translate(20px, -24px) rotate(10deg) scale(1.08)', offset: 0.75 },
        { transform: 'none' },
      ], { duration: 950, easing: 'cubic-bezier(.3, .8, .4, 1)' });
      speech.animate([
        { opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.05)', offset: 0.7 }, { opacity: 1, transform: 'none' },
      ], { duration: 450, delay: 800, easing: 'ease-out', fill: 'backwards' });
      speechDelay = 1200;
    }
    enterPhase('good');
  };
  if (guided.phase !== 'intro') {
    queueMicrotask(() => enterPhase(guided.phase));
  } else if (!points || reducedMotion()) {
    queueMicrotask(reveal);
  } else {
    wrap.classList.add('is-waiting');
    backdrop.push(scoreIntro(points, scoreNumber, reveal));
  }
}

// Vorspann: Die Zahl zählt erst langsam, dann immer schneller hoch und fliegt danach an ihren Platz.
function scoreIntro(points, target, done) {
  const max = SCALES.length * 5;
  const box = el('div', 'score-intro');
  const shade = el('div', 'score-intro-bg');
  const content = el('div', 'score-intro-content');
  const title = el('h1', 'score-intro-title', 'Wie schlägt sich dein Haus?');
  const row = el('div', 'score-intro-row');
  const number = el('span', 'score-intro-number', '0');
  const outOf = el('span', 'score-intro-max', `/${max}`);
  row.append(number, outOf);
  const pips = el('div', 'score-intro-pips');
  for (let i = 0; i < max; i++) pips.append(el('span', 'score-intro-pip'));
  const word = el('p', 'score-intro-word', scoreVerdict(points).word);
  content.append(title, row, pips, word);
  const skipHint = el('span', 'score-intro-skip', 'Klicken zum Überspringen');
  box.append(shade, content, skipHint);

  const hue = value => `hsl(${Math.round((value / max) * 125)} 75% 42%)`;
  const showValue = value => {
    number.textContent = String(value);
    number.style.color = hue(value);
    [...pips.children].forEach((pip, i) => {
      pip.classList.toggle('is-on', i < value);
      pip.style.background = i < value ? hue(value) : '';
    });
    number.animate([{ transform: 'scale(1.32)' }, { transform: 'scale(1)' }], { duration: 170, easing: 'ease-out' });
  };
  const timers = [];
  // Wurzel: Die ersten Schritte liegen weit auseinander, gegen Ende folgen sie immer dichter.
  for (let value = 1; value <= points; value++) {
    timers.push(setTimeout(() => showValue(value), COUNT_MS * Math.sqrt(value / points)));
  }

  const confetti = () => {
    const colors = ['#ff8a1f', '#ffc53d', '#39d08a', '#1fb0f2', '#f4593a'];
    for (let i = 0; i < 26; i++) {
      const piece = el('span', 'score-intro-confetti');
      piece.style.background = colors[i % colors.length];
      content.append(piece);
      const angle = (i / 26) * Math.PI * 2, far = 150 + (i * 37) % 170;
      const animation = piece.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * far}px, ${Math.sin(angle) * far + 70}px) rotate(${i * 67}deg)`, opacity: 0 },
      ], { duration: 950 + (i * 23) % 300, easing: 'cubic-bezier(.15, .7, .3, 1)' });
      animation.onfinish = () => piece.remove();
    }
  };

  const fly = () => {
    if (!box.isConnected) return;
    target.style.visibility = 'hidden';
    const from = number.getBoundingClientRect(), to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const size = to.height / from.height;
    const fade = { duration: COUNT_FLY_MS * 0.55, fill: 'forwards', easing: 'ease-out' };
    [title, pips, word, outOf].forEach(part => part.animate({ opacity: [1, 0] }, fade));
    shade.animate({ opacity: [1, 0] }, { duration: COUNT_FLY_MS, fill: 'forwards' });
    box.style.pointerEvents = 'none';
    done();
    const flight = number.animate([
      { transform: 'none', color: number.style.color },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 30}px) scale(${(1 + size) / 2})`, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${size})`, color: getComputedStyle(target).color },
    ], { duration: COUNT_FLY_MS, easing: 'cubic-bezier(.5, 0, .3, 1)', fill: 'forwards' });
    flight.onfinish = () => {
      target.style.visibility = '';
      box.remove();
    };
  };
  let finished = false;
  const finish = () => {
    if (finished || !box.isConnected) return;
    finished = true;
    timers.forEach(clearTimeout);
    showValue(points);
    word.classList.add('is-on');
    skipHint.remove();
    number.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
    confetti();
    setTimeout(fly, COUNT_HOLD_MS);
  };
  timers.push(setTimeout(finish, COUNT_MS + 120));
  box.onclick = finish;
  return box;
}

function render() {
  guideStop();
  renderProgress();
  const wrap = el('div', 'page');
  const backdrop = [];
  if (page < 0) {
    wrap.classList.add('start');
    const main = el('div', 'start-main');
    const title = el('h1');
    title.append('Kannst du das perfekte', el('br'), 'Haus bauen?');
    const begin = el('button', 'btn btn-big', 'Los geht’s');
    const nameField = el('input', 'name-input');
    nameField.type = 'text';
    nameField.placeholder = 'Dein Name';
    nameField.maxLength = 60;
    nameField.autocomplete = 'off';
    nameField.setAttribute('aria-label', 'Dein Name');
    nameField.value = session.name;
    begin.disabled = !nameField.value.trim();
    const start = () => {
      const name = nameField.value.trim();
      if (!name) return;
      // Jeder Start ist ein neuer Durchlauf mit eigener ID, damit gleiche Namen sich nie überschreiben.
      session.name = name;
      session.id = (crypto.randomUUID && crypto.randomUUID()) || `s${Date.now()}${Math.random().toString(16).slice(2)}`;
      answers = [];
      scenario = null;
      saveSession();
      softGo(0);
    };
    nameField.oninput = () => { begin.disabled = !nameField.value.trim(); };
    nameField.onkeydown = e => { if (e.key === 'Enter') start(); };
    begin.onclick = start;
    const entry = el('div', 'start-entry');
    entry.append(nameField, begin);
    main.append(title, entry);
    const art = el('div', 'start-art');
    art.innerHTML = themed(BUILD_ART);
    // Unsichtbare Abkürzung für uns: weiter ohne Namen. Ohne session.id wird nichts gespeichert,
    // darum landen solche Durchläufe nicht in den Testdaten.
    const skip = el('button', 'name-skip');
    skip.type = 'button';
    skip.append(el('span', 'name-skip-label', 'Ohne Namen weiter →'));
    skip.tabIndex = -1;
    skip.setAttribute('aria-label', 'Ohne Namen weiter');
    skip.onclick = () => {
      session.id = '';
      session.name = '';
      answers = [];
      scenario = null;
      softGo(0);
    };
    backdrop.push(art, skip);
    wrap.append(main);
  } else if (page === 0) {
    wrap.classList.add('select');
    wrap.append(el('h1', null, 'Wähle dein Szenario'));
    const row = el('div', 'scenario-row');
    SCENARIOS.forEach(s => {
      // Gesperrte Szenarien zeigen nur ihre Grafik und lassen sich nicht auswählen.
      const card = el(s.locked ? 'div' : 'button', s.locked ? 'scenario is-locked' : 'scenario');
      card.innerHTML = themed(s.art);
      const label = el('span', 'scenario-label');
      label.append(el('span', 'scenario-title', s.title), el('span', 'scenario-sub', s.subtitle));
      card.append(label);
      if (!s.locked) {
        card.type = 'button';
        card.onclick = () => {
          if (scenario !== s) answers = [];
          scenario = s;
          saveSession();
          softGo(1);
        };
      }
      row.append(card);
    });
    wrap.append(row);
  } else if (page === 1) {
    wrap.classList.add('split', 'brief');
    const text = el('div', 'split-main');
    text.append(
      el('p', 'eyebrow', `${scenario.title} · ${scenario.subtitle}`),
      el('h1', null, 'Challenge'),
      el('p', 'challenge-context', scenario.challenge.context),
      el('p', 'challenge-task', scenario.challenge.task),
    );
    const facts = el('dl', 'facts');
    scenario.facts.forEach(f => {
      const fact = el('div', 'fact');
      const value = el('dd');
      value.append(el('span', 'fact-value', f.value), el('span', 'fact-detail', f.detail));
      fact.append(el('dt', null, f.label), value);
      facts.append(fact);
    });
    text.append(facts);
    const art = el('div', 'split-art');
    art.innerHTML = themed(scenario.briefArt);
    if (reducedMotion()) art.firstElementChild.pauseAnimations();
    const buttons = nav(() => go(0), () => playFlood(art.firstElementChild, buttons, 2), 'Losbauen →');
    wrap.append(text, art, buttons);
  } else if (page <= 5) {
    const i = page - 2, step = scenario.steps[i];
    const list = el('div', 'cards');
    const next = nav(() => go(page - 1), () => go(page + 1), 'Weiter', answers[i] == null);
    wrap.classList.add('split', 'choose');
    const main = el('div', 'split-main');
    main.append(el('p', 'eyebrow', `Schritt ${i + 1} von ${scenario.steps.length}`),
      el('h1', null, step.question), list);
    const gauge = usageGauge();
    gauge.show(chosenOption(i), scenario.region);
    main.append(gauge.box);
    const art = el('div', 'split-art');
    art.innerHTML = themed(step.art);
    const preview = art.firstElementChild;
    updateHouse(preview);
    const guide = artMascot(art);
    backdrop.push(guide.box);
    wrap.append(main, art);
    step.options.forEach((o, j) => {
      const b = el('button', 'option' + (answers[i] === j ? ' selected' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(answers[i] === j));
      const detail = el('span', 'option-detail');
      const clip = el('span', 'option-clip');
      clip.append(el('span', 'option-info', o.info));
      detail.append(clip);
      const icon = el('span', 'info-btn option-i', 'i');
      icon.setAttribute('role', 'button');
      icon.tabIndex = 0;
      icon.setAttribute('aria-label', `Mehr zu ${o.text}`);
      const toggleInfo = e => { e.preventDefault(); e.stopPropagation(); b.classList.toggle('info-open'); };
      icon.onclick = toggleInfo;
      icon.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') toggleInfo(e); };
      b.append(el('span', 'option-title', o.text), icon, detail);
      b.onclick = () => {
        answers[i] = j;
        list.querySelectorAll('.option').forEach((x, k) => {
          x.classList.toggle('selected', k === j);
          x.setAttribute('aria-pressed', String(k === j));
        });
        next.lastChild.disabled = false;
        updateHouse(preview);
        gauge.show(o, scenario.region);
        guide.react(o, b);
        saveSession();
      };
      list.append(b);
    });
    wrap.append(next);
  } else if (page === HOUSE) {
    renderHouse(wrap, backdrop);
  } else if (page === SIMULATION) {
    wrap.append(el('h1', null, 'Simulation'),
      el('p', 'text', 'Hier kommt bald die Flut-Simulation mit deinem Haus.'),
      nav(() => go(HOUSE), () => go(RESULT), 'Zum Ergebnis →'));
  } else {
    if (settings.outcome === 'classic') renderOutcome(wrap, backdrop);
    else renderGuidedOutcome(wrap, backdrop);
  }
  stage.replaceChildren(...backdrop, wrap);
  drawPointers();
  window.scrollTo(0, 0);
}

// Ring mit dem Anteil der Haushalte vor Ort, die genau diese Option nutzen.
// Daten: usage: { real: Eintrag, material?: Eintrag } an der Option. Ein Eintrag hat
// value (Prozent), kind ('measured' | 'estimate' | 'none' | 'fact'), info (Hinweis hinter dem i), optional label,
// note (eigener Satz neben dem Ring) und line.
// Fehlt usage, gibt es noch keine Daten. Ohne material zeigt auch die Materialansicht den realen Wert.
const RING_R = 47, RING_LEN = 2 * Math.PI * RING_R;

function usageGauge() {
  const box = el('div', 'usage');
  const ring = el('div', 'usage-ringbox');
  ring.innerHTML = `<svg class="usage-ring" viewBox="0 0 110 110" aria-hidden="true">
    <defs><linearGradient id="usage-grad" x1="0" y1="0" x2="1" y2="1">
      <stop class="usage-stop-a" offset="0"/><stop class="usage-stop-b" offset="1"/>
    </linearGradient></defs>
    <circle class="usage-disc" cx="55" cy="55" r="40"/>
    <circle class="usage-track" cx="55" cy="55" r="${RING_R}"/>
    <circle class="usage-arc" cx="55" cy="55" r="${RING_R}" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN}" transform="rotate(-90 55 55)"/>
  </svg>`;
  const number = el('span', 'usage-number');
  ring.append(number);
  const text = el('p', 'usage-text');
  text.setAttribute('aria-live', 'polite');
  const help = el('button', 'info-btn usage-i', 'i');
  help.type = 'button';
  help.hidden = true;
  const pop = el('span', 'usage-pop');
  pop.setAttribute('role', 'tooltip');
  help.onclick = () => box.classList.toggle('is-pop');
  const side = el('div', 'usage-side');
  side.append(text, help, pop);
  box.append(ring, side);
  const arc = ring.querySelector('.usage-arc');
  return {
    box,
    show(option, region) {
      const u = option && option.usage;
      const entry = u && ((settings.usage === 'material' && u.material) || u.real);
      const value = entry ? entry.value : 0;
      box.classList.remove('is-pop');
      number.replaceChildren();
      if (entry && entry.kind === 'estimate' && !entry.label) number.append(el('small', null, 'ca.'));
      if (!entry) number.append(el('span', 'usage-value', '–'));
      else if (entry.label) number.append(el('span', 'usage-value usage-value-label', entry.label));
      else {
        const shown = el('span', 'usage-value', value.toLocaleString('de-DE', { maximumFractionDigits: 1 }));
        shown.append(el('span', 'usage-percent', '%'));
        number.append(shown);
      }
      arc.style.strokeDashoffset = RING_LEN * (1 - value / 100);
      const main = !option ? 'Wähle eine Option.'
        : !entry ? 'Keine Daten'
        : entry.note || entry.line || `der Haushalte in ${region} bauen so`;
      text.replaceChildren(el('strong', 'usage-main', main));
      if (entry && entry.line) text.append(el('span', 'usage-sub', `der Wände in ${region} bestehen aus diesem Material`));
      text.title = text.textContent;
      pop.textContent = (entry && entry.info) || '';
      help.hidden = !(entry && entry.info);
      help.setAttribute('aria-label', `Woher kommt die Zahl? ${pop.textContent}`);
    },
  };
}
document.addEventListener('click', e => {
  document.querySelectorAll('.usage.is-pop').forEach(box => { if (!box.contains(e.target)) box.classList.remove('is-pop'); });
});

// Menü mit Taste E: Darstellung der Prozentanzeige und der Infos unter den Optionen.
// Reihenfolge wie auf der Seite: erst der Text unter den Auswahlmöglichkeiten, dann der Prozentring darunter.
const SETTING_ROWS = [
  ['outcome', 'Ergebnis-Seite', [
    ['guided', 'Geführt (neu)', 'Punkte zählen hoch, danach führt der Hammer mit Kreisen am Haus zum Fazit.'],
    ['classic', 'Kästen mit Linien (alt)', 'Alle Infos stehen sofort in Kästen, gestrichelte Linien zeigen aufs Haus.'],
  ]],
  ['info', 'Text unter den Auswahlmöglichkeiten', [
    ['inline', 'Immer aufgeklappt', 'Der Text steht direkt unter der gewählten Option, zum Beispiel unter „Lehmwand“.'],
    ['icon', 'Hinter dem i-Symbol', 'Der Text öffnet sich erst, wenn du rechts im Kasten auf das i klickst.'],
  ]],
  ['usage', 'Prozentring unten: Welche Zahl wird gezeigt?', [
    ['real', 'Genau diese Wand (teils geschätzt)', 'Anteil dieser Wandart. Bei verputzter Ziegelwand und Ferrozement ist die Zahl geschätzt.'],
    ['material', 'Hauptmaterial (gemessen)', 'Zement, Beton, Ziegel und Terrakotta zusammen, so wie der Zensus sie zählt. Wellblech und Lehm bleiben gleich.'],
  ]],
];

function buildSettingsMenu() {
  const menu = el('div', 'settings');
  menu.hidden = true;
  const panel = el('div', 'settings-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Ansicht');
  panel.append(el('h2', null, 'Ansicht'));
  const buttons = [];
  SETTING_ROWS.forEach(([key, label, choices]) => {
    const group = el('div', 'settings-row');
    const row = el('div', 'settings-choices');
    choices.forEach(([value, name, description]) => {
      const b = el('button', 'settings-choice');
      b.type = 'button';
      b.append(el('span', 'settings-choice-name', name), el('span', 'settings-choice-note', description));
      b.onclick = () => {
        settings[key] = value;
        sync();
        if ((page >= 2 && page <= 5) || page === RESULT) go(page);
      };
      buttons.push([key, value, b]);
      row.append(b);
    });
    group.append(el('h3', 'settings-label', label), row);
    panel.append(group);
  });
  const data = el('a', 'settings-choice settings-link', 'Testdaten ansehen (wer hat was gewählt)');
  data.href = '/results';
  data.target = '_blank';
  data.rel = 'noopener';
  panel.append(data);
  panel.append(el('p', 'settings-close', 'E oder Esc schließt das Menü'));
  menu.append(panel);
  document.body.append(menu);

  function sync() {
    buttons.forEach(([key, value, b]) => b.setAttribute('aria-pressed', String(settings[key] === value)));
    document.documentElement.dataset.info = settings.info;
  }
  let opener = null;
  const toggle = open => {
    menu.hidden = !open;
    if (open) { opener = document.activeElement; buttons[0][2].focus(); } else if (opener) opener.focus();
  };
  menu.addEventListener('click', e => { if (e.target === menu) toggle(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { toggle(false); return; }
    if (e.key.toLowerCase() !== 'e' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    toggle(menu.hidden);
  });
  sync();
}

// Der Hammer sitzt oben rechts im Bild. Bei einem Klick geht er zum angeklickten Kasten links, sagt etwas dazu und
// kehrt nach einer Weile zurück. Nach längerer Ruhe gibt er einmal den Tipp zur Auswahl.
const GUIDE_FIG = 84, GUIDE_BUBBLE_W = 230, GUIDE_SETTLE_MS = 950, GUIDE_BACK_MS = 2500, GUIDE_IDLE_MS = 25000;
// Lesezeit: Der kurze Text bleibt lange genug stehen, um ihn in Ruhe zu lesen.
const readTime = text => 8000 + (text || '').length * 60;
let guideTimers = [], guideRefresh = () => {};
window.addEventListener('resize', () => guideRefresh());

function guideStop() {
  guideTimers.forEach(clearTimeout);
  guideTimers = [];
  guideRefresh = () => {};
}

function artMascot(art) {
  const box = el('div', 'art-mascot');
  const bubble = el('p', 'bubble art-bubble');
  bubble.hidden = true;
  const figure = mascotFigure();
  box.append(bubble, figure);
  const told = new Set();
  let spot = null, current = null;

  const later = (fn, ms) => guideTimers.push(setTimeout(fn, ms));
  const place = (pos, animate) => {
    spot = pos;
    box.style.transition = animate && !reducedMotion() ? '' : 'none';
    box.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  };
  // Koordinaten gelten relativ zur Bühne (#stage), damit der Hammer auch über den Auswahlkästen links stehen kann.
  const home = () => {
    const a = art.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: a.right - s.left - GUIDE_FIG - 14, y: a.top - s.top + 14 };
  };
  // Direkt rechts neben den angeklickten Kasten
  const beside = card => {
    if (!card || !card.isConnected) return null;
    const r = card.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const figH = figure.offsetHeight || GUIDE_FIG * 1.3;
    return {
      x: Math.max(4, Math.min(s.width - GUIDE_FIG - 4, r.right - s.left + 6)),
      y: Math.max(4, Math.min(s.height - figH - 4, r.top - s.top + r.height / 2 - figH / 2)),
    };
  };
  const hide = () => { bubble.hidden = true; };
  const say = text => {
    if (!text) { hide(); return; }
    const room = stage.clientWidth - (spot.x + GUIDE_FIG + 12);
    bubble.textContent = text;
    bubble.className = `bubble art-bubble ${room >= GUIDE_BUBBLE_W ? 'is-right' : 'is-left'}`;
    bubble.hidden = false;
  };
  const goHome = () => { hide(); current = null; place(home(), true); };
  const visit = (option, card, text, hold) => {
    guideStop();
    guideRefresh = refresh;
    hide();
    current = card;
    place(beside(card) || home(), true);
    // Der aufgeklappte Text schiebt den Kasten noch etwas, darum erst danach genau daneben stellen.
    later(() => {
      const target = beside(card);
      if (target) place(target, true);
      say(text);
      mascotSalto(figure);
    }, GUIDE_SETTLE_MS);
    later(hide, GUIDE_SETTLE_MS + hold);
    later(goHome, GUIDE_SETTLE_MS + hold + GUIDE_BACK_MS);
    later(() => idle(option, card), GUIDE_SETTLE_MS + hold + GUIDE_BACK_MS + GUIDE_IDLE_MS);
  };
  const idle = (option, card) => {
    if (!option.tip || told.has(option)) return;
    told.add(option);
    visit(option, card, option.tip, readTime(option.tip));
  };
  function refresh() { place(beside(current) || home(), false); }

  guideRefresh = refresh;
  requestAnimationFrame(() => { refresh(); box.classList.add('is-ready'); });
  return {
    box,
    react(option, card) { visit(option, card, option.hint, readTime(option.hint)); },
  };
}

// Der Hammer macht ab und zu von selbst einen Salto, redet dabei aber nicht.
const TRICK_MIN_MS = 9000, TRICK_EXTRA_MS = 9000;

function mascotHop(figure) {
  if (reducedMotion()) return;
  figure.querySelector('.mascot-art').animate([
    { transform: 'none' }, { transform: 'translateY(8%) scale(1.1, .86)', offset: 0.2 },
    { transform: 'translateY(-45%) rotate(-8deg)', offset: 0.55 }, { transform: 'translateY(4%) scale(1.06, .92)', offset: 0.85 },
    { transform: 'none' },
  ], { duration: 650, easing: 'ease-out' });
}

function mascotSalto(figure) {
  if (reducedMotion()) return;
  figure.querySelector('.mascot-art').animate([
    { transform: 'none', offset: 0 },
    { transform: 'translateY(6%) scale(1.08, .88)', offset: .14 },
    { transform: 'translateY(-55%) rotate(120deg)', offset: .38, easing: 'linear' },
    { transform: 'translateY(-70%) rotate(240deg)', offset: .58 },
    { transform: 'translateY(0) rotate(360deg)', offset: .84 },
    { transform: 'translateY(4%) rotate(360deg) scale(1.08, .9)', offset: .92 },
    { transform: 'rotate(360deg)', offset: 1 },
  ], { duration: 1100, easing: 'ease-in-out' });
}

function mascotTrick() {
  const figure = stage.querySelector('.mascot-figure');
  if (figure) mascotSalto(figure);
  setTimeout(mascotTrick, TRICK_MIN_MS + Math.random() * TRICK_EXTRA_MS);
}

buildProgress();
buildLookSwitch();
buildSettingsMenu();
render();
setTimeout(mascotTrick, TRICK_MIN_MS);
