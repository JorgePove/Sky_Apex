/* ============================================================
   8b. v48: HUD ARCANO (ALTA FANTASÍA) Y OBJETIVOS ARRIBA A LA IZQUIERDA
   ============================================================
   Jorge (3-nov): el HUD de la v39-v42 funciona, pero es demasiado militar moderno para un juego de alta fantasía medieval y arcana. Con su
   imagen de referencia (fantasy_HUD.png) como guía de estilo, no como plantilla, un segundo estilo con los mismos elementos en los mismos
   sitios: líneas finas de oro viejo con sombra parda, rombos (gemas) y volutas como remates, barras en hexágono alargado con doble filo,
   rótulos y cifras en Cinzel y el texto de los objetivos en EB Garamond; pergamino para las cifras, carmesí para la vida y el peligro,
   bronce para la munición, brasa para el boost y azul de cristal (lo arcano) para el rayo, los escudos y tu flecha del minimapa. Sin los
   paneles de cristal oscuro ni el marco «WEAPONS» de la referencia. El minimapa, redondo como un astrolabio: tú en el centro y el bisel,
   con la flor de lis del norte, gira con tu rumbo. Opciones → «Estilo del HUD»: Arcano (por defecto) o Militar (el de la v39-v42).
   Las funciones del HUD militar (16) pasan aquí con HUD_ARC; las que comparten la forma (marcos de blancos, seleccionado, flechas) solo
   cambian de paleta (hpal) y de fuente (hudGlow). En los dos estilos, los objetivos van arriba a la izquierda (drawObjectives) y ya no
   salen los puntos. */
const HUD_KEY = 'skyApex.hud';
let HUD_ARC = true;                                        // estilo del HUD: arcano (por defecto) o militar
try { const v = localStorage.getItem(HUD_KEY); if (v === 'arcane' || v === 'military') HUD_ARC = v === 'arcane'; } catch (err) { }
function setHudStyle(arc) { HUD_ARC = arc; document.body.classList.toggle('hud-arcane', arc); }   // (la clase: radio y avisos del DOM, 01_styles.css)
setHudStyle(HUD_ARC);
{ const sel = document.getElementById('hudStyle'); sel.value = HUD_ARC ? 'arcane' : 'military';
  sel.addEventListener('change', () => { setHudStyle(sel.value === 'arcane'); try { localStorage.setItem(HUD_KEY, sel.value); } catch (err) { } }); }

const FA = n => `600 ${n.toFixed(1)}px 'Cinzel', Georgia, serif`, A_CAP = 0.7;   // Cinzel: rótulos y cifras (A_CAP: alto de mayúsculas, em)
const FB = n => `500 ${n.toFixed(1)}px 'EB Garamond', Georgia, serif`;          // EB Garamond: el texto de los objetivos
try { document.fonts.load("600 20px 'Cinzel'"); document.fonts.load("500 20px 'EB Garamond'"); } catch (e) { }   // (el lienzo no las pide solo)

/* Paletas (las mismas claves que las del militar, hudPal) y el paso de una militar a su arcana (hpal). */
function arcPal(c) { const P = hudPal(c); P.glow = rgbStr(c.glow, 0.42); return P; }   // (halo más suave que el militar)
const ARC_GOLD = arcPal({ ink: [250, 240, 216], line: [226, 191, 120], glow: [255, 186, 76], f0: [250, 232, 182], f1: [212, 170, 96], f2: [116, 80, 32] });
const ARC_SUN = arcPal({ ink: [255, 222, 146], line: [246, 204, 112], glow: [255, 180, 50], f0: [255, 238, 196], f1: [238, 188, 92], f2: [140, 90, 20] });   // cumplidos, punto de control
const ARC_CRIM = arcPal({ ink: [255, 236, 226], line: [234, 100, 84], glow: [255, 54, 36], f0: [240, 120, 108], f1: [190, 36, 42], f2: [92, 8, 16] });
const ARC_BRONZE = arcPal({ ink: [252, 242, 220], line: [226, 191, 120], glow: [255, 186, 76], f0: [238, 210, 146], f1: [178, 134, 64], f2: [90, 58, 20] });
const ARC_EMBER = arcPal({ ink: [255, 240, 220], line: [244, 150, 70], glow: [255, 118, 30], f0: [255, 214, 150], f1: [238, 120, 42], f2: [138, 44, 10] });
const ARC_FROST = arcPal({ ink: [236, 248, 255], line: [146, 204, 255], glow: [86, 166, 255], f0: [228, 245, 255], f1: [112, 182, 252], f2: [24, 70, 160] });
const ARC_DARK = 'rgba(22,13,4,.85)', ARC_SHADE = 'rgba(22,13,4,.55)';   // contorno de los textos y sombra de las líneas (pardos, no verdes)
const ARC_OF = new Map([[PAL_G, ARC_GOLD], [PAL_A, ARC_EMBER], [PAL_R, ARC_CRIM], [PAL_GOLD, ARC_SUN]]);
const hpal = P => HUD_ARC ? ARC_OF.get(P) || P : P;
function arcHeat(t) { t = clamp(t, 0, 1) * 2; return t < 1 ? palMix(ARC_BRONZE, ARC_EMBER, t) : palMix(ARC_EMBER, ARC_CRIM, t - 1); }   // bronce → brasa → carmesí

