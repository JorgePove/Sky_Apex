/* ============================================================
   8. HUD (canvas 2D), BUCLE PRINCIPAL Y ARRANQUE
   ============================================================ */
const hctx = hudEl.getContext('2d');
const C_BONE = '#f1e6d3', C_DIM = 'rgba(241,230,211,.62)', C_EMBER = '#ff7a2e', C_GOLD = '#f2b84b', C_DANGER = '#ff4a3a', C_ARMOR = '#f5d142';   // (v24: armadura)
const FM = n => `${n}px 'Share Tech Mono', ui-monospace, monospace`, FD = n => `700 ${n}px 'Cinzel', Georgia, serif`;
const _pv = new THREE.Vector3(), _camP = new THREE.Vector3(), _sp = { x: 0, y: 0 };
let HW = 1, HH = 1;
function proj(x, y, z, out) {
  _pv.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  if (_pv.z > -0.5) return false;
  _pv.applyMatrix4(camera.projectionMatrix);
  out.x = (_pv.x * 0.5 + 0.5) * HW; out.y = (-_pv.y * 0.5 + 0.5) * HH;
  return true;
}
function hudText(str, x, y, font, color, align) {
  hctx.font = font; hctx.fillStyle = color; hctx.textAlign = align || 'left'; hctx.fillText(str, x, y);
}
const COMPASS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };

function drawCompass(heading) {
  const cw = Math.min(520, HW - 40), cx = HW / 2, cy = 34, ppd = cw / 90;
  hctx.save(); hctx.beginPath(); hctx.rect(cx - cw / 2, cy - 22, cw, 48); hctx.clip();
  hctx.strokeStyle = C_BONE; hctx.lineWidth = 1;
  for (let d = Math.floor(heading - 46); d <= Math.ceil(heading + 46); d++) {
    if (d % 5) continue;
    const x = cx + (d - heading) * ppd, n = ((d % 360) + 360) % 360, big = d % 15 === 0;
    const edge = 1 - Math.pow(Math.abs(x - cx) / (cw / 2), 3);
    hctx.globalAlpha = clamp(edge, 0, 1) * 0.9;
    hctx.beginPath(); hctx.moveTo(x, cy + 6); hctx.lineTo(x, cy + (big ? -4 : 1)); hctx.stroke();
    if (COMPASS[n] !== undefined) hudText(COMPASS[n], x, cy - 9, FM(n % 90 === 0 ? 15 : 12), n === 0 ? C_EMBER : C_BONE, 'center');
  }
  hctx.restore(); hctx.globalAlpha = 1;
  hctx.fillStyle = C_GOLD; hctx.beginPath(); hctx.moveTo(cx, cy + 9); hctx.lineTo(cx - 5, cy + 17); hctx.lineTo(cx + 5, cy + 17); hctx.closePath(); hctx.fill();
  hudText(String(Math.round(heading) % 360).padStart(3, '0') + '°', cx, cy + 34, FM(13), C_GOLD, 'center');
}
function drawLadder(fwd) {
  const hl = Math.hypot(fwd.x, fwd.z);
  let hx, hz; if (hl < 0.05) { hx = 0; hz = -1; } else { hx = fwd.x / hl; hz = fwd.z / hl; }
  const rx = -hz, rz = hx, a = {}, b = {};
  hctx.lineWidth = 1.4;
  for (let d = -60; d <= 60; d += 10) {
    const th = d * Math.PI / 180, dx = hx * Math.cos(th) * 1000, dy = Math.sin(th) * 1000, dz = hz * Math.cos(th) * 1000;
    const wd = d === 0 ? 220 : 70;
    const ok1 = proj(_camP.x + dx + rx * wd, _camP.y + dy, _camP.z + dz + rz * wd, a);
    const ok2 = proj(_camP.x + dx - rx * wd, _camP.y + dy, _camP.z + dz - rz * wd, b);
    if (!ok1 || !ok2) continue;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dist = Math.hypot(mx - HW / 2, my - HH / 2) / (HH * 0.5);
    const al = clamp(1.15 - dist, 0, 1) * (d === 0 ? 0.85 : 0.6);
    if (al <= 0.02) continue;
    hctx.globalAlpha = al; hctx.strokeStyle = d === 0 ? C_GOLD : C_BONE;
    const gap = d === 0 ? 0.18 : 0.30, ux = b.x - a.x, uy = b.y - a.y;
    hctx.beginPath();
    hctx.moveTo(a.x, a.y); hctx.lineTo(a.x + ux * (0.5 - gap), a.y + uy * (0.5 - gap));
    hctx.moveTo(a.x + ux * (0.5 + gap), a.y + uy * (0.5 + gap)); hctx.lineTo(b.x, b.y);
    hctx.stroke();
    if (d !== 0) {
      const tick = d > 0 ? 8 : -8;
      hctx.beginPath(); hctx.moveTo(a.x, a.y); hctx.lineTo(a.x, a.y + tick); hctx.moveTo(b.x, b.y); hctx.lineTo(b.x, b.y + tick); hctx.stroke();
      hudText(String(Math.abs(d)), a.x - 8, a.y + 4, FM(11), C_BONE, 'right');
    }
  }
  hctx.globalAlpha = 1;
}
const _pth = new THREE.Vector3();
function drawMarkers(fwd) {
  const p = {};
  // v28: el marcador pequeño es la trayectoria (hacia dónde va de verdad: su velocidad), no el morro; en hover o muy despacio, el morro.
  // Con él en el 0° de la escalera de cabeceo, vuela horizontal
  const v = F.speed > 20 && F.hoverK < 0.5 && state === 'playing' ? _pth.copy(dragonVel).normalize() : fwd;
  if (proj(_camP.x + v.x * 1000, _camP.y + v.y * 1000, _camP.z + v.z * 1000, p)) {
    hctx.strokeStyle = F.straight ? C_GOLD : C_BONE; hctx.lineWidth = 1.6; hctx.globalAlpha = 0.9;   // (v26: dorado en vuelo recto)
    hctx.beginPath(); hctx.arc(p.x, p.y, 8, 0, 6.283); hctx.moveTo(p.x - 22, p.y); hctx.lineTo(p.x - 8, p.y); hctx.moveTo(p.x + 8, p.y); hctx.lineTo(p.x + 22, p.y); hctx.moveTo(p.x, p.y - 8); hctx.lineTo(p.x, p.y - 15); hctx.stroke();
    if (F.straight) hudText('VUELO RECTO', p.x, p.y - 22, FM(11), C_GOLD, 'center');   // v26: Espacio mantenido (el morro marca la trayectoria fija)
    _sp.x = p.x; _sp.y = p.y;
  } else { _sp.x = HW / 2; _sp.y = HH / 2; }
  const a = {};
  if (proj(_camP.x + F.aimWorld.x * 1000, _camP.y + F.aimWorld.y * 1000, _camP.z + F.aimWorld.z * 1000, a)) {
    const hot = W.cool > 0, off = !weaponsReady(), col = off ? 'rgba(176,178,182,.85)' : hot ? C_GOLD : C_EMBER;
    if (Math.hypot(a.x - _sp.x, a.y - _sp.y) > 26) { hctx.globalAlpha = 0.35; hctx.strokeStyle = C_EMBER; hctx.lineWidth = 1; hctx.beginPath(); hctx.moveTo(_sp.x, _sp.y); hctx.lineTo(a.x, a.y); hctx.stroke(); }
    hctx.globalAlpha = 1; hctx.strokeStyle = col; hctx.lineWidth = 2;
    hctx.beginPath(); hctx.arc(a.x, a.y, 15, 0, 6.283); hctx.stroke();
    hctx.beginPath(); hctx.moveTo(a.x - 25, a.y); hctx.lineTo(a.x - 15, a.y); hctx.moveTo(a.x + 15, a.y); hctx.lineTo(a.x + 25, a.y);
    hctx.moveTo(a.x, a.y + 15); hctx.lineTo(a.x, a.y + 25); hctx.stroke();
    hctx.fillStyle = col; hctx.beginPath(); hctx.arc(a.x, a.y, 2.2, 0, 6.283); hctx.fill();
    // cargas de escudo: rayas azules bajo la mira (la que está en uso se vacía mientras dura; las usadas, negras)
    for (let i = 0; i < SHIELD_MAX; i++) {
      const x = a.x - (SHIELD_MAX * 15 - 2) / 2 + i * 15, y = a.y + 33;   // (v24: centradas, sean las que sean)
      hctx.fillStyle = 'rgba(4,6,10,.88)'; hctx.fillRect(x - 1, y - 1, 15, 6);
      const f = i < W.shield ? 1 : i === W.shield && W.shieldT > 0 ? W.shieldT / SHIELD_T : 0;
      if (f > 0) { hctx.fillStyle = i < W.shield ? '#3fa9ff' : '#9fd8ff'; hctx.fillRect(x, y, 13 * f, 4); }
    }
    // calor de la llamarada: arco a la derecha de la mira que se llena de abajo arriba (como el calor de las armas de Star Citizen)
    if (W.heat > 0.01 || W.overheat > 0) {
      const A0 = 0.9, r = 32;
      hctx.lineWidth = 4; hctx.strokeStyle = 'rgba(13,10,15,.5)'; hctx.beginPath(); hctx.arc(a.x, a.y, r, A0, -A0, true); hctx.stroke();
      hctx.globalAlpha = W.overheat > 0 ? 0.55 + 0.45 * Math.sin(gameTime * 12) : 1;
      hctx.strokeStyle = W.overheat > 0 || W.heat > 0.85 ? C_DANGER : W.heat > 0.6 ? C_EMBER : C_BONE; hctx.lineWidth = 2.5;
      hctx.beginPath(); hctx.arc(a.x, a.y, r, A0, A0 - 2 * A0 * clamp(W.heat, 0, 1), true); hctx.stroke();
      if (W.overheat > 0) hudText('SOBRECALENTADO  ' + W.overheat.toFixed(1) + ' s', a.x, a.y + 50, FM(13), C_DANGER, 'center');
      hctx.globalAlpha = 1;
    }
  }
  hctx.globalAlpha = 1;
}
/* Marcador de triángulo rojo sobre cada dragón enemigo (visible a cualquier distancia) con distancia y vida restante.
   El blanco fijado (clic central) lleva además un cuadrado dorado; si sale de pantalla, una flecha en el borde indica hacia dónde está.
   v21: «TGT» delante de la distancia en los que cuentan para la misión (los demás, más apagados); rombo rojo sobre cada dirigible (hasta
   AIRSHIP_DRAW) y, sobre las torres TGT a menos de LOCK_STATIC_RANGE, una marca con «TGT» (las demás solo tienen su cristal). */
