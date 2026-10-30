
/* ============================================================
   6g. BATALLONES DE SOLDADOS (v29)
   Formaciones rectangulares de entre soldados_min y soldados_max soldados (al azar en cada bloque; pestaña «Batallón» del Excel), todos
   con el mismo modelo low-poly (soldado.glb, 172 triángulos) y cada batallón en una InstancedMesh: una llamada de dibujo por bloque.
   Son el objetivo principal de la llamarada a ras de tierra.
   · Cada soldado tiene su vida (vida): la llamarada los quema uno a uno dentro de su cono; un proyectil, una bola guiada o el rayo matan a
     los que pillan en su radio (radio_basico, radio_guiado, radio_rayo). Al morir arden un momento, caen y quedan carbonizados.
   · Como blanco (fijar, misiones, HUD) cuenta el batallón entero: su «vida» son los soldados en pie, y cae cuando no queda ninguno.
   · Flechas: con el jugador a menos de flechas_alcance, cada cierto tiempo el batallón lanza una andanada (líneas finas con parábola).
     Casi no hacen daño (flechas_dano): son sobre todo un efecto.
   · Quietos, con un leve balanceo (cuerpo y lanza) en el shader; la marcha llegará con las misiones.
   ============================================================ */
const SOLDIER_T = { burn: 1.3, fall: 0.5 };                // s ardiendo antes de quedar carbonizado; s que tarda en caer
const _Bm = new THREE.Matrix4(), _Bq = new THREE.Quaternion(), _Bq2 = new THREE.Quaternion(), _Bp = new THREE.Vector3(), _Bs = new THREE.Vector3(1, 1, 1);
const _Bc = new THREE.Color(), _Bv = new THREE.Vector3(), _Bw = new THREE.Vector3();
const soldierTime = unitTime;                              // (v30: el tiempo común de los shaders de las unidades, 6f)
let soldierMat = null;
/* Material compartido: el del modelo (color por vértice) con el balanceo en el vértice. uv.x = pieza (03_soldado.py): 1 = brazo de la lanza.
   Los muertos (color de la instancia oscuro) no se mueven. */
