import * as THREE from 'three';
import { heatColor, heatRange, mulberry } from './kit.js';

// ── Smoke plume from each liner outlet ──
const SMOKE_VERT = /* glsl */ `
  attribute float aAge;
  attribute float aSize;
  attribute float aSeed;
  uniform float uScale;
  varying float vAge;
  varying float vSeed;
  void main() {
    vAge = aAge;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const SMOKE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  uniform float uOpacity;
  varying float vAge;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float puff = smoothstep(0.5, 0.05, d);
    puff *= 0.75 + 0.25 * sin(vSeed * 40.0 + c.x * 9.0 + c.y * 7.0);
    float fade = smoothstep(0.0, 0.08, vAge) * (1.0 - smoothstep(0.45, 1.0, vAge));
    vec3 col = mix(uColorHot, uColor, smoothstep(0.0, 0.25, vAge));
    gl_FragColor = vec4(col, puff * fade * uOpacity);
    if (gl_FragColor.a < 0.004) discard;
  }
`;

export class Smoke {
  constructor(max = 1400) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.seed = new Float32Array(max);
    this.age.fill(1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uScale: { value: 400 },
        uColor: { value: new THREE.Color(0xd9dde2) },
        uColorHot: { value: new THREE.Color(0xd9dde2) },
        uOpacity: { value: 0.5 },
      },
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.userData.noPick = true;
    this.next = 0;
    this.acc = 0;
    this.rnd = mulberry(7);
    this.cfg = null;
  }

  configure(p, outlets) {
    const soot = Math.max(0, Math.min(1, p.soot));
    // steam (white) for cool, wet flue gas; grey-brown for sooty media
    const clean = new THREE.Color(0xeef1f4);
    const dirty = new THREE.Color(0x6b6158);
    const c = clean.clone().lerp(dirty, soot * (p.steam ? 0.4 : 1));
    this.mat.uniforms.uColor.value.copy(c);
    this.mat.uniforms.uColorHot.value.copy(c).lerp(new THREE.Color(0xffd2a0), Math.min(1, (p.Tout - 400) / 600) * 0.35);
    this.mat.uniforms.uOpacity.value = p.steam ? 0.62 : 0.22 + soot * 0.45;
    const vTop = p.windVb * Math.pow(Math.max(p.H, 10) / 10, p.windAlpha);
    this.cfg = {
      outlets, // [{x, y, z, r}]
      rate: 40 + p.Q * 2.2,
      rise: 1.8 + p.vGas * 0.32,
      wind: vTop * 0.22,
      life: 7 + Math.min(6, p.H / 20),
      r0: (p.rLiner || 0.5) * 1.6,
    };
    if (!this.warm) {
      this.warm = true;
      for (let i = 0; i < 240; i++) this.update(1 / 30);
    }
  }

  update(dt) {
    const c = this.cfg;
    if (!c) return;
    const { pos, vel, age, life, size } = this;
    this.acc += dt * c.rate;
    while (this.acc >= 1) {
      this.acc -= 1;
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const o = c.outlets[Math.floor(this.rnd() * c.outlets.length)];
      const a = this.rnd() * Math.PI * 2;
      const rr = Math.sqrt(this.rnd()) * o.r * 0.8;
      pos[i * 3] = o.x + Math.cos(a) * rr;
      pos[i * 3 + 1] = o.y;
      pos[i * 3 + 2] = o.z + Math.sin(a) * rr;
      vel[i * 3] = (this.rnd() - 0.5) * 0.5;
      vel[i * 3 + 1] = c.rise * (0.8 + this.rnd() * 0.4);
      vel[i * 3 + 2] = (this.rnd() - 0.5) * 0.5;
      age[i] = 0;
      life[i] = c.life * (0.7 + this.rnd() * 0.6);
      this.seed[i] = this.rnd();
    }
    for (let i = 0; i < this.max; i++) {
      if (age[i] >= 1) { size[i] = 0; continue; }
      age[i] += dt / life[i];
      const k = i * 3;
      // buoyant jet bends over in the wind and slows down
      vel[k] += (c.wind - vel[k]) * Math.min(1, dt * 0.6);
      vel[k + 1] *= 1 - Math.min(0.9, dt * 0.35);
      vel[k + 1] += dt * 0.15;
      vel[k + 2] += (this.rnd() - 0.5) * dt * 0.8;
      pos[k] += vel[k] * dt;
      pos[k + 1] += vel[k + 1] * dt;
      pos[k + 2] += vel[k + 2] * dt;
      size[i] = c.r0 * (1 + age[i] * 7);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAge.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

// ── Wind streaks moving downwind (+x) ──
export class WindStreaks {
  constructor(count = 220) {
    this.count = count;
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.035, 0.035),
      new THREE.MeshBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.32, depthWrite: false }),
      count,
    );
    this.mesh.userData.noPick = true;
    this.mesh.frustumCulled = false;
    this.data = [];
    this.rnd = mulberry(3);
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
    this.v = new THREE.Vector3();
  }
  configure(p) {
    const H = p.H;
    this.box = { x: Math.max(40, H * 0.9), y: H * 1.15, z: Math.max(25, H * 0.5) };
    this.vb = p.windVb;
    this.alpha = p.windAlpha;
    this.data = Array.from({ length: this.count }, () => ({
      x: (this.rnd() * 2 - 1) * this.box.x,
      y: 0.5 + this.rnd() * this.box.y,
      z: (this.rnd() * 2 - 1) * this.box.z,
      len: 1.5 + this.rnd() * Math.max(2, H * 0.05),
    }));
  }
  update(dt) {
    if (!this.box) return;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const v = this.vb * Math.pow(Math.max(d.y, 10) / 10, this.alpha);
      d.x += v * 0.45 * dt;
      if (d.x > this.box.x) d.x = -this.box.x;
      this.s.set(d.len * (v / this.vb), 1, 1);
      this.v.set(d.x, d.y, d.z);
      this.mesh.setMatrixAt(i, this.m.compose(this.v, this.q, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ── Gas rising inside the liners (visible in the cutaway) ──
export class Flow {
  constructor(perLiner = 140) {
    this.per = perLiner;
    this.points = null;
    this.group = new THREE.Group();
    this.group.userData.noPick = true;
    this.rnd = mulberry(11);
    this.col = new THREE.Color();
  }
  configure(p, liners) {
    if (this.points) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
    }
    const n = liners.length * this.per;
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.home = [];
    for (let i = 0; i < n; i++) {
      const l = liners[Math.floor(i / this.per)];
      const a = this.rnd() * Math.PI * 2;
      const r = Math.sqrt(this.rnd()) * p.rLiner * 0.85;
      this.home.push({ x: l.x + Math.cos(a) * r, z: l.z + Math.sin(a) * r });
      this.pos[i * 3] = this.home[i].x;
      this.pos[i * 3 + 1] = this.rnd() * p.H;
      this.pos[i * 3 + 2] = this.home[i].z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({
      size: Math.max(0.08, p.rLiner * 0.12), vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.userData.noPick = true;
    this.group.add(this.points);
    this.p = p;
    this.range = heatRange(p.Tf, p.Tout);
  }
  update(dt) {
    if (!this.points) return;
    const { p } = this;
    const speed = p.vGas * 0.35;
    for (let i = 0; i < this.n; i++) {
      let y = this.pos[i * 3 + 1] + speed * dt * (0.8 + (i % 7) * 0.05);
      if (y > p.H + 0.3) y = 0.2 + this.rnd() * 0.5;
      this.pos[i * 3 + 1] = y;
      heatColor(p.Tf - (p.Tf - p.Tout) * Math.min(1, y / p.H), this.col, this.range);
      this.colors[i * 3] = this.col.r;
      this.colors[i * 3 + 1] = this.col.g;
      this.colors[i * 3 + 2] = this.col.b;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
