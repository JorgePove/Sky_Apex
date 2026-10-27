/* Carga FBX en Node con el FBXLoader de three.js (sin navegador). Las texturas se ignoran (se tratan aparte). */
import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Lo mínimo del DOM que pide el cargador de imágenes: las imágenes nunca se cargan
if (!globalThis.document) {
  const fake = () => ({ addEventListener() {}, removeEventListener() {}, setAttribute() {}, style: {}, getContext: () => null });
  globalThis.document = { createElementNS: fake, createElement: fake };
}
globalThis.self = globalThis.self || globalThis;
globalThis.window = globalThis.window || { innerWidth: 1280, innerHeight: 720 };   // el FBXLoader crea las cámaras del archivo con el tamaño de la ventana
const _warn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('FBXLoader')) _warn(...a); };

export function loadFBX(path) {
  const buf = fs.readFileSync(path);
  return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
}
export { THREE };
