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
function terrain(x, z, out, full) {
  if (FLAT) return flatTerrain(x, z, out, full);
  const wx = N1(x * 0.0007, z * 0.0007) * 240, wz = N1(x * 0.0007 + 31.4, z * 0.0007 + 17.9) * 240;
  const px = x + wx, pz = z + wz;
  // máscara de cordilleras
  let m = smooth(0.38, 0.62, N2(px * 0.00017 + 7.7, pz * 0.00017 - 3.1) * 0.5 + 0.5);
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

