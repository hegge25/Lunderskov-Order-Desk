// The rules engine. It plays Designers A–E from the case, in the re-sequenced order of the
// report's TO-BE process (process DSM, Figure 2): regulations and emission first, then the
// material, then H, d, N and the heat loss as one joint task, then strength and details.
// Each rule is tagged with its task; TASKS maps a task to the CTO step (C2–C4, all in the order
// configurator) or the ETO step (E2–E7, with the people who own it). Numbers are illustrative.

import { FIELDS, ITEM_FIELDS, MEDIA, INLET_ANGLE, fieldDef, parseItemKey } from '../config/pvm.js';
import {
  SITES, OTHER_SITE, WIND_ZONES, FILTERS, MATERIALS, INSULATION, CONSTANTS as K,
} from '../config/rules.js';

const OTHER_MEDIUM = { k: 14, filter: 'E', mandatoryFilter: true, corrosive: true, soot: 0.8 };
const FILTER_ORDER = ['A', 'B', 'C', 'D', 'E'];
const ENCLOSE = [0, 1, 2, 2.155, 2.414]; // enclosing radius of N circles, in liner radii
const LINER_T = { 'Stainless Steel': 0.004, 'Carbon Steel': 0.006, 'Fiber Glass': 0.010 };

export const TASKS = {
  reg:      { name: 'Local requirements and wind profile', CTO: 'C2', ETO: 'E2', owner: 'Legislation department' },
  emis:     { name: 'Minimum height and filters', CTO: 'C2', ETO: 'E3', owner: 'Designer C' },
  mat:      { name: 'Material pre-selection', CTO: 'C2', ETO: 'E4', owner: 'Design team A, B, D' },
  layout:   { name: 'Joint layout: H, d, N, insulation, fans', CTO: 'C2', ETO: 'E5', owner: 'Design team A, B, D' },
  strength: { name: 'Strength from the wind profile', CTO: 'C3', ETO: 'E6', owner: 'Design team A, B, D' },
  details:  { name: 'Detail parts', CTO: 'C4', ETO: 'E7', owner: 'Designer E' },
};
export const stepId = (task, cls) => TASKS[task]?.[cls] || task;
const FIELD_STEP = {
  flowRate: 'layout', flueTemp: 'mat', medium: 'emis', site: 'reg',
  inletShape: 'details', inletSize: 'details', inletHeight: 'details',
  doorDiameter: 'details', doorHeight: 'details', doorAngle: 'details',
  ladders: 'details', platforms: 'details',
};
const stepOf = (key) => FIELD_STEP[parseItemKey(key)?.list || key];

