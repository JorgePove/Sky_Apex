
/* ============================================================
   M2. MISIONES: MOTOR (v15)
   Ejecuta la receta de M1: prepara la partida (torres y dragones → RUN), lleva la cuenta de los objetivos, dispara los eventos,
   muestra la radio, vigila el área de la misión (barrera invisible con cuenta atrás) y decide el final: MISIÓN CUMPLIDA o FALLIDA
   (pantalla de resultados, showResult).
   · chooseMission(id): los botones del menú → «Elige tu dragón» → startGame.
   · missionSetup(id): al empezar, antes de resetRun (v19: si la misión trae otro mundo, startGame lo genera antes, M3). missionStart(): tras spawnEnemies.
   · missionUpdate(dt): cada fotograma de partida (desde updateFlight) y, muerto, desde el bucle. missionDeath(): al acabar la caída.
   · missionFail(motivo) / missionWin(espera): final.
   ============================================================ */
const AREA_GRACE = 15;                    // s para volver al área antes de fallar
const AREA_HYST = 60;                     // m hacia dentro para dar por vuelto (que no parpadee el aviso justo en el borde)
const MISSION_END_DELAY = 4;              // s entre cumplir los objetivos y los resultados (ver la última explosión, oír la radio)
const RADIO_GAP = 0.45;                   // s entre dos mensajes de radio seguidos
let missionId = 'libre';                  // la que empieza al pulsar «Empezar» en «Elige tu dragón» (la fijan los botones del menú)
let mission = MISSIONS.libre;             // receta en juego
const MS = {
  t: 0, objs: [], fired: new Map(), ended: true, endAt: 0,
  out: false, outT: AREA_GRACE, tick: -1, edge: '',      // área: fuera, s que quedan, último segundo mostrado, distancia mostrada
  radio: [], radioT: 0, radioOn: false                     // cola de mensajes, tiempo del actual (o de la pausa entre dos), ¿se ve?
};
const radioEl = document.getElementById('radio'), radioIconEl = document.getElementById('radioIcon'), radioNameEl = document.getElementById('radioName'), radioTextEl = document.getElementById('radioText');
const areaEl = document.getElementById('area'), areaCountEl = document.getElementById('areaCount'), areaEdgeEl = document.getElementById('areaEdge');

function chooseMission(id) {
  missionId = MISSIONS[id] ? id : 'libre';
  document.getElementById('start').textContent = MISSIONS[missionId].free ? 'Empezar partida' : 'Empezar misión';
  enterSelect();
}
function missionSetup(id) {
  missionId = MISSIONS[id] ? id : 'libre'; mission = MISSIONS[missionId];
  const T = mission.towers || {}, D = mission.dragons || {};
  RUN.world = missionWorld(mission);                       // v19: semilla, bioma y punto de partida (M3)
  RUN.towers = { total: T.total || 0, zone: (T.zone || TOWER_ZONE).slice(), islands: (T.islands || [0, 0]).slice(),
    center: [RUN.world.start.x, RUN.world.start.z], random: !!T.random };
  RUN.dragons = { total: D.total || 0, atOnce: Math.min(D.atOnce || 0, D.total || 0) };
}
function missionStart() {
  MS.t = 0; MS.fired.clear(); MS.ended = false; MS.endAt = 0; MS.out = false; MS.outT = AREA_GRACE; MS.tick = -1;
  MS.objs = (mission.objectives || []).map(o => Object.assign({}, o, { hud: o.hud || o.text.toUpperCase(), n: 0, done: false, shown: !o.hidden }));
  missionHideHUD();
  const goal = MS.objs.filter(o => o.shown && !o.optional).map(o => o.count + ' ' + o.hud.toLowerCase()).join(' y ');
  toast(mission.free ? 'Objetivo: ' + goal : mission.name);
}
/* Fin de la partida (resultados, menú o reinicio): fuera la radio y el aviso del área. */
function missionHideHUD() {
  MS.radio.length = 0; MS.radioT = 0; MS.radioOn = false; radioEl.classList.remove('on');
  areaEl.classList.remove('on');
}

/* ---------- Cuentas ---------- */
function killsOf(target) { return target === 'tower' ? towerState.kills : target === 'dragon' ? enemyState.kills : 0; }
function objById(id) { return MS.objs.find(o => o.id === id); }
/* ¿(x, z) está dentro del área de la misión, con un margen hacia dentro? (sin área: siempre) */
function inMissionArea(x, z, margin) {
  const A = mission.area; return !A || Math.hypot(x - A.x, z - A.z) <= A.r - (margin || 0);
}
/* Lleva (x, z) dentro del área (al borde menos el margen) si está fuera. Escribe en out. */
function clampToArea(x, z, margin, out) {
  out.x = x; out.z = z;
  const A = mission.area; if (!A) return out;
  const d = Math.hypot(x - A.x, z - A.z), r = Math.max(0, A.r - (margin || 0));
  if (d > r) { const k = r / d; out.x = A.x + (x - A.x) * k; out.z = A.z + (z - A.z) * k; }
  return out;
}

