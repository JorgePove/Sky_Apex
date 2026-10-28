/* ============================================================
   5d. «ELIGE TU DRAGÓN»: plataforma giratoria con el dragón animado y personalización de colores
   El mismo modelo del jugador (hero.wrap) se pasa a una escena aparte mientras dura la pantalla, y vuelve al juego al empezar.
   · Animación: siempre en reposo; el aliento de fuego solo con el botón «Probar llamarada», bajo la rueda del aliento (y al acabar, vuelve al reposo).
   · Clic derecho mantenido y arrastrar: gira la plataforma (con inercia; si se suelta, vuelve a girar sola despacio).
     Rueda del ratón: acercar / alejar (SHOW_ZOOM; de cerca, la cámara apunta más abajo, al pecho y la cabeza).
   · El caballero completo (5f), de pie al lado del dragón para ver la escala (1,9 m).
   · Color de piel: tiñe toda la textura conservando su detalle (luminancia × color elegido) en el shader del material.
   · Color del aliento: bolas de fuego, estelas, fogonazo de la boca y luces del jugador. Se guarda en este navegador.
   ============================================================ */
const ATTACK = new THREE.Color(1, 0.55, 0.15);            // color del aliento (por defecto, brasa)
const ATTACK_DEF = { h: 0.065, s: 0.85, v: 1 }, SKIN_DEF = { h: 0.03, s: 0.75, v: 0.8 };
const SKIN_TINT = { uTint: { value: new THREE.Color(1, 1, 1) }, uTintMix: { value: 0 }, uAvgLum: { value: 0.3 }, uHit: { value: 0 } };
const colors = { skin: null, fire: Object.assign({}, ATTACK_DEF) };   // los del dragón elegido; skin null = colores originales
const dragonColors = {};                                  // v16: los de cada dragón (id → { skin, fire }), que se guardan juntos con el elegido
const COLOR_KEY = 'alasDeBrasa.colores', DRAGON_KEY = 'skyApex.dragones';   // (COLOR_KEY: los del Tyrant hasta la v15)
const hsv2rgb = (h, s, v) => {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
};
const cssOf = (h, s, v) => { const [r, g, b] = hsv2rgb(h, s, v); return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; };

/* Tinte de piel en el shader: cambia el color de la textura y conserva sus luces y sombras.
   U = { uTint, uTintMix, uAvgLum, uHit }: el jugador usa SKIN_TINT y cada enemigo los suyos (amarillo, y uHit para el destello al recibir un impacto).
   Todos comparten el mismo código de shader (mismo programa); solo cambian los valores. */
