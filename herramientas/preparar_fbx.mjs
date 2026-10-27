/* Convierte un dragón FBX riggeado (malla + animaciones en FBX aparte) en un GLB ligero para el juego, sin Blender:
   - lee el FBX con el FBXLoader de three.js en Node (fbx_node.mjs),
   - suelda e indexa la malla, reduce el cuerpo con meshoptimizer (el skinning no cambia: solo se quitan vértices),
   - junta la textura UDIM (una tira de N casillas) en un atlas de columnas × filas a la resolución pedida,
   - deja en la piel solo los huesos que deforman, quita las pistas de animación que no se mueven y cierra los bucles,
   - corrige los ejes con un nodo raíz (Y arriba, cabeza hacia +Z).
   Uso (TyrantDragon):
     node preparar_fbx.mjs --fbx "<carpeta>/SKM_TyrantDragon.FBX" --anim vuelo="<carpeta>/Animations/TyrantDragon_Fly_VariantA.FBX"
       --anim hover="<carpeta>/Animations/TyrantDragon_FlyingIdle.FBX" --anim reposo="<carpeta>/Animations/TyrantDragon_Idle_VariantA.FBX"
       --anim fuego="<carpeta>/Animations/TyrantDragon_Idle_BreathFire_VariantB.FBX" --anim rugido="<carpeta>/Animations/TyrantDragon_Roar_Anim_VariantB.FBX"
       --bucle vuelo,hover,reposo --fps reposo=15,fuego=20,rugido=15 --cuantizar --tira "<carpeta>/Textures/T_TyrantDragon_D.jpg"
       --casillas 5 --cols 3 --tile 1024 --ratio 0.32 --salida ../modelos/tyrant_web.glb                                     */
import fs from 'fs';
import jpeg from 'jpeg-js';
import { MeshoptSimplifier } from 'meshoptimizer';
import { loadFBX, THREE } from './fbx_node.mjs';

const argv = process.argv.slice(2), opt = {}, anims = [];
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, ''), next = argv[i + 1];
  const v = next !== undefined && !next.startsWith('--') ? (i++, next) : true;     // opción sin valor = interruptor
  if (k === 'anim') { const j = v.indexOf('='); anims.push([v.slice(0, j), v.slice(j + 1)]); } else opt[k] = v;
}
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const RATIO = +(opt.ratio || 0.32), TILE = +(opt.tile || 1024), NT = +(opt.casillas || 5), COLS = +(opt.cols || 3), ROWS = Math.ceil(NT / COLS);
const LOOPS = new Set((opt.bucle || '').split(',').filter(Boolean)), Q = +(opt.calidad || 86);
// --fps reposo=15,fuego=20 → remuestrea esos clips; --cuantizar → rotaciones de animación en 16 bits (glTF normalizado)
const FPS = Object.fromEntries((opt.fps || '').split(',').filter(Boolean).map(s => { const [k, v] = s.split('='); return [k, +v]; }));
const QUANT = 'cuantizar' in opt;
const BODY_MAT = opt.cuerpo || 'MI_TyrantDragon_Body';

/* ---------- 1. modelo ---------- */
let t0 = Date.now();
const root = loadFBX(opt.fbx);
root.updateMatrixWorld(true);
let mesh; root.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
if (!mesh) throw new Error('El FBX no tiene una malla con esqueleto');
const g = mesh.geometry, mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
console.log(`FBX leído en ${Date.now() - t0} ms: ${g.attributes.position.count} vértices sin indexar, ${mats.length} materiales, ${mesh.skeleton.bones.length} huesos`);

/* ---------- 2. soldar vértices iguales (posición, normal, uv, piel y material) ---------- */
const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
const groups = g.groups.length ? g.groups : [{ start: 0, count: P.count, materialIndex: 0 }];
const matOf = new Uint8Array(P.count);
for (const gr of groups) for (let i = gr.start; i < gr.start + gr.count; i++) matOf[i] = gr.materialIndex;
const keyMap = new Map(), remapV = new Uint32Array(P.count);
const pos = [], nor = [], uv = [], ji = [], jw = [], vmat = [];
const r = (x, s) => Math.round(x * s);
for (let i = 0; i < P.count; i++) {
  const key = [r(P.getX(i), 1e3), r(P.getY(i), 1e3), r(P.getZ(i), 1e3), r(N.getX(i), 1e3), r(N.getY(i), 1e3), r(N.getZ(i), 1e3), r(U.getX(i), 1e5), r(U.getY(i), 1e5), matOf[i]].join(',');
  let k = keyMap.get(key);
  if (k === undefined) {
    k = pos.length / 3; keyMap.set(key, k);
    pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U.getX(i), U.getY(i));
    for (let c = 0; c < 4; c++) { ji.push(SI.getComponent(i, c)); jw.push(SW.getComponent(i, c)); }
    vmat.push(matOf[i]);
  }
  remapV[i] = k;
}
const nV = pos.length / 3;
const POS = new Float32Array(pos), NOR = new Float32Array(nor);
const idxBy = mats.map(() => []);
for (let i = 0; i < P.count; i++) idxBy[matOf[i]].push(remapV[i]);
console.log(`Soldado: ${nV} vértices únicos; triángulos por material: ${idxBy.map((a, m) => mats[m].name + ' ' + a.length / 3).join(', ')}`);

