/* ============================================================
   2. RENDER, CIELO, AGUA Y MATERIAL DE TERRENO (shaders)
   ============================================================ */
const canvasGL = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: canvasGL, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x0d0a0f, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(78, 1, 0.25, 16000);
camera.rotation.order = 'YXZ';                            // guiñada → cabeceo → alabeo: los temblores (rotation.x/y/z) y la mirada de la Z giran en sus ejes
scene.add(camera);

const SUN_DIR = new THREE.Vector3(0.55, 0.22, -0.8).normalize();   // sol bajo, hora dorada
const FOG_DENSITY = 0.00021;
scene.fog = new THREE.FogExp2(0xd9a98a, FOG_DENSITY);
const sunLight = new THREE.DirectionalLight(0xffc48a, 1.9);
sunLight.position.copy(SUN_DIR).multiplyScalar(100);
scene.add(sunLight);
const hemiLight = new THREE.HemisphereLight(0x8fa6d6, 0x4b3a30, 0.95);
scene.add(hemiLight);
/* v38: la bruma y los colores del cielo, compartidos por todos los shaders con GLSL_COMMON (skyColor). Los cambia setAtmosphere (al final
   de este módulo) según el bioma; estos valores son los de siempre (hora dorada del valle). */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const U_FOG = { value: FOG_DENSITY };
const SKY_U = { uSkyZen: { value: V3(0.10, 0.22, 0.50) }, uSkyMid: { value: V3(0.50, 0.60, 0.78) }, uSkyHor: { value: V3(0.90, 0.68, 0.52) },
  uGlowA: { value: V3(1.0, 0.52, 0.22) }, uGlowB: { value: V3(1.0, 0.74, 0.42) } };

