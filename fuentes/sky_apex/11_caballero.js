/* ============================================================
   5f. CABALLERO COMPLETO: sentado en el lomo (3ª persona) y de pie en «Elige tu dragón»
   Modelo: «Knighty» entero, riggeado con herramientas/preparar_caballero.mjs (modelos/caballero.glb): 17 huesos (pelvis, columna, pecho,
   cuello, cabeza; brazo, antebrazo y mano; muslo, pierna y pie) en la pose A del modelo y sin giro en reposo. Mide 1,9 m.
   · Poses por direcciones: para cada tramo (brazo, antebrazo, muslo, pierna), la dirección que toma en ejes del caballero (mira hacia +Z,
     su izquierda es +X); la derecha es el espejo. KNIGHT_SEAT: sentado con las riendas; KNIGHT_STAND: de pie, con los brazos abajo.
   · En partida cuelga del grupo del dragón con los ojos donde va la cámara de 1ª persona: la 1ª y la 3ª persona coinciden.
     Se ve en cuanto la cámara se aleja un poco (KNIGHT_SHOW_CAM); a la vez se ocultan los brazos de la 1ª persona.
     Las riendas y la collera de la 3ª persona salen de sus manos (rider.reins3, layReins).
   ============================================================ */
const KNIGHT_URL = '../modelos/caballero.glb';              // solo si el HTML no lo lleva incrustado
const KNIGHT_SHOW_CAM = 0.12;                                // con esta mezcla de cámara (0 = 1ª persona, 1 = 3ª) ya se ve el caballero entero
const KNIGHT_SEAT = { lean: 0.15, upper: [0.3, -0.8, 0.5], fore: [-0.25, -0.3, 1], thigh: [0.8, -0.25, 0.6], shin: [0.4, -1, 0.05] };   // a horcajadas: muslos abiertos sobre el lomo, piernas por los costados
const KNIGHT_STAND = { lean: 0, upper: [0.22, -1, 0.02], fore: [0.12, -1, 0.15], thigh: [0, -1, 0], shin: [0, -1, 0] };
const KNIGHT_SHOW = [5, 4.5, -0.5];                          // «Elige tu dragón»: posición en la plataforma (x, z en m) y hacia dónde mira (rad)
const knight = { ready: false, root: null, B: {}, holder: new THREE.Group(), eyes: new THREE.Vector3(), eye: null };
function loadKnight() {
  return loadGLB('caballero-glb', KNIGHT_URL).then(setupKnight).catch(err => console.error('No se pudo cargar el caballero:', err));
}
function setupKnight(gltf) {
  const root = knight.root = gltf.scene; let eyes = null;
  root.traverse(o => {
    if (o.isBone) knight.B[o.name] = o;
    if (o.isMesh) { o.frustumCulled = false; riderMaterial(o.material); }
    if (o.userData && o.userData.ojos) eyes = o.userData.ojos;
  });
  // punto de los ojos colgado de la cabeza (sigue a la pose)
  root.updateMatrixWorld(true);
  knight.eye = new THREE.Object3D(); knight.eye.position.copy(knight.B.cabeza.worldToLocal(new THREE.Vector3().fromArray(eyes || [0, 1.78, 0.16])));
  knight.B.cabeza.add(knight.eye);
  knight.holder.add(root);
  knight.ready = true;
  if (state === 'select') knightToShow(); else knightToGame();
}
const _kq = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()], _kv = [new THREE.Vector3(), new THREE.Vector3()];
/* Gira el hueso b para que el tramo b → hijo apunte a `want` (ejes del caballero); parentQ = giro acumulado del padre. Devuelve el giro acumulado de b. */
function aimKnightBone(b, child, want, parentQ, out) {
  out.setFromUnitVectors(_kv[0].copy(child.position).normalize(), want);
  b.quaternion.copy(parentQ).invert().multiply(out);
  return out;
}
function knightPose(P) {
  const B = knight.B;
  for (const n in B) B[n].quaternion.identity();
  B.columna.quaternion.setFromAxisAngle(_kv[1].set(1, 0, 0), P.lean);           // inclinado hacia delante
  const chest = _kq[2].copy(B.columna.quaternion), none = _kq[3].identity();
  for (const [s, sx] of [['l', 1], ['r', -1]]) {
    const dir = a => _kv[1].set(a[0] * sx, a[1], a[2]).normalize();
    const up = aimKnightBone(B['brazo_' + s], B['antebrazo_' + s], dir(P.upper), chest, _kq[0]);
    aimKnightBone(B['antebrazo_' + s], B['mano_' + s], dir(P.fore), up, _kq[1]);
    const th = aimKnightBone(B['muslo_' + s], B['pierna_' + s], dir(P.thigh), none, _kq[0]);
    aimKnightBone(B['pierna_' + s], B['pie_' + s], dir(P.shin), th, _kq[1]);
  }
  // los ojos en ejes del caballero, ya en esta pose (para poner su cabeza donde va la cámara)
  knight.holder.updateMatrixWorld(true);
  knight.root.worldToLocal(knight.eye.getWorldPosition(knight.eyes));
}
function knightToShow() {
  if (!knight.ready) return;
  show.table.add(knight.holder); knight.holder.position.set(KNIGHT_SHOW[0], 0, KNIGHT_SHOW[1]); knight.holder.rotation.set(0, KNIGHT_SHOW[2], 0);
  knightPose(KNIGHT_STAND); knight.holder.visible = true;
}
function knightToGame() {
  if (!knight.ready) return;
  dragon.add(knight.holder); knight.holder.rotation.set(0, Math.PI, 0); knight.holder.visible = false;   // el modelo mira hacia +Z; el dragón, hacia -Z
  knightPose(KNIGHT_SEAT);
}
/* Por fotograma (tras animar al dragón): visible en 3ª persona, con los ojos donde va la cámara de 1ª persona (el grupo está girado 180°). */
function updateKnight() {
  if (!knight.ready || knight.holder.parent !== dragon) return;
  const A = dragonAnim;
  knight.holder.visible = (state === 'playing' || state === 'dead') && hero.ready && !!A.fp && A.cam > KNIGHT_SHOW_CAM && !devNoRider();   // (v32: sin jinete en los modos de prueba)
  if (!knight.holder.visible) return;
  const e = knight.eyes;
  knight.holder.position.set(e.x, heroFP[0] - e.y, heroFP[1] + e.z).applyQuaternion(hero.bodyQ).add(A.fp);   // (v13) sobre el lomo, que se inclina
  knight.holder.quaternion.copy(hero.bodyQ).multiply(_kQy);
}

