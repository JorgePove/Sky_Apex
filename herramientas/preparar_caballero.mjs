/* Caballero completo («Knighty») para la 3ª persona y la pantalla «Elige tu dragón». El FBX no trae esqueleto, UV ni materiales:
   - lee el FBX (fbx_node.mjs), todas las piezas (también espadas y piezas de la espalda),
   - crea un esqueleto sencillo en la pose A del modelo: pelvis, columna, pecho, cuello, cabeza; brazo, antebrazo y mano; muslo, pierna y pie
     (huesos sin giro en reposo: el juego los coloca sentado o de pie),
   - pesos por zonas: brazos por la distancia a la cadena hombro-codo-muñeca (como preparar_brazos.mjs), piernas por debajo de la cadera,
     el resto por la altura a lo largo del tronco; las islas pequeñas (placas de armadura) van rígidas con los pesos de su centro;
     las telas centrales (faldón delantero y trasero) van con la pelvis,
   - reduce la malla con meshoptimizer por material y la escala para que mida ALTO metros, con los pies en el suelo (y = 0),
   - escribe un GLB con una malla con piel y, en extras, puntos útiles (ojos, asiento) en metros.
   Uso: node preparar_caballero.mjs --fbx ../Knighty.fbx --salida ../modelos/caballero.glb [--alto 1.9] [--ratio 0.035] */
import fs from 'fs';
import { MeshoptSimplifier } from 'meshoptimizer';
import { loadFBX, THREE } from './fbx_node.mjs';

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, ''), next = argv[i + 1];
  opt[k] = next !== undefined && !next.startsWith('--') ? (i++, next) : true;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ALTO = +(opt.alto || 1.9), RATIO = +(opt.ratio || 0.035);

/* ---------- Articulaciones (unidades del modelo ×50; el modelo mira hacia +Z y su izquierda es +X). Medidas con cortes por alturas ---------- */
const Y_SUELO = -228, Y_TOPE = 326;                        // pies y cimera (sin la espada de la espalda)
const SCALE = ALTO / (Y_TOPE - Y_SUELO);
const J = {
  pelvis: V3(0, -55, 22), columna: V3(0, 40, 25), pecho: V3(0, 150, 25), cuello: V3(0, 238, 20), cabeza: V3(0, 256, 22),
  hombro: V3(66, 208, 14), codo: V3(123, 170, 17), muneca: V3(161, 129, 34), punta: V3(183, 88, 40),
  cadera: V3(40, -65, 18), rodilla: V3(46, -135, 16), tobillo: V3(46, -193, 16)
};
const OJOS = V3(0, 292, 46), ASIENTO = V3(0, -98, 14);     // ojos (dentro del yelmo, delante) y la base del asiento (debajo de la pelvis)
const MATS = [['cuero', /^Knighty$|^Merged_cloth41_0[12]$/], ['malla', /^6955555/], ['tela', /^Merged_cloth3[67]$/], ['acero', /./]];
const PELVIS_ONLY = /^Merged_cloth50$|^Pm3d_cube3d1_44$|^Pm3d_cube3d1_51$/;   // faldón trasero y espada del costado: con la pelvis
const LAP = /^xcxczxcxvxcv$/;                                // faldón delantero: entre los dos muslos (al sentarse cae sobre el regazo)
const CHEST_ONLY = /^Merged_cloth41_0[6789]$|^Merged_pm3d_cube3d1_4[01]$/;                     // espada y piezas de la espalda: con el pecho

/* ---------- Huesos ---------- */
const bones = [];
const addBone = (name, parent, pos) => (bones.push({ name, parent, pos }), bones.length - 1);
const mir = p => V3(-p.x, p.y, p.z);
const bPel = addBone('pelvis', -1, J.pelvis), bCol = addBone('columna', bPel, J.columna), bPec = addBone('pecho', bCol, J.pecho);
const bCue = addBone('cuello', bPec, J.cuello), bCab = addBone('cabeza', bCue, J.cabeza);
const side = {};
for (const [s, f] of [['l', p => p.clone()], ['r', mir]]) {
  const up = addBone('brazo_' + s, bPec, f(J.hombro)), fo = addBone('antebrazo_' + s, up, f(J.codo)), ha = addBone('mano_' + s, fo, f(J.muneca));
  const th = addBone('muslo_' + s, bPel, f(J.cadera)), sh = addBone('pierna_' + s, th, f(J.rodilla)), ft = addBone('pie_' + s, sh, f(J.tobillo));
  side[s] = { up, fo, ha, th, sh, ft };
}

