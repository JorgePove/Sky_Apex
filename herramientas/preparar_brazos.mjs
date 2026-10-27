/* Brazos del jinete para la vista en 1ª persona, sacados del caballero «Knighty» (FBX sin esqueleto, sin UV ni materiales):
   - lee el FBX (fbx_node.mjs) y se queda con el brazo izquierdo del modelo (lado +X; el modelo mira hacia +Z),
   - recorta el brazo por piezas: cada isla de malla (placa de armadura, dedo…) entra entera si casi toda cae dentro del brazo;
     las islas enormes (cota de malla del cuerpo) se recortan triángulo a triángulo,
   - reduce la malla con meshoptimizer y crea el esqueleto: brazo, antebrazo, mano, falanges de los cuatro dedos (curvan juntas)
     y pulgar; los pesos salen de la posición a lo largo del brazo (las placas pequeñas van rígidas con un solo hueso),
   - el brazo derecho es el espejo del izquierdo,
   - escribe un GLB con dos mallas con piel (huesos en pose de reposo sin giro: el juego los orienta por IK).
   Uso: node preparar_brazos.mjs --fbx ../Knighty.fbx --salida ../modelos/brazos_jinete.glb [--ratio 0.25] [--escala 0.004]
        node preparar_brazos.mjs --fbx ../Knighty.fbx --analizar      (mapas de la mano en texto, para ajustar las articulaciones) */
import fs from 'fs';
import { MeshoptSimplifier } from 'meshoptimizer';
import { loadFBX, THREE } from './fbx_node.mjs';

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, ''), next = argv[i + 1];
  opt[k] = next !== undefined && !next.startsWith('--') ? (i++, next) : true;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const RATIO = +(opt.ratio || 0.25), SCALE = +(opt.escala || 0.004);

/* ---------- Articulaciones del brazo izquierdo (unidades del modelo ×50, medidas con secciones del brazo) ---------- */
const J = {
  S: V3(66, 208, 14),          // hombro (bajo la hombrera)
  E: V3(123, 170, 17),         // codo (donde se dobla la línea media del brazo)
  W: V3(161, 129, 34),         // muñeca (sección más estrecha)
  T: V3(183, 88, 40)           // punta del dedo corazón
};
const CUT_UP = 0.3;            // el brazo empieza a este tanto por uno del hombro al codo (la hombrera queda fuera)
const R_UP = 30, R_FORE = 27, R_HAND = 24;
// materiales por malla (el FBX no trae ninguno): el primero que encaje; el último es el acero de las placas
const MATS = [['cuero', /^Knighty$|^Merged_cloth41_0[12]$/], ['malla', /^6955555/], ['tela', /^Merged_cloth3[67]$/], ['acero', /./]];
const SKIP = /Pm3d_cube3d1_44|Pm3d_cube3d1_51|Merged_cloth41_0[6789]|Merged_pm3d_cube3d1_4[01]/;   // espadas, vaina y piezas de la espalda

/* ---------- 1. FBX → mallas en unidades del modelo ---------- */
let t0 = Date.now();
const root = loadFBX(opt.fbx);
root.updateMatrixWorld(true);
const meshes = [];
root.traverse(o => { if (o.isMesh && !SKIP.test(o.name)) meshes.push(o); });
console.log(`FBX leído en ${Date.now() - t0} ms: ${meshes.length} mallas`);

/* ---------- 2. Distancia a la cadena del brazo ---------- */
const segs = [[J.S, J.E, R_UP], [J.E, J.W, R_FORE], [J.W, J.T, R_HAND]];
const _d = V3(), _w = V3();
// devuelve { dist, seg, t } con la distancia a la cadena hombro-codo-muñeca-punta (t: 0..1 dentro del tramo)
function chain(p) {
  let best = { dist: Infinity, seg: -1, t: 0, r: 0 };
  segs.forEach(([a, b, r], i) => {
    _d.subVectors(b, a); const L2 = _d.lengthSq();
    let t = _w.subVectors(p, a).dot(_d) / L2;
    const lo = i === 0 ? CUT_UP : 0, hi = i === 2 ? 1.18 : 1;
    if (t < lo - 1e-6 && i === 0) return;               // por encima del corte del hombro: fuera
    const tc = Math.min(Math.max(t, lo), hi);
    const dist = _w.subVectors(p, a).addScaledVector(_d, -tc).length() + (t > hi ? (t - hi) * Math.sqrt(L2) : 0);
    if (dist / r < best.dist / (best.r || 1)) best = { dist, seg: i, t, r };
  });
  return best;
}
const inside = p => { const c = chain(p); return c.seg >= 0 && c.dist < c.r && p.x > 45; };