/* ---------- Piezas ---------- */
function diamondPath(x, y, rx, ry) { hctx.moveTo(x, y - ry); hctx.lineTo(x + rx, y); hctx.lineTo(x, y + ry); hctx.lineTo(x - rx, y); hctx.closePath(); }
function hexPath(x, y, w, h, p) {                          // hexágono alargado: puntas a izquierda y derecha (p: largo de la punta)
  hctx.moveTo(x, y + h / 2); hctx.lineTo(x + p, y); hctx.lineTo(x + w - p, y); hctx.lineTo(x + w, y + h / 2); hctx.lineTo(x + w - p, y + h); hctx.lineTo(x + p, y + h); hctx.closePath();
}
function capsulePath(x, y, w, h) {
  const r = Math.min(w, h) / 2;
  hctx.moveTo(x + r, y); hctx.arcTo(x + w, y, x + w, y + h, r); hctx.arcTo(x + w, y + h, x, y + h, r); hctx.arcTo(x, y + h, x, y, r); hctx.arcTo(x, y, x + w, y, r); hctx.closePath();
}
/* Trazo del camino actual: sombra parda debajo y la línea (col, ancho w) encima. */
function arcStroke(col, w, shade) {
  hctx.lineJoin = 'round'; hctx.lineCap = 'round'; hctx.shadowBlur = 0;
  hctx.lineWidth = w + 2.2 * HUD_K; hctx.strokeStyle = shade || ARC_SHADE; hctx.stroke();
  hctx.lineWidth = w; hctx.strokeStyle = col; hctx.stroke();
}
/* Gema: rombo con el degradado de la paleta P, filo dorado (edge) y la faceta de arriba iluminada; glow: halo. */
function arcGem(x, y, rx, ry, P, glow, edge) {
  const k = HUD_K;
  hctx.save(); hctx.beginPath(); diamondPath(x, y, rx, ry);
  hctx.lineJoin = 'round'; hctx.lineWidth = k + 2; hctx.strokeStyle = ARC_SHADE; hctx.stroke();
  const g = hctx.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, P.f0); g.addColorStop(0.5, P.f1); g.addColorStop(1, P.f2);
  if (glow) { hctx.shadowColor = P.glow; hctx.shadowBlur = glow * k; }
  hctx.fillStyle = g; hctx.fill(); hctx.shadowBlur = 0;
  hctx.lineWidth = k; hctx.strokeStyle = edge || ARC_GOLD.line; hctx.stroke();
  hctx.beginPath(); hctx.moveTo(x - rx * 0.5, y - ry * 0.05); hctx.lineTo(x, y - ry * 0.55); hctx.lineTo(x + rx * 0.5, y - ry * 0.05);
  hctx.lineWidth = 0.8 * k; hctx.strokeStyle = 'rgba(255,255,255,.55)'; hctx.stroke();
  hctx.restore();
}
/* Voluta: remate en doble espiral, como en los manuscritos, que sale de (x, y) hacia dir (±1); s: tamaño. Solo añade el camino. */
function volutePath(x, y, dir, s) {
  const cx = x + dir * s * 1.2, R = s * 0.5, T = 1.7 * Math.PI;
  hctx.moveTo(x, y); hctx.lineTo(cx, y);
  for (const v of [-1, 1]) {                               // -1: la de arriba; 1: la de abajo (empiezan en la raya y se enroscan hacia fuera)
    const ccy = y + v * R; hctx.moveTo(cx, y);
    for (let i = 1; i <= 22; i++) {
      const t = i / 22 * T, r = R * (1 - 0.6 * t / T), a = -v * Math.PI / 2 + v * dir * t;
      hctx.lineTo(cx + r * Math.cos(a), ccy + r * Math.sin(a));
    }
  }
}
function arcVolute(x, y, dir, s, col) { hctx.save(); hctx.beginPath(); volutePath(x, y, dir, s); arcStroke(col || ARC_GOLD.line, 1.1 * HUD_K); hctx.restore(); }
/* Barra arcana: hexágono alargado con doble filo (edge, oro por defecto); dentro, lo vacío algo oscuro y lo lleno (fracción f) con el
   degradado de P, un brillo arriba, segmentos (seg) y el borde de avance (gem: una gema de cristal en lugar de la raya); el texto, centrado. */
function arcBar(x, y, w, h, f, txt, size, P, seg, edge, gem) {
  const k = HUD_K, p = h * 0.48, i = 3 * k, ix = x + i, iy = y + i, iw = w - 2 * i, ih = h - 2 * i, ip = p - i * 0.55, ff = clamp(f, 0, 1), fw = iw * ff, E = edge || ARC_GOLD.line;
  hctx.save(); hctx.shadowBlur = 0;
  hctx.beginPath(); hexPath(ix, iy, iw, ih, ip); hctx.fillStyle = 'rgba(26,15,5,.34)'; hctx.fill();
  if (ff > 0.002) {
    hctx.save(); hctx.clip();
    const g = hctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, P.f0); g.addColorStop(0.45, P.f1); g.addColorStop(1, P.f2);
    hctx.fillStyle = g; hctx.fillRect(ix, iy, fw, ih);
    const s = hctx.createLinearGradient(0, iy, 0, iy + ih * 0.5); s.addColorStop(0, 'rgba(255,255,255,.32)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    hctx.fillStyle = s; hctx.fillRect(ix, iy, fw, ih * 0.5);
    for (let j = 1; j < (seg || 0); j++) {                 // segmentos sobre lo lleno: raya oscura con un filo de luz
      const sx = ix + iw * j / seg; if (sx > ix + fw) break;
      hctx.fillStyle = 'rgba(40,20,4,.5)'; hctx.fillRect(sx - 0.5 * k, iy, k, ih);
      hctx.fillStyle = 'rgba(255,240,200,.2)'; hctx.fillRect(sx + 0.5 * k, iy, 0.8 * k, ih);
    }
    if (!gem && ff < 0.998) { hctx.globalAlpha *= 0.9; hctx.fillStyle = P.ink; hctx.fillRect(ix + fw - 1.2 * k, iy, 1.2 * k, ih); }
    hctx.restore();
  }
  hctx.beginPath(); hexPath(x, y, w, h, p); arcStroke(E, 1.3 * k);
  hctx.beginPath(); hexPath(ix, iy, iw, ih, ip); hctx.globalAlpha *= 0.6; hctx.lineWidth = 0.8 * k; hctx.strokeStyle = E; hctx.stroke();
  hctx.restore();
  if (gem && ff > 0.02) arcGem(Math.min(ix + fw, ix + iw - ip * 0.6), y + h / 2, 4 * k, h * 0.36, P, 8);
  if (txt) hudGlow(txt, x + w / 2, y + h / 2 + size * A_CAP / 2, size, P.ink, P.glow, 'center', 0.5 * k);
}
/* Barra de cápsula (boost y acelerador): fondo tenue, lo lleno con el degradado de P (vert: de abajo arriba) y filo dorado. */
function arcCapsule(x, y, w, h, f, P, vert) {
  const k = HUD_K, i = 1.6 * k, ff = clamp(f, 0, 1);
  hctx.save(); hctx.shadowBlur = 0;
  hctx.beginPath(); capsulePath(x, y, w, h); hctx.fillStyle = 'rgba(26,15,5,.34)'; hctx.fill();
  if (ff > 0.002) {
    hctx.save(); hctx.beginPath(); capsulePath(x + i, y + i, w - 2 * i, h - 2 * i); hctx.clip();
    const g = vert ? hctx.createLinearGradient(x, 0, x + w, 0) : hctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P.f0); g.addColorStop(0.45, P.f1); g.addColorStop(1, P.f2); hctx.fillStyle = g;
    if (vert) hctx.fillRect(x, y + h * (1 - ff), w, h * ff); else hctx.fillRect(x, y, w * ff, h);
    hctx.restore();
  }
  hctx.beginPath(); capsulePath(x, y, w, h); arcStroke(ARC_GOLD.line, 1.1 * k);
  hctx.restore();
}

/* ---------- Brújula, escalera, marcas y mira ---------- */
/* Brújula: raya dorada con gemas y volutas en los extremos, marcas cada 5° (las de 15°, más largas) y los puntos cardinales encima (el norte,
   en brasa); en el centro, una gema sobre la raya y, debajo, el rumbo en una placa hexagonal (sin fondo). */
