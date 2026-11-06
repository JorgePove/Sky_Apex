/* ============================================================
   8b. HUD ARCANO (ALTA FANTASÍA) Y OBJETIVOS ARRIBA A LA IZQUIERDA
   ============================================================
   v48: primer estilo arcano, con la referencia fantasy_HUD.png. v49: rehecho según el mockup de Jorge (source_assets/references/ui/
   HUD ref 01.png) y sus recursos (marcos de los blancos y escudos, hud_*.png, tools/prepare_hud_assets.mjs). Fuente PT Serif (rótulos en
   redonda con degradado de oro; cifras en negrita cursiva, de crema a oro; texto en pergamino). Todo sale del mismo lenguaje, el de los
   marcos de Jorge: metal dorado con la luz arriba a la izquierda (metal: banda con degradado y bisel oscuro) y, en las placas (arcPlate: vida,
   armas, boost, rumbo, acelerador), banda de oro, ranura negra, filo fino y relleno. Medidas sacadas del mockup (a 1080 de alto, HUD_K = 1,25).
   Opciones → «Estilo del HUD»: Arcano (por defecto) o Militar (el de la v39-v42, sin cambios). Las funciones del HUD militar (16) pasan aquí
   con HUD_ARC; las que comparten la forma (seleccionado, flechas…) solo cambian de paleta (hpal) y de texto (arcText, desde hudGlow). En los
   dos estilos, los objetivos van arriba a la izquierda (drawObjectives). */
const HUD_KEY = 'skyApex.hud';
let HUD_ARC = true;                                        // estilo del HUD: arcano (por defecto) o militar
try { const v = localStorage.getItem(HUD_KEY); if (v === 'arcane' || v === 'military') HUD_ARC = v === 'arcane'; } catch (err) { }
function setHudStyle(arc) { HUD_ARC = arc; document.body.classList.toggle('hud-arcane', arc); }   // (la clase: radio y avisos del DOM, 01_styles.css)
setHudStyle(HUD_ARC);
{ const sel = document.getElementById('hudStyle'); sel.value = HUD_ARC ? 'arcane' : 'military';
  sel.addEventListener('change', () => { setHudStyle(sel.value === 'arcane'); try { localStorage.setItem(HUD_KEY, sel.value); } catch (err) { } }); }

/* PT Serif: PTL rótulos, PTB rótulos pequeños (en negrita, se leen mejor), PTV cifras (negrita cursiva), PTT texto. A_CAP: alto de mayúsculas y cifras (em). */
const FONT_PT = "'PT Serif', Georgia, 'Times New Roman', serif", A_CAP = 0.7;
const PTL = n => `400 ${n.toFixed(1)}px ${FONT_PT}`, PTB = n => `700 ${n.toFixed(1)}px ${FONT_PT}`, PTV = n => `italic 700 ${n.toFixed(1)}px ${FONT_PT}`, PTT = PTL;
try { for (const f of ['400', '700', 'italic 700']) document.fonts.load(f + " 20px 'PT Serif'"); } catch (e) { }   // (el lienzo no las pide solo)

/* Paletas (las mismas claves que las del militar, hudPal; el degradado de las barras, muestreado del mockup) y el paso de una militar a su
   arcana (hpal). glow: la sombra del texto (oscura; solo el peligro y el cristal brillan). */
function arcPal(c, glow) { const P = hudPal(c); P.glow = glow; return P; }
const SHADOW = 'rgba(0,0,0,.65)';
const ARC_GOLD = arcPal({ ink: [255, 249, 230], line: [226, 198, 140], glow: [0, 0, 0], f0: [248, 237, 201], f1: [224, 196, 136], f2: [180, 136, 63] }, SHADOW);
const ARC_SUN = arcPal({ ink: [255, 226, 158], line: [246, 208, 120], glow: [0, 0, 0], f0: [255, 238, 196], f1: [238, 188, 92], f2: [140, 90, 20] }, SHADOW);   // cumplidos, punto de control
const ARC_CRIM = arcPal({ ink: [255, 240, 232], line: [234, 100, 84], glow: [0, 0, 0], f0: [205, 89, 78], f1: [168, 26, 23], f2: [61, 9, 10] }, 'rgba(255,50,30,.5)');
const ARC_BRONZE = arcPal({ ink: [255, 249, 230], line: [226, 198, 140], glow: [0, 0, 0], f0: [197, 164, 99], f1: [152, 105, 54], f2: [81, 61, 31] }, SHADOW);   // munición y boost
const ARC_EMBER = arcPal({ ink: [255, 240, 220], line: [244, 150, 70], glow: [0, 0, 0], f0: [255, 200, 130], f1: [226, 110, 40], f2: [120, 40, 10] }, SHADOW);   // el calor, a medias, y el norte
const ARC_FROST = arcPal({ ink: [236, 248, 255], line: [146, 204, 255], glow: [86, 166, 255], f0: [90, 170, 250], f1: [24, 100, 214], f2: [10, 40, 120] }, 'rgba(86,166,255,.6)');   // energía: rayo y escudos
ARC_FROST.tex = true;                                      // (se rellena con la textura de energía de los escudos: energyFill)
const ARC_DARK = 'rgba(20,14,8,.92)', ARC_SHADE = 'rgba(22,15,7,.6)';   // contorno de los textos y sombra de las líneas
const ARC_OF = new Map([[PAL_G, ARC_GOLD], [PAL_A, ARC_EMBER], [PAL_R, ARC_CRIM], [PAL_GOLD, ARC_SUN]]);
const hpal = P => HUD_ARC ? ARC_OF.get(P) || P : P;
function arcHeat(t) { t = clamp(t, 0, 1) * 2; return t < 1 ? palMix(ARC_BRONZE, ARC_EMBER, t) : palMix(ARC_EMBER, ARC_CRIM, t - 1); }   // bronce → brasa → carmesí
const TEXT_GRAD = new Map([[ARC_GOLD.line, ['#f8ecc8', '#c8a35c']], [ARC_GOLD.ink, ['#fffaea', '#dcc088']], [ARC_SUN.ink, ['#fff0c0', '#eeb95c']], [ARC_SUN.line, ['#ffe9ad', '#dfa243']],
  [ARC_CRIM.line, ['#ffa394', '#dc4433']], [ARC_CRIM.ink, ['#fff3ee', '#f5baab']], [ARC_EMBER.line, ['#ffd9a8', '#e08a3c']]]);
/* Metales (de arriba abajo): el oro de los marcos de Jorge, más claro al disparar, ámbar en vuelo recto, carmesí fijado, gris sin armas, y el marfil de la marca de dirección. */
const METAL = ['#f8edc9', '#e0c488', '#b4883f'], METAL_HOT = ['#fffae6', '#f6e2ae', '#d6ae62'], METAL_SUN = ['#ffe9ad', '#ffc65e', '#c8842a'],
  METAL_RED = ['#ffb8a6', '#e0503f', '#8f1a14'], METAL_OFF = ['#dcd8d0', '#aaa69e', '#6f6b64'], METAL_IVORY = ['#ffffff', '#f4efe2', '#cbc2ac'];

