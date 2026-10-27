
/* ============================================================
   6d. BLANCOS: TODO LO DESTRUIBLE CON LA MISMA FORMA (v21)
   Torres (cada sitio de TOWER_SITES), dragones enemigos y dirigibles comparten { kind ('tower' | 'dragon' | 'airship'), pos, vel, dead,
   tags }, así que las misiones los cuentan por tipo o por etiqueta (missionKill, M2), se fijan igual y la bola guiada persigue a cualquiera.
   · Los tipos nuevos (estructuras, soldados, jefes) solo tienen que tener esa forma, una entrada en BLANCO y aparecer en eachTarget.
   · TGT: lo es todo lo que cuenta para un objetivo de la misión visible, sin cumplir y no opcional (isTgt). Se marca «TGT» en el HUD y
     destaca en el radar; lo demás se ve, pero no cuenta para ganar.
   · Fijar (clic central, cycleTarget): cualquier blanco a la vista (torres y dirigibles a menos de LOCK_STATIC_RANGE); primero los TGT,
     de más cerca a más lejos. Cada clic pasa al siguiente; si el único es el fijado, se libera.
   ============================================================ */
const BLANCO = {                          // nombre (avisos) y medio tamaño (m): recuadro del fijado y círculo de la bola guiada
  tower: { name: 'Torre', half: TOWER_TOP * 0.5 },
  dragon: { name: 'Dragón', half: ENEMY_SCALE * 30 },
  airship: { name: 'Dirigible', half: AIRSHIP_LEN * 0.5 }
};
const LOCK_STATIC_RANGE = 6000;           // torres y dirigibles se fijan hasta esta distancia (los dragones, a cualquiera, como antes)
const targetHalf = t => (BLANCO[t.kind] || BLANCO.dragon).half;
/* Recorre los blancos en pie. */
function eachTarget(fn) {
  for (const s of TOWER_SITES) if (!s.dead) fn(s);
  for (const e of enemies) if (!e.dead && !e.off) fn(e);
  for (const a of airships) if (!a.dead) fn(a);
}
/* ¿El blanco t cumple la selección de un objetivo o condición? { target: tipo, tag: etiqueta } (las dos, si están). */
function matchSel(sel, t) { return (!sel.target || sel.target === t.kind) && (!sel.tag || (!!t.tags && t.tags.includes(sel.tag))); }
function isTgt(t) {
  if (MS.ended) return false;
  for (const o of MS.objs) if (o.shown && !o.done && !o.optional && matchSel(o, t)) return true;
  return false;
}
function releaseLock(t) { if (enemyLock.e === t) enemyLock.e = null; }
const _Ln = { x: 0, y: 0 };
function cycleTarget() {
  if (state !== 'playing') return;
  const P = dragon.position, cand = [];
  eachTarget(t => {
    const d = t.pos.distanceTo(P);
    if (t.kind !== 'dragon' && d > LOCK_STATIC_RANGE) return;
    if (!enemyNdc(t, _Ln) || Math.abs(_Ln.x) >= 0.98 || Math.abs(_Ln.y) >= 0.98) return;
    cand.push({ t, d, tgt: isTgt(t) });
  });
  if (!cand.length) { sfx.empty(); toast('Ningún blanco a la vista'); return; }
  cand.sort((a, b) => (b.tgt - a.tgt) || (a.d - b.d));
  const i = cand.findIndex(c => c.t === enemyLock.e), next = cand[i < 0 ? 0 : (i + 1) % cand.length];
  if (next.t === enemyLock.e) { enemyLock.e = null; sfx.beep(); toast('Objetivo liberado'); }
  else { enemyLock.e = next.t; sfx.lock(); toast('Objetivo fijado  ·  ' + (next.tgt ? 'TGT  ·  ' : '') + BLANCO[next.t.kind].name + '  ·  ' + fmtDist(next.d)); }
}
