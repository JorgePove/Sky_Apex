
/* ============================================================
   6f. UNIDADES NUEVAS (v29): artillería, barcos navales, superdirigibles (con sus torretas), batallones de soldados (14g) y la sierpe
   (con sus hechiceros y su escudo, 14f)
   Lista de enemigos de Jorge (30-oct). Todas tienen la forma de los blancos (6d: kind, pos, vel, dead, tags) y comparten este sistema:
   · UNITS: todas las de la partida, también las piezas montadas en otra unidad (torretas del superdirigible y hechiceros de la sierpe:
     parent; al caer la unidad, caen ellas). Se fijan por separado (clic central) y cuentan por separado para las misiones.
   · Impactos: cada unidad tiene cápsulas en el mundo (u.caps: { a, b, r }) que usan los proyectiles, la llamarada, el rayo, la asistencia
     de puntería y los choques (unitSegHit, unitRayHit, unitPointHit, unitsFlame, unitsLaser). Los batallones, además, matan soldados uno a
     uno (u.hurt, 14g) y la sierpe con escudo no recibe daño (14f).
   · Daño y muerte: damageUnit → killUnit (puntos, misión, rayo) → u.onKill (restos, hundimiento, explosión…).
   · Stats: pestañas «Artillería», «Batallón», «Barco naval», «Superdirigible» y «Sierpe» del Excel (19c). Se leen al usarlas (STATS.x.y),
     así que un cambio en el Excel o en el panel de pruebas se nota al momento; el tamaño (largo), en applyUnitStats.
   · Colocación: receta «units» (M1) → planUnits, en cada partida desde resetRun. Formaciones: línea, columna, cuña y rejilla.
   · Movimiento: de momento quietas (la galería las quiere así); la velocidad ya está en el Excel para cuando vayan en misiones.
   · Modelos (preparados en Blender: herramientas/blender/enemigos/): 1 m de largo y el frente hacia -Z; el juego los escala con «largo».
   ============================================================ */
const UNITS = [];
const unitState = { kills: 0 };
const unitRes = {};                                         // modelo → [{ geo, mat }] cuando ha cargado
const UNIT_GLB = {                                          // modelo: [id incrustado en sky_apex.html, archivo]
  balista: ['balista-glb', '../modelos/artilleria_balista.glb'], catapulta: ['catapulta-glb', '../modelos/artilleria_catapulta.glb'],
  canon: ['canon-glb', '../modelos/artilleria_canon.glb'], barco: ['barco-glb', '../modelos/barco_naval.glb'],
  superdirigible: ['superdirigible-glb', '../modelos/superdirigible.glb'], sierpe: ['sierpe-glb', '../modelos/sierpe.glb'],
  soldado: ['soldado-glb', '../modelos/soldado.glb']        // (dos mallas: «soldado» y «hechicero»)
};
const UNIT_G = 9.8;                                         // gravedad de los proyectiles con parábola (artillería, flechas) (m/s²)
const ART_NAME = { balista: 'Balista', catapulta: 'Catapulta', canon: 'Cañón' };
const BARCO_DRAFT = 0.05;                                   // calado del barco naval (fracción del largo, desde la quilla)
const SUPER_MOUNTS = [-0.3, -0.21, -0.12, -0.03, 0.06, 0.15];   // torretas del superdirigible: a lo largo (fracción del largo, + = hacia proa; medido en Blender, 04_sondear.py)
const SUPER_DECK = { x: 0.058, y: 0.016 };                  // borde de la cubierta donde van (fracción del largo)
const SUPER_JETS = { x: 0.051, y: -0.018, z: 0.445, r: 0.016, len: 0.15 };   // v30: motores arcanos: las dos turbinas de popa (medidas en Blender) y el largo del chorro
const unitTime = { value: 0 };                              // gameTime para los shaders de las unidades (soldados, escudo de la sierpe, chorros)
const _Ua = new THREE.Vector3(), _Ub = new THREE.Vector3(), _Uc = new THREE.Vector3(), _Ud = new THREE.Vector3(), _Uf = new THREE.Vector3(), _Us = new THREE.Vector3();
const _Uq = new THREE.Quaternion(), _Uq2 = new THREE.Quaternion(), _Uhit = new THREE.Vector3(), _Ux = new THREE.Vector3(1, 0, 0), _Uz = new THREE.Vector3(0, 0, 1);
const holdFire = () => !!(mission.dev && typeof DEV !== 'undefined' && !DEV.fire);   // panel de pruebas: «Los enemigos disparan» desactivado

/* ---------- Modelos ---------- */
function srgbColors(geo) {                                  // color por vértice lineal (glTF) → sRGB en coma flotante (el juego pinta sin corrección de gamma)
  const col = geo.attributes.color; if (!col) return;
  const max = !col.normalized ? 1 : col.array instanceof Uint8Array ? 255 : 65535, out = new Float32Array(col.count * 3);
  for (let i = 0; i < col.count; i++) { out[i * 3] = Math.pow(col.getX(i) / max, 1 / 2.2); out[i * 3 + 1] = Math.pow(col.getY(i) / max, 1 / 2.2); out[i * 3 + 2] = Math.pow(col.getZ(i) / max, 1 / 2.2); }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
}
function loadUnits() {
  return Promise.all(Object.entries(UNIT_GLB).map(([key, [id, url]]) => loadGLB(id, url).then(g => {
    g.scene.updateMatrixWorld(true);
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone(), src = o.material; geo.applyMatrix4(o.matrixWorld); geo.computeBoundingSphere();
      if (geo.attributes.color_1) { geo.setAttribute('color', geo.attributes.color_1); geo.deleteAttribute('color_1'); }   // (el soldado trae un COLOR_0 blanco y el bueno en COLOR_1)
      if (src.map) geo.deleteAttribute('color'); else srgbColors(geo);   // (con textura, el color por vértice que traiga no se usa)
      const mat = new THREE.MeshLambertMaterial({ map: src.map || null, vertexColors: !!geo.attributes.color, side: THREE.DoubleSide });
      if (mat.map) mat.map.encoding = THREE.LinearEncoding; else if (!geo.attributes.color) mat.color.copy(src.color);
      if (src.alphaTest > 0 || src.transparent) mat.alphaTest = Math.max(0.5, src.alphaTest);   // (v30: las aletas de la sierpe, recortadas por su alfa)
      let n = key; for (let p = o; p; p = p.parent) if (/hechicero/i.test(p.name)) n = 'hechicero';
      (unitRes[n] = unitRes[n] || []).push({ geo, mat });
    });
    if (key === 'sierpe' && typeof serpentPrepare === 'function') serpentPrepare();
  }).catch(err => console.error('No se pudo cargar el modelo «' + key + '»:', err))));
}
/* Copia del modelo para una unidad: comparte la geometría; materiales propios (el destello de los impactos y los restos quemados). */
function unitModel(key) {
  const g = new THREE.Group(), mats = [];
  for (const p of unitRes[key]) { const m = p.mat.clone(); mats.push(m); g.add(new THREE.Mesh(p.geo, m)); }
  return { g, mats };
}
function attachModel(u) {
  const M = unitModel(u.modelKey); u.model = M.g; u.mats = M.mats;
  u.model.scale.setScalar(u.size); u.model.position.copy(u.pos); u.model.quaternion.copy(u.q);
  scene.add(u.model);
  if (u.dead && u.charred) charUnit(u, 1);
}
function removeUnitMesh(u) {
  if (u.model) { scene.remove(u.model); for (const m of u.mats) m.dispose(); u.model = null; u.mats = null; }
  if (u.cleanup) u.cleanup(u);
}
function flashUnit(u, dt) {                                 // destello de los impactos (emisivo)
  u.hitFlash = Math.max(0, u.hitFlash - dt * 3.5);
  if (u.mats && !u.dead) for (const m of u.mats) m.emissive.setRGB(1, 0.55, 0.2).multiplyScalar(u.hitFlash * 0.5);
}
function charUnit(u, k) {                                   // restos quemados: oscuros (k = 1, del todo)
  u.charred = true;
  if (u.mats) for (const m of u.mats) { m.color.setScalar(lerp(1, 0.16, k)); m.emissive.setRGB(0, 0, 0); }
}

