/* Renames animation clips inside a GLB without touching anything else (only the names in the JSON chunk; the binary chunk is copied as is).
   Usage: node tools/rename_clips.mjs <file.glb> old=new [old=new …]
   v46 (restructure): the clips went from Spanish to English names (vuelo → fly, reposo → idle…). */
import fs from 'fs';

const [file, ...pairs] = process.argv.slice(2);
if (!file || !pairs.length) { console.error('Usage: node tools/rename_clips.mjs <file.glb> old=new [old=new …]'); process.exit(1); }
const map = Object.fromEntries(pairs.map(p => p.split('=')));
const b = fs.readFileSync(file);
if (b.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB: ' + file);
const jsonLen = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8')), rest = b.slice(20 + jsonLen);
const done = [];
for (const a of json.animations || []) if (map[a.name]) { done.push(a.name + ' → ' + map[a.name]); a.name = map[a.name]; }
let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(20); head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + js.length + rest.length, 8);
head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
fs.writeFileSync(file, Buffer.concat([head, js, rest]));
console.log(file + ': ' + (done.join(', ') || 'nothing to rename'));
