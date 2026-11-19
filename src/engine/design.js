// The rules engine. It plays Designers A–E from the case: capacity, thermal, emission,
// structure and details. The numbers are dummy but the dependencies follow the case.

import { FIELDS, MEDIA, INLET_ANGLE } from '../config/pvm.js';
import {
  SITES, OTHER_SITE, WIND_ZONES, FILTERS, MATERIALS, INSULATION, CONSTANTS as K,
} from '../config/rules.js';

const OTHER_MEDIUM = { k: 14, filter: 'E', mandatoryFilter: true, corrosive: true, soot: 0.8 };
const FILTER_ORDER = ['A', 'B', 'C', 'D', 'E'];
const ENCLOSE = [0, 1, 2, 2.155, 2.414]; // enclosing radius of N circles, in liner radii
const LINER_T = { 'Stainless Steel': 0.004, 'Carbon Steel': 0.006, 'Fiber Glass': 0.010 };

export const STEP_NAMES = {
  A: 'Capacity',
  B: 'Thermal & material',
  C: 'Emission',
  D: 'Structure',
  E: 'Details',
};
const FIELD_STEP = {
  flowRate: 'A', flueTemp: 'B', medium: 'C', site: 'C',
  inletShape: 'E', inletSize: 'E', inletHeight: 'E',
  doorDiameter: 'E', doorHeight: 'E', doorAngle: 'E',
  ladderType: 'E', ladderAngle: 'E',
  platformType: 'E', platformArc: 'E', platformWidth: 'E',
};