/* ---------- 3. reducir el cuerpo ---------- */
await MeshoptSimplifier.ready;
const bodyM = mats.findIndex(m => m.name === BODY_MAT);
const prims = [];
for (let m = 0; m < mats.length; m++) {
  let ix = new Uint32Array(idxBy[m]);
  if (!ix.length) continue;
  if (m === bodyM && RATIO < 1) {
    const target = Math.floor(ix.length * RATIO / 3) * 3;
    const [s, err] = MeshoptSimplifier.simplifyWithAttributes(ix, POS, 3, NOR, 3, [0.5, 0.5, 0.5], null, target, 0.02, []);
    console.log(`Cuerpo: ${ix.length / 3} → ${s.length / 3} triángulos (error relativo ${err.toFixed(4)})`);
    ix = s;
  }
  prims.push({ m, ix });
}

/* ---------- 4. huesos: piel solo con los que deforman ---------- */
const bones = mesh.skeleton.bones, used = new Set();
const keepV = new Int32Array(nV).fill(-1); let nK = 0;
for (const p of prims) for (const v of p.ix) if (keepV[v] < 0) keepV[v] = nK++;
for (let v = 0; v < nV; v++) if (keepV[v] >= 0) for (let c = 0; c < 4; c++) if (jw[v * 4 + c] > 0.003) used.add(ji[v * 4 + c]);
const jointList = [...used].sort((a, b) => a - b), jointPos = new Map(jointList.map((b, i) => [b, i]));
console.log(`Huesos en la piel: ${jointList.length} de ${bones.length}`);

/* ---------- 5. atlas de la tira UDIM ---------- */
t0 = Date.now();
const strip = jpeg.decode(fs.readFileSync(opt.tira), { useTArray: true, maxMemoryUsageInMB: 4096, maxResolutionInMP: 200, formatAsRGBA: true });
const SRC = strip.width / NT, W = COLS * TILE, H = ROWS * TILE, atlas = new Uint8Array(W * H * 4).fill(255);
for (let k = 0; k < NT; k++) {
  const col = k % COLS, row = Math.floor(k / COLS), f = SRC / TILE;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let rr = 0, gg = 0, bb = 0, n = 0;
    for (let yy = Math.floor(y * f); yy < Math.floor((y + 1) * f); yy++) for (let xx = Math.floor(x * f); xx < Math.floor((x + 1) * f); xx++) {
      const o = (yy * strip.width + k * SRC + xx) * 4; rr += strip.data[o]; gg += strip.data[o + 1]; bb += strip.data[o + 2]; n++;
    }
    const o = ((row * TILE + y) * W + col * TILE + x) * 4; atlas[o] = rr / n; atlas[o + 1] = gg / n; atlas[o + 2] = bb / n;
  }
}
const atlasJpg = Buffer.from(jpeg.encode({ data: atlas, width: W, height: H }, Q).data);
console.log(`Atlas ${W}×${H} (${NT} casillas de ${TILE}): ${(atlasJpg.length / 1e6).toFixed(2)} MB en ${Date.now() - t0} ms`);

