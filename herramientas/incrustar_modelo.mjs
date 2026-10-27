/* Genera el HTML jugable con el modelo dentro (base64), para abrirlo con doble clic o publicarlo como artifact.
   Uso: node incrustar_modelo.mjs --fuente ../fuentes/alas_de_brasa_humanoide.src.html --modelo ../modelos/dragon_01_web.glb --salida ../alas_de_brasa_humanoide.html
   Otros recursos: --extra id=ruta (repetible) rellena <script id="id" type="application/octet-stream"></script> con ese archivo.
   Sky Apex (rama Tyrant):
     node incrustar_modelo.mjs --fuente ../fuentes/sky_apex.src.html --modelo ../modelos/tyrant_web.glb
       --extra brazos-glb=../modelos/brazos_jinete.glb --extra logo-sky-png=../imagenes/logo_sky.png --extra logo-apex-png=../imagenes/logo_apex.png
       --salida ../sky_apex.html
   La música (musica/musica_menu.* y musica_game.*) no se incrusta: queda en su carpeta para poder cambiarla. */
import fs from 'fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const SRC = arg('fuente', '../fuentes/alas_de_brasa_humanoide.src.html');
const GLB = arg('modelo', '../modelos/dragon_01_web.glb');
const OUT = arg('salida', '../alas_de_brasa_humanoide.html');
const assets = [['modelo-glb', GLB]];
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
html = html.replace('<!-- RAMA EXPERIMENTAL:', '<!-- ARCHIVO GENERADO por herramientas/incrustar_modelo.mjs: no editar aquí, editar la fuente.\n     RAMA EXPERIMENTAL:');
fs.writeFileSync(OUT, html);
console.log(`Generado ${OUT}: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB (${sizes.join(', ')})`);
