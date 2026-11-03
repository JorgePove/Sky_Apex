
/* ============================================================
   6i. PORTAL ARCANO Y RAYO DEL SUPERDIRIGIBLE (v34, Capítulo 1)
   · Portal (acción «portal» de un evento: { dist, bearing, height, r, form, close, hp, tag, beam }): un disco vertical de energía arcana
     (un plano con un shader: remolino morado oscuro con un anillo brillante y un halo; provisional, como pidió Jorge: «un sprite plano con
     transparencia por ahora») que se abre en el cielo a dist m del jugador, en el rumbo de brújula bearing y a height m del suelo, de cara
     a él. Tarda form s en abrirse; luego sale el superdirigible (con la vida hp de la receta) y, cuando ha salido entero, se cierra en
     close s. Señales para los eventos (M2): 'portal_abierto', 'portal_fuera' (el superdirigible ya ha salido) y 'portal_cerrado'.
   · Salida del superdirigible: nace al otro lado del plano del portal y avanza hacia el jugador a PORTAL_EMERGE m/s; lo que aún no ha
     cruzado no se dibuja (un plano de recorte en sus materiales). Luego frena a su velocidad del Excel y sigue avanzando despacio.
   · superLaunch: los dragones de un escuadrón con from: 'super' despegan de sus costados (la mitad por cada lado).
   · Rayo (beam: true en el portal; stats en la pestaña «Superdirigible», sección «Rayo»): rayo_espera s después de cerrarse el portal
     junta energía arcana en la proa (una esfera que crece durante rayo_carga s) y dispara un rayo enorme, como el del jugador pero más
     grueso e intenso y con su mismo sonido, hacia uno de los aliados al azar. Nunca apunta al jugador (descarta a los aliados cuya línea
     pasa a menos de BEAM_SAFE m de él y deja de seguir al blanco si se acercaría); si el jugador se mete en él, le quema (rayo_dano/s).
     Dura rayo_duracion s siguiendo al aliado con retraso (rayo_giro °/s), quema el suelo donde choca y se repite cada rayo_repetir s.
     Señales: 'rayo_carga', 'rayo_fuego' (dato: el id del aliado al que apunta) y 'rayo_fin'.
   ============================================================ */
