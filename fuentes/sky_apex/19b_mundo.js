/* ============================================================
   M3. MUNDO POR MISIÓN (v19)
   Cada receta trae su mundo (world: semilla y bioma) y su punto de partida (start). Al empezar una misión cuyo mundo no es el que hay
   generado, se borra todo lo que depende de la semilla (terreno, árboles, islas, torres) y se genera el nuevo detrás de una pantalla de
   carga (estado 'worldgen'); al acabar, la partida empieza sola. Con el mismo mundo (reintentar, repetir, volver al menú) no se regenera.
   · missionWorld(receta): la semilla, el bioma y el inicio de la receta, con los valores por defecto → RUN.world (missionSetup).
   · worldNeedsGen() / beginWorldGen() / updateWorldGen(): desde startGame y el bucle.
   · placeStart(inicio): coloca al dragón en el punto de partida y lo guarda en START.
   · Modo diseño (tecla º): coordenadas, altitud, rumbo, semilla y marcas de puntos (Intro), para diseñar misiones.
   ============================================================ */
const BIOMES = {                                          // hueco para la Fase 3 (paleta, relieve, niebla y cielo por bioma)
  valle: { name: 'Valle templado' },
  pruebas: { name: 'Campo de pruebas (llano)', flat: 1.5 },  // v29: suelo llano de blockout a 1,5 m sobre el agua, sin islas ni árboles (lagos: world.lakes)
  /* v38: Vuelo Libre. Paisaje de 24 × 24 km hecho en Blender (map: mapas/<map>.js, que se carga al entrar), con el ambiente soleado del vídeo
     de referencia de Jorge (atmos: setAtmosphere, en 2) y cúmulos que se atraviesan (clouds: 7b). */
  fiordos: {
    name: 'Valle de los Fiordos', map: 'vuelo_libre',
    atmos: { sun: sunFrom(235, 42), skyZen: [0.09, 0.26, 0.66], skyMid: [0.38, 0.56, 0.84], skyHor: [0.72, 0.81, 0.92], glowA: [1.0, 0.92, 0.8], glowB: [1.0, 0.95, 0.85],
      cloudShade: [0.6, 0.66, 0.78], cloudLitA: [1.0, 1.0, 1.0], cloudLitB: [1.0, 0.97, 0.9], cloudCov: [0.54, 0.74, 0.9],
      sunC: [1.45, 1.38, 1.24], ambLo: [0.36, 0.4, 0.5], ambHi: [0.44, 0.54, 0.72], waterA: [0.03, 0.13, 0.19], waterB: [0.06, 0.25, 0.3], sunSpec: [1.0, 0.97, 0.9],
      fog: 0.000105, fogColor: [0.72, 0.81, 0.92], sunLight: [0xfff2e0, 1.75], hemi: [0x9fb8e8, 0x5a5040, 0.85] },
    clouds: { n: 75, low: 20, base: [1300, 2300], r: 15500 }
  }
};
/* v38: mapas hechos a mano. Cada uno va en su propio archivo junto al juego (mapas/<id>.js, generado por herramientas/blender/paisaje), no
   dentro de sky_apex.html: se carga con una etiqueta <script> (funciona también al abrir el HTML con doble clic) la primera vez que hace
   falta, y sus dos PNG (alturas y materiales) se descodifican aquí. */
const MAPS = {};
function loadMap(id) {
  if (MAPS[id]) return Promise.resolve(MAPS[id]);
  const raw = () => window.SKY_MAPAS && window.SKY_MAPAS[id];
  const script = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { s.remove(); ko(); }; document.head.appendChild(s); });
  const dirs = /\/fuentes\//.test(location.pathname) ? ['../mapas/', 'mapas/'] : ['mapas/', '../mapas/'];   // junto al HTML o, desde fuentes/, en la raíz
  const get = raw() ? Promise.resolve() : script(dirs[0] + id + '.js').catch(() => script(dirs[1] + id + '.js'));
  return get.then(() => { if (!raw()) throw new Error('falta mapas/' + id + '.js'); return decodeMap(raw()); })
    .then(m => (MAPS[id] = m), err => { throw new Error('No se pudo cargar el mapa «' + id + '»: ' + (err && err.message || 'falta mapas/' + id + '.js')); });
}
async function decodeMap(R) {
  const pixels = async b64 => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u8], { type: 'image/png' }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
    const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
    return cx.getImageData(0, 0, bmp.width, bmp.height).data;
  };
  const n = R.n, alt = await pixels(R.alturas), mat0 = await pixels(R.materiales);
  const h = new Float32Array(n * n), mat = new Uint8Array(n * n * 4);
  for (let i = 0, o = 0; i < n * n; i++, o += 4) {
    h[i] = R.h0 + (alt[o] * 256 + alt[o + 1]) * R.paso;
    mat[o] = mat0[o]; mat[o + 1] = mat0[o + 1]; mat[o + 2] = mat0[o + 2]; mat[o + 3] = alt[o + 2];
  }
  const tex = new THREE.DataTexture(mat, n, n, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;
  return { id: R.id, n, size: R.size, half: R.size / 2, h, mat, tex, area: R.area, inicio: R.inicio, hMax: R.hMax };
}
const START_DEFAULT = { x: 0, z: 0, heading: null, height: 260, y: null };
const WORLD = { seed: SEED_BOOT, biome: 'valle', shape: 'valle[]', startKey: '' };   // el mundo generado ahora (lo fija el arranque y beginWorldGen)
const WG = { total: 1, phase: 0 };                          // carga: chunks pendientes al empezar; fase 0 = terreno, 1 = islas
const wgEl = document.getElementById('worldgen'), wgBar = document.getElementById('wgBar');