// Values used to draw a model while fields are still missing.
const RENDER_DEFAULTS = {
  flowRate: 25, flueTemp: 500, medium: 'Biomass', site: 'DK-Kolding',
  inletShape: 'Round', inletSize: 300, inletHeight: 2,
  doorDiameter: 600, doorHeight: 1, doorAngle: 0,
  ladderType: 'None', ladderAngle: 0,
  platformType: 'None', platformArc: 180, platformWidth: 1,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ceilTo = (v, step) => Math.ceil(v / step - 1e-9) * step;
const roundTo = (v, step) => Math.round(v / step) * step;
const isEmpty = (v) => v === null || v === undefined || v === '';

export function fieldLabel(key, cfg) {
  const l = FIELDS[key].label;
  return typeof l === 'function' ? l(cfg) : l;
}
export function isActive(key, cfg) {
  const f = FIELDS[key];
  return !f.activeIf || f.activeIf(cfg);
}

export function checkFields(cfg) {
  const status = {};
  for (const key of Object.keys(FIELDS)) {
    const f = FIELDS[key];
    const v = cfg[key];
    if (!isActive(key, cfg)) status[key] = { state: 'inactive' };
    else if (isEmpty(v)) status[key] = { state: 'missing', msg: 'Not specified' };
    else if (f.type === 'number' && (v < f.min || v > f.max))
      status[key] = { state: 'eto', msg: `Outside PVM interval ${f.min}–${f.max} ${f.unit}` };
    else if (f.eto && f.eto.includes(v))
      status[key] = { state: 'eto', msg: key === 'site' ? 'Site not in regulation database' : 'Not a PVM option' };
    else status[key] = { state: 'ok' };
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
    if (st.state === 'eto') eto.push({ step: FIELD_STEP[key], field: key, text: `${fieldLabel(key, cfg)}: ${st.msg}` });
  }

  const c = { ...RENDER_DEFAULTS };
  for (const [k, v] of Object.entries(cfg)) if (!isEmpty(v)) c[k] = v;

  const site = SITES[c.site] || OTHER_SITE;
  const medium = MEDIA[c.medium] || OTHER_MEDIUM;
  const Q = Number(c.flowRate);
  const Tf = Number(c.flueTemp);
  const T0 = site.T0;
  const vb = WIND_ZONES[site.wind];

  if (!SITES[c.site]) say('C', 'Site not in the regulation database: local building and emission rules must be obtained by hand.', 'eto');

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
    say('C', medium.mandatoryFilter
      ? `${c.medium} requires flue gas filtering (${site.country} rules). ${filter.count} × filter ${type}.`
      : `Unfiltered emission needs ${Hmin0.toFixed(0)} m, above the local maximum of ${site.maxH} m. ${filter.count} × filter ${type} lowers it to ${Hreq.toFixed(0)} m.`);
    if (Hreq > site.maxH) eto.push({ step: 'C', text: `Needs ${Hreq.toFixed(0)} m even with filter E; local maximum is ${site.maxH} m` });
  } else {
    say('C', `${c.medium} at ${Q} m³/s needs at least ${Hmin0.toFixed(0)} m to disperse. No filter needed below the ${site.maxH} m limit.`);
  }

  // ── A · Height ──
  const Hfloor = Math.max(site.minH, c.inletHeight + 6);
  const H = Math.ceil(Math.max(Hreq, Hfloor));
  say('A', Hreq >= Hfloor
    ? `Height set to ${H} m by the emission requirement.`
    : `Height set to ${H} m by the local minimum height (emission alone would allow ${Math.ceil(Hreq)} m).`);
  if (H > 150) eto.push({ step: 'A', text: `Height ${H} m is beyond the 150 m plate range` });

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
  say('B', `Liner in ${linerMat.toLowerCase()} (${medium.corrosive ? 'corrosive medium' : Tf < 473 ? 'low temperature, condensate risk' : Tf > 673 ? 'high temperature' : 'ordinary duty'}). Shell in ${shellMat.toLowerCase()}${site.coastal ? ' for the coastal site' : ''}.`);
  say('B', `${insType} insulation, ${Math.round(tIns * 1000)} mm.`);

  // ── A + B iterate: heat loss, draft, fans, liner size ──
  const U = INSULATION[insType].k / tIns;
  let N = Q <= 20 ? 1 : Q <= 38 ? 2 : 3;
  let d = 1, v = 10, vNat = 10, Tm = Tf, dT = 0, fans = null, Ro = 1, Renc = 1, tShell = 0.01;
  for (let iter = 0; iter < 5; iter++) {
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
  }
  const D = 2 * Ro;
  const Tout = Tf - dT;
  if (fans) {
    say('B', `Mean flue gas ${Tm.toFixed(0)} K is only ${(Tm - T0).toFixed(0)} K above outside air: natural draft too weak. ${fans.count} × auxiliary fan (size ${fans.size}, ${fans.rpm} rpm).`, 'warn');
    say('A', `Capacity re-calculated with forced draft at ${v.toFixed(1)} m/s.`);
  }
  say('B', `Heat loss ${dT.toFixed(1)} K over ${H} m: ${Tf} K in, ${Tout.toFixed(0)} K at the outlet.`);
  say('A', `Q = C·A·√(2gH·ΔT/T)·N → ${N} × Ø ${d.toFixed(2)} m liner${N > 1 ? 's' : ''} at ${v.toFixed(1)} m/s.`);
  if (N === 4 && d > K.maxLinerD) eto.push({ step: 'A', text: `Needs liners over Ø ${K.maxLinerD} m even with 4 flues` });

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
  if (lambda > 55 - shift) eto.push({ step: 'D', text: `Slenderness H/D = ${lambda.toFixed(0)} needs a special structural design` });
  say('D', `Wind zone ${site.wind}: ${vb} m/s at 10 m, ${vTop.toFixed(0)} m/s at the top. Shell plates ${Math.round(tShell * 1000)} mm.`);
  say('D', guyLevels.length
    ? `Slenderness H/D = ${lambda.toFixed(1)}: ${guyLevels.length * 3} guy wires (Ø ${wireDia} mm) at ${guyLevels.join(', ')} m${tubeLevels.length ? `, plus ${tubeLevels.length} lateral steel tubes to the plant` : ''}.`
    : `Slenderness H/D = ${lambda.toFixed(1)}: self-supporting.`);

  // ── E · Details ──
  const ladderOn = c.ladderType !== 'None';
  const ladderTop = H + 1.0;
  const ladder = ladderOn
    ? {
        type: c.ladderType,
        angle: Number(c.ladderAngle),
        length: ladderTop - 0.3,
        steps: Math.min(450, Math.floor((ladderTop - 0.3) * 3)),
        flanges: Math.min(150, Math.ceil(ladderTop - 0.3)),
        cage: c.ladderType === 'With Back Support at Top'
          ? [Math.max(2.5, ladderTop - 6), ladderTop]
          : c.ladderType === 'With Back Support in all Length' ? [2.5, ladderTop] : null,
        harness: c.ladderType === 'With Safety Harness',
      }
    : null;
  const platOn = c.platformType !== 'None';
  const platElev = c.platformType === 'Top Platform' ? H - 1.5
    : c.platformType === 'Measuring Platform' ? Math.round(H * 0.6)
    : Math.max(4, Math.round(H * 0.3));
  const platform = platOn
    ? {
        type: c.platformType,
        elev: platElev,
        arc: Number(c.platformArc),
        width: Number(c.platformWidth),
        angle: ladderOn ? Number(c.ladderAngle) : 0,
        area: (Number(c.platformArc) / 360) * Math.PI * ((Ro + Number(c.platformWidth)) ** 2 - Ro ** 2),
      }
    : null;
  if (ladder) say('E', `${ladder.steps} ladder steps, ${ladder.flanges} connecting flanges${ladder.cage ? `, back support over ${(ladder.cage[1] - ladder.cage[0]).toFixed(0)} m` : ''}${ladder.harness ? ', safety line' : ''}.`);
  if (platform) say('E', `${platform.type} at +${platform.elev.toFixed(1)} m, ${platform.arc}°, ${platform.area.toFixed(1)} m² chequer plate.`);

  // Conflicts: impossible combinations the configurator refuses.
  const doorAngle = Number(c.doorAngle);
  if (doorAngle === INLET_ANGLE) errors.push({ step: 'E', field: 'doorAngle', text: `Cleaning door at ${INLET_ANGLE}° collides with the flue gas inlet` });
  if (ladderOn && ladder.angle === INLET_ANGLE) errors.push({ step: 'E', field: 'ladderAngle', text: `Ladder at ${INLET_ANGLE}° runs into the flue gas inlet` });
  if (ladderOn && ladder.angle === doorAngle) errors.push({ step: 'E', field: 'ladderAngle', text: 'Ladder blocks the cleaning door: place them at different angles' });
  if (platOn && !ladderOn && !isEmpty(cfg.ladderType)) errors.push({ step: 'E', field: 'platformType', text: 'Platform has no access: add a ladder' });
  if (c.doorDiameter / 1000 > 0.45 * D) eto.push({ step: 'E', field: 'doorDiameter', text: `Door Ø ${c.doorDiameter} mm is too large for a Ø ${D.toFixed(2)} m shell (reinforced opening)` });
  if (c.inletSize / 1000 > 0.4 * D) eto.push({ step: 'E', field: 'inletSize', text: 'Inlet too large for the shell diameter' });

  const aviation = H >= K.aviationH;
  if (aviation) say('E', `Above ${K.aviationH} m: obstruction marking and aviation lights${H >= 90 ? ' at the top and mid-height' : ' at the top'}.`);

  // ── Weight ──
  const shellKg = Math.PI * D * H * tShell * MATERIALS[shellMat].density;
  const linerKg = N * Math.PI * d * H * tLiner * MATERIALS[linerMat].density;
  const insM3 = Math.PI * ((Renc + tIns) ** 2 - Renc ** 2) * H;
  const insKg = insM3 * INSULATION[insType].density;
  const accKg = (ladder ? ladder.length * 14 + (ladder.cage ? (ladder.cage[1] - ladder.cage[0]) * 9 : 0) : 0) + (platform ? platform.area * 95 : 0);
  const weight = shellKg + linerKg + insKg + accKg;

  // ── Quote ──
  const ctoHours = 8;
  const etoHours = eto.length ? 40 + eto.length * 20 : 0;
  const lines = [
    { label: `Shell, ${shellMat.toLowerCase()}`, amount: shellKg * MATERIALS[shellMat].pricePerKg },
    { label: `Liners, ${N} × ${linerMat.toLowerCase()}`, amount: linerKg * MATERIALS[linerMat].pricePerKg },
    { label: `Insulation, ${insType.toLowerCase()}`, amount: insM3 * INSULATION[insType].pricePerM3 },
    { label: 'Ladder, platform, door, inlet', amount: (ladder ? ladder.length * 1450 + (ladder.cage ? (ladder.cage[1] - ladder.cage[0]) * 900 : 0) : 0) + (platform ? platform.area * 6800 : 0) + ({ 200: 9000, 600: 14000, 800: 18000 }[c.doorDiameter] || 14000) + 6000 + c.inletSize * 20 },
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
    accuracy: eto.length ? 0.15 : 0.05,
  };

  const cls = eto.length ? 'ETO' : 'CTO';
  const steps = {};
  for (const s of Object.keys(STEP_NAMES)) {
    const etoHere = eto.filter((e) => e.step === s);
    steps[s] = { auto: etoHere.length === 0, eto: etoHere };
  }

  const values = {
    Q, Tf, T0, Tm, Tout, dT, H, N, d, v, vNat, D, Ro, Renc, tIns, tLiner, tShell,
    linerMat, shellMat, insType, lambda, vb, vTop, Hmin0, Hreq, filter, fans,
    guyLevels, tubeLevels, wireDia, tubeDia, ladder, platform, aviation, weight,
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
  };
}

