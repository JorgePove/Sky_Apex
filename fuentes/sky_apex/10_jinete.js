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
  body.traverse(o => { if (o.isMesh) { o.frustumCulled = false; riderMaterial(o.material); } });
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
  // las mismas riendas y collera en la escena del mundo, para la 3ª persona (salen de las manos del caballero completo, 5f)
  rider.reins3 = [1, -1].map(sx => Object.assign(riderTube(RIDER_REIN.seg + 1, leather, scene), { sx, pull: 0, ctrl: Array.from({ length: RIDER_REIN_PATH.length + 2 }, () => new THREE.Vector3()) }));
  rider.collar3 = riderTube(RIDER_COLLAR.seg + 1, leather, scene);
  rider.leather = leather;
  rider.ready = true;
}
/* Acero, cuero, malla y tela del caballero (brazos de la 1ª persona y cuerpo entero): colores de RIDER_COLORS y reflejos del cielo en el metal. */
function riderMaterial(m) {
  const c = RIDER_COLORS[m.name]; if (!c) return;
  m.color.setHex(c[0]); m.metalness = c[1]; m.roughness = c[2];
  if (c[1] > 0.5) { m.envMap = steelEnv(); m.envMapIntensity = 0.85; }
  m.needsUpdate = true;
}
/* Reflejos del acero: un cielo de degradado prefiltrado (sin mapa de entorno el metal sale negro). Se crea una vez. */
function steelEnv() {
  if (rider.env) return rider.env;
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y;' +
      ' vec3 sky = mix(vec3(0.95, 0.72, 0.55), vec3(0.42, 0.55, 0.78), smoothstep(0.0, 0.5, h));' +
      ' vec3 gnd = mix(vec3(0.6, 0.45, 0.35), vec3(0.18, 0.15, 0.13), smoothstep(0.0, -0.4, h));' +
      ' gl_FragColor = linearToOutputTexel(vec4(h > 0.0 ? sky : gnd, 1.0)); }' })));
  const pm = new THREE.PMREMGenerator(renderer); rider.env = pm.fromScene(envScene, 0.02).texture; pm.dispose();
  return rider.env;
}
/* Puño del caballero completo (3ª persona), en el mundo: la muñeca un poco hacia los nudillos. sx = 1: mano izquierda. */
const _kf = new THREE.Vector3(), _kf2 = new THREE.Vector3();
function knightFist(sx, out) {
  const s = sx > 0 ? 'l' : 'r';
  knight.B['mano_' + s].getWorldPosition(out); knight.B['antebrazo_' + s].getWorldPosition(_kf);
  return out.addScaledVector(_kf2.subVectors(out, _kf).normalize(), 0.08);
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
  const inGame = (state === 'playing' || state === 'dead') && hero.ready;
  rider.vis = rider.ready && inGame && dragonAnim.cam < (knight.ready ? KNIGHT_SHOW_CAM : 0.5) && !devNoRider();   // con el caballero completo, los brazos solo en 1ª persona (v32: el jinete se puede quitar en los modos de prueba)
  for (const r of rider.reins) r.mesh.visible = rider.vis;
  if (rider.collar) rider.collar.mesh.visible = rider.vis;
  const third = rider.ready && inGame && knight.ready && knight.holder.visible;   // 3ª persona: riendas y collera en el mundo, desde las manos del caballero
  if (rider.reins3) { for (const r of rider.reins3) r.mesh.visible = third; rider.collar3.mesh.visible = third; }
  if (!rider.vis && !third) return;
  const s = rider.s, k = 1 - Math.exp(-dt * 7), t = gameTime;
  s.turn += (clamp(F.rate.y / 1.1, -1, 1) - s.turn) * k;                // + = gira a la izquierda
  s.climb += (clamp(F.rate.p / 0.7, -1, 1) - s.climb) * k;              // + = sube
  s.boost += (F.boostFx - s.boost) * k; s.hover += (F.hoverK - s.hover) * k;
  s.fire += (F.fireFlash - s.fire) * (1 - Math.exp(-dt * 18));
  s.look += (clamp(dragonAnim.headYaw, -1.2, 1.2) - s.look) * k;        // la cabeza del dragón tira de las riendas hacia su lado
  if (third) layReins(rider.reins3, rider.collar3, ZERO, k, (r, out) => knightFist(r.sx, out));
  if (!rider.vis) return;
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
  // cámara del jinete: en el origen. El cuerpo (y los brazos) sigue al lomo; la cámara, además, el giro de cabeza de la Z (mirar alrededor)
  camera.updateWorldMatrix(true, false);
  const camP = _rv[8]; camera.matrixWorld.decompose(camP, rider.cam.quaternion, _rv[9]);
  rider.root.quaternion.copy(dragon.quaternion).multiply(_rq[0].setFromAxisAngle(_rv[0].set(0, 0, 1), hero.roll))   // (v32: el tonel de la esquiva, entero)
    .multiply(_rq[1].identity().slerp(hero.leanQ, RIDER_LEAN)).multiply(_rq[0].setFromAxisAngle(_rv[0].set(1, 0, 0), heroFP[2]));   // (v13) el torso del jinete acompaña en parte al cuerpo del dragón
  rider.root.updateMatrixWorld(true);
  rider.fireLight.color.copy(hero.light.color); rider.fireLight.intensity = hero.light.intensity * 1.2;
  rider.fireLight.position.subVectors(hero.light.position, camP);
  layReins(rider.reins, rider.collar, camP, k, (r, out) => out.setFromMatrixPosition(r.A.fingers[1][0].matrixWorld)
    .addScaledVector(_rv[1].copy(r.A.hp).applyQuaternion(r.A.hand.getWorldQuaternion(_rq[0])), 0.03));
}
/* Riendas y collera: del puño (centro de la mano cerrada) bajan al cuello, van por encima de él a los lados de la cresta y acaban en la
   collera. Solo el tramo libre (de la mano al cuello) hace comba, y se tensa al tirar. Coordenadas relativas a camP (1ª persona: la cámara,
   porque se dibujan en la pasada del jinete; 3ª persona: ZERO, en el mundo), con los ejes del cuello en cada hueso.
   fist(r, out) escribe el puño de cada rienda; r.A.sx (brazos) o r.sx (caballero completo): 1 = mano izquierda. */