/* ---------- Piezas ---------- */
/* Texto arcano (hudGlow pasa aquí; y: línea base): contorno oscuro, sombra y, si su color tiene degradado (TEXT_GRAD), de claro a oscuro. Las
   cifras, en negrita cursiva. */
function arcText(txt, x, y, size, col, glow, align, spacing, font) {
  const k = HUD_K;
  hctx.save(); hctx.font = font || (/^\d/.test(txt) ? PTV(size) : size < 12.5 * k ? PTB(size) : PTL(size)); hctx.textAlign = align || 'center'; hctx.letterSpacing = (spacing || 0).toFixed(1) + 'px';
  const sx = hctx.textAlign === 'center' ? x + (spacing || 0) / 2 : x;   // (el espaciado se añade también tras la última letra)
  hctx.shadowBlur = 0; hctx.lineJoin = 'round'; hctx.lineWidth = Math.max(1.8, size * 0.15); hctx.strokeStyle = ARC_DARK; hctx.strokeText(txt, sx, y);
  const g = TEXT_GRAD.get(col);
  if (g) { const lg = hctx.createLinearGradient(0, y - size * 0.72, 0, y + size * 0.04); lg.addColorStop(0, g[0]); lg.addColorStop(1, g[1]); hctx.fillStyle = lg; } else hctx.fillStyle = col;
  hctx.shadowColor = glow || SHADOW; hctx.shadowBlur = 3 * k; hctx.fillText(txt, sx, y);
  hctx.restore();
}
function diamondPath(p, x, y, rx, ry) { p.moveTo(x, y - ry); p.lineTo(x + rx, y); p.lineTo(x, y + ry); p.lineTo(x - rx, y); p.closePath(); }
function metalGrad(y0, y1, M) { const g = hctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, M[0]); g.addColorStop(0.5, M[1]); g.addColorStop(1, M[2]); return g; }
/* Línea de metal, como los marcos de Jorge: bisel oscuro algo desplazado hacia abajo a la derecha (la luz viene de arriba a la izquierda) y
   encima la banda con el degradado entre y0 e y1. p: Path2D; glow: halo cálido. */
function metal(p, y0, y1, w, M, glow) {
  const k = HUD_K, o = 0.3 * k;
  hctx.save(); hctx.shadowBlur = 0; hctx.lineJoin = 'round'; hctx.lineCap = 'round';
  hctx.translate(o, o * 1.2); hctx.lineWidth = w + 1.5 * k; hctx.strokeStyle = ARC_DARK; hctx.stroke(p); hctx.translate(-o, -o * 1.2);
  if (glow) { hctx.shadowColor = 'rgba(255,200,120,.45)'; hctx.shadowBlur = glow * k; }
  hctx.lineWidth = w; hctx.strokeStyle = metalGrad(y0, y1, M || METAL); hctx.stroke(p);
  hctx.restore();
}
/* Pieza maciza de metal (rombos, puntas, lanzas): contorno oscuro y relleno con el degradado. */
function metalFill(p, y0, y1, M, rule) {
  hctx.save(); hctx.shadowBlur = 0; hctx.lineJoin = 'round'; hctx.lineWidth = 1.5 * HUD_K; hctx.strokeStyle = ARC_DARK; hctx.stroke(p);
  hctx.fillStyle = metalGrad(y0, y1, M || METAL); hctx.fill(p, rule || 'nonzero'); hctx.restore();
}
/* Lanza (remate de SPEED y ALT y de los mensajes): nace en (x, y) y va hacia dir (±1): rombo ancho con la cara de arriba clara y la de abajo oscura, y una cola fina que acaba en punta. */
function arcSpear(x, y, dir, s, M) {
  const k = HUD_K * s, m = M || METAL, rx = 8.6 * k, ry = 5.4 * k, cx = x + dir * rx, tail = cx + dir * (rx + 26 * k);
  const t = new Path2D(); t.moveTo(cx + dir * rx * 0.8, y - 1.1 * k); t.lineTo(tail, y); t.lineTo(cx + dir * rx * 0.8, y + 1.1 * k); t.closePath(); metalFill(t, y - 1.5 * k, y + 1.5 * k, m);
  const r = new Path2D(); diamondPath(r, cx, y, rx, ry); metalFill(r, y - ry, y + ry, m);
  hctx.save(); const b = new Path2D(); b.moveTo(cx - rx, y); b.lineTo(cx, y + ry); b.lineTo(cx + rx, y); b.closePath(); hctx.fillStyle = 'rgba(70,44,14,.55)'; hctx.fill(b); hctx.restore();   // la cara de abajo, en sombra
}
/* ---------- Placas ---------- */
/* Contorno de una placa (x, y, w, h: su caja, puntas incluidas): rectángulo con los lados en llave, «{ }», que acaban en punta (t: su largo). */
function platePath(x, y, w, h, t) {
  const p = new Path2D(), xl = x + t, xr = x + w - t, ym = y + h / 2, a = h * 0.18, b = h * 0.34, c = h * 0.44;
  p.moveTo(xl, y); p.lineTo(xr, y);
  p.quadraticCurveTo(xr - t * 0.35, y + a, xr + t * 0.12, y + b); p.quadraticCurveTo(xr + t * 0.5, y + c, x + w, ym);
  p.quadraticCurveTo(xr + t * 0.5, y + h - c, xr + t * 0.12, y + h - b); p.quadraticCurveTo(xr - t * 0.35, y + h - a, xr, y + h);
  p.lineTo(xl, y + h);
  p.quadraticCurveTo(xl + t * 0.35, y + h - a, xl - t * 0.12, y + h - b); p.quadraticCurveTo(xl - t * 0.5, y + h - c, x, ym);
  p.quadraticCurveTo(xl - t * 0.5, y + c, xl - t * 0.12, y + b); p.quadraticCurveTo(xl + t * 0.35, y + a, xl, y); p.closePath();
  return p;
}
/* La placa: la misma en todos los tamaños, en proporción a su alto: banda de oro, ranura negra, filo fino y dentro lo vacío (oscuro) y lo lleno
   (fracción f, de izquierda a derecha, con el degradado de P o la textura de energía), con un brillo arriba y el borde de avance; un remache
   en cada extremo. seg: marcas sobre el relleno (solo el acelerador). El texto, centrado, en negrita cursiva. */
