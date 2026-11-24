// Left column: the customer view of the PVM as a form, checked live against the intervals.
// Ladder and platform are optional parts, added or removed up to the PVM cardinality.
import { FIELDS, FIELD_GROUPS, ITEM_FIELDS, fieldDef, parseItemKey, newItem } from '../config/pvm.js';
import { SITES } from '../config/rules.js';
import { LINKS, LINK_OF } from '../config/links.js';
import { fieldLabel, isActive } from '../engine/design.js';
import { h, esc } from '../format.js';

FIELDS.site.options = [...Object.keys(SITES), 'OTHER'];
const GROUP_LIST = { ladder: 'ladders', platform: 'platforms' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const optLabel = (key, v) => {
  if (key === 'site') return v === 'OTHER' ? 'Other (not in database)' : SITES[v].label;
  if (key === 'medium' && v === 'Other') return 'Other (specify)';
  return v;
};

function inputHtml(key, f, v) {
  if (f.type === 'number') {
    const span = f.max - f.min;
    return h`
      <div class="num">
        <input type="number" data-k="${key}" value="${v ?? ''}" step="${f.step}" />
        <span class="unit">${f.unit}</span>
        ${f.hint ? `<span class="hint" data-hint>${v != null ? f.hint(v) : ''}</span>` : ''}
      </div>
      <input type="range" class="range" data-k="${key}" data-range min="${f.min - span * 0.25}" max="${f.max + span * 0.25}" step="${f.step}" value="${v ?? f.min}" />
      <div class="range-ticks"><span style="left:16.67%">${f.min}</span><span style="left:83.33%">${f.max}</span></div>`;
  }
  if (f.type === 'select') {
    return h`<select data-k="${key}">
      ${v == null || v === '' ? '<option value="" selected>Not specified</option>' : ''}
      ${f.options.map((o) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(optLabel(key, o))}</option>`)}
    </select>`;
  }
  return h`<div class="seg" data-k="${key}">
    ${f.options.map((o) => `<button type="button" data-v="${o}" class="${String(o) === String(v) ? 'on' : ''}">${o}${f.unit && f.unit !== 'mm' ? f.unit : ''}</button>`)}
  </div>`;
}

// Which process steps use this attribute: AS-IS step numbers and TO-BE steps (CTO or ETO, by CSS).
export function usesHtml(link) {
  const l = LINKS[link];
  if (!l) return '';
  return h`<div class="uses" data-link="${link}" title="Process steps that use this attribute. Hover to see them on the strip.">
    <span class="u-asis"><em>AS-IS</em>${l.asis.filter((n) => typeof n === 'number').map((n) => `<i>${n}</i>`)}</span>
    <span class="u-tobe"><em>TO-BE</em><i class="q">Q</i>${l.CTO.map((n) => `<i class="cto">${n}</i>`)}${l.ETO.map((n) => `<i class="eto">${n}</i>`)}</span>
  </div>`;
}

function fieldHtml(key, f, v, label, link) {
  return h`
    <div class="field ${f.type}" data-field="${key}">
      <div class="f-top">
        <label>${label}${f.sym ? ` <em>${f.sym}</em>` : ''}${f.type === 'segmented' && f.unit === 'mm' ? ' <em>mm</em>' : ''}</label>
        <span class="f-state"></span>
      </div>
      ${inputHtml(key, f, v)}
      <div class="f-msg"></div>
      ${link ? usesHtml(link) : ''}
    </div>`;
}

const WEB_GROUP = { flue: 'Flue gas data', site: 'Location', inlet: 'Flue gas inlet', door: 'Cleaning door', ladder: 'Accessories: safety ladder', platform: 'Accessories: platform' };

function listHtml(list, cfg, opts = {}) {
  const f = FIELDS[list];
  const items = cfg[list];
  if (items == null) {
    return h`
      <div class="field list-missing" data-field="${list}">
        <div class="f-top"><label>${f.label}</label><span class="f-state"></span></div>
        <p class="lm-text">${opts.web ? `Do you need a ${f.noun}?` : `The customer has not said whether they want a ${f.noun}.`}</p>
        <div class="lm-actions">
          <button type="button" class="btn sm" data-none="${list}">No ${f.noun}</button>
          <button type="button" class="btn sm primary" data-add="${list}">Add ${f.noun}</button>
        </div>
        <div class="f-msg"></div>
      </div>`;
  }
  const defs = ITEM_FIELDS[f.item];
  return h`
    ${items.map((it, i) => h`
      <div class="item" data-item="${list}.${i}">
        <div class="item-head"><b>${cap(f.noun)}${f.max > 1 ? ` ${i + 1}` : ''}</b><button type="button" class="x" data-remove="${list}.${i}">Remove</button></div>
        ${Object.entries(defs).map(([prop, def]) => fieldHtml(`${list}.${i}.${prop}`, def, it[prop], def.label))}
      </div>`)}
    ${items.length === 0 ? `<p class="list-empty">No ${f.noun}.</p>` : ''}
    ${items.length < f.max
      ? `<button type="button" class="add-item" data-add="${list}">+ Add ${f.noun}</button>`
      : f.max > 1 ? `<p class="list-empty">Maximum ${f.max} ${f.noun}s.</p>` : ''}
    <p class="list-note">${esc(f.pvm)}</p>`;
}

export function mountConfig(el, order, handlers, opts = {}) {
  const cfg = order.config;
  // A group whose fields share one link shows it once, under its header.
  const groupLink = (g) => {
    const ls = new Set(g.fields.map((k) => LINK_OF[k]));
    return ls.size === 1 && g.fields.length > 1 || FIELDS[g.fields[0]].type === 'list' ? [...ls][0] : null;
  };
  el.innerHTML = h`
    ${opts.web ? '' : '<div class="spec-card" data-spec></div>'}
    ${FIELD_GROUPS.map((g) => {
      const gl = groupLink(g);
      return h`
      <section class="fgroup" data-group="${g.id}" ${gl ? `data-glink="${gl}"` : ''}>
        <header><span>${opts.web ? (WEB_GROUP[g.id] || g.label) : g.label}</span><span class="g-state"></span></header>
        ${gl && !opts.web ? usesHtml(gl) : ''}
        ${g.fields.map((k) => (FIELDS[k].type === 'list'
          ? `<div class="list" data-list="${k}">${listHtml(k, cfg, opts)}</div>`
          : fieldHtml(k, FIELDS[k], cfg[k], fieldLabel(k, cfg), gl || opts.web ? null : LINK_OF[k])))}
      </section>`;
    })}
    ${opts.web ? '' : '<p class="pvm-note">Fields and intervals are the customer view of the PVM (Appendix 1). A value outside an interval turns the order into ETO. The chips under each field are the PVM–process link: the AS-IS steps (Appendix 3) and TO-BE steps that use the attribute. In the TO-BE process all of them are set in the quotation (Q).</p>'}`;

  el._opts = opts;
  const parse = (key, raw) => {
    const f = fieldDef(key);
    if (raw === '' || raw == null) return null;
    if (f.type === 'number' || typeof f.options?.[0] === 'number') return Number(raw);
    return raw;
  };
  const setList = (list, arr) => {
    el.querySelector(`[data-list="${list}"]`).innerHTML = listHtml(list, { ...cfg, [list]: arr }, opts);
    handlers.onChange(list, arr);
  };
  const commit = (key, val) => {
    const it = parseItemKey(key);
    if (!it) return handlers.onChange(key, val);
    const arr = cfg[it.list].map((x, i) => (i === it.index ? { ...x, [it.prop]: val } : x));
    handlers.onChange(it.list, arr);
  };

  el.addEventListener('input', (e) => {
    const t = e.target;
    const key = t.dataset.k;
    if (!key) return;
    const val = parse(key, t.value);
    const field = t.closest('.field');
    if (t.matches('[data-range]')) field.querySelector('input[type=number]').value = val;
    else if (t.type === 'number' && val != null) field.querySelector('[data-range]').value = val;
    commit(key, val);
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.tagName === 'SELECT') {
      const opt = t.querySelector('option[value=""]');
      if (opt && t.value !== '') opt.remove();
    }
  });
  el.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) return setList(add.dataset.add, [...(cfg[add.dataset.add] || []), newItem(add.dataset.add, cfg)]);
    const none = e.target.closest('[data-none]');
    if (none) return setList(none.dataset.none, []);
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const it = parseItemKey(`${rm.dataset.remove}.x`);
      return setList(it.list, cfg[it.list].filter((_, i) => i !== it.index));
    }
    const b = e.target.closest('.seg[data-k] button');
    if (!b) return;
    const seg = b.parentElement;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    commit(seg.dataset.k, parse(seg.dataset.k, b.dataset.v));
  });
  let hoverLink = null;
  el.addEventListener('mouseover', (e) => {
    const g = e.target.closest('[data-group]');
    handlers.onHoverGroup?.(g ? g.dataset.group : null);
    const f = e.target.closest('[data-field]');
    const key = f ? f.dataset.field.split('.')[0] : null;
    const link = (key && LINK_OF[key]) || g?.dataset.glink || null;
    if (link !== hoverLink) { hoverLink = link; handlers.onHoverLink?.(link); }
  });
  el.addEventListener('mouseleave', () => {
    handlers.onHoverGroup?.(null);
    hoverLink = null;
    handlers.onHoverLink?.(null);
  });
}

// Scroll to the form section behind a callout (a group, or one item of a list) and flash it.
export function focusTarget(el, target) {
  const list = GROUP_LIST[target.group];
  let node = null;
  if (list && target.index != null) node = el.querySelector(`[data-item="${list}.${target.index}"]`);
  if (!node && list) node = el.querySelector(`[data-field="${list}"]`);
  if (!node) node = el.querySelector(`[data-group="${target.group}"]`);
  if (!node) return;
  node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  node.classList.remove('flash-field');
  void node.offsetWidth;
  node.classList.add('flash-field');
}

export function updateConfig(el, order, design) {
  const cfg = order.config;
  const web = !!el._opts?.web;
  el.dataset.cls = design.cls;
  const errs = Object.fromEntries(design.errors.filter((e) => e.field).map((e) => [e.field, e.text]));
  const etoDerived = Object.fromEntries(design.eto.filter((e) => e.field && design.fields[e.field]?.state === 'ok').map((e) => [e.field, e.text]));
  for (const node of el.querySelectorAll('[data-field]')) {
    const key = node.dataset.field;
    const f = fieldDef(key);
    const st = design.fields[key];
    if (!f || !st) continue;
    let state = st.state;
    let msg = f.pvm;
    if (state === 'missing') msg = web ? 'Required for a quotation' : 'Missing: ask the customer';
    if (state === 'eto') msg = web ? `${st.msg}: outside our standard range` : `${st.msg} → ETO`;
    if (etoDerived[key]) { state = 'eto'; msg = web ? `${etoDerived[key]}: outside our standard range` : `${etoDerived[key]} → ETO`; }
    if (errs[key]) { state = 'error'; msg = errs[key]; }
    node.dataset.state = state;
    node.hidden = !isActive(key, cfg);
    node.querySelector('.f-msg').textContent = msg;
    node.querySelector('.f-state').textContent = { ok: '', missing: web ? 'Required' : 'Missing', eto: web ? 'Special' : 'ETO', error: 'Conflict', inactive: '' }[state];
    if (typeof f.label === 'function') node.querySelector('label').firstChild.textContent = fieldLabel(key, cfg);
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
  if (!spec) return;
  spec.className = `spec-card ${design.releasable ? 'ready' : 'blocked'}`;
  spec.innerHTML = h`
    <div class="spec-top"><b>Specification</b><span>${done} / ${active.length}</span></div>
    <div class="bar"><i style="width:${(done / active.length) * 100}%"></i></div>
    <p>${design.releasable
      ? 'Complete: every customer-view attribute the design steps use is known (R3).'
      : !design.complete
        ? `Quotation blocked (R3): ${design.missing.map((k) => fieldLabel(k, cfg).toLowerCase()).join(', ')} not specified.`
        : `Quotation blocked: ${design.errors.length} conflict${design.errors.length > 1 ? 's' : ''} to resolve.`}</p>`;
}
