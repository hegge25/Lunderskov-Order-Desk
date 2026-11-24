// Quotation scenario 2: the customer-facing web configurator. Same PVM fields and the same rules as
// the Order Desk; the customer gets a budget price and a standard drawing at once (R7), and a
// request lands in the Order Desk for the salesperson to verify the site and send the binding quotation.
import { store } from '../store.js';
import { computeDesign } from '../engine/design.js';
import { newOrderConfig } from '../data/seed.js';
import { ChimneyViewer } from '../three/viewer.js';
import { mountConfig, updateConfig, focusTarget } from './configPanel.js';
import { drawingSvg, openDocs } from './docs.js';
import { dkk, h, esc } from '../format.js';
import { fieldLabel } from '../engine/design.js';

const DRAFT = 'lod.webDraft.v1';
const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT)) || newOrderConfig(); } catch { return newOrderConfig(); }
};
const saveDraft = (c) => {
  try { localStorage.setItem(DRAFT, JSON.stringify(c)); } catch { /* ignore */ }
};
const budget = (x) => Math.round(x / 10000) * 10000;

export function renderWeb(root) {
  const draft = { id: 'WEB', customer: '', project: '', contact: '', config: loadDraft() };
  let sent = null;
  root.innerHTML = h`
    <div class="web">
      <div class="web-hero">
        <div>
          <span class="web-brand"><span class="mark"></span>Lunderskov Chimneys</span>
          <h1>Configure your chimney</h1>
          <p>Enter your flue gas data, inlet, accessories and location. You get a budget price and a standard drawing at once. Our salesperson verifies the local requirements before the binding quotation.</p>
        </div>
        <span class="web-tag" title="Quotation scenario 2 in the report">Customer view · scenario 2</span>
      </div>
      <div class="web-grid">
        <aside class="col cfg web-form" data-config></aside>
        <main class="col viewer-col">
          <div class="viewer" data-viewer>
            <div class="vbar tl">
              <button class="tog" data-tog="cutaway">Cutaway</button>
              <button class="tog" data-tog="dims">Dimensions</button>
            </div>
          </div>
        </main>
        <aside class="col web-side" data-side></aside>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const cfgEl = $('[data-config]');
  const side = $('[data-side]');
  const viewEl = $('[data-viewer]');
  let design = computeDesign(draft.config);

  const viewer = new ChimneyViewer(viewEl, {
    toggles: { cutaway: false, xray: false, dims: true, smoke: true, wind: false, context: true },
    onCallout: (target) => target && focusTarget(cfgEl, target),
  });
  const syncToggles = () => viewEl.querySelectorAll('[data-tog]').forEach((b) => b.classList.toggle('on', !!viewer.toggles[b.dataset.tog]));
  viewEl.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tog]');
    if (t) { viewer.setToggle(t.dataset.tog, !viewer.toggles[t.dataset.tog]); syncToggles(); }
  });

  function renderSide() {
    const d = design;
    const cfg = draft.config;
    if (sent) {
      side.innerHTML = h`
        <div class="web-card done">
          <h3>Request sent</h3>
          <p>Thank you. Your request <b class="mono">${sent.id}</b> is with our sales team. ${d.cls === 'CTO'
            ? 'A salesperson verifies the local requirements, wind profile and installation, then sends your binding quotation, normally within 1–2 working days.'
            : 'Your chimney is outside our standard range, so a salesperson will contact you to clarify the special request.'}</p>
          <a class="btn primary" href="#/order/${sent.id}">Open it in the Order Desk <small>(staff view)</small></a>
          <button class="btn ghost" data-again>Configure another chimney</button>
        </div>`;
      side.querySelector('[data-again]').addEventListener('click', () => { sent = null; renderSide(); });
      return;
    }
    const missing = d.missing.map((k) => fieldLabel(k, cfg).toLowerCase());
    const ready = d.releasable;
    side.innerHTML = h`
      <div class="web-card price ${d.cls.toLowerCase()}">
        ${d.cls === 'CTO' ? h`
          <span class="wp-label">Budget price</span>
          <b class="wp-price">${dkk(budget(d.price.total))}</b>
          <span class="wp-sub">excl. VAT, transport and installation included</span>
          <p class="wp-note">Indicative. The binding quotation follows when our salesperson has verified the local requirements, wind profile and installation, so the price may change.</p>`
        : h`
          <span class="wp-label">Special request</span>
          <b class="wp-price small">Outside our standard range</b>
          <ul class="wp-why">${d.eto.map((e) => `<li>${esc(e.text)}</li>`)}</ul>
          <p class="wp-note">We can still build it. A salesperson will clarify the request with you, and our designers estimate the non-standard parts.</p>`}
      </div>
      <div class="web-card dims">
        <div><span>Height</span><b>${d.values.H} m</b></div>
        <div><span>Diameter</span><b>${d.values.D.toFixed(2)} m</b></div>
        <div><span>Flues</span><b>${d.values.N} × Ø ${d.values.d.toFixed(2)}</b></div>
        <div><span>Weight</span><b>${(d.values.weight / 1000).toFixed(1)} t</b></div>
      </div>
      <button class="web-card drawing-thumb" data-drawing title="Open the standard drawing">
        ${drawingSvg(d, { budget: true, customer: draft.customer || 'Your company' })}
        <span>Standard drawing · click to enlarge</span>
      </button>
      <form class="web-card req" data-req>
        <h3>${d.cls === 'CTO' ? 'Request a binding quotation' : 'Send the special request'}</h3>
        <label>Company<input name="customer" required placeholder="Company name" value="${esc(draft.customer)}"></label>
        <label>Project<input name="project" placeholder="e.g. Biomass boiler line 2" value="${esc(draft.project)}"></label>
        <label>Your name<input name="contact" required placeholder="Full name" value="${esc(draft.contact)}"></label>
        ${ready ? '' : `<p class="req-miss">${missing.length ? `Still required: ${esc(missing.join(', '))}.` : 'Resolve the conflict marked in red first.'}</p>`}
        <button class="btn primary" type="submit" ${ready ? '' : 'disabled'}>${d.cls === 'CTO' ? 'Request binding quotation' : 'Send special request'}</button>
      </form>`;
    side.querySelector('[data-drawing]').addEventListener('click', () => openDocs('drawing', design, { budget: true, id: 'Budget drawing', customer: draft.customer || 'Your company' }));
    const form = side.querySelector('[data-req]');
    form.addEventListener('input', () => { draft.customer = form.customer.value; draft.project = form.project.value; draft.contact = form.contact.value; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!design.releasable) return;
      sent = store.create({
        customer: form.customer.value.trim() || 'Web customer',
        project: form.project.value.trim() || 'Web enquiry',
        contact: 'Mette Lund',
        customerContact: form.contact.value.trim(),
        channel: 'web',
        // CTO: the configuration goes straight to the salesperson for verification (W3 → A1).
        // ETO: the salesperson first clarifies the special request (A0).
        stage: design.cls === 'CTO' ? 'quote' : 'enquiry',
        config: JSON.parse(JSON.stringify(draft.config)),
      });
      renderSide();
    });
  }

  function refresh() {
    design = computeDesign(draft.config);
    updateConfig(cfgEl, draft, design);
    viewer.setDesign(design);
    renderSide();
  }
  mountConfig(cfgEl, draft, {
    onChange: (k, v) => { draft.config[k] = v; saveDraft(draft.config); if (!sent) refresh(); else { design = computeDesign(draft.config); updateConfig(cfgEl, draft, design); viewer.setDesign(design); } },
  }, { web: true });
  refresh();
  syncToggles();
  return () => viewer.dispose();
}
