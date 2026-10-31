
/* ============================================================
   6e. ALIADOS: COMPAÑEROS DE ESCUADRÓN (v23; v34: varios)
   Dragones amigos con IA. Receta: ally { id, lines } (v23: uno, Lance, en ALLY_SLOT) o, desde la v34, allies: [{ id, slot: [derecha,
   delante] (m respecto al jugador; negativo = izquierda / detrás), y (m por encima del jugador), style, lines }]; su nombre y color, en
   radio[id]. Son el Tyrant teñido de azul (ALLY_TINT), con el vuelo de los enemigos (steerEnemy) y solo fuego rápido y llamarada: ni bolas
   guiadas ni rayo. No reciben daño (los enemigos no los atacan ni sus proyectiles les dan). Estados:
   · formación ('form'): en su puesto respecto al jugador, a su velocidad y con margen para alcanzarle (hasta VMAX); si el jugador está en
     hover, le dan vueltas alrededor;
   · combate ('fight'): en cuanto un dragón enemigo o un dirigible está a menos de ALLY_ENGAGE del jugador (o de él). Tras ALLY_CALM s sin
     enemigos cerca, vuelve a la formación. Cómo combate depende de style:
       'fight' (v23, Lance en la Misión 1): ataca blancos al azar entre dragones y dirigibles, pero antes que nada a los dragones que van a
         por el jugador (protegerle);
       'escort' (v34, Capítulo 1): casi no ataca. Da vueltas alrededor del jugador (ALLY_ESC.radius) y de vez en cuando persigue unos
         segundos a un dragón que va a por él; hace ALLY_ESC.dmg de su daño y nunca deja a un enemigo por debajo de ALLY_ESC.hpMin de su
         vida: los derribos son del jugador (petición de Jorge: la primera misión es para que se haga con los controles y se sienta fuerte).
   Sus derribos cuentan para la misión, pero no dan rayo, escudo ni bolas guiadas al jugador (byAlly = el aliado que hace el daño). Lo que
   dicen por radio sale de lines (start, engage, protect, kill, regroup: un texto o una lista, uno al azar), con ALLY_SAY_GAP s entre dos iguales.
   ============================================================ */
/* v24: los valores de balance (con let, y ALLY_GUN_DMG, ALLY_FLAME_*, ALLY_VMAX en 7c) salen del Excel, pestaña «Lance (aliado)» (todos los aliados). */
const ALLY_SLOT = [200, -70];            // (v23) a la derecha del jugador y hacia delante (negativo: detrás), en m
let ALLY_ENGAGE = 2000;                  // distancia a la que entra en combate (m)
const ALLY_CALM = 6;                     // s sin enemigos para volver a la formación
const ALLY_TINT = new THREE.Color(0.55, 0.85, 1.75), ALLY_EYES = 0x5fd0ff;   // piel azul acero y ojos azules
const ALLY_GUN_CD = [0.14, 0.26], ALLY_AIM = 0.985;   // s entre disparos y coseno del cono de tiro (≈10°, como los enemigos)
let ALLY_GUN_RANGE = 1000, ALLY_AIM_ERR = 0.01;       // alcance (m) y error de puntería
const ALLY_PICK = [5, 10];               // s con el mismo blanco antes de cambiar (salvo para proteger al jugador)
let ALLY_PROTECT = 1000, ALLY_URGENT = 600, ALLY_PROTECT_P = 0.6;   // dragón en pasada de ataque hacia el jugador: a menos de ALLY_URGENT va
                                         // a por él al momento; a menos de ALLY_PROTECT, al cambiar de blanco lo elige con probabilidad ALLY_PROTECT_P
/* v34: estilo «escolta» (Excel, «Lance (aliado)», sección Escolta): radio de las vueltas (m), s persiguiendo a un dragón, s de pausa entre
   persecuciones, fracción de su daño y vida mínima en que deja a un enemigo (fracción de su vida máxima). */
let ALLY_ESC = { radius: 550, chase: 5, rest: 14, dmg: 0.25, hpMin: 0.4 };
const ALLY_ESC_W = 0.11;                 // giro de las vueltas alrededor del jugador (rad/s)
const ALLY_SAY_GAP = 9;
const allies = [];                       // v34: los de la misión (los de la anterior que sobren, apagados)
const _Al = new THREE.Vector3(), _Am = new THREE.Vector3(), _Ad2 = new THREE.Vector3(), _Af2 = new THREE.Vector3(), _Ar2 = new THREE.Vector3(), _Av2 = new THREE.Vector3();