function arcPlate(x, y, w, h, f, txt, size, P, seg, txtCol) {
  const k = HUD_K, t = h * 0.32, b = Math.max(k, h * 0.075), g = Math.max(0.6 * k, h * 0.05), th = Math.max(0.5 * k, h * 0.028), d1 = b + g, d2 = d1 + th, ff = clamp(f, 0, 1);
  const inset = d => platePath(x + d, y + d, w - 2 * d, h - 2 * d, t * (1 - d / (2 * h))), inner = inset(d2), ix = x + d2, iy = y + d2, iw = w - 2 * d2, ih = h - 2 * d2, fw = iw * ff;
  hctx.save(); hctx.shadowBlur = 0;
  hctx.fillStyle = 'rgba(12,10,8,.94)'; hctx.fill(inset(b * 0.5));   // la ranura negra
  hctx.fillStyle = 'rgba(28,30,34,.94)'; hctx.fill(inner);          // lo vacío
  if (ff > 0.002) {
    hctx.save(); hctx.clip(inner);
    if (P.tex && energyFill(ix, iy, fw, ih)) { /* textura de energía */ }
    else { const G = hctx.createLinearGradient(0, iy, 0, iy + ih); G.addColorStop(0, P.f0); G.addColorStop(0.45, P.f1); G.addColorStop(1, P.f2); hctx.fillStyle = G; hctx.fillRect(ix, iy, fw, ih); }
    const s = hctx.createLinearGradient(0, iy, 0, iy + ih * 0.45); s.addColorStop(0, 'rgba(255,255,255,.26)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    hctx.fillStyle = s; hctx.fillRect(ix, iy, fw, ih * 0.45);
    for (let j = 1; j < (seg || 0); j++) { const sx = ix + iw * j / seg; if (sx < ix + fw) { hctx.fillStyle = 'rgba(30,16,4,.55)'; hctx.fillRect(sx - 0.4 * k, iy, 0.8 * k, ih); } }
    if (ff < 0.998) { hctx.fillStyle = 'rgba(255,245,215,.7)'; hctx.fillRect(ix + fw - k, iy, k, ih); }
    hctx.restore();
  }
  hctx.globalAlpha *= 0.85; hctx.lineWidth = th; hctx.strokeStyle = '#e2c68c'; hctx.stroke(inset(d1 + th / 2)); hctx.globalAlpha /= 0.85;   // filo fino
  metal(inset(b / 2), y, y + h, b);                        // banda de oro
  const rv = Math.max(0.8 * k, h * 0.06), rx = t + h * 0.2;  // remaches
  for (const xx of [x + rx, x + w - rx]) {
    hctx.beginPath(); hctx.arc(xx, y + h / 2, rv, 0, 6.2832); hctx.lineWidth = Math.max(0.7, rv * 0.7); hctx.strokeStyle = 'rgba(14,10,6,.9)'; hctx.stroke();
    hctx.fillStyle = metalGrad(y + h / 2 - rv, y + h / 2 + rv, METAL); hctx.fill();
  }
  hctx.restore();
  if (txt) arcText(txt, x + w / 2, y + h / 2 + size * A_CAP / 2, size, txtCol || ARC_GOLD.ink, SHADOW, 'center', 0.2 * k, PTV(size));
}
/* ---------- Imágenes de Jorge (marcos de los blancos y escudos) ---------- */
const HUD_IMG = { hex: 'hud_target_hex', ci: 'hud_target_circle', tri: 'hud_target_triangle', full: 'hud_shield_full', empty: 'hud_shield_empty' }, HI = {};
for (const k in HUD_IMG) assetImageUrl('assets/images/' + HUD_IMG[k] + '.png', 'image/png').then(u => { const im = new Image(); im.onload = () => { HI[k] = im; }; im.src = u; });
const SPR_SIZES = [16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128, 160, 192, 256, 320, 384, 512], _spr = new Map();
/* La imagen reducida (de mitad en mitad, para que no salga con dientes) al tamaño de la lista que llega a px; tint: el marco en carmesí (fijado). Se guarda. */
function hudSprite(key, px, tint) {
  const im = HI[key]; if (!im) return null;
  const size = SPR_SIZES.find(s => s >= px) || SPR_SIZES[SPR_SIZES.length - 1], id = key + size + (tint ? 'r' : '');
  let c = _spr.get(id); if (c) return c;
  let src = im, w = im.width;
  while (w / 2 >= size) { const n = document.createElement('canvas'); n.width = n.height = Math.round(w / 2); const g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, n.width, n.height); src = n; w = n.width; }
  c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, size, size);
  if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(214,44,30,.74)'; g.fillRect(0, 0, size, size); }
  _spr.set(id, c); return c;
}
/* Textura de energía de los escudos para rellenar el rayo (LSR): un trozo del interior de hud_shield_full y su reflejo, para que se repita sin cortes; se desplaza despacio. */
let _energy = null;
function energyFill(x, y, w, h) {
  if (!_energy) {
    const im = HI.full; if (!im) return false;
    const s = im.width / 1024, sw = 360 * s, sh = 200 * s, H = 64, W = Math.round(H * sw / sh), c = document.createElement('canvas'); c.width = W * 2; c.height = H;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 330 * s, 300 * s, sw, sh, 0, 0, W, H); g.translate(W * 2, 0); g.scale(-1, 1); g.drawImage(im, 330 * s, 300 * s, sw, sh, 0, 0, W, H);
    _energy = { pat: hctx.createPattern(c, 'repeat'), H };
  }
  const s = h / _energy.H; _energy.pat.setTransform(new DOMMatrix([s, 0, 0, s, x + gameTime * 5 * HUD_K, y]));
  hctx.fillStyle = _energy.pat; hctx.fillRect(x, y, w, h); return true;
}

/* ---------- Marcos de los blancos ---------- */
/* Formas: las imágenes de Jorge, hexágono (dragones y sierpe, en lugar del cuadrado del militar), círculo (dirigibles, barcos, superdirigible) y
   triángulo-escudo (torres, artillería, torretas y hechiceros). Medio lado de cada imagen por medio tamaño r del blanco, FRAME_BOX. Muy grandes (el grosor de
   la imagen crece con ella) o antes de cargarse, y siempre el rectángulo de los batallones, a mano con el mismo metal (arcFrameVector). */
