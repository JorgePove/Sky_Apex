
/* ============================================================
   6h. LA SIERPE (v29): dragón serpiente gigante, el primer minijefe (estilo Ace Combat)
   Modelo: «Kang Jin Long» de Black Myth: Wukong (estático, recto; v30: desde el FBX original del zip de dragones raw/, con sus aletas: el
   GLB traía las patas delanteras estiradas), preparado en Blender (enemigos/02_preparar.py: 60 000 triángulos, 1 m de largo, cabeza hacia
   -Z). El juego lo escala a «largo» (500 m) y lo hace serpentear sin esqueleto: cada vértice va pegado a su punto de una columna de SPINE_N
   puntos (posición y orientación) que se calcula cada fotograma y se pasa al shader (serpentMaterial). Así el cuerpo sigue exactamente el
   camino de la cabeza. Las patas van rígidas, pegadas al punto de su hombro o su cadera (atributo aS, serpentAnchors, con los pesos de los
   huesos de cada pata que deja Blender en el segundo canal UV): si no, la onda las retorcía.
   · Modos: 'idle' (galería: flota en el sitio y una onda le recorre el cuerpo de la cabeza a la cola) y 'circle' (vuela en círculo de
     radio_circulo a velocidad, a su altura, con el cuerpo detrás por el mismo círculo).
   · Ataques: llamarada sostenida, mucho mayor que la del jugador, si te pones delante de la cabeza (llamas_*), y bolas de fuego como las
     de los dragones enemigos (bola_*). Sin guiadas ni rayo.
   · Escudo: los hechiceros de su lomo (hechiceros, 3) lo protegen de todo daño; hay que abatirlos primero (se fijan aparte). Al caer el
     último, el escudo se rompe y la sierpe ya recibe daño.
   ============================================================ */
const SPINE_N = 40;                                         // puntos de la columna (el shader interpola entre ellos)
const SERPENT_AXIS_Y = -0.006;                              // altura del eje del cuerpo en el modelo (fracción del largo; medido en 04_sondear.py)
const SERPENT_WAVE = { len: 0.33, amp: 0.035, w: 1.1, up: 0.45 };   // onda: longitud y amplitud (fracción del largo), rad/s, parte vertical
const SORC_AT = [0.2, 0.33, 0.46], SORC_TOP = 0.0145, SORC_SCALE = 5;   // hechiceros: dónde van (fracción desde la cabeza), altura sobre el eje (fracción del largo), tamaño
const _Sp = new THREE.Vector3(), _St = new THREE.Vector3(), _Su = new THREE.Vector3(), _Sr = new THREE.Vector3(), _Sm = new THREE.Matrix4(), _Sq = new THREE.Quaternion();
const _Sa = new THREE.Vector3(), _Sb = new THREE.Vector3(), _Sv = new THREE.Vector3();
const SERPENT_GLSL = `
  uniform vec3 uSpP[${SPINE_N}]; uniform vec4 uSpQ[${SPINE_N}]; uniform float uLen; uniform float uInfl; attribute float aS;
  vec3 spRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }`;
/* Del vértice del modelo (1 m de largo, eje en z) a su sitio en la columna: frame (Q) en beginnormal, posición en begin_vertex. aS = su punto de
   la columna (el suyo, z + 0,5; en las patas, el del hombro: lo que sobresale a lo largo, spLocal.z, va rígido con él). */
const SERPENT_FRAME = `
  float spS = clamp(aS, 0.0, 1.0) * ${SPINE_N - 1}.0;
  vec3 spLocal = vec3(position.x, position.y - ${SERPENT_AXIS_Y}, position.z - (aS - 0.5));
  int spI = int(min(floor(spS), ${SPINE_N - 2}.0)); float spT = spS - float(spI);
  vec4 spQ = normalize(mix(uSpQ[spI], uSpQ[spI + 1], spT));
  vec3 spP = mix(uSpP[spI], uSpP[spI + 1], spT);`;
