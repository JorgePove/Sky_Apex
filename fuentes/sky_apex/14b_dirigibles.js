
/* ============================================================
   6c. DIRIGIBLES ENEMIGOS (v21)
   Barcos voladores quietos en el aire (con un leve vaivén), repartidos por la misión entre AIRSHIP_ALT m sobre el suelo (receta:
   airships; los coloca planAirships en cada partida, como planTowers las torres). Modelo: modelos/dirigible.glb, «Airship» de Shinsin
   (Sketchfab, CC-BY 4.0), preparado en Blender con herramientas/blender/dirigible/02_preparar.py (una malla con color por vértice, proa
   hacia -Z, 20,6 m de eslora que el juego escala a AIRSHIP_LEN).
   · Armas: a menos de AIRSHIP_RANGE disparan ráfagas continuas de proyectiles arcanos (sin pausa, más lentas que las de las torres y
     con poco daño), pero solo por los costados: con el jugador a proa o a popa (a menos de AIRSHIP_ARC del eje) o casi en su vertical
     (más de AIRSHIP_ELEV) no pueden apuntarle. Por eso conviene atacarlos de frente o por detrás.
   · Vida: AIRSHIP_HP. Al llegar a 0, AIRSHIP_DIE s de agonía (destellos y chispas de energía por el casco) y una explosión de energía
     (airshipBlast: destello, esfera de choque, onda, relámpagos y esquirlas) en la que desaparecen.
   · Impactos: el casco es una cápsula (AIRSHIP_HULL) a lo largo del eje; airshipSegDist2 sirve para proyectiles, llamarada y rayo.
   ============================================================ */
const AIRSHIP_LEN = 95;                  // eslora en el juego (m)
const AIRSHIP_MODEL_LEN = 20.57;         // eslora del modelo (m): la escala es AIRSHIP_LEN / AIRSHIP_MODEL_LEN
/* v24: los valores de balance (con let) salen del Excel, pestaña «Dirigible» (7c: applyStats). */
let AIRSHIP_HP = 50;                     // vida
let AIRSHIP_SCORE = 200;                 // puntos
const AIRSHIP_ALT = [500, 1000];         // altura sobre el suelo (m) por defecto
const AIRSHIP_ZONE = [1500, 7000];       // anillo alrededor del punto de partida donde se reparten (m) por defecto
const AIRSHIP_GAP = 900;                 // separación mínima entre dos (m)
let AIRSHIP_RANGE = 2000;                // alcance de los cañones (m) (v22: antes 1000)
let AIRSHIP_ARC = 35 * Math.PI / 180;    // ángulo muerto a proa y a popa, desde el eje: ahí no pueden disparar
let AIRSHIP_ELEV = 70 * Math.PI / 180;   // por encima (o por debajo) de esta elevación tampoco: los cañones van en los costados
let AIRSHIP_RATE = 0.3;                  // s entre disparos, sin pausas (las torres: ráfagas de 5 cada 0,12 s y 2-3,6 s de pausa)
let AIRSHIP_DMG = 2, AIRSHIP_SHOT_SPEED = 800, AIRSHIP_SHOT_LIFE = 2.8, AIRSHIP_SPREAD = 0.03;   // daño, m/s, vida (s: llega algo más allá del alcance) y dispersión (rad) de cada proyectil
const AIRSHIP_DRAW = 8500;               // más lejos no se dibujan (la niebla ya los oculta)
const AIRSHIP_DIE = 0.45;                // s de agonía antes de la explosión
const AIRSHIP_HULL = { y: 0.6, z0: 7.5, z1: -5.5, r: 5.2 };                 // cápsula del casco en unidades del modelo (popa +z, proa -z)
const AIRSHIP_PORTS = { x: 4.6, y: -1.0, z: [-3.5, -1.5, 0.5, 2.5, 4.5] };   // troneras de cada costado (unidades del modelo)
const AIRSHIP_K = AIRSHIP_LEN / AIRSHIP_MODEL_LEN;

const airships = [];                     // los de la partida (vivos, en agonía o ya desaparecidos)
const airshipState = { kills: 0 };
let airshipRes = null;                   // { geo, mat } cuando ha cargado el modelo
const _Aq = new THREE.Quaternion(), _Az = new THREE.Vector3(0, 0, 1), _Ad = new THREE.Vector3(), _Af = new THREE.Vector3(), _As = new THREE.Vector3();
const _Ap = new THREE.Vector3(), _Ai = new THREE.Vector3(), _Ah = new THREE.Vector3();