/* ---------- 6. vértices finales ---------- */
const pos2 = new Float32Array(nK * 3), nor2 = new Int8Array(nK * 4), uv2 = new Uint16Array(nK * 2), jn2 = new Uint16Array(nK * 4), wg2 = new Uint8Array(nK * 4);
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let v = 0; v < nV; v++) {
  const k = keepV[v]; if (k < 0) continue;
  for (let c = 0; c < 3; c++) { const x = POS[v * 3 + c]; pos2[k * 3 + c] = x; mn[c] = Math.min(mn[c], x); mx[c] = Math.max(mx[c], x); }
  const nx = NOR[v * 3], ny = NOR[v * 3 + 1], nz = NOR[v * 3 + 2], nl = Math.hypot(nx, ny, nz) || 1;
  nor2[k * 4] = Math.round(nx / nl * 127); nor2[k * 4 + 1] = Math.round(ny / nl * 127); nor2[k * 4 + 2] = Math.round(nz / nl * 127);
  let u = uv[v * 2], w = uv[v * 2 + 1];
  if (vmat[v] === bodyM) {                               // casilla UDIM → atlas (v de glTF crece hacia abajo)
    const t = Math.min(Math.floor(u), NT - 1), fu = u - t, col = t % COLS, row = Math.floor(t / COLS);
    u = (col + fu) / COLS; w = (row + (1 - w)) / ROWS;
  } else { u = 0; w = 0; }
  uv2[k * 2] = Math.round(Math.min(Math.max(u, 0), 1) * 65535); uv2[k * 2 + 1] = Math.round(Math.min(Math.max(w, 0), 1) * 65535);
  const ws = [0, 1, 2, 3].map(c => used.has(ji[v * 4 + c]) ? jw[v * 4 + c] : 0), s = ws.reduce((a, b) => a + b, 0) || 1;
  const q = ws.map(x => Math.round(x / s * 255)); q[q.indexOf(Math.max(...q))] += 255 - q.reduce((a, b) => a + b, 0);
  for (let c = 0; c < 4; c++) { jn2[k * 4 + c] = q[c] ? jointPos.get(ji[v * 4 + c]) : 0; wg2[k * 4 + c] = q[c]; }
}
for (const p of prims) { const a = nK <= 65535 ? new Uint16Array(p.ix.length) : new Uint32Array(p.ix.length); for (let i = 0; i < p.ix.length; i++) a[i] = keepV[p.ix[i]]; p.out = a; }
console.log(`Malla final: ${nK} vértices, ${prims.reduce((a, p) => a + p.out.length / 3, 0)} triángulos`);

/* ---------- 7. nodos (raíz con corrección de ejes; la malla va en la raíz de la escena, sin transformación) ---------- */
const nodes = [], nodeOf = new Map();
const fix = new THREE.Quaternion().setFromEuler(new THREE.Euler(+(opt.girox ?? -90) * Math.PI / 180, 0, 0));
nodes.push({ name: 'Dragon', rotation: fix.toArray(), children: [] });
function addNode(o, parentIdx) {
  if (o === mesh) return;
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

/* ---------- 8. animaciones ---------- */
const clips = [];
for (const [name, file] of anims) {
  t0 = Date.now();
  const a = loadFBX(file).animations[0];
  let kept = 0, dropped = 0, nf = 0;
  const tracks = [];
  for (const tr of a.tracks) {
    const [bn, prop] = tr.name.split('.'), obj = root.getObjectByName(bn);
    if (!obj || !nodeOf.has(obj)) { dropped++; continue; }
    const vals = tr.values, size = prop === 'quaternion' ? 4 : 3, frames = tr.times.length;
    const rest = prop === 'position' ? obj.position.toArray() : prop === 'quaternion' ? obj.quaternion.toArray() : obj.scale.toArray();
    const eps = prop === 'position' ? 0.02 : prop === 'scale' ? 1e-4 : 1e-5;
    let moves = false;
    for (let f = 0; f < frames && !moves; f++) {
      if (prop === 'quaternion') { const d = Math.abs(vals[f * 4] * rest[0] + vals[f * 4 + 1] * rest[1] + vals[f * 4 + 2] * rest[2] + vals[f * 4 + 3] * rest[3]); if (1 - d > eps) moves = true; }
      else for (let c = 0; c < 3; c++) if (Math.abs(vals[f * 3 + c] - rest[c]) > eps) moves = true;
    }
    if (!moves) { dropped++; continue; }
    const out = new Float32Array(vals);
    if (prop === 'quaternion') for (let f = 1; f < frames; f++) {           // mismo hemisferio que el fotograma anterior
      const d = out[f * 4] * out[f * 4 - 4] + out[f * 4 + 1] * out[f * 4 - 3] + out[f * 4 + 2] * out[f * 4 - 2] + out[f * 4 + 3] * out[f * 4 - 1];
      if (d < 0) for (let c = 0; c < 4; c++) out[f * 4 + c] *= -1;
    }
    if (LOOPS.has(name)) {                                                     // cierre del bucle: los últimos fotogramas se funden con el primero
      const F = Math.min(8, frames - 1);
      for (let j = 1; j <= F; j++) {
        const f = frames - 1 - F + j, w = j / F;
        if (prop === 'quaternion') {
          const qa = new THREE.Quaternion().fromArray(out, f * 4), qb = new THREE.Quaternion().fromArray(out, 0);
          if (qa.dot(qb) < 0) qb.set(-qb.x, -qb.y, -qb.z, -qb.w);
          qa.slerp(qb, w).toArray(out, f * 4);
        } else for (let c = 0; c < 3; c++) out[f * 3 + c] += (out[c] - out[f * 3 + c]) * w;
      }
    }
    let times = new Float32Array(tr.times), vals2 = out;
    if (FPS[name]) {                                                           // remuestreo a menos fotogramas por segundo
      const n2 = Math.max(2, Math.round(a.duration * FPS[name]) + 1), t2 = new Float32Array(n2), v2 = new Float32Array(n2 * size);
      const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
      for (let j = 0, s = 0; j < n2; j++) {
        const t = Math.min(a.duration, j / FPS[name]); t2[j] = t;
        while (s < frames - 2 && times[s + 1] < t) s++;
        const f = clamp01((t - times[s]) / Math.max(times[s + 1] - times[s], 1e-6));
        if (size === 4) { qa.fromArray(out, s * 4); qb.fromArray(out, (s + 1) * 4); qa.slerp(qb, f).toArray(v2, j * 4); }
        else for (let c = 0; c < 3; c++) v2[j * 3 + c] = out[s * 3 + c] + (out[(s + 1) * 3 + c] - out[s * 3 + c]) * f;
      }
      times = t2; vals2 = v2;
    }
    tracks.push({ node: nodeOf.get(obj), path: prop === 'position' ? 'translation' : prop === 'quaternion' ? 'rotation' : 'scale', times, values: vals2 });
    kept++; nf = Math.max(nf, times.length);
  }
  clips.push({ name, tracks, duration: a.duration });
  console.log(`Animación '${name}' (${a.duration.toFixed(2)} s, ${nf} fotogramas): ${kept} pistas útiles, ${dropped} quietas fuera · ${Date.now() - t0} ms`);
}

/* ---------- 9. GLB ---------- */
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
const matIdx = {}, materials = [];
for (const p of prims) {
  const name = mats[p.m].name;
  if (!(name in matIdx)) {
    matIdx[name] = materials.length;
    if (p.m === bodyM) materials.push({ name, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.72 } });
    else if (/iris|pupil/i.test(name)) materials.push({ name, pbrMetallicRoughness: { baseColorFactor: [0.01, 0.01, 0.01, 1], metallicFactor: 0, roughnessFactor: 0.3 } });
    else materials.push({ name, pbrMetallicRoughness: { baseColorFactor: [1, 0.55, 0.12, 0.55], metallicFactor: 0, roughnessFactor: 0.1 }, emissiveFactor: [0.9, 0.42, 0.06], alphaMode: 'BLEND' });
  }
}
const primitives = prims.map(p => ({ attributes: { POSITION: aPOS, NORMAL: aNOR, TEXCOORD_0: aUV, JOINTS_0: aJ, WEIGHTS_0: aW },
  indices: addAcc(p.out, p.out instanceof Uint16Array ? 5123 : 5125, 'SCALAR', p.out.length, { target: 34963 }), material: matIdx[mats[p.m].name] }));
