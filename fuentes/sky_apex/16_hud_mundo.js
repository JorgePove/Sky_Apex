/* ============================================================
   8. HUD (canvas 2D), BUCLE PRINCIPAL Y ARRANQUE
   ============================================================ */
const hctx = hudEl.getContext('2d');
const C_BONE = '#f1e6d3', C_DIM = 'rgba(241,230,211,.62)', C_EMBER = '#ff7a2e', C_GOLD = '#f2b84b', C_DANGER = '#ff4a3a';
const FM = n => `${n}px 'Share Tech Mono', ui-monospace, monospace`;
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
    // slots de escudo: rayas azules bajo la mira (la que está en uso se vacía mientras dura; v39: las gastadas se vuelven a llenar, más
    // apagadas, durante su recarga)
    for (let i = 0; i < W.shCd.length; i++) {
      const x = a.x - (W.shCd.length * 15 - 2) / 2 + i * 15, y = a.y + 33;   // (v24: centradas, sean las que sean)
      hctx.fillStyle = 'rgba(4,6,10,.88)'; hctx.fillRect(x - 1, y - 1, 15, 6);
      const use = i === W.shUse && W.shieldT > 0, cd = W.shCd[i];
      const f = use ? W.shieldT / SHIELD_T : cd > 0 ? 1 - cd / Math.max(SHIELD_CD, 0.01) : 1;
      if (f > 0) { hctx.fillStyle = use ? '#9fd8ff' : cd > 0 ? 'rgba(63,169,255,.38)' : '#3fa9ff'; hctx.fillRect(x, y, 13 * f, 4); }
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
  const hx = HW / 2 - 190, hy = dy < 0 ? HH / 2 - 100 : HH / 2 - 130 * HUD_K;      // márgenes: brújula arriba, vida abajo
  const t = 1 / Math.hypot(dx / hx, dy / hy);                                       // (v39: en una elipse: en las esquinas no pisa el minimapa ni las armas)
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
/* v39: minimapa cuadrado (abajo a la izquierda; mockup de Jorge), con el rumbo hacia arriba: tú, abajo del centro (a 2/3 del alto), con
   más campo por delante; anillos a 750 m, 1,5 y 3 km (el de 3 km toca los lados); cruz y líneas a las esquinas de arriba; N, E, S y W en
   el borde; debajo, el relieve del terreno en verde (MM). Lo que queda fuera, en el borde, en su dirección. Símbolos como el radar redondo
   de antes: TGT en rojo vivo y lo demás apagado; el blanco fijado, con un círculo dorado. */
const MM_RANGE = 3000, MM_RINGS = [750, 1500, 3000];       // m del jugador a los lados; anillos (m)
const MM_N = 96, MM_SPAN = 12000, MM_MOVE = 700, MM_ROWS = 8;   // relieve: textura de MM_N² texels con MM_SPAN m de lado; se rehace al alejarse MM_MOVE m, MM_ROWS filas por fotograma
const MM = { cv: null, g: null, img: null, h: null, key: '', cx: 0, cz: 0, ready: false, b: null };
/* Relieve del terreno para el minimapa, hecho por filas en varios fotogramas (heightAt cuesta ~1 µs): sombreado desde el noroeste, más
   claro cuanto más alto, y el agua oscura. Mientras se hace la nueva, se dibuja la anterior. */
function minimapTerrain(px, pz) {
  const key = WORLD.seed + '|' + WORLD.shape, n = MM_N + 2;   // (un texel de margen para las pendientes)
  if (!MM.cv) {
    MM.cv = document.createElement('canvas'); MM.cv.width = MM.cv.height = MM_N; MM.g = MM.cv.getContext('2d');
    MM.img = MM.g.createImageData(MM_N, MM_N); MM.h = new Float32Array(n * n);
  }
  if (key !== MM.key) { MM.key = key; MM.ready = false; MM.b = null; }
  if (!MM.b && (!MM.ready || Math.hypot(px - MM.cx, pz - MM.cz) > MM_MOVE)) MM.b = { cx: px, cz: pz, row: 0 };
  const b = MM.b; if (!b) return;
  const s = MM_SPAN / MM_N, x0 = b.cx - MM_SPAN / 2 - s, z0 = b.cz - MM_SPAN / 2 - s, H = MM.h;
  for (let r = 0; r < MM_ROWS && b.row < n; r++, b.row++) for (let i = 0; i < n; i++) H[b.row * n + i] = heightAt(x0 + (i + 0.5) * s, z0 + (b.row + 0.5) * s);
  if (b.row < n) return;
  const d = MM.img.data, Hs = MM.hs || (MM.hs = new Float32Array(n * n));
  const at = (i, j) => H[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)  // suavizado 3 × 3: sin motas de ríos estrechos ni escalones entre texels
    Hs[j * n + i] = (4 * at(i, j) + 2 * (at(i - 1, j) + at(i + 1, j) + at(i, j - 1) + at(i, j + 1)) + at(i - 1, j - 1) + at(i + 1, j - 1) + at(i - 1, j + 1) + at(i + 1, j + 1)) / 16;
  for (let j = 0; j < MM_N; j++) for (let i = 0; i < MM_N; i++) {
    const c = (j + 1) * n + i + 1, hc = Hs[c], o = (j * MM_N + i) * 4;
    const gx = (Hs[c + 1] - Hs[c - 1]) / (2 * s), gz = (Hs[c + n] - Hs[c - n]) / (2 * s);
    const lam = clamp((0.5 * (gx + gz) + 0.707) / Math.sqrt(gx * gx + gz * gz + 1), 0, 1);   // luz del noroeste (plano: 0,71)
    const v = 60 + 150 * lam + 45 * clamp((hc - WL) / 1600, 0, 1), wt = clamp((WL + 1.5 - hc) / 3, 0, 1);   // wt: agua (hacia el fondo, más)
    d[o] = lerp(v * 0.38, 10, wt); d[o + 1] = lerp(v, 46, wt); d[o + 2] = lerp(v * 0.55, 44, wt); d[o + 3] = lerp(175, 215, wt);
  }
  MM.g.putImageData(MM.img, 0, 0); MM.cx = b.cx; MM.cz = b.cz; MM.ready = true; MM.b = null;
}
function drawMinimap(heading, fwd) {
  const k = HUD_K, S = 242 * k, cxs = HW / 2;
  const xa = Math.max(16 * k, cxs - 711.5 * k), yb = HH - 47 * k, ya = yb - S, xb = xa + S;   // (a la izquierda del centro; en pantallas estrechas, pegado al borde)
  const cx = xa + S / 2, cy = ya + S * 0.667, kk = (S / 2) / MM_RANGE;                     // tú y px por m
  const hl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / hl, fz = fwd.z / hl, rx = -fz, rz = fx, p = dragon.position;
  minimapTerrain(p.x, p.z);
  hctx.save(); hctx.shadowBlur = 0;
  hctx.beginPath(); hctx.rect(xa, ya, S, S); hctx.clip();
  hctx.fillStyle = 'rgba(16,64,34,.5)'; hctx.fillRect(xa, ya, S, S);
  if (MM.ready) {                                          // relieve: la textura (norte arriba) girada con tu rumbo
    const s = MM_SPAN / MM_N, X0 = MM.cx - MM_SPAN / 2 - p.x, Z0 = MM.cz - MM_SPAN / 2 - p.z;
    hctx.save(); hctx.globalAlpha = 0.72; hctx.imageSmoothingEnabled = true; hctx.imageSmoothingQuality = 'high';
    hctx.transform(kk * s * rx, -kk * s * fx, kk * s * rz, -kk * s * fz, cx + kk * (rx * X0 + rz * Z0), cy - kk * (fx * X0 + fz * Z0));
    hctx.drawImage(MM.cv, 0, 0); hctx.restore();
  }
  const A = mission.area;
  if (A) {                                                 // v15: área de la misión: fuera de ella, sombreado rojo; el borde, discontinuo
    const dx = A.x - p.x, dz = A.z - p.z, ox = cx + (dx * rx + dz * rz) * kk, oy = cy - (dx * fx + dz * fz) * kk, rr = A.r * kk;
    hctx.beginPath(); hctx.rect(xa, ya, S, S); hctx.arc(ox, oy, rr, 0, 6.283);
    hctx.fillStyle = 'rgba(255,74,58,.2)'; hctx.fill('evenodd');
    hctx.setLineDash([5, 4]); hctx.strokeStyle = 'rgba(255,74,58,.9)'; hctx.lineWidth = 1.6;
    hctx.beginPath(); hctx.arc(ox, oy, rr, 0, 6.283); hctx.stroke(); hctx.setLineDash([]);
  }
  hctx.strokeStyle = G_MAP; hctx.lineWidth = 1;            // anillos, cruz y líneas a las esquinas de arriba
  hctx.globalAlpha = 0.5;
  for (const r of MM_RINGS) { hctx.beginPath(); hctx.arc(cx, cy, r * kk, 0, 6.283); hctx.stroke(); }
  hctx.beginPath(); hctx.moveTo(xa, cy); hctx.lineTo(xb, cy); hctx.moveTo(cx, ya); hctx.lineTo(cx, yb);
  hctx.moveTo(xa, ya); hctx.lineTo(cx, cy); hctx.lineTo(xb, ya); hctx.stroke();
  hctx.globalAlpha = 1;
  const at = (x, z) => {                                   // punto del mundo → minimapa; fuera del cuadrado, en el borde (_rp.far)
    const dx = x - p.x, dz = z - p.z, ox = (dx * rx + dz * rz) * kk, oy = -(dx * fx + dz * fz) * kk, m = 4 * k;
    let t = 1;
    if (ox < xa + m - cx) t = Math.min(t, (xa + m - cx) / ox); else if (ox > xb - m - cx) t = Math.min(t, (xb - m - cx) / ox);
    if (oy < ya + m - cy) t = Math.min(t, (ya + m - cy) / oy); else if (oy > yb - m - cy) t = Math.min(t, (yb - m - cy) / oy);
    _rp.x = cx + ox * t; _rp.y = cy + oy * t; _rp.d = Math.hypot(dx, dz); _rp.far = t < 1; return _rp;
  };
  for (const [l, wx, wz] of [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]]) {   // puntos cardinales en el borde
    const q = at(p.x + wx * 1e6, p.z + wz * 1e6), ix = clamp(q.x, xa + 9 * k, xb - 9 * k), iy = clamp(q.y, ya + 10 * k, yb - 8 * k);
    hudText(l, ix, iy + 5 * k, FG(13 * k), l === 'N' ? C_EMBER : G_LABEL, 'center');
  }
  // v21: los TGT, en rojo vivo; lo que no cuenta para la misión, apagado. El blanco fijado, con un círculo dorado.
  const col = (tgt, far, fill) => tgt ? (far ? (fill ? 'rgba(255,74,58,.45)' : 'rgba(255,74,58,.55)') : C_DANGER) : 'rgba(241,180,170,.35)';
  const ang = () => Math.atan2(_Eef.x * rx + _Eef.z * rz, _Eef.x * fx + _Eef.z * fz);
  for (const t of TOWER_SITES) {                           // todas las torres que quedan; las de fuera, en el borde (para encontrarlas)
    if (t.dead) continue;
    const tgt = isTgt(t), q = at(t.x, t.z);
    if (t.isl) { hctx.strokeStyle = col(tgt, q.far, false); hctx.lineWidth = 1.6; hctx.strokeRect(q.x - 3.5, q.y - 3.5, 7, 7); }   // v13: en una isla, cuadrado hueco
    else { hctx.fillStyle = col(tgt, q.far, true); hctx.fillRect(q.x - 3, q.y - 3, 6, 6); }
  }
  for (const s of airships) {                              // v21: dirigibles: cápsula hueca a lo largo de su eslora
    if (s.dead) continue;
    const tgt = isTgt(s), q = at(s.pos.x, s.pos.z);
    _Eef.set(0, 0, -1).applyQuaternion(s.q);
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(ang());
    hctx.strokeStyle = col(tgt, q.far, false); hctx.lineWidth = 1.8;
    hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(2.8, -3); hctx.lineTo(2.8, 4.5); hctx.lineTo(-2.8, 4.5); hctx.lineTo(-2.8, -3); hctx.closePath(); hctx.stroke();
    hctx.restore();
  }
  for (const u of UNITS) {                                 // v29: unidades nuevas (las montadas, no: va su unidad)
    if (u.dead || !u.radar) continue;
    const tgt = isTgt(u) || u.kids.some(c => !c.dead && isTgt(c)), q = at(u.pos.x, u.pos.z), far = q.far;
    if (u.radar === 'sq') { hctx.fillStyle = col(tgt, far, true); hctx.fillRect(q.x - 2.5, q.y - 2.5, 5, 5); continue; }
    if (u.radar === 'rect') { hctx.fillStyle = col(tgt, far, true); hctx.fillRect(q.x - 4, q.y - 2, 8, 4); continue; }
    if (u.radar === 'serpent') { hctx.strokeStyle = col(tgt, far, false); hctx.lineWidth = 2; hctx.beginPath(); hctx.arc(q.x, q.y, 6, 0, 6.283); hctx.stroke(); hctx.beginPath(); hctx.arc(q.x, q.y, 2.5, 0, 6.283); hctx.stroke(); continue; }
    _Eef.set(0, 0, -1).applyQuaternion(u.q);                 // barcos y superdirigible: cápsula hueca a lo largo del casco (el superdirigible, más grande)
    const sc = u.radar === 'super' ? 1.6 : 1;
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(ang()); hctx.scale(sc, sc);
    hctx.strokeStyle = col(tgt, far, false); hctx.lineWidth = 1.8 / sc;
    hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(2.8, -3); hctx.lineTo(2.8, 4.5); hctx.lineTo(-2.8, 4.5); hctx.lineTo(-2.8, -3); hctx.closePath(); hctx.stroke();
    hctx.restore();
  }
  for (const e of enemies) {                               // dragones enemigos: triángulos rojos orientados según su rumbo
    if (e.dead || e.off) continue;
    const tgt = isTgt(e), q = at(e.pos.x, e.pos.z);
    _Eef.set(0, 0, -1).applyQuaternion(e.q);
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(ang());
    hctx.fillStyle = col(tgt, q.far, true); hctx.strokeStyle = 'rgba(25,6,6,.8)'; hctx.lineWidth = 1;
    hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(-4.5, 4.5); hctx.lineTo(4.5, 4.5); hctx.closePath(); hctx.fill(); hctx.stroke();
    hctx.restore();
  }
  const L = enemyLock.e;
  if (L && !L.dead) { const q = at(L.pos.x, L.pos.z); hctx.strokeStyle = C_GOLD; hctx.lineWidth = 1.5; hctx.beginPath(); hctx.arc(q.x, q.y, 8.5, 0, 6.283); hctx.stroke(); }
  for (const al of allies) {                               // v23: el aliado, triángulo azul hueco (v34: todos)
    if (!al.on) continue;
    const e = al.e, q = at(e.pos.x, e.pos.z); _Eef.set(0, 0, -1).applyQuaternion(e.q);
    hctx.save(); hctx.translate(q.x, q.y); hctx.rotate(ang());
    hctx.strokeStyle = C_ALLY; hctx.lineWidth = 1.8; hctx.beginPath(); hctx.moveTo(0, -6.5); hctx.lineTo(-4.5, 4.5); hctx.lineTo(4.5, 4.5); hctx.closePath(); hctx.stroke();
    hctx.restore();
  }
  for (const f of fireballs) {                             // bolas guiadas enemigas: puntos rojos que parpadean
    if (f.kind !== 'emsl' || f.lost) continue;
    const q = at(f.pos.x, f.pos.z);
    hctx.globalAlpha = 0.5 + 0.5 * Math.sin(gameTime * 14); hctx.fillStyle = C_DANGER;
    hctx.beginPath(); hctx.arc(q.x, q.y, 3.2, 0, 6.283); hctx.fill();
  }
  hctx.globalAlpha = 1;                                    // tú: flecha verde
  hctx.fillStyle = G_MAP; hctx.strokeStyle = 'rgba(4,30,12,.85)'; hctx.lineWidth = 1.2;
  hctx.beginPath(); hctx.moveTo(cx, cy - 8 * k); hctx.lineTo(cx - 5.5 * k, cy + 6 * k); hctx.lineTo(cx, cy + 3 * k); hctx.lineTo(cx + 5.5 * k, cy + 6 * k); hctx.closePath(); hctx.fill(); hctx.stroke();
  hctx.restore();
  hctx.save(); hctx.shadowBlur = 0; hctx.strokeStyle = 'rgba(111,237,124,.55)'; hctx.lineWidth = 1; hctx.strokeRect(xa + 0.5, ya + 0.5, S - 1, S - 1); hctx.restore();
}
const _rp = { x: 0, y: 0, d: 0, far: false };
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
    const R = Math.min(HW, HH) * 0.36, x = HW / 2 + dx * R, y = HH / 2 + dy * R;   // (v39: fuera de las cajas de SPEED y ALT; antes 0,24)
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
    const R = Math.min(HW, HH) * 0.36, x = HW / 2 + dx * R, y = HH / 2 + dy * R;   // (v39: antes 0,31)
    hctx.translate(x, y); hctx.rotate(Math.atan2(dy, dx));
    hctx.fillStyle = C_GOLD; hctx.strokeStyle = 'rgba(25,16,4,.9)'; hctx.lineWidth = 1.5;
    hctx.beginPath(); hctx.moveTo(24, 0); hctx.lineTo(-12, -16); hctx.lineTo(-4, 0); hctx.lineTo(-12, 16); hctx.closePath(); hctx.fill(); hctx.stroke();
  }
  hctx.restore(); hctx.globalAlpha = 1;
}
/* ---------- v39: HUD al estilo de Ace Combat (mockup de Jorge, tras la primera prueba con un jugador externo) ----------
   Verde, minimalista y más cerca del centro, para no tener que pasear la vista; textos y números en Graduate. SPEED y ALT a los lados de
   la marca blanca de la trayectoria (no de la mira naranja) y, bajo SPEED, el boost en naranja; abajo, el minimapa cuadrado (izquierda),
   la vida (centro) y las armas (derecha). Medidas del mockup en px con la ventana a 864 de alto: HUD_K las escala con el alto. */
