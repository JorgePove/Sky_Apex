/* Copia de referencia de las secciones 5c (TyrantDragon), 5e (jinete) y 5d («Elige tu dragón») de fuentes/sky_apex.src.html.
   No se usa: el juego lleva el código dentro del HTML. Se actualiza a mano tras cada cambio. */
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
const HERO_FP = [1.55, -0.5, -0.05], HERO_FP_BONE = 'spine_02'; // 1ª persona (jinete): altura sobre el hueso del lomo, retroceso (negativo = adelante: sobre los hombros, cerca de la base del cuello) y cabeceo
const HERO_CAM = [8, 22, -0.07], HERO_CAM_HOVER = 3;      // 3ª persona (tecla C): altura, distancia detrás, cabeceo (el dragón queda bajo la retícula); en hover baja HERO_CAM_HOVER m
const HERO_FLAP = [0.75, 1.3], HERO_FLAP_BOOST = 1.7;     // velocidad del clip de vuelo: acelerador 0 → 1, y con boost
const HERO_TUCK = 0.45;                                   // recogida de las alas en boost (rad)
const HERO_JAW = 0.55;                                    // apertura de la mandíbula al disparar (rad)
const HERO_EMISSIVE = 1.6;                                // brillo de los ojos
const HERO_NECK = ['Neck1', 'Neck2', 'Neck3', 'Neck4', 'head'], HERO_NECK_W = [0.26, 0.26, 0.24, 0.21, 0.18];   // reparto del giro de la mirada (más en la base: el cuello entero se aparta y asoma la cabeza)
const HERO_LOOK = [1.25, 1.05, 0.45, 1.25];              // mirada: ganancia de giro y de cabeceo hacia el marcador, anticipo del giro del dragón, giro máximo (rad)
const HERO_NECK_UP = 0.32;                               // cuello arqueado hacia arriba en vuelo (rad): desde el lomo se ve la cabeza delante
const HERO_TAIL = ['Tail0', 'Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6', 'Tail7', 'Tail8', 'Tail9'];

const hero = { ready: false, error: null, wrap: new THREE.Group(), model: null, B: {}, rest: new Map(), animated: new Set(), mixer: null, act: {}, glideT: 0, flyDur: 1, hoverDur: 1, glow: null, light: null };
hero.wrap.rotation.set(0, Math.PI, 0);
dragon.add(hero.wrap);

/* Recursos incrustados: el base64 de un <script id=…> (vacío si el HTML no lo lleva y hay que cargar el archivo suelto). */
function embedded(id) { const tag = document.getElementById(id), b64 = tag ? tag.textContent.replace(/\s+/g, '') : ''; return b64.length > 1000 ? b64 : ''; }
/* Un .glb incrustado o, si no, el archivo (necesita un servidor local). */
function loadGLB(id, url) {
  const b64 = embedded(id);
  const src = b64
    ? Promise.resolve().then(() => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; })
    : fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
  return src.then(buf => new Promise((res, rej) => new THREE.GLTFLoader().parse(buf, '', res, rej)));
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
  // boca y punta de la cola en ejes del dragón (pose de planeo): para los enemigos lejanos y su estela
  dragon.updateMatrixWorld(true);
  hero.mouthLocal = dragon.worldToLocal(hero.B.LipUpperMid.getWorldPosition(new THREE.Vector3()));
  hero.tailLocal = dragon.worldToLocal(hero.B.Tail9.getWorldPosition(new THREE.Vector3()));
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

