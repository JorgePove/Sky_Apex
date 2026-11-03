/* ============================================================
   7b. NUBES QUE SE ATRAVIESAN (v38, Vuelo Libre)
   Cúmulos hechos de bolas: cada bola es un sprite que mira a la cámara (todas en una sola malla instanciada), con base gris azulada y
   copa blanca iluminada por el sol (los colores de las nubes del cielo del bioma: uCloudShade y uCloudLitA, setAtmosphere). Las bolas se
   desvanecen al acercarse y, dentro de una nube, la pantalla se llena de blanco (#nube). Cada nube proyecta su sombra en el terreno (una
   textura vista desde arriba, uCloudSh del shader del terreno). Las ordena de lejos a cerca para que se mezclen bien.
   · cloudsBuild(def, semilla): desde setBiome (M3), con BIOMES[...].clouds (null = sin nubes): n cúmulos dentro de un círculo de r m, con
     la base entre base[0] y base[1] m, y low nubes bajas sobre valles y agua. La misma semilla da siempre las mismas nubes.
   · updateClouds(dt): cada fotograma (updateWorld).
   ============================================================ */
const CLOUD = { def: null, list: [], mesh: null, n: 0, pos: null, par: null, order: null, dist: null, last: new THREE.Vector3(1e9, 0, 0), inside: 0 };
const cloudOverlay = document.getElementById('nube');
const SHADOW_HALF = 16000, SHADOW_PX = 256;

/* La bola: disco blando con el borde roto por ruido (alfa) y algo de variación de brillo (rojo). */
const puffTex = (() => {
  const S = 128, data = new Uint8Array(S * S * 4);
  const vn = (u, v, per, salt) => {                       // ruido de valor periódico
    const x = u * per, y = v * per, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const h = (i, j) => hashSeed(((i % per) + per) % per, ((j % per) + per) % per, salt);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h(x0, y0), h(x0 + 1, y0), sx), lerp(h(x0, y0 + 1), h(x0 + 1, y0 + 1), sx), sy);
  };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = (i + 0.5) / S, v = (j + 0.5) / S, r = Math.hypot(u * 2 - 1, v * 2 - 1);
    const n = vn(u, v, 4, 71) * 0.5 + vn(u, v, 8, 72) * 0.3 + vn(u, v, 16, 73) * 0.2;
    let a = clamp((1 - r) * 2.3 - 0.3 + (n - 0.5) * 1.2, 0, 1) * (1 - smooth(0.8, 1.0, r));
    a = a * a * (3 - 2 * a);
    const o = (j * S + i) * 4, l = 200 + 55 * n;
    data[o] = data[o + 1] = data[o + 2] = l; data[o + 3] = a * 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
})();

const cloudMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: Object.assign({ uSunDir: { value: SUN_DIR }, uFog: U_FOG, uPuff: { value: puffTex }, uSunV: { value: new THREE.Vector3() },
    uCloudLitA: skyMat.uniforms.uCloudLitA, uCloudShade: skyMat.uniforms.uCloudShade }, SKY_U),
  vertexShader: `
  attribute vec3 iPos; attribute vec4 iPar;              // centro; tamaño (m), luz (0 base … 1 copa), giro, opacidad
  varying vec2 vUv, vC; varying float vL, vA; varying vec3 vW;
  void main(){
    vec4 mv = viewMatrix * vec4(iPos, 1.0);
    float d = length(mv.xyz);
    float c = cos(iPar.z), s = sin(iPar.z);
    vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
    mv.xy += q * iPar.x;
    vUv = uv; vC = q * 2.0; vL = iPar.y; vW = iPos;
    vA = iPar.w * smoothstep(iPar.x * 0.3, iPar.x * 1.05, d);   // se desvanece al meterse en ella
    gl_Position = projectionMatrix * mv;
  }`,
  fragmentShader: GLSL_COMMON + `
  uniform sampler2D uPuff; uniform vec3 uSunV, uCloudLitA, uCloudShade; uniform float uFog;
  varying vec2 vUv, vC; varying float vL, vA; varying vec3 vW;
  void main(){
    vec4 t = texture2D(uPuff, vUv);
    float a = t.a * vA;
    if (a < 0.003) discard;
    vec3 n = normalize(vec3(vC, sqrt(max(0.0, 1.0 - dot(vC, vC))) + 0.25));   // la bola como media esfera, en ejes de la vista
    float l = clamp(dot(n, uSunV) * 0.5 + 0.5, 0.0, 1.0);
    float light = clamp(vL * 0.62 + l * 0.55 - 0.1, 0.0, 1.0);
    vec3 col = mix(uCloudShade, uCloudLitA, light) * (0.88 + 0.14 * t.r);
    vec3 Vv = vW - cameraPosition; float dist = length(Vv);
    float fogF = 1.0 - exp(-pow(dist * uFog * 0.8, 2.0));
    col = mix(col, skyColor(normalize(vec3(Vv.x, max(Vv.y, 0.0) * 0.4, Vv.z))), fogF);
    gl_FragColor = vec4(col, a);
  }`
});

