const svgStart =
  '<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" class="technical" aria-label="Interactive component illustration"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#cbd6de" stroke-width=".6"/></pattern><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#d9e2e9"/><stop offset=".5" stop-color="#8396a6"/><stop offset="1" stop-color="#e2e8ee"/></linearGradient></defs><rect width="640" height="400" fill="#f1f5f7"/><rect width="640" height="400" fill="url(#grid)"/>';
function part(id, label, shape) {
  return `<g class="component" data-part="${id}" role="button" tabindex="0" aria-label="${label}"><title>${label}</title>${shape}</g>`;
}
function diagram(id, interactive = true, labels) {
  if (typeof TOPIC_ART !== "undefined" && TOPIC_ART[id])
    return topicDiagram(id, interactive, labels);
  let s = svgStart;
  if (id === "engine")
    s +=
      `<path d="M221 120V317H422V120" fill="#cbd5df" stroke="#5e7486" stroke-width="4"/><path d="M251 137V302H392V137" fill="#31495a"/><path d="M220 316 196 353H447L422 316" fill="#adbcc8" stroke="#5e7486" stroke-width="3"/>` +
      part(
        "head",
        "Cylinder head",
        `<rect x="204" y="69" width="234" height="65" rx="12" fill="url(#metal)" stroke="#4b657b" stroke-width="3"/><path d="m249 78 36 52m91-52-35 52" stroke="#40576a" stroke-width="10"/><path d="M269 126h29m30 0h29" stroke="#f17a43" stroke-width="7"/><circle cx="321" cy="96" r="9" fill="#f9b466"/><path d="M321 104v24" stroke="#f9b466" stroke-width="4"/>`,
      ) +
      part(
        "piston",
        "Piston",
        `<rect x="257" y="151" width="128" height="67" rx="6" fill="url(#metal)" stroke="#526b7d" stroke-width="3"/><path d="M260 162h122m-122 11h122m-122 10h122" stroke="#3f566a" stroke-width="4"/><circle cx="321" cy="202" r="9" fill="#34495a"/>`,
      ) +
      part(
        "rod",
        "Connecting rod",
        `<path d="m310 202 10 94h21l-10-94z" fill="#ec9b53" stroke="#a96631" stroke-width="3"/><circle cx="321" cy="202" r="7" fill="#dfe7ed"/><circle cx="331" cy="296" r="15" fill="#ec9b53" stroke="#a96631" stroke-width="3"/>`,
      ) +
      part(
        "crankshaft",
        "Crankshaft",
        `<path d="M252 323h48l20-27h22l17 27h37" fill="none" stroke="#344e67" stroke-width="20" stroke-linejoin="round"/><circle cx="271" cy="323" r="24" fill="url(#metal)" stroke="#344e67" stroke-width="4"/><circle cx="271" cy="323" r="7" fill="#344e67"/><circle cx="378" cy="323" r="24" fill="url(#metal)" stroke="#344e67" stroke-width="4"/><circle cx="378" cy="323" r="7" fill="#344e67"/>`,
      ) +
      `<path d="M163 84h-39v248h39" fill="none" stroke="#8197a8" stroke-width="1.5"/><text x="110" y="217" transform="rotate(-90 110 217)">FOUR-STROKE ENGINE · SECTION VIEW</text>`;
  if (id === "electrical")
    s +=
      `<path d="M158 271V102H485V279H157" fill="none" stroke="#607d94" stroke-width="7"/><path d="m290 102-10-6v12z" fill="#f0753b"/>` +
      part(
        "battery",
        "Battery",
        `<rect x="98" y="211" width="118" height="89" rx="10" fill="#344e67"/><rect x="110" y="200" width="25" height="16" rx="3" fill="#f17a43"/><rect x="179" y="200" width="24" height="16" rx="3" fill="#91a4b4"/><text x="157" y="263" class="voltage">12 V</text><path d="M116 229h15m-7-7v14m57-7h15" stroke="white" stroke-width="3"/>`,
      ) +
      part(
        "fuse",
        "Fuse",
        `<rect x="228" y="82" width="91" height="40" rx="7" fill="#d5eae2" stroke="#36846d" stroke-width="3"/><path d="M239 102h15q19-24 37 0h18" fill="none" stroke="#36846d" stroke-width="4"/>`,
      ) +
      part(
        "switch",
        "Switch",
        `<rect x="354" y="72" width="89" height="59" rx="7" fill="#eef3f6"/><circle cx="369" cy="102" r="6" fill="#344e67"/><circle cx="428" cy="102" r="6" fill="#344e67"/><path d="m372 99 50-25" stroke="#f17a43" stroke-width="5"/>`,
      ) +
      part(
        "lamp",
        "Lamp",
        `<circle cx="485" cy="224" r="48" fill="#ffefc9" stroke="#c89746" stroke-width="3"/><path d="m452 191 66 66m-66 0 66-66" stroke="#c89746" stroke-width="4"/>`,
      ) +
      `<text x="320" y="354" text-anchor="middle">SIMPLIFIED 12 V LIGHTING CIRCUIT · SWITCH OPEN</text>`;
  if (id === "brakes")
    s +=
      `<path d="M391 72h79v270h-59" fill="none" stroke="#95a9b7" stroke-width="16"/>` +
      part(
        "rotor",
        "Brake rotor",
        `<circle cx="302" cy="206" r="140" fill="url(#metal)" stroke="#637d90" stroke-width="4"/><circle cx="302" cy="206" r="118" fill="none" stroke="#e1e8ee" stroke-width="3"/><circle cx="302" cy="206" r="92" fill="none" stroke="#718899" stroke-width="2"/><g fill="#566e80"><circle cx="226" cy="128" r="5"/><circle cx="300" cy="100" r="5"/><circle cx="380" cy="130" r="5"/><circle cx="410" cy="207" r="5"/><circle cx="375" cy="284" r="5"/><circle cx="300" cy="311" r="5"/><circle cx="224" cy="281" r="5"/><circle cx="193" cy="206" r="5"/></g>`,
      ) +
      part(
        "hub",
        "Wheel hub",
        `<circle cx="302" cy="206" r="53" fill="#c1ced7" stroke="#6c8395" stroke-width="4"/><circle cx="302" cy="206" r="20" fill="#4b6478"/><g fill="#4b6478"><circle cx="302" cy="169" r="6"/><circle cx="337" cy="195" r="6"/><circle cx="324" cy="236" r="6"/><circle cx="280" cy="236" r="6"/><circle cx="268" cy="195" r="6"/></g>`,
      ) +
      part(
        "pad",
        "Friction pad",
        `<path d="M384 127q49 76 0 158l-18-14q34-62 0-130z" fill="#3d4c59" stroke="#1c303f" stroke-width="3"/>`,
      ) +
      part(
        "caliper",
        "Brake caliper",
        `<path d="M420 116q21 0 23 26l7 123q-2 27-23 30h-32l-4-43 15-7-3-73-17-9 4-47z" fill="#ee794c" stroke="#b75130" stroke-width="4"/><path d="M421 144v122" stroke="#ffa67b" stroke-width="5"/><circle cx="426" cy="130" r="5" fill="#3c5367"/><circle cx="432" cy="280" r="5" fill="#3c5367"/>`,
      ) +
      `<text x="302" y="381" text-anchor="middle">DISC BRAKE ASSEMBLY · FRONT VIEW</text>`;
  if (id === "cooling")
    s +=
      `<path d="M230 126H465v155H223v-51" fill="none" stroke="#e48b65" stroke-width="14"/><path d="M465 260v21H223v-51" fill="none" stroke="#6d9cbd" stroke-width="14"/><path d="m391 126-13-7v14zm-49 155 13-7v14z" fill="#344e67"/>` +
      part(
        "engine",
        "Engine water jacket",
        `<path d="M128 103h111l21 30v119H120V133z" fill="#8a9fad" stroke="#4b657a" stroke-width="3"/><path d="M141 125h77v105h-77z" fill="#dbe7ee"/><path d="M150 143h58m-58 24h58m-58 24h58" stroke="#6d9cbd" stroke-width="9"/><text x="190" y="282" text-anchor="middle">ENGINE</text>`,
      ) +
      part(
        "thermostat",
        "Thermostat",
        `<circle cx="315" cy="126" r="27" fill="#f7c797" stroke="#ba804b" stroke-width="3"/><path d="M315 107v38m-13-27 26 15m-26 0 26-15" stroke="#ba804b" stroke-width="4"/>`,
      ) +
      part(
        "radiator",
        "Radiator",
        `<rect x="417" y="109" width="99" height="177" rx="9" fill="#c2d6e3" stroke="#56778e" stroke-width="4"/><path d="M433 120v154m16-154v154m16-154v154m16-154v154m16-154v154" stroke="#648ba7" stroke-width="5"/><path d="M422 148h89m-89 33h89m-89 33h89m-89 33h89" stroke="#9bb9cd" stroke-width="3"/>`,
      ) +
      part(
        "pump",
        "Coolant pump",
        `<circle cx="287" cy="281" r="28" fill="#80adc8" stroke="#436c86" stroke-width="3"/><path d="m287 260 5 15 16 6-15 5-6 17-5-17-16-5 16-6z" fill="#d9eaf2"/>`,
      ) +
      `<text x="320" y="355" text-anchor="middle">SIMPLIFIED COOLANT FLOW · WARM ENGINE</text>`;
  return interactive
    ? s + "</svg>"
    : (s + "</svg>").replaceAll(' role="button" tabindex="0"', "");
}
