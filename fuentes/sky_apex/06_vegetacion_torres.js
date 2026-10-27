/* ============================================================
   4. VEGETACIÓN (árboles instanciados por chunk) Y TORRES ENEMIGAS
   ============================================================ */
const _q = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _e = new THREE.Euler();
function M4(x, y, z, sx, sy, sz, rx, ry, rz) {
  _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_v3.set(x, y, z), _q, _s3.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz));
}
function partGeo(geo, color, m4) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(m4); g.computeVertexNormals();
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = color[0]; c[i * 3 + 1] = color[1]; c[i * 3 + 2] = color[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
function mergeParts(list) {
  let n = 0; list.forEach(g => n += g.attributes.position.count);
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), C = new Float32Array(n * 3);
  let o = 0;
  list.forEach(g => {
    P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.computeBoundingSphere();
  return out;
}

/* ---------- Árboles ---------- */
const treeGeos = (() => {
  const trunk = new THREE.CylinderGeometry(0.28, 0.4, 1, 5);
  const cone = new THREE.ConeGeometry(1, 1, 6);
  const blob = new THREE.IcosahedronGeometry(1, 0);
  const brown = [0.26, 0.18, 0.11];
  const conifer = mergeParts([
    partGeo(trunk, brown, M4(0, 1.0, 0, 1, 2.0, 1)),
    partGeo(cone, [0.06, 0.19, 0.10], M4(0, 3.7, 0, 2.5, 4.4, 2.5)),
    partGeo(cone, [0.08, 0.24, 0.12], M4(0, 5.7, 0, 2.0, 3.8, 2.0)),
    partGeo(cone, [0.11, 0.29, 0.14], M4(0, 7.5, 0, 1.4, 3.2, 1.4))
  ]);
  const broad = mergeParts([
    partGeo(trunk, brown, M4(0, 1.6, 0, 1.2, 3.2, 1.2)),
    partGeo(blob, [0.16, 0.33, 0.09], M4(0, 5.0, 0, 2.7, 2.3, 2.7, 0, 0.4)),
    partGeo(blob, [0.21, 0.39, 0.11], M4(1.4, 4.2, 0.7, 1.9, 1.7, 1.9, 0.3, 1.1)),
    partGeo(blob, [0.18, 0.35, 0.10], M4(-1.3, 4.4, -0.8, 1.8, 1.6, 1.8, 0.2, 2.0))
  ]);
  return { conifer, broad };
})();
const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const treeGroup = new THREE.Group();
scene.add(treeGroup);
const TREE_CELL = TL_BASE / 12;
const _dummy = new THREE.Object3D(), _col = new THREE.Color();

function makeTrees(ch) {
  if (ch.L > 2) return;
  const stride = ch.L <= 1 ? 1 : 2, nFine = Math.round(ch.size / TREE_CELL);
  const gi0 = Math.round(ch.x0 / TREE_CELL), gj0 = Math.round(ch.z0 / TREE_CELL);
  const list = { conifer: [], broad: [] };
  for (let j = 0; j < nFine; j += stride) for (let i = 0; i < nFine; i += stride) {
    const gi = gi0 + i, gj = gj0 + j;
    const x = (gi + hash2(gi, gj, 1)) * TREE_CELL, z = (gj + hash2(gi, gj, 2)) * TREE_CELL;
    terrain(x, z, _o, true);
    if (_o.forest < 0.05 || hash2(gi, gj, 3) > _o.forest * 0.78) continue;
    // altura y pendiente sobre la malla de este chunk (así los árboles tocan el suelo visible)
    const fx = (x - ch.x0) / ch.s + 1, fz = (z - ch.z0) / ch.s + 1, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, G = ch.G, hs = ch.hs;
    const k = iz * G + ix;
    if (ix < 0 || iz < 0 || ix >= G - 1 || iz >= G - 1) continue;
    const y = lerp(lerp(hs[k], hs[k + 1], tx), lerp(hs[k + G], hs[k + G + 1], tx), tz);
    const sl = Math.max(Math.abs(hs[k + 1] - hs[k]), Math.abs(hs[k + G] - hs[k])) / ch.s;
    if (sl > 0.75 || y < 3) continue;
    const conif = hash2(gi, gj, 4) < 0.22 + smooth(60, 280, y) * 0.7;
    (conif ? list.conifer : list.broad).push(x, y, z, hash2(gi, gj, 5), hash2(gi, gj, 6));
  }
  ch.trees = [];
  for (const type of ['conifer', 'broad']) {
    const arr = list[type], n = arr.length / 5;
    if (!n) continue;
    const im = new THREE.InstancedMesh(treeGeos[type], treeMat, n);
    im.frustumCulled = false;
    for (let t = 0; t < n; t++) {
      const sc = (0.8 + arr[t * 5 + 3] * 0.95) * (stride === 2 ? 1.25 : 1);
      _dummy.position.set(arr[t * 5], arr[t * 5 + 1] - 0.3, arr[t * 5 + 2]);
      _dummy.rotation.set(0, arr[t * 5 + 4] * 6.283, 0);
      _dummy.scale.set(sc, sc * (0.9 + arr[t * 5 + 4] * 0.35), sc);
      _dummy.updateMatrix(); im.setMatrixAt(t, _dummy.matrix);
      const v = 0.82 + arr[t * 5 + 4] * 0.4;
      _col.setRGB(v, v * (0.95 + arr[t * 5 + 3] * 0.1), v * 0.95); im.setColorAt(t, _col);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    treeGroup.add(im); ch.trees.push(im);
  }
}
function disposeTrees(ch) {
  if (!ch.trees) return;
  ch.trees.forEach(im => { treeGroup.remove(im); im.dispose && im.dispose(); });
  ch.trees = null;
}
chunkHooks.onCreate = makeTrees;
chunkHooks.onRemove = disposeTrees;

/* ---------- Torres de vigía ---------- */
const TOWER_SX = 2, TOWER_SY = 3;                              // el doble de anchas y el triple de altas que el modelo base (v7: que se distingan en el mapa)
const TOWER_TOP = 35.5 * TOWER_SY, TOWER_R = 4.4 * TOWER_SX;   // punta del tejado (m) y radio del cuerpo: impactos, puntería y choques
const TOWER_CRYSTAL_Y = TOWER_TOP + 24, TOWER_BEACON_PX = 16;  // altura del cristal sobre la base y tamaño de su chispa en pantalla (px)
const towerGeo = (() => {
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10), box = new THREE.BoxGeometry(1, 1, 1), cone = new THREE.ConeGeometry(1, 1, 10);
  const stone = [0.50, 0.47, 0.43], stone2 = [0.42, 0.40, 0.37], wood = [0.30, 0.19, 0.11], roof = [0.55, 0.16, 0.11], dark = [0.08, 0.07, 0.07], cloth = [0.78, 0.12, 0.10];
  const parts = [
    partGeo(cyl, stone2, M4(0, 2.5, 0, 6.4, 5, 6.4)),
    partGeo(cyl, stone, M4(0, 15, 0, 4.4, 20, 4.4)),
    partGeo(cyl, stone2, M4(0, 25.4, 0, 5.4, 1.6, 5.4)),
    partGeo(box, dark, M4(0, 1.4, 4.1, 1.8, 2.8, 0.6)),
    partGeo(box, dark, M4(3.9, 14, 0, 0.6, 2.2, 1.0)),
    partGeo(box, dark, M4(-3.9, 18, 0, 0.6, 2.2, 1.0)),
    partGeo(cone, roof, M4(0, 31, 0, 6.4, 9, 6.4))
  ];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; parts.push(partGeo(box, stone, M4(Math.cos(a) * 5.2, 27.1, Math.sin(a) * 5.2, 1.5, 1.7, 1.5, 0, -a))); }
  // plataforma con ballesta
  parts.push(partGeo(box, wood, M4(0, 26.3, 0, 3.4, 0.4, 3.4)));
  parts.push(partGeo(box, wood, M4(0, 27.0, 0.0, 0.5, 0.5, 4.2, 0.15, 0, 0)));
  parts.push(partGeo(box, wood, M4(0, 27.0, -1.4, 3.2, 0.25, 0.3)));
  return mergeParts(parts).applyMatrix4(new THREE.Matrix4().makeScale(TOWER_SX, TOWER_SY, TOWER_SX));
})();
const ruinGeo = (() => {
  const cyl = new THREE.CylinderGeometry(1, 1.1, 1, 8), box = new THREE.BoxGeometry(1, 1, 1);
  const c1 = [0.20, 0.18, 0.17], c2 = [0.12, 0.11, 0.11];
  const parts = [partGeo(cyl, c1, M4(0, 1.6, 0, 6.2, 3.2, 6.2))];
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 5 + (i % 3) * 2.4; parts.push(partGeo(box, i % 2 ? c1 : c2, M4(Math.cos(a) * r, 0.9, Math.sin(a) * r, 1.8 + (i % 4) * 0.7, 1.6, 1.4 + (i % 3) * 0.8, 0.2 * i, a, 0.15 * i))); }
  return mergeParts(parts).applyMatrix4(new THREE.Matrix4().makeScale(TOWER_SX, TOWER_SX, TOWER_SX));
})();
const towerMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const towerGroup = new THREE.Group();
scene.add(towerGroup);
/* Cristal morado que flota y gira sobre el tejado de cada torre viva: se ve desde lejos. Tres piezas: el cristal (facetado, con brillo propio),
   un halo grande que se encoge con la distancia y una chispa de tamaño fijo en pantalla (TOWER_BEACON_PX) que la marca a cualquier distancia.
   Los materiales se crean al cargar la primera torre (la textura de brillo se define más abajo). */
