
/* ============================================================
   M2. MISIONES: MOTOR (v15)
   Ejecuta la receta de M1: prepara la partida (torres y dragones → RUN), lleva la cuenta de los objetivos, dispara los eventos,
   muestra la radio, vigila el área de la misión (barrera invisible con cuenta atrás) y decide el final: MISIÓN CUMPLIDA o FALLIDA
   (pantalla de resultados, showResult).
   · chooseMission(id): los botones del menú → «Elige tu dragón» → startGame.
   · missionSetup(id): al empezar, antes de resetRun (v19: si la misión trae otro mundo, startGame lo genera antes, M3). missionStart(): tras spawnEnemies.
   · missionUpdate(dt): cada fotograma de partida (desde updateFlight) y, muerto, desde el bucle. missionDeath(): al acabar la caída.
   · missionFail(motivo) / missionWin(espera): final.
   v34 (Capítulo 1): señales (missionSignal: el portal, el rayo del superdirigible…), radio con voz grabada y subtítulos (19e), pantalla de
   capítulo, entrada de cine que dura hasta que la acaba un evento, oleadas de unidades y más condiciones y acciones (formato en M1).
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
  radio: [], radioT: 0, radioOn: false,                    // cola de mensajes, tiempo del actual (o de la pausa entre dos), ¿se ve?
  sig: {}, cur: null                                       // v34: señales { nombre: { t, n, data } } y el mensaje que suena (con sus subtítulos)
};
const radioEl = document.getElementById('radio'), radioIconEl = document.getElementById('radioIcon'), radioNameEl = document.getElementById('radioName'), radioTextEl = document.getElementById('radioText');
const areaEl = document.getElementById('area'), areaCountEl = document.getElementById('areaCount'), areaEdgeEl = document.getElementById('areaEdge');

function chooseMission(id) {
  missionId = MISSIONS[id] ? id : 'libre';
  document.getElementById('start').textContent = MISSIONS[missionId].free ? 'Empezar partida' : MISSIONS[missionId].chapter ? 'Empezar capítulo' : 'Empezar misión';
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
  RUN.dragons = { total: D.total || 0, atOnce: Math.min(D.atOnce || 0, D.total || 0), tags: tagList(D.tag), escort: !!D.escort };   // (v23: escort = con la flota)
  RUN.airships = { total: A.total || 0, zone: (A.zone || AIRSHIP_ZONE).slice(), alt: (A.alt || AIRSHIP_ALT).slice(),   // v21: dirigibles (6c)
    center: center.slice(), random: !!A.random, sites: (A.sites || []).slice(), tags: tagList(A.tag), fleet: A.fleet ? Object.assign({}, A.fleet) : null };   // (v23: fleet = en movimiento)
  RUN.units = (mission.units || []).map(g => Object.assign({}, g));   // v29: unidades nuevas (6f)
}
/* v23: flota que escapa (airships.escape: 'fail'): si un dirigible sale del área, MISIÓN FALLIDA. airshipEdgeDist = cuánto le falta al
   que está más cerca del borde (HUD «BORDE» y condición airshipEdge de los eventos). */
