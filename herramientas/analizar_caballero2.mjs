/* Cortes del caballero por alturas: para cada lado (x>0) centro y extensión en x y z de piernas y torso. Solo informativo. */
import { loadFBX, THREE } from './fbx_node.mjs';
const root = loadFBX(process.argv[2]); root.updateMatrixWorld(true);
const SKIP = /Pm3d_cube3d1_44|Pm3d_cube3d1_51|Merged_cloth41_0[6789]|Merged_pm3d_cube3d1_4[01]|xcxczxcxvxcv|Merged_cloth50/;
const v = new THREE.Vector3(), pts = [];
root.traverse(o => { if (o.isMesh && !SKIP.test(o.name)) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pts.push(v.x, v.y, v.z); } } });
const q = (arr, f) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(f * (s.length - 1))]; };
for (let y = -225; y <= 300; y += 10) {
  const L = { x: [], z: [] }, C = { x: [], z: [] };
  for (let i = 0; i < pts.length; i += 3) if (Math.abs(pts[i + 1] - y) < 5) {
    const x = pts[i], z = pts[i + 2];
    if (y < -90 ? x > 6 : Math.abs(x) < 60) { const T = y < -90 ? L : C; T.x.push(x); T.z.push(z); }
  }
  const T = y < -90 ? L : C; if (!T.x.length) continue;
  console.log(String(y).padStart(5), y < -90 ? 'pierna izq' : 'torso     ', 'x', q(T.x, 0.03).toFixed(0).padStart(5), q(T.x, 0.5).toFixed(0).padStart(5), q(T.x, 0.97).toFixed(0).padStart(5), ' z', q(T.z, 0.03).toFixed(0).padStart(5), q(T.z, 0.5).toFixed(0).padStart(5), q(T.z, 0.97).toFixed(0).padStart(5), ' n', T.x.length);
}
