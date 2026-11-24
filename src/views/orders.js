import { store } from '../store.js';
import { computeDesign } from '../engine/design.js';
import { schedule, fmtDate } from '../engine/timeline.js';
import { STAGES } from '../config/process.js';
import { SITES, OTHER_SITE } from '../config/rules.js';
import { dkk, h, esc } from '../format.js';

export function renderOrders(root) {
  const rows = store.all().map((o) => {
    const d = computeDesign(o.config);
    const s = schedule(o, d.cls, 'TO-BE');
    const a = schedule(o, d.cls, 'AS-IS');
    return { o, d, s, a };
  });
  const open = rows.filter((r) => r.o.stage !== 'done');
  const cto = rows.filter((r) => r.d.cls === 'CTO').length;
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const tobeLead = avg(rows.map((r) => r.s.total));
  const asisLead = avg(rows.map((r) => r.a.total));
  const late = open.filter((r) => r.s.late).length;
  const gated = (r) => ['quote', 'order', 'design'].includes(r.o.stage) && !r.d.releasable;
  const blocked = open.filter(gated).length;
  const r1 = avg(rows.map((r) => r.s.targets.R1.days));
  const r1asis = avg(rows.map((r) => r.a.targets.R1.days));
  const by = (c) => rows.filter((r) => r.d.cls === c);
  const r2 = (c) => avg(by(c).map((r) => r.s.targets.R2.days));
  const web = rows.filter((r) => r.o.channel === 'web').length;

  root.innerHTML = h`
    <div class="orders">
      <div class="page-head">
        <div><h1>Orders</h1><p>Every order runs through the configurator: from the web (scenario 2) or entered by a salesperson. Click one to open it.</p></div>
        <div class="actions">
          <button class="btn ghost" data-reset>Reset demo data</button>
          <button class="btn" data-web>Open web configurator</button>
          <button class="btn primary" data-new>New enquiry</button>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span>Open orders</span><b>${open.length}</b><small>${web} of ${rows.length} configured online (R7)</small></div>
        <div class="kpi"><span>Configure-to-order</span><b>${Math.round((cto / rows.length) * 100)} %</b><small>${cto} of ${rows.length} inside the PVM intervals</small></div>
        <div class="kpi ${r1 <= 2 ? 'met' : ''}"><span>R1 · quotation lead time</span><b>${r1.toFixed(1)} d</b><small>target ≤ 2 d · AS-IS ${r1asis.toFixed(0)} d</small></div>
        <div class="kpi ${r2('CTO') <= 2 && (!by('ETO').length || r2('ETO') <= 10) ? 'met' : ''}"><span>R2 · design lead time</span><b>${r2('CTO').toFixed(1)} <small>CTO</small> · ${by('ETO').length ? r2('ETO').toFixed(0) : '–'} <small>ETO</small></b><small>targets ≤ 2 d / ≤ 10 d · AS-IS 26 d</small></div>
        <div class="kpi"><span>Avg. enquiry → delivery</span><b>${tobeLead.toFixed(0)} d</b><small>AS-IS ${asisLead.toFixed(0)} d · −${(asisLead - tobeLead).toFixed(0)} d</small></div>
        <div class="kpi ${late + blocked ? 'warn' : ''}"><span>Needs attention</span><b>${late + blocked}</b><small>${late} late · ${blocked} blocked (R3)</small></div>
      </div>
      <table class="otable">
        <thead><tr><th>Order</th><th>Customer · project</th><th>Channel</th><th>Location</th><th>Type</th><th>Progress</th><th>Delivery</th><th>Status</th><th>Value</th><th>Contact</th></tr></thead>
        <tbody>
          ${rows.map(({ o, d, s }) => {
            const si = o.stage === 'done' ? STAGES.length : STAGES.findIndex((x) => x.key === o.stage);
            const status = o.stage === 'done' ? ['done', 'Delivered']
              : gated({ o, d }) ? [s.late ? 'late' : 'missing', s.late ? `Late · ${d.complete ? 'conflict' : 'spec incomplete'}` : d.complete ? 'Conflict' : 'Spec incomplete']
              : s.late ? ['late', 'Late']
              : d.errors.length ? ['error', 'Conflict']
              : ['ok', 'On track'];
            const site = SITES[o.config.site] || OTHER_SITE;
            return h`
              <tr data-id="${o.id}">
                <td class="mono">${o.id}</td>
                <td><b>${esc(o.customer)}</b><span class="sub">${esc(o.project)}</span></td>
                <td><span class="chan ${o.channel || 'sales'}">${o.channel === 'web' ? 'Web' : 'Sales'}</span></td>
                <td>${esc(site.label)}</td>
                <td><span class="badge ${d.cls.toLowerCase()}">${d.cls}</span></td>
                <td>
                  <div class="mini">${STAGES.map((st, i) => `<i class="${i < si ? 'done' : i === si ? (s.late ? 'late' : 'active') : ''}" title="${st.label}"></i>`).join('')}</div>
                  <span class="sub">${o.stage === 'done' ? 'Delivered' : STAGES[si].label}</span>
                </td>
                <td class="mono">${fmtDate(s.delivery)}</td>
                <td><span class="status ${status[0]}">${status[1]}</span></td>
                <td class="mono">${dkk(d.price.total)}</td>
                <td>${esc(o.contact)}</td>
              </tr>`;
          })}
        </tbody>
      </table>
    </div>`;

  root.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => { location.hash = `#/order/${tr.dataset.id}`; }));
  root.querySelector('[data-web]').addEventListener('click', () => { location.hash = '#/web'; });
  root.querySelector('[data-new]').addEventListener('click', () => {
    const o = store.create();
    location.hash = `#/order/${o.id}`;
  });
  root.querySelector('[data-reset]').addEventListener('click', () => {
    store.reset();
    renderOrders(root);
  });
  return () => {};
}