function arcCompass(heading) {
  const k = HUD_K, P = ARC_GOLD, cw = Math.min(520 * k, HW - 90 * k), cx = HW / 2, ly = 40 * k, ppd = cw / 90, x0 = cx - cw / 2, x1 = cx + cw / 2;
  hctx.save();
  hctx.beginPath(); hctx.moveTo(x0, ly); hctx.lineTo(x1, ly); arcStroke(P.line, 1.2 * k);
  for (const d of [-1, 1]) { const ex = d < 0 ? x0 : x1; arcGem(ex + d * 4 * k, ly, 3 * k, 3.6 * k, P); arcVolute(ex + d * 7 * k, ly, d, 6 * k); }
  hctx.lineCap = 'butt';
  for (let d = Math.floor(heading - 46); d <= Math.ceil(heading + 46); d++) {
    if (d % 5) continue;
    const x = cx + (d - heading) * ppd; if (x < x0 + 2 * k || x > x1 - 2 * k) continue;
    const n = ((d % 360) + 360) % 360, big = d % 15 === 0;
    hctx.globalAlpha = clamp(1 - Math.pow(Math.abs(x - cx) / (cw / 2), 4), 0, 1);
    hctx.beginPath(); hctx.moveTo(x, ly); hctx.lineTo(x, ly + (big ? 6 : 3) * k);
    hctx.lineWidth = 3 * k; hctx.strokeStyle = ARC_SHADE; hctx.stroke(); hctx.lineWidth = 1.1 * k; hctx.strokeStyle = P.line; hctx.stroke();
    if (COMPASS[n] !== undefined) { const N = n === 0; hudGlow(COMPASS[n], x, ly - 11 * k, (n % 90 === 0 ? 14 : 11) * k, N ? ARC_EMBER.line : P.line, N ? ARC_EMBER.glow : P.glow, 'center', 1.2 * k); }
  }
  hctx.globalAlpha = 1;
  arcGem(cx, ly, 5.5 * k, 8 * k, P, 6);
  const pw = 54 * k, ph = 18 * k, py = ly + 12 * k;
  hctx.beginPath(); hctx.moveTo(cx, ly + 8 * k); hctx.lineTo(cx, py); hexPath(cx - pw / 2, py, pw, ph, 7 * k); arcStroke(P.line, 1.1 * k);
  hudGlow(String(Math.round(heading) % 360).padStart(3, '0'), cx, py + ph / 2 + 13 * k * A_CAP / 2, 13 * k, P.ink, P.glow, 'center', k);
  hctx.restore();
}
/* Marca de la trayectoria: círculo pequeño con alas y aleta en pergamino (en vuelo recto, dorada), con un rombo en la punta de cada ala. */
function arcPathMarker(p) {
  const col = F.straight ? ARC_SUN.line : ARC_GOLD.ink;
  hctx.save(); hctx.globalAlpha = 0.92; hctx.beginPath();
  hctx.arc(p.x, p.y, 7, 0, 6.283); hctx.moveTo(p.x - 19, p.y); hctx.lineTo(p.x - 7, p.y); hctx.moveTo(p.x + 7, p.y); hctx.lineTo(p.x + 19, p.y);
  hctx.moveTo(p.x, p.y - 7); hctx.lineTo(p.x, p.y - 14); arcStroke(col, 1.5);
  hctx.beginPath(); diamondPath(p.x - 22, p.y, 3, 2.4); diamondPath(p.x + 22, p.y, 3, 2.4); hctx.fillStyle = col; hctx.fill();
  hctx.restore();
  if (F.straight) hudGlow('VUELO RECTO', p.x, p.y - 22, 11 * HUD_K, ARC_SUN.ink, ARC_SUN.glow, 'center', 1.4 * HUD_K);
}
/* Mira: círculo dorado con cuatro brazos rematados en rombos y una estrella de cuatro puntas en el centro (más clara al disparar; gris sin
   armas). Debajo, los slots del escudo como gemas de cristal (la que está en uso se vacía; las gastadas se rellenan, apagadas, durante su
   recarga); a la derecha, el arco del calor de la llamarada (bronce → brasa → carmesí). */