const C_TGT = '#ff6a4a';
function drawLockBox(t, a, d) {                            // recuadro dorado del blanco fijado; devuelve su medio lado (px)
  const pxm = HH / (2 * d * Math.tan(camera.fov * Math.PI / 360)), half = clamp(targetHalf(t) * pxm, 17, 96);
  hctx.globalAlpha = 1; hctx.strokeStyle = C_GOLD; hctx.lineWidth = 2;
  hctx.strokeRect(a.x - half, a.y - half, half * 2, half * 2);
  hctx.lineWidth = 3.5; hctx.beginPath();                                         // esquinas reforzadas
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = a.x + sx * half, cy = a.y + sy * half, l = Math.min(10, half * 0.45);
    hctx.moveTo(cx - sx * l, cy); hctx.lineTo(cx, cy); hctx.lineTo(cx, cy - sy * l);
  }
  hctx.stroke();
  return half;
}
function hpBar(x, y, f) {
  hctx.fillStyle = 'rgba(241,230,211,.28)'; hctx.fillRect(x - 15, y, 30, 4);
  hctx.fillStyle = C_DANGER; hctx.fillRect(x - 15, y, 30 * clamp(f, 0, 1), 4);
}
const onScreenAt = a => a.x > 20 && a.x < HW - 20 && a.y > 20 && a.y < HH - 20, nearScreen = a => a.x > -30 && a.x < HW + 30 && a.y > -30 && a.y < HH + 30;
function drawEnemyMarkers() {
  const a = {}, lock = enemyLock.e;
  let lockShown = false;
  for (const e of enemies) {
    if (e.dead || e.off) continue;
    const d = e.pos.distanceTo(_camP), locked = e === lock, tgt = isTgt(e);
    if (d > (e.squad ? 15000 : 9000) || !proj(e.pos.x, e.pos.y, e.pos.z, a)) continue;   // (v34: los escuadrones, desde más lejos)
    const onScreen = onScreenAt(a);
    if (!onScreen && !nearScreen(a)) continue;
    let top = 14, half = 0;
    if (locked && onScreen) { lockShown = true; half = drawLockBox(e, a, d); top = half + 6; }
    const s = 6 + 5 * (1 - smooth(250, 3000, d)), x = a.x, ay = a.y - top, by = ay - s * 1.7;
    hctx.globalAlpha = locked ? 1 : !tgt ? 0.6 : e.mode === 'patrol' ? 0.82 : 1;
    hctx.fillStyle = C_DANGER; hctx.strokeStyle = 'rgba(25,6,6,.85)'; hctx.lineWidth = 1.5;
    hctx.beginPath(); hctx.moveTo(x, ay); hctx.lineTo(x - s, by); hctx.lineTo(x + s, by); hctx.closePath(); hctx.fill(); hctx.stroke();
    hudText((e.unknown && e.mode === 'cruise' ? 'DESCONOCIDO  ' : tgt ? 'TGT  ' : '') + fmtDist(d), x, by - 6, FM(locked ? 13 : 11), locked ? C_GOLD : tgt ? C_TGT : C_BONE, 'center');   // (v34: sin identificar)
    if (e.hp < ENEMY_HP) hpBar(x, locked && onScreen ? a.y + half + 6 : ay + 5, e.hp / ENEMY_HP);   // barra de vida cuando está dañado
  }
  let nearAir = null, nearAirD = Infinity;                  // v23: de lejos (más de 4 km) solo el más cercano lleva texto (una flota no se amontona)
  for (const s of airships) if (!s.dead) { const d = s.pos.distanceTo(_camP); if (d < nearAirD) { nearAirD = d; nearAir = s; } }
  for (const s of airships) {                               // v21: dirigibles: rombo rojo hueco, distancia y vida
    if (s.dead) continue;
    const d = s.pos.distanceTo(_camP), locked = s === lock, tgt = isTgt(s);
    if (d > (tgt ? 15000 : AIRSHIP_DRAW) || !proj(s.pos.x, s.pos.y, s.pos.z, a)) continue;   // (v23: los TGT, marcados hasta 15 km aunque la niebla ya no deje verlos)
    const onScreen = onScreenAt(a);
    if (!onScreen && !nearScreen(a)) continue;
    let half = 0;
    if (locked && onScreen) { lockShown = true; half = drawLockBox(s, a, d); }
    const r = 6 + 4 * (1 - smooth(300, 4000, d)), y = a.y - (half ? half + 6 + r : 26);
    hctx.globalAlpha = locked || tgt ? 1 : 0.6; hctx.strokeStyle = C_DANGER; hctx.lineWidth = 2;
    hctx.beginPath(); hctx.moveTo(a.x, y - r); hctx.lineTo(a.x + r * 1.5, y); hctx.lineTo(a.x, y + r); hctx.lineTo(a.x - r * 1.5, y); hctx.closePath(); hctx.stroke();
    if (d < 4000 || locked || s === nearAir) hudText((tgt ? 'TGT  ' : '') + fmtDist(d), a.x, y - r - 6, FM(locked ? 13 : 11), locked ? C_GOLD : tgt ? C_TGT : C_BONE, 'center');
    if (s.hp < AIRSHIP_HP) hpBar(a.x, half ? a.y + half + 6 : y + r + 5, s.hp / AIRSHIP_HP);
  }
  if (drawUnitMarkers(a, lock)) lockShown = true;          // v29: unidades nuevas (6f)
  for (const t of TOWER_SITES) {                            // v21: torres TGT (y la fijada): marca sobre el tejado
    if (t.dead) continue;
    const locked = t === lock, tgt = isTgt(t);
    if (!tgt && !locked) continue;
    const d = t.pos.distanceTo(_camP);
    if (d > LOCK_STATIC_RANGE) continue;
    if (locked && proj(t.pos.x, t.pos.y, t.pos.z, a) && onScreenAt(a)) { lockShown = true; drawLockBox(t, a, d); }
    if (!proj(t.x, t.y + TOWER_TOP + 12, t.z, a) || !onScreenAt(a)) continue;
    hctx.globalAlpha = 1; hctx.strokeStyle = C_DANGER; hctx.lineWidth = 2;
    hctx.beginPath(); hctx.moveTo(a.x - 6, a.y - 10); hctx.lineTo(a.x, a.y - 3); hctx.lineTo(a.x + 6, a.y - 10); hctx.stroke();
    hudText((tgt ? 'TGT  ' : '') + fmtDist(d), a.x, a.y - 15, FM(locked ? 13 : 11), locked ? C_GOLD : C_TGT, 'center');
  }
  hctx.globalAlpha = 1;
  if (lock && !lock.dead) { if (lockShown) { drawLockCircle(); drawLeadPipper(lock); } else drawLockArrow(lock); }
  drawAllyMarker(a);
}
/* v29: unidades nuevas (6f). Artillería y torretas: cuadrado hueco; batallones: rectángulo con los soldados que quedan; barcos: rombo
   (como los dirigibles); superdirigible y sierpe: rombo doble con su nombre (la sierpe, «ESCUDO» mientras lo tiene); hechiceros: círculo.
   Se ven hasta u.markR (las TGT y la fijada, siempre); el texto, de cerca, si es TGT o si está fijada. Devuelve si dibujó el recuadro del
   blanco fijado. */
