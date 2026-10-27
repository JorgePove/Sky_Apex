/* Construye Sky Apex a partir de sus módulos (v15).
   1. Junta fuentes/sky_apex/NN_*.html|css|js por orden de número → fuentes/sky_apex.src.html (generado: no editar; sirve para probar
      con el servidor local, porque carga los modelos sueltos de ../modelos/).
   2. Comprueba la sintaxis del JavaScript junto (node --check).
   3. Incrusta el dragón, los brazos, el caballero y el logo → sky_apex.html (el archivo para jugar).
   Uso (desde la raíz del proyecto o desde herramientas/):
     node herramientas/construir.mjs                 todo
     node herramientas/construir.mjs --solo-fuente   solo los pasos 1 y 2 (para probar en el navegador sin generar el HTML de 10 MB) */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERR = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(HERR, '..');
const MOD = path.join(RAIZ, 'fuentes', 'sky_apex'), SRC = path.join(RAIZ, 'fuentes', 'sky_apex.src.html');
const soloFuente = process.argv.includes('--solo-fuente');

// 1. Módulos en orden (00_…, 01_…); los demás archivos de la carpeta se ignoran
const files = fs.readdirSync(MOD).filter(f => /^\d\d[a-z]?_.+\.(html|css|js)$/.test(f)).sort();
const bufs = files.map(f => fs.readFileSync(path.join(MOD, f)));
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
  const args = ['incrustar_modelo.mjs', '--fuente', '../fuentes/sky_apex.src.html', '--modelo', '../modelos/tyrant_web.glb',
    '--extra', 'brazos-glb=../modelos/brazos_jinete.glb', '--extra', 'caballero-glb=../modelos/caballero.glb',
    '--extra', 'logo-sky-png=../imagenes/logo_sky.png', '--extra', 'logo-apex-png=../imagenes/logo_apex.png',
    '--extra', 'rojo-glb=../modelos/dragon_rojo.glb', '--extra', 'drogon-glb=../modelos/drogon_web.glb', '--extra', 'fulgor-glb=../modelos/syrax_web.glb', '--salida', '../sky_apex.html'];   // (v16: los otros dos dragones; v20: Fulgor)
  process.stdout.write(execFileSync(process.execPath, args, { cwd: HERR }));
}
