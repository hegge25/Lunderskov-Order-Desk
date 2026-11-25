import { store } from '../store.js';
import { computeDesign } from '../engine/design.js';
import { ChimneyViewer } from '../three/viewer.js';
import { HEAT_STOPS, heatRange } from '../three/kit.js';
import { renderStrip, highlightSteps } from './strip.js';
import { mountConfig, updateConfig, focusTarget } from './configPanel.js';
import { renderDerived, markParts, flashPart, markSteps } from './derivedPanel.js';
import { openDocs } from './docs.js';
import { LINKS } from '../config/links.js';
import { fieldLabel } from '../engine/design.js';
import { dkk, h, esc } from '../format.js';
import { explainStrip } from './tour.js';

const GROUP_PART = { flue: 'liners', site: 'shell', inlet: 'inlet', door: 'door', ladder: 'ladder', platform: 'platform' };
const TOGGLES = [
  ['cutaway', 'Cutaway', 'C'],
  ['xray', 'X-ray', 'X'],
  ['dims', 'Dimensions', 'D'],
  ['smoke', 'Smoke', 'S'],
  ['wind', 'Wind', 'W'],
  ['context', 'Context', 'K'],
];
const PRESETS = [['overview', 'Overview', '1'], ['base', 'Base', '2'], ['top', 'Top', '3'], ['plan', 'Plan', '4']];

const savedToggles = (() => {
  try { return JSON.parse(localStorage.getItem('lod.toggles')) || {}; } catch { return {}; }
})();

