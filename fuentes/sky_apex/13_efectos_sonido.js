/* ============================================================
   6. PARTÍCULAS, PROYECTILES Y SONIDO PROCEDURAL
   ============================================================ */
let camShake = 0;
let byAlly = false;   // v23: el daño que se está aplicando lo hace el aliado (6e): con su propio daño y sin recompensas para el jugador (rayo, escudo, bolas guiadas)

/* ---------- Partículas (puntos con shader) ---------- */
function makeParticles(cap, additive) {
  const P = {
    cap, i: 0,
    pos: new Float32Array(cap * 3), col: new Float32Array(cap * 4), size: new Float32Array(cap),
    vel: new Float32Array(cap * 3), life: new Float32Array(cap), max: new Float32Array(cap),
    s0: new Float32Array(cap), s1: new Float32Array(cap), a0: new Float32Array(cap), drag: new Float32Array(cap), grav: new Float32Array(cap),
    hold: new Uint8Array(cap)                              // v28: 1 = mantiene el brillo hasta casi el final (la llamarada que choca con el suelo)
  };
  const geo = new THREE.BufferGeometry();
  P.aPos = new THREE.BufferAttribute(P.pos, 3); P.aCol = new THREE.BufferAttribute(P.col, 4); P.aSize = new THREE.BufferAttribute(P.size, 1);
  P.aPos.setUsage(THREE.DynamicDrawUsage); P.aCol.setUsage(THREE.DynamicDrawUsage); P.aSize.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', P.aPos); geo.setAttribute('aColor', P.aCol); geo.setAttribute('aSize', P.aSize);
  P.mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uScale: { value: 600 } },
    vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float uScale; varying vec4 vC;
      void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.5), 0.0, 700.0); }`,
    fragmentShader: `varying vec4 vC;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard;
        float a = smoothstep(1.0, 0.0, r); a *= a;
        gl_FragColor = vec4(vC.rgb, vC.a * a); }`
  });
  P.points = new THREE.Points(geo, P.mat);
  P.points.frustumCulled = false; P.points.renderOrder = additive ? 6 : 4;
  scene.add(P.points);
  return P;
}
const fxAdd = makeParticles(3400, true), fxSmoke = makeParticles(1400, false);   // (3400: la llamarada de 200 m y el rayo usan muchas)
function emit(P, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag, grav, hold) {
  const i = P.i; P.i = (P.i + 1) % P.cap;
  P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
  P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
  P.life[i] = life; P.max[i] = life; P.s0[i] = s0; P.s1[i] = s1; P.a0[i] = a; P.drag[i] = drag; P.grav[i] = grav; P.hold[i] = hold ? 1 : 0;
  P.col[i * 4] = r; P.col[i * 4 + 1] = g; P.col[i * 4 + 2] = b;
}
function updateParticles(P, dt) {
  for (let i = 0; i < P.cap; i++) {
    const l = P.life[i];
    if (l <= 0) { P.size[i] = 0; P.col[i * 4 + 3] = 0; continue; }
    const nl = l - dt; P.life[i] = nl;
    if (nl <= 0) { P.size[i] = 0; P.col[i * 4 + 3] = 0; continue; }
    const k = Math.exp(-P.drag[i] * dt);
    P.vel[i * 3] *= k; P.vel[i * 3 + 1] = P.vel[i * 3 + 1] * k - P.grav[i] * dt; P.vel[i * 3 + 2] *= k;
    P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
    const f = 1 - nl / P.max[i];
    P.size[i] = lerp(P.s0[i], P.s1[i], f);
    P.col[i * 4 + 3] = P.a0[i] * (P.hold[i] ? Math.min(1, (1 - f) * 8) : 1 - f) * Math.min(1, f * 12 + 0.25);
  }
  P.aPos.needsUpdate = true; P.aCol.needsUpdate = true; P.aSize.needsUpdate = true;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function explode(x, y, z, power) {
  const n = Math.round(46 * power);
  emit(fxAdd, x, y, z, 0, 0, 0, 0.22, 22 * power, 55 * power, 1, 0.9, 0.7, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, c = rnd(-1, 1), s = Math.sqrt(1 - c * c), sp = rnd(6, 34) * power;
    emit(fxAdd, x, y, z, Math.cos(a) * s * sp, c * sp * 0.8 + 6, Math.sin(a) * s * sp, rnd(0.5, 1.2), rnd(5, 9) * power, rnd(12, 24) * power, 1, rnd(0.35, 0.65), 0.12, 0.95, 1.6, -3);
  }
  for (let i = 0; i < Math.round(26 * power); i++) {
    const a = Math.random() * 6.283, sp = rnd(3, 16) * power;
    emit(fxSmoke, x + rnd(-3, 3), y + rnd(-2, 3), z + rnd(-3, 3), Math.cos(a) * sp * 0.5, rnd(4, 14) * power, Math.sin(a) * sp * 0.5, rnd(2.2, 4.4), rnd(8, 14) * power, rnd(26, 46) * power, 0.16, 0.14, 0.14, 0.55, 0.7, -1.5);
  }
  for (let i = 0; i < Math.round(30 * power); i++) {
    const a = Math.random() * 6.283, c = rnd(-0.2, 1), s = Math.sqrt(1 - c * c), sp = rnd(25, 70) * power;
    emit(fxAdd, x, y, z, Math.cos(a) * s * sp, c * sp, Math.sin(a) * s * sp, rnd(0.6, 1.4), 0.7, 0.2, 1, 0.85, 0.4, 1, 0.3, 24);
  }
  const d = Math.hypot(x - dragon.position.x, y - dragon.position.y, z - dragon.position.z);
  camShake = Math.max(camShake, power * 0.55 * clamp(1 - d / 900, 0, 1));
  sfx.boom(power * clamp(1.2 - d / 1800, 0.15, 1));
}
function debris(x, y, z) {
  for (let i = 0; i < 42; i++) {
    const a = Math.random() * 6.283, sp = rnd(8, 34);
    emit(fxSmoke, x, y, z, Math.cos(a) * sp, rnd(10, 38), Math.sin(a) * sp, rnd(2.2, 3.6), rnd(2.4, 4.2), rnd(2, 3.6), 0.22, 0.18, 0.15, 1, 0.1, 22);
  }
}
/* Chispas de impacto pequeñas (proyectiles rápidos, llamarada, rayo): sin estallido, sin sonido y sin temblor de cámara. (vx, vy, vz) = arrastre. */
function sparks(x, y, z, n, vx, vy, vz) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, c = rnd(-1, 1), s = Math.sqrt(1 - c * c), sp = rnd(10, 40);
    emit(fxAdd, x, y, z, Math.cos(a) * s * sp + vx, c * sp + vy, Math.sin(a) * s * sp + vz, rnd(0.2, 0.5), rnd(1.6, 2.8), 0.3, 1, rnd(0.55, 0.9), 0.25, 1, 0.6, -6);
  }
}
function splash(x, z, power) {
  for (let i = 0; i < Math.round(26 * power); i++) {
    const a = Math.random() * 6.283, sp = rnd(4, 18) * power;
    emit(fxSmoke, x, WL + 0.5, z, Math.cos(a) * sp, rnd(6, 24) * power, Math.sin(a) * sp, rnd(0.9, 1.7), rnd(2, 4), rnd(5, 9), 0.85, 0.92, 0.95, 0.55, 0.9, 16);
  }
}

/* ---------- Boost: estelas de viento (efecto túnel) ----------
   Rayas de aire quietas en el mundo, repartidas en un tubo alrededor de la trayectoria y por delante de la cámara: el dragón
   las atraviesa a toda velocidad y pasan rozando, como un túnel. Al quedar atrás (o fuera del tubo al girar) reaparecen delante.
   Son cintas orientadas a la cámara con un grosor mínimo en píxeles: brillan en el extremo cercano y se apagan hacia delante. */
const WIND_N = 150, WIND_R = [7, 48], WIND_FAR = 420;    // número de rayas, radio del tubo (m), hasta dónde llegan por delante (m)
const WIND_ALPHA = 0.85, WIND_PX = 2.4, WIND_LEN = 0.15;  // opacidad, grosor mínimo en pantalla (px) y largo (s de recorrido: largo = velocidad × WIND_LEN)
const wind = (() => {
  const geo = new THREE.BufferGeometry(), idx = [];
  const pos = new Float32Array(WIND_N * 12), aA = new Float32Array(WIND_N * 4), aU = new Float32Array(WIND_N * 4);
  for (let i = 0; i < WIND_N; i++) { const o = i * 4; aU.set([-1, 1, -1, 1], o); idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aA', new THREE.BufferAttribute(aA, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute float aA; attribute float aU; varying float vA; varying float vU;
      void main(){ vA = aA; vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying float vA; varying float vU;
      void main(){ gl_FragColor = vec4(1.0, 0.94, 0.84, vA * (1.0 - vU * vU)); }`
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.visible = false; scene.add(mesh);
  return { geo, pos, aA, mesh, p: new Float32Array(WIND_N * 3), len: new Float32Array(WIND_N), live: false };
})();
const _wC = new THREE.Vector3(), _wV = new THREE.Vector3(), _wR = new THREE.Vector3(), _wU = new THREE.Vector3(), _wS = new THREE.Vector3(), _wX = new THREE.Vector3();
function spawnWind(i, along) {
  const a = Math.random() * 6.2832, r = Math.sqrt(rnd(WIND_R[0] * WIND_R[0], WIND_R[1] * WIND_R[1]));   // reparto uniforme en el anillo
  const c = Math.cos(a) * r, s = Math.sin(a) * r, o = i * 3;
  wind.p[o] = _wC.x + _wV.x * along + _wR.x * c + _wU.x * s;
  wind.p[o + 1] = _wC.y + _wV.y * along + _wR.y * c + _wU.y * s;
  wind.p[o + 2] = _wC.z + _wV.z * along + _wR.z * c + _wU.z * s;
  wind.len[i] = rnd(0.6, 1.4);
}
function updateWind(fx) {
  const spd = dragonVel.length();
  if (fx < 0.01 || spd < 5) { wind.mesh.visible = false; wind.live = false; return; }
  camera.getWorldPosition(_wC);
  _wV.copy(dragonVel).multiplyScalar(1 / spd);
  _wR.set(1, 0, 0).applyQuaternion(dragon.quaternion); _wR.addScaledVector(_wV, -_wR.dot(_wV)).normalize(); _wU.crossVectors(_wR, _wV);
  if (!wind.live) { for (let i = 0; i < WIND_N; i++) spawnWind(i, rnd(20, WIND_FAR)); wind.live = true; }
  const pxW = 2 * Math.tan(camera.fov * Math.PI / 360) * WIND_PX / Math.max(window.innerHeight, 200);   // ancho de WIND_PX píxeles
  const P = wind.pos, A = wind.aA, out2 = WIND_R[1] * WIND_R[1] * 2.5;
  for (let i = 0; i < WIND_N; i++) {
    const o = i * 3, L = spd * WIND_LEN * wind.len[i];                       // largo de la raya: crece con la velocidad
    _wS.set(wind.p[o] - _wC.x, wind.p[o + 1] - _wC.y, wind.p[o + 2] - _wC.z);
    let along = _wS.dot(_wV);
    if (along + L < 0 || along > WIND_FAR * 1.3 || _wS.lengthSq() - along * along > out2) {
      spawnWind(i, rnd(WIND_FAR * 0.65, WIND_FAR));
      _wS.set(wind.p[o] - _wC.x, wind.p[o + 1] - _wC.y, wind.p[o + 2] - _wC.z); along = _wS.dot(_wV);
    }
    _wX.crossVectors(_wV, _wS); if (_wX.lengthSq() < 1e-6) _wX.copy(_wR); _wX.normalize();   // de canto hacia la cámara
    const w = Math.max(0.1, _wS.length() * pxW) * 0.5;
    const al = fx * WIND_ALPHA * smooth(WIND_FAR, WIND_FAR * 0.6, along) * smooth(-L * 0.5, 15, along);   // aparecen a lo lejos y se apagan al pasar
    const hx = wind.p[o], hy = wind.p[o + 1], hz = wind.p[o + 2], tx = hx + _wV.x * L, ty = hy + _wV.y * L, tz = hz + _wV.z * L, k = i * 12;
    P[k] = hx - _wX.x * w; P[k + 1] = hy - _wX.y * w; P[k + 2] = hz - _wX.z * w;
    P[k + 3] = hx + _wX.x * w; P[k + 4] = hy + _wX.y * w; P[k + 5] = hz + _wX.z * w;
    P[k + 6] = tx - _wX.x * w; P[k + 7] = ty - _wX.y * w; P[k + 8] = tz - _wX.z * w;
    P[k + 9] = tx + _wX.x * w; P[k + 10] = ty + _wX.y * w; P[k + 11] = tz + _wX.z * w;
    A[i * 4] = A[i * 4 + 1] = al; A[i * 4 + 2] = A[i * 4 + 3] = 0;
  }
  wind.geo.attributes.position.needsUpdate = true; wind.geo.attributes.aA.needsUpdate = true;
  wind.mesh.visible = true;
}

