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

function bar(s, scale) {
  const pct = (d) => `${(d / scale) * 100}%`;
  const refs = (st) => [st.ref, st.hl, s.variant === 'TO-BE' && (st.stage === 'quote' || st.stage === 'enquiry') ? 'Q' : ''].filter(Boolean).join(' ');
  return h`
    ${s.steps.map((st) => h`<span class="g-seg s-${st.stage} ${st.status === 'late' ? 'late' : ''} ${st.wait ? 'wait' : ''} ${st.par ? 'par' : ''}" data-refs="${refs(st)}" style="left:${pct(st.start)};width:${pct(st.end - st.start)}" title="${esc(stepTitle(st, s.variant))}"></span>`)}
    ${s.stages.filter((st) => st.steps.length).map((st) => h`<span class="cmp-lab s-${st.key}" data-long="${esc(`${st.label} ${fmtDays(rd(st.days))}`)}" data-short="${fmtDays(rd(st.days))}" style="left:${pct(st.start)};width:${pct(st.days)}"></span>`)}`;
}

// Stage labels inside the bars: the full label if it fits, else just the days, else nothing.
function fitLabels(el) {
  el.querySelectorAll('.cmp-lab').forEach((l) => {
    l.textContent = l.dataset.long;
    if (l.scrollWidth > l.clientWidth + 1) l.textContent = l.dataset.short;
    if (l.scrollWidth > l.clientWidth + 1) l.textContent = '';
  });
}

export function renderStrip(el, order, design, handlers) {
  const tobe = schedule(order, design.cls, 'TO-BE');
  const asis = schedule(order, design.cls, 'AS-IS');
  const scale = Math.max(tobe.total, asis.total);
  const pct = (d) => `${(d / scale) * 100}%`;
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
        ${s.variant === 'TO-BE' && saved > 0.5 ? h`<span class="cmp-gap" style="left:${pct(s.total)};width:${pct(saved)}"><em>${Math.round(saved)} working days sooner · −${Math.round((saved / asis.total) * 100)} %</em></span>` : ''}
      </div>
      <span class="cmp-end">
        ${reqChip(s.targets.R1, 'R1')}${reqChip(s.targets.R2, 'R2')}
        <span class="cmp-total" title="${esc(`${Math.round(s.total)} working days from the enquiry to the installed chimney`)}"><b>${fmtDate(s.delivery)}</b> ${Math.round(s.total)} d</span>
      </span>
    </div>`;

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