function drawUnitMarkers(a, lock) {
  let shown = false;
  for (const u of UNITS) {
    if (u.dead) continue;
    const d = u.pos.distanceTo(_camP), locked = u === lock, tgt = isTgt(u);
    if ((d > u.markR && !locked && !tgt) || d > 16000 || !proj(u.bc.x, u.bc.y, u.bc.z, a)) continue;
    const onScreen = onScreenAt(a);
    if (!onScreen && !nearScreen(a)) continue;
    let half = 0;
    if (locked && onScreen) { shown = true; half = drawLockBox(u, a, d); }
    const big = u.kind === 'superdirigible' || u.kind === 'sierpe', r = (big ? 9 : 5) + 3 * (1 - smooth(300, 4000, d)), y = a.y - (half ? half + 6 + r : big ? 34 : 18);
    hctx.globalAlpha = locked || tgt ? 1 : 0.6; hctx.strokeStyle = u.kind === 'hechicero' ? C_TGT : C_DANGER; hctx.lineWidth = 2;
    hctx.beginPath();
    if (u.kind === 'artilleria' || u.kind === 'torreta') hctx.rect(a.x - r, y - r, 2 * r, 2 * r);
    else if (u.kind === 'batallon') hctx.rect(a.x - r * 1.8, y - r * 0.8, 3.6 * r, 1.6 * r);
    else if (u.kind === 'hechicero') hctx.arc(a.x, y, r, 0, 6.283);
    else { hctx.moveTo(a.x, y - r); hctx.lineTo(a.x + r * 1.5, y); hctx.lineTo(a.x, y + r); hctx.lineTo(a.x - r * 1.5, y); hctx.closePath(); }
    hctx.stroke();
    if (big) { hctx.beginPath(); hctx.moveTo(a.x, y - r * 0.5); hctx.lineTo(a.x + r * 0.75, y); hctx.lineTo(a.x, y + r * 0.5); hctx.lineTo(a.x - r * 0.75, y); hctx.closePath(); hctx.stroke(); }
    if (d < (big ? 15000 : u.kind === 'batallon' ? 2500 : 1000) || locked || tgt) {   // (la artillería va en grupos: de lejos, solo el símbolo)
      const name = big ? u.label.toUpperCase() + (u.kind === 'sierpe' && u.shield ? ' · ESCUDO' : '') + '  ' : u.kind === 'batallon' ? u.alive + '  ·  ' : '';
      hudText((tgt ? 'TGT  ' : '') + name + fmtDist(d), a.x, y - r - 6, FM(locked ? 13 : 11), locked ? C_GOLD : tgt ? C_TGT : C_BONE, 'center');
    }
    if (u.kind === 'superdirigible') superBar(u, a, half);
    else if (u.hp < u.hpMax) hpBar(a.x, half ? a.y + half + 6 : y + r + 5, u.hp / u.hpMax);
  }
  hctx.globalAlpha = 1;
  return shown;
}
/* v31: barra de vida del superdirigible, grande y bajo el casco (siempre, no solo tocado), con su vida y las torretas que le quedan. */
const _sb = { x: 0, y: 0 };
function superBar(u, a, half) {
  const bx = a.x, by0 = proj(u.bc.x, u.bc.y - u.size * 0.06, u.bc.z, _sb) ? _sb.y + 18 : a.y + 40, by = Math.max(by0, half ? a.y + half + 12 : 0);
  if (by > HH - 60) return;
  const w = 220, h = 9, f = clamp(u.hp / u.hpMax, 0, 1), left = u.kids.filter(k => !k.dead).length;
  hctx.globalAlpha = 1;
  hctx.fillStyle = 'rgba(13,10,15,.7)'; hctx.fillRect(bx - w / 2 - 3, by - 3, w + 6, h + 6);
  hctx.fillStyle = 'rgba(241,230,211,.22)'; hctx.fillRect(bx - w / 2, by, w, h);
  hctx.fillStyle = f < 0.35 ? '#ff3b2e' : C_DANGER; hctx.fillRect(bx - w / 2, by, w * f, h);
  hctx.strokeStyle = 'rgba(241,230,211,.55)'; hctx.lineWidth = 1; hctx.strokeRect(bx - w / 2 - 0.5, by - 0.5, w + 1, h + 1);
  hudText('NÚCLEO  ' + Math.ceil(u.hp) + ' / ' + Math.round(u.hpMax) + '   ·   TORRETAS ' + left + ' / ' + u.kids.length, bx, by + h + 14, FM(11), C_BONE, 'center');
}
/* v23: el aliado: chevrón azul con su nombre y la distancia (hasta 9 km). v34: cada uno de los aliados. */
const C_ALLY = '#5ab4ff';
function drawAllyMarker(a) {
  for (const al of allies) {
    if (!al.on) continue;
    const e = al.e, d = e.pos.distanceTo(_camP);
    if (d > 9000 || !proj(e.pos.x, e.pos.y, e.pos.z, a) || !onScreenAt(a)) continue;
    const s = 6 + 3 * (1 - smooth(250, 3000, d)), y = a.y - 16;
    hctx.globalAlpha = 1; hctx.strokeStyle = C_ALLY; hctx.lineWidth = 2;
    hctx.beginPath(); hctx.moveTo(a.x - s, y - s); hctx.lineTo(a.x, y); hctx.lineTo(a.x + s, y - s); hctx.stroke();
    hudText(allyName(al).toUpperCase() + '  ' + fmtDist(d), a.x, y - s - 6, FM(11), C_ALLY, 'center');
  }
}
/* Círculo rojo de la bola guiada (dragón fijado a menos de 3 km): la carga del bloqueo lo rodea en dorado. */
const _Wh = { x: 0, y: 0, r: 0, d: 0, in: false };
function drawLockCircle() {
  if (W.msl <= 0 || lockCircle(_Wh) !== '' || !weaponsReady()) return;
  const { x, y, r } = _Wh, p = W.lock;
  hctx.globalAlpha = _Wh.in ? 1 : 0.7;
  hctx.lineWidth = 4.5; hctx.strokeStyle = 'rgba(25,6,6,.55)'; hctx.beginPath(); hctx.arc(x, y, r, 0, 6.283); hctx.stroke();
  hctx.lineWidth = _Wh.in ? 2.4 : 1.6; hctx.strokeStyle = C_DANGER; hctx.beginPath(); hctx.arc(x, y, r, 0, 6.283); hctx.stroke();
  if (p > 0) {
    hctx.globalAlpha = 1; hctx.lineWidth = 5; hctx.strokeStyle = C_GOLD;
    hctx.beginPath(); hctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + p * 6.283); hctx.stroke();
    hudText('FIJANDO  ' + Math.round(p * 100) + ' %', x, y + r + 18, FM(12), C_GOLD, 'center');
  }
  hctx.globalAlpha = 1;
}
/* Indicador de adelanto (estilo Star Citizen): círculo gris donde hay que apuntar para que la bola de fuego alcance al dragón fijado. */
const _lp = new THREE.Vector3(), _lm = new THREE.Vector3(), _lq = new THREE.Vector3();
const LEAD_MIN_V = 150 / 3.6;                              // v31: el círculo de adelanto solo sale con blancos a más de 150 km/h (lo quieto o lento se ve mejor sin él)
function drawLeadPipper(e) {
  if (e.vel.lengthSq() < LEAD_MIN_V * LEAD_MIN_V) return;
  heroMouth(_lm);                                                                                            // boca del jugador: de donde sale la bola
  if (interceptPoint(e, _lm, _lp) < 0) return;                                                               // fuera de alcance
  _lq.subVectors(_lp, _lm).normalize().multiplyScalar(1400).add(_lm);                                        // el marcador de disparo va a un punto lejano de esa línea
  const p = {}, a = {};
  if (!proj(_lq.x, _lq.y, _lq.z, p) || p.x < 8 || p.x > HW - 8 || p.y < 8 || p.y > HH - 8) return;
  const near = proj(_camP.x + F.aimWorld.x * 1000, _camP.y + F.aimWorld.y * 1000, _camP.z + F.aimWorld.z * 1000, a) && Math.hypot(a.x - p.x, a.y - p.y) < 20;   // retículo sobre el círculo
  hctx.globalAlpha = 1; hctx.lineWidth = 4.5; hctx.strokeStyle = 'rgba(8,8,10,.55)';
  hctx.beginPath(); hctx.arc(p.x, p.y, 7.5, 0, 6.283); hctx.stroke();
  hctx.lineWidth = 2; hctx.strokeStyle = near ? 'rgba(245,245,245,.98)' : 'rgba(176,178,182,.95)';
  hctx.beginPath(); hctx.arc(p.x, p.y, 7.5, 0, 6.283); hctx.stroke();
  hctx.fillStyle = hctx.strokeStyle; hctx.beginPath(); hctx.arc(p.x, p.y, 1.7, 0, 6.283); hctx.fill();
}
/* Flecha en el borde de la pantalla hacia el dragón fijado que está fuera del campo de visión (estilo Ace Combat). */
function drawLockArrow(e) {
  _pv.set(e.pos.x, e.pos.y, e.pos.z).applyMatrix4(camera.matrixWorldInverse);       // espacio de cámara
  const pm = camera.projectionMatrix.elements;
  let dx = _pv.x * pm[0] * HW * 0.5, dy = -_pv.y * pm[5] * HH * 0.5;               // dirección en pantalla (y hacia abajo); válida también si está detrás
  const l = Math.hypot(dx, dy);
  if (l < 1e-3) { dx = 0; dy = 1; } else { dx /= l; dy /= l; }
  const hx = HW / 2 - 190, hy = dy < 0 ? HH / 2 - 100 : HH / 2 - 84;               // márgenes: instrumentos a los lados, brújula arriba, vida abajo
  const t = Math.min(Math.abs(dx) > 1e-4 ? hx / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-4 ? hy / Math.abs(dy) : 1e9);
  const x = HW / 2 + dx * t, y = HH / 2 + dy * t, d = e.pos.distanceTo(_camP);
  hctx.save(); hctx.globalAlpha = 0.8 + 0.2 * Math.sin(gameTime * 6);
  hctx.fillStyle = 'rgba(13,10,15,.62)'; hctx.beginPath(); hctx.arc(x, y, 25, 0, 6.283); hctx.fill();   // fondo para leerla sobre cualquier cosa
  hctx.translate(x, y); hctx.rotate(Math.atan2(dy, dx));
  hctx.fillStyle = C_GOLD; hctx.strokeStyle = 'rgba(25,14,4,.9)'; hctx.lineWidth = 1.6;
  hctx.beginPath(); hctx.moveTo(18, 0); hctx.lineTo(-11, -14); hctx.lineTo(-3, 0); hctx.lineTo(-11, 14); hctx.closePath(); hctx.fill(); hctx.stroke();
  hctx.restore();
  hctx.globalAlpha = 1;
  hudText(fmtDist(d), x - dx * 44, y - dy * 36 + 4, FM(13), C_GOLD, 'center');
}
function drawRadar(heading, fwd) {
  const R = clamp(HW * 0.075, 52, 70), cx = R + 24, cy = HH - R - 24, range = 2400;   // abajo a la izquierda (abajo a la derecha van las armas)
  hctx.save();
  hctx.fillStyle = 'rgba(13,10,15,.55)'; hctx.beginPath(); hctx.arc(cx, cy, R, 0, 6.283); hctx.fill();
  hctx.strokeStyle = 'rgba(241,230,211,.28)'; hctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) { hctx.beginPath(); hctx.arc(cx, cy, R * i / 3, 0, 6.283); hctx.stroke(); }
  hctx.beginPath(); hctx.moveTo(cx - R, cy); hctx.lineTo(cx + R, cy); hctx.moveTo(cx, cy - R); hctx.lineTo(cx, cy + R); hctx.stroke();
  const hl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / hl, fz = fwd.z / hl, rx = -fz, rz = fx, p = dragon.position;
  const A = mission.area;
  if (A) {                                                 // v15: área de la misión: fuera de ella, sombreado rojo; el borde, discontinuo
    const dx = A.x - p.x, dz = A.z - p.z, k = R / range, ox = cx + (dx * rx + dz * rz) * k, oy = cy - (dx * fx + dz * fz) * k, rr = A.r * k;
    hctx.save(); hctx.beginPath(); hctx.arc(cx, cy, R, 0, 6.283); hctx.clip();
    hctx.beginPath(); hctx.rect(cx - R, cy - R, 2 * R, 2 * R); hctx.arc(ox, oy, rr, 0, 6.283);
    hctx.fillStyle = 'rgba(255,74,58,.2)'; hctx.fill('evenodd');
    hctx.setLineDash([5, 4]); hctx.strokeStyle = 'rgba(255,74,58,.9)'; hctx.lineWidth = 1.6;
    hctx.beginPath(); hctx.arc(ox, oy, rr, 0, 6.283); hctx.stroke();
    hctx.restore();
  }
  // v21: los TGT, en rojo vivo; lo que no cuenta para la misión, apagado. El blanco fijado, con un círculo dorado.
  let nearest = 1e9;
  const at = (x, z) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), k = Math.min(1, range / Math.max(d, 1)) * R / range; _rp.x = cx + (dx * rx + dz * rz) * k; _rp.y = cy - (dx * fx + dz * fz) * k; _rp.d = d; return _rp; };
  const col = (tgt, far, fill) => tgt ? (far ? (fill ? 'rgba(255,74,58,.45)' : 'rgba(255,74,58,.55)') : C_DANGER) : 'rgba(241,180,170,.35)';
  for (const t of TOWER_SITES) {                           // todas las torres que quedan; las de fuera del alcance, en el borde (para encontrarlas)
    if (t.dead) continue;
    const tgt = isTgt(t), q = at(t.x, t.z), far = q.d > range;
    if (tgt) nearest = Math.min(nearest, q.d);
    if (t.isl) { hctx.strokeStyle = col(tgt, far, false); hctx.lineWidth = 1.6; hctx.strokeRect(q.x - 3.5, q.y - 3.5, 7, 7); }   // v13: en una isla, cuadrado hueco
    else { hctx.fillStyle = col(tgt, far, true); hctx.fillRect(q.x - 3, q.y - 3, 6, 6); }
  }
  for (const s of airships) {                              // v21: dirigibles: cápsula hueca a lo largo de su eslora
    if (s.dead) continue;
    const tgt = isTgt(s), q = at(s.pos.x, s.pos.z);
    if (tgt) nearest = Math.min(nearest, q.d);
    _Eef.set(0, 0, -1).applyQuaternion(s.q);
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(Math.atan2(_Eef.x * rx + _Eef.z * rz, _Eef.x * fx + _Eef.z * fz));
    hctx.strokeStyle = col(tgt, q.d > range, false); hctx.lineWidth = 1.8;
    hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(2.8, -3); hctx.lineTo(2.8, 4.5); hctx.lineTo(-2.8, 4.5); hctx.lineTo(-2.8, -3); hctx.closePath(); hctx.stroke();
    hctx.restore();
  }
  for (const u of UNITS) {                                 // v29: unidades nuevas (las montadas, no: va su unidad)
    if (u.dead || !u.radar) continue;
    const tgt = isTgt(u) || u.kids.some(k => !k.dead && isTgt(k)), q = at(u.pos.x, u.pos.z), far = q.d > range;
    if (tgt) nearest = Math.min(nearest, q.d);
    if (u.radar === 'sq') { hctx.fillStyle = col(tgt, far, true); hctx.fillRect(q.x - 2.5, q.y - 2.5, 5, 5); continue; }
    if (u.radar === 'rect') { hctx.fillStyle = col(tgt, far, true); hctx.fillRect(q.x - 4, q.y - 2, 8, 4); continue; }
    if (u.radar === 'serpent') { hctx.strokeStyle = col(tgt, far, false); hctx.lineWidth = 2; hctx.beginPath(); hctx.arc(q.x, q.y, 6, 0, 6.283); hctx.stroke(); hctx.beginPath(); hctx.arc(q.x, q.y, 2.5, 0, 6.283); hctx.stroke(); continue; }
    _Eef.set(0, 0, -1).applyQuaternion(u.q);                 // barcos y superdirigible: cápsula hueca a lo largo del casco (el superdirigible, más grande)
    const k = u.radar === 'super' ? 1.6 : 1;
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(Math.atan2(_Eef.x * rx + _Eef.z * rz, _Eef.x * fx + _Eef.z * fz)); hctx.scale(k, k);
    hctx.strokeStyle = col(tgt, far, false); hctx.lineWidth = 1.8 / k;
    hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(2.8, -3); hctx.lineTo(2.8, 4.5); hctx.lineTo(-2.8, 4.5); hctx.lineTo(-2.8, -3); hctx.closePath(); hctx.stroke();
    hctx.restore();
  }
  for (const e of enemies) {                               // dragones enemigos: triángulos rojos orientados según su rumbo
    if (e.dead || e.off) continue;
    const tgt = isTgt(e), q = at(e.pos.x, e.pos.z);
    if (tgt) nearest = Math.min(nearest, q.d);
    _Eef.set(0, 0, -1).applyQuaternion(e.q);
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(Math.atan2(_Eef.x * rx + _Eef.z * rz, _Eef.x * fx + _Eef.z * fz));
    hctx.fillStyle = col(tgt, q.d > range, true); hctx.strokeStyle = 'rgba(25,6,6,.8)'; hctx.lineWidth = 1;
    hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(-4.5, 4.5); hctx.lineTo(4.5, 4.5); hctx.closePath(); hctx.fill(); hctx.stroke();
    hctx.restore();
  }
  const L = enemyLock.e;
  if (L && !L.dead) { const q = at(L.pos.x, L.pos.z); hctx.strokeStyle = C_GOLD; hctx.lineWidth = 1.5; hctx.beginPath(); hctx.arc(q.x, q.y, 8.5, 0, 6.283); hctx.stroke(); }
  for (const al of allies) {                               // v23: el aliado, triángulo azul hueco (v34: todos)
    if (!al.on) continue;
    const e = al.e, q = at(e.pos.x, e.pos.z); _Eef.set(0, 0, -1).applyQuaternion(e.q);
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(Math.atan2(_Eef.x * rx + _Eef.z * rz, _Eef.x * fx + _Eef.z * fz));
    hctx.strokeStyle = C_ALLY; hctx.lineWidth = 1.8; hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(-4.5, 4.5); hctx.lineTo(4.5, 4.5); hctx.closePath(); hctx.stroke();
    hctx.restore();
  }
  for (const f of fireballs) {                             // bolas guiadas enemigas: puntos rojos que parpadean
    if (f.kind !== 'emsl' || f.lost) continue;
    const dx = f.pos.x - p.x, dz = f.pos.z - p.z, d = Math.hypot(dx, dz), k = Math.min(1, range / Math.max(d, 1)) * R / range;
    hctx.globalAlpha = 0.5 + 0.5 * Math.sin(gameTime * 14); hctx.fillStyle = C_DANGER;
    hctx.beginPath(); hctx.arc(cx + (dx * rx + dz * rz) * k, cy - (dx * fx + dz * fz) * k, 3.2, 0, 6.283); hctx.fill();
  }
  hctx.globalAlpha = 1;
  hctx.fillStyle = C_GOLD; hctx.beginPath(); hctx.moveTo(cx, cy - 6); hctx.lineTo(cx - 4, cy + 4); hctx.lineTo(cx + 4, cy + 4); hctx.closePath(); hctx.fill();
  hctx.restore();
  hudText('RADAR 2,4 km', cx, cy - R - 7, FM(11), C_DIM, 'center');
  if (nearest < 1e8) hudText('TGT más cercano ' + fmtDist(nearest), cx, cy + R + 16, FM(11), C_DIM, 'center');   // (v21: antes, la torre más cercana)
}
const _rp = { x: 0, y: 0, d: 0 };
/* Bolas guiadas enemigas en camino: rombo rojo sobre cada una si está en pantalla; si no, flecha roja en un anillo alrededor del centro,
   con la distancia (como el aviso de misil de Ace Combat). */
