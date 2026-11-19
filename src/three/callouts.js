// Screen-space callouts: labels stacked in columns beside the chimney, each with a
// leader line ending in a dot on the feature. Laid out again every frame.
import * as THREE from 'three';

const SVG = 'http://www.w3.org/2000/svg';
const GAP = 46;          // from the chimney silhouette to the label column [px]
const SPACING = 6;       // between stacked labels [px]
const TOP = 54;          // keep clear of the toolbar
const BOTTOM = 58;       // keep clear of the footer chips

export class Callouts {
  constructor(container, { onHover, onClick } = {}) {
    this.root = document.createElement('div');
    this.root.className = 'callouts';
    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.classList.add('leaders');
    this.root.appendChild(this.svg);
    container.appendChild(this.root);
    this.items = new Map();
    this.onHover = onHover;
    this.onClick = onClick;
    this.v = new THREE.Vector3();
    this.a = new THREE.Vector3();
    this.right = new THREE.Vector3();
  }

  // specs: [{ id, html, obj (Object3D anchor), kind, part, maxDist, cls }]
  set(specs) {
    const seen = new Set();
    for (const s of specs) {
      seen.add(s.id);
      let it = this.items.get(s.id);
      if (!it) {
        const el = document.createElement('div');
        el.addEventListener('mouseenter', () => this.onHover?.(it.part));
        el.addEventListener('mouseleave', () => this.onHover?.(null));
        el.addEventListener('click', () => this.onClick?.(it.target, it.part));
        const line = document.createElementNS(SVG, 'polyline');
        const dot = document.createElementNS(SVG, 'circle');
        dot.setAttribute('r', '3.2');
        this.svg.append(line, dot);
        this.root.appendChild(el);
        it = { el, line, dot, x: null, y: null, side: null, html: null };
        this.items.set(s.id, it);
      }
      Object.assign(it, { obj: s.obj, kind: s.kind || 'dim', part: s.part, target: s.target, maxDist: s.maxDist ?? Infinity, slide: s.slide, y0: s.obj.position.y });
      const cls = `callout ${s.cls || ''} ${it.kind}`;
      if (it.el.className !== cls) it.el.className = cls;
      if (it.html !== s.html) {
        it.html = s.html;
        it.el.innerHTML = s.html;
        it.w = null;
      }
    }
    for (const [id, it] of this.items) {
      if (!seen.has(id)) {
        it.el.remove();
        it.line.remove();
        it.dot.remove();
        this.items.delete(id);
      }
    }
  }

