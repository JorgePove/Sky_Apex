
/* ============================================================
   5g. LOS DRAGONES (v16): Tyrant, dragón rojo y Drogon (v20: y Fulgor, el Syrax riggeado en Blender)
   En «Elige tu dragón» se escoge el modelo (botones arriba a la izquierda), cada uno con sus colores de piel y de aliento.
   · El Tyrant (hero) sigue siendo el esqueleto que lo mueve todo: sus clips y la capa por código (cuello hacia la mira, mandíbula, cola,
     alas recogidas en boost y picado) funcionan igual que siempre. Con otro dragón elegido, el Tyrant se oculta y en cada fotograma su
     pose se copia al modelo elegido, hueso a hueso (DRAGONS[id].map: hueso del modelo ← hueso del Tyrant; «*» = lado izquierdo/derecho).
   · Qué se copia: cuánto ha girado cada hueso (en el espacio del modelo) desde una pose de referencia común, con las alas abiertas:
     el Tyrant en planeo ↔ el otro en la pose guardada en sus nodos (ref: null), en la de enlace de su piel (ref: 'enlace') o en el
     fotograma más abierto de uno de sus clips (ref: 'nombre'), y enderezada como la del Tyrant (matchRefPose).
     Los huesos sin pareja (las patas delanteras del dragón rojo, la membrana del ala de Drogon…) se quedan en su pose de referencia
     respecto a su padre.
   · Al cargar se calcula solo: el giro y la escala que alinean el modelo con el Tyrant (mismo frente, mismas alas, envergadura span),
     la boca (la punta del morro), la altura del asiento (encima del lomo, sobre el hueso del Tyrant spine_02) y el grosor del cuello
     (riendas y collera, rider).
   · Licencias: el dragón rojo es «Red Dragon» de GadgetHamster (Sketchfab, CC-BY 4.0: hay que citarlo); Drogon viene del mismo pack que
     el Tyrant (uso solo en local). Preparados con herramientas/preparar_dragon_rojo.mjs y preparar_drogon.mjs.
   ============================================================ */