/* ---------- Ayudantes: giros de huesos en el espacio del modelo ---------- */
const _hQ = new THREE.Quaternion(), _hQ2 = new THREE.Quaternion(), _hR = new THREE.Quaternion(), _hMQi = new THREE.Quaternion(), _hWQi = new THREE.Quaternion();
const _hP = new THREE.Vector3(), _hS = new THREE.Vector3(), _hT = new THREE.Vector3(), _hF = new THREE.Vector3(), _hC = new THREE.Vector3();
const _hUp = new THREE.Vector3(), _hRt = new THREE.Vector3(), H_UP = new THREE.Vector3(0, 1, 0);
function heroQuat(o, out) { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(_hP, out, _hS); return out.premultiply(_hMQi); }
/* Gira el hueso b con R (rotación en el espacio del modelo) alrededor de su articulación. */
function rotModel(b, R) { heroQuat(b.parent, _hQ); _hQ2.copy(_hQ).invert().multiply(R).multiply(_hQ); b.quaternion.premultiply(_hQ2); }
function rotAxis(b, axis, ang) { if (b && Math.abs(ang) > 1e-5) rotModel(b, _hR.setFromAxisAngle(axis, ang)); }
/* Boca del dragón en el mundo (de donde salen las bolas de fuego): labio superior, un poco por delante. */
function heroMouth(out) {
  if (!hero.ready) return dragon.localToWorld(out.set(0, 0, -12));
  const lip = hero.B.LipUpperMid || hero.B.head;
  lip.updateWorldMatrix(true, false); out.setFromMatrixPosition(lip.matrixWorld);
  return out.addScaledVector(_hF.set(0, 0, -1).applyQuaternion(dragon.quaternion), 1.2);
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
  A.headPitch += (clamp(Math.atan2(a.y, Math.hypot(a.x, a.z)) * HERO_LOOK[1] + (st.pitchRate || 0) * HERO_LOOK[2] * 0.6, -0.8, 0.8) - A.headPitch) * k5;
  A.tailYaw += (clamp(-st.yawRate * 0.5, -0.8, 0.8) - A.tailYaw) * (1 - Math.exp(-dt * 2.2));
  A.tuck += (bs * (1 - hv) - A.tuck) * (1 - Math.exp(-dt * 3));
  A.glide = (A.glide || 0) + (clamp((0.42 - A.flap) / 0.3, 0, 1) * (1 - hv) * (1 - bs) - (A.glide || 0)) * (1 - Math.exp(-dt * 2.5));
  A.fire += (st.fire - A.fire) * (1 - Math.exp(-dt * 14));

  const B = R.B, act = R.act;
  // 1. clips: pesos (vuelo / planeo / hover) y velocidad del aleteo (los enemigos no tienen hover)
  act.fly.setEffectiveWeight((1 - hv) * (1 - A.glide));
  act.glide.setEffectiveWeight((1 - hv) * A.glide);
  act.fly.timeScale = lerp(lerp(HERO_FLAP[0], HERO_FLAP[1], st.throttle), HERO_FLAP_BOOST, bs);
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
  if (A.tuck > 0.01) {
    for (const [L, s] of [['l', 1], ['r', -1]]) { rotAxis(B['upperarm_' + L], H_UP, s * HERO_TUCK * A.tuck); rotAxis(B['lowerarm_' + L], H_UP, s * HERO_TUCK * 0.7 * A.tuck); }
  }
}
/* El dragón del jugador: animación, fogonazo de la boca y cámara (1ª / 3ª persona y giro del menú). */
function animateHero(dt, st) {
  const A = dragonAnim;
  // cámara: 1ª persona sobre el lomo (por defecto) ↔ 3ª persona detrás del dragón (C); la colocación va al final
  A.cam += ((st.third ? 1 : 0) - A.cam) * (1 - Math.exp(-dt * 4));
  if (!hero.ready) { camera.position.set(0, HERO_CAM[0], HERO_CAM[1]); camera.rotation.set(HERO_CAM[2], 0, 0); return; }
  animateTyrant(hero, A, dt, st);
  const B = hero.B, hv = st.hover || 0;
  // 3. fuego en la boca
  heroMouth(_hT);
  const f = A.fire, g = hero.glow;
  const near = lerp(0.3, 1, A.cam);                        // en 1ª persona la boca está a pocos metros: fogonazo más pequeño
  g.visible = f > 0.02; g.position.copy(_hT); g.scale.setScalar((3 + 9 * f) * near); g.material.opacity = clamp(f * 1.1, 0, 1) * lerp(0.6, 1, A.cam);
  hero.light.position.copy(_hT); hero.light.intensity = f * 3.6 * lerp(0.5, 1, A.cam);
  // 4. cámara. 1ª persona: sobre el lomo, como un jinete, siguiendo (suavizado) cómo sube y baja con cada aletazo.
  //    3ª persona: detrás y por encima; en hover baja y mira al dragón, que está erguido.
  B[HERO_FP_BONE].updateWorldMatrix(true, false);
  dragon.worldToLocal(_hC.setFromMatrixPosition(B[HERO_FP_BONE].matrixWorld));
  if (!A.fp) A.fp = _hC.clone(); else A.fp.lerp(_hC, 1 - Math.exp(-dt * 6));
  if (st.menu) {                                           // pantalla de título: giro lento alrededor del dragón, que queda abajo a la derecha
    const ang = A.time * 0.07, R = 40;
    camera.position.set(Math.sin(ang) * R, 5 + Math.sin(A.time * 0.13) * 2.5, Math.cos(ang) * R);
    _hT.copy(camera.position).negate().normalize();                       // hacia el dragón (ejes del dragón)
    _hF.crossVectors(_hT, H_UP).normalize();                              // derecha de la cámara
    _hC.set(0, 0, 0).addScaledVector(_hF, -18).addScaledVector(H_UP, 10); // mirar a un punto a su izquierda y por encima
    camera.lookAt(dragon.localToWorld(_hC));
    return;
  }
  const c = A.cam;
  camera.position.set(lerp(A.fp.x, 0, c), lerp(A.fp.y + HERO_FP[0], HERO_CAM[0] - HERO_CAM_HOVER * hv, c), lerp(A.fp.z + HERO_FP[1], HERO_CAM[1], c));
  camera.rotation.set(lerp(HERO_FP[2], HERO_CAM[2] - 0.10 * hv, c), 0, 0);
}
/* ============================================================
   5e. JINETE: brazos con guanteletes que sujetan las riendas (1ª persona)
   Modelo: los brazos del caballero «Knighty», recortados y riggeados con herramientas/preparar_brazos.mjs (modelos/brazos_jinete.glb):
   18 huesos por brazo (brazo, antebrazo, mano, tres falanges por dedo y pulgar); el derecho es el espejo del izquierdo.
   · Se dibujan en una pasada aparte, después del mundo y con la profundidad limpia: siempre delante y sin que el plano
     cercano de la cámara del juego los recorte. Su cámara copia la orientación y el campo de visión de la del juego, pero
     va en el origen (el jinete está a medio metro: así no hay temblores de coma flotante lejos del origen del mundo).
   · Pose por IK de dos huesos: hombros fijos respecto a los ojos y muñecas que siguen a los mandos. Girar tira de la
     rienda de ese lado (la otra cede), subir tira de las dos, picar las suelta, el boost agacha al jinete con las manos
     adelante y el hover recoge las riendas. Cada aletazo mece los brazos y el viento del boost los sacude.
   · Riendas: un tubo por lado, del puño a una collera que abraza el cuello por arriba, a media altura (si llegaban a la
     boca parecían atravesar el cuello). Van apoyadas sobre él y siguen su curva cuando gira. Se dibujan en la pasada del
     jinete, con coordenadas relativas a la cámara: en la escena del mundo las tapaba el lomo.
     El tramo libre, de la mano al cuello, hace una comba que se tensa al tirar.
   ============================================================ */
const RIDER_URL = '../modelos/brazos_jinete.glb';        // solo si el HTML no lleva los brazos incrustados
// Pose en ejes del jinete (m): x a la izquierda, y arriba, z adelante, con origen en los ojos. Valores del brazo izquierdo; el derecho es su espejo.
const RIDER_SHOULDER = [0.19, -0.29, -0.08];           // hombro
const RIDER_GRIP = [0.14, -0.3, 0.5];                   // muñeca en reposo
const RIDER_POLE = [0.75, -1, -0.25];                   // hacia dónde apunta el codo
const RIDER_FIST = [-0.2, -0.2, 1], RIDER_THUMB = [-0.45, 0.85, 0.25];   // puño: muñeca → nudillos y lado del pulgar
const RIDER_CURL = [1.15, 1.25, 0.75], RIDER_THUMB_CURL = [0.5, 0.35, 0.5];   // dedos cerrados sobre la rienda (rad por falange)
const RIDER_TWIST = 0.6;                                // parte del giro de la muñeca que se lleva el antebrazo (que el guantelete no se retuerza)
const RIDER_PULL = [0.13, 0.035, 0.03];                 // al girar, la mano de ese lado va atrás, afuera y arriba (la otra cede)
const RIDER_CLIMB = [0.07, 0.04];                       // al subir, las dos atrás y arriba (al picar, al revés)
const RIDER_BOOST = [0.09, -0.05, 0.03, 0.06];          // boost: manos adelante, abajo y más juntas; hombros adelante
const RIDER_HOVER = [0.11, 0.05];                       // hover: riendas recogidas (atrás y arriba)
const RIDER_REIN = { r: 0.018, sag: 0.22, seg: 24, color: 0x5a3418 };   // riendas: radio, comba sin tensión (m), tramos (múltiplo de 3: mano, Neck1, Neck2 y collera), color
const RIDER_REIN_PATH = [['Neck1', 'Neck2', 0.5, 0.25], ['Neck2', 'Neck3', 0.47, 0.245]];   // por dónde va la rienda sobre el cuello: hueso, el siguiente (dirección del cuello), altura y separación (m)
const RIDER_COLLAR = { bone: 'Neck2Part2', next: 'Neck3', rx: 0.27, ry: 0.3, cy: 0.3, end: 0.44, wrap: 0.3, r: 0.026, seg: 16 };   // collera a media altura del cuello donde acaban las riendas: semiejes, altura del centro, ángulo de las riendas y lo que baja por los lados (rad), grosor
const RIDER_COLORS = { acero: [0x5d6168, 0.88, 0.38], cuero: [0x2b1c13, 0, 0.72], malla: [0x45484e, 0.85, 0.5], tela: [0x3b1612, 0, 0.9] };   // color, metal, rugosidad

