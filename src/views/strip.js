// Progress strip. Top: this order's stages in the TO-BE process, with the action that moves it on.
// Below: the same order run through both processes, as two bars on one scale. Each bar is every
// step to scale, coloured by stage, so the difference between the report's TO-BE and the case's
// AS-IS is visible at a glance; the gap between the two ends is the time saved.
import { schedule, fmtDate, fmtDays } from '../engine/timeline.js';
import { STAGES, ACTIONS } from '../config/process.js';
import { h, esc } from '../format.js';

const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
const rd = (n) => Math.round(n * 10) / 10;

const reqChip = (t, key) => h`<span class="cmp-req ${t.met ? 'ok' : 'bad'}" title="${esc(`${key}: ${t.text}. This plan: ${fmtDays(rd(t.days))} against ${t.limit} d.`)}">${key} ${t.met ? '✓' : '✗'} <em>${fmtDays(rd(t.days))}</em></span>`;

const stepTitle = (st, variant) => `${st.ref ? `${variant === 'AS-IS' ? 'Step ' : ''}${st.ref} · ` : ''}${st.label} · ${st.owner} · ${fmtDays(Math.round((st.end - st.start) * 100) / 100)}${st.par ? ' · in parallel' : ''}`;

// Geometry is written as numbers (percent of the track) too, so a re-render can morph from it.
const geo = (l, w) => `data-l="${l}" data-w="${w}" style="left:${l}%;width:${w}%"`;

function bar(s, scale) {
  const p = (d) => (d / scale) * 100;
  const refs = (st) => [st.ref, st.hl, s.variant === 'TO-BE' && (st.stage === 'quote' || st.stage === 'enquiry') ? 'Q' : ''].filter(Boolean).join(' ');
  return h`
    ${s.steps.map((st) => h`<span class="g-seg s-${st.stage} ${st.status === 'late' ? 'late' : ''} ${st.wait ? 'wait' : ''} ${st.par ? 'par' : ''}" data-key="${esc(`${s.variant}|${st.stage}|${st.label}`)}" data-stage="${st.stage}" data-refs="${refs(st)}" ${geo(p(st.start), p(st.end - st.start))} title="${esc(stepTitle(st, s.variant))}"></span>`)}
    ${s.stages.filter((st) => st.steps.length).map((st) => h`<span class="cmp-lab s-${st.key}" data-key="${s.variant}|lab|${st.key}" data-long="${esc(`${st.label} ${fmtDays(rd(st.days))}`)}" data-short="${fmtDays(rd(st.days))}" ${geo(p(st.start), p(st.days))}></span>`)}`;
}

// Stage labels inside the bars: the full label if it fits, else just the days, else nothing.
function fitLabels(el) {
  el.querySelectorAll('.cmp-lab').forEach((l) => {
    l.textContent = l.dataset.long;
    if (l.scrollWidth > l.clientWidth + 1) l.textContent = l.dataset.short;
    if (l.scrollWidth > l.clientWidth + 1) l.textContent = '';
  });
}

// ── Morphing between renders (CTO ⇄ ETO, an order moving on) ──
// Each segment starts where the same step was. A step the old bar did not have starts at its
// relative place inside the old bar's span for the same stage, so the stage appears to stretch
// or shrink rather than jump. Numbers count from the old value to the new one.
const MORPH_MS = 650;

function snapshot(el) {
  const keys = new Map();
  const stages = new Map();
  el.querySelectorAll('[data-track]').forEach((track) => {
    const v = track.dataset.track;
    const tr = track.getBoundingClientRect();
    track.querySelectorAll('[data-key]').forEach((n) => {
      // where it is on screen now, mid-animation included, so back-to-back renders carry on
      const r = n.getBoundingClientRect();
      const g = tr.width ? { l: ((r.left - tr.left) / tr.width) * 100, w: (r.width / tr.width) * 100 } : { l: +n.dataset.l, w: +n.dataset.w };
      keys.set(n.dataset.key, g);
      const st = n.dataset.stage;
      if (!st) return;
      const k = `${v}|${st}`;
      const o = stages.get(k);
      stages.set(k, o ? { l: Math.min(o.l, g.l), r: Math.max(o.r, g.l + g.w) } : { l: g.l, r: g.l + g.w });
    });
  });
  const nums = new Map([...el.querySelectorAll('[data-num]')].map((n) => [n.dataset.num, +n.textContent]));
  return keys.size ? { keys, stages, nums } : null;
}

