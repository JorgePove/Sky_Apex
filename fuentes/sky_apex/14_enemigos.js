/* ============================================================
   6b. DRAGONES ENEMIGOS (IA sencilla)
   Mismo modelo que el del jugador (el TyrantDragon, copiado con su propio esqueleto y teñido de amarillo, un 50 % más grande),
   mismas bolas de fuego, misma velocidad máxima sin boost. Se animan con animateTyrant, como el del jugador:
   clips de vuelo y planeo, cuello hacia el jugador, mandíbula al disparar. Para ahorrar, solo se animan los que se ven
   (los lejanos, cada dos o tres fotogramas: ENEMY_ANIM_LOD); los que no se ven salen de la escena. Ciclo de combate: patrulla → (detección) → pasada de ataque con aproximación
   en arco → rompe y se aleja → se recoloca para atacar por la espalda → nueva pasada.
   Al derribar uno, tras unos segundos reaparece otro lejos del jugador (siempre hay ENEMY_COUNT).
   Todos los valores de ajuste están aquí arriba.
   ============================================================ */
const ENEMY_COUNT = 6;                // dragones simultáneos en el mapa
const ENEMY_TOTAL = 20;               // v10: dragones en toda la partida (siguen saliendo de ENEMY_COUNT en ENEMY_COUNT hasta que han aparecido todos)
                                      // v15: estos dos son los valores por defecto; los de cada misión van en su receta (RUN.dragons)
const ENEMY_HP = 100;                 // vida en puntos de daño (proyectil rápido 5, bola guiada 70, llamarada y rayo por segundo: ver «Armas del jugador»)
const ENEMY_DMG = 15;                 // daño de su bola de fuego sobre el jugador
const ENEMY_SCORE = 300;              // puntos por derribo (una torre da 100)
const ENEMY_VMAX = 550 / 3.6;         // = velocidad máxima del jugador SIN boost (VCRUISE_MAX)
const ENEMY_DETECT = 2000;            // radio de detección (m)
const ENEMY_LOSE = 3800;              // más allá de esta distancia pierden al jugador
const ENEMY_FIRE_RANGE = 1000;        // alcance de disparo (m)
const ENEMY_FIRE_CD = [1.7, 2.9];     // pausa entre bolas de fuego (s)
const ENEMY_AIM_ERR = 0.022;          // imprecisión de la puntería (rad): ±2,2 % de la distancia
const ENEMY_STAGGER = 0.4;            // separación mínima entre disparos de distintos dragones (s)
const ENEMY_SCALE = 1.5;              // tamaño respecto al dragón del jugador (+50 %)
const ENEMY_TINT = new THREE.Color(1.7, 1.25, 0.18), ENEMY_EYES = 0xff2418;  // piel amarilla (por encima de 1: compensa la luz azulada del cielo) y ojos rojos
const ENEMY_ANIM_LOD = [700, 1800];   // animación en cada fotograma hasta 700 m, uno de cada dos hasta 1800 m y uno de cada tres más lejos
const ENEMY_BREAK = 230;              // a esta distancia rompen la pasada
const ENEMY_HIT_R = 13 * ENEMY_SCALE, PLAYER_HIT_R = 10;   // radios de impacto (m)
const ENEMY_RESPAWN = [6, 10];        // segundos hasta que aparece un sustituto
const TRAIL_LEN = 1100;               // longitud de la estela amarilla (m); se desvanece a lo largo de ella
const TRAIL_STEP = 14, TRAIL_MAXP = 96;
const TRAIL_PX = 3.6;                 // grosor mínimo en pantalla (px), para verla a gran distancia

const enemies = [];
const enemyState = { kills: 0, spawned: 0, squadN: 0 };   // (v21: squadN = dragones de los escuadrones que han salido)
const dragonsTotal = () => RUN.dragons.total + enemyState.squadN;
const enemyLock = { e: null };          // blanco fijado con el clic central (v21: dragón, torre o dirigible; ver 6d)
let enemyLastShot = -9;

const _Etp = new THREE.Vector3(), _Etn = new THREE.Vector3(), _Eef = new THREE.Vector3(), _Ewant = new THREE.Vector3(), _Elead = new THREE.Vector3();
const _Esf = new THREE.Vector3(), _Esr = new THREE.Vector3(), _Esu = new THREE.Vector3(), _Esl = new THREE.Vector3(), _Esd = new THREE.Vector3(), _Esax = new THREE.Vector3();
const _Edq = new THREE.Quaternion(), _Eiq = new THREE.Quaternion();
const _Emo = new THREE.Vector3(), _Eai = new THREE.Vector3(), _Ead = new THREE.Vector3(), _Epf = new THREE.Vector3();
const _Etl = new THREE.Vector3(), _Ecam = new THREE.Vector3(), _Ev1 = new THREE.Vector3(), _Ev2 = new THREE.Vector3(), _Eside = new THREE.Vector3(), _Epside = new THREE.Vector3(), _Evn = new THREE.Vector3();
const _Est = { throttle: 0, flapTarget: 0, aimLocal: new THREE.Vector3(0, 0, -1), yawRate: 0, pitchRate: 0, fire: 0, third: false, hover: 0, boost: 0, climb: 0 };
const _Efr = new THREE.Frustum(), _Epm = new THREE.Matrix4(), _Esph = new THREE.Sphere(new THREE.Vector3(), 30 * ENEMY_SCALE);

const groundAt = (x, z) => Math.max(heightAt(x, z), WL);
function rotY(v, a) { const c = Math.cos(a), s = Math.sin(a), x = v.x * c + v.z * s, z = -v.x * s + v.z * c; v.x = x; v.z = z; return v; }
/* Sube un punto hasta que queda libre de terreno e islas. */
function safeY(x, y, z) {
  y = Math.max(y, groundAt(x, z) + 130);
  for (let i = 0, s; i < 5 && (s = islandAt(x, y, z, 90)); i++) y = s.yMax + 130;
  return y;
}

/* ---------- Estela amarilla ----------
   Cinta (triangle strip) orientada hacia la cámara. Su ancho nunca baja de TRAIL_PX píxeles, así se ve a kilómetros
   (ignora la niebla). El alfa cae con la distancia recorrida a lo largo de la estela hasta 0 en TRAIL_LEN. */
const trailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
  vertexShader: `attribute float aA; attribute float aU; varying float vA; varying float vU;
    void main(){ vA = aA; vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying float vA; varying float vU;
    void main(){ float u = abs(vU);
      vec3 col = mix(vec3(1.0, 0.58, 0.04), vec3(1.0, 0.95, 0.32), smoothstep(0.95, 0.2, u));
      gl_FragColor = vec4(col, vA * smoothstep(1.0, 0.6, u)); }`
});
const trailIndex = (() => { const a = []; for (let i = 0; i < TRAIL_MAXP - 1; i++) a.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); return a; })();
function makeTrail() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(TRAIL_MAXP * 6), aA = new Float32Array(TRAIL_MAXP * 2), aU = new Float32Array(TRAIL_MAXP * 2);
  for (let i = 0; i < TRAIL_MAXP; i++) { aU[i * 2] = -1; aU[i * 2 + 1] = 1; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aA', new THREE.BufferAttribute(aA, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  geo.setIndex(trailIndex); geo.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geo, trailMat); mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.visible = false; scene.add(mesh);
  return { pts: [], geo, mesh, pos, aA, fade: 1 };
}
function resetTrail(e) { e.trail.pts.length = 0; e.trail.fade = 1; e.trail.mesh.visible = false; }
function updateTrail(e, dt) {
  const T = e.trail, P = T.pts;
  if (e.dead) { T.fade -= dt / 2.5; if (T.fade <= 0) { resetTrail(e); return; } }
  else {
    _Etl.copy(hero.tailLocal).multiplyScalar(ENEMY_SCALE).applyQuaternion(e.q).add(e.pos);   // punta de la cola
    if (!P.length) { P.push(_Etl.clone(), _Etl.clone()); }
    else { P[0].copy(_Etl); if (P[0].distanceToSquared(P[1]) > TRAIL_STEP * TRAIL_STEP) { P.unshift(_Etl.clone()); if (P.length > TRAIL_MAXP) P.length = TRAIL_MAXP; } }
  }
  if (P.length < 2) { T.mesh.visible = false; return; }
  const tf = Math.tan(camera.fov * Math.PI / 360), pxW = 2 * tf * TRAIL_PX / Math.max(window.innerHeight, 200);   // metros por unidad de distancia = 1 px·TRAIL_PX
  let s = 0, n = P.length;
  _Epside.set(0, 0, 0);
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (i > 0) { s += p.distanceTo(P[i - 1]); if (s > TRAIL_LEN) { n = i; break; } }
    const a = P[Math.max(i - 1, 0)], b = P[Math.min(i + 1, P.length - 1)];
    _Ev1.subVectors(a, b);                                              // tangente
    _Ev2.subVectors(p, _Ecam);                                          // hacia la cámara
    const dcam = _Ev2.length() || 1;
    _Eside.crossVectors(_Ev1, _Ev2);
    if (_Eside.lengthSq() < 1e-6) _Eside.set(1, 0, 0); _Eside.normalize();
    if (_Eside.dot(_Epside) < 0) _Eside.negate();                       // sin torsiones
    _Epside.copy(_Eside);
    const f = s / TRAIL_LEN, w = Math.max(6 * (1 - 0.7 * f), dcam * pxW * (1 - 0.45 * f)) * 0.5;
    const al = Math.pow(1 - f, 1.15) * T.fade;
    const o = i * 6;
    T.pos[o] = p.x - _Eside.x * w; T.pos[o + 1] = p.y - _Eside.y * w; T.pos[o + 2] = p.z - _Eside.z * w;
    T.pos[o + 3] = p.x + _Eside.x * w; T.pos[o + 4] = p.y + _Eside.y * w; T.pos[o + 5] = p.z + _Eside.z * w;
    T.aA[i * 2] = al; T.aA[i * 2 + 1] = al;
  }
  if (n < P.length) P.length = n;
  T.geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
  T.geo.attributes.position.needsUpdate = true; T.geo.attributes.aA.needsUpdate = true;
  T.mesh.visible = n > 1;
}

/* Copia del Tyrant del jugador con su propio esqueleto. Comparte la malla y el atlas; los materiales son propios
   (piel teñida con los uniformes U, ojos rojos). Las tres mallas del modelo usan los mismos huesos: un solo esqueleto. */
function cloneTyrant(U) {
  const src = hero.model, model = src.clone(true), map = new Map();
  (function walk(a, b) { map.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); })(src, model);
  let skel = null;
  src.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const c = map.get(o);
    skel = skel || new THREE.Skeleton(o.skeleton.bones.map(b => map.get(b)), o.skeleton.boneInverses);
    c.bind(skel, o.bindMatrix);
    const m = c.material = o.material.clone();
    c.visible = true;                                      // (v16: el Tyrant del jugador se oculta si se elige otro dragón; las copias, no)
    if (m.map) tintSkinMaterial(m, U);
    else if (m.emissive && m.emissive.getHex()) m.emissive.set(ENEMY_EYES);
  });
  return model;
}
function makeEnemy() {
  const g = new THREE.Group(); scene.add(g);
  // g (posición y rumbo) → wrap (giro de 180° y escala, como hero.wrap, × ENEMY_SCALE en g) → copia del modelo
  g.scale.setScalar(ENEMY_SCALE);
  const wrap = new THREE.Group(); wrap.rotation.set(0, Math.PI, 0); wrap.scale.copy(hero.wrap.scale);   // fuera de g mientras no se ve
  const U = { uTint: { value: ENEMY_TINT }, uTintMix: { value: 1 }, uAvgLum: SKIN_TINT.uAvgLum, uHit: { value: 0 } };
  const model = cloneTyrant(U); wrap.add(model);
  const B = {}; model.traverse(o => { if (o.name) B[o.name] = o; });
  const rest = new Map(); for (const [b, q] of hero.rest) rest.set(B[b.name], q);
  const mixer = new THREE.AnimationMixer(model);
  const act = { fly: mixer.clipAction(hero.clips.vuelo), glide: mixer.clipAction(hero.glideClip) };
  act.fly.play(); act.fly.time = Math.random() * hero.flyDur;                 // cada uno aletea a su ritmo
  act.glide.play(); act.glide.time = hero.glideT; act.glide.timeScale = 0; act.glide.setEffectiveWeight(0);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.renderOrder = 7; glow.visible = false; scene.add(glow);              // fogonazo de la boca al disparar
  return {
    g, wrap, model, B, rest, mixer, act, U, glow, trail: makeTrail(),
    A: { time: 0, phase: 0, flap: 0.6, headYaw: 0, headPitch: 0, tailYaw: 0, tuck: 0, glide: 0, fire: 0 },
    pos: g.position, q: g.quaternion, vel: new THREE.Vector3(),
    speed: 64, rate: { p: 0, y: 0, r: 0 }, bank: 0, hp: ENEMY_HP, dead: true, respawnT: 0,
    mode: 'patrol', t: 0, alert: 0, far: 0, fireCool: 1.5, fireFlash: 0, hitFlash: 0, ramT: 0, avoidT: 0, animAcc: 0, frame: 0,
    wp: new THREE.Vector3(), hasWp: false, orbit: 1, side: 1, repY: 60, extDir: new THREE.Vector3(0, 0, -1), avoidDir: new THREE.Vector3(),
    aimLocal: new THREE.Vector3(0, 0, -1),
    kind: 'dragon', tags: [], squad: null                    // v21: blanco (6d); squad = escuadrón de un evento (no reaparece)
  };
}
const _Eac = { x: 0, z: 0 };
/* v23: escolta (receta: dragons.escort): los dragones nacen y patrullan junto a la flota de dirigibles, y los relevos despegan de uno de
   ellos (launch: pegados a su casco y ya alerta). Salen a por el jugador si se acerca a ESCORT_ALERT de cualquier dirigible. */