function drawMissileWarn() {
  if (!threat.incoming.length || state !== 'playing') return;
  const a = {}, pm = camera.projectionMatrix.elements, blink = 0.6 + 0.4 * Math.sin(gameTime * 14);
  hctx.save();
  for (const f of threat.incoming) {
    const d = f.pos.distanceTo(_camP);
    if (proj(f.pos.x, f.pos.y, f.pos.z, a) && a.x > 30 && a.x < HW - 30 && a.y > 30 && a.y < HH - 30) {
      hctx.globalAlpha = blink; hctx.strokeStyle = C_DANGER; hctx.lineWidth = 2.5;
      hctx.beginPath(); hctx.moveTo(a.x, a.y - 16); hctx.lineTo(a.x + 16, a.y); hctx.lineTo(a.x, a.y + 16); hctx.lineTo(a.x - 16, a.y); hctx.closePath(); hctx.stroke();
      hudText(fmtDist(d), a.x, a.y - 22, FM(12), C_DANGER, 'center');
      continue;
    }
    _pv.set(f.pos.x, f.pos.y, f.pos.z).applyMatrix4(camera.matrixWorldInverse);
    let dx = _pv.x * pm[0], dy = -_pv.y * pm[5]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (_pv.z > 0 && l < 1e-3) { dx = 0; dy = 1; }                         // justo detrás: abajo
    const R = Math.min(HW, HH) * 0.24, x = HW / 2 + dx * R, y = HH / 2 + dy * R;
    hctx.globalAlpha = blink;
    hctx.translate(x, y); hctx.rotate(Math.atan2(dy, dx));
    hctx.fillStyle = C_DANGER; hctx.strokeStyle = 'rgba(25,6,6,.9)'; hctx.lineWidth = 1.5;
    hctx.beginPath(); hctx.moveTo(20, 0); hctx.lineTo(-10, -13); hctx.lineTo(-3, 0); hctx.lineTo(-10, 13); hctx.closePath(); hctx.fill(); hctx.stroke();
    hctx.setTransform(hudEl.width / HW, 0, 0, hudEl.width / HW, 0, 0);
    hudText(fmtDist(d), x - dx * 34, y - dy * 30 + 4, FM(12), C_DANGER, 'center');
  }
  hctx.restore(); hctx.globalAlpha = 1;
}
/* v15: fuera del área de la misión, hacia su centro (a la altura del jugador): rombo dorado si se ve; si no, flecha dorada en un anillo
   alrededor del centro de la pantalla, como la de los misiles. */