const DRAGON_IDS = ['tyrant', 'rojo', 'drogon', 'fulgor'];   // (v20: Fulgor)
const seqB = (fmt, n, from = 1) => Array.from({ length: n }, (_, i) => fmt.replace('#', i + from));
const chainB = (tgt, src) => tgt.map((t, i) => [t, src[tgt.length > 1 ? Math.round(i * (src.length - 1) / (tgt.length - 1)) : 0]]);
/* v17: nombres del juego. v24: sus stats ya no están aquí: salen del Excel (pestaña de cada dragón; ver 7c y heroStats). */
const DRAGONS = {
  tyrant: {
    name: 'Alientormenta', desc: 'Wyvern de las cumbres de ceniza que cabalga las tormentas: rápido y duro de abatir, aunque su fuego quema menos.'
  },
  rojo: {
    name: 'Abrasanubes', desc: 'Dragón de cuatro patas nacido en las forjas del sur: veloz y con un fuego que abrasa hasta las nubes, pero de piel frágil.',
    credit: 'Modelo «Red Dragon» de GadgetHamster (Sketchfab, CC-BY 4.0)',
    embed: 'rojo-glb', url: '../modelos/dragon_rojo.glb', sides: ['L', 'R'], span: 34, ref: null, seatBone: 'spine1',
    showClip: 'pie', idle: true,                             // plataforma: de pie a cuatro patas (pose «pie») y el reposo por código
    rider: { path: [['neck1', 'neck2', 0], ['neck2', 'neck3', 0]], collar: ['neck3', 'neck4', 0.3] },
    map: [
      ['pelvis', 'pelvis'], ['spine4', 'spine_01'], ['spine3', 'spine_02'], ['spine2', 'spine_03'], ['spine1', 'spine_04'], ['chest', 'spine_04'],
      ...chainB(['neck1', 'neck2', 'neck3', 'neck4', 'neck5', 'head'], ['Neck1', 'Neck2', 'Neck3', 'Neck4', 'head']), ['jaw', 'Jaw0'],
      ['upperWing*', 'upperarm_*'], ['lowerWing*', 'lowerarm_*'], ['wingHand*', 'hand_*'],
      ...chainB(seqB('wingPointer#*', 5), seqB('wingFirst#_*', 8)), ...chainB(seqB('wingMiddle#*', 7), seqB('wingMiddle#_*', 8)),
      ...chainB(seqB('wingRing#*', 8), seqB('wingRing#_*', 8)), ...chainB(seqB('wingPinky#*', 6), seqB('wingPinky#_*', 8)),
      ...chainB(seqB('wingThumb#*', 2), seqB('wingBigThumb#_*', 4)),
      ['Hip*', 'Rump_*'], ['thigh*', 'thigh_*'], ['lowerLeg*', 'calf_*'], ['ankle*', 'Knee1_*'], ['foot*', 'foot_*'],
      ...chainB(seqB('tail#', 14), seqB('Tail#', 10, 0))
    ]
  },
  drogon: {
    name: 'Ventoscuro', desc: 'Wyvern negro como la obsidiana: lento, pero una fortaleza con alas de aliento devastador.',
    embed: 'drogon-glb', url: '../modelos/drogon_web.glb', sides: ['L', 'R'], span: 34, ref: 'enlace', seatBone: 'Bip002-Spine3',
    showClip: 'reposo',                                     // plataforma: su propio reposo de combate
    rider: { path: [['Bip002-Neck', 'Bip002-Neck1', 0.35], ['Bip002-Neck', 'Bip002-Neck1', 0.75]], collar: ['Bip002-Neck1', 'Bip002-Neck2', 0.4] },
    map: [
      ['Bip002-Pelvis', 'pelvis'], ['Bip002-Spine', 'pelvis'], ['Bip002-Spine1', 'spine_02'], ['Bip002-Spine2', 'spine_03'], ['Bip002-Spine3', 'spine_04'], ['Bip002-Neck', 'spine_04'],
      ...chainB(['Bip002-Neck1', 'Bip002-Neck2', 'Bip002-Head'], ['Neck1', 'Neck2', 'Neck3', 'Neck4', 'head']), ['Bip002-Ponytail1', 'Jaw0'], ['Bone013', 'Jaw0'], ['Bone014', 'Jaw0'],   // (v17: su mandíbula es la «coleta» del Biped; 013 y 014, las comisuras)
      ['Bip002-*-Clavicle', 'clavicle_*'], ['Bip002-*-UpperArm', 'upperarm_*'], ['Bip002-*-Forearm', 'lowerarm_*'], ['Bip002-*-Hand', 'hand_*'],
      ...chainB(['Bip002-*-Finger0', 'Bip002-*-Finger01', 'Bip002-*-Finger02'], seqB('wingBigThumb#_*', 4)),
      ...[['wingFirst', 8], ['wingIndex', 7], ['wingMiddle', 8], ['wingRing', 8], ['wingPinky', 8]].flatMap(([f, n], k) =>
        chainB([`Bip002-*-Finger${k + 1}`, `Bip002-*-Finger${k + 1}1`, `Bip002-*-Finger${k + 1}2`], seqB(f + '#_*', n))),
      ['Bip002-*-Thigh', 'thigh_*'], ['Bip002-*-Calf', 'calf_*'], ['Bip002-*-Foot', 'foot_*'],
      ...chainB(['Bip002-Tail', ...seqB('Bip002-Tail#', 8)], seqB('Tail#', 10, 0))
    ]
  },
  /* v20: el cuarto dragón. Modelo «Syrax» (STL de impresión 3D) riggeado, texturizado y animado en Blender (herramientas/blender/syrax/):
     su pose de enlace ya es la de planeo (ref: 'enlace'). Dedos de las alas emparejados por su papel en el planeo del Tyrant:
     f4 (el largo, borde de ataque) ← wingIndex, f3 ← wingMiddle, f2 ← wingRing, f1 (el corto, junto al cuerpo) ← wingPinky,
     pulgar ← wingBigThumb (el wingFirst del Tyrant no tiene pareja). Patas de ave: el pie (metatarso) ← Knee1 y los dedos ← foot.
     En la plataforma flota con su propio hover (showClip) un poco por encima de ella (showLift, m). */
  fulgor: {
    name: 'Fulgor', desc: 'Wyvern dorado de alas inmensas que deslumbra al sol: lento, pero una fortaleza con un aliento devastador.',
    embed: 'fulgor-glb', url: '../modelos/syrax_web.glb', sides: ['L', 'R'], span: 34, ref: 'enlace', seatBone: 'spine1',
    fpAdj: [0, 0.5, -0.08, 1.0],                             // jinete 1 m tras el hueso spine1 (~1,9 m tras los hombros), sentado en el lomo; cámara 1 m más alta y algo más inclinada: el cuello y la cabeza por encima de las púas
    showClip: 'hover', showLift: 1.5, showTag: 'Vuelo estático',
    rider: { path: [['neck1', 'neck2', 0.25], ['neck2', 'neck3', 0.3]], collar: ['neck3', 'neck4', 0.1] },
    map: [
      ['pelvis', 'pelvis'], ['spine1', 'spine_02'], ['spine2', 'spine_03'],
      ...chainB(['neck1', 'neck2', 'neck3', 'neck4', 'neck5', 'neck6', 'head'], ['Neck1', 'Neck2', 'Neck3', 'Neck4', 'head']), ['jaw', 'Jaw0'],
      ['clavicle*', 'clavicle_*'], ['upperarm*', 'upperarm_*'], ['forearm*', 'lowerarm_*'], ['hand*', 'hand_*'],
      ...chainB(['thumb*'], seqB('wingBigThumb#_*', 4)),
      ...chainB(seqB('f4_0#*', 3), seqB('wingIndex#_*', 8)), ...chainB(seqB('f3_0#*', 3), seqB('wingMiddle#_*', 8)),
      ...chainB(seqB('f2_0#*', 3), seqB('wingRing#_*', 8)), ...chainB(seqB('f1_0#*', 2), seqB('wingPinky#_*', 8)),
      ['thigh*', 'thigh_*'], ['shin*', 'calf_*'], ['foot*', 'Knee1_*'], ['toes*', 'foot_*'],
      ...chainB(seqB('tail#', 16), seqB('Tail#', 10, 0))
    ]
  }
};
const alt = { id: 'tyrant', D: null, want: 'tyrant' };        // dragón visible (D = null: el Tyrant) y el que se quiere en cuanto cargue
const TY = { order: null, idx: null, ref: null, cur: null, pos: null };   // el Tyrant como referencia (pose de planeo)
const IDQ = new THREE.Quaternion(), _dq1 = new THREE.Quaternion(), _dv1 = new THREE.Vector3(), _dv2 = new THREE.Vector3(), _dm1 = new THREE.Matrix4();
const nameKey = n => n.replace(/_\d+$/, '');                  // «upperWingL_084» → «upperWingL» (los nombres del dragón rojo llevan un número)

