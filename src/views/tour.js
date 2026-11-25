// Guided tour: a spotlight on one part of the screen at a time, with a card explaining it.
// Runs on the first visit; "Tour" in the top bar replays it, "?" on the strip opens the strip explainer.

import { store } from '../store.js';
import { h } from '../format.js';

const SEEN = 'lod.tourSeen.v3';
const DEMO = 'LC-2026-0412'; // the order with no ladder or platform specified yet

const txt = (sel) => document.querySelector(sel)?.textContent.trim() || '';

// The progress strip, number by number. Text is filled in from what is on screen.
const STRIP_MARKS = [
  { sel: '.stages', text: () => 'This order in the TO-BE process: when each stage should be finished (<b>by …</b>), or <b>Done</b>. <b>late</b> means the current step overran; everything after it moves.' },
  { sel: '.strip-act .btn', text: () => 'Moves the order on. <b>Send binding quotation</b> stays blocked while information is missing or conflicting (R3).' },
  { sel: '.cmp-row.tobe .cmp-name', at: 'left', text: () => '<b>TO-BE</b>: the same order through the report\'s process, every step to scale and coloured by stage. Hover a block for the step (C1–C6, E1–E8). <b>Hatched</b> steps wait on others: the customer\'s decision (our assumption, 8 days) or the regulations.' },
  { sel: '.cmp-row.asis .cmp-name', at: 'left', text: () => '<b>AS-IS</b>: the same order and enquiry date through today\'s process, using the case\'s times (pp. 6–7). Hover a block for its Appendix 3 step numbers.' },
  { sel: '.cmp-gap em', at: 'left', text: () => `<b>${txt('.cmp-gap em')}</b>: the gain. Most of it comes from quotation (blue) and design (purple).` },
  { sel: '.cmp-row.tobe .cmp-req', at: 'left', text: () => '<b>R1</b> and <b>R2</b> check each plan against the case\'s targets: a quotation within 1–2 days, design within 2 days for CTO and 2 weeks for ETO. Hover a chip for the numbers.' },
  { sel: '.cmp-row.tobe .cmp-total b', text: () => 'Planned delivery and working days from the enquiry (weekends not counted).' },
  { sel: '.cmp-today em', at: 'right', text: () => '<b>Today.</b> Hover a field\'s title on the left to light up, in both bars, the steps that use it.' },
];

// Live demos the tour runs on the page itself, undone when the step is left.
const setSelect = (sel, v) => {
  sel.value = v;
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
};
const ETO_DEMO = {
  saved: null,
  on() {
    const sel = document.querySelector('select[data-k="site"]');
    if (!sel) return false;
    if (sel.value !== 'OTHER') { this.saved = sel.value; setSelect(sel, 'OTHER'); }
    return true;
  },
  off() {
    if (!this.saved) return;
    const sel = document.querySelector('select[data-k="site"]');
    if (sel) setSelect(sel, this.saved);
    else store.setConfig(DEMO, 'site', this.saved);
    this.saved = null;
  },
};
const HOVER_DEMO = {
  on() {
    const label = document.querySelector('[data-field="flowRate"] .f-top label');
    if (!label) return false;
    label.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return true;
  },
  off() {
    document.querySelector('[data-config]')?.dispatchEvent(new MouseEvent('mouseleave'));
  },
};

const STRIP_STEP = {
  route: null,
  target: '[data-strip]',
  place: 'bottom',
  wide: true,
  title: 'Reading the progress strip',
  marks: STRIP_MARKS,
};

const CHAPTERS = ['Introduction', 'The customer', 'The salesperson', 'Design', 'Lead time', 'Outside the PVM'];
const ORDER = `#/order/${DEMO}`;

