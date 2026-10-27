/* Optimiza un GLB riggeado de Sketchfab (texturas UDIM, varias mallas) para el navegador:
   - une todas las mallas que comparten el esqueleto en una sola (1 llamada de dibujo),
   - reduce triángulos con meshoptimizer (el skinning no cambia: solo se quitan vértices),
   - junta las casillas UDIM en atlas (color, normal y emisivo) a la resolución pedida y las guarda en JPEG,
   - quita animaciones, morph targets vacíos, tangentes y la segunda UV.
   Uso: node optimizar_modelo.mjs --entrada ../modelos/dragon_01.glb --salida ../modelos/dragon_01_web.glb [--tile 512] [--ratio 0.5] [--error 0.01]
        [--calidad 88] [--calidad-normal 92]
   dragon_01_web.glb se generó con --ratio 0.3 --tile 512 (50 000 triángulos, 5,1 MB).                                   */
import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { MeshoptSimplifier } from 'meshoptimizer';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const IN = arg('entrada'), OUT = arg('salida');
const TILE = +arg('tile', 512), RATIO = +arg('ratio', 0.5), ERR = +arg('error', 0.01);
const Q_COLOR = +arg('calidad', 88), Q_NORMAL = +arg('calidad-normal', 92);
if (!IN || !OUT) { console.error('Faltan --entrada y --salida'); process.exit(1); }

/* ---------- lectura del GLB ---------- */
const file = fs.readFileSync(IN);
if (file.toString('ascii', 0, 4) !== 'glTF') throw new Error('No es un GLB');
const jsonLen = file.readUInt32LE(12);
const J = JSON.parse(file.toString('utf8', 20, 20 + jsonLen));
const binStart = 20 + jsonLen + 8;
const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
function bvBytes(i) { const bv = J.bufferViews[i]; return file.subarray(binStart + (bv.byteOffset || 0), binStart + (bv.byteOffset || 0) + bv.byteLength); }
/* Devuelve los datos de un accessor como Float32Array (o el tipo entero si raw=true), respetando byteStride y normalized. */
function readAcc(i, raw) {
  const a = J.accessors[i], T = CT[a.componentType], n = NC[a.type], bv = J.bufferViews[a.bufferView];
  const es = T.BYTES_PER_ELEMENT, stride = bv.byteStride || es * n, base = binStart + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = raw ? new T(a.count * n) : new Float32Array(a.count * n);
  const k = a.normalized && !raw ? 1 / NORM[a.componentType] : 1;
  const dv = new DataView(file.buffer, file.byteOffset);
  const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
  for (let e = 0; e < a.count; e++) for (let c = 0; c < n; c++) out[e * n + c] = dv[get](base + e * stride + c * es, true) * k;
  return out;
}

/* ---------- 1. unir mallas ---------- */
const prims = [];
J.nodes.forEach((nd, ni) => {
  if (nd.mesh == null) return;
  for (const p of J.meshes[nd.mesh].primitives) prims.push({ node: ni, p });
});
const skinIds = new Set(prims.map(o => J.nodes[o.node].skin));
if (skinIds.size !== 1) throw new Error('Las mallas no comparten un único esqueleto: ' + [...skinIds]);
let nV = 0, nI = 0;
for (const { p } of prims) { nV += J.accessors[p.attributes.POSITION].count; nI += J.accessors[p.indices].count; }
const POS = new Float32Array(nV * 3), NOR = new Float32Array(nV * 3), UV = new Float32Array(nV * 2);
const JNT = new Uint8Array(nV * 4), WGT = new Float32Array(nV * 4), IDX = new Uint32Array(nI);
const tiles = [];                // { u, v, material }
let maxU = 0, maxV = 0, vo = 0, io = 0;
for (const { p } of prims) {
  const pos = readAcc(p.attributes.POSITION), nor = readAcc(p.attributes.NORMAL), uv = readAcc(p.attributes.TEXCOORD_0);
  const jn = readAcc(p.attributes.JOINTS_0, true), wg = readAcc(p.attributes.WEIGHTS_0), ix = readAcc(p.indices, true);
  const cnt = pos.length / 3;
  let u0 = Infinity, v0 = Infinity;
  for (let i = 0; i < cnt; i++) { u0 = Math.min(u0, uv[i * 2]); v0 = Math.min(v0, uv[i * 2 + 1]); }
  const tu = Math.floor(u0), tv = Math.floor(v0);
  tiles.push({ u: tu, v: tv, material: p.material });
  maxU = Math.max(maxU, tu); maxV = Math.max(maxV, tv);
  POS.set(pos, vo * 3); NOR.set(nor, vo * 3); UV.set(uv, vo * 2); WGT.set(wg, vo * 4);
  for (let i = 0; i < jn.length; i++) { if (jn[i] > 255) throw new Error('Más de 256 huesos'); JNT[vo * 4 + i] = jn[i]; }
  for (let i = 0; i < ix.length; i++) IDX[io + i] = ix[i] + vo;
  vo += cnt; io += ix.length;
}
const COLS = maxU + 1, ROWS = maxV + 1;
for (let i = 0; i < nV; i++) { UV[i * 2] /= COLS; UV[i * 2 + 1] /= ROWS; }          // UDIM -> atlas
console.log(`Unidas ${prims.length} mallas: ${nV} vértices, ${nI / 3} triángulos. Atlas ${COLS}×${ROWS} casillas.`);