function morph(el, before) {
  if (!before || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const moves = [];
  el.querySelectorAll('[data-track]').forEach((track) => {
    const v = track.dataset.track;
    // the new bar's stage spans, to place new steps relative to them
    const spans = new Map();
    track.querySelectorAll('.g-seg').forEach((n) => {
      const l = +n.dataset.l, r = l + +n.dataset.w, o = spans.get(n.dataset.stage);
      spans.set(n.dataset.stage, o ? { l: Math.min(o.l, l), r: Math.max(o.r, r) } : { l, r });
    });
    track.querySelectorAll('[data-key]').forEach((n) => {
      const to = { l: +n.dataset.l, w: +n.dataset.w };
      let from = before.keys.get(n.dataset.key);
      const st = n.dataset.stage || (n.classList.contains('cmp-lab') && n.dataset.key.split('|')[2]);
      if (!from && st) {
        const was = before.stages.get(`${v}|${st}`);
        const now = spans.get(st) || { l: to.l, r: to.l + to.w };
        if (was) {
          const k = (was.r - was.l) / Math.max(now.r - now.l, 1e-6);
          from = { l: was.l + (to.l - now.l) * k, w: to.w * k };
        }
      }
      if (!from && n.dataset.key === 'gap') from = { l: to.l + to.w, w: 0 };
      if (!from) { n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MORPH_MS, easing: 'ease-out' }); return; }
      if (Math.abs(from.l - to.l) < 0.01 && Math.abs(from.w - to.w) < 0.01) return;
      moves.push([n, from, to]);
    });
  });
  moves.forEach(([n, from, to]) => n.animate(
    [{ left: `${from.l}%`, width: `${from.w}%` }, { left: `${to.l}%`, width: `${to.w}%` }],
    { duration: MORPH_MS, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' },
  ));
  // labels re-fit to the new widths, so fade them in at the end, only in a bar that moved
  new Set(moves.map(([n]) => n.closest('[data-track]'))).forEach((track) => {
    track.querySelectorAll('.cmp-lab, .cmp-gap em').forEach((n) => n.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: MORPH_MS }));
  });
  el.querySelectorAll('[data-num]').forEach((n) => {
    const a = before.nums.get(n.dataset.num);
    const b = +n.textContent;
    if (a == null || a === b) return;
    const t0 = performance.now();
    const tick = (t) => {
      const f = Math.min(1, (t - t0) / MORPH_MS);
      const e = 1 - (1 - f) ** 3;
      n.textContent = Math.round(a + (b - a) * e);
      if (f < 1 && n.isConnected) requestAnimationFrame(tick);
    };
    n.textContent = a;
    requestAnimationFrame(tick);
  });
}

