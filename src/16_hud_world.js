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
const COMPASS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };   // (v40: en inglés, como el resto del HUD)

/* Brújula (arriba, en el centro). v40: con el estilo del HUD (verde con halo, Graduate) y el rumbo en un panel bajo la flecha. */
function drawCompass(heading) {
  if (HUD_ARC) return arcCompass(heading);                  // v48: estilo arcano (16b)
  const k = HUD_K, P = PAL_G, cw = Math.min(520 * k, HW - 40), cx = HW / 2, cy = 34 * k, ppd = cw / 90;
  hctx.save(); hctx.beginPath(); hctx.rect(cx - cw / 2, cy - 24 * k, cw, 36 * k); hctx.clip();
  const bl = hctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);   // línea base, que se desvanece en los extremos
  bl.addColorStop(0, 'rgba(118,255,168,0)'); bl.addColorStop(0.5, 'rgba(118,255,168,.45)'); bl.addColorStop(1, 'rgba(118,255,168,0)');
  hctx.fillStyle = bl; hctx.fillRect(cx - cw / 2, cy + 6 * k, cw, k);
  hctx.strokeStyle = P.line; hctx.lineWidth = 1.2 * k; hctx.shadowColor = P.glow; hctx.shadowBlur = 4 * k;
  for (let d = Math.floor(heading - 46); d <= Math.ceil(heading + 46); d++) {
    if (d % 5) continue;
    const x = cx + (d - heading) * ppd, n = ((d % 360) + 360) % 360, big = d % 15 === 0;
    const edge = 1 - Math.pow(Math.abs(x - cx) / (cw / 2), 3);
    hctx.globalAlpha = clamp(edge, 0, 1) * 0.9;
    hctx.beginPath(); hctx.moveTo(x, cy + 6 * k); hctx.lineTo(x, cy + (big ? -4 : 1) * k); hctx.stroke();
    if (COMPASS[n] !== undefined) hudGlow(COMPASS[n], x, cy - 9 * k, (n % 90 === 0 ? 14 : 11) * k, n === 0 ? PAL_A.line : P.line, n === 0 ? PAL_A.glow : P.glow, 'center', 0.8 * k);
  }
  hctx.restore(); hctx.globalAlpha = 1;
  hctx.save(); hctx.fillStyle = P.ink; hctx.shadowColor = P.glow; hctx.shadowBlur = 6 * k;
  hctx.beginPath(); hctx.moveTo(cx, cy + 8 * k); hctx.lineTo(cx - 5 * k, cy + 15 * k); hctx.lineTo(cx + 5 * k, cy + 15 * k); hctx.closePath(); hctx.fill(); hctx.restore();
  hudPanel(cx - 25 * k, cy + 17 * k, 50 * k, 19 * k, P, 4 * k);
  hudGlow(String(Math.round(heading) % 360).padStart(3, '0'), cx, cy + 26.5 * k + 13 * k * G_CAP / 2, 13 * k, P.ink, P.glow, 'center', 0.8 * k);
}
function drawLadder(fwd) {
  const hl = Math.hypot(fwd.x, fwd.z);
  let hx, hz; if (hl < 0.05) { hx = 0; hz = -1; } else { hx = fwd.x / hl; hz = fwd.z / hl; }
  const rx = -hz, rz = hx, a = {}, b = {}, P = hpal(PAL_G);   // (v48: en el arcano, dorada con sombra parda)
  hctx.save(); hctx.lineWidth = 1.4; hctx.shadowColor = HUD_ARC ? ARC_SHADE : P.glow; hctx.shadowBlur = (HUD_ARC ? 3 : 4) * HUD_K;   // (v40: verde con halo, como el resto del HUD)
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
    hctx.globalAlpha = al; hctx.strokeStyle = d === 0 ? P.ink : P.line;
    const gap = d === 0 ? 0.18 : 0.30, ux = b.x - a.x, uy = b.y - a.y;
    hctx.beginPath();
    hctx.moveTo(a.x, a.y); hctx.lineTo(a.x + ux * (0.5 - gap), a.y + uy * (0.5 - gap));
    hctx.moveTo(a.x + ux * (0.5 + gap), a.y + uy * (0.5 + gap)); hctx.lineTo(b.x, b.y);
    hctx.stroke();
    if (d !== 0) {
      const tick = d > 0 ? 8 : -8;
      hctx.beginPath(); hctx.moveTo(a.x, a.y); hctx.lineTo(a.x, a.y + tick); hctx.moveTo(b.x, b.y); hctx.lineTo(b.x, b.y + tick); hctx.stroke();
      hudGlow(String(Math.abs(d)), a.x - 8, a.y + 4, 10 * HUD_K, P.line, P.glow, 'right');
    }
  }
  hctx.restore(); hctx.globalAlpha = 1;
}
const _pth = new THREE.Vector3();
function drawMarkers(fwd) {
  const p = {};
  // v28: el marcador pequeño es la trayectoria (hacia dónde va de verdad: su velocidad), no el morro; en hover o muy despacio, el morro.
  // Con él en el 0° de la escalera de cabeceo, vuela horizontal
  const v = F.speed > 20 && F.hoverK < 0.5 && state === 'playing' ? _pth.copy(dragonVel).normalize() : fwd;
  if (proj(_camP.x + v.x * 1000, _camP.y + v.y * 1000, _camP.z + v.z * 1000, p)) {
    if (HUD_ARC) arcPathMarker(p);                          // v48: estilo arcano (16b)
    else {
      hctx.strokeStyle = F.straight ? C_GOLD : C_BONE; hctx.lineWidth = 1.6; hctx.globalAlpha = 0.9;   // (v26: dorado en vuelo recto)
      hctx.beginPath(); hctx.arc(p.x, p.y, 8, 0, 6.283); hctx.moveTo(p.x - 22, p.y); hctx.lineTo(p.x - 8, p.y); hctx.moveTo(p.x + 8, p.y); hctx.lineTo(p.x + 22, p.y); hctx.moveTo(p.x, p.y - 8); hctx.lineTo(p.x, p.y - 15); hctx.stroke();
      if (F.straight) hudText('VUELO RECTO', p.x, p.y - 22, FM(11), C_GOLD, 'center');   // v26: Espacio mantenido (el morro marca la trayectoria fija)
    }
    _sp.x = p.x; _sp.y = p.y;
  } else { _sp.x = HW / 2; _sp.y = HH / 2; }
  const a = {};
  if (proj(_camP.x + F.aimWorld.x * 1000, _camP.y + F.aimWorld.y * 1000, _camP.z + F.aimWorld.z * 1000, a)) {
    if (HUD_ARC) { arcReticle(a); hctx.globalAlpha = 1; return; }   // v48: mira, escudos y calor arcanos (16b)
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
      hctx.shadowBlur = 0; hctx.fillStyle = 'rgba(2,8,18,.85)'; hctx.fillRect(x - 1, y - 1, 15, 6);
      const use = i === W.shUse && W.shieldT > 0, cd = W.shCd[i];
      const f = use ? W.shieldT / SHIELD_T : cd > 0 ? 1 - cd / Math.max(SHIELD_CD, 0.01) : 1;
      if (f > 0) { hctx.shadowColor = 'rgba(80,170,255,.8)'; hctx.shadowBlur = cd > 0 && !use ? 0 : 6; hctx.fillStyle = use ? '#bfe6ff' : cd > 0 ? 'rgba(63,169,255,.4)' : '#4fb2ff'; hctx.fillRect(x, y, 13 * f, 4); }   // (v40: con brillo)
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
/* ---------- v41: blancos en el HUD, como en Ace Combat ----------
   Cada enemigo lleva solo un marco verde a su alrededor: nada encima (los rombos rojos sobre los dirigibles se confundían con el blanco). La
   forma dice el tipo (FRAME_SHAPE): dragones y la sierpe, cuadrado; dirigibles, barcos y el superdirigible, círculo; torres, artillería,
   torretas y hechiceros, triángulo; batallones, rectángulo apaisado. Los que cuentan para la misión, más vivos y con «TGT» al lado; los
   demás, más tenues. El seleccionado (clic central) parpadea y lleva a su derecha la distancia (m), el nombre y, si está herido, su vida.
   Con la guiada, a tiro y cerca de la mira se fija sola (W.lock, 15): cuatro escuadras rojas se cierran sobre su marco y, fijado, el marco
   pasa a rojo con «LOCK». Fuera de la pantalla, una flecha verde alrededor del centro con su distancia. Los aliados, su chevrón azul. */
const FRAME_SHAPE = { dragon: 'sq', sierpe: 'sq', airship: 'ci', barco: 'ci', superdirigible: 'ci', tower: 'tri', artilleria: 'tri', torreta: 'tri', hechicero: 'tri', batallon: 'rect' };
const FRAME_EXT = { sq: 1, ci: 1.05, tri: 1.08, rect: 1.15 };   // del centro al lado derecho del marco, en medios tamaños
const FRAME_K = { dragon: 0.55 };                         // tamaño del marco respecto al medio tamaño del blanco (BLANCO.half: el del dragón es su envergadura, mucho mayor de lo que se ve)
const onScreenAt = a => a.x > 20 && a.x < HW - 20 && a.y > 20 && a.y < HH - 20;
const _fa = { x: 0, y: 0 }, _fl = [[], []];               // marcos tenues y TGT del fotograma: x, y, r, forma
function frameRange(t) {                                   // hasta dónde se marca cada tipo (m; el seleccionado, siempre)
  if (t.kind === 'dragon') return t.squad ? 15000 : 9000;   // (v34: los escuadrones, desde más lejos)
  if (t.kind === 'airship') return isTgt(t) ? 15000 : AIRSHIP_DRAW;
  if (t.kind === 'tower') return LOCK_STATIC_RANGE;
  return isTgt(t) ? 16000 : t.markR || 4000;
}
function framePath(shape, x, y, r) {                       // traza la forma (sin pintarla); r: medio tamaño en px
  if (shape === 'ci') { hctx.moveTo(x + r * 1.05, y); hctx.arc(x, y, r * 1.05, 0, 6.2832); }
  else if (shape === 'tri') { const R = r * 1.25; hctx.moveTo(x, y - R); hctx.lineTo(x + R * 0.866, y + R * 0.5); hctx.lineTo(x - R * 0.866, y + R * 0.5); hctx.closePath(); }
  else if (shape === 'rect') hctx.rect(x - r * 1.15, y - r * 0.6, r * 2.3, r * 1.2);
  else hctx.rect(x - r, y - r, 2 * r, 2 * r);
}
function targetName(t) {
  if (t.kind === 'dragon') return t.unknown && t.mode === 'cruise' ? 'DESCONOCIDO' : 'DRAGÓN';   // (v34: sin identificar)
  if (t.kind === 'batallon') return 'BATALLÓN · ' + t.alive;
  if (t.kind === 'sierpe' && t.shield) return 'SIERPE · ESCUDO';
  return String(t.label || (BLANCO[t.kind] || BLANCO.dragon).name).toUpperCase();
}
function drawTargets() {
  const k = HUD_K, sel = enemyLock.e, a = _fa, tanFov = Math.tan(camera.fov * Math.PI / 360);
  let selF = null, sup = null;
  _fl[0].length = _fl[1].length = 0;
  const add = t => {
    const c = targetCenter(t), d = c.distanceTo(_camP);
    if ((t !== sel && d > frameRange(t)) || !proj(c.x, c.y, c.z, a) || !onScreenAt(a)) return;
    const r = clamp(targetHalf(t) * (FRAME_K[t.kind] || 1) * HH / (2 * d * tanFov), 7 * k, HH * 0.35), shape = FRAME_SHAPE[t.kind] || 'sq';
    if (t.kind === 'superdirigible') sup = { u: t, x: a.x, y: a.y, r };
    if (t === sel) selF = { t, x: a.x, y: a.y, r, shape, d };
    else _fl[isTgt(t) ? 1 : 0].push(a.x, a.y, r, shape);
  };
  eachTarget(add);
  const P = hpal(PAL_G), dk = HUD_ARC ? ARC_SHADE : 'rgba(0,18,8,.5)';   // (v48: en el arcano, dorados con sombra parda)
  hctx.save(); hctx.shadowBlur = 0; hctx.lineJoin = 'round';
  for (let g = 0; g < 2; g++) {                            // todos los marcos de una vez: un trazo oscuro debajo y el verde encima
    const L = _fl[g]; if (!L.length) continue;
    hctx.beginPath(); for (let i = 0; i < L.length; i += 4) framePath(L[i + 3], L[i], L[i + 1], L[i + 2]);
    hctx.globalAlpha = g ? 0.95 : 0.5;
    hctx.lineWidth = 3.2 * k; hctx.strokeStyle = dk; hctx.stroke();
    hctx.lineWidth = 1.4 * k; hctx.strokeStyle = P.line; hctx.stroke();
  }
  const T = _fl[1];                                        // «TGT» junto a los que cuentan para la misión
  if (T.length) {
    hctx.globalAlpha = 0.95; hctx.font = HUD_ARC ? FA(10 * k) : FG(9.5 * k); hctx.textAlign = 'left'; hctx.lineWidth = 2.5 * k; hctx.strokeStyle = HUD_ARC ? ARC_DARK : 'rgba(0,16,7,.8)'; hctx.fillStyle = P.ink;
    for (let i = 0; i < T.length; i += 4) { const x = T[i] + T[i + 2] * FRAME_EXT[T[i + 3]] + 4 * k, y = T[i + 1] - T[i + 2] * 0.55 + 4 * k; hctx.strokeText('TGT', x, y); hctx.fillText('TGT', x, y); }
  }
  hctx.restore();
  if (sup) superBar(sup.u, sup.x, sup.y, sup.r);
  if (sel && !sel.dead) { if (selF) { drawSelected(selF); drawLeadPipper(sel); } else drawLockArrow(sel); }
  drawAllyMarker(a);
}
/* El seleccionado: su marco parpadea (verde) o, fijado para la guiada, rojo fijo; mientras se fija, cuatro escuadras rojas se cierran sobre
   él. A la derecha: «LOCK» si está fijado, la distancia en metros, el nombre (con «TGT» si cuenta para la misión) y su vida si está herido. */
function drawSelected(f) {
  const k = HUD_K, { t, x, y, r, shape, d } = f, locked = W.locked, P = hpal(locked ? PAL_R : PAL_G), PR = hpal(PAL_R), p = W.lock;   // (v48: hpal, paletas arcanas)
  const blink = locked ? 1 : Math.sin(gameTime * 2 * Math.PI * 2.4) > -0.3 ? 1 : 0.3;
  hctx.save(); hctx.lineJoin = 'round';
  hctx.globalAlpha = blink; hctx.beginPath(); framePath(shape, x, y, r);
  hctx.shadowBlur = 0; hctx.lineWidth = 4 * k; hctx.strokeStyle = HUD_ARC ? ARC_SHADE : 'rgba(0,18,8,.55)'; hctx.stroke();
  hctx.shadowColor = P.glow; hctx.shadowBlur = 8 * k; hctx.lineWidth = 2 * k; hctx.strokeStyle = locked ? P.line : P.ink; hctx.stroke();
  hctx.globalAlpha = 1;
  if (p > 0.01 && !locked) {                               // fijando: escuadras rojas que se cierran del doble de lejos hasta el marco
    const q = r * FRAME_EXT[shape] + 4 * k + (r + 26 * k) * (1 - p), l = 7 * k;
    hctx.shadowColor = PR.glow; hctx.shadowBlur = 6 * k; hctx.strokeStyle = PR.line; hctx.lineWidth = 2 * k; hctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = x + sx * q, cy = y + sy * q; hctx.moveTo(cx - sx * l, cy); hctx.lineTo(cx, cy); hctx.lineTo(cx, cy - sy * l); }
    hctx.stroke();
  }
  hctx.restore();
  let lx = x + r * FRAME_EXT[shape] + 9 * k, al = 'left';  // etiqueta a la derecha (si no cabe, a la izquierda)
  if (lx > HW - 150 * k) { lx = x - r * FRAME_EXT[shape] - 9 * k; al = 'right'; }
  if (locked) hudGlow('LOCK', lx, y - 17 * k, 11 * k, P.ink, P.glow, al, 2 * k);
  hudGlow(String(Math.round(d)), lx, y - 1 * k, 14 * k, P.ink, P.glow, al, 1 * k);
  hudGlow((isTgt(t) ? 'TGT  ' : '') + targetName(t), lx, y + 15 * k, 11.5 * k, P.line, P.glow, al, 1.2 * k);
  const hm = t.hpMax || (t.kind === 'dragon' ? ENEMY_HP : t.kind === 'airship' ? AIRSHIP_HP : 0);
  if (hm > 0 && t.hp < hm) {                               // vida, si está herido
    const w = 52 * k, bx = al === 'left' ? lx : lx - w, by = y + 21 * k, fr = clamp(t.hp / hm, 0, 1);
    hctx.save(); hctx.fillStyle = HUD_ARC ? 'rgba(24,14,4,.7)' : 'rgba(0,16,7,.7)'; hctx.fillRect(bx - k, by - k, w + 2 * k, 5 * k);
    hctx.shadowColor = P.glow; hctx.shadowBlur = 5 * k; hctx.fillStyle = P.line; hctx.fillRect(bx, by, w * fr, 3 * k); hctx.restore();
  }
}
/* v31: barra de vida del superdirigible, grande y bajo el casco (siempre, no solo tocado), con su vida y las torretas que le quedan. v41: con
   el estilo del HUD, bajo su marco circular. */
function superBar(u, x, y, r) {
  const k = HUD_K, w = 220 * k, h = 11 * k, by = y + r * 1.05 + 14 * k;
  if (by > HH - 110 * k) return;
  const left = u.kids.filter(c => !c.dead).length, P = hpal(PAL_G);
  if (HUD_ARC) arcBar(x - w / 2, by - k, w, h + 3 * k, u.hp / u.hpMax, '', 0, ARC_CRIM, 20);   // (v48: en el arcano, barra carmesí)
  else hudBar(x - w / 2, by, w, h, u.hp / u.hpMax, '', 0, PAL_G, 20);
  hudGlow('NÚCLEO  ' + Math.ceil(u.hp) + ' / ' + Math.round(u.hpMax) + '    TORRETAS  ' + left + ' / ' + u.kids.length, x, by + h + 15 * k, 10.5 * k, P.line, P.glow, 'center', 1.2 * k);
}
/* v23: el aliado: chevrón azul con su nombre y la distancia (hasta 9 km). v34: cada uno de los aliados. v41: el texto, en Graduate. */
const C_ALLY = '#5ab4ff';
function drawAllyMarker(a) {
  for (const al of allies) {
    if (!al.on) continue;
    const e = al.e, d = e.pos.distanceTo(_camP);
    if (d > 9000 || !proj(e.pos.x, e.pos.y, e.pos.z, a) || !onScreenAt(a)) continue;
    const s = 6 + 3 * (1 - smooth(250, 3000, d)), y = a.y - 16;
    hctx.globalAlpha = 1; hctx.strokeStyle = C_ALLY; hctx.lineWidth = 2;
    hctx.beginPath(); hctx.moveTo(a.x - s, y - s); hctx.lineTo(a.x, y); hctx.lineTo(a.x + s, y - s); hctx.stroke();
    hudGlow(allyName(al).toUpperCase() + '  ' + Math.round(d), a.x, y - s - 6, 10.5 * HUD_K, C_ALLY, 'rgba(60,150,255,.6)', 'center', HUD_K);
  }
}
/* Indicador de adelanto (estilo Star Citizen): círculo gris donde hay que apuntar para que la bola de fuego alcance al dragón fijado. */
const _lp = new THREE.Vector3(), _lm = new THREE.Vector3(), _lq = new THREE.Vector3();
const LEAD_MIN_V = 150 / 3.6;                              // v31: el círculo de adelanto solo sale con blancos a más de 150 km/h (lo quieto o lento se ve mejor sin él)
function drawLeadPipper(e) {
  if (!e.vel || e.vel.lengthSq() < LEAD_MIN_V * LEAD_MIN_V) return;
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
/* v41: flecha alargada de holograma (punta en x, y; apunta a ang), con degradado de la punta a la cola, contorno y halo. */
function hudArrow(x, y, ang, P, len) {
  if (HUD_ARC) return arcArrow(x, y, ang, hpal(P), len);     // v48: punta de lanza arcana (16b)
  const k = HUD_K, L = len * k, w = 10 * k, sw = w * 0.36;
  hctx.save(); hctx.translate(x, y); hctx.rotate(ang);
  hctx.beginPath(); hctx.moveTo(0, 0); hctx.lineTo(-L * 0.4, -w); hctx.lineTo(-L * 0.34, -sw); hctx.lineTo(-L, -sw); hctx.lineTo(-L, sw); hctx.lineTo(-L * 0.34, sw); hctx.lineTo(-L * 0.4, w); hctx.closePath();
  const g = hctx.createLinearGradient(0, 0, -L, 0); g.addColorStop(0, P.ink); g.addColorStop(0.35, P.line); g.addColorStop(1, P.faint);
  hctx.shadowColor = P.glow; hctx.shadowBlur = 12 * k; hctx.fillStyle = g; hctx.fill();
  hctx.shadowBlur = 0; hctx.lineJoin = 'round'; hctx.lineWidth = 1.2 * k; hctx.strokeStyle = P.line; hctx.stroke();
  hctx.restore();
}
/* Dirección en pantalla hacia un punto del mundo (vale también si está detrás de la cámara): en out.x, out.y, normalizada (y hacia abajo). */
const _dr = { x: 0, y: 0 };
function screenDir(p, out) {
  _pv.set(p.x, p.y, p.z).applyMatrix4(camera.matrixWorldInverse);
  const pm = camera.projectionMatrix.elements;
  let dx = _pv.x * pm[0] * HW * 0.5, dy = -_pv.y * pm[5] * HH * 0.5; const l = Math.hypot(dx, dy);
  if (l < 1e-3) { dx = 0; dy = 1; } else { dx /= l; dy /= l; }
  out.x = dx; out.y = dy; return out;
}
/* Flecha hacia el blanco seleccionado que está fuera de la pantalla (estilo Ace Combat), en una elipse alrededor del centro. v41: verde,
   alargada y con su distancia (m) en Graduate, como los demás números del HUD. */
function drawLockArrow(e) {
  const k = HUD_K, c = targetCenter(e), { x: dx, y: dy } = screenDir(c, _dr);
  const hx = HW / 2 - 190, hy = dy < 0 ? HH / 2 - 100 : HH / 2 - 130 * k;          // márgenes: brújula arriba, vida abajo
  const t = 1 / Math.hypot(dx / hx, dy / hy);                                       // (v39: en una elipse: en las esquinas no pisa el minimapa ni las armas)
  const x = HW / 2 + dx * t, y = HH / 2 + dy * t, L = 54, P = hpal(W.locked ? PAL_R : PAL_G);
  hctx.save(); hctx.globalAlpha = 0.82 + 0.18 * Math.sin(gameTime * 6);
  hudArrow(x, y, Math.atan2(dy, dx), P, L);
  hctx.restore();
  hudGlow(String(Math.round(c.distanceTo(_camP))), x - dx * (L + 26) * k, y - dy * (L + 16) * k + 5 * k, 14 * k, P.ink, P.glow, 'center', k);
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
    MM.cvA = document.createElement('canvas'); MM.cvA.width = MM.cvA.height = MM_N; MM.gA = MM.cvA.getContext('2d');   // v48: la del estilo arcano (sepia)
    MM.imgA = MM.gA.createImageData(MM_N, MM_N);
  }
  if (key !== MM.key) { MM.key = key; MM.ready = false; MM.b = null; }
  if (!MM.b && (!MM.ready || Math.hypot(px - MM.cx, pz - MM.cz) > MM_MOVE)) MM.b = { cx: px, cz: pz, row: 0 };
  const b = MM.b; if (!b) return;
  const s = MM_SPAN / MM_N, x0 = b.cx - MM_SPAN / 2 - s, z0 = b.cz - MM_SPAN / 2 - s, H = MM.h;
  for (let r = 0; r < MM_ROWS && b.row < n; r++, b.row++) for (let i = 0; i < n; i++) H[b.row * n + i] = heightAt(x0 + (i + 0.5) * s, z0 + (b.row + 0.5) * s);
  if (b.row < n) return;
  const d = MM.img.data, dA = MM.imgA.data, Hs = MM.hs || (MM.hs = new Float32Array(n * n));
  const at = (i, j) => H[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)  // suavizado 3 × 3: sin motas de ríos estrechos ni escalones entre texels
    Hs[j * n + i] = (4 * at(i, j) + 2 * (at(i - 1, j) + at(i + 1, j) + at(i, j - 1) + at(i, j + 1)) + at(i - 1, j - 1) + at(i + 1, j - 1) + at(i - 1, j + 1) + at(i + 1, j + 1)) / 16;
  for (let j = 0; j < MM_N; j++) for (let i = 0; i < MM_N; i++) {
    const c = (j + 1) * n + i + 1, hc = Hs[c], o = (j * MM_N + i) * 4;
    const gx = (Hs[c + 1] - Hs[c - 1]) / (2 * s), gz = (Hs[c + n] - Hs[c - n]) / (2 * s);
    const lam = clamp((0.5 * (gx + gz) + 0.707) / Math.sqrt(gx * gx + gz * gz + 1), 0, 1);   // luz del noroeste (plano: 0,71)
    const v = 60 + 150 * lam + 45 * clamp((hc - WL) / 1600, 0, 1), wt = clamp((WL + 1.5 - hc) / 3, 0, 1);   // wt: agua (hacia el fondo, más)
    d[o] = lerp(v * 0.38, 10, wt); d[o + 1] = lerp(v, 46, wt); d[o + 2] = lerp(v * 0.55, 44, wt); d[o + 3] = lerp(175, 215, wt);
    dA[o] = lerp(v * 0.93, 20, wt); dA[o + 1] = lerp(v * 0.79, 44, wt); dA[o + 2] = lerp(v * 0.55, 72, wt); dA[o + 3] = lerp(175, 215, wt);   // (v48: sepia de pergamino y agua azul profundo)
  }
  MM.g.putImageData(MM.img, 0, 0); MM.gA.putImageData(MM.imgA, 0, 0); MM.cx = b.cx; MM.cz = b.cz; MM.ready = true; MM.b = null;
}
/* v45: rayas de peligro de la zona fuera del área en el minimapa: bandas rojas vivas a 45° sobre rojo oscuro translúcido (una baldosa que se
   repite sin cortes; se rehace si cambia la escala del HUD). */
let hazardPat = null;
function hazardPattern(k) {
  if (hazardPat && hazardPat.k === k) return hazardPat.pat;
  const n = Math.max(8, Math.round(12 * k)), c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(90,4,2,.35)'; g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(255,82,60,.8)'; g.lineWidth = n * 0.36; g.lineCap = 'square';
  for (const o of [-n, 0, n]) { g.beginPath(); g.moveTo(o, n); g.lineTo(o + n, 0); g.stroke(); }
  hazardPat = { k, n, pat: hctx.createPattern(c, 'repeat') };
  return hazardPat.pat;
}
function drawMinimap(heading, fwd) {
  if (HUD_ARC) return arcMinimap(heading, fwd);             // v48: redondo, como un astrolabio (16b)
  const k = HUD_K, S = 242 * k, cxs = HW / 2;
  const xa = Math.max(16 * k, cxs - 711.5 * k), yb = HH - 47 * k, ya = yb - S, xb = xa + S;   // (a la izquierda del centro; en pantallas estrechas, pegado al borde)
  const cx = xa + S / 2, cy = ya + S * 0.667, kk = (S / 2) / MM_RANGE;                     // tú y px por m
  const hl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / hl, fz = fwd.z / hl, rx = -fz, rz = fx, p = dragon.position;
  minimapTerrain(p.x, p.z);
  const P = PAL_G, ch = 12 * k;                            // (v40: con el acabado del resto del HUD: cristal, esquinas cortadas, viñeta y barrido)
  hctx.save(); hctx.shadowBlur = 0;
  chamferPath(xa, ya, S, S, ch); hctx.clip();
  const bg = hctx.createLinearGradient(0, ya, 0, yb); bg.addColorStop(0, 'rgba(6,40,20,.7)'); bg.addColorStop(1, 'rgba(2,16,8,.82)');
  hctx.fillStyle = bg; hctx.fillRect(xa, ya, S, S);
  if (MM.ready) {                                          // relieve: la textura (norte arriba) girada con tu rumbo
    const s = MM_SPAN / MM_N, X0 = MM.cx - MM_SPAN / 2 - p.x, Z0 = MM.cz - MM_SPAN / 2 - p.z;
    hctx.save(); hctx.globalAlpha = 0.78; hctx.imageSmoothingEnabled = true; hctx.imageSmoothingQuality = 'high';
    hctx.transform(kk * s * rx, -kk * s * fx, kk * s * rz, -kk * s * fz, cx + kk * (rx * X0 + rz * Z0), cy - kk * (fx * X0 + fz * Z0));
    hctx.drawImage(MM.cv, 0, 0); hctx.restore();
  }
  const vg = hctx.createRadialGradient(cx, cy, S * 0.25, cx, cy, S * 0.95);   // viñeta: bordes más oscuros
  vg.addColorStop(0, 'rgba(0,12,5,0)'); vg.addColorStop(1, 'rgba(0,12,5,.45)'); hctx.fillStyle = vg; hctx.fillRect(xa, ya, S, S);
  hctx.fillStyle = scanPattern(); hctx.fillRect(xa, ya, S, S);
  const A = mission.area;
  if (A) {                                                 // v15: área de la misión: fuera de ella, zona roja; el borde, discontinuo
    // v45 (Jorge: se distinguía muy poco del verde): rojo más vivo, rayas diagonales de peligro que avanzan despacio (hazardPattern) y el
    // borde más grueso y con brillo; encima de la viñeta, para que no se apague hacia los bordes
    const dx = A.x - p.x, dz = A.z - p.z, ox = cx + (dx * rx + dz * rz) * kk, oy = cy - (dx * fx + dz * fz) * kk, rr = A.r * kk;
    hctx.beginPath(); hctx.rect(xa, ya, S, S); hctx.arc(ox, oy, rr, 0, 6.283);
    hctx.fillStyle = 'rgba(255,48,32,.28)'; hctx.fill('evenodd');
    const hz = hazardPattern(k); if (hz.setTransform) hz.setTransform(new DOMMatrix().translateSelf(gameTime * 6 * k % hazardPat.n, 0));
    hctx.fillStyle = hz; hctx.fill('evenodd');
    hctx.setLineDash([6 * k, 4 * k]); hctx.strokeStyle = '#ff6a52'; hctx.lineWidth = 2.2 * k; hctx.shadowColor = 'rgba(255,60,40,.95)'; hctx.shadowBlur = 6 * k;
    hctx.beginPath(); hctx.arc(ox, oy, rr, 0, 6.283); hctx.stroke(); hctx.setLineDash([]); hctx.shadowBlur = 0;
  }
  if (hctx.createConicGradient) {                          // barrido de radar: una vuelta cada 4 s, con estela
    const a = gameTime * 1.57 % 6.2832, cg = hctx.createConicGradient(a, cx, cy);
    cg.addColorStop(0, 'rgba(120,255,170,0)'); cg.addColorStop(0.8, 'rgba(120,255,170,0)'); cg.addColorStop(1, 'rgba(120,255,170,.2)');
    hctx.fillStyle = cg; hctx.fillRect(xa, ya, S, S);
    hctx.strokeStyle = 'rgba(160,255,200,.35)'; hctx.lineWidth = k; hctx.beginPath(); hctx.moveTo(cx, cy); hctx.lineTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S); hctx.stroke();
  }
  hctx.strokeStyle = P.line; hctx.lineWidth = k;          // anillos, cruz y líneas a las esquinas de arriba
  hctx.shadowColor = P.glow; hctx.shadowBlur = 4 * k; hctx.globalAlpha = 0.55;
  MM_RINGS.forEach((r, i) => { hctx.setLineDash(i < MM_RINGS.length - 1 ? [3 * k, 3 * k] : []); hctx.beginPath(); hctx.arc(cx, cy, r * kk, 0, 6.283); hctx.stroke(); });
  hctx.setLineDash([]); hctx.globalAlpha = 0.35;
  hctx.beginPath(); hctx.moveTo(xa, cy); hctx.lineTo(xb, cy); hctx.moveTo(cx, ya); hctx.lineTo(cx, yb);
  hctx.moveTo(xa, ya); hctx.lineTo(cx, cy); hctx.lineTo(xb, ya); hctx.stroke();
  hctx.globalAlpha = 1; hctx.shadowBlur = 0;
  for (const [r, t] of [[1500, '1.5'], [3000, '3 KM']]) hudGlow(t, cx + 4 * k, cy - r * kk + 11 * k, 9 * k, P.line, 'rgba(0,0,0,0)', 'left', 0.6 * k);
  const at = (x, z) => {                                   // punto del mundo → minimapa; fuera del cuadrado, en el borde (_rp.far)
    const dx = x - p.x, dz = z - p.z, ox = (dx * rx + dz * rz) * kk, oy = -(dx * fx + dz * fz) * kk, m = 4 * k;
    let t = 1;
    if (ox < xa + m - cx) t = Math.min(t, (xa + m - cx) / ox); else if (ox > xb - m - cx) t = Math.min(t, (xb - m - cx) / ox);
    if (oy < ya + m - cy) t = Math.min(t, (ya + m - cy) / oy); else if (oy > yb - m - cy) t = Math.min(t, (yb - m - cy) / oy);
    _rp.x = cx + ox * t; _rp.y = cy + oy * t; _rp.d = Math.hypot(dx, dz); _rp.far = t < 1; return _rp;
  };
  for (const [l, wx, wz] of [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]]) {   // puntos cardinales en el borde
    const q = at(p.x + wx * 1e6, p.z + wz * 1e6), ix = clamp(q.x, xa + 9 * k, xb - 9 * k), iy = clamp(q.y, ya + 10 * k, yb - 8 * k);
    hudGlow(l, ix, iy + 5 * k, 13 * k, l === 'N' ? PAL_A.line : P.line, l === 'N' ? PAL_A.glow : P.glow, 'center');
  }
  drawMinimapSymbols(at, rx, rz, fx, fz);
  hctx.globalAlpha = 1;                                    // tú: flecha verde con halo
  hctx.fillStyle = P.ink; hctx.strokeStyle = 'rgba(4,30,12,.85)'; hctx.lineWidth = 1.2; hctx.shadowColor = P.glow; hctx.shadowBlur = 8 * k;
  hctx.beginPath(); hctx.moveTo(cx, cy - 8 * k); hctx.lineTo(cx - 5.5 * k, cy + 6 * k); hctx.lineTo(cx, cy + 3 * k); hctx.lineTo(cx + 5.5 * k, cy + 6 * k); hctx.closePath(); hctx.fill(); hctx.stroke();
  hctx.restore();
  hctx.save();                                             // marco: contorno con brillo y escuadras (sin cristal: el mapa ya lo lleva)
  chamferPath(xa, ya, S, S, ch); hctx.shadowColor = P.glow; hctx.shadowBlur = 8 * k; hctx.lineWidth = 1.3 * k; hctx.strokeStyle = P.line; hctx.stroke();
  const LB = 16 * k; hctx.lineWidth = 2.6 * k; hctx.beginPath();
  hctx.moveTo(xb - LB, ya); hctx.lineTo(xb, ya); hctx.lineTo(xb, ya + LB); hctx.moveTo(xa + LB, yb); hctx.lineTo(xa, yb); hctx.lineTo(xa, yb - LB); hctx.stroke();
  hctx.restore();
}
/* Símbolos del minimapa (v48: aparte, para el cuadrado y el redondo del estilo arcano). at(x, z): punto del mundo → minimapa (en _rp, con
   _rp.far si cae fuera y va al borde); rx, rz, fx, fz: tus ejes derecha y adelante en el suelo. */
