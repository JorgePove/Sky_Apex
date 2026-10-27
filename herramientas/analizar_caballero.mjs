/* Análisis del caballero «Knighty» para preparar_caballero.mjs: caja, perfil de anchura por alturas y mallas. Solo informativo. */
import { loadFBX, THREE } from './fbx_node.mjs';
const root = loadFBX(process.argv[2]); root.updateMatrixWorld(true);
const box = new THREE.Box3(), v = new THREE.Vector3(), meshes = [];
root.traverse(o => { if (o.isMesh) meshes.push(o); });
const SKIP = /Pm3d_cube3d1_44|Pm3d_cube3d1_51|Merged_cloth41_0[6789]|Merged_pm3d_cube3d1_4[01]/;
const pts = [];
for (const m of meshes) {
  const pos = m.geometry.attributes.position;
  const mb = new THREE.Box3();
  for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); mb.expandByPoint(v); if (!SKIP.test(m.name)) { box.expandByPoint(v); pts.push(v.x, v.y, v.z); } }
  if (pos.count > 20000 || SKIP.test(m.name)) console.log(m.name.padEnd(28), String(pos.count / 3).padStart(7), 'tris', mb.min.toArray().map(x => x.toFixed(0)).join(','), '→', mb.max.toArray().map(x => x.toFixed(0)).join(','), SKIP.test(m.name) ? '(fuera)' : '');
}
console.log('Caja', box.min.toArray().map(x => x.toFixed(1)), box.max.toArray().map(x => x.toFixed(1)));
// perfil por alturas: anchura en x de los puntos con |x|<120 (piernas/torso), huecos entre piernas, profundidad z
const H0 = box.min.y, H1 = box.max.y, S = 56;
for (let s = S - 1; s >= 0; s--) {
  const y0 = H0 + (H1 - H0) * s / S, y1 = H0 + (H1 - H0) * (s + 1) / S;
  const xs = []; let zmin = 1e9, zmax = -1e9;
  for (let i = 0; i < pts.length; i += 3) if (pts[i + 1] >= y0 && pts[i + 1] < y1) { xs.push(pts[i]); zmin = Math.min(zmin, pts[i + 2]); zmax = Math.max(zmax, pts[i + 2]); }
  if (!xs.length) continue;
  // ocupación en x (bins de 4 unidades entre -200 y 200)
  const bins = new Array(100).fill(0); for (const x of xs) { const b = Math.floor((x + 200) / 4); if (b >= 0 && b < 100) bins[b]++; }
  const row = bins.map(c => c === 0 ? ' ' : c < 20 ? '.' : c < 200 ? ':' : '#').join('');
  console.log(((y0 + y1) / 2).toFixed(0).padStart(5), '|' + row + '|', 'z', zmin.toFixed(0), zmax.toFixed(0));
}