const allyAlive = o => !!o && !o.dead && !o.off;
/* Nombre del aliado a (por defecto, el que hace el daño ahora: byAlly) para avisos y radio. */
function allyName(a) {
  a = a && a !== true ? a : allies[0];
  const c = a && mission.radio && mission.radio[a.id];
  return c ? c.name : 'Tu aliado';
}
function allySay(a, key) {
  if (!a || a === true) a = allies[0];
  if (!a || !a.on || !a.lines || !a.lines[key]) return;
  if (key in a.said && gameTime - a.said[key] < ALLY_SAY_GAP) return;
  if (a.style === 'escort') {                              // v34: los de escolta hablan como las reacciones (19e): sin pisar a nadie y no muy seguido
    if (!STORY.chatter || !radioQuiet() || gameTime - STORY.chatT < CHATTER_GAP || Math.random() < 0.5) return;
    STORY.chatT = gameTime;
  }
  a.said[key] = gameTime;
  const L = [].concat(a.lines[key]); radioSay(a.id, L[Math.floor(Math.random() * L.length)]);
}
/* Al empezar la misión (missionStart): sin aliados en la receta, fuera; si no, cada uno a su puesto en la formación. */
function allyStart() {
  const list = mission.allies || (mission.ally ? [Object.assign({ slot: ALLY_SLOT, style: 'fight' }, mission.ally)] : []);
  if (!list.length || !hero.ready) { allyOff(); return; }
  const P = dragon.position;
  _Af2.set(0, 0, -1).applyQuaternion(dragon.quaternion); _Af2.y = 0; if (_Af2.lengthSq() < 1e-4) _Af2.set(0, 0, -1); _Af2.normalize();
  list.forEach((d, i) => {
    const a = allies[i] || (allies[i] = { e: null, breakDir: new THREE.Vector3() });
    if (!a.e) {
      const e = a.e = makeEnemy();
      e.g.scale.setScalar(1);                              // del tamaño del dragón del jugador (los enemigos, +50 %)
      e.U.uTint.value = ALLY_TINT; e.vmax = ALLY_VMAX; e.kind = 'ally';
      e.model.traverse(o => { if (o.isSkinnedMesh && !o.material.map && o.material.emissive) o.material.emissive.set(ALLY_EYES); });
      e.glow.material.color.copy(ALLY_FIRE);
    }
    const slot = d.slot || ALLY_SLOT, e = a.e;
    Object.assign(a, { id: d.id, slot, dy: d.y != null ? d.y : 10, style: d.style || 'fight', lines: d.lines || null, on: true, mode: 'form', target: null, protect: false,
      pickT: 0, calmT: 0, gunCool: 1, breakT: 0, said: {}, chaseT: 0, restT: rnd(3, ALLY_ESC.rest), ph: i / list.length * Math.PI * 2, flee: null });
    e.pos.set(P.x - _Af2.z * slot[0] + _Af2.x * slot[1], P.y + a.dy, P.z + _Af2.x * slot[0] + _Af2.z * slot[1]);
    e.q.copy(dragon.quaternion); e.speed = Math.max(64, F.speed); e.rate.p = e.rate.y = e.rate.r = 0; e.bank = 0; e.avoidT = 0;
    e.dead = false; e.hp = ENEMY_HP; e.hitFlash = e.fireFlash = 0; e.aimLocal.set(0, 0, -1);
  });
  for (let i = list.length; i < allies.length; i++) allyHide(allies[i]);
  for (const a of allies) if (a.on) allySay(a, 'start');
}
function allyHide(a) {
  a.on = false;
  if (a.e) { showEnemy(a.e, false); a.e.glow.visible = false; }
}
function allyOff() { for (const a of allies) allyHide(a); }