/* ---------- 3. Triángulos del brazo, por islas ---------- */
const P = [], N = [], CAT = [], ISL = [];      // vértices finales (sin soldar todavía) por triángulo
let nIslands = 0;
const meshStats = [];
for (const m of meshes) {
  const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, mw = m.matrixWorld;
  const nm = new THREE.Matrix3().getNormalMatrix(mw);
  const n = pos.count, nt = n / 3;
  // ¿tiene algo en la zona del brazo?
  let any = false; const v = V3();
  for (let i = 0; i < n; i += 7) { v.fromBufferAttribute(pos, i).applyMatrix4(mw); if (v.x > 80 && inside(v)) { any = true; break; } }
  if (!any) continue;
  // soldar por posición (para la conectividad) y unión de triángulos en islas
  const W = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mw); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z; }
  const key = new Map(), vid = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.round(W[i * 3] * 200) + ',' + Math.round(W[i * 3 + 1] * 200) + ',' + Math.round(W[i * 3 + 2] * 200);
    let id = key.get(k); if (id === undefined) { id = key.size; key.set(k, id); } vid[i] = id;
  }
  const par = new Int32Array(key.size).map((_, i) => i);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nt; t++) { const a = find(vid[t * 3]), b = find(vid[t * 3 + 1]), c = find(vid[t * 3 + 2]); par[b] = a; par[find(c)] = a; }
  const islOf = new Map(); const isl = [];
  for (let t = 0; t < nt; t++) {
    const r = find(vid[t * 3]); let k = islOf.get(r);
    if (k === undefined) { k = isl.length; islOf.set(r, k); isl.push({ tris: [], inV: 0, nV: 0, min: V3(Infinity, Infinity, Infinity), max: V3(-Infinity, -Infinity, -Infinity) }); }
    isl[k].tris.push(t);
  }
  let took = 0;
  const cat = MATS.findIndex(([, re]) => re.test(m.name));
  for (const I of isl) {
    for (const t of I.tris) for (let c = 0; c < 3; c++) {
      v.fromArray(W, (t * 3 + c) * 3); I.min.min(v); I.max.max(v); I.nV++; if (inside(v)) I.inV++;
    }
    const big = I.max.distanceTo(I.min) > 120 || I.tris.length > 40000;
    const frac = I.inV / I.nV;
    let tris;
    if (big) tris = I.tris.filter(t => { for (let c = 0; c < 3; c++) if (!inside(v.fromArray(W, (t * 3 + c) * 3))) return false; return true; });
    else tris = frac > 0.6 ? I.tris : [];
    if (!tris.length) continue;
    const id = nIslands++;
    for (const t of tris) for (let c = 0; c < 3; c++) {
      const i = t * 3 + c;
      P.push(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
      ISL.push(big ? -1 - id : id);                       // negativo: isla recortada (pesos por vértice)
      CAT.push(cat);
    }
    took += tris.length;
  }
  if (took) meshStats.push([m.name, took]);
}
const nTri = P.length / 9;
console.log(`Brazo: ${nTri} triángulos en ${nIslands} islas · ${meshStats.map(([a, b]) => a + ' ' + b).join(', ')}`);