/* ---------- Pesos ---------- */
const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const segs = [[J.hombro, J.codo, 30], [J.codo, J.muneca, 27], [J.muneca, J.punta, 26]];
const _d = V3(), _w = V3();
function armDist(p) {                                       // distancia relativa (÷ radio) a la cadena del brazo izquierdo
  let best = Infinity;
  segs.forEach(([a, b, r], i) => {
    _d.subVectors(b, a); const L2 = _d.lengthSq(), t = _w.subVectors(p, a).dot(_d) / L2;
    const tc = Math.min(Math.max(t, i === 0 ? 0.05 : 0), i === 2 ? 1.2 : 1);
    best = Math.min(best, _w.subVectors(p, a).addScaledVector(_d, -tc).length() / r);
  });
  return best;
}
const dU = V3().subVectors(J.codo, J.hombro).normalize(), dF = V3().subVectors(J.muneca, J.codo).normalize(), dH = V3().subVectors(J.punta, J.muneca).normalize();
const nElbow = dU.clone().add(dF).normalize(), nWrist = dF.clone().add(dH).normalize();
function weights(p0, meshName) {
  const w = new Map(), add = (b, x) => { if (x > 1e-4) w.set(b, (w.get(b) || 0) + x); };
  if (PELVIS_ONLY.test(meshName)) { add(bPel, 1); return w; }
  if (CHEST_ONLY.test(meshName)) { add(bPec, 1); return w; }
  const s = p0.x >= 0 ? 'l' : 'r', S = side[s], p = V3(Math.abs(p0.x), p0.y, p0.z);   // el lado derecho se pesa como el izquierdo reflejado
  // brazo
  const ad = armDist(p), armK = (1 - smooth(0.85, 1.25, ad)) * smooth(46, 60, p.x) * smooth(-40, 20, p.y);
  // pierna; entre las piernas (malla y faldón delantero), a medias entre los dos muslos
  const low = 1 - smooth(-78, -48, p.y), sideK = LAP.test(meshName) ? 0 : smooth(5, 16, p.x);
  const legK = (1 - armK) * low * sideK, midK = (1 - armK) * (LAP.test(meshName) ? 1 - smooth(-70, -20, p.y) : low * (1 - sideK));
  if (midK > 1e-4) {
    const kn = 1 - smooth(-145, -125, p.y), top = smooth(-75, -45, p.y);
    for (const T of [side.l, side.r]) { add(bPel, midK * 0.5 * top); add(T.th, midK * 0.5 * (1 - top) * (1 - kn)); add(T.sh, midK * 0.5 * (1 - top) * kn); }
  }
  // tronco: pelvis → columna → pecho → cuello → cabeza
  const rest = 1 - armK - legK - midK;
  if (rest > 1e-4) {
    const k1 = smooth(-35, 15, p.y), k2 = smooth(75, 125, p.y), k3 = smooth(230, 242, p.y), k4 = smooth(250, 262, p.y);
    add(bPel, rest * (1 - k1)); add(bCol, rest * (k1 - k2)); add(bPec, rest * (k2 - k3)); add(bCue, rest * (k3 - k4)); add(bCab, rest * k4);
  }
  if (armK > 1e-4) {
    const sE = V3().subVectors(p, J.codo).dot(nElbow), sW = V3().subVectors(p, J.muneca).dot(nWrist);
    const fore = smooth(-8, 8, sE), hnd = fore * smooth(-4, 4, sW);
    // la hombrera (entre el pecho y el hombro) se reparte entre el pecho y el brazo
    const t = V3().subVectors(p, J.hombro).dot(dU) / J.codo.distanceTo(J.hombro), sh = smooth(-0.35, 0.15, t);
    add(bPec, armK * (1 - fore) * (1 - sh)); add(S.up, armK * (1 - fore) * sh); add(S.fo, armK * (fore - hnd)); add(S.ha, armK * hnd);
  }
  if (legK > 1e-4) {
    const top = smooth(-78, -60, p.y);                        // lo más alto del muslo aún con la pelvis
    const kn = 1 - smooth(-145, -125, p.y), an = 1 - smooth(-202, -186, p.y);
    add(bPel, legK * top); add(S.th, legK * (1 - top) * (1 - kn)); add(S.sh, legK * (1 - top) * (kn - an)); add(S.ft, legK * (1 - top) * an);
  }
  return w;
}

