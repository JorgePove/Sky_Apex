/* Prepara red_dragon.glb («Red Dragon» de GadgetHamster en Sketchfab, licencia CC-BY 4.0) para Sky Apex (v16), sin Blender:
   - texturas de 4096 px en PNG → JPEG más pequeños (color y relieve a 2048, oclusión/rugosidad y brillo a 1024),
   - fuera las UV que no usa ningún material (TEXCOORD_1-3) y las 9 «animaciones» (poses sueltas de un fotograma); v17: salvo «ref»
     (de pie a cuatro patas, alas medio alzadas), que se guarda como el clip «pie» para «Elige tu dragón» (--pose ref --como pie),
   - reengancha los huesos que en Blender movía un IK: la mano del ala, las manos y los pies colgaban de la raíz (Origin) y no seguían
     al brazo. Pasan a colgar de su hueso anterior (lowerWing, forearm, ankle) conservando la pose: así el ala entera sigue al brazo.
   En el juego vuela con las animaciones del Tyrant, copiadas hueso a hueso (ver 09b_dragones.js).
   Uso (desde herramientas/): node preparar_dragon_rojo.mjs --entrada ../red_dragon.glb --salida ../modelos/dragon_rojo.glb */
import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import * as THREE from 'three';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const IN = arg('entrada', '../red_dragon.glb'), OUT = arg('salida', '../modelos/dragon_rojo.glb');
const REPARENT = [['wingHand.L', 'lowerWing.L'], ['wingHand.R', 'lowerWing.R'], ['hand.L', 'forearm.L'], ['hand.R', 'forearm.R'], ['foot.L', 'ankle.L'], ['foot.R', 'ankle.R']];

/* ---------- 1. leer ---------- */
const src = fs.readFileSync(IN), jl = src.readUInt32LE(12), J = JSON.parse(src.slice(20, 20 + jl).toString('utf8'));
const binStart = 20 + jl + 8, BIN = src.slice(binStart);
const viewBytes = i => { const v = J.bufferViews[i]; return BIN.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };
const readAcc = i => {                                       // un accesor de floats (las animaciones del original)
  const a = J.accessors[i], v = J.bufferViews[a.bufferView], n = a.count * ({ SCALAR: 1, VEC3: 3, VEC4: 4 })[a.type], off = (v.byteOffset || 0) + (a.byteOffset || 0);
  if (a.componentType !== 5126) throw new Error('Accesor ' + i + ' no es de floats');
  return new Float32Array(BIN.buffer.slice(BIN.byteOffset + off, BIN.byteOffset + off + n * 4));
};

const byName = n => J.nodes.findIndex(x => x.name && x.name.replace(/_\d+$/, '') === n);
const parentOf = new Map(); J.nodes.forEach((n, i) => (n.children || []).forEach(c => parentOf.set(c, i)));
const trsM = (t, r, s) => new THREE.Matrix4().compose(new THREE.Vector3().fromArray(t || [0, 0, 0]), new THREE.Quaternion().fromArray(r || [0, 0, 0, 1]), new THREE.Vector3().fromArray(s || [1, 1, 1]));
const localM = i => { const n = J.nodes[i]; return n.matrix ? new THREE.Matrix4().fromArray(n.matrix) : trsM(n.translation, n.rotation, n.scale); };
const worldM = i => { const m = localM(i); for (let p = parentOf.get(i); p != null; p = parentOf.get(p)) m.premultiply(localM(p)); return m; };