function missionWorld(m) {
  const w = m.world || {}, s = Object.assign({}, START_DEFAULT, m.start || {});
  let biome = w.biome || 'valle';
  if (!BIOMES[biome]) { console.warn('Bioma desconocido: ' + biome + ' (de momento solo «valle» y «pruebas»)'); biome = 'valle'; }
  return { seed: w.seed != null ? (w.seed | 0) : SEED_BOOT, biome, start: s, lakes: (w.lakes || []).map(L => Object.assign({}, L)),
    relief: (w.relief || []).map(R => Object.assign({ edge: 2000, m: 1 }, R)), islands: w.islands !== false };   // (v34: relieve forzado y sin islas)
}
const startKey = s => [s.x, s.z, s.heading, s.height, s.y].join(',');
const shapeKey = w => w.biome + JSON.stringify(w.lakes || []) + JSON.stringify(w.relief || []) + (w.islands === false ? '/sin islas' : '');   // v29: bioma y lagos (el relieve del mundo llano); v34: relieve e islas
function worldNeedsGen() {
  const w = RUN.world; return !!w && (w.seed !== WORLD.seed || shapeKey(w) !== WORLD.shape || startKey(w.start) !== WORLD.startKey);
}
/* v29: el bioma cambia el relieve: con «pruebas», mundo llano (FLAT, en 1) y suelo de blockout (uGrid, en 2). */
function setBiome(w) {
  const B = BIOMES[w.biome];
  FLAT = B.flat != null ? { h: B.flat, lakes: w.lakes || [] } : null;
  terrainUniforms.uGrid.value = FLAT ? 1 : 0;
  RELIEF = w.relief || []; NO_ISL = w.islands === false;   // v34: cordilleras y llanuras de la receta; sin islas
  MAP = B.map ? MAPS[B.map] : null;                       // v38: mapa hecho a mano (ya cargado: beginWorldGen), su color y su ambiente
  terrainUniforms.uMap.value = MAP ? 1 : 0; terrainUniforms.uMat.value = MAP ? MAP.tex : blankTex;
  if (MAP) terrainUniforms.uMapK.value.set(MAP.half, MAP.size, MAP.n);
  setAtmosphere(B.atmos || null);
  cloudsBuild(B.clouds || null, w.seed);                   // v38: nubes que se atraviesan (7b)
}
/* Borra todo lo generado con la semilla actual (lo que se rehace solo al acercarse: terreno, árboles, islas, torres y sus cachés). */
function clearWorld() {
  for (const ch of [...chunks.values()]) removeChunk(ch);
  Object.assign(terrainState, { desired: [], pending: [], lastX: 1e9, lastZ: 1e9, lastDy: 0, lastPrune: 0 });
  for (const s of [...islLoaded.values()]) unloadIsland(s);
  islCells.clear(); islActive.length = 0; islPending.length = 0;
  for (const t of [...towers.values()]) dropTower(t);
  TOWER_SITES.length = 0; groundSiteCache.clear(); towerState.destroyed.clear();
}
/* Rumbo con más relieve delante (el de siempre al arrancar: se ven montañas al empezar). */
function bestHeading(x, z) {
  let best = 0, bestScore = -1;
  for (let a = 0; a < 24; a++) {
    const ang = a / 24 * Math.PI * 2, dx = Math.sin(ang), dz = -Math.cos(ang);
    let sc = 0; for (const d of [1200, 2200, 3200]) sc += heightAt(x + dx * d, z + dz * d);
    if (sc > bestScore) { bestScore = sc; best = ang; }
  }
  return best;
}
function placeStart(s) {
  const ang = s.heading != null ? s.heading * Math.PI / 180 : bestHeading(s.x, s.z);
  const g = Math.max(heightAt(s.x, s.z), WL);
  let y = s.y != null ? Math.max(s.y, g + 40) : g + s.height;
  for (let i = 0; i < 6; i++) {                             // dentro de una isla: por encima de ella
    const isl = islandsInRange(s.x, s.z, 600).find(t => insideIsland(t, s.x, y, s.z, 90));
    if (!isl) break; y = isl.yMax + 130;
  }
  dragon.position.set(s.x, y, s.z);
  _f.set(Math.sin(ang), 0, -Math.cos(ang));
  dragon.quaternion.setFromRotationMatrix(_m4.lookAt(ZERO, _f, UP));
  F.aimWorld.copy(_f);
  START.pos.copy(dragon.position); START.q.copy(dragon.quaternion); START.dir.copy(_f);
}
/* Desde startGame: otra semilla → se borra el mundo; en cualquier caso, nuevo punto de partida y carga del terreno de allí. */
function beginWorldGen() {
  const w = RUN.world, B = BIOMES[w.biome];
  if (B.map && !MAPS[B.map]) {                             // v38: primero, el archivo del mapa (mapas/<id>.js); al tenerlo, se vuelve aquí
    WG.phase = -1; wgBar.style.width = '0%';
    document.getElementById('wgKicker').textContent = mission.place || '';
    document.getElementById('wgName').textContent = mission.name;
    document.getElementById('wgLead').textContent = 'Cargando el mapa…';
    document.getElementById('wgSeed').textContent = B.name;
    state = 'worldgen'; wgEl.hidden = false; selEl.hidden = menuEl.hidden = true;
    loadMap(B.map).then(() => { WG.phase = -2; }, err => {
      console.error(err); wgEl.hidden = true; state = 'menu'; menuEl.hidden = false; toast(err.message);
    });
    return;
  }
  if (w.seed !== WORLD.seed || shapeKey(w) !== WORLD.shape) { clearWorld(); setSeed(w.seed); setBiome(w); }   // (v29: o con otro bioma)
  WORLD.seed = w.seed; WORLD.biome = w.biome; WORLD.shape = shapeKey(w); WORLD.startKey = startKey(w.start);
  placeStart(w.start);
  const P = dragon.position;
  refreshTerrainSelection(P.x, P.y, P.z, true);
  WG.total = Math.max(1, terrainState.pending.length); WG.phase = 0; wgBar.style.width = '0%';
  document.getElementById('wgKicker').textContent = mission.place || '';
  document.getElementById('wgName').textContent = mission.name;
  document.getElementById('wgLead').textContent = mission.free ? 'Generando el mundo…' : 'Generando el mundo de la misión…';
  document.getElementById('wgSeed').textContent = 'Semilla ' + w.seed + '  ·  ' + BIOMES[w.biome].name;
  state = 'worldgen'; wgEl.hidden = false; selEl.hidden = menuEl.hidden = true;
}
/* Cada fotograma de la carga: primero el terreno de alrededor (85 % de la barra), luego las islas cercanas; al acabar, la partida. */
function updateWorldGen() {
  const P = dragon.position;
  if (WG.phase === -1) return;                             // v38: esperando al archivo del mapa
  if (WG.phase === -2) { beginWorldGen(); return; }        // ya está: ahora sí, el mundo
  if (WG.phase === 0) {
    const left = pumpTerrain(28);
    wgBar.style.width = (85 * (1 - left / WG.total)).toFixed(0) + '%';
    if (left > 0) return;
    updateIslandStreaming(P.x, P.z); WG.phase = 1; WG.total = Math.max(1, islPending.length);
    return;
  }
  const left = pumpIslands(28);
  wgBar.style.width = (85 + 15 * (1 - left / WG.total)).toFixed(0) + '%';
  if (left > 0) return;
  wgEl.hidden = true; state = 'menu';
  startGame();
}