function drawMinimapSymbols(at, rx, rz, fx, fz) {
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
  hctx.globalAlpha = 1;
}
const _rp = { x: 0, y: 0, d: 0, far: false };
/* Bolas guiadas enemigas en camino. v41: solo una flecha roja de holograma en un anillo alrededor del centro, hacia de donde viene cada una
   (se vea o no), con la distancia (m) por fuera (si apunta arriba, por dentro: arriba va la radio); el pitido que se acelera al acercarse va
   en updateWorld. Antes: rombo sobre la bola y aviso de texto, que con tantos proyectiles confundía. */
function drawMissileWarn() {
  if (!threat.incoming.length || state !== 'playing') return;
  const k = HUD_K, m = Math.min(HW, HH), rx = m * 0.42, ry = m * 0.34, L = 54, blink = 0.65 + 0.35 * Math.sin(gameTime * 14), P = hpal(PAL_R);   // (v42: en una elipse: a los lados no pisa el THR ni el ALT)
  for (const f of threat.incoming) {
    const { x: dx, y: dy } = screenDir(f.pos, _dr), R = 1 / Math.hypot(dx / rx, dy / ry), x = HW / 2 + dx * R, y = HH / 2 + dy * R, o = dy < -0.5 ? -(L + 22) : 26;
    hctx.save(); hctx.globalAlpha = blink; hudArrow(x, y, Math.atan2(dy, dx), PAL_R, L); hctx.restore();
    hudGlow(String(Math.round(f.pos.distanceTo(_camP))), x + dx * o * k, y + dy * (o - 6) * k + 5 * k, 15 * k, P.ink, P.glow, 'center', k);
  }
}
/* v15: fuera del área de la misión, hacia su centro (a la altura del jugador): rombo dorado si se ve; si no, flecha dorada en un anillo
   alrededor del centro de la pantalla, como la de los misiles. */
