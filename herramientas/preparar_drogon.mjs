/* Convierte Drogon (Dragon.fbx del pack «Drogon») en un GLB ligero para Sky Apex (v16), sin Blender. Es preparar_fbx.mjs adaptado:
   - lee el FBX con el FBXLoader de three.js en Node (fbx_node.mjs; tarda ~1 min),
   - suelda e indexa la malla (39 000 triángulos: no se reduce),
   - junta las dos texturas (una por material: cuerpo y cabeza) en un atlas de dos casillas, una al lado de la otra,
   - deja en la piel solo los huesos que deforman,
   - guarda algunos clips propios (--clip nombre=texto del nombre en el FBX), quitando las pistas que no se mueven.
   El modelo ya viene con Y arriba y la cabeza hacia +Z (como el Tyrant tras su corrección): no se gira. Está en centímetros (el juego lo
   escala por la envergadura). En el juego vuela con las animaciones del Tyrant, copiadas hueso a hueso (ver 09b_dragones.js).
   Uso (desde herramientas/):
     node preparar_drogon.mjs --fbx ../Drogon/Drogon/Dragon.fbx --texturas ../Drogon/Drogon/textures/T_DaenerysDragon_Body_D.png,../Drogon/Drogon/textures/T_DaenerysDragon_Head_D.png
       --tile 1536 --clip reposo=AA_DaenerysDragon_Battle_Stand --clip rugido=Neutural_Roar --clip cielo=Battle_SkyMoveL --fps 15 --salida ../modelos/drogon_web.glb */
import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { loadFBX, THREE } from './fbx_node.mjs';

const argv = process.argv.slice(2), opt = {}, clipsWanted = [];
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, ''), next = argv[i + 1];
  const v = next !== undefined && !next.startsWith('--') ? (i++, next) : true;
  if (k === 'clip') { const j = v.indexOf('='); clipsWanted.push([v.slice(0, j), v.slice(j + 1)]); } else opt[k] = v;
}
const TILE = +(opt.tile || 1536), FPS = +(opt.fps || 15), Q = +(opt.calidad || 86);
const TEX = String(opt.texturas).split(',');                // una por material, en el orden de los materiales del FBX

/* ---------- 1. modelo ---------- */
let t0 = Date.now();
const root = loadFBX(opt.fbx);
root.updateMatrixWorld(true);
let mesh; root.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; });
if (!mesh) throw new Error('El FBX no tiene una malla con esqueleto');
const g = mesh.geometry, mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
if (TEX.length !== mats.length) throw new Error(`Hacen falta ${mats.length} texturas (${mats.map(m => m.name).join(', ')})`);
console.log(`FBX leído en ${Date.now() - t0} ms: ${g.attributes.position.count} vértices sin indexar, materiales ${mats.map(m => m.name).join(' / ')}, ${mesh.skeleton.bones.length} huesos`);

/* ---------- 2. soldar vértices iguales (posición, normal, uv, piel y material) ---------- */
const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
const groups = g.groups.length ? g.groups : [{ start: 0, count: P.count, materialIndex: 0 }];
const matOf = new Uint8Array(P.count);
for (const gr of groups) for (let i = gr.start; i < gr.start + gr.count; i++) matOf[i] = gr.materialIndex;
const keyMap = new Map(), remapV = new Uint32Array(P.count);
const pos = [], nor = [], uv = [], ji = [], jw = [], vmat = [];
const r = (x, s) => Math.round(x * s);
let uMin = Infinity, uMax = -Infinity;
for (let i = 0; i < P.count; i++) {
  const key = [r(P.getX(i), 1e3), r(P.getY(i), 1e3), r(P.getZ(i), 1e3), r(N.getX(i), 1e3), r(N.getY(i), 1e3), r(N.getZ(i), 1e3), r(U.getX(i), 1e5), r(U.getY(i), 1e5), matOf[i]].join(',');
  let k = keyMap.get(key);
  if (k === undefined) {
    k = pos.length / 3; keyMap.set(key, k);
    pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U.getX(i), U.getY(i));
    uMin = Math.min(uMin, U.getX(i), U.getY(i)); uMax = Math.max(uMax, U.getX(i), U.getY(i));
    for (let c = 0; c < 4; c++) { ji.push(SI.getComponent(i, c)); jw.push(SW.getComponent(i, c)); }
    vmat.push(matOf[i]);
  }
  remapV[i] = k;
}
const nV = pos.length / 3;
const idxBy = mats.map(() => []);
for (let i = 0; i < P.count; i++) idxBy[matOf[i]].push(remapV[i]);
console.log(`Soldado: ${nV} vértices únicos; triángulos por material: ${idxBy.map((a, m) => mats[m].name + ' ' + a.length / 3).join(', ')}; UV entre ${uMin.toFixed(3)} y ${uMax.toFixed(3)}`);

