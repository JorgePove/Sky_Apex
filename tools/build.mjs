/* Construye Sky Apex a partir de sus módulos (v15; v46: HTML maestro + recursos aparte).
   1. Junta src/NN_*.html|css|js por orden de número → index.html (el juego entero, en la raíz: el «HTML maestro»; generado, no editar).
      Mete además una copia de las stats del Excel (data/sky_apex_stats.xlsx) en STATS_EMBED (19c_stats.js): es lo que usa el juego cuando
      no puede leer el Excel (abierto con doble clic).
   2. Comprueba la sintaxis del JavaScript junto (node --check).
   3. Copias empaquetadas de los recursos que el juego lee como bytes (modelos, sonidos, voces y el logo) → assets/packed/<ruta>.js: el
      base64 del archivo en window.SKY_ASSETS['<ruta sin assets/>']. Son las que usa el juego abierto con doble clic (con servidor pide los
      archivos tal cual). Cada copia guarda la huella (sha1) de su archivo y solo se rehace si el archivo cambia; las que ya no tienen
      archivo se borran. La música y los vídeos del tutorial no hacen falta (se reproducen con <audio> y <video>), ni los mapas (ya son .js).
   Uso (desde la raíz del proyecto o desde tools/):
     node tools/build.mjs              todo
     node tools/build.mjs --no-pack    solo los pasos 1 y 2 (para probar con el servidor sin rehacer las copias); también --solo-fuente */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { cargarEsquema, inflar } from './stats_sheet.mjs';

const HERR = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(HERR, '..');
const MOD = path.join(RAIZ, 'src'), OUT = path.join(RAIZ, 'index.html');
const ASSETS = path.join(RAIZ, 'assets'), PACKED = path.join(ASSETS, 'packed');
const PACK_DIRS = ['models', 'audio/sfx', 'audio/voice', 'images'];   // lo que el juego lee como bytes (loadBytes, 09) o como data: (el logo)
const noPack = process.argv.includes('--no-pack') || process.argv.includes('--solo-fuente');

// 1. Módulos en orden (00_…, 01_…); los demás archivos de la carpeta se ignoran
const files = fs.readdirSync(MOD).filter(f => /^\d\d[a-z]?_.+\.(html|css|js)$/.test(f)).sort();
const bufs = files.map(f => fs.readFileSync(path.join(MOD, f)));
// (v24) copia de las stats del Excel, leída con el mismo lector que el juego
const EMBED = '/*STATS_EMBED*/null/*FIN*/', iStats = files.indexOf('19c_stats.js');
if (iStats < 0 || !bufs[iStats].includes(EMBED)) { console.error('ERROR: falta ' + EMBED + ' en 19c_stats.js'); process.exit(1); }
const S = cargarEsquema(), XLSX = path.join(RAIZ, S.STATS_FILE);
if (fs.existsSync(XLSX)) {
  const vals = S.statsFromSheets(await S.xlsxSheets(fs.readFileSync(XLSX), inflar)), { miss } = S.statsResolve(vals);
  bufs[iStats] = Buffer.from(bufs[iStats].toString('utf8').replace(EMBED, '/*STATS_EMBED*/' + JSON.stringify(vals) + '/*FIN*/'));
  console.log(`Stats: ${S.STATS_FILE} (${Object.keys(vals).length} pestañas de unidades)` + (miss.length ? ` · AVISO, faltan: ${miss.join(', ')}` : ''));
} else console.warn('AVISO: no está ' + S.STATS_FILE + ': el juego usará los valores por defecto del código');
fs.writeFileSync(OUT, Buffer.concat(bufs));
console.log(`Juego: ${path.relative(RAIZ, OUT)} (${files.length} módulos, ${(fs.statSync(OUT).size / 1e3).toFixed(0)} kB)`);

// 2. Sintaxis: el JavaScript de los módulos .js, junto y en orden
const js = files.map((f, i) => f.endsWith('.js') ? bufs[i].toString('utf8') : '').join('');
const tmp = path.join(os.tmpdir(), 'sky_apex_check.js');
fs.writeFileSync(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); console.log('Sintaxis: bien'); }
catch (err) { console.error('ERROR DE SINTAXIS\n' + String(err.stderr || err.message)); process.exit(1); }

// 3. Copias empaquetadas de los recursos (assets/packed/<ruta>.js)
if (!noPack) {
  const want = new Set(); let made = 0, kept = 0, bytes = 0;
  for (const dir of PACK_DIRS) {
    const abs = path.join(ASSETS, dir); if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      const src = path.join(abs, name); if (!fs.statSync(src).isFile()) continue;
      const key = dir + '/' + name, dst = path.join(PACKED, key + '.js'); want.add(path.normalize(dst));
      const data = fs.readFileSync(src), sha = crypto.createHash('sha1').update(data).digest('hex');
      if (fs.existsSync(dst)) {
        const head = Buffer.alloc(300); const fd = fs.openSync(dst, 'r'); fs.readSync(fd, head, 0, 300, 0); fs.closeSync(fd);
        if (head.toString('utf8').includes('sha1 ' + sha)) { kept++; continue; }
      }
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, `/* Sky Apex · copia empaquetada de assets/${key} (sha1 ${sha}). ARCHIVO GENERADO por tools/build.mjs: no editar. */\n` +
        `(window.SKY_ASSETS = window.SKY_ASSETS || {})[${JSON.stringify(key)}] = '${data.toString('base64')}';\n`);
      made++; bytes += fs.statSync(dst).size;
    }
  }
  const stale = [];                                        // copias sin archivo (renombrado o borrado): fuera
  const walk = d => { if (!fs.existsSync(d)) return; for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (!want.has(path.normalize(p))) { fs.unlinkSync(p); stale.push(path.relative(RAIZ, p)); } } };
  walk(PACKED);
  console.log(`Recursos empaquetados (assets/packed): ${made} rehechos (${(bytes / 1e6).toFixed(1)} MB), ${kept} sin cambios` + (stale.length ? `, fuera: ${stale.join(', ')}` : ''));
}