const FG = n => `${n.toFixed(1)}px 'Graduate', 'Share Tech Mono', ui-monospace, monospace`, G_CAP = 0.75;   // Graduate: alto de mayúsculas y cifras (em)
const HB_GREEN = { line: '#146b2d', fill: '#aef0c7', ink: '#0c682e', empty: 'rgba(6,36,18,.55)' };
const HB_BOOST = { line: '#e8a462', fill: '#f8d3af', ink: '#84541d', empty: 'rgba(42,22,6,.5)' };
const HB_RED = { line: '#8a1c12', fill: '#ff9a8a', ink: '#6a0f08', empty: 'rgba(48,8,4,.55)' };
const G_LABEL = '#bde8c2', B_LABEL = '#fbd8bf', G_MAP = '#6fed7c';
let HUD_K = 1;
try { document.fonts.load("20px 'Graduate'"); } catch (e) { }   // (el lienzo no la pide solo: sin esto, los primeros fotogramas salen con otra)
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const HB_HEAT = [HB_GREEN, { line: '#7a4a0c', fill: '#ffd27a', ink: '#5a3606' }, HB_RED].map(P => ({ line: hexRGB(P.line), fill: hexRGB(P.fill), ink: hexRGB(P.ink) }));
const _hbMix = { empty: HB_GREEN.empty };
function hbHeat(t) {                                       // verde (0) → ámbar (0,5) → rojo (1): la barra de la llamarada según se calienta
  const u = clamp(t, 0, 1) * 2, A = HB_HEAT[u < 1 ? 0 : 1], B = HB_HEAT[u < 1 ? 1 : 2], f = u < 1 ? u : u - 1;
  for (const c of ['line', 'fill', 'ink']) _hbMix[c] = 'rgb(' + A[c].map((v, i) => Math.round(v + (B[c][i] - v) * f)).join(',') + ')';
  _hbMix.empty = t > 0.5 ? HB_RED.empty : HB_GREEN.empty;
  return _hbMix;
}
/* Caja o barra: borde de 2 px; lo lleno (fracción f, de izquierda a derecha) claro y lo vacío oscuro y translúcido; el texto, centrado,
   oscuro sobre lo lleno y claro sobre lo vacío. size: px de la fuente. */