/* ---------- 3. huesos: piel solo con los que deforman ---------- */
const bones = mesh.skeleton.bones, used = new Set();
for (let v = 0; v < nV; v++) for (let c = 0; c < 4; c++) if (jw[v * 4 + c] > 0.003) used.add(ji[v * 4 + c]);
const jointList = [...used].sort((a, b) => a - b), jointPos = new Map(jointList.map((b, i) => [b, i]));
console.log(`Huesos en la piel: ${jointList.length} de ${bones.length}`);

/* ---------- 4. atlas: las texturas de los materiales, una al lado de la otra ---------- */
t0 = Date.now();
const NT = mats.length, W = NT * TILE, H = TILE, atlas = new Uint8Array(W * H * 4).fill(255);
TEX.forEach((file, k) => {
  const src = PNG.sync.read(fs.readFileSync(file)), f = src.width / TILE;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let rr = 0, gg = 0, bb = 0, n = 0;
    for (let yy = Math.floor(y * f); yy < Math.floor((y + 1) * f); yy++) for (let xx = Math.floor(x * f); xx < Math.floor((x + 1) * f); xx++) {
      const o = (yy * src.width + xx) * 4; rr += src.data[o]; gg += src.data[o + 1]; bb += src.data[o + 2]; n++;
    }
    const o = (y * W + k * TILE + x) * 4; atlas[o] = rr / n; atlas[o + 1] = gg / n; atlas[o + 2] = bb / n;
  }
});
const atlasJpg = Buffer.from(jpeg.encode({ data: atlas, width: W, height: H }, Q).data);
console.log(`Atlas ${W}×${H} (${NT} casillas de ${TILE}): ${(atlasJpg.length / 1e6).toFixed(2)} MB en ${Date.now() - t0} ms`);

/* ---------- 5. vértices finales ---------- */
const nK = nV;
const pos2 = new Float32Array(pos), nor2 = new Int8Array(nK * 4), uv2 = new Uint16Array(nK * 2), jn2 = new Uint16Array(nK * 4), wg2 = new Uint8Array(nK * 4);
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let v = 0; v < nV; v++) {
  for (let c = 0; c < 3; c++) { const x = pos2[v * 3 + c]; mn[c] = Math.min(mn[c], x); mx[c] = Math.max(mx[c], x); }
  const nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2], nl = Math.hypot(nx, ny, nz) || 1;
  nor2[v * 4] = Math.round(nx / nl * 127); nor2[v * 4 + 1] = Math.round(ny / nl * 127); nor2[v * 4 + 2] = Math.round(nz / nl * 127);
  const fu = uv[v * 2] - Math.floor(uv[v * 2]), fv = uv[v * 2 + 1] - Math.floor(uv[v * 2 + 1]);   // (por si alguna UV se sale de 0-1)
  const u = (vmat[v] + fu) / NT, w = 1 - fv;                                                    // casilla del material; v de glTF crece hacia abajo
  uv2[v * 2] = Math.round(Math.min(Math.max(u, 0), 1) * 65535); uv2[v * 2 + 1] = Math.round(Math.min(Math.max(w, 0), 1) * 65535);
  const ws = [0, 1, 2, 3].map(c => used.has(ji[v * 4 + c]) ? jw[v * 4 + c] : 0), s = ws.reduce((a, b) => a + b, 0) || 1;
  const q = ws.map(x => Math.round(x / s * 255)); q[q.indexOf(Math.max(...q))] += 255 - q.reduce((a, b) => a + b, 0);
  for (let c = 0; c < 4; c++) { jn2[v * 4 + c] = q[c] ? jointPos.get(ji[v * 4 + c]) : 0; wg2[v * 4 + c] = q[c]; }
}
const prims = idxBy.map((ix, m) => ({ m, out: nK <= 65535 ? new Uint16Array(ix) : new Uint32Array(ix) })).filter(p => p.out.length);
console.log(`Malla final: ${nK} vértices, ${prims.reduce((a, p) => a + p.out.length / 3, 0)} triángulos`);

