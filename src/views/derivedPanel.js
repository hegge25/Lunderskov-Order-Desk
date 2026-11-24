// Right column: what the configurator derived, grouped by the steps of the report's TO-BE process.
// CTO: C2–C5 run in the order configurator and C6 is a designer's check.
// ETO: E2–E7 are owned by people; the values shown are the configurator's proposal.
import { TASKS, stepId } from '../engine/design.js';
import { dkk, num, h, esc } from '../format.js';

const m = (v, d = 2) => `${num(v, d)} m`;
const mm = (v) => `${Math.round(v * 1000)} mm`;

function rows(d) {
  const v = d.values;
  const known = v.siteKey !== 'OTHER';
  return {
    reg: [
      ['shell', 'Height limits', `${v.site.minH}–${v.site.maxH} m${known ? '' : ' <small>(assumed)</small>'}`],
      ['shell', 'Emission level', `factor ${num(v.site.emis, 2)}`],
      ['shell', 'Wind profile', `zone ${v.site.wind}, ${v.vb} m/s at 10 m`],
    ],
    emis: [
      ['shell', 'Height without filter', m(v.Hmin0, 0)],
      ['filters', 'Filter', v.filter ? `${v.filter.count} × type ${v.filter.type}` : 'None'],
      ['shell', 'Minimum height', m(v.Hreq, 0)],
    ],
    mat: [
      ['liners', 'Liner material', v.linerMat],
      ['shell', 'Shell material', v.shellMat],
    ],
    layout: [
      ['shell', 'Height H', m(v.H, 0)],
      ['liners', 'Liners N × d', `${v.N} × Ø ${num(v.d, 2)} m`],
      ['liners', 'Gas velocity', `${num(v.v, 1)} m/s`],
      ['insulation', 'Insulation', `${v.insType}, ${mm(v.tIns)}`],
      ['liners', 'Outlet temperature', `${num(v.Tout, 0)} K <small>(−${num(v.dT, 1)})</small>`],
      ['fans', 'Auxiliary fans', v.fans ? `${v.fans.count} × size ${v.fans.size}` : 'None, natural draft'],
      ['liners', 'H ⇄ heat loss', `solved together, ${v.iters} iterations`],
    ],
    strength: [
      ['shell', 'Wind at top', `${num(v.vTop, 0)} m/s`],
      ['shell', 'Cross section D', m(v.D)],
      ['shell', 'Wall thickness', mm(v.tShell)],
      ['supports', 'Slenderness H/D', num(v.lambda, 1)],
      ['supports', 'Side lateral support', v.guyLevels.length ? `${v.guyLevels.length * 3} wires${v.tubeLevels.length ? ` + ${v.tubeLevels.length} tubes` : ''}` : 'Self-supporting'],
      ['foundation', 'Dead weight', `${num(v.weight / 1000, 1)} t`],
    ],
    details: [
      ['ladder', 'Ladder', v.ladders.length ? v.ladders.map((l) => `${l.steps} steps @ ${l.angle}°`).join(', ') : '—'],
      ['platform', 'Platform', v.platforms.length ? v.platforms.map((p) => `+${num(p.elev, 1)} m, ${p.arc}°`).join(', ') : '—'],
      ['door', 'Cleaning door', `Ø ${v.door.dia} @ ${v.door.angle}°`],
      ['inlet', 'Gas inlet', `${v.inlet.shape} ${v.inlet.size} mm`],
      ['lights', 'Aviation marking', v.aviation ? 'Required' : '—'],
    ],
  };
}

const rowHtml = ([part, k, v]) => `<div class="drow" data-part="${part}"><span>${k}</span><b>${v}</b></div>`;
const docsHtml = (d) => h`
  <div class="docs-btns">
    <button class="btn sm" data-doc="parts">Part list <small>${d.bom.length} lines</small></button>
    <button class="btn sm" data-doc="drawing">Drawing</button>
  </div>`;

function ctoSteps(d, r) {
  return h`
    <section class="dstep" data-step="C2">
      <header><span class="step-id">C2</span><span>Capacity, heat loss and emission</span><span class="chip auto">Configurator</span></header>
      <p class="dseq">Re-sequenced (process DSM): requirements and emission first, then the material, then H, d, N and the heat loss as one task.</p>
      ${['reg', 'emis', 'mat', 'layout'].map((t, i) => h`
        <div class="dsub" data-task="${t}"><span class="dsub-n">${i + 1}</span>${TASKS[t].name}</div>
        ${r[t].map(rowHtml)}`)}
    </section>
    <section class="dstep" data-step="C3">
      <header><span class="step-id">C3</span><span>Strength from the wind profile</span><span class="chip auto">Configurator</span></header>
      ${r.strength.map(rowHtml)}
    </section>
    <section class="dstep" data-step="C4">
      <header><span class="step-id">C4</span><span>Detail parts</span><span class="chip auto">Configurator</span></header>
      ${r.details.map(rowHtml)}
    </section>
    <section class="dstep" data-step="C5">
      <header><span class="step-id">C5</span><span>Part list, drawings, order documents</span><span class="chip auto">Configurator</span></header>
      ${docsHtml(d)}
    </section>
    <section class="dstep" data-step="C6">
      <header><span class="step-id">C6</span><span>Check configured design</span><span class="chip eng">Designer</span></header>
      <p class="dnote">A designer checks and releases the design. An order that fails the check moves to the ETO process.</p>
    </section>`;
}

