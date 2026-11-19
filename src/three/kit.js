// Small geometry, material and colour helpers.
// Angle convention everywhere: azimuth θ, position = (r·sin θ, y, r·cos θ).
// θ = 0 faces +z (front), 90° faces +x (towards the plant). Same as THREE.CylinderGeometry.
import * as THREE from 'three';

export const DEG = Math.PI / 180;

export function polar(r, theta, y = 0) {
  return new THREE.Vector3(r * Math.sin(theta), y, r * Math.cos(theta));
}

// Open cylinder segment standing on y = 0.
export function openCyl(r, h, th0 = 0, len = Math.PI * 2, segs = 64, hSegs = 1) {
  const g = new THREE.CylinderGeometry(r, r, h, segs, hSegs, true, th0, len);
  g.translate(0, h / 2, 0);
  return g;
}

// Flat annulus sector in the XZ plane, facing +y.
export function annulusSector(rIn, rOut, th0, th1, segs = 64) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = th0 + ((th1 - th0) * i) / segs;
    const s = Math.sin(t);
    const c = Math.cos(t);
    pos.push(rIn * s, 0, rIn * c, rOut * s, 0, rOut * c);
    nor.push(0, 1, 0, 0, 1, 0);
    uv.push(i / segs, 0, i / segs, 1);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Horizontal torus arc from θ0 to θ1 (azimuth convention), centred on the y axis.
export function arcTorus(R, tube, th0, th1, segs = 48, radial = 6) {
  const g = new THREE.TorusGeometry(R, tube, radial, segs, th1 - th0);
  g.rotateX(Math.PI / 2);
  g.rotateY(th1 - Math.PI / 2);
  return g;
}

// Vertical rectangle spanning radii [rIn, rOut] at azimuth θ, from y0 to y1.
export function radialFace(rIn, rOut, theta, y0, y1) {
  const g = new THREE.PlaneGeometry(rOut - rIn, y1 - y0);
  g.rotateY(theta - Math.PI / 2);
  const mid = polar((rIn + rOut) / 2, theta, (y0 + y1) / 2);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

const _up = new THREE.Vector3(0, 1, 0);
export function cylinderBetween(a, b, r, mat, segs = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, segs, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  return m;
}

// ── Heat colour map (flue gas temperature in K) ──
const HEAT = [
  [293, new THREE.Color('#25305c')],
  [400, new THREE.Color('#6a2c8a')],
  [520, new THREE.Color('#c23b5a')],
  [650, new THREE.Color('#f0702b')],
  [760, new THREE.Color('#fbb13c')],
  [880, new THREE.Color('#fff2a8')],
];
export function heatColor(T, out = new THREE.Color()) {
  if (T <= HEAT[0][0]) return out.copy(HEAT[0][1]);
  for (let i = 1; i < HEAT.length; i++) {
    if (T <= HEAT[i][0]) {
      const [t0, c0] = HEAT[i - 1];
      const [t1, c1] = HEAT[i];
      return out.copy(c0).lerp(c1, (T - t0) / (t1 - t0));
    }
  }
  return out.copy(HEAT[HEAT.length - 1][1]);
}
export const HEAT_STOPS = HEAT.map(([t, c]) => [t, `#${c.getHexString()}`]);

// ── Materials ──
export const LOOKS = {
  corten:     { color: 0xffffff, metalness: 0.35, roughness: 0.78 },
  painted:    { color: 0xffffff, metalness: 0.15, roughness: 0.6 },
  stainless:  { color: 0xffffff, metalness: 0.85, roughness: 0.32 },
  galv:       { color: 0xa9b0b7, metalness: 0.75, roughness: 0.42 },
  darkSteel:  { color: 0x484e55, metalness: 0.6, roughness: 0.55 },
  casing:     { color: 0x6b7178, metalness: 0.5, roughness: 0.6 },
  concrete:   { color: 0x9b9890, metalness: 0, roughness: 0.95 },
  yellow:     { color: 0xf2c200, metalness: 0.1, roughness: 0.5 },
  fan:        { color: 0x2f6db3, metalness: 0.35, roughness: 0.45 },
  filter:     { color: 0x6f7f91, metalness: 0.45, roughness: 0.55 },
  duct:       { color: 0x9aa2aa, metalness: 0.7, roughness: 0.4 },
  linerStainless: { color: 0xcfd4db, metalness: 0.9, roughness: 0.25 },
  linerCarbon:    { color: 0x5c6167, metalness: 0.6, roughness: 0.55 },
  linerFiberglass:{ color: 0xd8cfa6, metalness: 0, roughness: 0.55 },
  'Rock Wool':        { color: 0xffffff, metalness: 0, roughness: 1 },
  'Insulating Bricks':{ color: 0xffffff, metalness: 0, roughness: 0.95 },
  'Styrofoam':        { color: 0xffffff, metalness: 0, roughness: 0.9 },
};
export const SHELL_BASE = { corten: '#7c4529', painted: '#b8bec2', stainless: '#c4c9cf', fiberglass: '#cfc7a2' };

export class MaterialBank {
  constructor() {
    this.map = new Map();
  }
  std(part, kind, look = kind, extra = {}) {
    const key = `${part}:${kind}`;
    let m = this.map.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ ...LOOKS[look], ...extra });
      m.userData.part = part;
      this.map.set(key, m);
    }
    return m;
  }
  basic(part, kind, opts) {
    const key = `${part}:${kind}`;
    let m = this.map.get(key);
    if (!m) {
      m = new THREE.MeshBasicMaterial(opts);
      m.userData.part = part;
      this.map.set(key, m);
    }
    return m;
  }
  line(kind, opts) {
    const key = `line:${kind}`;
    let m = this.map.get(key);
    if (!m) {
      m = new THREE.LineBasicMaterial(opts);
      this.map.set(key, m);
    }
    return m;
  }
  setLook(m, look) {
    const l = LOOKS[look];
    m.color.set(l.color);
    m.metalness = l.metalness;
    m.roughness = l.roughness;
  }
  forPart(part) {
    return [...this.map.values()].filter((m) => m.userData.part === part);
  }
  all() {
    return [...this.map.values()];
  }
}