/* Nodos de un modelo (sin mallas) de padres a hijos, con el índice de su padre (-1: cuelga de la raíz del modelo). */
function nodeOrder(model) {
  const list = [], idx = new Map();
  model.traverse(o => { if (o === model || o.isMesh) return; idx.set(o, list.length); list.push({ o, pi: idx.has(o.parent) ? idx.get(o.parent) : -1 }); });
  return list;
}
/* Giros en el espacio del modelo (producto de los locales, de la raíz hacia abajo) → out[i]. */
function modelQuats(order, out) { for (let i = 0; i < order.length; i++) { const e = order[i]; out[i].copy(e.pi < 0 ? IDQ : out[e.pi]).multiply(e.o.quaternion).normalize(); } return out; }   // (v18: normalizados, ver dragonRot)
/* Posición de un nodo en el espacio de su modelo. */
function modelPos(model, o, out) { o.getWorldPosition(out); return model.worldToLocal(out); }
/* Vértices con la piel ya aplicada (pose actual) en el espacio del modelo, y el hueso que más pesa en cada uno. Una muestra de hasta ~25 000. */
function skinnedPoints(model) {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(), pts = [], dom = [], p = new THREE.Vector3(), acc = new THREE.Vector3(), t = new THREE.Vector3();
  model.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const P = o.geometry.attributes.position, SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight, bones = o.skeleton.bones;
    const M = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, o.skeleton.boneInverses[i]));
    const toModel = new THREE.Matrix4().copy(inv).multiply(o.matrixWorld).multiply(o.bindMatrixInverse);   // (la piel deja el vértice en el espacio de la malla)
    const step = Math.max(1, Math.floor(P.count / 25000)), get = [a => a.getX.bind(a), a => a.getY.bind(a), a => a.getZ.bind(a), a => a.getW.bind(a)];
    const gi = get.map(f => f(SI)), gw = get.map(f => f(SW));
    for (let i = 0; i < P.count; i += step) {
      p.fromBufferAttribute(P, i).applyMatrix4(o.bindMatrix); acc.set(0, 0, 0);
      let sum = 0, best = -1, bj = 0;
      for (let k = 0; k < 4; k++) { const w = gw[k](i); if (w <= 0) continue; const j = gi[k](i); sum += w; acc.addScaledVector(t.copy(p).applyMatrix4(M[j]), w); if (w > best) { best = w; bj = j; } }
      if (!sum) continue;
      acc.multiplyScalar(1 / sum).applyMatrix4(toModel);
      pts.push(acc.x, acc.y, acc.z); dom.push(bones[bj]);
    }
  });
  return { pts, dom };
}
/* Ejes del cuerpo con las alas abiertas: f (pelvis → base del cuello), u (arriba) y s (de un ala a la otra); sign = -1 si «izquierda»
   queda al otro lado (nombres al revés que en el Tyrant). */
function bodyAxes(pelvis, neck, wl, wr) {
  const f = new THREE.Vector3().subVectors(neck, pelvis).normalize(), s = new THREE.Vector3().subVectors(wl, wr);
  const u = new THREE.Vector3().crossVectors(f, s), sign = u.y >= 0 ? 1 : -1;
  u.multiplyScalar(sign).normalize(); s.crossVectors(u, f).normalize();
  return { f, u, s, sign, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, u, f)) };
}
/* Medidas sobre los vértices: altura del lomo sobre el asiento (m) y radio del cuello alrededor de un tramo (m). */
function backTop(P, seat, ax, mpu) {
  let top = -Infinity;
  for (let i = 0; i < P.pts.length; i += 3) {
    _dv1.set(P.pts[i], P.pts[i + 1], P.pts[i + 2]).sub(seat);
    if (Math.abs(_dv1.dot(ax.s)) * mpu < 0.5 && Math.abs(_dv1.dot(ax.f)) * mpu < 1.2) top = Math.max(top, _dv1.dot(ax.u) * mpu);
  }
  return isFinite(top) ? top : 1;
}
function neckRadius(P, bones, a, b, mpu) {
  const d = _dv2.subVectors(b, a).normalize(), r = [];
  for (let i = 0; i < P.dom.length; i++) {
    if (!bones.has(P.dom[i])) continue;
    _dv1.set(P.pts[i * 3], P.pts[i * 3 + 1], P.pts[i * 3 + 2]).sub(a);
    r.push(_dv1.addScaledVector(d, -_dv1.dot(d)).length() * mpu);
  }
  r.sort((x, y) => x - y); return r.length ? r[Math.floor(r.length / 2)] : 1;
}

/* Pone los huesos con piel en su pose de enlace: la de la malla sin deformar (inversa de su matriz de enlace). Es mejor punto de partida
   que la pose guardada en los nodos cuando esta trae huesos girados sobre sí mismos (Drogon: el FBX guarda un fotograma de animación y,
   al enderezarlo, esos giros retorcían el cuello y las patas). Los nodos sin piel conservan su pose. */
function bindPose(D, model) {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(), bindW = new Map();
  model.traverse(m => {
    if (!m.isSkinnedMesh) return;
    const base = new THREE.Matrix4().copy(inv).multiply(m.matrixWorld).multiply(new THREE.Matrix4().copy(m.bindMatrix).invert());
    m.skeleton.bones.forEach((b, i) => { if (!bindW.has(b)) bindW.set(b, new THREE.Matrix4().copy(base).multiply(new THREE.Matrix4().copy(m.skeleton.boneInverses[i]).invert())); });
  });
  const pm = new THREE.Matrix4();
  for (const e of D.order) {
    const W = bindW.get(e.o);
    if (W) { pm.copy(inv).multiply(e.o.parent.matrixWorld).invert().multiply(W).decompose(e.o.position, e.o.quaternion, e.o.scale); }
    e.o.updateWorldMatrix(false, false);
  }
  model.updateMatrixWorld(true);
}
/* La pose de referencia del modelo se endereza para que sea la misma postura que la del Tyrant en planeo: cada hueso emparejado se gira
   (lo mínimo) para apuntar hacia sus hijos emparejados igual que su pareja del Tyrant (pasada al espacio del modelo con Hi). Sin esto,
   copiar «cuánto gira cada hueso desde la referencia» solo funciona si las dos referencias ya se parecen (con Drogon no: en su pose de
   enlace tiene las alas levantadas hacia atrás). tmap: índice del nodo del modelo → índice de su pareja en el Tyrant.
   v17: no basta con apuntar cada hueso a sus hijos: también hay que fijar su giro sobre su propio eje (si no, el cuello salía retorcido,
   la membrana del ala se abría hacia fuera y las patas quedaban mal). Cada hueso se gira para que todo lo que cuelga de él (hijos, nietos…
   emparejados) quede como en el Tyrant: el giro que mejor encaja esas direcciones (bestRotation), con más peso para los más cercanos. */