  update(camera, W, Hpx, toggles, chimney, hot) {
    const cam = camera.position;
    this.right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    const project = (p) => {
      this.v.copy(p).project(camera);
      return { x: (this.v.x * 0.5 + 0.5) * W, y: (-this.v.y * 0.5 + 0.5) * Hpx, z: this.v.z };
    };
    const sides = { L: [], R: [] };

    for (const it of this.items.values()) {
      const k = it.kind;
      let on = k === 'ghost' ? true
        : k === 'cut' ? toggles.cutaway && toggles.dims
        : k === 'context' ? toggles.context
        : toggles.dims;
      if (!it.obj || !it.obj.parent) on = false;
      let s = null;
      if (on) {
        const inView = (q) => q.z >= -1 && q.z <= 1 && q.x > 8 && q.x < W - 8 && q.y > TOP && q.y < Hpx - BOTTOM;
        it.obj.position.y = it.y0;
        it.obj.getWorldPosition(this.a);
        s = project(this.a);
        // Long features: slide the anchor along them until it is in view.
        if (it.slide && !inView(s)) {
          let best = null;
          for (let i = 0; i <= 24; i++) {
            const y = it.slide[0] + ((it.slide[1] - it.slide[0]) * i) / 24;
            it.obj.position.y = y;
            it.obj.getWorldPosition(this.a);
            const q = project(this.a);
            if (inView(q) && (!best || Math.abs(y - it.y0) < Math.abs(best - it.y0))) best = y;
          }
          it.obj.position.y = best ?? it.y0;
          it.obj.getWorldPosition(this.a);
          s = project(this.a);
        }
        on = cam.distanceTo(this.a) < it.maxDist;
        if (s.z < -1 || s.z > 1 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > Hpx + 20) on = false;
      }
      if (!on) {
        it.el.style.display = 'none';
        it.line.style.display = 'none';
        it.dot.style.display = 'none';
        it.x = it.y = null;
        continue;
      }
      // axis of the chimney at the anchor's height, and its half-width on screen
      const ax = project(this.v.set(0, this.a.y, 0));
      const edge = project(this.v.set(0, this.a.y, 0).addScaledVector(this.right, chimney.Ro));
      const half = Math.abs(edge.x - ax.x);
      const dx = s.x - ax.x;
      if (!it.side || Math.abs(dx) > 14) it.side = dx < 0 ? 'L' : 'R';
      it.sx = s.x;
      it.sy = s.y;
      it.colX = it.side === 'L' ? ax.x - half - GAP : ax.x + half + GAP;
      it.occluded = k !== 'cut' && k !== 'context' && occluded(cam, this.a, chimney);
      it.el.style.display = '';
      if (it.w == null) {
        it.w = it.el.offsetWidth;
        it.h = it.el.offsetHeight;
      }
      sides[it.side].push(it);
    }

    for (const [side, list] of Object.entries(sides)) {
      list.sort((p, q) => p.sy - q.sy);
      // stack downwards, then push back up from the bottom edge
      let prev = TOP;
      for (const it of list) {
        it.ty = Math.max(it.sy, prev + it.h / 2);
        prev = it.ty + it.h / 2 + SPACING;
      }
      let next = Hpx - BOTTOM;
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i];
        it.ty = Math.min(it.ty, next - it.h / 2);
        next = it.ty - it.h / 2 - SPACING;
      }
      for (const it of list) {
        let x = side === 'L' ? Math.min(it.colX, it.sx - 36) : Math.max(it.colX, it.sx + 36);
        x = side === 'L' ? Math.max(x, it.w + 10) : Math.min(x, W - it.w - 10);
        it.tx = x;
        const k = it.x == null ? 1 : 0.35;
        it.x = it.x == null ? x : it.x + (x - it.x) * k;
        it.y = it.y == null ? it.ty : it.y + (it.ty - it.y) * k;
        const left = side === 'L' ? it.x - it.w : it.x;
        it.el.style.transform = `translate(${left.toFixed(1)}px, ${(it.y - it.h / 2).toFixed(1)}px)`;
        const ex = side === 'L' ? it.x + 2 : it.x - 2;
        const elbow = side === 'L' ? ex + 10 : ex - 10;
        it.line.setAttribute('points', `${ex},${it.y} ${elbow},${it.y} ${it.sx},${it.sy}`);
        it.dot.setAttribute('cx', it.sx);
        it.dot.setAttribute('cy', it.sy);
        const cls = `${it.kind}${it.occluded ? ' occl' : ''}${hot && hot === it.part ? ' hot' : ''}`;
        it.line.setAttribute('class', cls);
        it.dot.setAttribute('class', cls);
        it.el.classList.toggle('occl', it.occluded);
        it.el.classList.toggle('hot', !!hot && hot === it.part);
        it.line.style.display = '';
        it.dot.style.display = '';
      }
    }
  }

  dispose() {
    this.root.remove();
    this.items.clear();
  }
}

// Is the anchor hidden behind the chimney shell, seen from the camera?
function occluded(cam, p, { Ro, H }) {
  const R = Ro * 0.97;
  const dx = p.x - cam.x;
  const dz = p.z - cam.z;
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return false;
  const b = 2 * (cam.x * dx + cam.z * dz);
  const c = cam.x * cam.x + cam.z * cam.z - R * R;
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return false;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t <= 0 || t >= 0.995) return false;
  const y = cam.y + (p.y - cam.y) * t;
  return y >= 0 && y <= H + 0.4;
}