/* ---------- Bolas de fuego del jugador ---------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,235,1)'); grd.addColorStop(0.25, 'rgba(255,190,90,0.85)'); grd.addColorStop(0.6, 'rgba(255,90,20,0.25)'); grd.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = glowTexture();
/* Brillo blanco para teñir con el color del aliento elegido (bolas del jugador y fogonazo de la boca). */
const glowTexW = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.8)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const fireballs = [], bolts = [];
const fbLight = new THREE.PointLight(0xff8a3a, 0, 190, 2); scene.add(fbLight);
const FIREBALL_SPEED = 340, FIREBALL_LIFE = 6;          // bolas enemigas (m/s, fijas en el mundo)
const _white = new THREE.Color(1, 1, 1);
/* kind: 'gun' = proyectil rápido del jugador, 'msl' = bola guiada del jugador (ver «Armas del jugador», sección 7);
   enemigas: 'enemy' (bola normal), 'emsl' (bola guiada enemiga, ver sección 6b), 'aa' (antiaéreo de las torres) o 'arc' (v21: proyectil
   arcano de los dirigibles, morado, ver 6c). */
const ARC_COLOR = [0.78, 0.42, 1];       // color de lo arcano: proyectiles de los dirigibles, sus chispas y su explosión
const _arcC = new THREE.Color(ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2]), _arcW = _arcC.clone().lerp(_white, 0.55);
const ALLY_FIRE = new THREE.Color(0.45, 0.75, 1), _allyW = ALLY_FIRE.clone().lerp(_white, 0.6);   // v23: el fuego del aliado, azul
/* ally (v23): proyectil del aliado (6e): como los del jugador, pero azul, con su volumen y sin contar en las estadísticas. */
function spawnFireball(from, dir, enemy, vol, kind, ally) {
  kind = enemy ? (kind === 'emsl' || kind === 'aa' || kind === 'arc' ? kind : 'enemy') : kind || 'gun';
  const gun = kind === 'gun', msl = kind === 'msl', emsl = kind === 'emsl', aa = kind === 'aa', arc = kind === 'arc', fast = gun || aa || arc;
  // las del jugador toman el color del aliento elegido en «Elige tu dragón»; las enemigas siguen siendo de fuego (las arcanas, moradas)
  const map = enemy && !arc ? glowTex : glowTexW, col = arc ? _arcW : ally ? _allyW : enemy ? _white : ATTACK.clone().lerp(_white, gun ? 0.6 : 0.45), colH = arc ? _arcC : ally ? ALLY_FIRE : enemy ? _white : ATTACK;
  const r0 = arc ? 3.4 : fast ? 2.6 : msl ? 15 : emsl ? 12 : 7, r1 = arc ? 11 : fast ? 8 : msl ? 44 : emsl ? 36 : 22;   // núcleo y halo (m)
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  core.scale.setScalar(r0); core.renderOrder = 7; core.position.copy(from); scene.add(core);   // (ya en la boca en el fotograma en que nace)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: colH, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  halo.scale.setScalar(r1); halo.renderOrder = 7; halo.position.copy(from); scene.add(halo);
  const speed = arc ? AIRSHIP_SHOT_SPEED : aa ? AA_SPEED : emsl ? EMSL_SPEED[0] : enemy ? FIREBALL_SPEED : gun ? GUN_SPEED : MSL_SPEED[0], life = arc ? AIRSHIP_SHOT_LIFE : aa ? AA_LIFE : emsl ? EMSL_LIFE : enemy ? FIREBALL_LIFE : gun ? GUN_LIFE : MSL_LIFE;
  const f = { pos: from.clone(), vel: dir.clone().multiplyScalar(speed), speed, life, core, halo, r0, r1, enemy: !!enemy, kind, dmg: arc ? AIRSHIP_DMG : aa ? AA_DMG : emsl ? EMSL_DMG : enemy ? ENEMY_DMG : gun ? (ally ? ALLY_GUN_DMG : GUN_DMG) : MSL_DMG, target: null, lost: false,
    c: enemy ? (aa ? [1, 0.62, 0.22] : arc ? ARC_COLOR : null) : ally ? [ALLY_FIRE.r, ALLY_FIRE.g, ALLY_FIRE.b] : [ATTACK.r, ATTACK.g, ATTACK.b], ally: !!ally };
  fireballs.push(f);
  if (gun) sfx.shot(ally ? vol : undefined); else if (aa) sfx.shot(vol); else if (arc) sfx.arcShot(vol); else if (emsl) sfx.launch(vol); else sfx.fire(vol);
  return f;
}
/* Bola guiada enemiga: guiado imperfecto a propósito (persecución con poco adelanto y giro limitado). Si el jugador se le sale del cono de su
   buscador (EMSL_FOV), por ejemplo porque ya la ha rebasado o ha girado cerrado, lo pierde y sigue recto hasta chocar o apagarse. */