function hudBox(x, y, w, h, f, txt, size, P) {
  const k = HUD_K, fw = w * clamp(f, 0, 1);
  hctx.fillStyle = P.empty; hctx.fillRect(x, y, w, h);
  if (fw > 0) { hctx.fillStyle = P.fill; hctx.fillRect(x, y, fw, h); }
  hctx.lineWidth = 2 * k; hctx.strokeStyle = P.line; hctx.strokeRect(x + k, y + k, w - 2 * k, h - 2 * k);
  if (!txt) return;
  const sb = hctx.shadowBlur; hctx.shadowBlur = 0;
  hctx.font = FG(size); hctx.textAlign = 'center';
  const ty = y + h / 2 + size * G_CAP / 2;
  for (const [x0, ww, col] of [[x, fw, P.ink], [x + fw, w - fw, P.fill]]) {
    if (ww <= 0.01) continue;
    hctx.save(); hctx.beginPath(); hctx.rect(x0, y, ww, h); hctx.clip(); hctx.fillStyle = col; hctx.fillText(txt, x + w / 2, ty); hctx.restore();
  }
  hctx.shadowBlur = sb;
}
function hudLabel(txt, x, y, size, col, align) {           // rótulo con una sombra suave (y: línea base)
  hctx.save(); hctx.shadowColor = 'rgba(0,0,0,.5)'; hctx.shadowBlur = 3 * HUD_K;
  hudText(txt, x, y, FG(size), col, align || 'center'); hctx.restore();
}
/* SPEED y ALT, cajas de 80 × 32 a 209 px a cada lado de la marca blanca de la trayectoria y a su altura (la siguen, algo suavizado y sin
   alejarse mucho del centro). Bajo SPEED, la barra del boost con su porcentaje y «BOOST»; bajo ALT, «HOVER» en hover. ALT es la altitud
   sobre el nivel del agua, no sobre el suelo. */