const ESCORT_ALERT = 2500;
const escorting = () => RUN.dragons.escort && airships.some(a => !a.dead);
function randomAirship() { const live = airships.filter(a => !a.dead); return live.length ? live[Math.floor(Math.random() * live.length)] : null; }
function placeEscort(e, launch) {
  const a = randomAirship(); if (!a) return false;
  const t = Math.random() * 6.2832, r = launch ? rnd(110, 200) : rnd(250, 700), x = a.pos.x + Math.cos(t) * r, z = a.pos.z + Math.sin(t) * r;
  e.pos.set(x, safeY(x, a.pos.y + (launch ? rnd(-20, 40) : rnd(-80, 160)), z), z);
  e.q.copy(a.q);                                           // con el rumbo de la flota
  e.speed = 64; e.rate.p = e.rate.y = e.rate.r = 0; e.bank = 0; e.avoidT = 0;
  e.hasWp = false; setEnemyMode(e, 'patrol'); e.alert = launch ? 0 : 3;
  resetTrail(e); releaseLock(e);
  return true;
}
function nearestAirshipDist(p) { let d = Infinity; for (const a of airships) if (!a.dead) d = Math.min(d, a.pos.distanceTo(p)); return d; }
function placeEnemy(e, rmin, rmax) {
  if (escorting() && placeEscort(e, false)) return;        // v23: escolta de la flota
  const P = dragon.position;
  let x = 0, z = 0;
  for (let i = 0; i < 12; i++) {                            // v15: dentro del área de la misión (si la hay); si no se encuentra sitio, al borde
    const a = Math.random() * 6.2832, r = rnd(rmin, rmax);
    x = P.x + Math.cos(a) * r; z = P.z + Math.sin(a) * r;
    if (inMissionArea(x, z, 600)) break;
  }
  clampToArea(x, z, 600, _Eac); x = _Eac.x; z = _Eac.z;
  e.pos.set(x, safeY(x, groundAt(x, z) + rnd(250, 650), z), z);
  const h = Math.random() * 6.2832; _Eef.set(Math.sin(h), 0, -Math.cos(h));
  e.q.setFromRotationMatrix(_m4.lookAt(ZERO, _Eef, UP));
  e.speed = 64; e.rate.p = e.rate.y = e.rate.r = 0; e.bank = 0; e.avoidT = 0;
  e.hasWp = false; setEnemyMode(e, 'patrol'); e.alert = 3;
  resetTrail(e); if (enemyLock.e === e) enemyLock.e = null;
}
function reviveEnemy(e) {
  enemyState.spawned++;
  e.tags = RUN.dragons.tags; e.squad = null;
  e.hp = ENEMY_HP; e.dead = false; e.hitFlash = 0; e.fireFlash = 0; e.fireCool = rnd(1.5, 3); e.mslCool = rnd(8, EMSL_CD); e.mslLock = 0;
  if (!(escorting() && placeEscort(e, true))) placeEnemy(e, 3500, 5500);   // (v23: los relevos de la escolta despegan de un dirigible)
}
/* Mete o saca de la escena el modelo de un enemigo (fuera no cuesta ni animación ni matrices de huesos). */
function showEnemy(e, on) { if (on !== (e.wrap.parent === e.g)) { if (on) e.g.add(e.wrap); else e.g.remove(e.wrap); } }
/* v15: tantos a la vez como diga la misión (RUN.dragons.atOnce). Los que sobren de una misión anterior con más quedan fuera de juego (off). */
function spawnEnemies() {
  const n = Math.min(RUN.dragons.atOnce, RUN.dragons.total);
  while (enemies.length < n) enemies.push(makeEnemy());
  enemyState.kills = 0; enemyState.spawned = n; enemyState.squadN = 0; enemyLastShot = -9; enemyLock.e = null;
  enemies.forEach((e, i) => {
    e.off = i >= n; e.hitFlash = 0; e.fireFlash = 0; e.squad = null; e.tags = RUN.dragons.tags;   // (v21: también los escuadrones de la anterior)
    if (e.off) { e.dead = true; showEnemy(e, false); e.glow.visible = false; resetTrail(e); return; }
    e.dead = false; e.hp = ENEMY_HP; e.fireCool = rnd(1.5, 3); e.mslCool = rnd(10, EMSL_CD); e.mslLock = 0; placeEnemy(e, 2000, 5000);
  });
  for (const t of towers.values()) { t.mslCool = rnd(6, EMSL_CD); t.mslLock = 0; }
}
/* v21: escuadrón de la receta (mission.squads[id]), desde un evento («squad»). Salen todos a la vez en cuña, en su punto (at: { x, z,
   height | y }) o, sin él, a dist m (2500) del jugador por delante y dentro del área; miran hacia el jugador. attack: false = patrullan
   hasta verlo (si no, van a por él). Usan dragones libres (off) o nuevos, no reaparecen y llevan la etiqueta tag (o el id). */