/* ---------- 6. nodos (la malla va en la raíz de la escena, sin transformación) ---------- */
const nodes = [], nodeOf = new Map();
nodes.push({ name: 'Drogon', children: [] });
function addNode(o, parentIdx) {
  if (o.isMesh) return;
  const i = nodes.length, n = { name: o.name || 'nodo' + i };
  const p = o.position, q = o.quaternion, s = o.scale;
  if (p.lengthSq() > 0) n.translation = p.toArray();
  if (Math.abs(q.w) < 0.9999999) n.rotation = q.toArray();
  if (Math.abs(s.x - 1) + Math.abs(s.y - 1) + Math.abs(s.z - 1) > 1e-6) n.scale = s.toArray();
  nodes.push(n); nodeOf.set(o, i);
  (nodes[parentIdx].children = nodes[parentIdx].children || []).push(i);
  o.children.forEach(c => addNode(c, i));
}
root.children.forEach(c => addNode(c, 0));
const meshNode = nodes.length; nodes.push({ name: mesh.name, mesh: 0, skin: 0 });

/* ---------- 7. clips propios (remuestreados a FPS, sin las pistas quietas ni las de posición salvo la de la pelvis) ---------- */
const clips = [];
for (const [name, find] of clipsWanted) {
  const a = (root.animations || []).find(c => c.name.includes(find));
  if (!a) { console.warn(`No hay ningún clip con «${find}»`); continue; }
  const tracks = [];
  for (const tr of a.tracks) {
    const [bn, prop] = tr.name.split('.'), obj = root.getObjectByName(bn);
    if (!obj || !nodeOf.has(obj) || prop === 'scale') continue;
    if (prop === 'position' && !/Pelvis$/.test(bn)) continue;
    const size = prop === 'quaternion' ? 4 : 3, frames = tr.times.length, vals = tr.values;
    const rest = prop === 'position' ? obj.position.toArray() : obj.quaternion.toArray();
    let moves = false;
    for (let f = 0; f < frames && !moves; f++) {
      if (size === 4) { const d = Math.abs(vals[f * 4] * rest[0] + vals[f * 4 + 1] * rest[1] + vals[f * 4 + 2] * rest[2] + vals[f * 4 + 3] * rest[3]); if (1 - d > 1e-5) moves = true; }
      else for (let c = 0; c < 3; c++) if (Math.abs(vals[f * 3 + c] - rest[c]) > 0.05) moves = true;
    }
    if (!moves) continue;
    const n2 = Math.max(2, Math.round(a.duration * FPS) + 1), t2 = new Float32Array(n2), v2 = new Float32Array(n2 * size);
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    for (let j = 0, s = 0; j < n2; j++) {
      const t = Math.min(a.duration, j / FPS); t2[j] = t;
      while (s < frames - 2 && tr.times[s + 1] < t) s++;
      const f = Math.min(1, Math.max(0, (t - tr.times[s]) / Math.max(tr.times[s + 1] - tr.times[s], 1e-6)));
      if (size === 4) { qa.fromArray(vals, s * 4); qb.fromArray(vals, (s + 1) * 4); qa.slerp(qb, f).toArray(v2, j * 4); if (j && v2[j * 4] * v2[j * 4 - 4] + v2[j * 4 + 1] * v2[j * 4 - 3] + v2[j * 4 + 2] * v2[j * 4 - 2] + v2[j * 4 + 3] * v2[j * 4 - 1] < 0) for (let c = 0; c < 4; c++) v2[j * 4 + c] *= -1; }
      else for (let c = 0; c < 3; c++) v2[j * 3 + c] = vals[s * 3 + c] + (vals[(s + 1) * 3 + c] - vals[s * 3 + c]) * f;
    }
    tracks.push({ node: nodeOf.get(obj), path: size === 4 ? 'rotation' : 'translation', times: t2, values: v2 });
  }
  clips.push({ name, tracks, duration: a.duration });
  console.log(`Clip '${name}' ← ${a.name} (${a.duration.toFixed(2)} s): ${tracks.length} pistas`);
}

