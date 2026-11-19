// Right column: what the configurator derived, per designer step, plus the quote and the rule log.
import { STEP_NAMES } from '../engine/design.js';
import { dkk, num, h, esc } from '../format.js';

const m = (v, d = 2) => `${num(v, d)} m`;
const mm = (v) => `${Math.round(v * 1000)} mm`;

function rows(d) {
  const v = d.values;
  return {
    A: [
      ['shell', 'Height H', m(v.H, 0)],
      ['liners', 'Liners', `${v.N} × Ø ${num(v.d, 2)} m`],
      ['liners', 'Gas velocity', `${num(v.v, 1)} m/s`],
      ['liners', 'Draft', v.fans ? 'Forced (fans)' : 'Natural'],
    ],
    B: [
      ['liners', 'Liner material', v.linerMat],
      ['shell', 'Shell material', v.shellMat],
      ['insulation', 'Insulation', `${v.insType}, ${mm(v.tIns)}`],
      ['liners', 'Outlet temperature', `${num(v.Tout, 0)} K <small>(−${num(v.dT, 1)})</small>`],
      ['fans', 'Auxiliary fans', v.fans ? `${v.fans.count} × size ${v.fans.size}` : '—'],
    ],
    C: [
      ['shell', 'Local height limits', `${v.site.minH}–${v.site.maxH} m`],
      ['shell', 'Height without filter', m(v.Hmin0, 0)],
      ['filters', 'Filter', v.filter ? `${v.filter.count} × type ${v.filter.type}` : 'None'],
      ['shell', 'Required height', m(v.Hreq, 0)],
    ],
    D: [
      ['shell', 'Wind at top', `${num(v.vTop, 0)} m/s <small>(zone ${v.site.wind})</small>`],
      ['shell', 'Outer diameter D', m(v.D)],
      ['shell', 'Plate thickness', mm(v.tShell)],
      ['supports', 'Slenderness H/D', num(v.lambda, 1)],
      ['supports', 'Support', v.guyLevels.length ? `${v.guyLevels.length * 3} guy wires${v.tubeLevels.length ? ' + tubes' : ''}` : 'Self-supporting'],
      ['foundation', 'Dead weight', `${num(v.weight / 1000, 1)} t`],
    ],
    E: [
      ['ladder', 'Ladder', v.ladders.length ? v.ladders.map((l) => `${l.steps} steps @ ${l.angle}°`).join(', ') : '—'],
      ['platform', 'Platform', v.platforms.length ? v.platforms.map((p) => `+${num(p.elev, 1)} m, ${p.arc}°`).join(', ') : '—'],
      ['door', 'Cleaning door', `Ø ${v.door.dia} @ ${v.door.angle}°`],
      ['inlet', 'Inlet', `${v.inlet.shape} ${v.inlet.size} mm`],
      ['lights', 'Aviation marking', v.aviation ? 'Required' : '—'],
    ],
  };
}

export function renderDerived(el, design) {
  const r = rows(design);
  const { cls, eto, errors, price, log } = design;
  el.innerHTML = h`
    <div class="cls-card ${cls.toLowerCase()}">
      <div class="cls-badge">${cls}</div>
      <div>
        <b>${cls === 'CTO' ? 'Configure-to-order' : 'Engineer-to-order'}</b>
        <span>${cls === 'CTO'
          ? 'All requirements are inside the PVM intervals. The design is generated; a designer only checks it.'
          : `${eto.length} requirement${eto.length > 1 ? 's' : ''} outside the PVM. Standard modules are generated, the rest goes to a designer.`}</span>
      </div>
    </div>
    ${eto.length ? h`<ul class="reasons eto">${eto.map((e) => `<li><i>${e.step}</i>${esc(e.text)}</li>`)}</ul>` : ''}
    ${errors.length ? h`<ul class="reasons error">${errors.map((e) => `<li><i>!</i>${esc(e.text)}</li>`)}</ul>` : ''}

    ${Object.entries(STEP_NAMES).map(([s, name]) => h`
      <section class="dstep" data-step="${s}">
        <header>
          <span class="step-id">${s}</span><span>${name}</span>
          <span class="chip ${design.steps[s].auto ? 'auto' : 'eng'}">${design.steps[s].auto ? 'Auto' : 'Designer'}</span>
        </header>
        ${r[s].map(([part, k, v]) => `<div class="drow" data-part="${part}"><span>${k}</span><b>${v}</b></div>`)}
      </section>`)}

    <section class="quote">
      <header><span>Estimate</span><span class="acc">±${Math.round(price.accuracy * 100)} %</span></header>
      ${price.lines.map((l) => `<div class="qrow"><span>${esc(l.label)}</span><span>${dkk(l.amount)}</span></div>`)}
      <div class="qrow sub"><span>Cost</span><span>${dkk(price.cost)}</span></div>
      <div class="qrow total"><span>Price</span><b>${dkk(price.total)}</b></div>
      <p class="qnote">AS-IS quotations land up to ±40 % from the final price.</p>
    </section>

    <section class="log">
      <header><span>Why: rule log</span></header>
      <ol>${log.map((l) => `<li class="${l.kind}"><i>${l.step}</i><span>${esc(l.text)}</span></li>`)}</ol>
    </section>`;
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
