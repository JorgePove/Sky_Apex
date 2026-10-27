/* ============================================================
   7. ENTRADA, MODELO DE VUELO Y ESTADO DE JUEGO
   Controles: W/S aceleración · ratón = dirección (marcador al estilo War Thunder, con banking)
   · Q/E alabeo · Shift boost · Espacio hover · R nivelar · C cámara · M sonido.
   Armas (ver «Armas del jugador»): clic izq. = fuego rápido; mantenido sobre el círculo rojo = bola guiada; clic dcho. = llamarada;
   izq. + dcho. a la vez = rayo de fuego; clic central = fijar objetivo.
   El dragón se orienta con un cuaternión: pitch/yaw/roll son siempre ejes LOCALES,
   así arriba/abajo/adelante/atrás se mantienen correctos con cualquier alabeo.
   ============================================================ */
let state = 'loading';               // loading | menu | select | worldgen (v19: generando el mundo de la misión) | playing | paused | dead | victory | failed
let gameTime = 0;
const keys = {};
const dragonVel = new THREE.Vector3();
const F = {
  speed: 70, throttle: 0.5, rate: { p: 0, y: 0, r: 0 }, health: 100, lastHit: -99, fireFlash: 0,
  aimWorld: new THREE.Vector3(0, 0, -1), aimLocal: new THREE.Vector3(0, 0, -1),
  flapTarget: 0.6, third: false, sens: 1, locked: false, lockRequested: false, ndcX: 0, ndcY: 0, pdx: 0, pdy: 0,
  sink: 0, deadT: 0, lookYaw: 0, lookPit: 0, lookHeld: false,   // mirar alrededor con la Z (rad)
  bank: 0,                                              // alabeo automático (rad, mismo signo que el roll: + = ala derecha arriba)
  boost: 1, boostDelay: 0, boostExhausted: false, boosting: false, boostFx: 0, boostKick: 0, kickFx: 0,   // kick: golpe al activar el boost
  hover: false, hoverK: 0, hvy: 0,                       // hvy: velocidad vertical en hover (W/S)
  steer: new THREE.Vector3(0, 0, -1), prevSpeed: 0, accS: 0   // v13: dirección que sigue el dragón (la mira con un poco de retraso) y aceleración suavizada (sonido, cámara)
};
const VMIN = 33, VMAX = 1100 / 3.6, VCRUISE_MAX = 550 / 3.6;   // m/s: pérdida; tope absoluto (con boost, 1100 km/h); máxima nivelado sin boost (550 km/h)
// Empuje y resistencia calibrados con esas velocidades: a todo gas y nivelado, empuje = resistencia justo a VCRUISE_MAX;
// el boost cuadruplica el empuje (resistencia ∝ v², así que dobla la velocidad: VMAX)
const THRUST = [3, 27], DRAG = (THRUST[0] + THRUST[1]) / (VCRUISE_MAX * VCRUISE_MAX);
const GRAVITY = 30;                                     // aceleración por la pendiente (m/s² en vertical): subir frena y bajar acelera, más que la gravedad real
const DIVE_DRAG = 0.4;                                  // en picado el dragón pliega las alas: la resistencia baja hasta este tanto (por eso se gana tanta velocidad)
const BANK_GAIN = 0.40, BANK_MAX = 0.80;                // alabeo ≈ 0,40 rad por rad/s de guiñada (máx. ~46°; v12: 0,30 y 29°). El cuerpo se inclina aún más (BODY_ROLL)
/* v13: peso. La mira responde al momento, pero el dragón la sigue con un poco de retraso (STEER_LAG: la dirección que persigue alcanza a la
   mira en ~0,1 s) y con más inercia en las tasas de giro (RATE_RESP, antes 7,5 y 4,5). STEER_GAIN: giro pedido por radián de error
   (antes 2,6). Simulado: a un salto de la mira de 20°, llega a la mitad en 0,47 s (antes 0,34) y se pasa un 6 % antes de asentarse. */
const STEER_LAG = 12, RATE_RESP = [6, 4], STEER_GAIN = 2.2;
const BOOST_DRAIN = 0.25, BOOST_REFILL = 0.125, BOOST_DELAY = 2.0, BOOST_THRUST = 90, BOOST_STEER = 0.2;   // BOOST_THRUST = 3 × empuje máximo: dobla la velocidad
const BOOST_FOV = 18, BOOST_KICK_FOV = 5;               // apertura del campo de visión con boost y golpe extra al activarlo (grados)
const SPEED_FOV = 8;                                    // y algo más según la velocidad por encima de la de crucero (picados y boost)
const BOOST_SHAKE = [0.0035, 0.009];                    // temblor de cámara (rad): continuo con boost y del golpe al activarlo
const SPEED_SHAKE = 0.0022;                             // v13: temblor por encima de la velocidad de crucero (picados), hasta este tope a VMAX
const HOVER_BRAKE = 2.6, HOVER_EXIT_SPEED = 28, HOVER_VSPEED = 26;
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _l = new THREE.Vector3(), _ax = new THREE.Vector3(), _dq = new THREE.Quaternion(), _iq = new THREE.Quaternion();

/* ---------- Entrada ---------- */
const hudEl = document.getElementById('hud');
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && (state === 'playing' || state === 'paused')) e.preventDefault();   // evita el scroll / activar botones
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'Space') { if (state === 'playing') toggleHover(); }
  else if (e.code === 'KeyC') F.third = !F.third;
  else if (e.code === 'KeyF') activateShield();
  else if (e.code === 'KeyM') { sfx.init(); const m = sfx.toggleMute(); music.setMuted(m); toast(m ? 'Sonido desactivado' : 'Sonido activado'); }   // efectos y música
  else if (e.code === 'Escape' && state === 'menu') {      // (con el vídeo del tutorial ampliado, primero lo reduce; v22: sin paneles, de los modos de juego al menú)
    if (!tutEscape()) { if (document.querySelector('.mpanel:not([hidden])')) closePanels(); else if (playMenuOpen()) showPlayMenu(false); }
  }
  else if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'select' && e.code === 'Escape') leaveSelect(false);
    else if (state === 'playing' && !F.locked) setPaused(true); else if (state === 'paused' && e.code === 'KeyP') resumeGame();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; W.lmb = W.rmb = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') setPaused(true); });
window.addEventListener('mousemove', e => {
  if (F.locked || F.lookHeld) { F.pdx += e.movementX || 0; F.pdy += e.movementY || 0; }   // con la Z, también sin puntero bloqueado
  else { F.ndcX = (e.clientX / window.innerWidth) * 2 - 1; F.ndcY = -((e.clientY / window.innerHeight) * 2 - 1); }
});
/* Ratón en partida: izquierdo = fuego rápido / bola guiada, derecho = llamarada, los dos casi a la vez = rayo, central = fijar objetivo. */
canvasGL.addEventListener('mousedown', e => {
  if (state !== 'playing') return;
  if (e.button === 1) { e.preventDefault(); cycleTarget(); return; }   // clic central: fijar el siguiente dragón enemigo a la vista
  const t = performance.now() / 1000;
  if (e.button === 0) {
    W.lmb = true; W.lmbT = t;
    if (!(W.rmb && t - W.rmbT < COMBO_WIN && tryLaser())) pressLeft();
  } else if (e.button === 2) {
    W.rmb = true; W.rmbT = t;
    if (!(W.lmb && t - W.lmbT < COMBO_WIN && tryLaser()) && W.overheat > 0) sfx.empty();
  }
});
window.addEventListener('mouseup', e => {
  if (e.button === 0) { W.lmb = false; W.lockArmed = false; W.lock = 0; }
  else if (e.button === 2) W.rmb = false;
});
window.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  F.locked = document.pointerLockElement === canvasGL;
  if (!F.locked && F.lockRequested && state === 'playing') setPaused(true);
});
document.addEventListener('pointerlockerror', () => { F.lockRequested = false; F.locked = false; });
function requestLock() {
  F.lockRequested = true;
  try { const p = canvasGL.requestPointerLock(); if (p && p.catch) p.catch(() => { F.lockRequested = false; }); } catch (err) { F.lockRequested = false; }
}
const sensEl = document.getElementById('sens');
sensEl.addEventListener('input', () => { F.sens = sensEl.value / 100; document.getElementById('sensV').textContent = sensEl.value; });

/* ---------- Avisos de interfaz ---------- */
const toastEl = document.getElementById('toast'), vigEl = document.getElementById('vig'), warnEl = document.getElementById('warn');
let toastTimer = 0, vigAlpha = 0;
function setWarn(text, color, alpha) {
  if (warnEl.textContent !== text) warnEl.textContent = text;
  warnEl.style.color = color; warnEl.style.opacity = String(alpha);
}
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200); }

/* ---------- Estados ---------- */
const menuEl = document.getElementById('menu'), pauseEl = document.getElementById('pause'), deadEl = document.getElementById('dead');
function setPaused(p) {
  if (p && state === 'playing') {
    state = 'paused'; pauseEl.hidden = false; W.lmb = W.rmb = W.shotQ = false; sfx.breath(0, 0); sfx.quiet(); if (document.pointerLockElement) { F.lockRequested = false; document.exitPointerLock(); }
    document.getElementById('pRetry').textContent = mission.free ? 'Reiniciar partida' : 'Reintentar misión';
  }
}
function resumeGame() {
  if (state !== 'paused') return;
  pauseEl.hidden = true; state = 'playing'; requestLock(); canvasGL.focus();
}
pauseEl.addEventListener('click', resumeGame);
/* v15: botones de la pausa (el clic no llega al fondo, que reanuda) */
for (const [id, fn] of [['pResume', resumeGame], ['pRetry', restartGame], ['pMenu', backToMenu]]) document.getElementById(id).addEventListener('click', e => { e.stopPropagation(); fn(); });
/* ---------- Objetivo, estadísticas y reinicio (v10) ----------
   v15: el objetivo y el final los lleva el motor de misiones (módulos M1 y M2): showResult muestra MISIÓN CUMPLIDA (o VICTORIA, en el
   combate libre) o MISIÓN FALLIDA, con las estadísticas y la opción de volver al menú, reintentar o salir. RUN = torres y dragones de la
   partida en curso (los copia de la receta missionSetup; al arrancar, los valores por defecto). */