/* ---------- Análisis de la mano (mapas de texto en ejes de la mano) ---------- */
if (opt.analizar) {
  const d = V3().subVectors(J.T, J.W).normalize();           // a lo largo de la mano
  const fwd = V3(0, 0, 1), tv = fwd.clone().addScaledVector(d, -fwd.dot(d)).normalize();   // lado del pulgar
  const pv = V3().crossVectors(d, tv);                        // normal de la palma (hacia el cuerpo)
  const L = J.T.distanceTo(J.W);
  const map = (ax1, ax2, r1, r2, title) => {
    const C = 60, R = 30, grid = Array.from({ length: R }, () => new Array(C).fill(0));
    for (let i = 0; i < P.length; i += 3) {
      const q = V3(P[i], P[i + 1], P[i + 2]).sub(J.W), a = q.dot(ax1), b = q.dot(ax2);
      const x = Math.floor((a - r1[0]) / (r1[1] - r1[0]) * C), y = Math.floor((b - r2[0]) / (r2[1] - r2[0]) * R);
      if (x >= 0 && x < C && y >= 0 && y < R) grid[R - 1 - y][x]++;
    }
    console.log(`\n${title}  (horizontal ${r1[0]}..${r1[1]}, vertical ${r2[0]}..${r2[1]})`);
    for (const row of grid) console.log('|' + row.map(c => c === 0 ? ' ' : c < 5 ? '.' : c < 20 ? ':' : c < 60 ? 'o' : '#').join('') + '|');
  };
  console.log('Largo de la mano', L.toFixed(1), 'eje', d.toArray().map(x => x.toFixed(3)), 'pulgar', tv.toArray().map(x => x.toFixed(3)), 'palma', pv.toArray().map(x => x.toFixed(3)));
  // islas de la mano: centro en ejes de la mano (a lo largo, lado del pulgar, hacia la palma) y tamaño
  const isl = new Map();
  for (let i = 0, k = 0; i < P.length; i += 3, k++) {
    const q = V3(P[i], P[i + 1], P[i + 2]).sub(J.W), a = q.dot(d); if (a < -4) continue;
    const id = ISL[k]; let e = isl.get(id); if (!e) isl.set(id, e = { n: 0, s: V3(), mn: V3(1e9, 1e9, 1e9), mx: V3(-1e9, -1e9, -1e9) });
    const h = V3(a, q.dot(tv), q.dot(pv)); e.n++; e.s.add(h); e.mn.min(h); e.mx.max(h);
  }
  console.log('Islas de la mano (id, vértices, centro a/pulgar/palma, mín, máx):');
  for (const [id, e] of [...isl].sort((x, y) => x[1].s.x / x[1].n - y[1].s.x / y[1].n)) if (e.n > 30)
    console.log(String(id).padStart(5), String(e.n).padStart(6), e.s.clone().multiplyScalar(1 / e.n).toArray().map(x => x.toFixed(1).padStart(6)).join(''), ' |', e.mn.toArray().map(x => x.toFixed(0).padStart(4)).join(''), ' |', e.mx.toArray().map(x => x.toFixed(0).padStart(4)).join(''));
  const P0 = P.slice(); P.length = 0; for (let i = 0; i < P0.length; i += 3) { const q = V3(P0[i], P0[i + 1], P0[i + 2]).sub(J.W); if (q.dot(d) > -3) P.push(P0[i], P0[i + 1], P0[i + 2]); }
  map(d, tv, [-15, 55], [-25, 25], 'Mano vista desde el dorso: a lo largo (→ dedos) × lado del pulgar (↑)');
  map(d, pv, [-15, 55], [-25, 25], 'Mano de canto: a lo largo (→ dedos) × hacia la palma (↑)');
  map(tv, pv, [-25, 25], [-25, 25], 'Corte transversal (todo): pulgar (→) × palma (↑)');
  process.exit(0);
}

/* ---------- 4. Esqueleto (brazo izquierdo, unidades del modelo) ---------- */
const HD = V3().subVectors(J.T, J.W).normalize();                                   // mano: a lo largo (muñeca → dedos)
const HT = V3(0, 0, 1).addScaledVector(HD, -HD.z).normalize();                     // lado del pulgar
const HP = V3().crossVectors(HD, HT);                                               // hacia la palma
const hand = (a, b, c) => J.W.clone().addScaledVector(HD, a).addScaledVector(HT, b).addScaledVector(HP, c);
// dedos: [nombre, posición lateral (lado del pulgar +), a lo largo: nudillo, 2ª y 3ª falange, punta]; medidos con las placas de cada dedo
const FINGERS = [['indice', 9.5, [23, 33, 39, 45]], ['corazon', 2, [24, 35, 41.5, 47]], ['anular', -6.5, [23, 32, 37.5, 43]], ['menique', -14.5, [21, 27, 31.5, 36]]];
const FDEPTH = [-3, -1.5, 0, 1];                                                    // profundidad (hacia la palma) de cada articulación
const THUMB = [[5, 9, 3], [16, 15, 7], [25, 15, 10], [33, 14, 13]];                 // pulgar: base, 2ª, 3ª, punta (a lo largo, lateral, palma)
const bones = [];      // { name, parent, pos (modelo) }
const addBone = (name, parent, pos) => (bones.push({ name, parent, pos }), bones.length - 1);
const bUp = addBone('Brazo', -1, J.S), bFore = addBone('Antebrazo', bUp, J.E), bHand = addBone('Mano', bFore, J.W);
const fingerBones = FINGERS.map(([n, b, A]) => { let p = bHand; return A.slice(0, 3).map((a, k) => (p = addBone(n + (k + 1), p, hand(a, b, FDEPTH[k])))); });
let tp = bHand; const thumbBones = THUMB.slice(0, 3).map((t, k) => (tp = addBone('pulgar' + (k + 1), tp, hand(...t))));