const timeAcc = new Map();
const animations = clips.map(c => {
  const samplers = [], channels = [];
  for (const t of c.tracks) {
    const tk = Buffer.from(t.times.buffer).toString('base64');
    if (!timeAcc.has(tk)) timeAcc.set(tk, addAcc(t.times, 5126, 'SCALAR', t.times.length, { acc: { min: [t.times[0]], max: [t.times[t.times.length - 1]] } }));
    let out;
    if (QUANT && t.path === 'rotation') {
      const q16 = new Int16Array(t.values.length); for (let i = 0; i < q16.length; i++) q16[i] = Math.round(Math.max(-1, Math.min(1, t.values[i])) * 32767);
      out = addAcc(q16, 5122, 'VEC4', t.times.length, { acc: { normalized: true } });
    } else out = addAcc(t.values, 5126, t.path === 'rotation' ? 'VEC4' : 'VEC3', t.times.length);
    samplers.push({ input: timeAcc.get(tk), output: out, interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: t.node, path: t.path } });
  }
  return { name: c.name, samplers, channels };
});
const imgView = addView(atlasJpg);
const gltf = {
  asset: { version: '2.0', generator: 'preparar_fbx.mjs (Alas de Brasa) desde ' + opt.fbx.split(/[\\/]/).pop() },
  extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
  scene: 0, scenes: [{ nodes: [0, meshNode] }], nodes,
  meshes: [{ name: mesh.name, primitives }],
  skins: [{ joints: jointList.map(b => nodeOf.get(bones[b])), inverseBindMatrices: aIBM }],
  materials, textures: [{ sampler: 0, source: 0 }], images: [{ mimeType: 'image/jpeg', bufferView: imgView }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  animations, accessors, bufferViews, buffers: [{ byteLength: 0 }]
};
const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(off))]); gltf.buffers[0].byteLength = bin.length;
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const head = Buffer.alloc(12); head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(opt.salida, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
const animBytes = animations.reduce((a, an) => a + an.samplers.reduce((b, s) => b + bufferViews[accessors[s.output].bufferView].byteLength, 0), 0);
console.log(`Guardado ${opt.salida}: ${(fs.statSync(opt.salida).size / 1e6).toFixed(2)} MB (animaciones ${(animBytes / 1e6).toFixed(2)} MB, textura ${(atlasJpg.length / 1e6).toFixed(2)} MB)`);