const PORTAL_EMERGE = 85;                 // m/s del superdirigible mientras sale del portal
const BEAM_SAFE = 320;                    // m: distancia mínima del jugador a la línea del rayo al elegir blanco
const BEAM_COL = new THREE.Color(0.78, 0.5, 1);
const PORTAL = { on: false, phase: '', t: 0, r: 300, form: 7, close: 3, mesh: null, glow: null, pos: new THREE.Vector3(), n: new THREE.Vector3(), plane: new THREE.Plane(), u: null, beam: false, o: null };
const _Pa = new THREE.Vector3(), _Pb = new THREE.Vector3(), _Pc = new THREE.Vector3(), _Pd = new THREE.Vector3(), _Pq = new THREE.Quaternion(), _Pq2 = new THREE.Quaternion();
let portalMat = null;
function portalMaterial() {
  if (portalMat) return portalMat;
  portalMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: unitTime, uOpen: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uOpen, uAlpha; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x), R = max(uOpen, 0.001), rr = r / R;
        if (rr > 1.45) discard;
        float s1 = 0.5 + 0.5 * sin(a * 5.0 + rr * 13.0 - uTime * 2.4), s2 = 0.5 + 0.5 * sin(a * 9.0 - rr * 23.0 + uTime * 3.6);
        float rim = exp(-pow((rr - 1.0) * 10.0, 2.0)), inside = 1.0 - smoothstep(0.97, 1.0, rr);
        vec3 voidC = mix(vec3(0.03, 0.0, 0.07), vec3(0.34, 0.12, 0.58), s1 * (0.25 + 0.75 * rr)) + vec3(0.7, 0.45, 1.0) * s2 * 0.3 * rr * rr;
        vec3 col = mix(voidC, vec3(0.92, 0.82, 1.0), rim);
        float halo = (1.0 - smoothstep(1.0, 1.45, rr)) * step(1.0, rr) * (0.55 + 0.25 * s2);
        col = mix(col, vec3(0.62, 0.36, 1.0), step(1.0, rr) * (1.0 - rim));
        gl_FragColor = vec4(col, max(max(inside * 0.94, rim), halo) * uAlpha); }`
  });
  return portalMat;
}
/* Abre el portal (acción «portal»). */
function portalOpen(o) {
  portalReset();
  const P = dragon.position, b = (o.bearing || 0) * Math.PI / 180, d = o.dist || 6000;
  const x = P.x + Math.sin(b) * d, z = P.z - Math.cos(b) * d;
  PORTAL.pos.set(x, groundAt(x, z) + (o.height || 1500), z);
  PORTAL.n.set(P.x - x, 0, P.z - z).normalize();              // de cara al jugador
  PORTAL.plane.setFromNormalAndCoplanarPoint(PORTAL.n, PORTAL.pos);
  Object.assign(PORTAL, { on: true, phase: 'opening', t: 0, r: o.r || 300, form: o.form || 7, close: o.close || 3, u: null, beam: !!o.beam, o });
  const s = PORTAL.r * 1.45;
  PORTAL.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * s, 2 * s), portalMaterial());
  PORTAL.mesh.position.copy(PORTAL.pos); PORTAL.mesh.lookAt(_Pa.copy(PORTAL.pos).add(PORTAL.n)); PORTAL.mesh.renderOrder = 6; PORTAL.mesh.frustumCulled = false;
  scene.add(PORTAL.mesh);
  PORTAL.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: 0xa070ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  PORTAL.glow.position.copy(PORTAL.pos); PORTAL.glow.renderOrder = 7; scene.add(PORTAL.glow);
  sfx.energyCharge(1); sfx.noise(7, 'lowpass', 260, 50, 0.7, 0.7); sfx.tone('sine', 46, 30, 7, 0.5);
  missionSignal('portal_abre');
}
function portalReset() {
  if (PORTAL.mesh) { scene.remove(PORTAL.mesh); PORTAL.mesh.geometry.dispose(); PORTAL.mesh = null; }
  if (PORTAL.glow) { scene.remove(PORTAL.glow); PORTAL.glow.material.dispose(); PORTAL.glow = null; }
  PORTAL.on = false; PORTAL.phase = ''; PORTAL.u = null;
  superBeamOff();
}
/* Cada fotograma (desde updateUnits). */
function updatePortal(dt) {
  if (!PORTAL.on) return;
  const T = PORTAL, R = T.r, U = portalMaterial().uniforms;
  T.t += dt;
  let open = 1;
  if (T.phase === 'opening') {
    const k = clamp(T.t / T.form, 0, 1); open = k * k * (3 - 2 * k);
    if (Math.random() < dt * 9) blastBolt(_Pa.copy(T.pos).addScaledVector(portalEdge(_Pb, Math.random() * 6.283), R * open), R * rnd(0.3, 0.7), 2.5);
    camShake = Math.max(camShake, 0.25 * k * clamp(1.4 - T.pos.distanceTo(dragon.position) / 9000, 0.2, 1));
    if (k >= 1) { T.phase = 'open'; T.t = 0; superEmerge(); missionSignal('portal_abierto'); sfx.energyBlast(0.7); }
  } else if (T.phase === 'open') {
    const u = T.u;
    if (u && u.mv && u.mv.out) { T.phase = 'closing'; T.t = 0; missionSignal('portal_fuera'); }
  } else if (T.phase === 'closing') {
    const k = clamp(T.t / T.close, 0, 1); open = 1 - k * k;
    if (k >= 1) { T.phase = 'closed'; missionSignal('portal_cerrado'); sfx.energyBlast(0.5); if (T.u && T.beam) superBeamArm(T.u); scene.remove(T.mesh); scene.remove(T.glow); T.on = false; return; }
  }
  U.uOpen.value = open / 1.45; U.uAlpha.value = 1;
  T.glow.material.opacity = 0.55 * open; T.glow.scale.setScalar(R * 4.2 * (0.6 + 0.4 * open) * (1 + 0.05 * Math.sin(gameTime * 7)));
  // chispas que giran y entran por el borde
  if (T.pos.distanceTo(dragon.position) < 14000) for (let i = 0; i < 6; i++) {
    const a = Math.random() * 6.283; portalEdge(_Pb, a); _Pc.copy(T.pos).addScaledVector(_Pb, R * open * rnd(1.05, 1.4));
    portalEdge(_Pd, a + 1.57).multiplyScalar(rnd(60, 160)).addScaledVector(_Pb, -rnd(30, 90));
    emit(fxAdd, _Pc.x, _Pc.y, _Pc.z, _Pd.x, _Pd.y, _Pd.z, rnd(0.8, 1.6), rnd(10, 18), 2, 0.85, 0.65, 1, 0.9, 0.6, 0);
  }
}
/* Dirección del borde del portal en el ángulo a (en su plano: lateral y vertical). */
function portalEdge(out, a) { return out.set(-PORTAL.n.z * Math.cos(a), Math.sin(a), PORTAL.n.x * Math.cos(a)); }

/* ---------- El superdirigible sale del portal ---------- */
function superEmerge() {
  const T = PORTAL, o = T.o, n = T.n, head = Math.atan2(n.x, -n.z) * 180 / Math.PI;
  const u = addSuper(T.pos.x, T.pos.z, o.height || 1500, head, o.tag ? [].concat(o.tag) : [], { hp: o.hp });
  const L = u.size;
  u.base = T.pos.y; u.pos.set(T.pos.x - n.x * (L * 0.5 + 40), T.pos.y, T.pos.z - n.z * (L * 0.5 + 40));
  u.vel = new THREE.Vector3(); u.jetsOff = true; u.clip = true;
  u.mv = { dir: n.clone(), v: PORTAL_EMERGE, out: false };
  u.move = superMove;
  for (const k of u.kids) superPlace(u, k);
  unitCaps(u); T.u = u;
  if (T.beam) u.beam = { state: 'off', t: 0, n: 0, dir: new THREE.Vector3(), target: null, burstT: 0, boomT: 0 };
  camShake = Math.max(camShake, 0.9); sfx.boom(1);
}
function superMove(u, dt) {
  const m = u.mv, L = u.size, T = PORTAL;
  const along = _Pa.subVectors(u.pos, T.pos).dot(m.dir);    // lo que ha avanzado el centro respecto al plano del portal
  if (!m.out) {
    if (along > L * 0.5 + 30) { m.out = true; superClip(u, false); }
    if (u.jetsOff && along > L * 0.445 + 15) u.jetsOff = false;   // los chorros de popa, al cruzar
  } else m.v = Math.max(STATS.superdirigible.velocidad / 3.6, m.v - dt * 25);   // ya fuera: frena hasta su velocidad (Excel)
  if (u.clip) superClip(u, true);
  u.pos.x += m.dir.x * m.v * dt; u.pos.z += m.dir.z * m.v * dt;
  u.vel.copy(m.dir).multiplyScalar(m.v);
}
/* Recorte por el plano del portal (lo que aún está al otro lado no se ve). Los materiales se crean al cargar el modelo: se aplica cada vez. */
function superClip(u, on) {
  u.clip = on;
  if (on) renderer.localClippingEnabled = true;
  const set = mats => { if (mats) for (const m of mats) if (!!(m.clippingPlanes && m.clippingPlanes.length) !== on) { m.clippingPlanes = on ? [PORTAL.plane] : null; m.needsUpdate = true; } };
  set(u.mats); for (const k of u.kids) set(k.mats);
}
/* Los dragones de un escuadrón con from: 'super' despegan de los costados del superdirigible vivo (la mitad por cada lado). */
function superLaunch(id, q, tags) {
  const u = UNITS.find(x => x.kind === 'superdirigible' && !x.dead);
  if (!u) return false;
  const n = q.n || 1, L = u.size;
  _Pb.set(0, 0, -1).applyQuaternion(u.q); _Pc.set(1, 0, 0).applyQuaternion(u.q);
  enemyState.squadN += n; enemyState.engaged[id] = true;
  for (let i = 0; i < n; i++) {
    const e = squadMember(), side = i % 2 ? 1 : -1, k = (Math.floor(i / 2) / Math.max(1, Math.ceil(n / 2) - 1) - 0.5) * 0.4;
    e.off = false; e.squad = id; e.tags = tags; e.dead = false; e.hp = ENEMY_HP; e.hitFlash = 0; e.fireFlash = 0; e.unknown = false;
    e.fireCool = rnd(1.5, 3); e.mslCool = rnd(8, EMSL_CD); e.mslLock = 0;
    e.pos.copy(u.pos).addScaledVector(_Pc, side * (0.09 * L + 40)).addScaledVector(_Pb, k * L); e.pos.y -= 0.02 * L;
    _Pd.copy(_Pc).multiplyScalar(side).addScaledVector(_Pb, 0.4).normalize();
    e.q.setFromRotationMatrix(_m4.lookAt(ZERO, _Pd, UP));
    e.speed = 90; e.rate.p = e.rate.y = e.rate.r = 0; e.bank = 0; e.avoidT = 0; e.hasWp = false;
    setEnemyMode(e, 'extend'); e.extDir.copy(_Pd).setY(-0.15).normalize(); e.alert = 0;
    resetTrail(e);
  }
  sfx.roar(1);
  return true;
}

/* ---------- Rayo del superdirigible ---------- */
const SB = { layers: null, balls: null };                  // mallas del rayo (compartidas: dispara uno cada vez)
function superBeamRes() {
  if (SB.layers) return SB;
  // [malla, ancho (fracción de rayo_ancho), fracción en la proa, velocidad de las vetas, mezcla con blanco]
  SB.layers = [[makeBeam(1, beamTexture(2.2, 0.9, 0.1, 3, 7)), 0.4, 0.6, 1.7, 0.85], [makeBeam(0.85, beamTexture(4.5, 0.65, 0.35, 3, 7)), 1, 0.5, 1, 0.35], [makeBeam(0.45, beamTexture(3, 0.5, 0.5, 2, 5)), 2, 0.45, 0.6, 0]];
  SB.balls = { core: beamBall(70, 1), halo: beamBall(190, 0.75), tipCore: beamBall(80, 1), tipHalo: beamBall(240, 0.6) };
  return SB;
}
function superBeamOff() {
  if (!SB.layers) return;
  for (const L of SB.layers) L[0].visible = false;
  for (const k in SB.balls) SB.balls[k].visible = false;
  sfx.extBeam(0);
}
function superBeamArm(u) { if (u.beam) { u.beam.state = 'wait'; u.beam.t = 0; u.beam.wait = STATS.superdirigible.rayo_espera; } }
const _Sbow = new THREE.Vector3(), _Send = new THREE.Vector3(), _Sw = new THREE.Vector3(), _Sf = new THREE.Vector3();
function superBeamUpdate(u, dt, d) {
  const B = u.beam, S = STATS.superdirigible, R = superBeamRes(), L = u.size;
  if (u.dead || state === 'menu') { if (B.state === 'charge' || B.state === 'fire') { superBeamOff(); B.state = 'off'; } return; }
  if (B.state === 'off' || state !== 'playing') return;
  B.t += dt;
  _Sbow.set(0, 0.004 * L, -0.475 * L).applyQuaternion(u.q).add(u.pos);   // la punta de la proa
  const near = clamp(1.3 - d / 7000, 0.2, 1), pulse = 1 + 0.12 * Math.sin(gameTime * 23) + 0.06 * Math.sin(gameTime * 9);
  if (B.state === 'wait') {
    if (B.t < B.wait) return;
    B.state = 'charge'; B.t = 0; B.n++;
    superBeamPick(u, B);                                   // el aliado al que apuntará: se aparta del jugador mientras carga
    missionSignal('rayo_carga', B.n);
    sfx.energyCharge(near); sfx.tone('sine', 70, 520, Math.max(1, S.rayo_carga), 0.12 * near); sfx.noise(Math.max(1, S.rayo_carga), 'bandpass', 300, 4200, 0.18 * near, 1.4);
  }
  if (B.state === 'charge') {
    const k = clamp(B.t / Math.max(0.5, S.rayo_carga), 0, 1);
    setBall(R.balls.core, _Sbow, (0.15 + 0.85 * k) * pulse, BEAM_COL, 0.85); setBall(R.balls.halo, _Sbow, (0.15 + 0.85 * k) * pulse, BEAM_COL, 0.15);
    for (let i = 0; i < 10; i++) {                         // energía que converge hacia la proa
      _Sw.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); const r = rnd(120, 320);
      emit(fxAdd, _Sbow.x + _Sw.x * r, _Sbow.y + _Sw.y * r, _Sbow.z + _Sw.z * r, -_Sw.x * r * 1.6 + u.vel.x, -_Sw.y * r * 1.6, -_Sw.z * r * 1.6 + u.vel.z, 0.55, rnd(5, 9), 2, 0.85, 0.7, 1, 1, 0, 0);
    }
    if (Math.random() < dt * (3 + 10 * k)) blastBolt(_Sbow, 60 + 140 * k, 1 + 2 * k);
    camShake = Math.max(camShake, 0.18 * k * near);
    if (k >= 1) superBeamFire(u, B);
    return;
  }
  // disparando: sigue al blanco con retraso (sin acercarse a la línea del jugador)
  const P = dragon.position, t = B.target;
  if (t && t.on && t.e) {
    _Sw.subVectors(t.e.pos, _Sbow).normalize();
    if (beamLineDist(_Sbow, _Sw, P) > BEAM_SAFE * 0.7) {
      const ang = B.dir.angleTo(_Sw), max = S.rayo_giro * Math.PI / 180 * dt;
      if (ang > 1e-5) { _Pq.setFromUnitVectors(B.dir, _Sw); _Pq2.identity().slerp(_Pq, Math.min(1, max / ang)); B.dir.applyQuaternion(_Pq2).normalize(); }
    }
  }
  camera.getWorldPosition(_bC);
  const tHit = beamRay(_Sbow, B.dir, S.rayo_alcance), blocked = tHit < S.rayo_alcance;
  const len = Math.min(tHit, B.t * LASER_SHOOT * 2 + 1);   // (sale disparado de la proa)
  const close = Math.min(1, (S.rayo_duracion - B.t) / 0.5), open = Math.min(1, B.t / 0.2) * Math.max(0, close);
  _bS.copy(_Sbow); _bD.copy(B.dir); _Send.copy(_Sbow).addScaledVector(B.dir, len);
  const W = S.rayo_ancho;
  for (const [m, w, w0, sv, wh] of R.layers) { m.material.color.copy(BEAM_COL).lerp(_white, wh); setBeam(m, len, W * w, w0, open * pulse, (gameTime * 4 * sv) % 1, gameTime); }
  setBall(R.balls.core, _Sbow, 1.1 * pulse * Math.max(open, 0.3), BEAM_COL, 0.85); setBall(R.balls.halo, _Sbow, 1.1 * pulse * Math.max(open, 0.3), BEAM_COL, 0.15);
  const hitOn = blocked && len >= tHit - 1;
  setBall(R.balls.tipCore, _Send, (hitOn ? 1.2 : 0.7) * pulse * open, BEAM_COL, 0.8); setBall(R.balls.tipHalo, _Send, (hitOn ? 1.2 : 0.7) * pulse * open, BEAM_COL, 0.1);
  if (!hitOn) { R.balls.tipCore.visible = R.balls.tipHalo.visible = open > 0.05; }
  // donde choca: llamaradas moradas, tierra y humo, quemaduras grandes y estruendo
  if (hitOn) {
    B.burstT -= dt;
    if (B.burstT <= 0) {
      B.burstT = 0.05;
      for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, c = rnd(0, 1), sp = rnd(30, 120); emit(fxAdd, _Send.x, _Send.y + 5, _Send.z, Math.cos(a) * sp * (1 - c), c * sp + 20, Math.sin(a) * sp * (1 - c), rnd(0.5, 1.1), rnd(20, 35), rnd(50, 90), BEAM_COL.r, BEAM_COL.g * rnd(0.8, 1.1), BEAM_COL.b, 0.85, 1.4, -4); }
      for (let i = 0; i < 4; i++) { const a = Math.random() * 6.283, sp = rnd(20, 70); emit(fxSmoke, _Send.x + rnd(-20, 20), _Send.y + 8, _Send.z + rnd(-20, 20), Math.cos(a) * sp, rnd(20, 50), Math.sin(a) * sp, rnd(2.5, 4.5), rnd(25, 40), rnd(90, 150), 0.2, 0.17, 0.2, 0.6, 0.5, -1); }
      scorchAt(_Send.x + rnd(-15, 15), _Send.z + rnd(-15, 15), 26);
    }
    B.boomT -= dt; if (B.boomT <= 0) { B.boomT = 0.45; sfx.boom(clamp(1.2 - _Send.distanceTo(P) / 6000, 0.2, 0.9)); }
    camShake = Math.max(camShake, 0.6 * clamp(1 - _Send.distanceTo(P) / 3000, 0, 1));
  }
  camShake = Math.max(camShake, 0.25 * near);
  sfx.extBeam(near * open);
  // el jugador dentro del rayo: quema (nunca le apunta; esto es si se cruza)
  if (beamSegDist(_Sbow, _Send, P) < S.rayo_radio) hurtDragon(S.rayo_dano * dt, 'Te alcanzó el rayo del superdirigible', true);
  if (B.t >= S.rayo_duracion) {
    B.state = 'wait'; B.t = 0; B.wait = S.rayo_repetir; B.target = null;
    superBeamOff(); sfx.laserOff(); missionSignal('rayo_fin', B.n);
  }
}
/* Al empezar la carga: un aliado al azar, que se aparta BEAM_FLEE m a un lado de la línea proa-jugador (a.flee, 6e: «¡dispersaos!»). */
const BEAM_FLEE = 1700;
function superBeamPick(u, B) {
  const live = allies.filter(a => a.on && a.e);
  B.target = live.length ? live[Math.floor(Math.random() * live.length)] : null;
  if (B.target) B.target.flee = { until: gameTime + STATS.superdirigible.rayo_carga + 1.5, side: Math.random() < 0.5 ? -1 : 1, from: _Sbow.clone(), d: BEAM_FLEE };
}
/* Dispara: al aliado elegido si la línea no pasa cerca del jugador y está delante de la proa; si no, a otro que cumpla; si ninguno, hacia
   delante, abajo y al lado contrario al jugador. */
function superBeamFire(u, B) {
  const P = dragon.position, cand = [];
  _Sf.set(0, 0, -1).applyQuaternion(u.q);
  const ok = a => { if (!a || !a.on || !a.e) return false; _Sw.subVectors(a.e.pos, _Sbow).normalize(); return _Sw.dot(_Sf) > Math.cos(1.4) && beamLineDist(_Sbow, _Sw, P) > BEAM_SAFE; };
  if (!ok(B.target)) { for (const a of allies) if (ok(a)) cand.push(a); B.target = cand.length ? cand[Math.floor(Math.random() * cand.length)] : null; }
  if (B.target) {                                          // empieza un poco por detrás del aliado: le da tiempo a apartarse
    _Sw.copy(B.target.e.vel).multiplyScalar(-1.2).add(B.target.e.pos).sub(_Sbow);
    B.dir.copy(_Sw).normalize();
    const a = B.target; a.flee = null; a.breakT = 3.5; a.chaseT = 0; a.breakDir.subVectors(a.e.pos, _Sbow).cross(UP).normalize().setY(0.45).normalize();   // (esquiva de lado y hacia arriba)
  } else {                                                 // sin aliado a tiro: hacia delante, abajo y al lado contrario al jugador
    _Sw.subVectors(P, _Sbow); const side = _Sw.dot(_Pc.set(1, 0, 0).applyQuaternion(u.q)) > 0 ? -1 : 1;
    B.dir.copy(_Sf).addScaledVector(_Pc, side * 0.45).setY(-0.3).normalize();
  }
  B.state = 'fire'; B.t = 0; B.burstT = 0; B.boomT = 0;
  missionSignal('rayo_fuego', B.target ? B.target.id : '');
  sfx.laserOn(); camShake = Math.max(camShake, 0.8);
}
/* Distancia del punto p a la recta (o, dirección d) por delante de o, y al segmento a→b. */
function beamLineDist(o, d, p) { _Pa.subVectors(p, o); const t = Math.max(0, _Pa.dot(d)); return _Pa.addScaledVector(d, -t).length(); }
function beamSegDist(a, b, p) { return Math.sqrt(segPointDist2(a, b, p)); }