const stats = { time: 0, deaths: 0, shots: 0, shotHits: 0, msl: 0, mslHits: 0, lasers: 0, shields: 0, blocked: 0, dmgTaken: 0, dist: 0, vmax: 0 };
const START = { pos: new THREE.Vector3(), q: new THREE.Quaternion(), dir: new THREE.Vector3() };   // punto de partida (lo fija el arranque)
const RUN = { towers: { total: TOWER_TOTAL, zone: TOWER_ZONE.slice(), islands: TOWER_ISL.slice(), center: [0, 0], random: true, sites: [], tags: [] },
  dragons: { total: ENEMY_TOTAL, atOnce: ENEMY_COUNT, tags: [] },
  airships: { total: 0, zone: AIRSHIP_ZONE.slice(), alt: AIRSHIP_ALT.slice(), center: [0, 0], random: true, sites: [], tags: [] },   // v21: dirigibles (6c)
  world: null };                                           // v19: semilla, bioma y punto de partida de la misión (missionSetup)
const vicEl = document.getElementById('victory'), byeEl = document.getElementById('bye');
const fmtClock = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function showResult(win, why) {
  state = win ? 'victory' : 'failed'; W.lmb = W.rmb = false; sfx.breath(0, 0); sfx.quiet();
  deadEl.hidden = pauseEl.hidden = true; toastEl.classList.remove('on');
  if (document.pointerLockElement) { F.lockRequested = false; document.exitPointerLock(); }
  music.game.stop(2); music.menu.play(2.5);
  const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '—';
  const rows = [
    ['Tiempo', fmtClock(stats.time)], ['Puntos', towerState.score],
    RUN.towers.total ? ['Torres destruidas', towerState.kills + ' / ' + RUN.towers.total] : null,
    dragonsTotal() ? ['Dragones derribados', enemyState.kills + ' / ' + dragonsTotal()] : null,
    airships.length ? ['Dirigibles destruidos', airshipState.kills + ' / ' + airships.length] : null,
    ['Caídas', stats.deaths], ['Precisión del fuego rápido', pct(stats.shotHits, stats.shots) + '  (' + stats.shotHits + ' de ' + stats.shots + ')'],
    ['Bolas guiadas', stats.mslHits + ' aciertos de ' + stats.msl], ['Rayos de fuego', stats.lasers],
    ['Escudos', stats.shields + ' usados · ' + stats.blocked + ' proyectiles parados'], ['Daño recibido', Math.round(stats.dmgTaken)],
    ['Distancia recorrida', (stats.dist / 1000).toFixed(1).replace('.', ',') + ' km'], ['Velocidad máxima', Math.round(stats.vmax * 3.6) + ' km/h']
  ].filter(Boolean);
  document.getElementById('vicStats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  const free = !!mission.free, whyEl = document.getElementById('vicWhy'), retry = document.getElementById('vicRestart');
  document.getElementById('vicKicker').textContent = free ? (win ? 'Objetivo cumplido' : 'Combate libre') : mission.name + '  ·  ' + mission.place;
  document.getElementById('vicTitle').textContent = free ? (win ? 'Victoria' : 'Derrota') : (win ? 'Misión cumplida' : 'Misión fallida');
  whyEl.textContent = why || ''; whyEl.hidden = !why;
  retry.textContent = free ? 'Reiniciar partida' : win ? 'Repetir misión' : 'Reintentar';
  vicEl.querySelector('.vic').classList.toggle('fail', !win);
  vicEl.hidden = false; (win ? document.getElementById('vicMenu') : retry).focus();
}
/* Partida nueva: torres reconstruidas, estadísticas a cero y el dragón en el punto de partida (el terreno de allí, ya generado). */
function resetRun(pump) {
  for (const k in stats) stats[k] = 0;
  towerState.destroyed.clear(); towerState.score = 0; towerState.kills = 0;
  for (const t of [...towers.values()]) dropTower(t);
  planTowers();                                            // v13: nuevo reparto de torres (entre 10 y 15 en islas)
  planAirships();                                          // v21: y los dirigibles de la misión
  for (let i = fireballs.length - 1; i >= 0; i--) killFireball(i);
  boltsClear();
  dragon.position.copy(START.pos); dragon.quaternion.copy(START.q); F.aimWorld.copy(START.dir);
  F.speed = 80; F.throttle = 0.5; F.rate.p = F.rate.y = F.rate.r = 0; F.bank = 0; F.sink = 0; F.lookYaw = F.lookPit = 0; dragonVel.set(0, 0, 0);
  F.steer.set(0, 0, -1); F.prevSpeed = F.speed; F.accS = 0; dragonAnim.camQ = null;
  const P = dragon.position;
  refreshTerrainSelection(P.x, P.y, P.z, true);
  if (pump) for (let i = 0, t0 = performance.now(); i < 400 && pumpTerrain(30) > 0 && performance.now() - t0 < 4000; i++) { }   // (en el menú se genera poco a poco)
  updateTowerStreaming(P.x, P.z); updateIslandStreaming(P.x, P.z); pumpIslands(4000);
}
function backToMenu() {
  vicEl.hidden = byeEl.hidden = deadEl.hidden = pauseEl.hidden = true; closePanels();
  MS.ended = true; missionHideHUD(); allyOff(); sfx.breath(0, 0); sfx.quiet();
  state = 'menu'; menuEl.hidden = false; showPlayMenu(false); resetRun();   // (v22: al terminar una partida, el menú principal)
  music.game.stop(1.5); music.menu.play(1.5);
}
function restartGame() { vicEl.hidden = pauseEl.hidden = deadEl.hidden = true; state = 'menu'; startGame(); }   // (v15: también desde la pausa)
/* Salir: un juego en una página no puede cerrar su pestaña (salvo que la abriera un script): se intenta y, si no, despedida en negro. */
function quitGame() {
  music.menu.stop(0.8); music.game.stop(0.8); sfx.breath(0, 0);
  vicEl.hidden = true; menuEl.hidden = true; closePanels(); state = 'menu';
  try { window.close(); } catch (err) { }
  setTimeout(() => { byeEl.hidden = false; }, 250);
}
document.getElementById('vicMenu').addEventListener('click', backToMenu);
document.getElementById('vicRestart').addEventListener('click', restartGame);
document.getElementById('vicQuit').addEventListener('click', quitGame);
document.getElementById('byeBack').addEventListener('click', backToMenu);
function startGame() {
  if (state !== 'menu') return;
  missionSetup(missionId);                                 // v15: la receta de la misión elegida (torres y dragones → RUN)
  if (worldNeedsGen()) { beginWorldGen(); return; }        // v19: otro mundo → pantalla de carga; al acabar, startGame otra vez
  resetRun(true);
  sfx.init(); menuEl.hidden = true; state = 'playing';
  music.menu.stop(1.6); music.game.play(2.5);              // la música del menú se funde y entra la de la partida
  F.health = heroStats().hp; towerState.score = 0; towerState.kills = 0;   // (v17: la vida máxima del dragón elegido)
  spawnEnemies();
  F.hover = false; F.hoverK = 0; F.hvy = 0; F.boost = 1; F.boostDelay = 0; F.boostExhausted = false; F.boostFx = 0; F.boostKick = F.kickFx = 0; F.boosting = false;
  resetWeapons(true);
  requestLock(); canvasGL.focus();
  missionStart();                                          // objetivos, eventos, radio y área (y el aviso de inicio)
}
/* Menú → «Elige tu dragón» → partida (o de vuelta al menú con «← Menú» o Esc). */
const selEl = document.getElementById('select');
function enterSelect() {
  if (state !== 'menu' || !hero.ready) return;
  sfx.init(); sfx.quiet(); state = 'select'; menuEl.hidden = true; selEl.hidden = false;
  showroomEnter();
}
function leaveSelect(toGame) {
  if (state !== 'select') return;
  showroomLeave(); selEl.hidden = true; state = 'menu'; saveColors();
  if (toGame) startGame(); else menuEl.hidden = false;
}
document.getElementById('back').addEventListener('click', () => leaveSelect(false));
document.getElementById('start').addEventListener('click', () => leaveSelect(true));
/* Hover: se frena del todo y se queda aleteando; al salir se reanuda el vuelo con un impulso de alas. */
function toggleHover() {
  if (state !== 'playing') return;
  F.hover = !F.hover;
  if (F.hover) { F.hvy = 0; sfx.hoverOn(); toast('HOVER  ·  W/S suben y bajan'); }
  else { F.speed = Math.max(F.speed, HOVER_EXIT_SPEED); F.sink = 0; F.hvy = 0; sfx.hoverOff(); toast('Vuelo normal'); }
}
function crash(why) {
  if (state !== 'playing') return;
  state = 'dead'; F.deadT = 0; W.lmb = W.rmb = false; stats.deaths++; if (W.shieldT > 0) { W.shieldT = 0; W.shieldFade = 0.4; }
  document.getElementById('deadwhy').textContent = why; F.deadWhy = why;
  deadEl.hidden = false;
  const p = dragon.position;
  explode(p.x, p.y, p.z, 1.2); sfx.hurt(); camShake = 1.4;
}
function respawn() {
  const p = dragon.position, g = Math.max(heightAt(p.x, p.z), WL);
  p.y = Math.max(p.y, g + 40) > g + 300 ? p.y : g + 300;
  for (let i = 0, s; i < 6 && (s = islandAt(p.x, p.y, p.z, 90)); i++) p.y = s.yMax + 130;
  _f.set(0, 0, -1).applyQuaternion(dragon.quaternion); _f.y = 0; if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1); _f.normalize();
  dragon.quaternion.setFromRotationMatrix(_m4.lookAt(ZERO, _f, UP));
  F.speed = 80; F.throttle = 0.5; F.rate.p = F.rate.y = F.rate.r = 0; F.health = heroStats().hp; F.aimWorld.copy(_f); F.steer.set(0, 0, -1); F.prevSpeed = F.speed; F.accS = 0; dragonAnim.camQ = null;
  F.hover = false; F.hoverK = 0; F.hvy = 0; F.bank = 0; F.sink = 0; F.lookYaw = F.lookPit = 0; F.boost = 1; F.boostDelay = 0; F.boostExhausted = false; F.boostFx = 0; F.boostKick = F.kickFx = 0; F.boosting = false;
  deadEl.hidden = true; state = 'playing';
  boltsClear(); enemiesCalm(); resetWeapons(false);
}
function boltsClear() { for (const b of bolts) scene.remove(b.mesh); bolts.length = 0; }
/* light: impacto pequeño (antiaéreo): menos sacudida y sin estallido. */
function hurtDragon(n, why, light) {
  F.health -= n; F.lastHit = gameTime; stats.dmgTaken += n;
  if (light) { vigAlpha = Math.max(vigAlpha, 0.45); camShake = Math.max(camShake, 0.22); if (!(gameTime - hurtDragon.sndT < 0.1)) { hurtDragon.sndT = gameTime; sfx.hit(); } }
  else { vigAlpha = 1; camShake = Math.max(camShake, 0.7); sfx.hurt(); const p = dragon.position; explode(p.x, p.y - 2, p.z, 0.35); }
  if (F.health <= 0) { F.health = 0; crash(why || 'Te derribaron'); }
}