// Textura de ruido repetible (3 canales a escalas distintas) para detalle de terreno y olas. v19: igual en todos los mundos (sin semilla)
function makeNoiseTexture(size) {
  const data = new Uint8Array(size * size * 4);
  const P = [4, 16, 64];
  const lattices = P.map((per, k) => { const a = new Float32Array(per * per); for (let i = 0; i < a.length; i++) a[i] = hashSeed(i, per * 31 + k, 4242 + k); return a; });
  const fade = t => t * t * (3 - 2 * t);
  const sample = (lat, per, u, v) => {
    const x = u * per, y = v * per, x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = fade(x - x0), fy = fade(y - y0);
    const a = lat[(y0 % per) * per + (x0 % per)], b = lat[(y0 % per) * per + ((x0 + 1) % per)];
    const c = lat[((y0 + 1) % per) * per + (x0 % per)], d = lat[((y0 + 1) % per) * per + ((x0 + 1) % per)];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size, o = (j * size + i) * 4;
    // R: grandes manchas · G: media escala · B: grano fino (cada canal suma dos octavas)
    const r = sample(lattices[0], 4, u, v) * 0.65 + sample(lattices[1], 16, u, v) * 0.35;
    const g = sample(lattices[1], 16, u, v) * 0.6 + sample(lattices[2], 64, u, v) * 0.4;
    const b = sample(lattices[2], 64, u, v) * 0.7 + sample(lattices[1], 16, (u * 2) % 1, (v * 2) % 1) * 0.3;
    data[o] = clamp(r * 255, 0, 255); data[o + 1] = clamp(g * 255, 0, 255); data[o + 2] = clamp(b * 255, 0, 255); data[o + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;
  return tex;
}
const noiseTex = makeNoiseTexture(256);

const GLSL_COMMON = `
uniform vec3 uSunDir, uSkyZen, uSkyMid, uSkyHor, uGlowA, uGlowB;
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1.0,0.0)), f.x), mix(hash21(i+vec2(0.0,1.0)), hash21(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm5(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + vec2(11.7, 3.1); a *= 0.5; } return s; }
vec3 skyColor(vec3 d){
  float h = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(uSkyZen, uSkyMid, pow(1.0 - h, 1.7));
  c = mix(c, uSkyHor, pow(1.0 - h, 4.5));
  float sd = max(dot(d, uSunDir), 0.0);
  c += uGlowA * pow(sd, 5.0) * 0.30 + uGlowB * pow(sd, 40.0) * 0.55;
  c += vec3(1.0, 0.92, 0.75) * smoothstep(0.9996, 0.99985, sd) * 3.0;
  return c;
}
`;

/* ---------- Cielo ---------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: Object.assign({ uSunDir: { value: SUN_DIR }, uTime: { value: 0 },   // v38: colores de las nubes del cielo (setAtmosphere)
    uCloudShade: { value: V3(0.42, 0.40, 0.55) }, uCloudLitA: { value: V3(0.98, 0.84, 0.74) }, uCloudLitB: { value: V3(1.0, 0.62, 0.34) },
    uCloudCov: { value: V3(0.50, 0.74, 0.92) } }, SKY_U),   // umbrales de cobertura y opacidad
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); }`,
  fragmentShader: GLSL_COMMON + `
  uniform float uTime; uniform vec3 uCloudShade, uCloudLitA, uCloudLitB, uCloudCov; varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    vec3 c = skyColor(d);
    if (d.y > 0.015) {
      vec2 uv = d.xz / (d.y + 0.14) * 1.15 + vec2(uTime * 0.006, uTime * 0.002);
      float n = fbm5(uv * 1.4);
      float cov = smoothstep(uCloudCov.x, uCloudCov.y, n) * smoothstep(0.015, 0.20, d.y);
      float n2 = fbm5(uv * 1.4 + uSunDir.xz * 0.10);
      float lit = clamp((n - n2) * 3.2 + 0.62, 0.0, 1.0);
      float sd = max(dot(d, uSunDir), 0.0);
      vec3 cloudLit = mix(uCloudLitA, uCloudLitB, pow(sd, 3.0));
      vec3 cc = mix(uCloudShade, cloudLit, lit);
      c = mix(c, cc, cov * uCloudCov.z);
    }
    gl_FragColor = vec4(c, 1.0);
  }`
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), skyMat);
skyMesh.frustumCulled = false; skyMesh.renderOrder = -100;
scene.add(skyMesh);

/* ---------- Agua ---------- */
const waterMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: Object.assign({ uSunDir: { value: SUN_DIR }, uTime: { value: 0 }, uFog: U_FOG, uNoise: { value: noiseTex },
    uWaterA: { value: V3(0.03, 0.12, 0.15) }, uWaterB: { value: V3(0.07, 0.24, 0.26) }, uSunSpec: { value: V3(1.0, 0.78, 0.5) } }, SKY_U),   // (v38: colores por bioma)
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GLSL_COMMON + `
  uniform float uTime, uFog; uniform sampler2D uNoise; uniform vec3 uWaterA, uWaterB, uSunSpec; varying vec3 vW;
  float wh(vec2 p){
    float a = texture2D(uNoise, p * 0.0135 + vec2(uTime * 0.021, uTime * 0.014)).g;
    float b = texture2D(uNoise, p * 0.041 - vec2(uTime * 0.034, -uTime * 0.025)).b;
    return a * 0.6 + b * 0.4;
  }
  void main(){
    vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 v = Vv / dist;
    float e = 0.7;
    float h0 = wh(vW.xz), hx = wh(vW.xz + vec2(e, 0.0)), hz = wh(vW.xz + vec2(0.0, e));
    float k = mix(7.0, 0.8, smoothstep(150.0, 3500.0, dist));
    vec3 N = normalize(vec3(-(hx - h0) * k, 1.0, -(hz - h0) * k));
    float ndv = max(dot(N, v), 0.0);
    float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
    vec3 R = reflect(-v, N); R.y = abs(R.y) + 0.02; R = normalize(R);
    vec3 refl = skyColor(R);
    vec3 body = mix(uWaterA, uWaterB, h0);
    float sunUp = clamp(uSunDir.y * 3.0 + 0.35, 0.0, 1.0);
    body *= 0.6 + 0.7 * sunUp;
    float sp = pow(max(dot(R, uSunDir), 0.0), 520.0) * 9.0 + pow(max(dot(R, uSunDir), 0.0), 50.0) * 0.35;
    vec3 col = mix(body, refl, clamp(fres + 0.10, 0.0, 1.0)) + uSunSpec * sp;
    float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
    vec3 fd = normalize(vec3(-v.x, 0.0, -v.z));
    gl_FragColor = vec4(mix(col, skyColor(fd), fogF), mix(0.72, 0.97, fres));
  }`
});
const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(36000, 36000), waterMat);
waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.y = WL; waterMesh.frustumCulled = false; waterMesh.renderOrder = 2;
scene.add(waterMesh);

