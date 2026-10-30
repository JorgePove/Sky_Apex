
/* ============================================================
   M4. MODO DEV TEST Y PANEL DE PRUEBAS (v27)
   Petición de Jorge: un modo de juego igual que el combate libre pero con trucos (receta «devtest», mission.dev) y una pantalla de pruebas
   con controles en directo. Tab abre y cierra el panel sin parar la partida (suelta el ratón; un clic en el juego también lo cierra).
   Mientras está abierto, la mira se queda quieta y el dragón sigue recto.
   · Trucos (DEV): invulnerable, sin choques, munición, guiadas, boost y escudos infinitos, sin sobrecalentamiento y rayo siempre listo.
     Solo valen en el modo Dev Test (devCheat; devUpdate cada fotograma desde updateFlight).
   · Stats en vivo: las del Excel de la unidad elegida (tu dragón, el dragón enemigo, la torre, el dirigible o Lance), con sus nombres y
     secciones de STATS_SCHEMA. Se aplican al momento (applyStats con la fuente «panel de pruebas»). En dorado, las que ya no son las del
     Excel. «Copiar cambios» deja en el portapapeles la lista para pasarla al Excel; «Volver al Excel», las de antes. Si el Excel cambia
     con el juego abierto (Jugar.bat), manda el Excel.
   · Vuelo y cámara: sensación de vuelo, cámaras (1ª, 3ª, apuntado, objetivo) y campo de visión. «Copiar ajustes» deja los valores con el
     nombre de su constante, para fijarlos después en el código.
   · Depuración: FPS, hitboxes (dragones, Lance, el jugador y las torres), duración de las quemaduras, entrada de cine y reaparecer.
   ============================================================ */
const DEV = { open: false, god: true, noCrash: true, ammo: true, msl: true, boost: true, shield: true, heat: true, ult: true, fps: false, hitbox: false, unit: '' };
const DEV_SRC = 'panel de pruebas';
const devEl = document.getElementById('dev');
const devStats = { base: null };                           // stats tal como llegaron del Excel (o de la copia): para marcar y copiar los cambios
function devCheat(k) { return !!(mission.dev && DEV[k]); }
/* applyStats llama aquí cada vez que llegan stats que no son del panel. */
function devStatsSnap() { devStats.base = JSON.parse(JSON.stringify(STATS)); if (DEV.open) devBuildStats(); }

/* ---------- Trucos (cada fotograma, en el modo Dev Test) ---------- */
function devUpdate(dt) {
  if (state !== 'playing') return;
  if (DEV.god) { F.health = heroHpMax(); F.armor = ARMOR_MAX; }
  if (DEV.ammo) W.ammo = GUN_AMMO;
  if (DEV.msl) W.msl = Math.max(1, MSL_AMMO);
  if (DEV.boost) { F.boost = 1; F.boostExhausted = false; }
  if (DEV.shield) W.shield = Math.max(1, SHIELD_MAX);
  if (DEV.heat) { W.heat = 0; W.overheat = 0; }
  if (DEV.ult && W.laser <= 0) W.ult = 1;
}

/* ---------- Abrir y cerrar ---------- */
const devInGame = () => state === 'playing' || state === 'paused' || state === 'dead';
function devPanel(open) {
  if (open && !(mission.dev && devInGame())) return;
  DEV.open = !!open; devEl.hidden = !open;
  if (open) { devBuild(); if (document.pointerLockElement) { F.lockRequested = false; document.exitPointerLock(); } }
  else { if (document.activeElement && devEl.contains(document.activeElement)) document.activeElement.blur(); if (state === 'playing') { requestLock(); canvasGL.focus(); } }
}
window.addEventListener('keydown', e => {
  if (e.code !== 'Tab' || !mission.dev || !devInGame()) return;
  e.preventDefault(); if (!e.repeat) devPanel(!DEV.open);
});

