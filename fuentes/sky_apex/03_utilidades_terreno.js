'use strict';
/* ============================================================
   1. UTILIDADES, RUIDO Y FUNCIÓN DE TERRENO (datos puros, sin THREE)
   Convención de ejes del mundo: +Y arriba, norte = -Z, este = +X.
   ============================================================ */
const WL = 0;                         // nivel del agua (ríos y lagos)
const SEED_URL = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('semilla') : null;   // ?semilla=N fija el mundo (vídeos del tutorial, pruebas)
/* v19: la semilla cambia con la misión (setSeed, desde el módulo M3). SEED_BOOT = la del arranque (?semilla=N, window.__SEED o al azar),
   que es la del combate libre; SEED = la del mundo generado ahora. */
const SEED_BOOT = (typeof window !== 'undefined' && window.__SEED != null) ? (window.__SEED | 0) : SEED_URL ? (parseInt(SEED_URL, 10) | 0) : ((Math.random() * 1e9) | 0);
let SEED = SEED_BOOT;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function makeNoise(seed) {
  const perm = new Uint8Array(256), p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const gx = [1, -1, 1, -1, 1, -1, 0, 0], gy = [1, 1, -1, -1, 0, 0, 1, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function noise(xin, yin) {
    const sk = (xin + yin) * F2;
    const i = Math.floor(xin + sk), j = Math.floor(yin + sk);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, tt = 0.5 - x0 * x0 - y0 * y0, g;
    if (tt > 0) { tt *= tt; g = p[ii + p[jj]] & 7; n += tt * tt * (gx[g] * x0 + gy[g] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1;
    if (tt > 0) { tt *= tt; g = p[ii + i1 + p[jj + j1]] & 7; n += tt * tt * (gx[g] * x1 + gy[g] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2;
    if (tt > 0) { tt *= tt; g = p[ii + 1 + p[jj + 1]] & 7; n += tt * tt * (gx[g] * x2 + gy[g] * y2); }
    return clamp(n * 70, -1, 1);
  };
}
let N1, N2, N3;
/* Cambia la semilla del mundo: rehace los ruidos. Lo ya generado con la anterior (terreno, islas, torres) lo borra clearWorld (M3). */
function setSeed(s) {
  SEED = s | 0;
  N1 = makeNoise(SEED ^ 0x9e3779b1); N2 = makeNoise(SEED ^ 0x85ebca6b); N3 = makeNoise(SEED ^ 0xc2b2ae35);
}
setSeed(SEED_BOOT);

// hash determinista (celda entera -> 0..1), con la semilla del mundo
function hash2(ix, iz, salt) { return hashSeed(ix, iz, (salt | 0) + SEED); }
// el mismo hash sin semilla (lo que no debe cambiar con el mundo: la textura de detalle)
function hashSeed(ix, iz, salt) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(salt, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/* Generador al azar con semilla (mulberry32): repartos que deben salir siempre iguales con el mismo mundo (torres de una misión). */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* Rellena out.h (altura), out.forest (densidad de bosque 0..1) y out.wet (cercanía a ríos/lagos 0..1).
   full=false calcula solo la altura (colisiones, puntería). */
const _o = { h: 0, forest: 0, wet: 0 };
/* v29: mundo llano (bioma «pruebas», el campo de pruebas): suelo a FLAT.h m y lagos rectangulares (FLAT.lakes: { x0, z0, x1, z1 }, con
   orillas de FLAT_SHORE m) de FLAT_DEPTH m de hondo, para los barcos. Lo fija setBiome (M3); null = el terreno de siempre. */
let FLAT = null;
const FLAT_SHORE = 60, FLAT_DEPTH = 12;
function flatTerrain(x, z, out, full) {
  let h = FLAT.h;
  for (const L of FLAT.lakes) {
    const dx = Math.max(L.x0 - x, x - L.x1, 0), dz = Math.max(L.z0 - z, z - L.z1, 0), d = Math.hypot(dx, dz);   // 0 dentro
    if (d < FLAT_SHORE) h = Math.min(h, lerp(-FLAT_DEPTH, FLAT.h, smooth(0, FLAT_SHORE, d)));
  }
  out.h = h;
  if (full) { out.forest = 0; out.wet = 0; }
  return h;
}
/* v34: relieve por misión (world.relief en la receta; lo fija setBiome, M3): círculos { x, z, r, edge, m } que fuerzan la máscara de
   cordilleras (m = 1: montañas; m = 0: tierras bajas con ríos, lagos y bosques) dentro de r m, con un borde suave de edge m. Los últimos
   mandan. NO_ISL: mundo sin islas flotantes (world.islands: false). */
let RELIEF = [], NO_ISL = false;
function reliefMask(x, z, m) {
  for (const R of RELIEF) m = lerp(m, R.m, 1 - smooth(R.r - R.edge, R.r, Math.hypot(x - R.x, z - R.z)));
  return m;
}
/* v38: mapa hecho a mano (Vuelo Libre: herramientas/blender/paisaje → mapas/vuelo_libre.js). Lo fija setBiome (M3) con el mapa ya cargado
   (loadMap, M3): n×n alturas de borde a borde de un cuadrado de size m centrado en el origen, y sus materiales (mat: roca, nieve, agua
   pintada, verdor; 0..255). Fuera del cuadrado, el mismo mapa en espejo: el horizonte nunca se corta. Entre los puntos (12 m), interpolación
   cúbica y, encima, un relieve fino con ruido (más en la roca; nada en el agua pintada ni en la orilla). null = el terreno procedural. */
let MAP = null;
const mirrorIdx = (u, m) => { const p = 2 * m; u = ((u % p) + p) % p; return u > m ? p - u : u; };
const _cr = new Float32Array(4);
function crW(t, w) { const t2 = t * t, t3 = t2 * t; w[0] = (-t3 + 2 * t2 - t) * 0.5; w[1] = (3 * t3 - 5 * t2 + 2) * 0.5; w[2] = (-3 * t3 + 4 * t2 + t) * 0.5; w[3] = (t3 - t2) * 0.5; }
function mapTerrain(x, z, out, full) {
  const M = MAP, n = M.n, m = n - 1, k = m / M.size, H = M.h, A = M.mat;
  const u = mirrorIdx((x + M.half) * k, m), v = mirrorIdx((z + M.half) * k, m);
  const i = Math.min(m - 1, Math.floor(u)), j = Math.min(m - 1, Math.floor(v)), fx = u - i, fz = v - j;
  let h = 0;
  crW(fz, _cr); const wz0 = _cr[0], wz1 = _cr[1], wz2 = _cr[2], wz3 = _cr[3];
  crW(fx, _cr);
  for (let b = 0; b < 4; b++) {
    const jj = Math.max(0, Math.min(m, j - 1 + b)) * n, wz = b === 0 ? wz0 : b === 1 ? wz1 : b === 2 ? wz2 : wz3;
    const i0 = Math.max(0, i - 1), i3 = Math.min(m, i + 2);
    h += wz * (_cr[0] * H[jj + i0] + _cr[1] * H[jj + i] + _cr[2] * H[jj + i + 1] + _cr[3] * H[jj + i3]);
  }
  // materiales (bilineal): roca, agua pintada y verdor
  const a = (j * n + i) * 4, b2 = a + 4, c = a + n * 4, d = c + 4, e0 = (1 - fx) * (1 - fz), e1 = fx * (1 - fz), e2 = (1 - fx) * fz, e3 = fx * fz;
  const rock = (A[a] * e0 + A[b2] * e1 + A[c] * e2 + A[d] * e3) / 255, wet = (A[a + 2] * e0 + A[b2 + 2] * e1 + A[c + 2] * e2 + A[d + 2] * e3) / 255;
  const amp = (1.2 + 6.5 * rock) * (1 - smooth(0.2, 0.6, wet)) * smooth(2, 10, h);
  if (amp > 0.01) h += (N1(x * 0.021, z * 0.021) * 0.55 + N2(x * 0.058, z * 0.058) * 0.3 + N3(x * 0.15, z * 0.15) * 0.15) * amp;
  out.h = h;
  if (full) {
    const green = (A[a + 3] * e0 + A[b2 + 3] * e1 + A[c + 3] * e2 + A[d + 3] * e3) / 255, snow = (A[a + 1] * e0 + A[b2 + 1] * e1 + A[c + 1] * e2 + A[d + 1] * e3) / 255;
    // arboledas sueltas en lo verde y bajo, como en la referencia (casi sin árboles)
    out.forest = smooth(0.62, 0.85, green) * (1 - rock) * (1 - snow) * (1 - wet) * smooth(4, 14, h) * (1 - smooth(320, 620, h))
      * smooth(0.2, 0.55, N2(x * 0.0011 + 50, z * 0.0011 - 20) * 0.5 + 0.5);
    out.wet = wet;
  }
  return h;
}
function terrain(x, z, out, full) {
  if (MAP) return mapTerrain(x, z, out, full);
  if (FLAT) return flatTerrain(x, z, out, full);
  const wx = N1(x * 0.0007, z * 0.0007) * 240, wz = N1(x * 0.0007 + 31.4, z * 0.0007 + 17.9) * 240;
  const px = x + wx, pz = z + wz;
  // máscara de cordilleras
  let m = smooth(0.38, 0.62, N2(px * 0.00017 + 7.7, pz * 0.00017 - 3.1) * 0.5 + 0.5);
  if (RELIEF.length) m = reliefMask(x, z, m);
  // tierras bajas ondulantes
  let low = 34 + N3(px * 0.0004, pz * 0.0004) * 20
    + N1(px * 0.0016, pz * 0.0016) * 10 + N2(px * 0.0044, pz * 0.0044) * 4
    + (full ? 0 : 0) + N3(px * 0.011, pz * 0.011) * 2.2;
  let h = low;
  if (m > 0.001) {
    let r = 0, a = 1, f = 0.00062, sum = 0, ox = 0;
    for (let i = 0; i < 6; i++) {
      const nn = N1(px * f + ox, pz * f - ox); let v = 1 - Math.sqrt(nn * nn + 0.014);
      v *= v; r += v * a; sum += a; a *= 0.46; f *= 2.05; ox += 17.3;
    }
    r /= sum;
    const mountain = Math.pow(r, 1.8) * 1150 + N3(px * 0.003, pz * 0.003) * 18 * r;
    h = lerp(low, low * 0.35 + mountain, m);
  }
  // ríos (solo en tierras bajas) y lagos
  let wet = 0;
  const lowMask = 1 - smooth(0.12, 0.5, m);
  if (lowMask > 0.001) {
    const rn = Math.abs(N1(px * 0.00052 + 100.0, pz * 0.00052 - 40.0));
    const flood = (1 - smooth(0.035, 0.34, rn)) * lowMask;       // llanura aluvial
    h = lerp(h, Math.min(h, 7 + N2(px * 0.01, pz * 0.01) * 1.5), flood);
    const ch = (1 - smooth(0.02, 0.1, rn)) * lowMask;         // cauce
    h = lerp(h, WL - 3.5, ch);
    const lk = smooth(0.66, 0.84, N2(px * 0.00031 - 55.0, pz * 0.00031 + 20.0) * 0.5 + 0.5) * lowMask;
    h = lerp(h, -9 - lk * 14, lk);
    wet = Math.max(flood * 0.8, lk);
  }
  out.h = h;
  if (full) {
    const fn = N1(px * 0.0011 + 300, pz * 0.0011 + 300) * 0.5 + 0.5;
    let fo = smooth(0.34, 0.58, fn + N2(px * 0.006, pz * 0.006) * 0.12);
    fo *= 1 - smooth(260, 430, h);             // línea de árboles
    fo *= smooth(3, 9, h);                     // sin árboles en la orilla
    out.forest = fo; out.wet = wet;
  }
  return h;
}
function heightAt(x, z) { return terrain(x, z, _o, false); }
function slopeAt(x, z) {
  const e = 4, h = heightAt(x, z);
  const dx = (heightAt(x + e, z) - h) / e, dz = (heightAt(x, z + e) - h) / e;
  return Math.sqrt(dx * dx + dz * dz);
}

