/* ============================================================
   7e. MODO TIERRA (v44): aterrizar, andar y despegar con el Tyrant
   Petición de Jorge: si el dragón llega al suelo despacio (a LAND_SPEED o menos), en vez de chocar y rebotar aterriza solo (clip
   «aterrizar») y pasa a un modo distinto del vuelo y del hover, en el suelo:
   · W/S andan hacia delante y hacia atrás (clip «andar», hacia atrás al revés y más despacio: GROUND_BACK) y A/D giran el dragón
     (GROUND_TURN); quieto, el clip «reposo». Una sola velocidad (GROUND_SPEED): el andar se acelera en proporción a su ritmo natural
     (GR.walkV, medido en el clip: las patas no patinan).
   · El ratón mueve la mira y la cabeza la sigue (hasta donde llega el cuello: updateAim); el cuerpo solo gira con A/D.
   · Solo la llamarada (clic dcho.) y el escudo (R): ni fuego rápido, ni guiadas, ni rayo, ni hover, ni boost, ni esquiva.
   · Espacio: clip «despegar» (se agacha, abre las alas y salta con el primer aletazo) y vuelve al vuelo normal a GROUND_TAKEOFF, con el
     morro algo arriba y un empujón hacia arriba (BUMP.v).
   · Al aterrizar la cámara pasa a 3ª persona y se queda así al despegar (la 1ª, con la C). Al aterrizar y al despegar, el gruñido grabado.
   Cuándo aterriza (canLand): solo con el Tyrant; a LAND_SPEED o menos, sin ir boca abajo ni muy de lado (alabeo < 45°), sin picar (> −25°),
   en suelo seco con menos de LAND_SLOPE° de pendiente. Lo dispara updateFlight: al tocar el suelo (en vez del rebote), un poco antes si va
   bajando hacia él (llegaría en menos de 1 s desde menos de LAND_AGL m) o, en hover, al bajar con S hasta el suelo. Tras despegar, GR.cool s
   sin volver a aterrizar. En esa aproximación final se admite LAND_MARGIN más de velocidad: con el acelerador a 0 y nivelado el dragón va a
   ~190 km/h y, al bajar, acelera solo (probado: a −11° llegaba al suelo a más de 200 km/h y rebotaba).
   Por dentro: updateFlight cede el fotograma a updateGround mientras GR.mode ('land' | 'walk' | 'takeoff'). La altura del dragón en el
   suelo (su origen es el pecho, spine_02) es la del terreno + GR.lift (lo más bajo de las patas en el reposo, medido al cargar); al aterrizar
   y al despegar, nunca por debajo de lo que piden las patas en ese instante del clip (GR.footLand / GR.footTake, tablas medidas al cargar).
   La animación (groundAnim, desde animateHero): GR.G = peso de los clips de tierra (el vuelo, el planeo y el hover se multiplican por
   1 − G en animateTyrant) y, dentro, reposo / andar / aterrizar / despegar.
   ============================================================ */
let GROUND_SPEED = 20 / 3.6, GROUND_BACK = 0.6, GROUND_TURN = 60 * Math.PI / 180, GROUND_TAKEOFF = 150 / 3.6, LAND_SLOPE = 30, LAND_MARGIN = 0.2;   // (Excel, «Tierra»: applyHeroStats)
const LAND_AGL = 14, LAND_RATE = 1.25, LAND_DECEL = 45, LAND_SETTLE = 0.55, TAKE_RATE = 1, GROUND_STEEP = 38, GROUND_BLEND = 6;
/* v45 (aterrizaje_vel pasa a 350 km/h): la frenada dura lo que pida la velocidad (como mucho LAND_DECEL m/s²) y el clip «aterrizar» va a la
   par, más despacio cuanto más deprisa llega (a LAND_RATE como mucho), para tocar el suelo justo al pararse. landTime: s hasta tocarlo. */
