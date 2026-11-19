// Builds the chimney from flat parameters (see toParams in engine/design.js).
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  DEG, polar, openCyl, annulusSector, arcTorus, radialFace, cylinderBetween, heatColor, heatRange,
} from './kit.js';

export const CUT = 110 * DEG; // cutaway wedge
const ENCLOSE = [0, 1, 2, 2.155, 2.414];
const GUY_AZ = [30, 150, 270].map((a) => a * DEG);

export function linerLayout(p) {
  const N = Math.max(1, Math.round(p.N));
  const rL = p.rLiner + p.tLiner;
  const ring = (ENCLOSE[N] - 1) * rL;
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = (N === 2 ? 0 : 0) + (i * Math.PI * 2) / N;
    out.push({ x: ring * Math.sin(a), z: ring * Math.cos(a) });
  }
  return out;
}

// Where the plant sits along the +x axis, and how tall it is.
export function plantLayout(p) {
  const fw = 1.4 + p.Q / 40;
  const shown = Math.min(p.filterCount, 4);
  let z = p.Ro + 6;
  if (p.fanCount) z += 2;
  if (shown) z += 2 + shown * (fw + 0.5);
  const tubeTop = p.tubeLevels.length ? Math.max(...p.tubeLevels) : 0;
  return { z0: z, height: Math.max(16, tubeTop + 4), fw, shown };
}