const FRAME_SPR = { sq: 'hex', ci: 'ci', tri: 'tri' }, FRAME_BOX = { sq: 1.447, ci: 1.411, tri: 1.607 }, FRAME_BIG = 80, FRAME_MIN = 10;
function arcFrame(shape, x, y, r, tint) {
  const key = FRAME_SPR[shape];
  if (key && r <= FRAME_BIG * HUD_K) {
    const h = FRAME_BOX[shape] * r, s = hudSprite(key, 2 * h * (hudEl.width / HW), tint);
    if (s) { hctx.drawImage(s, x - h, y - h, 2 * h, 2 * h); return; }
  }
  arcFrameVector(shape, x, y, r, tint);
}
function arcFrameVector(shape, x, y, r, tint) {
  const k = HUD_K, p = new Path2D(), w = clamp(r * 0.09, 1.5 * k, 0.07 * FRAME_BIG * k);
  if (shape === 'ci') p.arc(x, y, r * 1.05, 0, 6.2832);
  else if (shape === 'tri') { const s = r * 1.08 / 344; p.moveTo(x, y - 387 * s); p.lineTo(x + 344 * s, y - 292 * s); p.quadraticCurveTo(x + 290 * s, y + 90 * s, x, y + 368 * s); p.quadraticCurveTo(x - 290 * s, y + 90 * s, x - 344 * s, y - 292 * s); p.closePath(); }
  else if (shape === 'rect') { const a = r * 1.15, b = r * 0.6, c = Math.min(b * 0.3, 8 * k); p.moveTo(x - a + c, y - b); p.lineTo(x + a - c, y - b); p.lineTo(x + a, y - b + c); p.lineTo(x + a, y + b - c); p.lineTo(x + a - c, y + b); p.lineTo(x - a + c, y + b); p.lineTo(x - a, y + b - c); p.lineTo(x - a, y - b + c); p.closePath(); }
  else {                                                   // hexágono con la punta arriba y los lados algo hundidos
    const R = r * 1.15, q = i => { const a = -Math.PI / 2 + i * Math.PI / 3; return [x + R * Math.cos(a), y + R * Math.sin(a)]; };
    p.moveTo(...q(0));
    for (let i = 1; i <= 6; i++) { const [ax, ay] = q(i - 1), [bx, by] = q(i), mx = (ax + bx) / 2, my = (ay + by) / 2; p.quadraticCurveTo(x + (mx - x) * 0.94, y + (my - y) * 0.94, bx, by); }
    p.closePath();
  }
  metal(p, y - r * 1.2, y + r * 1.2, w, tint ? METAL_RED : METAL, 3);
}
/* Los marcos del fotograma (_fl, de drawTargets): tenues los que no cuentan y vivos los TGT, con el rótulo «TGT» arriba a la derecha. */
function arcFrames() {
  const k = HUD_K;
  hctx.save(); hctx.shadowBlur = 0;
  for (let g = 0; g < 2; g++) { const L = _fl[g]; hctx.globalAlpha = g ? 1 : 0.75; for (let i = 0; i < L.length; i += 4) arcFrame(L[i + 3], L[i], L[i + 1], L[i + 2]); }
  hctx.restore();
  const T = _fl[1];
  for (let i = 0; i < T.length; i += 4) arcText('TGT', T[i] + T[i + 2] * 0.3, T[i + 1] - T[i + 2] * 1.18 - 3 * k, 10.5 * k, ARC_GOLD.line, SHADOW, 'left', 0.3 * k, PTB(10.5 * k));
}

/* ---------- Brújula, marcas y mira ---------- */
/* Brújula: raya de metal con una punta de flecha en cada extremo y marcas cada 22,5° (con letra las de 45°): se ve de W a E. En el centro, un rombo hueco con
   una gema clara dentro y, debajo, el rumbo en una placa. */
function arcCompass(heading) {
  const k = HUD_K, P = ARC_GOLD, cx = HW / 2, ly = 44.8 * k, cw = Math.min(552 * k, HW - 40 * k), ppd = 2.707 * k, x0 = cx - cw / 2, x1 = cx + cw / 2, gy = ly + 3.5 * k, gap = 7.5 * k;
  const line = new Path2D(); line.moveTo(x0, ly); line.lineTo(cx - gap, ly); line.moveTo(cx + gap, ly); line.lineTo(x1, ly);
  const span = (cw / 2 - 12 * k) / ppd;
  for (let i = Math.floor((heading - span) / 22.5); i <= Math.ceil((heading + span) / 22.5); i++) {
    const d = i * 22.5, x = cx + (d - heading) * ppd; if (Math.abs(x - cx) > cw / 2 - 12 * k) continue;
    const big = i % 2 === 0, h = (big ? 4.2 : 2.8) * k;
    if (Math.abs(x - cx) > gap + k) { line.moveTo(x, ly - h); line.lineTo(x, ly + h); }
    if (big) { const n = ((d % 360) + 360) % 360; hctx.save(); hctx.globalAlpha = clamp((cw / 2 - 12 * k - Math.abs(x - cx)) / (24 * k), 0, 1); arcText(COMPASS[n], x, ly - 9 * k, 14 * k, P.ink, SHADOW, 'center', 0.4 * k, PTL(14 * k)); hctx.restore(); }
  }
  metal(line, ly - 4 * k, ly + 4 * k, 1.3 * k);
  const ends = new Path2D(); for (const d of [-1, 1]) { const ex = d < 0 ? x0 : x1; ends.moveTo(ex + d * 7 * k, ly); ends.lineTo(ex - d * 1.5 * k, ly - 3 * k); ends.lineTo(ex, ly); ends.lineTo(ex - d * 1.5 * k, ly + 3 * k); ends.closePath(); }
  metalFill(ends, ly - 3 * k, ly + 3 * k);
  const dm = new Path2D(); diamondPath(dm, cx, gy, 6.2 * k, 9.6 * k); metal(dm, gy - 9.6 * k, gy + 9.6 * k, 1.3 * k);   // rombo hueco
  const gm = new Path2D(); diamondPath(gm, cx, gy, 2.2 * k, 3.6 * k); hctx.save(); hctx.fillStyle = metalGrad(gy - 3.6 * k, gy + 3.6 * k, ['#ffffff', '#d6dbe4', '#8f97a6']); hctx.fill(gm); hctx.restore();
  const pw = 58 * k, ph = 15 * k, py = ly + 19.5 * k;
  arcPlate(cx - pw / 2, py, pw, ph, 0, String(Math.round(heading) % 360 || 360).padStart(3, '0') + '°', 11.5 * k, P);
}
/* Rombo de lados curvos (astroide) en p. c: cuánto se hunden sus lados hacia el centro. */
function astroidPath(p, x, y, r, c) {
  p.moveTo(x, y - r); p.quadraticCurveTo(x + c, y - c, x + r, y); p.quadraticCurveTo(x + c, y + c, x, y + r); p.quadraticCurveTo(x - c, y + c, x - r, y); p.quadraticCurveTo(x - c, y - c, x, y - r); p.closePath();
}
/* Marca de la dirección (la trayectoria): el rombo de lados curvos del mockup, hueco y en marfil, para distinguirla de la mira dorada (también cuando se solapan,
   al volar recto hacia ella, y queda dentro de su círculo); en vuelo recto (Espacio), ámbar. */
function arcPathMarker(p) {
  const k = HUD_K, x = p.x, y = p.y, R = 16 * k, a = new Path2D();
  astroidPath(a, x, y, R, 1.9 * k); astroidPath(a, x, y, 9.6 * k, 2.1 * k);
  metalFill(a, y - R, y + R, F.straight ? METAL_SUN : METAL_IVORY, 'evenodd');
  if (F.straight) arcText('VUELO RECTO', x, y - 34 * k, 11 * k, ARC_SUN.ink, SHADOW, 'center', 0.8 * k, PTB(11 * k));
}
/* Mira: círculo de metal dorado con cuatro puntas (como la del mockup; más clara al disparar; gris sin armas). Debajo, los slots del escudo (las imágenes de
   Jorge: el vacío, y encima el lleno recortado de abajo arriba: el que está en uso se vacía; los gastados se rellenan, apagados, durante su recarga). Por fuera,
   a la derecha, el arco del calor de la llamarada (bronce → brasa → carmesí). */