function drawAreaArrow() {
  const A = mission.area, p = dragon.position, a = {}, blink = 0.6 + 0.4 * Math.sin(gameTime * 8);
  hctx.save(); hctx.globalAlpha = blink;
  if (proj(A.x, p.y, A.z, a) && a.x > 40 && a.x < HW - 40 && a.y > 40 && a.y < HH - 40) {
    hctx.strokeStyle = C_GOLD; hctx.lineWidth = 2.5;
    hctx.beginPath(); hctx.moveTo(a.x, a.y - 14); hctx.lineTo(a.x + 14, a.y); hctx.lineTo(a.x, a.y + 14); hctx.lineTo(a.x - 14, a.y); hctx.closePath(); hctx.stroke();
    if (HUD_ARC) hudGlow('ZONA DE LA MISIÓN', a.x, a.y - 22, 12 * HUD_K, C_GOLD, ARC_GOLD.glow, 'center', 1.6 * HUD_K);   // (v48)
    else hudText('ZONA DE LA MISIÓN', a.x, a.y - 22, FM(12), C_GOLD, 'center');
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
/* ---------- v39-v40: HUD al estilo de Ace Combat ----------
   v39: posiciones y tamaños del mockup de Jorge (tras la primera prueba con un jugador externo): verde, minimalista y más cerca del centro;
   SPEED y ALT a los lados de la marca blanca de la trayectoria (no de la mira naranja), con el boost bajo SPEED y el acelerador (THR, v40)
   a su izquierda; abajo, el minimapa cuadrado (izquierda), la vida (centro) y las armas (derecha). Medidas en px con la ventana a 864 de
   alto: HUD_K las escala con el alto.
   v40: acabado de HUD de cabina en lugar de cajas planas: paneles de cristal oscuro con esquinas cortadas, líneas de barrido, contorno con
   brillo y escuadras en las otras dos esquinas; barras con degradado, brillo arriba, segmentos y un borde de avance luminoso; textos y
   números en Graduate con contorno oscuro y halo. Verde para casi todo, ámbar para el boost y rojo para el peligro. */
const FG = n => `${n.toFixed(1)}px 'Graduate', 'Share Tech Mono', ui-monospace, monospace`, G_CAP = 0.75;   // Graduate: alto de mayúsculas y cifras (em)
let HUD_K = 1;
try { document.fonts.load("20px 'Graduate'"); } catch (e) { }   // (el lienzo no la pide solo: sin esto, los primeros fotogramas salen con otra)
const rgbStr = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
/* Paleta: ink (números), line (líneas y rótulos), glow (halo), f0-f2 (degradado de las barras, de arriba abajo). */
function hudPal(c) {
  return { c, ink: rgbStr(c.ink), line: rgbStr(c.line), dim: rgbStr(c.line, 0.34), faint: rgbStr(c.line, 0.13), glow: rgbStr(c.glow, 0.7),
    f0: rgbStr(c.f0), f1: rgbStr(c.f1), f2: rgbStr(c.f2) };
}
const PAL_G = hudPal({ ink: [226, 255, 236], line: [118, 255, 168], glow: [50, 255, 130], f0: [196, 255, 218], f1: [70, 226, 128], f2: [14, 112, 54] });
const PAL_A = hudPal({ ink: [255, 243, 224], line: [255, 180, 96], glow: [255, 140, 30], f0: [255, 230, 186], f1: [255, 158, 62], f2: [150, 70, 18] });
const PAL_R = hudPal({ ink: [255, 230, 224], line: [255, 108, 90], glow: [255, 50, 30], f0: [255, 200, 188], f1: [255, 86, 66], f2: [134, 20, 10] });
const PAL_GOLD = hudPal({ ink: [255, 236, 190], line: [242, 196, 92], glow: [255, 180, 40], f0: [255, 236, 190], f1: [242, 184, 75], f2: [140, 90, 20] });
const GLASS = ['rgba(8,40,22,.62)', 'rgba(2,13,7,.8)'];
function palMix(A, B, t) { const o = {}; for (const k in A.c) o[k] = A.c[k].map((v, i) => Math.round(v + (B.c[k][i] - v) * t)); return hudPal(o); }
function palHeat(t) { t = clamp(t, 0, 1) * 2; return t < 1 ? palMix(PAL_G, PAL_A, t) : palMix(PAL_A, PAL_R, t - 1); }   // verde → ámbar → rojo
let _scan = null;
function scanPattern() {                                   // líneas de barrido (textura de los paneles)
  if (!_scan) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 3; const g = c.getContext('2d');
    g.fillStyle = 'rgba(170,255,210,.07)'; g.fillRect(0, 0, 4, 1); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 2, 4, 1);
    _scan = hctx.createPattern(c, 'repeat');
  }
  return _scan;
}
function chamferPath(x, y, w, h, c) {                      // rectángulo con las esquinas de arriba a la izquierda y abajo a la derecha cortadas
  hctx.beginPath(); hctx.moveTo(x + c, y); hctx.lineTo(x + w, y); hctx.lineTo(x + w, y + h - c); hctx.lineTo(x + w - c, y + h);
  hctx.lineTo(x, y + h); hctx.lineTo(x, y + c); hctx.closePath();
}
/* Panel de cristal: degradado oscuro, barrido, contorno con brillo y escuadras en las esquinas sin cortar. a = opacidad del cristal. */
function hudPanel(x, y, w, h, P, c, a) {
  const k = HUD_K; c = c != null ? c : Math.min(6 * k, h * 0.3);
  hctx.save(); hctx.shadowBlur = 0;
  chamferPath(x, y, w, h, c);
  const g = hctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, GLASS[0]); g.addColorStop(1, GLASS[1]);
  if (a != null) hctx.globalAlpha *= a;
  hctx.fillStyle = g; hctx.fill(); hctx.fillStyle = scanPattern(); hctx.fill();
  if (a != null) hctx.globalAlpha /= a;
  hctx.strokeStyle = 'rgba(255,255,255,.07)'; hctx.lineWidth = 1; hctx.beginPath(); hctx.moveTo(x + c + 1, y + 1.5); hctx.lineTo(x + w - 1.5, y + 1.5); hctx.stroke();   // filo de luz arriba
  chamferPath(x, y, w, h, c);
  hctx.shadowColor = P.glow; hctx.shadowBlur = 7 * k; hctx.lineWidth = 1.2 * k; hctx.strokeStyle = P.line; hctx.stroke();
  const L = Math.min(9 * k, w * 0.3, h * 0.45); hctx.lineWidth = 2.4 * k; hctx.beginPath();
  hctx.moveTo(x + w - L, y); hctx.lineTo(x + w, y); hctx.lineTo(x + w, y + L);
  hctx.moveTo(x + L, y + h); hctx.lineTo(x, y + h); hctx.lineTo(x, y + h - L); hctx.stroke();
  hctx.restore();
}
/* Texto con contorno oscuro y halo (y: línea base). v48: en el estilo arcano (16b), en Cinzel con contorno pardo y halo más suave. */
function hudGlow(txt, x, y, size, col, glow, align, spacing) {
  const k = HUD_K;
  hctx.save(); hctx.font = HUD_ARC ? FA(size) : FG(size); hctx.textAlign = align || 'center'; hctx.letterSpacing = (spacing || 0).toFixed(1) + 'px';
  const sx = hctx.textAlign === 'center' ? x + (spacing || 0) / 2 : x;   // (el espaciado se añade también tras la última letra)
  hctx.shadowBlur = 0; hctx.lineJoin = 'round'; hctx.lineWidth = Math.max(2, size * 0.17); hctx.strokeStyle = HUD_ARC ? ARC_DARK : 'rgba(0,16,7,.82)'; hctx.strokeText(txt, sx, y);
  hctx.shadowColor = glow; hctx.shadowBlur = (HUD_ARC ? 5 : 7) * k; hctx.fillStyle = col; hctx.fillText(txt, sx, y);
  hctx.restore();
}
/* Barra: panel, lo lleno (fracción f) con degradado, brillo arriba, segmentos (seg) y borde de avance luminoso; el texto, centrado.
   vert: se llena de abajo arriba (el acelerador). */