const rider = { ready: false, error: null, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(78, 1, 0.02, 40), root: new THREE.Group(),
  arms: [], reins: [], vis: false, s: { turn: 0, climb: 0, boost: 0, hover: 0, fire: 0, look: 0 }, fireLight: new THREE.PointLight(0xff8a3a, 0, 80, 2) };
rider.scene.add(rider.root, rider.fireLight);
{ const sun = new THREE.DirectionalLight(0xffc48a, 1.9); sun.position.copy(SUN_DIR).multiplyScalar(100);   // las mismas luces que el mundo
  rider.scene.add(sun, new THREE.HemisphereLight(0x8fa6d6, 0x4b3a30, 0.95)); }

function loadRider() {
  return loadGLB('brazos-glb', RIDER_URL).then(setupRider)
    .catch(err => { rider.error = err; console.error('No se pudieron cargar los brazos del jinete:', err); });
}
function setupRider(gltf) {
  const body = gltf.scene; body.rotation.y = Math.PI;      // el modelo mira hacia +Z; el jinete, como la cámara, hacia -Z
  rider.root.add(body);
  // reflejos del acero: un cielo de degradado prefiltrado (sin mapa de entorno el metal sale negro)
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y;' +
      ' vec3 sky = mix(vec3(0.95, 0.72, 0.55), vec3(0.42, 0.55, 0.78), smoothstep(0.0, 0.5, h));' +
      ' vec3 gnd = mix(vec3(0.6, 0.45, 0.35), vec3(0.18, 0.15, 0.13), smoothstep(0.0, -0.4, h));' +
      ' gl_FragColor = linearToOutputTexel(vec4(h > 0.0 ? sky : gnd, 1.0)); }' })));
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromScene(envScene, 0.02).texture; pm.dispose();
  body.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const m = o.material, c = RIDER_COLORS[m.name]; if (!c) return;
    m.color.setHex(c[0]); m.metalness = c[1]; m.roughness = c[2];
    if (c[1] > 0.5) { m.envMap = env; m.envMapIntensity = 0.85; }
    m.needsUpdate = true;
  });
  for (const side of ['izq', 'der']) {
    const B = n => body.getObjectByName(n + '_' + side), ex = body.getObjectByName('brazo_' + side).userData;
    const V = a => new THREE.Vector3().fromArray(a);
    const A = { sx: side === 'izq' ? 1 : -1, up: B('Brazo'), fore: B('Antebrazo'), hand: B('Mano'),
      fingers: ['indice', 'corazon', 'anular', 'menique'].map(f => [1, 2, 3].map(k => B(f + k))), thumb: [1, 2, 3].map(k => B('pulgar' + k)),
      hd: V(ex.manoDir), ht: V(ex.manoPulgar), hp: V(ex.manoPalma), eDed: V(ex.ejeDedos), ePul: V(ex.ejePulgar),
      S: new THREE.Vector3(), W: new THREE.Vector3(), pole: new THREE.Vector3(), fd: new THREE.Vector3(), td: new THREE.Vector3(), curl: [0, 0, 0] };
    A.l1 = A.fore.position.length(); A.l2 = A.hand.position.length();
    A.dU0 = A.fore.position.clone().normalize(); A.dF0 = A.hand.position.clone().normalize();
    A.pole0 = new THREE.Vector3(0, 0, -1).addScaledVector(A.dU0, A.dU0.z).normalize();   // en reposo el codo apunta hacia atrás
    rider.arms.push(A);
  }
  const leather = new THREE.MeshStandardMaterial({ color: RIDER_REIN.color, roughness: 0.78, metalness: 0 });
  for (const A of rider.arms)                                // riendas y collera: tubos de 6 lados en la pasada del jinete
    rider.reins.push(Object.assign(riderTube(RIDER_REIN.seg + 1, leather), { A, pull: 0, ctrl: Array.from({ length: RIDER_REIN_PATH.length + 2 }, () => new THREE.Vector3()) }));
  rider.collar = riderTube(RIDER_COLLAR.seg + 1, leather);
  rider.ready = true;
}