function cloudsClear() {
  if (CLOUD.mesh) { scene.remove(CLOUD.mesh); CLOUD.mesh.geometry.dispose(); CLOUD.mesh = null; }
  CLOUD.list.length = 0; CLOUD.n = 0; CLOUD.def = null; CLOUD.inside = 0; CLOUD.last.set(1e9, 0, 0);
  cloudOverlay.style.opacity = 0;
  if (terrainUniforms.uCloudSh.value !== blankTex) terrainUniforms.uCloudSh.value.dispose();
  terrainUniforms.uCloudSh.value = blankTex; terrainUniforms.uCloudShK.value.z = 0;
}

function cloudsBuild(def, seed) {
  cloudsClear();
  if (!def) return;
  CLOUD.def = def;
  const rnd = seededRandom((seed | 0) * 7919 + 13), P = [], R = [];   // P: centro de cada bola; R: tamaño, luz, giro, opacidad
  const sx = SUN_DIR.x, sz = SUN_DIR.z, sl = Math.hypot(sx, sz) || 1;
  function cloud(x, z, base, W, Hc) {
    const D = W * (0.55 + rnd() * 0.45), rot = rnd() * Math.PI, cr = Math.cos(rot), sr = Math.sin(rot);
    const c = { x, z, base, y: base + Hc * 0.45, w: W, d: D, h: Hc, rot };
    CLOUD.list.push(c);
    const k = clamp(Math.round(W / 55), 12, 64);
    for (let i = 0; i < k; i++) {
      const a = rnd() * Math.PI * 2, rho = Math.sqrt(rnd()) * 0.92;
      const lx = Math.cos(a) * rho * W * 0.5, lz = Math.sin(a) * rho * D * 0.5;
      const px = x + lx * cr - lz * sr, pz = z + lx * sr + lz * cr;
      const top = Hc * Math.pow(Math.max(0, 1 - rho * rho), 0.6);
      const size = (0.34 + 0.34 * rnd()) * W * (1 - 0.4 * rho) * 0.62;
      let py = base + size * 0.22 + Math.pow(rnd(), 0.8) * Math.max(0, top - size * 0.3);
      py = Math.max(py, Math.max(heightAt(px, pz), WL) + size * 0.38);   // que no se metan en la montaña
      const side = ((px - x) * sx + (pz - z) * sz) / (sl * Math.max(1, Math.hypot(px - x, pz - z)));
      P.push(px, py, pz);
      R.push(size, clamp((py - base) / Math.max(Hc, 1), 0, 1) * 0.8 + 0.2 * (side * 0.5 + 0.5), rnd() * 6.283, 0.82 + 0.18 * rnd());
    }
  }
  // cúmulos: al azar dentro del círculo, sin pisarse
  for (let tries = 0; CLOUD.list.length < def.n && tries < def.n * 60; tries++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * def.r, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const W = 1000 + Math.pow(rnd(), 1.4) * 2600;
    if (CLOUD.list.some(c => Math.hypot(c.x - x, c.z - z) < (c.w + W) * 0.48)) continue;
    cloud(x, z, lerp(def.base[0], def.base[1], rnd()), W, Math.min(1500, W * (0.32 + rnd() * 0.3)));
  }
  // nubes bajas: jirones sobre el agua y los valles
  for (let i = 0, tries = 0; i < def.low && tries < def.low * 80; tries++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * def.r * 0.8, x = Math.cos(a) * rr, z = Math.sin(a) * rr, g = heightAt(x, z);
    if (g > 380) continue;
    const W = 500 + rnd() * 700;
    if (CLOUD.list.some(c => Math.hypot(c.x - x, c.z - z) < (c.w + W) * 0.5 && Math.abs(c.base - 700) < 600)) continue;
    cloud(x, z, Math.max(g, WL) + 380 + rnd() * 450, W, W * (0.25 + rnd() * 0.2)); i++;
  }
  // la malla: un cuadrado por bola, instanciado
  const n = CLOUD.n = P.length / 3;
  CLOUD.pos = new Float32Array(P); CLOUD.par = new Float32Array(R);
  CLOUD.order = Array.from({ length: n }, (_, i) => i); CLOUD.dist = new Float32Array(n);
  const geo = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
  geo.setIndex(q.index); geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('iPar', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
  geo.instanceCount = n;
  CLOUD.mesh = new THREE.Mesh(geo, cloudMat); CLOUD.mesh.frustumCulled = false; CLOUD.mesh.renderOrder = 3;
  scene.add(CLOUD.mesh);
  cloudShadows();
}

/* Sombras: cada nube, una mancha blanda en el suelo, desplazada según el sol (a la altura del suelo bajo ella). */
function cloudShadows() {
  const cv = document.createElement('canvas'); cv.width = cv.height = SHADOW_PX;
  const cx = cv.getContext('2d'), k = SHADOW_PX / (2 * SHADOW_HALF);
  cx.fillStyle = '#000'; cx.fillRect(0, 0, SHADOW_PX, SHADOW_PX);
  const sy = Math.max(SUN_DIR.y, 0.15);
  for (const c of CLOUD.list) {
    const g = Math.max(heightAt(c.x, c.z), WL), up = Math.max(0, c.y - g);
    const x = c.x - SUN_DIR.x / sy * up, z = c.z - SUN_DIR.z / sy * up;
    cx.save(); cx.translate((x + SHADOW_HALF) * k, (z + SHADOW_HALF) * k); cx.rotate(c.rot); cx.scale(c.w * 0.5 * k, c.d * 0.5 * k);
    const gr = cx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = gr; cx.beginPath(); cx.arc(0, 0, 1, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  terrainUniforms.uCloudSh.value = t; terrainUniforms.uCloudShK.value.set(SHADOW_HALF, 2 * SHADOW_HALF, 0.42);
}

const _cv = new THREE.Vector3();
function updateClouds(dt) {
  if (!CLOUD.mesh) return;
  const C = camera.getWorldPosition(_cv), n = CLOUD.n;      // (la cámara va colgada del dragón: su posición en el mundo)
  cloudMat.uniforms.uSunV.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
  // de lejos a cerca (solo si la cámara se ha movido algo)
  if (CLOUD.last.distanceToSquared(C) > 400) {
    CLOUD.last.copy(C);
    const P = CLOUD.pos, Rr = CLOUD.par, d = CLOUD.dist, o = CLOUD.order;
    for (let i = 0; i < n; i++) { const dx = P[i * 3] - C.x, dy = P[i * 3 + 1] - C.y, dz = P[i * 3 + 2] - C.z; d[i] = dx * dx + dy * dy + dz * dz; }
    o.sort((a, b) => d[b] - d[a]);
    const ip = CLOUD.mesh.geometry.attributes.iPos, ir = CLOUD.mesh.geometry.attributes.iPar, A = ip.array, B = ir.array;
    for (let k = 0; k < n; k++) {
      const i = o[k];
      A[k * 3] = P[i * 3]; A[k * 3 + 1] = P[i * 3 + 1]; A[k * 3 + 2] = P[i * 3 + 2];
      B[k * 4] = Rr[i * 4]; B[k * 4 + 1] = Rr[i * 4 + 1]; B[k * 4 + 2] = Rr[i * 4 + 2]; B[k * 4 + 3] = Rr[i * 4 + 3];
    }
    ip.needsUpdate = ir.needsUpdate = true;
  }
  // ¿dentro de una nube? (elipsoide de cada una) → blanco en pantalla
  let dens = 0;
  for (const c of CLOUD.list) {
    const dx = C.x - c.x, dz = C.z - c.z;
    if (Math.abs(dx) > c.w || Math.abs(dz) > c.w) continue;
    const cr = Math.cos(c.rot), sr = Math.sin(c.rot), lx = dx * cr + dz * sr, lz = -dx * sr + dz * cr;
    const e = Math.hypot(lx / (c.w * 0.5), (C.y - c.y) / (c.h * 0.6), lz / (c.d * 0.5));
    dens = Math.max(dens, smooth(1.05, 0.55, e));
  }
  CLOUD.inside += (dens - CLOUD.inside) * (1 - Math.exp(-dt * 6));
  cloudOverlay.style.opacity = state === 'playing' || state === 'dead' ? (CLOUD.inside * 0.86).toFixed(3) : 0;
}