function hudBar(x, y, w, h, f, txt, size, P, seg, vert) {
  const k = HUD_K, c = Math.min(6 * k, h * 0.3, w * 0.3), i = 2 * k, iw = w - 2 * i, ih = h - 2 * i, ff = clamp(f, 0, 1);
  hudPanel(x, y, w, h, P, c);
  hctx.save(); hctx.shadowBlur = 0;
  chamferPath(x + i, y + i, iw, ih, c * 0.6); hctx.clip();
  const fx = x + i, fy = vert ? y + i + ih * (1 - ff) : y + i, fw = vert ? iw : iw * ff, fh = vert ? ih * ff : ih;
  if (ff > 0.002) {
    const g = vert ? hctx.createLinearGradient(x, 0, x + w, 0) : hctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P.f0); g.addColorStop(0.42, P.f1); g.addColorStop(1, P.f2);
    hctx.globalAlpha *= 0.92; hctx.fillStyle = g; hctx.fillRect(fx, fy, fw, fh); hctx.globalAlpha /= 0.92;
    const s = vert ? hctx.createLinearGradient(x, 0, x + w * 0.55, 0) : hctx.createLinearGradient(0, y, 0, y + h * 0.55);
    s.addColorStop(0, 'rgba(255,255,255,.34)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    hctx.fillStyle = s; hctx.fillRect(fx, fy, fw, fh);
  }
  for (let j = 1; j < (seg || 0); j++) {                   // segmentos: oscuros sobre lo lleno y tenues en lo vacío
    const t = j / seg, on = t < ff;
    hctx.fillStyle = on ? 'rgba(0,26,10,.42)' : P.faint;
    if (vert) hctx.fillRect(fx, y + i + ih * (1 - t) - 0.5 * k, iw, k); else hctx.fillRect(x + i + iw * t - 0.5 * k, y + i + (on ? 0 : ih * 0.55), k, on ? ih : ih * 0.45);
  }
  if (ff > 0.002 && ff < 0.998) {                          // borde de avance
    hctx.shadowColor = P.glow; hctx.shadowBlur = 8 * k; hctx.fillStyle = P.ink;
    if (vert) hctx.fillRect(fx, fy - 0.75 * k, iw, 1.5 * k); else hctx.fillRect(fx + fw - 1.5 * k, fy, 1.5 * k, fh);
  }
  hctx.restore();
  if (txt) hudGlow(txt, x + w / 2, y + h / 2 + size * G_CAP / 2, size, P.ink, P.glow, 'center', 0.4 * k);
}
/* Caja de un valor (SPEED, ALT): panel, marcas de escala en el lado de fuera, el número y una flecha hacia el centro (dir: +1 a la derecha). */
function hudValueBox(x, y, w, h, txt, size, P, dir) {
  const k = HUD_K;
  hudPanel(x, y, w, h, P);
  hctx.save(); hctx.strokeStyle = P.dim; hctx.lineWidth = k; hctx.beginPath();
  const ox = dir > 0 ? x + 4 * k : x + w - 4 * k;
  for (let j = 1; j < 6; j++) { const yy = y + h * j / 6, l = (j === 3 ? 6 : 3) * k; hctx.moveTo(ox, yy); hctx.lineTo(ox + dir * l, yy); }
  hctx.stroke();
  const ax = dir > 0 ? x + w + 3 * k : x - 3 * k, ay = y + h / 2;
  hctx.fillStyle = P.line; hctx.shadowColor = P.glow; hctx.shadowBlur = 6 * k;
  hctx.beginPath(); hctx.moveTo(ax + dir * 6 * k, ay); hctx.lineTo(ax, ay - 5 * k); hctx.lineTo(ax, ay + 5 * k); hctx.closePath(); hctx.fill();
  hctx.restore();
  hudGlow(txt, x + w / 2 + dir * 2 * k, y + h / 2 + size * G_CAP / 2, size, P.ink, P.glow, 'center', 0.6 * k);
}
/* Rótulo de cabecera (SPEED, ALT, THR): centrado sobre la caja, con una raya a cada lado si cabe. y: línea base. */
function hudHeader(txt, x, w, y, size, P) {
  const k = HUD_K, sp = 1.4 * k;
  hudGlow(txt, x + w / 2, y, size, P.line, P.glow, 'center', sp);
  hctx.save(); hctx.font = FG(size); hctx.letterSpacing = sp.toFixed(1) + 'px'; const tw = hctx.measureText(txt).width; hctx.restore();
  const yl = y - size * G_CAP / 2, l0 = x + w / 2 - tw / 2 - 4 * k, r0 = x + w / 2 + tw / 2 + 4 * k;
  if (l0 - x < 4 * k) return;
  hctx.save(); hctx.strokeStyle = P.dim; hctx.lineWidth = k; hctx.beginPath();
  hctx.moveTo(x, yl + 3 * k); hctx.lineTo(x, yl); hctx.lineTo(l0, yl); hctx.moveTo(r0, yl); hctx.lineTo(x + w, yl); hctx.lineTo(x + w, yl + 3 * k); hctx.stroke();
  hctx.restore();
}
/* SPEED y ALT, cajas de 80 × 32 a 209 px a cada lado de la marca blanca de la trayectoria y a su altura (la siguen, algo suavizado y sin
   alejarse mucho del centro). Bajo SPEED, la barra del boost con su porcentaje y «BOOST»; a su izquierda, el acelerador (THR, v40); bajo
   ALT, «HOVER» en hover. ALT es la altitud sobre el nivel del agua, no sobre el suelo. */