let crystalRes = null;
function makeCrystal(x, y, z) {
  if (!crystalRes) {
    const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(7.5, 15, 7.5);                  // 15 m de ancho y 30 de alto
    crystalRes = {
      geo, mat: new THREE.MeshPhongMaterial({ color: 0x9a4dff, emissive: 0x5b16c8, specular: 0xf0dcff, shininess: 90, flatShading: true }),
      halo: new THREE.SpriteMaterial({ map: glowTexW, color: 0xa855ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 }),
      beacon: new THREE.SpriteMaterial({ map: glowTexW, color: 0xd4a8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false })
    };
  }
  const g = new THREE.Group(); g.position.set(x, y + TOWER_CRYSTAL_Y, z);
  g.add(new THREE.Mesh(crystalRes.geo, crystalRes.mat));
  const halo = new THREE.Sprite(crystalRes.halo); halo.scale.setScalar(85); g.add(halo);
  const beacon = new THREE.Sprite(crystalRes.beacon); beacon.scale.setScalar(TOWER_BEACON_PX * 2 * Math.tan(43 * Math.PI / 180) / 720); g.add(beacon);   // (para 720 px de alto y FOV ≈ 86°)
  g.children[0].renderOrder = 1; halo.renderOrder = beacon.renderOrder = 7;
  towerGroup.add(g);
  return g;
}
/* Crea (o recupera en ruinas) la torre de una celda o de una isla; dropTower la descarga. */
function addTower(id, x, y, z, rotY) {
  const dead = towerState.destroyed.has(id);
  const mesh = new THREE.Mesh(dead ? ruinGeo : towerGeo, towerMat);
  mesh.position.set(x, y - 0.5, z); mesh.rotation.y = rotY;
  towerGroup.add(mesh);
  towers.set(id, { id, x, y, z, hp: dead ? 0 : TOWER_HP, dead, mesh, crystal: dead ? null : makeCrystal(x, y, z), spin: rotY, cool: 1.5 + Math.random() * 2.5, smokeT: 0, mslCool: 6 + Math.random() * 24, mslLock: 0 });
}
function dropTower(t) {
  towerGroup.remove(t.mesh); if (t.crystal) towerGroup.remove(t.crystal);
  towers.delete(t.id);
}
/* Distancia² mínima entre los segmentos p1-q1 y p2-q2 (llamarada y rayo contra el eje de una torre). Deja en _sdc el punto más cercano de p1-q1. */
const _sd1 = new THREE.Vector3(), _sd2 = new THREE.Vector3(), _sdr = new THREE.Vector3(), _sdc = new THREE.Vector3();
function segSegDist2(p1, q1, p2, q2) {
  _sd1.subVectors(q1, p1); _sd2.subVectors(q2, p2); _sdr.subVectors(p1, p2);
  const a = _sd1.lengthSq(), e = _sd2.lengthSq(), f = _sd2.dot(_sdr), c = _sd1.dot(_sdr), b = _sd1.dot(_sd2), den = a * e - b * b;
  let s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0, t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
  _sdc.copy(p1).addScaledVector(_sd1, s);
  return _sdr.copy(p2).addScaledVector(_sd2, t).distanceToSquared(_sdc);
}
const _tb = new THREE.Vector3(), _tt = new THREE.Vector3();
function towerSegDist2(t, a, b) { return segSegDist2(a, b, _tb.set(t.x, t.y, t.z), _tt.set(t.x, t.y + TOWER_TOP, t.z)); }