const MAIN = [
  // ── 1 Introduction ──
  {
    chapter: 0,
    route: '#/orders',
    wide: true,
    title: 'Lunderskov Order Desk',
    body: `<p>A working mock-up of the TO-BE process in our report: <b>one configurator built on the PVM</b>, used by the customer on the website and by sales and design inside the company.</p>
      <p>In the case, a quotation takes 4 days to 2 weeks and can land up to 40 % from the actual price, and an order takes 4 weeks on average to design. Jørgensen Consult recommends at most 1–2 days for a quotation, 2 days for a CTO design and 2 weeks for an ETO design.</p>
      <p>The tour follows one chimney order from the customer to the design, in five parts:</p>
      <ol class="t-outline"><li>The order board</li><li>The customer's web configurator</li><li>The salesperson's order page</li><li>Design in the order configurator</li><li>Lead time: TO-BE against AS-IS, and an order outside the PVM</li></ol>
      <p class="t-note">About 5 minutes; the arrow keys move through it. All the information in the case and the report is used: the PVM, the AS-IS and TO-BE steps and the requirements. Where they are silent (prices, regulations per location, TO-BE durations, the orders), the gaps are filled with assumptions to show how the configurator works. The yellow note under the top bar lists what comes from where.</p>`,
  },
  {
    chapter: 0,
    route: '#/orders',
    target: '.kpis',
    place: 'bottom',
    title: 'The board, measured against the requirements',
    body: `<p>Each tile is one of the report's requirements, computed over the orders below, with the AS-IS figure from the case next to it:</p>
      <ul>
        <li><b>R7</b>: share of orders the customer configured online.</li>
        <li><b>Configure-to-order</b>: orders inside the PVM intervals, which the configurator designs without a designer.</li>
        <li><b>R1</b>: quotation lead time, target 1–2 days.</li>
        <li><b>R2</b>: design lead time, target 2 days for CTO and 2 weeks for ETO.</li>
        <li><b>Needs attention</b>: late, or blocked because the specification is incomplete (<b>R3</b>).</li>
      </ul>`,
    src: 'Requirements: report §3.2',
  },
  {
    chapter: 0,
    route: '#/orders',
    target: 'th.c-chan',
    also: [{ all: '.c-chan' }, { all: '.c-type' }],
    place: 'left',
    title: 'Two ways in',
    body: `<p><b>Channel</b> shows how an order came in. <i>Web</i>: the customer configured it on the website (quotation scenario 2). <i>Sales</i>: a salesperson configured it in the same configurator during the call.</p>
      <p><b>Type</b> is set by the configurator, not by a person: <b>CTO</b> when every attribute is inside the PVM intervals, <b>ETO</b> when one is not, like Kystkraft's site at the bottom, which is not in the location database.</p>
      <p>We start where an order starts: on Lunderskov's website.</p>`,
  },
  // ── 2 The customer ──
  {
    chapter: 1,
    route: '#/web',
    target: '.web-hero',
    place: 'bottom',
    title: 'The customer configures online',
    body: `<p>This page is what a customer would see on Lunderskov's website. In the case, some customers already ask for general specifications, drawings and prices from the website.</p>
      <p>It is <b>quotation scenario 2</b> in the report. We recommend it because it alone meets R7, and it contains scenario 1, the salesperson's configurator, so the two can be introduced one after the other.</p>`,
    src: 'TO-BE quotation, scenario 2: report §4.1 and attachment',
  },
  {
    chapter: 1,
    route: '#/web',
    target: '.web-form',
    place: 'right',
    title: 'The PVM, in the customer\'s words',
    body: `<p>The form is the <b>customer view of the PVM</b>: flue gas data, location, gas inlet, cleaning door, ladder and platform. The green band on each slider is the PVM interval.</p>
      <p>Every attribute the design steps use is a required field, so nothing has to be asked for later (R3). A value outside an interval is not refused: it becomes a <b>special request</b>, handled as ETO.</p>`,
    src: 'PVM: case Appendix 1',
  },
  {
    chapter: 1,
    route: '#/web',
    target: '.web-card.price',
    also: ['.web-card.dims', '.drawing-thumb'],
    place: 'left',
    title: 'A budget price and a drawing at once',
    body: `<p>The rules used inside the company size the chimney and price its parts, so the customer gets a <b>budget price</b> and a <b>standard drawing</b> in seconds, not after 4 days to 2 weeks.</p>
      <p>It is a budget price: a salesperson still verifies what depends on the site (local requirements, wind profile, installation) before the binding quotation, so it may change.</p>
      <p>In the case, about 2,000 quotations a year lead to about 200 orders. Customers who explore prices on their own save the salespeople's time (R5).</p>`,
  },
  {
    chapter: 1,
    route: '#/web',
    target: '.req',
    scroll: true,
    place: 'left',
    title: 'The request lands in the Order Desk',
    body: `<p><b>Request binding quotation</b> creates the order on the board. A CTO request goes straight to the salesperson, who verifies the site and sends the binding quotation within R1.</p>
      <p>A special request goes to the salesperson first, to clarify it with the customer. Management then decides whether to quote it, and design estimates only the non-standard attributes.</p>
      <p>Try it after the tour. Now we switch sides.</p>`,
  },
  // ── 3 The salesperson ──
  {
    chapter: 2,
    route: '#/orders',
    target: `tr[data-id="${DEMO}"]`,
    place: 'bottom',
    title: 'Back inside: an order from the phone',
    body: `<p>Nordvarme A/S phoned in. The salesperson entered the enquiry in the same configurator during the call, so the board already knows its type, price and planned delivery.</p>
      <p>Its status is <b>Spec incomplete</b>: the binding quotation cannot go out yet. Let's open it.</p>`,
  },
  {
    chapter: 2,
    route: ORDER,
    target: '.order',
    place: 'center',
    wide: true,
    title: 'The order page',
    body: '<p>One page per order, shared by sales and design. It has four parts:</p>',
    listClass: 'one-col',
    marks: [
      { sel: '[data-config]', text: () => '<b>The specification</b>: the PVM customer view, filled in by the salesperson or the customer.' },
      { sel: '[data-viewer] .vbar.tl', text: () => '<b>The chimney</b>, built from the specification by the rules.' },
      { sel: '[data-derived]', text: () => '<b>The design</b> the configurator derives, grouped by the TO-BE steps.' },
      { sel: '.stages', text: () => '<b>The progress</b> of the order, TO-BE against AS-IS.' },
      { sel: '.ohead .badge', at: 'left', text: () => '<b>The type</b> and the <b>binding price</b>. For CTO the price is final, because the quotation and the order are calculated from the same specification (R6).' },
    ],
  },
  {
    chapter: 2,
    route: ORDER,
    target: '[data-field="flowRate"]',
    also: ['[data-strip]'],
    scroll: true,
    place: 'right',
    demo: HOVER_DEMO,
    title: 'The PVM linked to the process',
    body: `<p>Under each field are the steps that use the attribute: the AS-IS step numbers from the case's Appendix 3 and the TO-BE steps.</p>
      <p>We are hovering <i>Flow rate</i> for you. In AS-IS it is used in 8 of the 17 design steps, including the three capacity re-calculations (4, 8 and 11). In TO-BE it is entered once, in the quotation, and used in one configurator step, C2.</p>
      <p>Hover the title of any field to see its steps.</p>`,
    src: 'PVM–process link: report §4.3',
  },
  {
    chapter: 2,
    route: ORDER,
    target: ['[data-field="ladders"]', '[data-group="ladder"]'],
    also: ['[data-spec]', '.strip-act'],
    scroll: true,
    place: 'right',
    title: 'Complete before the quotation (R3)',
    body: `<p>In the case, designer E "will most often miss information on the ladder and the platform from the customer" and has to gather it before the detail design.</p>
      <p>Here both are required. The specification card counts what is missing, the model shows the parts as orange ghosts, and <b>Send binding quotation</b> stays blocked.</p>
      <p><b>Try it:</b> click <i>Add ladder</i>, then add a platform or choose <i>No platform</i>.</p>`,
  },
  {
    chapter: 2,
    route: ORDER,
    target: '[data-viewer]',
    place: 'left',
    title: 'The chimney, built from the configuration',
    body: `<p>Height, liners, insulation, fans, filters and wire supports all follow from the rules, and the model rebuilds when anything changes.</p>
      <p><b>Cutaway</b> (C) shows the insulation and the flue gas cooling on its way up. Also try <b>Wind</b> (W) and the camera views (1–4). Hover a part for its specs; click a label to jump to its field.</p>`,
  },
  // ── 4 Design ──
  {
    chapter: 3,
    route: ORDER,
    target: '.dstep[data-step="C2"]',
    scroll: true,
    place: 'left',
    title: 'C2: re-sequenced with the process DSM',
    body: `<p>In AS-IS, designer A calculates the capacity before the local requirements, the heat loss and the emission are known, so it is re-calculated three times.</p>
      <p>The process DSM re-orders the tasks: requirements and emission first, then the material, then height, diameter, number of flues and heat loss <b>solved together as one task</b>. The numbered blocks follow that order.</p>
      <p>For a CTO order the order configurator runs C2–C5 in one pass. The rule log at the bottom of this column explains each value.</p>`,
    src: 'Process DSM and TO-BE CTO chart: report §4.2',
  },
  {
    chapter: 3,
    route: ORDER,
    target: '.dstep[data-step="C5"]',
    also: ['.dstep[data-step="C6"]', '[data-derived] .quote'],
    scroll: true,
    place: 'left',
    title: 'C5 documents, C6 check, final price',
    body: `<p><b>C5</b> generates the part list, with the names of the PVM part view, and a drawing with the main dimensions. Open them here.</p>
      <p>In <b>C6</b> a designer checks the configured design. An order that fails the check moves to the ETO process.</p>
      <p>The price is calculated from the same part quantities, so it is final for CTO (R6). In the case, quotations are up to 40 % above or below the actual price.</p>`,
  },
  // ── 5 Lead time ──
  { ...STRIP_STEP, chapter: 4, route: ORDER, title: 'Same order, two processes' },
  // ── 6 Outside the PVM ──
  {
    chapter: 5,
    route: ORDER,
    target: '[data-strip]',
    also: ['.ohead .badge'],
    place: 'bottom',
    demo: ETO_DEMO,
    title: 'What if the site is not in the database?',
    body: `<p>We have set this order's <i>Location</i> to <b>Other</b>. The configurator holds no local requirements or wind profile for it, so the order is outside the PVM and becomes <b>ETO</b>.</p>
      <p>Watch the TO-BE bar: design grows from 1.5 to 10 working days, as the legislation department obtains the regulations by hand (E2). That still meets R2's 2 weeks, and the order is still delivered weeks before AS-IS.</p>`,
  },
  {
    chapter: 5,
    route: ORDER,
    target: '.cls-card',
    also: ['.dstep[data-step="E2"]', '.dstep[data-step="E4"]'],
    scroll: true,
    place: 'left',
    demo: ETO_DEMO,
    title: 'ETO: designed by people, E1–E8',
    body: `<p>The right column now follows the ETO process. Each step names its owner, from the legislation department (E2) to designer E (E7). E4, the material pre-selection, runs in parallel with E2.</p>
      <p>The configurator still proposes values for the standard parts and flags the steps outside the PVM. The price becomes an estimate.</p>
      <p>When you continue, the location is set back.</p>`,
    src: 'TO-BE ETO chart: report §4.2',
  },
  {
    route: ORDER,
    title: 'Over to you',
    body: `<ul>
      <li>Hover the title of a field and compare the TO-BE and AS-IS bars.</li>
      <li>Drag a slider outside its green band: the order becomes ETO.</li>
      <li>Put the <i>cleaning door</i> at <b>90°</b>: it collides with the gas inlet.</li>
      <li>Open the <b>part list</b> and the <b>drawing</b> in C5.</li>
      <li>Request a quotation in the <b>web configurator</b> and find it on the board.</li>
    </ul>
    <p><b>Tour</b> in the top bar replays this, <b>?</b> on the strip explains its numbers, and <b>Reset demo data</b> on the board restores the orders.</p>`,
  },
];