/* Modelo: el color por vértice del glTF es lineal (Blender lo guarda en enteros de 16 bits normalizados) y el juego pinta sin corrección
   de gamma (como las torres): se pasa a sRGB, en coma flotante, al cargar. */
function loadAirships() {
  return loadGLB('dirigible-glb', '../modelos/dirigible.glb').then(g => {
    let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    const geo = src.geometry, col = geo.attributes.color;
    if (col) {
      const max = !col.normalized ? 1 : col.array instanceof Uint8Array ? 255 : 65535, out = new Float32Array(col.count * 3);
      for (let i = 0; i < col.count; i++) { out[i * 3] = Math.pow(col.getX(i) / max, 1 / 2.2); out[i * 3 + 1] = Math.pow(col.getY(i) / max, 1 / 2.2); out[i * 3 + 2] = Math.pow(col.getZ(i) / max, 1 / 2.2); }
      geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
    }
    airshipRes = { geo, mat: new THREE.MeshLambertMaterial({ vertexColors: !!col, side: THREE.DoubleSide, emissive: 0x000000 }) };
    for (const a of airships) if (!a.gone && !a.mesh) airshipMesh(a);
  }).catch(err => console.error('No se pudo cargar el dirigible:', err));
}
function airshipMesh(a) {
  a.mat = airshipRes.mat.clone();
  a.mesh = new THREE.Mesh(airshipRes.geo, a.mat); a.mesh.scale.setScalar(AIRSHIP_K);
  a.mesh.position.copy(a.pos); a.mesh.quaternion.copy(a.q);
  scene.add(a.mesh);
}
function removeAirshipMesh(a) {
  if (a.mesh) { scene.remove(a.mesh); a.mat.dispose(); a.mesh = a.mat = null; }
}

/* ---------- Colocación (en cada partida, desde resetRun) ----------
   RUN.airships (de la receta): primero los fijos (sites: { x, z, height, heading, tag }), luego los que falten hasta total, al azar en
   el anillo zone alrededor del punto de partida, dentro del área de la misión y separados AIRSHIP_GAP. Mismo reparto con la misma
   semilla del mundo, salvo random: true. Si el casco cae dentro de una isla flotante, se sube por encima. */
function planAirships() {
  for (const a of airships) removeAirshipMesh(a);
  airships.length = 0; airshipState.kills = 0;
  const R = RUN.airships; if (!R) return;
  const rand = R.random ? Math.random : seededRandom(SEED ^ 0xa1e5), [cx, cz] = R.center || [0, 0];
  const alt = () => lerp(R.alt[0], R.alt[1], rand());
  if (R.fleet) { planFleet(R, rand, alt); return; }       // v23: flota en movimiento
  R.sites.forEach((s, i) => addAirship('F' + i, s.x, s.z, s.height != null ? s.height : alt(), s.heading != null ? s.heading : rand() * 360, s.tag ? [].concat(s.tag) : R.tags));
  for (let k = 0; airships.length < R.total && k < 600; k++) {
    const ang = rand() * Math.PI * 2, r = Math.sqrt(lerp(R.zone[0] ** 2, R.zone[1] ** 2, rand())), h = alt(), hd = rand() * 360;
    const x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
    if (!inMissionArea(x, z, 700) || airships.some(a => Math.hypot(a.pos.x - x, a.pos.z - z) < AIRSHIP_GAP)) continue;
    addAirship('A' + airships.length, x, z, h, hd, R.tags);
  }
}
function addAirship(id, x, z, height, heading, tags) {
  let y = Math.max(heightAt(x, z), WL) + height;
  const ang = heading * Math.PI / 180, fx = Math.sin(ang), fz = -Math.cos(ang), half = AIRSHIP_LEN * 0.5;
  for (let i = 0; i < 6; i++) {                             // dentro de una isla (proa, centro o popa): por encima de ella
    const isl = islandsInRange(x, z, half + 400).find(s => [-1, 0, 1].some(u => insideIsland(s, x + fx * half * u, y, z + fz * half * u, AIRSHIP_HULL.r * AIRSHIP_K + 30)));
    if (!isl) break; y = isl.yMax + AIRSHIP_HULL.r * AIRSHIP_K + 60;
  }
  const a = {
    kind: 'airship', id, tags: tags || [], pos: new THREE.Vector3(x, y, z), vel: ZERO, base: y, heading: ang,
    q: new THREE.Quaternion().setFromAxisAngle(UP, -ang), hp: AIRSHIP_HP, dead: false, dying: 0, gone: false,
    cool: rnd(0.4, 1.2), port: 0, hitFlash: 0, smokeT: 0, sndT: -9, ph: Math.random() * 6.283,
    r: AIRSHIP_HULL.r * AIRSHIP_K, ca: new THREE.Vector3(), cb: new THREE.Vector3(), mesh: null, mat: null
  };
  airshipAxis(a);
  if (airshipRes) airshipMesh(a);
  airships.push(a);
  return a;
}
/* v23: flota (receta: airships.fleet { x, z, heading, speed, gap }): total dirigibles con el mismo rumbo y a speed km/h. El de cabeza va en
   (x, z); los demás, detrás o a su altura y a los lados (como mucho FLEET_SPAN), cada uno a entre gap[0] y gap[1] m de otro y nunca a
   menos de gap[0] de ninguno. Cada uno vuela a su altitud (alt: sobre el agua, como la ALTITUD del HUD) y solo sube si delante hay
   terreno a menos de FLEET_CLEAR o una isla; luego vuelve a bajar a su altitud. */
