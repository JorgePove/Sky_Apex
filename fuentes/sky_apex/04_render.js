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
scene.add(new THREE.HemisphereLight(0x8fa6d6, 0x4b3a30, 0.95));

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
uniform vec3 uSunDir;
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1.0,0.0)), f.x), mix(hash21(i+vec2(0.0,1.0)), hash21(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm5(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + vec2(11.7, 3.1); a *= 0.5; } return s; }
vec3 skyColor(vec3 d){
  float h = clamp(d.y, 0.0, 1.0);
  vec3 zen = vec3(0.10, 0.22, 0.50), mid = vec3(0.50, 0.60, 0.78), hor = vec3(0.90, 0.68, 0.52);
  vec3 c = mix(zen, mid, pow(1.0 - h, 1.7));
  c = mix(c, hor, pow(1.0 - h, 4.5));
  float sd = max(dot(d, uSunDir), 0.0);
  c += vec3(1.0, 0.52, 0.22) * pow(sd, 5.0) * 0.30 + vec3(1.0, 0.74, 0.42) * pow(sd, 40.0) * 0.55;
  c += vec3(1.0, 0.92, 0.75) * smoothstep(0.9996, 0.99985, sd) * 3.0;
  return c;
}
`;

/* ---------- Cielo ---------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: { uSunDir: { value: SUN_DIR }, uTime: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); }`,
  fragmentShader: GLSL_COMMON + `
  uniform float uTime; varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    vec3 c = skyColor(d);
    if (d.y > 0.015) {
      vec2 uv = d.xz / (d.y + 0.14) * 1.15 + vec2(uTime * 0.006, uTime * 0.002);
      float n = fbm5(uv * 1.4);
      float cov = smoothstep(0.50, 0.74, n) * smoothstep(0.015, 0.20, d.y);
      float n2 = fbm5(uv * 1.4 + uSunDir.xz * 0.10);
      float lit = clamp((n - n2) * 3.2 + 0.62, 0.0, 1.0);
      float sd = max(dot(d, uSunDir), 0.0);
      vec3 cloudShade = vec3(0.42, 0.40, 0.55);
      vec3 cloudLit = mix(vec3(0.98, 0.84, 0.74), vec3(1.0, 0.62, 0.34), pow(sd, 3.0));
      vec3 cc = mix(cloudShade, cloudLit, lit);
      c = mix(c, cc, cov * 0.92);
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
  uniforms: { uSunDir: { value: SUN_DIR }, uTime: { value: 0 }, uFog: { value: FOG_DENSITY }, uNoise: { value: noiseTex } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GLSL_COMMON + `
  uniform float uTime, uFog; uniform sampler2D uNoise; varying vec3 vW;
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
    vec3 body = mix(vec3(0.03, 0.12, 0.15), vec3(0.07, 0.24, 0.26), h0);
    float sunUp = clamp(uSunDir.y * 3.0 + 0.35, 0.0, 1.0);
    body *= 0.6 + 0.7 * sunUp;
    float sp = pow(max(dot(R, uSunDir), 0.0), 520.0) * 9.0 + pow(max(dot(R, uSunDir), 0.0), 50.0) * 0.35;
    vec3 col = mix(body, refl, clamp(fres + 0.10, 0.0, 1.0)) + vec3(1.0, 0.78, 0.5) * sp;
    float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
    vec3 fd = normalize(vec3(-v.x, 0.0, -v.z));
    gl_FragColor = vec4(mix(col, skyColor(fd), fogF), mix(0.72, 0.97, fres));
  }`
});
const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(36000, 36000), waterMat);
waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.y = WL; waterMesh.frustumCulled = false; waterMesh.renderOrder = 2;
scene.add(waterMesh);

/* ---------- Terreno ---------- */
const terrainUniforms = {
  uSunDir: { value: SUN_DIR }, uFog: { value: FOG_DENSITY }, uNoise: { value: noiseTex }
};
const terrainVS = `
attribute vec2 aux; varying vec3 vW; varying vec3 vN; varying vec2 vAux;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vAux = aux; gl_Position = projectionMatrix * viewMatrix * w; }`;
const terrainFS = GLSL_COMMON + `
uniform float uFog; uniform sampler2D uNoise; varying vec3 vW; varying vec3 vN; varying vec2 vAux;
void main(){
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
  // iluminación: sol cálido rasante + ambiente de cielo
  float ndl = dot(N, uSunDir);
  float wrap = max((ndl + 0.20) / 1.20, 0.0);
  vec3 sunC = vec3(1.0, 0.70, 0.43) * 1.70;
  vec3 amb = mix(vec3(0.20, 0.20, 0.28), vec3(0.38, 0.46, 0.62), N.y * 0.5 + 0.5);
  vec3 lit = col * (sunC * wrap + amb * 0.95);
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
      uniforms: terrainUniforms, vertexShader: terrainVS, fragmentShader: terrainFS, side: THREE.DoubleSide,
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