const _Esq = new THREE.Vector3();
function spawnSquad(id) {
  const q = mission.squads && mission.squads[id];
  if (!q) { console.warn('Escuadrón desconocido: ' + id); return; }
  const P = dragon.position, n = q.n || 1, tags = [q.tag || id];
  let cx, cy, cz;
  if (q.at) { cx = q.at.x; cz = q.at.z; cy = q.at.y != null ? q.at.y : groundAt(cx, cz) + (q.at.height != null ? q.at.height : 400); }
  else {
    _Eef.set(0, 0, -1).applyQuaternion(dragon.quaternion); _Eef.y = 0; if (_Eef.lengthSq() < 1e-4) _Eef.set(0, 0, -1); _Eef.normalize(); rotY(_Eef, rnd(-0.6, 0.6));
    clampToArea(P.x + _Eef.x * (q.dist || 2500), P.z + _Eef.z * (q.dist || 2500), 600, _Eac); cx = _Eac.x; cz = _Eac.z;
    cy = Math.max(P.y, groundAt(cx, cz) + 300);
  }
  cy = safeY(cx, cy, cz); enemyState.squadN += n;
  _Esq.set(P.x - cx, 0, P.z - cz); if (_Esq.lengthSq() < 1) _Esq.set(0, 0, -1); _Esq.normalize();   // rumbo: hacia el jugador
  for (let i = 0; i < n; i++) {
    let e = enemies.find(x => x.off);
    if (!e) { e = makeEnemy(); enemies.push(e); }
    const row = Math.ceil(i / 2), lat = (i % 2 ? 1 : -1) * row * 70, back = row * 60;   // cuña: el jefe delante, los demás a los lados y detrás
    e.off = false; e.squad = id; e.tags = tags; e.dead = false; e.hp = ENEMY_HP; e.hitFlash = 0; e.fireFlash = 0;
    e.fireCool = rnd(1.5, 3); e.mslCool = rnd(8, EMSL_CD); e.mslLock = 0;
    e.pos.set(cx - _Esq.z * lat - _Esq.x * back, cy + rnd(-15, 15), cz + _Esq.x * lat - _Esq.z * back);
    e.q.setFromRotationMatrix(_m4.lookAt(ZERO, _Esq, UP));
    e.speed = 64; e.rate.p = e.rate.y = e.rate.r = 0; e.bank = 0; e.avoidT = 0; e.hasWp = false;
    if (q.attack === false) { setEnemyMode(e, 'patrol'); e.alert = 3; } else { setEnemyMode(e, 'pass'); e.alert = 0; }
    resetTrail(e);
  }
}
/* El jugador reaparece: los enemigos pierden el rastro un momento. */
function enemiesCalm() {
  for (const e of enemies) if (!e.dead) { setEnemyMode(e, 'patrol'); e.alert = 7; e.hasWp = false; e.mslLock = 0; e.mslCool = Math.max(e.mslCool, 8); }
  for (const t of towers.values()) { t.mslLock = 0; t.mslCool = Math.max(t.mslCool, 8); }
  clearEnemyFireballs();
}

function setEnemyMode(e, m) {
  e.mode = m; e.t = 0;
  if (m === 'pass') { e.orbit = Math.random() < 0.5 ? -1 : 1; e.fireCool = Math.max(e.fireCool, rnd(0.5, 1.1)); }
  else if (m === 'extend') {
    _Eef.set(0, 0, -1).applyQuaternion(e.q); _Eef.y = 0; if (_Eef.lengthSq() < 1e-4) _Eef.set(0, 0, -1); _Eef.normalize();
    rotY(_Eef, rnd(-0.7, 0.7)); e.extDir.copy(_Eef); e.extDir.y = rnd(-0.10, 0.30); e.extDir.normalize();
  } else if (m === 'reposition') { e.side = Math.random() < 0.5 ? -1 : 1; e.repY = rnd(-30, 170); }
}
function newWaypoint(e) {
  const ship = escorting() && randomAirship();
  if (ship) {                                              // v23: escolta: alrededor de uno de los dirigibles (algo por delante: la flota avanza)
    const t = Math.random() * 6.2832, r = rnd(300, 900);
    clampToArea(ship.pos.x + Math.cos(t) * r + ship.vel.x * 12, ship.pos.z + Math.sin(t) * r + ship.vel.z * 12, 900, _Eac);
    e.wp.set(_Eac.x, safeY(_Eac.x, ship.pos.y + rnd(-120, 200), _Eac.z), _Eac.z);
    return;
  }
  const P = dragon.position, far = e.pos.distanceTo(P) > 4500;
  const cx = far ? P.x : e.pos.x, cz = far ? P.z : e.pos.z, a = Math.random() * 6.2832, r = far ? rnd(1500, 4200) : rnd(1800, 3800);
  clampToArea(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 900, _Eac);   // v15: patrullan dentro del área de la misión
  const x = _Eac.x, z = _Eac.z;
  e.wp.set(x, safeY(x, groundAt(x, z) + rnd(260, 700), z), z);
}

/* ---------- Decisiones (qué dirección y velocidad quiere llevar) ---------- */
/* Boca del enemigo (labio superior, un poco por delante). Si su modelo está fuera de la escena, la de la pose de planeo. */
function enemyMouth(e, out) {
  if (e.wrap.parent !== e.g) out.copy(hero.mouthLocal).multiplyScalar(ENEMY_SCALE).applyQuaternion(e.q).add(e.pos);
  else { const lip = e.B.LipUpperMid; lip.updateWorldMatrix(true, false); out.setFromMatrixPosition(lip.matrixWorld); }
  return out.addScaledVector(_hF.set(0, 0, -1).applyQuaternion(e.q), 1.2 * ENEMY_SCALE);
}
function enemyShoot(e) {
  if (gameTime - enemyLastShot < ENEMY_STAGGER) return false;
  const P = dragon.position, mouth = enemyMouth(e, _Emo);
  _Eai.copy(P).addScaledVector(dragonVel, mouth.distanceTo(P) / FIREBALL_SPEED * 0.9);                 // punto de adelanto
  _Eai.copy(P).addScaledVector(dragonVel, mouth.distanceTo(_Eai) / FIREBALL_SPEED * 0.9);
  const dd = mouth.distanceTo(_Eai), err = ENEMY_AIM_ERR * dd;
  _Eai.x += rnd(-err, err); _Eai.y += rnd(-err, err); _Eai.z += rnd(-err, err);
  _Ead.subVectors(_Eai, mouth).normalize();
  _Eef.set(0, 0, -1).applyQuaternion(e.q);
  if (_Eef.dot(_Ead) < 0.985) return false;                                                            // solo si el morro apunta (≈10°)
  if (!losClear(mouth.x, mouth.y, mouth.z, P.x, P.y, P.z)) { e.fireCool = 0.5; return false; }
  spawnFireball(mouth, _Ead, true, clamp(1.15 - dd / 1500, 0, 1));
  for (let i = 0; i < 10; i++) emit(fxAdd, mouth.x, mouth.y, mouth.z, _Ead.x * rnd(30, 70) + rnd(-6, 6), _Ead.y * rnd(30, 70) + rnd(-6, 6), _Ead.z * rnd(30, 70) + rnd(-6, 6), rnd(0.2, 0.45), 2, 5, 1, rnd(0.5, 0.8), 0.2, 0.9, 1.5, 0);
  e.fireFlash = 1; e.fireCool = rnd(ENEMY_FIRE_CD[0], ENEMY_FIRE_CD[1]); enemyLastShot = gameTime;
  return true;
}
/* ---------- Bolas guiadas enemigas ----------
   Los dragones (desde la v10, solo ellos) fijan al jugador (EMSL_LOCK s seguidos con línea de visión y entre EMSL_RANGE m) y le lanzan una bola guiada. Cada tirador,
   como mucho una cada EMSL_CD s; entre dos lanzamientos de cualquiera, al menos EMSL_GAP s. El escudo (F) las anula. El guiado es imperfecto a propósito (steerEnemyMissile):
   maniobrando se puede hacer que pase de largo, que se pierda o que choque con el terreno, una isla o una torre.
   Avisos: mientras alguien fija al jugador, «TE ESTÁN FIJANDO» y un pitido doble; con una bola en camino, «¡PROYECTIL APROXIMÁNDOSE!»,
   pitidos rápidos y flechas rojas hacia cada bola (drawMissileWarn). */