function arcReticle(a) {
  const hot = W.cool > 0, off = !weaponsReady(), col = off ? 'rgba(186,180,170,.85)' : hot ? '#fff0c8' : ARC_GOLD.line, r = 15, x = a.x, y = a.y;
  hctx.save();
  if (Math.hypot(x - _sp.x, y - _sp.y) > 26) { hctx.globalAlpha = 0.35; hctx.strokeStyle = ARC_GOLD.line; hctx.lineWidth = 1; hctx.beginPath(); hctx.moveTo(_sp.x, _sp.y); hctx.lineTo(x, y); hctx.stroke(); hctx.globalAlpha = 1; }
  hctx.beginPath(); hctx.arc(x, y, r, 0, 6.283);
  hctx.moveTo(x - r, y); hctx.lineTo(x - r - 8, y); hctx.moveTo(x + r, y); hctx.lineTo(x + r + 8, y);
  hctx.moveTo(x, y - r); hctx.lineTo(x, y - r - 5); hctx.moveTo(x, y + r); hctx.lineTo(x, y + r + 5);
  arcStroke(col, 1.7);
  hctx.beginPath(); diamondPath(x - r - 11, y, 3.4, 2.6); diamondPath(x + r + 11, y, 3.4, 2.6); diamondPath(x, y - r - 8, 2.4, 3.2); diamondPath(x, y + r + 8, 2.4, 3.2);
  const s = 5.5, q = 1.25;                                 // estrella de cuatro puntas
  hctx.moveTo(x, y - s); hctx.lineTo(x + q, y - q); hctx.lineTo(x + s, y); hctx.lineTo(x + q, y + q); hctx.lineTo(x, y + s); hctx.lineTo(x - q, y + q); hctx.lineTo(x - s, y); hctx.lineTo(x - q, y - q); hctx.closePath();
  hctx.lineWidth = 2.2; hctx.strokeStyle = ARC_SHADE; hctx.stroke(); hctx.fillStyle = col; hctx.fill();
  const n = W.shCd.length, gy = y + 37;                    // slots del escudo
  for (let i = 0; i < n; i++) {
    const gx = x - (n - 1) * 8 + i * 16, use = i === W.shUse && W.shieldT > 0, cd = W.shCd[i], rech = cd > 0 && !use;
    const f = use ? W.shieldT / SHIELD_T : cd > 0 ? 1 - cd / Math.max(SHIELD_CD, 0.01) : 1;
    hctx.beginPath(); diamondPath(gx, gy, 6, 3.6); hctx.lineWidth = 2.6; hctx.strokeStyle = ARC_SHADE; hctx.stroke(); hctx.fillStyle = 'rgba(14,22,40,.45)'; hctx.fill();
    if (f > 0) {
      hctx.save(); hctx.clip();
      const g = hctx.createLinearGradient(0, gy - 3.6, 0, gy + 3.6); g.addColorStop(0, ARC_FROST.f0); g.addColorStop(0.5, ARC_FROST.f1); g.addColorStop(1, ARC_FROST.f2);
      hctx.globalAlpha = rech ? 0.45 : 1; hctx.fillStyle = use ? '#e6f5ff' : g; hctx.fillRect(gx - 6, gy - 3.6, 12 * f, 7.2);
      hctx.restore();
    }
    hctx.beginPath(); diamondPath(gx, gy, 6, 3.6); hctx.lineWidth = 0.9; hctx.strokeStyle = rech ? ARC_GOLD.dim : ARC_GOLD.line;
    if (!rech) { hctx.shadowColor = ARC_FROST.glow; hctx.shadowBlur = 6; }
    hctx.stroke(); hctx.shadowBlur = 0;
  }
  if (W.heat > 0.01 || W.overheat > 0) {                   // calor de la llamarada
    const A0 = 0.9, R = 32, oh = W.overheat > 0, P = oh ? ARC_CRIM : arcHeat(W.heat);
    hctx.lineCap = 'round'; hctx.lineWidth = 5.5; hctx.strokeStyle = 'rgba(26,15,5,.45)'; hctx.beginPath(); hctx.arc(x, y, R, A0, -A0, true); hctx.stroke();
    hctx.globalAlpha = oh ? 0.55 + 0.45 * Math.sin(gameTime * 12) : 1;
    hctx.lineWidth = 3; hctx.strokeStyle = P.line; hctx.shadowColor = P.glow; hctx.shadowBlur = 6;
    hctx.beginPath(); hctx.arc(x, y, R, A0, A0 - 2 * A0 * clamp(W.heat, 0, 1), true); hctx.stroke();
    hctx.shadowBlur = 0; hctx.globalAlpha = 1;
    if (oh) hudGlow('SOBRECALENTADO  ' + W.overheat.toFixed(1) + ' s', x, y + 60, 12 * HUD_K, ARC_CRIM.line, ARC_CRIM.glow, 'center', 1.6 * HUD_K);
  }
  hctx.restore();
}
/* Flecha (blanco fuera de la pantalla, guiadas enemigas): punta de lanza con aletas, asta y una gema en la cola, con el degradado de P. */
function arcArrow(x, y, ang, P, len) {
  const k = HUD_K, L = len * k, w = 9 * k, sw = 2.2 * k;
  hctx.save(); hctx.translate(x, y); hctx.rotate(ang);
  hctx.beginPath(); hctx.moveTo(0, 0); hctx.lineTo(-L * 0.42, -w); hctx.lineTo(-L * 0.32, -sw); hctx.lineTo(-L * 0.82, -sw); hctx.lineTo(-L * 0.82, sw); hctx.lineTo(-L * 0.32, sw); hctx.lineTo(-L * 0.42, w); hctx.closePath();
  const g = hctx.createLinearGradient(0, 0, -L, 0); g.addColorStop(0, P.ink); g.addColorStop(0.4, P.line); g.addColorStop(1, P.f2);
  hctx.lineJoin = 'round'; hctx.lineWidth = 3 * k; hctx.strokeStyle = ARC_SHADE; hctx.stroke();
  hctx.shadowColor = P.glow; hctx.shadowBlur = 8 * k; hctx.fillStyle = g; hctx.fill(); hctx.shadowBlur = 0;
  hctx.lineWidth = k; hctx.strokeStyle = P.line; hctx.stroke();
  hctx.restore();
  arcGem(x - Math.cos(ang) * L * 0.9, y - Math.sin(ang) * L * 0.9, 3.6 * k, 3.6 * k, P);
}

/* ---------- Minimapa redondo (astrolabio) ---------- */
/* Mismo sitio y tamaño que el cuadrado. Tú en el centro, con tu rumbo hacia arriba; el borde es el anillo de 3 km; anillos a 750 m y 1,5 km,
   cruz y las dos rayas de tu campo de visión; debajo, el relieve en sepia (MM.cvA). Encima, el bisel: doble anillo dorado con marcas cada 10°
   y los puntos cardinales (el norte, una flor de lis en brasa) que giran con tu rumbo. Los símbolos, como en el cuadrado
   (drawMinimapSymbols); lo que queda fuera, en el borde, en su dirección. */
