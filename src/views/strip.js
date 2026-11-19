// Progress strip: stages with planned dates, a to-scale bar of every step, and the AS-IS comparison.
import { schedule, fmtDate, fmtDays } from '../engine/timeline.js';
import { STAGES } from '../config/process.js';
import { h, esc } from '../format.js';

export function renderStrip(el, order, design, variant, handlers) {
  const tobe = schedule(order, design.cls, 'TO-BE');
  const asis = schedule(order, design.cls, 'AS-IS');
  const s = variant === 'AS-IS' ? asis : tobe;
  const other = variant === 'AS-IS' ? tobe : asis;
  const scale = Math.max(tobe.total, asis.total);
  const pct = (d) => `${(d / scale) * 100}%`;
  const saved = asis.total - tobe.total;
  const delivered = order.stage === 'done';
  const activeStage = STAGES.find((x) => x.key === order.stage);

  const gate = order.stage === 'spec' && !design.releasable;
  const gateWhy = !design.complete
    ? `${design.missing.length} field${design.missing.length > 1 ? 's' : ''} missing`
    : `${design.errors.length} conflict${design.errors.length > 1 ? 's' : ''}`;

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
          <li class="stage ${st.status}" title="${esc(st.steps.map((x) => `${x.label} · ${x.owner} · ${fmtDays(x.days)}`).join('\n'))}">
            <span class="dot"></span>
            <span class="st-name">${st.label}</span>
            <span class="st-when">${st.status === 'done' ? 'Done' : st.endDate ? `by ${fmtDate(st.endDate)}` : ''}</span>
            <span class="st-dur">${fmtDays(st.days)}${st.status === 'late' ? ' · late' : ''}</span>
          </li>`)}
      </ol>
      <div class="strip-act">
        ${delivered ? '<span class="muted">Order closed</span>' : h`
          <button class="btn ${gate ? 'blocked' : 'primary'}" data-advance ${gate ? 'disabled' : ''}>
            ${order.stage === 'spec' ? 'Release to design' : `Complete ${activeStage ? activeStage.label.toLowerCase() : ''}`}
          </button>
          ${gate ? `<span class="gate-why">Blocked: ${gateWhy}</span>` : ''}`}
      </div>
    </div>
    <div class="gantt">
      <div class="g-track">
        ${s.steps.map((st) => h`<span class="g-seg ${st.status} ${st.wait ? 'wait' : ''}" style="left:${pct(st.start)};width:${pct(st.end - st.start)}" title="${esc(`${st.label} · ${st.owner} · ${fmtDays(st.end - st.start)}`)}"></span>`)}
        ${!delivered ? `<span class="g-today" style="left:${pct(Math.min(s.now, scale))}"><em>Today</em></span>` : ''}
        <span class="g-other ${other.total / scale > 0.85 ? 'end' : ''}" style="left:${pct(other.total)}"><em>${other.variant} ${fmtDate(other.delivery)}</em></span>
      </div>
    </div>`;

  el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => handlers.onVariant(b.dataset.v)));
  el.querySelector('[data-advance]')?.addEventListener('click', handlers.onAdvance);
  el.querySelector('[data-help]').addEventListener('click', handlers.onHelp);
}