// Flat numeric parameters for the 3D model, so they can be tweened.
function toParams(v, medium, cfg) {
  const lad = v.ladder;
  const pl = v.platform;
  return {
    H: v.H, Ro: v.Ro, Renc: v.Renc, tShell: v.tShell, tIns: v.tIns,
    rLiner: v.d / 2, tLiner: v.tLiner, N: v.N,
    shellLook: MATERIALS[v.shellMat].look, linerLook: MATERIALS[v.linerMat].look, insType: v.insType,
    inletShape: v.inlet.shape, inletR: v.inlet.size / 2000, inletH: v.inlet.height,
    doorR: v.door.dia / 2000, doorH: v.door.height, doorAz: v.door.angle,
    ladderOn: lad ? 1 : 0, ladderAz: lad ? lad.angle : 0, ladderTop: v.H + 1,
    cageFrom: lad && lad.cage ? lad.cage[0] : 0, cageTo: lad && lad.cage ? lad.cage[1] : 0,
    harness: lad && lad.harness ? 1 : 0,
    ladderMissing: isEmpty(cfg.ladderType) ? 1 : 0,
    platformOn: pl ? 1 : 0, platformType: pl ? pl.type : 'None', platformAz: pl ? pl.angle : 0,
    platformElev: pl ? pl.elev : 0, platformArc: pl ? pl.arc : 180, platformW: pl ? pl.width : 1,
    platformMissing: isEmpty(cfg.platformType) ? 1 : 0,
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
    shell: { title: `Outer shell · ${v.shellMat}`, lines: [`Ø ${m2(v.D)} · plates ${mm(v.tShell)}`, `${v.H} shaped plates, 1 m wide`, `Dead weight ${(v.weight / 1000).toFixed(1)} t (whole chimney)`], step: 'D' },
    insulation: { title: `Insulation · ${v.insType}`, lines: [`${mm(v.tIns)} between inner and outer plates`, `λ ${INSULATION[v.insType].k} W/(m·K)`, `Heat loss ${v.dT.toFixed(1)} K over the height`], step: 'B' },
    liners: { title: `${v.N} × inner liner · ${v.linerMat}`, lines: [`Ø ${m2(v.d)} · wall ${mm(v.tLiner)}`, `Gas velocity ${v.v.toFixed(1)} m/s`, `${v.Tf} K in → ${v.Tout.toFixed(0)} K out`], step: 'A' },
    inlet: { title: `Flue gas inlet · ${v.inlet.shape}`, lines: [`${v.inlet.shape === 'Square' ? 'w' : 'Ø'} ${v.inlet.size} mm at h = ${v.inlet.height} m`, `Faces the plant at ${INLET_ANGLE}°`, 'Locking plate, 2 hinges'], step: 'E' },
    door: { title: 'Cleaning door', lines: [`Manhole cover Ø ${v.door.dia} mm`, `Centre at R = ${v.door.height} m, ${v.door.angle}°`], step: 'E' },
    ladder: v.ladder ? { title: `Safety ladder · ${v.ladder.type}`, lines: [`${v.ladder.steps} steps · ${v.ladder.flanges} connecting flanges`, `Placed at ${v.ladder.angle}°, ${v.ladder.length.toFixed(1)} m`, v.ladder.cage ? `Back support ${(v.ladder.cage[1] - v.ladder.cage[0]).toFixed(1)} m` : v.ladder.harness ? `Safety line ${v.ladder.length.toFixed(1)} m` : 'No back support'], step: 'E' } : null,
    platform: v.platform ? { title: v.platform.type, lines: [`+${v.platform.elev.toFixed(1)} m · ${v.platform.arc}° · width ${v.platform.width} m`, `Chequer plate ${v.platform.area.toFixed(1)} m²`, 'Railing 1.5 m'], step: 'E' } : null,
    fans: v.fans ? { title: `${v.fans.count} × auxiliary fan`, lines: [`Blower size ${v.fans.size} · ${v.fans.rpm} rpm`, `Forced draft ${v.v.toFixed(1)} m/s (natural ${v.vNat.toFixed(1)})`], step: 'B' } : null,
    filters: v.filter ? { title: `${v.filter.count} × filter ${v.filter.type}`, lines: [v.filter.label, `Lowers emission height by ${Math.round(v.filter.reduction * 100)} %`], step: 'C' } : null,
    supports: v.guyLevels.length ? { title: 'Structural support', lines: [`${v.guyLevels.length * 3} guy wires Ø ${v.wireDia} mm`, `Collars at ${v.guyLevels.join(', ')} m`, v.tubeLevels.length ? `${v.tubeLevels.length} lateral tubes Ø ${v.tubeDia} mm` : `H/D = ${v.lambda.toFixed(1)}`], step: 'D' } : null,
    foundation: { title: 'Foundation & base flange', lines: [`Plinth Ø ${m2(v.D + 2.4)}`, `${Math.max(8, Math.round(v.D * 6))} anchor bolts`], step: 'D' },
    lights: v.aviation ? { title: 'Aviation obstruction lights', lines: [`Required above 45 m`, 'Red/white marking on the top section'], step: 'E' } : null,
  };
}