/* ---------- Controles ---------- */
const devNum = v => Math.abs(v) >= 100 ? Math.round(v * 10) / 10 : Math.abs(v) >= 10 ? Math.round(v * 100) / 100 : Math.round(v * 1000) / 1000;
function devEl$(tag, cls, text, parent) { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; if (parent) parent.appendChild(el); return el; }
function devSection(title, open) { const d = devEl$('details', '', null, devEl); d.open = !!open; devEl$('summary', '', title, d); return d; }
function devCheck(parent, label, key, onChange) {
  const l = devEl$('label', 'd-chk', null, parent), c = devEl$('input', '', null, l); c.type = 'checkbox'; c.checked = !!DEV[key];
  devEl$('span', '', label, l);
  c.addEventListener('change', () => { DEV[key] = c.checked; if (onChange) onChange(c.checked); });
  return c;
}
function devButton(parent, label, fn) { const b = devEl$('button', '', label, parent); b.type = 'button'; b.addEventListener('click', fn); return b; }
/* Fila con nombre, deslizador y casilla numérica. o = { label, get, set, min, max, step, base (valor de referencia para marcarlo si cambia), title } */
function devSlider(parent, o) {
  const row = devEl$('div', 'd-row', null, parent), name = devEl$('span', '', o.label, row), r = devEl$('input', '', null, row), n = devEl$('input', '', null, row);
  if (o.title) name.title = o.title; else name.title = o.label;
  r.type = 'range'; n.type = 'number'; r.min = o.min; r.max = o.max; r.step = o.step; n.step = o.step;
  const show = v => { r.value = v; n.value = devNum(v); name.classList.toggle('chg', o.base != null && Math.abs(v - o.base) > 1e-9); };
  show(o.get());
  const put = v => { if (!isFinite(v)) return; if (v > +r.max) r.max = v; o.set(v); show(o.get()); };
  r.addEventListener('input', () => put(+r.value));
  n.addEventListener('change', () => put(+n.value));
  return row;
}
/* Rango y paso de un deslizador para un valor v con valor por defecto def. */
function devRange(def, v) {
  const top = Math.max(Math.abs(def) * 3, Math.abs(v) * 1.5, 1), p = Math.pow(10, Math.floor(Math.log10(top))), max = Math.ceil(top / p) * p;
  const intish = Number.isInteger(def) && Number.isInteger(v) && max >= 20;
  return { min: 0, max, step: intish ? 1 : Math.max(0.001, +(max / 200).toPrecision(1)) };
}
function devCopy(text, what) {
  const done = () => toast(what + ' copiados al portapapeles');
  try { navigator.clipboard.writeText(text).then(done, () => { console.log(text); toast('No se pudo copiar: están en la consola (F12)'); }); }
  catch (err) { console.log(text); toast('No se pudo copiar: están en la consola (F12)'); }
}