/* ---------- Modo diseño (º) ----------
   Arriba a la izquierda: misión, semilla y bioma; X, Z, altitud (sobre el agua) y altura (sobre el suelo) del dragón; rumbo; distancia al inicio y al borde del
   área. Intro marca un punto: queda dibujado en el mundo con su número y la lista entera se copia al portapapeles con el formato de las
   recetas ({ x, z, heading, height }: vale tal cual para «start» y sus x, z para áreas y lugares). */
const DESIGN = { on: false, marks: [], copied: false };   // copied: si la última lista llegó al portapapeles
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Backquote' || e.key === 'º' || e.key === '`') {   // la tecla a la izquierda del 1 (º en el teclado español)
    DESIGN.on = !DESIGN.on;
    toast(DESIGN.on ? 'Modo diseño  ·  Intro marca un punto' : 'Modo diseño desactivado');
  } else if (e.key === 'Enter' && DESIGN.on && state === 'playing') { e.preventDefault(); designMark(); }
});
const headingNow = () => { _f.set(0, 0, -1).applyQuaternion(dragon.quaternion); return ((Math.atan2(_f.x, -_f.z) * 180 / Math.PI) + 360) % 360; };
function designMark() {
  const P = dragon.position, g = Math.max(heightAt(P.x, P.z), WL), mine = DESIGN.marks.filter(m => m.seed === WORLD.seed);
  const m = { n: mine.length + 1, seed: WORLD.seed, x: Math.round(P.x), z: Math.round(P.z), y: Math.round(P.y), height: Math.round(P.y - g), heading: Math.round(headingNow()) % 360 };
  DESIGN.marks.push(m); mine.push(m);
  const txt = '// Sky Apex · semilla ' + WORLD.seed + ' · ' + WORLD.biome + ' · ' + mission.name + '\n' +
    mine.map(k => `{ x: ${k.x}, z: ${k.z}, heading: ${k.heading}, height: ${k.height} },   // ${k.n} · altitud ${k.y} m`).join('\n');
  copyText(txt).then(ok => { DESIGN.copied = ok; toast('Punto ' + m.n + ' marcado' + (ok ? '  ·  copiado al portapapeles' : '  ·  no se pudo copiar')); });
  sfx.lock();
}
function copyText(txt) {
  const old = () => {                                       // sin la API del portapapeles (p. ej. archivo local): el método antiguo
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (err) { }
    ta.remove(); canvasGL.focus(); return ok;
  };
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(() => true, () => old());
  return Promise.resolve(old());
}
function drawDesign(heading) {
  const P = dragon.position, g = heightAt(P.x, P.z), A = mission.area;   // g: suelo (en el agua, su fondo)
  // marcas e inicio en el mundo
  const pin = (x, y, z, label, col) => {
    if (!proj(x, y, z, _sp)) return;
    const d = Math.hypot(x - P.x, y - P.y, z - P.z), s = 6;
    hctx.strokeStyle = col; hctx.lineWidth = 1.5;
    hctx.beginPath(); hctx.moveTo(_sp.x, _sp.y - s); hctx.lineTo(_sp.x + s, _sp.y); hctx.lineTo(_sp.x, _sp.y + s); hctx.lineTo(_sp.x - s, _sp.y); hctx.closePath(); hctx.stroke();
    hudText(label + '  ' + fmtDist(d), _sp.x, _sp.y - 11, FM(11), col, 'center');
  };
  pin(START.pos.x, START.pos.y, START.pos.z, 'INICIO', C_BONE);
  for (const m of DESIGN.marks) if (m.seed === WORLD.seed) pin(m.x, m.y, m.z, '#' + m.n, C_GOLD);
  // panel
  const f = n => String(Math.round(n));                     // sin puntos de millar: como se escriben en las recetas
  const lines = [
    [(mission.free ? 'Combate libre' : mission.name) + '  ·  semilla ' + WORLD.seed + '  ·  ' + WORLD.biome, C_DIM],
    ['X ' + f(P.x).padStart(8) + '    Z ' + f(P.z).padStart(8), C_BONE],
    ['ALTITUD ' + f(P.y - WL) + ' m   ALTURA ' + f(Math.max(0, P.y - Math.max(g, WL))) + ' m (sobre el suelo)', C_BONE],
    ['RUMBO ' + String(Math.round(heading) % 360).padStart(3, '0') + '°   INICIO a ' + fmtDist(Math.hypot(P.x - START.pos.x, P.z - START.pos.z)), C_BONE]
  ];
  if (A) { const e = A.r - Math.hypot(P.x - A.x, P.z - A.z); lines.push(['ÁREA  ' + (e >= 0 ? 'dentro, a ' + fmtDist(e) + ' del borde' : 'FUERA, a ' + fmtDist(-e)), e >= 0 ? C_BONE : C_DANGER]); }
  const mine = DESIGN.marks.filter(m => m.seed === WORLD.seed);
  lines.push(['Intro: marcar punto' + (mine.length ? '  ·  ' + mine.length + (DESIGN.copied ? ', copiados' : ', sin copiar') : ''), C_DIM]);
  for (const m of mine.slice(-5)) lines.push(['#' + m.n + '  x ' + m.x + '  z ' + m.z + '  rumbo ' + m.heading + '°  altura ' + m.height + ' m', C_GOLD]);
  const x0 = 24, y0 = 22, w = 360, lh = 18, h = 30 + lines.length * lh;
  hctx.shadowBlur = 0;
  hctx.fillStyle = 'rgba(13,10,15,.74)'; hctx.fillRect(x0, y0, w, h);
  hctx.fillStyle = C_GOLD; hctx.fillRect(x0, y0, 2, h);
  hudText('MODO DISEÑO', x0 + 12, y0 + 19, FM(12), C_GOLD); hudText('º', x0 + w - 12, y0 + 19, FM(12), C_DIM, 'right');
  lines.forEach(([t, c], i) => hudText(t, x0 + 12, y0 + 38 + i * lh, FM(12), c));
  hctx.shadowBlur = 5;
}