function serpentUniforms() {
  return { uSpP: { value: Array.from({ length: SPINE_N }, () => new THREE.Vector3()) }, uSpQ: { value: Array.from({ length: SPINE_N }, () => new THREE.Vector4(0, 0, 0, 1)) },
    uLen: { value: 500 }, uInfl: { value: 0 } };
}
function serpentMaterial(src, U) {
  const m = src.clone();
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = SERPENT_GLSL + '\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', SERPENT_FRAME + '\n  vec3 objectNormal = spRot(spQ, vec3(normal));')
      .replace('#include <begin_vertex>', 'vec3 transformed = spP + spRot(spQ, spLocal * uLen);');
  };
  return m;
}
/* Escudo: la misma malla un poco hinchada (uInfl m por la normal), aditiva, con brillo en los bordes y un dibujo que se mueve. */
function shieldMaterial(U) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: Object.assign({ uA: { value: 1 }, uHit: { value: 0 }, uTime: soldierTime, uC: { value: new THREE.Color(ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2]) } }, U),
    vertexShader: SERPENT_GLSL + `
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){` + SERPENT_FRAME + `
        vec3 n = spRot(spQ, normal);
        vec3 w = spP + spRot(spQ, spLocal * uLen) + n * uInfl;
        vW = w; vN = n; vec4 mv = viewMatrix * vec4(w, 1.0); vV = normalize(-mv.xyz); vN = normalize(mat3(viewMatrix) * n);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform float uHit; uniform float uTime; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float bands = 0.5 + 0.5 * sin(vW.x * 0.09 + vW.y * 0.13 + vW.z * 0.07 - uTime * 3.0);
        float hexa = smoothstep(0.82, 1.0, abs(sin(vW.x * 0.21 + uTime)) * abs(sin(vW.z * 0.21 - uTime * 0.7)));
        float a = (0.03 + 0.75 * pow(f, 2.6) + 0.12 * bands * f + 0.12 * hexa) * uA * (1.0 + 2.5 * uHit);
        gl_FragColor = vec4(uC * a, 1.0); }`
  });
}
function serpentPrepare() { serpentAnchors(); for (const u of UNITS) if (u.kind === 'sierpe' && !u.model) serpentModel(u); }
/* v30: aS de cada vértice: su z + 0,5 en el cuerpo; en las patas, hacia el punto del hombro o la cadera de la suya según el peso de sus huesos
   (uv2 = (ese punto, peso), de enemigos/02_preparar.py): el arranque de la pata se dobla con el cuerpo y el resto va rígido. */
function serpentAnchors() {
  for (const p of unitRes.sierpe) {
    const P = p.geo.attributes.position, A = p.geo.attributes.uv2, a = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      const w = A ? smooth(0.15, 0.85, 1 - A.getY(i)) : 0;   // (glTF guarda la V de las UV invertida: 1 - peso)
      a[i] = lerp(P.getZ(i) + 0.5, A ? A.getX(i) : 0, w);
    }
    p.geo.setAttribute('aS', new THREE.BufferAttribute(a, 1));
  }
}
function serpentModel(u) {
  if (!unitRes.sierpe) return;
  const g = new THREE.Group(), mats = [];
  for (const p of unitRes.sierpe) { const m = serpentMaterial(p.mat, u.U); mats.push(m); const me = new THREE.Mesh(p.geo, m); me.frustumCulled = false; g.add(me); }
  u.shieldMat = shieldMaterial(u.U);
  for (const p of unitRes.sierpe) {                       // (las aletas, recortadas por su alfa, no: el escudo saldría con su rectángulo)
    if (p.mat.alphaTest) continue;
    const me = new THREE.Mesh(p.geo, u.shieldMat); me.frustumCulled = false; me.renderOrder = 6; g.add(me); u.shieldMeshes.push(me);
  }
  u.model = g; u.mats = mats; scene.add(g);
}