/* ---------- Cada fotograma (desde updateWorld) ---------- */
function updateAlly(dt) {
  if (!allies.some(a => a.on)) return;
  if (!enemies.length) _Efr.setFromProjectionMatrix(_Epm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const a of allies) if (a.on) updateOneAlly(a, dt);
}
function updateOneAlly(a, dt) {
  const e = a.e, P = dragon.position, playing = state === 'playing';
  // ¿hay enemigos cerca? (los que aún vuelan en formación sin atacar, v34, no cuentan)
  let near = Infinity;
  for (const o of enemies) if (!o.dead && !o.off && !o.statue && o.mode !== 'cruise') near = Math.min(near, o.pos.distanceTo(P), o.pos.distanceTo(e.pos));
  for (const s of airships) if (!s.dead) near = Math.min(near, s.pos.distanceTo(P), s.pos.distanceTo(e.pos));
  if (a.mode === 'form' && playing && near < ALLY_ENGAGE) { a.mode = 'fight'; a.target = null; a.calmT = 0; allySay(a, 'engage'); }
  else if (a.mode === 'fight') {
    a.calmT = near > ALLY_ENGAGE + 500 ? a.calmT + dt : 0;
    if (a.calmT > ALLY_CALM || !playing) { a.mode = 'form'; a.target = null; a.chaseT = 0; if (playing) allySay(a, 'regroup'); }
  }
  a.gunCool -= dt; a.pickT -= dt;
  let tSpeed;
  if (a.flee && gameTime > a.flee.until) a.flee = null;
  if (a.flee) tSpeed = allyFlee(a, e);                     // (v34: el rayo del superdirigible va a por él)
  else if (a.mode !== 'fight') tSpeed = allyFormation(a, e);
  else if (a.style === 'escort') tSpeed = allyEscort(a, e, dt);
  else tSpeed = allyPick(a) ? allyFight(a, e, dt) : allyFormation(a, e);
  steerEnemy(e, tSpeed, dt);
  // no atravesar dirigibles ni el superdirigible (v34): si se mete en el casco, sale hacia arriba
  for (const s of airships) if (!s.dead && airshipPointDist2(s, e.pos) < (s.r + 25) ** 2) { allyUnstick(a, e, dt); break; }
  if (unitPointHit(e.pos, 1.3)) allyUnstick(a, e, dt);
  // mirada: hacia su blanco en combate; si no, al frente
  _Eiq.copy(e.q).invert();
  if (a.mode === 'fight' && allyAlive(a.target) && (a.style !== 'escort' || a.chaseT > 0)) e.aimLocal.copy(a.target.pos).sub(e.pos).applyQuaternion(_Eiq).normalize(); else e.aimLocal.set(0, 0, -1);
  e.fireFlash = Math.max(0, e.fireFlash - dt * 3.2);
  animateEnemyModel(e, dt, e.pos.distanceTo(_Ecam.setFromMatrixPosition(camera.matrixWorld)));
}
/* v34: el superdirigible carga su rayo contra él (6i: a.flee): se aparta flee.d m a un lado de la línea entre la proa y el jugador. */
function allyFlee(a, e) {
  const P = dragon.position, f = a.flee;
  _Ad2.subVectors(P, f.from); _Ad2.y = 0; if (_Ad2.lengthSq() < 1) _Ad2.set(0, 0, 1); _Ad2.normalize();
  const x = P.x - _Ad2.z * f.side * f.d, z = P.z + _Ad2.x * f.side * f.d;
  _Al.set(x, Math.max(P.y + 120, groundAt(x, z) + 250), z);
  _Ewant.subVectors(_Al, e.pos).normalize();
  return ALLY_VMAX * 0.75;
}
function allyUnstick(a, e, dt) {
  e.pos.y += 40 * dt;
  if (a.breakT <= 0) { a.breakT = 1.5; a.breakDir.set(0, 0, -1).applyQuaternion(e.q).setY(0.6).normalize(); }
}
/* Formación: hacia un punto 250 m por delante de su puesto, a la velocidad del jugador más lo que le falte para llegar. */
function allyFormation(a, e) {
  const P = dragon.position;
  _Af2.set(0, 0, -1).applyQuaternion(dragon.quaternion); const fy = _Af2.y; _Af2.y = 0; if (_Af2.lengthSq() < 1e-4) _Af2.set(0, 0, -1); _Af2.normalize();
  _Ar2.set(-_Af2.z, 0, _Af2.x);
  _Al.copy(P).addScaledVector(_Ar2, a.slot[0]).addScaledVector(_Af2, a.slot[1]); _Al.y += a.dy;   // su puesto
  if (F.speed < 45) {                                      // jugador en hover: vueltas a su alrededor
    _Ad2.subVectors(e.pos, P); _Ad2.y = 0; const r = _Ad2.length() || 1; _Ad2.divideScalar(r);
    _Ewant.set(-_Ad2.z, 0, _Ad2.x).addScaledVector(_Ad2, clamp((400 - r) / 300, -1, 1)); _Ewant.y = clamp((P.y + 40 + a.dy - e.pos.y) / 300, -0.5, 0.5); _Ewant.normalize();
    return 62;
  }
  _Ad2.subVectors(_Al, e.pos); const gap = _Ad2.length(), along = _Ad2.dot(_Af2);
  _Am.copy(_Al).addScaledVector(_Af2, 250); _Am.y += fy * 250;
  _Ewant.subVectors(_Am, e.pos).normalize();
  return gap > 1500 ? ALLY_VMAX : clamp(F.speed + along * 0.4, 45, ALLY_VMAX);
}
/* v34, estilo escolta: vueltas alrededor del jugador (cada uno en su ángulo, a su altura) y, cada ALLY_ESC.rest s más o menos, una
   persecución de ALLY_ESC.chase s a un dragón que va a por él (con poco daño: ver damageEnemy). */