function arcReticle(a) {
  const k = HUD_K, hot = W.cool > 0, off = !weaponsReady(), M = off ? METAL_OFF : hot ? METAL_HOT : METAL, x = a.x, y = a.y, R = 18 * k;
  if (Math.hypot(x - _sp.x, y - _sp.y) > 26 * k) { hctx.save(); hctx.globalAlpha = 0.4; hctx.strokeStyle = ARC_GOLD.line; hctx.lineWidth = k; hctx.beginPath(); hctx.moveTo(_sp.x, _sp.y); hctx.lineTo(x, y); hctx.stroke(); hctx.restore(); }
  const ring = new Path2D(); ring.arc(x, y, R, 0, 6.2832); metal(ring, y - R, y + R, 1.7 * k, M, 3);
  const sp = new Path2D(), b = R - 0.6 * k, w = 1.8 * k, m = R + 3.5 * k, T = R + 13 * k;   // puntas: rombos largos que nacen del círculo
  for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { sp.moveTo(x + ux * b, y + uy * b); sp.lineTo(x + ux * m - uy * w, y + uy * m + ux * w); sp.lineTo(x + ux * T, y + uy * T); sp.lineTo(x + ux * m + uy * w, y + uy * m - ux * w); sp.closePath(); }
  metalFill(sp, y - T, y + T, M);
  drawShields(x, y + 41.5 * k);
  if (W.heat > 0.01 || W.overheat > 0) {                   // calor de la llamarada
    const A0 = 0.9, Rh = 35 * k, oh = W.overheat > 0, P = oh ? ARC_CRIM : arcHeat(W.heat);
    hctx.save(); hctx.lineCap = 'round'; hctx.lineWidth = 5.5 * k; hctx.strokeStyle = 'rgba(20,14,8,.6)'; hctx.beginPath(); hctx.arc(x, y, Rh, A0, -A0, true); hctx.stroke();
    hctx.globalAlpha = oh ? 0.55 + 0.45 * Math.sin(gameTime * 12) : 1; hctx.lineWidth = 3 * k; hctx.strokeStyle = P.line; hctx.shadowColor = rgbStr(P.c.line, 0.6); hctx.shadowBlur = 5 * k;
    hctx.beginPath(); hctx.arc(x, y, Rh, A0, A0 - 2 * A0 * clamp(W.heat, 0, 1), true); hctx.stroke(); hctx.restore();
    if (oh) arcText('SOBRECALENTADO  ' + W.overheat.toFixed(1) + ' s', x, y + 66 * k, 12 * k, ARC_CRIM.line, ARC_CRIM.glow, 'center', 0.8 * k, PTB(12 * k));
  }
}
function drawShields(x, y) {
  const k = HUD_K, n = W.shCd.length, box = 21 * k, gap = 15.6 * k, dpr = hudEl.width / HW, E = hudSprite('empty', box * dpr), Fu = hudSprite('full', box * dpr);
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * gap, x0 = cx - box / 2, y0 = y - box / 2, use = i === W.shUse && W.shieldT > 0, cd = W.shCd[i], rech = cd > 0 && !use;
    const f = clamp(use ? W.shieldT / SHIELD_T : cd > 0 ? 1 - cd / Math.max(SHIELD_CD, 0.01) : 1, 0, 1);
    if (!E || !Fu) {                                       // (aún sin cargar: un rombo)
      hctx.save(); const p = new Path2D(); diamondPath(p, cx, y, 5 * k, 7 * k); metalFill(p, y - 7 * k, y + 7 * k, f >= 1 ? ['#9fd2ff', '#3f8ef0', '#123f9c'] : METAL_OFF); hctx.restore(); continue;
    }
    hctx.drawImage(E, x0, y0, box, box);
    if (f > 0) {
      const S = Fu.width, sh = S * f, top = S - sh;        // (el lleno, recortado: de abajo arriba)
      hctx.save(); if (rech) hctx.globalAlpha *= 0.5;
      if (use) { hctx.shadowColor = ARC_FROST.glow; hctx.shadowBlur = (6 + 3 * Math.sin(gameTime * 8)) * k; }
      hctx.drawImage(Fu, 0, top, S, sh, x0, y0 + box * (1 - f), box, box * f); hctx.restore();
    }
  }
}
/* Flecha (blanco fuera de la pantalla, guiadas enemigas): una lanza con la punta en (x, y) hacia ang, con el metal de su paleta. */
function arcArrow(x, y, ang, P, len) {
  const k = HUD_K, L = len * k, w = 7.5 * k, sw = 1.5 * k;
  hctx.save(); hctx.translate(x, y); hctx.rotate(ang);
  const p = new Path2D(); p.moveTo(0, 0); p.lineTo(-L * 0.3, -w); p.lineTo(-L * 0.52, -sw); p.lineTo(-L * 0.9, -sw * 0.5); p.lineTo(-L, 0); p.lineTo(-L * 0.9, sw * 0.5); p.lineTo(-L * 0.52, sw); p.lineTo(-L * 0.3, w); p.closePath();
  const g = hctx.createLinearGradient(0, 0, -L, 0); g.addColorStop(0, P.f0); g.addColorStop(0.45, P.line); g.addColorStop(1, P.f2);
  hctx.lineJoin = 'round'; hctx.lineWidth = 2.4 * k; hctx.strokeStyle = ARC_DARK; hctx.stroke(p);
  hctx.shadowColor = P.glow; hctx.shadowBlur = 5 * k; hctx.fillStyle = g; hctx.fill(p); hctx.shadowBlur = 0;
  const b = new Path2D(); b.moveTo(0, 0); b.lineTo(-L * 0.3, w); b.lineTo(-L * 0.52, 0); b.closePath(); hctx.fillStyle = 'rgba(50,20,8,.3)'; hctx.fill(b);   // una cara de la punta, en sombra
  hctx.restore();
}

/* ---------- Minimapa redondo (astrolabio) ---------- */
/* Tú en el centro, con tu rumbo hacia arriba; el borde es el anillo de 3 km; anillos a 750 m y 1,5 km, cruz y las dos rayas de tu campo de visión; debajo, el relieve en
   sepia (MM.cvA). Encima, el bisel de metal con su ranura y marcas cada 10°, que gira con tu rumbo; por fuera, E, S y W y, en el norte, la flor de lis (sin girar). Los
   símbolos, como en el cuadrado (drawMinimapSymbols); lo que queda fuera, en el borde, en su dirección. */
