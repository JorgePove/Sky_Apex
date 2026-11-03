/* Genera el HTML jugable con el modelo dentro (base64), para abrirlo con doble clic o publicarlo como artifact.
   Uso: node embed_assets.mjs --fuente ../legacy/src/alas_de_brasa_humanoid.src.html --modelo ../legacy/models/gargoyle_dragon.glb --salida ../legacy/alas_de_brasa_humanoid.html
   Otros recursos: --extra id=ruta (repetible) rellena <script id="id" type="application/octet-stream"></script> con ese archivo.
   v46: ya solo lo usa el juego antiguo (legacy/): hasta la v46 incrustaba también los recursos de Sky Apex en sky_apex.html; ahora el juego
   los carga de assets/ (o de sus copias en assets/packed/, que genera tools/build.mjs). */
import fs from 'fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const SRC = arg('fuente', '../legacy/src/alas_de_brasa_humanoid.src.html');
const GLB = arg('modelo', '../legacy/models/gargoyle_dragon.glb');
const OUT = arg('salida', '../legacy/alas_de_brasa_humanoid.html');
const assets = arg('modelo') || !argv.includes('--extra') ? [[arg('id-modelo', 'modelo-glb'), GLB]] : [];   // (v46: Sky Apex pasa todo con --extra; el juego antiguo usa --modelo)
argv.forEach((a, i) => { if (a === '--extra') { const [id, file] = argv[i + 1].split(/=(.+)/); assets.push([id, file]); } });

let html = fs.readFileSync(SRC, 'utf8');
const sizes = [];
for (const [id, file] of assets) {
  const tag = `<script id="${id}" type="application/octet-stream"></script>`;
  if (!html.includes(tag)) throw new Error(`No encuentro la etiqueta vacía «${id}» en la fuente`);
  const b64 = fs.readFileSync(file).toString('base64').replace(/.{1,120000}/g, '$&\n');   // líneas largas pero no infinitas
  html = html.replace(tag, () => `<script id="${id}" type="application/octet-stream">\n${b64}</script>`);
  sizes.push(`${id} ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
html = html.replace('<!-- RAMA EXPERIMENTAL:', '<!-- ARCHIVO GENERADO por tools/embed_assets.mjs: no editar aquí, editar la fuente.\n     RAMA EXPERIMENTAL:');
fs.writeFileSync(OUT, html);
console.log(`Generado ${OUT}: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB (${sizes.join(', ')})`);