const FLEET_SPAN = { back: 1800, side: 900 };              // fondo y medio ancho máximos de la formación (m)
const FLEET_CLEAR = 150;                                   // distancia mínima al suelo (m)
const AIRSHIP_CLIMB = [6, 12];                             // m/s al bajar y al subir
function planFleet(R, rand, alt) {
  const F = R.fleet, gap = F.gap || [300, 600], ang = F.heading * Math.PI / 180, fx = Math.sin(ang), fz = -Math.cos(ang), v = (F.speed || 100) / 3.6;
  const pts = [{ u: 0, w: 0 }];                            // u: hacia delante (≤ 0), w: a la derecha (m)
  for (let k = 0; pts.length < R.total && k < 4000; k++) {
    const b = pts[Math.floor(rand() * pts.length)], t = rand() * Math.PI * 2, d = lerp(gap[0], gap[1], rand());
    const u = b.u + Math.cos(t) * d, w = b.w + Math.sin(t) * d;
    if (u > 0 || u < -FLEET_SPAN.back || Math.abs(w) > FLEET_SPAN.side || pts.some(p => Math.hypot(p.u - u, p.w - w) < gap[0])) continue;
    pts.push({ u, w });
  }
  pts.forEach((p, i) => {
    const a = addAirship('V' + i, F.x + fx * p.u - fz * p.w, F.z + fz * p.u + fx * p.w, 0, F.heading, R.tags);
    a.vel = new THREE.Vector3(fx * v, 0, fz * v); a.alt = WL + alt();
    a.cruise = a.base = a.pos.y = airshipCruiseY(a); a.cruiseT = 0; airshipAxis(a);
  });
}
/* Altura de crucero de un dirigible que avanza: su altitud, salvo que el suelo de debajo o de delante (hasta 1,2 km) quede a menos de
   FLEET_CLEAR o que se cruce una isla en su camino: entonces, por encima. Al bajar se comprueba todo el tramo entre la altura actual y la
   nueva (si no, tras pasar una montaña bajaría a través de una isla). */