let active = null;

export function maybeStartTour() {
  let seen = false;
  try { seen = !!localStorage.getItem(SEEN); } catch { /* ignore */ }
  if (!seen) setTimeout(() => startTour(), 600);
}
export function startTour(steps = MAIN) {
  active?.close(false);
  active = new Tour(steps);
}
export function explainStrip() {
  startTour([STRIP_STEP]);
}

class Tour {
  constructor(steps) {
    this.steps = steps;
    this.i = 0;
    this.root = document.createElement('div');
    this.root.className = 'tour';
    // The shade is an SVG mask with one hole per highlighted element, so a step can light up
    // several parts of the page at once.
    this.root.innerHTML = `
      <svg class="tour-shade"><defs><mask id="tour-mask"><rect width="100%" height="100%" fill="#fff"/><g data-holes></g></mask></defs>
        <rect width="100%" height="100%" fill="rgba(10,14,18,0.6)" mask="url(#tour-mask)"/><g data-rings></g></svg>
      <div class="tour-marks"></div><div class="tour-card" role="dialog"></div>`;
    this.holes = this.root.querySelector('[data-holes]');
    this.rings = this.root.querySelector('[data-rings]');
    this.cur = [];
    this.demo = null;
    document.body.appendChild(this.root);
    this.marks = this.root.querySelector('.tour-marks');
    this.card = this.root.querySelector('.tour-card');
    this.card.addEventListener('click', (e) => {
      const a = e.target.closest('[data-t]')?.dataset.t;
      if (a === 'next') this.go(this.i + 1);
      if (a === 'back') this.go(this.i - 1);
      if (a === 'skip') this.close(true);
    });
    this.onKey = (e) => {
      if (e.key === 'Escape') this.close(true);
      if (e.key === 'ArrowRight') this.go(this.i + 1);
      if (e.key === 'ArrowLeft') this.go(this.i - 1);
    };
    window.addEventListener('keydown', this.onKey);
    this.loop = () => {
      this.place();
      this.raf = requestAnimationFrame(this.loop);
    };
    this.go(0);
    this.raf = requestAnimationFrame(this.loop);
  }