function tintSkinMaterial(m, U) {
  if (!U.uAvgLum.done) try {                               // luminancia media de la textura (sin el relleno blanco del atlas), una vez por juego de valores (v16: cada dragón la suya)
    const img = m.map.image, c = document.createElement('canvas'); c.width = 96; c.height = 64;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 96, 64);
    const d = g.getImageData(0, 0, 96, 64).data; let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; if (l < 0.97) { s += l; n++; } }
    if (n) U.uAvgLum.value = Math.max(0.05, s / n);
    U.uAvgLum.done = true;
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
function setSkin(U, skin) {
  if (skin) { const [r, g, b] = hsv2rgb(skin.h, skin.s, skin.v); U.uTint.value.setRGB(r, g, b); U.uTintMix.value = 1; }
  else U.uTintMix.value = 0;
}
function applyColors() {
  setSkin(alt.D ? alt.D.U : SKIN_TINT, colors.skin);      // (v16: la piel del dragón elegido; cada uno tiene sus valores de shader)
  const [r, g, b] = hsv2rgb(colors.fire.h, colors.fire.s, colors.fire.v); ATTACK.setRGB(r, g, b);
  if (hero.glow) hero.glow.material.color.copy(ATTACK).lerp(_white, 0.35);
  if (hero.light) hero.light.color.copy(ATTACK);
  if (show.light) show.light.color.copy(ATTACK);
}
/* v16: un dragón recién cargado se tiñe con sus colores guardados, aunque no sea el elegido. */
function applyDragonColors(id) { const c = dragonColors[id], D = DRAGONS[id]; if (c && D.U) setSkin(D.U, c.skin); }
function loadColors() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAGON_KEY) || 'null');
    if (d && d.colors) { for (const id of DRAGON_IDS) if (d.colors[id] && d.colors[id].fire) dragonColors[id] = d.colors[id]; if (DRAGONS[d.cur]) alt.want = d.cur; }
    else { const c = JSON.parse(localStorage.getItem(COLOR_KEY) || 'null'); if (c && c.fire) dragonColors.tyrant = { skin: c.skin || null, fire: c.fire }; }   // (los de antes de la v16: del Tyrant)
  } catch (e) { /* almacenamiento no disponible */ }
  for (const id of DRAGON_IDS) if (!dragonColors[id]) dragonColors[id] = { skin: null, fire: Object.assign({}, ATTACK_DEF) };
  colors.skin = dragonColors[alt.id].skin; colors.fire = dragonColors[alt.id].fire;
  applyColors(); syncPickers();
}
function saveColors() {
  dragonColors[alt.id] = { skin: colors.skin, fire: colors.fire };
  try { localStorage.setItem(DRAGON_KEY, JSON.stringify({ cur: alt.id, colors: dragonColors })); } catch (e) { /* sin almacenamiento: no pasa nada */ }
}
/* v16: cambiar de dragón (botones de «Elige tu dragón» o, al cargar, el que estaba elegido): sus colores, su nombre y, en la plataforma, su pose. */
function chooseDragon(id) {
  if (id === alt.id) return;
  dragonColors[alt.id] = { skin: colors.skin, fire: colors.fire };
  if (!setDragon(id)) return;
  colors.skin = dragonColors[id].skin; colors.fire = dragonColors[id].fire;
  applyColors(); syncPickers(); saveColors(); refreshDragonButtons();
  if (state === 'select') showroomPose();
}
function refreshDragonButtons() {
  const D = DRAGONS[alt.id];
  document.getElementById('selName').textContent = D.name;
  document.getElementById('selDesc').textContent = D.desc;
  const cr = document.getElementById('selCredit'); cr.textContent = D.credit || ''; cr.hidden = !D.credit;
  // v24: stats del Excel, con una barra respecto al mejor de los cuatro; en dorado lo que está por encima de la Base y en rojo lo que está
  // por debajo. Daño: la media de sus cuatro armas respecto a las de la Base (en %)
  const B = STATS.base, dmg = S => ['basico_dano', 'guiado_dano', 'llamas_dano', 'rayo_dano'].reduce((a, k) => a + S[k] / (B[k] || 1), 0) / 4;
  const ROWS = [['Vida', S => S.vida, v => fmtStat(v)], ['Armadura', S => S.armadura, v => fmtStat(v)], ['Velocidad', S => S.vel_max, v => fmtStat(v) + ' km/h'],
    ['Boost', S => S.vel_boost, v => fmtStat(v) + ' km/h'], ['Daño', dmg, v => Math.abs(v - 1) < 1e-3 ? '=' : (v > 1 ? '+' : '−') + Math.round(Math.abs(v - 1) * 100) + ' %']];
  const S = heroStats(), all = DRAGON_IDS.map(k => STATS[k] || B);
  document.getElementById('selStats').innerHTML = ROWS.map(([n, f, txt]) => {
    const v = f(S), d = v - f(B), best = Math.max(...all.map(f), 1e-6);
    return `<dt>${n}</dt><dd class="${d > 1e-6 ? 'up' : d < -1e-6 ? 'down' : ''}">${txt(v)}</dd><i><b style="width:${(100 * v / best).toFixed(0)}%"></b></i>`;
  }).join('');
  for (const b of document.querySelectorAll('#selDragons button')) {
    const E = DRAGONS[b.dataset.id], ok = b.dataset.id === 'tyrant' || E.ready;
    b.disabled = !ok; b.classList.toggle('on', b.dataset.id === alt.id);
    b.title = ok ? '' : E.error ? 'No se pudo cargar el modelo' : 'Cargando…';
  }
}

/* ---------- Escena de la plataforma ---------- */
const show = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(36, 1, 0.2, 2000), table: new THREE.Group(), built: false,
  yaw: 0.7, vel: 0, drag: false, lastX: 0, lastT: 0, idle: 9, zoom: 1, dist: 60, target: new THREE.Vector3(0, 6, 0),
  cur: null, curName: '', timer: 0, fx: null, light: null, breathing: false, t: 0 };