const _anc = { x: 0, y: 0, t: -1 };
function drawFlightBoxes() {
  const k = HUD_K, now = performance.now() / 1000, dt = now - _anc.t;
  const tx = clamp(_sp.x, HW / 2 - HW * 0.12, HW / 2 + HW * 0.12), ty = clamp(_sp.y, HH / 2 - HH * 0.15, HH / 2 + HH * 0.15);
  if (_anc.t < 0 || dt > 0.5) { _anc.x = tx; _anc.y = ty; } else { const a = 1 - Math.exp(-20 * dt); _anc.x += (tx - _anc.x) * a; _anc.y += (ty - _anc.y) * a; }
  _anc.t = now;
  const w = 80 * k, h = 32 * k, by = _anc.y - h / 2, sx = _anc.x - 209 * k - w / 2, ax = _anc.x + 209 * k - w / 2;
  hctx.save(); hctx.shadowBlur = 0;
  hudLabel('SPEED', sx + w / 2, by - 4 * k, 17.5 * k, G_LABEL);
  hudBox(sx, by, w, h, 1, String(Math.round(F.speed * 3.6)), 18.5 * k, HB_GREEN);
  const bb = by + h + 4 * k, out = F.boostExhausted;     // boost: barra naranja con su porcentaje; agotado, parpadea
  if (out) hctx.globalAlpha = 0.55 + 0.45 * Math.sin(gameTime * 9);
  hudBox(sx, bb, w, 20 * k, F.boost, Math.round(F.boost * 100) + '%', 10 * k, HB_BOOST);
  hctx.globalAlpha = 1;
  hudLabel('BOOST', sx + w / 2, bb + 20 * k + 19 * k, 18.5 * k, B_LABEL);
  hudLabel('ALT', ax + w / 2, by - 4 * k, 17.5 * k, G_LABEL);
  hudBox(ax, by, w, h, 1, String(Math.round(dragon.position.y - WL)), 18.5 * k, HB_GREEN);
  if (F.hover) { hctx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 4); hudLabel('HOVER', ax + w / 2, bb + 20 * k + 19 * k, 18.5 * k, G_LABEL); hctx.globalAlpha = 1; }
  hctx.restore();
}
/* Armas (abajo a la derecha, como en Ace Combat): GUN y MSL con su munición (la barra se vacía al gastarla), FLM con el calor de la
   llamarada (se llena mientras la usas y, según se llena, se vuelve roja y parpadea) y LSR con la carga del rayo (llena, parpadea y brilla).
   Durante el sobrecalentamiento o el rayo, las que no se pueden usar se apagan. */