/* mode: 'idle' (quieta, ondulando) o 'circle' (vuela en círculo alrededor de donde nace). */
function addSierpe(x, z, height, heading, tags, mode) {
  const S = STATS.sierpe, ang = heading * Math.PI / 180;
  const u = newUnit('sierpe', { tags: tags || [], label: 'Sierpe', killText: '¡Sierpe abatida!', hp: S.vida, hpMax: S.vida, score: S.puntos, heading: ang,
    markR: 16000, lockRange: 14000, radar: 'serpent', crashText: 'la sierpe', vel: new THREE.Vector3(), mode: mode || 'idle', U: serpentUniforms(), shieldMeshes: [], shield: true, shieldA: 1, shieldHitT: 0, hint: false,
    breath: 0, breathCool: 2, fireCool: 2, theta: 0, t: Math.random() * 10, dieT: 4.5, upd: updSierpe, hurt: serpentHurt, onKill: serpentDie, cleanup: u => { if (u.shieldMat) u.shieldMat.dispose(); } });
  u.size = S.largo; u.half = 40;
  u.home = new THREE.Vector3(x, Math.max(groundAt(x, z) + (height || S.altura), WL + 300), z);
  u.pos.copy(u.home); u.center = u.home.clone();           // (en 'circle' desde la receta: da vueltas alrededor de donde nace)
  u.spP =Array.from({ length: SPINE_N }, () => new THREE.Vector3()); u.spT = Array.from({ length: SPINE_N }, () => new THREE.Vector3());
  u.capDef = null; u.aimAt = new THREE.Vector3();          // (v30: la guiada y el fijado apuntan a su lomo, a un 30 % desde la cabeza: el centro de la caja puede caer fuera del cuerpo)
  serpentSpine(u, 0);
  if (unitRes.sierpe) serpentModel(u);
  const n = clamp(Math.round(S.hechiceros), 0, SORC_AT.length);
  for (let i = 0; i < n; i++) {
    const k = newUnit('hechicero', { tags: tags || [], label: 'Hechicero', killText: 'Hechicero abatido', hp: S.hechicero_vida, hpMax: S.hechicero_vida, score: S.hechicero_puntos,
      parent: u, at: SORC_AT[i], modelKey: 'hechicero', size: SORC_SCALE, half: 7, markR: 6000, lockRange: 14000, radar: '', noCrash: true,
      capDef: [[0, 0.3 * SORC_SCALE, 0, 0, 2.1 * SORC_SCALE, 0, 0.65 * SORC_SCALE]], onKill: sorcererDie,
      killTail: k => { const left = k.parent.kids.filter(x => !x.dead).length; return left ? '  ·  quedan ' + left : '  ·  ¡el escudo cae!'; } });
    u.kids.push(k); sorcererPlace(u, k);
  }
  if (!n) u.shield = false;
  return u;
}
function serpentResize() { for (const u of UNITS) if (u.kind === 'sierpe') u.size = STATS.sierpe.largo; }
/* Cambio de modo (panel de pruebas): el círculo empieza donde está la cabeza y con su rumbo; al volver a 'idle', se queda donde está. */
function serpentMode(u, mode) {
  if (u.mode === mode) return;
  const R = Math.max(u.size * 0.6, STATS.sierpe.radio_circulo), h = u.spP[0], t = u.spT[0], fx = t.x, fz = t.z, l = Math.hypot(fx, fz) || 1;
  if (mode === 'circle') {                                  // tangente del círculo en θ: (-sen θ, cos θ) = rumbo de la cabeza
    u.theta = Math.atan2(-fx / l, fz / l);
    u.center = new THREE.Vector3(h.x - Math.cos(u.theta) * R, u.home.y, h.z - Math.sin(u.theta) * R);
  } else { u.home.set(h.x, u.home.y, h.z); u.heading = Math.atan2(fx / l, -fz / l); }
  u.mode = mode;
}
/* Columna: SPINE_N puntos desde la cabeza (0) hasta la cola, con la onda encima; luego la orientación de cada uno (adelante = hacia la
   cabeza, arriba = el cielo, algo inclinado hacia dentro en el círculo) → uniformes del shader, cápsulas de impacto y u.pos (la cabeza). */