function matchRefPose(D, model, tmap, Hi) {
  const O = D.order, desc = new Map(), TO = TY.order;
  // descendientes emparejados de cada hueso emparejado, con su distancia en la jerarquía (1 = hijo)
  for (const [i] of tmap) for (let a = O[i].pi, d = 1; a >= 0; a = O[a].pi) { if (!tmap.has(a)) continue; if (!desc.has(a)) desc.set(a, []); desc.get(a).push([i, d++]); }
  const under = (sc, st) => { for (let k = TO[sc].pi; k >= 0; k = TO[k].pi) if (k === st) return true; return false; };
  const W = O.map(() => new THREE.Quaternion()), p0 = new THREE.Vector3(), R = new THREE.Quaternion();
  for (let i = 0; i < O.length; i++) {                     // de padres a hijos
    if (!tmap.has(i) || !desc.has(i)) continue;
    // (v18: sin las mandíbulas: cada modelo tiene la bisagra en otro sitio y, con ella, la cabeza del dragón rojo quedaba mirando arriba)
    const st = tmap.get(i), ds = desc.get(i).filter(([c]) => tmap.get(c) !== st && under(tmap.get(c), st) && !/^(Jaw|Lip)/.test(TO[tmap.get(c)].o.name));
    if (!ds.length) continue;
    model.updateMatrixWorld(true);
    modelPos(model, O[i].o, p0);
    const A = [], B = [], w = [];
    for (const [c, d] of ds) {
      const a = modelPos(model, O[c].o, new THREE.Vector3()).sub(p0), b = new THREE.Vector3().copy(TY.pos[tmap.get(c)]).sub(TY.pos[st]).applyQuaternion(Hi);
      if (a.lengthSq() < 1e-12 || b.lengthSq() < 1e-12) continue;
      A.push(a.normalize()); B.push(b.normalize()); w.push(1 / (d * d));
    }
    if (!A.length) continue;
    bestRotation(A, B, w, R);
    modelQuats(O, W);
    const Wp = O[i].pi < 0 ? IDQ : W[O[i].pi];              // giro en el espacio del modelo → local: q' = Wp⁻¹ · R · Wp · q
    O[i].o.quaternion.premultiply(_dq1.copy(Wp).invert().multiply(R).multiply(Wp));
  }
  model.updateMatrixWorld(true);
}
/* El giro R que mejor lleva las direcciones A[k] a B[k] (pesos w): método de Horn con cuaterniones (el vector propio de mayor valor
   propio de una matriz 4×4, por iteración de potencias). Con una sola dirección, el giro mínimo. */
function bestRotation(A, B, w, out) {
  if (A.length === 1) return out.setFromUnitVectors(A[0], B[0]);
  let xx = 0, xy = 0, xz = 0, yx = 0, yy = 0, yz = 0, zx = 0, zy = 0, zz = 0, sw = 0;
  for (let k = 0; k < A.length; k++) {
    const a = A[k], b = B[k], q = w[k]; sw += q;
    xx += q * a.x * b.x; xy += q * a.x * b.y; xz += q * a.x * b.z; yx += q * a.y * b.x; yy += q * a.y * b.y; yz += q * a.y * b.z; zx += q * a.z * b.x; zy += q * a.z * b.y; zz += q * a.z * b.z;
  }
  const N = [[xx + yy + zz, yz - zy, zx - xz, xy - yx], [yz - zy, xx - yy - zz, xy + yx, zx + xz], [zx - xz, xy + yx, -xx + yy - zz, yz + zy], [xy - yx, zx + xz, yz + zy, -xx - yy + zz]];
  let v = [1, 0.01, 0.02, 0.03];
  for (let it = 0; it < 200; it++) {                       // (N + sw·I) es semidefinida positiva: la potencia converge al mayor
    const n = [0, 1, 2, 3].map(r => N[r][0] * v[0] + N[r][1] * v[1] + N[r][2] * v[2] + N[r][3] * v[3] + sw * v[r]);
    const l = Math.hypot(...n) || 1; v = n.map(x => x / l);
  }
  return out.set(v[1], v[2], v[3], v[0]).normalize();      // (w, x, y, z) → THREE (x, y, z, w)
}

/* ---------- El Tyrant como referencia: pose de planeo, ejes, envergadura, lomo y cuello (una vez) ---------- */
function tyrantRef() {
  if (TY.order) return;
  const m = hero.model, A = hero.act, saved = [];
  TY.order = nodeOrder(m); TY.idx = new Map(TY.order.map((e, i) => [e.o.name, i]));
  TY.order.forEach(e => saved.push(e.o.quaternion.clone(), e.o.position.clone()));
  const w = Object.fromEntries(Object.entries(A).map(([k, a]) => [k, a.getEffectiveWeight()]));
  for (const k in A) A[k].setEffectiveWeight(k === 'glide' ? 1 : 0);
  hero.mixer.update(0);
  for (const [b, q] of hero.rest) if (!hero.animated.has(b.name)) b.quaternion.copy(q);   // sin la capa por código (cuello, mandíbula, cola)
  TY.ref = modelQuats(TY.order, TY.order.map(() => new THREE.Quaternion()));
  TY.cur = TY.order.map(() => new THREE.Quaternion());
  m.updateMatrixWorld(true);
  const p = n => modelPos(m, hero.B[n], new THREE.Vector3());
  TY.pos = TY.order.map(e => modelPos(m, e.o, new THREE.Vector3()));
  TY.ax = bodyAxes(p('pelvis'), p('Neck1'), p('upperarm_l'), p('upperarm_r'));
  TY.wingMid = p('upperarm_l').add(p('upperarm_r')).multiplyScalar(0.5);
  const mpu = hero.wrap.scale.x, P = skinnedPoints(m);
  TY.back = backTop(P, p('spine_02'), TY.ax, mpu);
  TY.neckR = neckRadius(P, new Set(['Neck2', 'Neck2Part1', 'Neck2Part2'].map(n => hero.B[n]).filter(Boolean)), p('Neck2Part2'), p('Neck3'), mpu);
  // y todo como estaba
  TY.order.forEach((e, i) => { e.o.quaternion.copy(saved[i * 2]); e.o.position.copy(saved[i * 2 + 1]); });
  for (const k in A) A[k].setEffectiveWeight(w[k]);
  hero.mixer.update(0);
}