/* ---------- Creación y cápsulas de impacto ---------- */
function newUnit(kind, o) {
  const u = Object.assign({
    kind, id: kind + '#' + UNITS.length, tags: [], label: kind, pos: new THREE.Vector3(), vel: ZERO, q: new THREE.Quaternion(), heading: 0,
    hp: 1, hpMax: 1, score: 0, dead: false, gone: false, dying: 0, parent: null, kids: [], caps: [], capDef: null,
    bc: new THREE.Vector3(), br: 0, half: 10, size: 1, modelKey: null, model: null, mats: null, hitFlash: 0, sndT: -9, cool: rnd(1, 4),
    smokeT: 0, wreckT: 0, ph: Math.random() * 6.283, markR: 4000, radar: 'sq', noCrash: false
  }, o);
  UNITS.push(u);
  return u;
}
/* capDef: [[ax, ay, az, bx, by, bz, r], …] en ejes de la unidad (m, ya escalados) → u.caps en el mundo, y la esfera que las envuelve. */
function unitCaps(u) {
  const D = u.capDef;
  while (u.caps.length < D.length) u.caps.push({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0 });
  u.caps.length = D.length;
  D.forEach((d, i) => { const c = u.caps[i]; c.a.set(d[0], d[1], d[2]).applyQuaternion(u.q).add(u.pos); c.b.set(d[3], d[4], d[5]).applyQuaternion(u.q).add(u.pos); c.r = d[6]; });
  capsBound(u);
}
function capsBound(u) {
  const C = u.caps; u.bc.set(0, 0, 0);
  for (const c of C) u.bc.add(c.a).add(c.b);
  u.bc.multiplyScalar(1 / Math.max(1, 2 * C.length)); u.br = 0;
  for (const c of C) u.br = Math.max(u.br, u.bc.distanceTo(c.a) + c.r, u.bc.distanceTo(c.b) + c.r);
  if (!u.aimAt) u.aimAt = u.bc;                             // v30: a dónde se apunta (bola guiada, fijado, adelanto): su centro, no su base (targetCenter)
}
/* Punto al que se apunta en un blanco: el centro de las unidades nuevas (su pos es la base: en los barcos, bajo el agua), la pos en los demás. */
const targetCenter = t => t.aimAt || t.pos;
/* v30: bola guiada contra una unidad que da en el suelo o en el agua cerca de ella (a menos de MSL_NEAR m de sus cápsulas): cuenta como
   impacto. Devuelve si lo fue. */
const MSL_NEAR = 25;
function mslNearMiss(f) {
  const u = f.target;
  if (!u || u.dead || !u.caps || !u.caps.length) return false;
  let d = Infinity; for (const c of u.caps) d = Math.min(d, Math.sqrt(segPointDist2(c.a, c.b, f.pos)) - c.r);
  if (d > MSL_NEAR) return false;
  byAlly = f.ally; damageUnit(u, f.dmg, false, f.pos.clone(), 'msl'); byAlly = false;
  return true;
}
function segPointDist2(p, q, c) {                           // distancia² del punto c al segmento p→q
  _Ud.subVectors(q, p); const l2 = _Ud.lengthSq(), t = l2 > 1e-9 ? clamp(_Uc.subVectors(c, p).dot(_Ud) / l2, 0, 1) : 0;
  return _Uc.copy(p).addScaledVector(_Ud, t).distanceToSquared(c);
}
/* Segmento p→q (proyectil, llamarada, rayo, mira) contra las unidades: la primera que toca (con pad m de margen), o null; el punto donde
   entra en ella (en su superficie, no dentro) queda en _Uhit. v30: antes era el punto más cercano al eje (dentro del casco) y la caja de los
   batallones pisaba el vector q. */
const _Use = new THREE.Vector3(), _Upt = new THREE.Vector3(), _Uray = new THREE.Vector3();
function unitSegHit(p, q, pad) {
  let best = null, bestT = Infinity;
  _Use.subVectors(q, p); const len = _Use.length(); if (len < 1e-6) return null; _Use.divideScalar(len);
  for (const u of UNITS) {
    if (u.dead || !u.caps.length || segPointDist2(p, q, u.bc) > (u.br + pad) ** 2) continue;
    if (u.boxHit) {                                         // (batallones: una caja baja, no una cápsula)
      const t = u.boxHit(u, p, q, pad) * len;
      if (t >= 0 && t < bestT) { bestT = t; best = u; _Uhit.copy(p).addScaledVector(_Use, t); }
      continue;
    }
    for (const c of u.caps) {
      const R2 = (c.r + pad) ** 2;
      if (segSegDist2(p, q, c.a, c.b) >= R2) continue;
      let lo = 0, hi = _sdc.distanceTo(p);                  // (el punto más cercano al eje está dentro: se busca hacia atrás el borde)
      if (hi >= bestT) continue;
      if (segPointDist2(c.a, c.b, p) < R2) hi = 0;
      else for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; _Upt.copy(p).addScaledVector(_Use, m); if (segPointDist2(c.a, c.b, _Upt) < R2) hi = m; else lo = m; }
      if (hi < bestT) { bestT = hi; best = u; _Uhit.copy(p).addScaledVector(_Use, hi); }
    }
  }
  return best;
}
/* Rayo o→d: distancia a la primera unidad (asistencia de puntería: la mira se para en ella), o Infinity. */
function unitRayHit(o, d, maxT) {
  _Uray.copy(o).addScaledVector(d, maxT);
  const u = unitSegHit(o, _Uray, 2);
  if (!u) return Infinity;
  const t = _Uhit.distanceTo(o);
  return t > 25 ? t : Infinity;
}
/* Punto contra las cápsulas (choques del jugador): la unidad en la que está metido (k = fracción del radio), o null. */
function unitPointHit(p, k) {
  for (const u of UNITS) {
    if (u.dead || u.noCrash || !u.caps.length || u.bc.distanceToSquared(p) > u.br * u.br) continue;
    for (const c of u.caps) if (segPointDist2(c.a, c.b, p) < (c.r * k) ** 2) return u;
  }
  return null;
}