function steerEnemyMissile(f, dt) {
  f.speed = Math.min(EMSL_SPEED[1], f.speed + EMSL_ACCEL * dt);
  _mv.copy(f.vel).normalize();
  if (!f.lost && state === 'playing') {
    _mt.subVectors(dragon.position, f.pos); const d = _mt.length();
    _mt.addScaledVector(dragonVel, d / f.speed * EMSL_LEAD).normalize();
    const ang = Math.acos(clamp(_mv.dot(_mt), -1, 1));
    if (ang > EMSL_FOV) f.lost = true;
    else if (ang > 1e-5) { _mq.setFromUnitVectors(_mv, _mt); _mq0.identity().slerp(_mq, Math.min(1, EMSL_TURN * dt / ang)); _mv.applyQuaternion(_mq0); }
  } else if (state === 'dead') f.lost = true;
  f.vel.copy(_mv).multiplyScalar(f.speed);
}
/* Bola guiada: acelera y gira (con un límite) hacia el punto de interceptación de su blanco; muy cerca gira el triple para no fallar. */
const _mq = new THREE.Quaternion(), _mq0 = new THREE.Quaternion(), _mt = new THREE.Vector3(), _mv = new THREE.Vector3();
function steerMissile(f, dt) {
  f.speed = Math.min(MSL_SPEED[1], f.speed + MSL_ACCEL * dt);
  _mv.copy(f.vel).normalize();
  const e = f.target;
  if (e && !e.dead) {
    if (interceptPoint(e, f.pos, _mt, f.speed, 30) < 0) _mt.copy(e.pos);
    _mt.sub(f.pos); const d = _mt.length(); _mt.divideScalar(d || 1);
    const ang = Math.acos(clamp(_mv.dot(_mt), -1, 1)), max = MSL_TURN * dt * (d < 200 ? 3 : 1);
    if (ang > 1e-5) { _mq.setFromUnitVectors(_mv, _mt); _mq0.identity().slerp(_mq, Math.min(1, max / ang)); _mv.applyQuaternion(_mq0); }
  }
  f.vel.copy(_mv).multiplyScalar(f.speed);
}
function killFireball(i) {
  const f = fireballs[i]; scene.remove(f.core); scene.remove(f.halo); f.core.material.dispose(); f.halo.material.dispose();
  fireballs.splice(i, 1);
}
const _fo = new THREE.Vector3(), _fs = new THREE.Vector3(), _fc = new THREE.Vector3(), _fp = new THREE.Vector3();
function segHitsSphere(a, b, c, r) {                      // ¿el segmento a→b atraviesa la esfera (c, r)?
  _fs.subVectors(b, a); const l2 = _fs.lengthSq();
  const t = l2 > 1e-9 ? clamp(_fc.subVectors(c, a).dot(_fs) / l2, 0, 1) : 0;
  return _fc.copy(a).addScaledVector(_fs, t).distanceToSquared(c) < r * r;
}
function updateFireballs(dt) {
  let near = null, nearD = 700;
  const shOn = shieldOn(); if (shOn) shieldCenter(_shC);
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const f = fireballs[i], gun = f.kind === 'gun', msl = f.kind === 'msl', emsl = f.kind === 'emsl', aa = f.kind === 'aa', arc = f.kind === 'arc', fast = gun || aa || arc;
    if (msl) steerMissile(f, dt); else if (emsl) steerEnemyMissile(f, dt);
    const steps = fast ? 3 : 2, h = dt / steps;
    let hit = false, onTarget = false;
    _fp.copy(f.pos);
    for (let s = 0; s < steps && !hit; s++) {
      _fo.copy(f.pos);
      f.pos.addScaledVector(f.vel, h);
      const gy = Math.max(heightAt(f.pos.x, f.pos.z), WL);
      if (f.pos.y < gy) {
        hit = true;
        if (heightAt(f.pos.x, f.pos.z) < WL) { splash(f.pos.x, f.pos.z, fast ? 0.45 : msl ? 2 : 1.3); if (!fast) sfx.hit(); }
        else if (fast) sparks(f.pos.x, gy + 0.5, f.pos.z, 6, 0, 8, 0);
        else explode(f.pos.x, gy + 1, f.pos.z, msl ? 1.3 : 0.75);
      } else if (f.enemy) {
        // bola de fuego enemiga: solo daña al jugador (salvo con el escudo puesto); las guiadas, además, revientan contra las torres
        if (shOn && segHitsSphere(_fo, f.pos, _shC, SHIELD_R)) { hit = true; shieldHit(_fc, emsl ? 1.3 : 0.7); }
        else if (state === 'playing' && segHitsSphere(_fo, f.pos, dragon.position, PLAYER_HIT_R + (emsl ? 2 : 0))) {
          hit = true;
          if (emsl) { explode(f.pos.x, f.pos.y, f.pos.z, 0.9); hurtDragon(EMSL_DMG, 'Una bola guiada te derribó'); }
          else if (aa) { sparks(f.pos.x, f.pos.y, f.pos.z, 8, dragonVel.x, dragonVel.y, dragonVel.z); hurtDragon(AA_DMG, 'La artillería de una torre te derribó', true); }
          else if (arc) { sparks(f.pos.x, f.pos.y, f.pos.z, 8, dragonVel.x, dragonVel.y, dragonVel.z); hurtDragon(f.dmg, 'Los cañones de un dirigible te derribaron', true); }
          else hurtDragon(ENEMY_DMG, 'Un dragón enemigo te derribó');
        } else if (emsl) for (const t of towers.values()) {
          const dx = f.pos.x - t.x, dz = f.pos.z - t.z;
          if (!t.dead && dx * dx + dz * dz < (TOWER_R + 3) ** 2 && f.pos.y > t.y - 1 && f.pos.y < t.y + TOWER_TOP + 4) { hit = true; explode(f.pos.x, f.pos.y, f.pos.z, 1.1); break; }
        }
      } else {
        // proyectiles del jugador (y del aliado, v23): torres, dragones enemigos y dirigibles
        byAlly = f.ally;
        for (const t of towers.values()) {
          if (t.dead) continue;
          const dx = f.pos.x - t.x, dz = f.pos.z - t.z;
          if (dx * dx + dz * dz < (TOWER_R + 3) ** 2 && f.pos.y > t.y - 1 && f.pos.y < t.y + TOWER_TOP + 4) { hit = onTarget = true; damageTower(t, f.dmg, false, f.pos, msl); if (msl) explode(f.pos.x, f.pos.y, f.pos.z, 1.3); break; }
        }
        if (!hit) for (const e of enemies) if (!e.dead && segHitsSphere(_fo, f.pos, e.pos, ENEMY_HIT_R)) {
          hit = onTarget = true; damageEnemy(e, f.dmg, f.pos);
          if (msl) explode(f.pos.x, f.pos.y, f.pos.z, 1.3);
          break;
        }
        if (!hit) for (const a of airships) if (!a.dead && airshipSegDist2(a, _fo, f.pos) < (a.r + (msl ? 4 : 1)) ** 2) {   // v21: dirigibles
          hit = onTarget = true; damageAirship(a, f.dmg, false, _sdc.clone());
          if (msl) explode(_sdc.x, _sdc.y, _sdc.z, 1.3);
          break;
        }
        byAlly = false;
      }
      if (!hit && islandAt(f.pos.x, f.pos.y, f.pos.z, 0)) { hit = true; if (fast) sparks(f.pos.x, f.pos.y, f.pos.z, 6, 0, 6, 0); else explode(f.pos.x, f.pos.y, f.pos.z, msl ? 1.3 : 0.75); }
    }
    if (onTarget && !f.ally) { if (gun) stats.shotHits++; else if (msl) stats.mslHits++; }
    f.life -= dt;
    if (hit || f.life <= 0) { killFireball(i); continue; }
    f.core.position.copy(f.pos); f.halo.position.copy(f.pos);
    const dP = f.pos.distanceTo(dragon.position);
    if (!fast && dP < nearD) { nearD = dP; near = f; }
    if (emsl && !f.lost && state === 'playing' && dP < 3500) threat.incoming.push(f);
    if (f.enemy && !aa && !arc && state === 'playing' && dP < 700) {   // aviso de proyectil enemigo que se acerca a tu trayectoria (los antiaéreos y los arcanos van demasiado rápido)
      _fs.subVectors(dragon.position, f.pos); const along = _fs.dot(f.vel) / f.speed;
      if (along > 0 && dP * dP - along * along < 3600) boltWarn = Math.max(boltWarn, 1 - dP / 700);
    }
    const fl = 1 + Math.sin(performance.now() * 0.05 + i) * 0.12; f.core.scale.setScalar(f.r0 * fl); f.halo.scale.setScalar(f.r1 * fl);
    const c = f.c;
    if (fast) {                                            // trazadora: chispas cortas a lo largo del tramo recorrido
      for (let k = 0; k < 3; k++) {
        const u = Math.random();
        emit(fxAdd, lerp(_fp.x, f.pos.x, u), lerp(_fp.y, f.pos.y, u), lerp(_fp.z, f.pos.z, u), 0, 0, 0, rnd(0.08, 0.16), rnd(1.5, 2.3), 0.5, c[0], c[1] * rnd(0.85, 1.1), c[2], 0.9, 0, 0);
      }
    } else if (!f.enemy || dP < 2600) {
      const big = msl || emsl, n = big ? 7 : 3, sz = msl ? 2.4 : emsl ? 1.9 : 1;
      for (let k = 0; k < n; k++) {
        const o = rnd(0, dt);
        emit(fxAdd, f.pos.x - f.vel.x * o + rnd(-0.6, 0.6) * sz, f.pos.y - f.vel.y * o + rnd(-0.6, 0.6) * sz, f.pos.z - f.vel.z * o + rnd(-0.6, 0.6) * sz,
          rnd(-3, 3), rnd(-1, 4), rnd(-3, 3), rnd(0.35, 0.7) * (big ? 1.6 : 1), rnd(3.2, 4.6) * sz, rnd(0.8, 1.6) * sz, c ? c[0] : 1, c ? c[1] * rnd(0.8, 1.15) : rnd(0.45, 0.7), c ? c[2] : 0.15, 0.8, 1.2, 0);
      }
      if (big || Math.random() < 0.6) emit(fxSmoke, f.pos.x, f.pos.y, f.pos.z, rnd(-2, 2), rnd(0, 3), rnd(-2, 2), rnd(0.8, 1.5) * (big ? 2 : 1), 2.5 * sz, 7 * sz, 0.18, 0.15, 0.14, emsl ? 0.5 : 0.35, 0.8, 0);
    }
  }
  if (near) { fbLight.position.copy(near.pos); fbLight.intensity = 4.2; if (near.c) fbLight.color.copy(ATTACK); else fbLight.color.set(0xff8a3a); }
  else fbLight.intensity = Math.max(0, fbLight.intensity - dt * 20);
}