/* ---------- 5. Pesos ---------- */
const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const dU = V3().subVectors(J.E, J.S).normalize(), dF = V3().subVectors(J.W, J.E).normalize();
const nElbow = dU.clone().add(dF).normalize(), nWrist = dF.clone().add(HD).normalize();
function weights(p) {                                    // → Map hueso → peso
  const w = new Map(), add = (b, x) => { if (x > 1e-4) w.set(b, (w.get(b) || 0) + x); };
  const sE = V3().subVectors(p, J.E).dot(nElbow), sW = V3().subVectors(p, J.W).dot(nWrist);
  const fore = smooth(-6, 6, sE), hnd = fore * smooth(-3, 3, sW);
  add(bUp, 1 - fore); add(bFore, fore - hnd);
  if (hnd <= 1e-4) return w;
  const q = V3().subVectors(p, J.W), a = q.dot(HD), b = q.dot(HT), c = q.dot(HP);
  if (b > 8.5 && c > 1.5 && a < 38) {                    // pulgar
    const k1 = smooth(1, 7, a), k2 = smooth(13.5, 18.5, a), k3 = smooth(23.5, 27.5, a);
    add(bHand, hnd * (1 - k1)); add(thumbBones[0], hnd * (k1 - k2)); add(thumbBones[1], hnd * (k2 - k3)); add(thumbBones[2], hnd * k3);
    return w;
  }
  const f = b > 6 ? 0 : b > -2.5 ? 1 : b > -10.5 ? 2 : 3, A = FINGERS[f][2], fb = fingerBones[f];
  const k1 = smooth(A[0] - 3, A[0] + 2, a), k2 = smooth(A[1] - 1.5, A[1] + 1.5, a), k3 = smooth(A[2] - 1.5, A[2] + 1.5, a);
  add(bHand, hnd * (1 - k1)); add(fb[0], hnd * (k1 - k2)); add(fb[1], hnd * (k2 - k3)); add(fb[2], hnd * k3);
  return w;
}