  go(i) {
    if (i < 0) return;
    if (i >= this.steps.length) return this.close(true);
    this.i = i;
    const s = this.steps[i];
    if (s.route && location.hash !== s.route) location.hash = s.route;
    this.target = null;
    this.waitFrom = performance.now();
    this.scrolled = false;
    const last = i === this.steps.length - 1;
    const many = this.steps.length > 1;
    const chapters = many && this.steps.some((x) => x.chapter != null);
    const ch = s.chapter ?? (i === this.steps.length - 1 ? CHAPTERS.length : -1);
    const head = !many ? '' : h`
      <div class="t-head">
        <span class="t-chap">${chapters && ch >= 0 && ch < CHAPTERS.length ? `${ch + 1} · ${CHAPTERS[ch]}` : ''}</span>
        <span class="t-count">${i + 1} / ${this.steps.length}</span>
      </div>
      <div class="t-prog"><i style="width:${((i + 1) / this.steps.length) * 100}%"></i></div>`;
    this.card.classList.toggle('wide', !!s.wide);
    this.card.innerHTML = `
      ${head}
      <h3>${s.title}</h3>
      <div class="t-body">${s.body || ''}</div>
      ${s.src ? `<p class="t-src">${s.src}</p>` : ''}
      <div class="t-actions">
        ${this.steps.length > 1 ? `<button class="t-link" data-t="skip">${last ? '' : 'Skip tour'}</button>` : '<span></span>'}
        <div>
          ${i > 0 ? '<button class="btn sm" data-t="back">Back</button>' : ''}
          <button class="btn sm primary" data-t="next">${last ? (this.steps.length > 1 ? 'Start exploring' : 'Got it') : 'Next'}</button>
        </div>
      </div>`;
    this.marksBuilt = false;
    this.marks.innerHTML = '';
  }

