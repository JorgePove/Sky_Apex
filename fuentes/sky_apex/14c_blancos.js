
/* ============================================================
   6d. BLANCOS: TODO LO DESTRUIBLE CON LA MISMA FORMA (v21)
   Torres (cada sitio de TOWER_SITES), dragones enemigos y dirigibles comparten { kind ('tower' | 'dragon' | 'airship'), pos, vel, dead,
   tags }, así que las misiones los cuentan por tipo o por etiqueta (missionKill, M2), se fijan igual y la bola guiada persigue a cualquiera.
   · Los tipos nuevos (estructuras, soldados, jefes) solo tienen que tener esa forma, una entrada en BLANCO y aparecer en eachTarget.
     v29: así entran las unidades nuevas de 6f (artillería, batallones, barcos, superdirigibles y sus torretas, la sierpe y sus hechiceros).
   · TGT: lo es todo lo que cuenta para un objetivo de la misión visible, sin cumplir y no opcional (isTgt). Se marca «TGT» en el HUD y
     destaca en el radar; lo demás se ve, pero no cuenta para ganar.
   · Fijar (clic central, cycleTarget): cualquier blanco a la vista (torres y dirigibles a menos de LOCK_STATIC_RANGE). v31: primero el más
     cercano a la mira en pantalla (antes, los TGT de más cerca a más lejos: con muchos blancos había que pasar por todos). Si apuntas a otro
     sitio, el clic fija lo que tienes en la mira; si sigues apuntando al mismo sitio (menos de LOCK_CYCLE.ang, en LOCK_CYCLE.t s), cada clic
     pasa al siguiente más cercano a la mira. Si el único es el fijado, se libera.
   ============================================================ */
const BLANCO = {                          // nombre (avisos) y medio tamaño (m): recuadro del fijado y círculo de la bola guiada
  tower: { name: 'Torre', half: TOWER_TOP * 0.5 },
  dragon: { name: 'Dragón', half: ENEMY_SCALE * 30 },
  airship: { name: 'Dirigible', half: AIRSHIP_LEN * 0.5 },
  // v29: unidades nuevas (6f); su medio tamaño va en cada una (t.half: depende de la stat «largo» y de los soldados)
  artilleria: { name: 'Artillería', half: 6 }, batallon: { name: 'Batallón', half: 20 }, barco: { name: 'Barco', half: 55 },
  superdirigible: { name: 'Superdirigible', half: 175 }, torreta: { name: 'Torreta', half: 12 }, sierpe: { name: 'Sierpe', half: 40 }, hechicero: { name: 'Hechicero', half: 7 }
};
const LOCK_STATIC_RANGE = 6000;           // torres y dirigibles se fijan hasta esta distancia (los dragones, a cualquiera, como antes)
const targetHalf = t => t.half || (BLANCO[t.kind] || BLANCO.dragon).half;
/* Recorre los blancos en pie. */
function eachTarget(fn) {
  for (const s of TOWER_SITES) if (!s.dead) fn(s);
  for (const e of enemies) if (!e.dead && !e.off) fn(e);
  for (const a of airships) if (!a.dead) fn(a);
  for (const u of UNITS) if (!u.dead) fn(u);                // v29: unidades nuevas (también las torretas y los hechiceros, una a una)
}
/* ¿El blanco t cumple la selección de un objetivo o condición? { target: tipo, tag: etiqueta } (las dos, si están). */
function matchSel(sel, t) { return (!sel.target || sel.target === t.kind) && (!sel.tag || (!!t.tags && t.tags.includes(sel.tag))); }
function isTgt(t) {
  if (MS.ended) return false;
  for (const o of MS.objs) if (o.shown && !o.done && !o.optional && matchSel(o, t)) return true;
  return false;
}
function releaseLock(t) { if (enemyLock.e === t) enemyLock.e = null; }
const _Ln = { x: 0, y: 0 }, _La = { x: 0, y: 0 }, _Lc = new THREE.Vector3();
const LOCK_CYCLE = { t: 3, ang: 0.05 };                    // v31: seguir pasando de blanco si el clic llega antes de t s y con la mira a menos de ang rad de la anterior
const lockCycle = { t: -99, aim: new THREE.Vector3() };
function cycleTarget() {
  if (state !== 'playing') return;
  const P = dragon.position, cand = [], asp = camera.aspect;
  camera.getWorldPosition(_Lc); _Lc.addScaledVector(F.aimWorld, 1000);   // la mira en pantalla
  if (!enemyNdc({ pos: _Lc }, _La)) { _La.x = 0; _La.y = 0; }
  eachTarget(t => {
    const d = t.pos.distanceTo(P);
    if (t.kind !== 'dragon' && d > (t.lockRange || LOCK_STATIC_RANGE)) return;   // (v29: el superdirigible y la sierpe, desde más lejos)
    if (!enemyNdc(t, _Ln) || Math.abs(_Ln.x) >= 0.98 || Math.abs(_Ln.y) >= 0.98) return;
    cand.push({ t, d, tgt: isTgt(t), s: Math.hypot((_Ln.x - _La.x) * asp, _Ln.y - _La.y) });
  });
  if (!cand.length) { sfx.empty(); toast('Ningún blanco a la vista'); return; }
  cand.sort((a, b) => a.s - b.s);                           // v31: el más cercano a la mira primero
  const again = gameTime - lockCycle.t < LOCK_CYCLE.t && F.aimWorld.angleTo(lockCycle.aim) < LOCK_CYCLE.ang;
  lockCycle.t = gameTime; lockCycle.aim.copy(F.aimWorld);
  const i = cand.findIndex(c => c.t === enemyLock.e);
  const next = again && i >= 0 ? cand[(i + 1) % cand.length] : cand[0] !== cand[i] ? cand[0] : cand[1 % cand.length];   // (apuntando al mismo sitio: el siguiente)
  if (next.t === enemyLock.e) { enemyLock.e = null; sfx.beep(); toast('Objetivo liberado'); }
  else { enemyLock.e = next.t; sfx.lock(); toast('Objetivo fijado  ·  ' + (next.tgt ? 'TGT  ·  ' : '') + (next.t.label || BLANCO[next.t.kind].name) + '  ·  ' + fmtDist(next.d)); }
}