const landTime = v => Math.max(GR.touch / LAND_RATE, v / LAND_DECEL);
const GR = { mode: null, t: 0, yaw: 0, v: 0, turn: 0, G: 0, cool: 0, beat: false,
  p0: new THREE.Vector3(), v0: new THREE.Vector3(), y0: 0, q0: new THREE.Quaternion(), n: new THREE.Vector3(0, 1, 0),
  lift: 3.36, walkV: 2.5, touch: 1.45, landEnd: 2.0, footLand: [], footTake: [], rate: 30, landRate: LAND_RATE,
  w: { idle: 0, walk: 0, land: 0, take: 0 } };               // pesos actuales de los clips de tierra (dentro de G)
const _gF = new THREE.Vector3(), _gR = new THREE.Vector3(), _gN = new THREE.Vector3(), _gQ = new THREE.Quaternion(), _gP = new THREE.Vector3();

/* ---------- Al cargar el Tyrant (setupHero) ----------
   Acciones de los clips de tierra y medidas: altura del pecho sobre el suelo de pie (GR.lift), velocidad natural del andar (GR.walkV: lo que
   retroceden las patas apoyadas por segundo), instante en que toca el suelo al aterrizar (GR.touch) y lo más bajo de las patas a lo largo de
   «aterrizar» y «despegar» (GR.footLand, GR.footTake: cada 1/GR.rate s). Deja todos los huesos en su pose de reposo. */