/* ---------- IK de dos huesos (en ejes del modelo de los brazos; en reposo los huesos no tienen giro) ---------- */
const _rv = Array.from({ length: 10 }, () => new THREE.Vector3()), _rq = Array.from({ length: 5 }, () => new THREE.Quaternion()), _rm = new THREE.Matrix4();
function riderBasis(x, y, out) {                          // giro que lleva X → x e Y → y (ortogonalizado)
  const bx = _rv[5].copy(x).normalize(), bz = _rv[6].crossVectors(bx, y).normalize(), by = _rv[7].crossVectors(bz, bx);
  return out.setFromRotationMatrix(_rm.makeBasis(bx, by, bz));
}
function riderFrame(x1, y1, x0, y0, out) { riderBasis(x0, y0, _rq[4]); return riderBasis(x1, y1, out).multiply(_rq[4].invert()); }
/* Coloca un brazo: hombro S y muñeca W, codo hacia pole, mano con dirección hd y pulgar hacia ht (todo en ejes del modelo). */
function poseArm(A, S, W, pole, hd, ht, curl, tcurl) {
  const D = _rv[0].subVectors(W, S), dist = clamp(D.length(), Math.abs(A.l1 - A.l2) + 1e-3, A.l1 + A.l2 - 1e-3);
  const u = D.normalize(), v = _rv[1].copy(pole).addScaledVector(u, -pole.dot(u)).normalize();
  const cosA = (A.l1 * A.l1 + dist * dist - A.l2 * A.l2) / (2 * A.l1 * dist), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const dU = _rv[2].copy(u).multiplyScalar(cosA).addScaledVector(v, sinA);           // hombro → codo
  const E = _rv[3].copy(S).addScaledVector(dU, A.l1);
  const dF = _rv[4].copy(S).addScaledVector(u, dist).sub(E).normalize();             // codo → muñeca
  const p1 = v.addScaledVector(dU, -v.dot(dU)).normalize();
  const Ru = riderFrame(dU, p1, A.dU0, A.pole0, _rq[0]);
  const Rf = _rq[1].setFromUnitVectors(_rv[0].copy(A.dF0).applyQuaternion(Ru), dF).multiply(Ru);
  const Rh = riderFrame(hd, ht, A.hd, A.ht, _rq[2]);
  // el antebrazo se lleva parte del giro de la muñeca alrededor de su eje (pronación)
  const rel = _rq[3].copy(Rf).invert().multiply(Rh), ax = A.dF0, d = rel.x * ax.x + rel.y * ax.y + rel.z * ax.z;
  Rf.multiply(_rq[3].setFromAxisAngle(ax, 2 * Math.atan2(d, rel.w) * RIDER_TWIST));
  A.up.position.copy(S); A.up.quaternion.copy(Ru);
  A.fore.quaternion.copy(Ru).invert().multiply(Rf);
  A.hand.quaternion.copy(Rf).invert().multiply(Rh);
  for (const f of A.fingers) for (let k = 0; k < 3; k++) f[k].quaternion.setFromAxisAngle(A.eDed, curl[k]);
  for (let k = 0; k < 3; k++) A.thumb[k].quaternion.setFromAxisAngle(A.ePul, tcurl[k]);
}

