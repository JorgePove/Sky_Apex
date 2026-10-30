/* ============================================================
   6f. IMPACTOS DE LA LLAMARADA Y QUEMADURAS (v27)
   Petición de Jorge tras jugar la v26: saber si la llamarada llega al suelo y verla impactar.
   · Círculo de impacto (impactMark): un disco luminoso, blanco cálido, tumbado sobre el terreno (o el agua, o una isla) donde caería la
     llamarada si se lanzara ahora, solo si está a su alcance (como en el vídeo de referencia «demo lanzallamas»). Con la llamarada
     encendida brilla más y late.
   · Impactos (flameImpact, mientras sale la llamarada): en el terreno, tierra que salta (polvo marrón, terrones que caen y salpicaduras de
     fuego a ras de suelo); en una isla, lo mismo con roca gris; en el agua, vapor y gotas. Al dar a un dragón, una torre o un dirigible
     (flameHit), una salpicadura de fuego y chispas.
   · Quemaduras (scorchAt): manchas de tierra negra y quemada sobre el terreno por donde pasa la llamarada; las primeras SCORCH.glow s aún
     tienen brasas, y desaparecen poco a poco al final de SCORCH.life s (60; la última SCORCH.fade s, desvaneciéndose). Todas en una sola
     malla (hasta SCORCH.max, las más viejas se reutilizan): cada una, una rejilla de 3×3 puntos pegada al terreno con heightAt.
   ============================================================ */
const IMPACT_RATE = 30;                                     // ráfagas de partículas por segundo en el punto de impacto
const SCORCH = { max: 2400, life: 60, fade: 20, glow: 5, lift: 0.55, i: 0, lastX: 1e9, lastZ: 1e9, lastT: -9, dirty0: Infinity, dirty1: -1 };
const IMP = { acc: 0, hitAcc: 0, markK: 0 };
const _imN = new THREE.Vector3(), _imQ = new THREE.Quaternion(), _imUp = new THREE.Vector3(0, 1, 0), _imP = new THREE.Vector3();

