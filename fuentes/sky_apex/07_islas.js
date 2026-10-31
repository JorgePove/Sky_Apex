/* ============================================================
   4b. ISLAS FLOTANTES
   Rejilla fina de 900 m (islas pequeñas y medianas) + rejilla grande de 2600 m (islas grandes con satélites).
   Cada isla es una "lente" de roca con un perfil analítico: cara superior con relieve suave y cara inferior colgante.
   El MISMO perfil genera la malla y las colisiones (dragón, bolas de fuego, ballestas y puntería).
   Las alturas se reparten en tres planos (bajo, medio, alto) y siempre quedan por encima de las montañas de debajo.
   ============================================================ */
const ISL_FINE = 900, ISL_BIG = 2600, ISL_DATA_R = 9500;
const ISL_P_FINE = 0.46, ISL_P_BIG = 0.42;           // probabilidad de isla por celda fina / grande
const islCells = new Map();                           // caché de celdas -> [islas]
const islActive = [];                                 // islas con datos cargados (colisión)
const islLoaded = new Map();                          // id -> isla con malla en escena
const islPending = [];
const islGroup = new THREE.Group(); scene.add(islGroup);

/* ---------- Perfil analítico ---------- */
const islRadAng = (s, a) => {
  let f = a / 6.283185307; f -= Math.floor(f); f *= 32;
  const i0 = f | 0, t = f - i0, r0 = s.rad[i0 & 31], r1 = s.rad[(i0 + 1) & 31];
  return s.R * (r0 + (r1 - r0) * t * t * (3 - 2 * t));
};
const islRad = (s, dx, dz) => islRadAng(s, Math.atan2(dz, dx));
function islTop(s, dx, dz, q) {
  const wx = s.x + dx, wz = s.z + dz, f = 1 / (s.R * 0.55 + 40);
  const rel = N2(wx * f * 1.3, wz * f * 1.3) * 0.65 + N3(wx * f * 4.1, wz * f * 4.1) * 0.35;
  const roll = s.t0 * 0.55 * smooth(0.82, 1.0, q);
  return s.cy + (s.dome + s.A * rel) * (1 - q * q) - roll;
}
function islBot(s, dx, dz, q) {
  const wx = s.x + dx, wz = s.z + dz, f = 1 / (s.R * 0.35 + 30);
  const n = N3(wx * f, wz * f) * 0.6 + N1(wx * f * 2.7 + 9.1, wz * f * 2.7 - 4.3) * 0.4;
  const sh = Math.pow(Math.max(1 - q, 0), 0.8) * (1 + 0.35 * q);
  return s.cy - s.t0 - s.D * sh * (1 + 0.28 * n);
}
function insideIsland(s, x, y, z, m) {
  if (y > s.yMax + m || y < s.yMin - m) return false;
  const dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz, lim = s.rb + m;
  if (d2 > lim * lim) return false;
  const Rt = islRad(s, dx, dz), q = Math.sqrt(d2) / Rt;
  if (q >= 1 + m / Rt) return false;
  const qq = q < 1 ? q : 1;
  return y < islTop(s, dx, dz, qq) + m && y > islBot(s, dx, dz, qq) - m;
}
function islandAt(x, y, z, m) {
  for (let n = 0; n < islActive.length; n++) if (insideIsland(islActive[n], x, y, z, m)) return islActive[n];
  return null;
}
/* ¿Hay roca de alguna isla en la columna (x,z) entre las alturas y0 e y1? (piloto automático del menú) */
function islandColumn(x, z, y0, y1, m) {
  for (let n = 0; n < islActive.length; n++) {
    const s = islActive[n];
    if (y1 < s.yMin - m || y0 > s.yMax + m) continue;
    const dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz, lim = s.rb + m;
    if (d2 > lim * lim) continue;
    const Rt = islRad(s, dx, dz), q = Math.sqrt(d2) / Rt;
    if (q >= 1 + m / Rt) continue;
    const qq = q < 1 ? q : 1;
    if (islBot(s, dx, dz, qq) - m < y1 && islTop(s, dx, dz, qq) + m > y0) return s;
  }
  return null;
}
/* Distancia al primer impacto del rayo con una isla (Infinity si no hay). */
function islandRayHit(o, d, maxT) {
  let best = Infinity;
  for (let n = 0; n < islActive.length; n++) {
    const s = islActive[n];
    const cy = (s.yMax + s.yMin) * 0.5, rr = Math.max(s.rb, (s.yMax - s.yMin) * 0.5) * 1.04;
    const ox = o.x - s.x, oy = o.y - cy, oz = o.z - s.z;
    const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - rr * rr, disc = b * b - c;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc); let t0 = -b - sq, t1 = -b + sq;
    const lim = Math.min(maxT, best);
    if (t1 < 0 || t0 > lim) continue;
    t0 = Math.max(t0, 0); t1 = Math.min(t1, lim);
    const step = clamp(s.R * 0.015, 2.5, 9);
    for (let t = t0; t <= t1; t += step) {
      if (insideIsland(s, o.x + d.x * t, o.y + d.y * t, o.z + d.z * t, 0)) { best = t; break; }
    }
  }
  return best;
}

