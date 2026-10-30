/* ============================================================
   5c. TYRANTDRAGON (modelo GLB riggeado con animaciones; cámara en 1ª persona, C pasa a 3ª)
   El del jugador (hero) y los enemigos (copias con esqueleto propio, ver 6b) se animan con la misma función, animateTyrant.
   Modelo: TyrantDragon (extra del pack «Drogon»), convertido con herramientas/preparar_fbx.mjs: 52 000 triángulos,
   459 huesos con piel, un atlas de color y dos clips en bucle: «vuelo» (2,77 s) y «hover» (1,77 s).
   El modelo viene con Y arriba y mirando hacia +Z; aquí se gira para que mire hacia -Z (el delante del dragón del juego).
   · Vuelo: el clip «vuelo» en bucle; su velocidad sigue al acelerador y sube con el boost.
   · Planeo: cuando el aleteo baja (picado, poco acelerador) se funde con una pose congelada del mismo clip, con las alas abiertas.
   · Hover: el clip «hover», mezclado según F.hoverK.
   · Encima de los clips, por código: cuello y cabeza siguen al marcador, la mandíbula se abre al disparar, la cola se curva
     con el giro y en boost las alas se recogen hacia atrás. Los giros se expresan en el espacio del modelo (rotModel).
   ============================================================ */
const HERO_URL = '../modelos/tyrant_web.glb';             // solo si el HTML no lleva el modelo incrustado
const HERO_SPAN = 34;                                     // envergadura con las alas abiertas (m): fija la escala del modelo
const HERO_FP = [2.3, 0.5, -0.12], HERO_FP_BONE = 'spine_02'; // 1ª persona (jinete): altura sobre el hueso del lomo (= los ojos del caballero sentado, que mide 1,9 m), retroceso (positivo = atrás: entre las alas, para verlas mejor) y cabeceo
let heroFP = HERO_FP;                                     // v16: la del dragón elegido (los otros dos la calculan al cargar: 5g)
const HERO_CAM = [5, 15, -0.07], HERO_CAM_HOVER = 3;      // 3ª persona (tecla C): altura, distancia detrás, cabeceo (el dragón queda bajo la retícula); en hover baja HERO_CAM_HOVER m (v32: 5 y 15 m, antes 8 y 22)
const HERO_FLAP = [0.75, 1.3], HERO_FLAP_BOOST = 2.6;     // velocidad del clip de vuelo: acelerador 0 → 1, y con boost (el doble que a todo gas: esfuerzo)
const HERO_FLAP_EFFORT = 0.6;                             // v32: con W mantenida (intentando ganar velocidad), el aleteo va hasta un 60 % más rápido
const HERO_TUCK = 0.45;                                   // recogida de las alas en boost (rad)
const HERO_JAW = 0.55;                                    // apertura de la mandíbula al disparar (rad)
const HERO_EMISSIVE = 1.6;                                // brillo de los ojos
const HERO_NECK = ['Neck1', 'Neck2', 'Neck3', 'Neck4', 'head'], HERO_NECK_W = [0.26, 0.26, 0.24, 0.21, 0.18];   // reparto del giro de la mirada (más en la base: el cuello entero se aparta y asoma la cabeza)
const HERO_LOOK = [1.25, 1.05, 0.45, 1.25];              // mirada: ganancia de giro y de cabeceo hacia el marcador, anticipo del giro del dragón, giro máximo (rad)
const HERO_NECK_UP = 0.32;                               // cuello arqueado hacia arriba en vuelo (rad): desde el lomo se ve la cabeza delante
let HERO_LOOK_DOWN = 1.25;                               // v27: cabeceo máximo de la mirada hacia abajo (rad; antes 0,8): en vuelo recto la cabeza apunta al suelo
const HERO_TAIL = ['Tail0', 'Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6', 'Tail7', 'Tail8', 'Tail9'];
/* v13: sensación de vuelo (a partir del vídeo de «Dragontwin», 1:10-1:37).
   · Cuerpo: encima del rumbo de vuelo, el modelo se mueve con muelles (BODY_SPRING: frecuencia en rad/s y amortiguamiento; por debajo de 1
     se pasa un poco y vuelve: peso). Se inclina más que el rumbo al virar (BODY_ROLL: rad por rad/s de giro, y tope), adelanta el morro a
     los cabeceos y a los giros (BODY_PITCH, BODY_YAW), sube y baja con cada aletazo (BODY_HEAVE, m) y en picado recoge las alas (v32: las
     pliega hacia atrás, HERO_FOLD). El ala de dentro del giro se recoge un poco (HERO_TURN_TUCK).
   · Cámara: sigue al dragón con retraso (CAM_LAG, 1/s: 1ª y 3ª persona), así que al girar el dragón se escapa hacia el lado del giro y se le
     ve el costado, al subir queda por encima y al picar por debajo. El horizonte se inclina con el dragón, pero solo una parte (CAM_ROLL).
     Al acelerar la cámara se queda atrás y al frenar se acerca (CAM_PUSH: m por m/s² en 1ª y 3ª persona, y sus topes). */