function serpentSpine(u, dt) {
  const S = STATS.sierpe, L = u.size, W = SERPENT_WAVE;
  u.t += dt;
  let bank = 0;
  if (u.mode === 'circle' && !u.dead) {
    const R = Math.max(L * 0.6, S.radio_circulo); u.theta += (S.velocidad / 3.6) / R * dt; bank = 0.25;
  }
  const R = Math.max(L * 0.6, S.radio_circulo), fx = Math.sin(u.heading), fz = -Math.cos(u.heading), k = 2 * Math.PI / (W.len * L);
  for (let i = 0; i < SPINE_N; i++) {
    const s = i / (SPINE_N - 1), dist = s * L, p = u.spP[i];
    if (u.mode === 'circle') {                             // centro del círculo en center; la cabeza va por delante (θ), el cuerpo detrás
      const th = u.theta - dist / R;
      p.set(u.center.x + Math.cos(th) * R, u.home.y, u.center.z + Math.sin(th) * R);
      _Sr.set(Math.cos(th), 0, Math.sin(th));               // (hacia fuera del círculo: la «derecha» de la onda)
    } else {
      p.set(u.home.x - fx * dist, u.home.y + Math.sin(u.t * 0.35) * 6, u.home.z - fz * dist);
      _Sr.set(-fz, 0, fx);
    }
    const a = L * W.amp * smooth(0, 0.18, s) * (u.dead ? 0.3 : 1), ph = k * dist - W.w * u.t;
    p.addScaledVector(_Sr, Math.sin(ph) * a); p.y += Math.sin(ph * 0.7 + 1.3) * a * W.up;
    if (u.dead) p.y -= u.fall * (0.6 + 0.8 * Math.sin(s * 3.1));   // al morir cae (la cabeza y la cola, menos)
  }
  const Q = u.U.uSpQ.value, P = u.U.uSpP.value;
  let prev = null;
  for (let i = 0; i < SPINE_N; i++) {
    const a = u.spP[Math.max(0, i - 1)], b = u.spP[Math.min(SPINE_N - 1, i + 1)];
    _St.subVectors(a, b).normalize();                       // adelante: hacia la cabeza
    if (i === 0) _St.subVectors(u.spP[0], u.spP[1]).normalize();
    u.spT[i].copy(_St);
    _Su.set(0, 1, 0);
    if (bank) { _Sv.set(u.center.x - u.spP[i].x, 0, u.center.z - u.spP[i].z).normalize(); _Su.addScaledVector(_Sv, Math.tan(bank)).normalize(); }
    // ejes del modelo: x → derecha (= adelante × arriba), y → arriba (perpendicular), z → atrás (el frente del modelo es -z)
    _Sr.crossVectors(_St, _Su).normalize(); _Sb.copy(_St).negate(); _Su.crossVectors(_Sb, _Sr);
    _Sm.makeBasis(_Sr, _Su, _Sb); _Sq.setFromRotationMatrix(_Sm);
    if (prev && prev.dot(_Sq) < 0) _Sq.set(-_Sq.x, -_Sq.y, -_Sq.z, -_Sq.w);
    Q[i].set(_Sq.x, _Sq.y, _Sq.z, _Sq.w); P[i].copy(u.spP[i]); prev = Q[i];
  }
  u.U.uLen.value = L;
  if (dt > 0) u.vel.subVectors(u.spP[12], u.aimAt).divideScalar(dt);   // (v31: su velocidad, para el adelanto)
  u.pos.copy(u.spP[0]); u.aimAt.copy(u.spP[12]);
  // cápsulas: cabeza más gruesa; el cuerpo, una cada 3 puntos
  const D = [];
  for (let i = 0; i < SPINE_N - 1; i += 3) {
    const j = Math.min(SPINE_N - 1, i + 3), s = i / (SPINE_N - 1), r = (s < 0.08 ? 0.032 : s > 0.85 ? 0.022 : 0.02) * L;
    D.push([u.spP[i], u.spP[j], r]);
  }
  while (u.caps.length < D.length) u.caps.push({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0 });
  u.caps.length = D.length;
  D.forEach((d, i) => { u.caps[i].a.copy(d[0]); u.caps[i].b.copy(d[1]); u.caps[i].r = d[2]; });
  capsBound(u);
}
/* Frame de la columna en la fracción s (desde la cabeza): posición en out, orientación en q. */
function spineAt(u, s, out, q) {
  const f = clamp(s, 0, 1) * (SPINE_N - 1), i = Math.min(SPINE_N - 2, Math.floor(f)), t = f - i, Q = u.U.uSpQ.value;
  out.lerpVectors(u.spP[i], u.spP[i + 1], t);
  q.set(lerp(Q[i].x, Q[i + 1].x, t), lerp(Q[i].y, Q[i + 1].y, t), lerp(Q[i].z, Q[i + 1].z, t), lerp(Q[i].w, Q[i + 1].w, t)).normalize();
}
function sorcererPlace(u, k) {
  spineAt(u, k.at, k.pos, k.q);
  k.pos.add(_Sa.set(0, SORC_TOP * u.size, 0).applyQuaternion(k.q));
  if (k.model) { k.model.position.copy(k.pos); k.model.quaternion.copy(k.q); k.model.scale.setScalar(SORC_SCALE); }
  unitCaps(k);
}
function serpentMouth(u, out) { return out.copy(u.spP[0]).addScaledVector(u.spT[0], 0.012 * u.size).addScaledVector(_Sa.set(0, -1, 0), 0.004 * u.size); }