const FLEET_LOOK = [0, 300, 600, 900, 1200], FLEET_HULL = [-1.2, -0.6, 0, 0.5, 1, 2, 4, 7, 10, 13];   // (m por delante; esloras por delante)
function islandInSpan(s, x, z, y0, y1, m) {               // ¿la isla s ocupa (x, z) en algún punto entre las alturas y0 e y1?
  const lo = Math.max(y0, s.yMin - m), hi = Math.min(y1, s.yMax + m);
  for (let y = lo; y <= hi; y += 25) if (insideIsland(s, x, y, z, m)) return true;
  return false;
}
function airshipCruiseY(a) {
  const l = Math.hypot(a.vel.x, a.vel.z) || 1, fx = a.vel.x / l, fz = a.vel.z / l;
  let g = 0; for (const d of FLEET_LOOK) g = Math.max(g, groundAt(a.pos.x + fx * d, a.pos.z + fz * d));
  let y = Math.max(a.alt, g + FLEET_CLEAR);
  const isls = islandsInRange(a.pos.x, a.pos.z, 1500), top = Math.max(y, a.base || y);
  for (let i = 0; i < 4; i++) {
    const s = isls.find(s => s.yMax + a.r + 60 > y && FLEET_HULL.some(u => islandInSpan(s, a.pos.x + fx * AIRSHIP_LEN * u, a.pos.z + fz * AIRSHIP_LEN * u, y, Math.max(top, y), a.r + 40)));
    if (!s) break; y = s.yMax + a.r + 60;
  }
  return y;
}
/* Extremos de la cápsula del casco en el mundo (se mueven con el vaivén). */
function airshipAxis(a) {
  a.ca.set(0, AIRSHIP_HULL.y, AIRSHIP_HULL.z0).multiplyScalar(AIRSHIP_K).applyQuaternion(a.q).add(a.pos);
  a.cb.set(0, AIRSHIP_HULL.y, AIRSHIP_HULL.z1).multiplyScalar(AIRSHIP_K).applyQuaternion(a.q).add(a.pos);
}
/* Distancia² del segmento p→q al eje del casco (deja en _sdc el punto de p→q más cercano: el del impacto). */
function airshipSegDist2(a, p, q) { return segSegDist2(p, q, a.ca, a.cb); }
function airshipPointDist2(a, p) {
  _Ah.subVectors(a.cb, a.ca); const t = clamp(_Ai.subVectors(p, a.ca).dot(_Ah) / _Ah.lengthSq(), 0, 1);
  return _Ah.multiplyScalar(t).add(a.ca).distanceToSquared(p);
}
/* Rayo o→d: distancia hasta el dirigible más cercano que cruza (asistencia de puntería), o Infinity. */
function airshipRayHit(o, d, maxT) {
  let best = Infinity;
  for (const a of airships) {
    if (a.dead) continue;
    _Ap.copy(o).addScaledVector(d, maxT);
    if (airshipSegDist2(a, o, _Ap) < (a.r + 3) ** 2) { const t = _sdc.distanceTo(o); if (t > 25 && t < best) best = t; }
  }
  return best;
}

/* ---------- Daño y destrucción ---------- */
/* n = puntos de daño (v24: ya es el del arma del dragón elegido, o del aliado). soft = continuo (llamarada, rayo). at = punto del impacto. */
function damageAirship(a, n, soft, at) {
  if (a.dead) return;
  a.hp -= n; a.hitFlash = Math.max(a.hitFlash, soft ? 0.55 : 1);
  const c = ARC_COLOR;
  if (soft) sparks(at.x, at.y, at.z, 2, 0, 0, 0);
  else {
    const k = clamp(n / 25, 0.3, 2);
    emit(fxAdd, at.x, at.y, at.z, 0, 0, 0, 0.2, 9 * k, 24 * k, 1, 0.85, 1, 1, 0, 0);
    for (let i = 0; i < Math.round(22 * k); i++) {
      const u = Math.random() * 6.283, v = rnd(-1, 1), s = Math.sqrt(1 - v * v), sp = rnd(14, 50);
      emit(fxAdd, at.x, at.y, at.z, Math.cos(u) * s * sp, v * sp, Math.sin(u) * s * sp, rnd(0.3, 0.7), rnd(2, 3.4), 0.4, c[0], c[1] * rnd(0.8, 1.2), c[2], 1, 0.8, -4);
    }
  }
  if (!(gameTime - a.sndT < (soft ? 0.22 : 0.07))) { a.sndT = gameTime; sfx.hit(); }
  if (a.hp <= 0) killAirship(a);
}
function killAirship(a) {
  a.hp = 0; a.dead = true; a.dying = AIRSHIP_DIE;
  if (!byAlly) ultGain(ULT_PER_KILL);                      // (v24: como cualquier blanco)
  towerState.score += AIRSHIP_SCORE; airshipState.kills++;
  releaseLock(a); missionKill(a);
  toast((byAlly ? allyName() + ' destruyó un dirigible' : 'Dirigible destruido') + '  +' + AIRSHIP_SCORE + '  ·  ' + airshipState.kills + '/' + airships.length);
  if (byAlly) allySay('kill');
  sfx.energyCharge(airshipVol(a));
}
const airshipVol = a => clamp(1.25 - a.pos.distanceTo(dragon.position) / 2200, 0.15, 1);
/* Agonía: el casco se carga de energía (parpadeo morado cada vez más fuerte) y le recorren chispas. */
function airshipAgony(a, dt) {
  const u = 1 - a.dying / AIRSHIP_DIE, c = ARC_COLOR;
  if (a.mat) a.mat.emissive.setRGB(c[0], c[1], c[2]).multiplyScalar((0.35 + 1.4 * u) * (0.65 + 0.35 * Math.sin(gameTime * 70)));
  for (let i = 0; i < 8; i++) {
    _Ap.lerpVectors(a.ca, a.cb, Math.random());
    _Ad.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(a.r * rnd(0.6, 1.05)); _Ap.add(_Ad);
    emit(fxAdd, _Ap.x, _Ap.y, _Ap.z, _Ad.x * 0.6, _Ad.y * 0.6, _Ad.z * 0.6, rnd(0.15, 0.35), rnd(3, 6), 0.5, lerp(c[0], 1, 0.5), lerp(c[1], 1, 0.5), 1, 1, 1, 0);
  }
}