const BODY_ROLL = [0.32, 0.55], BODY_PITCH = [0.2, 0.22], BODY_YAW = [0.1, 0.16], BODY_SPRING = [6.5, 0.55], BODY_HEAVE = 0.3;
const RIDER_LEAN = 0.6;                                   // parte del giro del cuerpo que sigue el torso del jinete en 1ª persona (los brazos)
const HERO_TURN_TUCK = [0.3, 0.35];
/* v32 (petición de Jorge): en picado las alas se pliegan hacia atrás, en flecha y algo caídas: giro del brazo y del antebrazo hacia la cola
   y bajada del brazo (rad, con el picado entero). Antes solo se recogían un poco (0,34 y 0,24 rad). */
const HERO_FOLD = [1.24, 0.44, 0.2], H_FWD = new THREE.Vector3(0, 0, 1);
/* v32: golpe de ala. BEAT_LEAD: s antes del golpe en que se elige y se programa el sonido (para que su pico caiga en el golpe);
   BEAT_SHAKE: temblor de cámara de cada golpe (m arriba y abajo, rad de cabeceo y de alabeo, y 1/s en que se apaga). */
const BEAT_LEAD = 0.3, BEAT_SHAKE = [0.07, 0.004, 0.002, 9];
const CAM_LAG = [10, 4.2], CAM_ROLL = [0.6, 0.7], CAM_PUSH = [0.004, 0.1, 0.22, 5];
/* v27: cámara de apuntado (vuelo recto, Espacio; a partir del vídeo de referencia de Jorge, «demo lanzallamas»): sale de la 1ª persona si
   hace falta y se pone detrás del dragón, algo por encima (elev, rad) y a d m, girada hacia el lado de la mira (yawK de su guiñada). Mira a un
   punto entre el dragón y el punto de la mira (mix: 0 = al dragón, 1 = a la mira), así que al apuntar abajo el dragón queda arriba de la
   pantalla y el suelo al que apuntas, debajo, sin taparlo. follow: suavizado del punto de la mira (1/s); blend: entrada y salida (1/s). */
const AIM_CAM = { d: 24, elev: 0.08, yawK: 0.8, mix: 0.62, follow: 7, blend: 4 };   // (v28: elev 0,26 → 0,08: más alta, la cola tapaba el impacto)
/* v32: esquiva (A/D, updateFlight). En 3ª persona la cámara no acompaña al dragón en el desplazamiento lateral: se queda atrás hold (parte del
   desplazamiento: 1 = entera) mientras dura y, al acabar, espera wait s y vuelve detrás de él en back s, como si le costara darse cuenta.
   En 1ª persona la vista del jinete da la vuelta con el dragón. */
const DODGE_CAM = { hold: 0.55, wait: 0.12, back: 0.9 };   // (con 0,55 y 25 m, el dragón acaba hacia el borde de la pantalla, aún entero; más, se sale)

const hero = { ready: false, error: null, wrap: new THREE.Group(), model: null, B: {}, rest: new Map(), animated: new Set(), mixer: null, act: {}, glideT: 0, flyDur: 1, hoverDur: 1, glow: null, light: null,
  bodyQ: new THREE.Quaternion(),                           // v13: giro del cuerpo encima del rumbo de vuelo (muelles de animateHero)
  leanQ: new THREE.Quaternion(), roll: 0, beat: { fly: 0, hover: 0 } };   // v32: el cuerpo sin el tonel de la esquiva, el tonel (rad) y el golpe de ala de cada clip (s)
hero.wrap.rotation.set(0, Math.PI, 0);
dragon.add(hero.wrap);