/* ---------- 2. reducir triángulos ---------- */
await MeshoptSimplifier.ready;
const target = Math.floor(nI * RATIO / 3) * 3;
const [simp, err] = MeshoptSimplifier.simplifyWithAttributes(IDX, POS, 3, NOR, 3, [0.6, 0.6, 0.6], null, target, ERR, []);
console.log(`Simplificado: ${simp.length / 3} triángulos (objetivo ${target / 3}), error relativo ${err.toFixed(4)}`);
// compactar: solo los vértices usados
const remap = new Int32Array(nV).fill(-1); let m = 0;
for (let i = 0; i < simp.length; i++) if (remap[simp[i]] < 0) remap[simp[i]] = m++;
const pos2 = new Float32Array(m * 3), nor2 = new Int8Array(m * 4), uv2 = new Uint16Array(m * 2), jn2 = new Uint8Array(m * 4), wg2 = new Uint8Array(m * 4);
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let v = 0; v < nV; v++) {
  const r = remap[v]; if (r < 0) continue;
  for (let c = 0; c < 3; c++) { const x = POS[v * 3 + c]; pos2[r * 3 + c] = x; mn[c] = Math.min(mn[c], x); mx[c] = Math.max(mx[c], x); }
  const nx = NOR[v * 3], ny = NOR[v * 3 + 1], nz = NOR[v * 3 + 2], nl = Math.hypot(nx, ny, nz) || 1;
  nor2[r * 4] = Math.round(nx / nl * 127); nor2[r * 4 + 1] = Math.round(ny / nl * 127); nor2[r * 4 + 2] = Math.round(nz / nl * 127);
  uv2[r * 2] = Math.round(Math.min(Math.max(UV[v * 2], 0), 1) * 65535); uv2[r * 2 + 1] = Math.round(Math.min(Math.max(UV[v * 2 + 1], 0), 1) * 65535);
  // pesos a 8 bits que sumen exactamente 255
  const w = [0, 1, 2, 3].map(c => WGT[v * 4 + c]), s = w.reduce((a, b) => a + b, 0) || 1;
  const q = w.map(x => Math.round(x / s * 255)); let d = 255 - q.reduce((a, b) => a + b, 0);
  q[q.indexOf(Math.max(...q))] += d;
  for (let c = 0; c < 4; c++) { jn2[r * 4 + c] = JNT[v * 4 + c]; wg2[r * 4 + c] = q[c]; }
}
const idx2 = m <= 65535 ? new Uint16Array(simp.length) : new Uint32Array(simp.length);
for (let i = 0; i < simp.length; i++) idx2[i] = remap[simp[i]];
console.log(`Malla final: ${m} vértices, ${idx2.length / 3} triángulos, índices de ${idx2.BYTES_PER_ELEMENT * 8} bits`);