function drawAreaArrow() {
  const A = mission.area, p = dragon.position, a = {}, blink = 0.6 + 0.4 * Math.sin(gameTime * 8);
  hctx.save(); hctx.globalAlpha = blink;
  if (proj(A.x, p.y, A.z, a) && a.x > 40 && a.x < HW - 40 && a.y > 40 && a.y < HH - 40) {
    hctx.strokeStyle = C_GOLD; hctx.lineWidth = 2.5;
    hctx.beginPath(); hctx.moveTo(a.x, a.y - 14); hctx.lineTo(a.x + 14, a.y); hctx.lineTo(a.x, a.y + 14); hctx.lineTo(a.x - 14, a.y); hctx.closePath(); hctx.stroke();
    hudText('ZONA DE LA MISIÓN', a.x, a.y - 22, FM(12), C_GOLD, 'center');
  } else {
    const pm = camera.projectionMatrix.elements;
    _pv.set(A.x, p.y, A.z).applyMatrix4(camera.matrixWorldInverse);
    let dx = _pv.x * pm[0], dy = -_pv.y * pm[5]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (l < 1e-3) { dx = 0; dy = 1; }                                       // justo detrás: abajo
    const R = Math.min(HW, HH) * 0.31, x = HW / 2 + dx * R, y = HH / 2 + dy * R;
    hctx.translate(x, y); hctx.rotate(Math.atan2(dy, dx));
    hctx.fillStyle = C_GOLD; hctx.strokeStyle = 'rgba(25,16,4,.9)'; hctx.lineWidth = 1.5;
    hctx.beginPath(); hctx.moveTo(24, 0); hctx.lineTo(-12, -16); hctx.lineTo(-4, 0); hctx.lineTo(-12, 16); hctx.closePath(); hctx.fill(); hctx.stroke();
  }
  hctx.restore(); hctx.globalAlpha = 1;
}
/* Armas, abajo a la derecha (al estilo de Ace Combat): una fila por arma con el mando a la izquierda, el nombre, el estado y una barra.
   Durante el sobrecalentamiento o el rayo, las que no se pueden usar se apagan. */