/* ---------- Generación determinista por celdas ---------- */
function pickBand(h1, h2) {
  if (h1 < 0.34) return 430 + h2 * 280;       // plano bajo
  if (h1 < 0.74) return 820 + h2 * 520;       // plano medio
  return 1450 + h2 * 800;                      // plano alto
}
function makeIsland(id, seed, x, z, R, cyBase, big) {
  const D = Math.min(R * (0.42 + hash2(seed, 1, 5) * 0.38), 330);
  const t0 = Math.max(4, R * 0.05), A = clamp(R * 0.045, 1.5, 20), dome = clamp(R * 0.04, 1.5, 22);
  let hmax = Math.max(heightAt(x, z), WL);
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr = R * (i % 2 ? 0.55 : 1.15); hmax = Math.max(hmax, heightAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr)); }
  const cy = Math.max(cyBase, hmax + 110 + D + t0 + 6);          // nunca roza las montañas de debajo
  const rad = new Float32Array(32);
  for (let i = 0; i < 32; i++) { const a = i / 32 * 6.283185; rad[i] = clamp(1 + 0.28 * N1(Math.cos(a) * 1.15 + seed * 0.37, Math.sin(a) * 1.15 - seed * 0.21), 0.68, 1.32); }
  const s = { id, seed, x, z, R, D, t0, A, dome, cy, rad, rb: R * 1.34 + 6, yMax: cy + dome + A + 2, yMin: cy - t0 - D * 1.32 - 2,
    big, mesh: null, trees: [], wf: null, wfMesh: null, tower: null, _d: 0 };   // tower: la torre de esta partida, si le toca (planTowers)
  // cascada desde el borde de las islas grandes
  if (R >= 260 && hash2(seed, 50, 51) < 0.72) {
    const a = hash2(seed, 52, 53) * 6.283, Rt = islRadAng(s, a), q = 1.012;
    const dx = Math.cos(a) * Rt * q, dz = Math.sin(a) * Rt * q;
    s.wf = { a, x: x + dx, z: z + dz, y: islTop(s, dx, dz, 1) + 0.5, w: clamp(R * 0.032, 7, 20), len: clamp(D * 0.85 + 90, 150, 400) };
  }
  return s;
}
function bigCell(cx, cz) {
  const key = 'b' + cx + ',' + cz;
  let c = islCells.get(key); if (c) return c;
  c = [];
  const seed = (Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ 0x51ed27) | 0;
  if (hash2(seed, 1, 101) < ISL_P_BIG) {
    const x = (cx + 0.3 + hash2(seed, 2, 102) * 0.4) * ISL_BIG, z = (cz + 0.3 + hash2(seed, 3, 103) * 0.4) * ISL_BIG;
    const R = 330 + hash2(seed, 4, 104) * 270;
    const big = makeIsland('b' + cx + ',' + cz + ',0', seed, x, z, R, pickBand(hash2(seed, 5, 105), hash2(seed, 6, 106)), true);
    c.push(big);
    const ns = 2 + Math.floor(hash2(seed, 7, 107) * 3.99);        // islotes satélite
    for (let k = 0; k < ns; k++) {
      const sd = (seed + (k + 1) * 7919) | 0;
      const a = hash2(sd, 1, 108) * 6.283, dist = R * 1.3 + 90 + hash2(sd, 2, 109) * 320, r = 28 + hash2(sd, 3, 110) * 42;
      c.push(makeIsland('b' + cx + ',' + cz + ',' + (k + 1), sd, x + Math.cos(a) * dist, z + Math.sin(a) * dist, r, big.cy + (hash2(sd, 4, 111) - 0.5) * 520, false));
    }
  }
  islCells.set(key, c); return c;
}
function fineCell(fx, fz) {
  const key = 'f' + fx + ',' + fz;
  let c = islCells.get(key); if (c) return c;
  c = [];
  const seed = (Math.imul(fx, 83492791) ^ Math.imul(fz, 49979687) ^ 0x2f0b13) | 0;
  if (hash2(seed, 1, 201) < ISL_P_FINE) {
    const x = (fx + 0.3 + hash2(seed, 2, 202) * 0.4) * ISL_FINE, z = (fz + 0.3 + hash2(seed, 3, 203) * 0.4) * ISL_FINE;
    const med = hash2(seed, 4, 204) > 0.62;
    const R = med ? 110 + hash2(seed, 5, 205) * 140 : 34 + hash2(seed, 5, 205) * 58;
    let ok = true;
    const bx = Math.floor(x / ISL_BIG), bz = Math.floor(z / ISL_BIG);
    for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1 && ok; i++) for (const o of bigCell(bx + i, bz + j)) {
      if (Math.hypot(x - o.x, z - o.z) < R + o.R * 1.35 + 50) { ok = false; break; }
    }
    if (ok) c.push(makeIsland('f' + fx + ',' + fz, seed, x, z, R, pickBand(hash2(seed, 6, 206), hash2(seed, 7, 207)), false));
  }
  islCells.set(key, c); return c;
}
function islandsInRange(px, pz, range) {
  const out = [];
  if (FLAT || NO_ISL) return out;                           // v29: el campo de pruebas no tiene islas (v34: ni las misiones con world.islands: false)
  const f0x = Math.floor((px - range) / ISL_FINE), f1x = Math.floor((px + range) / ISL_FINE);
  const f0z = Math.floor((pz - range) / ISL_FINE), f1z = Math.floor((pz + range) / ISL_FINE);
  for (let fz = f0z; fz <= f1z; fz++) for (let fx = f0x; fx <= f1x; fx++) for (const s of fineCell(fx, fz)) if (Math.hypot(s.x - px, s.z - pz) < range + s.R) out.push(s);
  const b0x = Math.floor((px - range) / ISL_BIG) - 1, b1x = Math.floor((px + range) / ISL_BIG) + 1;
  const b0z = Math.floor((pz - range) / ISL_BIG) - 1, b1z = Math.floor((pz + range) / ISL_BIG) + 1;
  for (let bz = b0z; bz <= b1z; bz++) for (let bx = b0x; bx <= b1x; bx++) for (const s of bigCell(bx, bz)) if (Math.hypot(s.x - px, s.z - pz) < range + s.R) out.push(s);
  return out;
}

