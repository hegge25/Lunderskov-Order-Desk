// Generated documents (C5, E8; a budget version for the web configurator): the part list, from the
// PVM part view, and a standard drawing with the main dimensions, drawn from the configured values.
import { h, esc, num } from '../format.js';
import { INLET_ANGLE } from '../config/pvm.js';

const POLAR = (cx, cy, r, deg) => {
  // plan view: 0° at the bottom (front), 90° to the right, the plant side
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy + r * Math.cos(a)];
};

export function drawingSvg(design, meta = {}) {
  const v = design.values;
  const W = 820;
  const Hh = 560;
  // elevation: true vertical scale, widened horizontally so the details stay readable
  const top = 46;
  const ground = 480;
  const sy = (ground - top - 20) / Math.max(v.H, 10);
  const halfW = Math.max(26, (v.D / 2) * sy);
  const cx = 230;
  const y = (z) => ground - z * sy;
  const out = [];
  const o = (s) => out.push(s);
  const dim = (x1, y1, x2, y2, label, side = 'left') => {
    o(`<line class="dim" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-start="url(#ar)" marker-end="url(#ar)"/>`);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (x1 === x2) o(`<text class="dimt" transform="translate(${mx + (side === 'left' ? -6 : 6)},${my}) rotate(-90)" text-anchor="middle">${label}</text>`);
    else o(`<text class="dimt" x="${mx}" y="${my - 5}" text-anchor="middle">${label}</text>`);
  };
  const note = (x, y0, tx, ty, text, anchor = 'start') => {
    o(`<polyline class="lead" points="${x},${y0} ${tx},${ty} ${tx + (anchor === 'start' ? 6 : -6)},${ty}"/><circle class="leadDot" cx="${x}" cy="${y0}" r="2"/>`);
    o(`<text class="note" x="${tx + (anchor === 'start' ? 9 : -9)}" y="${ty + 3.5}" text-anchor="${anchor}">${esc(text)}</text>`);
  };

  // ground and foundation
  o(`<line class="ground" x1="${cx - 150}" y1="${ground}" x2="${cx + 170}" y2="${ground}"/>`);
  for (let x = cx - 150; x < cx + 170; x += 9) o(`<line class="hatch" x1="${x}" y1="${ground}" x2="${x - 7}" y2="${ground + 7}"/>`);
  o(`<rect class="found" x="${cx - halfW - 12}" y="${ground - 5}" width="${(halfW + 12) * 2}" height="5"/>`);
  // guy wires
  v.guyLevels.forEach((z) => {
    o(`<line class="wire" x1="${cx - halfW}" y1="${y(z)}" x2="${cx - halfW - 110}" y2="${ground}"/>`);
    o(`<line class="wire" x1="${cx + halfW}" y1="${y(z)}" x2="${cx + halfW + 110}" y2="${ground}"/>`);
  });
  // shell, liners (hidden), insulation band at the top
  o(`<rect class="shell" x="${cx - halfW}" y="${y(v.H)}" width="${halfW * 2}" height="${v.H * sy}"/>`);
  const inner = halfW * (v.Renc / v.Ro);
  o(`<line class="hidden" x1="${cx - inner}" y1="${y(v.H)}" x2="${cx - inner}" y2="${ground}"/><line class="hidden" x1="${cx + inner}" y1="${y(v.H)}" x2="${cx + inner}" y2="${ground}"/>`);
  if (v.aviation) for (let z = v.H - 6; z > v.H - 18; z -= 4) o(`<rect class="band" x="${cx - halfW}" y="${y(z)}" width="${halfW * 2}" height="${2 * sy}"/>`);
  // inlet at 90°, towards the plant on the right
  const ih = v.inlet.height;
  const is = Math.max(8, (v.inlet.size / 1000) * sy * 2.2);
  o(`<rect class="part" x="${cx + halfW}" y="${y(ih) - is / 2}" width="26" height="${is}"/>`);
  o(`<text class="tiny" x="${cx + halfW + 30}" y="${y(ih) + 3}">to plant</text>`);
  // cleaning door: on the face at 0°, hidden at 180°, at the edge at 90° / 270°
  const dr = Math.max(5, (v.door.dia / 2000) * sy * 2.2);
  const dx = { 0: cx, 180: cx, 90: cx + halfW - dr, 270: cx - halfW + dr }[v.door.angle] ?? cx;
  o(`<circle class="${v.door.angle === 180 ? 'hidden' : 'part'}" cx="${dx}" cy="${y(v.door.height)}" r="${dr}"/>`);
  // ladder
  v.ladders.forEach((l) => {
    const side = l.angle === 270 ? -1 : l.angle === 90 ? 1 : 0;
    const lx = side ? cx + side * (halfW + 6) : cx + halfW * 0.45;
    const cls = l.angle === 180 ? 'hidden' : 'lad';
    o(`<line class="${cls}" x1="${lx - 3}" y1="${y(0.3)}" x2="${lx - 3}" y2="${y(l.top)}"/><line class="${cls}" x1="${lx + 3}" y1="${y(0.3)}" x2="${lx + 3}" y2="${y(l.top)}"/>`);
    for (let z = 1; z < l.top; z += Math.max(1, 3 / sy)) o(`<line class="${cls} rung" x1="${lx - 3}" y1="${y(z)}" x2="${lx + 3}" y2="${y(z)}"/>`);
    if (l.cage) o(`<rect class="${cls} cage" x="${lx - 7}" y="${y(l.cage[1])}" width="14" height="${(l.cage[1] - l.cage[0]) * sy}"/>`);
  });
  // platform
  v.platforms.forEach((pl) => {
    const pw = Math.max(12, pl.width * sy * 1.6);
    const py = y(pl.elev);
    o(`<rect class="plat" x="${cx - halfW - pw}" y="${py}" width="${(halfW + pw) * 2}" height="3"/>`);
    o(`<line class="rail" x1="${cx - halfW - pw}" y1="${py}" x2="${cx - halfW - pw}" y2="${py - 1.5 * sy * 1.6}"/><line class="rail" x1="${cx + halfW + pw}" y1="${py}" x2="${cx + halfW + pw}" y2="${py - 1.5 * sy * 1.6}"/>`);
  });
  // dimensions
  dim(cx - halfW - 60, ground, cx - halfW - 60, y(v.H), `H = ${v.H} m`);
  o(`<line class="ext" x1="${cx - halfW - 66}" y1="${y(v.H)}" x2="${cx - halfW}" y2="${y(v.H)}"/>`);
  dim(cx - halfW, y(v.H) - 16, cx + halfW, y(v.H) - 16, `Ø ${num(v.D, 2)} m`);
  o(`<line class="ext" x1="${cx - halfW}" y1="${y(v.H) - 22}" x2="${cx - halfW}" y2="${y(v.H)}"/><line class="ext" x1="${cx + halfW}" y1="${y(v.H) - 22}" x2="${cx + halfW}" y2="${y(v.H)}"/>`);
  dim(cx + halfW + 70, ground, cx + halfW + 70, y(ih), `h ${num(ih, 1)}`, 'right');
  // notes
  let ny = y(v.H) + 18;
  const step = Math.max(22, Math.min(36, (ground - 60 - ny) / 6));
  const rx = cx + halfW + 96;
  note(cx + halfW, y(v.H * 0.85), rx, ny, `Shell ${v.shellMat}, t = ${Math.round(v.tShell * 1000)} mm`); ny += step;
  note(cx + inner, y(v.H * 0.7), rx, ny, `${v.N} × liner Ø ${num(v.d, 2)} m, ${v.linerMat}`); ny += step;
  note(cx + (halfW + inner) / 2, y(v.H * 0.55), rx, ny, `${v.insType}, ${Math.round(v.tIns * 1000)} mm`); ny += step;
  v.platforms.forEach((pl) => { note(cx + halfW + 8, y(pl.elev), rx, ny, `${pl.type} +${num(pl.elev, 1)} m, ${pl.arc}°, w ${pl.width} m`); ny += step; });
  v.ladders.forEach((l) => { note(l.angle === 270 ? cx - halfW - 6 : cx + halfW * 0.45, y(l.top * 0.45), rx, ny, `${l.type}, ${l.steps} steps, ${l.angle}°`); ny += step; });
  if (v.guyLevels.length) { note(cx + halfW + 40, y(v.guyLevels[0]) + 40 * (v.guyLevels[0] * sy) / 110, rx, ny, `${v.guyLevels.length * 3} wire supports Ø ${v.wireDia} mm at ${v.guyLevels.join(', ')} m`); ny += step; }
  note(dx, y(v.door.height), rx, Math.max(ny, y(v.door.height) - 30), `Cleaning door Ø ${v.door.dia}, R ${v.door.height} m, ${v.door.angle}°`);

  // plan view
  const px = 640;
  const py = 150;
  const pr = 70;
  const s = pr / v.Ro;
  o(`<text class="vt" x="${px}" y="${py - pr - 34}" text-anchor="middle">PLAN</text>`);
  o(`<circle class="shell" cx="${px}" cy="${py}" r="${pr}"/><circle class="ins" cx="${px}" cy="${py}" r="${v.Renc * s + v.tIns * s}"/><circle class="thin" cx="${px}" cy="${py}" r="${v.Renc * s}"/>`);
  const rl = (v.d / 2) * s;
  const ENC = [0, 1, 2, 2.155, 2.414][v.N] || 1;
  const cr = (ENC - 1) * (v.d / 2 + v.tLiner) * s;
  for (let i = 0; i < v.N; i++) {
    const a = v.N === 1 ? 0 : (360 / v.N) * i + (v.N === 2 ? 90 : v.N === 4 ? 45 : 0);
    const [lx, ly] = POLAR(px, py, cr, a);
    o(`<circle class="liner" cx="${lx}" cy="${ly}" r="${rl}"/>`);
  }
  [0, 90, 180, 270].forEach((a) => {
    const [x1, y1] = POLAR(px, py, pr + 6, a);
    const [x2, y2] = POLAR(px, py, pr + 22, a);
    const [tx, ty] = POLAR(px, py, pr + 32, a);
    o(`<line class="axis" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="tiny" x="${tx}" y="${ty + 3}" text-anchor="middle">${a}°</text>`);
  });
  v.platforms.forEach((pl) => {
    const r1 = pr + 4;
    const r2 = pr + 4 + Math.max(8, pl.width * s * 0.6);
    const a0 = pl.angle - pl.arc / 2;
    const a1 = pl.angle + pl.arc / 2;
    if (pl.arc >= 360) o(`<circle class="platp" cx="${px}" cy="${py}" r="${(r1 + r2) / 2}" stroke-width="${r2 - r1}"/>`);
    else {
      const p = (r, a) => POLAR(px, py, r, a).join(',');
      const large = pl.arc > 180 ? 1 : 0;
      o(`<path class="platf" d="M${p(r1, a0)} L${p(r2, a0)} A${r2},${r2} 0 ${large} 0 ${p(r2, a1)} L${p(r1, a1)} A${r1},${r1} 0 ${large} 1 ${p(r1, a0)} Z"/>`);
    }
  });
  const mark = (a, label, cls) => {
    const [x, yy] = POLAR(px, py, pr, a);
    o(`<rect class="${cls}" x="${x - 5}" y="${yy - 5}" width="10" height="10" transform="rotate(${-a} ${x} ${yy})"/>`);
    const [tx, ty] = POLAR(px, py, pr - 16, a);
    o(`<text class="tiny b" x="${tx}" y="${ty + 3}" text-anchor="middle">${label}</text>`);
  };
  mark(INLET_ANGLE, 'IN', 'mk-in');
  mark(v.door.angle, 'CD', 'mk-door');
  v.ladders.forEach((l) => mark(l.angle, 'L', 'mk-lad'));
  o(`<text class="tiny" x="${px}" y="${py + pr + 52}" text-anchor="middle">IN gas inlet · CD cleaning door · L ladder</text>`);

  // title block
  const tb = [520, 392, 280, 136];
  o(`<rect class="tb" x="${tb[0]}" y="${tb[1]}" width="${tb[2]}" height="${tb[3]}"/>`);
  o(`<line class="tb" x1="${tb[0]}" y1="${tb[1] + 34}" x2="${tb[0] + tb[2]}" y2="${tb[1] + 34}"/>`);
  o(`<text class="tbh" x="${tb[0] + 10}" y="${tb[1] + 22}">LUNDERSKOV CHIMNEYS</text>`);
  const rows = [
    ['Drawing', meta.budget ? 'Standard drawing, budget' : 'Main dimensions'],
    ['Order', meta.id || '—'],
    ['Customer', meta.customer || '—'],
    ['Type', `${design.cls} · H ${v.H} m · ${v.N} × Ø ${num(v.d, 2)} m`],
    ['Made by', meta.budget ? 'Web configurator' : design.cls === 'CTO' ? 'Order configurator (C5)' : 'Design team (E8)'],
    ['Date', new Date().toLocaleDateString('en-GB')],
  ];
  rows.forEach(([k, val], i) => {
    o(`<text class="tbk" x="${tb[0] + 10}" y="${tb[1] + 52 + i * 14}">${k}</text><text class="tbv" x="${tb[0] + 74}" y="${tb[1] + 52 + i * 14}">${esc(val)}</text>`);
  });
  o(`<text class="tiny" x="${tb[0] + tb[2]}" y="${tb[1] + tb[3] + 14}" text-anchor="end">Elevation from 0°. Height to scale, widths enlarged. ${meta.budget ? 'Not for construction.' : ''}</text>`);

  return `<svg class="drawing" viewBox="0 0 ${W} ${Hh}" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Sans, Arial, sans-serif">
    <defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,2 L10,5 L0,8 z" fill="#20262d"/></marker></defs>
    <style>
      .shell{fill:#f3f5f7;stroke:#20262d;stroke-width:1.4}.thin{fill:none;stroke:#20262d;stroke-width:.7}
      .ins{fill:#fff3e6;stroke:#c98a4b;stroke-width:.6}.liner{fill:#fff;stroke:#20262d;stroke-width:1}
      .hidden{fill:none;stroke:#7c8590;stroke-width:.8;stroke-dasharray:4 3}.part{fill:#fff;stroke:#20262d;stroke-width:1.1}
      .band{fill:#e5484d;opacity:.8}.ground{stroke:#20262d;stroke-width:1.4}.hatch{stroke:#7c8590;stroke-width:.6}
      .found{fill:#c3c9d1;stroke:#20262d;stroke-width:.8}.wire{stroke:#5b6570;stroke-width:.7}
      .lad{stroke:#20262d;stroke-width:.8;fill:none}.rung{stroke-width:.5}.cage{stroke-width:.6}
      .plat{fill:#20262d}.rail{stroke:#20262d;stroke-width:.9}.platf{fill:#f76707;opacity:.25;stroke:#f76707;stroke-width:1}
      .platp{fill:none;stroke:#f76707;opacity:.3}.axis{stroke:#9aa3ad;stroke-width:.7}
      .mk-in{fill:#20262d}.mk-door{fill:#fff;stroke:#20262d;stroke-width:1.2}.mk-lad{fill:#f76707}
      .dim{stroke:#20262d;stroke-width:.7}.ext{stroke:#9aa3ad;stroke-width:.5}.dimt{font-size:11px;font-weight:600;fill:#20262d}
      .lead{fill:none;stroke:#5b6570;stroke-width:.6}.leadDot{fill:#5b6570}.note{font-size:10.5px;fill:#20262d}
      .tiny{font-size:9px;fill:#5b6570}.b{font-weight:700;fill:#20262d}.vt{font-size:11px;font-weight:700;letter-spacing:.08em;fill:#20262d}
      .tb{fill:none;stroke:#20262d;stroke-width:1}.tbh{font-size:13px;font-weight:700;letter-spacing:.06em;fill:#20262d}
      .tbk{font-size:9.5px;fill:#7c8590}.tbv{font-size:10px;fill:#20262d;font-weight:500}
    </style>
    <rect x="1" y="1" width="${W - 2}" height="${Hh - 2}" fill="#fff" stroke="#20262d" stroke-width="1.5"/>
    <text class="vt" x="${cx}" y="26" text-anchor="middle">ELEVATION</text>
    ${out.join('\n')}
  </svg>`;
}

