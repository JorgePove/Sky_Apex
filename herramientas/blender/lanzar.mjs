/* Lanza Blender sin ventana y ejecuta un script de Python (v19+).
   Uso (desde la raíz del proyecto):
     node herramientas/blender/lanzar.mjs herramientas/blender/comprobar.py            ejecuta el script
     node herramientas/blender/lanzar.mjs script.py -- arg1 arg2                       los argumentos tras «--» llegan al script (sys.argv tras «--»)
     node herramientas/blender/lanzar.mjs --ventana [archivo.blend]                    abre Blender con ventana (para mirar o retocar a mano)
     node herramientas/blender/lanzar.mjs --ruta                                       solo escribe dónde ha encontrado Blender
   Dónde busca blender.exe, por orden:
     1. la variable de entorno BLENDER_EXE
     2. herramientas/blender/ruta_local.txt  (una línea «blender=RUTA\blender.exe»; propio de cada equipo, no se sube a GitHub)
     3. D:\Herramientas\Blender\*\blender.exe y C:\Program Files\Blender Foundation\Blender *\blender.exe (la versión más alta)
     4. «blender» en el PATH
   El script de Python recibe en el entorno: SKY_PROYECTO (raíz del proyecto), SKY_SALIDA (herramientas/blender/salida) y, si está en
   ruta_local.txt («proyectos=RUTA»), BLENDER_PROYECTOS (donde se guardan los .blend de trabajo, fuera del proyecto).
   Por defecto arranca con --factory-startup: sin preferencias ni complementos del usuario, para que el resultado sea el mismo en cualquier equipo. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const AQUI = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(AQUI, '..', '..');
const SALIDA = path.join(AQUI, 'salida');

function leerLocal() {
  const out = {}, f = path.join(AQUI, 'ruta_local.txt');
  if (!fs.existsSync(f)) return out;
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([a-z_]+)\s*=\s*(.+?)\s*$/i.exec(l);
    if (m && !l.trim().startsWith('#')) out[m[1].toLowerCase()] = m[2].replace(/^"|"$/g, '');
  }
  return out;
}
/* Versiones dentro de una carpeta que contiene carpetas «blender-X.Y.Z-…» o «Blender X.Y»: la más alta con blender.exe */
function masAlta(dir) {
  if (!fs.existsSync(dir)) return null;
  const num = n => (n.match(/\d+/g) || []).map(Number);
  const cmp = (a, b) => { for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) - (a[i] || 0); return 0; };
  const c = fs.readdirSync(dir).filter(n => fs.existsSync(path.join(dir, n, 'blender.exe'))).sort((a, b) => cmp(num(a), num(b)));
  return c.length ? path.join(dir, c[0], 'blender.exe') : null;
}
function buscar(local) {
  if (process.env.BLENDER_EXE && fs.existsSync(process.env.BLENDER_EXE)) return process.env.BLENDER_EXE;
  if (local.blender && fs.existsSync(local.blender)) return local.blender;
  for (const d of ['D:\\Herramientas\\Blender', 'C:\\Program Files\\Blender Foundation']) { const e = masAlta(d); if (e) return e; }
  return 'blender';                                          // que lo resuelva el PATH
}

const local = leerLocal(), exe = buscar(local);
const args = process.argv.slice(2);
if (args[0] === '--ruta') { console.log(exe); process.exit(0); }
fs.mkdirSync(SALIDA, { recursive: true });
const env = Object.assign({}, process.env, { SKY_PROYECTO: RAIZ, SKY_SALIDA: SALIDA });
if (local.proyectos) env.BLENDER_PROYECTOS = local.proyectos;

let blenderArgs;
if (args[0] === '--ventana') blenderArgs = args.slice(1);                      // abrir con ventana (y, si se pasa, un .blend)
else {
  const i = args.indexOf('--'), pre = i < 0 ? args : args.slice(0, i), post = i < 0 ? [] : args.slice(i);
  if (!pre.length) { console.error('Falta el script de Python. Uso: node herramientas/blender/lanzar.mjs script.py [-- argumentos]'); process.exit(2); }
  blenderArgs = ['-b', '--factory-startup', '--python-exit-code', '1', '--python', path.resolve(pre[0]), ...post];
}
const r = spawnSync(exe, blenderArgs, { stdio: 'inherit', env, windowsHide: true });
if (r.error) { console.error('No se pudo lanzar Blender (' + exe + '): ' + r.error.message); process.exit(1); }
process.exit(r.status == null ? 1 : r.status);