// Values used to draw a model while fields are still missing.
const RENDER_DEFAULTS = {
  flowRate: 25, flueTemp: 500, medium: 'Biomass', site: 'DK-Kolding',
  inletShape: 'Round', inletSize: 300, inletHeight: 2,
  doorDiameter: 600, doorHeight: 1, doorAngle: 0,
  ladders: [], platforms: [],
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ceilTo = (v, step) => Math.ceil(v / step - 1e-9) * step;
const roundTo = (v, step) => Math.round(v / step) * step;
const isEmpty = (v) => v === null || v === undefined || v === '';

export function fieldLabel(key, cfg) {
  const it = parseItemKey(key);
  if (it) {
    const f = FIELDS[it.list];
    const n = f.noun[0].toUpperCase() + f.noun.slice(1);
    return `${f.max > 1 ? `${n} ${it.index + 1}` : n} ${ITEM_FIELDS[FIELDS[it.list].item][it.prop].label.toLowerCase()}`;
  }
  const l = FIELDS[key].label;
  return typeof l === 'function' ? l(cfg) : l;
}
export function isActive(key, cfg) {
  const f = fieldDef(key);
  return !f.activeIf || f.activeIf(cfg);
}
function checkValue(f, v, key) {
  if (isEmpty(v)) return { state: 'missing', msg: 'Not specified' };
  if (f.type === 'number' && (v < f.min || v > f.max)) return { state: 'eto', msg: `Outside PVM interval ${f.min}–${f.max} ${f.unit}` };
  if (f.eto && f.eto.includes(v)) return { state: 'eto', msg: key === 'site' ? 'Not in the location database' : 'Not a PVM option' };
  return { state: 'ok' };
}

export function checkFields(cfg) {
  const status = {};
  for (const key of Object.keys(FIELDS)) {
    const f = FIELDS[key];
    const v = cfg[key];
    if (f.type === 'list') {
      // null = the customer has not said; [] = explicitly none
      status[key] = v == null ? { state: 'missing', msg: 'Not specified' } : { state: 'ok' };
      (v || []).forEach((item, i) => {
        for (const [prop, def] of Object.entries(ITEM_FIELDS[f.item])) {
          status[`${key}.${i}.${prop}`] = checkValue(def, item[prop], prop);
        }
      });
    } else if (!isActive(key, cfg)) status[key] = { state: 'inactive' };
    else status[key] = checkValue(f, v, key);
  }
  return status;
}

export function computeDesign(cfg) {
  const fields = checkFields(cfg);
  const missing = Object.keys(fields).filter((k) => fields[k].state === 'missing');
  const eto = [];
  const errors = [];
  const log = [];
  const say = (step, text, kind = 'info') => log.push({ step, text, kind });

  for (const [key, st] of Object.entries(fields)) {
    if (st.state === 'eto') eto.push({ step: stepOf(key), field: key, text: `${fieldLabel(key, cfg)}: ${st.msg}` });
  }

  const c = { ...RENDER_DEFAULTS };
  for (const [k, v] of Object.entries(cfg)) if (!isEmpty(v)) c[k] = v;

  const site = SITES[c.site] || OTHER_SITE;
  const medium = MEDIA[c.medium] || OTHER_MEDIUM;
  const Q = Number(c.flowRate);
  const Tf = Number(c.flueTemp);
  const T0 = site.T0;
  const vb = WIND_ZONES[site.wind];

  if (!SITES[c.site]) say('reg', 'Location not in the location database: building and emission regulations and the wind profile must be obtained by the legislation department.', 'eto');
  else say('reg', `${site.label}: height limits ${site.minH}–${site.maxH} m, emission factor ${site.emis}, wind zone ${site.wind} (${vb} m/s at 10 m). Looked up in the location database; by hand this takes 3–5 days.`);

  // ── C · Emission: minimum height, and filters if that height is not allowed ──
  const Hmin0 = medium.k * Math.sqrt(Q) * site.emis;
  let filter = null;
  let Hreq = Hmin0;
  if (medium.mandatoryFilter || Hmin0 > site.maxH) {
    const start = FILTER_ORDER.indexOf(medium.filter);
    let type = medium.filter;
    for (let i = start; i < FILTER_ORDER.length; i++) {
      type = FILTER_ORDER[i];
      Hreq = Hmin0 * (1 - FILTERS[type].reduction);
      if (Hreq <= site.maxH) break;
    }
    filter = { type, count: clamp(Math.ceil(Q / 12), 1, 10), ...FILTERS[type] };
    say('emis', medium.mandatoryFilter
      ? `${c.medium} requires flue gas filtering (${site.country} rules). ${filter.count} × filter ${type}.`
      : `Unfiltered emission needs ${Hmin0.toFixed(0)} m, above the local maximum of ${site.maxH} m. ${filter.count} × filter ${type} lowers it to ${Hreq.toFixed(0)} m.`);
    if (Hreq > site.maxH) eto.push({ step: 'emis', text: `Needs ${Hreq.toFixed(0)} m even with filter E; local maximum is ${site.maxH} m` });
  } else {
    say('emis', `${c.medium} at ${Q} m³/s needs at least ${Hmin0.toFixed(0)} m to disperse. No filter needed below the ${site.maxH} m limit.`);
  }

  // ── A · Height ──
  const Hfloor = Math.max(site.minH, c.inletHeight + 6);
  const H = Math.ceil(Math.max(Hreq, Hfloor));
  say('layout', Hreq >= Hfloor
    ? `Height set to ${H} m by the emission requirement.`
    : `Height set to ${H} m by the local minimum height (emission alone would allow ${Math.ceil(Hreq)} m).`);
  if (H > 150) eto.push({ step: 'layout', text: `Height ${H} m is beyond the 150 m plate range` });

  // ── B · Material and insulation ──
  let linerMat;
  if (medium.corrosive || Tf > 673) linerMat = 'Stainless Steel';
  else if (Tf < 473) linerMat = 'Fiber Glass';
  else linerMat = 'Carbon Steel';
  const shellMat = site.coastal ? 'Stainless Steel' : Tf > 773 ? 'Carbon Steel' : 'Corten Steel';
  const insType = Tf > 773 ? 'Insulating Bricks' : 'Rock Wool';
  const tIns = insType === 'Insulating Bricks'
    ? 0.115
    : roundTo(clamp(0.04 + (873 - Tf) * 0.00012 + (H > 60 ? 0.02 : 0), 0.03, 0.2), 0.01);
  const tLiner = LINER_T[linerMat];
  say('mat', `Liner in ${linerMat.toLowerCase()} (${medium.corrosive ? 'corrosive medium' : Tf < 473 ? 'low temperature, condensate risk' : Tf > 673 ? 'high temperature' : 'ordinary duty'}). Shell in ${shellMat.toLowerCase()}${site.coastal ? ' for the coastal site' : ''}.`);
  say('layout', `${insType} insulation, ${Math.round(tIns * 1000)} mm.`);

  // ── A + B iterate: heat loss, draft, fans, liner size ──
  const U = INSULATION[insType].k / tIns;
  let N = Q <= 20 ? 1 : Q <= 38 ? 2 : 3;
  let d = 1, v = 10, vNat = 10, Tm = Tf, dT = 0, fans = null, Ro = 1, Renc = 1, tShell = 0.01;
  let iters = 0;
  for (let iter = 0; iter < 12; iter++) {
    const RoPrev = Ro;
    iters = iter + 1;
    const D = 2 * Ro;
    const mcp = (353 / Tf) * Q * 1100;
    dT = (6 * U * Math.PI * D * H * (Tf - T0)) / mcp;
    Tm = Tf - dT / 2;
    vNat = K.C * Math.sqrt(2 * K.g * H * ((Tm - T0) / Tm));
    const needFans = Tm - T0 < 150;
    v = needFans ? Math.max(vNat, 12) : vNat;
    if (needFans) {
      const count = clamp(Math.ceil(Q / 8), 1, 10);
      const q = Q / count;
      fans = { count, size: [5, 10, 15, 20, 25][clamp(Math.floor(q / 1.5), 0, 4)], rpm: clamp(roundTo(300 + q * 90, 10), 200, 1000) };
    } else fans = null;
    const sizeFor = (n) => ceilTo(Math.sqrt((4 * Q) / (n * Math.PI * v)), 0.05);
    d = sizeFor(N);
    while (d > K.maxLinerD && N < 4) d = sizeFor(++N);
    const rL = d / 2 + tLiner;
    Renc = ENCLOSE[N] * rL + K.gap;
    tShell = clamp(Math.round(8 + 0.05 * H * (vb / 24) ** 2 * Math.sqrt(2.5 / D)), 10, 100) / 1000;
    Ro = Renc + tIns + tShell;
    if (iter > 0 && Math.abs(Ro - RoPrev) < 0.0005) break;
  }
  const D = 2 * Ro;
  const Tout = Tf - dT;
  if (fans) {
    say('layout', `Mean flue gas ${Tm.toFixed(0)} K is only ${(Tm - T0).toFixed(0)} K above outside air: natural draft too weak. ${fans.count} × auxiliary fan (size ${fans.size}, ${fans.rpm} rpm).`, 'warn');
    say('layout', `Capacity solved with forced draft at ${v.toFixed(1)} m/s.`);
  }
  say('layout', `Heat loss ${dT.toFixed(1)} K over ${H} m: ${Tf} K in, ${Tout.toFixed(0)} K at the outlet.`);
  say('layout', `Q = C·A·√(2gH·ΔT/T)·N → ${N} × Ø ${d.toFixed(2)} m liner${N > 1 ? 's' : ''} at ${v.toFixed(1)} m/s.`);
  say('layout', `Capacity and heat loss solved as one task: converged after ${iters} iterations. In the AS-IS process this loop runs between designers A and B (steps 3, 4, 8 and 11).`);
  if (N === 4 && d > K.maxLinerD) eto.push({ step: 'layout', text: `Needs liners over Ø ${K.maxLinerD} m even with 4 flues` });

  // ── D · Structure ──
  const lambda = H / D;
  const shift = site.wind >= 4 ? 3 : 0;
  const vTop = vb * Math.pow(H / 10, site.alpha);
  let guyLevels = [];
  let tubeLevels = [];
  if (lambda > 18 - shift) guyLevels = [0.66];
  if (lambda > 28 - shift) guyLevels = [0.45, 0.8];
  if (lambda > 40 - shift) { guyLevels = [0.35, 0.6, 0.85]; tubeLevels = [0.25, 0.5]; }
  guyLevels = guyLevels.map((f) => Math.round(H * f));
  const wireDia = clamp(Math.round(5 + H / 10), 5, 20);
  const tubeDia = clamp(Math.round(30 + H / 3), 20, 100);
  if (lambda > 55 - shift) eto.push({ step: 'strength', text: `Slenderness H/D = ${lambda.toFixed(0)} needs a special structural design` });
  say('strength', `Wind zone ${site.wind}: ${vb} m/s at 10 m, ${vTop.toFixed(0)} m/s at the top. Shell plates ${Math.round(tShell * 1000)} mm.`);
  say('strength', guyLevels.length
    ? `Slenderness H/D = ${lambda.toFixed(1)}: ${guyLevels.length * 3} guy wires (Ø ${wireDia} mm) at ${guyLevels.join(', ')} m${tubeLevels.length ? `, plus ${tubeLevels.length} lateral steel tubes to the plant` : ''}.`
    : `Slenderness H/D = ${lambda.toFixed(1)}: self-supporting.`);

  // ── E · Details: ladders and platforms ──
  const elevOf = (type) => (type === 'Top Platform' ? H - 1.5
    : type === 'Measuring Platform' ? Math.round(H * 0.6)
    : Math.max(4, Math.round(H * 0.3)));
  const covers = (pl, angle) => {
    if (pl.arc >= 360) return true;
    const d = Math.abs((((angle - pl.angle) % 360) + 540) % 360 - 180);
    return d <= pl.arc / 2 + 1e-6;
  };
  const platforms = (c.platforms || []).map((pl) => {
    const arc = Number(pl.arc);
    const width = Number(pl.width);
    return {
      // the platform is centred on the ladder that serves it
      type: pl.type, angle: Number((c.ladders || [])[0]?.angle ?? 0), arc, width, elev: elevOf(pl.type),
      area: (arc / 360) * Math.PI * ((Ro + width) ** 2 - Ro ** 2),
    };
  });
  const topPlatform = platforms.find((pl) => pl.type === 'Top Platform');
  const ladders = (c.ladders || []).map((l) => {
    const angle = Number(l.angle);
    // A ladder stops at the roof edge, or at step-off height above a top platform it reaches.
    const top = topPlatform && covers(topPlatform, angle) ? H - 1.5 + 1.1 : H;
    const length = top - 0.3;
    return {
      type: l.type, angle, top, length,
      steps: Math.min(450, Math.floor(length * 3)),
      flanges: Math.min(150, Math.ceil(length)),
      cage: l.type === 'With Back Support at Top' ? [Math.max(2.5, top - 6), top]
        : l.type === 'With Back Support in all Length' ? [2.5, top] : null,
      harness: l.type === 'With Safety Harness',
    };
  });
  ladders.forEach((l, i) => say('details', `Ladder ${i + 1} at ${l.angle}°: ${l.steps} steps, ${l.flanges} connecting flanges${l.cage ? `, back support over ${(l.cage[1] - l.cage[0]).toFixed(0)} m` : ''}${l.harness ? ', safety line' : ''}.`));
  platforms.forEach((pl) => say('details', `${pl.type} at +${pl.elev.toFixed(1)} m, ${pl.arc}° centred at ${pl.angle}°, ${pl.area.toFixed(1)} m² chequer plate.`));

  // Conflicts: impossible combinations the configurator refuses.
  const doorAngle = Number(c.doorAngle);
  if (doorAngle === INLET_ANGLE) errors.push({ step: 'details', field: 'doorAngle', text: `Cleaning door at ${INLET_ANGLE}° collides with the flue gas inlet` });
  ladders.forEach((l, i) => {
    const f = `ladders.${i}.angle`;
    if (l.angle === INLET_ANGLE) errors.push({ step: 'details', field: f, text: `Ladder ${i + 1} at ${INLET_ANGLE}° runs into the flue gas inlet` });
    else if (l.angle === doorAngle) errors.push({ step: 'details', field: f, text: `Ladder ${i + 1} blocks the cleaning door at ${doorAngle}°` });
    else if (ladders.findIndex((o) => o.angle === l.angle) < i) errors.push({ step: 'details', field: f, text: `Ladder ${i + 1} is at the same angle as another ladder` });
  });
  platforms.forEach((pl, i) => {
    if (platforms.findIndex((o) => o.type === pl.type) < i) errors.push({ step: 'details', field: `platforms.${i}.type`, text: `Platform ${i + 1}: only one ${pl.type.toLowerCase()} per chimney` });
    else if (cfg.ladders != null && !ladders.some((l) => covers(pl, l.angle)))
      errors.push({ step: 'details', field: `platforms.${i}.angle`, text: ladders.length ? `${pl.type} has no ladder within its ${pl.arc}° arc` : `${pl.type} has no access: add a ladder` });
  });
  if (c.doorDiameter / 1000 > 0.45 * D) eto.push({ step: 'details', field: 'doorDiameter', text: `Door Ø ${c.doorDiameter} mm is too large for a Ø ${D.toFixed(2)} m shell (reinforced opening)` });
  if (c.inletSize / 1000 > 0.4 * D) eto.push({ step: 'details', field: 'inletSize', text: 'Inlet too large for the shell diameter' });

  const aviation = H >= K.aviationH;
  if (aviation) say('details', `Above ${K.aviationH} m: obstruction marking and aviation lights${H >= 90 ? ' at the top and mid-height' : ' at the top'}.`);

  // ── Weight ──
  const shellKg = Math.PI * D * H * tShell * MATERIALS[shellMat].density;
  const linerKg = N * Math.PI * d * H * tLiner * MATERIALS[linerMat].density;
  const insM3 = Math.PI * ((Renc + tIns) ** 2 - Renc ** 2) * H;
  const insKg = insM3 * INSULATION[insType].density;
  const cageLen = (l) => (l.cage ? l.cage[1] - l.cage[0] : 0);
  const accKg = ladders.reduce((s, l) => s + l.length * 14 + cageLen(l) * 9, 0) + platforms.reduce((s, pl) => s + pl.area * 95, 0);
  const weight = shellKg + linerKg + insKg + accKg;

  // ── Quote ──
  const ctoHours = 8;
  const etoHours = eto.length ? 40 + eto.length * 20 : 0;
  const lines = [
    { label: `Shell, ${shellMat.toLowerCase()}`, amount: shellKg * MATERIALS[shellMat].pricePerKg },
    { label: `Liners, ${N} × ${linerMat.toLowerCase()}`, amount: linerKg * MATERIALS[linerMat].pricePerKg },
    { label: `Insulation, ${insType.toLowerCase()}`, amount: insM3 * INSULATION[insType].pricePerM3 },
    { label: 'Ladders, platforms, door, inlet', amount: ladders.reduce((s, l) => s + l.length * 1450 + cageLen(l) * 900, 0) + platforms.reduce((s, pl) => s + pl.area * 6800, 0) + ({ 200: 9000, 600: 14000, 800: 18000 }[c.doorDiameter] || 14000) + 6000 + c.inletSize * 20 },
    { label: 'Fans and filters', amount: (fans ? fans.count * 42000 : 0) + (filter ? filter.count * filter.price : 0) },
    { label: 'Supports and foundation', amount: guyLevels.length * 3 * 18000 + tubeLevels.length * 26000 + 40000 + 2000 * D * D },
    { label: `Engineering, ${ctoHours + etoHours} h`, amount: (ctoHours + etoHours) * K.hourRate },
    { label: 'Transport and installation', amount: 25000 + 400 * H },
  ].filter((l) => l.amount > 0);
  const cost = lines.reduce((s, l) => s + l.amount, 0);
  const price = {
    lines,
    cost,
    total: cost * (1 + K.margin),
    accuracy: eto.length ? 0.15 : 0, // R6: a CTO quotation is the final price
  };

  const cls = eto.length ? 'ETO' : 'CTO';
  const steps = {};
  for (const t of Object.keys(TASKS)) steps[t] = { eto: eto.filter((e) => e.step === t) };

  const values = {
    Q, Tf, T0, Tm, Tout, dT, H, N, d, v, vNat, D, Ro, Renc, tIns, tLiner, tShell,
    iters, linerMat, shellMat, insType, lambda, vb, vTop, Hmin0, Hreq, filter, fans,
    guyLevels, tubeLevels, wireDia, tubeDia, ladders, platforms, aviation, weight,
    door: { dia: c.doorDiameter, height: c.doorHeight, angle: doorAngle },
    inlet: { shape: c.inletShape, size: c.inletSize, height: c.inletHeight },
    site, siteKey: c.site, medium: c.medium,
  };

  return {
    cls, eto, errors, missing, fields, log, steps, price, values,
    complete: missing.length === 0,
    releasable: missing.length === 0 && errors.length === 0,
    params: toParams(values, medium, cfg),
    parts: partInfo(values),
    bom: partList(values),
  };
}

// C5 / E8 output: the part list, using the part view of the PVM (Appendix 1) for names and cardinalities.
function partList(v) {
  const rows = [];
  const add = (part, sub, spec, qty, unit = 'pcs') => rows.push({ part, sub, spec, qty, unit });
  add('Chimney', 'Outer Shaped Plate', `${v.shellMat}, width 1 m, t = ${Math.round(v.tShell * 1000)} mm`, v.H);
  add('Chimney', 'Inner Shaped Plate', `${v.linerMat}, liner Ø ${v.d.toFixed(2)} m, t = ${Math.round(v.tLiner * 1000)} mm`, v.H * v.N, `pcs (${v.N} × ${v.H})`);
  if (v.guyLevels.length) add('Chimney', 'Wire Support', `Ø ${v.wireDia} mm, collars at ${v.guyLevels.join(', ')} m`, v.guyLevels.length * 3);
  if (v.tubeLevels.length) add('Chimney', 'Steel Tubes Side Lateral Support', `Ø ${v.tubeDia} mm to the plant`, v.tubeLevels.length);
  add('Insulation', '', `${v.insType}, ${Math.round(v.tIns * 1000)} mm`, Number((Math.PI * ((v.Renc + v.tIns) ** 2 - v.Renc ** 2) * v.H).toFixed(1)), 'm³');
  add('Gas Inlet', 'Flue Gas Inlet', `${v.inlet.shape === 'Square' ? 'Square, w' : 'Circular, Ø'} ${v.inlet.size} mm at h = ${v.inlet.height} m`, 1);
  add('Gas Inlet', 'Locking Plate', `for ${v.inlet.size} mm inlet`, 1);
  add('Gas Inlet', 'Hinges', `Type ${v.inlet.size > 300 ? 'C' : 'B'}`, 2);
  v.ladders.forEach((l) => {
    add('Ladder', 'Ladder Steps', `${l.type}, at ${l.angle}°`, l.steps);
    add('Ladder', 'Connecting Flanges', 'One size', l.flanges);
    add('Ladder', 'Railing', `length ${l.length.toFixed(1)} m`, 1);
    if (l.cage) add('Ladder', 'Back Support', `length ${(l.cage[1] - l.cage[0]).toFixed(1)} m, diameter ${v.D > 3 ? 'C' : v.D > 2 ? 'B' : 'A'}`, 1);
    if (l.harness) add('Ladder', 'Harness (safety line)', `length ${l.length.toFixed(1)} m`, 1);
  });
  v.platforms.forEach((pl) => {
    add('Platform', 'Chequer Plate', `${pl.type}, ${pl.arc}°, width ${pl.width} m, +${pl.elev.toFixed(1)} m`, Number(pl.area.toFixed(1)), 'm²');
    add('Platform', 'Railing', 'height 1,5 m', 1);
  });
  if (v.fans) {
    add('Fans', 'Auxiliary Blower', `fan diameter ${v.fans.size}`, v.fans.count);
    add('Fans', 'El-motor', `${v.fans.rpm} RPM`, v.fans.count);
  }
  add('Cleaning Door', 'Manhole Cover', `Ø ${v.door.dia} mm at R = ${v.door.height} m, ${v.door.angle}°`, 1);
  add('Cleaning Door', 'Locking Plate', `for Ø ${v.door.dia} mm`, 1);
  add('Cleaning Door', 'Hinges', `Type ${v.door.dia >= 800 ? 'C' : v.door.dia >= 600 ? 'B' : 'A'}`, 2);
  if (v.filter) add('Filter', '', v.filter.label, v.filter.count);
  return rows;
}

// Flat numeric parameters for the 3D model, so they can be tweened.
function toParams(v, medium, cfg) {
  return {
    H: v.H, Ro: v.Ro, Renc: v.Renc, tShell: v.tShell, tIns: v.tIns,
    rLiner: v.d / 2, tLiner: v.tLiner, N: v.N,
    shellLook: MATERIALS[v.shellMat].look, linerLook: MATERIALS[v.linerMat].look, insType: v.insType,
    inletShape: v.inlet.shape, inletR: v.inlet.size / 2000, inletH: v.inlet.height,
    doorR: v.door.dia / 2000, doorH: v.door.height, doorAz: v.door.angle,
    ladders: v.ladders.map((l) => ({
      az: l.angle, top: l.top, cageFrom: l.cage ? l.cage[0] : 0, cageTo: l.cage ? l.cage[1] : 0,
      harness: l.harness ? 1 : 0, steps: l.steps,
    })),
    platforms: v.platforms.map((pl) => ({ type: pl.type, az: pl.angle, elev: pl.elev, arc: pl.arc, w: pl.width })),
    laddersMissing: cfg.ladders == null ? 1 : 0,
    platformsMissing: cfg.platforms == null ? 1 : 0,
    fanCount: v.fans ? v.fans.count : 0, fanRpm: v.fans ? v.fans.rpm : 0,
    filterCount: v.filter ? v.filter.count : 0, filterType: v.filter ? v.filter.type : '',
    filterReduction: v.filter ? v.filter.reduction : 0,
    guyLevels: v.guyLevels, wireR: v.wireDia / 2000, tubeLevels: v.tubeLevels.map((f) => v.H * f), tubeR: v.tubeDia / 2000,
    aviation: v.aviation ? 1 : 0,
    Tf: v.Tf, Tout: v.Tout, T0: v.T0, vGas: v.v, Q: v.Q,
    windVb: v.vb, windAlpha: v.site.alpha,
    soot: medium.soot * (1 - (v.filter ? v.filter.reduction * 1.4 : 0)),
    steam: v.Tf < 430 ? 1 : 0,
  };
}

const mm = (m) => `${Math.round(m * 1000)} mm`;
const m2 = (m) => `${m.toFixed(2)} m`;

function partInfo(v) {
  return {
    shell: { title: `Outer shell · ${v.shellMat}`, lines: [`Ø ${m2(v.D)} · plates ${mm(v.tShell)}`, `${v.H} shaped plates, 1 m wide`, `Dead weight ${(v.weight / 1000).toFixed(1)} t (whole chimney)`], step: 'strength' },
    insulation: { title: `Insulation · ${v.insType}`, lines: [`${mm(v.tIns)} between inner and outer plates`, `λ ${INSULATION[v.insType].k} W/(m·K)`, `Heat loss ${v.dT.toFixed(1)} K over the height`], step: 'layout' },
    liners: { title: `${v.N} × inner liner · ${v.linerMat}`, lines: [`Ø ${m2(v.d)} · wall ${mm(v.tLiner)}`, `Gas velocity ${v.v.toFixed(1)} m/s`, `${v.Tf} K in → ${v.Tout.toFixed(0)} K out`], step: 'layout' },
    inlet: { title: `Flue gas inlet · ${v.inlet.shape}`, lines: [`${v.inlet.shape === 'Square' ? 'w' : 'Ø'} ${v.inlet.size} mm at h = ${v.inlet.height} m`, `Faces the plant at ${INLET_ANGLE}°`, 'Locking plate, 2 hinges'], step: 'details' },
    door: { title: 'Cleaning door', lines: [`Manhole cover Ø ${v.door.dia} mm`, `Centre at R = ${v.door.height} m, ${v.door.angle}°`], step: 'details' },
    ladder: v.ladders.length ? { title: `${v.ladders.length} × safety ladder`, lines: v.ladders.map((l) => `${l.angle}° · ${l.type.replace('With ', '')} · ${l.steps} steps`), step: 'details' } : null,
    platform: v.platforms.length ? { title: `${v.platforms.length} × platform`, lines: v.platforms.map((pl) => `${pl.type} +${pl.elev.toFixed(1)} m · ${pl.arc}° @ ${pl.angle}° · ${pl.width} m`), step: 'details' } : null,
    fans: v.fans ? { title: `${v.fans.count} × auxiliary fan`, lines: [`Blower size ${v.fans.size} · ${v.fans.rpm} rpm`, `Forced draft ${v.v.toFixed(1)} m/s (natural ${v.vNat.toFixed(1)})`], step: 'layout' } : null,
    filters: v.filter ? { title: `${v.filter.count} × filter ${v.filter.type}`, lines: [v.filter.label, `Lowers emission height by ${Math.round(v.filter.reduction * 100)} %`], step: 'emis' } : null,
    supports: v.guyLevels.length ? { title: 'Structural support', lines: [`${v.guyLevels.length * 3} guy wires Ø ${v.wireDia} mm`, `Collars at ${v.guyLevels.join(', ')} m`, v.tubeLevels.length ? `${v.tubeLevels.length} lateral tubes Ø ${v.tubeDia} mm` : `H/D = ${v.lambda.toFixed(1)}`], step: 'strength' } : null,
    foundation: { title: 'Foundation & base flange', lines: [`Plinth Ø ${m2(v.D + 2.4)}`, `${Math.max(8, Math.round(v.D * 6))} anchor bolts`], step: 'strength' },
    lights: v.aviation ? { title: 'Aviation obstruction lights', lines: [`Required above 45 m`, 'Red/white marking on the top section'], step: 'details' } : null,
  };
}