const towers = new Map();           // id -> torre viva o ruina cargada
const towerState = { destroyed: new Set(), score: 0, kills: 0 };
const TOWER_LOAD = 3600, TOWER_UNLOAD = 4600, TOWER_HP = 60;   // carga y descarga (m); vida en puntos de daño (un proyectil rápido quita 5)

/* v10: el mundo tiene exactamente TOWER_TOTAL torres, repartidas en un anillo alrededor del inicio (TOWER_ZONE). Destruirlas todas es la
   mitad del objetivo. v13: en cada partida, entre TOWER_ISL[0] y TOWER_ISL[1] de ellas van sobre islas flotantes distintas (al azar, en islas
   de al menos TOWER_ISL_R m de radio) y el resto en tierra firme, sin mucha pendiente, elegidas al azar entre GROUND_SITES (posiciones fijas
   con la semilla) y separadas al menos TOWER_GAP m. planTowers rellena TOWER_SITES al arrancar y en cada partida nueva (resetRun).
   v15: el número, la zona y las de islas los pone la misión (RUN.towers, de su receta); estas constantes son los valores por defecto.
   v19: el anillo se centra en el punto de partida de la misión (RUN.towers.center) y el reparto sale siempre igual con la semilla del
   mundo, salvo que la receta pida uno nuevo en cada partida (RUN.towers.random: el combate libre). */