const _anc = { x: 0, y: 0, t: -1 };
function drawFlightBoxes() {
  const k = HUD_K, now = performance.now() / 1000, dt = now - _anc.t;
  const tx = clamp(_sp.x, HW / 2 - HW * 0.12, HW / 2 + HW * 0.12), ty = clamp(_sp.y, HH / 2 - HH * 0.15, HH / 2 + HH * 0.15);
  if (_anc.t < 0 || dt > 0.5) { _anc.x = tx; _anc.y = ty; } else { const a = 1 - Math.exp(-20 * dt); _anc.x += (tx - _anc.x) * a; _anc.y += (ty - _anc.y) * a; }
  _anc.t = now;
  if (HUD_ARC) return arcFlightBoxes(_anc.x, _anc.y);       // v48: estilo arcano (16b)
  const w = 80 * k, h = 32 * k, by = _anc.y - h / 2, sx = _anc.x - 209 * k - w / 2, ax = _anc.x + 209 * k - w / 2;
  const bb = by + h + 4 * k, bh = 20 * k, lb = bb + bh + 19 * k;   // barra del boost y línea base de BOOST / HOVER
  hudHeader('SPEED', sx, w, by - 5 * k, 15.5 * k, PAL_G);
  hudValueBox(sx, by, w, h, String(Math.round(F.speed * 3.6)), 19 * k, PAL_G, 1);
  hctx.save();
  if (F.boostExhausted) hctx.globalAlpha = 0.55 + 0.45 * Math.sin(gameTime * 9);   // agotado: parpadea
  hudBar(sx, bb, w, bh, F.boost, Math.round(F.boost * 100) + '%', 11 * k, PAL_A, 10);
  hctx.restore();
  hudGlow('BOOST', sx + w / 2, lb, 15.5 * k, PAL_A.line, PAL_A.glow, 'center', 1.6 * k);
  drawThrottle(sx - 32 * k, by, 12 * k, bb + bh - by, by - 5 * k, lb);
  hudHeader('ALT', ax, w, by - 5 * k, 15.5 * k, PAL_G);
  hudValueBox(ax, by, w, h, String(Math.round(dragon.position.y - WL)), 19 * k, PAL_G, -1);
  if (F.hover || GR.mode) { hctx.save(); hctx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 4); hudGlow(GR.mode ? 'TIERRA' : 'HOVER', ax + w / 2, lb, 15.5 * k, PAL_G.line, PAL_G.glow, 'center', 1.6 * k); hctx.restore(); }   // (v44: en tierra, «TIERRA»)
}
/* v40: acelerador (W/S), barra vertical a la izquierda de SPEED que se llena de abajo arriba, con marcas al 25, 50 y 75 %, una flecha en su
   nivel y el porcentaje debajo. En hover (W/S suben y bajan) se apaga. ly: línea base de «THR»; vy: la del porcentaje. */