/* ---------- 8. GLB ---------- */
const pad4 = n => (4 - n % 4) % 4, chunks = [], bufferViews = [], accessors = []; let off = 0;
function addView(arr, target, stride) {
  const pad = pad4(off); if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}), ...(stride ? { byteStride: stride } : {}) });
  chunks.push(b); off += b.length; return bufferViews.length - 1;
}
function addAcc(arr, ct, type, count, extra = {}) { accessors.push({ bufferView: addView(arr, extra.target, extra.stride), componentType: ct, type, count, ...(extra.acc || {}) }); return accessors.length - 1; }
const ibm = new Float32Array(jointList.length * 16);
jointList.forEach((b, i) => new THREE.Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[b], mesh.bindMatrix).toArray(ibm, i * 16));
const aIBM = addAcc(ibm, 5126, 'MAT4', jointList.length);
const aPOS = addAcc(pos2, 5126, 'VEC3', nK, { target: 34962, acc: { min: mn, max: mx } });
const aNOR = addAcc(nor2, 5120, 'VEC3', nK, { target: 34962, stride: 4, acc: { normalized: true } });
const aUV = addAcc(uv2, 5123, 'VEC2', nK, { target: 34962, acc: { normalized: true } });
const aJ = addAcc(jn2, 5123, 'VEC4', nK, { target: 34962 });
const aW = addAcc(wg2, 5121, 'VEC4', nK, { target: 34962, acc: { normalized: true } });
const materials = [{ name: 'Drogon', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.72 } }];
const primitives = prims.map(p => ({ attributes: { POSITION: aPOS, NORMAL: aNOR, TEXCOORD_0: aUV, JOINTS_0: aJ, WEIGHTS_0: aW },
  indices: addAcc(p.out, p.out instanceof Uint16Array ? 5123 : 5125, 'SCALAR', p.out.length, { target: 34963 }), material: 0 }));
const timeAcc = new Map();
const animations = clips.map(c => {
  const samplers = [], channels = [];
  for (const t of c.tracks) {
    const tk = Buffer.from(t.times.buffer).toString('base64');
    if (!timeAcc.has(tk)) timeAcc.set(tk, addAcc(t.times, 5126, 'SCALAR', t.times.length, { acc: { min: [t.times[0]], max: [t.times[t.times.length - 1]] } }));
    let out;
    if (t.path === 'rotation') { const q16 = new Int16Array(t.values.length); for (let i = 0; i < q16.length; i++) q16[i] = Math.round(Math.max(-1, Math.min(1, t.values[i])) * 32767); out = addAcc(q16, 5122, 'VEC4', t.times.length, { acc: { normalized: true } }); }
    else out = addAcc(t.values, 5126, 'VEC3', t.times.length);
    samplers.push({ input: timeAcc.get(tk), output: out, interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: t.node, path: t.path } });
  }
  return { name: c.name, samplers, channels };
});
const imgView = addView(atlasJpg);
const gltf = {
  asset: { version: '2.0', generator: 'preparar_drogon.mjs (Sky Apex) desde ' + opt.fbx.split(/[\\/]/).pop() },
  extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
  scene: 0, scenes: [{ nodes: [0, meshNode] }], nodes,
  meshes: [{ name: mesh.name, primitives }],
  skins: [{ joints: jointList.map(b => nodeOf.get(bones[b])), inverseBindMatrices: aIBM }],
  materials, textures: [{ sampler: 0, source: 0 }], images: [{ mimeType: 'image/jpeg', bufferView: imgView }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  ...(animations.length ? { animations } : {}), accessors, bufferViews, buffers: [{ byteLength: 0 }]
};
const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(off))]); gltf.buffers[0].byteLength = bin.length;
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const head = Buffer.alloc(12); head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(opt.salida, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
console.log(`Guardado ${opt.salida}: ${(fs.statSync(opt.salida).size / 1e6).toFixed(2)} MB (textura ${(atlasJpg.length / 1e6).toFixed(2)} MB)`);