function arcMinimap(heading, fwd) {
  const k = HUD_K, S = 242 * k, R = S / 2, Ri = R - 5 * k;
  const cx = Math.max(28 * k, HW / 2 - 711.5 * k) + R, cy = HH - 47 * k - R, kk = Ri / MM_RANGE;   // (margen para las letras de fuera)
  const hl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / hl, fz = fwd.z / hl, rx = -fz, rz = fx, p = dragon.position, G = ARC_GOLD;
  minimapTerrain(p.x, p.z);
  hctx.save(); hctx.shadowBlur = 0;
  hctx.beginPath(); hctx.arc(cx, cy, Ri, 0, 6.2832); hctx.clip();
  const bg = hctx.createRadialGradient(cx, cy, 0, cx, cy, Ri); bg.addColorStop(0, 'rgba(34,26,14,.55)'); bg.addColorStop(1, 'rgba(14,10,6,.72)');
  hctx.fillStyle = bg; hctx.fillRect(cx - R, cy - R, S, S);
  if (MM.ready) {                                          // relieve: la textura (norte arriba) girada con tu rumbo
    const s = MM_SPAN / MM_N, X0 = MM.cx - MM_SPAN / 2 - p.x, Z0 = MM.cz - MM_SPAN / 2 - p.z;
    hctx.save(); hctx.globalAlpha = 0.8; hctx.imageSmoothingEnabled = true; hctx.imageSmoothingQuality = 'high';
    hctx.transform(kk * s * rx, -kk * s * fx, kk * s * rz, -kk * s * fz, cx + kk * (rx * X0 + rz * Z0), cy - kk * (fx * X0 + fz * Z0));
    hctx.drawImage(MM.cvA, 0, 0); hctx.restore();
  }
  const vg = hctx.createRadialGradient(cx, cy, Ri * 0.45, cx, cy, Ri); vg.addColorStop(0, 'rgba(12,8,3,0)'); vg.addColorStop(1, 'rgba(12,8,3,.5)');
  hctx.fillStyle = vg; hctx.fillRect(cx - R, cy - R, S, S);
  const A = mission.area;
  if (A) {                                                 // fuera del área de la misión: rayas de peligro (como en el cuadrado, v45)
    const dx = A.x - p.x, dz = A.z - p.z, ox = cx + (dx * rx + dz * rz) * kk, oy = cy - (dx * fx + dz * fz) * kk, rr = A.r * kk;
    hctx.beginPath(); hctx.rect(cx - R, cy - R, S, S); hctx.arc(ox, oy, rr, 0, 6.283);
    hctx.fillStyle = 'rgba(255,48,32,.28)'; hctx.fill('evenodd');
    const hz = hazardPattern(k); if (hz.setTransform) hz.setTransform(new DOMMatrix().translateSelf(gameTime * 6 * k % hazardPat.n, 0));
    hctx.fillStyle = hz; hctx.fill('evenodd');
    hctx.setLineDash([6 * k, 4 * k]); hctx.strokeStyle = '#ff6a52'; hctx.lineWidth = 2.2 * k; hctx.shadowColor = 'rgba(255,60,40,.95)'; hctx.shadowBlur = 6 * k;
    hctx.beginPath(); hctx.arc(ox, oy, rr, 0, 6.283); hctx.stroke(); hctx.setLineDash([]); hctx.shadowBlur = 0;
  }
  if (hctx.createConicGradient) {                          // barrido dorado, muy tenue (una vuelta cada 4 s)
    const a = gameTime * 1.57 % 6.2832, cg = hctx.createConicGradient(a, cx, cy);
    cg.addColorStop(0, 'rgba(255,214,140,0)'); cg.addColorStop(0.8, 'rgba(255,214,140,0)'); cg.addColorStop(1, 'rgba(255,214,140,.15)');
    hctx.fillStyle = cg; hctx.fillRect(cx - R, cy - R, S, S);
  }
  hctx.strokeStyle = G.line; hctx.lineWidth = k;          // anillos, cruz y campo de visión
  hctx.globalAlpha = 0.5; hctx.beginPath(); hctx.arc(cx, cy, 750 * kk, 0, 6.283); hctx.stroke();
  hctx.setLineDash([3 * k, 3 * k]); hctx.globalAlpha = 0.6; hctx.beginPath(); hctx.arc(cx, cy, 1500 * kk, 0, 6.283); hctx.stroke(); hctx.setLineDash([]);
  const va = 0.66; hctx.globalAlpha = 0.3; hctx.beginPath();
  hctx.moveTo(cx - Ri, cy); hctx.lineTo(cx + Ri, cy); hctx.moveTo(cx, cy - Ri); hctx.lineTo(cx, cy + Ri);
  hctx.moveTo(cx - Math.sin(va) * Ri, cy - Math.cos(va) * Ri); hctx.lineTo(cx, cy); hctx.lineTo(cx + Math.sin(va) * Ri, cy - Math.cos(va) * Ri); hctx.stroke();
  hctx.globalAlpha = 1;
  hudGlow('1.5', cx + 4 * k, cy - 1500 * kk + 11 * k, 8.5 * k, G.line, 'rgba(0,0,0,0)', 'left', 0.6 * k);
  hudGlow('3 KM', cx + 4 * k, cy - Ri + 15 * k, 8.5 * k, G.line, 'rgba(0,0,0,0)', 'left', 0.8 * k);
  const at = (x, z) => {                                   // punto del mundo → minimapa; fuera del círculo, en el borde (_rp.far)
    const dx = x - p.x, dz = z - p.z, m = Ri - 7 * k; let ox = (dx * rx + dz * rz) * kk, oy = -(dx * fx + dz * fz) * kk;
    const l = Math.hypot(ox, oy), far = l > m; if (far) { ox *= m / l; oy *= m / l; }
    _rp.x = cx + ox; _rp.y = cy + oy; _rp.d = Math.hypot(dx, dz); _rp.far = far; return _rp;
  };
  drawMinimapSymbols(at, rx, rz, fx, fz);
  const P = ARC_FROST;                                     // tú: flecha de cristal azul con halo
  hctx.fillStyle = P.line; hctx.strokeStyle = 'rgba(8,18,40,.9)'; hctx.lineWidth = 1.2; hctx.shadowColor = P.glow; hctx.shadowBlur = 8 * k;
  hctx.beginPath(); hctx.moveTo(cx, cy - 9 * k); hctx.lineTo(cx - 6 * k, cy + 6 * k); hctx.lineTo(cx, cy + 2.5 * k); hctx.lineTo(cx + 6 * k, cy + 6 * k); hctx.closePath(); hctx.fill(); hctx.stroke();
  hctx.shadowBlur = 0; hctx.fillStyle = 'rgba(255,255,255,.45)';
  hctx.beginPath(); hctx.moveTo(cx, cy - 9 * k); hctx.lineTo(cx + 6 * k, cy + 6 * k); hctx.lineTo(cx, cy + 2.5 * k); hctx.closePath(); hctx.fill();
  hctx.restore();
  // bisel
  hctx.save();
  hctx.beginPath(); hctx.arc(cx, cy, R, 0, 6.2832); arcStroke(G.line, 1.8 * k);
  hctx.beginPath(); hctx.arc(cx, cy, Ri, 0, 6.2832); hctx.globalAlpha = 0.85; hctx.lineWidth = 0.9 * k; hctx.strokeStyle = G.line; hctx.stroke(); hctx.globalAlpha = 1;
  const aN = Math.atan2(fz, -fx), rad = Math.PI / 180;     // ángulo en pantalla del norte (el bisel gira con tu rumbo)
  hctx.beginPath();
  for (let b = 10; b < 360; b += 10) {
    if (b % 90 === 0) continue;
    const a = aN + b * rad, l = (b % 30 === 0 ? 5 : 3) * k, c = Math.cos(a), s = Math.sin(a);
    hctx.moveTo(cx + c * Ri, cy + s * Ri); hctx.lineTo(cx + c * (Ri - l), cy + s * (Ri - l));
  }
  arcStroke(G.line, 0.9 * k);
  for (let b = 45; b < 360; b += 90) { const a = aN + b * rad; arcGem(cx + Math.cos(a) * (R - 2.5 * k), cy + Math.sin(a) * (R - 2.5 * k), 2.2 * k, 2.2 * k, G); }
  for (const [l, b] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
    const a = aN + b * rad, c = Math.cos(a), s = Math.sin(a), N = l === 'N';
    if (N) arcFleur(cx + c * (R + k), cy + s * (R + k), a + Math.PI / 2, 6.5 * k);
    else arcGem(cx + c * (R - 2.5 * k), cy + s * (R - 2.5 * k), 3.2 * k, 3.2 * k, G);
    const lr = R + (N ? 19 : 11) * k, sz = (N ? 13 : 11.5) * k;
    hudGlow(l, cx + c * lr, cy + s * lr + sz * A_CAP / 2, sz, N ? ARC_EMBER.line : G.line, N ? ARC_EMBER.glow : G.glow, 'center');
  }
  hctx.restore();
}
/* Flor de lis (el norte del minimapa): con la base en (x, y), girada ang (0: hacia arriba) y de tamaño s; en brasa con filo oscuro. Cada
   pieza se rellena aparte (se solapan). */