/* ---------- 6. Soldar (posición + normal + material), reducir y pesar ---------- */
await MeshoptSimplifier.ready;
const keyMap = new Map(), vPos = [], vNor = [], vIsl = [], idxByCat = MATS.map(() => []);
for (let i = 0; i < P.length / 3; i++) {
  const k = [Math.round(P[i * 3] * 100), Math.round(P[i * 3 + 1] * 100), Math.round(P[i * 3 + 2] * 100), Math.round(N[i * 3] * 100), Math.round(N[i * 3 + 1] * 100), Math.round(N[i * 3 + 2] * 100), CAT[i]].join(',');
  let id = keyMap.get(k);
  if (id === undefined) { id = vPos.length / 3; keyMap.set(k, id); vPos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); vNor.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); vIsl.push(ISL[i]); }
  idxByCat[CAT[i]].push(id);
}
const POS = new Float32Array(vPos), NOR = new Float32Array(vNor), nV = POS.length / 3;
const CAT_RATIO = { malla: 0.06, tela: 0.15 };
const prims = [];
idxByCat.forEach((ix, m) => {
  if (!ix.length) return;
  const name = MATS[m][0], r = CAT_RATIO[name] ?? RATIO, src = new Uint32Array(ix);
  const target = Math.floor(src.length * r / 3) * 3;
  const [out, err] = MeshoptSimplifier.simplifyWithAttributes(src, POS, 3, NOR, 3, [0.4, 0.4, 0.4], null, target, 0.03, []);
  console.log(`${name}: ${src.length / 3} → ${out.length / 3} triángulos (error ${err.toFixed(4)})`);
  prims.push({ m, ix: out });
});
// pesos: las islas pequeñas (placas, falanges) van rígidas con los pesos de su centro; las grandes (el guante entero,
// que cruza muñeca y dedos) y las recortadas, vértice a vértice
const islC = new Map();
for (let v = 0; v < nV; v++) {
  if (vIsl[v] < 0) continue;
  let e = islC.get(vIsl[v]); if (!e) islC.set(vIsl[v], e = { s: V3(), n: 0, mn: V3(1e9, 1e9, 1e9), mx: V3(-1e9, -1e9, -1e9) });
  const p = V3().fromArray(POS, v * 3); e.s.add(p); e.n++; e.mn.min(p); e.mx.max(p);
}
for (const e of islC.values()) e.rigid = e.mx.distanceTo(e.mn) < 14 ? weights(e.s.multiplyScalar(1 / e.n)) : null;
const used = new Set(); for (const p of prims) for (const i of p.ix) used.add(i);
const keep = new Int32Array(nV).fill(-1); let nK = 0; for (const v of [...used].sort((a, b) => a - b)) keep[v] = nK++;
const JNT = new Uint8Array(nK * 4), WGT = new Uint8Array(nK * 4);
let nRigid = 0;
for (let v = 0; v < nV; v++) {
  const k = keep[v]; if (k < 0) continue;
  const e = vIsl[v] >= 0 ? islC.get(vIsl[v]) : null;
  const w = e && e.rigid ? (nRigid++, e.rigid) : weights(V3().fromArray(POS, v * 3));
  const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4), s = top.reduce((a, x) => a + x[1], 0);
  const q = top.map(x => Math.round(x[1] / s * 255)); q[0] += 255 - q.reduce((a, b) => a + b, 0);
  top.forEach(([b], c) => { JNT[k * 4 + c] = b; WGT[k * 4 + c] = q[c]; });
}
console.log(`Malla de un brazo: ${nK} vértices, ${prims.reduce((a, p) => a + p.ix.length / 3, 0)} triángulos; ${nRigid} vértices en placas rígidas; ${bones.length} huesos`);