/* ---------- Terreno ---------- */
const blankTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); blankTex.needsUpdate = true;
const terrainUniforms = Object.assign({
  uSunDir: { value: SUN_DIR }, uFog: U_FOG, uNoise: { value: noiseTex },
  uGrid: { value: 0 },                                    // v29: 1 = suelo de blockout (campo de pruebas): cuadros grises de 10 m con borde blanco
  // v38: luz por bioma (setAtmosphere) y mapa hecho a mano (Vuelo Libre): uMap = 1 colorea con su textura de materiales (uMat: roca, nieve,
  // agua pintada, verdor) de un cuadrado de uMapK.y m centrado en el origen con uMapK.z puntos por lado; uCloudSh = sombras de las nubes
  uSunC: { value: V3(1.70, 1.19, 0.731) }, uAmbLo: { value: V3(0.20, 0.20, 0.28) }, uAmbHi: { value: V3(0.38, 0.46, 0.62) },
  uMap: { value: 0 }, uMat: { value: blankTex }, uMapK: { value: V3(12000, 24000, 2048) },
  uCloudSh: { value: blankTex }, uCloudShK: { value: V3(16000, 32000, 0) }   // centro, lado (m) y fuerza de la sombra
}, SKY_U);
const terrainVS = `
attribute vec2 aux; varying vec3 vW; varying vec3 vN; varying vec2 vAux;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vAux = aux; gl_Position = projectionMatrix * viewMatrix * w; }`;
const terrainFS = GLSL_COMMON + `
uniform float uFog; uniform sampler2D uNoise; uniform float uGrid; varying vec3 vW; varying vec3 vN; varying vec2 vAux;
uniform vec3 uSunC, uAmbLo, uAmbHi, uMapK, uCloudShK; uniform float uMap; uniform sampler2D uMat, uCloudSh;
// v38: luz del sol y del cielo (con la sombra de las nubes) y bruma, iguales para todos los suelos
vec3 lightUp(vec3 col, vec3 N){
  float wrap = max((dot(N, uSunDir) + 0.20) / 1.20, 0.0);
  float sh = 1.0 - texture2D(uCloudSh, (vW.xz + uCloudShK.x) / uCloudShK.y).r * uCloudShK.z;
  return col * (uSunC * wrap * sh + mix(uAmbLo, uAmbHi, N.y * 0.5 + 0.5) * 0.95);
}
vec4 triNoise(vec3 p, vec3 bw, float s){
  return texture2D(uNoise, p.xz * s) * bw.y + texture2D(uNoise, p.xy * s) * bw.z + texture2D(uNoise, p.zy * s) * bw.x;
}
// v38: el mapa de Vuelo Libre: hierba dorada o verde, roca con estratos, nieve, orillas y agua pintada (río del cañón, lagos de montaña, arroyos)
vec3 mapGround(vec3 N, float h, float dist, vec3 vd){
  vec2 uv = ((vW.xz + uMapK.x) / uMapK.y * (uMapK.z - 1.0) + 0.5) / uMapK.z;
  vec4 M = texture2D(uMat, uv);
  float detailFade = 1.0 - smoothstep(600.0, 2600.0, dist);
  float n1 = texture2D(uNoise, vW.xz * 0.0019).r;
  // ruido de detalle proyectado desde los tres ejes (triplanar): en las paredes no se estira en rayas
  vec3 bw = pow(abs(N), vec3(4.0)); bw /= bw.x + bw.y + bw.z;
  float n2 = mix(0.5, triNoise(vW, bw, 0.0155).g, detailFade);
  float n3 = mix(0.5, triNoise(vW, bw, 0.113).b, detailFade);
  float n4 = mix(0.5, triNoise(vW, bw, 0.53).b, 1.0 - smoothstep(40.0, 300.0, dist));
  float slope = 1.0 - N.y;
  float v = clamp(M.a + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.3, 0.0, 1.0);
  vec3 gold = mix(vec3(0.47, 0.38, 0.17), vec3(0.58, 0.48, 0.25), n2);
  vec3 green = mix(vec3(0.17, 0.27, 0.09), vec3(0.27, 0.37, 0.13), n2);
  vec3 grass = mix(gold, green, smoothstep(0.3, 0.75, v));
  grass *= 0.78 + 0.34 * n3; grass *= 0.9 + 0.2 * n4;
  grass = mix(grass, vec3(0.36, 0.31, 0.22), smoothstep(0.6, 0.9, n3) * 0.3);
  vec3 rk = mix(vec3(0.52, 0.51, 0.49), vec3(0.32, 0.32, 0.34), n1);
  rk *= 0.74 + 0.46 * n3; rk *= 0.88 + 0.24 * n4;
  rk *= 0.9 + 0.14 * sin(h * 0.165 + n1 * 6.0 + n2 * 2.0) * detailFade;
  float rock = max(M.r, smoothstep(0.24, 0.48, slope + (n2 - 0.5) * 0.2));
  vec3 col = mix(grass, rk, rock);
  float sn = M.g * (1.0 - smoothstep(0.42, 0.68, slope));
  sn = smoothstep(0.2, 0.55, sn + (n2 - 0.5) * 0.3 + (n3 - 0.5) * 0.15);
  col = mix(col, vec3(0.94, 0.96, 1.0) * (0.9 + 0.1 * n3), sn);
  float sandM = (1.0 - smoothstep(1.0, 4.5, h)) * smoothstep(-4.0, 0.2, h) * (1.0 - rock);
  col = mix(col, vec3(0.70, 0.64, 0.48) * (0.88 + 0.22 * n2), sandM);
  col = mix(col, vec3(0.02, 0.07, 0.10), smoothstep(0.4, -0.6, h));
  vec3 lit = lightUp(col, N);
  lit *= 1.0 - 0.16 * smoothstep(0.25, 0.7, slope) * (1.0 - sn);
  float wa = smoothstep(0.35, 0.7, M.b) * step(0.3, h);
  if (wa > 0.0) {
    vec3 V = -vd;
    vec2 fl = vW.xz * 0.06;
    vec3 Nw = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.7) + vec3((n4 - 0.5) * 0.12, 0.0, (texture2D(uNoise, fl).g - 0.5) * 0.12));
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
    vec3 R = reflect(-V, Nw); R.y = abs(R.y) + 0.02;
    vec3 wcol = mix(vec3(0.04, 0.15, 0.18) * (0.5 + 0.5 * uSunC.x), skyColor(normalize(R)), clamp(fres + 0.15, 0.0, 1.0));
    wcol += uSunC * 0.5 * pow(max(dot(normalize(R), uSunDir), 0.0), 300.0);
    lit = mix(lit, wcol, wa);
  }
  return lit;
}
// v29: líneas de una cuadrícula de celda «cell» y medio grosor «hw» (m), suavizadas por píxel; se apagan cuando ya no caben en pantalla
float gridLine(vec2 p, float cell, float hw){
  vec2 d = abs(mod(p + cell * 0.5, cell) - cell * 0.5), aa = fwidth(p) * 0.8;
  vec2 l = 1.0 - smoothstep(vec2(hw) - aa, vec2(hw) + aa, d);
  return max(l.x, l.y) * (1.0 - smoothstep(0.12, 0.3, max(aa.x, aa.y) / cell));
}
vec3 blockout(vec2 p){
  vec2 c = floor(p / 10.0);
  vec3 col = mix(vec3(0.40, 0.40, 0.41), vec3(0.45, 0.45, 0.46), mod(c.x + c.y, 2.0));
  col = mix(col, vec3(0.92), gridLine(p, 10.0, 0.18));
  col = mix(col, vec3(1.0), gridLine(p, 100.0, 0.7));
  return col;
}
void main(){
  if (uMap > 0.5) {
    vec3 N = normalize(vN); float h = vW.y;
    vec3 Vv = vW - cameraPosition; float dist = length(Vv); vec3 vd = Vv / dist;
    vec3 lit = mapGround(N, h, dist, vd);
    float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
    gl_FragColor = vec4(mix(lit, skyColor(normalize(vec3(vd.x, max(vd.y, 0.0) * 0.4, vd.z))), fogF), 1.0);
    return;
  }
  if (uGrid > 0.5) {
    vec3 N = normalize(vN); float h = vW.y;
    vec3 Vv = vW - cameraPosition; float dist = length(Vv); vec3 vd = Vv / dist;
    vec3 col = blockout(vW.xz);
    float dep = clamp(-h / 14.0, 0.0, 1.0);
    col = mix(col, mix(vec3(0.20, 0.34, 0.31), vec3(0.03, 0.10, 0.17), dep), smoothstep(0.4, -0.6, h));
    vec3 lit = lightUp(col, N);
    float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
    gl_FragColor = vec4(mix(lit, skyColor(normalize(vec3(vd.x, max(vd.y, 0.0) * 0.4, vd.z))), fogF), 1.0);
    return;
  }
  vec3 N = normalize(vN);
  float h = vW.y;
  vec3 Vv = vW - cameraPosition; float dist = length(Vv); vec3 vd = Vv / dist;
  float detailFade = 1.0 - smoothstep(600.0, 2600.0, dist);
  float n1 = texture2D(uNoise, vW.xz * 0.0019).r;
  float n2 = mix(0.5, texture2D(uNoise, vW.xz * 0.0155).g, detailFade);
  float n3 = mix(0.5, texture2D(uNoise, vW.xz * 0.113).b, detailFade);
  float slope = 1.0 - N.y;
  // hierba: más seca y amarillenta con la altura, más oscura bajo el bosque
  vec3 grass = mix(vec3(0.20, 0.34, 0.11), vec3(0.45, 0.47, 0.19), smoothstep(0.30, 0.72, n1));
  grass = mix(grass, vec3(0.52, 0.50, 0.30), smoothstep(160.0, 380.0, h) * 0.7);
  grass *= 0.82 + 0.34 * n2; grass *= 0.90 + 0.20 * n3;
  grass = mix(grass, vec3(0.06, 0.16, 0.07) * (0.8 + 0.5 * n2), vAux.x * 0.92);
  // roca con estratos
  vec3 rk = mix(vec3(0.40, 0.35, 0.31), vec3(0.24, 0.22, 0.21), n1);
  rk *= 0.78 + 0.44 * n3; rk *= 0.96 + 0.04 * sin(h * 0.085 + n1 * 7.0) * detailFade;
  float rockMix = smoothstep(0.13, 0.30, slope + (n2 - 0.5) * 0.10);
  vec3 col = mix(grass, rk, rockMix);
  // nieve
  float snowLine = 560.0 + (n1 - 0.5) * 180.0;
  float sn = smoothstep(snowLine, snowLine + 110.0, h) * (1.0 - smoothstep(0.30, 0.55, slope));
  col = mix(col, vec3(0.93, 0.95, 1.0) * (0.92 + 0.08 * n3), sn);
  // orilla, arena y lecho
  float sandM = (1.0 - smoothstep(1.2, 5.5, h)) * smoothstep(-4.0, 0.2, h) * (1.0 - rockMix);
  col = mix(col, vec3(0.68, 0.60, 0.42) * (0.88 + 0.22 * n2), sandM);
  float dep = clamp(-h / 14.0, 0.0, 1.0);
  vec3 bed = mix(vec3(0.20, 0.34, 0.31), vec3(0.03, 0.10, 0.17), dep);
  col = mix(col, bed, smoothstep(0.4, -0.6, h));
  // iluminación: sol cálido rasante + ambiente de cielo (v38: colores por bioma, en lightUp)
  vec3 lit = lightUp(col, N);
  lit *= 1.0 - 0.18 * smoothstep(0.25, 0.7, slope) * (1.0 - sn);
  // bruma atmosférica: el color del cielo en la dirección de la vista
  float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
  vec3 fd = normalize(vec3(vd.x, max(vd.y, 0.0) * 0.4, vd.z));
  gl_FragColor = vec4(mix(lit, skyColor(fd), fogF), 1.0);
}`;
const terrainMats = [];
function terrainMaterial(level) {
  if (!terrainMats[level]) {
    terrainMats[level] = new THREE.ShaderMaterial({
      uniforms: terrainUniforms, vertexShader: terrainVS, fragmentShader: terrainFS, side: THREE.DoubleSide, extensions: { derivatives: true },
      polygonOffset: true, polygonOffsetFactor: level * 0.6, polygonOffsetUnits: level * 3
    });
  }
  return terrainMats[level];
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const hud = document.getElementById('hud'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  hud.width = Math.floor(w * dpr); hud.height = Math.floor(h * dpr);
}
window.addEventListener('resize', onResize);
onResize();

/* ---------- v38: ambiente por bioma ----------
   setAtmosphere(a): sol, cielo, nubes del cielo, bruma, agua y luces (también las de la escena de los brazos del jinete, con atmosHooks).
   Lo llama setBiome (M3) con BIOMES[...].atmos; sin a (null), el ambiente de siempre: la hora dorada del valle. Colores lineales [r, g, b];
   sun: dirección hacia el sol (sunFrom: rumbo y altura en grados); sunLight y hemi: [color, intensidad] y [cielo, suelo, intensidad]. */
const ATMOS_U = { skyZen: SKY_U.uSkyZen, skyMid: SKY_U.uSkyMid, skyHor: SKY_U.uSkyHor, glowA: SKY_U.uGlowA, glowB: SKY_U.uGlowB,
  cloudShade: skyMat.uniforms.uCloudShade, cloudLitA: skyMat.uniforms.uCloudLitA, cloudLitB: skyMat.uniforms.uCloudLitB, cloudCov: skyMat.uniforms.uCloudCov,
  sunC: terrainUniforms.uSunC, ambLo: terrainUniforms.uAmbLo, ambHi: terrainUniforms.uAmbHi,
  waterA: waterMat.uniforms.uWaterA, waterB: waterMat.uniforms.uWaterB, sunSpec: waterMat.uniforms.uSunSpec };
const ATMOS_DEF = { sun: SUN_DIR.toArray(), fog: FOG_DENSITY, fogColor: scene.fog.color.toArray(),
  sunLight: [sunLight.color.getHex(), sunLight.intensity], hemi: [hemiLight.color.getHex(), hemiLight.groundColor.getHex(), hemiLight.intensity] };
for (const k in ATMOS_U) ATMOS_DEF[k] = ATMOS_U[k].value.toArray();
const atmosHooks = [];
const sunFrom = (rumbo, altura) => { const a = rumbo * Math.PI / 180, e = altura * Math.PI / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]; };
function setAtmosphere(a) {
  a = Object.assign({}, ATMOS_DEF, a || {});
  for (const k in ATMOS_U) ATMOS_U[k].value.fromArray(a[k]);
  SUN_DIR.fromArray(a.sun).normalize(); sunLight.position.copy(SUN_DIR).multiplyScalar(100);
  U_FOG.value = a.fog; scene.fog.density = a.fog; scene.fog.color.fromArray(a.fogColor);
  sunLight.color.setHex(a.sunLight[0]); sunLight.intensity = a.sunLight[1];
  hemiLight.color.setHex(a.hemi[0]); hemiLight.groundColor.setHex(a.hemi[1]); hemiLight.intensity = a.hemi[2];
  for (const f of atmosHooks) f();
}
