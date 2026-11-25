// Guided tour: a spotlight on one part of the screen at a time, with a card explaining it.
// Runs on the first visit; "Tour" in the top bar replays it, "?" on the strip opens the strip explainer.

const SEEN = 'lod.tourSeen.v2';
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

const STRIP_STEP = {
  route: null,
  target: '[data-strip]',
  place: 'bottom',
  wide: true,
  title: 'Reading the progress strip',
  marks: STRIP_MARKS,
};

const MAIN = [
  {
    route: '#/orders',
    title: 'Lunderskov Order Desk',
    body: `<p>A prototype of the TO-BE process in our report: one configurator built on the PVM, used by customers on the web (quotation scenario 2) and by sales and design inside the company.</p>
      <p>This takes about two minutes. Numbers, rules and orders are dummy data; the fields, options and process steps follow the case and the report. Afterwards, change anything you like: <b>Reset demo data</b> puts it back.</p>`,
  },
  {
    route: '#/orders',
    target: '.kpis',
    place: 'bottom',
    title: 'Measured against the requirements',
    body: '<p>The board tracks the requirements from the report: <b>R1</b> quotation within 1–2 days, <b>R2</b> design within 2 days for CTO and 2 weeks for ETO, <b>R3</b> a complete specification before the quotation, and <b>R7</b> orders configured online. The AS-IS figures are the case\'s.</p>',
  },
  {
    route: '#/orders',
    target: `tr[data-id="${DEMO}"]`,
    place: 'bottom',
    title: 'One order',
    body: '<p>This enquiry came in by phone. The configurator sets the type: <b>CTO</b> if every attribute is inside the PVM intervals, <b>ETO</b> if not. It is late because the binding quotation is blocked: the specification is incomplete. Let\'s open it.</p>',
  },
  {
    route: `#/order/${DEMO}`,
    target: '[data-config]',
    place: 'right',
    title: 'The PVM, linked to the process',
    body: `<p>The fields are the <b>customer view of the PVM</b>; each slider's green band is the interval. The chips under each field are the <b>PVM–process link</b>: the AS-IS steps (Appendix 3) and TO-BE steps that use the attribute.</p>
      <p><b>Try it:</b> hover the title <i>Flow rate</i> and watch the strip: one step in TO-BE, 8 steps spread over AS-IS.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    target: ['[data-field="ladders"]', '[data-group="ladder"]'],
    scroll: true,
    place: 'right',
    title: 'Complete before the quotation (R3)',
    body: `<p>In the case, designer E "most often" misses the ladder and platform and gathers them in step 16, after the main dimensioning. Here they are required before the quotation goes out: the model shows them as orange ghosts, and <b>Send binding quotation</b> is blocked.</p>
      <p><b>Try it:</b> click <i>Add ladder</i>.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    target: '[data-viewer]',
    place: 'left',
    title: 'The chimney, built from the configuration',
    body: `<p>Height, liners, insulation, fans, filters and wire supports all follow from the rules, and the model rebuilds when anything changes.</p>
      <p><b>Cutaway</b> (C) shows the insulation and the flue gas cooling on its way up. Also try <b>Wind</b> (W) and the camera views (1–4). Hover a part for its specs; click a label to jump to its field.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    target: '[data-derived]',
    place: 'left',
    title: 'The TO-BE design process',
    body: `<p>A CTO order is designed by the order configurator in one pass, <b>C2–C5</b>, in the re-sequenced order of the process DSM: requirements and emission, then the material, then H, d, N and the heat loss solved together. C5 generates the <b>part list</b> and <b>drawing</b>; a designer checks it (C6).</p>
      <p>An ETO order shows <b>E2–E8</b> with the people who own them. The rule log below explains every decision.</p>`,
  },
  { ...STRIP_STEP, route: `#/order/${DEMO}` },
  {
    route: '#/web',
    target: '.web-side',
    place: 'left',
    title: 'Scenario 2: the customer configures online',
    body: `<p>The same PVM and rules, for customers. They get a <b>budget price</b> and a <b>standard drawing</b> at once (R7). <i>Request binding quotation</i> drops the enquiry into the Order Desk, where the salesperson verifies the local requirements, wind profile and installation before the binding quotation.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    title: 'Over to you',
    body: `<ul>
      <li>Set <i>Location</i> to <b>Other</b>: the order becomes ETO and the right column switches to E2–E8.</li>
      <li>Put the <i>cleaning door</i> at <b>90°</b>: it collides with the gas inlet.</li>
      <li>Hover a field's title and compare the TO-BE and AS-IS bars.</li>
      <li>Open the <b>drawing</b> in C5.</li>
      <li>Request a quotation in the <b>web configurator</b> and find it on the board.</li>
    </ul>
    <p><b>Tour</b> in the top bar replays this, and <b>?</b> on the strip explains its numbers.</p>`,
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
    this.root.innerHTML = '<div class="tour-spot"></div><div class="tour-marks"></div><div class="tour-card" role="dialog"></div>';
    document.body.appendChild(this.root);
    this.spot = this.root.querySelector('.tour-spot');
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
    const counter = this.steps.length > 1 ? `<span class="t-count">${i + 1} / ${this.steps.length}</span>` : '';
    this.card.classList.toggle('wide', !!s.wide);
    this.card.innerHTML = `
      ${counter}
      <h3>${s.title}</h3>
      <div class="t-body">${s.body || ''}</div>
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

    const pad = 6;
    if (r) {
      Object.assign(this.spot.style, {
        left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`, borderRadius: '10px',
      });
    } else {
      Object.assign(this.spot.style, { left: `${vw / 2}px`, top: `${vh / 2}px`, width: '0px', height: '0px' });
    }
    const cw = this.card.offsetWidth;
    const ch = this.card.offsetHeight;
    let x;
    let y;
    const gap = 16;
    if (!r) {
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

  buildMarks(s) {
    this.items = s.marks.map((m) => ({ ...m, el: document.querySelector(m.sel) })).filter((m) => m.el);
    this.marks.innerHTML = this.items.map((_, n) => `<span class="t-mark">${n + 1}</span>`).join('');
    this.card.querySelector('.t-body').innerHTML = `<ol class="t-list">${this.items.map((m) => `<li>${m.text()}</li>`).join('')}</ol>`;
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
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
    if (markSeen) {
      try { localStorage.setItem(SEEN, '1'); } catch { /* ignore */ }
    }
    if (active === this) active = null;
  }
}