export function renderStrip(el, order, design, handlers) {
  const tobe = schedule(order, design.cls, 'TO-BE');
  const asis = schedule(order, design.cls, 'AS-IS');
  const scale = Math.max(tobe.total, asis.total);
  const saved = asis.total - tobe.total;
  const delivered = order.stage === 'done';
  const act = ACTIONS[order.stage];

  // R3: no quotation leaves, and no order goes on, with missing or conflicting information
  const gate = !!act?.gate && !design.releasable;
  const gateWhy = !design.complete
    ? `${design.missing.length} field${design.missing.length > 1 ? 's' : ''} missing (R3)`
    : `${design.errors.length} conflict${design.errors.length > 1 ? 's' : ''}`;
  const actLabel = act && (typeof act.label === 'string' ? act.label : act.label[design.cls]);

  const row = (s) => h`
    <div class="cmp-row ${s.variant === 'TO-BE' ? 'tobe' : 'asis'}">
      <span class="cmp-name">${s.variant}</span>
      <div class="cmp-track" data-track="${s.variant}">
        ${bar(s, scale)}
        ${s.variant === 'TO-BE' && saved > 0.5 ? h`<span class="cmp-gap" data-key="gap" ${geo((s.total / scale) * 100, (saved / scale) * 100)}><em><span data-num="gap-d">${Math.round(saved)}</span> working days sooner · −<span data-num="gap-p">${Math.round((saved / asis.total) * 100)}</span> %</em></span>` : ''}
      </div>
      <span class="cmp-end">
        ${reqChip(s.targets.R1, 'R1')}${reqChip(s.targets.R2, 'R2')}
        <span class="cmp-total" title="${esc(`${Math.round(s.total)} working days from the enquiry to the installed chimney`)}"><b>${fmtDate(s.delivery)}</b> <span data-num="${s.variant}-total">${Math.round(s.total)}</span> d</span>
      </span>
    </div>`;

  const before = snapshot(el);
  el.innerHTML = h`
    <div class="strip-row">
      <ol class="stages">
        ${tobe.stages.map((st) => h`
          <li class="stage ${st.status}" data-stage="${st.key}" title="${esc(st.steps.map((x) => `${x.ref ? `${x.ref} · ` : ''}${x.label} · ${x.owner} · ${fmtDays(x.days)}`).join('\n'))}">
            <span class="dot"></span>
            <span class="st-name">${st.label}</span>
            <span class="st-when">${st.status === 'done' ? 'Done' : st.endDate ? `by ${fmtDate(st.endDate)}${st.status === 'late' ? ' · late' : ''}` : ''}</span>
          </li>`)}
      </ol>
      <div class="strip-act">
        ${delivered ? '<span class="muted">Order closed</span>' : h`
          <button class="btn ${gate ? 'blocked' : 'primary'}" data-advance ${gate ? 'disabled' : ''}>${actLabel}</button>
          ${gate ? `<span class="gate-why">Blocked: ${gateWhy}</span>` : ''}`}
      </div>
    </div>
    <div class="cmp">
      <div class="cmp-head">
        <span>Same order, same enquiry date: the report's TO-BE process against the case's AS-IS</span>
        <button class="help" data-help title="How to read this strip">?</button>
      </div>
      <div class="cmp-body" data-bars>
        ${row(tobe)}
        ${row(asis)}
        ${!delivered ? `<span class="cmp-today" style="--xf:${Math.min(tobe.now, scale) / scale}"><em>Today</em></span>` : ''}
        <div class="g-cap" data-cap></div>
      </div>
    </div>`;

  fitLabels(el);
  morph(el, before);
  if (!el._fitBound) {
    el._fitBound = true;
    window.addEventListener('resize', () => el.isConnected && fitLabels(el));
  }
  el.querySelector('[data-advance]')?.addEventListener('click', handlers.onAdvance);
  el.querySelector('[data-help]').addEventListener('click', handlers.onHelp);
}

// Light up the steps that use a PVM attribute in both bars: TO-BE refs (Q, C2, E5) and AS-IS step
// numbers. `refs` is { 'TO-BE': [...], 'AS-IS': [...] }, or null to clear.
export function highlightSteps(el, refs, caption = '') {
  const cap = el.querySelector('[data-cap]');
  if (cap) { cap.innerHTML = caption; cap.classList.toggle('on', !!caption); }
  const body = el.querySelector('[data-bars]');
  if (!body) return;
  body.classList.toggle('hl-mode', !!refs);
  body.querySelectorAll('[data-track]').forEach((track) => {
    const want = new Set((refs && refs[track.dataset.track]) || []);
    track.querySelectorAll('.g-seg').forEach((seg) => {
      seg.classList.toggle('hl', want.size > 0 && seg.dataset.refs.split(' ').some((r) => want.has(r)));
    });
  });
}