/* ---------- Explosión de energía ----------
   Destello blanco-violeta, esfera de choque (borde brillante) y onda plana que se abren, relámpagos que salen del centro durante
   medio segundo, esquirlas arcanas, chispas que caen, brasas que flotan y humo; luz, temblor de cámara y estruendo. */
const blasts = [];
let blastRes = null;
function blastResources() {
  if (blastRes) return blastRes;
  const sphereMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(0.8, 0.5, 1) }, uA: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uC * (0.07 + 2.0 * pow(f, 2.6)), uA); }`
  });
  blastRes = { sphere: new THREE.IcosahedronGeometry(1, 3), ring: new THREE.RingGeometry(0.82, 1, 72), sphereMat };
  return blastRes;
}
function airshipBlast(a) {
  const R = blastResources(), p = a.pos.clone(), c = ARC_COLOR;
  const sph = new THREE.Mesh(R.sphere, R.sphereMat.clone()); sph.position.copy(p); sph.renderOrder = 7; scene.add(sph);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd6b0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(R.ring, ringMat); ring.position.copy(p); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 7; scene.add(ring);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: 0xeed8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.copy(p); flash.renderOrder = 8; scene.add(flash);
  blasts.push({ t: 0, p, sph, ring, flash, boltT: 0 });
  // núcleo que sigue ardiendo cuando se apaga el destello; esquirlas de energía (rápidas, con freno), chispas que caen, brasas que flotan y humo
  for (let i = 0; i < 7; i++) emit(fxAdd, p.x + rnd(-10, 10), p.y + rnd(-8, 8), p.z + rnd(-10, 10), 0, 0, 0, rnd(0.55, 0.95), rnd(45, 60), rnd(110, 150), 0.85, 0.62, 1, 0.85, 0, 0);
  for (let i = 0; i < 220; i++) {
    const u = Math.random() * 6.283, v = rnd(-1, 1), s = Math.sqrt(1 - v * v), sp = rnd(40, 280), w = Math.random();
    emit(fxAdd, p.x, p.y, p.z, Math.cos(u) * s * sp, v * sp, Math.sin(u) * s * sp, rnd(0.6, 1.5), rnd(10, 18), rnd(2, 4),
      w < 0.3 ? 0.75 : c[0], w < 0.3 ? 0.9 : c[1] * rnd(0.8, 1.3), 1, 1, 2.4, 0);
  }
  for (let i = 0; i < 90; i++) {
    const u = Math.random() * 6.283, v = rnd(-0.3, 1), s = Math.sqrt(1 - v * v), sp = rnd(30, 120);
    emit(fxAdd, p.x, p.y, p.z, Math.cos(u) * s * sp, v * sp, Math.sin(u) * s * sp, rnd(1, 2.2), 1.2, 0.3, 1, rnd(0.7, 0.95), 1, 1, 0.5, 30);
  }
  for (let i = 0; i < 60; i++) {
    _Ad.set(rnd(-1, 1), rnd(-0.6, 0.6), rnd(-1, 1)).normalize().multiplyScalar(rnd(10, 90));
    emit(fxAdd, p.x + _Ad.x, p.y + _Ad.y, p.z + _Ad.z, _Ad.x * 0.15, rnd(2, 8), _Ad.z * 0.15, rnd(2, 3.6), rnd(2.5, 4), 0.6, c[0], c[1], c[2], 0.9, 0.4, -1);
  }
  for (let i = 0; i < 34; i++) {
    const u = Math.random() * 6.283, sp = rnd(8, 30);
    emit(fxSmoke, p.x + rnd(-20, 20), p.y + rnd(-12, 12), p.z + rnd(-20, 20), Math.cos(u) * sp, rnd(2, 12), Math.sin(u) * sp, rnd(3, 5.5), rnd(20, 32), rnd(60, 95), 0.2, 0.15, 0.24, 0.55, 0.5, -1);
  }
  debris(p.x, p.y, p.z); debris(p.x + rnd(-20, 20), p.y, p.z + rnd(-20, 20));
  const d = p.distanceTo(dragon.position);
  camShake = Math.max(camShake, 1.5 * clamp(1 - d / 1600, 0, 1));
  sfx.energyBlast(airshipVol(a));
}
/* Relámpago: camino quebrado desde el centro hacia fuera, dibujado con partículas muy breves. */
function blastBolt(p, len, k) {
  _Ad.set(rnd(-1, 1), rnd(-0.7, 0.7), rnd(-1, 1)).normalize();
  _Ap.copy(p); const step = len / 12;
  for (let i = 0; i < 12; i++) {
    _Ai.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(0.55); _Ad.add(_Ai).normalize();
    _Ap.addScaledVector(_Ad, step);
    emit(fxAdd, _Ap.x, _Ap.y, _Ap.z, 0, 0, 0, 0.09, 9 * k + 3, 5 * k + 2, 0.9, 0.8, 1, 1, 0, 0);
  }
}
function updateBlasts(dt) {
  for (let i = blasts.length - 1; i >= 0; i--) {
    const b = blasts[i]; b.t += dt; const t = b.t;
    const u1 = clamp(t / 0.7, 0, 1), u2 = clamp(t / 1.05, 0, 1), u3 = clamp(t / 0.45, 0, 1);
    b.sph.scale.setScalar(lerp(14, 200, 1 - (1 - u1) ** 3)); b.sph.material.uniforms.uA.value = (1 - u1) ** 1.6;
    b.ring.scale.setScalar(lerp(25, 360, 1 - (1 - u2) ** 2.5)); b.ring.material.opacity = 0.9 * (1 - u2) ** 2;
    b.flash.scale.setScalar(lerp(150, 330, u3)); b.flash.material.opacity = (1 - u3) ** 2;
    while (t < 0.6 && b.boltT <= t) { b.boltT += 0.05; for (let k = 0; k < 4; k++) blastBolt(b.p, rnd(90, 200), 1 - t / 0.6); }
    if (t < 0.9) { fbLight.position.copy(b.p); fbLight.distance = 1100; fbLight.color.setRGB(0.8, 0.55, 1); fbLight.intensity = 9 * (1 - t / 0.9); }
    else if (fbLight.distance !== 190) fbLight.distance = 190;
    if (t > 1.1) {
      scene.remove(b.sph); scene.remove(b.ring); scene.remove(b.flash);
      b.sph.material.dispose(); b.ring.material.dispose(); b.flash.material.dispose();
      blasts.splice(i, 1);
    }
  }
}

/* ---------- Cada fotograma ---------- */
function updateAirships(dt) {
  const P = dragon.position, playing = state === 'playing', cosArc = Math.cos(AIRSHIP_ARC), sinEl = Math.sin(AIRSHIP_ELEV);
  for (const a of airships) {
    if (a.gone) continue;
    if (a.vel !== ZERO && state !== 'menu') {               // v23: flota en movimiento (en el menú se queda quieta)
      a.pos.x += a.vel.x * dt; a.pos.z += a.vel.z * dt;
      a.cruiseT -= dt; if (a.cruiseT <= 0) { a.cruiseT = 0.5; a.cruise = airshipCruiseY(a); }
      a.base += clamp(a.cruise - a.base, -AIRSHIP_CLIMB[0] * dt, AIRSHIP_CLIMB[1] * dt);
    }
    const t = gameTime * 0.35 + a.ph;                         // vaivén: sube y baja unos metros y se mece un poco
    a.pos.y = a.base + Math.sin(t) * 3;
    airshipAxis(a);
    const d = a.pos.distanceTo(P);
    if (a.mesh) {
      a.mesh.position.copy(a.pos); a.mesh.quaternion.copy(a.q).multiply(_Aq.setFromAxisAngle(_Az, Math.sin(t * 0.8) * 0.02));
      a.mesh.visible = d < AIRSHIP_DRAW;
    }
    if (a.dead) {
      a.dying -= dt; airshipAgony(a, dt);
      if (a.dying <= 0) { airshipBlast(a); removeAirshipMesh(a); a.gone = true; }
      continue;
    }
    a.hitFlash = Math.max(0, a.hitFlash - dt * 3.5);
    if (a.mat) a.mat.emissive.setRGB(ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2]).multiplyScalar(a.hitFlash * 0.55);
    if (a.hp < AIRSHIP_HP && d < 3000) {                     // tocado: humo (más cuanto menos vida le queda)
      a.smokeT -= dt * (1.5 - a.hp / AIRSHIP_HP);
      if (a.smokeT <= 0) {
        a.smokeT = 0.12; _Ap.lerpVectors(a.ca, a.cb, Math.random());
        emit(fxSmoke, _Ap.x + rnd(-8, 8), _Ap.y + rnd(-4, 6), _Ap.z + rnd(-8, 8), rnd(-2, 2), rnd(3, 7), rnd(-2, 2), rnd(2.5, 4), 8, 26, 0.16, 0.14, 0.15, 0.5, 0.4, -1);
      }
    }
    // cañones: solo por el costado que mira al jugador, y nunca a proa, a popa ni en la vertical
    if (!playing || d > AIRSHIP_RANGE) continue;
    a.cool -= dt; if (a.cool > 0) continue;
    _Ad.subVectors(P, a.pos).divideScalar(d || 1);
    _Af.set(0, 0, -1).applyQuaternion(a.q); _As.set(1, 0, 0).applyQuaternion(a.q);
    if (Math.abs(_Ad.dot(_Af)) > cosArc || Math.abs(_Ad.y) > sinEl) { a.cool = 0.15; continue; }
    const side = _Ad.dot(_As) >= 0 ? 1 : -1, pz = AIRSHIP_PORTS.z[a.port++ % AIRSHIP_PORTS.z.length];
    _Ap.set(side * AIRSHIP_PORTS.x, AIRSHIP_PORTS.y, pz).multiplyScalar(AIRSHIP_K).applyQuaternion(a.q).add(a.pos);
    if (!losClear(_Ap.x, _Ap.y, _Ap.z, P.x, P.y, P.z)) { a.cool = 0.6; continue; }
    _Ai.copy(P).addScaledVector(dragonVel, _Ap.distanceTo(P) / AIRSHIP_SHOT_SPEED).sub(_Ap).normalize();   // punto de interceptación
    _Ai.x += rnd(-1, 1) * AIRSHIP_SPREAD; _Ai.y += rnd(-1, 1) * AIRSHIP_SPREAD; _Ai.z += rnd(-1, 1) * AIRSHIP_SPREAD; _Ai.normalize();
    spawnFireball(_Ap, _Ai, true, clamp(1.1 - d / AIRSHIP_RANGE, 0.15, 0.6), 'arc');
    for (let i = 0; i < 6; i++) emit(fxAdd, _Ap.x, _Ap.y, _Ap.z, _As.x * side * rnd(10, 30) + rnd(-6, 6), rnd(-6, 6), _As.z * side * rnd(10, 30) + rnd(-6, 6), rnd(0.15, 0.3), rnd(4, 7), 1, ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2], 1, 2, 0);
    a.cool = AIRSHIP_RATE * rnd(0.85, 1.15);
  }
  updateBlasts(dt);
}