/* ---------- Disparo ---------- */
const _mouth = new THREE.Vector3(), _dir = new THREE.Vector3(), _org = new THREE.Vector3(), _hit = new THREE.Vector3();
function aimPointFrom(origin, dir) {
  // marcha a lo largo del rayo del marcador: terreno o torres; si no hay impacto, un punto lejano
  let t = 25, last = 0;
  const maxT = 3200, tIsl = islandRayHit(origin, dir, maxT), tEn = enemyRayHit(origin, dir, maxT), tAir = airshipRayHit(origin, dir, maxT);
  const tI = Math.min(tIsl, tEn, tAir), limit = Math.min(maxT, tI);   // la isla, el dragón enemigo o el dirigible (v21) más cercano en el rayo
  while (t < limit) {
    _hit.copy(origin).addScaledVector(dir, t);
    const gy = Math.max(heightAt(_hit.x, _hit.z), WL);
    if (_hit.y < gy) {                        // refinar entre last y t
      let a = last, b = t;
      for (let i = 0; i < 6; i++) { const m = (a + b) / 2; _hit.copy(origin).addScaledVector(dir, m); if (_hit.y < Math.max(heightAt(_hit.x, _hit.z), WL)) b = m; else a = m; }
      return _hit.copy(origin).addScaledVector(dir, b);
    }
    for (const tw of towers.values()) {
      if (tw.dead) continue;
      const dx = _hit.x - tw.x, dz = _hit.z - tw.z;
      if (dx * dx + dz * dz < (TOWER_R + 4) ** 2 && _hit.y > tw.y && _hit.y < tw.y + TOWER_TOP) return _hit;
    }
    last = t; t += Math.max(12, t * 0.05);
  }
  if (tI < maxT) return tEn <= tIsl && tEn <= tAir ? _hit.copy(enemyAimPt) : _hit.copy(origin).addScaledVector(dir, Math.min(tIsl, tAir));
  return _hit.copy(origin).addScaledVector(dir, 1400);
}

/* ---------- Armas del jugador ----------
   Las cuatro están siempre disponibles (no se cambia de arma); cada una tiene su condición:
   · Fuego rápido (clic izquierdo): un proyectil pequeño y muy rápido por clic, con poco daño (la «ametralladora»). Munición GUN_AMMO;
     tras GUN_REFILL_DELAY s sin disparar se rellena de uno en uno.
   · Bola guiada (clic izquierdo mantenido más de MSL_HOLD s): con un dragón fijado (clic central) a menos de MSL_RANGE, aparece un círculo rojo a su
     alrededor. Pasado MSL_HOLD, cada segundo con la mira dentro del círculo carga el bloqueo; a los MSL_LOCK s sale una gran bola de fuego que lo persigue
     hasta impactar. Los clics cortos son siempre fuego rápido. Fuera del círculo la carga se pierde poco a poco; al soltar, entera.
     Munición: MSL_AMMO al empezar (máximo MSL_MAX); cada torre destruida recarga MSL_TOWER. Al morir no se recargan.
   · Llamarada (clic derecho mantenido): chorro de FLAME_RANGE m que daña todo lo que toca. Calienta; al llegar al 100 %, sobrecalentamiento:
     todas las armas inutilizadas OVERHEAT_T s. Al soltar antes, el calor baja solo.
   · Rayo de fuego, la ultimate (izquierdo + derecho con menos de COMBO_WIN s entre uno y otro): la barra se carga con el tiempo (ULT_TIME s) y al
     hacer daño. Llena, parpadea. Al estilo de un kamehameha: la energía se concentra en la boca LASER_CHARGE s, sale un rayo gordo que llega a
     LASER_RANGE m, sigue a la mira y daña todo lo que cruza. Dura LASER_T s desde el clic; mientras dura, las demás armas callan.
   Todo sale del socket de la boca (hero.mouth, entre los labios y colgado del morro). Los disparos se lanzan después de animar al dragón en cada
   fotograma (updateAttacks), así que salen de la boca tal y como se ve en pantalla, aunque la cabeza gire.
   Todos los valores de ajuste están aquí. Vida de un dragón enemigo: ENEMY_HP (100); de una torre: TOWER_HP (60). */
const GUN_AMMO = 20, GUN_COOL = 0.1, GUN_REFILL_DELAY = 1, GUN_REFILL_RATE = 8;   // munición, pausa mínima entre clics (s), espera antes de recargar (s), proyectiles recargados por segundo
const GUN_SPEED = 1100, GUN_LIFE = 2.8, GUN_DMG = 5;                              // m/s (fija en el mundo), vida (s) y daño por impacto
const MSL_RANGE = 3000, MSL_HOLD = 0.5, MSL_LOCK = 3, MSL_DECAY = 2, MSL_CIRCLE = 0.1;   // alcance (m), clic mantenido antes de empezar a cargar (s), segundos de carga con la mira en el círculo, fuera del círculo la carga se pierde x veces más rápido, radio mínimo del círculo (fracción del alto de pantalla)
const MSL_AMMO = 5, MSL_MAX = 5, MSL_TOWER = 2;
const MSL_CIRCLE_K = 0.5;                                                         // tamaño del círculo rojo respecto al de la v9 (que medía lo del cuadro dorado + 14 px, o el 10 % del alto)                                   // bolas guiadas al empezar, máximo y recarga por torre destruida
const MSL_SPEED = [160, 400], MSL_ACCEL = 260, MSL_TURN = 3.2, MSL_LIFE = 15, MSL_DMG = 70;   // velocidad al salir (al menos la del dragón + 40) y máxima (m/s), aceleración (m/s²), giro (rad/s), vida (s), daño
const FLAME_RANGE = 200, FLAME_SPEED = 240, FLAME_DPS = 70, FLAME_HEAT = 5, FLAME_COOL = 4, OVERHEAT_T = 10;   // alcance (m), velocidad de las llamas (m/s), daño por segundo, segundos seguidos hasta sobrecalentarse, segundos en enfriarse del todo, segundos sin armas
const ULT_TIME = 90, ULT_PER_DMG = 0.001, ULT_PER_KILL = 0.05, COMBO_WIN = 0.3;  // rayo: de 0 a 100 % en 90 s, +0,1 % por punto de daño, +5 % por derribo (una torre, la mitad); ventana de los dos clics (s)
const LASER_T = 10, LASER_CHARGE = 0.4, LASER_SHOOT = 6000, LASER_RANGE = 3000, LASER_DPS = 220, LASER_R = 8;   // duración (s, desde el clic), carga en la boca (s), velocidad a la que sale el rayo (m/s), alcance (m), daño por segundo, radio de daño (m)
const W = {
  ammo: GUN_AMMO, cool: 0, refill: 0, refillAcc: 0, shotQ: false,                 // fuego rápido: munición, pausa entre clics, espera hasta recargar, disparo pendiente (sale en updateAttacks)
  lmb: false, rmb: false, lmbT: -9, rmbT: -9, holdT: 0,                           // botones pulsados, cuándo (para el «a la vez» del rayo) y cuánto lleva mantenido el izquierdo
  msl: MSL_AMMO, lock: 0, lockArmed: false, lockWhy: 'sin', lockIn: false, beepT: 0, mslFlash: 0, mslQ: null,   // bola guiada: munición, carga 0-1, si el clic actual puede cargar, estado del círculo, lanzamiento pendiente
  heat: 0, heatDelay: 0, overheat: 0, flame: false,                               // llamarada: calor 0-1, segundos de sobrecalentamiento que quedan
  ult: 0, ultFull: false, laser: 0, snd: false,                                   // rayo: carga 0-1, segundos de rayo que quedan
  shield: 3, shieldT: 0, shieldFade: 0, shieldHit: 0                              // escudo: cargas, segundos que le quedan, desvanecido final y destello de impacto
};
function ultGain(x) { if (W.laser <= 0) W.ult = Math.min(1, W.ult + x); }
function weaponsReady() { return W.overheat <= 0 && W.laser <= 0; }
function resetWeapons(full) {
  W.ammo = GUN_AMMO; W.cool = W.refill = W.refillAcc = 0; W.shotQ = false; W.lmb = W.rmb = false; W.holdT = 0;
  W.lock = 0; W.lockArmed = false; W.mslFlash = 0; W.mslQ = null; W.heat = W.heatDelay = W.overheat = 0; W.flame = false; W.laser = 0;
  W.shieldT = W.shieldFade = W.shieldHit = 0;
  if (full) { W.ult = 0; W.ultFull = false; W.msl = MSL_AMMO; W.shield = SHIELD_MAX; }
}
/* Clic izquierdo: siempre un disparo de fuego rápido (sale en el siguiente fotograma, de la boca ya animada). Si se mantiene más de MSL_HOLD s,
   empieza a cargar la bola guiada (updateWeapons). */