  find(s) {
    const sels = Array.isArray(s.target) ? s.target : [s.target];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  place() {
    const s = this.steps[this.i];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let r = null;
    if (s.target) {
      const el = this.find(s);
      if (el) {
        if (s.scroll && !this.scrolled) {
          el.scrollIntoView({ block: 'center' });
          this.scrolled = true;
        }
        r = el.getBoundingClientRect();
      } else if (performance.now() - this.waitFrom < 2500) {
        return; // page still mounting
      }
    }
    if (s.marks && r && !this.marksBuilt) this.buildMarks(s);
    if (this.marksBuilt) this.placeMarks();
    this.runDemo(s);

    const pad = 6;
    const rects = [];
    if (r) rects.push(r);
    (s.also || []).forEach((spec) => {
      const els = spec.all ? [...document.querySelectorAll(spec.all)] : [document.querySelector(spec)].filter(Boolean);
      const bs = els.map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height);
      if (!bs.length) return;
      const left = Math.min(...bs.map((b) => b.left)), top = Math.min(...bs.map((b) => b.top));
      const right = Math.max(...bs.map((b) => b.right)), bottom = Math.max(...bs.map((b) => b.bottom));
      rects.push({ left, top, width: right - left, height: bottom - top });
    });
    this.shade(rects.map((b) => ({ x: b.left - pad, y: b.top - pad, w: b.width + pad * 2, h: b.height + pad * 2 })), vw, vh);
    const cw = this.card.offsetWidth;
    const ch = this.card.offsetHeight;
    let x;
    let y;
    const gap = 16;
    if (!r) {
      x = (vw - cw) / 2;
      y = (vh - ch) / 2;
    } else if (s.place === 'center') {
      x = (vw - cw) / 2;
      y = (vh - ch) / 2;
    } else if (s.place === 'right') {
      x = r.right + gap;
      y = r.top + 40;
    } else if (s.place === 'left') {
      x = r.left - cw - gap;
      y = r.top + 40;
    } else {
      x = r.left + 12;
      y = r.bottom + gap;
    }
    x = Math.max(12, Math.min(x, vw - cw - 12));
    y = Math.max(12, Math.min(y, vh - ch - 12));
    this.card.style.transform = `translate(${x}px, ${y}px)`;
  }