show.scene.add(show.table);
const SHOW_ANIMS = { reposo: 'Reposo', fuego: 'Aliento de fuego', rugido: 'Rugido', hover: 'Vuelo estático' };
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
  knightToShow();                                         // el caballero, de pie al lado (para ver la escala)
  refreshDragonButtons(); showroomPose();
  show.idle = 9; show.vel = 0;
  canvasGL.style.cursor = 'grab';
}
/* Animación de partida y encuadre del dragón elegido (al entrar y, v16, al cambiar de dragón).
   v17: los otros dos no copian aquí al Tyrant (con otras proporciones, sus poses de suelo salen mal: alas que no llegan al suelo, patas
   en el aire): usan su propio clip (DRAGONS[id].showClip: el reposo de Drogon, la pose de pie del dragón rojo) y su capa por código
   (dragonShowLayer). Para todos, «Probar llamarada» con el Tyrant es su clip de fuego; con los otros, la boca se abre por código un momento
   (show.airFire). */
function showroomPose() {
  const D = alt.D;
  hero.mixer.stopAllAction(); restorePose0(); show.cur = null; show.airFire = 0; show.own = !!D;
  hero.wrap.position.set(0, 0, 0);
  if (D) {
    playDragonClip(D, D.showClip);
    dragonShowLayer(D, show.t, 0);
    show.curName = 'reposo'; show.timer = 1e9; document.getElementById('animTag').textContent = D.showTag || 'Reposo';
  } else { playShow('reposo', 0); hero.mixer.update(0); }
  show.table.updateMatrixWorld(true);
  // apoyar en la plataforma lo más bajo (patas o, si cuelga más, la cola) y encuadrar el dragón
  let minY = Infinity; const box = new THREE.Box3();
  (D ? D.model : hero.model).traverse(o => {
    if (!o.isBone || /Poll/.test(o.name)) return;          // (los polos del IK del dragón rojo quedan lejos del cuerpo)
    o.getWorldPosition(_sv); show.table.worldToLocal(_sv); box.expandByPoint(_sv);
    if (D || /^(foot|ball|toe)/.test(o.name)) minY = Math.min(minY, _sv.y);
  });
  hero.wrap.position.y = -minY + 0.1 + (D && D.showLift || 0);   // (v20: Fulgor flota con su hover, por encima de la plataforma)
  const size = box.getSize(_sv2), h = size.y;
  show.target.set(0, Math.max(h * 0.55, 3.5), 0);
  // encuadre: la envergadura abierta (rugido) y la plataforma entera deben caber
  show.dist = Math.max(Math.max(size.x, size.z, h * 1.4), HERO_SPAN * (D ? 0.75 : 1.15)) * 0.5 / Math.tan(show.cam.fov * Math.PI / 360) * 1.12;   // (v17: los otros dos, posados con las alas recogidas, más de cerca)
}
/* Todos los huesos a la pose de reposo del modelo (para que ningún clip deje huesos en una pose ajena). */
function restorePose0() { for (const [b, p, q, s] of hero.pose0) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); } }
function showroomLeave() {
  hero.mixer.stopAllAction(); restorePose0(); show.cur = null; show.breathing = false; if (show.light) show.light.intensity = 0;
  if (alt.D) restoreDragonRef(alt.D);                      // (v17: fuera su clip propio; en vuelo manda el Tyrant)
  dragon.add(hero.wrap); hero.wrap.rotation.set(0, Math.PI, 0); hero.wrap.position.set(0, 0, 0);
  knightToGame();
  for (const a of [hero.act.fly, hero.act.hover, hero.act.glide]) { a.reset(); a.play(); }
  hero.act.glide.time = hero.glideT; hero.act.glide.timeScale = 0;
  canvasGL.style.cursor = '';
}
function playShow(name, fade) {
  const clip = hero.clips[name]; if (!clip) return;
  const a = hero.mixer.clipAction(clip);
  const idle = name === 'reposo' || name === 'hover';
  a.reset(); a.setLoop(idle ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true; a.setEffectiveWeight(1); a.play();
  if (show.cur && show.cur !== a && fade) show.cur.crossFadeTo(a, fade, false);
  else if (show.cur && show.cur !== a) show.cur.stop();
  show.cur = a; show.curName = name;
  show.timer = idle ? rnd(4.5, 8) : clip.duration - fade - 0.05;
  const tag = document.getElementById('animTag'); if (tag) tag.textContent = SHOW_ANIMS[name] || name;
}
function updateShowroom(dt) {
  show.t += dt;
  show.timer -= dt;
  if (show.timer <= 0 && show.curName !== 'reposo' && show.curName !== 'hover') playShow('reposo', 0.5);   // tras la llamarada, de vuelta al reposo
  if (knight.ready && knight.holder.parent !== show.table) knightToShow();             // (si el caballero termina de cargar ya en esta pantalla)
  hero.mixer.update(dt);
  let airOpen = 0;                                         // llamarada de los otros dos: la boca se abre y se cierra en AIR_FIRE s
  if (show.airFire > 0) { show.airFire = Math.max(0, show.airFire - dt); airOpen = clamp(Math.min(show.airFire, AIR_FIRE - show.airFire) * 3, 0, 1); }
  if (show.own && alt.D) { dragonShowBase(alt.D); alt.D.mixer.update(dt); dragonShowLayer(alt.D, show.t, airOpen * HERO_JAW); }   // (v17: su clip y su capa por código; v18: sin acumular)
  // plataforma: arrastre con inercia; sola, gira despacio
  if (!show.drag) { show.vel *= Math.exp(-dt * 2.5); show.idle += dt; if (show.idle > 3) show.vel += (0.18 - show.vel) * (1 - Math.exp(-dt * 0.8)); }
  show.yaw += show.vel * dt; show.table.rotation.y = show.yaw;
  // cámara con un leve vaivén
  const d = show.dist * show.zoom, el = 0.2 + Math.sin(show.t * 0.23) * 0.02;
  const ty = show.target.y * lerp(0.7, 1, smooth(SHOW_ZOOM[0], 0.7, show.zoom));    // de cerca, un poco más abajo
  show.cam.position.set(Math.sin(show.t * 0.11) * d * 0.05, ty + Math.sin(el) * d, Math.cos(el) * d);
  show.cam.lookAt(show.target.x, ty, show.target.z);
  if (show.cam.aspect !== innerWidth / innerHeight) { show.cam.aspect = innerWidth / innerHeight; show.cam.updateProjectionMatrix(); }
  // aliento: mientras la boca está abierta (hueso Jaw1) en los clips de ataque
  const jaw = hero.B.Jaw1, rest = hero.rest.get(jaw), open = jaw && rest ? jaw.quaternion.angleTo(rest) : 0;
  const breath = show.own ? airOpen > 0.6 : show.curName === 'fuego' && open > 0.33, roar = show.curName === 'rugido' && open > 0.33;
  if (breath && !show.breathing) sfx.fire(0.9);
  if (roar && !show.roaring) sfx.roar(0.9);
  show.breathing = breath; show.roaring = roar;
  if (breath) {
    dragonHead().getWorldPosition(_sv); heroMouth(_sv2);   // (v16: la boca del dragón elegido)
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
const AIR_FIRE = 2.6;                                      // (s) llamarada de prueba de los que flotan
document.getElementById('fireTry').addEventListener('click', () => { if (state !== 'select') return; if (show.own) show.airFire = AIR_FIRE; else playShow('fuego', 0.3); });   // ver el aliento sin esperar al azar
for (const b of document.querySelectorAll('#selDragons button')) b.addEventListener('click', () => chooseDragon(b.dataset.id));   // v16: los dragones (v20: cuatro)
syncPickers();                                             // (v24: los botones y las stats, al cargar las stats: applyStats, 7c)
/* Clic derecho mantenido: girar la plataforma. Rueda: acercar. */
window.addEventListener('mousedown', e => { if (e.button === 2 && state === 'select') { show.drag = true; show.lastX = e.clientX; show.lastT = performance.now(); show.vel = 0; canvasGL.style.cursor = 'grabbing'; } });
window.addEventListener('mousemove', e => {
  if (!show.drag) return;
  const now = performance.now(), dx = e.clientX - show.lastX, dtm = Math.max((now - show.lastT) / 1000, 1 / 240);
  show.yaw += dx * 0.008; show.vel = show.vel * 0.5 + dx * 0.008 / dtm * 0.5; show.lastX = e.clientX; show.lastT = now; show.idle = 0;
});
window.addEventListener('mouseup', e => { if (e.button === 2 && show.drag) { show.drag = false; show.idle = 0; if (state === 'select') canvasGL.style.cursor = 'grab'; } });
const SHOW_ZOOM = [0.22, 1.6];                            // acercar / alejar con la rueda (fracción de la distancia de encuadre)
window.addEventListener('wheel', e => { if (state === 'select') show.zoom = clamp(show.zoom * Math.exp(e.deltaY * 0.001), SHOW_ZOOM[0], SHOW_ZOOM[1]); }, { passive: true });