/* ---------- Cargar y preparar un dragón ---------- */
function loadDragons() {
  if (!hero.ready) return;
  for (const id of DRAGON_IDS) {
    const D = DRAGONS[id]; if (!D.url) continue;
    loadGLB(D.embed, D.url).then(g => setupDragon(D, id, g))
      .catch(err => { D.error = err; console.error('No se pudo cargar ' + D.name + ':', err); refreshDragonButtons(); });
  }
}
function setupDragon(D, id, gltf) {
  tyrantRef();
  const model = gltf.scene;
  D.model = model; D.holder = new THREE.Group(); D.holder.name = 'dragon-' + id; D.holder.add(model); D.holder.visible = false; hero.wrap.add(D.holder);
  D.U = { uTint: { value: new THREE.Color(1, 1, 1) }, uTintMix: { value: 0 }, uAvgLum: { value: 0.3 }, uHit: { value: 0 } };
  D.meshes = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; D.meshes.push(o);
    const m = o.material;
    for (const k of ['map', 'emissiveMap']) if (m[k]) m[k].encoding = THREE.LinearEncoding;
    m.side = THREE.DoubleSide; if (m.map) tintSkinMaterial(m, D.U); m.needsUpdate = true;
  });
  // pose de referencia: la de enlace o el fotograma más abierto (de punta a punta de las alas) de uno de sus clips
  D.order = nodeOrder(model);
  D.order.forEach(e => { e.orig = [e.o.position.clone(), e.o.quaternion.clone(), e.o.scale.clone()]; });   // (v17: la pose guardada, de la que parten sus clips propios)
  const byName = new Map(D.order.map((e, i) => [nameKey(e.o.name), i]));
  const mapped = D.map.flatMap(([t]) => t.includes('*') ? [t.replace('*', D.sides[0]), t.replace('*', D.sides[1])] : [t]).filter(t => byName.has(t)).map(t => D.order[byName.get(t)].o);
  if (D.ref === 'enlace') bindPose(D, model);
  else if (D.ref) {
    const clip = gltf.animations.find(c => c.name === D.ref), mx = new THREE.AnimationMixer(model), a = mx.clipAction(clip); a.play();
    let best = -1, bt = 0;
    for (let k = 0; k < 48; k++) {
      a.time = clip.duration * k / 48; mx.update(0); model.updateMatrixWorld(true);
      let lo = Infinity, hi = -Infinity; for (const o of mapped) { const x = modelPos(model, o, _dv1).x; lo = Math.min(lo, x); hi = Math.max(hi, x); }
      if (hi - lo > best) { best = hi - lo; bt = a.time; }
    }
    a.time = bt; mx.update(0);
    const pose = D.order.map(e => [e.o.quaternion.clone(), e.o.position.clone()]);
    mx.stopAllAction(); mx.uncacheRoot(model);
    D.order.forEach((e, i) => { e.o.quaternion.copy(pose[i][0]); e.o.position.copy(pose[i][1]); });
  }
  model.updateMatrixWorld(true);
  // parejas de huesos (y lados: si el modelo llama «izquierda» al otro lado, se cruzan)
  const expand = sides => {
    const out = [];
    for (const [t, s] of D.map) {
      if (t.includes('*') || s.includes('*')) { out.push([t.replace('*', sides[0]), s.replace('*', 'l')], [t.replace('*', sides[1]), s.replace('*', 'r')]); }
      else out.push([t, s]);
    }
    return out.filter(([t, s]) => byName.has(t) && TY.idx.has(s));
  };
  const posOf = (pairs, src) => { const pr = pairs.find(x => x[1] === src); return pr ? modelPos(model, D.order[byName.get(pr[0])].o, new THREE.Vector3()) : null; };
  let pairs = expand(D.sides);
  let ax = bodyAxes(posOf(pairs, 'pelvis'), posOf(pairs, 'Neck1'), posOf(pairs, 'upperarm_l'), posOf(pairs, 'upperarm_r'));
  if (ax.sign !== TY.ax.sign) { pairs = expand([D.sides[1], D.sides[0]]); ax = bodyAxes(posOf(pairs, 'pelvis'), posOf(pairs, 'Neck1'), posOf(pairs, 'upperarm_l'), posOf(pairs, 'upperarm_r')); }
  D.pairs = pairs.length;
  // v17: los ejes en la pose guardada (de la que parten sus clips propios). Con un rig Biped de 3ds Max la pose de enlace es la «figura»
  // de pie, con el cuerpo vertical: la alineación del vuelo gira el modelo ~100° y sus clips (hechos en horizontal) saldrían en vertical
  const refNow = D.order.map(e => [e.o.position.clone(), e.o.quaternion.clone(), e.o.scale.clone()]);
  D.order.forEach(e => { e.o.position.copy(e.orig[0]); e.o.quaternion.copy(e.orig[1]); e.o.scale.copy(e.orig[2]); }); model.updateMatrixWorld(true);
  const ax0 = bodyAxes(posOf(pairs, 'pelvis'), posOf(pairs, 'Neck1'), posOf(pairs, 'upperarm_l'), posOf(pairs, 'upperarm_r'));
  const wingMid0 = posOf(pairs, 'upperarm_l').add(posOf(pairs, 'upperarm_r')).multiplyScalar(0.5);
  D.order.forEach((e, i) => { e.o.position.copy(refNow[i][0]); e.o.quaternion.copy(refNow[i][1]); e.o.scale.copy(refNow[i][2]); }); model.updateMatrixWorld(true);
  D.H0 = new THREE.Quaternion().copy(TY.ax.q).multiply(new THREE.Quaternion().copy(ax0.q).invert()); D.ax0 = ax0;
  // alineación con el Tyrant (H: del espacio del modelo al del Tyrant; mismo frente y mismas alas) y la referencia, enderezada como el
  // Tyrant en planeo con esa misma H. Los ejes del modelo pasan a ser los del Tyrant vistos con H⁻¹ (no se recalculan: con la columna
  // enderezada saldrían algo distintos y el aleteo se torcería distinto en cada ala)
  D.H = new THREE.Quaternion().copy(TY.ax.q).multiply(_dq1.copy(ax.q).invert()); D.Hi = D.H.clone().invert();
  const tmap = new Map(pairs.map(([t, s]) => [byName.get(t), TY.idx.get(s)]));
  matchRefPose(D, model, tmap, D.Hi);
  ax = { f: TY.ax.f.clone().applyQuaternion(D.Hi), u: TY.ax.u.clone().applyQuaternion(D.Hi), s: TY.ax.s.clone().applyQuaternion(D.Hi), sign: TY.ax.sign };
  D.order.forEach(e => { e.refLocal = e.o.quaternion.clone(); e.refPos = e.o.position.clone(); e.refScale = e.o.scale.clone(); });
  const refQ = modelQuats(D.order, D.order.map(() => new THREE.Quaternion()));
  D.cur = D.order.map(() => new THREE.Quaternion());
  D.fromTy = new Map();
  for (const [t, s] of pairs) {
    const i = byName.get(t), e = D.order[i], si = TY.idx.get(s);
    e.src = si; e.srcRefInv = TY.ref[si].clone().invert(); e.ref = refQ[i];
    if (!D.fromTy.has(s)) D.fromTy.set(s, e.o);
  }
  D.order.forEach(e => { if (e.src == null) e.src = -1; });
  // escala k (unidades del Tyrant por unidad del modelo) y raíz de las alas en el mismo sitio. Envergadura: de punta a punta, solo con los huesos emparejados (en los dos modelos)
  let lo = Infinity, hi = -Infinity, tlo = Infinity, thi = -Infinity;
  for (const [t, s] of pairs) {
    const x = modelPos(model, D.order[byName.get(t)].o, _dv1).dot(ax.s); lo = Math.min(lo, x); hi = Math.max(hi, x);
    const y = TY.pos[TY.idx.get(s)].dot(TY.ax.s); tlo = Math.min(tlo, y); thi = Math.max(thi, y);
  }
  const k = (D.span / HERO_SPAN) * (thi - tlo) / (hi - lo);
  const wingMid = posOf(pairs, 'upperarm_l').add(posOf(pairs, 'upperarm_r')).multiplyScalar(0.5);
  D.holder.quaternion.copy(D.H); D.holder.scale.setScalar(k);
  D.holder.position.copy(TY.wingMid).add(hero.model.position).sub(wingMid.multiplyScalar(k).applyQuaternion(D.H));
  D.posFly = D.holder.position.clone();                     // (v17: y para sus clips propios, la alineación de la pose guardada)
  D.pos0 = TY.wingMid.clone().add(hero.model.position).sub(wingMid0.multiplyScalar(k).applyQuaternion(D.H0));
  hero.wrap.updateMatrixWorld(true);
  const mpu = k * hero.wrap.scale.x;                         // metros por unidad del modelo
  // medidas en la pose de referencia: boca, asiento y cuello
  const P = skinnedPoints(model), B = n => D.order[byName.get(n)].o, tp = s => D.fromTy.get(s);
  D.bone = n => B(n);
  D.seat = D.seatBone ? B(D.seatBone) : tp('spine_02');
  const head = tp('head'), heads = new Set(); head.traverse(o => heads.add(o));
  const hp = modelPos(model, head, new THREE.Vector3());
  let tip = null, far = -Infinity;
  for (let i = 0; i < P.dom.length; i++) {
    if (!heads.has(P.dom[i])) continue;
    _dv1.set(P.pts[i * 3], P.pts[i * 3 + 1], P.pts[i * 3 + 2]);
    const d = _dv2.copy(_dv1).sub(hp).dot(ax.f); if (d > far) { far = d; tip = _dv1.clone(); }
  }
  tip.addScaledVector(ax.f, 0.15 / mpu).addScaledVector(ax.u, -0.22 / mpu);    // delante de la boca, un poco por debajo de la punta del morro
  D.mouth = new THREE.Object3D(); D.mouth.name = 'BocaSocket';
  D.mouth.position.copy(head.worldToLocal(model.localToWorld(tip))); head.add(D.mouth);
  D.P = P; D.ax = ax; D.mpu = mpu;
  dragonSeat(D, model);
  const cb = B(D.rider.collar[0]), cn = B(D.rider.collar[1]);
  D.neckR = neckRadius(P, new Set([cb]), modelPos(model, cb, new THREE.Vector3()), modelPos(model, cn, new THREE.Vector3()), mpu);
  D.neckK = clamp(D.neckR / TY.neckR, 0.6, 1.8);
  // v17: sus propios clips (solo para «Elige tu dragón»: en vuelo manda el Tyrant) y las mandíbulas (las parejas de Jaw0)
  D.mixer = new THREE.AnimationMixer(model); D.clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
  D.jaws = D.order.filter(e => e.src === TY.idx.get('Jaw0'));
  // bisagra de cada mandíbula: el eje lateral del cuerpo visto desde su padre (la cabeza) en la pose de referencia, y el sentido que la abre
  // hacia abajo (se prueba: el punto más lejano de la mandíbula, su nodo final, debe bajar)
  for (const e of D.jaws) {
    const Wp = e.pi < 0 ? IDQ : refQ[e.pi]; e.hinge = ax.s.clone().applyQuaternion(Wp.clone().invert()); e.hingeSign = 1;
    let tip = e.o, far = 0; e.o.traverse(o => { const d = o.getWorldPosition(_dv1).distanceTo(e.o.getWorldPosition(_dv2)); if (d > far) { far = d; tip = o; } });
    const q = e.o.quaternion.clone(), y0 = modelPos(model, tip, new THREE.Vector3()).dot(ax.u);
    e.o.quaternion.premultiply(_dq1.copy(Wp).invert().multiply(_dq2.setFromAxisAngle(e.hinge.clone().applyQuaternion(Wp), 0.3)).multiply(Wp)); model.updateMatrixWorld(true);
    if (modelPos(model, tip, new THREE.Vector3()).dot(ax.u) > y0) e.hingeSign = -1;
    e.o.quaternion.copy(q); model.updateMatrixWorld(true);
  }
  D.ready = true;
  console.log(`Dragón «${D.name}»: ${D.pairs} huesos emparejados de ${D.order.length}, escala ${k.toFixed(3)}, lomo ${D.back.toFixed(2)} m (Tyrant ${TY.back.toFixed(2)}), cuello ${D.neckR.toFixed(2)} m (Tyrant ${TY.neckR.toFixed(2)})`);
  applyDragonColors(id);
  refreshDragonButtons();
  if (alt.want === id && (state === 'menu' || state === 'select' || state === 'loading')) chooseDragon(id);   // el que estaba elegido (con sus colores)
}