/* ---------- Proyectiles enemigos ---------- */
const boltGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.5, 5); boltGeo.rotateX(Math.PI / 2);
const boltMat = new THREE.MeshBasicMaterial({ color: 0xffd8a0 });
function spawnBolt(from, dir) {
  const mesh = new THREE.Mesh(boltGeo, boltMat); mesh.position.copy(from);
  mesh.lookAt(from.clone().add(dir)); scene.add(mesh);
  bolts.push({ pos: from.clone(), vel: dir.clone().multiplyScalar(215), life: 7, mesh });
}
let boltWarn = 0;
function updateBolts(dt) {
  boltWarn = 0;
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.pos.addScaledVector(b.vel, dt); b.life -= dt; b.mesh.position.copy(b.pos);
    emit(fxAdd, b.pos.x, b.pos.y, b.pos.z, 0, 0, 0, 0.5, 2.2, 0.4, 1, 0.7, 0.35, 0.7, 0, 0);
    const d = b.pos.distanceTo(dragon.position);
    if (d < 400) boltWarn = Math.max(boltWarn, 1 - d / 400);
    let remove = b.life <= 0 || b.pos.y < Math.max(heightAt(b.pos.x, b.pos.z), WL) || !!islandAt(b.pos.x, b.pos.y, b.pos.z, 0);
    if (shieldOn() && b.pos.distanceTo(shieldCenter(_shC)) < SHIELD_R) { shieldHit(b.pos, 0.5); remove = true; }
    else if (d < 7.5 && state === 'playing') { hurtDragon(12); remove = true; }
    if (remove) { scene.remove(b.mesh); bolts.splice(i, 1); }
  }
}
/* v10: las torres son baterías antiaéreas: ráfagas de AA_BURST proyectiles rápidos (como el fuego rápido del jugador, pero con aún
   menos daño) hacia el punto de interceptación del jugador, con dispersión. Ya no lanzan bolas guiadas ni virotes. */
