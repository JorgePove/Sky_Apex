/* ============================================================
   5. EL DRAGÓN DEL JUGADOR: el grupo que vuela y lleva la cámara y el modelo
   Sistema local del dragón: -Z adelante, +Y arriba, +X derecha.
   ============================================================ */
const dragon = new THREE.Group();
scene.add(dragon);
dragon.add(camera);
const UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Vector3(), Y_AXIS = new THREE.Vector3(0, 1, 0);
const _m4 = new THREE.Matrix4(), _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _vC = new THREE.Vector3(), _qA = new THREE.Quaternion();
const dragonAnim = { phase: 0, flap: 0.6, headYaw: 0, headPitch: 0, jaw: 0, tailYaw: 0, tailLag: 0, time: 0, tuck: 0, cam: 0, fire: 0 };

