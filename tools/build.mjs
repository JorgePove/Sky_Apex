/* Construye Sky Apex a partir de sus módulos (v15).
   1. Junta src/NN_*.html|css|js por orden de número → dev.html (generado: no editar; sirve para probar
      con el servidor local, porque carga los recursos sueltos de assets/).
   2. Comprueba la sintaxis del JavaScript junto (node --check).
   3. Incrusta el dragón, los brazos, el caballero y el logo → sky_apex.html (el archivo para jugar).
   v24: en el paso 1 mete además una copia de las stats del Excel (data/sky_apex_stats.xlsx) en STATS_EMBED (19c_stats.js): es lo que
   usa el juego cuando no puede leer el Excel (sky_apex.html abierto con doble clic).
   Uso (desde la raíz del proyecto o desde tools/):
     node tools/build.mjs                 todo
     node tools/build.mjs --solo-fuente   solo los pasos 1 y 2 (para probar en el navegador sin generar el HTML de 10 MB) */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { cargarEsquema, inflar } from './stats_sheet.mjs';

const HERR = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(HERR, '..');
const MOD = path.join(RAIZ, 'src'), SRC = path.join(RAIZ, 'dev.html');
const soloFuente = process.argv.includes('--solo-fuente');

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
} else console.warn('AVISO: no está ' + S.STATS_FILE + ': el HTML usará los valores por defecto del código');
fs.writeFileSync(SRC, Buffer.concat(bufs));
console.log(`Fuente: ${path.relative(RAIZ, SRC)} (${files.length} módulos, ${(fs.statSync(SRC).size / 1e3).toFixed(0)} kB)`);

// 2. Sintaxis: el JavaScript de los módulos .js, junto y en orden
const js = files.map((f, i) => f.endsWith('.js') ? bufs[i].toString('utf8') : '').join('');
const tmp = path.join(os.tmpdir(), 'sky_apex_check.js');
fs.writeFileSync(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); console.log('Sintaxis: bien'); }
catch (err) { console.error('ERROR DE SINTAXIS\n' + String(err.stderr || err.message)); process.exit(1); }

// 3. Archivo para jugar, con los recursos incrustados
if (!soloFuente) {
  const args = ['embed_assets.mjs', '--fuente', '../dev.html', '--extra', 'dragon-tyrant-glb=../assets/models/dragon_tyrant.glb',
    '--extra', 'rider-arms-glb=../assets/models/rider_arms.glb', '--extra', 'knight-glb=../assets/models/knight.glb',
    '--extra', 'logo-sky-png=../assets/images/logo_sky.png', '--extra', 'logo-apex-png=../assets/images/logo_apex.png',
    '--extra', 'dragon-red-glb=../assets/models/dragon_red.glb', '--extra', 'dragon-drogon-glb=../assets/models/dragon_drogon.glb', '--extra', 'dragon-syrax-glb=../assets/models/dragon_syrax.glb',
    '--extra', 'airship-glb=../assets/models/airship.glb',
    '--extra', 'artillery-ballista-glb=../assets/models/artillery_ballista.glb', '--extra', 'artillery-catapult-glb=../assets/models/artillery_catapult.glb',
    '--extra', 'artillery-cannon-glb=../assets/models/artillery_cannon.glb', '--extra', 'naval-ship-glb=../assets/models/naval_ship.glb',
    '--extra', 'super-airship-glb=../assets/models/super_airship.glb', '--extra', 'serpent-glb=../assets/models/serpent.glb', '--extra', 'soldier-glb=../assets/models/soldier.glb',
    '--extra', 'sfx-wings-flap=../assets/audio/sfx/dragon_wings_flap.mp3', '--extra', 'sfx-roar=../assets/audio/sfx/dragon_roar.mp3',
    '--extra', 'sfx-fire-breath=../assets/audio/sfx/dragon_fire_breath.mp3', '--extra', 'sfx-growl=../assets/audio/sfx/dragon_growl.mp3',
    '--extra', 'voice-seraphin-01=../assets/audio/voice/seraphin_01.mp3', '--extra', 'voice-volger-01=../assets/audio/voice/volger_01.wav',
    '--salida', '../sky_apex.html'];   // (v16: los otros dos dragones; v20: Fulgor; v21: el dirigible; v29: las unidades nuevas; v32: los sonidos de audio/; v34: las voces del Capítulo 1)
  process.stdout.write(execFileSync(process.execPath, args, { cwd: HERR }));
}
