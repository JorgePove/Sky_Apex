
/* ============================================================
   6e. ALIADO: COMPAÑERO DE ESCUADRÓN (v23)
   Un dragón amigo con IA (receta: ally { id, lines }; su nombre y color, en radio[id]). Es el Tyrant teñido de azul (ALLY_TINT), con el
   vuelo de los enemigos (steerEnemy) y solo fuego rápido y llamarada: ni bolas guiadas ni rayo. No recibe daño (los enemigos no lo atacan
   ni sus proyectiles le dan). Dos estados:
   · formación ('form'): a ALLY_SLOT del jugador (a su lado y algo por detrás), a su velocidad y con margen para alcanzarle (hasta VMAX);
     si el jugador está en hover, le da vueltas alrededor;
   · combate ('fight'): en cuanto un dragón enemigo o un dirigible está a menos de ALLY_ENGAGE del jugador (o de él). Ataca blancos al
     azar entre dragones y dirigibles, pero antes que nada a los dragones que van a por el jugador (protegerle). Tras ALLY_CALM s sin
     enemigos cerca, vuelve a la formación.
   Sus derribos cuentan para la misión, pero no dan rayo, escudo ni bolas guiadas al jugador (byAlly). Lo que dice por radio sale de
   ally.lines de la receta (start, engage, protect, kill, regroup: un texto o una lista, uno al azar), con ALLY_SAY_GAP s entre dos iguales.
   ============================================================ */
const ALLY_SLOT = [200, -70];            // a la derecha del jugador y hacia delante (negativo: detrás), en m
const ALLY_ENGAGE = 2000, ALLY_CALM = 6; // distancia a la que entra en combate (m) y s sin enemigos para volver a la formación
const ALLY_TINT = new THREE.Color(0.55, 0.85, 1.75), ALLY_EYES = 0x5fd0ff;   // piel azul acero y ojos azules
const ALLY_GUN_CD = [0.14, 0.26], ALLY_GUN_RANGE = 1000, ALLY_AIM = 0.985, ALLY_AIM_ERR = 0.01;   // s entre disparos, alcance (m), coseno del cono de tiro (≈10°, como los enemigos) y error de puntería
const ALLY_PICK = [5, 10];               // s con el mismo blanco antes de cambiar (salvo para proteger al jugador)
const ALLY_PROTECT = 1000, ALLY_URGENT = 600, ALLY_PROTECT_P = 0.6;   // dragón en pasada de ataque hacia el jugador: a menos de ALLY_URGENT va
                                         // a por él al momento; a menos de ALLY_PROTECT, al cambiar de blanco lo elige con probabilidad ALLY_PROTECT_P
const ALLY_SAY_GAP = 9;
const ally = { e: null, on: false, mode: 'form', target: null, protect: false, pickT: 0, calmT: 0, gunCool: 0, breakT: 0, breakDir: new THREE.Vector3(), said: {} };
const _Al = new THREE.Vector3(), _Am = new THREE.Vector3(), _Ad2 = new THREE.Vector3(), _Af2 = new THREE.Vector3(), _Ar2 = new THREE.Vector3();