export function renderOrder(root, id) {
  const order = store.get(id);
  if (!order) {
    root.innerHTML = `<div class="empty"><p>No order ${esc(id)}.</p><a href="#/orders">Back to orders</a></div>`;
    return () => {};
  }
  root.innerHTML = h`
    <div class="order">
      <header class="ohead" data-head></header>
      <section class="strip" data-strip></section>
      <div class="work">
        <aside class="col cfg" data-config></aside>
        <main class="col viewer-col">
          <div class="viewer" data-viewer>
            <div class="vbar tl">
              ${TOGGLES.map(([k, l, key]) => `<button class="tog" data-tog="${k}" title="${l} (${key})">${l}</button>`)}
            </div>
            <div class="vbar tr">
              ${PRESETS.map(([k, l, key]) => `<button class="pre" data-pre="${k}" title="${l} view (${key})">${l}</button>`)}
            </div>
            <div class="vfoot bl" data-legend></div>
            <div class="vfoot br" data-stamp></div>
          </div>
        </main>
        <aside class="col derived" data-derived></aside>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const headEl = $('[data-head]');
  const stripEl = $('[data-strip]');
  const cfgEl = $('[data-config]');
  const derEl = $('[data-derived]');
  const viewEl = $('[data-viewer]');
  let design = computeDesign(order.config);

  const viewer = new ChimneyViewer(viewEl, {
    toggles: savedToggles,
    onHover: (part) => markParts(derEl, part),
    onPick: (part) => flashPart(derEl, part),
    onCallout: (target, part) => {
      if (target) focusTarget(cfgEl, target);
      if (part) flashPart(derEl, part);
    },
    onPreset: (name) => viewEl.querySelectorAll('[data-pre]').forEach((b) => b.classList.toggle('on', b.dataset.pre === name)),
  });

  const syncToggles = () => {
    viewEl.querySelectorAll('[data-tog]').forEach((b) => b.classList.toggle('on', !!viewer.toggles[b.dataset.tog]));
    try { localStorage.setItem('lod.toggles', JSON.stringify(viewer.toggles)); } catch { /* ignore */ }
    renderLegend();
  };
  const toggle = (k) => {
    viewer.setToggle(k, !viewer.toggles[k]);
    syncToggles();
  };

  function renderHead() {
    const v = design.values;
    headEl.innerHTML = h`
      <a class="back" href="#/orders">← Orders</a>
      <div class="ot">
        <span class="oid">${order.id}</span>
        <h1>${esc(order.customer)}</h1>
        <span class="proj">${esc(order.project)} · ${esc(v.site.label)}</span>
      </div>
      <div class="ometa">
        <div><span>Contact</span><b>${esc(order.contact)}</b></div>
        <div><span>${design.cls === 'CTO' ? 'Binding price' : 'Estimate'}</span><b>${dkk(design.price.total)} <small>${design.cls === 'CTO' ? 'final (R6)' : `±${Math.round(design.price.accuracy * 100)}%`}</small></b></div>
        <div class="badge big ${design.cls.toLowerCase()}">${design.cls}</div>
      </div>`;
  }
  function renderLegend() {
    const v = design.values;
    const missing = [];
    if (design.params.laddersMissing) missing.push('Ladder');
    if (design.params.platformsMissing) missing.push('Platform');
    const leg = $('[data-legend]');
    const [lo, hi] = heatRange(v.Tf, v.Tout);
    const pos = (T) => `${((T - lo) / (hi - lo)) * 100}%`;
    leg.innerHTML = h`
      ${missing.length ? `<div class="miss-chip"><i></i>${missing.join(' and ')} not specified</div>` : ''}
      ${viewer.toggles.cutaway ? h`
        <div class="heat">
          <span class="heat-t">Flue gas temperature <em>scale fitted to this chimney</em></span>
          <div class="heat-bar" style="background:linear-gradient(90deg, ${HEAT_STOPS.map(([t, c]) => `${c} ${t * 100}%`).join(', ')})">
            <i class="out" style="left:${pos(v.Tout)}"><b>outlet ${Math.round(v.Tout)} K</b></i>
            <i style="left:${pos(v.Tf)}"><b>inlet ${Math.round(v.Tf)} K</b></i>
          </div>
          <div class="heat-ends"><span>${lo.toFixed(0)} K</span><span>ΔT ${(v.Tf - v.Tout).toFixed(1)} K over ${v.H} m</span><span>${hi.toFixed(0)} K</span></div>
        </div>` : ''}`;
    $('[data-stamp]').innerHTML = h`
      <span><em>H</em>${v.H} m</span><span><em>Ø</em>${v.D.toFixed(2)} m</span><span><em>N</em>${v.N} × ${v.d.toFixed(2)} m</span><span><em>W</em>${(v.weight / 1000).toFixed(1)} t</span>`;
  }
  function renderStripNow() {
    renderStrip(stripEl, order, design, {
      onAdvance: () => { store.advance(order.id); renderStripNow(); },
      onHelp: explainStrip,
    });
    if (hoverLink) showLink(hoverLink);
  }
  const LINK_NAME = { inlet: 'The gas inlet', door: 'The cleaning door', ladders: 'The ladder', platforms: 'The platform' };
  let hoverLink = null;
  function showLink(link) {
    hoverLink = link;
    const l = LINKS[link];
    if (!l) { highlightSteps(stripEl, null); markSteps(derEl, null); return; }
    const name = LINK_NAME[link] || fieldLabel(link, order.config);
    const nums = l.asis.filter((n) => typeof n === 'number');
    const ids = l[design.cls];
    const loc = l.asis.includes('loc') ? ' + the regulation look-ups' : '';
    highlightSteps(stripEl, { 'TO-BE': ['Q', ...ids], 'AS-IS': [...l.asis, ...l.set].map(String) },
      `<b>${esc(name)}</b> · TO-BE: entered once in the quotation (R3), used in ${ids.join(', ')} · <span class="cap-asis">AS-IS: used in ${nums.length} of the 17 steps (${nums.join(', ')})${loc}</span>`);
    markSteps(derEl, l[design.cls]);
  }
  function refresh() {
    design = computeDesign(order.config);
    updateConfig(cfgEl, order, design);
    renderDerived(derEl, design, { onDoc: (k) => openDocs(k, design, { id: order.id, customer: order.customer }) });
    renderHead();
    renderStripNow();
    renderLegend();
    viewer.setDesign(design);
  }

  mountConfig(cfgEl, order, {
    onChange: (k, v) => { store.setConfig(order.id, k, v); refresh(); },
    onHoverGroup: (g) => viewer.highlight(g ? GROUP_PART[g] : null),
    onHoverLink: showLink,
  });
  derEl.addEventListener('mouseover', (e) => {
    const r = e.target.closest('[data-part]');
    viewer.highlight(r ? r.dataset.part : null);
  });
  derEl.addEventListener('mouseleave', () => viewer.highlight(null));
  viewEl.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tog]');
    if (t) toggle(t.dataset.tog);
    const p = e.target.closest('[data-pre]');
    if (p) viewer.view(p.dataset.pre);
  });
  const onKey = (e) => {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toUpperCase();
    const t = TOGGLES.find((x) => x[2] === k);
    if (t) toggle(t[0]);
    const p = PRESETS.find((x) => x[2] === k);
    if (p) viewer.view(p[0]);
  };
  window.addEventListener('keydown', onKey);

  refresh();
  syncToggles();

  return () => {
    window.removeEventListener('keydown', onKey);
    viewer.dispose();
  };
}