function groundSetup(gltf) {
  const clip = n => gltf.animations.find(c => c.name === n);
  const cI = clip('idle'), cW = clip('walk'), cL = clip('land'), cT = clip('takeoff');
  if (!cI || !cW || !cL || !cT) { console.warn('El modelo no trae los clips de tierra: el dragón no podrá aterrizar'); return; }
  const M = hero.mixer, A = hero.act;
  A.gIdle = M.clipAction(cI); A.gWalk = M.clipAction(cW); A.gLand = M.clipAction(cL); A.gTake = M.clipAction(cT);
  [cW, cL, cT].forEach(c => c.tracks.forEach(t => hero.animated.add(t.name.split('.')[0])));
  dragon.updateMatrixWorld(true);
  const feetMin = () => {                                  // lo más bajo de las patas, en ejes del dragón (m)
    hero.model.updateMatrixWorld(true); let m = Infinity;
    hero.model.traverse(o => { if (o.isBone && /^(foot|ball|toe)/.test(o.name)) { o.getWorldPosition(_gP); dragon.worldToLocal(_gP); m = Math.min(m, _gP.y); } });
    return m;
  };
  const pose = (a, t) => { for (const x of Object.values(A)) x.setEffectiveWeight(0); a.play(); a.setEffectiveWeight(1); a.time = t; M.update(0); };
  pose(A.gIdle, 0); GR.lift = -feetMin() + 0.1;
  // andar: lo que retroceden las patas mientras están apoyadas (a menos de 0,15 m de lo más bajo que llegan)
  const N = 96, tr = ['ball_l', 'ball_r', 'hand_l', 'hand_r'].filter(b => hero.B[b]).map(b => ({ b: hero.B[b], y: [], z: [] }));
  for (let k = 0; k <= N; k++) { pose(A.gWalk, cW.duration * k / N); hero.model.updateMatrixWorld(true); for (const c of tr) { c.b.getWorldPosition(_gP); dragon.worldToLocal(_gP); c.y.push(_gP.y); c.z.push(_gP.z); } }
  let dist = 0, tt = 0;
  for (const c of tr) { const mn = Math.min(...c.y); for (let k = 1; k <= N; k++) if (c.y[k] < mn + 0.15 && c.y[k - 1] < mn + 0.15) { dist += c.z[k] - c.z[k - 1]; tt += cW.duration / N; } }
  if (tt > 0 && dist > 0) GR.walkV = dist / tt;
  // aterrizar y despegar: lo más bajo de las patas en cada instante; toca el suelo cuando llega a la altura de estar de pie
  GR.footLand = []; GR.footTake = []; GR.touch = 0;
  for (let k = 0; k <= Math.ceil(cL.duration * GR.rate); k++) { pose(A.gLand, Math.min(cL.duration, k / GR.rate)); const m = feetMin(); GR.footLand.push(m); if (!GR.touch && m <= -GR.lift + 0.2) GR.touch = k / GR.rate; }
  if (!GR.touch) GR.touch = cL.duration * 0.45;
  GR.landEnd = Math.min(cL.duration, GR.touch + LAND_SETTLE);
  for (let k = 0; k <= Math.ceil(cT.duration * GR.rate); k++) { pose(A.gTake, Math.min(cT.duration, k / GR.rate)); GR.footTake.push(feetMin()); }
  for (const a of [A.gIdle, A.gWalk, A.gLand, A.gTake]) { a.setEffectiveWeight(0); a.stop(); }
  restorePose0();
}
/* Lo más bajo de las patas en el instante t de una tabla (interpolado). */
function footAt(tab, t) {
  if (!tab.length) return -GR.lift;
  const x = clamp(t * GR.rate, 0, tab.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < tab.length ? lerp(tab[i], tab[i + 1], f) : tab[i];
}

/* ---------- Cuándo aterriza ---------- */
const groundReady = () => !!(hero.ready && hero.act.gLand && !alt.D);   // (solo el Tyrant)
function canLand(pos, q, approach) {
  if (!groundReady() || GR.mode || GR.cool > 0 || cine.on || state !== 'playing' || F.speed > LAND_SPEED * (approach ? 1 + LAND_MARGIN : 1)) return false;
  _gF.set(0, 0, -1).applyQuaternion(q); _gR.set(1, 0, 0).applyQuaternion(q); _gN.set(0, 1, 0).applyQuaternion(q);
  if (_gF.y < -0.42 || _gN.y <= 0 || Math.abs(Math.atan2(_gR.y, _gN.y)) > Math.PI / 4) return false;   // picando, boca abajo o muy de lado
  // dónde se posa: un poco más adelante (lo que avanza mientras frena)
  _gP.copy(dragonVel).setY(0); _gP.multiplyScalar(landTime(_gP.length()) / 2).add(pos);
  for (const p of [pos, _gP]) if (heightAt(p.x, p.z) < WL + 0.3 || terrainNormal(p.x, p.z, _gN).y < Math.cos(LAND_SLOPE * Math.PI / 180)) return false;
  return true;
}

/* ---------- Aterrizar ---------- */
function landStart() {
  const p = dragon.position, q = dragon.quaternion;
  GR.mode = 'land'; GR.t = 0; GR.beat = false;
  GR.p0.copy(p); GR.y0 = p.y; GR.q0.copy(q);
  GR.v0.copy(dragonVel).setY(0); if (GR.v0.length() > LAND_SPEED * (1 + LAND_MARGIN)) GR.v0.setLength(LAND_SPEED * (1 + LAND_MARGIN));
  GR.landRate = GR.touch / landTime(GR.v0.length());           // (v45: ritmo del clip, para tocar el suelo al pararse)
  _gF.set(0, 0, -1).applyQuaternion(q); _gF.y = 0; if (_gF.lengthSq() < 1e-4) _gF.set(0, 1, 0).applyQuaternion(q).setY(0);
  GR.yaw = Math.atan2(-_gF.x, -_gF.z); GR.v = 0; GR.turn = 0;
  terrainNormal(p.x, p.z, GR.n);
  F.third = true;                                          // (Jorge: al aterrizar, 3ª persona; se queda al despegar)
  F.hover = false; F.hvy = 0; F.sink = 0; F.boosting = false; F.straight = false; F.rate.p = F.rate.y = F.rate.r = 0; F.bank = 0;
  W.lmb = false; W.lockArmed = false; dodgeReset(); bumpReset();
  const a = hero.act.gLand; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = GR.landRate; a.setEffectiveWeight(0); a.play();
  for (const b of [hero.act.gIdle, hero.act.gWalk]) { b.reset(); b.setLoop(THREE.LoopRepeat, Infinity); b.clampWhenFinished = false; b.timeScale = 1; b.setEffectiveWeight(0); b.play(); }
  hero.act.gTake.stop();
  GR.w.idle = GR.w.walk = GR.w.take = 0; GR.w.land = 0;
  sfx.growl();
}
/* Cuaternión del dragón en el suelo: rumbo GR.yaw, apoyado en el plano de normal n. */
function groundQuat(n, out) {
  _gF.set(-Math.sin(GR.yaw), 0, -Math.cos(GR.yaw));
  _gF.addScaledVector(n, -_gF.dot(n)).normalize();
  return out.setFromRotationMatrix(_m4.lookAt(ZERO, _gF, n));
}
/* Normal del suelo bajo el cuerpo: plano por cuatro puntos (5 m por delante y por detrás, 3 a los lados), no la del punto. */
function bodyNormal(x, z, out) {
  const fx = -Math.sin(GR.yaw), fz = -Math.cos(GR.yaw), a = 5, b = 3;
  const hF = heightAt(x + fx * a, z + fz * a), hB = heightAt(x - fx * a, z - fz * a), hL = heightAt(x + fz * b, z - fx * b), hR = heightAt(x - fz * b, z + fx * b);
  _gF.set(fx * 2 * a, hF - hB, fz * 2 * a); _gR.set(-fz * 2 * b, hR - hL, fx * 2 * b);   // (delante y derecha a lo largo del suelo)
  return out.crossVectors(_gR, _gF).normalize();
}
/* ¿Se puede pisar (x, z)? Ni agua, ni pendientes de más de GROUND_STEEP°, ni torres, ni unidades con colisión. */
function groundBlocked(x, z) {
  const h = heightAt(x, z);
  if (h < WL + 0.3 || terrainNormal(x, z, _gN).y < Math.cos(GROUND_STEEP * Math.PI / 180)) return true;
  for (const t of towers.values()) if (!t.dead && (x - t.x) ** 2 + (z - t.z) ** 2 < (TOWER_R + 7) ** 2) return true;
  return !!unitPointHit(_gP.set(x, h + GR.lift * 0.7, z), 1.1);
}

/* ---------- Cada fotograma en tierra (lo llama updateFlight) ---------- */
function updateGround(dt) {
  const p = dragon.position, q = dragon.quaternion;
  GR.t += dt;
  F.hoverK = Math.max(0, F.hoverK - dt * 3);
  if (GR.mode === 'land') {
    // frena hasta pararse justo al tocar el suelo, baja hasta él (nunca con las patas por debajo) y se endereza sobre el terreno
    const T = GR.touch / GR.landRate, t = Math.min(GR.t, T), u = t / T;
    const s = t - t * t / (2 * T);
    p.x = GR.p0.x + GR.v0.x * s; p.z = GR.p0.z + GR.v0.z * s;
    const h = heightAt(p.x, p.z), ct = Math.min(GR.t, T) * GR.landRate + Math.max(0, GR.t - T) * LAND_RATE;   // (tras tocar el suelo, el asentamiento a su ritmo)
    if (GR.t >= T) hero.act.gLand.timeScale = LAND_RATE;
    p.y = Math.max(lerp(GR.y0, h + GR.lift, u * u * (3 - 2 * u)), h - footAt(GR.footLand, ct) + 0.1);
    GR.n.lerp(bodyNormal(p.x, p.z, _gN), 1 - Math.exp(-dt * 6)).normalize();
    q.copy(GR.q0).slerp(groundQuat(GR.n, _gQ), smooth(0, 0.7, u));
    dragonVel.copy(GR.v0).multiplyScalar(1 - u);
    F.speed = GR.v0.length() * (1 - u);
    if (ct >= GR.landEnd) { GR.mode = 'walk'; GR.t = 0; toast('EN TIERRA  ·  W/S andar  ·  A/D girar  ·  Espacio despegar'); }
  } else if (GR.mode === 'walk') {
    if (cine.on) { takeoffStart(); return; }               // (una entrada de cine en pleno capítulo: al aire)
    const fw = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), tn = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    const vt = fw > 0 ? GROUND_SPEED : fw < 0 ? -GROUND_SPEED * GROUND_BACK : 0;
    GR.v += (vt - GR.v) * (1 - Math.exp(-dt * 3));
    GR.turn += (tn * GROUND_TURN - GR.turn) * (1 - Math.exp(-dt * 5));
    GR.yaw += GR.turn * dt;
    const fx = -Math.sin(GR.yaw), fz = -Math.cos(GR.yaw), nx = p.x + fx * GR.v * dt, nz = p.z + fz * GR.v * dt;
    if (Math.abs(GR.v) > 0.01 && groundBlocked(nx + fx * 6 * Math.sign(GR.v), nz + fz * 6 * Math.sign(GR.v))) GR.v = 0;   // (6 m por delante: el morro, o la cola al ir hacia atrás)
    else { p.x = nx; p.z = nz; }
    const h = heightAt(p.x, p.z);
    p.y += (h + GR.lift - p.y) * (1 - Math.exp(-dt * 14));
    GR.n.lerp(bodyNormal(p.x, p.z, _gN), 1 - Math.exp(-dt * 6)).normalize();
    groundQuat(GR.n, q);
    dragonVel.set(fx * GR.v, 0, fz * GR.v);
    F.speed = Math.abs(GR.v); F.rate.y = GR.turn;
  } else if (GR.mode === 'takeoff') {
    // se agacha y salta: sube lo que piden las patas del clip (para no hundirlas) y, desde el salto, un poco más deprisa cada vez
    const ct = GR.t * TAKE_RATE, dur = hero.act.gTake.getClip().duration, h = heightAt(p.x, p.z);
    p.y = Math.max(h + GR.lift, h - footAt(GR.footTake, ct) + 0.1) + 3.5 * smooth(dur * 0.6, dur, ct) ** 2;
    groundQuat(GR.n, q); dragonVel.set(0, 0, 0); F.speed = 0;
    if (!GR.beat && ct > dur * 0.7) { GR.beat = true; sfx.wingBeat(1, lerp(1, 0.7, dragonAnim.cam), 0.02); camShake = Math.max(camShake, 0.25); }   // (el primer aletazo)
    if (ct >= dur) takeoffEnd();
  }
}

