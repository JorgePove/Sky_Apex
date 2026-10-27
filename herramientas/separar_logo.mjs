/* Separa el logo «Sky Apex» en sus dos mitades (SKY arriba con su bandera, APEX abajo con la suya) para la intro del menú.
   Las dos salen del mismo tamaño que el original, así que superpuestas reconstruyen el logo exacto.
   - Las dos piezas son dos manchas de opacidad que no se tocan: se etiquetan por separado.
   - Los píxeles casi transparentes (bordes suaves, brillos sueltos) se asignan a la pieza más cercana.
   Uso: node separar_logo.mjs --logo ../menu_logo.png --sky ../imagenes/logo_sky.png --apex ../imagenes/logo_apex.png */
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const IN = arg('logo', '../menu_logo.png'), OUT_SKY = arg('sky', '../imagenes/logo_sky.png'), OUT_APEX = arg('apex', '../imagenes/logo_apex.png');
const TH = 8;                                         // opacidad mínima para formar parte de una pieza

const png = PNG.sync.read(fs.readFileSync(IN)), { width: W, height: H, data: D } = png;
const lab = new Int32Array(W * H).fill(-1), comps = [];
const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
for (let i = 0; i < W * H; i++) {
  if (lab[i] >= 0 || D[i * 4 + 3] <= TH) continue;
  const id = comps.length, st = [i]; lab[i] = id; let n = 0, y0 = H;
  while (st.length) {
    const j = st.pop(), x = j % W, y = (j / W) | 0; n++; if (y < y0) y0 = y;
    for (const [dx, dy] of nb) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const k = yy * W + xx; if (lab[k] < 0 && D[k * 4 + 3] > TH) { lab[k] = id; st.push(k); }
    }
  }
  comps.push({ id, n, y0 });
}
const big = comps.filter(c => c.n > 5000).sort((a, b) => a.y0 - b.y0);
if (big.length !== 2) throw new Error('Esperaba dos piezas grandes y hay ' + big.length);
const [sky, apex] = big.map(c => c.id);
// reparto: cada píxel con algo de opacidad va a la pieza grande más cercana (crecimiento por anchura desde las dos)
const owner = new Int8Array(W * H).fill(-1), q = new Int32Array(W * H); let qh = 0, qt = 0;
for (let i = 0; i < W * H; i++) if (lab[i] === sky || lab[i] === apex) { owner[i] = lab[i] === sky ? 0 : 1; q[qt++] = i; }
while (qh < qt) {
  const j = q[qh++], x = j % W, y = (j / W) | 0;
  for (const [dx, dy] of nb) {
    const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const k = yy * W + xx; if (owner[k] < 0) { owner[k] = owner[j]; q[qt++] = k; }
  }
}
for (const [who, file] of [[0, OUT_SKY], [1, OUT_APEX]]) {
  const out = new PNG({ width: W, height: H });
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    if (owner[i] !== who || D[o + 3] === 0) { out.data[o + 3] = 0; continue; }
    out.data[o] = D[o]; out.data[o + 1] = D[o + 1]; out.data[o + 2] = D[o + 2];
    out.data[o + 3] = Math.min(255, Math.round(D[o + 3] * 255 / 253));    // el original llega a 253 de opacidad: lo dejamos opaco
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(out, { colorType: 6 }));
  console.log(`${file}: ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
console.log(`Piezas: SKY ${comps[sky].n} px, APEX ${comps[apex].n} px (de ${comps.length} manchas)`);
