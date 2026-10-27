
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
  t: 0, objs: [], fired: new Map(), ended: true, endAt: 0, kills: {}, planned: {},       // v21: destruidos por tipo y etiqueta; cuántos hay por etiqueta
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
const tagList = t => t ? [].concat(t) : [];
function missionSetup(id) {
  missionId = MISSIONS[id] ? id : 'libre'; mission = MISSIONS[missionId];
  const T = mission.towers || {}, D = mission.dragons || {}, A = mission.airships || {};
  RUN.world = missionWorld(mission);                       // v19: semilla, bioma y punto de partida (M3)
  const center = [RUN.world.start.x, RUN.world.start.z];
  RUN.towers = { total: T.total || 0, zone: (T.zone || TOWER_ZONE).slice(), islands: (T.islands || [0, 0]).slice(),
    center, random: !!T.random, sites: (T.sites || []).slice(), tags: tagList(T.tag) };
  RUN.dragons = { total: D.total || 0, atOnce: Math.min(D.atOnce || 0, D.total || 0), tags: tagList(D.tag) };
  RUN.airships = { total: A.total || 0, zone: (A.zone || AIRSHIP_ZONE).slice(), alt: (A.alt || AIRSHIP_ALT).slice(),   // v21: dirigibles (6c)
    center: center.slice(), random: !!A.random, sites: (A.sites || []).slice(), tags: tagList(A.tag) };
}
function missionStart() {
  MS.t = 0; MS.fired.clear(); MS.ended = false; MS.endAt = 0; MS.out = false; MS.outT = AREA_GRACE; MS.tick = -1;
  MS.kills = {}; MS.planned = {};
  MS.objs = (mission.objectives || []).map(o => Object.assign({}, o, { hud: o.hud || o.text.toUpperCase(), n: 0, done: false, shown: !o.hidden }));
  for (const o of MS.objs) if (o.count == null) o.count = plannedCount(o);   // v21: sin count, todos los de la misión que cumplen su selección
  missionHideHUD();
  const goal = MS.objs.filter(o => o.shown && !o.optional).map(o => o.count + ' ' + o.hud.toLowerCase()).join(' y ');
  toast(mission.free ? 'Objetivo: ' + goal : mission.name);
}
/* Fin de la partida (resultados, menú o reinicio): fuera la radio y el aviso del área. */
function missionHideHUD() {
  MS.radio.length = 0; MS.radioT = 0; MS.radioOn = false; radioEl.classList.remove('on');
  areaEl.classList.remove('on');
}

/* ---------- Cuentas ----------
   v21: cada blanco destruido (torre, dragón, dirigible; ver 6d) suma en MS.kills por su tipo y por cada etiqueta, y en los objetivos
   cuya selección cumple ({ target, tag }). plannedCount = cuántos hay en la misión con esa selección (torres y dirigibles colocados,
   dragones del total y de los escuadrones de la receta, salgan o no). */
function missionKill(t) {
  if (MS.ended) return;
  const K = MS.kills; K[t.kind] = (K[t.kind] || 0) + 1;
  for (const tag of t.tags || []) K[tag] = (K[tag] || 0) + 1;
  for (const o of MS.objs) if (matchSel(o, t)) o.n++;
}
const squadTags = (id, q) => [q.tag || id];
function plannedCount(sel) {
  let n = 0;
  for (const s of TOWER_SITES) if (matchSel(sel, s)) n++;
  for (const a of airships) if (matchSel(sel, a)) n++;
  if (matchSel(sel, { kind: 'dragon', tags: RUN.dragons.tags })) n += RUN.dragons.total;
  const Q = mission.squads || {};
  for (const id in Q) if (matchSel(sel, { kind: 'dragon', tags: squadTags(id, Q[id]) })) n += Q[id].n || 1;
  return n;
}
/* ¿Destruidos todos los de esa etiqueta? (si la misión no tiene ninguno, no) */
function clearedTag(tag) {
  if (MS.planned[tag] == null) MS.planned[tag] = plannedCount({ tag });
  return MS.planned[tag] > 0 && (MS.kills[tag] || 0) >= MS.planned[tag];
}
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
  for (const o of MS.objs) {                               // (o.n lo lleva missionKill)
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
  if (w.kills) for (const k in w.kills) if ((MS.kills[k] || 0) < w.kills[k]) return false;   // (v21: por tipo o por etiqueta)
  if (w.cleared) for (const tag of [].concat(w.cleared)) if (!clearedTag(tag)) return false;
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
  if (a.squad) for (const id of [].concat(a.squad)) spawnSquad(id);   // v21: escuadrón de la receta (squads), todos a la vez
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