/* ---------- 1. FBX → triángulos con isla y material ---------- */
let t0 = Date.now();
const root = loadFBX(opt.fbx); root.updateMatrixWorld(true);
const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
console.log(`FBX leído en ${Date.now() - t0} ms: ${meshes.length} mallas`);
const P = [], N = [], CAT = [], ISL = [], MESH = [], islands = [];   // islands[id] = { name, min, max, s, n }
const v = V3();
for (const m of meshes) {
  const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, mw = m.matrixWorld;
  const nm = new THREE.Matrix3().getNormalMatrix(mw), n = pos.count, nt = n / 3;
  const W = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mw); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z; }
  // islas: soldar por posición y unir triángulos conectados
  const key = new Map(), vid = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.round(W[i * 3] * 200) + ',' + Math.round(W[i * 3 + 1] * 200) + ',' + Math.round(W[i * 3 + 2] * 200);
    let id = key.get(k); if (id === undefined) { id = key.size; key.set(k, id); } vid[i] = id;
  }
  const par = new Int32Array(key.size).map((_, i) => i);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nt; t++) { const a = find(vid[t * 3]), b = find(vid[t * 3 + 1]), c = find(vid[t * 3 + 2]); par[b] = a; par[find(c)] = a; }
  const islOf = new Map(), cat = MATS.findIndex(([, re]) => re.test(m.name));
  for (let t = 0; t < nt; t++) {
    const r = find(vid[t * 3]); let id = islOf.get(r);
    if (id === undefined) { id = islands.length; islOf.set(r, id); islands.push({ name: m.name, min: V3(Infinity, Infinity, Infinity), max: V3(-Infinity, -Infinity, -Infinity), s: V3(), n: 0 }); }
    const I = islands[id];
    for (let c = 0; c < 3; c++) {
      const i = t * 3 + c; v.fromArray(W, i * 3); I.min.min(v); I.max.max(v); I.s.add(v); I.n++;
      P.push(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
      CAT.push(cat); ISL.push(id);
    }
  }
}
console.log(`${P.length / 9} triángulos en ${islands.length} islas`);

/* ---------- 2. Soldar, reducir por material y pesar ---------- */
// se suelda solo por posición (y material): si se separaran las normales, cada arista viva sería un borde y el simplificador no podría
// reducir; las normales se promedian (a esta distancia, las aristas suaves no se notan)
await MeshoptSimplifier.ready;
const keyMap = new Map(), vPos = [], vNor = [], vIsl = [], idxByCat = MATS.map(() => []);
for (let i = 0; i < P.length / 3; i++) {
  const k = [Math.round(P[i * 3] * 20), Math.round(P[i * 3 + 1] * 20), Math.round(P[i * 3 + 2] * 20), CAT[i]].join(',');
  let id = keyMap.get(k);
  if (id === undefined) { id = vPos.length / 3; keyMap.set(k, id); vPos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); vNor.push(0, 0, 0); vIsl.push(ISL[i]); }
  vNor[id * 3] += N[i * 3]; vNor[id * 3 + 1] += N[i * 3 + 1]; vNor[id * 3 + 2] += N[i * 3 + 2];
  idxByCat[CAT[i]].push(id);
}
for (let i = 0; i < vNor.length; i += 3) { const l = Math.hypot(vNor[i], vNor[i + 1], vNor[i + 2]) || 1; vNor[i] /= l; vNor[i + 1] /= l; vNor[i + 2] /= l; }
const POS = new Float32Array(vPos), NOR = new Float32Array(vNor), nV = POS.length / 3;
const CAT_RATIO = { malla: RATIO * 0.3, tela: RATIO * 0.6 };
const prims = [];
idxByCat.forEach((ix, m) => {
  if (!ix.length) return;
  const name = MATS[m][0], r = CAT_RATIO[name] ?? RATIO, src = new Uint32Array(ix);
  const target = Math.floor(src.length * r / 3) * 3;
  const [out, err] = MeshoptSimplifier.simplifyWithAttributes(src, POS, 3, NOR, 3, [0.3, 0.3, 0.3], null, target, 0.2, []);
  console.log(`${name}: ${src.length / 3} → ${out.length / 3} triángulos (error ${err.toFixed(4)})`);
  prims.push({ m, ix: out });
});
for (const I of islands) { I.c = I.s.clone().multiplyScalar(1 / I.n); I.rigid = I.max.distanceTo(I.min) < 26 ? weights(I.c, I.name) : null; }
const used = new Set(); for (const p of prims) for (const i of p.ix) used.add(i);
const keep = new Int32Array(nV).fill(-1); let nK = 0; for (const vv of [...used].sort((a, b) => a - b)) keep[vv] = nK++;
const JNT = new Uint8Array(nK * 4), WGT = new Uint8Array(nK * 4);
let nRigid = 0;
for (let i = 0; i < nV; i++) {
  const k = keep[i]; if (k < 0) continue;
  const I = islands[vIsl[i]];
  const w = I.rigid ? (nRigid++, I.rigid) : weights(V3().fromArray(POS, i * 3), I.name);
  const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4), s = top.reduce((a, x) => a + x[1], 0);
  const q = top.map(x => Math.round(x[1] / s * 255)); q[0] += 255 - q.reduce((a, b) => a + b, 0);
  top.forEach(([b], c) => { JNT[k * 4 + c] = b; WGT[k * 4 + c] = q[c]; });
}
console.log(`Caballero: ${nK} vértices, ${prims.reduce((a, p) => a + p.ix.length / 3, 0)} triángulos; ${nRigid} vértices en piezas rígidas; ${bones.length} huesos`);