/* ---------- Daño y destrucción ---------- */
/* n = daño (el del arma del dragón elegido, o del aliado); soft = continuo (llamarada, rayo); at = punto; how = 'gun' | 'msl' | 'flame' | 'laser'. */
function damageUnit(u, n, soft, at, how) {
  if (u.dead) return;
  if (u.hurt && u.hurt(u, n, soft, at, how) === false) return;   // (batallones: matan soldados; sierpe con escudo: lo para)
  u.hp -= n; u.hitFlash = Math.max(u.hitFlash, soft ? 0.55 : 1);
  if (soft) sparks(at.x, at.y, at.z, 2, 0, 0, 0);
  else {
    const k = clamp(n / 25, 0.3, 2);
    emit(fxAdd, at.x, at.y, at.z, 0, 0, 0, 0.18, 10 * k, 26 * k, 1, 0.85, 0.5, 1, 0, 0);
    for (let i = 0; i < Math.round(20 * k); i++) {
      const a = Math.random() * 6.283, c = rnd(-1, 1), s = Math.sqrt(1 - c * c), sp = rnd(14, 46);
      emit(fxAdd, at.x, at.y, at.z, Math.cos(a) * s * sp, c * sp, Math.sin(a) * s * sp, rnd(0.3, 0.8), rnd(2.2, 3.6), 0.4, 1, rnd(0.55, 0.9), 0.25, 1, 0.6, -6);
    }
    emit(fxSmoke, at.x, at.y, at.z, rnd(-3, 3), rnd(0, 4), rnd(-3, 3), rnd(1.5, 2.5), 5 * k, 16 * k, 0.2, 0.17, 0.13, 0.6, 0.8, 0);
  }
  if (!(gameTime - u.sndT < (soft ? 0.22 : 0.07))) { u.sndT = gameTime; sfx.hit(); }
  if (u.hp <= 0) killUnit(u);
}
/* silent: cae con la unidad que la lleva (sin puntos ni aviso). */
function killUnit(u, silent) {
  if (u.dead) return;
  u.hp = 0; u.dead = true; u.dying = u.dieT || 0; u.hitFlash = 0;
  releaseLock(u);
  if (!silent) {
    if (!byAlly) ultGain(ULT_PER_KILL);
    towerState.score += u.score; unitState.kills++; missionKill(u);
    toast((byAlly ? allyName() + ': ' : '') + (u.killText || u.label + ' destruido') + '  +' + u.score + (u.killTail ? u.killTail(u) : ''));
    if (byAlly) allySay('kill');
  }
  for (const k of u.kids) killUnit(k, true);
  if (u.onKill) u.onKill(u, silent);
}
/* La llamarada (desde attackFlame): cono de S en la dirección D hasta lim m (radio 2 m + un 11 % de la distancia, como con los demás
   blancos); amt = daño de este fotograma. */
function unitsFlame(S, D, lim, amt, dt) {
  _Ub.copy(S).addScaledVector(D, lim);
  for (const u of UNITS) {
    if (u.dead || !u.caps.length || segPointDist2(S, _Ub, u.bc) > (u.br + 12 + lim * 0.11) ** 2) continue;
    if (u.flame) { u.flame(u, S, D, lim, amt, dt); continue; }   // (batallones: soldado a soldado)
    for (const c of u.caps) if (segSegDist2(S, _Ub, c.a, c.b) < (c.r + 12) ** 2) { const at = _sdc.clone(); damageUnit(u, amt, true, at, 'flame'); flameHit(at, dt); break; }
  }
}
/* El rayo (desde laserFx): segmento S→E. */
function unitsLaser(S, E, amt) {
  for (const u of UNITS) {
    if (u.dead || !u.caps.length || segPointDist2(S, E, u.bc) > (u.br + LASER_R) ** 2) continue;
    if (u.laserHit) { u.laserHit(u, S, E, amt); continue; }   // (batallones: soldado a soldado)
    for (const c of u.caps) if (segSegDist2(S, E, c.a, c.b) < (c.r + LASER_R) ** 2) { damageUnit(u, amt, true, _sdc.clone(), 'laser'); break; }
  }
}

/* ---------- Proyectiles de las unidades ----------
   Van con los demás (fireballs, 13) con kind 'ushot': su daño, su color, su aspecto y gravedad si la tienen (artillería). look: 'piedra'
   (catapulta: piedra ardiendo), 'verde' (cañón: bola de energía verde), 'virote' (balista y torretas de balista: trazadora dorada) o
   'arcano' (torretas de cañón del superdirigible y barcos: como los dirigibles). */