function allyEscort(a, e, dt) {
  if (a.chaseT > 0) {
    a.chaseT -= dt;
    if (allyAlive(a.target)) return allyFight(a, e, dt);
    a.chaseT = 0;
  }
  a.restT -= dt;
  if (a.restT <= 0) {
    const P = dragon.position; let threat = null, best = ALLY_PROTECT * 1.6;
    for (const o of enemies) if (allyAlive(o) && !o.statue && o.mode !== 'cruise' && o.mode !== 'patrol') {
      const d = o.pos.distanceTo(P) + (allies.some(b => b !== a && b.chaseT > 0 && b.target === o) ? 900 : 0);   // (mejor uno que no persiga ya otro)
      if (d < best) { best = d; threat = o; }
    }
    a.restT = threat ? ALLY_ESC.rest * rnd(0.8, 1.4) : 2;
    if (threat) { a.target = threat; a.chaseT = ALLY_ESC.chase; allySay(a, 'protect'); return allyFight(a, e, dt); }
  }
  if (a.breakT > 0) { a.breakT -= dt; _Ewant.copy(a.breakDir); return ALLY_VMAX * 0.6; }
  // el punto de su vuelta: centro algo por delante del jugador, radio ALLY_ESC.radius, a su altura (y por encima del suelo)
  const P = dragon.position, R = ALLY_ESC.radius, th = a.ph + gameTime * ALLY_ESC_W, c = Math.cos(th), s = Math.sin(th);
  _Al.set(P.x + c * R, 0, P.z + s * R).addScaledVector(dragonVel, 1.2);
  _Al.y = Math.max(P.y + 40 + a.dy, groundAt(_Al.x, _Al.z) + 160);
  _Av2.set(-s * R * ALLY_ESC_W, 0, c * R * ALLY_ESC_W).add(dragonVel);   // velocidad de ese punto
  _Am.copy(_Al).addScaledVector(_Av2, 1.2);
  _Ewant.subVectors(_Am, e.pos); const gap = _Ewant.length(); _Ewant.divideScalar(gap || 1);
  return clamp(_Av2.length() + clamp(gap * 0.35, -60, 160), 50, ALLY_VMAX);
}
/* Estilo «fight» (v23): elige blanco. Un dragón en pasada de ataque muy cerca del jugador, al momento (protegerle); si no, sigue con el suyo
   un rato y, al cambiar, elige con probabilidad ALLY_PROTECT_P al que esté atacando al jugador o, si no, uno al azar entre los dragones y
   dirigibles cercanos. */
