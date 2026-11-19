// Left column: the customer view of the PVM as a form, checked live against the intervals.
import { FIELDS, FIELD_GROUPS, MEDIA } from '../config/pvm.js';
import { SITES } from '../config/rules.js';
import { fieldLabel, isActive } from '../engine/design.js';
import { h, esc } from '../format.js';

FIELDS.site.options = [...Object.keys(SITES), 'OTHER'];
const optLabel = (key, v) => {
  if (key === 'site') return v === 'OTHER' ? 'Other (not in database)' : SITES[v].label;
  if (key === 'medium' && v === 'Other') return 'Other (specify)';
  return v;
};

function fieldHtml(key, cfg) {
  const f = FIELDS[key];
  const v = cfg[key];
  let input = '';
  if (f.type === 'number') {
    const span = f.max - f.min;
    const lo = f.min - span * 0.25;
    const hi = f.max + span * 0.25;
    input = h`
      <div class="num">
        <input type="number" data-k="${key}" value="${v ?? ''}" step="${f.step}" />
        <span class="unit">${f.unit}</span>
        ${f.hint ? `<span class="hint" data-hint>${v != null ? f.hint(v) : ''}</span>` : ''}
      </div>
      <input type="range" class="range" data-k="${key}" data-range min="${lo}" max="${hi}" step="${f.step}" value="${v ?? f.min}" />
      <div class="range-ticks"><span style="left:16.67%">${f.min}</span><span style="left:83.33%">${f.max}</span></div>`;
  } else if (f.type === 'select') {
    input = h`<select data-k="${key}">
      ${v == null || v === '' ? '<option value="" selected>Not specified</option>' : ''}
      ${f.options.map((o) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(optLabel(key, o))}</option>`)}
    </select>`;
  } else if (f.type === 'segmented') {
    input = h`<div class="seg" data-k="${key}">
      ${f.options.map((o) => `<button type="button" data-v="${o}" class="${String(o) === String(v) ? 'on' : ''}">${o}${f.unit && f.unit !== 'mm' ? f.unit : ''}</button>`)}
    </div>`;
  }
  return h`
    <div class="field ${f.type}" data-field="${key}">
      <div class="f-top">
        <label>${fieldLabel(key, cfg)}${f.sym ? ` <em>${f.sym}</em>` : ''}${f.type === 'segmented' && f.unit === 'mm' ? ' <em>mm</em>' : ''}</label>
        <span class="f-state"></span>
      </div>
      ${input}
      <div class="f-msg"></div>
    </div>`;
}

export function mountConfig(el, order, handlers) {
  const cfg = order.config;
  el.innerHTML = h`
    <div class="spec-card" data-spec></div>
    ${FIELD_GROUPS.map((g) => h`
      <section class="fgroup" data-group="${g.id}">
        <header><span>${g.label}</span><span class="g-state"></span></header>
        ${g.fields.map((k) => fieldHtml(k, cfg))}
      </section>`)}
    <p class="pvm-note">Fields and intervals are the customer view of the PVM (Appendix 1). A value outside an interval turns the order into ETO.</p>`;

  const parse = (key, raw) => {
    const f = FIELDS[key];
    if (raw === '' || raw == null) return null;
    if (f.type === 'number' || typeof f.options?.[0] === 'number') return Number(raw);
    return raw;
  };
  el.addEventListener('input', (e) => {
    const t = e.target;
    const key = t.dataset.k;
    if (!key) return;
    const val = parse(key, t.value);
    const field = t.closest('.field');
    if (t.matches('[data-range]')) field.querySelector('input[type=number]').value = val;
    else if (t.type === 'number' && val != null) field.querySelector('[data-range]').value = val;
    handlers.onChange(key, val);
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.tagName === 'SELECT') {
      const opt = t.querySelector('option[value=""]');
      if (opt && t.value !== '') opt.remove();
    }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.seg[data-k] button');
    if (!b) return;
    const seg = b.parentElement;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    handlers.onChange(seg.dataset.k, parse(seg.dataset.k, b.dataset.v));
  });
  el.addEventListener('mouseover', (e) => {
    const g = e.target.closest('[data-group]');
    handlers.onHoverGroup?.(g ? g.dataset.group : null);
  });
  el.addEventListener('mouseleave', () => handlers.onHoverGroup?.(null));
}

export function updateConfig(el, order, design) {
  const cfg = order.config;
  const errs = Object.fromEntries(design.errors.filter((e) => e.field).map((e) => [e.field, e.text]));
  const etoDerived = Object.fromEntries(design.eto.filter((e) => e.field && design.fields[e.field].state === 'ok').map((e) => [e.field, e.text]));
  for (const node of el.querySelectorAll('[data-field]')) {
    const key = node.dataset.field;
    const f = FIELDS[key];
    const st = design.fields[key];
    let state = st.state;
    let msg = f.pvm;
    if (state === 'missing') msg = 'Missing: ask the customer';
    if (state === 'eto') msg = `${st.msg} → ETO`;
    if (etoDerived[key]) { state = 'eto'; msg = `${etoDerived[key]} → ETO`; }
    if (errs[key]) { state = 'error'; msg = errs[key]; }
    node.dataset.state = state;
    node.hidden = !isActive(key, cfg);
    node.querySelector('.f-msg').textContent = msg;
    node.querySelector('.f-state').textContent = { ok: '', missing: 'Missing', eto: 'ETO', error: 'Conflict', inactive: '' }[state];
    const lbl = node.querySelector('label');
    if (typeof f.label === 'function') lbl.firstChild.textContent = fieldLabel(key, cfg);
    const hint = node.querySelector('[data-hint]');
    if (hint && cfg[key] != null) hint.textContent = f.hint(cfg[key]);
  }
  for (const g of el.querySelectorAll('[data-group]')) {
    const states = [...g.querySelectorAll('[data-field]:not([hidden])')].map((n) => n.dataset.state);
    const bad = states.filter((s) => s !== 'ok').length;
    const gs = g.querySelector('.g-state');
    gs.className = `g-state ${states.includes('error') ? 'error' : states.includes('missing') ? 'missing' : states.includes('eto') ? 'eto' : 'ok'}`;
    gs.textContent = bad ? `${bad} open` : '✓';
  }
  const active = Object.values(design.fields).filter((f) => f.state !== 'inactive');
  const done = active.filter((f) => f.state !== 'missing').length;
  const spec = el.querySelector('[data-spec]');
  spec.className = `spec-card ${design.releasable ? 'ready' : 'blocked'}`;
  spec.innerHTML = h`
    <div class="spec-top"><b>Specification</b><span>${done} / ${active.length}</span></div>
    <div class="bar"><i style="width:${(done / active.length) * 100}%"></i></div>
    <p>${design.releasable
      ? 'Complete. Ready to release to design.'
      : !design.complete
        ? `Release blocked: ${design.missing.map((k) => fieldLabel(k, cfg).toLowerCase()).join(', ')} not specified.`
        : `Release blocked: ${design.errors.length} conflict${design.errors.length > 1 ? 's' : ''} to resolve.`}</p>`;
}

export { MEDIA };