const SHOT_LOOK = {
  piedra: { c: [1, 0.55, 0.2], r: [6, 18], fast: false }, verde: { c: [0.5, 1, 0.3], r: [5, 16], fast: false },
  virote: { c: [1, 0.8, 0.45], r: [2.6, 8], fast: true }, arcano: { c: ARC_COLOR, r: [3.4, 11], fast: true }
};
function spawnUnitShot(from, vel, o) {
  const L = SHOT_LOOK[o.look] || SHOT_LOOK.piedra, c = new THREE.Color(L.c[0], L.c[1], L.c[2]);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: c.clone().lerp(_white, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  core.scale.setScalar(L.r[0]); core.renderOrder = 7; core.position.copy(from); scene.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  halo.scale.setScalar(L.r[1]); halo.renderOrder = 7; halo.position.copy(from); scene.add(halo);
  const f = { pos: from.clone(), vel: vel.clone(), speed: vel.length(), life: o.life || 14, core, halo, r0: L.r[0], r1: L.r[1], enemy: true, kind: 'ushot',
    dmg: o.dmg, grav: o.grav || 0, msg: o.msg, fastLook: L.fast, c: L.c, target: null, lost: false, ally: false };
  fireballs.push(f);
  if (L.fast) sfx.arcShot(o.vol); else sfx.fire(o.vol);
  return f;
}
/* Tiro parabólico desde F a la velocidad v hacia el jugador (con adelanto): escribe la velocidad inicial en out (el tiro bajo); false si no
   llega. err = dispersión (rad). */
function ballisticAim(F, v, err, out) {
  const P = dragon.position;
  let t = P.distanceTo(F) / v;
  for (let it = 0; it < 3; it++) {
    _Ua.copy(P).addScaledVector(dragonVel, t);
    const dx = Math.hypot(_Ua.x - F.x, _Ua.z - F.z), dy = _Ua.y - F.y, v2 = v * v, disc = v2 * v2 - UNIT_G * (UNIT_G * dx * dx + 2 * dy * v2);
    if (disc < 0 || dx < 1) return false;
    const th = Math.atan((v2 - Math.sqrt(disc)) / (UNIT_G * dx)), hx = (_Ua.x - F.x) / dx, hz = (_Ua.z - F.z) / dx;
    out.set(hx * Math.cos(th), Math.sin(th), hz * Math.cos(th));
    t = dx / (v * Math.cos(th));
  }
  out.x += rnd(-1, 1) * err; out.y += rnd(-1, 1) * err; out.z += rnd(-1, 1) * err;
  out.normalize().multiplyScalar(v);
  return true;
}
const unitVol = d => clamp(1.1 - d / 2500, 0.12, 0.6);

/* ---------- Artillería: balistas, catapultas y cañones ----------
   Defensa terrestre móvil (los «tanques» de Ace Combat): de vez en cuando disparan un proyectil con parábola al jugador, con poco daño;
   en las misiones atacarán sobre todo a las unidades de tierra aliadas. Las tres son iguales salvo el aspecto (y el proyectil). Al
   destruirlas quedan los restos quemados, humeando. */
function addArtilleria(variant, x, z, heading, tags) {
  const S = STATS.artilleria, ang = heading * Math.PI / 180;
  const u = newUnit('artilleria', { variant, tags: tags || [], label: ART_NAME[variant], killText: ART_NAME[variant] + (variant === 'canon' ? ' destruido' : ' destruida'),
    hp: S.vida, hpMax: S.vida, score: S.puntos, heading: ang, modelKey: variant, markR: 3500, radar: 'sq', crashText: 'una pieza de artillería', ground: true, upd: updArtilleria, onKill: wreckUnit });
  u.pos.set(x, groundAt(x, z), z); u.q.setFromAxisAngle(UP, -ang);
  unitResize(u);
  return u;
}
function unitResize(u) {                                    // tamaño (stat «largo») → escala del modelo, cápsulas y recuadro del fijado
  const L = u.kind === 'artilleria' ? STATS.artilleria.largo : u.kind === 'barco' ? STATS.barco_naval.largo : u.kind === 'superdirigible' ? STATS.superdirigible.largo
    : u.kind === 'torreta' ? STATS.superdirigible.torreta_largo : u.size;
  u.size = L; u.half = L * 0.5;
  if (u.model) u.model.scale.setScalar(L);
  if (u.kind === 'artilleria') u.capDef = [[0, 0.28 * L, 0.38 * L, 0, 0.28 * L, -0.38 * L, 0.3 * L]];
  else if (u.kind === 'barco') u.capDef = [[0, 0.11 * L, 0.4 * L, 0, 0.11 * L, -0.4 * L, 0.085 * L], [0, 0.22 * L, 0.15 * L, 0, 0.22 * L, -0.25 * L, 0.06 * L]];
  else if (u.kind === 'superdirigible') { u.capDef = [[0, 0, 0.42 * L, 0, 0, -0.42 * L, 0.07 * L]]; u.half = L * 0.35; }
  else if (u.kind === 'torreta') u.capDef = [[0, 0.3 * L, 0.25 * L, 0, 0.3 * L, -0.25 * L, 0.38 * L]];
  if (u.capDef) unitCaps(u);
}
function updArtilleria(u, dt, P, d) {
  if (u.model) u.model.visible = d < 7000;
  if (u.dead) { wreckSmoke(u, dt, d); return; }
  flashUnit(u, dt); dmgSmoke(u, dt, d, 0.4);
  const S = STATS.artilleria;
  if (state !== 'playing' || holdFire() || d > S.alcance) return;
  u.cool -= dt; if (u.cool > 0) return;
  const L = u.size; _Uf.set(0, 0, -1).applyQuaternion(u.q);
  _Us.copy(u.pos).addScaledVector(_Uf, 0.42 * L); _Us.y += 0.45 * L;            // boca, delante y arriba
  if (!losClear(_Us.x, _Us.y, _Us.z, P.x, P.y, P.z) || !ballisticAim(_Us, Math.max(30, S.vel), deg(S.dispersion), _Ub)) { u.cool = 1; return; }
  const look = u.variant === 'catapulta' ? 'piedra' : u.variant === 'canon' ? 'verde' : 'virote';
  spawnUnitShot(_Us, _Ub, { look, dmg: S.dano, grav: UNIT_G, msg: 'La artillería enemiga te derribó', vol: unitVol(d) });
  const c = SHOT_LOOK[look].c;                                                   // fogonazo y polvo
  emit(fxAdd, _Us.x, _Us.y, _Us.z, 0, 0, 0, 0.2, 4, 12, c[0], c[1], c[2], 1, 0, 0);
  for (let i = 0; i < 8; i++) emit(fxSmoke, _Us.x, _Us.y, _Us.z, _Ub.x * 0.04 + rnd(-3, 3), _Ub.y * 0.04 + rnd(0, 3), _Ub.z * 0.04 + rnd(-3, 3), rnd(1.2, 2.4), 2, 7, 0.5, 0.46, 0.4, 0.5, 1, -1);
  u.cool = rnd(S.pausa_min, Math.max(S.pausa_min, S.pausa_max));
}
/* Restos: explosión, el modelo se queda oscuro y un poco hundido e inclinado, y humea un rato. silent: cae con su unidad (sin explosión). */
function wreckUnit(u, silent) {
  const p = u.bc, k = clamp(u.size / 12, 0.6, 2.5);
  if (!silent) { explode(p.x, p.y + 1, p.z, 1.1 * k); debris(p.x, p.y, p.z); }
  charUnit(u, 1); u.wreckT = 45;
  if (u.model) { u.model.quaternion.copy(u.q).multiply(_Uq.setFromAxisAngle(_Ux, rnd(-0.12, 0.12))).multiply(_Uq2.setFromAxisAngle(_Uz, rnd(-0.18, 0.18))); u.model.position.y -= u.size * 0.06; }
}
function wreckSmoke(u, dt, d) {
  if (u.wreckT <= 0 || d > 2500) return;
  u.wreckT -= dt; u.smokeT -= dt;
  if (u.smokeT > 0) return;
  u.smokeT = 0.25; const p = u.bc, s = clamp(u.size / 12, 0.5, 3), f = clamp(u.wreckT / 45, 0.2, 1);
  emit(fxSmoke, p.x + rnd(-2, 2) * s, p.y + 2 * s, p.z + rnd(-2, 2) * s, rnd(-1, 1), rnd(5, 9), rnd(-1, 1), rnd(3.5, 5), 4 * s, 16 * s * f, 0.12, 0.11, 0.11, 0.5, 0.3, -0.5);
  if (u.wreckT > 20) emit(fxAdd, p.x + rnd(-2, 2) * s, p.y + s, p.z + rnd(-2, 2) * s, 0, rnd(3, 6), 0, 0.6, 3 * s, s, 1, 0.45, 0.1, 0.7, 0.5, 0);
}
function dmgSmoke(u, dt, d, y) {                            // tocado: humo, más cuanto menos vida le queda
  if (u.hp >= u.hpMax || d > 3000) return;
  u.smokeT -= dt * (1.5 - u.hp / u.hpMax);
  if (u.smokeT > 0) return;
  u.smokeT = 0.14; const s = clamp(u.size / 12, 0.5, 6);
  _Ua.copy(u.caps[0].a).lerp(u.caps[0].b, Math.random());
  emit(fxSmoke, _Ua.x + rnd(-1, 1) * s, _Ua.y + y * u.size, _Ua.z + rnd(-1, 1) * s, rnd(-1, 1), rnd(3, 6), rnd(-1, 1), rnd(2, 3.5), 2 * s, 8 * s, 0.16, 0.14, 0.15, 0.5, 0.4, -1);
}

/* ---------- Barco naval ----------
   Como un dirigible, pero en el mar: muere de un proyectil guiado y dispara por los costados (los mismos ángulos muertos a proa, a popa
   y en la vertical). Se mece con las olas. Al hundirse escora, se llena de humo y fuego y se va al fondo. */
function addBarco(x, z, heading, tags) {
  const S = STATS.barco_naval, ang = heading * Math.PI / 180;
  const u = newUnit('barco', { tags: tags || [], label: 'Barco', killText: 'Barco hundido', hp: S.vida, hpMax: S.vida, score: S.puntos, heading: ang,
    modelKey: 'barco', markR: 8500, radar: 'ship', port: 0, crashText: 'un barco', ground: true, upd: updBarco, onKill: u => { u.dieT0 = u.dying = 9; explode(u.bc.x, u.bc.y + 6, u.bc.z, 2); } });
  u.base = new THREE.Vector3(x, WL, z); u.pos.copy(u.base); u.q0 = new THREE.Quaternion().setFromAxisAngle(UP, -ang); u.q.copy(u.q0);
  unitResize(u);
  return u;
}
function updBarco(u, dt, P, d) {
  const L = u.size, t = gameTime + u.ph;
  if (u.dead) {                                             // hundimiento: escora, cabecea y baja; humo, fuego y espuma
    u.dying -= dt; const k = 1 - u.dying / u.dieT0;
    u.pos.copy(u.base); u.pos.y = WL - BARCO_DRAFT * L - k * k * 0.45 * L;
    u.q.copy(u.q0).multiply(_Uq.setFromAxisAngle(_Uz, k * 0.45)).multiply(_Uq2.setFromAxisAngle(_Ux, k * 0.12));
    if (u.model) { u.model.position.copy(u.pos); u.model.quaternion.copy(u.q); charUnit(u, Math.min(1, k * 2)); }
    if (d < 4000 && Math.random() < 0.7) {
      _Ua.set(rnd(-0.08, 0.08) * L, 0.15 * L, rnd(-0.4, 0.4) * L).applyQuaternion(u.q).add(u.pos);
      emit(fxSmoke, _Ua.x, Math.max(_Ua.y, WL + 2), _Ua.z, rnd(-2, 2), rnd(6, 12), rnd(-2, 2), rnd(3, 5), 8, 30, 0.12, 0.11, 0.11, 0.55, 0.3, -0.5);
      if (k < 0.7) emit(fxAdd, _Ua.x, Math.max(_Ua.y, WL + 1), _Ua.z, 0, rnd(4, 9), 0, 0.7, 6, 2, 1, 0.5, 0.12, 0.8, 0.5, 0);
      if (Math.random() < 0.15) splash(u.base.x + rnd(-0.3, 0.3) * L, u.base.z + rnd(-0.3, 0.3) * L, 1.5);
    }
    if (u.dying <= 0) { removeUnitMesh(u); u.gone = true; }
    return;
  }
  u.pos.copy(u.base); u.pos.y = WL - BARCO_DRAFT * L + Math.sin(t * 0.7) * 0.4;   // olas: sube y baja, se balancea y cabecea un poco
  u.q.copy(u.q0).multiply(_Uq.setFromAxisAngle(_Uz, Math.sin(t * 0.55) * 0.025)).multiply(_Uq2.setFromAxisAngle(_Ux, Math.sin(t * 0.42 + 1) * 0.012));
  if (u.model) { u.model.position.copy(u.pos); u.model.quaternion.copy(u.q); u.model.visible = d < 9000; }
  unitCaps(u); flashUnit(u, dt); dmgSmoke(u, dt, d, 0.25);
  const S = STATS.barco_naval;
  broadside(u, dt, P, d, S, 0.09 * L, 0.17 * L, [-0.25, -0.12, 0, 0.12, 0.25].map(z => z * L), 'Los cañones de un barco te derribaron');
}
/* Andanada por el costado que mira al jugador (como los dirigibles): nunca a proa, a popa ni en la vertical. px, py, pz = troneras. */
function broadside(u, dt, P, d, S, px, py, pzs, msg) {
  if (state !== 'playing' || holdFire() || d > S.alcance) return;
  u.cool -= dt; if (u.cool > 0) return;
  _Ud.subVectors(P, u.pos).divideScalar(d || 1);
  _Uf.set(0, 0, -1).applyQuaternion(u.q); _Us.set(1, 0, 0).applyQuaternion(u.q);
  if (Math.abs(_Ud.dot(_Uf)) > Math.cos(deg(S.muerto_proa)) || Math.abs(_Ud.y) > Math.sin(deg(S.muerto_vertical))) { u.cool = 0.15; return; }
  const side = _Ud.dot(_Us) >= 0 ? 1 : -1, pz = pzs[u.port++ % pzs.length];
  _Ua.set(side * px, py, pz).applyQuaternion(u.q).add(u.pos);
  if (!losClear(_Ua.x, _Ua.y, _Ua.z, P.x, P.y, P.z)) { u.cool = 0.6; return; }
  const v = Math.max(50, S.vel);
  _Ub.copy(P).addScaledVector(dragonVel, _Ua.distanceTo(P) / v).sub(_Ua).normalize();
  const sp = deg(S.dispersion); _Ub.x += rnd(-1, 1) * sp; _Ub.y += rnd(-1, 1) * sp; _Ub.z += rnd(-1, 1) * sp; _Ub.normalize().multiplyScalar(v);
  spawnUnitShot(_Ua, _Ub, { look: 'arcano', dmg: S.dano, msg, vol: unitVol(d), life: S.alcance * 1.12 / v });
  for (let i = 0; i < 6; i++) emit(fxAdd, _Ua.x, _Ua.y, _Ua.z, _Us.x * side * rnd(10, 30) + rnd(-6, 6), rnd(-6, 6), _Us.z * side * rnd(10, 30) + rnd(-6, 6), rnd(0.15, 0.3), rnd(4, 7), 1, ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2], 1, 2, 0);
  u.cool = Math.max(0.02, S.cadencia) * rnd(0.85, 1.15);
}

