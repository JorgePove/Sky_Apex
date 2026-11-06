/* ============================================================
   8c. v50: SACUDIDA DEL HUD Y DE LA CÁMARA
   Petición de Jorge: que el boost, los giros cerrados, las explosiones cercanas, la llamarada, aterrizar y despegar agiten todo el HUD a la vez, según hacia dónde gira el dragón,
   para dar sensación de peso e inmersión. Son dos cosas que se suman (en px con HUD_K = 1; las dos estilos del HUD por igual):
   · Balanceo (HS.x, HS.y, HS.r): un muelle con inercia. Al virar a la derecha el HUD se queda atrás, hacia la izquierda, y se inclina un poco hacia el giro; al tirar hacia arriba, baja
     (HS_SWAY, a giro máximo). Los golpes (hudKick: aterrizar, despegar, boost, llamarada; hudBlast: una explosión empuja el HUD en sentido contrario a ella) son empujones al mismo muelle.
   · Temblor (HS.jx, HS.jy, HS.jr): ondas de 7-11 Hz, no saltos al azar. Boost, velocidad, llamarada y rayo por igual en los dos ejes; el giro cerrado (HS_SHAKE.turn), en el eje en
     que se gira; y lo que ya sacudía la cámara (camShake: impactos, explosiones…) también al HUD.
   hudLayer pone la transformación del lienzo: los instrumentos, enteros; lo que marca algo del mundo (mira, marcos de los blancos, escalera), solo en parte (HS_WORLD), para que no se
   separe mucho de lo que señala. La radio y los avisos del DOM se mueven con los instrumentos, algo menos (CSS translate). La cámara, además: temblor en giros cerrados y con la
   llamarada y el rayo (HS.camX, HS.camY: updateWorld, 16). Opciones → «Sacudida» (HS.k) lo escala todo, de 0 a 200 %.
   ============================================================ */
const HS_K = 70, HS_C = 10.5;                              // muelle: rigidez y amortiguación (vuelve con un pequeño rebote)
const HS_SWAY = [15, 10, 0.014];                           // balanceo a giro máximo: px a lo ancho, px a lo alto y rad
const HS_SHAKE = { boost: 1.4, kick: 3.5, speed: 0.7, turn: 2.6, flame: 2, laser: 3, hit: 9, max: 14 };   // temblor (px): boost, golpe al activarlo, a mucha velocidad, giro cerrado, llamarada, rayo, por unidad de camShake y su tope
const HS_CAM = { turn: 0.0028, flame: 0.0024, laser: 0.0035 };   // temblor de la cámara (rad): giro cerrado, llamarada, rayo
const HS_WORLD = [0.3, 0.5];                               // lo que marca algo del mundo: fracción del balanceo y del temblor
const HS = { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, jx: 0, jy: 0, jr: 0, camX: 0, camY: 0, k: 1, flame: false, css: '' };
const HS_DOM = ['warn', 'toast', 'radio', 'area', 'hint'].map(id => document.getElementById(id)), SHAKE_KEY = 'skyApex.sacudida';
{ const el = document.getElementById('shakeK'), v = document.getElementById('shakeV');
  try { const s = localStorage.getItem(SHAKE_KEY); if (s !== null && isFinite(+s)) { el.value = +s; HS.k = +s / 100; v.textContent = s; } } catch (err) { }
  el.addEventListener('input', () => { HS.k = el.value / 100; v.textContent = el.value; try { localStorage.setItem(SHAKE_KEY, el.value); } catch (err) { } }); }
