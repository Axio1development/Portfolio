const topicDefs =
  '<defs><linearGradient id="tMetal" x2="1" y2="1"><stop stop-color="#e3e9ee"/><stop offset=".55" stop-color="#93a5b4"/><stop offset="1" stop-color="#dfe6ec"/></linearGradient><linearGradient id="tDark" x2="0" y2="1"><stop stop-color="#4a5f72"/><stop offset="1" stop-color="#22323f"/></linearGradient><linearGradient id="tBlock" x2="1"><stop stop-color="#b7c4cf"/><stop offset=".5" stop-color="#d3dce4"/><stop offset="1" stop-color="#aebccb"/></linearGradient><linearGradient id="tOil" x2="0" y2="1"><stop stop-color="#f2b55a"/><stop offset="1" stop-color="#c47e22"/></linearGradient><linearGradient id="tHot" x2="1"><stop stop-color="#f2804a"/><stop offset="1" stop-color="#d9473a"/></linearGradient><linearGradient id="tCold" x2="1"><stop stop-color="#7fb4d9"/><stop offset="1" stop-color="#3f7fb3"/></linearGradient><linearGradient id="tGlass" x2="1" y2="1"><stop stop-color="#cfe4f1"/><stop offset="1" stop-color="#8fb3cc"/></linearGradient><radialGradient id="tCone"><stop stop-color="#7d8f9e"/><stop offset=".7" stop-color="#3a4b59"/><stop offset="1" stop-color="#1f2b35"/></radialGradient><filter id="tShadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1b2a38" flood-opacity=".25"/></filter><pattern id="tGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#cbd6de" stroke-width=".6"/></pattern><marker id="tArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="#5d7487"/></marker></defs>';