/* ---------- Superdirigible ----------
   Megaestructura del cielo (500 m de largo como mínimo, a 1500 m de altura como mínimo) con 6 torretas por costado (cañones y balistas
   alternos) que se destruyen y se fijan una a una; el núcleo (el casco) también se fija y se daña aparte. Las torretas disparan como los
   cañones de los dirigibles (mismos ángulos muertos), cada una por su costado, y giran hacia el jugador. Al caer el núcleo caen todas. */
function addSuper(x, z, height, heading, tags) {
  const S = STATS.superdirigible, ang = heading * Math.PI / 180;
  const u = newUnit('superdirigible', { tags: tags || [], label: 'Superdirigible', hp: S.vida, hpMax: S.vida, score: S.puntos, heading: ang, modelKey: 'superdirigible',
    markR: 14000, lockRange: 12000, radar: 'super', crashText: 'un superdirigible', upd: updSuper, onKill: superDie });
  u.base = Math.max(groundAt(x, z) + Math.max(height || 0, S.altura_min), WL + S.altura_min);
  u.pos.set(x, u.base, z); u.q0 = new THREE.Quaternion().setFromAxisAngle(UP, -ang); u.q.copy(u.q0);
  unitResize(u);
  const n = clamp(Math.round(S.torretas), 0, SUPER_MOUNTS.length);
  for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
    const variant = i % 2 ? 'balista' : 'canon';
    const t = newUnit('torreta', { tags: tags || [], label: 'Torreta (' + (variant === 'canon' ? 'cañón' : 'balista') + ')', killText: 'Torreta destruida',
      killTail: t => '  ·  quedan ' + t.parent.kids.filter(k => !k.dead).length, hp: S.torreta_vida, hpMax: S.torreta_vida, score: S.torreta_puntos,
      variant, modelKey: variant, parent: u, side, markR: 3500, lockRange: 12000, radar: '', crashText: 'una torreta del superdirigible', onKill: wreckUnit, cool: rnd(0.5, 3) });
    t.local = new THREE.Vector3(side * SUPER_DECK.x, SUPER_DECK.y, -SUPER_MOUNTS[i]);   // (fracción del largo; -: proa hacia -Z)
    t.yaw0 = -side * Math.PI / 2; t.yaw = t.yaw0;
    u.kids.push(t);
    superPlace(u, t); unitResize(t);
  }
  return u;
}
function superPlace(u, t) {                                 // la torreta, en su sitio del casco y girada (yaw) en el plano de la cubierta
  t.pos.copy(t.local).multiplyScalar(u.size).applyQuaternion(u.q).add(u.pos);
  t.q.copy(u.q).multiply(_Uq.setFromAxisAngle(UP, t.yaw));
}
function updSuper(u, dt, P, d) {
  const t = gameTime * 0.25 + u.ph;
  if (!u.jets && u.model) superJets(u);
  if (u.jets) superJetsUpdate(u, dt, d);
  if (u.dead) { superFall(u, dt, d); if (u.upd2) u.upd2(u, dt); return; }             // v31: cae ennegrecido y en llamas, con una estela de humo, y se estrella
  u.pos.y = u.base + Math.sin(t) * 4;                       // vaivén muy lento
  u.q.copy(u.q0).multiply(_Uq.setFromAxisAngle(_Uz, Math.sin(t * 0.8) * 0.01));
  if (u.model) { u.model.position.copy(u.pos); u.model.quaternion.copy(u.q); }
  unitCaps(u); flashUnit(u, dt); dmgSmoke(u, dt, d, 0.02);
  const S = STATS.superdirigible, playing = state === 'playing' && !holdFire();
  _Uf.set(0, 0, -1).applyQuaternion(u.q); _Us.set(1, 0, 0).applyQuaternion(u.q);
  for (const k of u.kids) {
    // giro hacia el jugador (solo en su costado, ±75° de su posición de reposo)
    _Ud.subVectors(P, k.pos); const dk = _Ud.length(); _Ud.divideScalar(dk || 1);
    let want = k.yaw0;
    if (dk < S.alcance * 1.3 && _Ud.dot(_Us) * k.side > 0) {
      const lx = _Ud.dot(_Us), lz = -_Ud.dot(_Uf);          // (ejes del casco: x a estribor, z hacia popa)
      want = k.yaw0 + clamp(wrapAng(Math.atan2(-lx, -lz) - k.yaw0), -1.3, 1.3);
    }
    if (!k.dead) k.yaw += clamp(wrapAng(want - k.yaw), -0.8 * dt, 0.8 * dt);
    superPlace(u, k);
    if (k.model) { k.model.position.copy(k.pos); k.model.quaternion.copy(k.q); }
    unitCaps(k);
    if (k.dead) { wreckSmoke(k, dt, dk); continue; }
    flashUnit(k, dt);
    if (!playing || dk > S.alcance) continue;
    k.cool -= dt; if (k.cool > 0) continue;
    if (Math.abs(_Ud.dot(_Uf)) > Math.cos(deg(S.muerto_proa)) || Math.abs(_Ud.y) > Math.sin(deg(S.muerto_vertical)) || _Ud.dot(_Us) * k.side <= 0) { k.cool = 0.25; continue; }
    const L = k.size; _Ua.set(0, 0, -1).applyQuaternion(k.q);
    _Ub.copy(k.pos).addScaledVector(_Ua, 0.45 * L); _Ub.y += 0.35 * L;
    const v = Math.max(50, S.vel);
    _Uc.copy(P).addScaledVector(dragonVel, _Ub.distanceTo(P) / v).sub(_Ub).normalize();
    const sp = deg(S.dispersion); _Uc.x += rnd(-1, 1) * sp; _Uc.y += rnd(-1, 1) * sp; _Uc.z += rnd(-1, 1) * sp; _Uc.normalize().multiplyScalar(v);
    spawnUnitShot(_Ub, _Uc, { look: k.variant === 'canon' ? 'arcano' : 'virote', dmg: S.dano, msg: 'Las torretas de un superdirigible te derribaron', vol: unitVol(dk), life: S.alcance * 1.12 / v });
    emit(fxAdd, _Ub.x, _Ub.y, _Ub.z, 0, 0, 0, 0.15, 6, 16, ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2], 1, 0, 0);
    k.cool = Math.max(0.05, S.torreta_cadencia) * rnd(0.8, 1.2);
  }
}
function superDie(u) {
  toast('¡Superdirigible abatido!  +' + u.score); camShake = Math.max(camShake, 1.2);
  u.fallT = 0; u.fallV = 0; u.pitch = 0; u.landed = u.sinking = false; u.wreckT = 0; u.trailT = 0; u.rollS = Math.random() < 0.5 ? -1 : 1;
  for (let i = 0; i < 5; i++) { _Ua.copy(u.caps[0].a).lerp(u.caps[0].b, Math.random()); explode(_Ua.x + rnd(-25, 25), _Ua.y + rnd(-15, 15), _Ua.z + rnd(-25, 25), rnd(2, 3.5)); }
}
/* v31 (petición de Jorge): al destruirlo ya no estalla en el aire con tres explosiones de energía: se ennegrece, arde y cae (cada vez más
   deprisa, hasta SUPER_FALL.vmax), con el morro bajando y un leve balanceo, dejando una estela de humo negro (fxTrail, aparte: es muy larga)
   y llamas por el casco; al tocar el suelo con la proa, explosiones a lo largo del casco, polvo y temblor, y los restos se quedan ardiendo
   en el suelo (SUPER_FALL.wreck s de humo). Las torretas caen con él. */