/* ---------- Despegar (Espacio) ---------- */
function takeoffStart() {
  if (GR.mode !== 'walk') return;
  GR.mode = 'takeoff'; GR.t = 0; GR.beat = false; GR.v = 0; GR.turn = 0;
  const a = hero.act.gTake; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = TAKE_RATE; a.setEffectiveWeight(GR.w.take); a.play();
  sfx.growl();
}
function takeoffEnd() {
  const q = dragon.quaternion;
  GR.mode = null; GR.cool = 1.5;
  _gF.set(-Math.sin(GR.yaw), Math.tan(12 * Math.PI / 180), -Math.cos(GR.yaw)).normalize();   // morro 12° arriba
  q.setFromRotationMatrix(_m4.lookAt(ZERO, _gF, UP));
  F.aimWorld.copy(_gF); F.steer.set(0, 0, -1); F.pdx = F.pdy = 0; F.rate.p = F.rate.y = F.rate.r = 0; F.bank = 0;
  F.speed = GROUND_TAKEOFF; F.prevSpeed = F.speed; F.sink = 0; F.throttle = Math.max(F.throttle, 0.6); F.hover = false; F.hoverK = 0;
  BUMP.v.set(0, 9, 0);                                     // (el empujón del salto, que se apaga en ~1 s)
}
/* Fuera del modo tierra al instante (reaparecer, reintentar, menú). */
function groundReset() {
  GR.mode = null; GR.G = 0; GR.cool = 0; GR.v = GR.turn = 0;
  for (const k in GR.w) GR.w[k] = 0;
  for (const a of [hero.act.gIdle, hero.act.gWalk, hero.act.gLand, hero.act.gTake]) if (a) { a.setEffectiveWeight(0); a.stop(); }
}