const EMSL_DMG = 35, EMSL_CD = 60, EMSL_GAP = 20, EMSL_LOCK = 4;               // daño, segundos entre bolas de un mismo tirador, separación entre dos lanzamientos de cualquiera, segundos para fijar
const EMSL_RANGE = [500, 2500];                                                // distancia de lanzamiento (m): más cerca de 500 no lanzan
const EMSL_SPEED = [170, 320], EMSL_ACCEL = 110, EMSL_TURN = 0.7, EMSL_FOV = 1.2, EMSL_LEAD = 0.35, EMSL_LIFE = 14;   // velocidad al salir y máxima (m/s), aceleración (m/s²), giro (rad/s: con 0,7 se esquiva rompiendo fuerte con la bola a 400-600 m), cono del buscador (rad), adelanto, vida (s)
const threat = { lock: 0, lastLaunch: -99, beepT: 0, incoming: [] };           // para los avisos: cuánto llevan fijándote (0-1) y bolas en camino
const _Emd = new THREE.Vector3(), _Emo2 = new THREE.Vector3();
/* Un tirador (dragón o torre: s.mslCool, s.mslLock) intenta fijar al jugador y lanzar desde `from`; can = además está en posición. */
function enemyMissileTry(s, from, dt, can) {
  if (state !== 'playing') { s.mslLock = 0; return false; }
  if (s.mslCool > 0) { s.mslCool -= dt; return false; }
  const P = dragon.position, d = from.distanceTo(P);
  // solo se empieza a fijar cuando ya casi se puede lanzar (así el aviso no se queda encendido mientras se espera a EMSL_GAP)
  const ok = can && gameTime - threat.lastLaunch > EMSL_GAP - EMSL_LOCK && d > EMSL_RANGE[0] && d < EMSL_RANGE[1] && losClear(from.x, from.y, from.z, P.x, P.y, P.z);
  s.mslLock = ok ? s.mslLock + dt : Math.max(0, s.mslLock - dt * 2);
  if (s.mslLock > 0) threat.lock = Math.max(threat.lock, Math.min(1, s.mslLock / EMSL_LOCK));
  if (s.mslLock < EMSL_LOCK || gameTime - threat.lastLaunch < EMSL_GAP) return false;
  _Emd.subVectors(P, from).normalize();
  spawnFireball(from, _Emd, true, clamp(1.3 - d / 2000, 0.25, 1), 'emsl');
  for (let i = 0; i < 18; i++) emit(fxAdd, from.x, from.y, from.z, _Emd.x * rnd(30, 70) + rnd(-8, 8), _Emd.y * rnd(30, 70) + rnd(-8, 8), _Emd.z * rnd(30, 70) + rnd(-8, 8), rnd(0.25, 0.5), 3, 7, 1, rnd(0.45, 0.7), 0.15, 0.9, 1.5, 0);
  s.mslCool = EMSL_CD; s.mslLock = 0; threat.lastLaunch = gameTime;
  return true;
}
function thinkEnemy(e, dt, playing) {
  const P = dragon.position, pv = dragonVel;
  _Etp.subVectors(P, e.pos); const dist = _Etp.length() || 1;
  _Etn.copy(_Etp).multiplyScalar(1 / dist);
  _Eef.set(0, 0, -1).applyQuaternion(e.q);
  const dotF = _Eef.dot(_Etn);
  e.t += dt; e.fireCool -= dt; e.alert -= dt; e.ramT -= dt;
  const want = _Ewant; let tSpeed = 62;
  if (e.mode !== 'patrol') {
    e.far = dist > ENEMY_LOSE ? e.far + dt : 0;
    if (!playing || e.far > 6) { setEnemyMode(e, 'patrol'); e.alert = 6; e.hasWp = false; e.far = 0; }
  }
  if (e.mode === 'patrol') {
    const esc = escorting();
    if (!e.hasWp || e.pos.distanceTo(e.wp) < 350 || e.t > (esc ? 15 : 70)) { newWaypoint(e); e.hasWp = true; e.t = 0; }
    want.subVectors(e.wp, e.pos).normalize(); tSpeed = 62;
    const alarm = esc && dist < 5000 && nearestAirshipDist(P) < ESCORT_ALERT;   // v23: la escolta defiende la flota
    if (playing && e.alert <= 0 && (dist < ENEMY_DETECT || alarm)) { setEnemyMode(e, 'pass'); sfx.roar(clamp(1.1 - dist / 2200, 0.15, 1)); }
  } else if (e.mode === 'pass') {
    // persecución con adelanto; a media distancia se aproxima en arco (flanqueando) y luego se lanza de frente
    const tl = clamp(dist / (e.speed + 140), 0, 2.2) * 0.8;
    _Elead.copy(P).addScaledVector(pv, tl);
    want.subVectors(_Elead, e.pos).normalize();
    // el desvío del arco se limita para que siga acercándose aunque el jugador huya (cierre mínimo ≈ 25 m/s)
    const w = smooth(650, 1150, dist) * (1 - smooth(1500, 2000, dist)), need = (pv.dot(_Etn) + 25) / Math.max(e.speed, 60);
    const thMax = need >= 1 ? 0 : Math.acos(Math.max(need, -1));
    if (w > 0.01) rotY(want, Math.min(w * 1.05, thMax) * e.orbit);
    tSpeed = lerp(80, ENEMY_VMAX, smooth(200, 900, dist));
    if (playing && e.fireCool <= 0 && dist < ENEMY_FIRE_RANGE && dist > 110) enemyShoot(e);
    if (dist < ENEMY_BREAK || (dotF < 0 && dist < 800) || e.t > 28) setEnemyMode(e, 'extend');
  } else if (e.mode === 'extend') {
    want.copy(e.extDir); tSpeed = ENEMY_VMAX;
    if ((e.t > 2.0 && dist > 700) || e.t > 6) setEnemyMode(e, 'reposition');
  } else {                                               // reposition: ponerse a la espalda del jugador
    _Epf.set(0, 0, -1).applyQuaternion(dragon.quaternion); _Epf.y = 0; if (_Epf.lengthSq() < 1e-4) _Epf.set(0, 0, -1); _Epf.normalize();
    _Elead.copy(P).addScaledVector(_Epf, -900); _Elead.x += -_Epf.z * e.side * 300; _Elead.z += _Epf.x * e.side * 300; _Elead.y = P.y + e.repY;
    want.subVectors(_Elead, e.pos).normalize(); tSpeed = ENEMY_VMAX;
    const behind = -_Etn.dot(_Epf) < -0.55;               // el dragón está a las 5-7 del jugador
    if ((behind && dist < 1400 && e.t > 1.5) || e.t > 11) setEnemyMode(e, 'pass');
  }
  return tSpeed;
}