function drawWeapons() {
  const w = 248, x1 = HW - 28, x0 = x1 - w, rowH = 42, y0 = HH - 26 - rowH * 4;
  const veil = hctx.createRadialGradient(HW, HH, 0, HW, HH, 380); veil.addColorStop(0, 'rgba(13,10,15,.6)'); veil.addColorStop(1, 'rgba(13,10,15,0)');
  hctx.fillStyle = veil; hctx.fillRect(HW - 380, HH - 380, 380, 380);
  const oh = W.overheat > 0, las = W.laser > 0, blink = 0.5 + 0.5 * Math.sin(gameTime * 9), faint = 'rgba(241,230,211,.16)';
  hudText('ARMAS', x1, y0 - 12, FM(10), C_DIM, 'right');
  hctx.fillStyle = 'rgba(241,230,211,.25)'; hctx.fillRect(x0, y0 - 6, w, 1);
  const row = (i, key, name, val, valCol, dim) => {         // cabecera de fila; devuelve la y de su barra
    const y = y0 + i * rowH;
    hctx.globalAlpha = dim ? 0.3 : 1;
    hudText(key, x0 - 12, y + 14, FM(10), 'rgba(241,230,211,.5)', 'right');
    hudText(name, x0, y + 14, FM(13), C_BONE);
    if (val) hudText(val, x1, y + 14, FM(13), valCol, 'right');
    return y + 21;
  };
  const bar = (y, f, col) => { hctx.fillStyle = faint; hctx.fillRect(x0, y, w, 7); hctx.fillStyle = col; hctx.fillRect(x0, y, w * clamp(f, 0, 1), 7); };
  // fuego rápido: munición en grande y una marca por proyectil (doradas mientras recarga)
  const refilling = W.refill <= 0 && W.ammo < GUN_AMMO;
  let by = row(0, 'CLIC', 'FUEGO RÁPIDO', '', '', oh || las);
  hudText(String(W.ammo), x1, by - 6, FM(20), W.ammo === 0 ? C_DANGER : refilling ? C_GOLD : C_BONE, 'right');
  const tw = (w - (GUN_AMMO - 1) * 2) / GUN_AMMO;
  for (let i = 0; i < GUN_AMMO; i++) { hctx.fillStyle = i < W.ammo ? (refilling ? C_GOLD : C_BONE) : faint; hctx.fillRect(x0 + i * (tw + 2), by, tw, 7); }
  // bola guiada: munición (v24: «X/20» tras el nombre; no se recargan), estado del círculo y carga del bloqueo
  const why = W.lockWhy, noMsl = W.msl <= 0;
  const [mv, mc] = W.mslFlash > 0 ? ['LANZADA', C_GOLD] : noMsl ? ['SIN MUNICIÓN', C_DANGER] : W.lock > 0 ? ['FIJANDO  ' + Math.round(W.lock * 100) + ' %', C_GOLD]
    : why === 'sin' ? ['SIN BLANCO', C_DIM] : why === 'rango' ? ['FUERA DE RANGO', C_DIM] : why === 'fuera' ? ['FUERA DE VISTA', C_DIM]
    : [W.lockIn ? 'MANTÉN EL CLIC' : 'EN RANGO', C_DANGER];
  by = row(1, 'MANTENER CLIC', 'BOLA GUIADA', mv, mc, oh || las);
  hctx.font = FM(13); const mx = x0 + hctx.measureText('BOLA GUIADA').width + 11;
  hudText(W.msl + '/' + MSL_AMMO, mx, by - 7, FM(13), noMsl ? C_DANGER : C_GOLD);
  bar(by, W.mslFlash > 0 ? 1 : W.lock, C_GOLD);
  // llamarada: calor (y la cuenta atrás del sobrecalentamiento)
  const hc = oh || W.heat > 0.85 ? C_DANGER : W.heat > 0.6 ? C_EMBER : C_BONE;
  by = row(2, 'CLIC DCHO.', 'LLAMARADA', oh ? 'SOBRECALENTADO  ' + W.overheat.toFixed(1) + ' s' : (W.flame ? 'ACTIVA  ' : 'CALOR  ') + Math.round(W.heat * 100) + ' %', oh ? C_DANGER : W.flame ? C_EMBER : C_DIM, las);
  if (oh) hctx.globalAlpha = 0.55 + 0.45 * blink;
  bar(by, W.heat, hc);
  // rayo de fuego: carga; lleno, parpadea y brilla
  const full = W.ult >= 1 && !las;
  by = row(3, 'IZQ. + DCHO.', 'RAYO DE FUEGO', las ? 'ACTIVO  ' + W.laser.toFixed(1) + ' s' : full ? 'LISTO' : Math.floor(W.ult * 100) + ' %', las || full ? C_GOLD : C_DIM, oh);
  if (full && !oh) { hctx.shadowColor = C_GOLD; hctx.shadowBlur = 6 + 12 * blink; hctx.globalAlpha = 0.6 + 0.4 * blink; }
  bar(by, W.ult, full || las ? C_GOLD : 'rgba(242,184,75,.7)');
  if (full && !oh) { hctx.strokeStyle = C_GOLD; hctx.lineWidth = 1; hctx.strokeRect(x0 - 2.5, by - 2.5, w + 5, 12); }
  hctx.shadowColor = 'rgba(0,0,0,.65)'; hctx.shadowBlur = 5; hctx.globalAlpha = 1;
}
/* Vida y armadura (abajo, en el centro; v25, según el boceto de Jorge): la barra de vida con «vida/máxima» dentro y, alrededor, el marco
   amarillo de la armadura (relleno claro y borde a trazos) con «armadura/máxima» encima. El daño gasta primero la armadura: el marco se
   vacía de derecha a izquierda (lo gastado queda como un trazo tenue) y late mientras se regenera. La vida no se regenera. */
function drawHealth() {
  const bw = Math.min(300, HW - 80), hh = 18, pad = 7, bx = Math.round(HW / 2 - bw / 2), by = Math.round(HH - 36);
  const fx = bx - pad, fy = by - pad, fw = bw + 2 * pad, fh = hh + 2 * pad, hpMax = heroHpMax(), hpf = clamp(F.health / hpMax, 0, 1);
  hctx.save(); hctx.shadowBlur = 0;
  if (ARMOR_MAX > 0) {
    const af = clamp(F.armor / ARMOR_MAX, 0, 1), regen = F.armor < ARMOR_MAX && gameTime - F.lastHit > ARMOR_WAIT;
    hctx.lineWidth = 4; hctx.setLineDash([5, 4]);
    hctx.strokeStyle = 'rgba(245,209,66,.22)'; hctx.strokeRect(fx, fy, fw, fh);                    // el marco entero, tenue (lo gastado)
    if (af > 0) {
      hctx.save(); hctx.beginPath(); hctx.rect(fx - 4, fy - 4, (fw + 8) * af, fh + 8); hctx.clip();
      hctx.globalAlpha = regen ? 0.75 + 0.25 * Math.sin(gameTime * 6) : 1;
      hctx.fillStyle = 'rgba(255,236,150,.62)'; hctx.fillRect(fx, fy, fw, fh);
      hctx.strokeStyle = C_ARMOR; hctx.strokeRect(fx, fy, fw, fh);
      hctx.restore();
    }
    hctx.setLineDash([]);
    hctx.shadowColor = 'rgba(0,0,0,.65)'; hctx.shadowBlur = 5;
    hudText(Math.ceil(F.armor) + '/' + fmtStat(ARMOR_MAX), HW / 2, fy - 9, `700 15px 'Share Tech Mono', ui-monospace, monospace`, C_ARMOR, 'center');
    hctx.shadowBlur = 0;
  }
  // vida: fondo oscuro, lo que queda en claro (en rojo con poca), borde oscuro y el número, oscuro sobre lo lleno y claro sobre lo vacío
  hctx.fillStyle = 'rgba(13,10,15,.62)'; hctx.fillRect(bx, by, bw, hh);
  const fillW = bw * hpf, low = hpf <= 0.35;
  hctx.fillStyle = low ? C_DANGER : '#f4ecdc'; hctx.fillRect(bx, by, fillW, hh);
  hctx.strokeStyle = '#1a1410'; hctx.lineWidth = 1.5; hctx.strokeRect(bx + 0.75, by + 0.75, bw - 1.5, hh - 1.5);
  const txt = Math.ceil(F.health) + '/' + fmtStat(hpMax), font = `700 14px 'Share Tech Mono', ui-monospace, monospace`, ty = by + hh / 2 + 5;
  for (const [x0, w, col] of [[bx, fillW, low ? '#fff' : '#1a1410'], [bx + fillW, bw - fillW, C_BONE]]) {
    if (w <= 0) continue;
    hctx.save(); hctx.beginPath(); hctx.rect(x0, by, w, hh); hctx.clip(); hudText(txt, HW / 2, ty, font, col, 'center'); hctx.restore();
  }
  hctx.restore();
}
/* Boost en pantalla: túnel (los bordes se oscurecen y se cierran hacia el centro, con un velo cálido) y líneas radiales que nacen
   en el borde del túnel y se aceleran hacia fuera. Van debajo de los instrumentos. fx = intensidad del boost, kick = golpe al activarlo. */