/* Asiento del jinete y 1ª persona: D.fp = [altura de los ojos sobre el hueso del asiento, retroceso (positivo = atrás), cabeceo,
   elevación solo de la cámara]. La altura sale del lomo medido en los vértices (backTop), con el jinete del Tyrant como referencia.
   v20: ajuste por dragón (fpAdj: altura, retroceso, cabeceo y elevación de la cámara). Con fpAdj, el lomo se mide donde va sentado el
   jinete (el hueso del asiento más el retroceso), no en el hueso: con Fulgor, 2 m por detrás de la pelvis, la grupa ya bajaba hacia la
   cola y el caballero quedaba flotando. La elevación (4º valor) sube solo la cámara (los ojos), no al caballero, que sigue sentado. */
function dragonSeat(D, model) {
  const fa = D.fpAdj || [0, 0, 0, 0], retro = HERO_FP[1] + fa[1];
  D.seat = D.seatBone ? D.bone(D.seatBone) : D.fromTy.get('spine_02');
  const sp = modelPos(model || D.model, D.seat, new THREE.Vector3());
  if (D.fpAdj) sp.addScaledVector(D.ax.f, -retro / D.mpu);
  D.back = backTop(D.P, sp, D.ax, D.mpu);
  D.fp = [HERO_FP[0] - TY.back + D.back + fa[0], retro, HERO_FP[2] + fa[2], fa[3] || 0];
  if (alt.D === D) { heroFP = D.fp; dragonAnim.fp = null; }
}