const TOWER_TOTAL = 30, TOWER_ZONE = [1500, 9000], TOWER_GAP = 1300;
const TOWER_ISL = [10, 15], TOWER_ISL_R = 110, TOWER_ISL_GAP = 700;   // torres en islas por partida, radio mínimo de la isla, separación (en planta) con las de tierra
/* Candidatas en tierra (más de las necesarias) dentro del anillo zone alrededor de (cx, cz). Fijas con la semilla: se calculan una vez
   por zona (clearWorld vacía la caché al cambiar de mundo). */
const groundSiteCache = new Map();
function groundSites(zone, cx, cz) {
  const key = zone[0] + ',' + zone[1] + ',' + cx + ',' + cz;
  if (groundSiteCache.has(key)) return groundSiteCache.get(key);
  const out = []; let k = 0;
  while (out.length < 44 && k < 20000) {
    k++;
    const a = hash2(k, 3, 4141) * Math.PI * 2, r = Math.sqrt(lerp(zone[0] ** 2, zone[1] ** 2, hash2(k, 5, 4141)));
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = heightAt(x, z);
    if (h < 9 || h > 600 || slopeAt(x, z) > 0.3) continue;            // ni agua ni cauces ni laderas empinadas
    if (out.some(t => Math.hypot(t.x - x, t.z - z) < 1050)) continue;
    out.push({ x, y: h, z, rot: hash2(k, 7, 4141) * 6.28 });
  }
  groundSiteCache.set(key, out); return out;
}
const TOWER_SITES = [];                                     // las de esta partida: { id, x, y, z, rot, isl (la isla, si está en una) }
const shuffled = (a, rand) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function planTowers() {
  for (const t of TOWER_SITES) if (t.isl) setIslandTower(t.isl, null);
  TOWER_SITES.length = 0;
  const Z = RUN.towers.zone, ISL = RUN.towers.islands, total = RUN.towers.total, [cx, cz] = RUN.towers.center || [0, 0];
  const rand = RUN.towers.random ? Math.random : seededRandom(SEED ^ 0x70e55);   // v19: misma semilla → mismas torres
  const dc = s => Math.hypot(s.x - cx, s.z - cz);
  // islas: las de la zona con sitio para la torre, al azar y separadas entre sí
  const cand = shuffled(islandsInRange(cx, cz, Z[1]).filter(s => s.R >= TOWER_ISL_R && dc(s) > Z[0] && dc(s) < Z[1]), rand);
  const n = Math.min(total, ISL[0] + Math.floor(rand() * (ISL[1] - ISL[0] + 1)));
  for (const s of cand) {
    if (TOWER_SITES.length >= n) break;
    if (TOWER_SITES.some(t => Math.hypot(t.x - s.x, t.z - s.z) < TOWER_GAP)) continue;
    const sp = islandTowerSpot(s), site = { id: 'I' + TOWER_SITES.length, x: sp.x, y: sp.y, z: sp.z, rot: rand() * 6.28, isl: s };
    TOWER_SITES.push(site); setIslandTower(s, site);
  }
  // tierra: el resto, al azar entre las candidatas (primero respetando las separaciones; si no llegan, sin ellas)
  const gr = shuffled(groundSites(Z, cx, cz), rand), isl = TOWER_SITES.slice();
  for (const relax of [false, true]) for (const g of gr) {
    if (TOWER_SITES.length >= total) break;
    if (TOWER_SITES.some(t => t.x === g.x && t.z === g.z)) continue;
    if (!relax && (TOWER_SITES.some(t => !t.isl && Math.hypot(t.x - g.x, t.z - g.z) < TOWER_GAP) || isl.some(t => Math.hypot(t.x - g.x, t.z - g.z) < TOWER_ISL_GAP))) continue;
    TOWER_SITES.push({ id: 'T' + TOWER_SITES.length, x: g.x, y: g.y, z: g.z, rot: g.rot, isl: null });
  }
}
function updateTowerStreaming(px, pz) {
  for (const s of TOWER_SITES) {
    if (towers.has(s.id) || Math.hypot(s.x - px, s.z - pz) > TOWER_LOAD) continue;
    addTower(s.id, s.x, s.y, s.z, s.rot);
  }
  for (const t of [...towers.values()]) {
    if (Math.hypot(t.x - px, t.z - pz) > TOWER_UNLOAD) dropTower(t);
  }
}
function losClear(ax, ay, az, bx, by, bz) {
  for (let i = 1; i < 10; i++) {
    const f = i / 10;
    if (heightAt(lerp(ax, bx, f), lerp(az, bz, f)) > lerp(ay, by, f) - 1) return false;
    if (islandAt(lerp(ax, bx, f), lerp(ay, by, f), lerp(az, bz, f), 2)) return false;
  }
  return true;
}
/* soft = daño continuo (llamarada, rayo): solo chispas y un golpe de sonido de vez en cuando. at = punto del impacto (si no, el centro de la torre).
   Al caer, la torre recarga MSL_TOWER bolas guiadas (hasta MSL_MAX). */