function arcMinimap(heading, fwd) {
  const k = HUD_K, S = 242 * k, R = S / 2, Ri = R - 5.5 * k;
  const cx = Math.max(R + 34 * k, HW / 2 - 598 * k), cy = HH - 53 * k - R, kk = Ri / MM_RANGE;   // (margen a la izquierda para las letras y la flor)
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
  hctx.strokeStyle = G.line; hctx.lineWidth = k;          // anillos, cruz y campo de visión
  hctx.globalAlpha = 0.65; hctx.beginPath(); hctx.arc(cx, cy, 750 * kk, 0, 6.283); hctx.stroke();
  hctx.setLineDash([3 * k, 3 * k]); hctx.beginPath(); hctx.arc(cx, cy, 1500 * kk, 0, 6.283); hctx.stroke(); hctx.setLineDash([]);
  const va = Math.PI / 4; hctx.globalAlpha = 0.42; hctx.beginPath();
  hctx.moveTo(cx - Ri, cy); hctx.lineTo(cx + Ri, cy); hctx.moveTo(cx, cy - Ri); hctx.lineTo(cx, cy + Ri);
  hctx.moveTo(cx - Math.sin(va) * Ri, cy - Math.cos(va) * Ri); hctx.lineTo(cx, cy); hctx.lineTo(cx + Math.sin(va) * Ri, cy - Math.cos(va) * Ri); hctx.stroke();
  hctx.globalAlpha = 1;
  arcText('3 KM', cx + 5 * k, cy - Ri + 16 * k, 10 * k, G.line, SHADOW, 'left', 0.4 * k, PTL(10 * k));
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
  // bisel: ranura oscura, filo interior y banda de metal
  hctx.save(); hctx.shadowBlur = 0;
  hctx.beginPath(); hctx.arc(cx, cy, R - 2.8 * k, 0, 6.2832); hctx.lineWidth = 4 * k; hctx.strokeStyle = 'rgba(12,10,8,.9)'; hctx.stroke();
  hctx.beginPath(); hctx.arc(cx, cy, Ri, 0, 6.2832); hctx.lineWidth = k; hctx.strokeStyle = G.line; hctx.stroke();
  const ring = new Path2D(); ring.arc(cx, cy, R, 0, 6.2832); metal(ring, cy - R, cy + R, 2.2 * k, METAL, 3);
  const aN = Math.atan2(fz, -fx), rad = Math.PI / 180, tk = new Path2D();   // ángulo en pantalla del norte (el bisel gira con tu rumbo)
  for (let b = 0; b < 360; b += 10) { if (b % 45 === 0) continue; const a = aN + b * rad, l = (b % 30 === 0 ? 6 : 3.5) * k, c = Math.cos(a), s = Math.sin(a); tk.moveTo(cx + c * Ri, cy + s * Ri); tk.lineTo(cx + c * (Ri - l), cy + s * (Ri - l)); }
  hctx.lineWidth = 0.9 * k; hctx.strokeStyle = 'rgba(232,212,164,.85)'; hctx.stroke(tk);
  const gm = new Path2D(); for (let b = 0; b < 360; b += 45) { const a = aN + b * rad; diamondPath(gm, cx + Math.cos(a) * (R - 2.8 * k), cy + Math.sin(a) * (R - 2.8 * k), 2.6 * k, 2.6 * k); }
  metalFill(gm, cy - R, cy + R);
  for (const [l, b] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
    const a = aN + b * rad, c = Math.cos(a), s = Math.sin(a);
    if (l === 'N') arcFleur(cx + c * (R + 15 * k), cy + s * (R + 15 * k), 7.6 * k);
    else arcText(l, cx + c * (R + 12 * k), cy + s * (R + 12 * k) + 13 * k * A_CAP / 2, 13 * k, G.ink, SHADOW, 'center', 0, PTL(13 * k));
  }
  hctx.restore();
}
/* Flor de lis (el norte del minimapa): con su centro en (x, y), derecha y de tamaño s; en brasa con filo oscuro. Cada pieza se rellena aparte (se solapan). */
function arcFleur(x, y, s) {
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
  const k = HUD_K, P = ARC_EMBER;
  hctx.save(); hctx.translate(x, y + 0.55 * s); hctx.lineJoin = 'round';
  const g = hctx.createLinearGradient(0, -1.6 * s, 0, 0.5 * s); g.addColorStop(0, P.f0); g.addColorStop(0.5, P.f1); g.addColorStop(1, P.f2);
  hctx.beginPath(); parts.forEach(f => f()); hctx.lineWidth = 2.2 * k; hctx.strokeStyle = ARC_DARK; hctx.stroke();
  hctx.fillStyle = g; for (const f of parts) { hctx.beginPath(); f(); hctx.fill(); }
  hctx.beginPath(); parts.forEach(f => f()); hctx.lineWidth = 0.6 * k; hctx.strokeStyle = 'rgba(255,230,190,.65)'; hctx.stroke();
  hctx.restore();
}

/* ---------- SPEED y ALT, boost y acelerador ---------- */
/* Un valor (SPEED, ALT), sin fondo, alrededor de su centro: rótulo encima, raya arriba y abajo, punta hacia el centro de la pantalla rematada en un rombo y, hacia fuera,
   un huso y una lanza; el número en negrita cursiva. dir: +1 apunta a la derecha (SPEED, a la izquierda del centro). */
function arcValueBox(cx, cy, label, txt, dir) {
  const k = HUD_K, P = ARC_GOLD, X = u => cx + dir * u * k, T = cy - 14 * k, B = cy + 14 * k;
  for (const yy of [T, B]) { const bar = new Path2D(); bar.moveTo(X(-30), yy); bar.lineTo(X(32), yy); metal(bar, yy - 1.5 * k, yy + 1.5 * k, 1.6 * k); }
  const ch = new Path2D(); ch.moveTo(X(32), T); ch.lineTo(X(37), cy - 9.6 * k); ch.lineTo(X(50), cy); ch.lineTo(X(37), cy + 9.6 * k); ch.lineTo(X(32), B); metal(ch, T, B, 1 * k);
  const dm = new Path2D(); diamondPath(dm, X(53.5), cy, 3.2 * k, 3.2 * k); metalFill(dm, cy - 3.2 * k, cy + 3.2 * k);
  const sp = new Path2D(); diamondPath(sp, X(-32.5), B, 1.5 * k, 3.4 * k); metalFill(sp, B - 3.4 * k, B + 3.4 * k);
  arcSpear(X(-35), B, -dir, 1);
  arcText(label, X(0), cy - 18 * k, 15.5 * k, P.line, SHADOW, 'center', 0.5 * k, PTL(15.5 * k));
  arcText(txt, X(0), cy + 8.8 * k, 25.5 * k, P.ink, SHADOW, 'center', 0.2 * k, PTV(25.5 * k));
}
/* SPEED y ALT (a 240 de la marca de la dirección, que siguen; mockup); bajo SPEED, el boost en una placa de bronce con «BOOST» debajo; a su izquierda, por encima de la lanza, el
   acelerador; bajo ALT, «HOVER» o «TIERRA». */