function drawThrottle(x, y, w, h, ly, vy) {
  const k = HUD_K, P = PAL_G, t = clamp(F.throttle, 0, 1);
  hctx.save(); if (F.hover || GR.mode) hctx.globalAlpha = 0.35;
  hudGlow('THR', x + w / 2, ly, 15.5 * k, P.line, P.glow, 'center', 1.4 * k);
  hudBar(x, y, w, h, t, '', 0, P, 4, true);
  const ay = y + 2 * k + (h - 4 * k) * (1 - t), ax = x + w + 3 * k;
  hctx.fillStyle = P.ink; hctx.shadowColor = P.glow; hctx.shadowBlur = 6 * k;
  hctx.beginPath(); hctx.moveTo(ax, ay); hctx.lineTo(ax + 6 * k, ay - 4 * k); hctx.lineTo(ax + 6 * k, ay + 4 * k); hctx.closePath(); hctx.fill();
  hctx.restore();
  hctx.save(); if (F.hover || GR.mode) hctx.globalAlpha = 0.35;
  hudGlow(Math.round(t * 100) + '%', x + w / 2, vy, 13 * k, P.ink, P.glow, 'center', 0.4 * k);
  hctx.restore();
}
/* Armas (abajo a la derecha, como en Ace Combat), sobre un cristal muy tenue: GUN y MSL con su munición (la barra se vacía al gastarla), FLM
   con el calor de la llamarada (se llena mientras la usas y, según se llena, pasa de verde a ámbar y a rojo y parpadea) y LSR con la carga
   del rayo (llena, parpadea y brilla). Durante el sobrecalentamiento o el rayo, las que no se pueden usar se apagan. */