/* ---------- Escudo y daño ---------- */
function serpentHurt(u, n, soft, at) {
  if (!u.shield) return true;
  u.shieldHitT = Math.max(u.shieldHitT, soft ? 0.4 : 1);
  const c = ARC_COLOR;
  for (let i = 0; i < (soft ? 2 : 14); i++) emit(fxAdd, at.x, at.y, at.z, rnd(-30, 30), rnd(-30, 30), rnd(-30, 30), rnd(0.2, 0.5), rnd(2, 4), 0.5, c[0], c[1], c[2], 1, 1.5, 0);
  if (!(gameTime - u.sndT < (soft ? 0.25 : 0.1))) { u.sndT = gameTime; sfx.shieldHit(); }
  if (!u.hint && !byAlly) { u.hint = true; toast('La sierpe está protegida por un escudo: abate primero a los hechiceros de su lomo'); }
  return false;
}
function sorcererDie(k, silent) {
  const u = k.parent, c = ARC_COLOR, p = k.bc;
  for (let i = 0; i < (silent ? 10 : 50); i++) { const a = Math.random() * 6.283, v = rnd(-1, 1), s = Math.sqrt(1 - v * v), sp = rnd(10, 60); emit(fxAdd, p.x, p.y, p.z, Math.cos(a) * s * sp, v * sp, Math.sin(a) * s * sp, rnd(0.4, 1), rnd(3, 6), 0.5, c[0], c[1], c[2], 1, 1, 0); }
  if (!silent) explode(p.x, p.y, p.z, 0.9);
  removeUnitMesh(k); k.gone = true;
  if (!silent && u.shield && u.kids.every(x => x.dead)) {
    u.shield = false; u.shieldBreak = 1; camShake = Math.max(camShake, 0.6); sfx.energyBlast(0.6);
    toast('¡El escudo de la sierpe ha caído!  Ya puedes dañarla');
  }
}
function serpentDie(u) { u.fall = 0; u.fallV = 0; camShake = Math.max(camShake, 1); sfx.energyCharge(0.8); }