/* ---------- Por fotograma: pose según los mandos, cámara del jinete y riendas ---------- */
function updateRider(dt) {
  const fp = (state === 'playing' || state === 'dead') && dragonAnim.cam < 0.5 && hero.ready;
  rider.vis = rider.ready && fp;
  for (const r of rider.reins) r.mesh.visible = rider.vis;
  if (rider.collar) rider.collar.mesh.visible = rider.vis;
  if (!rider.vis) return;
  const s = rider.s, k = 1 - Math.exp(-dt * 7), t = gameTime;
  s.turn += (clamp(F.rate.y / 1.1, -1, 1) - s.turn) * k;                // + = gira a la izquierda
  s.climb += (clamp(F.rate.p / 0.7, -1, 1) - s.climb) * k;              // + = sube
  s.boost += (F.boostFx - s.boost) * k; s.hover += (F.hoverK - s.hover) * k;
  s.fire += (F.fireFlash - s.fire) * (1 - Math.exp(-dt * 18));
  s.look += (clamp(dragonAnim.headYaw, -1.2, 1.2) - s.look) * k;        // la cabeza del dragón tira de las riendas hacia su lado
  const bob = Math.sin(dragonAnim.phase) * 0.012 * (1 - 0.5 * s.hover);
  for (const A of rider.arms) {
    const sx = A.sx, pull = Math.max(0, s.turn * sx), give = Math.max(0, -s.turn * sx);
    A.S.set(RIDER_SHOULDER[0] * sx, RIDER_SHOULDER[1] - 0.02 * s.boost, RIDER_SHOULDER[2] + RIDER_BOOST[3] * s.boost);
    A.W.set(RIDER_GRIP[0] * sx + sx * (RIDER_PULL[1] * pull - RIDER_BOOST[2] * s.boost) + s.look * 0.03,
      RIDER_GRIP[1] + RIDER_PULL[2] * pull + RIDER_CLIMB[1] * s.climb + RIDER_BOOST[1] * s.boost + RIDER_HOVER[1] * s.hover + bob + s.fire * 0.015,
      RIDER_GRIP[2] - RIDER_PULL[0] * pull + 0.04 * give - RIDER_CLIMB[0] * s.climb + RIDER_BOOST[0] * s.boost - RIDER_HOVER[0] * s.hover - s.fire * 0.025);
    if (s.boost > 0.01) { A.W.x += Math.sin(t * 37 + sx) * 0.0035 * s.boost; A.W.y += Math.sin(t * 43 + 2 * sx) * 0.0035 * s.boost; }
    A.pole.set(RIDER_POLE[0] * sx, RIDER_POLE[1], RIDER_POLE[2]);
    A.fd.set(RIDER_FIST[0] * sx, RIDER_FIST[1] + 0.35 * pull + 0.2 * s.hover, RIDER_FIST[2]);   // al tirar, la muñeca se dobla hacia atrás
    A.td.set(RIDER_THUMB[0] * sx, RIDER_THUMB[1], RIDER_THUMB[2]);
    for (let j = 0; j < 3; j++) A.curl[j] = RIDER_CURL[j] + 0.12 * (pull + s.hover);             // y aprieta el puño
    poseArm(A, A.S, A.W, A.pole, A.fd, A.td, A.curl, RIDER_THUMB_CURL);
  }
  // cámara del jinete: misma orientación que la del juego, en el origen
  camera.updateWorldMatrix(true, false);
  const camP = _rv[8]; camera.matrixWorld.decompose(camP, rider.root.quaternion, _rv[9]);
  rider.cam.quaternion.copy(rider.root.quaternion);
  rider.root.updateMatrixWorld(true);
  rider.fireLight.color.copy(hero.light.color); rider.fireLight.intensity = hero.light.intensity * 1.2;
  rider.fireLight.position.subVectors(hero.light.position, camP);
  // riendas: del puño (centro de la mano cerrada) bajan al cuello, van por encima de él a los lados de la cresta y
  // acaban en la collera. Solo el tramo libre (de la mano al cuello) hace comba, y se tensa al tirar.
  // Todo relativo a la cámara (así se dibuja en la escena del jinete) y con los ejes del cuello en cada hueso.
  const Cl = RIDER_COLLAR, cf = neckFrame(Cl.bone, Cl.next, camP), cP = _rv[3].copy(cf.p), cR = _rv[4].copy(cf.rt), cU = _rv[2].copy(cf.up);
  const collarPt = (th, out) => out.copy(cP).addScaledVector(cR, Math.cos(th) * Cl.rx).addScaledVector(cU, Cl.cy + Math.sin(th) * Cl.ry);
  for (let i = 0; i < rider.collar.n; i++) collarPt(Math.PI + Cl.wrap - (Math.PI + 2 * Cl.wrap) * i / (rider.collar.n - 1), rider.collar.pts[i]);   // de izquierda a derecha por arriba
  fillTube(rider.collar, Cl.r);
  for (const r of rider.reins) {
    const A = r.A;
    const pull = Math.max(0, s.turn * A.sx) + 0.6 * s.hover + 0.4 * Math.max(0, s.climb);
    r.pull += (pull - r.pull) * k;
    const C = r.ctrl, side = -A.sx;                          // la mano izquierda del jinete va al lado izquierdo del dragón (-X)
    C[0].setFromMatrixPosition(A.fingers[1][0].matrixWorld)
      .addScaledVector(_rv[1].copy(A.hp).applyQuaternion(A.hand.getWorldQuaternion(_rq[0])), 0.03);
    RIDER_REIN_PATH.forEach(([bn, nx, up, sd], i) => {
      const f = neckFrame(bn, nx, camP);
      C[i + 1].copy(f.p).addScaledVector(f.up, up).addScaledVector(f.rt, sd * side);
    });
    collarPt(side > 0 ? Cl.end : Math.PI - Cl.end, C[C.length - 1]);
    const sag = RIDER_REIN.sag * clamp(1 - 0.85 * r.pull, 0.1, 1) * (1 + 0.25 * s.boost);
    // curva Catmull-Rom por los puntos de control, con el mismo número de muestras por tramo
    const per = (r.n - 1) / (C.length - 1);
    for (let i = 0; i < r.n; i++) {
      const sp = Math.min(Math.floor(i / per), C.length - 2), u = i / per - sp;
      const p1 = C[sp], p2 = C[sp + 1], p0 = sp > 0 ? C[sp - 1] : _rv[5].copy(p1).multiplyScalar(2).sub(p2), p3 = sp + 2 < C.length ? C[sp + 2] : _rv[6].copy(p2).multiplyScalar(2).sub(p1);
      const u2 = u * u, u3 = u2 * u, Q = r.pts[i];
      Q.set(0, 0, 0).addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u).addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
        .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u).addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
      if (sp === 0) {                                        // tramo libre: comba y, en boost, el viento la agita
        const w = 0.05 * s.boost * Math.sin(Math.PI * u);
        Q.y -= sag * 4 * u * (1 - u); Q.x += Math.sin(t * 13 + u * 9) * w; Q.z += Math.cos(t * 11 + u * 7) * w;
      }
    }
    fillTube(r, RIDER_REIN.r);
  }
}
/* Tubo dinámico (riendas, collera): n anillos de 6 vértices a lo largo de pts. */
function riderTube(n, mat) {
  const R = 6, g = new THREE.BufferGeometry(), ix = [];
  for (const k of ['position', 'normal']) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n * R * 3), 3).setUsage(THREE.DynamicDrawUsage));
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R; ix.push(a, a + R, b, b, a + R, b + R); }
  g.setIndex(ix);
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.visible = false; rider.scene.add(mesh);
  return { mesh, g, n, R, pts: Array.from({ length: n }, () => new THREE.Vector3()) };
}
function fillTube(tb, radius) {
  const pos = tb.g.attributes.position.array, nor = tb.g.attributes.normal.array, T = _rv[5], N = _rv[6], Bv = _rv[7];
  for (let i = 0; i < tb.n; i++) {
    const P = tb.pts[i];
    T.subVectors(tb.pts[Math.min(i + 1, tb.n - 1)], tb.pts[Math.max(i - 1, 0)]).normalize();
    N.set(0, 1, 0).applyQuaternion(dragon.quaternion).cross(T); if (N.lengthSq() < 1e-6) N.set(1, 0, 0).applyQuaternion(dragon.quaternion); N.normalize(); Bv.crossVectors(T, N);
    for (let j = 0; j < tb.R; j++) {
      const ang = j / tb.R * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang), o = (i * tb.R + j) * 3;
      const nx = N.x * c + Bv.x * sn, ny = N.y * c + Bv.y * sn, nz = N.z * c + Bv.z * sn;
      pos[o] = P.x + nx * radius; pos[o + 1] = P.y + ny * radius; pos[o + 2] = P.z + nz * radius;
      nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
    }
  }
  tb.g.attributes.position.needsUpdate = true; tb.g.attributes.normal.needsUpdate = true;
}
/* Ejes del cuello en un hueso (relativos a la cámara): posición, derecha y arriba perpendiculares al cuello (hacia el hueso siguiente). */
const _nf = { p: new THREE.Vector3(), rt: new THREE.Vector3(), up: new THREE.Vector3() }, _nfN = new THREE.Vector3(), _nfU = new THREE.Vector3();
function neckFrame(bn, next, camP) {
  const b = hero.B[bn], n = hero.B[next]; b.updateWorldMatrix(true, false); n.updateWorldMatrix(true, false);
  _nf.p.setFromMatrixPosition(b.matrixWorld); _nfN.setFromMatrixPosition(n.matrixWorld).sub(_nf.p).normalize();   // a lo largo del cuello
  _nf.rt.crossVectors(_nfN, _nfU.set(0, 1, 0).applyQuaternion(dragon.quaternion)).normalize();
  _nf.up.crossVectors(_nf.rt, _nfN);
  _nf.p.sub(camP);
  return _nf;
}
/* Segunda pasada: los brazos encima del mundo ya dibujado (misma proyección que la cámara del juego). */
function renderRider() {
  if (!rider.vis) return;
  rider.cam.fov = camera.fov; rider.cam.aspect = camera.aspect; rider.cam.updateProjectionMatrix();
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(rider.scene, rider.cam); renderer.autoClear = true;
}

/* ============================================================
   5d. «ELIGE TU DRAGÓN»: plataforma giratoria con el dragón animado y personalización de colores
   El mismo modelo del jugador (hero.wrap) se pasa a una escena aparte mientras dura la pantalla, y vuelve al juego al empezar.
   · Animación: reposo en bucle y, cada pocos segundos, al azar el aliento de fuego o el rugido (con fundido entre clips).
     El botón «Probar llamarada», bajo la rueda del aliento, lanza el aliento al momento.
   · Clic derecho mantenido y arrastrar: gira la plataforma (con inercia; si se suelta, vuelve a girar sola despacio).
     Rueda del ratón: acercar / alejar.
   · Color de piel: tiñe toda la textura conservando su detalle (luminancia × color elegido) en el shader del material.
   · Color del aliento: bolas de fuego, estelas, fogonazo de la boca y luces del jugador. Se guarda en este navegador.
   ============================================================ */
