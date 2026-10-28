/* Servidor local para jugar a Sky Apex leyendo el Excel de stats al momento (v24). Lo lanza Jugar.bat.
   Sirve la carpeta del proyecto en http://localhost:PUERTO/ y abre el juego en el navegador. Abierto así (y no con doble clic en el
   HTML), el juego puede leer datos/sky_apex_stats.xlsx y lo vigila: al guardar el Excel, los cambios se aplican en un par de segundos.
   Nada se guarda en caché (el Excel siempre llega recién leído) y admite rangos (para los vídeos del tutorial).
   Si el puerto ya está en uso (el servidor ya estaba abierto), solo abre el navegador.
   Uso: node herramientas/servidor_juego.mjs [puerto] [--sin-navegador] */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = +process.argv.find(a => /^\d+$/.test(a)) || 8770, NAVEGADOR = !process.argv.includes('--sin-navegador');
const URL_JUEGO = `http://localhost:${PUERTO}/sky_apex.html`;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac',
  '.flac': 'audio/flac', '.opus': 'audio/ogg', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.ico': 'image/x-icon' };

const abrir = () => { if (NAVEGADOR) exec(process.platform === 'win32' ? `start "" "${URL_JUEGO}"` : `xdg-open "${URL_JUEGO}"`); };

const srv = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel === '/') rel = '/sky_apex.html';
  const file = path.join(RAIZ, path.normalize(rel));
  if (!file.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end(); }   // nada fuera de la carpeta del proyecto
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado: ' + rel); }
    const head = { 'Content-Type': TIPOS[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'Last-Modified': st.mtime.toUTCString() };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let a = m[1] ? +m[1] : st.size - +m[2], b = m[1] && m[2] ? +m[2] : st.size - 1;
      if (a >= st.size || a > b) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      b = Math.min(b, st.size - 1);
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
});
srv.on('error', err => {
  if (err.code === 'EADDRINUSE') { console.log(`El puerto ${PUERTO} ya está en uso (¿el servidor ya estaba abierto?): abro el juego.`); abrir(); setTimeout(() => process.exit(0), 1500); }
  else { console.error(err); process.exit(1); }
});
srv.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Sky Apex en ${URL_JUEGO}`);
  console.log('El juego lee datos/sky_apex_stats.xlsx: al guardar el Excel, los cambios se aplican solos.');
  console.log('Cierra esta ventana para parar el servidor.');
  abrir();
});