let AA_DMG = 3, AA_SPEED = 1100, AA_LIFE = 1.7, AA_RANGE = 1500, AA_BURST = 5, AA_RATE = 0.12, AA_PAUSE = [2.2, 3.6], AA_SPREAD = 0.025;   // daño, m/s, vida (s), alcance (m), disparos por ráfaga, pausa entre disparos y entre ráfagas (s), dispersión (rad). v24: del Excel, pestaña «Torre»
const _Etop = new THREE.Vector3(), _Eaa = new THREE.Vector3(), _Eaa2 = new THREE.Vector3();
function updateTowerAI(dt) {
  if (crystalRes) crystalRes.halo.opacity = 0.6 + 0.2 * Math.sin(gameTime * 2.3);
  for (const t of towers.values()) {
    if (t.crystal) { t.crystal.children[0].rotation.y = gameTime * 0.9 + t.spin; t.crystal.position.y = t.y + TOWER_CRYSTAL_Y + Math.sin(gameTime * 1.3 + t.spin) * 2.5; }
    if (t.dead) {
      t.smokeT -= dt;
      if (t.smokeT <= 0 && Math.hypot(t.x - dragon.position.x, t.z - dragon.position.z) < 1800) {
        t.smokeT = 0.22;
        emit(fxSmoke, t.x + rnd(-2, 2), t.y + 3, t.z + rnd(-2, 2), rnd(-1, 1), rnd(6, 10), rnd(-1, 1), rnd(3.5, 5), 4, 16, 0.12, 0.11, 0.11, 0.5, 0.3, -0.5);
        emit(fxAdd, t.x + rnd(-3, 3), t.y + 2, t.z + rnd(-3, 3), 0, rnd(3, 6), 0, 0.6, 3, 1, 1, 0.45, 0.1, 0.7, 0.5, 0);
      }
      continue;
    }
    const P = dragon.position, from = _Etop.set(t.x, t.y + 27 * TOWER_SY, t.z), d = from.distanceTo(P);   // la batería, en la plataforma de arriba
    if (d > AA_RANGE || state !== 'playing') { t.burst = 0; continue; }
    t.cool -= dt;
    if (t.cool > 0) continue;
    if (!(t.burst > 0)) {                                                         // nueva ráfaga, si lo ve
      if (!losClear(from.x, from.y, from.z, P.x, P.y, P.z)) { t.cool = 0.6; continue; }
      t.burst = AA_BURST;
    }
    _Eaa.copy(P).addScaledVector(dragonVel, d / AA_SPEED);                      // punto de interceptación
    _Eaa.sub(from).normalize();
    _Eaa2.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(AA_SPREAD);
    spawnFireball(from, _Eaa.add(_Eaa2).normalize(), true, clamp(1.1 - d / AA_RANGE, 0.15, 0.6), 'aa');
    t.burst--; t.cool = t.burst > 0 ? AA_RATE : rnd(AA_PAUSE[0], AA_PAUSE[1]);
  }
}