function drawSpeedLines(fx, kick) {
  const cx = HW / 2, cy = HH / 2, R = Math.hypot(cx, cy), f = clamp(fx + kick * 0.35, 0, 1.2);
  hctx.save(); hctx.shadowBlur = 0;
  const r0 = R * lerp(0.95, 0.40, clamp(f, 0, 1)), tun = hctx.createRadialGradient(cx, cy, r0, cx, cy, R);
  tun.addColorStop(0, 'rgba(13,10,15,0)'); tun.addColorStop(0.45, `rgba(60,24,10,${(0.20 * f).toFixed(3)})`); tun.addColorStop(1, `rgba(13,10,15,${(0.6 * f).toFixed(3)})`);
  hctx.fillStyle = tun; hctx.fillRect(0, 0, HW, HH);
  hctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const ang = (i * 2.399963) % 6.283185, t = (gameTime * (2.0 + (i % 7) * 0.32) + i * 0.173) % 1;
    const rs = r0 * (0.92 + 0.05 * (i % 4)), ra = rs + (R * 1.02 - rs) * t * t, len = R * (0.05 + 0.24 * t);   // t² : se aceleran al salir
    hctx.globalAlpha = clamp(f * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.3)), 0, 1);
    hctx.strokeStyle = i % 9 === 0 ? C_EMBER : C_BONE;
    hctx.lineWidth = 0.8 + (i % 3) * 0.5 + t * 1.6;
    hctx.beginPath(); hctx.moveTo(cx + Math.cos(ang) * ra, cy + Math.sin(ang) * ra); hctx.lineTo(cx + Math.cos(ang) * (ra + len), cy + Math.sin(ang) * (ra + len)); hctx.stroke();
  }
  hctx.restore();
}
function drawHUD() {
  HW = window.innerWidth; HH = window.innerHeight;
  const dpr = hudEl.width / HW;
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0); hctx.clearRect(0, 0, HW, HH);
  if (state === 'menu' || state === 'loading' || state === 'select' || state === 'worldgen') return;
  hctx.shadowColor = 'rgba(0,0,0,.65)'; hctx.shadowBlur = 5;
  camera.getWorldPosition(_camP);
  const fwd = _f.set(0, 0, -1).applyQuaternion(dragon.quaternion);
  const heading = ((Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI) + 360) % 360;
  if (F.boostFx > 0.02 || F.kickFx > 0.02) drawSpeedLines(F.boostFx, F.kickFx);
  drawCompass(heading);
  if (dragonAnim.cam < 0.5) drawLadder(fwd);                 // (v27: en 1ª persona de verdad; la cámara de apuntado la saca)
  drawMarkers(fwd);
  drawEnemyMarkers();
  drawRadar(heading, fwd);
  drawWeapons();
  drawMissileWarn();
  if (MS.out && state === 'playing') drawAreaArrow();       // v15: fuera del área de la misión
  const p = dragon.position, agl = p.y - Math.max(heightAt(p.x, p.z), WL);
  // velos suaves tras los instrumentos laterales para leerlos sobre cualquier fondo
  const gl = hctx.createRadialGradient(0, HH * 0.5 + 25, 0, 0, HH * 0.5 + 25, 270); gl.addColorStop(0, 'rgba(13,10,15,.55)'); gl.addColorStop(1, 'rgba(13,10,15,0)');
  hctx.fillStyle = gl; hctx.fillRect(0, HH * 0.5 - 260, 280, 570);
  const gr = hctx.createRadialGradient(HW, HH * 0.5 + 35, 0, HW, HH * 0.5 + 35, 270); gr.addColorStop(0, 'rgba(13,10,15,.55)'); gr.addColorStop(1, 'rgba(13,10,15,0)');
  hctx.fillStyle = gr; hctx.fillRect(HW - 280, HH * 0.5 - 260, 280, 570);
  // velocidad y acelerador (izquierda)
  const lx = 28, ly = HH * 0.5 - 40;
  if (F.hover) { hctx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 4); hudText('H O V E R', lx, ly - 24, FD(16), C_GOLD); hctx.globalAlpha = 1; }
  hudText('VELOCIDAD', lx, ly, FM(11), C_DIM);
  hudText(String(Math.round(F.speed * 3.6)), lx, ly + 34, FM(34), C_BONE);
  hudText('km/h', lx + 76, ly + 34, FM(12), C_DIM);
  if (F.hover) {
    // en hover W/S controlan la altura: barra centrada (derecha = sube, izquierda = baja)
    hudText('ALTURA  W ▲  S ▼', lx, ly + 66, FM(11), C_DIM);
    hctx.strokeStyle = C_DIM; hctx.lineWidth = 1; hctx.strokeRect(lx + 0.5, ly + 74.5, 120, 9);
    const vv = clamp(F.hvy / HOVER_VSPEED, -1, 1);
    hctx.fillStyle = vv >= 0 ? C_GOLD : C_BONE; hctx.fillRect(lx + 61 + (vv < 0 ? 58 * vv : 0), ly + 76, 58 * Math.abs(vv), 6);
    hctx.fillStyle = C_DIM; hctx.fillRect(lx + 60, ly + 73, 1, 12);
  } else {
    hudText('ACELERADOR', lx, ly + 66, FM(11), C_DIM);
    hctx.strokeStyle = C_DIM; hctx.lineWidth = 1; hctx.strokeRect(lx + 0.5, ly + 74.5, 120, 9);
    hctx.fillStyle = F.throttle > 0.85 ? C_EMBER : C_BONE; hctx.fillRect(lx + 2, ly + 76, 117 * F.throttle, 6);
  }
  // boost (se gasta con Shift; 2 s tras soltarlo empieza a recargarse)
  const bY = ly + 102, waiting = !F.boosting && F.boost < 1 && F.boostDelay > 0, refilling = !F.boosting && F.boost < 1 && F.boostDelay <= 0;
  hudText('BOOST', lx, bY, FM(11), C_DIM);
  hudText('SHIFT', lx + 121, bY, FM(10), 'rgba(241,230,211,.42)', 'right');
  hctx.strokeStyle = F.boostExhausted ? C_DANGER : C_DIM; hctx.lineWidth = 1; hctx.strokeRect(lx + 0.5, bY + 8.5, 120, 9);
  hctx.fillStyle = F.boostExhausted ? C_DANGER : F.boosting ? C_EMBER : waiting ? C_GOLD : C_BONE;
  hctx.fillRect(lx + 2, bY + 10, 117 * F.boost, 6);
  const bTxt = F.boostExhausted ? 'AGOTADO' : waiting ? 'RECARGA EN ' + F.boostDelay.toFixed(1) + ' s' : refilling ? 'RECARGANDO' : F.boosting ? 'ACTIVO' : '';
  if (bTxt) hudText(bTxt, lx, bY + 32, FM(10), F.boostExhausted ? C_DANGER : C_DIM);
  // altitud (derecha)
  const rx = HW - 28, ry = HH * 0.5 - 40;
  hudText('ALTITUD', rx, ry, FM(11), C_DIM, 'right');
  hudText(String(Math.round(p.y - WL)), rx - 24, ry + 34, FM(34), C_BONE, 'right');
  hudText('m', rx, ry + 34, FM(12), C_DIM, 'right');
  hudText('SOBRE EL SUELO', rx, ry + 66, FM(11), C_DIM, 'right');
  hudText(String(Math.max(0, Math.round(agl))) + ' m', rx, ry + 84, FM(18), agl < 60 ? C_DANGER : C_GOLD, 'right');
  const vs = dragonVel.y;
  hudText((vs >= 0 ? '▲ +' : '▼ ') + Math.round(vs) + ' m/s', rx, ry + 106, FM(13), C_DIM, 'right');
  drawHealth();
  // objetivos de la misión y puntuación (arriba, derecha). v15: los de la receta (MS.objs); los opcionales, con un rombo
  let oy = 36;
  if (mission.timeLimit) { const left = Math.max(0, mission.timeLimit - MS.t); hudText('TIEMPO  ' + fmtClock(left), HW - 28, oy, FM(15), left < 30 ? C_DANGER : C_BONE, 'right'); oy += 22; }
  for (const o of MS.objs) {
    if (!o.shown || (o.done && MS.t - o.doneT > 8)) continue;   // (v34: los cumplidos se van a los 8 s: en un capítulo se acumulan)
    hudText((o.optional ? '◇ ' : '') + o.hud + '  ' + Math.min(o.n, o.count) + ' / ' + o.count, HW - 28, oy, FM(15), o.done ? C_GOLD : C_BONE, 'right'); oy += 22;
  }
  if (fleetEscapes() && !MS.ended) {                       // v23: lo que le falta a la flota para escapar (el dirigible más cercano al borde)
    const ed = airshipEdgeDist();
    if (ed < Infinity) { hctx.globalAlpha = ed < 2000 ? 0.65 + 0.35 * Math.sin(gameTime * 8) : 1; hudText('BORDE  ' + fmtDist(Math.max(0, ed)), HW - 28, oy, FM(15), ed < 2000 ? C_DANGER : C_BONE, 'right'); hctx.globalAlpha = 1; oy += 22; }
  }
  hudText('PUNTOS  ' + towerState.score, HW - 28, oy, FM(15), C_GOLD, 'right');
  if (DESIGN.on) drawDesign(heading);                      // v19: modo diseño (º): coordenadas, semilla y marcas
  if (mission.dev) hudText('DEV TEST  ·  Tab: panel de pruebas' + (DEV.fps ? '  ·  ' + Math.round(fpsEMA) + ' FPS  ·  ' + (1000 / Math.max(fpsEMA, 1)).toFixed(1) + ' ms' : ''), 28, 30, FM(12), DEV.fps ? C_GOLD : C_DIM);   // v27
  hctx.shadowBlur = 0;
}