function drawWeapons() {
  if (HUD_ARC) return arcWeapons();                         // v48: estilo arcano (16b)
  const k = HUD_K, w = 80 * k, h = 23 * k, pitch = 30.67 * k, size = 13 * k;
  let bx = HW / 2 + 528.5 * k, lx = HW / 2 + 463.5 * k;
  const over = bx + w - (HW - 16 * k); if (over > 0) { bx -= over; lx -= over; }   // (pantallas estrechas: pegado al borde)
  const y3 = HH - 47 * k - h, y0 = y3 - 3 * pitch, oh = W.overheat > 0, las = W.laser > 0, blink = 0.5 + 0.5 * Math.sin(gameTime * 9), gnd = !!GR.mode;   // (v44: en tierra, solo FLM)
  hctx.save();
  hctx.globalAlpha = 0.55; hudPanel(lx - 12 * k, y0 - 9 * k, bx + w + 9 * k - (lx - 12 * k), y3 + h + 7 * k - (y0 - 9 * k), { line: PAL_G.faint, glow: 'rgba(0,0,0,0)' }, 10 * k, 0.6);
  const row = (i, name, dim) => { const y = y3 - (3 - i) * pitch; hctx.globalAlpha = dim ? 0.32 : 1; hudGlow(name, lx, y + h / 2 + 17 * k * G_CAP / 2, 17 * k, PAL_G.line, PAL_G.glow, 'left', 1.5 * k); return y; };
  let y = row(0, 'GUN', oh || las || gnd);
  hudBar(bx, y, w, h, W.ammo / GUN_AMMO, W.ammo + '/' + GUN_AMMO, size, PAL_G, Math.min(GUN_AMMO, 20));
  y = row(1, 'MSL', oh || las || gnd);
  hudBar(bx, y, w, h, MSL_AMMO > 0 ? W.msl / MSL_AMMO : 0, W.msl + '/' + MSL_AMMO, size, W.msl > 0 ? PAL_G : PAL_R, 10);
  y = row(2, 'FLM', las);
  const heat = clamp(W.heat, 0, 1);
  if (oh) hctx.globalAlpha = 0.55 + 0.45 * blink;
  else if (heat > 0.02) hctx.globalAlpha *= 1 - 0.55 * heat * heat * (0.5 + 0.5 * Math.sin(gameTime * (4 + 10 * heat)));
  hudBar(bx, y, w, h, heat, Math.round(heat * 100) + '%', size, palHeat(oh ? 1 : heat), 10);
  y = row(3, 'LSR', oh || gnd);
  const full = W.ult >= 1 && !las;
  if (full && !oh) hctx.globalAlpha = 0.65 + 0.35 * blink;
  if (las || (full && !oh)) {                              // lleno o disparando: halo alrededor de la barra
    hctx.save(); hctx.shadowColor = PAL_G.glow; hctx.shadowBlur = (las ? 16 : 8 + 14 * blink) * k; hctx.strokeStyle = PAL_G.ink; hctx.lineWidth = 1.5 * k;
    chamferPath(bx - 2 * k, y - 2 * k, w + 4 * k, h + 4 * k, 7 * k); hctx.stroke(); hctx.restore();
  }
  hudBar(bx, y, w, h, W.ult, Math.floor(W.ult * 100 + 1e-6) + '%', size, PAL_G, 10);
  hctx.restore();
}
/* Vida (abajo, en el centro): barra de 118 × 32 con «vida/máxima» que se vacía de derecha a izquierda; en rojo por debajo del 35 %. v39: sin
   armadura; tras HP_REGEN_WAIT s sin recibir daño se rellena a HP_REGEN por segundo (mientras tanto, late). */