function allyPick(a) {
  const P = dragon.position, t = a.target;
  let threat = null, best = ALLY_PROTECT;
  for (const o of enemies) if (allyAlive(o) && o.mode === 'pass') { const d = o.pos.distanceTo(P); if (d < best) { best = d; threat = o; } }
  const protect = () => { if (!a.protect || threat !== t) allySay(a, 'protect'); a.target = threat; a.protect = true; a.pickT = rnd(ALLY_PICK[0], ALLY_PICK[1]); return true; };
  if (threat && best < ALLY_URGENT && threat !== t) return protect();
  if (allyAlive(t) && a.pickT > 0) return true;
  if (threat && Math.random() < ALLY_PROTECT_P) return protect();
  a.protect = false;
  const cand = [];
  for (const o of enemies) if (allyAlive(o) && !o.statue && o.mode !== 'cruise' && o.pos.distanceTo(P) < 3500) cand.push(o);
  for (const s of airships) if (!s.dead && s.pos.distanceTo(P) < 4000) cand.push(s);
  a.target = cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
  a.pickT = rnd(ALLY_PICK[0], ALLY_PICK[1]);
  return !!a.target;
}
/* Combate: persigue al blanco con adelanto, dispara cuando lo tiene delante, lo quema de cerca y rompe la pasada para no chocar. */
function allyFight(a, e, dt) {
  const t = a.target, ship = t.kind === 'airship', mouth = enemyMouth(e, _Am);
  if (interceptPoint(t, mouth, _Al, GUN_SPEED, GUN_LIFE) < 0) _Al.copy(t.pos);
  _Ad2.subVectors(_Al, mouth); const dist = _Ad2.length(); _Ad2.divideScalar(dist || 1);
  const close = ship ? t.r + 90 : 120;
  let tSpeed;
  if (a.breakT > 0) { a.breakT -= dt; _Ewant.copy(a.breakDir); tSpeed = ENEMY_VMAX; }
  else {
    _Ewant.copy(_Ad2); tSpeed = ship ? lerp(60, ENEMY_VMAX, smooth(300, 1200, dist)) : ENEMY_VMAX * 1.05;
    if (dist < close) {                                    // romper la pasada: de lado y hacia arriba
      a.breakT = 2.2; _Af2.set(0, 0, -1).applyQuaternion(e.q); rotY(_Af2, (Math.random() < 0.5 ? -1 : 1) * 0.8); _Af2.y = 0.35;
      a.breakDir.copy(_Af2.normalize());
    }
  }
  // armas: fuego rápido con el blanco delante; llamarada de cerca
  _Af2.set(0, 0, -1).applyQuaternion(e.q);
  const dot = _Af2.dot(_Ad2);
  if (state === 'playing' && a.gunCool <= 0 && dist < ALLY_GUN_RANGE && dot > ALLY_AIM && losClear(mouth.x, mouth.y, mouth.z, _Al.x, _Al.y, _Al.z)) {
    _Ar2.copy(_Ad2); _Ar2.x += rnd(-1, 1) * ALLY_AIM_ERR; _Ar2.y += rnd(-1, 1) * ALLY_AIM_ERR; _Ar2.z += rnd(-1, 1) * ALLY_AIM_ERR; _Ar2.normalize();
    const f = spawnFireball(mouth, _Ar2, false, clamp(1 - e.pos.distanceTo(dragon.position) / 1500, 0.05, 0.5), 'gun', a);
    if (a.style === 'escort') f.dmg *= ALLY_ESC.dmg;
    e.fireFlash = 1; a.gunCool = rnd(ALLY_GUN_CD[0], ALLY_GUN_CD[1]) * (a.style === 'escort' ? 2 : 1);
  }
  if (state === 'playing' && dist < ALLY_FLAME_RANGE + (ship ? t.r : 15) && dot > 0.94) allyFlame(a, e, mouth, dt);
  return tSpeed;
}
/* Llamarada del aliado: un chorro más ligero que el del jugador (menos partículas), en su color, con su daño y su alcance (v24). */
function allyFlame(a, e, mouth, dt) {
  _Af2.set(0, 0, -1).applyQuaternion(e.q);
  const c = ALLY_FIRE, n = Math.round(260 * dt + Math.random()), R = ALLY_FLAME_RANGE;
  for (let i = 0; i < n; i++) {
    const sp = FLAME_SPEED * rnd(0.9, 1.1), vx = (_Af2.x + rnd(-0.1, 0.1)) * sp, vy = (_Af2.y + rnd(-0.1, 0.1)) * sp, vz = (_Af2.z + rnd(-0.1, 0.1)) * sp;
    emit(fxAdd, mouth.x, mouth.y, mouth.z, vx + e.vel.x, vy + e.vel.y, vz + e.vel.z, R / sp * rnd(0.7, 1.05), rnd(1, 1.8), rnd(14, 22), c.r, c.g * rnd(0.85, 1.1), c.b, 0.4, 0, -8);
  }
  e.fireFlash = 1;
  const amt = ALLY_FLAME_DPS * dt * (a.style === 'escort' ? ALLY_ESC.dmg : 1);
  _Am.copy(mouth); _Al.copy(mouth).addScaledVector(_Af2, R);
  byAlly = a;
  for (const o of enemies) {
    if (o.dead || o.off) continue;
    _Ad2.subVectors(o.pos, _Am); const along = _Ad2.dot(_Af2);
    if (along < -ENEMY_HIT_R || along > R + ENEMY_HIT_R) continue;
    const r = ENEMY_HIT_R + 2 + clamp(along, 0, R) * 0.11;
    if (_Ad2.lengthSq() - along * along < r * r) damageEnemy(o, amt, _Ad2.copy(_Am).addScaledVector(_Af2, clamp(along, 0, R)), true);
  }
  for (const s of airships) if (!s.dead && airshipSegDist2(s, _Am, _Al) < (s.r + 12) ** 2) damageAirship(s, amt, true, _sdc);
  byAlly = false;
}