/* ---------- Mundo: actualizaciones por fotograma ---------- */
const _cp = new THREE.Vector3(), _cpA = new THREE.Vector3(), _cpH = new THREE.Vector3(), _cpQ = new THREE.Quaternion();
const FOV_BASE = [76, 88];                                 // campo de visión vertical (°) despacio y a la velocidad de crucero (v27: con nombre, para el panel de pruebas)
const HEAD_BASE = new THREE.Vector3(0, 1.5, -6);           // v27: base del cuello en ejes del dragón (desde ahí mira la cabeza al punto de la mira)
let islT = 0, towerT = 0, lastBeep = 0, fpsEMA = 60;
const beatSh = { a: 0, t: 0 };                             // v32: temblor del golpe de ala (fuerza y s desde el golpe)
function updateWorld(dt) {
  const p = dragon.position;
  refreshTerrainSelection(p.x, p.y, p.z, false);
  pumpTerrain(5);
  towerT -= dt; if (towerT <= 0) { towerT = 0.5; updateTowerStreaming(p.x, p.z); }
  islT -= dt; if (islT <= 0) { islT = 0.4; updateIslandStreaming(p.x, p.z); }
  pumpIslands(3); updateWaterfalls(dt);
  threat.lock = 0; threat.incoming.length = 0;            // los rellenan las torres, los dragones y las bolas guiadas en camino
  updateTowerAI(dt); updateBolts(dt); updateEnemies(dt); updateAlly(dt); updateFireballs(dt); updateAirships(dt); updateUnits(dt);   // (v21: dirigibles, tras los proyectiles: su explosión usa la luz de las bolas; v23: el aliado; v29: unidades nuevas, 6f)
  updateParticles(fxAdd, dt); updateParticles(fxSmoke, dt); updateParticles(fxTrail, dt); updateScorch(); devDebug();   // (v31: fxTrail, la estela del superdirigible que cae)   // (v27: quemaduras, 13b; hitboxes del modo Dev Test, 19d)
  const sn = clamp((F.speed - VMIN) / (VCRUISE_MAX - VMIN), 0, 1.4);
  const fwdY = _cp.set(0, 0, -1).applyQuaternion(dragon.quaternion).y;
  // v27: en partida, la cabeza mira al punto de la mira (F.aimPt) desde la base del cuello, no en la dirección de la mira desde la cámara (cerca
  // del suelo no es lo mismo); y en vuelo recto (Espacio) entra la cámara de apuntado (AIM_CAM, en animateHero)
  const play = state === 'playing', aimCam = play && F.straight && F.locked && !F.lookHeld && !F.tgtCam && !cine.on;
  let headAim = F.aimLocal, aimPt = null;
  if (play) { aimPt = _cpA.copy(F.aimPt).sub(p).applyQuaternion(_cpQ.copy(dragon.quaternion).invert()); headAim = _cpH.copy(aimPt).sub(HEAD_BASE).normalize(); }
  animateHero(dt, { throttle: F.throttle, flapTarget: F.flapTarget, aimLocal: headAim, yawRate: F.rate.y, pitchRate: F.rate.p, fire: F.fireFlash, third: F.third || aimCam || CC.k > 0.02, menu: state === 'menu',   // (v34: con un plano de cine, el jinete entero) hover: F.hoverK, boost: F.boostFx, climb: F.hvy / HOVER_VSPEED, dive: smooth(0.15, 0.6, -fwdY), aimCam, aimPt,
    effort: F.effort, roll: F.roll, dodgeOff: F.dodgeCam });   // (v32: esfuerzo con W, tonel de la esquiva y cámara que se queda atrás)
  updateKnight(); updateAttacks(dt);
  if (camShake > 0.002) {
    camera.position.x += (Math.random() - 0.5) * camShake * 0.7; camera.position.y += (Math.random() - 0.5) * camShake * 0.7;
    camera.rotation.z += (Math.random() - 0.5) * camShake * 0.04;   // (v13: suma; el alabeo de la cámara ya no es 0)
    camShake *= Math.exp(-dt * 4.5);
  }
  // v32: golpe de ala: el sonido (un trozo del aleteo al azar, programado para que su pico caiga en el golpe) y un temblor leve de cámara que
  // se apaga en ~0,3 s (menos al planear; más lejano en 3ª persona)
  const flapAmt = dragonAnim.flap * (1 - 0.9 * (dragonAnim.glide || 0)), nearF = lerp(1, 0.7, dragonAnim.cam);
  if (state === 'playing' && dragonAnim.beatIn) sfx.wingBeat(flapAmt, nearF, dragonAnim.beatIn);
  if (state === 'playing' && dragonAnim.beat && flapAmt > 0.1) { beatSh.a = flapAmt; beatSh.t = 0; }
  if (beatSh.a > 0.005) {
    beatSh.t += dt;
    const e = beatSh.a * Math.exp(-beatSh.t * BEAT_SHAKE[3]), w = beatSh.t * Math.PI * 2;
    camera.position.y += e * BEAT_SHAKE[0] * Math.sin(w * 6);
    camera.rotation.x -= e * BEAT_SHAKE[1] * Math.sin(w * 6 + 0.6); camera.rotation.z += e * BEAT_SHAKE[2] * Math.sin(w * 9 + 1.3);
    if (e < 0.005) beatSh.a = 0;
  }
  // boost: temblor suave (ondas de 7-11 Hz, no saltos al azar), más fuerte en el golpe al activarlo
  const bsh = F.boostFx * BOOST_SHAKE[0] + F.kickFx * BOOST_SHAKE[1] + SPEED_SHAKE * smooth(VCRUISE_MAX * 1.15, VMAX, F.speed) * (state === 'playing' ? 1 : 0);   // (v13) y un temblor leve a mucha velocidad
  if (bsh > 1e-5) {
    const t = gameTime;
    camera.rotation.x += (Math.sin(t * 71) * 0.6 + Math.sin(t * 53 + 1.3) * 0.4) * bsh;
    camera.rotation.y += (Math.sin(t * 64 + 0.7) * 0.6 + Math.sin(t * 47 + 2.1) * 0.4) * bsh;
    camera.rotation.z += Math.sin(t * 58 + 0.3) * bsh * 0.6;
  }
  let fov = lerp(FOV_BASE[0], FOV_BASE[1], clamp(sn, 0, 1)) + F.fireFlash * 1.5 + F.boostFx * BOOST_FOV + F.kickFx * BOOST_KICK_FOV - F.hoverK * 2 + SPEED_FOV * smooth(VCRUISE_MAX, VMAX, F.speed);
  if (CC.fov && CC.k > 0.001) fov = lerp(fov, CC.fov, CC.k);   // v34: el zoom de un plano de cine (19e)
  if (Math.abs(fov - camera.fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  updateWind(F.boostFx);
  const sc = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  fxAdd.mat.uniforms.uScale.value = sc; fxSmoke.mat.uniforms.uScale.value = sc;
  skyMat.uniforms.uTime.value = gameTime; waterMat.uniforms.uTime.value = gameTime;
  waterMesh.position.x = Math.round(p.x / 512) * 512; waterMesh.position.z = Math.round(p.z / 512) * 512;
  // sonido y aviso de proyectiles (v32: el aleteo, arriba, con el golpe de ala); viento según velocidad y aceleración
  F.accS += ((F.speed - F.prevSpeed) / Math.max(dt, 1e-3) - F.accS) * (1 - Math.exp(-dt * 3)); F.prevSpeed = F.speed;
  sfx.update(clamp(sn, 0, 1), F.throttle, F.boostFx, F.hoverK, state === 'playing' ? F.speed / VMAX : 0, F.accS);
  // avisos: bola guiada en camino > te están fijando > virote o bola cerca
  const near = threat.incoming.reduce((m, f) => Math.min(m, f.pos.distanceTo(p)), 1e9);
  if (state === 'playing' && threat.incoming.length) {
    setWarn('¡PROYECTIL APROXIMÁNDOSE!', '', 0.4 + 0.6 * Math.abs(Math.sin(gameTime * 14)));
    if (gameTime - lastBeep > lerp(0.09, 0.4, clamp(near / 2500, 0, 1))) { lastBeep = gameTime; sfx.warnMissile(); }
  } else if (state === 'playing' && threat.lock > 0.05) {
    setWarn('TE ESTÁN FIJANDO', 'var(--gold)', 0.45 + 0.55 * Math.abs(Math.sin(gameTime * 6)));
    if (gameTime - lastBeep > 0.6) { lastBeep = gameTime; sfx.warnLock(); }
  } else if (boltWarn > 0.02 && state === 'playing') {
    setWarn('PROYECTIL', '', 0.45 + 0.55 * Math.abs(Math.sin(gameTime * 9)));
    if (gameTime - lastBeep > 0.55 - boltWarn * 0.35) { lastBeep = gameTime; sfx.beep(); }
  } else warnEl.style.opacity = '0';
  vigAlpha = Math.max(0, vigAlpha - dt * 1.5); vigEl.style.opacity = String(vigAlpha);
  updateRider(dt);                                         // al final: la cámara ya está colocada (temblores y campo de visión incluidos)
}

