import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MaterialBank, shellTexture, insulationTexture, DEG } from './kit.js';
import { buildChimney, linerLayout, plantLayout } from './model.js';
import { Smoke, WindStreaks, Flow } from './effects.js';
import { Callouts } from './callouts.js';

const EXTRA_PARTS = {
  plant: { title: 'Customer process plant', lines: ['Built by others. The chimney is sub-supplied to it.'] },
  person: { title: 'Scale reference', lines: ['Person, 1.8 m'] },
  ghost: { title: 'Missing from the specification', lines: ['The customer has not specified this yet.', 'The binding quotation is blocked until they do (R3).'] },
};
const DISCRETE = new Set(['N', 'harness', 'steps', 'aviation', 'fanCount', 'filterCount', 'laddersMissing', 'platformsMissing', 'steam', 'fanRpm']);
const ANGLES = new Set(['az', 'doorAz']);
const LINER_LOOK = { stainless: 'linerStainless', painted: 'linerCarbon', fiberglass: 'linerFiberglass' };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function lerpParams(a, b, t) {
  const out = {};
  for (const k of Object.keys(b)) {
    const x = a[k];
    const y = b[k];
    if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && typeof y[0] === 'object') {
      // ladders, platforms: tween item by item while the count stays the same
      out[k] = y.map((item, i) => lerpParams(x[i], item, t));
    } else if (typeof x === 'number' && typeof y === 'number' && !DISCRETE.has(k)) {
      if (ANGLES.has(k)) {
        let d = ((y - x + 540) % 360) - 180;
        out[k] = x + d * t;
      } else out[k] = x + (y - x) * t;
    } else out[k] = y;
  }
  return out;
}
const isShown = (o) => {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
};

export class ChimneyViewer {
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = opts;
    this.toggles = { cutaway: false, xray: false, dims: true, smoke: true, wind: false, context: true, ...(opts.toggles || {}) };
    this.preset = 'overview';
    this.pulses = new Map();

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.className = 'gl';
    el.appendChild(r.domElement);
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'labels';
    el.appendChild(this.labelRenderer.domElement);