/* ---------- Cada fotograma ---------- */
function missionUpdate(dt) {
  if (MS.ended) return;
  MS.t += dt;
  updateRadio(dt);
  // objetivos
  for (const o of MS.objs) {
    o.n = killsOf(o.target);
    if (o.shown && !o.done && o.n >= o.count) { o.done = true; toast('Objetivo cumplido  ·  ' + o.text); sfx.locked(); }
  }
  // eventos
  const evs = mission.events || [];
  for (let i = 0; i < evs.length; i++) {
    const ev = evs[i], key = ev.id || i, last = MS.fired.get(key);
    if (last != null && !(ev.repeat && MS.t - last >= ev.repeat)) continue;
    if (!eventReady(ev.when || {})) continue;
    MS.fired.set(key, MS.t);
    for (const a of ev.do || []) { runAction(a); if (MS.ended) return; }
  }
  // área de la misión: fuera, cuenta atrás; al volver, se anula
  const A = mission.area;
  if (A && state === 'playing') {
    const P = dragon.position, d = Math.hypot(P.x - A.x, P.z - A.z);
    if (!MS.out && d > A.r) { MS.out = true; MS.outT = AREA_GRACE; MS.tick = -1; sfx.warnLock(); }
    else if (MS.out && d < A.r - AREA_HYST) { MS.out = false; toast('De vuelta en el área de la misión'); }
    if (MS.out) {
      MS.outT -= dt;
      const s = Math.max(0, Math.ceil(MS.outT));
      if (s !== MS.tick) { MS.tick = s; areaCountEl.textContent = String(s); if (s > 0) sfx.areaTick(s); }
      const edge = 'Vuelve a la zona  ·  ' + fmtDist(Math.max(0, d - A.r));
      if (edge !== MS.edge) { MS.edge = edge; areaEdgeEl.textContent = edge; }
      if (MS.outT <= 0) { missionFail('Abandonaste el área de la misión'); return; }
    }
  }
  areaEl.classList.toggle('on', MS.out && state === 'playing');
  // tiempo límite
  if (mission.timeLimit && MS.t >= mission.timeLimit) { missionFail('Se acabó el tiempo'); return; }
  // final: todos los objetivos necesarios cumplidos → resultados tras MISSION_END_DELAY
  if (mission.autoWin !== false && MS.objs.length && MS.objs.every(o => o.optional || o.done)) missionWin(MISSION_END_DELAY);
  if (MS.endAt && MS.t >= MS.endAt) { MS.ended = true; missionHideHUD(); showResult(true); }
}
function eventReady(w) {
  if (w.t != null && MS.t < w.t) return false;
  if (w.kills) for (const k in w.kills) if (killsOf(k) < w.kills[k]) return false;
  if (w.done) for (const id of w.done) { const o = objById(id); if (!o || !o.done) return false; }
  if (w.pending) for (const id of w.pending) { const o = objById(id); if (o && o.done) return false; }
  if (w.hp != null && !(state === 'playing' && F.health < w.hp)) return false;
  if (w.inside && !(state === 'playing' && Math.hypot(dragon.position.x - w.inside.x, dragon.position.z - w.inside.z) <= w.inside.r)) return false;
  if (w.after) { const ft = MS.fired.get(w.after.event); if (ft == null || MS.t - ft < (w.after.t || 0)) return false; }
  return true;
}
function runAction(a) {
  if (a.say) radioSay(a.say[0], a.say[1], a.say[2]);
  if (a.show) { const o = objById(a.show); if (o && !o.shown) { o.shown = true; toast('Nuevo objetivo  ·  ' + o.text); sfx.lock(); } }
  if (a.toast) toast(a.toast);
  if (a.dragons) RUN.dragons.total += a.dragons;           // refuerzos: van saliendo según caen los que hay en el aire
  if (a.win != null) missionWin(a.win === true ? MISSION_END_DELAY : a.win);
  if (a.fail) missionFail(a.fail);
}

/* ---------- Final ---------- */
function missionWin(delay) { if (!MS.ended && !MS.endAt) MS.endAt = MS.t + (delay || 0); }
function missionFail(why) {
  if (MS.ended || MS.endAt) return;                        // con los objetivos ya cumplidos no se puede fallar
  MS.ended = true; missionHideHUD(); showResult(false, why);
}
/* Al acabar la caída (2,6 s): reaparecer o fallar, según la misión. Con la misión ya cumplida, se espera a los resultados. */
function missionDeath() {
  if (mission.death !== 'fail') respawn();
  else if (!MS.endAt) missionFail(F.deadWhy || 'Te derribaron');
}

/* ---------- Radio ----------
   Un mensaje cada vez, abajo en el centro: icono (provisional: una letra en el color del personaje), nombre y texto. Duración: la del
   evento o, si no, según lo largo del texto. Los que llegan mientras habla otro esperan su turno. */
function radioSay(who, text, dur) {
  const c = (mission.radio && mission.radio[who]) || { name: who, color: '#f2b84b', icon: String(who || '?').charAt(0).toUpperCase() };
  MS.radio.push({ c, text, dur: dur || clamp(2.2 + text.length * 0.055, 3, 9) });
}
function updateRadio(dt) {
  MS.radioT -= dt;
  if (MS.radioT > 0) return;
  if (MS.radioOn) { MS.radioOn = false; radioEl.classList.remove('on'); MS.radioT = RADIO_GAP; return; }   // pausa entre mensajes
  const m = MS.radio.shift(); if (!m) return;
  radioIconEl.textContent = m.c.icon || '?'; radioIconEl.style.background = m.c.color || '#f2b84b';
  radioNameEl.textContent = m.c.name; radioNameEl.style.color = m.c.color || '#f2b84b'; radioEl.style.borderLeftColor = m.c.color || '#f2b84b';
  radioTextEl.textContent = m.text;
  radioEl.classList.add('on'); MS.radioOn = true; MS.radioT = m.dur; sfx.radio();
}