/* ---------- 2a. v17: la pose de pie («ref» en el original: a cuatro patas, alas medio alzadas), en el mundo, antes de reenganchar ---------- */
const POSE = arg('pose', 'ref'), POSE_AS = arg('como', 'pie');
const poseAnim = (J.animations || []).find(a => a.name.split('|').pop() === POSE);
let poseWorld = null;
if (poseAnim) {
  const loc = J.nodes.map((n, i) => n.matrix ? null : { t: n.translation, r: n.rotation, s: n.scale });
  for (const ch of poseAnim.channels) {
    const v = Array.from(readAcc(poseAnim.samplers[ch.sampler].output).slice(0, ch.target.path === 'rotation' ? 4 : 3)), L = loc[ch.target.node];
    if (L) L[{ translation: 't', rotation: 'r', scale: 's' }[ch.target.path]] = v;
  }
  const wm = new Map(), W = i => { if (wm.has(i)) return wm.get(i); const m = loc[i] ? trsM(loc[i].t, loc[i].r, loc[i].s) : localM(i), p = parentOf.get(i); if (p != null) m.premultiply(W(p)); wm.set(i, m); return m; };
  poseWorld = J.nodes.map((n, i) => W(i));
  console.log(`Pose «${POSE}» leída (${poseAnim.channels.length} canales): se guarda como el clip «${POSE_AS}»`);
} else console.warn(`No hay ninguna animación «${POSE}»: sin pose de pie`);

/* ---------- 2. reenganchar huesos (mismo lugar en el mundo, nuevo padre) ---------- */
for (const [cn, pn] of REPARENT) {
  const c = byName(cn), p = byName(pn);
  if (c < 0 || p < 0) { console.warn('No encuentro', cn, 'o', pn); continue; }
  const old = parentOf.get(c);
  if (old === p) continue;
  const local = new THREE.Matrix4().copy(worldM(p)).invert().multiply(worldM(c));
  const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); local.decompose(t, q, s);
  const n = J.nodes[c]; delete n.matrix; n.translation = t.toArray(); n.rotation = q.toArray(); n.scale = s.toArray();
  J.nodes[old].children = J.nodes[old].children.filter(x => x !== c); if (!J.nodes[old].children.length) delete J.nodes[old].children;
  (J.nodes[p].children = J.nodes[p].children || []).push(c); parentOf.set(c, p);
  console.log(`${cn}: de ${J.nodes[old].name} a ${J.nodes[p].name}`);
}

/* ---------- 3. texturas más pequeñas, en JPEG ---------- */
const SIZE = { baseColor: 2048, normal: 2048, orm: 1024, emissive: 1024 }, QUAL = { baseColor: 88, normal: 92, orm: 85, emissive: 85 };
const mat = J.materials[0], texSrc = i => J.textures[i].source;
const role = {}; role[texSrc(mat.pbrMetallicRoughness.baseColorTexture.index)] = 'baseColor'; role[texSrc(mat.normalTexture.index)] = 'normal';
role[texSrc(mat.pbrMetallicRoughness.metallicRoughnessTexture.index)] = 'orm'; if (mat.emissiveTexture) role[texSrc(mat.emissiveTexture.index)] = 'emissive';
const newImages = J.images.map((im, i) => {
  const png = PNG.sync.read(viewBytes(im.bufferView)), R = SIZE[role[i]] || 1024, f = png.width / R, out = new Uint8Array(R * R * 4);
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
    let a = 0, b = 0, c = 0, n = 0;
    for (let yy = Math.floor(y * f); yy < Math.floor((y + 1) * f); yy++) for (let xx = Math.floor(x * f); xx < Math.floor((x + 1) * f); xx++) { const o = (yy * png.width + xx) * 4; a += png.data[o]; b += png.data[o + 1]; c += png.data[o + 2]; n++; }
    const o = (y * R + x) * 4; out[o] = a / n; out[o + 1] = b / n; out[o + 2] = c / n; out[o + 3] = 255;
  }
  const jpg = Buffer.from(jpeg.encode({ data: out, width: R, height: R }, QUAL[role[i]] || 85).data);
  console.log(`Textura ${i} (${role[i]}): ${png.width} → ${R} px, ${(viewBytes(im.bufferView).length / 1e6).toFixed(1)} → ${(jpg.length / 1e6).toFixed(2)} MB`);
  return jpg;
});