export function buildChimney(p, ctx) {
  const { mats: M, cut, textures } = ctx;
  const root = new THREE.Group();
  const cutGroups = [];
  const anim = { fans: [], lights: [], blink: [], billboards: [] };
  const labels = [];
  const callouts = [];
  const H = p.H;
  const Ro = p.Ro;
  const rShellIn = Ro - p.tShell;
  const rInsIn = p.Renc;
  const th0 = cut ? CUT / 2 : 0;
  const thL = cut ? Math.PI * 2 - CUT : Math.PI * 2;

  const add = (parent, geo, mat, part, opts = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.userData.part = part;
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
  };
  const label = (parent, html, pos, opt = {}) => {
    const el = document.createElement('div');
    el.className = `lbl ${opt.cls || ''}`;
    el.innerHTML = html;
    const o = new CSS2DObject(el);
    o.position.copy(pos);
    o.userData.maxDist = opt.maxDist ?? Infinity;
    o.userData.kind = opt.kind || 'dim'; // dim | cut | ghost | context | wind
    o.center.set(opt.cx ?? 0.5, opt.cy ?? 0.5);
    parent.add(o);
    labels.push(o);
    return o;
  };
  // Anchor for a screen-space callout (see callouts.js).
  const callout = (parent, id, part, html, pos, opt = {}) => {
    const o = new THREE.Object3D();
    o.position.copy(pos);
    parent.add(o);
    callouts.push({ id, part, html, obj: o, kind: opt.kind || 'dim', maxDist: opt.maxDist, cls: opt.cls, slide: opt.slide });
  };
  const lineMat = M.line('dim', { color: 0xdfe6ee, transparent: true, opacity: 0.75 });
  const lines = (parent, pts, kind = 'dim') => {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.LineSegments(g, lineMat);
    l.userData.kind = kind;
    l.userData.noPick = true;
    parent.add(l);
    return l;
  };

  // ── Foundation ──
  const plinthR = Ro + 1.2;
  add(root, new THREE.CylinderGeometry(plinthR, plinthR + 0.12, 0.3, 64).translate(0, -0.15, 0), M.std('foundation', 'concrete', 'concrete'), 'foundation', { cast: false });
  add(root, new THREE.CylinderGeometry(Ro + 0.18, Ro + 0.18, 0.06, 64).translate(0, 0.03, 0), M.std('foundation', 'flange', 'darkSteel'), 'foundation');
  {
    const n = Math.max(8, Math.round(2 * Ro * 6));
    const bolt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6), M.std('foundation', 'flange', 'darkSteel'), n);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const v = polar(Ro + 0.11, (i / n) * Math.PI * 2, 0.11);
      bolt.setMatrixAt(i, mtx.makeTranslation(v.x, v.y, v.z));
    }
    bolt.userData.part = 'foundation';
    root.add(bolt);
    // angle ticks painted on the plinth
    const tickMat = M.basic('foundation', 'tick', { color: 0xf1f3f5 });
    for (const a of [0, 90, 180, 270]) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.06, plinthR - Ro - 0.35).rotateX(-Math.PI / 2), tickMat);
      const mid = polar((Ro + 0.3 + plinthR) / 2, a * DEG, 0.002);
      t.position.copy(mid);
      t.rotation.y = a * DEG;
      t.userData.part = 'foundation';
      root.add(t);
      label(root, `${a}°`, polar(plinthR + 0.45, a * DEG, 0.05), { cls: 'tiny', maxDist: 45 });
    }
  }

  // ── Shell and insulation (cut together) ──
  const casing = new THREE.Group();
  root.add(casing);
  cutGroups.push({ obj: casing, x: 0, z: 0 });
  const shellMat = M.std('shell', 'outer', 'painted', { map: textures.shell });
  add(casing, openCyl(Ro, H, th0, thL, 96, 1), shellMat, 'shell');
  const insMat = M.std('insulation', 'body', p.insType, { map: textures.ins, side: THREE.DoubleSide });
  const casingMat = M.std('shell', 'inner', 'casing', { side: THREE.DoubleSide });
  const capMat = M.std('shell', 'cap', 'darkSteel', { side: THREE.DoubleSide });
  // roof plate
  add(casing, annulusSector(rInsIn, Ro, th0, th0 + thL, 96).translate(0, H, 0), capMat, 'shell');
  if (cut) {
    add(casing, openCyl(rShellIn - 0.001, H, th0, thL, 96, 1), insMat, 'insulation');
    add(casing, openCyl(rInsIn, H, th0, thL, 96, 1), casingMat, 'shell');
    for (const t of [th0, th0 + thL]) {
      add(casing, radialFace(rShellIn, Ro, t, 0, H), capMat, 'shell');
      add(casing, radialFace(rInsIn, rShellIn, t, 0, H), insMat, 'insulation');
    }
    add(casing, annulusSector(rInsIn, rShellIn, th0, th0 + thL, 96).translate(0, H + 0.002, 0), insMat, 'insulation');
    callout(casing, 'cut-ins', 'insulation', `${p.insType} <b>${Math.round(p.tIns * 1000)} mm</b>`, polar(rInsIn + p.tIns / 2, th0, H * 0.55), { kind: 'cut', cls: 'cut', slide: [1, H - 0.5] });
    callout(casing, 'cut-shell', 'shell', `Shell plates <b>${Math.round(p.tShell * 1000)} mm</b>`, polar(Ro - p.tShell / 2, th0 + thL, H * 0.45), { kind: 'cut', cls: 'cut', slide: [1, H - 0.5] });
  } else if (p.N > 1) {
    // roof over the space between the liners
    const s = new THREE.Shape();
    s.absarc(0, 0, rInsIn + 0.01, 0, Math.PI * 2, false);
    for (const l of linerLayout(p)) {
      const hole = new THREE.Path();
      hole.absarc(l.x, -l.z, p.rLiner + p.tLiner, 0, Math.PI * 2, true);
      s.holes.push(hole);
    }
    const g = new THREE.ShapeGeometry(s, 32).rotateX(-Math.PI / 2).translate(0, H, 0);
    add(casing, g, capMat, 'shell');
  }

  // ── Liners ──
  const Hl = H + 0.35;
  const linerOuter = M.std('liners', 'outer', 'linerStainless');
  const linerInner = M.basic('liners', 'heat', { vertexColors: true, side: THREE.BackSide });
  const col = new THREE.Color();
  const range = heatRange(p.Tf, p.Tout);
  for (const l of linerLayout(p)) {
    const g = new THREE.Group();
    g.position.set(l.x, 0, l.z);
    root.add(g);
    cutGroups.push({ obj: g, x: l.x, z: l.z });
    add(g, openCyl(p.rLiner + p.tLiner, Hl, th0, thL, 48, 1), linerOuter, 'liners');
    const inner = openCyl(p.rLiner, Hl, th0, thL, 48, 24);
    const pos = inner.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      heatColor(p.Tf - (p.Tf - p.Tout) * Math.min(1, y / H), col, range);
      colors.set([col.r, col.g, col.b], i * 3);
    }
    inner.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    add(g, inner, linerInner, 'liners', { cast: false });
    add(g, new THREE.TorusGeometry(p.rLiner + p.tLiner, 0.035, 6, 48).rotateX(Math.PI / 2).translate(0, Hl, 0), M.std('liners', 'rim', 'darkSteel'), 'liners');
  }
  {
    const l0 = linerLayout(p)[0];
    callout(root, 'liners', 'liners', `${Math.round(p.N)} × liner Ø <b>${(p.rLiner * 2).toFixed(2)} m</b>`, new THREE.Vector3(l0.x, H * 0.72, l0.z), { kind: 'cut', cls: 'cut', slide: [1, H] });
  }

  // ── Flue gas inlet, fans, filters, plant (all along +x, at 90°) ──
  const plant = plantLayout(p);
  const side = new THREE.Group();
  side.rotation.y = 90 * DEG;
  root.add(side);
  {
    const r = p.inletR;
    const z0 = rShellIn;
    const len = plant.z0 - z0;
    const ductMat = M.std('inlet', 'duct', 'duct');
    const duct = p.inletShape === 'Square'
      ? new THREE.BoxGeometry(2 * r, 2 * r, len)
      : new THREE.CylinderGeometry(r, r, len, 28, 1).rotateX(Math.PI / 2);
    add(side, duct.translate(0, p.inletH, z0 + len / 2), ductMat, 'inlet');
    const fl = p.inletShape === 'Square'
      ? new THREE.BoxGeometry(2 * r + 0.16, 2 * r + 0.16, 0.05)
      : new THREE.CylinderGeometry(r + 0.09, r + 0.09, 0.05, 28).rotateX(Math.PI / 2);
    add(side, fl.translate(0, p.inletH, Ro + 0.03), M.std('inlet', 'flange', 'darkSteel'), 'inlet');
    // locking plate
    add(side, new THREE.BoxGeometry(0.06, 2 * r + 0.24, 0.03).translate(r + 0.12, p.inletH, Ro + 0.06), M.std('inlet', 'flange', 'darkSteel'), 'inlet');

    let z = Ro + 2.6;
    if (p.fanCount) {
      const fan = new THREE.Group();
      fan.position.set(0, p.inletH, z);
      side.add(fan);
      const s = Math.max(0.55, r * 2.4);
      const hm = M.std('fans', 'housing', 'fan');
      add(fan, new THREE.BoxGeometry(s * 1.3, s * 1.3, 1.0), hm, 'fans');
      add(fan, new THREE.CylinderGeometry(s * 0.32, s * 0.32, 0.5, 20).rotateZ(Math.PI / 2).translate(-s * 0.65 - 0.25, 0, 0), M.std('fans', 'motor', 'darkSteel'), 'fans');
      add(fan, new THREE.TorusGeometry(s * 0.5, 0.03, 6, 40).rotateY(Math.PI / 2).translate(s * 0.66, 0, 0), M.std('fans', 'guard', 'galv'), 'fans');
      const rotor = new THREE.Group();
      rotor.position.set(s * 0.67, 0, 0);
      fan.add(rotor);
      const bm = M.std('fans', 'blade', 'galv');
      for (let i = 0; i < 7; i++) {
        const b = add(rotor, new THREE.BoxGeometry(0.02, s * 0.44, 0.09).translate(0, s * 0.24, 0), bm, 'fans');
        b.rotation.x = (i / 7) * Math.PI * 2;
      }
      add(rotor, new THREE.SphereGeometry(0.07, 12, 8), M.std('fans', 'motor', 'darkSteel'), 'fans');
      anim.fans.push({ obj: rotor, speed: (p.fanRpm / 60) * Math.PI * 2 * 0.12 });
      // support legs
      add(fan, new THREE.BoxGeometry(s * 1.1, p.inletH - s * 0.65, 0.8).translate(0, -(p.inletH + s * 0.65) / 2, 0), M.std('fans', 'stand', 'darkSteel'), 'fans');
      callout(fan, 'fans', 'fans', `${p.fanCount} × fan · <b>${p.fanRpm} rpm</b>`, new THREE.Vector3(0, s * 0.65, 0), { maxDist: 120 });
      z += 2;
    }
    if (plant.shown) {
      const fw = plant.fw;
      const fh = 3 + p.Q / 25;
      const bank = new THREE.Group();
      side.add(bank);
      const fm = M.std('filters', 'box', 'filter');
      const dm = M.std('filters', 'detail', 'darkSteel');
      for (let i = 0; i < plant.shown; i++) {
        const cz = z + 1 + i * (fw + 0.5) + fw / 2;
        const cx = 2.4 + fw / 2;
        add(bank, new THREE.BoxGeometry(fw, fh, fw).translate(cx, 1.2 + fh / 2, cz), fm, 'filters');
        add(bank, new THREE.CylinderGeometry(fw * 0.7, 0.12, 0.9, 4, 1).rotateY(Math.PI / 4).translate(cx, 0.75, cz), dm, 'filters');
        for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          add(bank, new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(cx + lx * (fw / 2 - 0.06), 0.6, cz + lz * (fw / 2 - 0.06)), dm, 'filters');
        }
        // branch duct from the main duct
        add(bank, new THREE.BoxGeometry(2.4 - p.inletR, Math.max(0.2, p.inletR * 1.4), Math.max(0.2, p.inletR * 1.4)).translate((2.4 + p.inletR) / 2, p.inletH, cz), M.std('inlet', 'duct', 'duct'), 'inlet');
        // hatch stripes on the box
        add(bank, new THREE.BoxGeometry(fw + 0.02, 0.08, fw + 0.02).translate(cx, 1.2 + fh - 0.25, cz), M.std('filters', 'band', 'yellow'), 'filters');
      }
      const lastZ = z + 1 + plant.shown * (fw + 0.5);
      callout(bank, 'filters', 'filters', `${p.filterCount} × filter <b>type ${p.filterType}</b>`, new THREE.Vector3(2.4 + fw / 2, 1.2 + fh, z + 1 + fw / 2), { maxDist: 160 });
    }
    // inlet dimension: ground to inlet centre
    const dz = Ro + 1.0;
    lines(side, [
      new THREE.Vector3(r + 0.35, 0, dz), new THREE.Vector3(r + 0.35, p.inletH, dz),
      new THREE.Vector3(r + 0.2, p.inletH, dz), new THREE.Vector3(r + 0.5, p.inletH, dz),
    ]);
    callout(side, 'inlet', 'inlet', `Inlet ${p.inletShape === 'Square' ? 'w' : 'Ø'} <b>${Math.round(r * 2000)}</b> · h <b>${p.inletH.toFixed(1)} m</b>`, new THREE.Vector3(0, p.inletH + r, Ro + 0.8), { maxDist: 120 });

    // customer's process plant, as context
    const pm = M.basic('plant', 'ghost', { color: 0x9fb4c8, transparent: true, opacity: 0.07, depthWrite: false });
    const plantBox = new THREE.BoxGeometry(22, plant.height, 16).translate(0, plant.height / 2, plant.z0 + 8);
    const pb = add(side, plantBox, pm, 'plant', { cast: false, receive: false });
    pb.userData.kind = 'context';
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(plantBox), M.line('plant', { color: 0x9fb4c8, transparent: true, opacity: 0.28 }));
    edges.userData.kind = 'context';
    edges.userData.noPick = true;
    side.add(edges);
    callout(side, 'plant', 'plant', 'Process plant <span>by others</span>', new THREE.Vector3(0, plant.height, plant.z0), { kind: 'context', cls: 'muted' });

    // lateral steel tubes to the plant
    for (const y of p.tubeLevels) {
      const tm = M.std('supports', 'tube', 'galv');
      for (const x of [-0.6, 0.6]) side.add(Object.assign(cylinderBetween(new THREE.Vector3(x, y, Ro), new THREE.Vector3(x, y, plant.z0), Math.max(p.tubeR, 0.06), tm), { userData: { part: 'supports' } }));
      add(side, new THREE.TorusGeometry(Ro + 0.04, 0.06, 6, 64).rotateX(Math.PI / 2).translate(0, y, 0), M.std('supports', 'collar', 'darkSteel'), 'supports');
    }
  }

  // ── Cleaning door ──
  {
    const g = new THREE.Group();
    g.rotation.y = p.doorAz * DEG;
    root.add(g);
    const r = p.doorR;
    const z = Ro + 0.02;
    add(g, new THREE.CylinderGeometry(r, r, 0.05, 40).rotateX(Math.PI / 2).translate(0, p.doorH, z), M.std('door', 'cover', 'darkSteel'), 'door');
    add(g, new THREE.TorusGeometry(r + 0.03, 0.028, 6, 40).translate(0, p.doorH, z + 0.02), M.std('door', 'frame', 'galv'), 'door');
    for (const dy of [-0.5, 0.5]) add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.14, 10).translate(-r - 0.06, p.doorH + dy * r, z + 0.03), M.std('door', 'frame', 'galv'), 'door');
    add(g, new THREE.BoxGeometry(0.08, Math.max(0.14, r * 0.5), 0.04).translate(r * 0.62, p.doorH, z + 0.05), M.std('door', 'lock', 'yellow'), 'door');
    callout(g, 'door', 'door', `Cleaning door Ø <b>${Math.round(r * 2000)}</b> · R <b>${p.doorH.toFixed(1)} m</b>`, new THREE.Vector3(0, p.doorH, z + 0.05), { maxDist: 120 });
  }

  // ── Safety ladder ──
  const ladderZ = Ro + 0.26;
  if (p.ladderOn) {
    const g = new THREE.Group();
    g.rotation.y = p.ladderAz * DEG;
    root.add(g);
    const y0 = 0.3;
    const y1 = p.ladderTop;
    const len = y1 - y0;
    const lm = M.std('ladder', 'steel', 'galv');
    for (const x of [-0.24, 0.24]) add(g, new THREE.CylinderGeometry(0.025, 0.025, len, 8).translate(x, y0 + len / 2, ladderZ), lm, 'ladder');
    const nR = Math.max(1, Math.floor(len * 3));
    const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 6).rotateZ(Math.PI / 2), lm, nR);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < nR; i++) rungs.setMatrixAt(i, mtx.makeTranslation(0, y0 + (i + 0.5) / 3, ladderZ));
    rungs.userData.part = 'ladder';
    rungs.castShadow = true;
    g.add(rungs);
    const nB = Math.max(1, Math.floor(len));
    const br = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.27), M.std('ladder', 'bracket', 'darkSteel'), nB * 2);
    for (let i = 0; i < nB; i++) {
      br.setMatrixAt(i * 2, mtx.makeTranslation(-0.24, y0 + i + 0.5, Ro + 0.13));
      br.setMatrixAt(i * 2 + 1, mtx.makeTranslation(0.24, y0 + i + 0.5, Ro + 0.13));
    }
    br.userData.part = 'ladder';
    g.add(br);
    if (p.cageTo - p.cageFrom > 0.5) {
      const cz = ladderZ + 0.05;
      const R = 0.38;
      const hoopG = arcTorus(R, 0.016, -115 * DEG, 115 * DEG, 24, 5);
      const n = Math.max(2, Math.floor((p.cageTo - p.cageFrom) / 0.9) + 1);
      const hoops = new THREE.InstancedMesh(hoopG, lm, n);
      for (let i = 0; i < n; i++) hoops.setMatrixAt(i, mtx.makeTranslation(0, p.cageFrom + (i * (p.cageTo - p.cageFrom)) / (n - 1), cz));
      hoops.userData.part = 'ladder';
      hoops.castShadow = true;
      g.add(hoops);
      const cl = p.cageTo - p.cageFrom;
      for (const a of [-80, -40, 0, 40, 80]) {
        const v = polar(R, a * DEG);
        add(g, new THREE.CylinderGeometry(0.012, 0.012, cl, 5).translate(v.x, p.cageFrom + cl / 2, cz + v.z), lm, 'ladder');
      }
    }
    if (p.harness) {
      add(g, new THREE.CylinderGeometry(0.01, 0.01, len, 5).translate(0, y0 + len / 2, ladderZ + 0.03), M.std('ladder', 'line', 'yellow'), 'ladder');
    }
    callout(g, 'ladder', 'ladder', `Ladder · <b>${nR}</b> steps${p.cageTo - p.cageFrom > 0.5 ? ' · back support' : p.harness ? ' · safety line' : ''}`, new THREE.Vector3(0, Math.min(H * 0.3, H - 4), ladderZ), { maxDist: 400, slide: [1, H] });
  } else if (p.ladderMissing) {
    const g = new THREE.Group();
    root.add(g);
    const gm = M.basic('ghost', 'ladder', { color: 0xffa94d, transparent: true, opacity: 0.22, depthWrite: false });
    add(g, new THREE.BoxGeometry(0.55, H, 0.08).translate(0, H / 2 + 0.3, ladderZ), gm, 'ghost', { cast: false, receive: false });
    callout(g, 'ghost-ladder', 'ghost', '<i></i>Ladder not specified', new THREE.Vector3(0, H * 0.4, ladderZ), { kind: 'ghost', cls: 'ghost', slide: [1, H] });
  }

  // ── Platform ──
  if (p.platformOn) {
    const g = new THREE.Group();
    g.rotation.y = p.platformAz * DEG;
    g.position.y = p.platformElev;
    root.add(g);
    const W = p.platformW;
    const full = p.platformArc >= 359;
    const a0 = full ? 0 : -(p.platformArc * DEG) / 2;
    const a1 = full ? Math.PI * 2 : (p.platformArc * DEG) / 2;
    const Rout = Ro + W;
    const pm = M.std('platform', 'plate', 'galv', { side: THREE.DoubleSide });
    add(g, annulusSector(Ro + 0.02, Rout, a0, a1, 64), pm, 'platform');
    add(g, annulusSector(Ro + 0.02, Rout, a0, a1, 64).translate(0, -0.06, 0), pm, 'platform');
    add(g, new THREE.CylinderGeometry(Rout, Rout, 0.2, 64, 1, true, a0, a1 - a0).translate(0, 0.04, 0), M.std('platform', 'toe', 'galv', { side: THREE.DoubleSide }), 'platform');
    const rm = M.std('platform', 'rail', 'yellow');
    const Rr = Rout - 0.04;
    add(g, arcTorus(Rr, 0.028, a0, a1, 64, 6).translate(0, 1.5, 0), rm, 'platform');
    add(g, arcTorus(Rr, 0.02, a0, a1, 64, 6).translate(0, 0.75, 0), rm, 'platform');
    const arcLen = (a1 - a0) * Rr;
    const nP = Math.max(2, Math.ceil(arcLen / 1.2)) + (full ? 0 : 1);
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 6).translate(0, 0.75, 0), rm, nP);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < nP; i++) {
      const a = a0 + ((a1 - a0) * i) / (full ? nP : nP - 1);
      const v = polar(Rr, a);
      posts.setMatrixAt(i, mtx.makeTranslation(v.x, 0, v.z));
    }
    posts.userData.part = 'platform';
    posts.castShadow = true;
    g.add(posts);
    if (!full) {
      for (const a of [a0, a1]) {
        for (const y of [0.75, 1.5]) g.add(Object.assign(cylinderBetween(polar(Ro + 0.05, a, y), polar(Rr, a, y), 0.022, rm), { userData: { part: 'platform' } }));
      }
    }
    const nS = Math.max(3, Math.round((a1 - a0) / (45 * DEG)));
    const sm = M.std('platform', 'strut', 'darkSteel');
    for (let i = 0; i < nS; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / nS;
      g.add(Object.assign(cylinderBetween(polar(Ro, a, -Math.min(1.2, W)), polar(Ro + W * 0.92, a, -0.05), 0.035, sm), { userData: { part: 'platform' } }));
    }
    callout(g, 'platform', 'platform', `${p.platformType} <b>+${p.platformElev.toFixed(1)} m</b> · ${Math.round(p.platformArc)}°`, polar(Rout, 0, 0.75), { maxDist: 400 });
  } else if (p.platformMissing) {
    const g = new THREE.Group();
    g.position.y = H - 1.5;
    root.add(g);
    const gm = M.basic('ghost', 'platform', { color: 0xffa94d, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    add(g, annulusSector(Ro, Ro + 1, -Math.PI / 2, Math.PI / 2, 48), gm, 'ghost', { cast: false, receive: false });
    add(g, new THREE.CylinderGeometry(Ro + 1, Ro + 1, 1.5, 48, 1, true, -Math.PI / 2, Math.PI).translate(0, 0.75, 0), gm, 'ghost', { cast: false, receive: false });
    callout(g, 'ghost-platform', 'ghost', '<i></i>Platform not specified', polar(Ro + 1, 0, 0.75), { kind: 'ghost', cls: 'ghost' });
  }

  // ── Guy wires ──
  if (p.guyLevels.length) {
    const top = Math.max(...p.guyLevels);
    const Ra = Math.max(Ro + 8, top * 0.62);
    const wm = M.std('supports', 'wire', 'galv');
    const am = M.std('supports', 'anchor', 'concrete');
    for (const y of p.guyLevels) {
      add(root, new THREE.TorusGeometry(Ro + 0.04, 0.07, 6, 64).rotateX(Math.PI / 2).translate(0, y, 0), M.std('supports', 'collar', 'darkSteel'), 'supports');
      for (const a of GUY_AZ) {
        const w = cylinderBetween(polar(Ro + 0.08, a, y), polar(Ra, a, 0.3), Math.max(p.wireR, 0.035), wm, 5);
        w.userData.part = 'supports';
        w.castShadow = true;
        root.add(w);
      }
    }
    for (const a of GUY_AZ) {
      const v = polar(Ra, a, 0.15);
      add(root, new THREE.BoxGeometry(1.4, 0.6, 1.4).translate(v.x, v.y - 0.15, v.z), am, 'supports');
    }
    for (const [i, a] of GUY_AZ.entries()) {
      // anchor partway down the first wire, so the dot sits on the cable
      const y0 = p.guyLevels[0];
      const t = 0.3;
      const pt = polar(Ro + (Ra - Ro) * t, a, y0 + (0.3 - y0) * t);
      if (i === 0) callout(root, 'guys', 'supports', `${p.guyLevels.length * 3} guy wires · Ø <b>${Math.round(p.wireR * 2000)} mm</b> · ${p.guyLevels.join(' / ')} m`, pt, { maxDist: 500 });
    }
  }

  // ── Aviation lights ──
  if (p.aviation) {
    const lm = M.basic('lights', 'lamp', { color: 0xff2a2a });
    const levels = H >= 90 ? [H + 0.12, H / 2] : [H + 0.12];
    for (const y of levels) {
      for (const a of [60, 180, 300]) {
        const v = polar(Ro + 0.12, a * DEG, y);
        const s = add(root, new THREE.SphereGeometry(0.14, 12, 8), lm, 'lights', { cast: false });
        s.position.copy(v);
        add(root, new THREE.BoxGeometry(0.05, 0.05, 0.16).translate(0, 0, -0.08), M.std('lights', 'bracket', 'darkSteel'), 'lights').position.copy(v);
      }
    }
    anim.blink.push(lm);
  }

  // ── Dimension lines (height, diameter) ──
  {
    // Built on local -x and turned towards the camera every frame, so the height
    // dimension always sits left of the chimney and the diameter spans the view.
    const dg = new THREE.Group();
    root.add(dg);
    anim.billboards.push(dg);
    const a = -90 * DEG;
    const rD = Ro + 1.6;
    const b = polar(rD, a, 0);
    const t = polar(rD, a, H);
    const tick = new THREE.Vector3(0, 0, 0.5);
    lines(dg, [b, t, b.clone().sub(tick), b.clone().add(tick), t.clone().sub(tick), t.clone().add(tick)]);
    // 10 m ticks
    const pts = [];
    for (let y = 10; y < H - 2; y += 10) {
      const v = polar(rD, a, y);
      const s = new THREE.Vector3(0, 0, 0.22);
      pts.push(v.clone().sub(s), v.clone().add(s));
    }
    if (pts.length) lines(dg, pts);
    label(dg, `H = <b>${Math.round(H)} m</b>`, polar(rD, a, H / 2), { cls: 'major vert' });
    const yD = H + 1.1;
    lines(dg, [
      new THREE.Vector3(-Ro, yD, 0), new THREE.Vector3(Ro, yD, 0),
      new THREE.Vector3(-Ro, yD - 0.35, 0), new THREE.Vector3(-Ro, yD + 0.2, 0),
      new THREE.Vector3(Ro, yD - 0.35, 0), new THREE.Vector3(Ro, yD + 0.2, 0),
    ]);
    label(dg, `Ø <b>${(2 * Ro).toFixed(2)} m</b>`, new THREE.Vector3(0, yD + 0.25, 0), { cls: 'major', cy: 1 });
  }

  // ── Wind profile (upwind side, 270°) ──
  {
    const wg = new THREE.Group();
    wg.userData.kind = 'wind';
    root.add(wg);
    const x0 = -(Ro + 3);
    const scale = Math.max(4, H * 0.12);
    const tails = [];
    for (const f of [0.1, 0.3, 0.5, 0.7, 0.9, 1.0]) {
      const y = Math.max(2, H * f);
      const v = p.windVb * Math.pow(Math.max(y, 10) / 10, p.windAlpha);
      const L = (v / p.windVb) * scale;
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x0 - L, y, 0), L, 0x74c0fc, Math.min(0.9, L * 0.25), Math.min(0.5, L * 0.12));
      arrow.traverse((o) => { o.userData.noPick = true; });
      wg.add(arrow);
      tails.push(new THREE.Vector3(x0 - L, y, 0));
      if (f === 0.1 || f === 0.5 || f === 1.0) label(wg, `${v.toFixed(0)} m/s`, new THREE.Vector3(x0 - L - 0.3, y, 0), { kind: 'wind', cls: 'wind', cx: 1 });
    }
    const curve = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tails), M.line('wind', { color: 0x74c0fc, transparent: true, opacity: 0.6 }));
    curve.userData.noPick = true;
    wg.add(curve);
    const base = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 0, 0), new THREE.Vector3(x0, H, 0)]), M.line('wind', { color: 0x74c0fc }));
    base.userData.noPick = true;
    wg.add(base);
    anim.windGroup = wg;
  }

  // ── Scale person ──
  {
    const g = new THREE.Group();
    g.userData.kind = 'context';
    const v = polar(Ro + 2.4, 140 * DEG);
    g.position.set(v.x, 0, v.z);
    const pm = M.std('person', 'body', 'casing');
    add(g, new THREE.CapsuleGeometry(0.2, 0.95, 4, 10).translate(0, 0.72, 0), pm, 'person');
    add(g, new THREE.SphereGeometry(0.13, 14, 10).translate(0, 1.66, 0), pm, 'person');
    add(g, new THREE.CylinderGeometry(0.16, 0.17, 0.1, 14).translate(0, 1.8, 0), M.std('person', 'helmet', 'yellow'), 'person');
    root.add(g);
  }

  return { root, cutGroups, anim, labels, callouts, plant };
}