/* ---------- Materiales ---------- */
const islandFS = GLSL_COMMON + `
uniform float uFog; uniform sampler2D uNoise; varying vec3 vW; varying vec3 vN; varying vec2 vAux;
void main(){
  vec3 N = normalize(vN);
  vec3 Vv = vW - cameraPosition; float dist = length(Vv); vec3 vd = Vv / dist;
  float detail = 1.0 - smoothstep(500.0, 2200.0, dist);
  float n1 = texture2D(uNoise, vW.xz * 0.0031).r;
  float n2 = mix(0.5, texture2D(uNoise, vW.xz * 0.0155).g, detail);
  float n3 = mix(0.5, texture2D(uNoise, vW.xz * 0.113).b, detail);
  float ns = texture2D(uNoise, vec2((vW.x + vW.z) * 0.011, vW.y * 0.021)).g;
  float ns2 = mix(0.5, texture2D(uNoise, vec2((vW.x - vW.z) * 0.047, vW.y * 0.06)).b, detail);
  // hierba lozana (algo más viva que la del suelo, para dar aire fantástico)
  vec3 grass = mix(vec3(0.22, 0.46, 0.12), vec3(0.52, 0.60, 0.21), smoothstep(0.30, 0.75, n1));
  grass *= 0.84 + 0.30 * n2; grass *= 0.90 + 0.20 * n3;
  // roca con estratos: cálida arriba, más violácea y oscura hacia la punta
  vec3 rk = mix(vec3(0.50, 0.41, 0.33), vec3(0.28, 0.23, 0.26), clamp(vAux.y * 1.15 + ns * 0.25, 0.0, 1.0));
  rk *= 0.80 + 0.40 * ns; rk *= 0.90 + 0.20 * ns2;
  rk *= 0.95 + 0.05 * sin(vW.y * 0.17 + ns * 6.0) * detail;
  float up = smoothstep(0.36, 0.70, N.y);
  float onTop = up * (1.0 - smoothstep(0.90, 1.0, vAux.x));
  vec3 col = mix(rk, grass, onTop);
  col = mix(col, vec3(0.40, 0.29, 0.18), smoothstep(0.86, 0.98, vAux.x) * up * 0.85);     // borde de tierra
  float moss = (1.0 - smoothstep(0.0, 0.30, vAux.y)) * (1.0 - up) * smoothstep(0.30, 0.75, n2);
  col = mix(col, grass * 0.62, moss * 0.75);                                               // musgo bajo el borde
  float ndl = dot(N, uSunDir);
  float wrap = max((ndl + 0.20) / 1.20, 0.0);
  vec3 sunC = vec3(1.0, 0.70, 0.43) * 1.70;
  vec3 amb = mix(vec3(0.30, 0.22, 0.22), vec3(0.38, 0.46, 0.62), N.y * 0.5 + 0.5);
  vec3 lit = col * (sunC * wrap + amb * 0.95);
  float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
  vec3 fd = normalize(vec3(vd.x, max(vd.y, 0.0) * 0.4, vd.z));
  gl_FragColor = vec4(mix(lit, skyColor(fd), fogF), 1.0);
}`;
const islandMat = new THREE.ShaderMaterial({ uniforms: terrainUniforms, vertexShader: terrainVS, fragmentShader: islandFS, side: THREE.DoubleSide });
const wfUniforms = { uSunDir: { value: SUN_DIR }, uFog: { value: FOG_DENSITY }, uTime: { value: 0 } };
const waterfallMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: wfUniforms,
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GLSL_COMMON + `
  uniform float uFog, uTime; varying vec2 vUv; varying vec3 vW;
  void main(){
    float t = 1.0 - vUv.y;
    float st = vnoise(vec2(vUv.x * 11.0, t * 2.4 - uTime * 1.5)) * 0.55 + vnoise(vec2(vUv.x * 27.0 + 3.0, t * 6.0 - uTime * 2.6)) * 0.45;
    float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    float a = edge * (0.30 + 0.70 * st) * (1.0 - smoothstep(0.50, 1.0, t)) * smoothstep(0.0, 0.03, t);
    vec3 col = mix(vec3(0.60, 0.80, 0.92), vec3(1.0, 0.98, 0.95), st);
    vec3 Vv = vW - cameraPosition; float dist = length(Vv);
    float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
    vec3 fd = normalize(vec3(Vv.x, 0.0, Vv.z));
    gl_FragColor = vec4(mix(col, skyColor(fd), fogF), a * 0.85);
  }`
});

