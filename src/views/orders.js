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
  const blocked = open.filter((r) => r.o.stage === 'spec' && !r.d.releasable).length;

  root.innerHTML = h`
    <div class="orders">
      <div class="page-head">
        <div><h1>Orders</h1><p>Every order runs through the configurator. Click one to open it.</p></div>
        <div class="actions">
          <button class="btn ghost" data-reset>Reset demo data</button>
          <button class="btn primary" data-new>New enquiry</button>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span>Open orders</span><b>${open.length}</b><small>${rows.length - open.length} delivered</small></div>
        <div class="kpi"><span>Configure-to-order</span><b>${Math.round((cto / rows.length) * 100)} %</b><small>${cto} of ${rows.length} inside the PVM</small></div>
        <div class="kpi"><span>Avg. lead time, enquiry → delivery</span><b>${tobeLead.toFixed(0)} d</b><small>AS-IS ${asisLead.toFixed(0)} d · −${(asisLead - tobeLead).toFixed(0)} d</small></div>
        <div class="kpi ${late ? 'warn' : ''}"><span>Needs attention</span><b>${late + blocked}</b><small>${late} late · ${blocked} blocked at spec</small></div>
      </div>
      <table class="otable">
        <thead><tr><th>Order</th><th>Customer · project</th><th>Site</th><th>Type</th><th>Progress</th><th>Delivery</th><th>Status</th><th>Value</th><th>Contact</th></tr></thead>
        <tbody>
          ${rows.map(({ o, d, s }) => {
            const si = o.stage === 'done' ? STAGES.length : STAGES.findIndex((x) => x.key === o.stage);
            const status = o.stage === 'done' ? ['done', 'Delivered']
              : o.stage === 'spec' && !d.releasable ? [s.late ? 'late' : 'missing', s.late ? 'Late · spec incomplete' : 'Spec incomplete']
              : s.late ? ['late', 'Late']
              : d.errors.length ? ['error', 'Conflict']
              : ['ok', 'On track'];
            const site = SITES[o.config.site] || OTHER_SITE;
            return h`
              <tr data-id="${o.id}">
                <td class="mono">${o.id}</td>
                <td><b>${esc(o.customer)}</b><span class="sub">${esc(o.project)}</span></td>
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