function drawWeapons() {
  const k = HUD_K, w = 80 * k, h = 23 * k, pitch = 30.67 * k, size = 13.5 * k;
  let bx = HW / 2 + 528.5 * k, lx = HW / 2 + 463.5 * k;
  const over = bx + w - (HW - 16 * k); if (over > 0) { bx -= over; lx -= over; }   // (pantallas estrechas: pegado al borde)
  const y3 = HH - 47 * k - h, oh = W.overheat > 0, las = W.laser > 0, blink = 0.5 + 0.5 * Math.sin(gameTime * 9);
  hctx.save(); hctx.shadowBlur = 0;
  const row = (i, name, dim) => { const y = y3 - (3 - i) * pitch; hctx.globalAlpha = dim ? 0.35 : 1; hudLabel(name, lx, y + h / 2 + 18 * k * G_CAP / 2, 18 * k, G_LABEL, 'left'); return y; };
  let y = row(0, 'GUN', oh || las);
  hudBox(bx, y, w, h, W.ammo / GUN_AMMO, W.ammo + '/' + GUN_AMMO, size, HB_GREEN);
  y = row(1, 'MSL', oh || las);
  hudBox(bx, y, w, h, MSL_AMMO > 0 ? W.msl / MSL_AMMO : 0, W.msl + '/' + MSL_AMMO, size, HB_GREEN);
  y = row(2, 'FLM', las);
  const heat = clamp(W.heat, 0, 1), red = oh ? 1 : heat;
  if (oh) hctx.globalAlpha = 0.55 + 0.45 * blink;
  else if (heat > 0.02) hctx.globalAlpha *= 1 - 0.55 * heat * heat * (0.5 + 0.5 * Math.sin(gameTime * (4 + 10 * heat)));
  hudBox(bx, y, w, h, heat, Math.round(heat * 100) + '%', size, hbHeat(red));
  y = row(3, 'LSR', oh);
  const full = W.ult >= 1 && !las;
  if (las || (full && !oh)) { hctx.shadowColor = G_MAP; hctx.shadowBlur = (las ? 12 : 6 + 12 * blink) * k; if (full) hctx.globalAlpha = 0.6 + 0.4 * blink; }
  hudBox(bx, y, w, h, W.ult, Math.floor(W.ult * 100 + 1e-6) + '%', size, HB_GREEN);
  hctx.restore();
}
/* Vida (abajo, en el centro): caja de 118 × 32 con «vida/máxima» que se vacía de derecha a izquierda; en rojo por debajo del 35 %. v39: sin
   armadura; tras HP_REGEN_WAIT s sin recibir daño se rellena a HP_REGEN por segundo (mientras tanto, late). */
