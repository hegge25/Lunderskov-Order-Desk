// Progress strip: stages with planned dates and the R1/R2 targets, a to-scale bar of every step
// (parallel steps in a second lane), and the AS-IS comparison.
import { schedule, fmtDate, fmtDays } from '../engine/timeline.js';
import { STAGES, ACTIONS } from '../config/process.js';
import { h, esc } from '../format.js';

const reqChip = (t, key) => h`<span class="st-req ${t.met ? 'ok' : 'bad'}" title="${esc(`${key}: ${t.text}. This plan: ${fmtDays(Math.round(t.days * 10) / 10)} against ${t.limit} d.`)}">${key} ${t.met ? '✓' : '✗'}</span>`;

export function renderStrip(el, order, design, variant, handlers) {
  const tobe = schedule(order, design.cls, 'TO-BE');
  const asis = schedule(order, design.cls, 'AS-IS');
  const s = variant === 'AS-IS' ? asis : tobe;
  const other = variant === 'AS-IS' ? tobe : asis;
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
  const hasPar = s.steps.some((x) => x.par);

  el.innerHTML = h`
    <div class="strip-row">
      <div class="strip-sum">
        <div class="seg seg-sm" data-variant>
          ${['TO-BE', 'AS-IS'].map((v) => `<button class="${v === variant ? 'on' : ''}" data-v="${v}">${v}</button>`)}
        </div>
        <div class="sum-main">
          <span class="sum-label">${delivered ? 'Delivered' : 'Planned delivery'}</span>
          <b>${fmtDate(s.delivery)}</b>
        </div>
        <div class="sum-sub">
          <span>${Math.round(s.total)} working days from enquiry</span>
          <span class="delta ${variant === 'AS-IS' ? 'bad' : 'good'}">${variant === 'AS-IS' ? `${Math.round(saved)} d later than TO-BE` : `${Math.round(saved)} d sooner than AS-IS`}</span>
        </div>
        <button class="help" data-help title="How to read this strip">?</button>
      </div>
      <ol class="stages">
        ${s.stages.map((st) => h`
          <li class="stage ${st.status}" data-stage="${st.key}" title="${esc(st.steps.map((x) => `${x.ref ? `${variant === 'AS-IS' ? 'Step ' : ''}${x.ref} · ` : ''}${x.label} · ${x.owner} · ${fmtDays(x.days)}`).join('\n'))}">
            <span class="dot"></span>
            <span class="st-name">${st.label}${st.key === 'quote' ? reqChip(s.targets.R1, 'R1') : ''}${st.key === 'design' ? reqChip(s.targets.R2, 'R2') : ''}</span>
            <span class="st-when">${st.status === 'done' ? 'Done' : st.endDate ? `by ${fmtDate(st.endDate)}` : ''}</span>
            <span class="st-dur">${fmtDays(Math.round(st.days * 10) / 10)}${st.status === 'late' ? ' · late' : ''}</span>
          </li>`)}
      </ol>
      <div class="strip-act">
        ${delivered ? '<span class="muted">Order closed</span>' : h`
          <button class="btn ${gate ? 'blocked' : 'primary'}" data-advance ${gate ? 'disabled' : ''}>${actLabel}</button>
          ${gate ? `<span class="gate-why">Blocked: ${gateWhy}</span>` : ''}`}
      </div>
    </div>
    <div class="gantt ${hasPar ? 'two' : ''}">
      <div class="g-track" data-track>
        ${s.steps.map((st) => h`<span class="g-seg ${st.status} ${st.wait ? 'wait' : ''} ${st.auto ? 'auto' : ''} ${st.par ? 'par' : ''}" data-refs="${[st.ref, st.hl, variant === 'TO-BE' && (st.stage === 'quote' || st.stage === 'enquiry') ? 'Q' : ''].filter(Boolean).join(' ')}" style="left:${pct(st.start)};width:${pct(st.end - st.start)}" title="${esc(`${st.ref ? `${variant === 'AS-IS' ? 'Step ' : ''}${st.ref} · ` : ''}${st.label} · ${st.owner} · ${fmtDays(Math.round((st.end - st.start) * 100) / 100)}${st.par ? ' · in parallel' : ''}`)}"></span>`)}
        ${!delivered ? `<span class="g-today" style="left:${pct(Math.min(s.now, scale))}"><em>Today</em></span>` : ''}
        <span class="g-other ${other.total / scale > 0.85 ? 'end' : ''}" style="left:${pct(other.total)}"><em>${other.variant} ${fmtDate(other.delivery)}</em></span>
      </div>
      <div class="g-cap" data-cap></div>
    </div>`;

  el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => handlers.onVariant(b.dataset.v)));
  el.querySelector('[data-advance]')?.addEventListener('click', handlers.onAdvance);
  el.querySelector('[data-help]').addEventListener('click', handlers.onHelp);
}

// Light up the steps that use a PVM attribute: TO-BE refs (C2, E5) or AS-IS step numbers.
export function highlightSteps(el, refs, caption = '') {
  const cap = el.querySelector('[data-cap]');
  if (cap) { cap.innerHTML = caption; cap.classList.toggle('on', !!caption); }
  const track = el.querySelector('[data-track]');
  if (!track) return;
  const want = new Set(refs || []);
  let any = false;
  track.querySelectorAll('.g-seg').forEach((seg) => {
    const hit = want.size > 0 && seg.dataset.refs.split(' ').some((r) => want.has(r));
    seg.classList.toggle('hl', hit);
    any ||= hit;
  });
  track.classList.toggle('hl-mode', want.size > 0);
  track.dataset.hlCount = any ? String(track.querySelectorAll('.g-seg.hl').length) : '0';
}