/* ---------- El panel ---------- */
function devBuild() {
  devEl.textContent = '';
  const head = devEl$('div', 'd-head', null, devEl); devEl$('b', '', 'DEV TEST', head); devEl$('span', 'd-hint', 'Tab: cerrar · clic en el juego: volver', head);
  // Trucos
  const t = devSection('Trucos', true);
  devCheck(t, 'Invulnerable (sin daño)', 'god');
  devCheck(t, 'Sin choques (atraviesa terreno, islas y torres)', 'noCrash');
  devCheck(t, 'Munición infinita (fuego rápido)', 'ammo');
  devCheck(t, 'Bolas guiadas infinitas', 'msl');
  devCheck(t, 'Boost infinito', 'boost');
  devCheck(t, 'Escudos infinitos', 'shield');
  devCheck(t, 'Sin sobrecalentamiento', 'heat');
  devCheck(t, 'Rayo siempre listo', 'ult');
  // Stats en vivo
  devStats.sec = devSection('Stats en vivo', false);
  devBuildStats();
  // Vuelo y cámara
  const v = devSection('Vuelo y cámara', false);
  devFeel.forEach(d => { if (typeof d === 'string') devEl$('div', 'd-sub', d, v); else devSlider(v, Object.assign({ base: devFeelBase[d.key] }, d)); });
  const vb = devEl$('div', 'd-btns', null, v);
  devButton(vb, 'Copiar ajustes', () => devCopy(devFeel.filter(d => typeof d !== 'string').map(d => d.key + ' = ' + devNum(d.get()) + (Math.abs(d.get() - devFeelBase[d.key]) > 1e-9 ? '   (antes ' + devNum(devFeelBase[d.key]) + ')' : '')).join('\n'), 'Ajustes'));
  devButton(vb, 'Restablecer', () => { devFeel.forEach(d => { if (typeof d !== 'string') d.set(devFeelBase[d.key]); }); devBuild(); });
  // Depuración
  const g = devSection('Depuración', false);
  devCheck(g, 'Mostrar FPS', 'fps');
  devCheck(g, 'Hitboxes (dragones, Lance, tú y las torres)', 'hitbox');
  devEl$('div', 'd-sub', 'Quemaduras de la llamarada', g);
  devSlider(g, { label: 'Duración (s)', get: () => SCORCH.life, set: x => SCORCH.life = Math.max(1, x), min: 5, max: 300, step: 1, base: 60 });
  devSlider(g, { label: 'Desvanecido final (s)', get: () => SCORCH.fade, set: x => SCORCH.fade = Math.max(0.5, x), min: 1, max: 120, step: 1, base: 20 });
  devSlider(g, { label: 'Brasas (s)', get: () => SCORCH.glow, set: x => { SCORCH.glow = Math.max(0.5, x); scorchMesh.material.uniforms.uGlow.value = SCORCH.glow; }, min: 0.5, max: 20, step: 0.5, base: 5 });
  const gb = devEl$('div', 'd-btns', null, g);
  devButton(gb, 'Borrar quemaduras', scorchClear);
  devButton(gb, 'Probar la entrada de cine', () => { if (state === 'playing') cineStart(CINE_T, mission.name, 'Prueba de la entrada de cine'); });
  devButton(gb, 'Reaparecer', () => { if (state === 'playing' || state === 'dead') respawn(); });
}
/* Stats en vivo de la unidad elegida (DEV.unit; por defecto, tu dragón). */
function devBuildStats() {
  const s = devStats.sec; if (!s) return;
  while (s.children.length > 1) s.removeChild(s.lastChild);
  const units = STATS_TABS.filter(T => T.unit !== 'base' && (T.kind !== 'dragon' || T.unit === alt.id));
  if (!units.some(T => T.unit === DEV.unit)) DEV.unit = alt.id;
  const sel = devEl$('select', '', null, s);
  for (const T of units) { const o = devEl$('option', '', T.kind === 'dragon' ? 'Tu dragón: ' + T.tab : T.tab, sel); o.value = T.unit; }
  sel.value = DEV.unit; sel.addEventListener('change', () => { DEV.unit = sel.value; devBuildStats(); });
  const T = units.find(x => x.unit === DEV.unit), base = devStats.base && devStats.base[DEV.unit];
  for (const row of STATS_SCHEMA[T.kind]) {
    if (!Array.isArray(row)) { devEl$('div', 'd-sub', row.sec, s); continue; }
    const [key, name, unit, def, desc] = row, cur = STATS[DEV.unit][key];
    devSlider(s, Object.assign(devRange(def, cur), { label: name + (unit ? ' (' + unit + ')' : ''), title: desc || name, base: base ? base[key] : null,
      get: () => STATS[DEV.unit][key], set: x => { STATS[DEV.unit][key] = x; applyStats(STATS, DEV_SRC); } }));
  }
  const b = devEl$('div', 'd-btns', null, s);
  devButton(b, 'Copiar cambios', () => {
    const out = [];
    for (const U of STATS_TABS) for (const row of STATS_SCHEMA[U.kind]) {
      if (!Array.isArray(row) || !devStats.base || !devStats.base[U.unit]) continue;
      const a = devStats.base[U.unit][row[0]], v = STATS[U.unit][row[0]];
      if (Math.abs(a - v) > 1e-9) out.push(U.tab + ' · ' + row[1] + ': ' + devNum(v) + '   (Excel: ' + devNum(a) + ')');
    }
    if (!out.length) { toast('No hay cambios respecto al Excel'); return; }
    devCopy(out.join('\n'), 'Cambios');
  });
  devButton(b, 'Volver al Excel', () => { if (devStats.base) { applyStats(JSON.parse(JSON.stringify(devStats.base)), statsInfo.src === DEV_SRC ? 'excel' : statsInfo.src); devBuildStats(); } });
}
/* Sensación de vuelo y cámaras: la constante, su valor y su rango. (Los ángulos, en grados en el panel.) */
const devDeg = 180 / Math.PI;
const devFeel = [
  'Vuelo',
  { key: 'STEER_LAG', label: 'Retraso al seguir la mira (1/s)', get: () => STEER_LAG, set: x => STEER_LAG = x, min: 2, max: 30, step: 0.5 },
  { key: 'STEER_GAIN', label: 'Fuerza de giro hacia la mira', get: () => STEER_GAIN, set: x => STEER_GAIN = x, min: 0.5, max: 5, step: 0.1 },
  { key: 'RATE_RESP[0]', label: 'Respuesta del giro (1/s)', get: () => RATE_RESP[0], set: x => RATE_RESP[0] = x, min: 1, max: 15, step: 0.5 },
  { key: 'BANK_GAIN', label: 'Alabeo al virar', get: () => BANK_GAIN, set: x => BANK_GAIN = x, min: 0, max: 1, step: 0.02 },
  { key: 'BANK_MAX', label: 'Alabeo máximo (°)', get: () => BANK_MAX * devDeg, set: x => BANK_MAX = x / devDeg, min: 0, max: 80, step: 1 },
  { key: 'BODY_SPRING[0]', label: 'Muelle del cuerpo: frecuencia', get: () => BODY_SPRING[0], set: x => BODY_SPRING[0] = x, min: 1, max: 15, step: 0.5 },
  { key: 'BODY_SPRING[1]', label: 'Muelle del cuerpo: amortiguación', get: () => BODY_SPRING[1], set: x => BODY_SPRING[1] = x, min: 0.1, max: 1.5, step: 0.05 },
  'Cámaras',
  { key: 'CAM_LAG[0]', label: 'Retraso 1ª persona (1/s)', get: () => CAM_LAG[0], set: x => CAM_LAG[0] = x, min: 1, max: 30, step: 0.5 },
  { key: 'CAM_LAG[1]', label: 'Retraso 3ª persona (1/s)', get: () => CAM_LAG[1], set: x => CAM_LAG[1] = x, min: 1, max: 20, step: 0.2 },
  { key: 'HERO_CAM[0]', label: '3ª persona: altura (m)', get: () => HERO_CAM[0], set: x => HERO_CAM[0] = x, min: 0, max: 30, step: 0.5 },
  { key: 'HERO_CAM[1]', label: '3ª persona: distancia (m)', get: () => HERO_CAM[1], set: x => HERO_CAM[1] = x, min: 5, max: 60, step: 0.5 },
  { key: 'FOV_BASE[0]', label: 'Campo de visión (°)', get: () => FOV_BASE[0], set: x => FOV_BASE[0] = x, min: 50, max: 110, step: 1 },
  { key: 'FOV_BASE[1]', label: 'Campo de visión a toda velocidad (°)', get: () => FOV_BASE[1], set: x => FOV_BASE[1] = x, min: 50, max: 120, step: 1 },
  { key: 'TARGET_CAM_W', label: 'Cámara al objetivo (F): rapidez', get: () => TARGET_CAM_W, set: x => TARGET_CAM_W = x, min: 1, max: 15, step: 0.5 },
  'Cámara de apuntado (Espacio)',
  { key: 'AIM_CAM.d', label: 'Distancia (m)', get: () => AIM_CAM.d, set: x => AIM_CAM.d = x, min: 8, max: 60, step: 0.5 },
  { key: 'AIM_CAM.elev', label: 'Elevación (°)', get: () => AIM_CAM.elev * devDeg, set: x => AIM_CAM.elev = x / devDeg, min: 0, max: 60, step: 1 },
  { key: 'AIM_CAM.mix', label: 'Mira al dragón (0) o a la mira (1)', get: () => AIM_CAM.mix, set: x => AIM_CAM.mix = x, min: 0, max: 1, step: 0.02 },
  { key: 'AIM_CAM.yawK', label: 'Giro hacia el lado de la mira', get: () => AIM_CAM.yawK, set: x => AIM_CAM.yawK = x, min: 0, max: 1, step: 0.05 },
  { key: 'AIM_CAM.follow', label: 'Suavizado (1/s)', get: () => AIM_CAM.follow, set: x => AIM_CAM.follow = x, min: 1, max: 20, step: 0.5 },
  { key: 'AIM_CAM.blend', label: 'Entrada y salida (1/s)', get: () => AIM_CAM.blend, set: x => AIM_CAM.blend = x, min: 1, max: 12, step: 0.5 },
  { key: 'HERO_LOOK_DOWN', label: 'Cabeza hacia abajo, máximo (°)', get: () => HERO_LOOK_DOWN * devDeg, set: x => HERO_LOOK_DOWN = x / devDeg, min: 30, max: 95, step: 1 }
];
const devFeelBase = {}; for (const d of devFeel) if (typeof d !== 'string') devFeelBase[d.key] = d.get();