function drawHealth() {
  if (HUD_ARC) return arcHealth();                          // v48: estilo arcano (16b)
  const k = HUD_K, w = 118 * k, h = 32 * k, x = HW / 2 - w / 2, y = HH - 47 * k - h, hpMax = heroHpMax(), f = clamp(F.health / hpMax, 0, 1);
  const regen = F.health < hpMax && F.health > 0 && gameTime - F.lastHit > HP_REGEN_WAIT && state === 'playing';
  hctx.save();
  if (regen) hctx.globalAlpha = 0.84 + 0.16 * Math.sin(gameTime * 6);
  else if (f <= 0.35) hctx.globalAlpha = 0.8 + 0.2 * Math.sin(gameTime * 7);
  hudBar(x, y, w, h, f, Math.ceil(F.health) + '/' + fmtStat(hpMax), 18 * k, f <= 0.35 ? PAL_R : PAL_G, 10);
  hctx.restore();
}
/* v41: mensaje al destruir un enemigo (tú), como en Ace Combat: «DRAGÓN DESTRUIDO» en el centro de la pantalla, por encima de la mira, en
   un panel translúcido con el estilo del HUD; debajo, en pequeño, lo que añada la unidad (torretas o hechiceros que quedan). Entra algo más
   ancho y se ajusta, dura KILL_T s y se apaga; si llegan varios seguidos, los anteriores suben y se atenúan (tres como mucho). Los derribos
   de los aliados siguen con el aviso de arriba. */
const KILLS = [], KILL_T = 2.4;
function killFeed(txt, sub, pal) {                         // (v43: pal = otra paleta, p. ej. PAL_GOLD para «PUNTO DE CONTROL»)
  KILLS.unshift({ txt: txt.toUpperCase(), sub: (sub || '').toUpperCase(), t0: gameTime, pal: pal || PAL_G });
  if (KILLS.length > 3) KILLS.length = 3;
}
/* v42: con una bola guiada enemiga en camino, en ese mismo sitio, «¡PROYECTIL APROXIMÁNDOSE!» en rojo y parpadeando (los derribos se apilan
   encima mientras dura). */
const WARN_TXT = '¡PROYECTIL APROXIMÁNDOSE!';
function drawKills() {
  for (let i = KILLS.length - 1; i >= 0; i--) if (gameTime - KILLS[i].t0 > KILL_T || gameTime < KILLS[i].t0) KILLS.splice(i, 1);
  const warn = state === 'playing' && threat.incoming.length > 0;
  if (!KILLS.length && !warn) return;
  if (HUD_ARC) return arcKills(warn);                       // v48: estilo arcano (16b)
  const k = HUD_K, size = 16 * k, sp = 2.4 * k;
  let y = HH * 0.31;
  if (warn) {
    hctx.save(); hctx.font = FG(size); hctx.letterSpacing = sp.toFixed(1) + 'px'; const w = hctx.measureText(WARN_TXT).width + 54 * k, h = 30 * k; hctx.restore();
    hctx.save(); hctx.globalAlpha = Math.sin(gameTime * Math.PI * 2 * 2.5) > -0.2 ? 1 : 0.3;   // parpadea (2,5 veces por segundo)
    hudPanel(HW / 2 - w / 2, y - h / 2, w, h, PAL_R, 8 * k, 0.8);
    hudGlow(WARN_TXT, HW / 2, y + size * G_CAP / 2, size, PAL_R.line, PAL_R.glow, 'center', sp);
    hctx.restore();
    y -= h + 8 * k;
  }
  if (!KILLS.length) return;
  hctx.save(); hctx.font = FG(size); hctx.letterSpacing = sp.toFixed(1) + 'px';
  const tws = KILLS.map(m => hctx.measureText(m.txt).width); hctx.restore();
  KILLS.forEach((m, i) => {
    const t = gameTime - m.t0, al = Math.min(1, t / 0.12) * Math.min(1, (KILL_T - t) / 0.5) * (i ? 0.6 : 1);
    const w = (tws[i] + 54 * k) * (1 + 0.22 * Math.max(0, 1 - t / 0.16)), h = (m.sub ? 40 : 30) * k;
    hctx.save(); hctx.globalAlpha = al;
    const P = m.pal;
    hudPanel(HW / 2 - w / 2, y - h / 2, w, h, P, 8 * k, 0.8);
    hudGlow(m.txt, HW / 2, y - h / 2 + 15 * k + size * G_CAP / 2, size, P.ink, P.glow, 'center', sp);
    if (m.sub) hudGlow(m.sub, HW / 2, y + h / 2 - 7 * k, 10 * k, P.line, P.glow, 'center', 1.6 * k);
    hctx.restore();
    y -= h + 8 * k;
  });
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
  drawTargets();                                           // (v41: marcos por tipo, como en Ace Combat)
  drawMinimap(heading, fwd);                               // (v39: el HUD de Ace Combat; antes, radar redondo, velocidad e instrumentos a los lados)
  drawWeapons();
  drawMissileWarn();
  if (MS.out && state === 'playing') drawAreaArrow();       // v15: fuera del área de la misión
  drawFlightBoxes();
  drawKills();                                             // v41: «X DESTRUIDO»
  drawHealth();
  drawObjectives();                                        // v48: arriba a la izquierda, en los dos estilos (16b; antes, arriba a la derecha y con los puntos)
  const k = HUD_K, PG = hpal(PAL_G), PO = hpal(PAL_GOLD);
  if (DESIGN.on) drawDesign(heading);                      // v19: modo diseño (º): coordenadas, semilla y marcas
  if (mission.dev) hudGlow('DEV TEST  ·  Tab: panel de pruebas' + (DEV.fps ? '  ·  ' + Math.round(fpsEMA) + ' FPS  ·  ' + (1000 / Math.max(fpsEMA, 1)).toFixed(1) + ' ms' : ''), HW - 28, 30, 11 * k, DEV.fps ? PO.ink : PG.dim, DEV.fps ? PO.glow : 'rgba(0,0,0,0)', 'right', 0.6 * k);   // v27 (v48: arriba a la derecha: a la izquierda van los objetivos)
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
  animateHero(dt, { throttle: F.throttle, flapTarget: F.flapTarget, aimLocal: headAim, yawRate: F.rate.y, pitchRate: F.rate.p, fire: F.fireFlash, third: F.third || aimCam || CC.k > 0.02, menu: state === 'menu',   // (v34: con un plano de cine, el jinete entero)
    hover: F.hoverK, boost: F.boostFx, climb: F.hvy / HOVER_VSPEED, dive: smooth(0.15, 0.6, -fwdY), aimCam, aimPt,   // (v44: desde la v34 el comentario de arriba se comía esta línea: sin hover, boost, picado ni cámara de apuntado)
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
  // avisos. v41: solo las bolas guiadas que vienen a por ti: flecha roja en el HUD (drawMissileWarn; v42: y el cartel rojo, drawKills) y pitido que se acelera al acercarse
  // (de 0,6 s a 3 km a casi continuo a menos de 150 m); y «TE ESTÁN FIJANDO» mientras un dragón te fija. Fuera el texto «¡PROYECTIL
  // APROXIMÁNDOSE!» y el aviso de los proyectiles sueltos (salía a menudo y confundía)
  const near = threat.incoming.reduce((m, f) => Math.min(m, f.pos.distanceTo(p)), 1e9);
  if (state === 'playing' && threat.incoming.length) {
    warnEl.style.opacity = '0';
    if (gameTime - lastBeep > lerp(0.06, 0.6, clamp((near - 150) / 2850, 0, 1))) { lastBeep = gameTime; sfx.warnMissile(); }
  } else if (state === 'playing' && threat.lock > 0.05) {
    setWarn('TE ESTÁN FIJANDO', 'var(--gold)', 0.45 + 0.55 * Math.abs(Math.sin(gameTime * 6)));
    if (gameTime - lastBeep > 0.6) { lastBeep = gameTime; sfx.warnLock(); }
  } else warnEl.style.opacity = '0';
  vigAlpha = Math.max(0, vigAlpha - dt * 1.5); vigEl.style.opacity = String(vigAlpha);
  updateRider(dt);                                         // al final: la cámara ya está colocada (temblores y campo de visión incluidos)
}