/* ---------- Sonido procedural (Web Audio) ---------- */
const sfx = (() => {
  let ctx = null, master = null, noiseBuf = null, whiteBuf = null, wind = null, rumble = null, brn = null, muted = false;
  const S = {
    get ready() { return !!ctx; }, get muted() { return muted; },
    init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55 * audioVol.sfx; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); let b = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.04 * w) / 1.04; d[i] = b * 3.2; }   // ruido marrón
      // v13: viento en tres capas que siguen a la velocidad (y se hinchan al acelerar): soplo grave (ruido marrón), siseo agudo en estéreo
      // (ruido blanco, dos canales con ráfagas lentas desfasadas) y un silbido estrecho que solo aparece a mucha velocidad (picados y boost)
      whiteBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      { const w = whiteBuf.getChannelData(0); for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1; }
      const layer = (buf, type, f, q, pan) => {
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0; src.connect(fl); fl.connect(g);
        if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master); } else g.connect(master);
        src.start(0, Math.random() * 1.9); return { f: fl, g };
      };
      const gust = (param, hz, depth) => { const o = ctx.createOscillator(); o.frequency.value = hz; const d = ctx.createGain(); d.gain.value = depth; o.connect(d); d.connect(param); o.start(); return d; };
      wind = { lo: layer(noiseBuf, 'lowpass', 300, 0.7), hiL: layer(whiteBuf, 'bandpass', 1400, 0.8, -0.6), hiR: layer(whiteBuf, 'bandpass', 1700, 0.8, 0.6), wh: layer(whiteBuf, 'bandpass', 2200, 9) };
      wind.gusts = [gust(wind.hiL.g.gain, 0.19, 0), gust(wind.hiR.g.gain, 0.27, 0), gust(wind.lo.g.gain, 0.13, 0), gust(wind.wh.f.frequency, 0.31, 220)];
      const ro = ctx.createOscillator(); ro.type = 'sawtooth'; ro.frequency.value = 46;
      const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 120;
      const rg = ctx.createGain(); rg.gain.value = 0.05;
      ro.connect(rf); rf.connect(rg); rg.connect(master); ro.start();
      rumble = { o: ro, g: rg };
      // aliento continuo: rugido de la llamarada (ruido); en silencio hasta que se usa
      const bs = ctx.createBufferSource(); bs.buffer = noiseBuf; bs.loop = true;
      const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.Q.value = 0.6; bf.frequency.value = 650;
      const bg = ctx.createGain(); bg.gain.value = 0;
      bs.connect(bf); bf.connect(bg); bg.connect(master); bs.start();
      // rayo de energía: dientes de sierra desafinados (baten) + octava y subgrave, por un paso bajo resonante que «ulula» con un LFO,
      // más un chisporroteo agudo y un trémolo rápido. En silencio hasta que se usa
      const eg = ctx.createGain(); eg.gain.value = 0; eg.connect(master);
      const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1200; ef.Q.value = 7; ef.connect(eg);
      for (const [type, f, g] of [['sawtooth', 73, 0.5], ['sawtooth', 73 * 1.012, 0.5], ['square', 146, 0.22], ['sine', 36.5, 0.9]]) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = g; o.connect(og); og.connect(ef); o.start();
      }
      const lfo = ctx.createOscillator(); lfo.frequency.value = 7.5; const lfoG = ctx.createGain(); lfoG.gain.value = 650; lfo.connect(lfoG); lfoG.connect(ef.frequency); lfo.start();
      const es = ctx.createBufferSource(); es.buffer = noiseBuf; es.loop = true; const esf = ctx.createBiquadFilter(); esf.type = 'highpass'; esf.frequency.value = 2200;
      const esg = ctx.createGain(); esg.gain.value = 2.2; es.connect(esf); esf.connect(esg); esg.connect(eg); es.start();
      const tr = ctx.createOscillator(); tr.frequency.value = 31; const trG = ctx.createGain(); trG.gain.value = 0; tr.connect(trG); trG.connect(eg.gain); tr.start();
      brn = { f: bf, g: bg, eg, ef, trG };
    },
    toggleMute() { muted = !muted; this.applyVolume(); return muted; },
    applyVolume() { if (master) master.gain.value = muted ? 0 : 0.55 * audioVol.sfx; },   // volumen de efectos de «Opciones»
    /* v: velocidad / VMAX (0-1; crucero ≈ 0,5; 0 fuera de partida), acc: aceleración suavizada (m/s²) */
    update(speedNorm, throttle, boost, hover, v, acc) {
      if (!ctx) return;
      boost = boost || 0; hover = hover || 0; v = clamp(v || 0, 0, 1);
      const t = ctx.currentTime, swell = clamp((acc || 0) / 35, -0.4, 1), on = v > 0.001 ? 1 : 0;   // al acelerar el viento crece; al frenar, cae
      const lo = on * (0.03 + 0.5 * Math.pow(v, 1.4)) * (1 + 0.35 * swell) * (1 - 0.6 * hover);
      const hi = on * (0.006 + 0.3 * Math.pow(v, 2.3) + 0.08 * boost) * (1 + 0.6 * Math.max(0, swell)) * (1 - 0.7 * hover);
      wind.lo.g.gain.setTargetAtTime(lo, t, 0.25); wind.lo.f.frequency.setTargetAtTime(220 + 700 * v + 200 * boost, t, 0.3);
      for (const [L, f0] of [[wind.hiL, 900], [wind.hiR, 1150]]) { L.g.gain.setTargetAtTime(hi, t, 0.2); L.f.frequency.setTargetAtTime(f0 + 2600 * v + 700 * boost, t, 0.3); }
      wind.gusts[0].gain.setTargetAtTime(hi * 0.45, t, 0.3); wind.gusts[1].gain.setTargetAtTime(hi * 0.45, t, 0.3); wind.gusts[2].gain.setTargetAtTime(lo * 0.25, t, 0.3);
      const whistle = on * (0.07 * smooth(0.5, 0.95, v) + 0.03 * boost);                 // silbido: picados y boost
      wind.wh.g.gain.setTargetAtTime(whistle, t, 0.3); wind.wh.f.frequency.setTargetAtTime(1300 + 2400 * v, t, 0.4);
      rumble.o.frequency.setTargetAtTime(42 + throttle * 20 + boost * 26 - hover * 8, t, 0.3);
      rumble.g.gain.setTargetAtTime(0.03 + throttle * 0.05 * (1 - hover * 0.6) + boost * 0.07 + hover * 0.02, t, 0.3);
    },
    noise(dur, type, f0, f1, vol, q) {
      if (!ctx) return;
      const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    },
    tone(type, f0, f1, dur, vol) {
      if (!ctx) return;
      const t = ctx.currentTime, o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(18, f1), t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    },
    /* v13: aletazo (bajada de las alas): golpe sordo de la membrana + soplo de aire que barre de grave a agudo y vuelve, y un leve
       aleteo de la piel. amount: fuerza (0-1); near: 1 en 1ª persona (las alas a un par de metros), menos en 3ª */
    flap(amount, near) {
      if (!ctx || amount < 0.03) return;
      const a = amount * (near == null ? 1 : near), t = ctx.currentTime;
      this.noise(0.2, 'lowpass', 420, 110, 0.3 * a, 0.9);
      this.tone('sine', 64, 36, 0.22, 0.2 * a);
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
      f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1500, t + 0.16); f.frequency.exponentialRampToValueAtTime(420, t + 0.5);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * a + 0.0002, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + 0.6);
      const w = ctx.createBufferSource(); w.buffer = whiteBuf; w.loop = true;                // la piel de la membrana, tensa: unos chasquidos rápidos
      const wf = ctx.createBiquadFilter(); wf.type = 'highpass'; wf.frequency.value = 2400;
      const wg = ctx.createGain(); wg.gain.setValueAtTime(0, t);
      for (let i = 0; i < 4; i++) { const ti = t + 0.03 + i * 0.035; wg.gain.setValueAtTime(0.05 * a * (1 - i * 0.2), ti); wg.gain.setValueAtTime(0, ti + 0.012); }
      w.connect(wf); wf.connect(wg); wg.connect(master); w.start(t, Math.random()); w.stop(t + 0.25);
    },
    /* subida de las alas: un soplo más suave (el aire que se aparta) */
    flapUp(amount, near) { if (amount > 0.05) this.noise(0.38, 'bandpass', 700, 300, 0.16 * amount * (near == null ? 1 : near), 0.9); },
    /* en pausa y fuera de partida: el viento, en silencio */
    quiet() { if (!ctx) return; const t = ctx.currentTime; for (const L of [wind.lo, wind.hiL, wind.hiR, wind.wh]) L.g.gain.setTargetAtTime(0, t, 0.1); for (const d of wind.gusts.slice(0, 3)) d.gain.setTargetAtTime(0, t, 0.1); },
    fire(v) { v = v == null ? 1 : v; if (v < 0.04) return; this.noise(0.65, 'bandpass', 2200, 260, 0.55 * v, 0.9); this.tone('sawtooth', 150, 48, 0.5, 0.16 * v); },
    roar(v) { v = v == null ? 1 : v; if (v < 0.04) return; this.noise(1.1, 'bandpass', 700, 180, 0.5 * v, 1.2); this.tone('sawtooth', 120, 52, 0.9, 0.2 * v); },
    boom(size) { if (size < 0.05) return; this.noise(1.6, 'lowpass', 900, 50, 0.95 * Math.min(1, size), 0.7); this.tone('sine', 78, 22, 1.2, 0.8 * Math.min(1, size)); },
    hit() { this.noise(0.3, 'lowpass', 1200, 200, 0.4, 0.8); this.tone('sine', 120, 40, 0.25, 0.3); },
    hurt() { this.noise(0.5, 'lowpass', 700, 90, 0.8, 0.8); this.tone('sine', 90, 30, 0.4, 0.6); },
    lock() { this.tone('square', 1320, 1320, 0.06, 0.07); setTimeout(() => this.tone('square', 1760, 1760, 0.09, 0.07), 70); },
    beep() { this.tone('square', 880, 880, 0.09, 0.07); },
    radio() { this.noise(0.14, 'bandpass', 2400, 1600, 0.16, 1.4); this.tone('sine', 1180, 1180, 0.06, 0.05); setTimeout(() => this.tone('sine', 1560, 1560, 0.07, 0.045), 65); },   // v15: alguien habla por radio
    areaTick(s) { const f = s <= 5 ? 1180 : 860; this.tone('triangle', f, f, 0.12, s <= 5 ? 0.11 : 0.07); },                                                             // v15: cuenta atrás fuera del área
    boost() { this.noise(0.9, 'bandpass', 350, 3200, 0.55, 0.7); this.tone('sawtooth', 70, 140, 0.55, 0.12); },
    hoverOn() { this.noise(0.8, 'lowpass', 900, 160, 0.5, 0.7); },
    hoverOff() { this.noise(0.6, 'bandpass', 300, 1800, 0.4, 0.8); },
    empty() { this.tone('square', 220, 160, 0.16, 0.06); },
    shot(v) { v = v == null ? 1 : v; if (v < 0.04) return; this.noise(0.16, 'bandpass', 3200, 700, 0.26 * v, 0.9); this.tone('triangle', 420, 140, 0.1, 0.05 * v); },
    /* v21: dirigibles: disparo arcano (zumbido que cae), carga de energía al morir y explosión de energía */
    arcShot(v) { v = v == null ? 1 : v; if (v < 0.04) return; this.tone('triangle', 980, 240, 0.16, 0.07 * v); this.noise(0.2, 'bandpass', 2600, 900, 0.14 * v, 2.2); },
    energyCharge(v) { v = v == null ? 1 : v; this.tone('sine', 260, 2200, 0.45, 0.13 * v); this.noise(0.45, 'highpass', 3000, 9000, 0.2 * v, 1.2); },
    energyBlast(v) {
      v = v == null ? 1 : v;
      this.noise(2.4, 'lowpass', 2400, 40, 1.0 * v, 0.6); this.tone('sine', 66, 18, 2, 0.9 * v); this.tone('sawtooth', 240, 30, 1, 0.22 * v);
      this.noise(1.3, 'highpass', 6500, 1600, 0.4 * v, 0.8); this.tone('sine', 1400, 120, 0.9, 0.12 * v);
    },
    launch(v) { v = v == null ? 1 : v; if (v < 0.04) return; this.noise(1.0, 'bandpass', 260, 1400, 0.6 * v, 0.8); this.tone('sawtooth', 90, 36, 0.8, 0.18 * v); },
    warnLock() { this.tone('square', 720, 720, 0.07, 0.05); setTimeout(() => this.tone('square', 960, 960, 0.07, 0.05), 90); },   // te están fijando
    warnMissile() { this.tone('square', 1320, 1320, 0.05, 0.07); },
    shieldOn() { this.tone('sine', 260, 980, 0.45, 0.16); this.tone('triangle', 520, 1960, 0.45, 0.06); this.noise(0.6, 'highpass', 2500, 7000, 0.18, 0.7); },
    shieldHit() { this.tone('triangle', 1100, 260, 0.25, 0.12); this.noise(0.35, 'bandpass', 3200, 900, 0.3, 1.2); },
    shieldOff() { this.tone('sine', 820, 200, 0.5, 0.1); },                                                            // bola guiada en camino
    lockTick(p) { const f = 900 + 600 * p; this.tone('square', f, f, 0.045, 0.05); },
    locked() { this.tone('square', 1760, 1760, 0.22, 0.06); },
    overheat() { this.noise(1.4, 'highpass', 5000, 1200, 0.45, 0.7); this.tone('square', 330, 110, 0.5, 0.07); },
    ultReady() { this.tone('sine', 660, 660, 0.12, 0.12); setTimeout(() => this.tone('sine', 990, 990, 0.28, 0.12), 110); },
    /* rayo: silbido de carga que sube y, a los ~0,4 s (cuando sale el rayo), el estallido */
    laserOn() {
      this.tone('sine', 180, 1600, 0.45, 0.16); this.noise(0.5, 'bandpass', 500, 5000, 0.35, 1.5);
      setTimeout(() => { this.noise(1.3, 'lowpass', 3000, 120, 0.9, 0.7); this.tone('sawtooth', 110, 40, 0.9, 0.25); this.tone('sine', 70, 28, 1.1, 0.7); }, 380);
    },
    laserOff() { this.tone('sine', 900, 90, 0.7, 0.12); this.noise(0.8, 'bandpass', 2400, 200, 0.3, 1); },
    /* fl, la: intensidad de la llamarada y del rayo (0-1) */
    breath(fl, la) {
      if (!ctx) return;
      const t = ctx.currentTime;
      brn.g.gain.setTargetAtTime(0.55 * fl, t, 0.06);
      brn.eg.gain.setTargetAtTime(0.2 * la, t, la ? 0.08 : 0.15);
      brn.trG.gain.setTargetAtTime(0.05 * la, t, 0.08);
    }
  };
  return S;
})();