const ATTACK = new THREE.Color(1, 0.55, 0.15);            // color del aliento (por defecto, brasa)
const ATTACK_DEF = { h: 0.065, s: 0.85, v: 1 }, SKIN_DEF = { h: 0.03, s: 0.75, v: 0.8 };
const SKIN_TINT = { uTint: { value: new THREE.Color(1, 1, 1) }, uTintMix: { value: 0 }, uAvgLum: { value: 0.3 }, uHit: { value: 0 } };
const colors = { skin: null, fire: Object.assign({}, ATTACK_DEF) };   // skin null = colores originales
const COLOR_KEY = 'alasDeBrasa.colores';
const hsv2rgb = (h, s, v) => {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
};
const cssOf = (h, s, v) => { const [r, g, b] = hsv2rgb(h, s, v); return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; };

/* Tinte de piel en el shader: cambia el color de la textura y conserva sus luces y sombras.
   U = { uTint, uTintMix, uAvgLum, uHit }: el jugador usa SKIN_TINT y cada enemigo los suyos (amarillo, y uHit para el destello al recibir un impacto).
   Todos comparten el mismo código de shader (mismo programa); solo cambian los valores. */
function tintSkinMaterial(m, U) {
  if (!tintSkinMaterial.lum) try {                         // luminancia media de la textura (sin el relleno blanco del atlas), una sola vez
    const img = m.map.image, c = document.createElement('canvas'); c.width = 96; c.height = 64;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 96, 64);
    const d = g.getImageData(0, 0, 96, 64).data; let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; if (l < 0.97) { s += l; n++; } }
    if (n) SKIN_TINT.uAvgLum.value = Math.max(0.05, s / n);
    tintSkinMaterial.lum = true;
  } catch (e) { /* sin acceso a la imagen: se usa el valor por defecto */ }
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform vec3 uTint; uniform float uTintMix; uniform float uAvgLum; uniform float uHit;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  texelColor = mapTexelToLinear( texelColor );
  float tLum = dot( texelColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
  vec3 tinted = uTint * clamp( tLum / uAvgLum, 0.0, 2.6 ) * 0.6;
  texelColor.rgb = mix( texelColor.rgb, tinted, uTintMix );
  diffuseColor *= texelColor;
#endif`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3( 1.0, 0.42, 0.12 ) * uHit;`);
  };
  m.needsUpdate = true;
}
function applyColors() {
  if (colors.skin) { const [r, g, b] = hsv2rgb(colors.skin.h, colors.skin.s, colors.skin.v); SKIN_TINT.uTint.value.setRGB(r, g, b); SKIN_TINT.uTintMix.value = 1; }
  else SKIN_TINT.uTintMix.value = 0;
  const [r, g, b] = hsv2rgb(colors.fire.h, colors.fire.s, colors.fire.v); ATTACK.setRGB(r, g, b);
  if (hero.glow) hero.glow.material.color.copy(ATTACK).lerp(_white, 0.35);
  if (hero.light) hero.light.color.copy(ATTACK);
  if (show.light) show.light.color.copy(ATTACK);
}
function loadColors() {
  try { const c = JSON.parse(localStorage.getItem(COLOR_KEY) || 'null'); if (c && c.fire) { colors.skin = c.skin || null; colors.fire = c.fire; } } catch (e) { /* almacenamiento no disponible */ }
  applyColors(); syncPickers();
}
function saveColors() { try { localStorage.setItem(COLOR_KEY, JSON.stringify(colors)); } catch (e) { /* sin almacenamiento: no pasa nada */ } }

/* ---------- Escena de la plataforma ---------- */
const show = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(36, 1, 0.5, 2000), table: new THREE.Group(), built: false,
  yaw: 0.7, vel: 0, drag: false, lastX: 0, lastT: 0, idle: 9, zoom: 1, dist: 60, target: new THREE.Vector3(0, 6, 0),
  cur: null, curName: '', timer: 0, fx: null, light: null, breathing: false, t: 0 };