/* ---------- 3. GLB en metros, pies en y = 0 ---------- */
const toM = p => [p.x * SCALE, (p.y - Y_SUELO) * SCALE, p.z * SCALE];
const pad4 = n => (4 - n % 4) % 4, chunks = [], bufferViews = [], accessors = []; let off = 0;
function addView(arr, target, stride) {
  const pad = pad4(off); if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}), ...(stride ? { byteStride: stride } : {}) });
  chunks.push(b); off += b.length; return bufferViews.length - 1;
}
function addAcc(arr, ct, type, count, extra = {}) { accessors.push({ bufferView: addView(arr, extra.target, extra.stride), componentType: ct, type, count, ...(extra.acc || {}) }); return accessors.length - 1; }
const pos = new Float32Array(nK * 3), nor = new Int8Array(nK * 4), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < nV; i++) {
  const k = keep[i]; if (k < 0) continue;
  const x = toM(V3().fromArray(POS, i * 3));
  for (let c = 0; c < 3; c++) { pos[k * 3 + c] = x[c]; mn[c] = Math.min(mn[c], x[c]); mx[c] = Math.max(mx[c], x[c]); }
  for (let c = 0; c < 3; c++) nor[k * 4 + c] = Math.round(NOR[i * 3 + c] * 127);
}
const aPos = addAcc(pos, 5126, 'VEC3', nK, { target: 34962, acc: { min: mn, max: mx } });
const aNor = addAcc(nor, 5120, 'VEC3', nK, { target: 34962, stride: 4, acc: { normalized: true } });
const aJ = addAcc(JNT, 5121, 'VEC4', nK, { target: 34962 }), aW = addAcc(WGT, 5121, 'VEC4', nK, { target: 34962, acc: { normalized: true } });
const primitives = prims.map(p => {
  const ix = new Uint16Array(p.ix.length); for (let i = 0; i < p.ix.length; i++) ix[i] = keep[p.ix[i]];
  return { attributes: { POSITION: aPos, NORMAL: aNor, JOINTS_0: aJ, WEIGHTS_0: aW }, indices: addAcc(ix, 5123, 'SCALAR', ix.length, { target: 34963 }), material: p.m };
});
if (nK > 65535) throw new Error('Demasiados vértices para índices de 16 bits: baja --ratio');
const nodes = [{ name: 'Caballero', children: [] }];
const base = nodes.length;
bones.forEach(b => {
  const pw = toM(b.pos), pp = b.parent < 0 ? [0, 0, 0] : toM(bones[b.parent].pos);
  nodes.push({ name: b.name, translation: [pw[0] - pp[0], pw[1] - pp[1], pw[2] - pp[2]] });
});
bones.forEach((b, i) => { const par = b.parent < 0 ? nodes[0] : nodes[base + b.parent]; (par.children = par.children || []).push(base + i); });
const ibm = new Float32Array(bones.length * 16);
bones.forEach((b, i) => { const p = toM(b.pos); new THREE.Matrix4().makeTranslation(-p[0], -p[1], -p[2]).toArray(ibm, i * 16); });
const skins = [{ name: 'piel', joints: bones.map((_, i) => base + i), inverseBindMatrices: addAcc(ibm, 5126, 'MAT4', bones.length) }];
nodes.push({ name: 'cuerpo', mesh: 0, skin: 0, extras: { ojos: toM(OJOS), asiento: toM(ASIENTO), alto: ALTO } });
nodes[0].children.push(nodes.length - 1);
const COLORS = { cuero: [0.13, 0.085, 0.06, 0, 0.72], malla: [0.32, 0.33, 0.35, 0.8, 0.5], tela: [0.18, 0.06, 0.05, 0, 0.9], acero: [0.62, 0.63, 0.66, 0.9, 0.34] };
const materials = MATS.map(([n]) => { const c = COLORS[n]; return { name: n, pbrMetallicRoughness: { baseColorFactor: [c[0], c[1], c[2], 1], metallicFactor: c[3], roughnessFactor: c[4] } }; });
const gltf = {
  asset: { version: '2.0', generator: 'preparar_caballero.mjs (Sky Apex) desde ' + String(opt.fbx).split(/[\\/]/).pop() },
  extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
  scene: 0, scenes: [{ nodes: [0] }], nodes, meshes: [{ name: 'caballero', primitives }], skins, materials, accessors, bufferViews, buffers: [{ byteLength: 0 }]
};
const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(off))]); gltf.buffers[0].byteLength = bin.length;
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const head = Buffer.alloc(12); head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(opt.salida, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
console.log(`Guardado ${opt.salida}: ${(fs.statSync(opt.salida).size / 1e6).toFixed(2)} MB · escala ${SCALE.toFixed(5)} m/unidad`);