function partsTable(design) {
  let last = '';
  return h`<table class="bom">
    <thead><tr><th>Part</th><th>Sub-part</th><th>Specification</th><th class="r">Qty</th></tr></thead>
    <tbody>${design.bom.map((r) => {
      const first = r.part !== last;
      last = r.part;
      return h`<tr class="${first ? 'first' : ''}"><td>${first ? `<b>${esc(r.part)}</b>` : ''}</td><td>${esc(r.sub)}</td><td>${esc(r.spec)}</td><td class="r mono">${r.qty} <small>${esc(r.unit)}</small></td></tr>`;
    })}</tbody>
  </table>`;
}

const download = (name, text, type) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// Modal with the part list and the drawing.
export function openDocs(kind, design, meta = {}) {
  const root = document.createElement('div');
  root.className = 'modal';
  const render = (k) => {
    root.innerHTML = h`
      <div class="modal-card wide" role="dialog">
        <header>
          <div class="seg">${[['parts', 'Part list'], ['drawing', 'Drawing']].map(([key, l]) => `<button class="${key === k ? 'on' : ''}" data-tab="${key}">${l}</button>`)}</div>
          <span class="m-sub">${esc(meta.id || '')} · ${meta.budget ? 'budget, from the web configurator' : design.cls === 'CTO' ? 'generated by the order configurator, C5' : 'proposal for the design team, E8'}</span>
          <button class="btn sm" data-dl>Download ${k === 'parts' ? '.csv' : '.svg'}</button>
          <button class="x" data-close>Close</button>
        </header>
        <div class="m-body">${k === 'parts'
          ? h`${partsTable(design)}<p class="qnote">Parts, sub-parts and cardinalities follow the part view of the PVM (Appendix 1).</p>`
          : drawingSvg(design, meta)}</div>
      </div>`;
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => render(b.dataset.tab)));
    root.querySelector('[data-close]').addEventListener('click', close);
    root.querySelector('[data-dl]').addEventListener('click', () => {
      if (k === 'parts') {
        const csv = ['Part;Sub-part;Specification;Qty;Unit', ...design.bom.map((r) => [r.part, r.sub, r.spec, r.qty, r.unit].join(';'))].join('\n');
        download(`${meta.id || 'chimney'}-part-list.csv`, csv, 'text/csv');
      } else download(`${meta.id || 'chimney'}-drawing.svg`, drawingSvg(design, meta), 'image/svg+xml');
    });
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    window.removeEventListener('keydown', onKey);
    root.remove();
  }
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  window.addEventListener('keydown', onKey);
  render(kind);
  document.body.appendChild(root);
  return close;
}