show.scene.add(show.table);
const SHOW_ANIMS = { reposo: 'Reposo', fuego: 'Aliento de fuego', rugido: 'Rugido' };
function buildShowroom() {
  const S = show.scene; show.built = true;
  // fondo: degradado cálido de fragua, niebla para fundir el suelo
  const bg = document.createElement('canvas'); bg.width = 4; bg.height = 256;
  const bgg = bg.getContext('2d'), gr = bgg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#07060a'); gr.addColorStop(0.55, '#1a1014'); gr.addColorStop(0.8, '#3a1a10'); gr.addColorStop(1, '#120a0a');
  bgg.fillStyle = gr; bgg.fillRect(0, 0, 4, 256);
  S.background = new THREE.CanvasTexture(bg);
  S.fog = new THREE.Fog(0x140c0d, 90, 260);
  S.add(new THREE.HemisphereLight(0x8a86a8, 0x3a1a0c, 0.75));
  const key = new THREE.DirectionalLight(0xffd6a8, 2.1); key.position.set(30, 45, 38); S.add(key);
  const rim = new THREE.DirectionalLight(0x7a9cff, 1.2); rim.position.set(-35, 28, -42); S.add(rim);
  const under = new THREE.PointLight(0xff6a20, 1.4, 70, 2); under.position.set(0, 3, 22); S.add(under);
  show.light = new THREE.PointLight(ATTACK.getHex(), 0, 60, 2); S.add(show.light);
  // suelo
  const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x120c0c, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.7; S.add(floor);
  // plataforma: piedra oscura con anillos y runas que brillan como brasas
  const tc = document.createElement('canvas'); tc.width = tc.height = 1024;
  const t = tc.getContext('2d'), C = 512;
  const stone = t.createRadialGradient(C, C, 0, C, C, C); stone.addColorStop(0, '#2c2422'); stone.addColorStop(1, '#1a1413');
  t.fillStyle = stone; t.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1400; i++) { t.fillStyle = `rgba(${hash2(i, 1, 91) > 0.5 ? '255,240,220' : '0,0,0'},${0.03 + hash2(i, 2, 91) * 0.05})`; t.fillRect(hash2(i, 3, 91) * 1024, hash2(i, 4, 91) * 1024, 2 + hash2(i, 5, 91) * 10, 2 + hash2(i, 6, 91) * 10); }
  const em = document.createElement('canvas'); em.width = em.height = 1024; const e = em.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, 1024, 1024);
  for (const [r, w, a] of [[500, 6, 1], [470, 2, 0.7], [330, 3, 0.8], [318, 1.5, 0.5], [150, 2, 0.6]]) { e.strokeStyle = `rgba(255,120,40,${a})`; e.lineWidth = w; e.beginPath(); e.arc(C, C, r, 0, 6.2832); e.stroke(); }
  e.strokeStyle = 'rgba(255,150,60,0.7)'; e.lineWidth = 2;
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.2832, r0 = i % 4 ? 480 : 455; e.beginPath(); e.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); e.lineTo(C + Math.cos(a) * 492, C + Math.sin(a) * 492); e.stroke(); }
  for (let i = 0; i < 12; i++) {                           // runas: trazos cortos entre los dos anillos interiores
    const a = (i + 0.5) / 12 * 6.2832; e.save(); e.translate(C + Math.cos(a) * 400, C + Math.sin(a) * 400); e.rotate(a + Math.PI / 2);
    e.strokeStyle = 'rgba(255,140,50,0.75)'; e.lineWidth = 3; e.beginPath();
    for (let k = 0; k < 4; k++) { const x = (hash2(i, k, 7) - 0.5) * 40, y = (hash2(i, k, 8) - 0.5) * 40; k ? e.lineTo(x, y) : e.moveTo(x, y); }
    e.stroke(); e.restore();
  }
  const topMat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(tc), emissiveMap: new THREE.CanvasTexture(em), emissive: 0xff7a2e, emissiveIntensity: 1.2, roughness: 0.85, metalness: 0.1 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x241c1a, roughness: 0.9, metalness: 0.1 });
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(19, 20.5, 1.6, 96, 1, false), [sideMat, topMat, sideMat]);
  dais.position.y = -0.8; show.table.add(dais);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(20.6, 0.22, 8, 160), new THREE.MeshBasicMaterial({ color: 0xff7a2e }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.55; S.add(ring);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexW, color: 0xff5a18, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  glow.scale.set(90, 26, 1); glow.position.set(0, -1.2, 0); S.add(glow);
  // partículas propias (aliento y brasas que suben)
  show.fx = makeParticles(1600, true); scene.remove(show.fx.points); S.add(show.fx.points);
}
const _sv = new THREE.Vector3(), _sv2 = new THREE.Vector3();
function showroomEnter() {
  if (!show.built) buildShowroom();
  show.table.add(hero.wrap); hero.wrap.rotation.set(0, 0, 0); hero.wrap.position.set(0, 0, 0);
  hero.mixer.stopAllAction(); restorePose0(); show.cur = null;
  playShow('reposo', 0);
  hero.mixer.update(0); show.table.updateMatrixWorld(true);
  // apoyar las patas en la plataforma y encuadrar el dragón
  let minY = Infinity; const box = new THREE.Box3();
  hero.model.traverse(o => { if (!o.isBone) return; o.getWorldPosition(_sv); show.table.worldToLocal(_sv); box.expandByPoint(_sv); if (/^(foot|ball|toe)/.test(o.name)) minY = Math.min(minY, _sv.y); });
  hero.wrap.position.y = -minY + 0.1;
  const size = box.getSize(_sv2), h = size.y;
  show.target.set(0, Math.max(h * 0.55, 3.5), 0);
  // encuadre: la envergadura abierta (rugido) y la plataforma entera deben caber
  show.dist = Math.max(Math.max(size.x, size.z, h * 1.4), HERO_SPAN * 1.15) * 0.5 / Math.tan(show.cam.fov * Math.PI / 360) * 1.12;
  show.idle = 9; show.vel = 0;
  canvasGL.style.cursor = 'grab';
}
/* Todos los huesos a la pose de reposo del modelo (para que ningún clip deje huesos en una pose ajena). */
function restorePose0() { for (const [b, p, q, s] of hero.pose0) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); } }
function showroomLeave() {
  hero.mixer.stopAllAction(); restorePose0(); show.cur = null; show.breathing = false; if (show.light) show.light.intensity = 0;
  dragon.add(hero.wrap); hero.wrap.rotation.set(0, Math.PI, 0); hero.wrap.position.set(0, 0, 0);
  for (const a of [hero.act.fly, hero.act.hover, hero.act.glide]) { a.reset(); a.play(); }
  hero.act.glide.time = hero.glideT; hero.act.glide.timeScale = 0;
  canvasGL.style.cursor = '';
}
function playShow(name, fade) {
  const clip = hero.clips[name]; if (!clip) return;
  const a = hero.mixer.clipAction(clip);
  a.reset(); a.setLoop(name === 'reposo' ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true; a.setEffectiveWeight(1); a.play();
  if (show.cur && show.cur !== a && fade) show.cur.crossFadeTo(a, fade, false);
  else if (show.cur && show.cur !== a) show.cur.stop();
  show.cur = a; show.curName = name;
  show.timer = name === 'reposo' ? rnd(4.5, 8) : clip.duration - fade - 0.05;
  const tag = document.getElementById('animTag'); if (tag) tag.textContent = SHOW_ANIMS[name] || name;
}
function updateShowroom(dt) {
  show.t += dt;
  show.timer -= dt;
  if (show.timer <= 0) playShow(show.curName === 'reposo' ? (Math.random() < 0.6 ? 'fuego' : 'rugido') : 'reposo', 0.5);
  hero.mixer.update(dt);
  // plataforma: arrastre con inercia; sola, gira despacio
  if (!show.drag) { show.vel *= Math.exp(-dt * 2.5); show.idle += dt; if (show.idle > 3) show.vel += (0.18 - show.vel) * (1 - Math.exp(-dt * 0.8)); }
  show.yaw += show.vel * dt; show.table.rotation.y = show.yaw;
  // cámara con un leve vaivén
  const d = show.dist * show.zoom, el = 0.2 + Math.sin(show.t * 0.23) * 0.02;
  show.cam.position.set(Math.sin(show.t * 0.11) * d * 0.05, show.target.y + Math.sin(el) * d, Math.cos(el) * d);
  show.cam.lookAt(show.target);
  if (show.cam.aspect !== innerWidth / innerHeight) { show.cam.aspect = innerWidth / innerHeight; show.cam.updateProjectionMatrix(); }
  // aliento: mientras la boca está abierta (hueso Jaw1) en los clips de ataque
  const jaw = hero.B.Jaw1, rest = hero.rest.get(jaw), open = jaw && rest ? jaw.quaternion.angleTo(rest) : 0;
  const breath = show.curName === 'fuego' && open > 0.33, roar = show.curName === 'rugido' && open > 0.33;
  if (breath && !show.breathing) sfx.fire(0.9);
  if (roar && !show.roaring) sfx.roar(0.9);
  show.breathing = breath; show.roaring = roar;
  if (breath) {
    hero.B.head.getWorldPosition(_sv); hero.B.LipUpperMid.getWorldPosition(_sv2);
    const dir = _sv2.clone().sub(_sv).normalize();
    for (let i = 0; i < 10; i++) {
      const sp = rnd(18, 32);
      emit(show.fx, _sv2.x + rnd(-0.3, 0.3), _sv2.y + rnd(-0.3, 0.3), _sv2.z + rnd(-0.3, 0.3), dir.x * sp + rnd(-3, 3), dir.y * sp + rnd(-2, 3), dir.z * sp + rnd(-3, 3),
        rnd(0.45, 0.9), rnd(1, 2), rnd(5, 9), ATTACK.r, ATTACK.g * rnd(0.75, 1.15), ATTACK.b, 0.9, 1.2, -2);
    }
    show.light.position.copy(_sv2).addScaledVector(dir, 4); show.light.intensity = 3.2 + Math.random() * 0.8;
  } else show.light.intensity = Math.max(0, show.light.intensity - dt * 12);
  if (Math.random() < dt * 14) {                           // brasas que suben alrededor de la plataforma
    const a = Math.random() * 6.2832, r = rnd(8, 30);
    emit(show.fx, Math.cos(a) * r, rnd(-1, 2), Math.sin(a) * r, rnd(-0.6, 0.6), rnd(2, 5), rnd(-0.6, 0.6), rnd(3, 6), 0.35, 0.1, 1, rnd(0.4, 0.6), 0.12, 0.9, 0.2, -0.3);
  }
  show.fx.mat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(show.cam.fov * Math.PI / 360));
  updateParticles(show.fx, dt);
  sfx.update(0.05, 0, 0, 0);
}