/* ---------- Malla de una isla ---------- */
function buildIslandMesh(s) {
  const R = s.R, NA = R > 300 ? 64 : R > 110 ? 40 : 24, NT = R > 300 ? 20 : R > 110 ? 12 : 7, NB = R > 300 ? 18 : R > 110 ? 12 : 7;
  const nV = 1 + NT * NA + NB * NA + 1;
  const pos = new Float32Array(nV * 3), aux = new Float32Array(nV * 2);
  let v = 0;
  const put = (dx, y, dz, q, dep) => { pos[v * 3] = dx; pos[v * 3 + 1] = y - s.cy; pos[v * 3 + 2] = dz; aux[v * 2] = q; aux[v * 2 + 1] = dep; return v++; };
  put(0, islTop(s, 0, 0, 0), 0, 0, 0);
  const rt = [], rb = [];
  for (let i = 1; i <= NT; i++) {
    const q = i / NT; rt.push(v);
    for (let k = 0; k < NA; k++) { const a = k / NA * 6.283185, r = q * islRadAng(s, a), dx = Math.cos(a) * r, dz = Math.sin(a) * r; put(dx, islTop(s, dx, dz, q), dz, q, 0); }
  }
  for (let j = 0; j < NB; j++) {
    const q = 1 - Math.pow(j / NB, 1.6); rb.push(v);
    for (let k = 0; k < NA; k++) {
      const a = k / NA * 6.283185, r = q * islRadAng(s, a), dx = Math.cos(a) * r, dz = Math.sin(a) * r;
      put(dx, islBot(s, dx, dz, q), dz, q, Math.pow(Math.max(1 - q, 0), 0.8) * (1 + 0.35 * q));
    }
  }
  const tip = put(0, islBot(s, 0, 0, 0), 0, 0, 1);
  const idx = new Uint16Array(NA * 3 + (NT - 1) * NA * 6 + NA * 6 + (NB - 1) * NA * 6 + NA * 3);
  let t = 0;
  const quad = (A, B, C, D) => { idx[t++] = A; idx[t++] = B; idx[t++] = C; idx[t++] = B; idx[t++] = D; idx[t++] = C; };
  for (let k = 0; k < NA; k++) { idx[t++] = 0; idx[t++] = rt[0] + (k + 1) % NA; idx[t++] = rt[0] + k; }
  for (let i = 0; i < NT - 1; i++) for (let k = 0; k < NA; k++) quad(rt[i] + k, rt[i] + (k + 1) % NA, rt[i + 1] + k, rt[i + 1] + (k + 1) % NA);
  for (let k = 0; k < NA; k++) quad(rt[NT - 1] + k, rt[NT - 1] + (k + 1) % NA, rb[0] + k, rb[0] + (k + 1) % NA);
  for (let j = 0; j < NB - 1; j++) for (let k = 0; k < NA; k++) quad(rb[j] + k, rb[j] + (k + 1) % NA, rb[j + 1] + k, rb[j + 1] + (k + 1) % NA);
  for (let k = 0; k < NA; k++) { idx[t++] = rb[NB - 1] + k; idx[t++] = rb[NB - 1] + (k + 1) % NA; idx[t++] = tip; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, islandMat);
  mesh.position.set(s.x, s.cy, s.z);
  islGroup.add(mesh);
  return mesh;
}
function buildIslandTrees(s) {
  const n = s.R < 50 ? 2 : clamp(Math.round(s.R * s.R * 0.0009), 3, 220);
  const list = { conifer: [], broad: [] };
  for (let i = 0; i < n; i++) {
    const a = hash2(s.seed, i, 61) * 6.283, q = Math.sqrt(hash2(s.seed, i, 62)) * 0.80;
    const r = q * islRadAng(s, a), dx = Math.cos(a) * r, dz = Math.sin(a) * r;
    if (s.tower && Math.hypot(s.x + dx - s.tower.x, s.z + dz - s.tower.z) < 14) continue;
    (hash2(s.seed, i, 63) < 0.7 ? list.broad : list.conifer).push(s.x + dx, islTop(s, dx, dz, q), s.z + dz, hash2(s.seed, i, 64), hash2(s.seed, i, 65));
  }
  for (const type of ['conifer', 'broad']) {
    const arr = list[type], m = arr.length / 5;
    if (!m) continue;
    const im = new THREE.InstancedMesh(treeGeos[type], treeMat, m);
    im.frustumCulled = false;
    for (let t = 0; t < m; t++) {
      const sc = 0.9 + arr[t * 5 + 3] * 0.8;
      _dummy.position.set(arr[t * 5], arr[t * 5 + 1] - 0.3, arr[t * 5 + 2]);
      _dummy.rotation.set(0, arr[t * 5 + 4] * 6.283, 0);
      _dummy.scale.set(sc, sc * (0.9 + arr[t * 5 + 4] * 0.35), sc);
      _dummy.updateMatrix(); im.setMatrixAt(t, _dummy.matrix);
      const vv = 0.85 + arr[t * 5 + 4] * 0.4;
      _col.setRGB(vv * 0.95, vv, vv * 0.9); im.setColorAt(t, _col);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    treeGroup.add(im); s.trees.push(im);
  }
}
function buildWaterfall(s) {
  const w = s.wf, g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w.w, w.len, 1, 10);
  const p1 = new THREE.Mesh(geo, waterfallMat), p2 = new THREE.Mesh(geo, waterfallMat);
  p2.rotation.y = Math.PI / 2;
  p1.renderOrder = p2.renderOrder = 3; p1.frustumCulled = p2.frustumCulled = false;
  g.add(p1); g.add(p2);
  g.position.set(w.x, w.y - w.len / 2, w.z); g.rotation.y = Math.PI / 2 - w.a;
  g.userData.geo = geo;
  islGroup.add(g);
  return g;
}
function loadIsland(s) {
  s.mesh = buildIslandMesh(s);
  buildIslandTrees(s);
  if (s.wf) s.wfMesh = buildWaterfall(s);
  islLoaded.set(s.id, s);
}
function unloadIsland(s) {
  if (s.mesh) { islGroup.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh = null; }
  s.trees.forEach(im => { treeGroup.remove(im); im.dispose && im.dispose(); }); s.trees = [];
  if (s.wfMesh) { islGroup.remove(s.wfMesh); s.wfMesh.userData.geo.dispose(); s.wfMesh = null; }
  if (s.tower) { const t = towers.get(s.tower.id); if (t) dropTower(t); }
  islLoaded.delete(s.id);
}
const islLoadR = s => s.R < 100 ? 3400 : s.R < 260 ? 5600 : 8200;