/* ---------- 3. atlas de texturas ---------- */
function decode(imgIndex) {
  const bytes = bvBytes(J.images[imgIndex].bufferView);
  if (bytes[0] === 0x89) { const p = PNG.sync.read(Buffer.from(bytes)); return { w: p.width, h: p.height, d: p.data }; }
  const j = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 2048, formatAsRGBA: true }); return { w: j.width, h: j.height, d: j.data };
}
/* Reduce la imagen a T×T con un filtro de caja y la copia en el atlas (casilla u,v). normal=true renormaliza. */
function blit(atlas, img, tu, tv, normal, T = TILE) {
  const f = img.w / T, W = COLS * T, TILE = T;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    const y0 = Math.floor(y * f), y1 = Math.floor((y + 1) * f), x0 = Math.floor(x * f), x1 = Math.floor((x + 1) * f);
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const o = (yy * img.w + xx) * 4; r += img.d[o]; g += img.d[o + 1]; b += img.d[o + 2]; n++; }
    r /= n; g /= n; b /= n;
    if (normal) {
      let nx = r / 127.5 - 1, ny = g / 127.5 - 1, nz = b / 127.5 - 1; const l = Math.hypot(nx, ny, nz) || 1;
      r = (nx / l + 1) * 127.5; g = (ny / l + 1) * 127.5; b = (nz / l + 1) * 127.5;
    }
    const o = ((tv * TILE + y) * W + tu * TILE + x) * 4;
    atlas[o] = r; atlas[o + 1] = g; atlas[o + 2] = b; atlas[o + 3] = 255;
  }
}
const W = COLS * TILE, H = ROWS * TILE, TM = TILE / 2, WM = COLS * TM, HM = ROWS * TM;      // rugosidad/metal a media resolución
const atlasC = new Uint8Array(W * H * 4), atlasN = new Uint8Array(W * H * 4), atlasE = new Uint8Array(W * H * 4), atlasMR = new Uint8Array(WM * HM * 4);
for (let i = 0; i < W * H; i++) { atlasN[i * 4] = 128; atlasN[i * 4 + 1] = 128; atlasN[i * 4 + 2] = 255; atlasN[i * 4 + 3] = 255; atlasE[i * 4 + 3] = 255; }
for (let i = 0; i < WM * HM; i++) { atlasMR[i * 4 + 1] = 200; atlasMR[i * 4 + 3] = 255; }
let hasEmissive = false, emisStrength = 1;
const mrStats = [];
const texImg = t => J.textures[t.index].source;
for (const t of tiles) {
  const mat = J.materials[t.material], pbr = mat.pbrMetallicRoughness || {};
  if (pbr.baseColorTexture) blit(atlasC, decode(texImg(pbr.baseColorTexture)), t.u, t.v, false);
  if (mat.normalTexture) blit(atlasN, decode(texImg(mat.normalTexture)), t.u, t.v, true);
  if (mat.emissiveTexture) {
    hasEmissive = true; blit(atlasE, decode(texImg(mat.emissiveTexture)), t.u, t.v, false);
    emisStrength = Math.max(emisStrength, mat.extensions?.KHR_materials_emissive_strength?.emissiveStrength || 1);
  }
  if (pbr.metallicRoughnessTexture) {          // rugosidad (G) y metalicidad (B): atlas a media resolución y medias por casilla
    const im = decode(texImg(pbr.metallicRoughnessTexture)); let g = 0, b = 0, n = 0;
    blit(atlasMR, im, t.u, t.v, false, TM);
    for (let i = 0; i < im.w * im.h; i += 97) { g += im.d[i * 4 + 1]; b += im.d[i * 4 + 2]; n++; }
    mrStats.push([(g / n / 255 * (pbr.roughnessFactor ?? 1)), (b / n / 255 * (pbr.metallicFactor ?? 1))]);
  }
  process.stdout.write(`  casilla ${t.u},${t.v} lista\n`);
}
const rough = mrStats.reduce((a, s) => a + s[0], 0) / (mrStats.length || 1), metal = mrStats.reduce((a, s) => a + s[1], 0) / (mrStats.length || 1);
console.log('Rugosidad/metalicidad medias por casilla:', mrStats.map(s => s.map(v => v.toFixed(2)).join('/')).join('  '), `→ ${rough.toFixed(2)} / ${metal.toFixed(2)}`);
const jpg = (data, q, w = W, h = H) => Buffer.from(jpeg.encode({ data, width: w, height: h }, q).data);
const imgC = jpg(atlasC, Q_COLOR), imgN = jpg(atlasN, Q_NORMAL), imgE = hasEmissive ? jpg(atlasE, Q_COLOR) : null;
const imgMR = mrStats.length ? jpg(atlasMR, Q_COLOR, WM, HM) : null;
console.log(`Atlas ${W}×${H}: color ${(imgC.length / 1e6).toFixed(2)} MB, normal ${(imgN.length / 1e6).toFixed(2)} MB, emisivo ${imgE ? (imgE.length / 1e6).toFixed(2) : '-'} MB (fuerza ${emisStrength}), rugosidad/metal ${WM}×${HM} ${imgMR ? (imgMR.length / 1e6).toFixed(2) : '-'} MB`);