function arcFlightBoxes(ax, ay) {
  const k = HUD_K, sx = ax - 240 * k, tx = ax + 240 * k, bw = 58 * k, bh = 14 * k, by = ay + 20 * k, lb = ay + 46.5 * k;
  arcValueBox(sx, ay, 'SPEED', String(Math.round(F.speed * 3.6)), 1);
  hctx.save(); if (F.boostExhausted) hctx.globalAlpha = 0.55 + 0.45 * Math.sin(gameTime * 9);   // agotado: parpadea
  arcPlate(sx - bw / 2, by, bw, bh, F.boost, Math.round(F.boost * 100) + '%', 9.5 * k, ARC_BRONZE);
  arcText('BOOST', sx, lb, 11.5 * k, ARC_GOLD.line, SHADOW, 'center', 0.4 * k, PTL(11.5 * k));
  hctx.restore();
  arcThrottle(sx - 52 * k, ay + 5 * k, 11 * k, 38 * k);
  arcValueBox(tx, ay, 'ALT', String(Math.round(dragon.position.y - WL)), -1);
  if (F.hover || GR.mode) { hctx.save(); hctx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 4); arcText(GR.mode ? 'TIERRA' : 'HOVER', tx, lb, 11.5 * k, ARC_GOLD.line, SHADOW, 'center', 0.4 * k, PTL(11.5 * k)); hctx.restore(); }
}
/* Acelerador: una placa en vertical (la misma, girada) que se llena de abajo arriba, con marcas al 25, 50 y 75 % y una punta a la izquierda en su nivel, junto al porcentaje; «THR»
   encima. (cx, bottom: el centro y el pie de la placa.) En hover o en tierra, apagado. */
function arcThrottle(cx, bottom, w, h) {
  const k = HUD_K, P = ARC_GOLD, t = clamp(F.throttle, 0, 1), top = bottom - h, off = F.hover || GR.mode;
  hctx.save(); if (off) hctx.globalAlpha = 0.35;
  arcText('THR', cx, top - 4 * k, 11.5 * k, P.line, SHADOW, 'center', 0.4 * k, PTL(11.5 * k));
  hctx.save(); hctx.translate(cx - w / 2, bottom); hctx.rotate(-Math.PI / 2); arcPlate(0, 0, h, w, t, '', 0, ARC_BRONZE, 4); hctx.restore();
  const ay = bottom - h * (0.08 + 0.84 * t), ptx = cx - w / 2 - 2 * k, tri = new Path2D();
  tri.moveTo(ptx, ay); tri.lineTo(ptx - 6 * k, ay - 3.6 * k); tri.lineTo(ptx - 6 * k, ay + 3.6 * k); tri.closePath(); metalFill(tri, ay - 3.6 * k, ay + 3.6 * k);
  arcText(Math.round(t * 100) + '%', ptx - 8 * k, ay + 9.5 * k * A_CAP / 2, 9.5 * k, P.ink, SHADOW, 'right', 0, PTV(9.5 * k));
  hctx.restore();
}

/* ---------- Armas, vida y mensajes ---------- */
/* Armas (abajo a la derecha, sin marco): rótulos en oro y placas; GUN y MSL de bronce (MSL a 0, la cifra en carmesí), FLM con el calor (bronce → brasa → carmesí, parpadea más cuanto
   más lleno), LSR con la textura de energía (llena o disparando, con halo). Durante el sobrecalentamiento o el rayo, lo que no se puede usar se apaga, como en el militar. */
function arcWeapons() {
  const k = HUD_K, w = 78 * k, h = 18 * k, pitch = 30 * k, size = 11.5 * k;
  let bx = HW / 2 + 516 * k, lx = HW / 2 + 473.5 * k;
  const over = bx + w - (HW - 16 * k); if (over > 0) { bx -= over; lx -= over; }   // (pantallas estrechas: pegado al borde)
  const y3 = HH - 55 * k - h, oh = W.overheat > 0, las = W.laser > 0, blink = 0.5 + 0.5 * Math.sin(gameTime * 9), gnd = !!GR.mode;
  hctx.save();
  const row = (i, name, dim) => { const y = y3 - (3 - i) * pitch; hctx.globalAlpha = dim ? 0.32 : 1; arcText(name, lx, y + h / 2 + 16 * k * A_CAP / 2, 16 * k, ARC_GOLD.line, SHADOW, 'left', 0, PTL(16 * k)); return y; };
  let y = row(0, 'GUN', oh || las || gnd);
  arcPlate(bx, y, w, h, W.ammo / GUN_AMMO, W.ammo + '/' + GUN_AMMO, size, ARC_BRONZE);
  y = row(1, 'MSL', oh || las || gnd);
  arcPlate(bx, y, w, h, MSL_AMMO > 0 ? W.msl / MSL_AMMO : 0, W.msl + '/' + MSL_AMMO, size, ARC_BRONZE, 0, W.msl > 0 ? null : ARC_CRIM.line);
  y = row(2, 'FLM', las);
  const heat = clamp(W.heat, 0, 1);
  if (oh) hctx.globalAlpha = 0.55 + 0.45 * blink;
  else if (heat > 0.02) hctx.globalAlpha *= 1 - 0.55 * heat * heat * (0.5 + 0.5 * Math.sin(gameTime * (4 + 10 * heat)));
  arcPlate(bx, y, w, h, heat, Math.round(heat * 100) + '%', size, oh ? ARC_CRIM : arcHeat(heat));
  y = row(3, 'LSR', oh || gnd);
  const full = W.ult >= 1 && !las;
  if (full && !oh) hctx.globalAlpha = 0.65 + 0.35 * blink;
  if (las || (full && !oh)) {                              // lleno o disparando: halo de energía alrededor de la placa
    hctx.save(); hctx.shadowColor = 'rgba(90,170,255,.95)'; hctx.shadowBlur = (las ? 16 : 8 + 14 * blink) * k; hctx.lineWidth = 1.4 * k; hctx.strokeStyle = ARC_FROST.line; hctx.stroke(platePath(bx, y, w, h, h * 0.32)); hctx.restore();
  }
  arcPlate(bx, y, w, h, W.ult, Math.floor(W.ult * 100 + 1e-6) + '%', size, ARC_FROST);
  hctx.restore();
}
/* Vida (abajo, en el centro): la placa grande, carmesí; por debajo del 35 %, late (y brilla); mientras se regenera, late más suave. */
function arcHealth() {
  const k = HUD_K, w = 140 * k, h = 31 * k, x = HW / 2 - w / 2, y = HH - 55 * k - h, hpMax = heroHpMax(), f = clamp(F.health / hpMax, 0, 1), low = f <= 0.35;
  const regen = F.health < hpMax && F.health > 0 && gameTime - F.lastHit > HP_REGEN_WAIT && state === 'playing';
  hctx.save();
  if (regen) hctx.globalAlpha = 0.84 + 0.16 * Math.sin(gameTime * 6);
  else if (low) hctx.globalAlpha = 0.8 + 0.2 * Math.sin(gameTime * 7);
  if (low) { hctx.save(); hctx.shadowColor = 'rgba(255,50,30,.9)'; hctx.shadowBlur = (8 + 6 * Math.sin(gameTime * 7)) * k; hctx.lineWidth = 1.4 * k; hctx.strokeStyle = ARC_CRIM.line; hctx.stroke(platePath(x, y, w, h, h * 0.32)); hctx.restore(); }
  arcPlate(x, y, w, h, f, Math.ceil(F.health) + '/' + fmtStat(hpMax), 21 * k, ARC_CRIM);
  hctx.restore();
}
/* «X DESTRUIDO» y «¡PROYECTIL APROXIMÁNDOSE!» (mismo sitio y tiempos que en el militar, drawKills): el texto en PT Serif entre dos lanzas, sin panel. Los derribos en oro, el punto
   de control en dorado vivo y el aviso en carmesí. */