/* v17: el daño se multiplica por el del dragón elegido (heroStats().dmg); sure: la bola guiada destruye la torre siempre, de un impacto. */
function damageTower(t, amount, soft, at, sure) {
  if (t.dead) return;
  amount *= heroStats().dmg; if (sure) amount = Math.max(amount, t.hp);
  t.hp -= amount; ultGain(amount * ULT_PER_DMG);
  const hx = at ? at.x : t.x, hy = at ? at.y : t.y + TOWER_TOP * 0.55, hz = at ? at.z : t.z;
  if (t.hp > 0) {
    if (soft) sparks(hx + rnd(-4, 4), hy + rnd(-4, 4), hz + rnd(-4, 4), 2, 0, 4, 0);
    else if (amount >= 20) explode(hx, hy, hz, 0.55);
    else sparks(hx, hy, hz, 8, 0, 6, 0);
    if (!(gameTime - t.sndT < 0.22)) { t.sndT = gameTime; sfx.hit(); }
    return;
  }
  ultGain(ULT_PER_KILL * 0.5);
  t.dead = true; towerState.destroyed.add(t.id);
  towerState.score += 100; towerState.kills++;
  towerGroup.remove(t.mesh);
  t.mesh = new THREE.Mesh(ruinGeo, towerMat);
  t.mesh.position.set(t.x, t.y - 0.5, t.z); t.mesh.rotation.y = Math.random() * 6.28;
  towerGroup.add(t.mesh);
  if (t.crystal) {                                         // el cristal estalla en esquirlas moradas
    const c = t.crystal.position;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.283, u = rnd(-1, 1), s = Math.sqrt(1 - u * u), sp = rnd(15, 70);
      emit(fxAdd, c.x, c.y, c.z, Math.cos(a) * s * sp, u * sp + 10, Math.sin(a) * s * sp, rnd(0.6, 1.4), rnd(2.5, 4.5), 0.5, 0.68, 0.33, 1, 1, 0.8, 20);
    }
    emit(fxAdd, c.x, c.y, c.z, 0, 0, 0, 0.35, 30, 90, 0.75, 0.45, 1, 1, 0, 0);
    towerGroup.remove(t.crystal); t.crystal = null;
  }
  explode(t.x, t.y + TOWER_TOP * 0.35, t.z, 2.2); explode(t.x, t.y + TOWER_TOP * 0.75, t.z, 1.6); sfx.boom(1.0);
  debris(t.x, t.y + TOWER_TOP * 0.3, t.z);
  const got = Math.min(MSL_TOWER, MSL_MAX - W.msl); W.msl += got;
  toast('Torre destruida  +100' + (got > 0 ? '  ·  +' + got + ' bola' + (got > 1 ? 's' : '') + ' guiada' + (got > 1 ? 's' : '') : '') + '  ·  ' + towerState.kills + '/' + RUN.towers.total);
}
