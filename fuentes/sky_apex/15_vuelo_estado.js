/* ============================================================
   7. ENTRADA, MODELO DE VUELO Y ESTADO DE JUEGO
   Controles: W/S aceleración · ratón = dirección (marcador al estilo War Thunder, con banking)
   · Q/E alabeo · A/D esquiva (v32) · Shift boost · Ctrl izq. hover · X nivelar · C cámara · M sonido.
   v26: Espacio mantenido = vuelo recto (la mira sigue libre y el cuello la sigue) · F mantenida = cámara hacia el blanco fijado · R escudo.
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
  speed: 70, throttle: 0.5, rate: { p: 0, y: 0, r: 0 }, health: 100, armor: 50, lastHit: -99, fireFlash: 0,   // (v24: armadura)
  aimWorld: new THREE.Vector3(0, 0, -1), aimLocal: new THREE.Vector3(0, 0, -1),
  flapTarget: 0.6, third: false, sens: 1, locked: false, lockRequested: false, ndcX: 0, ndcY: 0, pdx: 0, pdy: 0,
  sink: 0, deadT: 0, lookYaw: 0, lookPit: 0, lookHeld: false,   // mirar alrededor con la Z (rad)
  bank: 0,                                              // alabeo automático (rad, mismo signo que el roll: + = ala derecha arriba)
  boost: 1, boostDelay: 0, boostExhausted: false, boosting: false, boostFx: 0, boostKick: 0, kickFx: 0,   // kick: golpe al activar el boost
  hover: false, hoverK: 0, hvy: 0,                       // hvy: velocidad vertical en hover (W/S)
  steer: new THREE.Vector3(0, 0, -1), prevSpeed: 0, accS: 0,  // v13: dirección que sigue el dragón (la mira con un poco de retraso) y aceleración suavizada (sonido, cámara)
  straight: false, straightT: 0, holdDir: new THREE.Vector3(0, 0, -1),   // v26: vuelo recto (Espacio: s mantenido y dirección fijada)
  aimPt: new THREE.Vector3(0, 0, -1400),                                 // v27: punto de la mira en el mundo (lo que toca el rayo de la mira desde la cámara; updateAttacks)
  tgtCam: false, tgtBack: false, lookVY: 0, lookVP: 0,                 // v26: cámara al objetivo (F; tgtBack: su muelle, también al volver) y velocidad del giro (rad/s)
  effort: 0, diveT: 0, spreadT: 0,                                      // v32: esfuerzo con W (aleteo más rápido), s en picado y s que quedan con las alas desplegadas al remontar
  roll: 0, dodgeCam: new THREE.Vector3()                                // v32: tonel de la esquiva (rad) y lo que la cámara de 3ª persona se queda atrás (m, en el mundo)
};
/* v24: las velocidades, el boost y el giro son stats del dragón elegido (Excel, 7c: applyHeroStats); estos valores son los de la Base. */
const VMIN = 33;
let VMAX = 1000 / 3.6, VCRUISE_MAX = 600 / 3.6;               // m/s: tope absoluto (la velocidad con boost); máxima nivelado sin boost
// Empuje y resistencia calibrados con esas velocidades: a todo gas y nivelado, empuje = resistencia justo a VCRUISE_MAX.
// El boost (v24) añade BOOST_ACCEL y anula la resistencia: de VCRUISE_MAX a VMAX en boost_aceleracion s, en línea recta
const THRUST = [3, 27];
let DRAG = (THRUST[0] + THRUST[1]) / (VCRUISE_MAX * VCRUISE_MAX);
const GRAVITY = 30;                                     // aceleración por la pendiente (m/s² en vertical): subir frena y bajar acelera, más que la gravedad real
const DIVE_DRAG = 0.4;                                  // en picado el dragón pliega las alas: la resistencia baja hasta este tanto (por eso se gana tanta velocidad)
let BANK_GAIN = 0.40, BANK_MAX = 0.80;                  // (v27: let, para el panel de pruebas) alabeo ≈ 0,40 rad por rad/s de guiñada (máx. ~46°; v12: 0,30 y 29°). El cuerpo se inclina aún más (BODY_ROLL)
/* v13: peso. La mira responde al momento, pero el dragón la sigue con un poco de retraso (STEER_LAG: la dirección que persigue alcanza a la
   mira en ~0,1 s) y con más inercia en las tasas de giro (RATE_RESP, antes 7,5 y 4,5). STEER_GAIN: giro pedido por radián de error
   (antes 2,6). Simulado: a un salto de la mira de 20°, llega a la mitad en 0,47 s (antes 0,34) y se pasa un 6 % antes de asentarse. */
let STEER_LAG = 12, STEER_GAIN = 2.2; const RATE_RESP = [6, 4];   // (v27: let, para el panel de pruebas)
let BOOST_DRAIN = 0.1, BOOST_REFILL = 0.02, BOOST_DELAY = 2;   // barra por segundo: gasto (1 / duración) y recarga; espera antes de recargar (s)
const BOOST_STEER = 0.2;                                // autoridad de giro con boost
const BOOST_FOV = 18, BOOST_KICK_FOV = 5;               // apertura del campo de visión con boost y golpe extra al activarlo (grados)
const SPEED_FOV = 8;                                    // y algo más según la velocidad por encima de la de crucero (picados y boost)
const BOOST_SHAKE = [0.0035, 0.009];                    // temblor de cámara (rad): continuo con boost y del golpe al activarlo
const SPEED_SHAKE = 0.0022;                             // v13: temblor por encima de la velocidad de crucero (picados), hasta este tope a VMAX
const HOVER_BRAKE = 2.6, HOVER_EXIT_SPEED = 28, HOVER_VSPEED = 26;
const STRAIGHT_SETTLE = 0.3;                            // v26, vuelo recto: s que tarda en frenar el giro que traía antes de fijar la trayectoria
let PULLUP_SPREAD = 2; const PULLUP_MIN = 0.4;          // v32: tras un picado de al menos PULLUP_MIN s, al remontar, s con las alas desplegadas del todo antes de volver a batir
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _l = new THREE.Vector3(), _ax = new THREE.Vector3(), _dq = new THREE.Quaternion(), _iq = new THREE.Quaternion(), _sc = new THREE.Vector3();