/* ---------- Vuelo: mismo modelo de giro que el jugador (tasas, banking), sin boost ---------- */
const E_BANK_GAIN = 0.38, E_BANK_MAX = 0.65;
function steerEnemy(e, tSpeed, dt) {
  const q = e.q, pos = e.pos, d = _Esd.copy(_Ewant);
  _Esf.set(0, 0, -1).applyQuaternion(q);
  // ¿colisionó con una isla? recula y se aparta un momento
  if (e.avoidT > 0) {
    e.avoidT -= dt;
    d.copy(e.avoidDir); d.y = 0.35; d.normalize();
  }
  // separación de otros dragones
  for (const o of enemies) {
    if (o === e || o.dead) continue;
    const dx = pos.x - o.pos.x, dy = pos.y - o.pos.y, dz = pos.z - o.pos.z, dd = Math.hypot(dx, dy, dz);
    if (dd < 230 && dd > 1) { const k = (1 - dd / 230) * 1.6 / dd; d.x += dx * k; d.y += dy * k; d.z += dz * k; }
  }
  d.normalize();
  // evitar terreno, agua e islas por delante
  const fl = Math.hypot(_Esf.x, _Esf.z) || 1, fx = _Esf.x / fl, fz = _Esf.z / fl;
  let hl = Math.hypot(d.x, d.z), hx, hz;
  if (hl > 1e-3) { hx = d.x / hl; hz = d.z / hl; } else { hx = fx; hz = fz; }
  let pit = Math.asin(clamp(d.y, -1, 1)), reqPit = -9;
  for (const dd of [0, 150, 350, 650, 1000]) {
    const g = groundAt(pos.x + fx * dd, pos.z + fz * dd) + 110;
    reqPit = Math.max(reqPit, Math.atan2(g - pos.y, Math.max(dd, 90)));
  }
  for (const dd of [200, 450, 800]) {
    const isl = islandColumn(pos.x + fx * dd, pos.z + fz * dd, pos.y - 55, pos.y + 55, 90);
    if (!isl) continue;
    if (isl.yMax + 80 - pos.y < 260) reqPit = Math.max(reqPit, 0.55);                // roca baja: pasa por encima
    else {                                                                             // isla alta: gira para esquivarla
      const rt = (isl.x - pos.x) * -fz + (isl.z - pos.z) * fx;                        // >0: la isla queda a la derecha
      rotY(_Esl.set(fx, 0, fz), (rt > 0 ? 1 : -1) * 1.1); hx = _Esl.x; hz = _Esl.z; pit = 0;
    }
    break;
  }
  if (pos.y < groundAt(pos.x, pos.z) + 55) reqPit = Math.max(reqPit, 0.6);
  pit = clamp(Math.max(pit, Math.min(reqPit, 0.75)), -0.8, 0.8);
  d.set(hx * Math.cos(pit), Math.sin(pit), hz * Math.cos(pit));
  // tasas de giro hacia la dirección deseada
  _Eiq.copy(q).invert(); _Esl.copy(d).applyQuaternion(_Eiq);
  const yawErr = Math.atan2(_Esl.x, -_Esl.z), pitErr = Math.atan2(_Esl.y, Math.hypot(_Esl.x, _Esl.z));
  const sn = clamp((e.speed - VMIN) / (VCRUISE_MAX - VMIN), 0, 1), maxRate = lerp(1.75, 0.95, sn);
  const tYaw = -clamp(yawErr * 2.6, -maxRate, maxRate), tPit = clamp(pitErr * 2.6, -maxRate, maxRate);
  _Esr.set(1, 0, 0).applyQuaternion(q); _Esu.set(0, 1, 0).applyQuaternion(q);
  const rollAng = Math.atan2(_Esr.y, _Esu.y) - e.bank;
  const tRoll = -clamp(rollAng * 2.4, -1.5, 1.5) * (1 - smooth(0.9, 0.99, Math.abs(_Esf.y)));
  const k = 1 - Math.exp(-dt * 6);
  e.rate.y += (tYaw - e.rate.y) * k; e.rate.p += (tPit - e.rate.p) * k; e.rate.r += (tRoll - e.rate.r) * k;
  const prevBank = e.bank;
  e.bank += (clamp(e.rate.y * E_BANK_GAIN, -E_BANK_MAX, E_BANK_MAX) - e.bank) * (1 - Math.exp(-dt * 3.2));
  const bankRate = (e.bank - prevBank) / Math.max(dt, 1e-4);
  _Esax.set(e.rate.p, e.rate.y, e.rate.r + bankRate);
  const ang = _Esax.length() * dt;
  if (ang > 1e-6) { _Edq.setFromAxisAngle(_Esax.normalize(), ang); q.multiply(_Edq).normalize(); }
  // velocidad (tope = el del jugador sin boost) y avance
  e.speed = clamp(e.speed + clamp(tSpeed - e.speed, -35 * dt, 24 * dt), 40, e.vmax || ENEMY_VMAX);   // (v23: el aliado tiene su tope, e.vmax)
  _Esf.set(0, 0, -1).applyQuaternion(q);
  e.vel.copy(_Esf).multiplyScalar(e.speed);
  pos.addScaledVector(e.vel, dt);
  // suelo / agua / islas
  const gy = groundAt(pos.x, pos.z);
  if (pos.y < gy + 40) pos.y = gy + 40;
  const isl = islandAt(pos.x, pos.y, pos.z, 22);
  if (isl) {
    pos.addScaledVector(e.vel, -dt); e.avoidT = 1.6;
    e.avoidDir.set(pos.x - isl.x, 0, pos.z - isl.z); if (e.avoidDir.lengthSq() < 1) e.avoidDir.copy(_Esf).negate(); e.avoidDir.normalize();
    const still = islandAt(pos.x, pos.y, pos.z, 0); if (still) pos.y = still.yMax + 55;   // por si apareció dentro de una isla recién cargada
  }
}