function pressLeft() {
  if (!weaponsReady()) { sfx.empty(); return; }
  W.lockArmed = true; W.holdT = 0; W.shotQ = true;
}
function fireGun() {
  if (W.cool > 0.002) return;                          // (margen: un clic justo a los 0,1 s no se pierde por redondeo)
  if (W.ammo <= 0) { sfx.empty(); return; }
  W.ammo--; W.cool = GUN_COOL; W.refill = GUN_REFILL_DELAY; W.refillAcc = 0; stats.shots++;
  F.fireFlash = Math.max(F.fireFlash, 0.6);
  heroMouth(_mouth);
  camera.getWorldPosition(_org);
  _dir.subVectors(aimPointFrom(_org, F.aimWorld), _mouth).normalize();
  spawnFireball(_mouth, _dir, false, 0, 'gun');
  for (let i = 0; i < 6; i++) emit(fxAdd, _mouth.x, _mouth.y, _mouth.z, _dir.x * rnd(30, 70) + rnd(-5, 5) + dragonVel.x, _dir.y * rnd(30, 70) + rnd(-5, 5) + dragonVel.y, _dir.z * rnd(30, 70) + rnd(-5, 5) + dragonVel.z, rnd(0.12, 0.25), 1.4, 3, ATTACK.r, ATTACK.g * rnd(0.8, 1.2), ATTACK.b, 0.9, 1.5, 0);
}
/* Círculo rojo de la bola guiada alrededor del dragón fijado: centro y radio en píxeles de pantalla (x, y, r) y si la mira está dentro (in).
   Devuelve '' si el círculo está activo o el motivo por el que no: 'sin' (nada fijado), 'rango' (más lejos de MSL_RANGE) o 'fuera' (fuera de pantalla). */
const _Wl = { x: 0, y: 0, r: 0, d: 0, in: false }, _Wv = new THREE.Vector3(), _Wc = new THREE.Vector3();
function lockCircle(out) {
  const e = enemyLock.e; out.in = false;
  if (!e || e.dead) return 'sin';
  out.d = e.pos.distanceTo(dragon.position);
  if (out.d > MSL_RANGE) return 'rango';
  const sw = window.innerWidth, sh = window.innerHeight;
  camera.getWorldPosition(_Wc);
  _Wv.copy(e.pos).applyMatrix4(camera.matrixWorldInverse);
  if (_Wv.z > -1) return 'fuera';
  _Wv.applyMatrix4(camera.projectionMatrix);
  if (Math.abs(_Wv.x) > 1 || Math.abs(_Wv.y) > 1) return 'fuera';
  out.x = (_Wv.x * 0.5 + 0.5) * sw; out.y = (-_Wv.y * 0.5 + 0.5) * sh;
  const pxm = sh / (2 * e.pos.distanceTo(_Wc) * Math.tan(camera.fov * Math.PI / 360));
  out.r = MSL_CIRCLE_K * Math.max(MSL_CIRCLE * sh, clamp(targetHalf(e) * pxm, 17, 96) + 14);   // (v10: la mitad que antes; v21: según el tamaño del blanco)
  _Wv.copy(_Wc).addScaledVector(F.aimWorld, 1000).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  out.in = Math.hypot((_Wv.x * 0.5 + 0.5) * sw - out.x, (-_Wv.y * 0.5 + 0.5) * sh - out.y) < out.r;
  return '';
}
function launchMissile(e) {
  heroMouth(_mouth);
  const f = spawnFireball(_mouth, F.aimWorld, false, 1.2, 'msl');
  f.target = e; f.speed = Math.max(MSL_SPEED[0], F.speed + 40); f.vel.copy(F.aimWorld).multiplyScalar(f.speed);   // sale hacia la mira y gira hacia su blanco
  W.msl = Math.max(0, W.msl - 1); stats.msl++;
  F.fireFlash = 1; camShake = Math.max(camShake, 0.35); W.mslFlash = 1.5;
  sfx.locked(); sfx.launch();
  const d = F.aimWorld;
  for (let i = 0; i < 30; i++) emit(fxAdd, _mouth.x, _mouth.y, _mouth.z, d.x * rnd(20, 60) + rnd(-10, 10) + dragonVel.x, d.y * rnd(20, 60) + rnd(-10, 10) + dragonVel.y, d.z * rnd(20, 60) + rnd(-10, 10) + dragonVel.z, rnd(0.25, 0.5), 3, 8, ATTACK.r, ATTACK.g * rnd(0.8, 1.2), ATTACK.b, 0.9, 1.5, 0);
}
function tryLaser() {
  if (W.ult < 1 || !weaponsReady()) return false;
  W.laser = LASER_T; W.lock = 0; W.lockArmed = false; W.flame = false; W.shotQ = false; stats.lasers++;
  F.fireFlash = 1; camShake = Math.max(camShake, 0.4);
  sfx.laserOn(); toast('¡RAYO DE FUEGO!');
  return true;
}
/* ---------- Escudo (F) ----------
   Esfera de energía azul alrededor del dragón durante SHIELD_T s: anula el daño de bolas de fuego, bolas guiadas y virotes, que revientan
   contra ella (no el de los choques). SHIELD_MAX cargas, marcadas con rayas azules bajo la mira (la usada se vacía y queda negra); solo se
   recargan derribando dragones (+1 cada uno). En su último SHIELD_BLINK s parpadea y luego se disipa. */