/* ---------- Entrada ---------- */
const hudEl = document.getElementById('hud');
window.addEventListener('keydown', e => {
  if (DEV.open && e.target && e.target.closest && e.target.closest('#dev')) return;   // v27: escribiendo en el panel de pruebas
  const inGame = state === 'playing' || state === 'paused';
  if (e.code === 'Space' && inGame) e.preventDefault();   // evita el scroll / activar botones
  if (e.ctrlKey && inGame && e.code !== 'ControlLeft') e.preventDefault();   // v26: Ctrl es el hover; que Ctrl + tecla no dispare atajos del navegador (Ctrl+W no se puede parar: ver beforeunload)
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'ControlLeft') { if (state === 'playing' && !cine.on) toggleHover(); }   // v26: el hover pasa de Espacio a Ctrl izquierdo
  else if (e.code === 'KeyA' || e.code === 'KeyD') startDodge(e.code === 'KeyD' ? 1 : -1);   // v32: esquiva
  else if (e.code === 'KeyC') F.third = !F.third;
  else if (e.code === 'KeyR') { if (!cine.on) activateShield(); }   // v26: el escudo pasa de F a R (F = cámara al objetivo; nivelar, a la X)
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
/* v26: con Ctrl como tecla de juego, Ctrl+W (o Ctrl+Mayús+W) cerraría la pestaña en plena partida, y el navegador no deja anularlo: en partida
   pide confirmación antes de salir de la página. Ctrl + rueda tampoco amplía la página. */
window.addEventListener('beforeunload', e => { if (state === 'playing' || state === 'paused') { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('wheel', e => { if (e.ctrlKey && (state === 'playing' || state === 'paused')) e.preventDefault(); }, { passive: false });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; W.lmb = W.rmb = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') setPaused(true); });
window.addEventListener('mousemove', e => {
  if (F.locked || F.lookHeld) { F.pdx += e.movementX || 0; F.pdy += e.movementY || 0; }   // con la Z, también sin puntero bloqueado
  else { F.ndcX = (e.clientX / window.innerWidth) * 2 - 1; F.ndcY = -((e.clientY / window.innerHeight) * 2 - 1); }
});
/* Ratón en partida: izquierdo = fuego rápido / bola guiada, derecho = llamarada, los dos casi a la vez = rayo, central = fijar objetivo. */
canvasGL.addEventListener('mousedown', e => {
  if (state !== 'playing' || cine.on) return;              // (v26: en la entrada de cine, sin armas)
  if (DEV.open) { devPanel(false); return; }               // v27: con el panel de pruebas abierto, un clic en el juego lo cierra
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
  units: [],                                               // v29: unidades nuevas de la receta (6f)
  world: null };                                           // v19: semilla, bioma y punto de partida de la misión (missionSetup)
const vicEl = document.getElementById('victory'), byeEl = document.getElementById('bye');
const fmtClock = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function showResult(win, why) {
  state = win ? 'victory' : 'failed'; W.lmb = W.rmb = false; sfx.breath(0, 0); sfx.quiet(); cineEnd(true); devPanel(false);
  deadEl.hidden = pauseEl.hidden = true; toastEl.classList.remove('on');
  if (document.pointerLockElement) { F.lockRequested = false; document.exitPointerLock(); }
  music.game.stop(2); music.menu.play(2.5);
  const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '—';
  const rows = [
    ['Tiempo', fmtClock(stats.time)], ['Puntos', towerState.score],
    RUN.towers.total ? ['Torres destruidas', towerState.kills + ' / ' + RUN.towers.total] : null,
    dragonsTotal() ? ['Dragones derribados', enemyState.kills + ' / ' + dragonsTotal()] : null,
    airships.length ? ['Dirigibles destruidos', airshipState.kills + ' / ' + airships.length] : null,
    UNITS.length ? ['Otras unidades destruidas', unitState.kills + ' / ' + UNITS.length + (stats.soldiers ? '  ·  ' + stats.soldiers + ' soldados' : '')] : null,   // (v29)
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
  planUnits();                                             // v29: y las unidades nuevas (artillería, batallones, barcos, superdirigibles, la sierpe)
  for (let i = fireballs.length - 1; i >= 0; i--) killFireball(i);
  boltsClear();
  dragon.position.copy(START.pos); dragon.quaternion.copy(START.q); F.aimWorld.copy(START.dir);
  F.speed = 80; F.throttle = 0.5; F.rate.p = F.rate.y = F.rate.r = 0; F.bank = 0; F.sink = 0; F.lookYaw = F.lookPit = 0; dragonVel.set(0, 0, 0);
  F.lookVY = F.lookVP = 0; F.tgtBack = F.straight = false;   // (v26)
  F.aimPt.copy(START.dir).multiplyScalar(1400).add(START.pos); scorchClear();   // (v27: punto de la mira y quemaduras)
  F.steer.set(0, 0, -1); F.prevSpeed = F.speed; F.accS = 0; dragonAnim.camQ = null;
  dodgeReset();                                            // (v32)
  const P = dragon.position;
  refreshTerrainSelection(P.x, P.y, P.z, true);
  if (pump) for (let i = 0, t0 = performance.now(); i < 400 && pumpTerrain(30) > 0 && performance.now() - t0 < 4000; i++) { }   // (en el menú se genera poco a poco)
  updateTowerStreaming(P.x, P.z); updateIslandStreaming(P.x, P.z); pumpIslands(4000);
}
function backToMenu() {
  vicEl.hidden = byeEl.hidden = deadEl.hidden = pauseEl.hidden = true; closePanels(); cineEnd(true); devPanel(false);   // (v27: panel de pruebas)
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
  F.health = heroHpMax(); F.armor = ARMOR_MAX; F.lastHit = -99; towerState.score = 0; towerState.kills = 0;   // (v24: vida y armadura del dragón elegido)
  spawnEnemies();
  F.hover = false; F.hoverK = 0; F.hvy = 0; F.boost = 1; F.boostDelay = 0; F.boostExhausted = false; F.boostFx = 0; F.boostKick = F.kickFx = 0; F.boosting = false;
  devHoverStart();                                         // v32: en los modos de prueba se empieza en hover
  resetWeapons(true);
  requestLock(); canvasGL.focus();
  missionStart();                                          // objetivos, eventos, radio y área (y el aviso de inicio)
}
/* ---------- v26: entrada de cine ----------
   Al empezar (o reintentar) cualquier misión, el dragón vuela solo unos segundos recto, nivelado y hacia delante (updateAim; solo sube si
   hay terreno o una isla delante), con bandas negras de película arriba y abajo, el nombre de la misión en la de arriba y sin HUD, mientras
   llegan los primeros mensajes de la radio. Luego las bandas se retiran despacio (1,8 s, en el CSS), vuelve el HUD y el jugador toma el
   control con la mira delante del morro. Duración: «intro» en la receta (s; 0 = sin entrada) o CINE_T. Mientras dura: sin armas, hover,
   escudo, vuelo recto, cámara al objetivo ni daño; Esc pausa, C cambia la cámara y M silencia. La llama missionStart. */
const CINE_T = 7;
const cine = { on: false, t: 0, dur: CINE_T, dir: new THREE.Vector3(0, 0, -1) };
const cineEl = document.getElementById('cine'), cineNameEl = document.getElementById('cineName'), cineSubEl = document.getElementById('cineSub');
function cineStart(dur, name, sub) {
  cine.on = true; cine.t = 0; cine.dur = dur;
  cine.dir.set(0, 0, -1).applyQuaternion(dragon.quaternion); cine.dir.y = 0; if (cine.dir.lengthSq() < 1e-4) cine.dir.set(0, 0, -1); cine.dir.normalize();
  cineNameEl.textContent = name || ''; cineSubEl.textContent = sub || '';
  cineEl.classList.remove('title'); cineEl.classList.add('show', 'on', 'snap'); hudEl.classList.add('cine', 'snap');   // de golpe: ya están al aparecer
  void cineEl.offsetWidth; cineEl.classList.remove('snap'); hudEl.classList.remove('snap');
}
function cineUpdate(dt) {
  cine.t += dt;
  cineEl.classList.toggle('title', cine.t > 0.6 && cine.t < cine.dur - 1);
  if (cine.t >= cine.dur) cineEnd(false);
}
/* Fin: las bandas se retiran y vuelve el HUD (instant: de golpe, al salir de la partida). El control vuelve con la mira delante del morro. */
function cineEnd(instant) {
  if (cine.on) { F.aimWorld.set(0, 0, -1).applyQuaternion(dragon.quaternion); F.steer.set(0, 0, -1); F.pdx = F.pdy = 0; }
  cine.on = false;
  if (instant) { cineEl.classList.add('snap'); hudEl.classList.add('snap'); }
  cineEl.classList.remove('on', 'title'); hudEl.classList.remove('cine');
  if (instant) { void cineEl.offsetWidth; cineEl.classList.remove('snap', 'show'); hudEl.classList.remove('snap'); }
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
/* v32 (petición de Jorge): en los modos de prueba (Dev Test y galería) se empieza parado, en hover. */
function devHoverStart() {
  if (!mission.dev) return;
  F.hover = true; F.hoverK = 1; F.speed = 0; F.prevSpeed = 0; F.sink = 0;
}
/* Hover: se frena del todo y se queda aleteando; al salir se reanuda el vuelo con un impulso de alas. */
function toggleHover() {
  if (state !== 'playing') return;
  F.hover = !F.hover;
  if (F.hover) { F.hvy = 0; sfx.hoverOn(); toast('HOVER  ·  W/S suben y bajan'); }
  else { F.speed = Math.max(F.speed, HOVER_EXIT_SPEED); F.sink = 0; F.hvy = 0; sfx.hoverOff(); toast('Vuelo normal'); }
}
function crash(why) {
  if (state !== 'playing') return;
  if (devCheat('noCrash')) { const p = dragon.position, g = Math.max(heightAt(p.x, p.z), WL); if (p.y < g + 3) p.y = g + 3; return; }   // v27: Dev Test, «sin choques»
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
  F.speed = 80; F.throttle = 0.5; F.rate.p = F.rate.y = F.rate.r = 0; F.health = heroHpMax(); F.armor = ARMOR_MAX; F.aimWorld.copy(_f); F.aimPt.copy(_f).multiplyScalar(1400).add(p); F.steer.set(0, 0, -1); F.prevSpeed = F.speed; F.accS = 0; dragonAnim.camQ = null;
  F.hover = false; F.hoverK = 0; F.hvy = 0; F.bank = 0; F.sink = 0; F.lookYaw = F.lookPit = F.lookVY = F.lookVP = 0; F.tgtBack = F.straight = false; F.boost = 1; F.boostDelay = 0; F.boostExhausted = false; F.boostFx = 0; F.boostKick = F.kickFx = 0; F.boosting = false;
  dodgeReset(); devHoverStart();                           // (v32: en los modos de prueba, también al reaparecer)
  deadEl.hidden = true; state = 'playing';
  boltsClear(); enemiesCalm(); resetWeapons(false);
}
function boltsClear() { for (const b of bolts) scene.remove(b.mesh); bolts.length = 0; }
/* light: impacto pequeño (antiaéreo): menos sacudida y sin estallido. v24: el daño se lo lleva primero la armadura y lo que sobra, la vida. */
function hurtDragon(n, why, light) {
  if (cine.on || devCheat('god')) return;                  // v26: la entrada de cine no se interrumpe (v27: ni en Dev Test con «invulnerable»)
  F.lastHit = gameTime; stats.dmgTaken += n;
  const a = Math.min(F.armor, n); F.armor -= a; F.health -= n - a;
  if (light) { vigAlpha = Math.max(vigAlpha, 0.45); camShake = Math.max(camShake, 0.22); if (!(gameTime - hurtDragon.sndT < 0.1)) { hurtDragon.sndT = gameTime; sfx.hit(); } }
  else { vigAlpha = 1; camShake = Math.max(camShake, 0.7); sfx.hurt(); const p = dragon.position; explode(p.x, p.y - 2, p.z, 0.35); }
  if (F.health <= 0) { F.health = 0; crash(why || 'Te derribaron'); }
}

/* ---------- Disparo ---------- */
const _mouth = new THREE.Vector3(), _dir = new THREE.Vector3(), _org = new THREE.Vector3(), _hit = new THREE.Vector3();
function aimPointFrom(origin, dir) {
  // marcha a lo largo del rayo del marcador: terreno o torres; si no hay impacto, un punto lejano
  let t = 25, last = 0;
  const maxT = 3200, tIsl = islandRayHit(origin, dir, maxT), tEn = enemyRayHit(origin, dir, maxT), tAir = airshipRayHit(origin, dir, maxT), tUn = unitRayHit(origin, dir, maxT);
  const tI = Math.min(tIsl, tEn, tAir, tUn), limit = Math.min(maxT, tI);   // la isla, el dragón enemigo, el dirigible (v21) o la unidad (v29) más cercana en el rayo
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
  // v30: el más cercano de verdad (antes, si lo primero era una unidad nueva, esta comparación daba el punto de interceptación del último
  // dragón apuntado —viejo, o el origen del mundo— y la mira, la cabeza y la cámara saltaban a otro lado)
  if (tI < maxT) return tEn === tI ? _hit.copy(enemyAimPt) : _hit.copy(origin).addScaledVector(dir, tI);
  return _hit.copy(origin).addScaledVector(dir, 1400);
}

/* ---------- Armas del jugador ----------
   Las cuatro están siempre disponibles (no se cambia de arma); cada una tiene su condición:
   · Fuego rápido (clic izquierdo): un proyectil pequeño y muy rápido por clic, con poco daño (la «ametralladora»). Munición GUN_AMMO;
     tras GUN_REFILL_DELAY s sin disparar se rellena de uno en uno.
   · Bola guiada (clic izquierdo mantenido más de MSL_HOLD s): con un dragón fijado (clic central) a menos de MSL_RANGE, aparece un círculo rojo a su
     alrededor. Pasado MSL_HOLD, cada segundo con la mira dentro del círculo carga el bloqueo; a los MSL_LOCK s sale una gran bola de fuego que lo persigue
     hasta impactar. Los clics cortos son siempre fuego rápido. Fuera del círculo la carga se pierde poco a poco; al soltar, entera.
     Munición: MSL_AMMO por misión (v24: ya no se recargan).
   · Llamarada (clic derecho mantenido): chorro de FLAME_RANGE m que daña todo lo que toca. Calienta; al llegar al 100 %, sobrecalentamiento:
     todas las armas inutilizadas OVERHEAT_T s. Al soltar antes, el calor baja solo.
   · Rayo de fuego, la ultimate (izquierdo + derecho con menos de COMBO_WIN s entre uno y otro): la barra se carga con el tiempo (ULT_TIME s) y con
     cada blanco destruido (ULT_PER_KILL). Llena, parpadea. Al estilo de un kamehameha: la energía se concentra en la boca LASER_CHARGE s, sale un rayo gordo que llega a
     LASER_RANGE m, sigue a la mira y daña todo lo que cruza. Dura LASER_T s desde el clic; mientras dura, las demás armas callan.
   Todo sale del socket de la boca (hero.mouth, entre los labios y colgado del morro). Los disparos se lanzan después de animar al dragón en cada
   fotograma (updateAttacks), así que salen de la boca tal y como se ve en pantalla, aunque la cabeza gire.
   v24: los valores de balance (daño, munición, alcances, tiempos) son stats del dragón elegido, del Excel (7c: applyHeroStats); los de
   aquí (con let) son los de la Base. Las guiadas ya no se recargan: MSL_AMMO por misión. El rayo se carga solo con el tiempo y con los
   derribos (ya no con el daño hecho). */
let GUN_AMMO = 20, GUN_COOL = 0.1, GUN_REFILL_DELAY = 1, GUN_REFILL_RATE = 8;     // munición, pausa mínima entre clics (s), espera antes de recargar (s), proyectiles recargados por segundo
const GUN_SPEED = 1100, GUN_LIFE = 2.8;                                           // m/s (fija en el mundo) y vida (s)
let GUN_DMG = 5;                                                                  // daño por impacto
const MSL_HOLD = 0.5, MSL_DECAY = 2, MSL_CIRCLE = 0.1;                            // clic mantenido antes de empezar a cargar (s), fuera del círculo la carga se pierde x veces más rápido, radio mínimo del círculo (fracción del alto de pantalla)
let MSL_RANGE = 3000, MSL_LOCK = 2, MSL_AMMO = 20, MSL_DMG = 60;                  // alcance (m), segundos de carga con la mira en el círculo, guiadas por misión, daño
const MSL_CIRCLE_K = 0.5;                                                         // tamaño del círculo rojo respecto al de la v9 (que medía lo del cuadro dorado + 14 px, o el 10 % del alto)
const MSL_SPEED = [160, 400], MSL_ACCEL = 260, MSL_TURN = 3.2, MSL_LIFE = 15;    // velocidad al salir (al menos la del dragón + 40) y máxima (m/s), aceleración (m/s²), giro (rad/s), vida (s)
const FLAME_SPEED = 240;                                                          // velocidad de las llamas (m/s)
let FLAME_RANGE = 300, FLAME_DPS = 15, FLAME_HEAT = 5, FLAME_COOL = 4, OVERHEAT_T = 10;   // alcance (m), daño por segundo, segundos seguidos hasta sobrecalentarse, segundos en enfriarse del todo, segundos sin armas
let ULT_TIME = 200, ULT_PER_KILL = 0.05;                                          // rayo: de 0 a 100 % en ULT_TIME s; carga por blanco destruido (dragón, torre o dirigible)
const COMBO_WIN = 0.3;                                                            // ventana de los dos clics (s)
const LASER_CHARGE = 0.4, LASER_SHOOT = 6000, LASER_R = 8;                        // carga en la boca (s), velocidad a la que sale el rayo (m/s), radio de daño (m)
let LASER_T = 5, LASER_RANGE = 8000, LASER_DPS = 50;                              // duración (s, desde el clic), alcance (m), daño por segundo
const W = {
  ammo: GUN_AMMO, cool: 0, refill: 0, refillAcc: 0, shotQ: false,                 // fuego rápido: munición, pausa entre clics, espera hasta recargar, disparo pendiente (sale en updateAttacks)
  lmb: false, rmb: false, lmbT: -9, rmbT: -9, holdT: 0,                           // botones pulsados, cuándo (para el «a la vez» del rayo) y cuánto lleva mantenido el izquierdo
  msl: MSL_AMMO, lock: 0, lockArmed: false, lockWhy: 'sin', lockIn: false, beepT: 0, mslFlash: 0, mslQ: null,   // bola guiada: munición, carga 0-1, si el clic actual puede cargar, estado del círculo, lanzamiento pendiente
  heat: 0, heatDelay: 0, overheat: 0, flame: false,                               // llamarada: calor 0-1, segundos de sobrecalentamiento que quedan
  ult: 0, ultFull: false, laser: 0, snd: false,                                   // rayo: carga 0-1, segundos de rayo que quedan
  shield: 2, shieldT: 0, shieldFade: 0, shieldHit: 0                              // escudo: cargas, segundos que le quedan, desvanecido final y destello de impacto
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
  const ec = targetCenter(e);                              // (v30: el centro de las unidades nuevas, no su base)
  out.d = ec.distanceTo(dragon.position);
  if (out.d > MSL_RANGE) return 'rango';
  const sw = window.innerWidth, sh = window.innerHeight;
  camera.getWorldPosition(_Wc);
  _Wv.copy(ec).applyMatrix4(camera.matrixWorldInverse);
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
/* ---------- Escudo (R; F hasta la v25) ----------
   Esfera de energía azul alrededor del dragón durante SHIELD_T s: anula el daño de bolas de fuego, bolas guiadas y virotes, que revientan
   contra ella (no el de los choques). SHIELD_MAX cargas, marcadas con rayas azules bajo la mira (la usada se vacía y queda negra); solo se
   recargan derribando dragones (+1 cada uno). En su último SHIELD_BLINK s parpadea y luego se disipa. */
let SHIELD_MAX = 2, SHIELD_T = 5;                                                   // cargas y duración (s): stats del dragón (v24; antes 3 cargas)
const SHIELD_R = 18, SHIELD_BLINK = 1.2, SHIELD_POS = new THREE.Vector3(0, 0.5, 2.5);   // radio (m: cubre la envergadura y deja fuera la cámara de 3ª persona), parpadeo final (s), centro (ejes del dragón)
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
  if (W.shield <= 0) { sfx.empty(); toast('Sin cargas de escudo' + (SHIELD_PER_KILL > 0 ? '  ·  derriba dragones' : '')); return; }
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
  if (!on) { W.shotQ = false; W.mslQ = null; impactMark(false); return; }
  // v27: el punto de la mira (lo que toca el rayo de la mira desde la cámara) y hasta dónde llegaría la llamarada (círculo de impacto, 13b)
  heroMouth(_bS); camera.getWorldPosition(_bC);
  F.aimPt.copy(aimPointFrom(_bC, F.aimWorld));
  const reach = flameAim();
  impactMark(!cine.on && !la && FL.kind !== '' && reach <= FLAME_RANGE, _bF, FL.kind, fl, reach);
  if (W.shotQ) { W.shotQ = false; fireGun(); }
  if (W.mslQ) { const e = W.mslQ; W.mslQ = null; if (!e.dead && W.msl > 0) launchMissile(e); }
  if (!fl && !la) {
    if (W.overheat > 0 && Math.random() < 0.45) {      // vapor por la boca mientras se enfría
      emit(fxSmoke, _bS.x, _bS.y, _bS.z, dragonVel.x * 0.9 + rnd(-2, 2), dragonVel.y * 0.9 + rnd(2, 6), dragonVel.z * 0.9 + rnd(-2, 2), rnd(0.5, 0.8), 0.8, rnd(4, 7), 0.8, 0.8, 0.82, 0.3, 0.6, -3);
    }
    return;
  }
  if (fl) flameFx(dt, reach); else laserFx(dt);
}
/* v27: dirección (_bD, con _bX y _bU) y alcance de la llamarada desde la boca (_bS): va de la boca al punto de la mira (F.aimPt), así que llega
   justo a la mira aunque la boca esté por delante y por debajo de la cámara (antes iba en paralelo a la línea de la mira y, cerca del suelo,
   caía lejos de ella). Devuelve la distancia hasta lo primero que toca del terreno, el agua o una isla (FL.kind; si no toca nada en
   FLAME_RANGE + 1 m, FL.kind = '' y devuelve ese tope); el punto, en _bF. */
const FL = { kind: '' };
function flameAim() {
  _bD.subVectors(F.aimPt, _bS); if (_bD.lengthSq() < 4) _bD.copy(F.aimWorld); _bD.normalize(); perpBasis();
  const maxT = FLAME_RANGE + 1, tIsl = islandRayHit(_bS, _bD, maxT), lim = Math.min(maxT, tIsl);
  let t = 1.5, last = 0;
  FL.kind = '';
  while (t < lim) {
    _bF.copy(_bS).addScaledVector(_bD, t);
    if (_bF.y < Math.max(heightAt(_bF.x, _bF.z), WL)) {
      let a = last, b = t;
      for (let i = 0; i < 7; i++) { const m = (a + b) / 2; _bF.copy(_bS).addScaledVector(_bD, m); if (_bF.y < Math.max(heightAt(_bF.x, _bF.z), WL)) b = m; else a = m; }
      _bF.copy(_bS).addScaledVector(_bD, b); FL.kind = heightAt(_bF.x, _bF.z) < WL ? 'agua' : 'tierra';
      return b;
    }
    last = t; t += Math.max(2.5, t * 0.035);
  }
  if (tIsl < maxT) { _bF.copy(_bS).addScaledVector(_bD, tIsl); FL.kind = 'isla'; return tIsl; }
  _bF.copy(_bS).addScaledVector(_bD, maxT);
  return maxT;
}
function flameFx(dt, reach) {
  // llamas: viajan con el dragón (heredan su velocidad) y salen a FLAME_SPEED; el chorro mide FLAME_RANGE o, si antes toca el terreno, el agua o
  // una isla, llega justo hasta ahí (vistas desde el dragón van en línea recta de la boca a la mira)
  // v28: si choca, cada llama vive justo hasta el punto de contacto (descontado el adelanto con el que sale) y mantiene el brillo hasta el final
  // (hold), sin hincharse tanto: el chorro llega entero y se corta en el suelo, donde salta el impacto (flameImpact)
  const c = ATTACK, n = Math.round(800 * dt + Math.random()), len = Math.min(FLAME_RANGE, reach), cut = reach <= FLAME_RANGE;
  for (let i = 0; i < n; i++) {
    const sp = FLAME_SPEED * rnd(0.9, 1.1), a = Math.random() * 6.283, s = rnd(0, 0.11), cx = Math.cos(a) * s, cy = Math.sin(a) * s, o = rnd(0, dt);
    const vx = (_bD.x + _bX.x * cx + _bU.x * cy) * sp, vy = (_bD.y + _bX.y * cx + _bU.y * cy) * sp, vz = (_bD.z + _bX.z * cx + _bU.z * cy) * sp;
    const hot = Math.random() < 0.3, life = cut ? Math.max(0.02, len / sp - o) : len / sp * rnd(0.7, 1.05);
    emit(fxAdd, _bS.x + vx * o, _bS.y + vy * o, _bS.z + vz * o, vx + dragonVel.x, vy + dragonVel.y, vz + dragonVel.z,
      hot ? life * 0.4 : life, hot ? 0.8 : rnd(1, 1.8), hot ? 5 : cut ? rnd(8, 13) : rnd(15, 24),
      hot ? lerp(c.r, 1, 0.6) : c.r, hot ? lerp(c.g, 1, 0.6) : c.g * rnd(0.75, 1.15), hot ? lerp(c.b, 1, 0.6) : c.b, hot ? 0.6 : 0.38, 0, cut ? 0 : -8, cut && !hot);   // sin saturar a blanco encima de la mira
  }
  // v27: donde toca (terreno, agua o isla): tierra que salta y quemaduras, vapor o roca (13b)
  if (reach <= FLAME_RANGE) flameImpact(FL.kind, _bF, dt, reach);
  // daño: cono de FLAME_RANGE m que se abre un 11 % de la distancia (v27: no pasa a través del terreno ni de las islas)
  const amt = FLAME_DPS * dt, lim = Math.min(FLAME_RANGE, reach + 4);
  for (const e of enemies) {
    if (e.dead) continue;
    _bM.subVectors(e.pos, _bS); const along = _bM.dot(_bD);
    if (along < -ENEMY_HIT_R || along > lim + ENEMY_HIT_R) continue;
    const r = ENEMY_HIT_R + 2 + clamp(along, 0, lim) * 0.11;
    if (_bM.lengthSq() - along * along < r * r) { _bM.copy(_bS).addScaledVector(_bD, clamp(along, 0, lim)); damageEnemy(e, amt, _bM, true); flameHit(_bM, dt); }
  }
  _bF.copy(_bS).addScaledVector(_bD, lim);
  for (const t of towers.values()) if (!t.dead && towerSegDist2(t, _bS, _bF) < (TOWER_R + 12) ** 2) { damageTower(t, amt, true, _sdc); flameHit(_sdc, dt); }   // _sdc: punto de la llamarada más cercano a la torre
  for (const a of airships) if (!a.dead && airshipSegDist2(a, _bS, _bF) < (a.r + 12) ** 2) { damageAirship(a, amt, true, _sdc); flameHit(_sdc, dt); }      // v21: dirigibles
  unitsFlame(_bS, _bD, lim, amt, dt);                                                                                                           // v29: unidades nuevas (6f; los batallones, soldado a soldado)
  fbLight.position.copy(_bS).addScaledVector(_bD, Math.min(40, len * 0.5)); fbLight.intensity = 4.5; fbLight.color.copy(ATTACK);
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
  unitsLaser(_bS, _bE, amt);                                                                                     // v29: unidades nuevas (6f)
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
/* v26: cámara al objetivo (F mantenida), como en Ace Combat: la vista gira hacia el blanco fijado y lo sigue; al soltar vuelve sola al frente.
   El giro va con un muelle amortiguado (TARGET_CAM_W, 1/s): arranca y llega suave, sin pasarse (media vuelta, ~0,8 s). Usa el mismo giro que
   mirar alrededor: en 1ª persona, la cabeza del jinete (hasta LOOK_FP_YAW); en 3ª, la cámara orbita y deja al dragón delante, entre ella y el
   blanco. El ratón sigue moviendo la mira (puede salirse de la pantalla). Sin blanco fijado, al pulsar fija el mejor a la vista
   (cycleTarget); si no hay ninguno, no hace nada. La Z manda sobre la F. */
let TARGET_CAM_W = 6;                                    // (let: panel de pruebas)
const _tq = new THREE.Quaternion();
function updateLook(dt) {
  F.lookHeld = !!keys.KeyZ && state === 'playing' && !cine.on;
  const tgt = !F.lookHeld && !!keys.KeyF && state === 'playing' && !cine.on;
  if (tgt && !F.tgtCam && (!enemyLock.e || enemyLock.e.dead)) cycleTarget();   // al pulsar, sin blanco: el mejor a la vista
  F.tgtCam = tgt;
  const T = tgt && enemyLock.e && !enemyLock.e.dead ? enemyLock.e : null;
  if (T) F.tgtBack = true; else if (F.lookHeld) F.tgtBack = false;   // tras la F, la vuelta al frente también con el muelle
  if (F.lookHeld) {
    const k = 0.0021 * F.sens;
    F.lookYaw -= F.pdx * k; F.lookPit -= F.pdy * k; F.pdx = F.pdy = 0; F.lookVY = F.lookVP = 0;
  } else if (F.tgtBack) {
    // hacia el blanco: su dirección en el marco de la cámara (el del dragón con su retraso, dragonAnim.camQ), en el giro (cabeceo, guiñada) de la Z
    let wy = 0, wp = 0;
    if (T) { _l.subVectors(T.pos, dragon.position).normalize().applyQuaternion(_tq.copy(dragonAnim.camQ || dragon.quaternion).invert()); wy = Math.atan2(-_l.x, -_l.z); wp = Math.asin(clamp(_l.y, -1, 1)); }
    const w = TARGET_CAM_W, dy = Math.atan2(Math.sin(wy - F.lookYaw), Math.cos(wy - F.lookYaw));   // (por el camino corto)
    F.lookVY += (w * w * dy - 2 * w * F.lookVY) * dt; F.lookVP += (w * w * (wp - F.lookPit) - 2 * w * F.lookVP) * dt;
    F.lookYaw += F.lookVY * dt; F.lookPit += F.lookVP * dt;
    if (!T && Math.abs(dy) + Math.abs(F.lookPit) < 0.003) { F.tgtBack = false; F.lookYaw = F.lookPit = F.lookVY = F.lookVP = 0; }
  } else {
    F.lookYaw = Math.atan2(Math.sin(F.lookYaw), Math.cos(F.lookYaw));
    const r = Math.exp(-dt * LOOK_RETURN); F.lookYaw *= r; F.lookPit *= r;
  }
  const y0 = F.lookYaw, p0 = F.lookPit;
  if (F.third) F.lookPit = clamp(F.lookPit, LOOK_TP_PITCH[0], LOOK_TP_PITCH[1]);
  else { F.lookYaw = clamp(F.lookYaw, -LOOK_FP_YAW, LOOK_FP_YAW); F.lookPit = clamp(F.lookPit, LOOK_FP_PITCH[0], LOOK_FP_PITCH[1]); }
  if (F.lookYaw !== y0) F.lookVY = 0; if (F.lookPit !== p0) F.lookVP = 0;   // (en el tope, sin inercia)
}
function updateAim(dt, auto) {
  const q = dragon.quaternion;
  if (!auto) updateLook(dt);
  if (!auto && cine.on) {
    // v26: entrada de cine: rumbo de salida y nivelado (solo sube si hay terreno o una isla delante); el ratón no mueve la mira
    const p = dragon.position, hx = cine.dir.x, hz = cine.dir.z;
    let wantY = Math.max(heightAt(p.x, p.z), WL) + 120;
    for (const d of [200, 500, 900, 1400, 2000]) wantY = Math.max(wantY, heightAt(p.x + hx * d, p.z + hz * d) + 160);
    for (const d of [0, 150, 400, 800, 1300]) {
      const isl = islandColumn(p.x + hx * d, p.z + hz * d, p.y - 60, p.y + 60, 60);
      if (isl) { wantY = Math.max(wantY, isl.yMax + 150); break; }
    }
    const pit = clamp(Math.atan2(wantY - p.y, 1000), 0, 0.3);   // (mira lejos: sube pronto y poco a poco)
    F.aimWorld.set(hx * Math.cos(pit), Math.sin(pit), hz * Math.cos(pit)); F.pdx = F.pdy = 0;
  } else if (auto) {
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
    // en hover el cuerpo no cabecea: el marcador sí puede subir/bajar (cabeza y bolas de fuego lo siguen) dentro de un rango.
    // v26: en vuelo recto (Espacio), algo más hacia abajo, para barrer el suelo en vuelo rasante
    yaw = clamp(yaw, -1.0, 1.0); pit = F.hover ? clamp(pit, -0.85, 0.55) : F.straight ? clamp(pit, -0.95, 0.78) : clamp(pit, -0.78, 0.78);
    _l.set(Math.sin(yaw) * Math.cos(pit), Math.sin(pit), -Math.cos(yaw) * Math.cos(pit));
    F.aimWorld.copy(_l).applyQuaternion(q);
  } else if (!F.lookHeld && !F.tgtCam && !DEV.open) {                   // (sin puntero bloqueado y mirando alrededor o al blanco, la mira se queda donde estaba)
    const t = Math.tan(camera.fov * Math.PI / 360);
    _l.set(F.ndcX * t * camera.aspect, F.ndcY * t, -1).normalize().applyQuaternion(camera.quaternion).applyQuaternion(q);
    F.aimWorld.copy(_l);
  }
  _iq.copy(q).invert();
  F.aimLocal.copy(F.aimWorld).applyQuaternion(_iq).normalize();
}

/* ---------- v32: esquiva (A / D) ----------
   Petición de Jorge: un desplazamiento lateral rápido (strafe) hacia la izquierda o la derecha de la pantalla, con un tonel de 360° hacia ese
   lado, para esquivar o despistar bolas guiadas en el último segundo o no chocar con una torre o un pilar. El rumbo no cambia: el dragón sale
   de lado deprisa y frena al final (DG.s), y el tonel va en el cuerpo (F.roll → animateHero). En 3ª persona la cámara no le acompaña de lado
   hasta que acaba (DODGE_CAM, 5c). Al empezar, las bolas guiadas enemigas a menos de DODGE_MSL m pierden el blanco. Distancia, duración,
   espera entre esquivas y DODGE_MSL son stats del dragón (Excel, «Esquiva»: applyHeroStats). */
let DODGE_DIST = 25, DODGE_T = 0.6, DODGE_COOL = 1, DODGE_MSL = 400;
const DG = { on: false, t: 0, s: 0, dir: 0, cool: 0, back: -1, side: new THREE.Vector3(), off: new THREE.Vector3() };   // back: s desde que acabó (la cámara vuelve); -1 = nada
function dodgeReset() { DG.on = false; DG.cool = 0; DG.back = -1; DG.off.set(0, 0, 0); F.roll = 0; F.dodgeCam.set(0, 0, 0); }
function startDodge(dir) {
  if (state !== 'playing' || cine.on || DG.on || DG.cool > 0 || DEV.open) return;
  _f.set(0, 0, -1).applyQuaternion(dragon.quaternion);
  camera.getWorldQuaternion(_iq); DG.side.set(1, 0, 0).applyQuaternion(_iq);       // la derecha de la pantalla, en perpendicular al rumbo
  DG.side.addScaledVector(_f, -DG.side.dot(_f));
  if (DG.side.lengthSq() < 0.1) DG.side.set(1, 0, 0).applyQuaternion(dragon.quaternion);   // (mirando a un lado con la Z: la derecha del dragón)
  DG.side.normalize();
  if (DODGE_CAM.hold > 0.01) DG.off.copy(F.dodgeCam).divideScalar(DODGE_CAM.hold); else DG.off.set(0, 0, 0);   // (si la cámara aún volvía de la anterior, sigue desde ahí)
  DG.on = true; DG.t = 0; DG.s = 0; DG.dir = dir; DG.back = -1;
  for (const f of fireballs) if (f.kind === 'emsl' && !f.lost && f.pos.distanceTo(dragon.position) < DODGE_MSL) f.lost = true;
  sfx.dodge();
}
function updateDodge(dt) {
  DG.cool = Math.max(0, DG.cool - dt);
  if (DG.on) {
    DG.t += dt;
    const u = Math.min(1, DG.t / Math.max(0.05, DODGE_T)), s = 1 - Math.pow(1 - u, 3), d = (s - DG.s) * DODGE_DIST * DG.dir;
    DG.s = s; dragon.position.addScaledVector(DG.side, d); DG.off.addScaledVector(DG.side, d);
    const r = Math.min(1, u / 0.9);
    F.roll = -DG.dir * Math.PI * 2 * r * r * (3 - 2 * r);           // (+ = ala derecha arriba: hacia la derecha baja primero la derecha)
    if (u >= 1) { DG.on = false; F.roll = 0; DG.cool = DODGE_COOL; DG.back = 0; }
  }
  let k = DODGE_CAM.hold;                                         // la cámara de 3ª persona: atrás mientras dura; al acabar, espera y vuelve
  if (DG.back >= 0) {
    DG.back += dt;
    const v = clamp((DG.back - DODGE_CAM.wait) / Math.max(0.05, DODGE_CAM.back), 0, 1);
    k *= 1 - v * v * (3 - 2 * v);
    if (v >= 1) { DG.back = -1; DG.off.set(0, 0, 0); }
  }
  F.dodgeCam.copy(DG.off).multiplyScalar(k);
}

/* ---------- Vuelo ---------- */
function updateFlight(dt, auto) {
  const q = dragon.quaternion, pos = dragon.position;
  if (!auto && cine.on) cineUpdate(dt);                    // v26: entrada de cine (sin control hasta que acaba)
  if (!auto && mission.dev) devUpdate(dt);                 // v27: trucos del modo Dev Test
  const ctl = !auto && !cine.on;                           // las teclas de vuelo cuentan
  const hov = !auto && F.hover;
  F.hoverK += ((hov ? 1 : 0) - F.hoverK) * (1 - Math.exp(-dt * 3));
  // acelerador (en hover W/S no hacen nada)
  const thr = (auto || hov || !ctl) ? 0 : ((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0));
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
  const shift = ctl && !hov && (keys.ShiftLeft || keys.ShiftRight);
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
    // (v24) VCRUISE_MAX y VMAX son las velocidades máxima y de boost del dragón elegido (DRAG ya está calibrada con la suya). Con boost, la
    // resistencia deja de frenar y se suma BOOST_ACCEL: en línea recta, de la máxima a la de boost en boost_aceleracion s. Al soltarlo, la
    // resistencia vuelve poco a poco (boostFx) y frena hasta la máxima.
    const thrust = THRUST[0] + THRUST[1] * F.throttle, drag = DRAG * (1 - DIVE_DRAG * dive) * F.speed * F.speed;
    const bk = boosting ? 1 : F.boostFx, acc = lerp(thrust - drag, BOOST_ACCEL, bk) - GRAVITY * _f.y;
    F.speed = clamp(F.speed + acc * dt, 18, VMAX);
    // planeo: por debajo de la velocidad mínima pierde sustentación y se hunde, sin llegar a entrar en barrena
    lack = clamp((VMIN - F.speed) / VMIN, 0, 1);
    F.sink += ((lack * 34 + 2.5) - F.sink) * (1 - Math.exp(-dt * 1.5));
  }
  // giros hacia el marcador (el marcador fijo en el mundo, el dragón gira hacia él).
  // Con boost la autoridad de giro del ratón cae a BOOST_STEER: se puede, pero muy poco.
  const sn = clamp((F.speed - VMIN) / (VCRUISE_MAX - VMIN), 0, 1);
  const maxRate = lerp(TURN_RATE[0], TURN_RATE[1], sn), steer = lerp(1, BOOST_STEER, F.boostFx);   // (v24: TURN_RATE sale del radio de giro del dragón)
  F.steer.lerp(F.aimLocal, 1 - Math.exp(-dt * STEER_LAG)).normalize();   // v13: el dragón persigue la mira con un poco de retraso
  let a = F.steer;
  // v26: vuelo recto (Espacio mantenido): el dragón deja de seguir a la mira. v27: además se autonivela: alas a 0° y morro al horizonte, con
  // el rumbo que llevaba (los primeros STRAIGHT_SETTLE s solo frena el giro que traía; luego fija ese rumbo). El morro se levanta lo justo
  // para compensar el leve hundimiento (sink): vuela perfectamente horizontal. Q/E no cuentan. La mira sigue al ratón; la cabeza y la
  // llamarada van hacia ella (F.aimPt) y la cámara pasa a la de apuntado (animateHero).
  const straight = ctl && !!keys.Space;
  if (straight) {
    if (!F.straight) F.straightT = 0;
    F.straightT += dt;
    if (hov || F.straightT < STRAIGHT_SETTLE) {             // rumbo: el de ahora (en hover, siempre: sin girar hacia la mira)
      F.holdDir.set(0, 0, -1).applyQuaternion(q); F.holdDir.y = 0;
      if (F.holdDir.lengthSq() < 0.0025) { F.holdDir.set(0, 1, 0).applyQuaternion(q); F.holdDir.y = 0; }   // (en vertical: hacia donde mira el lomo)
      F.holdDir.normalize();
    }
    _l.copy(F.holdDir); if (!hov) _l.y = clamp(F.sink / Math.max(F.speed, 1), 0, 0.3);
    a = _l.normalize().applyQuaternion(_iq.copy(q).invert());
  } else if (!hov) {
    // v28: el dragón va hacia donde apunta la mira, no solo su morro: lo levanta lo justo para compensar el leve hundimiento (sink, en la
    // vertical del mundo), así que con la mira en el 0° de la escalera de cabeceo vuela horizontal (antes perdía ~2,5 m/s y había que apuntar
    // algo por encima). Por debajo de la velocidad mínima no lo compensa del todo: sigue perdiendo sustentación.
    const c = clamp(F.sink / Math.max(F.speed, 1), 0, 0.06);
    if (c > 1e-4) { _l.set(0, 1, 0).applyQuaternion(_iq.copy(q).invert()); a = _sc.copy(F.steer).addScaledVector(_l, c).normalize(); }
  }
  F.straight = straight;
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
    if (!ctl || straight) tRoll = 0;
    if ((ctl && keys.KeyX) || !ctl || straight) tRoll += -clamp(rollAng * 2.4, -1.5, 1.5);   // v26: nivelar pasa de la R a la X (la R es el escudo); en la entrada de cine y (v27) en vuelo recto, solo
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
  if (!auto) updateDodge(dt);                              // v32: esquiva (desplazamiento lateral y tonel), antes de los choques
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
  if (!auto && state === 'playing') { const u = unitPointHit(pos, 0.8); if (u) crash('Te estrellaste contra ' + (u.crashText || 'un enemigo')); }   // v29: unidades nuevas (6f)
  // rozar el agua levanta espuma
  if (pos.y - WL < 14 && pos.y - WL > 0 && heightAt(pos.x, pos.z) < WL - 1) {
    for (let i = 0; i < 2; i++) emit(fxSmoke, pos.x + rnd(-4, 4), WL + 0.3, pos.z + rnd(-4, 4), -dragonVel.x * 0.15 + rnd(-4, 4), rnd(3, 9), -dragonVel.z * 0.15 + rnd(-4, 4), rnd(0.7, 1.3), 2, 6, 0.85, 0.92, 0.95, 0.4, 1, 12);
  }
  // aleteo: más potente con el acelerador, planeo en picado
  const dive = smooth(0.1, 0.55, -_f.y), climb = smooth(0.15, 0.5, _f.y);
  // v32: con W mantenida (intentando ganar velocidad) aletea más deprisa y más fuerte (F.effort; animateTyrant). Tras un picado, al remontar,
  // las alas se quedan desplegadas del todo (planeo) PULLUP_SPREAD s antes de volver a batir; otro picado, el hover o el boost lo cortan
  F.effort += ((thr > 0 ? 1 : 0) - F.effort) * (1 - Math.exp(-dt * (thr > 0 ? 4 : 1.5)));
  if (dive > 0.6) F.diveT += dt; else if (dive < 0.2) { if (F.diveT > PULLUP_MIN && !auto) F.spreadT = PULLUP_SPREAD; F.diveT = 0; }
  F.spreadT = dive > 0.3 || hov || boosting ? 0 : Math.max(0, F.spreadT - dt);
  F.flapTarget = hov ? 1 : F.spreadT > 0 ? 0.04 : clamp((0.25 + F.throttle * 0.75 + climb * 0.25 + 0.3 * F.effort) * (1 - 0.85 * dive) + 0.4 * F.boostFx, 0.04, 1);
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
  // v24: la vida ya no se regenera; la armadura sí, tras ARMOR_WAIT s sin recibir daño
  if (F.armor < ARMOR_MAX && gameTime - F.lastHit > ARMOR_WAIT) F.armor = Math.min(ARMOR_MAX, F.armor + ARMOR_REGEN * dt);
}
