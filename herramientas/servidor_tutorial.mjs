/* Servidor local para grabar los vídeos del tutorial (puerto 8766).
   Sirve la carpeta del proyecto como el de python (para abrir fuentes/sky_apex.src.html) y además acepta
   PUT /tutorial/<nombre>.webm, que guarda el vídeo en la carpeta tutorial/ del proyecto. Solo escucha en 127.0.0.1.
   Uso: node herramientas/servidor_tutorial.mjs  (o preview_start «grabador-tutorial» de .claude/launch.json)
   Después, en la página: herramientas/grabar_tutorial.js (ver su cabecera). */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tutorial');
const PORT = 8766;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webm': 'video/webm', '.mp4': 'video/mp4', '.css': 'text/css' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'PUT') {
    const m = /^\/tutorial\/([a-z0-9_-]+\.webm)$/.exec(url);
    if (!m) { res.writeHead(400); res.end('solo /tutorial/<nombre>.webm'); return; }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.mkdirSync(OUT, { recursive: true });
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(path.join(OUT, m[1]), buf);
      console.log(`guardado tutorial/${m[1]} (${(buf.length / 1e6).toFixed(2)} MB)`);
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  const file = path.join(ROOT, path.normalize(url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('no existe'); return; }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {                                           // el <video> pide trozos
      const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    }
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Servidor del tutorial en http://localhost:${PORT}/ (raíz ${ROOT})`));