const fleetEscapes = () => !!(mission.airships && mission.airships.escape === 'fail' && mission.area);
function airshipEdgeDist() {
  const A = mission.area; if (!A) return Infinity;
  let d = Infinity; for (const a of airships) if (!a.dead) d = Math.min(d, A.r - Math.hypot(a.pos.x - A.x, a.pos.z - A.z));
  return d;
}
function missionStart() {
  MS.t = 0; MS.fired.clear(); MS.ended = false; MS.endAt = 0; MS.out = false; MS.outT = AREA_GRACE; MS.tick = -1;
  MS.kills = {}; MS.planned = {}; MS.sig = {};
  unitsStart();                                            // v29: dragones quietos de la galería (tras spawnEnemies)
  MS.objs = (mission.objectives || []).map(o => Object.assign({}, o, { hud: o.hud || o.text.toUpperCase(), n: 0, done: false, shown: !o.hidden }));
  for (const o of MS.objs) if (o.count == null) { o.count = plannedCount(o); o.auto = true; }   // v21: sin count, todos los de la misión que cumplen su selección (v34: se recuenta al mostrarlo)
  missionHideHUD();
  storyStart();                                            // v34: voces, pantalla de capítulo, fundido y reacciones (19e)
  allyStart();                                             // v23: compañero de escuadrón (6e), si la receta lo trae (v34: varios)
  const goal = MS.objs.filter(o => o.shown && !o.optional).map(o => o.count + ' ' + o.hud.toLowerCase()).join(' y ');
  const I = mission.intro, intro = I != null ? I : CINE_T;   // v26: entrada de cine (15_vuelo_estado.js), con el nombre de la misión
  if (I && typeof I === 'object') cineStart(Infinity, mission.name, mission.place, { title: I.title, shots: I.shots, skip: true });   // v34: hasta que la acaba un evento («cine: 'end'»), con planos de cámara
  else if (intro > 0) cineStart(intro, mission.name, mission.free ? 'Objetivo: ' + goal : mission.place);
  else toast(mission.free && goal ? 'Objetivo: ' + goal : mission.name + (mission.dev ? '  ·  Tab: panel de pruebas' : ''));
  if (mission.card) cardStart(mission.card);               // v34: pantalla de capítulo en negro (19e), encima de la entrada de cine
}
/* Fin de la partida (resultados, menú o reinicio): fuera la radio y el aviso del área. */
function missionHideHUD() {
  MS.radio.length = 0; MS.radioT = 0; MS.radioOn = false; radioEl.classList.remove('on'); MS.cur = null; voiceStop();
  areaEl.classList.remove('on');
}
/* v34: una señal de otro módulo (el portal, el rayo del superdirigible…) para las condiciones de los eventos (signal). */
function missionSignal(name, data) {
  const s = MS.sig[name] || (MS.sig[name] = { t: 0, n: 0, data: null });
  s.t = MS.t; s.n++; s.data = data;
}
const radioQuiet = () => !MS.radioOn && !MS.radio.length;

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
  for (const u of UNITS) if (matchSel(sel, u)) n++;        // v29: unidades nuevas (también torretas y hechiceros, cada uno)
  for (const e of enemies) if (e.statue && matchSel(sel, e)) n++;
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
    if (o.shown && !o.done && o.n >= o.count) { o.done = true; o.doneT = MS.t; toast('Objetivo cumplido  ·  ' + txt(o.text)); sfx.locked(); }
  }
  if (MS.card && MS.card.on) cardUpdate(dt);               // v34: pantalla de capítulo (19e)
  // eventos
  const evs = mission.events || [];
  for (let i = 0; i < evs.length; i++) {
    const ev = evs[i], key = ev.id || i, last = MS.fired.get(key), sg = ev.each && ev.when && MS.sig[ev.when.signal];
    if (last != null && !(ev.repeat && MS.t - last >= ev.repeat) && !(sg && sg.t > last)) continue;   // (v34: each = otra vez cada vez que llega su señal)
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
  // v23: un dirigible de la flota sale del área
  if (fleetEscapes() && airshipEdgeDist() < 0) { missionFail('Un dirigible escapó de la zona'); return; }
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
  if (w.airshipEdge != null && !(airshipEdgeDist() < w.airshipEdge)) return false;   // v23: algún dirigible a menos de esos m del borde
  if (w.done) for (const id of w.done) { const o = objById(id); if (!o || !o.done) return false; }
  if (w.pending) for (const id of w.pending) { const o = objById(id); if (o && o.done) return false; }
  if (w.hp != null && !(state === 'playing' && F.health < w.hp)) return false;
  if (w.inside && !(state === 'playing' && Math.hypot(dragon.position.x - w.inside.x, dragon.position.z - w.inside.z) <= w.inside.r)) return false;
  if (w.after) { const ft = MS.fired.get(w.after.event); if (ft == null || MS.t - ft < (w.after.t || 0)) return false; }
  // v34
  if (w.card && !(MS.card && MS.card.done)) return false;  // la pantalla de capítulo ya se fue
  if (w.quiet && !radioQuiet()) return false;              // nadie hablando ni esperando turno en la radio
  if (w.engaged && !enemyState.engaged[w.engaged]) return false;   // ese escuadrón ya ha roto la formación y ataca
  if (w.calm && enemyState.engaged[w.calm] !== false) return false;   // ese escuadrón está en el aire y aún no ataca
  if (w.close) { let ok = false; for (const e of enemies) if (!e.dead && !e.off && e.squad === w.close.squad && e.pos.distanceTo(dragon.position) < w.close.d) ok = true; if (!ok) return false; }
  if (w.signal) { const s = MS.sig[w.signal]; if (!s || (w.n != null && s.n !== w.n) || (w.nMin != null && s.n < w.nMin)) return false; }
  if (w.near) { let ok = false; for (const u of UNITS) if (!u.dead && matchSel(w.near, u) && Math.hypot(u.pos.x - dragon.position.x, u.pos.z - dragon.position.z) < w.near.d) ok = true; if (!ok) return false; }
  if (w.unitHp) { const u = UNITS.find(x => !x.dead && matchSel(w.unitHp, x)); if (!u || u.hp / u.hpMax >= w.unitHp.below) return false; }
  return true;
}
function runAction(a) {
  if (a.hush) MS.radio.length = 0;                         // v34: fuera los mensajes que esperaban turno (lo que pasa ahora manda)
  if (a.spawn) unitsWave(a.spawn);                         // v34: oleada de unidades (grupos de units con wave)
  if (a.say) radioSay(a.say[0], a.say[1], a.say[2], a.voice);   // (v34: voice = voz grabada, 19e)
  if (a.sayFor) { const s = MS.sig[a.sayFor.signal], L = s && a.sayFor.lines[s.data]; if (L) radioSay(L[0], L[1]); }   // v34: según el dato de una señal
  if (a.show) { const o = objById(a.show); if (o && !o.shown) { o.shown = true; if (o.auto) o.count = plannedCount(o); toast('Nuevo objetivo  ·  ' + txt(o.text)); sfx.lock(); } }
  if (a.toast) toast(a.toast);
  if (a.dragons) RUN.dragons.total += a.dragons;           // refuerzos: van saliendo según caen los que hay en el aire
  if (a.squad) for (const id of [].concat(a.squad)) spawnSquad(id);   // v21: escuadrón de la receta (squads), todos a la vez
  if (a.engage) for (const id of [].concat(a.engage)) squadEngage(id);   // v34: el escuadrón rompe la formación y ataca
  if (a.portal) portalOpen(a.portal);                      // v34: el portal arcano (6i)
  if (a.cine) storyCine(a.cine);                           // v34: 'end' = acaba la entrada de cine; { … } = otra (19e)
  if (a.music) storyMusic(a.music);                        // v34: 'tension' = la música de tensión
  if (a.fade) fadeBlack(a.fade);                           // v34: fundido a negro (s)
  if (a.chatter != null) STORY.chatter = !!a.chatter;      // v34: reacciones de los compañeros (19e), sí o no
  if (a.hint) hintShow(txt(a.hint));                       // v34: consejo en pantalla (más largo que un aviso)
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
   evento o, si no, según lo largo del texto. Los que llegan mientras habla otro esperan su turno.
   v34: el texto puede venir en dos idiomas ({ en, es }: los subtítulos van en el de Opciones, txt) y con voz grabada (voice: su id en
   VOICES, 19e): entonces dura lo que la voz y el texto sale en trozos (frases) a lo largo de ella, como subtítulos. */
function radioSay(who, text, dur, voice) {
  const c = (mission.radio && mission.radio[who]) || { name: who, color: '#f2b84b', icon: String(who || '?').charAt(0).toUpperCase() };
  MS.radio.push({ c, text, voice: voice || null, wait: 0, dur: dur || clamp(2.2 + txt(text).length * 0.055, 3, 9) });
}
function updateRadio(dt) {
  MS.radioT -= dt;
  if (MS.cur) radioSubs(MS.cur);
  if (MS.radioT > 0) return;
  if (MS.radioOn) { MS.radioOn = false; radioEl.classList.remove('on'); MS.radioT = RADIO_GAP; MS.cur = null; voiceStop(); return; }   // pausa entre mensajes
  const m = MS.radio[0]; if (!m) return;
  if (m.voice && voiceState(m.voice) === 'loading' && m.wait < 5) { m.wait += dt; return; }   // (v34: la voz aún se está decodificando)
  MS.radio.shift();
  radioIconEl.textContent = m.c.icon || '?'; radioIconEl.style.background = m.c.color || '#f2b84b';
  radioNameEl.textContent = m.c.name + (m.c.tag ? '  ·  ' + m.c.tag : ''); radioNameEl.style.color = m.c.color || '#f2b84b'; radioEl.style.borderLeftColor = m.c.color || '#f2b84b';   // (v34: tag = su designación, «Paladin 1»)
  const vd = m.voice ? voicePlay(m.voice) : 0;             // v34: la voz grabada (si está): el mensaje dura lo que ella
  if (vd > 0) m.dur = vd + 0.35;
  m.t0 = MS.t; m.chunks = subChunks(txt(m.text), vd > 0 ? vd : m.dur); m.ci = -1;
  MS.cur = m; radioSubs(m);
  radioEl.classList.add('on'); MS.radioOn = true; MS.radioT = m.dur; sfx.radio();
}
/* v34: el trozo de subtítulo que toca según el tiempo del mensaje. */
function radioSubs(m) {
  const t = MS.t - m.t0; let i = 0;
  while (i < m.chunks.length - 1 && t >= m.chunks[i + 1].t) i++;
  if (i !== m.ci) { m.ci = i; radioTextEl.textContent = m.chunks[i].s; }
}