/* Un golpe al muelle: px (hasta donde llega: con este muelle, 17 px/s de empuje por px) a lo ancho y a lo alto (+ abajo) y rad de giro. */
function hudKick(x, y, r) { HS.vx += x * 17; HS.vy += y * 17; HS.vr += (r || 0) * 17; }
/* Explosión en (x, y, z), de fuerza k (la que suma a camShake): empuja el HUD en sentido contrario a ella. */
function hudBlast(x, y, z, k) {
  if (k < 0.03 || state !== 'playing') return;
  _pv.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  const l = Math.hypot(_pv.x, _pv.y) || 1, s = 13 * Math.min(k, 1.2);
  hudKick(-_pv.x / l * s, _pv.y / l * s, (Math.random() - 0.5) * 0.003 * s);
}
function updateHudShake(dt) {
  const live = state === 'playing' && !cine.on, mr = Math.max(TURN_RATE[1], 0.2), air = live ? (1 - F.hoverK) * (GR.mode ? 0.35 : 1) : 0;
  const ry = clamp(F.rate.y / mr, -1.2, 1.2) * air, rp = clamp(F.rate.p / mr, -1.2, 1.2) * air, h = Math.min(dt, 0.033);
  HS.vx += ((ry * HS_SWAY[0] - HS.x) * HS_K - HS.vx * HS_C) * h; HS.x += HS.vx * h;   // (rate.y < 0 = a la derecha: el HUD se queda a la izquierda)
  HS.vy += ((rp * HS_SWAY[1] - HS.y) * HS_K - HS.vy * HS_C) * h; HS.y += HS.vy * h;   // (rate.p > 0 = hacia arriba: el HUD baja)
  HS.vr += ((-ry * HS_SWAY[2] - HS.r) * HS_K - HS.vr * HS_C) * h; HS.r += HS.vr * h;
  const flame = live && W.flame, laser = live && W.laser > 0;
  if (flame && !HS.flame) hudKick(0, 4);                   // el retroceso al empezar a echar fuego
  HS.flame = flame;
  const turn = smooth(0.5, 1, Math.hypot(ry, rp)), sum = Math.abs(ry) + Math.abs(rp) + 1e-3, sx = Math.abs(ry) / sum, sy = Math.abs(rp) / sum, S = HS_SHAKE;
  const A = (live ? F.boostFx * S.boost + F.kickFx * S.kick + S.speed * smooth(VCRUISE_MAX * 1.15, VMAX, F.speed) + (flame ? S.flame : 0) + (laser ? S.laser : 0) : 0) + Math.min(camShake * S.hit, S.max), t = gameTime;
  HS.jx = (A + turn * S.turn * sx) * (Math.sin(t * 61) * 0.6 + Math.sin(t * 47 + 1.3) * 0.4);
  HS.jy = (A + turn * S.turn * sy) * (Math.sin(t * 67 + 0.7) * 0.6 + Math.sin(t * 43 + 2.1) * 0.4);
  HS.jr = (A + turn * S.turn) * 0.0007 * Math.sin(t * 53 + 0.3);
  const camC = (flame ? HS_CAM.flame : 0) + (laser ? HS_CAM.laser : 0);
  HS.camX = (camC + turn * HS_CAM.turn * sy) * HS.k; HS.camY = (camC + turn * HS_CAM.turn * sx) * HS.k;
  const ox = (HS.x + HS.jx) * HS.k * HUD_K * 0.7, oy = (HS.y + HS.jy) * HS.k * HUD_K * 0.7;   // la radio y los avisos (DOM), algo menos: hay que poder leerlos
  const css = Math.abs(ox) + Math.abs(oy) > 0.05 ? ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px' : '';
  if (css !== HS.css) { HS.css = css; for (const el of HS_DOM) el.style.translate = css; }
}
/* Transformación del lienzo del HUD (en drawHUD, antes de cada grupo). world: lo que marca algo del mundo. */
function hudLayer(world) {
  const dpr = hudEl.width / HW, a = world ? HS_WORLD[0] : 1, b = world ? HS_WORLD[1] : 1, q = HS.k * HUD_K;
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ox = (HS.x * a + HS.jx * b) * q, oy = (HS.y * a + HS.jy * b) * q, r = (HS.r * a + HS.jr * b) * HS.k;
  if (Math.abs(ox) + Math.abs(oy) + Math.abs(r) * 500 < 0.02) return;
  hctx.translate(HW / 2 + ox, HH / 2 + oy); hctx.rotate(r); hctx.translate(-HW / 2, -HH / 2);
}