// ── Procedural textures ──
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Shell texture: base colour, 1 m plate seams, weathering streaks, aviation bands at the top.
export function shellTexture(H, look, aviation) {
  const pxPerM = Math.max(10, Math.min(24, Math.floor(2048 / Math.max(H, 1))));
  const h = Math.max(32, Math.round(H * pxPerM));
  const w = 256;
  const c = canvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = SHELL_BASE[look] || SHELL_BASE.painted;
  x.fillRect(0, 0, w, h);
  // weathering streaks
  const rnd = mulberry(Math.round(H * 17) + look.length);
  const streaks = look === 'corten' ? 140 : look === 'painted' ? 50 : 30;
  for (let i = 0; i < streaks; i++) {
    const sx = rnd() * w;
    const sw = 1 + rnd() * 4;
    const sy = rnd() * h;
    const sh = 20 + rnd() * h * 0.25;
    const dark = look === 'corten' ? `rgba(60,25,10,${0.08 + rnd() * 0.12})` : `rgba(40,45,50,${0.03 + rnd() * 0.05})`;
    x.fillStyle = dark;
    x.fillRect(sx, sy, sw, sh);
  }
  // aviation obstruction marking: 5 bands over the top section
  if (aviation) {
    const top = Math.min(H / 3, 30) * pxPerM;
    const band = top / 5;
    for (let i = 0; i < 5; i++) {
      x.fillStyle = i % 2 === 0 ? '#c4202e' : '#eef0f2';
      x.fillRect(0, i * band, w, band + 0.5);
    }
  }
  // plate seams, every metre
  x.fillStyle = 'rgba(0,0,0,0.28)';
  for (let m = 1; m < H; m++) x.fillRect(0, h - m * pxPerM, w, 1);
  x.fillStyle = 'rgba(255,255,255,0.08)';
  for (let m = 1; m < H; m++) x.fillRect(0, h - m * pxPerM + 1, w, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function insulationTexture(type) {
  const c = canvas(128, 128);
  const x = c.getContext('2d');
  const rnd = mulberry(type.length * 31);
  if (type === 'Insulating Bricks') {
    x.fillStyle = '#a4553a';
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(230,220,200,0.55)';
    for (let row = 0; row < 8; row++) {
      x.fillRect(0, row * 16, 128, 2);
      const off = row % 2 ? 0 : 16;
      for (let col = 0; col < 5; col++) x.fillRect(off + col * 32, row * 16, 2, 16);
    }
  } else {
    x.fillStyle = type === 'Styrofoam' ? '#e8eef2' : '#d6b048';
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i++) {
      const v = rnd();
      x.fillStyle = v > 0.5 ? 'rgba(255,240,180,0.35)' : 'rgba(120,85,20,0.25)';
      x.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 3, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function smokeSprite() {
  const c = canvas(64, 64);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