function arcFleur(x, y, ang, s) {
  const parts = [
    () => { hctx.moveTo(0, -1.6 * s); hctx.bezierCurveTo(0.45 * s, -1.1 * s, 0.35 * s, -0.5 * s, 0, -0.25 * s); hctx.bezierCurveTo(-0.35 * s, -0.5 * s, -0.45 * s, -1.1 * s, 0, -1.6 * s); },   // pétalo central
    ...[-1, 1].map(m => () => {                            // pétalos de los lados, que se curvan hacia fuera y abajo
      hctx.moveTo(0.1 * m * s, -0.3 * s);
      hctx.bezierCurveTo(0.2 * m * s, -1.0 * s, 1.1 * m * s, -1.15 * s, 1.0 * m * s, -0.5 * s);
      hctx.bezierCurveTo(0.95 * m * s, -0.25 * s, 0.7 * m * s, -0.25 * s, 0.72 * m * s, -0.45 * s);
      hctx.bezierCurveTo(0.6 * m * s, -0.35 * s, 0.35 * m * s, -0.2 * s, 0.1 * m * s, -0.3 * s); hctx.closePath();
    }),
    () => { hctx.rect(-0.55 * s, -0.3 * s, 1.1 * s, 0.26 * s); hctx.moveTo(-0.3 * s, -0.04 * s); hctx.lineTo(0, 0.5 * s); hctx.lineTo(0.3 * s, -0.04 * s); hctx.closePath(); }   // banda y pie
  ];
  const k = HUD_K, P = ARC_EMBER, g = hctx.createLinearGradient(0, -1.6 * s, 0, 0.5 * s);
  hctx.save(); hctx.translate(x, y); hctx.rotate(ang); hctx.lineJoin = 'round';
  g.addColorStop(0, P.f0); g.addColorStop(0.5, P.f1); g.addColorStop(1, P.f2);
  hctx.beginPath(); parts.forEach(f => f()); hctx.lineWidth = 2.4 * k; hctx.strokeStyle = ARC_DARK; hctx.stroke();
  hctx.fillStyle = g; hctx.shadowColor = P.glow; hctx.shadowBlur = 6 * k;
  for (const f of parts) { hctx.beginPath(); f(); hctx.fill(); }
  hctx.shadowBlur = 0; hctx.beginPath(); parts.forEach(f => f()); hctx.lineWidth = 0.7 * k; hctx.strokeStyle = 'rgba(255,230,190,.7)'; hctx.stroke();
  hctx.restore();
}

/* ---------- SPEED y ALT, boost y acelerador ---------- */
/* Caja de un valor (SPEED, ALT), sin fondo: raya de arriba con un rombo al empezar, punta hacia el centro con una gema delante y raya de abajo
   que sigue hacia fuera y acaba en voluta; un filo fino dentro de la punta; el rótulo encima y el número en Cinzel. dir: +1 apunta a la
   derecha (SPEED, a la izquierda del centro). */
function arcValueBox(x, y, w, h, label, txt, dir) {
  const k = HUD_K, P = ARC_GOLD, pt = 12 * k, ex = 6 * k, X = u => dir > 0 ? x + u : x + w - u;   // X(u): u desde el lado de fuera
  hctx.save(); hctx.beginPath();
  hctx.moveTo(X(0), y); hctx.lineTo(X(w - pt), y); hctx.lineTo(X(w), y + h / 2); hctx.lineTo(X(w - pt), y + h); hctx.lineTo(X(-ex), y + h);
  volutePath(X(-ex), y + h, -dir, 5 * k);
  arcStroke(P.line, 1.3 * k);
  hctx.beginPath(); hctx.moveTo(X(w - pt - 4 * k), y + 4 * k); hctx.lineTo(X(w - 4.5 * k), y + h / 2); hctx.lineTo(X(w - pt - 4 * k), y + h - 4 * k);
  hctx.globalAlpha = 0.6; hctx.lineWidth = 0.9 * k; hctx.strokeStyle = P.line; hctx.stroke();
  hctx.restore();
  arcGem(X(0), y, 2.8 * k, 3.4 * k, P);
  arcGem(X(w + 8 * k), y + h / 2, 3.2 * k, 4.2 * k, P);
  const tc = X((w - pt) / 2 + 3 * k);
  hudGlow(label, tc, y - 7 * k, 12.5 * k, P.line, P.glow, 'center', 2.6 * k);
  hudGlow(txt, tc, y + h / 2 + 21 * k * A_CAP / 2, 21 * k, P.ink, P.glow, 'center', 0.8 * k);
}
/* SPEED y ALT (en el sitio de las cajas militares: a 209 px de la marca de la trayectoria, que siguen); bajo SPEED, el boost en una cápsula
   de brasa con «BOOST» y su porcentaje debajo; a su izquierda, el acelerador; bajo ALT, «HOVER» o «TIERRA». */
function arcFlightBoxes(cx, cy) {
  const k = HUD_K, w = 84 * k, h = 32 * k, by = cy - h / 2, sx = cx - 209 * k - w / 2, ax = cx + 209 * k - w / 2;
  const bb = by + h + 9 * k, bh = 8 * k, bw = w - 4 * k, lb = bb + bh + 14 * k;
  arcValueBox(sx, by, w, h, 'SPEED', String(Math.round(F.speed * 3.6)), 1);
  hctx.save(); if (F.boostExhausted) hctx.globalAlpha = 0.55 + 0.45 * Math.sin(gameTime * 9);   // agotado: parpadea
  arcCapsule(sx, bb, bw, bh, F.boost, ARC_EMBER);
  hudGlow('BOOST', sx, lb, 9.5 * k, ARC_EMBER.line, ARC_EMBER.glow, 'left', 1.6 * k);
  hudGlow(Math.round(F.boost * 100) + '%', sx + bw, lb, 9.5 * k, ARC_GOLD.ink, ARC_GOLD.glow, 'right');
  hctx.restore();
  arcThrottle(sx - 32 * k, by, 8 * k, bb + bh - by, by - 7 * k, lb);
  arcValueBox(ax, by, w, h, 'ALT', String(Math.round(dragon.position.y - WL)), -1);
  if (F.hover || GR.mode) { hctx.save(); hctx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 4); hudGlow(GR.mode ? 'TIERRA' : 'HOVER', ax + w / 2 + 6 * k, lb, 12 * k, ARC_GOLD.line, ARC_GOLD.glow, 'center', 2.4 * k); hctx.restore(); }
}
/* Acelerador: cápsula vertical que se llena de abajo arriba, marcas al 25, 50 y 75 % por fuera y una punta a la izquierda en su nivel; «THR»
   encima y el porcentaje debajo. En hover o en tierra, apagado. */
function arcThrottle(x, y, w, h, ly, vy) {
  const k = HUD_K, P = ARC_GOLD, t = clamp(F.throttle, 0, 1);
  hctx.save(); if (F.hover || GR.mode) hctx.globalAlpha = 0.35;
  hudGlow('THR', x + w / 2, ly, 12.5 * k, P.line, P.glow, 'center', 2 * k);
  arcCapsule(x, y, w, h, t, P, true);
  hctx.beginPath();
  for (const m of [0.25, 0.5, 0.75]) { const yy = y + h * (1 - m); hctx.moveTo(x + w + 2 * k, yy); hctx.lineTo(x + w + (m === 0.5 ? 6 : 4) * k, yy); }
  arcStroke(P.line, 0.9 * k);
  const ay = y + h * (1 - t);
  hctx.beginPath(); hctx.moveTo(x - 2 * k, ay); hctx.lineTo(x - 8 * k, ay - 4 * k); hctx.lineTo(x - 8 * k, ay + 4 * k); hctx.closePath();
  hctx.lineJoin = 'round'; hctx.lineWidth = 2.4 * k; hctx.strokeStyle = ARC_SHADE; hctx.stroke(); hctx.fillStyle = P.ink; hctx.fill();
  hudGlow(Math.round(t * 100) + '%', x + w / 2, vy, 10 * k, P.ink, P.glow, 'center', 0.4 * k);
  hctx.restore();
}