function ensureIslandTowers(px, pz) { /* v10: las torres de las islas son de TOWER_SITES (v13: planTowers), no de cada isla */ }
/* v13: sitio para la torre en una isla: cerca del centro, con la base hundida en el punto más bajo de su planta (que no quede flotando). */
function islandTowerSpot(s) {
  const a = hash2(s.seed, 42, 43) * 6.283, q = 0.06 + hash2(s.seed, 44, 45) * 0.16, r = q * islRadAng(s, a);
  const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
  let y = Infinity;
  for (let i = 0; i < 9; i++) {
    const b = i / 8 * 6.283, rr = i ? TOWER_R * 1.4 : 0, ex = dx + Math.cos(b) * rr, ez = dz + Math.sin(b) * rr;
    y = Math.min(y, islTop(s, ex, ez, Math.min(1, Math.hypot(ex, ez) / islRad(s, ex, ez))));
  }
  return { x: s.x + dx, y: y - 1.5, z: s.z + dz };
}
/* Pone o quita la torre de una isla; si la isla ya está en escena, rehace sus árboles (ninguno donde va la torre). */
function setIslandTower(s, site) {
  s.tower = site;
  if (s.mesh) { s.trees.forEach(im => { treeGroup.remove(im); im.dispose && im.dispose(); }); s.trees = []; buildIslandTrees(s); }
}
function updateIslandStreaming(px, pz) {
  const list = islandsInRange(px, pz, ISL_DATA_R);
  islActive.length = 0;
  for (const s of list) islActive.push(s);
  islPending.length = 0;
  for (const s of list) {
    if (s.mesh) continue;
    const d = Math.hypot(s.x - px, s.z - pz);
    if (d < islLoadR(s)) { s._d = d; islPending.push(s); }
  }
  islPending.sort((a, b) => a._d - b._d);
  for (const s of Array.from(islLoaded.values())) if (Math.hypot(s.x - px, s.z - pz) > islLoadR(s) * 1.2) unloadIsland(s);
  ensureIslandTowers(px, pz);
}
function pumpIslands(budgetMs) {
  const t0 = performance.now(); let built = 0;
  while (islPending.length && (built === 0 || performance.now() - t0 < budgetMs)) {
    const s = islPending.shift();
    if (!s.mesh) { loadIsland(s); built++; }
  }
  return islPending.length;
}
/* bruma al pie de las cascadas */
function updateWaterfalls(dt) {
  wfUniforms.uTime.value = gameTime;
  const p = dragon.position;
  for (const s of islLoaded.values()) {
    const w = s.wf; if (!w) continue;
    const d = Math.hypot(w.x - p.x, w.z - p.z); if (d > 2600) continue;
    if (Math.random() < dt * 16) emit(fxSmoke, w.x + rnd(-w.w, w.w) * 0.6, w.y - w.len + rnd(-6, 6), w.z + rnd(-w.w, w.w) * 0.6, rnd(-1.5, 1.5), rnd(0.5, 2.5), rnd(-1.5, 1.5), rnd(2.2, 3.4), 8, 36, 0.92, 0.96, 1.0, 0.20, 0.5, 0);
  }
}