/* Recursos incrustados: el base64 de un <script id=…> (vacío si el HTML no lo lleva y hay que cargar el archivo suelto). */
function embedded(id) { const tag = document.getElementById(id), b64 = tag ? tag.textContent.replace(/\s+/g, '') : ''; return b64.length > 1000 ? b64 : ''; }
/* Los bytes de un recurso incrustado o, si no, del archivo (necesita un servidor local). v32: también los sonidos (13). */
function loadBytes(id, url) {
  const b64 = embedded(id);
  return b64
    ? Promise.resolve().then(() => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; })
    : fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
}
/* Un .glb incrustado o, si no, el archivo (necesita un servidor local). */
function loadGLB(id, url) {
  return loadBytes(id, url).then(buf => new Promise((res, rej) => new THREE.GLTFLoader().parse(buf, '', res, rej)));
}
/* Carga: del <script id="modelo-glb"> en base64 si lo hay; si no, del archivo .glb (necesita un servidor local). */
function loadHero() {
  return loadGLB('modelo-glb', HERO_URL)
    .then(setupHero)
    .catch(err => { hero.error = err; console.error('No se pudo cargar el dragón:', err); });
}
function setupHero(gltf) {
  const model = gltf.scene;
  hero.wrap.add(model); hero.model = model;
  model.traverse(o => {
    if (o.name) hero.B[o.name] = o;
    if (o.isMesh) {
      o.frustumCulled = false;                             // la caja de una malla con esqueleto no sigue a la pose
      const m = o.material;
      for (const k of ['map', 'emissiveMap']) if (m[k]) m[k].encoding = THREE.LinearEncoding;   // como el resto de la escena (salida lineal)
      if (m.emissive && m.emissive.getHex()) m.emissiveIntensity = HERO_EMISSIVE;
      m.side = THREE.DoubleSide; m.needsUpdate = true;     // membranas de las alas: visibles por las dos caras
    }
  });
  gltf.animations.filter(c => c.name === 'vuelo' || c.name === 'hover').forEach(c => c.tracks.forEach(t => hero.animated.add(t.name.split('.')[0])));
  hero.pose0 = []; model.traverse(o => { if (o.isBone) hero.pose0.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
  for (const n of [...HERO_NECK, 'Jaw0', 'Jaw1', ...HERO_TAIL, 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r']) if (hero.B[n]) hero.rest.set(hero.B[n], hero.B[n].quaternion.clone());
  // clips: vuelo, hover y una copia del vuelo congelada con las alas más abiertas (planeo)
  const mixer = hero.mixer = new THREE.AnimationMixer(model);
  const fly = gltf.animations.find(c => c.name === 'vuelo'), hov = gltf.animations.find(c => c.name === 'hover');
  hero.flyDur = fly.duration; hero.hoverDur = hov.duration;
  hero.act.fly = mixer.clipAction(fly); hero.act.hover = mixer.clipAction(hov);
  const glide = hero.glideClip = fly.clone(); glide.name = 'planeo'; hero.act.glide = mixer.clipAction(glide);
  let best = -1;
  hero.act.fly.play();
  for (let k = 0; k < 40; k++) {                           // instante con más envergadura y alas por encima del cuerpo
    hero.act.fly.time = fly.duration * k / 40; mixer.update(0); model.updateMatrixWorld(true);
    const l = hero.B.wingMiddle8_l.getWorldPosition(new THREE.Vector3()), r = hero.B.wingMiddle8_r.getWorldPosition(new THREE.Vector3());
    const span = l.distanceTo(r), sp = hero.B.spine_03.getWorldPosition(new THREE.Vector3());
    const score = span - Math.max(0, sp.y - (l.y + r.y) / 2) * 2;
    if (score > best) { best = score; hero.glideT = fly.duration * k / 40; hero.spanRaw = span; }
  }
  // escala por envergadura y pivote en el pecho (spine_02, en la pose de planeo)
  hero.wrap.scale.setScalar(HERO_SPAN / hero.spanRaw);
  hero.act.fly.time = hero.glideT; mixer.update(0); model.updateMatrixWorld(true);
  const piv = model.worldToLocal(hero.B.spine_02.getWorldPosition(new THREE.Vector3()));
  model.position.set(-piv.x, -piv.y, -piv.z);
  // v32: instante del golpe de ala en cada clip (cuando las puntas bajan más deprisa): ahí caen el sonido del aleteo y el temblor de cámara
  hero.beat = { fly: clipBeat(hero.act.fly, fly.duration), hover: clipBeat(hero.act.hover, hov.duration) };
  for (const a of Object.values(hero.act)) a.setEffectiveWeight(a === hero.act.fly ? 1 : 0);
  hero.act.fly.time = hero.glideT; mixer.update(0); model.updateMatrixWorld(true);
  // boca y punta de la cola en ejes del dragón (pose de planeo): para los enemigos lejanos y su estela
  dragon.updateMatrixWorld(true);
  hero.mouthLocal = dragon.worldToLocal(hero.B.LipUpperMid.getWorldPosition(new THREE.Vector3()));
  hero.tailLocal = dragon.worldToLocal(hero.B.Tail9.getWorldPosition(new THREE.Vector3()));
  // socket de la boca: entre los dos labios (boca cerrada), 0,3 m por delante, colgado del morro; sigue a la cabeza y de él salen todos los ataques
  {
    const up = hero.B.LipUpperMid.getWorldPosition(new THREE.Vector3()), lo = (hero.B.LipLowerMid || hero.B.LipUpperMid).getWorldPosition(new THREE.Vector3());
    const mid = up.clone().add(lo).multiplyScalar(0.5), hd = hero.B.head.getWorldPosition(new THREE.Vector3());
    mid.addScaledVector(up.clone().sub(hd).normalize(), 0.3);
    const par = hero.B.MuzzleNose || hero.B.HeadUpper || hero.B.head;
    hero.mouth = new THREE.Object3D(); hero.mouth.name = 'BocaSocket';
    hero.mouth.position.copy(par.worldToLocal(mid)); par.add(hero.mouth);
  }
  for (const a of Object.values(hero.act)) { a.play(); a.setEffectiveWeight(0); }
  hero.act.glide.time = hero.glideT; hero.act.glide.timeScale = 0;
  hero.act.fly.setEffectiveWeight(1);
  hero.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: ATTACK.clone().lerp(_white, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  hero.glow.renderOrder = 7; hero.glow.visible = false; scene.add(hero.glow);
  hero.light = new THREE.PointLight(ATTACK.getHex(), 0, 80, 2); scene.add(hero.light);
  hero.clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
  model.traverse(o => { if (o.isMesh && o.material.map) tintSkinMaterial(o.material, SKIN_TINT); });   // la piel admite el color elegido
  loadColors();
  hero.ready = true;
}

/* v32: instante (s del clip) en que la punta del ala baja más deprisa respecto al lomo: el golpe de ala. Deja solo ese clip con peso. */
function clipBeat(act, dur) {
  const tip = hero.B.wingMiddle8_l, sp = hero.B.spine_03;
  for (const a of Object.values(hero.act)) a.setEffectiveWeight(0);
  act.play(); act.setEffectiveWeight(1);
  let prev = null, best = 0, bt = 0;
  for (let k = 0; k <= 60; k++) {
    act.time = dur * k / 60; hero.mixer.update(0); hero.model.updateMatrixWorld(true);
    const y = tip.getWorldPosition(_hP).y - sp.getWorldPosition(_hS).y;
    if (prev !== null && prev - y > best) { best = prev - y; bt = dur * (k - 0.5) / 60; }
    prev = y;
  }
  return bt;
}

/* ---------- Ayudantes: giros de huesos en el espacio del modelo ---------- */
const _hQ = new THREE.Quaternion(), _hQ2 = new THREE.Quaternion(), _hR = new THREE.Quaternion(), _hMQi = new THREE.Quaternion(), _hWQi = new THREE.Quaternion();
const _hP = new THREE.Vector3(), _hS = new THREE.Vector3(), _hT = new THREE.Vector3(), _hF = new THREE.Vector3(), _hC = new THREE.Vector3();
const _hUp = new THREE.Vector3(), _hRt = new THREE.Vector3(), H_UP = new THREE.Vector3(0, 1, 0), _hEu = new THREE.Euler();
function heroQuat(o, out) { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(_hP, out, _hS); return out.premultiply(_hMQi); }
/* Gira el hueso b con R (rotación en el espacio del modelo) alrededor de su articulación. */
function rotModel(b, R) { heroQuat(b.parent, _hQ); _hQ2.copy(_hQ).invert().multiply(R).multiply(_hQ); b.quaternion.premultiply(_hQ2); }
function rotAxis(b, axis, ang) { if (b && Math.abs(ang) > 1e-5) rotModel(b, _hR.setFromAxisAngle(axis, ang)); }
/* Boca del dragón en el mundo: el socket entre los labios (hero.mouth, cuelga del morro). De aquí salen todos los ataques. */
function heroMouth(out) {
  if (!hero.ready) return dragon.localToWorld(out.set(0, 0, -12));
  return (alt.D ? alt.D.mouth : hero.mouth).getWorldPosition(out);   // (v16: la del dragón elegido)
}

/* ---------- Animación por fotograma ----------
   animateTyrant mueve un Tyrant (el del jugador o un enemigo): R = { model, wrap, B, rest, mixer, act }, A = su estado de animación.
   st: { throttle, flapTarget, aimLocal, yawRate, pitchRate, fire, hover, boost, climb } */
function animateTyrant(R, A, dt, st) {
  A.time += dt;
  A.flap += (st.flapTarget - A.flap) * (1 - Math.exp(-dt * 2.2));
  const hv = st.hover || 0, bs = st.boost || 0;
  const k5 = 1 - Math.exp(-dt * 5), a = st.aimLocal;
  // mirada: cuello y cabeza buscan el marcador y se adelantan a los giros del dragón
  A.headYaw += (clamp(Math.atan2(-a.x, -a.z) * HERO_LOOK[0] + st.yawRate * HERO_LOOK[2], -HERO_LOOK[3], HERO_LOOK[3]) - A.headYaw) * k5;
  A.headPitch += (clamp(Math.atan2(a.y, Math.hypot(a.x, a.z)) * HERO_LOOK[1] + (st.pitchRate || 0) * HERO_LOOK[2] * 0.6, -HERO_LOOK_DOWN, 0.8) - A.headPitch) * k5;   // (v27: hacia abajo, hasta HERO_LOOK_DOWN)
  A.tailYaw += (clamp(-st.yawRate * 0.5, -0.8, 0.8) - A.tailYaw) * (1 - Math.exp(-dt * 2.2));
  A.tuck += (bs * (1 - hv) - A.tuck) * (1 - Math.exp(-dt * 3));                                       // boost: alas recogidas
  A.fold = (A.fold || 0) + ((st.dive || 0) * (1 - hv) * (1 - bs) - (A.fold || 0)) * (1 - Math.exp(-dt * 3));   // v32: picado: alas plegadas hacia atrás
  A.turnTuck = (A.turnTuck || 0) + (clamp(st.yawRate * HERO_TURN_TUCK[0], -HERO_TURN_TUCK[1], HERO_TURN_TUCK[1]) * (1 - hv) - (A.turnTuck || 0)) * (1 - Math.exp(-dt * 3));
  A.glide = (A.glide || 0) + (clamp((0.42 - A.flap) / 0.3, 0, 1) * (1 - hv) * (1 - bs) - (A.glide || 0)) * (1 - Math.exp(-dt * 2.5));
  A.fire += (st.fire - A.fire) * (1 - Math.exp(-dt * 14));

  const B = R.B, act = R.act;
  // 1. clips: pesos (vuelo / planeo / hover) y velocidad del aleteo (los enemigos no tienen hover)
  act.fly.setEffectiveWeight((1 - hv) * (1 - A.glide));
  act.glide.setEffectiveWeight((1 - hv) * A.glide);
  act.fly.timeScale = lerp(lerp(HERO_FLAP[0], HERO_FLAP[1], st.throttle) * (1 + HERO_FLAP_EFFORT * (st.effort || 0)), HERO_FLAP_BOOST, bs);   // (v32: más rápido con W, st.effort)
  if (act.hover) { act.hover.setEffectiveWeight(hv); act.hover.timeScale = 1 + 0.25 * (st.climb || 0); }
  R.mixer.update(dt);
  // fase para el sonido del aleteo (sfx.flap cuando el seno pasa por cero bajando)
  A.phase = hv > 0.5 ? act.hover.time / hero.hoverDur * Math.PI * 2 : act.fly.time / hero.flyDur * Math.PI * 2 + Math.PI;
  // 2. capa por código encima de los clips (los huesos que ningún clip mueve vuelven primero a su pose de reposo)
  for (const [b, q] of R.rest) if (!hero.animated.has(b.name)) b.quaternion.copy(q);
  R.model.updateWorldMatrix(true, false);
  R.model.matrixWorld.decompose(_hP, _hMQi, _hS); _hMQi.invert();
  _hWQi.copy(R.wrap.quaternion).invert();
  _hUp.set(0, 1, 0).applyQuaternion(_hWQi); _hRt.set(1, 0, 0).applyQuaternion(_hWQi);       // ejes del dragón vistos desde el modelo
  for (let i = 0; i < HERO_NECK.length; i++) {
    const b = B[HERO_NECK[i]], w = HERO_NECK_W[i];
    const up = HERO_NECK_UP * (1 - hv) * (i < 3 ? 1 : -0.6) / 3;          // la base sube y la cabeza se nivela
    rotAxis(b, _hRt, A.headPitch * w * 1.15 + up - A.fire * 0.06); rotAxis(b, _hUp, A.headYaw * w * 1.15);
  }
  rotAxis(B.Jaw0, _hRt, -A.fire * HERO_JAW);
  for (let i = 0; i < HERO_TAIL.length; i++) rotAxis(B[HERO_TAIL[i]], _hUp, A.tailYaw * 0.05 * (0.4 + i / HERO_TAIL.length));
  if (A.tuck > 0.01 || A.fold > 0.01 || Math.abs(A.turnTuck) > 0.01) {    // (v13) además, el ala de dentro del giro se recoge un poco
    for (const [L, s, tk] of [['l', 1, A.tuck + Math.max(0, A.turnTuck)], ['r', -1, A.tuck + Math.max(0, -A.turnTuck)]]) {
      rotAxis(B['upperarm_' + L], H_UP, s * (HERO_TUCK * tk + HERO_FOLD[0] * A.fold)); rotAxis(B['lowerarm_' + L], H_UP, s * (HERO_TUCK * 0.7 * tk + HERO_FOLD[1] * A.fold));
      rotAxis(B['upperarm_' + L], H_FWD, s * HERO_FOLD[2] * A.fold);    // (v32: en picado, en flecha hacia atrás y algo caídas)
    }
  }
}
/* El dragón del jugador: animación, fogonazo de la boca y cámara (1ª / 3ª persona y giro del menú). */
function animateHero(dt, st) {
  const A = dragonAnim;
  // cámara: 1ª persona sobre el lomo (por defecto) ↔ 3ª persona detrás del dragón (C); la colocación va al final
  A.cam += ((st.third ? 1 : 0) - A.cam) * (1 - Math.exp(-dt * 4));
  if (!hero.ready) { camera.position.set(0, HERO_CAM[0], HERO_CAM[1]); camera.rotation.set(HERO_CAM[2], 0, 0); return; }
  // v13: el cuerpo, con muelles encima del rumbo de vuelo (en el menú, quieto)
  const live = st.menu ? 0 : 1 - (st.hover || 0), w = BODY_SPRING[0], zt = BODY_SPRING[1];
  const spring = (k, target) => { const v = k + 'V', x = A[k] || 0, vel = A[v] || 0; A[v] = vel + ((target - x) * w * w - 2 * zt * w * vel) * dt; A[k] = x + A[v] * dt; };
  spring('bRoll', clamp(st.yawRate * BODY_ROLL[0], -BODY_ROLL[1], BODY_ROLL[1]) * live);
  spring('bPitch', (clamp((st.pitchRate || 0) * BODY_PITCH[0], -BODY_PITCH[1], BODY_PITCH[1]) - 0.06 * (st.boost || 0)) * live);
  spring('bYaw', clamp(st.yawRate * BODY_YAW[0], -BODY_YAW[1], BODY_YAW[1]) * live);
  if (st.menu) A.bRoll = A.bRollV = A.bPitch = A.bPitchV = A.bYaw = A.bYawV = 0;
  // v32: el tonel de la esquiva (st.roll, rad) va entero en el cuerpo (y en el caballero y la vista de la 1ª persona); hero.leanQ, sin él,
  // es lo que acompaña el torso del jinete
  const dodgeRoll = st.menu ? 0 : st.roll || 0;
  hero.leanQ.setFromEuler(_kEu.set(A.bPitch, A.bYaw, A.bRoll, 'YXZ')); hero.roll = dodgeRoll;
  hero.bodyQ.setFromEuler(_kEu.set(A.bPitch, A.bYaw, A.bRoll + dodgeRoll, 'YXZ'));
  hero.wrap.quaternion.copy(hero.bodyQ).multiply(_kQy);
  hero.wrap.position.set(0, BODY_HEAVE * A.flap * (1 - (A.glide || 0)) * live * Math.sin(A.phase), 0);
  animateTyrant(hero, A, dt, st);
  dragonPose();                                            // v16: con otro dragón elegido, su modelo copia la pose del Tyrant
  // v32: golpe de ala con el clip que manda (vuelo u hover): A.beatIn = s que faltan cuando pasa BEAT_LEAD s antes (se programa el sonido)
  // y A.beat = 1 en el golpe (temblor de cámara). Los dos, solo en ese fotograma (updateWorld)
  A.beat = A.beatIn = 0;
  if (!st.menu) {
    const ho = (st.hover || 0) > 0.5, ac = ho ? hero.act.hover : hero.act.fly, dur = ho ? hero.hoverDur : hero.flyDur, tb = ho ? hero.beat.hover : hero.beat.fly;
    const ts = Math.max(0.05, ac.timeScale), t1 = ac.time, t0 = A.beatAct === ac ? A.beatT : t1;
    const passed = x => { x = ((x % dur) + dur) % dur; return t1 >= t0 ? x > t0 && x <= t1 : x > t0 || x <= t1; };
    if (t1 !== t0) {
      if (passed(tb - BEAT_LEAD * ts)) A.beatIn = (((tb - t1) % dur) + dur) % dur / ts;
      if (passed(tb)) A.beat = 1;
    }
    A.beatAct = ac; A.beatT = t1;
  }
  const hv = st.hover || 0;
  // 3. fuego en la boca
  heroMouth(_hT);
  const f = A.fire, g = hero.glow;
  const near = lerp(0.3, 1, A.cam);                        // en 1ª persona la boca está a pocos metros: fogonazo más pequeño
  g.visible = f > 0.02; g.position.copy(_hT); g.scale.setScalar((3 + 9 * f) * near); g.material.opacity = clamp(f * 1.1, 0, 1) * lerp(0.6, 1, A.cam);
  hero.light.position.copy(_hT); hero.light.intensity = f * 3.6 * lerp(0.5, 1, A.cam);
  // 4. cámara. 1ª persona: sobre el lomo, como un jinete, siguiendo (suavizado) cómo sube y baja con cada aletazo.
  //    3ª persona: detrás y por encima; en hover baja y mira al dragón, que está erguido.
  const seat = seatBone(); seat.updateWorldMatrix(true, false);
  dragon.worldToLocal(_hC.setFromMatrixPosition(seat.matrixWorld));
  if (!A.fp) A.fp = _hC.clone(); else A.fp.lerp(_hC, 1 - Math.exp(-dt * (dodgeRoll ? 40 : 6)));   // (v32: durante el tonel, casi sin suavizar)
  if (st.menu) {                                           // pantalla de título: giro lento alrededor del dragón, que queda abajo a la derecha
    const ang = A.time * 0.07, R = 40;
    camera.position.set(Math.sin(ang) * R, 5 + Math.sin(A.time * 0.13) * 2.5, Math.cos(ang) * R);
    _hT.copy(camera.position).negate().normalize();                       // hacia el dragón (ejes del dragón)
    _hF.crossVectors(_hT, H_UP).normalize();                              // derecha de la cámara
    _hC.set(0, 0, 0).addScaledVector(_hF, -18).addScaledVector(H_UP, 10); // mirar a un punto a su izquierda y por encima
    camera.lookAt(dragon.localToWorld(_hC));
    A.camQ = null;
    return;
  }
  // mirar alrededor (Z): el mismo giro hace de cabeza del jinete en 1ª persona y de órbita alrededor del dragón en 3ª
  const c = A.cam, L = _hQ.setFromEuler(_hEu.set(F.lookPit, F.lookYaw, 0, 'YXZ'));
  // v13: cámara con retraso. Su marco (A.camQ, en el mundo) persigue al del dragón con el alabeo reducido (CAM_ROLL; cerca de la vertical,
  // sin corregir); rel = ese retraso visto desde el dragón: gira el brazo de la 3ª persona y la vista de las dos cámaras.
  const qd = dragon.quaternion;
  _kR.set(1, 0, 0).applyQuaternion(qd); _kU.set(0, 1, 0).applyQuaternion(qd); _kF.set(0, 0, -1).applyQuaternion(qd);
  // (v14) la corrección del horizonte solo con el dragón derecho: en vertical o boca abajo (loopings) el alabeo respecto al horizonte salta
  // de +180° a -180° y la cámara daba vueltas de golpe; ahí la cámara simplemente sigue al dragón
  const follow = lerp(CAM_ROLL[0], CAM_ROLL[1], c), level = (1 - smooth(0.85, 0.98, Math.abs(_kF.y))) * smooth(0.05, 0.4, _kU.y);
  const roll = (A.bRoll * follow - Math.atan2(_kR.y, _kU.y) * (1 - follow)) * level;
  _kT.copy(qd).multiply(_kQr.setFromAxisAngle(_kZ, roll));
  if (!A.camQ) A.camQ = _kT.clone();
  if (A.camQ.angleTo(_kT) > 1.2) A.camQ.copy(_kT);                        // (teletransporte o reaparición: sin retraso)
  else A.camQ.slerp(_kT, 1 - Math.exp(-dt * lerp(CAM_LAG[0], CAM_LAG[1], c)));
  const rel = _kRel.copy(qd).invert().multiply(A.camQ);
  const push = clamp(F.accS * lerp(CAM_PUSH[0], CAM_PUSH[1], c), -lerp(0.08, 2, c), lerp(CAM_PUSH[2], CAM_PUSH[3], c));   // al acelerar, atrás
  _hT.set(0, heroFP[0] + (heroFP[3] || 0), heroFP[1] + push).applyQuaternion(hero.bodyQ).add(A.fp);   // ojos del jinete, sobre el lomo (que se inclina); v20: + elevación propia de la cámara
  _hC.set(0, HERO_CAM[0] - HERO_CAM_HOVER * hv, HERO_CAM[1] + push).applyQuaternion(L).applyQuaternion(rel);
  camera.position.lerpVectors(_hT, _hC, c);
  camera.quaternion.copy(rel).multiply(L).multiply(_hR.setFromAxisAngle(_hRt.set(1, 0, 0), lerp(heroFP[2], HERO_CAM[2] - 0.10 * hv, c)));
  if (dodgeRoll) camera.quaternion.multiply(_hR.setFromAxisAngle(_kZ, dodgeRoll * (1 - c)));   // v32: en 1ª persona, la vista da la vuelta con el tonel
  // v27: cámara de apuntado (AIM_CAM), mezclada encima (A.aim). st.aimPt = punto de la mira en ejes del dragón; todo en el marco con retraso (rel)
  A.aim = (A.aim || 0) + ((st.aimCam ? 1 : 0) - (A.aim || 0)) * (1 - Math.exp(-dt * AIM_CAM.blend));
  if (A.aim > 0.002 && st.aimPt) {
    _kA.copy(st.aimPt).applyQuaternion(_kRi.copy(rel).invert());
    if (!A.aimT || A.aim < 0.01) A.aimT = _kA.clone(); else A.aimT.lerp(_kA, 1 - Math.exp(-dt * AIM_CAM.follow));
    const T = A.aimT, oy = Math.atan2(-T.x, -T.z) * AIM_CAM.yawK, e = AIM_CAM.elev;
    _kP.set(0, Math.sin(e), Math.cos(e)).multiplyScalar(AIM_CAM.d).applyAxisAngle(H_UP, oy);   // la cámara, detrás y por encima
    _kD.copy(_kP).negate().normalize();                                                         // hacia el dragón
    _kA.subVectors(T, _kP).normalize();                                                          // hacia la mira
    _kD.lerp(_kA, AIM_CAM.mix).normalize();
    _kQa.copy(rel).multiply(_hQ.setFromEuler(_hEu.set(Math.asin(clamp(_kD.y, -1, 1)), Math.atan2(-_kD.x, -_kD.z), 0, 'YXZ')));
    camera.position.lerp(_kP.applyQuaternion(rel), A.aim); camera.quaternion.slerp(_kQa, A.aim);
  } else A.aimT = null;
  // v32: esquiva en 3ª persona: la cámara se queda atrás lo que el dragón se ha desplazado de lado (st.dodgeOff, en el mundo; ya con DODGE_CAM)
  if (st.dodgeOff && c > 0.001) camera.position.sub(_kA.copy(st.dodgeOff).applyQuaternion(_kRi.copy(qd).invert()).multiplyScalar(c));
}
const _kEu = new THREE.Euler(), _kQy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), _kQr = new THREE.Quaternion(), _kRel = new THREE.Quaternion(), _kT = new THREE.Quaternion();
const _kR = new THREE.Vector3(), _kU = new THREE.Vector3(), _kF = new THREE.Vector3(), _kZ = new THREE.Vector3(0, 0, 1);
const _kA = new THREE.Vector3(), _kP = new THREE.Vector3(), _kD = new THREE.Vector3(), _kRi = new THREE.Quaternion(), _kQa = new THREE.Quaternion();   // (v27: cámara de apuntado)
