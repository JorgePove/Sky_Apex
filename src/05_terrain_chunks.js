/* ============================================================
   3. TERRENO INFINITO: quadtree de chunks con LOD y faldones
   Nivel L tiene tamaño 128·2^L m y siempre 32×32 celdas (4 m, 8 m, ... 256 m).
   ============================================================ */
const TL_BASE = 128, TL_MAX = 6, TL_N = 32, TL_SPLIT = 1.15;
const terrainGroup = new THREE.Group();
scene.add(terrainGroup);
const chunks = new Map();            // clave -> { key, L, ix, iz, x0, z0, size, mesh, trees }
const chunkHooks = { onCreate: null, onRemove: null };
const chunkKey = (L, ix, iz) => L + ':' + ix + ':' + iz;
const terrainState = { desired: [], pending: [], lastX: 1e9, lastZ: 1e9, lastT: -1, lastDy: 0 };

function buildChunk(L, ix, iz) {
  const S = TL_BASE * (1 << L), N = TL_N, s = S / N, x0 = ix * S, z0 = iz * S, G = N + 3;
  const hs = new Float32Array(G * G), fo = new Float32Array(G * G), we = new Float32Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    terrain(x0 + (i - 1) * s, z0 + (j - 1) * s, _o, true);
    const k = j * G + i; hs[k] = _o.h; fo[k] = _o.forest; we[k] = _o.wet;
  }
  const W = N + 1, V = W * W, total = V + 4 * W;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), aux = new Float32Array(total * 2);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const v = j * W + i, g = (j + 1) * G + (i + 1);
    pos[v * 3] = i * s; pos[v * 3 + 1] = hs[g]; pos[v * 3 + 2] = j * s;
    const dx = (hs[g + 1] - hs[g - 1]) / (2 * s), dz = (hs[g + G] - hs[g - G]) / (2 * s);
    const il = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
    nor[v * 3] = -dx * il; nor[v * 3 + 1] = il; nor[v * 3 + 2] = -dz * il;
    aux[v * 2] = fo[g]; aux[v * 2 + 1] = we[g];
  }
  const skirt = s * 2.6 + 4;
  const edge = (e, k) => e === 0 ? k : e === 1 ? N * W + k : e === 2 ? k * W : k * W + N;
  for (let e = 0; e < 4; e++) for (let k = 0; k <= N; k++) {
    const b = edge(e, k), sv = V + e * W + k;
    pos[sv * 3] = pos[b * 3]; pos[sv * 3 + 1] = pos[b * 3 + 1] - skirt; pos[sv * 3 + 2] = pos[b * 3 + 2];
    nor[sv * 3] = nor[b * 3]; nor[sv * 3 + 1] = nor[b * 3 + 1]; nor[sv * 3 + 2] = nor[b * 3 + 2];
    aux[sv * 2] = aux[b * 2]; aux[sv * 2 + 1] = aux[b * 2 + 1];
  }
  const idx = new Uint16Array(N * N * 6 + 4 * N * 6);
  let t = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * W + i, b = (j + 1) * W + i, c = j * W + i + 1, d = (j + 1) * W + i + 1;
    idx[t++] = a; idx[t++] = b; idx[t++] = c; idx[t++] = c; idx[t++] = b; idx[t++] = d;
  }
  for (let e = 0; e < 4; e++) for (let k = 0; k < N; k++) {
    const b0 = edge(e, k), b1 = edge(e, k + 1), s0 = V + e * W + k, s1 = V + e * W + k + 1;
    idx[t++] = b0; idx[t++] = s0; idx[t++] = b1; idx[t++] = b1; idx[t++] = s0; idx[t++] = s1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, terrainMaterial(L));
  mesh.position.set(x0, 0, z0);
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  terrainGroup.add(mesh);
  const ch = { key: chunkKey(L, ix, iz), L, ix, iz, x0, z0, size: S, mesh, trees: null, hs, G, s };
  chunks.set(ch.key, ch);
  if (chunkHooks.onCreate) chunkHooks.onCreate(ch);
  return ch;
}
function removeChunk(ch) {
  if (chunkHooks.onRemove) chunkHooks.onRemove(ch);
  terrainGroup.remove(ch.mesh); ch.mesh.geometry.dispose();
  chunks.delete(ch.key);
}

function selectLeaves(px, pz, dy) {
  const leaves = [];
  const topS = TL_BASE * (1 << TL_MAX);
  const visit = (L, ix, iz) => {
    const S = TL_BASE * (1 << L), x0 = ix * S, z0 = iz * S;
    const dx = Math.max(x0 - px, 0, px - (x0 + S)), dz = Math.max(z0 - pz, 0, pz - (z0 + S));
    const d = Math.sqrt(dx * dx + dz * dz + dy * dy);
    if (L > 0 && d < S * TL_SPLIT) {
      visit(L - 1, ix * 2, iz * 2); visit(L - 1, ix * 2 + 1, iz * 2);
      visit(L - 1, ix * 2, iz * 2 + 1); visit(L - 1, ix * 2 + 1, iz * 2 + 1);
    } else leaves.push({ L, ix, iz, d, x0, z0, S });
  };
  const cx = Math.floor(px / topS), cz = Math.floor(pz / topS);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) visit(TL_MAX, cx + i, cz + j);
  return leaves;
}

/* Recalcula qué chunks hacen falta cuando el jugador se ha movido; devuelve nº de chunks pendientes. */
function refreshTerrainSelection(px, py, pz, force) {
  const agl = clamp(py - heightAt(px, pz), 0, 500);
  const dy = agl * 0.65;
  const st = terrainState;
  if (!force && Math.abs(px - st.lastX) < 20 && Math.abs(pz - st.lastZ) < 20 && Math.abs(dy - st.lastDy) < 40) return;
  st.lastX = px; st.lastZ = pz; st.lastDy = dy;
  st.desired = selectLeaves(px, pz, dy);
  st.pending = st.desired.filter(l => !chunks.has(chunkKey(l.L, l.ix, l.iz))).sort((a, b) => a.d - b.d);
}
function pruneTerrain() {
  const st = terrainState;
  const want = new Set(st.desired.map(l => chunkKey(l.L, l.ix, l.iz)));
  for (const ch of Array.from(chunks.values())) {
    if (want.has(ch.key)) continue;
    let covered = true;
    for (const l of st.desired) {
      if (l.x0 < ch.x0 + ch.size && l.x0 + l.S > ch.x0 && l.z0 < ch.z0 + ch.size && l.z0 + l.S > ch.z0) {
        if (!chunks.has(chunkKey(l.L, l.ix, l.iz))) { covered = false; break; }
      }
    }
    if (covered) removeChunk(ch);
  }
}
/* Construye chunks pendientes dentro de un presupuesto de milisegundos. */
function pumpTerrain(budgetMs) {
  const st = terrainState, t0 = performance.now();
  let built = 0;
  while (st.pending.length && (built === 0 || performance.now() - t0 < budgetMs)) {
    const l = st.pending.shift();
    if (!chunks.has(chunkKey(l.L, l.ix, l.iz))) { buildChunk(l.L, l.ix, l.iz); built++; }
  }
  const now = performance.now();
  if ((built || st.pending.length === 0) && now - (st.lastPrune || 0) > 180) { st.lastPrune = now; pruneTerrain(); }
  return st.pending.length;
}