/* ---------- 4. fuera UV sobrantes y animaciones; nuevo búfer solo con lo que se usa ---------- */
for (const m of J.meshes) for (const p of m.primitives) for (const k of Object.keys(p.attributes)) if (/^TEXCOORD_[1-9]/.test(k)) delete p.attributes[k];
delete J.animations;
const usedAcc = new Set();
for (const m of J.meshes) for (const p of m.primitives) { Object.values(p.attributes).forEach(a => usedAcc.add(a)); if (p.indices != null) usedAcc.add(p.indices); }
for (const s of J.skins || []) if (s.inverseBindMatrices != null) usedAcc.add(s.inverseBindMatrices);
const accMap = new Map(), viewMap = new Map(), accessors = [], bufferViews = [], chunks = []; let off = 0;
const pad4 = n => (4 - n % 4) % 4;
function pushView(bytes, base) {
  const pad = pad4(off); if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  bufferViews.push(Object.assign({}, base || {}, { buffer: 0, byteOffset: off, byteLength: bytes.length })); chunks.push(bytes); off += bytes.length;
  return bufferViews.length - 1;
}
[...usedAcc].sort((a, b) => a - b).forEach(ai => {
  const a = J.accessors[ai];
  if (!viewMap.has(a.bufferView)) { const v = J.bufferViews[a.bufferView], base = {}; if (v.byteStride) base.byteStride = v.byteStride; if (v.target) base.target = v.target; viewMap.set(a.bufferView, pushView(viewBytes(a.bufferView), base)); }
  accMap.set(ai, accessors.length); accessors.push(Object.assign({}, a, { bufferView: viewMap.get(a.bufferView) }));
});
for (const m of J.meshes) for (const p of m.primitives) { for (const k in p.attributes) p.attributes[k] = accMap.get(p.attributes[k]); if (p.indices != null) p.indices = accMap.get(p.indices); }
for (const s of J.skins || []) if (s.inverseBindMatrices != null) s.inverseBindMatrices = accMap.get(s.inverseBindMatrices);
J.images = newImages.map(b => ({ mimeType: 'image/jpeg', bufferView: pushView(b) }));
// v17: la pose de pie como un clip de un fotograma (dos llaves iguales), ya en la jerarquía reenganchada: local = mundo(padre)⁻¹ · mundo
if (poseWorld) {
  const joints = [...new Set((J.skins || []).flatMap(s => s.joints))], samplers = [], channels = [];
  const addAcc = (arr, type, extra) => { accessors.push(Object.assign({ bufferView: pushView(Buffer.from(arr.buffer)), componentType: 5126, type, count: arr.length / ({ SCALAR: 1, VEC3: 3, VEC4: 4 })[type] }, extra || {})); return accessors.length - 1; };
  const tAcc = addAcc(new Float32Array([0, 1]), 'SCALAR', { min: [0], max: [1] });
  const isJoint = new Set(joints);
  for (const j of joints) {                                  // (si el padre no es un hueso, el clip no lo mueve: queda en su pose de siempre)
    const p = parentOf.get(j), pw = p == null ? null : isJoint.has(p) ? poseWorld[p] : worldM(p);
    const m = pw ? new THREE.Matrix4().copy(pw).invert().multiply(poseWorld[j]) : poseWorld[j].clone();
    const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(t, q, s);
    samplers.push({ input: tAcc, output: addAcc(new Float32Array([...q.toArray(), ...q.toArray()]), 'VEC4'), interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: j, path: 'rotation' } });
    samplers.push({ input: tAcc, output: addAcc(new Float32Array([...t.toArray(), ...t.toArray()]), 'VEC3'), interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: j, path: 'translation' } });
  }
  J.animations = [{ name: POSE_AS, samplers, channels }];
}
J.accessors = accessors; J.bufferViews = bufferViews;
J.asset = Object.assign({}, J.asset, { generator: 'preparar_dragon_rojo.mjs (Sky Apex) desde ' + IN.split(/[\\/]/).pop() });
const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(off))]); J.buffers = [{ byteLength: bin.length }];

/* ---------- 5. escribir ---------- */
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const head = Buffer.alloc(12); head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(OUT, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
console.log(`Guardado ${OUT}: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB (antes ${(src.length / 1e6).toFixed(1)} MB)`);