/* ---------- Círculo de impacto ---------- */
const impactMesh = (() => {
  const geo = new THREE.CircleGeometry(1, 48); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16,
    uniforms: { uI: { value: 0 }, uT: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uI, uT; varying vec2 vP;
      void main(){ float d = length(vP);
        float ring = smoothstep(0.70, 0.86, d) * (1.0 - smoothstep(0.88, 1.0, d));
        float core = 1.0 - smoothstep(0.0, 0.62, d);
        float a = (ring * 1.1 + core * core * 0.8) * uI;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.82) * a, a); }`
  }));
  m.renderOrder = 5; m.visible = false; m.frustumCulled = false; scene.add(m);
  return m;
})();
/* show: ¿se ve? p: punto (se copia); kind: 'tierra' | 'agua' | 'isla'; firing: la llamarada está encendida; dist: distancia desde la boca (m). */
function impactMark(show, p, kind, firing, dist) {
  const m = impactMesh;
  IMP.markK += ((show ? (firing ? 1 : 0.6) : 0) - IMP.markK) * 0.25;
  if (!show) { if (IMP.markK < 0.02) m.visible = false; m.material.uniforms.uI.value = IMP.markK; return; }
  if (kind === 'tierra') {                                  // normal del terreno
    const e = 2, h = heightAt(p.x, p.z);
    _imN.set(-(heightAt(p.x + e, p.z) - h) / e, 1, -(heightAt(p.x, p.z + e) - h) / e).normalize();
  } else _imN.set(0, 1, 0);
  m.quaternion.copy(_imQ.setFromUnitVectors(_imUp, _imN));
  m.position.copy(p).addScaledVector(_imN, 0.35);
  const r = (5 + dist * 0.07) * (firing ? 1.12 + 0.08 * Math.sin(gameTime * 18) : 1);
  m.scale.setScalar(r);
  m.material.uniforms.uI.value = IMP.markK; m.visible = true;
}

/* ---------- Partículas de impacto ---------- */
function flameImpact(kind, p, dt, dist) {
  if (kind === 'tierra') scorchAt(p.x, p.z, clamp(3.5 + dist * 0.045, 4, 11));
  IMP.acc += dt * IMPACT_RATE; let n = Math.floor(IMP.acc); IMP.acc -= n;
  const c = ATTACK;
  for (; n > 0; n--) {
    const x = p.x + rnd(-1.5, 1.5), y = p.y + 0.6, z = p.z + rnd(-1.5, 1.5);
    if (kind === 'agua') {                                    // vapor que sube y gotas
      for (let i = 0; i < 2; i++) emit(fxSmoke, x + rnd(-3, 3), WL + 0.6, z + rnd(-3, 3), rnd(-3, 3), rnd(5, 13), rnd(-3, 3), rnd(1.4, 2.4), rnd(3, 5), rnd(12, 20), 0.88, 0.9, 0.92, 0.42, 0.9, -2);
      for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, sp = rnd(6, 16); emit(fxSmoke, x, WL + 0.4, z, Math.cos(a) * sp, rnd(8, 20), Math.sin(a) * sp, rnd(0.6, 1.1), 0.9, 0.6, 0.85, 0.92, 0.96, 0.7, 0.3, 22); }
      continue;
    }
    const rock = kind === 'isla', dr = rock ? 0.33 : 0.30, dg = rock ? 0.31 : 0.22, db = rock ? 0.29 : 0.14, k = rnd(0.8, 1.15);
    // polvo: nube marrón que sube despacio
    for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283, sp = rnd(2, 8); emit(fxSmoke, x, y, z, Math.cos(a) * sp, rnd(4, 12), Math.sin(a) * sp, rnd(1.2, 2.2), rnd(3, 5), rnd(10, 16), dr * k, dg * k, db * k, 0.55, 1.2, -1); }
    // terrones que saltan y caen
    for (let i = 0; i < 4; i++) { const a = Math.random() * 6.283, sp = rnd(6, 18); emit(fxSmoke, x, y, z, Math.cos(a) * sp, rnd(10, 26), Math.sin(a) * sp, rnd(0.8, 1.4), rnd(0.9, 1.4), 0.7, dr * 0.45, dg * 0.45, db * 0.45, 1, 0.2, 24); }
    // fuego que se aplasta contra el suelo y se abre
    for (let i = 0; i < 4; i++) { const a = Math.random() * 6.283, sp = rnd(10, 30); emit(fxAdd, x, y, z, Math.cos(a) * sp, rnd(1, 6), Math.sin(a) * sp, rnd(0.25, 0.5), rnd(4, 6), rnd(9, 13), c.r, c.g * rnd(0.8, 1.1), c.b, 0.7, 2, -4); }
    if (Math.random() < 0.5) emit(fxAdd, x, y + 1, z, 0, 2, 0, 0.15, 10, 22, lerp(c.r, 1, 0.5), lerp(c.g, 1, 0.5), lerp(c.b, 1, 0.5), 0.5, 0, 0);
  }
}
/* Al dar a un dragón, una torre o un dirigible: salpicadura de fuego y chispas (p = punto del impacto). */
function flameHit(p, dt) {
  IMP.hitAcc += dt * 18; if (IMP.hitAcc < 1) return; IMP.hitAcc = 0;
  const c = ATTACK;
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * 6.283, u = rnd(-0.6, 1), s = Math.sqrt(1 - u * u), sp = rnd(14, 40);
    emit(fxAdd, p.x, p.y, p.z, Math.cos(a) * s * sp, u * sp, Math.sin(a) * s * sp, rnd(0.25, 0.45), rnd(5, 7), rnd(11, 16), lerp(c.r, 1, 0.25), c.g, c.b, 0.75, 2.2, -3);
  }
  sparks(p.x, p.y, p.z, 3, 0, 0, 0);
}

/* ---------- Quemaduras en el terreno ---------- */
const scorchTex = (() => {                                  // R = opacidad (borde irregular), G = carbón (centro), B = brasas
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const blobs = Array.from({ length: 9 }, () => [rnd(-0.45, 0.45), rnd(-0.45, 0.45), rnd(0.25, 0.5)]);
  const n2 = (x, y) => Math.sin(x * 9.1 + y * 3.7) * 0.5 + Math.sin(x * 17.3 - y * 13.1) * 0.3 + Math.sin(x * 31.7 + y * 27.9) * 0.2;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = i / S * 2 - 1, y = j / S * 2 - 1;
    let f = 0; for (const [bx, by, br] of blobs) f = Math.max(f, 1 - Math.hypot(x - bx, y - by) / br);
    const r = Math.hypot(x, y), n = n2(x, y);
    const a = clamp((f * 0.9 + (1 - r) * 0.5 + n * 0.18) * 1.6 - 0.35, 0, 1) * (1 - smooth(0.82, 1, r));
    const ch = clamp((1 - r * 1.15) + n * 0.25, 0, 1), em = clamp(n * 0.5 + 0.5 - r * 0.6, 0, 1) ** 3;
    const k = (j * S + i) * 4; d[k] = a * 255; d[k + 1] = ch * 255; d[k + 2] = em * 255; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
})();
const scorchMesh = (() => {
  const N = SCORCH.max, V = N * 9, pos = new Float32Array(V * 3), uv = new Float32Array(V * 2), birth = new Float32Array(V).fill(-1e6), idx = new Uint32Array(N * 24);
  for (let s = 0; s < N; s++) {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const v = s * 9 + j * 3 + i; uv[v * 2] = i / 2; uv[v * 2 + 1] = j / 2; }
    let t = s * 24;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const a = s * 9 + j * 3 + i, b = a + 1, c = a + 3, e = a + 4;
      idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = e;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
    uniforms: { uTex: { value: scorchTex }, uTime: { value: 0 }, uLife: { value: SCORCH.life }, uFade: { value: SCORCH.fade }, uGlow: { value: SCORCH.glow },
      uFog: { value: FOG_DENSITY }, uSunDir: { value: SUN_DIR } },
    vertexShader: `attribute float aBirth; varying vec2 vUv; varying float vB; varying vec3 vW;
      void main(){ vUv = uv; vB = aBirth; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: GLSL_COMMON + `uniform sampler2D uTex; uniform float uTime, uLife, uFade, uGlow, uFog; varying vec2 vUv; varying float vB; varying vec3 vW;
      void main(){
        vec4 t = texture2D(uTex, vUv);
        float age = uTime - vB;
        float a = t.r * (1.0 - smoothstep(uLife - uFade, uLife, age)) * smoothstep(0.0, 0.3, age);
        if (a < 0.01) discard;
        vec3 col = mix(vec3(0.19, 0.13, 0.08), vec3(0.03, 0.026, 0.024), t.g);
        col += vec3(1.0, 0.36, 0.07) * (1.0 - smoothstep(0.4, uGlow, age)) * t.b * 2.2;
        vec3 Vv = vW - cameraPosition; float dist = length(Vv); vec3 vd = Vv / dist;
        float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
        gl_FragColor = vec4(mix(col, skyColor(normalize(vec3(vd.x, max(vd.y, 0.0) * 0.4, vd.z))), fogF), a * 0.94);
      }`
  }));
  m.frustumCulled = false; m.renderOrder = 3; scene.add(m);
  return m;
})();
/* Una quemadura de radio r en (x, z), si el chorro se ha movido lo bastante desde la última (o ha pasado un rato en el mismo sitio). */
function scorchAt(x, z, r) {
  const d = Math.hypot(x - SCORCH.lastX, z - SCORCH.lastZ);
  if (d < r * 0.75 && gameTime - SCORCH.lastT < 0.35) return;
  if (heightAt(x, z) < WL + 0.2) return;                    // (en el agua no)
  SCORCH.lastX = x; SCORCH.lastZ = z; SCORCH.lastT = gameTime;
  const s = SCORCH.i; SCORCH.i = (SCORCH.i + 1) % SCORCH.max;
  const geo = scorchMesh.geometry, P = geo.attributes.position.array, B = geo.attributes.aBirth.array;
  const th = Math.random() * 6.283, c = Math.cos(th) * r, sn = Math.sin(th) * r, born = gameTime;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const u = i - 1, w = j - 1, vx = x + u * c - w * sn, vz = z + u * sn + w * c, v = s * 9 + j * 3 + i;
    P[v * 3] = vx; P[v * 3 + 1] = heightAt(vx, vz) + SCORCH.lift; P[v * 3 + 2] = vz; B[v] = born;
  }
  SCORCH.dirty0 = Math.min(SCORCH.dirty0, s); SCORCH.dirty1 = Math.max(SCORCH.dirty1, s);
}
/* Cada fotograma (updateWorld): el reloj del shader y las quemaduras nuevas a la tarjeta gráfica. */
function updateScorch() {
  const u = scorchMesh.material.uniforms; u.uTime.value = gameTime; u.uLife.value = SCORCH.life; u.uFade.value = Math.min(SCORCH.fade, SCORCH.life);
  if (SCORCH.dirty1 < 0) return;
  const geo = scorchMesh.geometry, a = geo.attributes.position, b = geo.attributes.aBirth, v0 = SCORCH.dirty0 * 9, n = (SCORCH.dirty1 - SCORCH.dirty0 + 1) * 9;
  a.updateRange.offset = v0 * 3; a.updateRange.count = n * 3; a.needsUpdate = true;
  b.updateRange.offset = v0; b.updateRange.count = n; b.needsUpdate = true;
  SCORCH.dirty0 = Infinity; SCORCH.dirty1 = -1;
}
/* Todas fuera (partida nueva, otro mundo o el botón del panel de pruebas). */
function scorchClear() {
  scorchMesh.geometry.attributes.aBirth.array.fill(-1e6);
  SCORCH.dirty0 = 0; SCORCH.dirty1 = SCORCH.max - 1; SCORCH.lastX = SCORCH.lastZ = 1e9;
}