/* ---------- Cada fotograma ---------- */
function updSierpe(u, dt, P, d) {
  if (!u.model && unitRes.sierpe) serpentModel(u);
  if (u.dead) {
    u.dying -= dt; u.fallV += 25 * dt; u.fall += u.fallV * dt;   // cae cada vez más deprisa
    serpentSpine(u, dt);
    if (Math.random() < dt * 10) { const s = Math.random(); spineAt(u, s, _Sa, _Sq); explode(_Sa.x, _Sa.y, _Sa.z, rnd(1.4, 2.8)); }
    if (u.mats) charUnit(u, 1 - u.dying / u.dieT);
    if (u.dying <= 0) {
      for (const s of [0.05, 0.4, 0.8]) { spineAt(u, s, _Sa, _Sq); airshipBlast({ pos: _Sa.clone() }); }
      removeUnitMesh(u); u.gone = true;
    }
    for (const m of u.shieldMeshes) m.visible = false;
    return;
  }
  serpentSpine(u, dt);
  // escudo: se ve mientras haya hechiceros; al romperse, destello y se apaga
  u.shieldHitT = Math.max(0, u.shieldHitT - dt * 3);
  if (u.shieldMat) {
    u.shieldA = u.shield ? Math.min(1, u.shieldA + dt) : Math.max(0, u.shieldA - dt * 0.8);
    u.shieldBreak = Math.max(0, (u.shieldBreak || 0) - dt * 1.5);
    u.shieldMat.uniforms.uA.value = u.shieldA * (1 + 3 * (u.shieldBreak || 0));
    u.shieldMat.uniforms.uHit.value = u.shieldHitT;
    u.U.uInfl.value = 0.006 * u.size * (1 + 1.5 * (u.shieldBreak || 0));
    for (const m of u.shieldMeshes) m.visible = u.shieldA > 0.01;
  }
  if (u.mats) for (const m of u.mats) m.emissive.setRGB(1, 0.55, 0.2).multiplyScalar(u.hitFlash * 0.4);
  u.hitFlash = Math.max(0, u.hitFlash - dt * 3);
  // hechiceros: sobre el lomo; su orbe echa chispas arcanas
  for (const k of u.kids) {
    if (k.gone) continue;
    sorcererPlace(u, k);
    if (k.mats) for (const m of k.mats) m.emissive.setRGB(ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2]).multiplyScalar(0.25 + k.hitFlash * 0.8);
    k.hitFlash = Math.max(0, k.hitFlash - dt * 3.5);
    if (d < 6000 && Math.random() < 0.6) {
      _Sa.set(0.36, 2.42, -0.38).multiplyScalar(SORC_SCALE).applyQuaternion(k.q).add(k.pos);
      emit(fxAdd, _Sa.x, _Sa.y, _Sa.z, rnd(-3, 3), rnd(4, 12), rnd(-3, 3), rnd(0.4, 0.9), rnd(3, 5), 0.5, ARC_COLOR[0], ARC_COLOR[1], ARC_COLOR[2], 0.9, 0.5, -3);
    }
  }
  if (state !== 'playing' || holdFire()) { u.breath = 0; return; }
  const S = STATS.sierpe, mouth = serpentMouth(u, _Sb), dist = mouth.distanceTo(P);
  _Sv.subVectors(P, mouth).divideScalar(dist || 1);
  const ahead = _Sv.dot(u.spT[0]);
  // llamarada: si el jugador se pone delante de la cabeza (dentro de llamas_angulo y del alcance), la sostiene llamas_duracion s
  u.breathCool -= dt;
  if (u.breath <= 0 && u.breathCool <= 0 && dist < S.llamas_alcance && ahead > Math.cos(deg(S.llamas_angulo))) { u.breath = S.llamas_duracion; sfx.roar(0.8); }
  if (u.breath > 0) {
    u.breath -= dt; if (u.breath <= 0) u.breathCool = S.llamas_pausa;
    serpentBreath(u, mouth, dt, S, P, dist);
  }
  // bolas de fuego, como los dragones enemigos (con la cabeza no del todo de espaldas)
  u.fireCool -= dt;
  if (u.fireCool <= 0 && dist < S.bola_alcance && ahead > -0.2 && u.breath <= 0) {
    if (losClear(mouth.x, mouth.y, mouth.z, P.x, P.y, P.z)) {
      _Sa.copy(P).addScaledVector(dragonVel, dist / FIREBALL_SPEED).sub(mouth).normalize();
      _Sa.x += rnd(-1, 1) * 0.02; _Sa.y += rnd(-1, 1) * 0.02; _Sa.z += rnd(-1, 1) * 0.02; _Sa.normalize();
      const f = spawnFireball(mouth, _Sa, true, clamp(1.1 - dist / S.bola_alcance, 0.2, 0.8));
      f.dmg = S.bola_dano; f.msg = 'Una bola de fuego de la sierpe te derribó'; f.r0 *= 2; f.r1 *= 2;
      emit(fxAdd, mouth.x, mouth.y, mouth.z, 0, 0, 0, 0.25, 20, 50, 1, 0.7, 0.3, 1, 0, 0);
    }
    u.fireCool = rnd(S.bola_pausa_min, Math.max(S.bola_pausa_min, S.bola_pausa_max));
  }
}
/* Llamarada de la sierpe: chorro enorme desde la boca hacia delante, girado a medias hacia el jugador; daño continuo si está dentro del
   cono (y no lleva el escudo puesto). */