/* ---------- Armas, vida y mensajes ---------- */
/* Armas (abajo a la derecha, sin marco ni cristal): rótulos en Cinzel y barras hexagonales; GUN y MSL de bronce (MSL a 0, carmesí), FLM con
   el calor (bronce → brasa → carmesí, parpadea más cuanto más lleno), LSR de cristal azul con una gema en el borde (llena o disparando, con
   halo). Durante el sobrecalentamiento o el rayo, lo que no se puede usar se apaga, como en el militar. */
function arcWeapons() {
  const k = HUD_K, w = 92 * k, h = 22 * k, pitch = 30.67 * k, size = 12 * k;
  let bx = HW / 2 + 522 * k, lx = HW / 2 + 458 * k;
  const over = bx + w - (HW - 16 * k); if (over > 0) { bx -= over; lx -= over; }   // (pantallas estrechas: pegado al borde)
  const y3 = HH - 47 * k - h, oh = W.overheat > 0, las = W.laser > 0, blink = 0.5 + 0.5 * Math.sin(gameTime * 9), gnd = !!GR.mode;
  hctx.save();
  const row = (i, name, dim) => { const y = y3 - (3 - i) * pitch; hctx.globalAlpha = dim ? 0.32 : 1; hudGlow(name, lx, y + h / 2 + 15 * k * A_CAP / 2, 15 * k, ARC_GOLD.line, ARC_GOLD.glow, 'left', 2.4 * k); return y; };
  let y = row(0, 'GUN', oh || las || gnd);
  arcBar(bx, y, w, h, W.ammo / GUN_AMMO, W.ammo + '/' + GUN_AMMO, size, ARC_BRONZE, 10);
  y = row(1, 'MSL', oh || las || gnd);
  arcBar(bx, y, w, h, MSL_AMMO > 0 ? W.msl / MSL_AMMO : 0, W.msl + '/' + MSL_AMMO, size, W.msl > 0 ? ARC_BRONZE : ARC_CRIM, 10, W.msl > 0 ? null : ARC_CRIM.line);
  y = row(2, 'FLM', las);
  const heat = clamp(W.heat, 0, 1);
  if (oh) hctx.globalAlpha = 0.55 + 0.45 * blink;
  else if (heat > 0.02) hctx.globalAlpha *= 1 - 0.55 * heat * heat * (0.5 + 0.5 * Math.sin(gameTime * (4 + 10 * heat)));
  arcBar(bx, y, w, h, heat, Math.round(heat * 100) + '%', size, oh ? ARC_CRIM : arcHeat(heat), 10, oh ? ARC_CRIM.line : null);
  y = row(3, 'LSR', oh || gnd);
  const full = W.ult >= 1 && !las;
  if (full && !oh) hctx.globalAlpha = 0.65 + 0.35 * blink;
  if (las || (full && !oh)) {                              // lleno o disparando: halo de cristal alrededor de la barra
    hctx.save(); hctx.shadowColor = ARC_FROST.glow; hctx.shadowBlur = (las ? 16 : 8 + 14 * blink) * k; hctx.strokeStyle = ARC_FROST.line; hctx.lineWidth = 1.4 * k; hctx.lineJoin = 'round';
    hctx.beginPath(); hexPath(bx - 3 * k, y - 3 * k, w + 6 * k, h + 6 * k, h * 0.48 + 3 * k); hctx.stroke(); hctx.restore();
  }
  arcBar(bx, y, w, h, W.ult, Math.floor(W.ult * 100 + 1e-6) + '%', size, ARC_FROST, 0, null, true);
  hctx.restore();
}
/* Vida (abajo, en el centro): barra hexagonal carmesí con «vida/máxima», una gema y una voluta a cada lado; por debajo del 35 %, el filo
   también carmesí y late; mientras se regenera, late más suave. */
function arcHealth() {
  const k = HUD_K, w = 132 * k, h = 26 * k, x = HW / 2 - w / 2, y = HH - 47 * k - h, hpMax = heroHpMax(), f = clamp(F.health / hpMax, 0, 1), low = f <= 0.35;
  const regen = F.health < hpMax && F.health > 0 && gameTime - F.lastHit > HP_REGEN_WAIT && state === 'playing';
  hctx.save();
  if (regen) hctx.globalAlpha = 0.84 + 0.16 * Math.sin(gameTime * 6);
  else if (low) hctx.globalAlpha = 0.8 + 0.2 * Math.sin(gameTime * 7);
  arcBar(x, y, w, h, f, Math.ceil(F.health) + '/' + fmtStat(hpMax), 15 * k, ARC_CRIM, 10, low ? ARC_CRIM.line : null);
  for (const d of [-1, 1]) {
    const ex = d < 0 ? x : x + w;
    arcGem(ex + d * 7 * k, y + h / 2, 3 * k, 4.6 * k, low ? ARC_CRIM : ARC_GOLD);
    arcVolute(ex + d * 10.5 * k, y + h / 2, d, 6 * k, low ? ARC_CRIM.line : null);
  }
  hctx.restore();
}
/* «X DESTRUIDO» y «¡PROYECTIL APROXIMÁNDOSE!» (mismo sitio y tiempos que en el militar, drawKills): el texto en Cinzel entre dos rayas que
   acaban en gemas, sin panel. Los derribos en pergamino, el punto de control en dorado y el aviso en carmesí. */
function arcKills(warn) {
  const k = HUD_K, size = 17 * k, sp = 3.2 * k;
  let y = HH * 0.31;
  const banner = (txt, sub, P, al, wide) => {
    hctx.save(); hctx.font = FA(size); hctx.letterSpacing = sp.toFixed(1) + 'px'; const tw = hctx.measureText(txt).width; hctx.restore();
    const half = (tw / 2 + 16 * k) * wide, L = 44 * k;
    hctx.save(); hctx.globalAlpha *= al;
    hctx.beginPath(); for (const d of [-1, 1]) { hctx.moveTo(HW / 2 + d * half, y); hctx.lineTo(HW / 2 + d * (half + L), y); }
    arcStroke(P.line, 1.2 * k);
    for (const d of [-1, 1]) arcGem(HW / 2 + d * (half + L + 4 * k), y, 3.2 * k, 4.4 * k, P);
    hudGlow(txt, HW / 2, y + size * A_CAP / 2, size, P.ink, P.glow, 'center', sp);
    if (sub) hudGlow(sub, HW / 2, y + size * A_CAP / 2 + 16 * k, 10.5 * k, P.line, P.glow, 'center', 2 * k);
    hctx.restore();
  };
  if (warn) { banner(WARN_TXT, '', ARC_CRIM, Math.sin(gameTime * Math.PI * 2 * 2.5) > -0.2 ? 1 : 0.3, 1); y -= 34 * k; }
  KILLS.forEach((m, i) => {
    const t = gameTime - m.t0, al = Math.min(1, t / 0.12) * Math.min(1, (KILL_T - t) / 0.5) * (i ? 0.6 : 1);
    banner(m.txt, m.sub, hpal(m.pal), al, 1 + 0.22 * Math.max(0, 1 - t / 0.16));
    y -= (m.sub ? 44 : 34) * k;
  });
}