/* ---------- Daño y muerte ---------- */
/* n = puntos de daño. soft = daño continuo (llamarada, rayo): cada fotograma unas chispas, y un golpe de sonido de vez en cuando. */
function damageEnemy(e, n, at, soft) {
  if (e.dead) return;
  if (!byAlly) n *= heroStats().dmg;                       // (v17: el daño del dragón elegido; v23: el aliado, el suyo)
  e.hp -= n; e.hitFlash = Math.max(e.hitFlash, soft ? 0.65 : 1);
  if (!byAlly) ultGain(n * ULT_PER_DMG);
  if (soft) sparks(at.x, at.y, at.z, 2, e.vel.x * 0.5, e.vel.y * 0.5, e.vel.z * 0.5);
  else {
    const k = clamp(n / 25, 0.3, 2);                       // el estallido crece con el daño: chispazo del proyectil rápido, golpe de la bola guiada
    emit(fxAdd, at.x, at.y, at.z, 0, 0, 0, 0.18, 10 * k, 26 * k, 1, 0.85, 0.5, 1, 0, 0);
    for (let i = 0; i < Math.round(26 * k); i++) {
      const a = Math.random() * 6.283, c = rnd(-1, 1), s = Math.sqrt(1 - c * c), sp = rnd(14, 46);
      emit(fxAdd, at.x, at.y, at.z, Math.cos(a) * s * sp + e.vel.x * 0.5, c * sp + e.vel.y * 0.5, Math.sin(a) * s * sp + e.vel.z * 0.5, rnd(0.3, 0.8), rnd(2.2, 3.6), 0.4, 1, rnd(0.55, 0.9), 0.25, 1, 0.6, -6);
    }
    emit(fxSmoke, at.x, at.y, at.z, rnd(-3, 3), rnd(0, 4), rnd(-3, 3), rnd(1.5, 2.5), 5 * k, 16 * k, 0.2, 0.17, 0.13, 0.6, 0.8, 0);
  }
  if (!(gameTime - e.sndT < (soft ? 0.22 : 0.07))) { e.sndT = gameTime; sfx.hit(); }
  if (e.mode === 'patrol' && state === 'playing') { setEnemyMode(e, 'pass'); e.alert = 0; }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  const mine = !byAlly;                                    // v23: los derribos del aliado no recargan el rayo ni el escudo
  if (mine) ultGain(ULT_PER_KILL);
  e.dead = true; showEnemy(e, false); e.glow.visible = false; e.U.uHit.value = 0; e.respawnT = rnd(ENEMY_RESPAWN[0], ENEMY_RESPAWN[1]);
  const p = e.pos;
  explode(p.x, p.y, p.z, 2.2); debris(p.x, p.y, p.z);
  for (let i = 0; i < 3; i++) explode(p.x + rnd(-14, 14), p.y + rnd(-8, 8), p.z + rnd(-14, 14), 0.8);
  releaseLock(e);
  towerState.score += ENEMY_SCORE; enemyState.kills++; missionKill(e);   // (v21: objetivos por tipo y etiqueta)
  const sh = mine && W.shield < SHIELD_MAX; if (sh) W.shield++;          // derribar dragones recarga el escudo
  toast((mine ? 'Dragón derribado' : allyName() + ' derribó un dragón') + '  +' + ENEMY_SCORE + (sh ? '  ·  +1 escudo' : '') + '  ·  ' + enemyState.kills + '/' + dragonsTotal());
  if (!mine) allySay('kill');
}
function clearEnemyFireballs() { for (let i = fireballs.length - 1; i >= 0; i--) if (fireballs[i].enemy) killFireball(i); }

/* Punto de interceptación: dónde hay que mandar un proyectil desde `from` para alcanzar al dragón e.
   Por defecto, el proyectil rápido (GUN_SPEED, fijo en el mundo: no hereda la velocidad del jugador); la bola guiada pasa su velocidad y su tiempo máximo.
   El dragón se extrapola en línea recta. Devuelve el tiempo de vuelo (s) y escribe el punto en `out`; -1 si no hay solución dentro del alcance. */
function interceptPoint(e, from, out, spd, maxT) {
  spd = spd || GUN_SPEED;
  const dx = e.pos.x - from.x, dy = e.pos.y - from.y, dz = e.pos.z - from.z, vx = e.vel.x, vy = e.vel.y, vz = e.vel.z;
  const a = vx * vx + vy * vy + vz * vz - spd * spd, b = 2 * (dx * vx + dy * vy + dz * vz), c = dx * dx + dy * dy + dz * dz;
  if (a >= 0) return -1;                                   // (los dragones son siempre más lentos que el proyectil)
  const t = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  if (!(t > 0) || t > (maxT || GUN_LIFE)) return -1;
  out.set(e.pos.x + vx * t, e.pos.y + vy * t, e.pos.z + vz * t); return t;
}
/* Dragón enemigo más cercano al que apunta el rayo (asistencia ligera de puntería). El disparo converge al punto de
   interceptación del dragón —el mismo que marca el círculo gris del HUD—, no a su posición actual. Usa la boca del jugador (_mouth). */