function drawHealth() {
  const k = HUD_K, w = 118 * k, h = 32 * k, x = HW / 2 - w / 2, y = HH - 47 * k - h, hpMax = heroHpMax(), f = clamp(F.health / hpMax, 0, 1);
  const regen = F.health < hpMax && F.health > 0 && gameTime - F.lastHit > HP_REGEN_WAIT && state === 'playing';
  hctx.save(); hctx.shadowBlur = 0;
  if (regen) hctx.globalAlpha = 0.84 + 0.16 * Math.sin(gameTime * 6);
  hudBox(x, y, w, h, f, Math.ceil(F.health) + '/' + fmtStat(hpMax), 18.5 * k, f <= 0.35 ? HB_RED : HB_GREEN);
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
  HW = window.innerWidth; HH = window.innerHeight; HUD_K = clamp(HH / 864, 0.75, 1.5);   // (v39: escala del HUD)
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
  drawMinimap(heading, fwd);                               // (v39: el HUD de Ace Combat; antes, radar redondo, velocidad e instrumentos a los lados)
  drawWeapons();
  drawMissileWarn();
  if (MS.out && state === 'playing') drawAreaArrow();       // v15: fuera del área de la misión
  drawFlightBoxes();
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
  updateClouds(dt);                                        // v38: nubes que se atraviesan (7b)
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