const allyName = () => { const A = mission.ally, c = A && mission.radio && mission.radio[A.id]; return c ? c.name : 'Tu aliado'; };
function allySay(key) {
  const A = mission.ally; if (!A || !ally.on || !A.lines || !A.lines[key]) return;
  if (key in ally.said && gameTime - ally.said[key] < ALLY_SAY_GAP) return;
  ally.said[key] = gameTime;
  const L = [].concat(A.lines[key]); radioSay(A.id, L[Math.floor(Math.random() * L.length)]);
}
/* Al empezar la misión (missionStart): sin aliado en la receta, fuera; si no, a su sitio en la formación. */
function allyStart() {
  if (!mission.ally || !hero.ready) { allyOff(); return; }
  if (!ally.e) {
    const e = ally.e = makeEnemy();
    e.g.scale.setScalar(1);                                // del tamaño del dragón del jugador (los enemigos, +50 %)
    e.U.uTint.value = ALLY_TINT; e.vmax = VMAX; e.kind = 'ally';
    e.model.traverse(o => { if (o.isSkinnedMesh && !o.material.map && o.material.emissive) o.material.emissive.set(ALLY_EYES); });
    e.glow.material.color.copy(ALLY_FIRE);
  }
  const e = ally.e, P = dragon.position;
  _Af2.set(0, 0, -1).applyQuaternion(dragon.quaternion); _Af2.y = 0; if (_Af2.lengthSq() < 1e-4) _Af2.set(0, 0, -1); _Af2.normalize();
  e.pos.set(P.x - _Af2.z * ALLY_SLOT[0] + _Af2.x * ALLY_SLOT[1], P.y + 10, P.z + _Af2.x * ALLY_SLOT[0] + _Af2.z * ALLY_SLOT[1]);
  e.q.copy(dragon.quaternion); e.speed = Math.max(64, F.speed); e.rate.p = e.rate.y = e.rate.r = 0; e.bank = 0; e.avoidT = 0;
  e.dead = false; e.hp = ENEMY_HP; e.hitFlash = e.fireFlash = 0; e.aimLocal.set(0, 0, -1);
  Object.assign(ally, { on: true, mode: 'form', target: null, protect: false, pickT: 0, calmT: 0, gunCool: 1, breakT: 0, said: {} });
  allySay('start');
}
function allyOff() {
  ally.on = false;
  if (ally.e) { showEnemy(ally.e, false); ally.e.glow.visible = false; }
}