/* Lo más alto de las copas de los árboles a menos de r m de (x, z) (−Infinity si no hay): los árboles salen de una rejilla fija (makeTrees, 06),
   así que se rehacen aquí las mismas cuentas (posición, si hay árbol, escala y alto: el pino mide ~9,1 m y el frondoso ~7,3 m antes de escalar). */
function canopyTop(x, z, r) {
  let top = -Infinity; const gi0 = Math.round(x / TREE_CELL), gj0 = Math.round(z / TREE_CELL);
  for (let gj = gj0 - 1; gj <= gj0 + 1; gj++) for (let gi = gi0 - 1; gi <= gi0 + 1; gi++) {
    const tx = (gi + hash2(gi, gj, 1)) * TREE_CELL, tz = (gj + hash2(gi, gj, 2)) * TREE_CELL, sc = 0.8 + hash2(gi, gj, 5) * 0.95;
    if ((tx - x) ** 2 + (tz - z) ** 2 > (r + 3 * sc) ** 2) continue;
    terrain(tx, tz, _o, true);
    if (_o.forest < 0.05 || hash2(gi, gj, 3) > _o.forest * 0.78) continue;
    const y = heightAt(tx, tz); if (y < 3) continue;
    const conif = hash2(gi, gj, 4) < 0.22 + smooth(60, 280, y) * 0.7;
    top = Math.max(top, y + (conif ? 9.1 : 7.3) * sc * (0.9 + hash2(gi, gj, 6) * 0.35));
  }
  return top;
}