const SUPER_FALL = { g: 7, vmax: 85, pitch: 0.32, pitchRate: 0.035, wreck: 90, sink: 0.5, settle: 0.06, vEnd: 4 };   // m/s², m/s, morro abajo (rad) y su ritmo (rad/s), s de humo en el suelo; v32: hundimiento (abajo)
/* v32 (petición de Jorge): al tocar el suelo ya no se para en seco (lo primero que tocaba era el mástil de abajo o la proa): sigue hundiéndose,
   frenando de su velocidad de caída a vEnd m/s, y la popa baja hasta quedar casi nivelado (settle rad de morro abajo), hasta enterrar en el
   terreno la parte sink del casco (0,5 = la mitad). SUPER_HULL: alto del casco sin los mástiles (fracción del largo, medido en el modelo). */
const SUPER_HULL = [-0.06, 0.045];
const fxTrail = makeParticles(1800, false);
function superFall(u, dt, d) {
  const L = u.size, F_ = SUPER_FALL, c = u.caps[0];
  u.fallT += dt;
  if (u.mats) charUnit(u, Math.min(1, u.fallT / 2));
  if (u.sinking) superSink(u, dt);
  else if (!u.landed) {
    u.fallV = Math.min(F_.vmax, u.fallV + F_.g * dt); u.pos.y -= u.fallV * dt;
    u.pitch = Math.min(F_.pitch, u.pitch + F_.pitchRate * dt);
    superTilt(u, 1);
    // ¿toca el suelo? (la proa, que va por delante y más baja)
    _Ua.set(0, -0.045 * L, -0.48 * L).applyQuaternion(u.q).add(u.pos);
    if (_Ua.y <= groundAt(_Ua.x, _Ua.z)) {
      superCrash(u, _Ua);
      // v32: y se hunde (superSink), frenando con deceleración constante hasta yEnd
      u.sinking = true; u.y0 = u.pos.y; u.p0 = u.pitch; u.fallV = Math.max(u.fallV, 20);
      u.yEnd = Math.min(u.y0, groundAt(u.pos.x, u.pos.z) - (SUPER_HULL[0] + F_.sink * (SUPER_HULL[1] - SUPER_HULL[0])) * L);
      u.sinkA = u.fallV * u.fallV / (2 * Math.max(1, u.y0 - u.yEnd));
    }
  }
  if (!u.landed) {
    // estela de humo negro (de tres puntos del casco) y llamas por todo él
    u.trailT -= dt;
    if (u.trailT <= 0) {
      u.trailT = 0.04;
      for (const k of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        _Ub.copy(c.a).lerp(c.b, k + rnd(-0.1, 0.1)); _Ub.y += rnd(-0.01, 0.03) * L;
        emit(fxTrail, _Ub.x + rnd(-20, 20), _Ub.y, _Ub.z + rnd(-20, 20), rnd(-4, 4), rnd(2, 6), rnd(-4, 4), rnd(10, 14), rnd(45, 65), rnd(170, 250), 0.09, 0.08, 0.08, 0.7, 0.15, -0.4);
      }
    }
    if (d < 12000) for (let i = 0; i < 5; i++) {
      _Ub.copy(c.a).lerp(c.b, Math.random()); _Ud.set(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(c.r * rnd(0.5, 1)); _Ub.add(_Ud);
      emit(fxAdd, _Ub.x, _Ub.y, _Ub.z, _Ud.x * 0.3, u.fallV * 0.6 + rnd(4, 14), _Ud.z * 0.3, rnd(0.4, 0.8), rnd(14, 24), rnd(5, 10), 1, rnd(0.4, 0.65), 0.12, 0.85, 0.4, 0);
    }
    if (Math.random() < dt * 1.8) { _Ub.copy(c.a).lerp(c.b, Math.random()); explode(_Ub.x + rnd(-20, 20), _Ub.y + rnd(-10, 10), _Ub.z + rnd(-20, 20), rnd(1.8, 3)); }
  } else {                                                  // en el suelo: humo y algo de fuego durante un rato
    u.wreckT += dt;
    if (u.wreckT < F_.wreck && d < 9000) {
      u.trailT -= dt;
      if (u.trailT <= 0) {
        u.trailT = 0.12; const f = 1 - u.wreckT / F_.wreck;
        _Ub.copy(c.a).lerp(c.b, Math.random());
        emit(fxTrail, _Ub.x + rnd(-15, 15), Math.max(_Ub.y, groundAt(_Ub.x, _Ub.z)) + 10, _Ub.z + rnd(-15, 15), rnd(-2, 2), rnd(10, 18), rnd(-2, 2), rnd(8, 12), 30 * f + 10, 150 * f + 40, 0.1, 0.09, 0.09, 0.6, 0.2, -0.6);
        if (f > 0.4) emit(fxAdd, _Ub.x + rnd(-15, 15), Math.max(_Ub.y, groundAt(_Ub.x, _Ub.z)) + 5, _Ub.z + rnd(-15, 15), 0, rnd(6, 12), 0, 0.8, 18 * f, 6, 1, 0.5, 0.12, 0.8, 0.5, 0);
      }
    }
  }
  if (u.model) { u.model.position.copy(u.pos); u.model.quaternion.copy(u.q); }
  for (const k of u.kids) { superPlace(u, k); if (k.model) { k.model.position.copy(k.pos); k.model.quaternion.copy(k.q); } unitCaps(k); }
}
/* Morro abajo (u.pitch) y un leve balanceo (wob: 1 cayendo; se apaga al hundirse). */
function superTilt(u, wob) {
  u.q.copy(u.q0).multiply(_Uq.setFromAxisAngle(_Ux, -u.pitch)).multiply(_Uq2.setFromAxisAngle(_Uz, u.rollS * (0.06 * Math.sin(u.fallT * 0.4) * wob + u.pitch * 0.25)));
  unitCaps(u);
}
/* v32: tras el choque, el casco se clava en el suelo: baja frenando (u.sinkA) hasta enterrar la mitad (SUPER_FALL.sink) y la popa cae hasta
   quedar casi nivelado; levanta tierra y polvo a lo largo de la línea donde entra en el suelo. */
function superSink(u, dt) {
  const F_ = SUPER_FALL, L = u.size, span = Math.max(1, u.y0 - u.yEnd);
  u.fallV = Math.max(F_.vEnd, u.fallV - u.sinkA * dt);
  u.pos.y = Math.max(u.yEnd, u.pos.y - u.fallV * dt);
  const k = clamp((u.y0 - u.pos.y) / span, 0, 1);
  u.pitch = lerp(u.p0, F_.settle, k);
  superTilt(u, 1 - k);
  const n = Math.round(clamp(u.fallV / 6, 1, 12));
  for (let i = 0; i < n; i++) {                              // polvo y terrones donde el casco toca el suelo
    _Ub.set(rnd(-0.06, 0.06) * L, 0, rnd(-0.5, 0.5) * L).applyQuaternion(u.q).add(u.pos);
    const gy = groundAt(_Ub.x, _Ub.z), a = Math.random() * 6.283, sp = rnd(10, 40) * (0.4 + u.fallV / 85);
    if (Math.abs(_Ub.y - gy) > 0.1 * L) continue;
    emit(fxSmoke, _Ub.x, gy + rnd(1, 6), _Ub.z, Math.cos(a) * sp, rnd(6, 22), Math.sin(a) * sp, rnd(2.5, 5), rnd(15, 25), rnd(50, 90), 0.42, 0.37, 0.31, 0.6, 0.5, -0.4);
    if (Math.random() < 0.3) emit(fxSmoke, _Ub.x, gy + 2, _Ub.z, Math.cos(a) * sp * 0.6, rnd(18, 40), Math.sin(a) * sp * 0.6, rnd(1.5, 2.5), rnd(3, 6), rnd(2, 4), 0.25, 0.2, 0.16, 1, 0.1, 22);
  }
  if (u.pos.y <= u.yEnd + 0.01) { u.sinking = false; u.landed = true; }
}
/* El choque: explosiones que recorren el casco desde la proa (las lanza superCrashStep), polvo que se abre a ras de suelo y temblor. */
function superCrash(u, at) {
  const d = at.distanceTo(dragon.position);
  camShake = Math.max(camShake, 2.2 * clamp(1 - d / 6000, 0.15, 1));
  sfx.boom(clamp(1.3 - d / 5000, 0.3, 1));
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * 6.283, sp = rnd(30, 120);
    emit(fxSmoke, at.x + rnd(-40, 40), at.y + rnd(2, 12), at.z + rnd(-40, 40), Math.cos(a) * sp, rnd(2, 12), Math.sin(a) * sp, rnd(3, 6), rnd(20, 30), rnd(70, 120), 0.42, 0.37, 0.31, 0.7, 0.6, -0.5);
  }
  u.crashK = 0; u.crashT = 0;
  u.upd2 = superCrashStep;
}
function superCrashStep(u, dt) {
  if (u.crashK > 1) return;
  u.crashT -= dt; if (u.crashT > 0) return;
  u.crashT = 0.12; u.crashK += 0.09;
  _Ua.copy(u.caps[0].b).lerp(u.caps[0].a, Math.min(1, u.crashK));   // (b = proa)
  explode(_Ua.x + rnd(-30, 30), _Ua.y + rnd(-10, 20), _Ua.z + rnd(-30, 30), rnd(3.5, 5.5)); debris(_Ua.x, _Ua.y, _Ua.z);
}
/* v30: chorro de los motores arcanos (petición de Jorge): de cada turbina de popa sale un penacho morado con el núcleo casi blanco, que
   parpadea y fluye hacia atrás (dos conos aditivos con un shader), un brillo en la tobera y unas chispas que salen despedidas. Aunque el
   superdirigible esté quieto. */