/* ---------- Depuración: hitboxes y FPS ---------- */
const devHit = { pool: [], geo: new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 14, 10)), cyl: new THREE.WireframeGeometry(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true)) };
function devHitBox(i, cyl, color) {
  let m = devHit.pool[i];
  if (!m || m.userData.cyl !== cyl) {
    if (m) scene.remove(m);
    m = devHit.pool[i] = new THREE.LineSegments(cyl ? devHit.cyl : devHit.geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, depthTest: false }));
    m.userData.cyl = cyl; m.renderOrder = 9; m.frustumCulled = false; scene.add(m);
  }
  m.material.color.set(color); m.visible = true;
  return m;
}
/* Cada fotograma (updateWorld). */
function devDebug() {
  let n = 0;
  const put = (cyl, color, x, y, z, r, h) => { const m = devHitBox(n++, cyl, color); m.position.set(x, y, z); m.scale.set(r, h, r); };
  if (mission.dev && DEV.hitbox && devInGame()) {
    for (const e of enemies) if (!e.dead && !e.off) put(false, 0xff4a3a, e.pos.x, e.pos.y, e.pos.z, ENEMY_HIT_R, ENEMY_HIT_R);
    if (ally.e && ally.on) { const p = ally.e.pos, r = ENEMY_HIT_R / ENEMY_SCALE; put(false, 0x5ab4ff, p.x, p.y, p.z, r, r); }
    const P = dragon.position; put(false, 0xf2b84b, P.x, P.y, P.z, PLAYER_HIT_R, PLAYER_HIT_R);
    for (const t of towers.values()) if (!t.dead && Math.hypot(t.x - P.x, t.z - P.z) < 4000) put(true, 0xff7a2e, t.x, t.y + TOWER_TOP / 2, t.z, TOWER_R, TOWER_TOP);
  }
  for (let i = n; i < devHit.pool.length; i++) devHit.pool[i].visible = false;
}