/* ---------- Por fotograma: la pose del Tyrant → el dragón visible ---------- */
function dragonPose() {
  const D = alt.D; if (!D) return;
  const C = modelQuats(TY.order, TY.cur), O = D.order, W = D.cur;
  for (let i = 0; i < O.length; i++) {
    const e = O[i], par = e.pi < 0 ? IDQ : W[e.pi];
    if (e.src >= 0) {                                       // W = H⁻¹ · (giro del Tyrant desde su referencia) · H · referencia del modelo
      W[i].copy(D.Hi).multiply(C[e.src]).multiply(e.srcRefInv).multiply(D.H).multiply(e.ref).normalize();
      e.o.quaternion.copy(_dq1.copy(par).invert()).multiply(W[i]).normalize();
    } else { e.o.quaternion.copy(e.refLocal); W[i].copy(par).multiply(e.refLocal).normalize(); }   // (v18: normalizados, ver dragonRot)
  }
}

/* ---------- «Elige tu dragón»: sus propios clips y una capa por código ----------
   Las poses de suelo no se pueden copiar del Tyrant (con otras proporciones, las alas no llegan al suelo o las patas quedan en el aire):
   en la plataforma cada uno usa lo suyo (DRAGONS[id].showClip) y encima, si lo tiene, un movimiento por código (idle) y la mandíbula. */
/* Todo a la pose de referencia (al salir de la plataforma o cambiar de dragón): sin clips propios, dragonPose vuelve a mandar. */
function restoreDragonRef(D) {
  if (!D.mixer) return;
  D.mixer.stopAllAction();
  for (const e of D.order) { e.o.quaternion.copy(e.refLocal); e.o.position.copy(e.refPos); e.o.scale.copy(e.refScale); e.base = null; }
  D.holder.quaternion.copy(D.H); D.holder.position.copy(D.posFly);
}
/* Sus clips propios: desde la pose guardada en el modelo, que es de la que parten (la de referencia puede estar muy lejos: la pose de
   enlace de Drogon pone la pelvis a metros de la raíz del Biped, y al girarla el clip el cuerpo salía disparado). */
