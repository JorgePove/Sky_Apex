/* v49: copias ligeras de los recursos del HUD arcano de Jorge (PNG de 1024 × 1024 con transparencia, en source_assets/references/ui/) para
   assets/images/ (hud_*.png): los marcos de los blancos a 512 px y los escudos a 256 px, reducidos a la mitad las veces que haga falta con un
   filtro de caja sobre el color premultiplicado por el alfa (así no salen halos oscuros en los bordes). El juego los escala después (16b).
   Uso (desde la raíz): node tools/prepare_hud_assets.mjs  ·  después, node tools/build.mjs (rehace las copias de assets/packed/). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PNG } = createRequire(import.meta.url)('pngjs');
const SRC = path.join(ROOT, 'source_assets/references/ui'), OUT = path.join(ROOT, 'assets/images');
const FILES = { target_hex: 512, target_circle: 512, target_triangle: 512, shield_full: 256, shield_empty: 256 };

function halve({ width: W, height: H, data: D }) {
  const w = W >> 1, h = H >> 1, out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((y * 2 + dy) * W + x * 2 + dx) * 4, al = D[i + 3];
      r += D[i] * al; g += D[i + 1] * al; b += D[i + 2] * al; a += al;
    }
    const o = (y * w + x) * 4;
    out.data[o] = a ? Math.round(r / a) : 0; out.data[o + 1] = a ? Math.round(g / a) : 0; out.data[o + 2] = a ? Math.round(b / a) : 0; out.data[o + 3] = Math.round(a / 4);
  }
  return out;
}
for (const [name, size] of Object.entries(FILES)) {
  let img = PNG.sync.read(fs.readFileSync(path.join(SRC, name + '.png')));
  while (img.width > size) img = halve(img);
  const dst = path.join(OUT, 'hud_' + name + '.png');
  fs.writeFileSync(dst, PNG.sync.write(img, { colorType: 6, deflateLevel: 9 }));
  console.log(path.relative(ROOT, dst), img.width + ' px', (fs.statSync(dst).size / 1024).toFixed(0) + ' kB');
}