/* ---------- Ruedas de color ---------- */
function makeWheel(cv, valEl, swEl, getHSV, onPick) {
  const ctx = cv.getContext('2d'), W = cv.width, R = W / 2 - 4;
  const base = ctx.createImageData(W, W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const dx = x - W / 2, dy = y - W / 2, r = Math.hypot(dx, dy), o = (y * W + x) * 4;
    if (r > R + 1) continue;
    const [cr, cg, cb] = hsv2rgb((Math.atan2(dy, dx) / 6.2832 + 1) % 1, Math.min(r / R, 1), 1);
    base.data[o] = cr * 255; base.data[o + 1] = cg * 255; base.data[o + 2] = cb * 255; base.data[o + 3] = 255 * clamp(R + 1 - r, 0, 1);
  }
  const off = document.createElement('canvas'); off.width = off.height = W; off.getContext('2d').putImageData(base, 0, 0);
  function draw() {
    const c = getHSV();
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(off, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${1 - (c ? c.v : 1)})`; ctx.beginPath(); ctx.arc(W / 2, W / 2, R + 1, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(241,230,211,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, W / 2, R + 1, 0, 6.2832); ctx.stroke();
    if (c) {
      const x = W / 2 + Math.cos(c.h * 6.2832) * c.s * R, y = W / 2 + Math.sin(c.h * 6.2832) * c.s * R;
      ctx.lineWidth = 4; ctx.strokeStyle = '#0d0a0f'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.2832); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#f1e6d3'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.2832); ctx.stroke();
      swEl.style.background = cssOf(c.h, c.s, c.v); valEl.value = Math.round(c.v * 100);
    } else swEl.style.background = 'conic-gradient(#b4562a,#5a2414,#d8873e,#b4562a)';
  }
  let down = false;
  const pick = ev => {
    const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W - W / 2, y = (ev.clientY - r.top) / r.height * W - W / 2;
    const c = getHSV() || {};
    onPick({ h: (Math.atan2(y, x) / 6.2832 + 1) % 1, s: Math.min(Math.hypot(x, y) / R, 1), v: c.v != null ? c.v : valEl.value / 100 });
    draw();
  };
  cv.addEventListener('pointerdown', ev => { if (ev.button !== 0) return; down = true; cv.setPointerCapture(ev.pointerId); pick(ev); });
  cv.addEventListener('pointermove', ev => { if (down) pick(ev); });
  cv.addEventListener('pointerup', () => { down = false; saveColors(); });
  valEl.addEventListener('input', () => { const c = getHSV(); onPick(Object.assign({}, c || SKIN_DEF, { v: valEl.value / 100 })); draw(); });
  valEl.addEventListener('change', saveColors);
  return { draw };
}
const pickers = {};
function syncPickers() { for (const k in pickers) pickers[k].draw(); }
pickers.skin = makeWheel(document.getElementById('skinWheel'), document.getElementById('skinVal'), document.getElementById('skinSw'),
  () => colors.skin, c => { colors.skin = c; applyColors(); });
pickers.fire = makeWheel(document.getElementById('fireWheel'), document.getElementById('fireVal'), document.getElementById('fireSw'),
  () => colors.fire, c => { colors.fire = c; applyColors(); });
document.getElementById('skinReset').addEventListener('click', () => { colors.skin = null; applyColors(); syncPickers(); saveColors(); });
document.getElementById('fireReset').addEventListener('click', () => { colors.fire = Object.assign({}, ATTACK_DEF); applyColors(); syncPickers(); saveColors(); });
document.getElementById('fireTry').addEventListener('click', () => { if (state === 'select') playShow('fuego', 0.3); });   // ver el aliento sin esperar al azar
syncPickers();
/* Clic derecho mantenido: girar la plataforma. Rueda: acercar. */
window.addEventListener('mousedown', e => { if (e.button === 2 && state === 'select') { show.drag = true; show.lastX = e.clientX; show.lastT = performance.now(); show.vel = 0; canvasGL.style.cursor = 'grabbing'; } });
window.addEventListener('mousemove', e => {
  if (!show.drag) return;
  const now = performance.now(), dx = e.clientX - show.lastX, dtm = Math.max((now - show.lastT) / 1000, 1 / 240);
  show.yaw += dx * 0.008; show.vel = show.vel * 0.5 + dx * 0.008 / dtm * 0.5; show.lastX = e.clientX; show.lastT = now; show.idle = 0;
});
window.addEventListener('mouseup', e => { if (e.button === 2 && show.drag) { show.drag = false; show.idle = 0; if (state === 'select') canvasGL.style.cursor = 'grab'; } });
window.addEventListener('wheel', e => { if (state === 'select') show.zoom = clamp(show.zoom * Math.exp(e.deltaY * 0.001), 0.6, 1.6); }, { passive: true });