/* ---------- 4. nuevo GLB ---------- */
const pad4 = n => (4 - n % 4) % 4;
const chunks = []; let off = 0;
const bufferViews = [], accessors = [];
function addView(buf, target) {
  const pad = pad4(off); if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) });
  chunks.push(b); off += b.length; return bufferViews.length - 1;
}
function addAcc(arr, ct, type, count, extra) { accessors.push({ bufferView: addView(arr, extra?.target), componentType: ct, type, count, ...(extra?.acc || {}) }); return accessors.length - 1; }
const skin = J.skins[[...skinIds][0]];
const ibm = readAcc(skin.inverseBindMatrices);
const aIBM = addAcc(ibm, 5126, 'MAT4', ibm.length / 16);
const aPOS = addAcc(pos2, 5126, 'VEC3', m, { target: 34962, acc: { min: mn, max: mx } });
const aNOR = addAcc(nor2, 5120, 'VEC3', m, { target: 34962, acc: { normalized: true } });
bufferViews[bufferViews.length - 1].byteStride = 4;
const aUV = addAcc(uv2, 5123, 'VEC2', m, { target: 34962, acc: { normalized: true } });
const aJ = addAcc(jn2, 5121, 'VEC4', m, { target: 34962 });
const aW = addAcc(wg2, 5121, 'VEC4', m, { target: 34962, acc: { normalized: true } });
const aIDX = addAcc(idx2, idx2 instanceof Uint16Array ? 5123 : 5125, 'SCALAR', idx2.length, { target: 34963 });
const images = [{ mimeType: 'image/jpeg', bufferView: addView(imgC) }, { mimeType: 'image/jpeg', bufferView: addView(imgN) }];
const texIdx = {};
if (imgE) { texIdx.e = images.length; images.push({ mimeType: 'image/jpeg', bufferView: addView(imgE) }); }
if (imgMR) { texIdx.mr = images.length; images.push({ mimeType: 'image/jpeg', bufferView: addView(imgMR) }); }
const material = {
  name: 'dragon_atlas', doubleSided: true,
  pbrMetallicRoughness: imgMR ? { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: texIdx.mr }, metallicFactor: 1, roughnessFactor: 1 }
    : { baseColorTexture: { index: 0 }, metallicFactor: +metal.toFixed(3), roughnessFactor: +rough.toFixed(3) },
  normalTexture: { index: 1 },
  ...(imgE ? { emissiveTexture: { index: texIdx.e }, emissiveFactor: [1, 1, 1], extras: { emissiveStrength: emisStrength } } : {})
};
const nodes = J.nodes.map(n => { const c = { ...n }; delete c.mesh; delete c.skin; return c; });
const first = prims[0].node;
nodes[first].mesh = 0; nodes[first].skin = 0;
const out = {
  asset: { ...J.asset, generator: 'optimizar_modelo.mjs (Alas de Brasa) desde ' + (J.asset.generator || '?') },
  extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
  scene: J.scene || 0, scenes: J.scenes, nodes,
  meshes: [{ name: 'dragon', primitives: [{ attributes: { POSITION: aPOS, NORMAL: aNOR, TEXCOORD_0: aUV, JOINTS_0: aJ, WEIGHTS_0: aW }, indices: aIDX, material: 0 }] }],
  skins: [{ ...skin, inverseBindMatrices: aIBM }],
  materials: [material],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  textures: images.map((_, i) => ({ sampler: 0, source: i })), images,
  accessors, bufferViews, buffers: [{ byteLength: 0 }]
};
const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(off))]);
out.buffers[0].byteLength = bin.length;
let js = Buffer.from(JSON.stringify(out));
js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const header = Buffer.alloc(12); header.write('glTF', 0, 'ascii'); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
fs.writeFileSync(OUT, Buffer.concat([header, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
console.log(`Guardado ${OUT}: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB (original ${(file.length / 1e6).toFixed(1)} MB)`);
