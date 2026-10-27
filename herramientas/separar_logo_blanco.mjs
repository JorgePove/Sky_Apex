/* v14: separa un logo «SKY APEX» en una sola línea y sobre fondo BLANCO (JPG, sin transparencia) en sus dos palabras, para la intro.
   1. Transparencia: el fondo es el blanco conectado con el borde de la imagen. Lejos de él (a FONDO_DIST px o más) todo es opaco: el interior de
      las letras, aunque tenga brillos casi blancos. En los bordes y en las llamas finas, la opacidad sale de cuánto se aparta el color del
      blanco (1 - el canal más bajo, que es exacto para colores oscuros o saturados) y el color se «desmezcla» del blanco para que no quede halo.
   2. Separación: manchas opacas (alfa > 0,5) a un lado u otro de la línea que pasa por el hueco entre la Y y la A (SPLIT, en píxeles del JPG,
      arriba y abajo); cada mancha entera al lado de su centro. Los bordes suaves van con la mancha más cercana.
   3. Las dos piezas se recortan al mismo rectángulo (el del logo entero más un margen), así que superpuestas reconstruyen el logo.
   Uso: node separar_logo_blanco.mjs --logo ../imagenes/logo_v2.jpg --sky ../imagenes/logo_sky.png --apex ../imagenes/logo_apex.png */
import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const IN = arg('logo', '../imagenes/logo_v2.jpg'), OUT_SKY = arg('sky', '../imagenes/logo_sky.png'), OUT_APEX = arg('apex', '../imagenes/logo_apex.png');
const BG = 0.045, FONDO_DIST = 3, MARGIN = 36;
const SPLIT = [[1035, 280], [948, 800]];                  // hueco entre SKY y APEX: punto de arriba y de abajo (x, y)

const img = jpeg.decode(fs.readFileSync(IN), { useTArray: true }), { width: W, height: H, data: D } = img;
const N = W * H, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const dw = new Float32Array(N);                              // cuánto se aparta del blanco (1 - canal más bajo)
for (let i = 0; i < N; i++) dw[i] = 1 - Math.min(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]) / 255;
// fondo: las zonas blancas conectadas con el borde y también las cerradas de cierto tamaño (los huecos de la A y la P); los brillos
// casi blancos de dentro de las letras son manchas pequeñas y se quedan
const HUECO_MIN = 120;
const bg = new Uint8Array(N), seen = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
for (let i = 0; i < N; i++) {
  if (seen[i] || dw[i] >= BG) continue;
  qh = qt = 0; q[qt++] = i; seen[i] = 1; let edge = false;
  while (qh < qt) {
    const j = q[qh++], x = j % W, y = (j / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
    for (const [dx, dy] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (!seen[k] && dw[k] < BG) { seen[k] = 1; q[qt++] = k; } }
  }
  if (edge || qt >= HUECO_MIN) for (let n = 0; n < qt; n++) bg[q[n]] = 1;
}
// distancia (en pasos) al fondo
const dist = new Int32Array(N).fill(1 << 30); qh = qt = 0;
for (let i = 0; i < N; i++) if (bg[i]) { dist[i] = 0; q[qt++] = i; }
while (qh < qt) { const j = q[qh++], x = j % W, y = (j / W) | 0; for (const [dx, dy] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (dist[k] > dist[j] + 1) { dist[k] = dist[j] + 1; q[qt++] = k; } } }
// alfa y color sin el blanco
const A = new Float32Array(N), C = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  let a = bg[i] ? 0 : dist[i] >= FONDO_DIST ? 1 : Math.min(1, Math.max(0, (dw[i] - BG) / (1 - BG)) * 1.12);
  if (a < 0.02) a = 0;
  A[i] = a;
  for (let c = 0; c < 3; c++) { const v = D[i * 4 + c] / 255; C[i * 3 + c] = a > 0 ? Math.min(1, Math.max(0, (v - (1 - a)) / a)) : 0; }
}
// manchas opacas y su lado
const side = ([x, y]) => { const [[x0, y0], [x1, y1]] = SPLIT; return (x - x0) * (y1 - y0) - (y - y0) * (x1 - x0); };   // < 0: SKY (a la izquierda de la línea)
const lab = new Int32Array(N).fill(-1), comps = [];
for (let i = 0; i < N; i++) {
  if (lab[i] >= 0 || A[i] <= 0.5) continue;
  const id = comps.length, st = [i]; lab[i] = id; let n = 0, sx = 0, sy = 0;
  while (st.length) { const j = st.pop(), x = j % W, y = (j / W) | 0; n++; sx += x; sy += y; for (const [dx, dy] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (lab[k] < 0 && A[k] > 0.5) { lab[k] = id; st.push(k); } } }
  comps.push({ n, cx: sx / n, cy: sy / n });
}
const owner = new Int8Array(N).fill(-1); qh = qt = 0;
for (let i = 0; i < N; i++) if (lab[i] >= 0) { const c = comps[lab[i]]; owner[i] = side([c.cx, c.cy]) < 0 ? 0 : 1; q[qt++] = i; }
while (qh < qt) { const j = q[qh++], x = j % W, y = (j / W) | 0; for (const [dx, dy] of nb) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (owner[k] < 0 && A[k] > 0) { owner[k] = owner[j]; q[qt++] = k; } } }
for (let i = 0; i < N; i++) if (owner[i] < 0 && A[i] > 0) owner[i] = side([i % W, (i / W) | 0]) < 0 ? 0 : 1;   // sueltas, sin conexión
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
    out.data[o] = Math.round(C[i * 3] * 255); out.data[o + 1] = Math.round(C[i * 3 + 1] * 255); out.data[o + 2] = Math.round(C[i * 3 + 2] * 255); out.data[o + 3] = Math.round(A[i] * 255);
    if (A[i] > 0.3) { const b = box[who]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(out, { colorType: 6 }));
  console.log(`${file}: ${OW}×${OH}, ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
const big = comps.filter(c => c.n > 3000).map(c => `${side([c.cx, c.cy]) < 0 ? 'SKY' : 'APEX'}(${Math.round(c.cx)},${Math.round(c.cy)})`);
console.log('Manchas grandes:', big.join(' '));
console.log('Recorte', OW, '×', OH, '· cajas (LOGO_BOX):', JSON.stringify(box), '· choque (LOGO_HIT, en fracción):',
  JSON.stringify([+(((box[0][2] + box[1][0]) / 2) / OW).toFixed(3), +(((box[0][1] + box[0][3]) / 2) / OH).toFixed(3)]));