function soldierMaterial() {
  if (soldierMat) return soldierMat;
  soldierMat = unitRes.soldado[0].mat.clone();
  soldierMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = soldierTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING_COLOR
        float alive = step(0.3, instanceColor.g);
      #else
        float alive = 1.0;
      #endif
      float ph = fract(dot(instanceMatrix[3].xz, vec2(0.0713, 0.0397))) * 6.2832;
      float hy = max(transformed.y, 0.0);
      transformed.x += sin(uTime * 0.9 + ph) * 0.012 * hy * alive;
      transformed.z += sin(uTime * 0.7 + ph * 1.7) * 0.01 * hy * alive;
      if (abs(uv.x - 1.0) < 0.1) transformed.z += sin(uTime * 1.6 + ph) * 0.035 * hy * alive;`);
  };
  return soldierMat;
}

/* n: soldados (sin él, al azar entre soldados_min y soldados_max con la semilla seed). Rumbo: hacia donde miran. */
function addBatallon(x, z, heading, tags, n, seed) {
  const S = STATS.batallon, rand = seededRandom(seed || 1), ang = heading * Math.PI / 180;
  n = Math.round(n || lerp(S.soldados_min, Math.max(S.soldados_min, S.soldados_max), rand()));
  n = clamp(n, 1, 2000);
  const gap = Math.max(0.8, S.separacion), cols = Math.ceil(Math.sqrt(n * 2.2)), rows = Math.ceil(n / cols);
  const w = (cols - 1) * gap, dpt = (rows - 1) * gap, fx = Math.sin(ang), fz = -Math.cos(ang), rx = -fz, rz = fx;
  const u = newUnit('batallon', { tags: tags || [], label: 'Batallón', killText: 'Batallón aniquilado', hp: n, hpMax: n, score: S.puntos, heading: ang,
    n, alive: n, ground: true, w: w + 2, d: dpt + 2, half: Math.max(w, dpt) * 0.5 + 2, markR: 4500, radar: 'rect', noCrash: true, mesh: null, volleyT: rnd(0.5, 2),
    upd: updBatallon, hurt: battHurt, flame: battFlame, laserHit: battLaser, boxHit: battBox, cleanup: battCleanup, onKill: () => {} });
  u.pos.set(x, groundAt(x, z) + 1, z); u.q.setFromAxisAngle(UP, -ang);
  // soldados: rejilla con un poco de desorden; posiciones en el mundo, rumbo propio, vida y estado (0 en pie, 1 ardiendo, 2 muerto)
  u.wx = new Float32Array(n); u.wy = new Float32Array(n); u.wz = new Float32Array(n); u.yaw = new Float32Array(n);
  u.shp = new Float32Array(n).fill(S.vida); u.st = new Uint8Array(n); u.tDie = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const lr = (c - (cols - 1) / 2) * gap + (rand() - 0.5) * 0.35 * gap, lb = (r - (rows - 1) / 2) * gap + (rand() - 0.5) * 0.35 * gap;
    u.wx[i] = x + rx * lr - fx * lb; u.wz[i] = z + rz * lr - fz * lb; u.wy[i] = groundAt(u.wx[i], u.wz[i]);
    u.yaw[i] = -ang + (rand() - 0.5) * 0.3;
  }
  u.capDef = [[-w / 2 - 1, 0.5, 0, w / 2 + 1, 0.5, 0, dpt / 2 + 1.5]];   // (solo para el descarte rápido: el impacto de verdad es la caja, battBox)
  unitCaps(u);
  return u;
}
function battMesh(u) {
  const geo = unitRes.soldado[0].geo, m = new THREE.InstancedMesh(geo, soldierMaterial(), u.n);
  u.mesh = m;
  for (let i = 0; i < u.n; i++) { soldierMatrix(u, i); m.setColorAt(i, _Bc.setRGB(1, 1, 1)); }
  m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  m.frustumCulled = false;                                 // (la esfera de la geometría es la de un soldado, no la del bloque)
  scene.add(m);
}
function battCleanup(u) { if (u.mesh) { scene.remove(u.mesh); u.mesh.dispose(); u.mesh = null; } }
/* Matriz de un soldado: en pie, cayendo de espaldas o tumbado. */
function soldierMatrix(u, i) {
  _Bp.set(u.wx[i], u.wy[i], u.wz[i]); _Bq.setFromAxisAngle(UP, u.yaw[i]);
  if (u.st[i]) {
    const k = clamp((gameTime - u.tDie[i]) / SOLDIER_T.fall, 0, 1);
    _Bq.multiply(_Bq2.setFromAxisAngle(_Ux, -k * k * 1.45)); _Bp.y -= k * 0.05;
  }
  u.mesh.setMatrixAt(i, _Bm.compose(_Bp, _Bq, _Bs));
}
/* Caja del bloque (en sus ejes, de 0 a 3 m de alto) contra el segmento p→q: fracción del segmento donde entra, o -1. */
function battBox(u, p, q, pad) {
  _Bq.copy(u.q).invert();
  _Bv.subVectors(p, u.pos).applyQuaternion(_Bq); _Bw.subVectors(q, u.pos).applyQuaternion(_Bq);
  let t0 = 0, t1 = 1;
  const lo = [-u.w / 2 - pad, -1 - pad, -u.d / 2 - pad], hi = [u.w / 2 + pad, 2.2 + pad, u.d / 2 + pad], a = [_Bv.x, _Bv.y, _Bv.z], b = [_Bw.x, _Bw.y, _Bw.z];
  for (let k = 0; k < 3; k++) {
    const dd = b[k] - a[k];
    if (Math.abs(dd) < 1e-9) { if (a[k] < lo[k] || a[k] > hi[k]) return -1; continue; }
    let e0 = (lo[k] - a[k]) / dd, e1 = (hi[k] - a[k]) / dd; if (e0 > e1) { const t = e0; e0 = e1; e1 = t; }
    t0 = Math.max(t0, e0); t1 = Math.min(t1, e1); if (t0 > t1) return -1;
  }
  return t0;
}
/* Daño de un soldado (n puntos); si muere, arde, cae y suma sus puntos. */
function hitSoldier(u, i, n) {
  if (u.st[i]) return;
  u.shp[i] -= n;
  if (u.shp[i] > 0) return;
  u.st[i] = 1; u.tDie[i] = gameTime; u.alive--; u.hp = u.alive;
  if (!byAlly) towerState.score += STATS.batallon.puntos_soldado;
  stats.soldiers = (stats.soldiers || 0) + (byAlly ? 0 : 1);
  if (u.alive <= 0) killUnit(u);
}
/* Proyectiles y bolas guiadas: los soldados a menos del radio del arma del punto del impacto (en planta, y a poca altura). */
function battHurt(u, n, soft, at, how) {
  const S = STATS.batallon, r = how === 'msl' ? S.radio_guiado : how === 'laser' ? S.radio_rayo : S.radio_basico, r2 = r * r;
  for (let i = 0; i < u.n; i++) {
    if (u.st[i]) continue;
    const dx = u.wx[i] - at.x, dz = u.wz[i] - at.z;
    if (dx * dx + dz * dz < r2 && Math.abs(u.wy[i] + 1 - at.y) < r + 2) hitSoldier(u, i, n);
  }
  if (!soft) { sparks(at.x, at.y, at.z, 8, 0, 6, 0); emit(fxSmoke, at.x, at.y, at.z, rnd(-2, 2), rnd(3, 6), rnd(-2, 2), rnd(1.5, 2.5), 3, 10, 0.4, 0.35, 0.3, 0.5, 0.8, 0); }
  if (!(gameTime - u.sndT < 0.07)) { u.sndT = gameTime; sfx.hit(); }
  return false;
}
/* Llamarada: cono desde S en la dirección D hasta lim m (el de los demás blancos, 2 m + un 11 % de la distancia, más radio_llamas). */
function battFlame(u, S, D, lim, amt, dt) {
  const extra = STATS.batallon.radio_llamas;
  let hits = 0;
  for (let i = 0; i < u.n; i++) {
    if (u.st[i]) continue;
    const mx = u.wx[i] - S.x, my = u.wy[i] + 1 - S.y, mz = u.wz[i] - S.z, along = mx * D.x + my * D.y + mz * D.z;
    if (along < 0 || along > lim + 3) continue;
    const r = 2 + along * 0.11 + extra;
    if (mx * mx + my * my + mz * mz - along * along < r * r) { hitSoldier(u, i, amt); hits++; }
  }
  if (hits) { _Bv.copy(S).addScaledVector(D, lim); flameHit(_Bv, dt); }
}
function battLaser(u, S, E, amt) {
  const r = STATS.batallon.radio_rayo, r2 = r * r;
  for (let i = 0; i < u.n; i++) {
    if (u.st[i]) continue;
    _Bv.set(u.wx[i], u.wy[i] + 1, u.wz[i]);
    if (segPointDist2(S, E, _Bv) < r2) hitSoldier(u, i, amt);
  }
}

/* ---------- Cada fotograma ---------- */
function updBatallon(u, dt, P, d) {
  if (!u.mesh && unitRes.soldado) battMesh(u);
  if (!u.mesh) return;
  u.mesh.visible = d < 6000;
  // los que arden o caen: matriz y color (naranja que parpadea → carbonizados); llamas pequeñas y humo de cerca
  let dirty = false;
  for (let i = 0; i < u.n; i++) {
    if (u.st[i] !== 1) continue;
    const t = gameTime - u.tDie[i]; dirty = true;
    soldierMatrix(u, i);
    if (t < SOLDIER_T.burn) {
      const f = 0.75 + 0.25 * Math.sin(gameTime * 40 + i);
      u.mesh.setColorAt(i, _Bc.setRGB(lerp(1.9, 0.25, t / SOLDIER_T.burn) * f, lerp(0.9, 0.2, t / SOLDIER_T.burn) * f, lerp(0.35, 0.18, t / SOLDIER_T.burn)));
      if (d < 1500 && Math.random() < 0.35) emit(fxAdd, u.wx[i] + rnd(-0.4, 0.4), u.wy[i] + rnd(0.3, 1.6), u.wz[i] + rnd(-0.4, 0.4), rnd(-1, 1), rnd(2, 5), rnd(-1, 1), rnd(0.3, 0.6), rnd(1.2, 2.2), 0.4, 1, rnd(0.45, 0.7), 0.15, 0.85, 0.5, -2);
    } else {
      u.st[i] = 2; u.mesh.setColorAt(i, _Bc.setRGB(0.13, 0.12, 0.12));
      if (d < 1500) emit(fxSmoke, u.wx[i], u.wy[i] + 0.5, u.wz[i], rnd(-0.5, 0.5), rnd(1.5, 3), rnd(-0.5, 0.5), rnd(1.5, 2.5), 1.2, 4, 0.12, 0.11, 0.1, 0.5, 0.3, -0.5);
    }
  }
  if (dirty) { u.mesh.instanceMatrix.needsUpdate = true; u.mesh.instanceColor.needsUpdate = true; }
  if (u.dead) return;
  // flechas: andanadas hacia el jugador
  const S = STATS.batallon;
  if (state !== 'playing' || holdFire() || d > S.flechas_alcance) return;
  u.volleyT -= dt; if (u.volleyT > 0) return;
  const pause = Math.max(0.3, S.flechas_pausa); u.volleyT = pause * rnd(0.8, 1.2);
  const k = Math.round(S.flechas_andanada * Math.sqrt(u.alive / u.n));
  for (let j = 0; j < k; j++) {
    let i = Math.floor(Math.random() * u.n); for (let g = 0; g < 8 && u.st[i]; g++) i = Math.floor(Math.random() * u.n);
    if (u.st[i]) continue;
    _Bv.set(u.wx[i], u.wy[i] + 1.7, u.wz[i]);
    if (!ballisticAim(_Bv, Math.max(20, S.flechas_vel), deg(S.flechas_dispersion), _Bw)) {   // fuera de su alcance: al aire hacia él igualmente
      _Bw.subVectors(P, _Bv); _Bw.y = 0; _Bw.normalize(); _Bw.y = 1.4; _Bw.normalize().multiplyScalar(S.flechas_vel);
      _Bw.x += rnd(-4, 4); _Bw.z += rnd(-4, 4);
    }
    spawnArrow(_Bv, _Bw);
  }
}

/* ---------- Flechas: líneas finas con gravedad (un solo LineSegments para todas) ---------- */
const ARROW_CAP = 900, ARROW_LEN = 2.2;
const arrows = { n: 0, pos: new Float32Array(ARROW_CAP * 3), vel: new Float32Array(ARROW_CAP * 3), life: new Float32Array(ARROW_CAP) };
const arrowGeo = new THREE.BufferGeometry(), arrowBuf = new Float32Array(ARROW_CAP * 6);
arrowGeo.setAttribute('position', new THREE.BufferAttribute(arrowBuf, 3).setUsage(THREE.DynamicDrawUsage));
const arrowMesh = new THREE.LineSegments(arrowGeo, new THREE.LineBasicMaterial({ color: 0x3d3128 }));
arrowMesh.frustumCulled = false; arrowMesh.renderOrder = 3; scene.add(arrowMesh);
function spawnArrow(p, v) {
  if (arrows.n >= ARROW_CAP) return;
  const i = arrows.n++;
  arrows.pos[i * 3] = p.x; arrows.pos[i * 3 + 1] = p.y; arrows.pos[i * 3 + 2] = p.z;
  arrows.vel[i * 3] = v.x; arrows.vel[i * 3 + 1] = v.y; arrows.vel[i * 3 + 2] = v.z; arrows.life[i] = 9;
}
function arrowsClear() { arrows.n = 0; arrowGeo.setDrawRange(0, 0); }
function updateArrows(dt) {
  const A = arrows, P = dragon.position, shOn = shieldOn(), dmg = STATS.batallon.flechas_dano;
  if (shOn) shieldCenter(_shC);
  for (let i = A.n - 1; i >= 0; i--) {
    const o = i * 3;
    A.vel[o + 1] -= UNIT_G * dt;
    A.pos[o] += A.vel[o] * dt; A.pos[o + 1] += A.vel[o + 1] * dt; A.pos[o + 2] += A.vel[o + 2] * dt;
    A.life[i] -= dt;
    const x = A.pos[o], y = A.pos[o + 1], z = A.pos[o + 2];
    let dead = A.life[i] <= 0 || y < groundAt(x, z);
    if (!dead && state === 'playing') {
      _Bv.set(x, y, z);
      if (shOn && _Bv.distanceTo(_shC) < SHIELD_R) { shieldHit(_Bv, 0.15); dead = true; }
      else if (_Bv.distanceToSquared(P) < PLAYER_HIT_R * PLAYER_HIT_R) { hurtDragon(dmg, 'Las flechas de un batallón te derribaron', true); dead = true; }
    }
    if (dead) {                                            // (la última pasa a su hueco)
      const j = --A.n;
      if (i !== j) { for (let k = 0; k < 3; k++) { A.pos[o + k] = A.pos[j * 3 + k]; A.vel[o + k] = A.vel[j * 3 + k]; } A.life[i] = A.life[j]; }
    }
  }
  for (let i = 0; i < A.n; i++) {                           // cada flecha: de la punta hacia atrás, en la dirección en que vuela
    const o = i * 3, vx = A.vel[o], vy = A.vel[o + 1], vz = A.vel[o + 2], k = ARROW_LEN / (Math.hypot(vx, vy, vz) || 1);
    arrowBuf[i * 6] = A.pos[o]; arrowBuf[i * 6 + 1] = A.pos[o + 1]; arrowBuf[i * 6 + 2] = A.pos[o + 2];
    arrowBuf[i * 6 + 3] = A.pos[o] - vx * k; arrowBuf[i * 6 + 4] = A.pos[o + 1] - vy * k; arrowBuf[i * 6 + 5] = A.pos[o + 2] - vz * k;
  }
  arrowGeo.attributes.position.needsUpdate = true; arrowGeo.setDrawRange(0, A.n * 2);
}