function playDragonClip(D, name) {
  D.mixer.stopAllAction();
  for (const e of D.order) { e.o.position.copy(e.orig[0]); e.o.quaternion.copy(e.orig[1]); e.o.scale.copy(e.orig[2]); e.base = null; }
  D.holder.quaternion.copy(D.H0); D.holder.position.copy(D.pos0);
  const a = D.mixer.clipAction(D.clips[name]); a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.play(); D.mixer.update(0);
}
/* Gira el hueso e (entrada de D.order) ang rad alrededor de axis, un eje del espacio del modelo.
   v18: todo normalizado. invert() es el conjugado, que solo es el inverso con cuaterniones unitarios: con un error de redondeo mínimo cerca
   de la raíz, cada hueso de una cadena larga multiplicaba el del anterior (en la cola de 14 huesos del dragón rojo, un giro de 1,5° en la
   punta llegaba a 64°). */
function dragonRot(D, e, axis, ang) {
  if (!e || Math.abs(ang) < 1e-6) return;
  modelQuats(D.order, D.cur);
  const Wp = _dq3.copy(e.pi < 0 ? IDQ : D.cur[e.pi]).normalize();
  e.o.quaternion.premultiply(_dq1.copy(Wp).invert().multiply(_dq2.setFromAxisAngle(axis, ang)).multiply(Wp)).normalize();
}
const _dq2 = new THREE.Quaternion(), _dq3 = new THREE.Quaternion();
/* Capa por código de la plataforma, en cada fotograma tras el clip propio: reposo por código (si lo tiene, idle) y mandíbula abierta jaw
   rad (llamarada de prueba).
   v18: three.js solo vuelve a escribir un valor de animación si ha cambiado (PropertyMixer): con un clip fijo (la pose «pie») el clip no
   reponía nada y los giros de esta capa se acumulaban fotograma a fotograma (en un minuto, un ala giraba 170° y el dragón se desmadejaba).
   Por eso cada hueso que toca guarda su valor sin la capa (e.base) y se repone antes de cada mixer.update (dragonShowBase). */
function dragonShowList(D) {
  if (D.touched) return D.touched;
  const E = n => D.order.find(e => nameKey(e.o.name) === n);
  if (D.idle) D.idleB = { chest: E('chest'), neck: ['neck2', 'neck3', 'neck4', 'neck5', 'head'].map(E), wing: [['L', 1], ['R', -1]].map(([s, k]) => [E('upperWing' + s), E('lowerWing' + s), k]), tail: seqB('tail#', 14).map(E) };
  const idle = D.idleB ? [D.idleB.chest, ...D.idleB.neck, ...D.idleB.wing.flatMap(w => w.slice(0, 2)), ...D.idleB.tail] : [];
  return (D.touched = [...new Set([...idle, ...D.jaws].filter(Boolean))]);
}
function dragonShowBase(D) { for (const e of dragonShowList(D)) if (e.base) e.o.quaternion.copy(e.base); }
function dragonShowLayer(D, t, jaw) {
  for (const e of dragonShowList(D)) (e.base || (e.base = new THREE.Quaternion())).copy(e.o.quaternion);   // el valor del clip, sin la capa
  if (D.idle) dragonIdle(D, t);
  if (jaw > 1e-4) {                                        // la bisagra sigue a la cabeza: su eje, del espacio del padre al del modelo
    modelQuats(D.order, D.cur);
    for (const e of D.jaws) dragonRot(D, e, _dv1.copy(e.hinge).applyQuaternion(e.pi < 0 ? IDQ : D.cur[e.pi]).normalize(), jaw * e.hingeSign);
  }
}
/* Movimiento de reposo por código del dragón rojo (su pose de pie es fija): respira, agita un poco las alas, mira alrededor y mece la cola. */
function dragonIdle(D, t) {
  const ax = D.ax0, I = D.idleB, look = Math.sin(t * 0.37) * 0.55 + Math.sin(t * 0.91) * 0.12, nod = Math.sin(t * 0.53 + 1) * 0.12;
  dragonRot(D, I.chest, ax.s, Math.sin(t * 1.5) * 0.025);                         // respiración
  I.neck.forEach((e, i) => { dragonRot(D, e, ax.u, look * 0.2); dragonRot(D, e, ax.s, nod * 0.2 * (i < 3 ? 1 : -0.5)); });
  for (const [up, lo, k] of I.wing) {                                              // aleteo suave, casi un estremecimiento
    const f = Math.sin(t * 2.1) * 0.06 + Math.max(0, Math.sin(t * 0.45)) ** 6 * 0.25;
    dragonRot(D, up, ax.f, -k * f); dragonRot(D, lo, ax.f, -k * f * 0.6);
  }
  I.tail.forEach((e, i) => dragonRot(D, e, ax.u, Math.sin(t * 0.8 - i * 0.35) * 0.035));
}

/* ---------- Cambiar de dragón ---------- */
function setDragon(id) {
  const D = DRAGONS[id];
  if (!D || (id !== 'tyrant' && !D.ready)) return false;
  if (alt.D && alt.D !== D) restoreDragonRef(alt.D);        // (el anterior, sin su clip de la plataforma)
  alt.id = id; alt.want = id; alt.D = id === 'tyrant' ? null : D;
  hero.model.traverse(o => { if (o.isMesh) o.visible = !alt.D; });
  for (const k of DRAGON_IDS) if (DRAGONS[k].holder) DRAGONS[k].holder.visible = DRAGONS[k] === alt.D;
  heroFP = alt.D ? alt.D.fp : HERO_FP;
  dragonAnim.fp = null;                                     // el asiento cambia: sin suavizado desde el anterior
  dragonPose();
  applyHeroStats();                                         // v24: sus stats (vuelo, armas, vida…)
  return true;
}
/* v24: stats del dragón elegido, del Excel (STATS, ver 7c): vida, armadura, armas, velocidades… con las claves de STATS_SCHEMA.dragon. */
function heroStats() { return STATS[alt.id] || STATS.base; }
/* Boca, asiento y huesos del cuello del dragón visible (para el fuego, la cámara y las riendas). */
function seatBone() { return alt.D ? alt.D.seat : hero.B[HERO_FP_BONE]; }
function dragonHead() { return alt.D ? alt.D.fromTy.get('head') : hero.B.head; }
