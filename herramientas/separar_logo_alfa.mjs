/* v26: separa un logo «SKY APEX» en una sola línea y CON transparencia (PNG RGBA) en sus dos palabras, para la intro.
   (El logo de la v26, imagenes/logo_v3.webp, se pasa antes a PNG: node herramientas/blender/lanzar.mjs herramientas/blender/imagen_a_png.py
   -- imagenes/logo_v3.webp herramientas/blender/salida/logo_v3.png.) Es separar_logo_blanco.mjs sin el paso del fondo blanco:
   1. Separación: manchas opacas (alfa > 0,5) a un lado u otro de la línea que pasa por el hueco entre la Y y la A (SPLIT, en píxeles del
      original, arriba y abajo); cada mancha entera al lado de su centro. Los bordes suaves y las llamas finas van con la mancha más cercana.
   2. Las dos piezas se recortan al mismo rectángulo (el del logo entero más un margen), así que superpuestas reconstruyen el logo.
   3. Escribe las cajas de cada palabra y el punto del choque para la intro (LOGO_W, LOGO_H, LOGO_BOX, LOGO_HIT en 17_intro_menu_tutorial.js
      y el aspect-ratio de .logo-stage en 01_estilos.css).
   Uso: node separar_logo_alfa.mjs --logo salida/logo_v3.png --sky ../imagenes/logo_sky.png --apex ../imagenes/logo_apex.png */
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const IN = arg('logo', 'blender/salida/logo_v3.png'), OUT_SKY = arg('sky', '../imagenes/logo_sky.png'), OUT_APEX = arg('apex', '../imagenes/logo_apex.png');
const MARGIN = 24;
const SPLIT = [[955, 280], [795, 860]];                   // hueco entre SKY y APEX: punto de arriba y de abajo (x, y)

const png = PNG.sync.read(fs.readFileSync(IN)), { width: W, height: H, data: D } = png;
const N = W * H, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const A = new Float32Array(N); for (let i = 0; i < N; i++) A[i] = D[i * 4 + 3] / 255;
// manchas opacas y su lado
const side = ([x, y]) => { const [[x0, y0], [x1, y1]] = SPLIT; return (x - x0) * (y1 - y0) - (y - y0) * (x1 - x0); };   // < 0: SKY (a la izquierda de la línea)
const lab = new Int32Array(N).fill(-1), comps = [];
for (let i = 0; i < N; i++) {
  if (lab[i] >= 0 || A[i] <= 0.5) continue;
  const id = comps.length, st = [i]; lab[i] = id; let n = 0, sx = 0, sy = 0;
  while (st.length) { const j = st.pop(), x = j % W, y = (j / W) | 0; n++; sx += x; sy += y; for (const [dx, dy] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (lab[k] < 0 && A[k] > 0.5) { lab[k] = id; st.push(k); } } }
  comps.push({ n, cx: sx / n, cy: sy / n });
}
const isSky = p => side(p) < 0;
const owner = new Int8Array(N).fill(-1), q = new Int32Array(N); let qh = 0, qt = 0;
for (let i = 0; i < N; i++) if (lab[i] >= 0) { const c = comps[lab[i]]; owner[i] = isSky([c.cx, c.cy]) ? 0 : 1; q[qt++] = i; }
while (qh < qt) { const j = q[qh++], x = j % W, y = (j / W) | 0; for (const [dx, dy] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (owner[k] < 0 && A[k] > 0) { owner[k] = owner[j]; q[qt++] = k; } } }
for (let i = 0; i < N; i++) if (owner[i] < 0 && A[i] > 0) owner[i] = isSky([i % W, (i / W) | 0]) ? 0 : 1;   // sueltas, sin conexión
// rectángulo común
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let i = 0; i < N; i++) if (A[i] > 0.04) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
x0 = Math.max(0, x0 - MARGIN); y0 = Math.max(0, y0 - MARGIN); x1 = Math.min(W - 1, x1 + MARGIN); y1 = Math.min(H - 1, y1 + MARGIN);
const OW = x1 - x0 + 1, OH = y1 - y0 + 1, box = [[1e9, 1e9, -1, -1], [1e9, 1e9, -1, -1]];
for (const [who, file] of [[0, OUT_SKY], [1, OUT_APEX]]) {
  const out = new PNG({ width: OW, height: OH });
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const i = (y + y0) * W + (x + x0), o = (y * OW + x) * 4;
    if (owner[i] !== who || A[i] <= 0) { out.data[o + 3] = 0; continue; }
    out.data[o] = D[i * 4]; out.data[o + 1] = D[i * 4 + 1]; out.data[o + 2] = D[i * 4 + 2]; out.data[o + 3] = D[i * 4 + 3];
    if (A[i] > 0.3) { const b = box[who]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(out, { colorType: 6 }));
  console.log(`${file}: ${OW}×${OH}, ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
const big = comps.filter(c => c.n > 3000).map(c => `${isSky([c.cx, c.cy]) ? 'SKY' : 'APEX'}(${Math.round(c.cx)},${Math.round(c.cy)})`);
console.log('Manchas grandes:', big.join(' '));
console.log('LOGO_W, LOGO_H =', OW, OH, '· LOGO_BOX =', JSON.stringify(box), '· LOGO_HIT =',
  JSON.stringify([+(((box[0][2] + box[1][0]) / 2) / OW).toFixed(3), +(((box[0][1] + box[0][3]) / 2) / OH).toFixed(3)]));