function layReins(list, collar, camP, k, fist) {
  const s = rider.s, t = gameTime;
  // v16: con otro dragón, la collera y el recorrido por su cuello (DRAGONS[id].rider) y las medidas escaladas por su grosor (neckK)
  const D = alt.D, nk = D ? D.neckK : 1, Cb = D ? D.rider.collar : [RIDER_COLLAR.bone, RIDER_COLLAR.next, 0];
  const Cl = RIDER_COLLAR, cf = neckFrame(Cb[0], Cb[1], camP, Cb[2]), cP = _rv[3].copy(cf.p), cR = _rv[4].copy(cf.rt), cU = _rv[2].copy(cf.up);
  const collarPt = (th, out) => out.copy(cP).addScaledVector(cR, Math.cos(th) * Cl.rx * nk).addScaledVector(cU, (Cl.cy + Math.sin(th) * Cl.ry) * nk);
  for (let i = 0; i < collar.n; i++) collarPt(Math.PI + Cl.wrap - (Math.PI + 2 * Cl.wrap) * i / (collar.n - 1), collar.pts[i]);   // de izquierda a derecha por arriba
  fillTube(collar, Cl.r);
  for (const r of list) {
    const sx = r.A ? r.A.sx : r.sx;
    const pull = Math.max(0, s.turn * sx) + 0.6 * s.hover + 0.4 * Math.max(0, s.climb);
    r.pull += (pull - r.pull) * k;
    const C = r.ctrl, side = -sx;                            // la mano izquierda del jinete va al lado izquierdo del dragón (-X)
    fist(r, C[0]);
    RIDER_REIN_PATH.forEach(([bn, nx, up, sd], i) => {
      const P = D ? D.rider.path[i] : null, f = P ? neckFrame(P[0], P[1], camP, P[2]) : neckFrame(bn, nx, camP);
      C[i + 1].copy(f.p).addScaledVector(f.up, up * nk).addScaledVector(f.rt, sd * side * nk);
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
/* Tubo dinámico (riendas, collera): n anillos de 6 vértices a lo largo de pts. Va en la escena del jinete o en la que se pase. */
function riderTube(n, mat, sc) {
  const R = 6, g = new THREE.BufferGeometry(), ix = [];
  for (const k of ['position', 'normal']) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n * R * 3), 3).setUsage(THREE.DynamicDrawUsage));
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R; ix.push(a, a + R, b, b, a + R, b + R); }
  g.setIndex(ix);
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.visible = false; (sc || rider.scene).add(mesh);
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
function neckFrame(bn, next, camP, at) {
  const D = alt.D, b = D ? D.bone(bn) : hero.B[bn], n = D ? D.bone(next) : hero.B[next];   // (v16: huesos del dragón elegido)
  b.updateWorldMatrix(true, false); n.updateWorldMatrix(true, false);
  _nf.p.setFromMatrixPosition(b.matrixWorld); _nfN.setFromMatrixPosition(n.matrixWorld).sub(_nf.p);
  if (at) _nf.p.addScaledVector(_nfN, at);                 // (a esa fracción del tramo hacia el hueso siguiente)
  _nfN.normalize();                                        // a lo largo del cuello
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