/* ---------- 7. GLB: brazo izquierdo y su espejo (derecho), en metros ---------- */
const pad4 = n => (4 - n % 4) % 4, chunks = [], bufferViews = [], accessors = []; let off = 0;
function addView(arr, target, stride) {
  const pad = pad4(off); if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}), ...(stride ? { byteStride: stride } : {}) });
  chunks.push(b); off += b.length; return bufferViews.length - 1;
}
function addAcc(arr, ct, type, count, extra = {}) { accessors.push({ bufferView: addView(arr, extra.target, extra.stride), componentType: ct, type, count, ...(extra.acc || {}) }); return accessors.length - 1; }
const nodes = [{ name: 'Jinete', children: [] }], meshesOut = [], skins = [];
const toM = (p, sx) => [p.x * SCALE * sx, p.y * SCALE, p.z * SCALE];
const vec = (p, sx) => [p.x * sx, p.y, p.z];
for (const [side, sx] of [['izq', 1], ['der', -1]]) {
  const pos = new Float32Array(nK * 3), nor = new Int8Array(nK * 4), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let v = 0; v < nV; v++) {
    const k = keep[v]; if (k < 0) continue;
    const x = [POS[v * 3] * SCALE * sx, POS[v * 3 + 1] * SCALE, POS[v * 3 + 2] * SCALE];
    for (let c = 0; c < 3; c++) { pos[k * 3 + c] = x[c]; mn[c] = Math.min(mn[c], x[c]); mx[c] = Math.max(mx[c], x[c]); }
    nor[k * 4] = Math.round(NOR[v * 3] * sx * 127); nor[k * 4 + 1] = Math.round(NOR[v * 3 + 1] * 127); nor[k * 4 + 2] = Math.round(NOR[v * 3 + 2] * 127);
  }
  const aPos = addAcc(pos, 5126, 'VEC3', nK, { target: 34962, acc: { min: mn, max: mx } });
  const aNor = addAcc(nor, 5120, 'VEC3', nK, { target: 34962, stride: 4, acc: { normalized: true } });
  const aJ = addAcc(JNT.slice(), 5121, 'VEC4', nK, { target: 34962 }), aW = addAcc(WGT.slice(), 5121, 'VEC4', nK, { target: 34962, acc: { normalized: true } });
  const primitives = prims.map(p => {
    const ix = new Uint16Array(p.ix.length);
    for (let i = 0; i < p.ix.length; i += 3) {                  // el espejo invierte el sentido de los triángulos
      const a = keep[p.ix[i]], b = keep[p.ix[i + 1]], c = keep[p.ix[i + 2]];
      ix[i] = a; ix[i + 1] = sx > 0 ? b : c; ix[i + 2] = sx > 0 ? c : b;
    }
    return { attributes: { POSITION: aPos, NORMAL: aNor, JOINTS_0: aJ, WEIGHTS_0: aW }, indices: addAcc(ix, 5123, 'SCALAR', ix.length, { target: 34963 }), material: p.m };
  });
  // huesos: sin giro en reposo, solo traslación respecto al padre
  const base = nodes.length;
  bones.forEach(b => {
    const pw = toM(b.pos, sx), pp = b.parent < 0 ? [0, 0, 0] : toM(bones[b.parent].pos, sx);
    nodes.push({ name: b.name + '_' + side, translation: [pw[0] - pp[0], pw[1] - pp[1], pw[2] - pp[2]] });
  });
  bones.forEach((b, i) => { const par = b.parent < 0 ? nodes[0] : nodes[base + b.parent]; (par.children = par.children || []).push(base + i); });
  const ibm = new Float32Array(bones.length * 16);
  bones.forEach((b, i) => { const p = toM(b.pos, sx); new THREE.Matrix4().makeTranslation(-p[0], -p[1], -p[2]).toArray(ibm, i * 16); });
  skins.push({ name: 'piel_' + side, joints: bones.map((_, i) => base + i), inverseBindMatrices: addAcc(ibm, 5126, 'MAT4', bones.length) });
  meshesOut.push({ name: 'brazo_' + side, primitives });
  // datos para el juego (ejes en el espacio del brazo): mano (a lo largo, pulgar, palma) y ejes de flexión de dedos y pulgar.
  // En el espejo un eje de giro cambia de signo, para que el mismo ángulo siga cerrando la mano.
  const ax = v => vec(v, sx).map(x => x * sx);
  nodes.push({ name: 'brazo_' + side, mesh: meshesOut.length - 1, skin: skins.length - 1,
    extras: { lado: side, manoDir: vec(HD, sx), manoPulgar: vec(HT, sx), manoPalma: vec(HP, sx), ejeDedos: ax(HT.clone().negate()), ejePulgar: ax(HD), escala: SCALE } });
  nodes[0].children.push(nodes.length - 1);
}
const COLORS = { cuero: [0.13, 0.085, 0.06, 0, 0.72], malla: [0.32, 0.33, 0.35, 0.8, 0.5], tela: [0.18, 0.06, 0.05, 0, 0.9], acero: [0.62, 0.63, 0.66, 0.9, 0.34] };
const materials = MATS.map(([n]) => { const c = COLORS[n]; return { name: n, pbrMetallicRoughness: { baseColorFactor: [c[0], c[1], c[2], 1], metallicFactor: c[3], roughnessFactor: c[4] } }; });
const gltf = {
  asset: { version: '2.0', generator: 'preparar_brazos.mjs (Sky Apex) desde ' + String(opt.fbx).split(/[\\/]/).pop() },
  extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
  scene: 0, scenes: [{ nodes: [0] }], nodes, meshes: meshesOut, skins, materials, accessors, bufferViews, buffers: [{ byteLength: 0 }]
};
const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(off))]); gltf.buffers[0].byteLength = bin.length;
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const head = Buffer.alloc(12); head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(opt.salida, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
console.log(`Guardado ${opt.salida}: ${(fs.statSync(opt.salida).size / 1e6).toFixed(2)} MB`);