function serpentBreath(u, mouth, dt, S, P, dist) {
  _Sa.copy(u.spT[0]).lerp(_Sv, 0.6).normalize();           // dirección del chorro
  const range = S.llamas_alcance, sp = 260, n = Math.round(260 * dt + Math.random());
  for (let i = 0; i < n; i++) {
    const o = rnd(0, dt), j = 0.08;
    const vx = (_Sa.x + rnd(-j, j)) * sp * rnd(0.9, 1.1), vy = (_Sa.y + rnd(-j, j)) * sp * rnd(0.9, 1.1), vz = (_Sa.z + rnd(-j, j)) * sp * rnd(0.9, 1.1), life = range / sp * rnd(0.75, 1.05), hot = Math.random() < 0.25;
    emit(fxAdd, mouth.x + vx * o, mouth.y + vy * o, mouth.z + vz * o, vx, vy, vz, life, hot ? 6 : rnd(10, 16), hot ? 25 : rnd(55, 90), hot ? 1 : 1, hot ? 0.95 : rnd(0.4, 0.62), hot ? 0.7 : 0.12, hot ? 0.7 : 0.42, 0, -6);
  }
  if (Math.random() < 0.5) emit(fxSmoke, mouth.x + _Sa.x * range * 0.6, mouth.y + _Sa.y * range * 0.6, mouth.z + _Sa.z * range * 0.6, rnd(-8, 8), rnd(4, 12), rnd(-8, 8), rnd(2, 3.5), 40, 110, 0.14, 0.12, 0.11, 0.35, 0.5, -1);
  fbLight.position.copy(mouth).addScaledVector(_Sa, 60); fbLight.intensity = 6; fbLight.color.set(0xff8a3a);
  // daño: cono que se abre (12 m + un 18 % de la distancia)
  _Sb.subVectors(P, mouth); const along = _Sb.dot(_Sa), r = 12 + clamp(along, 0, range) * 0.18;
  if (along > 0 && along < range && _Sb.lengthSq() - along * along < r * r) {
    if (shieldOn()) { if (Math.random() < dt * 8) shieldHit(_Sb.copy(P).addScaledVector(_Sa, -SHIELD_R), 0.5); }
    else hurtDragon(S.llamas_dano * dt, 'La llamarada de la sierpe te calcinó', true);
  }
}