/* ---------- Objetivos (los dos estilos) ---------- */
/* Arriba a la izquierda (antes, arriba a la derecha con los puntos, que ya no salen): «OBJETIVOS» con su raya y, debajo, el tiempo que queda
   (si la misión lo tiene) y cada objetivo con su frase de la receta (o.text) y su cuenta; los opcionales, con «· opcional» y la viñeta
   hueca; los cumplidos, en dorado (se van a los 8 s). Al final, lo que le falta a la flota para escapar (Misión 1). Arcano: Cinzel y EB
   Garamond, raya con gema y punta de flecha; militar: Graduate, raya verde con un cuadrado. */
const _wrap = new Map();                                   // líneas ya partidas (texto, fuente y ancho); se vacía al cargar las fuentes
try { document.fonts.addEventListener('loadingdone', () => _wrap.clear()); } catch (e) { }
function wrapText(txt, font, sp, maxW) {
  const key = font + '|' + sp + '|' + maxW + '|' + txt; let L = _wrap.get(key); if (L) return L;
  hctx.save(); hctx.font = font; hctx.letterSpacing = sp.toFixed(1) + 'px'; L = []; let cur = '';
  for (const w of txt.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && hctx.measureText(t).width > maxW) { L.push(cur); cur = w; } else cur = t; }
  if (cur) L.push(cur); hctx.restore();
  if (_wrap.size > 200) _wrap.clear(); _wrap.set(key, L); return L;
}
function drawObjectives() {
  const list = MS.objs.filter(o => o.shown && !(o.done && MS.t - o.doneT > 8));   // (v34: los cumplidos se van a los 8 s: en un capítulo se acumulan)
  const left = mission.timeLimit ? Math.max(0, mission.timeLimit - MS.t) : null, ed = fleetEscapes() && !MS.ended ? airshipEdgeDist() : Infinity;
  if (!list.length && left == null && !(ed < Infinity)) return;
  const k = HUD_K, arc = HUD_ARC, P = hpal(PAL_G), PD = hpal(PAL_GOLD), PR = hpal(PAL_R), x0 = 30 * k, x1 = x0 + 230 * k;
  let y = 34 * k;
  hudGlow('OBJETIVOS', x0, y, (arc ? 14 : 13.5) * k, P.line, P.glow, 'left', (arc ? 2.8 : 1.6) * k);
  const ry = y + 9 * k;
  hctx.save();
  if (arc) {
    hctx.beginPath(); hctx.moveTo(x0 + 5 * k, ry); hctx.lineTo(x1, ry); hctx.moveTo(x1 - 6 * k, ry - 3.5 * k); hctx.lineTo(x1, ry); hctx.lineTo(x1 - 6 * k, ry + 3.5 * k);
    arcStroke(P.line, 1.1 * k); arcGem(x0 + k, ry, 3 * k, 3.6 * k, P);
  } else {
    const g = hctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, P.line); g.addColorStop(1, P.faint);
    hctx.shadowColor = P.glow; hctx.shadowBlur = 5 * k; hctx.fillStyle = g; hctx.fillRect(x0, ry - 0.6 * k, x1 - x0, 1.2 * k);
    hctx.fillStyle = P.line; hctx.fillRect(x0, ry - 2.5 * k, 5 * k, 5 * k);
  }
  hctx.restore();
  y = ry + 23 * k;
  const head = (t, Q) => { hudGlow(t, x0 + 2 * k, y, 12.5 * k, Q.ink, Q.glow, 'left', (arc ? 2 : 1.2) * k); y += 22 * k; };
  if (left != null) head('TIEMPO  ' + fmtClock(left), left < 30 ? PR : P);
  const fs = (arc ? 16.5 : 12) * k, lh = (arc ? 19 : 17) * k, font = arc ? FB(fs) : FG(fs), sp = arc ? 0 : 0.6 * k, tx = x0 + 18 * k;
  for (const o of list) {
    const Q = o.done ? PD : P, open = o.optional && !o.done, by = y - fs * (arc ? 0.3 : 0.36);
    const L = wrapText(o.text + ' (' + Math.min(o.n, o.count) + '/' + o.count + ')' + (o.optional ? ' · opcional' : ''), font, sp, 290 * k);
    hctx.save();
    if (arc) {                                             // viñeta: rombo dorado con otro dentro (hueco si es opcional)
      hctx.beginPath(); diamondPath(x0 + 6 * k, by, 4.6 * k, 4.6 * k); arcStroke(Q.line, k);
      if (!open) { hctx.beginPath(); diamondPath(x0 + 6 * k, by, 2 * k, 2 * k); hctx.fillStyle = Q.line; hctx.fill(); }
    } else {                                               // viñeta: cuadrado verde (hueco si es opcional)
      hctx.shadowColor = Q.glow; hctx.shadowBlur = 5 * k; hctx.strokeStyle = hctx.fillStyle = Q.line; hctx.lineWidth = 1.2 * k;
      if (open) hctx.strokeRect(x0 + 2.5 * k, by - 3.5 * k, 7 * k, 7 * k); else hctx.fillRect(x0 + 2.5 * k, by - 3.5 * k, 7 * k, 7 * k);
    }
    hctx.restore();
    for (const s of L) {
      if (arc) {
        hctx.save(); hctx.font = font; hctx.textAlign = 'left'; hctx.lineJoin = 'round';
        hctx.lineWidth = 3 * k; hctx.strokeStyle = 'rgba(20,12,4,.72)'; hctx.strokeText(s, tx, y);
        hctx.shadowColor = 'rgba(0,0,0,.6)'; hctx.shadowBlur = 4 * k; hctx.fillStyle = Q.ink; hctx.fillText(s, tx, y);
        hctx.restore();
      } else hudGlow(s, tx, y, fs, Q.ink, Q.glow, 'left', sp);
      y += lh;
    }
    y += 6 * k;
  }
  if (ed < Infinity) {                                     // v23: lo que le falta a la flota para escapar (el dirigible más cercano al borde)
    const near = ed < 2000;
    hctx.save(); if (near) hctx.globalAlpha = 0.65 + 0.35 * Math.sin(gameTime * 8);
    y += 2 * k; head('BORDE  ' + fmtDist(Math.max(0, ed)), near ? PR : P); hctx.restore();
  }
}