  // Run the step's live demo once the spotlight has arrived; undo it when the step stops wanting it.
  runDemo(s) {
    const want = s.demo || null;
    if (this.demo && this.demo !== want) { this.demo.off(); this.demo = null; }
    if (want && !this.demo && performance.now() - this.waitFrom > 550 && want.on()) this.demo = want;
  }

  // Ease every hole towards its target each frame. New holes grow out of the first one.
  shade(target, vw, vh) {
    const centre = { x: vw / 2, y: vh / 2, w: 0, h: 0 };
    if (!target.length) target = [centre];
    while (this.cur.length < target.length) this.cur.push({ ...(this.cur[0] || centre) });
    if (this.cur.length > target.length) this.cur.length = target.length;
    const now = performance.now();
    const k = 1 - Math.exp(-Math.min(200, now - (this.lastT || now)) / 70);
    this.lastT = now;
    this.cur.forEach((c, n) => {
      const t = target[n];
      ['x', 'y', 'w', 'h'].forEach((p) => { c[p] += (t[p] - c[p]) * k; if (Math.abs(t[p] - c[p]) < 0.3) c[p] = t[p]; });
    });
    const rect = (c, extra) => `<rect x="${c.x}" y="${c.y}" width="${Math.max(0, c.w)}" height="${Math.max(0, c.h)}" rx="10" ${extra}/>`;
    this.holes.innerHTML = this.cur.map((c) => rect(c, 'fill="#000"')).join('');
    this.rings.innerHTML = this.cur.filter((c) => c.w > 1).map((c) => rect(c, 'class="tour-ring"')).join('');
  }

  buildMarks(s) {
    this.items = s.marks.map((m) => ({ ...m, el: document.querySelector(m.sel) })).filter((m) => m.el);
    this.marks.innerHTML = this.items.map((_, n) => `<span class="t-mark">${n + 1}</span>`).join('');
    this.card.querySelector('.t-body').innerHTML = `${s.body || ''}<ol class="t-list ${s.listClass || ''}">${this.items.map((m) => `<li>${m.text()}</li>`).join('')}</ol>${s.after || ''}`;
    this.marksBuilt = true;
  }

  placeMarks() {
    const nodes = this.marks.children;
    this.items.forEach((m, n) => {
      if (!m.el.isConnected) m.el = document.querySelector(m.sel) || m.el;
      const r = m.el.getBoundingClientRect();
      const node = nodes[n];
      if (!node) return;
      // badge centre: top-left corner by default, or beside / below the element
      let x = r.left - 8;
      let y = r.top - 8;
      if (m.at === 'right') { x = r.right + 13; y = r.top + r.height / 2; }
      if (m.at === 'left') { x = r.left - 13; y = r.top + r.height / 2; }
      if (m.at === 'below') { x = r.left + 9; y = r.bottom + 12; }
      x = Math.max(11, Math.min(x, window.innerWidth - 11));
      node.style.transform = `translate(${x - 9}px, ${y - 9}px)`;
    });
  }

  close(markSeen) {
    cancelAnimationFrame(this.raf);
    this.demo?.off();
    this.demo = null;
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
    if (markSeen) {
      try { localStorage.setItem(SEEN, '1'); } catch { /* ignore */ }
    }
    if (active === this) active = null;
  }
}