    const scene = (this.scene = new THREE.Scene());
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    scene.fog = new THREE.Fog(0x1a2027, 200, 900);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 4000);
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.maxPolarAngle = Math.PI * 0.495;
    c.minDistance = 1.5;
    c.maxDistance = 1200;
    c.addEventListener('start', () => {
      this.preset = null;
      this.camAnim = null;
      opts.onPreset?.(null);
    });

    scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x2a2f35, 0.7));
    const sun = (this.sun = new THREE.DirectionalLight(0xfff4e6, 2.4));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x1d242b, roughness: 1, metalness: 0 }),
    );
    ground.position.y = -0.3;
    ground.receiveShadow = true;
    ground.userData.noPick = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(1000, 200, 0x3a4652, 0x2a333c);
    grid.position.y = -0.29;
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    grid.userData.noPick = true;
    scene.add(grid);

    this.mats = new MaterialBank();
    this.textures = {};
    this.modelRoot = new THREE.Group();
    scene.add(this.modelRoot);
    this.smoke = new Smoke();
    this.wind = new WindStreaks();
    this.flow = new Flow();
    scene.add(this.smoke.points, this.wind.mesh, this.flow.group);

    this.callouts = new Callouts(el, {
      onHover: (part) => {
        this.calloutHover = part;
        this.applyHighlight();
        opts.onHover?.(part);
      },
      onClick: (target, part) => opts.onCallout?.(target, part),
    });
    this.tip = document.createElement('div');
    this.tip.className = 'tip';
    el.appendChild(this.tip);
    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseDirty = false;
    r.domElement.addEventListener('pointermove', (e) => {
      const b = r.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      this.mousePx = [e.clientX - b.left, e.clientY - b.top];
      this.mouseDirty = true;
    });
    r.domElement.addEventListener('pointerleave', () => this.setHover(null));
    r.domElement.addEventListener('pointerdown', (e) => { this.downAt = [e.clientX, e.clientY]; });
    r.domElement.addEventListener('pointerup', (e) => {
      if (!this.downAt || Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) > 4) return;
      if (this.hover) opts.onPick?.(this.hover);
    });

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(el);
    this.resize();
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.tmp = new THREE.Vector3();
    r.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setDesign(design) {
    const p = design.params;
    const prevParts = this.parts;
    this.parts = design.parts;
    if (!this.rendered) {
      this.target = p;
      this.rebuild(p, true);
      this.view('overview', false);
      return;
    }
    if (prevParts) {
      const now = performance.now();
      for (const k of Object.keys(design.parts)) {
        if (JSON.stringify(prevParts[k]) !== JSON.stringify(design.parts[k])) this.pulses.set(k, now + 1400);
      }
    }
    this.tween = { from: this.rendered, to: p, t0: performance.now(), dur: 600 };
    this.target = p;
  }

  rebuild(p, final) {
    const M = this.mats;
    const shellKey = `${Math.round(p.H)}|${p.shellLook}|${p.aviation}`;
    if (shellKey !== this.shellKey) {
      this.textures.shell?.dispose();
      this.textures.shell = shellTexture(Math.round(p.H), p.shellLook, !!p.aviation);
      this.shellKey = shellKey;
      const sm = M.std('shell', 'outer', 'painted');
      sm.map = this.textures.shell;
      sm.needsUpdate = true;
    }
    if (p.insType !== this.insKey) {
      this.textures.ins?.dispose();
      this.textures.ins = insulationTexture(p.insType);
      this.insKey = p.insType;
      const im = M.std('insulation', 'body', p.insType, { side: THREE.DoubleSide });
      im.map = this.textures.ins;
      im.needsUpdate = true;
    }
    this.textures.ins.repeat.set(2, Math.max(1, p.H / 3));

    this.modelRoot.traverse((o) => {
      if (o.isCSS2DObject) o.element.remove();
      else if (o.isArrowHelper) o.dispose();
      else if (o.geometry) o.geometry.dispose();
    });
    this.modelRoot.clear();
    const built = buildChimney(p, { mats: M, cut: this.toggles.cutaway, textures: this.textures });
    this.modelRoot.add(built.root);
    this.built = built;
    this.callouts.set(built.callouts);
    M.setLook(M.std('shell', 'outer'), p.shellLook);
    M.setLook(M.std('liners', 'outer'), LINER_LOOK[p.linerLook] || 'linerStainless');

    const liners = linerLayout(p);
    this.smoke.configure(p, liners.map((l) => ({ x: l.x, y: p.H + 0.4, z: l.z, r: p.rLiner })));
    if (final) {
      this.wind.configure(p);
      this.flow.configure(p, liners);
      this.fitLights(p);
    }
    this.rendered = p;
    this.applyVisibility();
    this.applyHighlight();
  }

  fitLights(p) {
    const H = p.H;
    const span = Math.max(30, H * 0.85);
    const dir = new THREE.Vector3(-0.55, 1, 0.7).normalize();
    this.sun.target.position.set(0, H * 0.3, 0);
    this.sun.position.copy(this.sun.target.position).addScaledVector(dir, H * 2.5 + 40);
    const sc = this.sun.shadow.camera;
    sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span;
    sc.near = 1; sc.far = H * 5 + 120;
    sc.updateProjectionMatrix();
  }

  setToggle(name, on) {
    this.toggles[name] = on;
    if (name === 'cutaway') {
      this.rebuild(this.rendered, true);
      return;
    }
    this.applyVisibility();
  }

  applyVisibility() {
    const t = this.toggles;
    this.modelRoot.traverse((o) => {
      const k = o.userData.kind;
      if (!k || o.isCSS2DObject) return;
      if (k === 'dim') o.visible = t.dims;
      else if (k === 'context') o.visible = t.context;
      else if (k === 'wind') o.visible = t.wind;
    });
    this.smoke.points.visible = t.smoke;
    this.wind.mesh.visible = t.wind;
    this.flow.group.visible = t.cutaway;
    for (const [part, op] of [['shell', 0.12], ['insulation', 0.12]]) {
      for (const m of this.mats.forPart(part)) {
        m.transparent = t.xray;
        m.opacity = t.xray ? op : 1;
        m.depthWrite = !t.xray;
        m.needsUpdate = true;
      }
    }
  }

  // External highlight (from the side panel).
  highlight(part) {
    this.extHighlight = part;
    this.applyHighlight();
  }
  setHover(part) {
    if (part === this.hover) return;
    this.hover = part;
    this.applyHighlight();
    this.opts.onHover?.(part);
    if (!part) this.tip.classList.remove('on');
  }
  applyHighlight() {
    this.hl = this.hover || this.calloutHover || this.extHighlight || null;
  }

  view(name, animate = true) {
    const p = this.target || this.rendered;
    if (!p) return;
    this.preset = name;
    this.opts.onPreset?.(name);
    const H = p.H;
    const Ro = p.Ro;
    const half = (this.camera.fov * DEG) / 2;
    let target;
    let dist;
    let az = -32 * DEG;
    let el = 8 * DEG;
    if (name === 'overview') {
      target = new THREE.Vector3(Ro + 2, H * 0.53, 0);
      const fitH = (H * 0.72) / Math.tan(half);
      const fitW = (Math.max(H * 0.45, 26) / Math.tan(half)) / Math.max(this.camera.aspect, 0.3);
      dist = Math.max(fitH, fitW, 34);
    } else if (name === 'base') {
      target = new THREE.Vector3(Ro * 0.7 + 1.5, 1.8, Ro * 0.3);
      dist = 12 + Ro * 3.4;
      el = 13 * DEG;
      az = 24 * DEG;
    } else if (name === 'top') {
      target = new THREE.Vector3(0, H - 0.4, 0);
      dist = 9 + Ro * 4.2;
      el = 24 * DEG;
      az = -28 * DEG;
    } else if (name === 'plan') {
      const pl = plantLayout(p);
      target = new THREE.Vector3(pl.z0 * 0.35, 0, 0);
      dist = Math.max(45, (pl.z0 + 14) * 2.1, H * 0.62 * 2.4);
      el = 89.4 * DEG;
      az = 0;
    }
    const pos = new THREE.Vector3(
      Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az),
    ).multiplyScalar(dist).add(target);
    this.scene.fog.near = dist * 1.6;
    this.scene.fog.far = dist * 6;
    if (!animate) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.camAnim = {
      p0: this.camera.position.clone(), p1: pos,
      t0: this.controls.target.clone(), t1: target,
      start: performance.now(), dur: 850,
    };
  }

  frame() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const time = this.timer.getElapsed();
    const now = performance.now();

    if (this.tween) {
      const k = Math.min(1, (now - this.tween.t0) / this.tween.dur);
      const done = k >= 1;
      this.rebuild(done ? this.tween.to : lerpParams(this.tween.from, this.tween.to, ease(k)), done);
      if (done) {
        this.tween = null;
        if (this.preset) this.view(this.preset);
      }
    }
    if (this.camAnim) {
      const a = this.camAnim;
      const k = Math.min(1, (now - a.start) / a.dur);
      const e = ease(k);
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.t0, a.t1, e);
      if (k >= 1) this.camAnim = null;
    }
    this.controls.update();
    const cam = this.camera.position;
    const b = this.built;
    if (b) {
      if (this.toggles.cutaway) {
        for (const g of b.cutGroups) g.obj.rotation.y = Math.atan2(cam.x - g.x, cam.z - g.z);
      }
      const camAz = Math.atan2(cam.x, cam.z);
      for (const g of b.anim.billboards) g.rotation.y = camAz;
      for (const f of b.anim.fans) f.obj.rotation.x += f.speed * dt;
      for (const m of b.anim.blink) m.color.setHex(Math.sin(time * 3.2) > 0.1 ? 0xff2a2a : 0x3a0c0c);
      const t = this.toggles;
      for (const l of b.labels) {
        const k = l.userData.kind;
        let on = k === 'ghost' ? true
          : k === 'cut' ? t.cutaway && t.dims
          : k === 'context' ? t.context
          : k === 'wind' ? t.wind
          : t.dims;
        if (on && l.userData.maxDist < Infinity) {
          l.getWorldPosition(this.tmp);
          on = cam.distanceTo(this.tmp) < l.userData.maxDist;
        }
        l.visible = on;
      }
    }

    // Highlight: hovered/selected part glows, changed parts flash briefly.
    for (const m of this.mats.all()) {
      if (!m.emissive) continue;
      const part = m.userData.part;
      let i = 0;
      if (part && part === this.hl) i = 0.45 + 0.2 * Math.sin(time * 6);
      const until = this.pulses.get(part);
      if (until) {
        const left = (until - now) / 1400;
        if (left <= 0) this.pulses.delete(part);
        else i = Math.max(i, left * 0.9 * (0.6 + 0.4 * Math.sin(time * 14)));
      }
      if (i > 0) m.emissive.setHex(0xff7a1a);
      m.emissiveIntensity = i;
    }

    if (this.mouseDirty && !this.camAnim) {
      this.mouseDirty = false;
      this.pick();
    }

    if (this.toggles.smoke) this.smoke.update(dt);
    if (this.toggles.wind) this.wind.update(dt);
    if (this.toggles.cutaway) this.flow.update(dt);
    this.smoke.mat.uniforms.uScale.value = this.renderer.domElement.height / (2 * Math.tan((this.camera.fov * DEG) / 2));

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.rendered) this.callouts.update(this.camera, this.el.clientWidth, this.el.clientHeight, this.toggles, this.rendered, this.hl);
  }

  pick() {
    this.ray.setFromCamera(this.mouse, this.camera);
    const hits = this.ray.intersectObject(this.modelRoot, true);
    let part = null;
    for (const h of hits) {
      const o = h.object;
      if (!o.isMesh || o.userData.noPick || !isShown(o)) continue;
      const pt = o.userData.part;
      if (!pt) continue;
      if (this.toggles.xray && (pt === 'shell' || pt === 'insulation')) continue;
      if (pt === 'plant' && hits.length > 1 && h !== hits[hits.length - 1]) continue;
      part = pt;
      break;
    }
    this.setHover(part);
    if (part) {
      const info = (this.parts && this.parts[part]) || EXTRA_PARTS[part];
      if (!info) { this.tip.classList.remove('on'); return; }
      this.tip.innerHTML = `<b>${info.title}</b>${info.lines.map((l) => `<span>${l}</span>`).join('')}`;
      const [x, y] = this.mousePx;
      const w = this.el.clientWidth;
      this.tip.style.transform = `translate(${Math.min(x + 16, w - 260)}px, ${y + 16}px)`;
      this.tip.classList.add('on');
    }
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObs.disconnect();
    this.callouts.dispose();
    this.modelRoot.traverse((o) => o.geometry?.dispose());
    this.mats.all().forEach((m) => m.dispose());
    this.renderer.dispose();
    this.el.innerHTML = '';
  }
}