let jetRes = null;
function jetResources() {
  if (jetRes) return jetRes;
  const geo = new THREE.CylinderGeometry(0.22, 1, 1, 18, 1, true); geo.rotateX(Math.PI / 2); geo.translate(0, 0, 0.5);   // de z = 0 (tobera, ancho) a z = 1
  const mat = (c, k) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: unitTime, uC: { value: new THREE.Color(c[0], c[1], c[2]) }, uA: { value: 1 }, uK: { value: k } },
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){ vT = position.z; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uC; uniform float uA; uniform float uK; varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){
        float face = abs(dot(normalize(vN), normalize(vV)));
        float flow = 0.7 + 0.3 * sin(vT * 26.0 - uTime * 34.0) * sin(vT * 11.0 - uTime * 19.0 + 1.7);
        float a = pow(1.0 - vT, 1.3) * (0.35 + 0.65 * face) * flow * uA * uK;
        gl_FragColor = vec4(uC * a, 1.0); }`
  });
  jetRes = { geo, outer: mat([0.62, 0.32, 1], 1.8), inner: mat([0.85, 0.8, 1], 2.6) };
  return jetRes;
}
function superJets(u) {
  const R = jetResources(), J = SUPER_JETS;
  u.jets = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group(), outer = new THREE.Mesh(R.geo, R.outer), inner = new THREE.Mesh(R.geo, R.inner);
    outer.scale.set(J.r * 1.05, J.r * 1.05, J.len); inner.scale.set(J.r * 0.6, J.r * 0.6, J.len * 0.5);
    outer.renderOrder = inner.renderOrder = 6; g.add(outer, inner);
    g.position.set(side * J.x, J.y, J.z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: 0xc9a2ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.renderOrder = 7; glow.scale.setScalar(J.r * 3.2); g.add(glow);
    u.model.add(g); u.jets.push({ g, glow, side });
  }
}
function superJetsUpdate(u, dt, d) {
  const J = SUPER_JETS, L = u.size, on = !u.dead, c = ARC_COLOR;
  for (const j of u.jets) {
    j.g.visible = on;
    if (!on) continue;
    j.glow.material.opacity = 0.75 + 0.25 * Math.sin(gameTime * 23 + j.side);
    if (d > 9000 || Math.random() > 0.7) continue;          // chispas: pocas y solo de cerca (comparten las partículas con la llamarada)
    _Ua.set(j.side * J.x + rnd(-0.5, 0.5) * J.r, J.y + rnd(-0.5, 0.5) * J.r, J.z).multiplyScalar(L).applyQuaternion(u.q).add(u.pos);
    _Ub.set(0, 0, 1).applyQuaternion(u.q);
    const v = rnd(60, 140);
    emit(fxAdd, _Ua.x, _Ua.y, _Ua.z, _Ub.x * v + rnd(-6, 6), _Ub.y * v + rnd(-6, 6), _Ub.z * v + rnd(-6, 6), rnd(0.5, 0.9), J.r * L * rnd(0.6, 1), J.r * L * 2.2, lerp(c[0], 1, 0.3), lerp(c[1], 1, 0.3), 1, 0.7, 0.8, 0);
  }
}

/* ---------- Colocación (receta «units», en cada partida desde resetRun) ----------
   RUN.units = [{ type, variant, x, z, heading, height, n, formation, gap, tag, … }] (formato en M1). Cada entrada pone n unidades del
   tipo en formación alrededor de (x, z), mirando al rumbo heading (°). Los dragones quietos de la galería (type 'dragon') salen después,
   en unitsStart (spawnEnemies los reinicia todos). */
const UNIT_GAP = { artilleria: 40, barco: 260, superdirigible: 900, batallon: 90, sierpe: 1500, dragon: 90 };
function formationPts(f, n, gap) {                          // desplazamientos { r (a la derecha), b (hacia atrás) } en m
  const pts = [];
  for (let i = 0; i < n; i++) {
    if (f === 'columna') pts.push({ r: 0, b: (i - (n - 1) / 2) * gap });
    else if (f === 'cuna') { const row = Math.ceil(i / 2); pts.push({ r: (i % 2 ? 1 : -1) * row * gap * 0.7 * (i ? 1 : 0), b: row * gap * 0.7 }); }
    else if (f === 'rejilla') { const c = Math.ceil(Math.sqrt(n)), cx = i % c, cz = Math.floor(i / c); pts.push({ r: (cx - (c - 1) / 2) * gap, b: (cz - (Math.ceil(n / c) - 1) / 2) * gap }); }
    else pts.push({ r: (i - (n - 1) / 2) * gap, b: 0 });   // línea
  }
  return pts;
}
function unitGroupPts(g, fn) {
  const n = g.n || 1, ang = (g.heading || 0) * Math.PI / 180, fx = Math.sin(ang), fz = -Math.cos(ang);
  formationPts(g.formation, n, g.gap || UNIT_GAP[g.type] || 60).forEach((p, i) => fn(g.x - fz * p.r - fx * p.b, g.z + fx * p.r - fz * p.b, i));   // (derecha = (-fz, fx); atrás = -frente)
}
function planUnits() {
  for (const u of UNITS) removeUnitMesh(u);
  UNITS.length = 0; unitState.kills = 0;
  if (typeof arrowsClear === 'function') arrowsClear();
  const R = RUN.units || [];
  R.forEach((g, gi) => {
    const tags = g.tag ? [].concat(g.tag) : [], V = ['balista', 'catapulta', 'canon'];
    if (g.type === 'dragon') return;                       // (unitsStart)
    unitGroupPts(g, (x, z, i) => {
      if (g.type === 'artilleria') addArtilleria(g.variant && g.variant !== 'mixta' ? g.variant : V[i % 3], x, z, g.heading || 0, tags);
      else if (g.type === 'barco') addBarco(x, z, g.heading || 0, tags);
      else if (g.type === 'superdirigible') addSuper(x, z, g.height, g.heading || 0, tags);
      else if (g.type === 'batallon') addBatallon(x, z, g.heading || 0, tags, g.soldiers ? [].concat(g.soldiers)[i % [].concat(g.soldiers).length] : null, (SEED ^ (gi * 7919 + i * 104729)) >>> 0);
      else if (g.type === 'sierpe') addSierpe(x, z, g.height, g.heading || 0, tags, g.mode || 'idle');
      else console.warn('Unidad desconocida en la receta: ' + g.type);
    });
  });
}
/* Tras spawnEnemies: los dragones enemigos quietos (galería: flotan en el sitio con la animación de hover). */
function unitsStart() {
  (RUN.units || []).forEach(g => {
    if (g.type !== 'dragon') return;
    unitGroupPts(g, (x, z) => spawnStatue(x, groundAt(x, z) + (g.height || 150), z, g.heading || 0, g.tag ? [].concat(g.tag) : []));
  });
}
/* Stats nuevas (Excel o panel de pruebas): tamaños y vidas máximas (la vida actual sube o baja en proporción). */
function applyUnitStats() {
  for (const u of UNITS) {
    const S = u.kind === 'artilleria' ? STATS.artilleria : u.kind === 'barco' ? STATS.barco_naval : u.kind === 'superdirigible' ? STATS.superdirigible : null;
    let max = S ? S.vida : u.kind === 'torreta' ? STATS.superdirigible.torreta_vida : u.kind === 'sierpe' ? STATS.sierpe.vida : u.kind === 'hechicero' ? STATS.sierpe.hechicero_vida : u.hpMax;
    if (!u.dead && max !== u.hpMax && u.kind !== 'batallon') { u.hp = u.hp / u.hpMax * max; u.hpMax = max; }
    if (u.kind !== 'batallon' && u.kind !== 'sierpe' && u.kind !== 'hechicero') unitResize(u);
  }
  if (typeof serpentResize === 'function') serpentResize();
}

/* ---------- Cada fotograma ---------- */
function updateUnits(dt) {
  const P = dragon.position;
  for (const u of UNITS) {
    if (u.gone) continue;
    if (!u.model && u.modelKey && unitRes[u.modelKey]) attachModel(u);
    if (!u.parent) u.upd(u, dt, P, u.pos.distanceTo(P));    // (las montadas las mueve su unidad)
  }
  unitTime.value = gameTime;
  if (typeof updateArrows === 'function') updateArrows(dt);
}