const enemyAimPt = new THREE.Vector3(), _Eic = new THREE.Vector3();
function enemyRayHit(o, d, maxT) {
  let best = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    if (interceptPoint(e, _mouth, _Eic) < 0) _Eic.copy(e.pos);
    const ox = _Eic.x - o.x, oy = _Eic.y - o.y, oz = _Eic.z - o.z, t = ox * d.x + oy * d.y + oz * d.z;
    if (t < 25 || t > Math.min(maxT, best)) continue;
    const c2 = ox * ox + oy * oy + oz * oz - t * t, r = ENEMY_HIT_R + 3;
    if (c2 < r * r) { best = t; enemyAimPt.copy(_Eic); }
  }
  return best;
}

/* ---------- Actualización por fotograma ---------- */
/* Visibilidad (en pantalla y a menos de 6,5 km), animación (más barata a distancia) y destellos de un dragón con modelo propio (enemigos y,
   desde la v23, el aliado). Devuelve si se ve. Usa el frustum de la cámara que calcula updateEnemies. */
function animateEnemyModel(e, dt, dist) {
  _Esph.center.copy(e.pos);
  const vis = dist < 6500 && _Efr.intersectsSphere(_Esph);
  showEnemy(e, vis);
  e.animAcc += dt;
  if (vis && (++e.frame % (dist < ENEMY_ANIM_LOD[0] ? 1 : dist < ENEMY_ANIM_LOD[1] ? 2 : 3)) === 0) {
    _Eef.set(0, 0, -1).applyQuaternion(e.q);
    const thr = clamp((e.speed - 40) / 65, 0, 1), dive = smooth(0.1, 0.55, -_Eef.y), climb = smooth(0.15, 0.5, _Eef.y);
    _Est.throttle = thr; _Est.flapTarget = clamp((0.25 + thr * 0.75 + climb * 0.25) * (1 - 0.85 * dive), 0.04, 1);
    _Est.aimLocal = e.aimLocal; _Est.yawRate = e.rate.y; _Est.pitchRate = e.rate.p; _Est.fire = Math.max(e.fireFlash, e.hitFlash * 0.7);
    animateTyrant(e, e.A, e.animAcc, _Est); e.animAcc = 0;
  }
  // destellos: la piel al recibir un impacto y la boca al disparar
  e.U.uHit.value = e.hitFlash * 0.85;
  e.glow.visible = vis && e.fireFlash > 0.02;
  if (e.glow.visible) { enemyMouth(e, e.glow.position); e.glow.scale.setScalar((4 + 10 * e.fireFlash) * ENEMY_SCALE); e.glow.material.opacity = clamp(e.fireFlash * 1.2, 0, 1); }
  return vis;
}
function updateEnemies(dt) {
  if (!enemies.length) return;
  const playing = state === 'playing', P = dragon.position;
  camera.getWorldPosition(_Ecam);
  _Efr.setFromProjectionMatrix(_Epm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));   // cámara del último fotograma
  for (const e of enemies) {
    if (e.off) continue;                                     // v15: sobra en esta misión (más a la vez en una anterior)
    if (e.dead) { e.respawnT -= dt; updateTrail(e, dt); if (!e.squad && e.respawnT <= 0 && state !== 'menu' && enemyState.spawned < RUN.dragons.total) reviveEnemy(e); continue; }
    if (escorting() ? e.mode === 'patrol' && nearestAirshipDist(e.pos) > 5000 : e.pos.distanceTo(P) > 8500) placeEnemy(e, 4500, 6500);   // (v23: la escolta, de vuelta a la flota)
    const tSpeed = thinkEnemy(e, dt, playing);
    steerEnemy(e, tSpeed, dt);
    e.fireFlash = Math.max(0, e.fireFlash - dt * 3.2); e.hitFlash = Math.max(0, e.hitFlash - dt * 2.5);
    updateTrail(e, dt);
    const dist = e.pos.distanceTo(P);
    // choque con el jugador
    if (playing && dist < ENEMY_HIT_R + PLAYER_HIT_R && e.ramT <= 0) { e.ramT = 2; hurtDragon(25, 'Chocaste con un dragón enemigo'); damageEnemy(e, 50, e.pos); if (e.dead) continue; }
    // bola guiada: la fija y la lanza si está en combate y tiene al jugador por delante
    if (playing) { _Eef.set(0, 0, -1).applyQuaternion(e.q); _Ev2.subVectors(P, e.pos).normalize(); if (enemyMissileTry(e, enemyMouth(e, _Emo2), dt, e.mode !== 'patrol' && _Eef.dot(_Ev2) > 0.4)) e.fireFlash = 1; }
    // mirada: hacia el jugador cuando combate
    _Eiq.copy(e.q).invert();
    if (e.mode === 'patrol') e.aimLocal.set(0, 0, -1);
    else e.aimLocal.copy(P).sub(e.pos).applyQuaternion(_Eiq).normalize();
    const vis = animateEnemyModel(e, dt, dist);
    // dañado: humo (y chispas con 1 de vida)
    if (e.hp < ENEMY_HP && e.hp > 0 && dist < 2600 && Math.random() < (1 - e.hp / ENEMY_HP) * 0.88) {
      _Eef.set(0, 0, 1).applyQuaternion(e.q);
      const sx = e.pos.x + _Eef.x * 9, sy = e.pos.y + _Eef.y * 9 + 1.5, sz = e.pos.z + _Eef.z * 9;
      emit(fxSmoke, sx, sy, sz, rnd(-2, 2), rnd(1, 4), rnd(-2, 2), rnd(1.6, 2.6), 4.5, 16, 0.12, 0.1, 0.09, 0.6, 0.6, 0);
      if (e.hp === 1) emit(fxAdd, sx, sy, sz, rnd(-4, 4), rnd(0, 4), rnd(-4, 4), rnd(0.3, 0.6), 2.5, 0.5, 1, 0.5, 0.12, 0.9, 0.8, 0);
    }
  }
}

/* ---------- Fijado de objetivo (clic central) ----------
   v21: el clic central fija cualquier blanco (torres, dragones, dirigibles): cycleTarget está en 6d (14c_blancos.js). enemyLock.e es
   el blanco fijado, sea del tipo que sea. El fijado se mantiene aunque salga de pantalla (flecha en el borde). */
const fmtDist = d => d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
function enemyNdc(e, out) {                               // coordenadas normalizadas de pantalla; false si está detrás de la cámara
  _Ev1.copy(e.pos).applyMatrix4(camera.matrixWorldInverse);
  if (_Ev1.z > -1) return false;
  const pm = camera.projectionMatrix.elements;
  out.x = _Ev1.x * pm[0] / -_Ev1.z; out.y = _Ev1.y * pm[5] / -_Ev1.z; return true;
}