const hit = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="transparent"/>`;
const TOPIC_ART = {
  "engine-repair": {
    caption: "ENGINE CUTAWAY · SINGLE CYLINDER SECTION",
    draw: (P) =>
      `<path d="M196 138h248v164H196z" fill="url(#tBlock)" stroke="#5e7486" stroke-width="3"/><path d="M212 150h20v140h-20zM408 150h20v140h-20z" fill="#9cc3dd" opacity=".9"/><path d="M248 138h144v160H248z" fill="#2b3c4b"/><text x="150" y="222" text-anchor="middle" class="tiny">WATER JACKET</text><path d="M176 219h34" stroke="#8aa0b1" stroke-width="1.2"/>` +
      P(
        "oilpan",
        `<path d="M186 300h268l-18 70H204z" fill="url(#tMetal)" stroke="#5e7486" stroke-width="3"/><path d="M196 338h248l-9 30H205z" fill="url(#tOil)" opacity=".9"/><path d="M286 352v-28q0-10 10-10h10" fill="none" stroke="#4b6175" stroke-width="5"/><rect x="274" y="350" width="26" height="9" rx="2" fill="#4b6175"/>`,
      ) +
      P(
        "crankshaft",
        `<path d="M282 318a40 40 0 0 1 76 0z" fill="#3e566b" stroke="#22394d" stroke-width="3"/><circle cx="320" cy="318" r="22" fill="url(#tMetal)" stroke="#344e67" stroke-width="4"/><circle cx="320" cy="318" r="7" fill="#344e67"/><circle cx="338" cy="292" r="11" fill="url(#tMetal)" stroke="#344e67" stroke-width="3"/>`,
      ) +
      `<path d="m311 214 19 78h14l-21-78z" fill="#e99a52" stroke="#a96631" stroke-width="2.5"/>` +
      P(
        "piston",
        `<rect x="252" y="168" width="136" height="62" rx="5" fill="url(#tMetal)" stroke="#526b7d" stroke-width="3"/><path d="M254 178h132M254 188h132M254 198h132" stroke="#3b5163" stroke-width="3.5"/><circle cx="320" cy="214" r="9" fill="#33495b"/>`,
      ) +
      P(
        "gasket",
        `<rect x="190" y="130" width="260" height="9" rx="2" fill="#ef7b45" stroke="#b9532a" stroke-width="2"/><rect x="250" y="131" width="140" height="7" fill="#2b3c4b"/>`,
      ) +
      `<path d="M194 58h252v72H194z" fill="url(#tBlock)" stroke="#4b657b" stroke-width="3"/><path d="M212 70h18v48h-18zM410 70h18v48h-18z" fill="#9cc3dd"/><path d="M356 92v34" stroke="#556c80" stroke-width="7"/><path d="M340 126h32" stroke="#556c80" stroke-width="7" stroke-linecap="round"/>` +
      P(
        "valve",
        `<path d="M284 92v34" stroke="#d27a3a" stroke-width="7"/><path d="M267 126h34" stroke="#d27a3a" stroke-width="7" stroke-linecap="round"/><path d="M276 98h16" stroke="#a65c27" stroke-width="4"/>${hit(284, 108, 20)}`,
      ) +
      P(
        "camshaft",
        `<path d="M270 70q14-26 28 0a14 14 0 0 1-28 0z" fill="url(#tDark)" stroke="#1d2c39" stroke-width="2"/><circle cx="284" cy="72" r="5" fill="#a9b8c4"/><path d="M342 70q14-26 28 0a14 14 0 0 1-28 0z" fill="url(#tDark)" stroke="#1d2c39" stroke-width="2"/><circle cx="356" cy="72" r="5" fill="#a9b8c4"/>`,
      ) +
      `<path d="M300 150q20-10 40 0" fill="none" stroke="#f9b466" stroke-width="2" stroke-dasharray="4 4"/><text x="320" y="158" text-anchor="middle" class="tiny light">COMBUSTION CHAMBER</text>`,
  },
  hvac: {
    caption: "A/C REFRIGERANT CYCLE · HIGH SIDE RED · LOW SIDE BLUE",
    draw: (P) =>
      `<rect x="400" y="60" width="226" height="250" rx="12" fill="#e7eef3" stroke="#9fb3c2" stroke-dasharray="6 5"/><text x="513" y="80" text-anchor="middle" class="tiny">CABIN HVAC CASE</text>` +
      `<path d="M190 300H72v-48" fill="none" stroke="url(#tHot)" stroke-width="9"/><path d="M72 76V46h258v26" fill="none" stroke="#d9473a" stroke-width="6"/><path d="M342 92h82q12 0 12 12v14" fill="none" stroke="#3f7fb3" stroke-width="7"/><path d="M466 262v74H236v-20" fill="none" stroke="url(#tCold)" stroke-width="10"/>` +
      `<g stroke="#5d7487" stroke-width="2" marker-end="url(#tArrow)"><path d="M8 110h28M8 160h28M8 210h28"/><path d="M402 160h-20M402 200h-20M402 240h-20"/></g><text x="10" y="95" class="tiny">OUTSIDE AIR</text><text x="360" y="275" text-anchor="middle" class="tiny">TO VENTS</text>` +
      P(
        "condenser",
        `<rect x="42" y="76" width="60" height="176" rx="5" fill="#cfdbe4" stroke="#56778e" stroke-width="3"/><path d="M42 92h60M42 108h60M42 124h60M42 140h60M42 156h60M42 172h60M42 188h60M42 204h60M42 220h60M42 236h60" stroke="#d9473a" stroke-width="2.5" opacity=".75"/>`,
      ) +
      P(
        "compressor",
        `<rect x="186" y="272" width="96" height="58" rx="10" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3" filter="url(#tShadow)"/><circle cx="196" cy="301" r="30" fill="url(#tDark)" stroke="#1f2d39" stroke-width="3"/><circle cx="196" cy="301" r="10" fill="#c3cfd8"/><path d="M226 286h50M226 300h50M226 314h50" stroke="#6d8395" stroke-width="2"/>`,
      ) +
      P(
        "expansion",
        `<rect x="316" y="72" width="38" height="36" rx="4" fill="#d6a85c" stroke="#9c6f22" stroke-width="3"/><path d="M325 90h20" stroke="#7a5418" stroke-width="3"/>${hit(335, 90, 24)}`,
      ) +
      P(
        "evaporator",
        `<rect x="418" y="118" width="70" height="144" rx="5" fill="#d7e8f3" stroke="#3f7fb3" stroke-width="3"/><path d="M430 118v144M444 118v144M458 118v144M472 118v144" stroke="#7fb4d9" stroke-width="3"/><path d="M420 140h66M420 170h66M420 200h66M420 230h66" stroke="#b5d3e7" stroke-width="2"/>`,
      ) +
      P(
        "blower",
        `<circle cx="566" cy="190" r="44" fill="#f4f7f9" stroke="#56778e" stroke-width="3"/><g stroke="#56778e" stroke-width="4"><path d="M566 150v18M566 212v18M526 190h18M588 190h18M538 162l12 12M582 206l12 12M594 162l-12 12M550 206l-12 12"/></g><circle cx="566" cy="190" r="10" fill="#56778e"/>`,
      ),
  },
  adas: {
    caption: "DRIVER ASSISTANCE SENSORS · TOP VIEW",
    draw: (P) =>
      `<path d="M396 200 636 96v208z" fill="#7fb4d9" opacity=".18"/><path d="M482 200 636 168v64z" fill="#f2804a" opacity=".22"/><path d="M154 140 20 70v80zM154 260 20 330v-80z" fill="#3c8a78" opacity=".16"/><g fill="none" stroke="#9aa9b6" stroke-width="2" opacity=".8"><path d="M492 150q18 6 22 22M492 250q18-6 22-22M146 150q-18 6-22 22M146 250q-18-6-22-22"/></g>` +
      `<path d="M170 128h236q74 0 80 72-6 72-80 72H170q-28 0-28-30v-84q0-30 28-30z" fill="url(#tBlock)" stroke="#4b657b" stroke-width="3" filter="url(#tShadow)"/><path d="M372 140q30 60 0 120l-26-8q20-52 0-104z" fill="url(#tGlass)" stroke="#5f7f96" stroke-width="2"/><path d="M196 144q-14 56 0 112l22-8q-10-48 0-96z" fill="url(#tGlass)" stroke="#5f7f96" stroke-width="2"/><rect x="226" y="150" width="110" height="100" rx="12" fill="#c3cfd9" opacity=".7"/>` +
      P(
        "module",
        `<rect x="252" y="182" width="62" height="38" rx="5" fill="url(#tDark)" stroke="#1d2c39" stroke-width="2"/><path d="M262 194h42M262 204h30" stroke="#8fb3cc" stroke-width="3"/>`,
      ) +
      P(
        "camera",
        `<rect x="370" y="190" width="26" height="20" rx="4" fill="#2b3c4b" stroke="#111d27" stroke-width="2"/><circle cx="388" cy="200" r="6" fill="#7fb4d9"/>${hit(383, 200, 22)}`,
      ) +
      P(
        "radar",
        `<rect x="478" y="178" width="16" height="44" rx="4" fill="#d9473a" stroke="#932b22" stroke-width="2"/><path d="M482 188h8M482 200h8M482 212h8" stroke="#ffd2c4" stroke-width="2"/>${hit(486, 200, 24)}`,
      ) +
      P(
        "corner",
        `<rect x="146" y="132" width="18" height="18" rx="4" fill="#3c8a78" stroke="#245a4e" stroke-width="2"/><rect x="146" y="250" width="18" height="18" rx="4" fill="#3c8a78" stroke="#245a4e" stroke-width="2"/>${hit(155, 141, 18)}${hit(155, 259, 18)}`,
      ) +
      P(
        "ultrasonic",
        `<g fill="#f4f7f9" stroke="#4b657b" stroke-width="2"><circle cx="476" cy="152" r="6"/><circle cx="476" cy="248" r="6"/><circle cx="150" cy="176" r="6"/><circle cx="150" cy="224" r="6"/></g>${hit(476, 152, 14)}${hit(476, 248, 14)}${hit(150, 176, 14)}${hit(150, 224, 14)}`,
      ) +
      `<text x="560" y="130" text-anchor="middle" class="tiny">CAMERA VIEW</text><text x="590" y="250" text-anchor="middle" class="tiny">RADAR</text>`,
  },
  "electrical-diagnostics": {
    caption: "COOLING-FAN CIRCUIT · LOADED VOLTAGE-DROP TEST",
    draw: (P) =>
      `<path d="M150 252V84h120M326 84h76v-6h28M470 90h20v40" fill="none" stroke="#d9473a" stroke-width="6"/><path d="M500 236v70M500 340H120v-30" fill="none" stroke="#2b3c4b" stroke-width="6"/><path d="M372 120v34h-28" fill="none" stroke="#7d8f9e" stroke-width="3" stroke-dasharray="5 4"/><text x="330" y="168" text-anchor="middle" class="tiny">CONTROL</text>` +
      P(
        "battery",
        `<rect x="80" y="252" width="110" height="78" rx="8" fill="url(#tDark)" stroke="#16232e" stroke-width="2" filter="url(#tShadow)"/><rect x="94" y="240" width="22" height="14" rx="3" fill="#2b3c4b"/><rect x="150" y="240" width="22" height="14" rx="3" fill="#d9473a"/><text x="135" y="298" text-anchor="middle" class="voltage">12.6 V</text>`,
      ) +
      P(
        "fuse",
        `<rect x="268" y="68" width="60" height="32" rx="6" fill="#d5eae2" stroke="#36846d" stroke-width="3"/><path d="M276 84h10q12-16 24 0h10" fill="none" stroke="#36846d" stroke-width="3"/><text x="298" y="62" text-anchor="middle" class="tiny">30 A</text>`,
      ) +
      P(
        "relay",
        `<rect x="400" y="54" width="76" height="66" rx="6" fill="#eef3f6" stroke="#4b657b" stroke-width="3"/><path d="M414 104c6-10 10 10 16 0s10 10 16 0 10 10 16 0" fill="none" stroke="#4b657b" stroke-width="2.5"/><path d="M428 74h8l22-10" stroke="#f17a43" stroke-width="3"/><circle cx="430" cy="74" r="3" fill="#2b3c4b"/><circle cx="462" cy="74" r="3" fill="#2b3c4b"/>`,
      ) +
      P(
        "load",
        `<circle cx="500" cy="182" r="54" fill="#f4f7f9" stroke="#4b657b" stroke-width="3" filter="url(#tShadow)"/><g fill="#9fb4c4" stroke="#56778e" stroke-width="2"><path d="M500 182q-4-40 18-44 6 22-18 44zM500 182q40-4 44 18-22 6-44-18zM500 182q4 40-18 44-6-22 18-44zM500 182q-40 4-44-18 22-6 44 18z"/></g><circle cx="500" cy="182" r="9" fill="#344e67"/>`,
      ) +
      P(
        "ground",
        `<path d="M484 306h32v34h-32z" fill="#a98c6a" stroke="#6b5232" stroke-width="2"/><circle cx="500" cy="323" r="7" fill="#7a6248"/><path d="M478 352h44M486 362h28M494 372h12" stroke="#2b3c4b" stroke-width="3"/><circle cx="490" cy="312" r="3" fill="#d3e0b8"/><circle cx="510" cy="332" r="2.5" fill="#d3e0b8"/>`,
      ) +
      P(
        "meter",
        `<rect x="276" y="214" width="112" height="92" rx="12" fill="#f2c94c" stroke="#a7861f" stroke-width="3" filter="url(#tShadow)"/><rect x="290" y="226" width="84" height="34" rx="4" fill="#cfe0c6"/><text x="332" y="250" text-anchor="middle" class="lcd">2.8 V</text><circle cx="332" cy="284" r="14" fill="#2b3c4b"/><path d="M388 280q60 0 96 30M388 292q60 30 100 48" fill="none" stroke="#2b3c4b" stroke-width="2.5"/><path d="M388 280q50-10 110 26" fill="none" stroke="#d9473a" stroke-width="2.5"/>`,
      ),
  },
  audio: {
    caption: "VEHICLE AUDIO · SIGNAL PATH FROM SOURCE TO SPEAKERS",
    draw: (P) =>
      `<path d="M140 140v40q0 30 30 30h110" fill="none" stroke="#3c8a78" stroke-width="5"/><path d="M400 260h40v-60" fill="none" stroke="#f17a43" stroke-width="5"/><path d="M500 180h30v-60h10M500 190h30v60h10" fill="none" stroke="#f17a43" stroke-width="4"/><path d="M190 190q12-16 24 0t24 0 24 0" fill="none" stroke="#3c8a78" stroke-width="2.5"/>` +
      `<path d="M520 30h100v340H520q-20-170 0-340z" fill="url(#tBlock)" stroke="#4b657b" stroke-width="3"/>` +
      P(
        "headunit",
        `<rect x="50" y="64" width="190" height="80" rx="10" fill="url(#tDark)" stroke="#111d27" stroke-width="2" filter="url(#tShadow)"/><rect x="66" y="76" width="118" height="56" rx="5" fill="#2f6f9a"/><path d="M76 116l14-14 12 8 16-20 18 14" fill="none" stroke="#bfe0f4" stroke-width="2.5"/><circle cx="212" cy="104" r="16" fill="#3b4f61" stroke="#8fa3b3" stroke-width="2"/>`,
      ) +
      P(
        "amplifier",
        `<rect x="250" y="222" width="150" height="86" rx="8" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3" filter="url(#tShadow)"/><path d="M264 236v58M280 236v58M296 236v58M312 236v58M328 236v58M344 236v58M360 236v58M376 236v58" stroke="#6d8395" stroke-width="5"/><text x="325" y="326" text-anchor="middle" class="tiny">AMPLIFIER · 4 CH</text>`,
      ) +
      P(
        "crossover",
        `<rect x="444" y="164" width="56" height="42" rx="5" fill="#d5eae2" stroke="#36846d" stroke-width="3"/><path d="M454 194c8-14 12-14 18 0s12 14 20 0" fill="none" stroke="#36846d" stroke-width="2.5"/>`,
      ) +
      P(
        "tweeter",
        `<circle cx="572" cy="110" r="26" fill="#2b3c4b" stroke="#111d27" stroke-width="3"/><circle cx="572" cy="110" r="13" fill="url(#tCone)"/>${hit(572, 110, 30)}`,
      ) +
      P(
        "woofer",
        `<circle cx="572" cy="262" r="58" fill="#2b3c4b" stroke="#111d27" stroke-width="3"/><circle cx="572" cy="262" r="46" fill="url(#tCone)"/><circle cx="572" cy="262" r="14" fill="#56697a"/>`,
      ),
  },
  fuel: {
    caption: "RETURNLESS FUEL SYSTEM · PORT INJECTION",
    draw: (P) =>
      `<path d="M150 272v-32h175v42M350 300h14V112h-10" fill="none" stroke="#c98a2e" stroke-width="6"/><path d="M370 160h200v96H370z" fill="url(#tBlock)" stroke="#5e7486" stroke-width="3"/><text x="470" y="244" text-anchor="middle" class="tiny">ENGINE · 4 CYL</text><path d="M560 256v84h76" fill="none" stroke="#7d8f9e" stroke-width="16" stroke-linecap="round"/><text x="600" y="368" text-anchor="middle" class="tiny">EXHAUST</text>` +
      P(
        "pump",
        `<path d="M40 272h220q16 0 16 16v60q0 16-16 16H40q-16 0-16-16v-60q0-16 16-16z" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3" filter="url(#tShadow)"/><path d="M30 320h240v28q0 10-10 10H40q-10 0-10-10z" fill="url(#tOil)" opacity=".75"/><rect x="132" y="282" width="36" height="66" rx="6" fill="url(#tDark)" stroke="#1d2c39" stroke-width="2"/><path d="M140 300h20M140 312h20" stroke="#9fb4c4" stroke-width="2"/>`,
      ) +
      P(
        "filter",
        `<rect x="300" y="282" width="50" height="36" rx="8" fill="#e8d7b3" stroke="#9c7a3a" stroke-width="3"/><path d="M310 286v28M320 286v28M330 286v28M340 286v28" stroke="#b8975a" stroke-width="2"/>`,
      ) +
      P(
        "rail",
        `<rect x="354" y="100" width="226" height="24" rx="12" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"/><circle cx="572" cy="112" r="7" fill="#2b3c4b"/>`,
      ) +
      P(
        "injector",
        `<g fill="#3c8a78" stroke="#245a4e" stroke-width="2">${[390, 450, 510, 560].map((x) => `<rect x="${x - 9}" y="124" width="18" height="30" rx="3"/><path d="M${x - 4} 154h8l-2 10h-4z"/>`).join("")}</g><path d="M386 168l4 10 4-10" fill="none" stroke="#c98a2e" stroke-width="2"/>`,
      ) +
      P(
        "o2",
        `<path d="M548 300h24v-26h-24z" fill="#2b3c4b"/><path d="M552 300v16h16v-16" fill="#9aa9b6" stroke="#4d6578" stroke-width="2"/><path d="M560 274v-30q0-10 14-10h30" fill="none" stroke="#4b657b" stroke-width="3"/>${hit(560, 292, 22)}`,
      ),
  },
  diesel: {
    caption: "DIESEL AIR, FUEL & AFTERTREATMENT PATH",
    draw: (P) =>
      `<path d="M466 92H120q-56 0-56 56v6M64 300v34h150v-60" fill="none" stroke="url(#tCold)" stroke-width="12"/><path d="M410 210h36q34 0 34-34v-44M494 140v100h-14v22" fill="none" stroke="url(#tHot)" stroke-width="12"/><path d="M630 290h6" stroke="#7d8f9e" stroke-width="12"/><text x="300" y="80" text-anchor="middle" class="tiny">BOOSTED INTAKE AIR</text><text x="400" y="372" text-anchor="middle" class="tiny">EXHAUST → DPF → SCR</text>` +
      `<rect x="214" y="150" width="196" height="150" rx="10" fill="url(#tBlock)" stroke="#5e7486" stroke-width="3"/><g fill="#2b3c4b">${[250, 292, 334, 376].map((x) => `<rect x="${x - 6}" y="140" width="12" height="40" rx="3"/>`).join("")}</g><text x="312" y="260" text-anchor="middle" class="tiny">DIESEL ENGINE</text>` +
      P(
        "rail",
        `<rect x="226" y="118" width="172" height="20" rx="10" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"/><path d="M250 138v8M292 138v8M334 138v8M376 138v8" stroke="#4d6578" stroke-width="4"/>`,
      ) +
      P(
        "turbo",
        `<circle cx="470" cy="104" r="34" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3" filter="url(#tShadow)"/><path d="M470 80a24 24 0 1 1-20 12" fill="none" stroke="#5b7083" stroke-width="5"/><circle cx="532" cy="112" r="30" fill="#c27b5a" stroke="#8a4a2e" stroke-width="3"/><path d="M532 92a20 20 0 1 1-16 10" fill="none" stroke="#8a4a2e" stroke-width="4"/><rect x="496" y="98" width="14" height="14" fill="#6d8395"/>`,
      ) +
      P(
        "intercooler",
        `<rect x="34" y="154" width="60" height="146" rx="6" fill="#d7e8f3" stroke="#3f7fb3" stroke-width="3"/><path d="M34 172h60M34 190h60M34 208h60M34 226h60M34 244h60M34 262h60M34 280h60" stroke="#7fb4d9" stroke-width="3"/>`,
      ) +
      P(
        "dpf",
        `<rect x="446" y="262" width="96" height="56" rx="26" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"/><path d="M470 266v48M486 266v48M502 266v48M518 266v48" stroke="#5d6d7a" stroke-width="3" opacity=".6"/><text x="494" y="340" text-anchor="middle" class="tiny">DPF</text>`,
      ) +
      P(
        "scr",
        `<rect x="550" y="262" width="80" height="56" rx="24" fill="#cfdbe4" stroke="#4d6578" stroke-width="3"/><path d="M560 250l10 12" stroke="#3f7fb3" stroke-width="4"/><circle cx="558" cy="248" r="6" fill="#3f7fb3"/><text x="590" y="340" text-anchor="middle" class="tiny">SCR</text>`,
      ),
  },
  sensors: {
    caption: "SENSOR CIRCUITS · SHARED 5 V REFERENCE AND GROUND",
    draw: (P) =>
      `<g fill="none" stroke-width="3"><path d="M150 76h280M150 196h280M150 316h280" stroke="#3f7fb3"/><path d="M150 86h250v-6h30M150 206h250M150 326h120" stroke="#f17a43" stroke-dasharray="0" opacity=".85"/><path d="M150 96h240v74h40M150 216h240M150 336h100" stroke="#2b3c4b"/></g><text x="300" y="66" text-anchor="middle" class="tiny">SIGNAL · 5 V REF · GROUND</text>` +
      P(
        "ect",
        `<g transform="translate(0,24)"><path d="M40 60h80v40H40z" fill="#9cc3dd" opacity=".6"/><path d="M78 40h24v30H78z" fill="#3c8a78" stroke="#245a4e" stroke-width="2"/><path d="M82 70h16v26H82z" fill="url(#tMetal)" stroke="#4d6578" stroke-width="2"/><path d="M82 76h16M82 84h16M82 92h16" stroke="#4d6578" stroke-width="1.5"/><path d="M102 52h48" stroke="#3f7fb3" stroke-width="3"/></g>${hit(90, 92, 32)}`,
      ) +
      P(
        "tps",
        `<circle cx="90" cy="196" r="44" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"/><circle cx="90" cy="196" r="30" fill="#2b3c4b"/><path d="M68 214l44-36" stroke="#c3cfd8" stroke-width="6" stroke-linecap="round"/><rect x="128" y="182" width="24" height="28" rx="4" fill="#3c8a78" stroke="#245a4e" stroke-width="2"/>`,
      ) +
      P(
        "wss",
        `<circle cx="80" cy="330" r="40" fill="none" stroke="#4d6578" stroke-width="10" stroke-dasharray="7 6"/><circle cx="80" cy="330" r="30" fill="url(#tMetal)" stroke="#4d6578" stroke-width="2"/><rect x="124" y="320" width="28" height="18" rx="4" fill="#3c8a78" stroke="#245a4e" stroke-width="2"/>`,
      ) +
      P(
        "ecu",
        `<rect x="430" y="56" width="170" height="290" rx="12" fill="url(#tDark)" stroke="#111d27" stroke-width="2" filter="url(#tShadow)"/><rect x="452" y="80" width="126" height="40" rx="4" fill="#33495b"/><text x="515" y="106" text-anchor="middle" class="voltage" style="font-size:16px">ECU</text><g fill="#c3cfd8">${[150, 180, 210, 240, 270, 300].map((y) => `<rect x="430" y="${y}" width="10" height="6"/>`).join("")}</g><text x="515" y="210" text-anchor="middle" class="tiny light">5 V REFERENCE</text>`,
      ) +
      P(
        "scope",
        `<rect x="232" y="252" width="168" height="110" rx="10" fill="#1f2b35" stroke="#0e1720" stroke-width="2" filter="url(#tShadow)"/><path d="M244 276h144M244 300h144M244 324h144" stroke="#2f4555" stroke-width="1"/><path d="M246 330h14v-44h14v44h14v-44h14v44h14v-44h14v44h14v-44h14v44h14" fill="none" stroke="#5be3a8" stroke-width="2.5"/>`,
      ),
  },
  transmissions: {
    caption: "AUTOMATIC TRANSMISSION · SIMPLIFIED SECTION VIEW",
    draw: (P) =>
      `<path d="M40 196h40M420 200h20" stroke="#4d6578" stroke-width="12"/><path d="M180 80h260v240H180z" fill="#dfe6ec" stroke="#8aa0b1" stroke-width="3"/><text x="40" y="186" class="tiny">ENGINE</text>` +
      P(
        "converter",
        `<path d="M80 120q60-30 100 0v160q-40 30-100 0z" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3" filter="url(#tShadow)"/><path d="M98 140q30 60 0 120M120 132q34 68 0 136M142 136q30 64 0 128" fill="none" stroke="#6d8395" stroke-width="4"/>`,
      ) +
      `<path d="M180 196h240" stroke="#4d6578" stroke-width="10"/>` +
      P(
        "planetary",
        `<circle cx="270" cy="198" r="74" fill="none" stroke="#4d6578" stroke-width="14"/><circle cx="270" cy="198" r="66" fill="none" stroke="#7d8f9e" stroke-width="3" stroke-dasharray="4 3"/><circle cx="270" cy="198" r="18" fill="#f17a43" stroke="#a9532a" stroke-width="3"/><g fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"><circle cx="270" cy="156" r="22"/><circle cx="234" cy="220" r="22"/><circle cx="306" cy="220" r="22"/></g><circle cx="270" cy="198" r="44" fill="none" stroke="#3c8a78" stroke-width="2" stroke-dasharray="6 4"/>`,
      ) +
      P(
        "clutch",
        `<g>${[360, 370, 380, 390, 400].map((x, i) => `<rect x="${x}" y="${i % 2 ? 126 : 114}" width="6" height="${i % 2 ? 144 : 168}" rx="2" fill="${i % 2 ? "#c27b5a" : "#8a9fad"}"/>`).join("")}</g>${hit(383, 198, 40)}`,
      ) +
      P(
        "output",
        `<path d="M420 190h180v16H420z" fill="url(#tMetal)" stroke="#4d6578" stroke-width="2"/><rect x="590" y="166" width="20" height="64" rx="4" fill="url(#tDark)"/>`,
      ) +
      P(
        "valvebody",
        `<rect x="196" y="330" width="232" height="44" rx="6" fill="#c9d3dc" stroke="#4d6578" stroke-width="3"/><path d="M210 352h40v-10h30v20h40v-14h30v10h60" fill="none" stroke="#3f7fb3" stroke-width="4"/><g fill="#2b3c4b"><rect x="400" y="338" width="14" height="28" rx="3"/><rect x="380" y="338" width="14" height="28" rx="3"/></g>`,
      ),
  },
  suspension: {
    caption: "FRONT SUSPENSION & STEERING · FRONT VIEW (LEFT WHEEL)",
    draw: (P) =>
      `<rect x="262" y="24" width="190" height="34" rx="6" fill="url(#tBlock)" stroke="#5e7486" stroke-width="3"/><text x="395" y="45" text-anchor="middle" class="tiny">STRUT TOWER</text><path d="M440 300h170" stroke="#8aa0b1" stroke-width="18"/><text x="560" y="332" text-anchor="middle" class="tiny">SUBFRAME</text>` +
      `<rect x="80" y="110" width="120" height="250" rx="34" fill="#25313b" stroke="#111a21" stroke-width="3"/><path d="M90 140h100M90 180h100M90 220h100M90 260h100M90 300h100M90 340h100" stroke="#3a4a57" stroke-width="5"/><rect x="190" y="170" width="30" height="130" rx="6" fill="url(#tMetal)" stroke="#4d6578" stroke-width="2"/>` +
      `<path d="M226 168h34l18 30v104l-18 20h-34z" fill="url(#tBlock)" stroke="#4d6578" stroke-width="3"/><text x="252" y="252" text-anchor="middle" class="tiny" transform="rotate(-90 252 252)">KNUCKLE</text>` +
      P(
        "arm",
        `<path d="M250 318l200-26v20l-196 30z" fill="url(#tDark)" stroke="#1d2c39" stroke-width="2"/><circle cx="256" cy="330" r="10" fill="#a9b8c4" stroke="#4d6578" stroke-width="2"/><circle cx="446" cy="302" r="12" fill="#2b3c4b" stroke="#111d27" stroke-width="2"/>`,
      ) +
      P(
        "strut",
        `<path d="M268 176l40-120 22 8-40 120z" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"/><path d="M296 92l18-56" stroke="#4d6578" stroke-width="8"/>`,
      ) +
      P(
        "spring",
        `<path d="M282 158l46-8M288 140l46-8M294 122l46-8M300 104l46-8M306 86l46-8" stroke="#3c8a78" stroke-width="7" stroke-linecap="round"/><path d="M280 150q-10-6 2-14l40-6q12 2 4 10M286 132q-10-6 2-14l40-6q12 2 4 10M292 114q-10-6 2-14l40-6q12 2 4 10" fill="none" stroke="#2f6e60" stroke-width="3"/>${hit(316, 118, 40)}`,
      ) +
      P(
        "tierod",
        `<path d="M278 250h160" stroke="#d27a3a" stroke-width="9" stroke-linecap="round"/><circle cx="280" cy="250" r="9" fill="#a65c27"/><path d="M372 244v12M380 244v12M388 244v12" stroke="#7a4219" stroke-width="2"/>${hit(358, 250, 20)}`,
      ) +
      P(
        "rack",
        `<rect x="436" y="234" width="180" height="32" rx="12" fill="url(#tMetal)" stroke="#4d6578" stroke-width="3"/><rect x="520" y="200" width="56" height="38" rx="8" fill="url(#tDark)" stroke="#1d2c39" stroke-width="2"/><path d="M528 212h40M528 224h40" stroke="#8fb3cc" stroke-width="2"/><text x="548" y="194" text-anchor="middle" class="tiny">EPS</text>`,
      ),
  },
  hybrid: {
    caption: "ELECTRIFIED POWERTRAIN · HIGH-VOLTAGE COMPONENTS (ORANGE)",
    draw: (P) =>
      `<path d="M60 270v-60q0-20 20-24l90-16 70-60q12-10 30-10h170q20 0 34 12l70 62 60 12q24 6 26 30v54z" fill="url(#tBlock)" stroke="#4b657b" stroke-width="3" opacity=".85"/><path d="M258 116h70v54h-118zM346 116h80l58 54H346z" fill="url(#tGlass)" stroke="#5f7f96" stroke-width="2"/>` +
      `<circle cx="160" cy="292" r="44" fill="#25313b"/><circle cx="160" cy="292" r="20" fill="url(#tMetal)"/><circle cx="500" cy="292" r="44" fill="#25313b"/><circle cx="500" cy="292" r="20" fill="url(#tMetal)"/>` +
      `<path d="M410 262h20v-60h46M476 214v40" fill="none" stroke="#f17a43" stroke-width="7" stroke-linejoin="round"/><path d="M200 262v-40h-60" fill="none" stroke="#f17a43" stroke-width="6"/><path d="M380 186h-30" stroke="#f17a43" stroke-width="5"/><rect x="292" y="182" width="34" height="26" rx="3" fill="#2b3c4b"/><text x="309" y="226" text-anchor="middle" class="tiny">12 V</text><path d="M326 194h24" stroke="#2b3c4b" stroke-width="3"/>` +
      P(
        "battery",
        `<rect x="196" y="250" width="226" height="34" rx="6" fill="url(#tDark)" stroke="#f17a43" stroke-width="3"/><g fill="#5b7083">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="${204 + i * 21.5}" y="256" width="16" height="22" rx="2"/>`).join("")}</g>`,
      ) +
      P(
        "inverter",
        `<rect x="440" y="176" width="74" height="40" rx="6" fill="url(#tMetal)" stroke="#f17a43" stroke-width="3"/><path d="M450 186h54M450 196h54M450 206h54" stroke="#6d8395" stroke-width="2"/>`,
      ) +
      P(
        "motor",
        `<rect x="456" y="250" width="40" height="40" rx="8" fill="#c27b5a" stroke="#8a4a2e" stroke-width="3"/><circle cx="476" cy="270" r="9" fill="#5a3320"/>`,
      ) +
      P(
        "dcdc",
        `<rect x="350" y="172" width="44" height="30" rx="4" fill="#d5eae2" stroke="#36846d" stroke-width="3"/><text x="372" y="191" text-anchor="middle" class="tiny" style="fill:#245a4e">DC</text>`,
      ) +
      P(
        "port",
        `<rect x="106" y="206" width="34" height="32" rx="6" fill="#2b3c4b" stroke="#f17a43" stroke-width="3"/><circle cx="116" cy="218" r="3" fill="#f17a43"/><circle cx="130" cy="218" r="3" fill="#f17a43"/><circle cx="123" cy="229" r="3" fill="#f17a43"/>`,
      ),
  },
  networks: {
    caption: "VEHICLE NETWORK TOPOLOGY · CAN SEGMENTS",
    draw: (P) =>
      `<g fill="url(#tBlock)" stroke="#4b657b" stroke-width="2.5"><rect x="470" y="56" width="120" height="60" rx="8"/><rect x="470" y="280" width="120" height="60" rx="8"/></g><text x="530" y="91" text-anchor="middle" class="tiny">ABS MODULE</text><text x="530" y="315" text-anchor="middle" class="tiny">CLUSTER</text><g fill="#2b3c4b"><rect x="174" y="80" width="10" height="12"/><rect x="456" y="80" width="10" height="12"/></g>` +
      P(
        "bus",
        `<g fill="none" stroke-width="4"><path d="M170 86c20-8 30 8 50 0s30 8 50 0M370 86c20-8 30 8 50 0s30 8 50 0M170 310c20-8 30 8 50 0s30 8 50 0M370 310c20-8 30 8 50 0s30 8 50 0" stroke="#e8b931"/><path d="M170 86c20 8 30-8 50 0s30-8 50 0M370 86c20 8 30-8 50 0s30-8 50 0M170 310c20 8 30-8 50 0s30-8 50 0M370 310c20 8 30-8 50 0s30-8 50 0" stroke="#3c8a78"/><path d="M270 86h22v80M370 86h-22v80M270 310h22v-72M370 310h-22v-72" stroke="#7d8f9e" stroke-width="4"/></g><g fill="none" stroke="transparent" stroke-width="22"><path d="M170 86h300M170 310h300"/></g><text x="420" y="74" text-anchor="middle" class="tiny">CAN-H / CAN-L</text>`,
      ) +
      P(
        "ecm",
        `<rect x="50" y="56" width="120" height="60" rx="8" fill="url(#tDark)" stroke="#111d27" stroke-width="2" filter="url(#tShadow)"/><text x="110" y="91" text-anchor="middle" class="tiny light">ENGINE (ECM)</text>`,
      ) +
      P(
        "bcm",
        `<rect x="50" y="280" width="120" height="60" rx="8" fill="url(#tDark)" stroke="#111d27" stroke-width="2" filter="url(#tShadow)"/><text x="110" y="315" text-anchor="middle" class="tiny light">BODY (BCM)</text>`,
      ) +
      P(
        "gateway",
        `<rect x="258" y="160" width="124" height="80" rx="10" fill="#f17a43" stroke="#a9532a" stroke-width="3" filter="url(#tShadow)"/><text x="320" y="205" text-anchor="middle" class="tiny light">GATEWAY</text>`,
      ) +
      P(
        "dlc",
        `<path d="M286 352h68l-8 30h-52z" fill="#2b3c4b" stroke="#111d27" stroke-width="2"/><g fill="#c3cfd8">${[296, 306, 316, 326, 336].map((x) => `<rect x="${x}" y="360" width="5" height="6"/>`).join("")}</g><path d="M320 240v112" stroke="#7d8f9e" stroke-width="3" stroke-dasharray="5 4"/><text x="380" y="372" class="tiny">OBD-II</text>`,
      ),
  },
};
let topicSeq = 0;
function topicDiagram(id, interactive, labels) {
  const art = TOPIC_ART[id];
  const P = (pid, shape) =>
    part(pid, labels?.[pid]?.label || labels?.[pid] || pid, shape);
  let s = `<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" class="technical topic-art" role="img" aria-label="${art.caption.toLowerCase()}">${topicDefs}<rect width="640" height="400" fill="#f1f5f7"/><rect width="640" height="400" fill="url(#tGrid)"/>${art.draw(P)}<text x="320" y="394" text-anchor="middle">${art.caption}</text></svg>`;
  const k = "t" + ++topicSeq + "_";
  s = s.replaceAll('id="t', 'id="' + k).replaceAll("url(#t", "url(#" + k);
  return interactive ? s : s.replaceAll(' role="button" tabindex="0"', "");
}