const SHIELD_MAX = 3, SHIELD_T = 5, SHIELD_R = 18, SHIELD_BLINK = 1.2, SHIELD_POS = new THREE.Vector3(0, 0.5, 2.5);   // cargas, duración (s), radio (m: cubre la envergadura y deja fuera la cámara de 3ª persona), parpadeo final (s), centro (ejes del dragón)
const shieldMesh = (() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uHit: { value: 0 }, uHitDir: { value: new THREE.Vector3(0, 0, -1) }, uColor: { value: new THREE.Color(0.25, 0.6, 1) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = position; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime, uAlpha, uHit; uniform vec3 uHitDir, uColor; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        vec3 n = normalize(vN), v = normalize(vV), p = normalize(vP);
        float fres = pow(1.0 - abs(dot(n, v)), 2.5);                                        // borde brillante, centro casi transparente
        float lat = asin(clamp(p.y, -1.0, 1.0)), lon = atan(p.z, p.x);
        float cells = abs(sin(lat * 9.0 + uTime * 0.6) * sin(lon * 11.0 - uTime * 0.4));   // retícula de energía que se desliza
        float grid = smoothstep(0.93, 1.0, 1.0 - cells) * 0.2;
        float flow = 0.5 + 0.5 * sin(p.y * 14.0 - uTime * 4.0 + sin(lon * 3.0 + uTime) * 1.5);
        float hit = uHit * exp(-distance(p, uHitDir) * 5.0) * 1.6;                          // destello donde choca un proyectil
        float a = (0.06 + 0.05 * flow + fres * 0.85 + grid + hit) * uAlpha;
        gl_FragColor = vec4(mix(uColor, vec3(0.8, 0.93, 1.0), clamp(fres * 0.3 + hit, 0.0, 1.0)), a); }`
  }));
  m.visible = false; m.renderOrder = 9; m.frustumCulled = false; m.position.copy(SHIELD_POS); dragon.add(m);
  return m;
})();
const _shC = new THREE.Vector3(), _shD = new THREE.Vector3(), _shP = new THREE.Vector3();
function shieldOn() { return W.shieldT > 0 && state === 'playing'; }
function shieldCenter(out) { return dragon.localToWorld(out.copy(SHIELD_POS)); }
function activateShield() {
  if (state !== 'playing' || W.shieldT > 0) return;
  if (W.shield <= 0) { sfx.empty(); toast('Sin cargas de escudo  ·  derriba dragones'); return; }
  W.shield--; W.shieldT = SHIELD_T; W.shieldFade = 0; stats.shields++; sfx.shieldOn(); toast('ESCUDO');
}
/* Un proyectil revienta contra el escudo en `at` (mundo): chispas azules, destello en ese punto y sonido. */
function shieldHit(p, k) {
  shieldCenter(_shC); _shD.subVectors(p, _shC).normalize();
  const at = _shP.copy(_shC).addScaledVector(_shD, SHIELD_R);                   // en la superficie de la esfera
  shieldMesh.material.uniforms.uHitDir.value.copy(_shD).applyQuaternion(_hQ.copy(dragon.quaternion).invert());   // en ejes de la esfera
  W.shieldHit = 1; stats.blocked++;
  for (let i = 0; i < 26 * k; i++) {
    const a = Math.random() * 6.283, c = rnd(-1, 1), sn = Math.sqrt(1 - c * c), sp = rnd(15, 60);
    emit(fxAdd, at.x, at.y, at.z, Math.cos(a) * sn * sp + dragonVel.x, c * sp + dragonVel.y, Math.sin(a) * sn * sp + dragonVel.z, rnd(0.25, 0.6), rnd(2, 4), 0.4, 0.35, 0.7, 1, 1, 1.5, 0);
  }
  emit(fxAdd, at.x, at.y, at.z, dragonVel.x, dragonVel.y, dragonVel.z, 0.18, 8 * k, 26 * k, 0.4, 0.75, 1, 1, 0, 0);
  sfx.shieldHit();
}
/* Por fotograma, tras animar: aparece (crece), late, parpadea al final y se disipa. */
function updateShieldFx(dt) {
  const on = W.shieldT > 0;
  if (!on && W.shieldFade > 0) W.shieldFade = Math.max(0, W.shieldFade - dt);
  W.shieldHit = Math.max(0, W.shieldHit - dt * 2.5);
  shieldMesh.visible = (on || W.shieldFade > 0) && state !== 'menu' && state !== 'select';
  if (!shieldMesh.visible) return;
  const age = SHIELD_T - W.shieldT, U = shieldMesh.material.uniforms;
  let a = on ? smooth(0, 0.2, age) : W.shieldFade / 0.4;
  if (on && W.shieldT < SHIELD_BLINK && Math.sin((SHIELD_BLINK - W.shieldT) * Math.PI * 2 * 3) < -0.2) a *= 0.15;   // parpadea unas pocas veces
  U.uAlpha.value = a * (0.9 + 0.1 * Math.sin(gameTime * 9)); U.uTime.value = gameTime; U.uHit.value = W.shieldHit;
  shieldMesh.scale.setScalar(SHIELD_R * (on ? lerp(0.55, 1, smooth(0, 0.25, age)) : 1 + (0.4 - W.shieldFade) * 0.35));
}
function overheat() {
  W.overheat = OVERHEAT_T; W.heat = 1; W.flame = false; W.lock = 0; W.lockArmed = false;
  sfx.overheat(); toast('¡SOBRECALENTADO!  Sin armas ' + OVERHEAT_T + ' s');
}
/* Por fotograma, en partida (desde updateFlight): munición, calor, cargas y bloqueo. Disparos, efectos y daño de la llamarada y del rayo: updateAttacks. */
function updateWeapons(dt) {
  W.cool = Math.max(0, W.cool - dt); W.mslFlash = Math.max(0, W.mslFlash - dt);
  if (W.shieldT > 0) { W.shieldT = Math.max(0, W.shieldT - dt); if (W.shieldT <= 0) { W.shieldFade = 0.4; sfx.shieldOff(); } }
  // fuego rápido: tras GUN_REFILL_DELAY s sin disparar, la munición vuelve de uno en uno
  if (W.refill > 0) W.refill -= dt;
  else if (W.ammo < GUN_AMMO) { W.refillAcc += dt * GUN_REFILL_RATE; while (W.refillAcc >= 1 && W.ammo < GUN_AMMO) { W.ammo++; W.refillAcc--; } }
  // rayo: mientras dura, la barra se vacía; si no, se carga con el tiempo (y con el daño: ultGain)
  if (W.laser > 0) { W.laser = Math.max(0, W.laser - dt); W.ult = W.laser / LASER_T; if (W.laser <= 0) sfx.laserOff(); }
  else ultGain(dt / ULT_TIME);
  if (W.ult >= 1 && !W.ultFull) { W.ultFull = true; sfx.ultReady(); toast('Rayo de fuego listo  ·  clic izq. + dcho.'); }
  else if (W.ult < 1) W.ultFull = false;
  // sobrecalentamiento: sin armas; la barra de calor se vacía durante la espera
  if (W.overheat > 0) {
    W.overheat = Math.max(0, W.overheat - dt); W.heat = W.overheat / OVERHEAT_T;
    if (W.overheat <= 0) { sfx.beep(); toast('Armas listas'); }
  }
  // llamarada: calienta mientras dura; al soltar, el calor baja solo (tras una pausa corta)
  W.flame = W.rmb && weaponsReady();
  if (W.flame) { W.heat += dt / FLAME_HEAT; W.heatDelay = 0.35; if (W.heat >= 1) overheat(); }
  else if (W.overheat <= 0) { if (W.heatDelay > 0) W.heatDelay -= dt; else W.heat = Math.max(0, W.heat - dt / FLAME_COOL); }
  if (W.flame || W.laser > 0) F.fireFlash = 1;                                    // boca abierta y fogonazo mientras sale el aliento
  // bola guiada: con el clic mantenido más de MSL_HOLD s y la mira dentro del círculo, carga; pitidos cada vez más rápidos
  W.lockWhy = lockCircle(_Wl); W.lockIn = W.lockWhy === '' && _Wl.in;
  if (W.lmb) W.holdT += dt;
  if (W.lmb && W.lockArmed && W.holdT >= MSL_HOLD && W.msl > 0 && weaponsReady() && W.lockWhy === '') {
    if (W.lockIn) {
      W.lock += dt / MSL_LOCK;
      W.beepT -= dt; if (W.beepT <= 0) { W.beepT = lerp(0.3, 0.07, W.lock); sfx.lockTick(W.lock); }
      if (W.lock >= 1) { W.mslQ = enemyLock.e; W.lock = 0; W.lockArmed = false; }   // sale en updateAttacks, de la boca ya animada
    } else W.lock = Math.max(0, W.lock - dt * MSL_DECAY / MSL_LOCK);
  } else W.lock = 0;
}

/* Rayo (kamehameha): tres cintas que miran a la cámara —núcleo casi blanco, halo y aura— con vetas que corren hacia fuera y un ancho que late a lo
   largo del rayo; una bola de energía en la boca (crece durante la carga) y otra en la punta (más grande al chocar). N_BEAM puntos a lo largo. */
function beamTexture(sharp, base, amp, f1, f2) {        // perfil transversal exp(-sharp·u²) por vetas periódicas (se repite sin costuras a lo largo)
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'), img = g.createImageData(64, 256), d = img.data;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
    const u = (x + 0.5) / 32 - 1, v = y / 256 * 6.2832;
    const n = base + amp * (0.6 * Math.sin(f1 * v + u * 2.5) + 0.4 * Math.sin(f2 * v + 1.3 - u * 4));
    const a = clamp(Math.exp(-u * u * sharp) * n, 0, 1), i = (y * 64 + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = Math.round(255 * a); d[i + 3] = 255;                       // aditivo: la intensidad va en el color
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; return t;
}
const BEAM_D = [0, 5, 14, 30, 60, 120, 250, 520, 1100, 1e9], N_BEAM = BEAM_D.length;   // puntos de la cinta a lo largo del rayo (m); el último, el final
function makeBeam(opacity, tex) {
  const geo = new THREE.BufferGeometry(), idx = [];
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_BEAM * 6), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(N_BEAM * 4), 2).setUsage(THREE.DynamicDrawUsage));
  for (let i = 0; i < N_BEAM - 1; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.frustumCulled = false; m.visible = false; m.renderOrder = 7; scene.add(m);
  return m;
}
// capas: [malla, ancho abierto (m), fracción del ancho en la misma boca (se abre en los primeros 30 m), velocidad de las vetas, mezcla con blanco]
const BEAM_LAYERS = [
  [makeBeam(1, beamTexture(2.2, 0.9, 0.1, 3, 7)), 5, 0.35, 1.7, 0.85],
  [makeBeam(0.8, beamTexture(4.5, 0.65, 0.35, 3, 7)), 12, 0.3, 1, 0.3],
  [makeBeam(0.35, beamTexture(3, 0.5, 0.5, 2, 5)), 22, 0.25, 0.6, 0]
];
function beamBall(size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.visible = false; s.renderOrder = 8; s.userData.size = size; scene.add(s); return s;
}
const beamBalls = { mouthCore: beamBall(5, 1), mouthHalo: beamBall(13, 0.7), tipCore: beamBall(20, 1), tipHalo: beamBall(48, 0.6) }, beamBallList = Object.values(beamBalls);
function setBall(s, p, k, col, white) { s.position.copy(p); s.scale.setScalar(s.userData.size * k); s.material.color.copy(col).lerp(_white, white); s.visible = k > 0.01; }
const _bS = new THREE.Vector3(), _bE = new THREE.Vector3(), _bD = new THREE.Vector3(), _bM = new THREE.Vector3(), _bX = new THREE.Vector3(), _bU = new THREE.Vector3(), _bC = new THREE.Vector3(), _bF = new THREE.Vector3();
/* Cinta de _bS a lo largo de _bD durante L metros, mirando a la cámara (_bC): ancho w abierto (fracción w0 en la boca) × k, que late con ondas hacia fuera. */
function setBeam(m, L, w, w0, k, scroll, t) {
  const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
  for (let i = 0; i < N_BEAM; i++) {
    const d = Math.min(BEAM_D[i], L);
    const hw = w * lerp(w0, 1, smooth(0, 30, d)) * (1 + 0.12 * Math.sin(d * 0.045 - t * 26) + 0.06 * Math.sin(d * 0.13 + t * 17)) * k / 2;
    _bM.copy(_bS).addScaledVector(_bD, d);
    _bX.subVectors(_bC, _bM).cross(_bD); if (_bX.lengthSq() < 1e-8) _bX.set(1, 0, 0);
    _bX.normalize().multiplyScalar(hw);
    p.setXYZ(2 * i, _bM.x - _bX.x, _bM.y - _bX.y, _bM.z - _bX.z); p.setXYZ(2 * i + 1, _bM.x + _bX.x, _bM.y + _bX.y, _bM.z + _bX.z);
    const v = d / 70 - scroll; uv.setXY(2 * i, 0, v); uv.setXY(2 * i + 1, 1, v);
  }
  p.needsUpdate = true; uv.needsUpdate = true; m.visible = true;
}
function beamRay(o, d, maxT) {                         // distancia al primer obstáculo del rayo (terreno, agua o isla), o maxT
  const limit = Math.min(maxT, islandRayHit(o, d, maxT));
  let t = 15, last = 0;
  while (t < limit) {
    _bU.copy(o).addScaledVector(d, t);
    if (_bU.y < Math.max(heightAt(_bU.x, _bU.z), WL)) {
      let a = last, b = t;
      for (let i = 0; i < 6; i++) { const m = (a + b) / 2; _bU.copy(o).addScaledVector(d, m); if (_bU.y < Math.max(heightAt(_bU.x, _bU.z), WL)) b = m; else a = m; }
      return b;
    }
    last = t; t += Math.max(12, t * 0.05);
  }
  return limit;
}
function perpBasis() {                                 // _bX y _bU perpendiculares a _bD
  _bX.set(0, 1, 0).cross(_bD); if (_bX.lengthSq() < 1e-4) _bX.set(1, 0, 0); _bX.normalize(); _bU.crossVectors(_bD, _bX);
}
/* Después de animar al dragón (desde updateWorld): los disparos pendientes, la llamarada y el rayo salen del socket de la boca ya colocado.
   También el vapor del sobrecalentamiento. */
function updateAttacks(dt) {
  updateShieldFx(dt);
  const on = state === 'playing', fl = on && W.flame, la = on && W.laser > 0;
  if (fl || la || W.snd) { sfx.breath(fl ? 1 : 0, la ? 1 : 0); W.snd = fl || la; }
  if (!la) { for (const L of BEAM_LAYERS) L[0].visible = false; for (const b of beamBallList) b.visible = false; }
  if (!on) { W.shotQ = false; W.mslQ = null; return; }
  if (W.shotQ) { W.shotQ = false; fireGun(); }
  if (W.mslQ) { const e = W.mslQ; W.mslQ = null; if (!e.dead && W.msl > 0) launchMissile(e); }
  if (!fl && !la) {
    if (W.overheat > 0 && Math.random() < 0.45) {      // vapor por la boca mientras se enfría
      heroMouth(_bS);
      emit(fxSmoke, _bS.x, _bS.y, _bS.z, dragonVel.x * 0.9 + rnd(-2, 2), dragonVel.y * 0.9 + rnd(2, 6), dragonVel.z * 0.9 + rnd(-2, 2), rnd(0.5, 0.8), 0.8, rnd(4, 7), 0.8, 0.8, 0.82, 0.3, 0.6, -3);
    }
    return;
  }
  heroMouth(_bS); camera.getWorldPosition(_bC);
  if (fl) flameFx(dt); else laserFx(dt);
}
function flameFx(dt) {
  _bE.copy(_bC).addScaledVector(F.aimWorld, FLAME_RANGE);                    // hacia la mira, a la distancia del alcance
  _bD.subVectors(_bE, _bS).normalize(); perpBasis();
  // llamas: viajan con el dragón (heredan su velocidad) y salen a FLAME_SPEED, así que el chorro mide FLAME_RANGE y se curva al girar
  const c = ATTACK, n = Math.round(800 * dt + Math.random());
  for (let i = 0; i < n; i++) {
    const sp = FLAME_SPEED * rnd(0.9, 1.1), a = Math.random() * 6.283, s = rnd(0, 0.11), cx = Math.cos(a) * s, cy = Math.sin(a) * s, o = rnd(0, dt);
    const vx = (_bD.x + _bX.x * cx + _bU.x * cy) * sp, vy = (_bD.y + _bX.y * cx + _bU.y * cy) * sp, vz = (_bD.z + _bX.z * cx + _bU.z * cy) * sp;
    const hot = Math.random() < 0.3, life = FLAME_RANGE / sp * rnd(0.7, 1.05);
    emit(fxAdd, _bS.x + vx * o, _bS.y + vy * o, _bS.z + vz * o, vx + dragonVel.x, vy + dragonVel.y, vz + dragonVel.z,
      hot ? life * 0.4 : life, hot ? 0.8 : rnd(1, 1.8), hot ? 5 : rnd(15, 24),
      hot ? lerp(c.r, 1, 0.6) : c.r, hot ? lerp(c.g, 1, 0.6) : c.g * rnd(0.75, 1.15), hot ? lerp(c.b, 1, 0.6) : c.b, hot ? 0.6 : 0.38, 0, -8);   // sin saturar a blanco encima de la mira
  }
  // daño: cono de FLAME_RANGE m que se abre un 11 % de la distancia
  const amt = FLAME_DPS * dt;
  for (const e of enemies) {
    if (e.dead) continue;
    _bM.subVectors(e.pos, _bS); const along = _bM.dot(_bD);
    if (along < -ENEMY_HIT_R || along > FLAME_RANGE + ENEMY_HIT_R) continue;
    const r = ENEMY_HIT_R + 2 + clamp(along, 0, FLAME_RANGE) * 0.11;
    if (_bM.lengthSq() - along * along < r * r) damageEnemy(e, amt, _bM.copy(_bS).addScaledVector(_bD, clamp(along, 0, FLAME_RANGE)), true);
  }
  _bF.copy(_bS).addScaledVector(_bD, FLAME_RANGE);
  for (const t of towers.values()) if (!t.dead && towerSegDist2(t, _bS, _bF) < (TOWER_R + 12) ** 2) damageTower(t, amt, true, _sdc);   // _sdc: punto de la llamarada más cercano a la torre
  for (const a of airships) if (!a.dead && airshipSegDist2(a, _bS, _bF) < (a.r + 12) ** 2) damageAirship(a, amt, true, _sdc);       // v21: dirigibles
  fbLight.position.copy(_bS).addScaledVector(_bD, 40); fbLight.intensity = 4.5; fbLight.color.copy(ATTACK);
}
/* Llamarada corta sin sonido ni temblor (impacto del rayo contra el terreno). */
function burstFx(x, y, z, c) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * 6.283, u = rnd(-0.3, 1), s = Math.sqrt(1 - u * u), sp = rnd(15, 60);
    emit(fxAdd, x, y, z, Math.cos(a) * s * sp, u * sp, Math.sin(a) * s * sp, rnd(0.3, 0.7), rnd(6, 10), rnd(16, 28), c.r, c.g * rnd(0.8, 1.1), c.b, 0.8, 1.6, -3);
  }
  emit(fxSmoke, x + rnd(-4, 4), y + 3, z + rnd(-4, 4), rnd(-4, 4), rnd(8, 16), rnd(-4, 4), rnd(1.8, 3), 8, 28, 0.16, 0.14, 0.13, 0.5, 0.6, -1);
}
function laserFx(dt) {
  const age = LASER_T - W.laser, c = ATTACK, t = gameTime;
  const near = lerp(0.25, 1, dragonAnim.cam);                                  // en 1ª persona la boca está a pocos metros: bola más pequeña
  const k = Math.min(1, W.laser / 0.5), pulse = 1 + 0.15 * Math.sin(t * 31) + 0.08 * Math.sin(t * 13);   // se cierra en el último medio segundo; late
  const charge = Math.min(1, age / LASER_CHARGE);
  // 1. bola de energía en la boca: crece durante la carga
  setBall(beamBalls.mouthCore, _bS, (0.35 + 0.65 * charge) * pulse * near * k, c, 0.85);
  setBall(beamBalls.mouthHalo, _bS, (0.35 + 0.65 * charge) * pulse * near * k, c, 0.2);
  fbLight.position.copy(_bS); fbLight.intensity = 3 + 5 * charge; fbLight.color.copy(c);
  _bD.subVectors(_bC.clone().addScaledVector(F.aimWorld, 1000), _bS).normalize(); perpBasis();
  if (age < LASER_CHARGE) {                                                     // carga: chispas que convergen hacia la boca
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * 6.283, b = rnd(-1, 1), s = Math.sqrt(1 - b * b), r = rnd(6, 14);
      const dx = (_bX.x * Math.cos(a) + _bU.x * Math.sin(a)) * s + _bD.x * b, dy = (_bX.y * Math.cos(a) + _bU.y * Math.sin(a)) * s + _bD.y * b, dz = (_bX.z * Math.cos(a) + _bU.z * Math.sin(a)) * s + _bD.z * b;
      emit(fxAdd, _bS.x + dx * r, _bS.y + dy * r, _bS.z + dz * r, -dx * r * 4 + dragonVel.x, -dy * r * 4 + dragonVel.y, -dz * r * 4 + dragonVel.z, 0.22, 1.6, 0.4, lerp(c.r, 1, 0.6), lerp(c.g, 1, 0.6), lerp(c.b, 1, 0.6), 1, 0, 0);
    }
    camShake = Math.max(camShake, 0.15 * charge);
    return;
  }
  // 2. el rayo sale disparado (LASER_SHOOT m/s) hacia la mira hasta el primer obstáculo, como mucho LASER_RANGE
  const tHit = beamRay(_bC, F.aimWorld, LASER_RANGE + 20);
  _bE.copy(_bC).addScaledVector(F.aimWorld, tHit);
  _bD.subVectors(_bE, _bS); const full = Math.min(_bD.length(), LASER_RANGE); _bD.normalize(); perpBasis();
  const L = Math.min(full, (age - LASER_CHARGE) * LASER_SHOOT), blocked = tHit < LASER_RANGE && L >= full - 1;
  _bE.copy(_bS).addScaledVector(_bD, L);
  const open = Math.min(1, (age - LASER_CHARGE) / 0.15) * k;
  for (const [m, w, w0, sv, wh] of BEAM_LAYERS) { m.material.color.copy(c).lerp(_white, wh); setBeam(m, L, w, w0, open, (t * 5 * sv) % 1, t); }
  // 3. bola en la punta (más grande al chocar)
  setBall(beamBalls.tipCore, _bE, (blocked ? 1.25 : 0.8) * pulse * open, c, 0.8);
  setBall(beamBalls.tipHalo, _bE, (blocked ? 1.25 : 0.8) * pulse * open, c, 0.1);
  // 4. daño a todo lo que cruza
  const amt = LASER_DPS * dt;
  for (const e of enemies) if (!e.dead && segHitsSphere(_bS, _bE, e.pos, ENEMY_HIT_R + LASER_R)) damageEnemy(e, amt, _fc, true);   // _fc: punto del rayo más cercano
  for (const tw of towers.values()) if (!tw.dead && towerSegDist2(tw, _bS, _bE) < (TOWER_R + LASER_R) ** 2) damageTower(tw, amt, true, _sdc);
  for (const a of airships) if (!a.dead && airshipSegDist2(a, _bS, _bE) < (a.r + LASER_R) ** 2) damageAirship(a, amt, true, _sdc);
  // 5. impacto: llamaradas y humo donde choca
  if (blocked) { W.burstT = (W.burstT || 0) - dt; if (W.burstT <= 0) { W.burstT = 0.09; burstFx(_bE.x, _bE.y + 2, _bE.z, c); } }
  // 6. espiral de energía alrededor del primer tramo (dos hebras que giran) y destello en la boca
  perpBasis();                                                                   // (setBeam usó _bX)
  for (let i = 0; i < 14; i++) {
    const d = rnd(3, Math.min(L, 600)), th = d * 0.07 - t * 14 + (i % 2) * Math.PI, r = 3 + 4 * smooth(0, 40, d), ca = Math.cos(th) * r, sa = Math.sin(th) * r;
    emit(fxAdd, _bS.x + _bD.x * d + _bX.x * ca + _bU.x * sa, _bS.y + _bD.y * d + _bX.y * ca + _bU.y * sa, _bS.z + _bD.z * d + _bX.z * ca + _bU.z * sa,
      dragonVel.x, dragonVel.y, dragonVel.z, rnd(0.12, 0.25), rnd(2, 3.5), 0.5, lerp(c.r, 1, 0.6), lerp(c.g, 1, 0.6), lerp(c.b, 1, 0.6), 0.9, 0, 0);
  }
  fbLight.position.copy(_bS).addScaledVector(_bD, 30); fbLight.intensity = 8;
  camShake = Math.max(camShake, 0.3);
}

/* ---------- Puntería: marcador de ratón ---------- */
const _qa = new THREE.Quaternion();
/* Mirar alrededor (Z mantenida): el ratón mueve la mirada y no la mira. En 1ª persona gira la cabeza del jinete (hasta LOOK_FP_YAW a cada
   lado); en 3ª, la cámara orbita 360° alrededor del dragón. Al soltar, vuelve sola al frente (por el camino corto). La aplica animateHero. */
const LOOK_FP_YAW = 170 * Math.PI / 180, LOOK_FP_PITCH = [-1.1, 1.0], LOOK_TP_PITCH = [-0.9, 1.1], LOOK_RETURN = 5;
function updateLook(dt) {
  F.lookHeld = !!keys.KeyZ && state === 'playing';
  if (F.lookHeld) {
    const k = 0.0021 * F.sens;
    F.lookYaw -= F.pdx * k; F.lookPit -= F.pdy * k; F.pdx = F.pdy = 0;
  } else {
    F.lookYaw = Math.atan2(Math.sin(F.lookYaw), Math.cos(F.lookYaw));
    const r = Math.exp(-dt * LOOK_RETURN); F.lookYaw *= r; F.lookPit *= r;
  }
  if (F.third) F.lookPit = clamp(F.lookPit, LOOK_TP_PITCH[0], LOOK_TP_PITCH[1]);
  else { F.lookYaw = clamp(F.lookYaw, -LOOK_FP_YAW, LOOK_FP_YAW); F.lookPit = clamp(F.lookPit, LOOK_FP_PITCH[0], LOOK_FP_PITCH[1]); }
}
function updateAim(dt, auto) {
  const q = dragon.quaternion;
  if (!auto) updateLook(dt);
  if (auto) {
    // piloto automático del menú: rumbo suave y altura segura sobre el terreno
    _f.set(0, 0, -1).applyQuaternion(q); const h = Math.hypot(_f.x, _f.z) || 1;
    const hx = _f.x / h, hz = _f.z / h, p = dragon.position;
    let g = 0; for (const d of [150, 450, 900, 1500]) g = Math.max(g, heightAt(p.x + hx * d, p.z + hz * d));
    let wantY = Math.max(g + 190, Math.max(heightAt(p.x, p.z), WL) + 160);
    for (const d of [0, 150, 400, 800, 1300]) {
      const isl = islandColumn(p.x + hx * d, p.z + hz * d, Math.min(p.y, wantY) - 40, Math.max(p.y, wantY) + 40, 60);
      if (isl) { wantY = Math.max(wantY, isl.yMax + 150); break; }
    }
    const pit = clamp(Math.atan2(wantY - p.y, 600), -0.35, 0.6);
    const wob = Math.sin(gameTime * 0.15) * 0.22, cy = Math.cos(wob), sy = Math.sin(wob);
    F.aimWorld.set((hx * cy - hz * sy) * Math.cos(pit), Math.sin(pit), (hx * sy + hz * cy) * Math.cos(pit));
  } else if (F.locked) {
    _iq.copy(q).invert();
    _l.copy(F.aimWorld).applyQuaternion(_iq);
    let yaw = Math.atan2(_l.x, -_l.z), pit = Math.asin(clamp(_l.y, -1, 1));
    const k = 0.0021 * F.sens;
    yaw += F.pdx * k; pit -= F.pdy * k; F.pdx = F.pdy = 0;
    // en hover el cuerpo no cabecea: el marcador sí puede subir/bajar (cabeza y bolas de fuego lo siguen) dentro de un rango
    yaw = clamp(yaw, -1.0, 1.0); pit = F.hover ? clamp(pit, -0.85, 0.55) : clamp(pit, -0.78, 0.78);
    _l.set(Math.sin(yaw) * Math.cos(pit), Math.sin(pit), -Math.cos(yaw) * Math.cos(pit));
    F.aimWorld.copy(_l).applyQuaternion(q);
  } else if (!F.lookHeld) {                                // (sin puntero bloqueado y mirando alrededor, la mira se queda donde estaba)
    const t = Math.tan(camera.fov * Math.PI / 360);
    _l.set(F.ndcX * t * camera.aspect, F.ndcY * t, -1).normalize().applyQuaternion(camera.quaternion).applyQuaternion(q);
    F.aimWorld.copy(_l);
  }
  _iq.copy(q).invert();
  F.aimLocal.copy(F.aimWorld).applyQuaternion(_iq).normalize();
}

/* ---------- Vuelo ---------- */
function updateFlight(dt, auto) {
  const q = dragon.quaternion, pos = dragon.position;
  const hov = !auto && F.hover;
  F.hoverK += ((hov ? 1 : 0) - F.hoverK) * (1 - Math.exp(-dt * 3));
  // acelerador (en hover W/S no hacen nada)
  const thr = (auto || hov) ? 0 : ((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0));
  F.throttle = clamp(F.throttle + thr * 0.5 * dt, 0, 1);
  if (auto) F.throttle += (0.55 - F.throttle) * dt;
  // hover: W sube y S baja (suave); se frena ante el suelo, el agua o la roca de una isla
  if (hov) {
    let vt = ((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0)) * HOVER_VSPEED;
    F.hvy += (vt - F.hvy) * (1 - Math.exp(-dt * 3.5));
    const gnd = Math.max(heightAt(pos.x, pos.z), WL);
    if (F.hvy < 0 && (pos.y - gnd < 6 || islandAt(pos.x, pos.y - 8, pos.z, 0))) F.hvy = 0;
    if (F.hvy > 0 && islandAt(pos.x, pos.y + 9, pos.z, 0)) F.hvy = 0;
  } else F.hvy = 0;
  // boost: la barra se gasta mientras se mantiene Shift; 2 s después de soltarlo empieza a recargarse
  const shift = !auto && !hov && (keys.ShiftLeft || keys.ShiftRight);
  let boosting = false;
  if (shift) {
    F.boostDelay = BOOST_DELAY;
    if (!F.boostExhausted && F.boost > 0) {
      boosting = true;
      F.boost = Math.max(0, F.boost - BOOST_DRAIN * dt);
      if (F.boost <= 0) { F.boostExhausted = true; sfx.empty(); }
    }
  } else {
    F.boostDelay = Math.max(0, F.boostDelay - dt);
    if (F.boostDelay <= 0) F.boost = Math.min(1, F.boost + BOOST_REFILL * dt);
  }
  if (F.boostExhausted && F.boost >= 0.2) F.boostExhausted = false;   // tras vaciarse hace falta un mínimo de carga
  if (boosting && !F.boosting) { sfx.boost(); F.boostKick = 1; }
  F.boosting = boosting;
  F.boostFx += ((boosting ? 1 : 0) - F.boostFx) * (1 - Math.exp(-dt * (boosting ? 3.2 : 1.8)));
  F.boostKick *= Math.exp(-dt * 3.5);                    // golpe: sube rápido (kickFx) y se apaga en ~0,6 s
  F.kickFx += (F.boostKick - F.kickFx) * (1 - Math.exp(-dt * 14));
  _f.set(0, 0, -1).applyQuaternion(q);
  let lack = 0;
  if (hov) {
    // hover: frenada total y sin hundimiento (el aleteo sostiene al dragón)
    F.speed = Math.max(0, F.speed - F.speed * (1 - Math.exp(-dt * HOVER_BRAKE)) - 6 * dt);
    if (F.speed < 0.4) F.speed = 0;
    F.sink += (0 - F.sink) * (1 - Math.exp(-dt * 3));
    if (F.sink < 0.05) F.sink = 0;
  } else {
    // velocidad: empuje (+boost) - resistencia + pendiente (subir frena, bajar acelera; en picado, con las alas
    // plegadas, la resistencia baja y se gana mucha velocidad, por encima de la de crucero)
    const dive = smooth(0.2, 0.8, -_f.y);
    // (v17) la velocidad de cada dragón (heroStats().speed, ×): con la resistencia entre su cuadrado, todas sus velocidades de equilibrio
    // (crucero y boost) y su tope se multiplican por ella
    const spd = heroStats().speed;
    const thrust = THRUST[0] + THRUST[1] * F.throttle + BOOST_THRUST * F.boostFx, drag = DRAG / (spd * spd) * (1 - DIVE_DRAG * dive) * F.speed * F.speed;
    F.speed = clamp(F.speed + (thrust - drag - GRAVITY * _f.y) * dt, 18, VMAX * spd);
    // planeo: por debajo de la velocidad mínima pierde sustentación y se hunde, sin llegar a entrar en barrena
    lack = clamp((VMIN - F.speed) / VMIN, 0, 1);
    F.sink += ((lack * 34 + 2.5) - F.sink) * (1 - Math.exp(-dt * 1.5));
  }
  // giros hacia el marcador (el marcador fijo en el mundo, el dragón gira hacia él).
  // Con boost la autoridad de giro del ratón cae a BOOST_STEER: se puede, pero muy poco.
  const sn = clamp((F.speed - VMIN) / (VCRUISE_MAX - VMIN), 0, 1);
  const maxRate = lerp(1.75, 0.95, sn), steer = lerp(1, BOOST_STEER, F.boostFx);
  F.steer.lerp(F.aimLocal, 1 - Math.exp(-dt * STEER_LAG)).normalize();   // v13: el dragón persigue la mira con un poco de retraso
  const a = F.steer;
  const yawErr = Math.atan2(a.x, -a.z), pitErr = Math.atan2(a.y, Math.hypot(a.x, a.z));
  const tYaw = -clamp(yawErr * STEER_GAIN * steer, -maxRate * steer, maxRate * steer);
  let tPit = clamp(pitErr * STEER_GAIN * steer, -maxRate * steer, maxRate * steer) - lack * 0.9;
  _r.set(1, 0, 0).applyQuaternion(q); _u.set(0, 1, 0).applyQuaternion(q);
  const rollAng = Math.atan2(_r.y, _u.y) - F.bank;       // alabeo del jugador (sin el banking automático)
  let tRoll;
  if (hov) {
    // hover: siempre sobre el plano del horizonte; Q/E no hacen nada. Un pequeño cabeceo hacia arriba mientras frena.
    const pAng = Math.asin(clamp(_f.y, -1, 1)), flare = 0.30 * smooth(4, 55, F.speed);
    tPit = clamp((flare - pAng) * 3.0, -1.6, 1.6) * (_u.y > -0.05 ? 1 : -1);
    tRoll = -clamp(rollAng * 3.0, -1.8, 1.8) * (1 - smooth(0.9, 0.99, Math.abs(_f.y)));
  } else {
    tRoll = ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * 1.9;
    if (auto) tRoll = 0;
    if (keys.KeyR || auto) tRoll += -clamp(rollAng * 2.4, -1.5, 1.5);
  }
  const k = 1 - Math.exp(-dt * lerp(RATE_RESP[0], RATE_RESP[1], F.boostFx));
  F.rate.y += (tYaw - F.rate.y) * k; F.rate.p += (tPit - F.rate.p) * k; F.rate.r += (tRoll - F.rate.r) * k;
  // banking: al virar hacia el marcador el dragón se inclina hacia ese lado (suave, se suma al alabeo de Q/E)
  const bankTarget = clamp(F.rate.y * BANK_GAIN, -BANK_MAX, BANK_MAX) * (1 - F.hoverK);
  const prevBank = F.bank;
  F.bank += (bankTarget - F.bank) * (1 - Math.exp(-dt * 3.2));
  const bankRate = (F.bank - prevBank) / Math.max(dt, 1e-4);
  _ax.set(F.rate.p, F.rate.y, F.rate.r + bankRate);
  const ang = _ax.length() * dt;
  if (ang > 1e-6) { _dq.setFromAxisAngle(_ax.normalize(), ang); q.multiply(_dq).normalize(); }
  // movimiento
  _f.set(0, 0, -1).applyQuaternion(q);
  dragonVel.copy(_f).multiplyScalar(F.speed); dragonVel.y -= F.sink; dragonVel.y += F.hvy;
  pos.addScaledVector(dragonVel, dt);
  // colisión con el terreno o el agua
  const g = Math.max(heightAt(pos.x, pos.z), WL);
  if (!auto && pos.y < g + 2.2) {
    if (heightAt(pos.x, pos.z) < WL) { splash(pos.x, pos.z, 2.0); crash('Te sumergiste en el agua'); } else crash('Te estrellaste contra el terreno');
  } else if (auto && pos.y < g + 60) pos.y = g + 60;
  if (!auto && state === 'playing' && islandAt(pos.x, pos.y, pos.z, 2.6)) crash('Te estrellaste contra una isla flotante');
  if (!auto && state === 'playing') for (const t of towers.values()) {   // torres en pie (desde la v7 miden ~110 m: ya no se pueden atravesar)
    if (t.dead) continue;
    const dx = pos.x - t.x, dz = pos.z - t.z;
    if (dx * dx + dz * dz < (TOWER_R + 3) ** 2 && pos.y > t.y - 2 && pos.y < t.y + TOWER_TOP + 6) { crash('Te estrellaste contra una torre'); break; }
  }
  if (!auto && state === 'playing') for (const a of airships) {   // v21: dirigibles (el casco; un poco menos que la cápsula de los impactos)
    if (!a.dead && airshipPointDist2(a, pos) < (a.r * 0.8) ** 2) { crash('Te estrellaste contra un dirigible'); break; }
  }
  // rozar el agua levanta espuma
  if (pos.y - WL < 14 && pos.y - WL > 0 && heightAt(pos.x, pos.z) < WL - 1) {
    for (let i = 0; i < 2; i++) emit(fxSmoke, pos.x + rnd(-4, 4), WL + 0.3, pos.z + rnd(-4, 4), -dragonVel.x * 0.15 + rnd(-4, 4), rnd(3, 9), -dragonVel.z * 0.15 + rnd(-4, 4), rnd(0.7, 1.3), 2, 6, 0.85, 0.92, 0.95, 0.4, 1, 12);
  }
  // aleteo: más potente con el acelerador, planeo en picado
  const dive = smooth(0.1, 0.55, -_f.y), climb = smooth(0.15, 0.5, _f.y);
  F.flapTarget = hov ? 1 : clamp((0.25 + F.throttle * 0.75 + climb * 0.25) * (1 - 0.85 * dive) + 0.4 * F.boostFx, 0.04, 1);
  // hover cerca del suelo o del agua: las alas levantan polvo / espuma
  if (F.hoverK > 0.5 && pos.y - g < 55) {
    const st = 1 - (pos.y - g) / 55, water = heightAt(pos.x, pos.z) < WL;
    for (let i = 0; i < 2; i++) if (Math.random() < st + 0.2) {
      const an = Math.random() * 6.283, sp = rnd(8, 22) * (0.5 + st);
      emit(fxSmoke, pos.x + Math.cos(an) * rnd(1, 6), g + 0.6, pos.z + Math.sin(an) * rnd(1, 6), Math.cos(an) * sp, rnd(1, 5), Math.sin(an) * sp, rnd(1.0, 1.8), 2.5, rnd(9, 15), water ? 0.85 : 0.52, water ? 0.92 : 0.46, water ? 0.95 : 0.38, 0.32 * (0.4 + st), 1.6, 0);
    }
  }
  F.fireFlash = Math.max(0, F.fireFlash - dt * 3.2);
  if (!auto && state === 'playing') { updateWeapons(dt); stats.time += dt; stats.dist += F.speed * dt; stats.vmax = Math.max(stats.vmax, F.speed); missionUpdate(dt); }   // v15: objetivos, eventos, área y final
  const hpMax = heroStats().hp;
  if (F.health < hpMax && gameTime - F.lastHit > 7) F.health = Math.min(hpMax, F.health + 3 * dt);
}