function arcKills(warn) {
  const k = HUD_K, size = 19 * k, sp = 1.6 * k;
  let y = HH * 0.31;
  const banner = (txt, sub, P, M, al, wide) => {
    hctx.save(); hctx.font = PTL(size); hctx.letterSpacing = sp.toFixed(1) + 'px'; const tw = hctx.measureText(txt).width; hctx.restore();
    const half = (tw / 2 + 12 * k) * wide;
    hctx.save(); hctx.globalAlpha *= al;
    for (const d of [-1, 1]) arcSpear(HW / 2 + d * half, y, d, 0.8, M);
    arcText(txt, HW / 2, y + size * A_CAP / 2, size, P.line, P.glow, 'center', sp, PTL(size));
    if (sub) arcText(sub, HW / 2, y + size * A_CAP / 2 + 17 * k, 11 * k, P.ink, P.glow, 'center', 0.8 * k, PTL(11 * k));
    hctx.restore();
  };
  if (warn) { banner(WARN_TXT, '', ARC_CRIM, METAL_RED, Math.sin(gameTime * Math.PI * 2 * 2.5) > -0.2 ? 1 : 0.3, 1); y -= 34 * k; }
  KILLS.forEach((m, i) => {
    const t = gameTime - m.t0, al = Math.min(1, t / 0.12) * Math.min(1, (KILL_T - t) / 0.5) * (i ? 0.6 : 1), P = hpal(m.pal);
    banner(m.txt, m.sub, P, P === ARC_SUN ? METAL_SUN : METAL, al, 1 + 0.22 * Math.max(0, 1 - t / 0.16));
    y -= (m.sub ? 46 : 34) * k;
  });
}

/* ---------- Objetivos (los dos estilos) ---------- */
/* Arriba a la izquierda (antes, arriba a la derecha con los puntos, que ya no salen): «OBJETIVOS» con su raya y, debajo, el tiempo que queda (si la misión lo tiene) y cada objetivo
   con su frase de la receta (o.text) y su cuenta; los opcionales lo dicen y llevan la viñeta hueca; los cumplidos, en dorado (se van a los 8 s). Al final, lo que le falta a la
   flota para escapar (Misión 1). Arcano: PT Serif, raya de metal con un rombo y una punta de flecha (mockup); militar: Graduate, raya verde con un cuadrado. */
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
  const k = HUD_K, arc = HUD_ARC, P = hpal(PAL_G), PD = hpal(PAL_GOLD), PR = hpal(PAL_R), x0 = (arc ? 48 : 30) * k, x1 = x0 + (arc ? 246 : 230) * k;
  let y = (arc ? 40 : 34) * k;
  if (arc) arcText('OBJETIVOS', x0 + 2.5 * k, y, 17 * k, P.line, SHADOW, 'left', 1.8 * k, PTL(17 * k));
  else hudGlow('OBJETIVOS', x0, y, 13.5 * k, P.line, P.glow, 'left', 1.6 * k);
  const ry = y + 9 * k;
  if (arc) {
    const r = new Path2D(); r.moveTo(x0 + 4 * k, ry); r.lineTo(x1, ry); r.moveTo(x1 - 6 * k, ry - 3.2 * k); r.lineTo(x1, ry); r.lineTo(x1 - 6 * k, ry + 3.2 * k); metal(r, ry - 3 * k, ry + 3 * k, 1.2 * k);
    const d = new Path2D(); diamondPath(d, x0 + 2 * k, ry, 3 * k, 3.4 * k); metalFill(d, ry - 3.4 * k, ry + 3.4 * k);
  } else {
    hctx.save(); const g = hctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, P.line); g.addColorStop(1, P.faint);
    hctx.shadowColor = P.glow; hctx.shadowBlur = 5 * k; hctx.fillStyle = g; hctx.fillRect(x0, ry - 0.6 * k, x1 - x0, 1.2 * k);
    hctx.fillStyle = P.line; hctx.fillRect(x0, ry - 2.5 * k, 5 * k, 5 * k); hctx.restore();
  }
  y = ry + (arc ? 26 : 23) * k;
  const head = (t, Q) => { hudGlow(t, x0 + (arc ? 7 : 2) * k, y, (arc ? 13.5 : 12.5) * k, Q.ink, Q.glow, 'left', (arc ? 0.6 : 1.2) * k); y += (arc ? 25 : 22) * k; };
  if (left != null) head('TIEMPO  ' + fmtClock(left), left < 30 ? PR : P);
  const fs = (arc ? 16 : 12) * k, lh = (arc ? 18 : 17) * k, font = arc ? PTT(fs) : FG(fs), sp = arc ? 0 : 0.6 * k, tx = x0 + (arc ? 22 : 18) * k, gapY = (arc ? 7.6 : 6) * k;
  for (const o of list) {
    const Q = o.done ? PD : P, open = o.optional && !o.done, by = y - fs * (arc ? 0.32 : 0.36), bx = x0 + (arc ? 10 : 6) * k;
    const L = wrapText(o.text + ' (' + Math.min(o.n, o.count) + '/' + o.count + ')' + (o.optional ? (arc ? ' - opcional' : ' · opcional') : ''), font, sp, (arc ? 300 : 290) * k);
    if (arc) {                                             // viñeta: rombo con otro dentro (hueco si es opcional)
      const d = new Path2D(); diamondPath(d, bx, by, 4.2 * k, 4.2 * k); metal(d, by - 4.2 * k, by + 4.2 * k, 0.9 * k, o.done ? METAL_SUN : METAL);
      if (!open) { const e = new Path2D(); diamondPath(e, bx, by, 1.8 * k, 1.8 * k); hctx.save(); hctx.fillStyle = o.done ? ARC_SUN.line : '#e8d4a4'; hctx.fill(e); hctx.restore(); }
    } else {                                               // viñeta: cuadrado verde (hueco si es opcional)
      hctx.save(); hctx.shadowColor = Q.glow; hctx.shadowBlur = 5 * k; hctx.strokeStyle = hctx.fillStyle = Q.line; hctx.lineWidth = 1.2 * k;
      if (open) hctx.strokeRect(bx - 3.5 * k, by - 3.5 * k, 7 * k, 7 * k); else hctx.fillRect(bx - 3.5 * k, by - 3.5 * k, 7 * k, 7 * k); hctx.restore();
    }
    for (const s of L) {
      if (arc) arcText(s, tx, y, fs, o.done ? ARC_SUN.ink : '#f1e7cf', SHADOW, 'left', 0, font);
      else hudGlow(s, tx, y, fs, Q.ink, Q.glow, 'left', sp);
      y += lh;
    }
    y += gapY;
  }
  if (ed < Infinity) {                                     // v23: lo que le falta a la flota para escapar (el dirigible más cercano al borde)
    const near = ed < 2000;
    hctx.save(); if (near) hctx.globalAlpha = 0.65 + 0.35 * Math.sin(gameTime * 8);
    y += 2 * k; head('BORDE  ' + fmtDist(Math.max(0, ed)), near ? PR : P); hctx.restore();
  }
}
