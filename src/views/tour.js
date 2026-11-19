// Guided tour: a spotlight on one part of the screen at a time, with a card explaining it.
// Runs on the first visit; "Tour" in the top bar replays it, "?" on the strip opens the strip explainer.

const SEEN = 'lod.tourSeen.v1';
const DEMO = 'LC-2026-0412'; // the order with missing ladders and platforms

const txt = (sel) => document.querySelector(sel)?.textContent.trim() || '';

// The progress strip, number by number. Text is filled in from what is on screen.
const STRIP_MARKS = [
  { sel: '.strip-sum [data-variant]', text: () => '<b>TO-BE / AS-IS</b> switches between the proposed process and today\'s. Same order, same enquiry date: only the process changes.' },
  { sel: '.sum-main b', text: () => `<b>${txt('.sum-main b')}</b> is the planned delivery: when the chimney is installed if the remaining steps run to plan. A late step pushes it back.` },
  { sel: '.sum-sub span:first-child', text: () => `<b>${txt('.sum-sub span:first-child')}</b> from the enquiry to the installed chimney, including about 8 days waiting for the customer's decision. Weekends are not counted.` },
  { sel: '.delta', text: () => `<b>${txt('.delta')}</b>: the same order run through the other process.` },
  { sel: '.stage.active .st-when, .stage.late .st-when', at: 'right', text: () => 'Each stage shows when it should be finished (<b>by …</b>), or <b>Done</b>.' },
  { sel: '.stage.active .st-dur, .stage.late .st-dur', at: 'right', text: () => 'Its length in working days. <b>late</b> means the current step overran: it is stretched to today and everything after it moves.' },
  { sel: '.g-track', at: 'below', text: () => 'Every process step, to scale. Grey is done, orange in progress, red late. <b>Hatched</b> steps are waiting on others: the customer or the authorities. Hover a segment to see what it is.' },
  { sel: '.g-today em', at: 'right', text: () => '<b>Today.</b>' },
  { sel: '.g-other em', at: 'left', text: () => `<b>${txt('.g-other em')}</b>: when the other process would deliver this order.` },
  { sel: '.strip-act .btn', text: () => 'Moves the order to its next stage. <b>Release to design</b> stays blocked while information is missing or conflicting.' },
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
    body: `<p>A prototype of how Lunderskov Chimneys could run an order with product configuration, from enquiry to installed chimney.</p>
      <p>This takes about two minutes. All numbers, rules and orders are dummy data. Afterwards, change anything you like: <b>Reset demo data</b> puts it back.</p>`,
  },
  {
    route: '#/orders',
    target: '.kpis',
    place: 'bottom',
    title: 'The order board',
    body: '<p>Every order runs through the configurator. The board shows how many are <b>configure-to-order (CTO)</b>, inside the product range, and the lead time compared with today\'s process.</p>',
  },
  {
    route: '#/orders',
    target: `tr[data-id="${DEMO}"]`,
    place: 'bottom',
    title: 'One order',
    body: '<p>The configurator sets the type automatically: <b>CTO</b> if every requirement is inside the product range, <b>ETO</b> (engineer-to-order) if not. This order is late because the specification is incomplete. Let\'s open it.</p>',
  },
  {
    route: `#/order/${DEMO}`,
    target: '[data-config]',
    place: 'right',
    title: 'The specification form',
    body: `<p>The fields are the <b>customer view of the product variant master</b>. Each slider's green band is the interval the product range covers.</p>
      <p><b>Try it:</b> drag <i>Flow rate</i> past 50. The order turns ETO and the reason appears on the right.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    target: ['[data-field="ladders"]', '[data-group="ladder"]'],
    scroll: true,
    place: 'right',
    title: 'Missing information',
    body: `<p>The customer hasn't said whether they want ladders or platforms, which in the case study designers only find out late. The model shows them as orange ghosts, and <b>Release to design</b> is blocked.</p>
      <p><b>Try it:</b> click <i>Add ladder</i>.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    target: '[data-viewer]',
    place: 'left',
    title: 'The chimney, built from the configuration',
    body: `<p>Height, liners, insulation, fans, filters and guy wires all follow from the rules, and the model rebuilds when anything changes.</p>
      <p><b>Cutaway</b> (C) shows the insulation and the flue gas cooling on its way up. Also try <b>Wind</b> (W) and the camera views (1–4). Hover a part for its specs; click a label to jump to its field.</p>`,
  },
  {
    route: `#/order/${DEMO}`,
    target: '[data-derived]',
    place: 'left',
    title: 'What the configurator worked out',
    body: `<p>The configurator does the work of the five designers in the case: <b>A</b> capacity, <b>B</b> thermal and material, <b>C</b> emission, <b>D</b> structure, <b>E</b> details. <b>Auto</b> means generated; <b>Designer</b> means an engineer is needed.</p>
      <p>Below: the price estimate and a <b>rule log</b> explaining every decision.</p>`,
  },
  { ...STRIP_STEP, route: `#/order/${DEMO}` },
  {
    route: `#/order/${DEMO}`,
    title: 'Over to you',
    body: `<ul>
      <li>Set <i>Installation site</i> to <b>Other</b>: the order becomes ETO.</li>
      <li>Put the <i>cleaning door</i> at <b>90°</b>: it collides with the inlet.</li>
      <li>Switch the strip to <b>AS-IS</b> and watch the delivery date move.</li>
      <li>Start a <b>New enquiry</b> from the order board.</li>
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