function etoSteps(d, r) {
  const flag = (t) => (d.steps[t].eto.length ? '<span class="chip out">Outside PVM</span>' : '');
  const sec = (t, extra = '') => h`
    <section class="dstep ${d.steps[t].eto.length ? 'has-eto' : ''}" data-step="${TASKS[t].ETO}">
      <header><span class="step-id">${TASKS[t].ETO}</span><span>${TASKS[t].name}</span>${flag(t)}<span class="chip eng">${TASKS[t].owner}</span></header>
      ${extra}
      ${r[t].map(rowHtml)}
    </section>`;
  return h`
    <p class="dnote top">ETO orders are designed by people. The values are the configurator's proposal for the standard parts; steps outside the PVM are flagged.</p>
    ${sec('reg', d.values.siteKey === 'OTHER' ? '<p class="dnote">Not in the location database: obtained by hand, 3–5 days on the critical path.</p>' : '')}
    ${sec('emis')}
    ${sec('mat', '<p class="dnote">Runs in parallel with E2.</p>')}
    ${sec('layout')}
    ${sec('strength')}
    ${sec('details')}
    <section class="dstep" data-step="E8">
      <header><span class="step-id">E8</span><span>Check and release design</span><span class="chip eng">Design team A, B, D</span></header>
      ${docsHtml(d)}
    </section>`;
}

export function renderDerived(el, design, handlers = {}) {
  const r = rows(design);
  const { cls, eto, errors, price, log } = design;
  el.innerHTML = h`
    <div class="cls-card ${cls.toLowerCase()}">
      <div class="cls-badge">${cls}</div>
      <div>
        <b>${cls === 'CTO' ? 'Configure-to-order' : 'Engineer-to-order'}</b>
        <span>${cls === 'CTO'
          ? 'Every attribute is inside the PVM intervals. The order configurator designs the chimney in one pass (C2–C5); a designer checks it (C6).'
          : `${eto.length} requirement${eto.length > 1 ? 's' : ''} outside the PVM intervals. The order follows the ETO process, E1–E8.`}</span>
      </div>
    </div>
    ${eto.length ? h`<ul class="reasons eto">${eto.map((e) => `<li><i>${stepId(e.step, cls)}</i>${esc(e.text)}</li>`)}</ul>` : ''}
    ${errors.length ? h`<ul class="reasons error">${errors.map((e) => `<li><i>!</i>${esc(e.text)}</li>`)}</ul>` : ''}

    ${cls === 'CTO' ? ctoSteps(design, r) : etoSteps(design, r)}

    <section class="quote">
      <header><span>${cls === 'CTO' ? 'Binding price' : 'Price estimate'}</span><span class="acc">${cls === 'CTO' ? 'final · R6' : `±${Math.round(price.accuracy * 100)} %`}</span></header>
      ${price.lines.map((l) => `<div class="qrow"><span>${esc(l.label)}</span><span>${dkk(l.amount)}</span></div>`)}
      <div class="qrow sub"><span>Cost</span><span>${dkk(price.cost)}</span></div>
      <div class="qrow total"><span>Price</span><b>${dkk(price.total)}</b></div>
      <p class="qnote">${cls === 'CTO'
        ? 'Quotation and order are calculated from the same specification, so the quoted price is the final price (R6). AS-IS quotations land up to ±40 % from the actual price.'
        : 'The price changes only if the requirements do, or when the non-standard attributes are designed (R6). AS-IS: up to ±40 %.'}</p>
    </section>

    <section class="log">
      <header><span>Why: rule log</span></header>
      <ol>${log.map((l) => `<li class="${l.kind}"><i>${stepId(l.step, cls)}</i><span>${esc(l.text)}</span></li>`)}</ol>
    </section>`;
  el.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', () => handlers.onDoc?.(b.dataset.doc)));
}

export function markParts(el, part) {
  el.querySelectorAll('.drow').forEach((r) => r.classList.toggle('hot', !!part && r.dataset.part === part));
}
export function flashPart(el, part) {
  const row = el.querySelector(`.drow[data-part="${part}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  row.classList.remove('flash');
  void row.offsetWidth;
  row.classList.add('flash');
}
// Light up the TO-BE step sections an attribute feeds.
export function markSteps(el, refs) {
  const want = new Set(refs || []);
  el.querySelectorAll('.dstep').forEach((s) => s.classList.toggle('linked', want.has(s.dataset.step)));
}