/* ---------- Animación (animateHero, antes de animateTyrant) ----------
   G sube a 1 al empezar a aterrizar y baja a 0 al acabar el despegue (en GROUND_BLEND⁻¹ s); dentro, aterrizar al principio, despegar al final
   y, en medio, reposo y andar según lo que anda o gira (el andar va a su ritmo: GR.v / GR.walkV; hacia atrás, al revés; girando en el sitio,
   a medio ritmo). Devuelve G. */
function groundAnim(dt) {
  if (!hero.act.gLand) return 0;
  GR.cool = Math.max(0, GR.cool - dt);
  const k = 1 - Math.exp(-dt * GROUND_BLEND), A = hero.act;
  GR.G += ((GR.mode ? 1 : 0) - GR.G) * (GR.mode === 'land' && GR.t < 0.4 ? 1 - Math.exp(-dt * 9) : k);
  if (GR.G < 0.002 && !GR.mode) {                          // (despegue acabado: fuera los clips de tierra)
    if (GR.w.take + GR.w.idle + GR.w.walk + GR.w.land > 0) { GR.G = 0; for (const k in GR.w) GR.w[k] = 0; for (const a of [A.gIdle, A.gWalk, A.gLand, A.gTake]) { a.setEffectiveWeight(0); a.stop(); } }
    return 0;
  }
  let tl = 0, tt = 0, ti = 0, tw = 0;
  const move = Math.abs(GR.v) / GROUND_SPEED, turn = Math.abs(GR.turn) / GROUND_TURN;
  if (GR.mode === 'land') { const T = GR.touch / GR.landRate, ct = Math.min(GR.t, T) * GR.landRate + Math.max(0, GR.t - T) * LAND_RATE; tl = 1 - smooth(GR.landEnd - 0.25, GR.landEnd + 0.15, ct); ti = 1 - tl; }
  else if (GR.mode === 'takeoff' || !GR.mode) tt = 1;
  else { tw = clamp(Math.max(move, turn * 0.8), 0, 1); ti = 1 - tw; }
  const w = GR.w;
  w.land += (tl - w.land) * k; w.take += (tt - w.take) * (GR.mode === 'takeoff' ? 1 - Math.exp(-dt * 10) : k);
  w.idle += (ti - w.idle) * k; w.walk += (tw - w.walk) * k;
  const sum = w.land + w.take + w.idle + w.walk || 1, G = GR.G;
  A.gLand.setEffectiveWeight(G * w.land / sum); A.gTake.setEffectiveWeight(G * w.take / sum);
  A.gIdle.setEffectiveWeight(G * w.idle / sum); A.gWalk.setEffectiveWeight(G * w.walk / sum);
  A.gWalk.timeScale = Math.abs(GR.v) > 0.05 ? GR.v / GR.walkV : 0.5 * turn * GROUND_SPEED / GR.walkV;
  return G;
}