/* ---------- Cada fotograma (desde updateWorld) ---------- */
function updateAlly(dt) {
  if (!ally.on) return;
  const e = ally.e, P = dragon.position, playing = state === 'playing';
  if (!enemies.length) _Efr.setFromProjectionMatrix(_Epm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  // ¿hay enemigos cerca?
  let near = Infinity;
  for (const o of enemies) if (!o.dead && !o.off) near = Math.min(near, o.pos.distanceTo(P), o.pos.distanceTo(e.pos));
  for (const a of airships) if (!a.dead) near = Math.min(near, a.pos.distanceTo(P), a.pos.distanceTo(e.pos));
  if (ally.mode === 'form' && playing && near < ALLY_ENGAGE) { ally.mode = 'fight'; ally.target = null; ally.calmT = 0; allySay('engage'); }
  else if (ally.mode === 'fight') {
    ally.calmT = near > ALLY_ENGAGE + 500 ? ally.calmT + dt : 0;
    if (ally.calmT > ALLY_CALM || !playing) { ally.mode = 'form'; ally.target = null; if (playing) allySay('regroup'); }
  }
  ally.gunCool -= dt; ally.pickT -= dt;
  const tSpeed = ally.mode === 'fight' && allyPick() ? allyFight(e, dt) : allyFormation(e);
  steerEnemy(e, tSpeed, dt);
  // no atravesar dirigibles: si se mete en el casco, sale hacia arriba
  for (const a of airships) if (!a.dead && airshipPointDist2(a, e.pos) < (a.r + 25) ** 2) { e.pos.y += 40 * dt; if (ally.breakT <= 0) { ally.breakT = 1.5; ally.breakDir.set(0, 0, -1).applyQuaternion(e.q).setY(0.6).normalize(); } }
  // mirada: hacia su blanco en combate; si no, al frente
  _Eiq.copy(e.q).invert();
  if (ally.mode === 'fight' && ally.target) e.aimLocal.copy(ally.target.pos).sub(e.pos).applyQuaternion(_Eiq).normalize(); else e.aimLocal.set(0, 0, -1);
  e.fireFlash = Math.max(0, e.fireFlash - dt * 3.2);
  animateEnemyModel(e, dt, e.pos.distanceTo(_Ecam.setFromMatrixPosition(camera.matrixWorld)));
}
/* Formación: hacia un punto 250 m por delante de su sitio, a la velocidad del jugador más lo que le falte para llegar. */
function allyFormation(e) {
  const P = dragon.position;
  _Af2.set(0, 0, -1).applyQuaternion(dragon.quaternion); const fy = _Af2.y; _Af2.y = 0; if (_Af2.lengthSq() < 1e-4) _Af2.set(0, 0, -1); _Af2.normalize();
  _Ar2.set(-_Af2.z, 0, _Af2.x);
  _Al.copy(P).addScaledVector(_Ar2, ALLY_SLOT[0]).addScaledVector(_Af2, ALLY_SLOT[1]); _Al.y += 10;   // su sitio
  if (F.speed < 45) {                                      // jugador en hover: vueltas a su alrededor
    _Ad2.subVectors(e.pos, P); _Ad2.y = 0; const r = _Ad2.length() || 1; _Ad2.divideScalar(r);
    _Ewant.set(-_Ad2.z, 0, _Ad2.x).addScaledVector(_Ad2, clamp((400 - r) / 300, -1, 1)); _Ewant.y = clamp((P.y + 40 - e.pos.y) / 300, -0.5, 0.5); _Ewant.normalize();
    return 62;
  }
  _Ad2.subVectors(_Al, e.pos); const gap = _Ad2.length(), along = _Ad2.dot(_Af2);
  _Am.copy(_Al).addScaledVector(_Af2, 250); _Am.y += fy * 250;
  _Ewant.subVectors(_Am, e.pos).normalize();
  return gap > 1500 ? VMAX : clamp(F.speed + along * 0.4, 45, VMAX);
}
/* Elige blanco. Un dragón en pasada de ataque muy cerca del jugador, al momento (protegerle); si no, sigue con el suyo un rato y, al
   cambiar, elige con probabilidad ALLY_PROTECT_P al que esté atacando al jugador o, si no, uno al azar entre los dragones y dirigibles cercanos. */
function allyPick() {
  const P = dragon.position, t = ally.target, alive = o => !!o && !o.dead && !o.off;
  let threat = null, best = ALLY_PROTECT;
  for (const o of enemies) if (alive(o) && o.mode === 'pass') { const d = o.pos.distanceTo(P); if (d < best) { best = d; threat = o; } }
  const protect = () => { if (!ally.protect || threat !== t) allySay('protect'); ally.target = threat; ally.protect = true; ally.pickT = rnd(ALLY_PICK[0], ALLY_PICK[1]); return true; };
  if (threat && best < ALLY_URGENT && threat !== t) return protect();
  if (alive(t) && ally.pickT > 0) return true;
  if (threat && Math.random() < ALLY_PROTECT_P) return protect();
  ally.protect = false;
  const cand = [];
  for (const o of enemies) if (!o.dead && !o.off && o.pos.distanceTo(P) < 3500) cand.push(o);
  for (const a of airships) if (!a.dead && a.pos.distanceTo(P) < 4000) cand.push(a);
  ally.target = cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
  ally.pickT = rnd(ALLY_PICK[0], ALLY_PICK[1]);
  return !!ally.target;
}
/* Combate: persigue al blanco con adelanto, dispara cuando lo tiene delante, lo quema de cerca y rompe la pasada para no chocar. */
function allyFight(e, dt) {
  const t = ally.target, ship = t.kind === 'airship', mouth = enemyMouth(e, _Am);
  if (interceptPoint(t, mouth, _Al, GUN_SPEED, GUN_LIFE) < 0) _Al.copy(t.pos);
  _Ad2.subVectors(_Al, mouth); const dist = _Ad2.length(); _Ad2.divideScalar(dist || 1);
  const close = ship ? t.r + 90 : 120;
  let tSpeed;
  if (ally.breakT > 0) { ally.breakT -= dt; _Ewant.copy(ally.breakDir); tSpeed = ENEMY_VMAX; }
  else {
    _Ewant.copy(_Ad2); tSpeed = ship ? lerp(60, ENEMY_VMAX, smooth(300, 1200, dist)) : ENEMY_VMAX * 1.05;
    if (dist < close) {                                    // romper la pasada: de lado y hacia arriba
      ally.breakT = 2.2; _Af2.set(0, 0, -1).applyQuaternion(e.q); rotY(_Af2, (Math.random() < 0.5 ? -1 : 1) * 0.8); _Af2.y = 0.35;
      ally.breakDir.copy(_Af2.normalize());
    }
  }
  // armas: fuego rápido con el blanco delante; llamarada de cerca
  _Af2.set(0, 0, -1).applyQuaternion(e.q);
  const dot = _Af2.dot(_Ad2);
  if (state === 'playing' && ally.gunCool <= 0 && dist < ALLY_GUN_RANGE && dot > ALLY_AIM && losClear(mouth.x, mouth.y, mouth.z, _Al.x, _Al.y, _Al.z)) {
    _Ar2.copy(_Ad2); _Ar2.x += rnd(-1, 1) * ALLY_AIM_ERR; _Ar2.y += rnd(-1, 1) * ALLY_AIM_ERR; _Ar2.z += rnd(-1, 1) * ALLY_AIM_ERR; _Ar2.normalize();
    spawnFireball(mouth, _Ar2, false, clamp(1 - e.pos.distanceTo(dragon.position) / 1500, 0.05, 0.5), 'gun', true);
    e.fireFlash = 1; ally.gunCool = rnd(ALLY_GUN_CD[0], ALLY_GUN_CD[1]);
  }
  if (state === 'playing' && dist < FLAME_RANGE + (ship ? t.r : 15) && dot > 0.94) allyFlame(e, mouth, dt);
  return tSpeed;
}
/* Llamarada del aliado: un chorro más ligero que el del jugador (menos partículas) con el mismo daño, en su color. */
function allyFlame(e, mouth, dt) {
  _Af2.set(0, 0, -1).applyQuaternion(e.q);
  const c = ALLY_FIRE, n = Math.round(260 * dt + Math.random());
  for (let i = 0; i < n; i++) {
    const sp = FLAME_SPEED * rnd(0.9, 1.1), vx = (_Af2.x + rnd(-0.1, 0.1)) * sp, vy = (_Af2.y + rnd(-0.1, 0.1)) * sp, vz = (_Af2.z + rnd(-0.1, 0.1)) * sp;
    emit(fxAdd, mouth.x, mouth.y, mouth.z, vx + e.vel.x, vy + e.vel.y, vz + e.vel.z, FLAME_RANGE / sp * rnd(0.7, 1.05), rnd(1, 1.8), rnd(14, 22), c.r, c.g * rnd(0.85, 1.1), c.b, 0.4, 0, -8);
  }
  e.fireFlash = 1;
  const amt = FLAME_DPS * dt;
  _Am.copy(mouth); _Al.copy(mouth).addScaledVector(_Af2, FLAME_RANGE);
  byAlly = true;
  for (const o of enemies) {
    if (o.dead || o.off) continue;
    _Ad2.subVectors(o.pos, _Am); const along = _Ad2.dot(_Af2);
    if (along < -ENEMY_HIT_R || along > FLAME_RANGE + ENEMY_HIT_R) continue;
    const r = ENEMY_HIT_R + 2 + clamp(along, 0, FLAME_RANGE) * 0.11;
    if (_Ad2.lengthSq() - along * along < r * r) damageEnemy(o, amt, _Ad2.copy(_Am).addScaledVector(_Af2, clamp(along, 0, FLAME_RANGE)), true);
  }
  for (const a of airships) if (!a.dead && airshipSegDist2(a, _Am, _Al) < (a.r + 12) ** 2) damageAirship(a, amt, true, _sdc);
  byAlly = false;
}
