/* Grabador de los vídeos del tutorial de Sky Apex (herramienta: el juego no carga este archivo).
   Cada sección del tutorial se graba con el propio motor del juego: una escena preparada (posición, cámara, enemigos «títere» con trayectoria
   fija, torres), entradas por guion (teclas y ratón enviados como eventos reales al juego), simulación a paso fijo y, en cada fotograma,
   el mundo + el HUD + los avisos de pantalla (toast, #warn, viñeta, «Has caído») + las teclas pulsadas dibujadas abajo en el centro.
   Se codifica en VP9 con WebCodecs (1024×576, 30 fps) y se empaqueta en WebM aquí mismo; herramientas/servidor_tutorial.mjs lo guarda en
   tutorial/<id>.webm (el juego busca ahí los vídeos).
   Uso (navegador integrado de la app o Chrome):
     1. preview_start «grabador-tutorial» (= node herramientas/servidor_tutorial.mjs, puerto 8766) y abrir
        http://localhost:8766/fuentes/sky_apex.src.html?semilla=777   (semilla fija: siempre el mismo mundo)
     2. Cargar este script y preparar:
        await new Promise(r => { const s = document.createElement('script'); s.src = '../herramientas/grabar_tutorial.js?v=' + Date.now(); s.onload = r; document.head.appendChild(s); });
        await REC.prepare();
     3. await REC.peek('boost', [0, 2, 4, 6])  → hoja de 4 fotogramas en pantalla (para revisar una escena)
        await REC.record('boost')            → graba y guarda tutorial/boost.webm      ·   await REC.recordAll()
   Las escenas están en SCENES (abajo). Entradas: keys [código, desde, hasta], clicks [botón, desde, hasta], moves [desde, hasta, dx, dy] (píxeles
   de ratón, como con el puntero bloqueado), show = mandos que se dibujan, each(t, S) para lo demás.
   v35 (puesto al día con el juego de la v34): prepare pasa la pantalla de carga y quita la entrada de cine; place y clearWorld reinician lo
   nuevo (armadura, vuelo recto, esquiva, unidades, dirigibles, aliados, quemaduras, radio, área, objetivos); teclas de la v26/v32 (Ctrl, X,
   A, D, R, Intro); se dibujan también la radio y el aviso del área; 29 escenas (las nuevas: esquiva, dirigibles, superdirigible, sierpe,
   artillería, batallones, barcos, escuadron, misiones). Los rumbos con enemigos dejan el sol a la espalda; artillería y batallones van en
   llanos sin árboles y con cámara exterior alta (en la del jinete, la cabeza del dragón tapa el blanco). Las escenas con valores que dependen
   del Excel (vida de los dragones, daño de la guiada y de la llamarada) ponen a los títeres ya tocados para que se vea el derribo. */
(() => {
  'use strict';
  const CSS_W = 1024, CSS_H = 576, PR = 1, OUT_W = 1024, OUT_H = 576, FPS = 30, SUB = 2, DT = 1 / (FPS * SUB);   // ventana de 1024×576 (el HUD cabe sin solaparse)
  const REC = window.REC = { log: [] };
  const orig = window.__RECorig || (window.__RECorig = {});   // originales del juego (sobreviven si se vuelve a cargar este script)
  let S = null;                                           // escena en curso
  const comp = document.createElement('canvas'); comp.width = OUT_W; comp.height = OUT_H; REC.comp = comp;
  const cx = comp.getContext('2d');
  const yieldNow = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  const log = (...a) => { const m = a.join(' '); REC.log.push(m); console.log('[REC]', m); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- Preparación: partida en marcha, ventana fija de 800×450 (×1,2), sin sonido, bucle del juego parado ---------- */
  REC.prepare = async function () {
    for (let i = 0; i < 600 && !(hero.ready && rider.ready && knight.ready); i++) await new Promise(r => setTimeout(r, 50));
    if (!hero.ready) throw new Error('el dragón no ha cargado');
    await document.fonts.load("700 20px 'Cinzel'"); await document.fonts.load("13px 'Share Tech Mono'");
    if (!orig.frame) {
      orig.frame = frame; orig.toast = toast; orig.think = thinkEnemy; orig.steer = steerEnemy; orig.random = Math.random;
      for (const k of ['innerWidth', 'innerHeight', 'devicePixelRatio']) orig[k] = Object.getOwnPropertyDescriptor(window, k);
    }
    frame = function (now) { requestAnimationFrame(frame); };     // el bucle del juego deja de avanzar (lo movemos nosotros)
    Object.defineProperty(window, 'innerWidth', { get: () => CSS_W, configurable: true });
    Object.defineProperty(window, 'innerHeight', { get: () => CSS_H, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { get: () => PR, configurable: true });
    renderer.setPixelRatio(PR); onResize();
    toast = msg => { if (S) S.toasts.push({ msg, t: gameTime }); };
    thinkEnemy = function (e, dt, playing) {
      if (!e.rec) return orig.think(e, dt, playing);
      e.t += dt; e.fireCool -= dt; e.alert -= dt; e.ramT -= dt; e.mode = e.rec.mode || 'patrol';
      return e.rec.speed;
    };
    steerEnemy = function (e, tSpeed, dt) {
      if (!e.rec) return orig.steer(e, tSpeed, dt);
      const r = e.rec;
      if (r.turn) rotY(r.dir, r.turn * dt);
      if (r.climb != null) { r.dir.y = r.climb; r.dir.normalize(); }
      e.speed = r.speed; e.vel.copy(r.dir).multiplyScalar(r.speed); e.pos.addScaledVector(e.vel, dt);
      const bank = clamp((r.turn || 0) * 1.6, -0.7, 0.7);
      e.q.setFromRotationMatrix(_m4.lookAt(ZERO, r.dir, UP)).multiply(_hQ.setFromAxisAngle(_zAx, bank));
      e.rate.y = r.turn || 0; e.rate.p = 0; e.rate.r = 0; e.bank = bank;
      if (r.noTrail) resetTrail(e);                         // planos muy cercanos: sin estela (taparía media pantalla)
    };
    intro.phase = 'done'; menuEl.classList.remove('intro', 'wait');
    if (state === 'loading' || state === 'menu') {
      for (let i = 0; i < 2000 && pumpTerrain(40) > 0; i++) { }
      state = 'menu'; goBtn.disabled = false;
      updateTowerStreaming(dragon.position.x, dragon.position.z); updateIslandStreaming(dragon.position.x, dragon.position.z); pumpIslands(4000);
      enterSelect(); leaveSelect(true);                   // → startGame (enemigos, armas, estadísticas)
    }
    for (let i = 0; i < 50000 && state === 'worldgen'; i++) updateWorldGen();   // (v35: desde la v19, startGame puede pasar antes por la pantalla de carga)
    cineEnd(true); missionHideHUD();                      // (v35: sin la entrada de cine de la v26: las escenas empiezan ya en vuelo)
    if (!orig.mission) { orig.mission = mission; orig.objs = MS.objs.map(o => Object.assign({}, o)); }   // objetivos del combate libre (torres y dragones), para volver a ellos
    if (!sfx.muted) sfx.toggleMute(); music.setMuted(true);
    F.lockRequested = false; F.locked = true;
    log('preparado · semilla', SEED, '· estado', state);
    return 'ok';
  };
  const _zAx = new THREE.Vector3(0, 0, 1);
  const SUN_H = Math.atan2(SUN_DIR.x, -SUN_DIR.z);           // rumbo hacia el sol
  REC.restore = function () {
    if (!orig.frame) return;
    frame = orig.frame; toast = orig.toast; thinkEnemy = orig.think; steerEnemy = orig.steer; Math.random = orig.random;
    for (const k of ['innerWidth', 'innerHeight', 'devicePixelRatio']) { if (orig[k]) Object.defineProperty(window, k, orig[k]); else delete window[k]; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); onResize();
    lastT = performance.now(); requestAnimationFrame(frame);
  };

  /* ---------- Escena: colocar al dragón, limpiar el mundo, títeres ---------- */
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  function hideEnemy(e) { e.dead = true; e.rec = null; showEnemy(e, false); e.glow.visible = false; e.respawnT = 1e9; resetTrail(e); e.U.uHit.value = 0; }
  function headingDir(h) { return new THREE.Vector3(Math.sin(h), 0, -Math.cos(h)); }
  function pathY(x, y, z, dir, dist, clear) {              // altura para recorrer el camino sin tocar el terreno ni las islas de esa franja
    for (let d = 0; d <= dist; d += 60) y = Math.max(y, groundAt(x + dir.x * d, z + dir.z * d) + clear);
    for (let k = 0; k < 5; k++) {
      let isl = null;
      for (let d = 0; d <= dist && !isl; d += 60) isl = islandColumn(x + dir.x * d, z + dir.z * d, y - 70, y + 70, 80);
      if (!isl) break; y = isl.yMax + 90;
    }
    return y;
  }
  function genWorld(x, y, z) {
    refreshTerrainSelection(x, y, z, true);
    for (let i = 0; i < 3000 && pumpTerrain(40) > 0; i++) { }
    updateTowerStreaming(x, z); updateIslandStreaming(x, z); pumpIslands(4000);
  }
  /* o: { x, z (o site: torre de TOWER_SITES, con back = metros por delante de ella y side), heading (rad; 0 = norte), agl, y, speed (km/h), throttle,
         third, hover, path (m que hay que recorrer sin chocar: sube si hace falta), ult, msl, shield, ammo } */
  function place(o) {
    let x = o.x, z = o.z, h = o.heading;
    let siteY = null;
    if (o.site) {
      const t = TOWER_SITES.filter(q => !q.isl)[o.site.i];   // (v13: solo las de tierra; las de las islas cambian en cada partida)
      let from = o.site.from, top = -1e9;
      if (from === 'auto') {                                 // la dirección de llegada con el terreno más bajo
        let best = 1e9;
        for (let a = 0; a < 36; a++) {
          const hh = a / 36 * Math.PI * 2, d = headingDir(hh); let tp = -1e9;
          for (let q = 60; q <= o.site.dist + 300; q += 30) tp = Math.max(tp, groundAt(t.x + d.x * q, t.z + d.z * q));
          const sc = tp + 70 * (1 - Math.cos(hh - SUN_H));   // mejor con el sol a la espalda (la torre, iluminada)
          if (sc < best) { best = sc; from = hh; }
        }
      }
      { const d = headingDir(from); for (let q = 60; q <= o.site.dist + 300; q += 30) top = Math.max(top, groundAt(t.x + d.x * q, t.z + d.z * q)); }
      siteY = Math.max(t.y + (o.site.y || 65), top + 45);
      log('  torre', o.site.i, 'llegada', from.toFixed(2), '· terreno máx.', Math.round(top), '· base', Math.round(t.y));
      const away = headingDir(from);                         // de la torre hacia donde empieza el dragón
      x = t.x + away.x * o.site.dist + away.z * (o.site.side || 0); z = t.z + away.z * o.site.dist - away.x * (o.site.side || 0);
      h = Math.atan2(t.x - x, -(t.z - z)) + (o.site.turn || 0);   // turn: la torre queda a un lado (+ = a la derecha)
      S.tower = t;
    }
    const dir = headingDir(h);
    let y = siteY != null ? siteY : o.y != null ? o.y : groundAt(x, z) + (o.agl || 300);
    genWorld(x, y, z);
    if (o.path) { const y2 = pathY(x, y, z, dir, o.path, o.clear || 120); if (y2 > y + 1) { log('  sube', Math.round(y2 - y), 'm para no chocar'); y = y2; } }
    for (let i = 0, s; i < 6 && (s = islandAt(x, y, z, 90)); i++) y = s.yMax + 130;
    dragon.position.set(x, y, z);
    dragon.quaternion.setFromRotationMatrix(_m4.lookAt(ZERO, dir, UP));
    if (o.pitch) dragon.quaternion.multiply(_hQ.setFromAxisAngle(_v.set(1, 0, 0), o.pitch));
    F.aimWorld.copy(dir); if (o.pitch) F.aimWorld.set(0, 0, -1).applyQuaternion(dragon.quaternion);
    F.speed = (o.speed != null ? o.speed : 450) / 3.6; F.throttle = o.throttle != null ? o.throttle : 0.75;
    F.rate.p = F.rate.y = F.rate.r = 0; F.bank = 0; F.sink = 0; F.lookYaw = F.lookPit = 0; F.pdx = F.pdy = 0; dragonVel.copy(dir).multiplyScalar(F.speed);
    F.hover = !!o.hover; F.hoverK = o.hover ? 1 : 0; F.hvy = 0; if (o.hover) F.speed = 0;
    F.boost = 1; F.boostDelay = 0; F.boostExhausted = false; F.boostFx = 0; F.boostKick = F.kickFx = 0; F.boosting = false;
    F.third = !!o.third; F.health = o.health != null ? o.health : heroHpMax(); F.lastHit = -99; F.fireFlash = 0;   // (v24: vida del dragón; v39: sin armadura)
    F.lookVY = F.lookVP = 0; F.tgtCam = F.tgtBack = F.straight = false; F.effort = F.diveT = F.spreadT = 0;   // (v26-v32: vuelo recto, cámara al blanco, aleteo)
    F.steer.set(0, 0, -1); F.prevSpeed = F.speed; F.accS = 0; dragonAnim.camQ = null; dodgeReset();
    if (typeof groundReset === 'function') { groundReset(); bumpReset(); }   // (v44: fuera del modo tierra y del rebote)
    F.aimPt.copy(dir).multiplyScalar(1400).add(dragon.position); cineEnd(true);
    resetWeapons(true);
    if (o.ult != null) { W.ult = o.ult; W.ultFull = o.ult >= 1; }
    if (o.msl != null) W.msl = o.msl;
    if (o.shield != null) W.shCd = W.shCd.map((cd, i) => i < o.shield ? 0 : SHIELD_CD);   // (v39: los demás slots, recién gastados)
    if (o.ammo != null) W.ammo = o.ammo;
    S.base = { x, y, z, dir: dir.clone(), right: new THREE.Vector3(-dir.z, 0, dir.x) };
    return S.base;
  }
  /* Títere: dragón enemigo con trayectoria fija. at = [derecha, arriba, delante] en metros respecto a la posición inicial del jugador;
     dir: 'same' (mismo rumbo), 'toward' (hacia el jugador) o un ángulo de rumbo relativo (rad, + = a la izquierda); speed m/s; turn rad/s. */
  function puppet(o) {
    const e = S.free.shift(); if (!e) throw new Error('sin enemigos libres');
    const B = S.base;
    e.pos.copy(B).set(B.x, B.y, B.z).addScaledVector(B.right, o.at[0]).addScaledVector(B.dir, o.at[2]); e.pos.y += o.at[1];
    let d;
    if (o.dir === 'toward') d = _w.set(B.x, B.y, B.z).sub(e.pos).setY(0).normalize().clone();
    else d = rotY(B.dir.clone(), typeof o.dir === 'number' ? o.dir : 0);
    if (o.climb) { d.y = o.climb; d.normalize(); }
    e.rec = { dir: d, speed: o.speed || 120, turn: o.turn || 0, mode: o.mode || 'patrol', climb: o.climb != null ? o.climb : null, noTrail: o.trail === false };
    e.dead = false; e.hp = o.hp != null ? o.hp : ENEMY_HP; e.hitFlash = 0; e.fireFlash = 0; e.fireCool = 99;
    e.mslCool = o.mslCool != null ? o.mslCool : 1e9; e.mslLock = 0; e.t = 0; e.alert = 0; e.ramT = 0; e.avoidT = 0;
    e.q.setFromRotationMatrix(_m4.lookAt(ZERO, d, UP)); e.speed = e.rec.speed; e.vel.copy(d).multiplyScalar(e.speed);
    resetTrail(e); e.frame = 0; e.animAcc = 0;
    S.puppets.push(e);
    return e;
  }
  function clearWorld() {
    for (let i = fireballs.length - 1; i >= 0; i--) killFireball(i);
    boltsClear();
    for (const P of [fxAdd, fxSmoke]) { P.life.fill(0); P.size.fill(0); }
    for (const e of enemies) hideEnemy(e);
    enemyLock.e = null; enemyState.spawned = ENEMY_TOTAL; enemyState.kills = 0;
    towerState.destroyed.clear(); towerState.kills = 0; towerState.score = 0;
    for (const t of [...towers.values()]) dropTower(t);
    threat.lock = 0; threat.lastLaunch = -99; threat.incoming.length = 0;
    vigAlpha = 0; camShake = 0;                 // (v44: sin boltWarn, que se fue en la v41)
    for (const k in keys) keys[k] = false;
    W.lmb = W.rmb = false;
    for (const k in stats) stats[k] = 0;
    shieldMesh.visible = false;
    // v35: lo que llegó después de la v12: unidades nuevas, dirigibles, aliados, quemaduras, radio, área y objetivos de la misión
    RUN.units = []; planUnits(); unitState.kills = 0;
    for (const a of airships) removeAirshipMesh(a); airships.length = 0; airshipState.kills = 0;
    allyOff(); scorchClear(); if (W.shieldT > 0) { W.shieldT = 0; W.shieldFade = 0; }
    mission = orig.mission || mission; MS.objs = (orig.objs || []).map(o => Object.assign({}, o)); MS.kills = {}; MS.ended = false; MS.endAt = 0;
    MS.out = false; MS.outT = AREA_GRACE; MS.tick = -1; missionHideHUD(); hintHide(); STORY.chatter = false;
  }

  /* ---------- Entradas ---------- */
  function setKey(code, down) {
    if (!!S.down[code] === down) return;
    S.down[code] = down;
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  }
  const BTN = ['L', 'M', 'R'];
  function setBtn(b, down) {
    const k = 'mouse' + BTN[b];
    if (!!S.down[k] === down) return;
    S.down[k] = down;
    if (down) canvasGL.dispatchEvent(new MouseEvent('mousedown', { button: b, bubbles: true }));
    else window.dispatchEvent(new MouseEvent('mouseup', { button: b, bubbles: true }));
  }
  const ease = u => u * u * (3 - 2 * u);
  function applyInputs(t) {
    const sc = S.scene;
    const want = {};
    for (const [code, a, b] of sc.keys || []) if (t >= a && t < b) want[code] = true;
    for (const code of new Set((sc.keys || []).map(k => k[0]))) setKey(code, !!want[code]);
    const bw = {};
    for (const [btn, a, b] of sc.clicks || []) if (t >= a && t < b) bw[btn] = true;
    for (const btn of new Set((sc.clicks || []).map(k => k[0]))) setBtn(btn, !!bw[btn]);
    let mx = 0, my = 0;
    for (const [a, b, dx, dy] of S.moves) {
      if (t + DT <= a || t >= b) continue;
      const u0 = clamp((t - a) / (b - a), 0, 1), u1 = clamp((t + DT - a) / (b - a), 0, 1), k = ease(u1) - ease(u0);
      mx += dx * k; my += dy * k;
    }
    F.pdx += mx; F.pdy += my;
    S.mv.x += (mx / DT - S.mv.x) * 0.25; S.mv.y += (my / DT - S.mv.y) * 0.25;   // para la flecha del ratón (px/s, suavizado)
  }
  /* Apuntar la mira a un punto del mundo (como si el jugador moviera el ratón con precisión). k = suavizado (0-1 por paso). */
  const _ac = new THREE.Vector3(), _ad = new THREE.Vector3();
  function aimAt(p, k) {
    camera.getWorldPosition(_ac);
    _ad.subVectors(p, _ac).normalize();
    F.aimWorld.lerp(_ad, k == null ? 1 : k).normalize();
    S.mv.x += (0 - S.mv.x) * 0.1; S.mv.y += (0 - S.mv.y) * 0.1;
    S.aimed = true;
  }
  function leadPoint(e, out) { heroMouth(_mouth); if (interceptPoint(e, _mouth, out) < 0) out.copy(e.pos); return out; }

  /* ---------- Un paso de simulación (como frame() en partida) ---------- */
  function step(t) {
    if (state === 'paused') { state = 'playing'; pauseEl.hidden = true; }
    F.lockRequested = false; F.locked = true;
    applyInputs(t);
    if (S.scene.each) S.scene.each(t, S, DT);
    gameTime += DT;
    if (state === 'dead') { F.deadT += DT; if (F.deadT > 2.6) respawn(); }
    else if (state === 'playing') { updateAim(DT, false); updateFlight(DT, false); }
    updateWorld(DT);
    if (S.noAA) for (const tw of towers.values()) tw.cool = 1e9;
    for (const e of S.puppets) if (S.ev.has(e) !== e.dead) { S.ev.add(e); if (e.dead) log('  t=' + t.toFixed(2), 'dragón derribado'); }
    for (const u of UNITS) if (u.dead && !S.ev.has(u)) { S.ev.add(u); log('  t=' + t.toFixed(2), (u.label || u.kind) + ' destruido'); }   // (v35: unidades nuevas)
    if (stats.blocked !== S.blocked) { S.blocked = stats.blocked; log('  t=' + t.toFixed(2), 'el escudo para un proyectil'); }
    if (Math.round(F.health) < S.hp - 4) { S.hp = Math.round(F.health); log('  t=' + t.toFixed(2), 'vida', S.hp); }
    if (state !== S.state) { S.state = state; log('  t=' + t.toFixed(2), 'estado', state); }
  }

  /* ---------- Fotograma: mundo + HUD + avisos + mandos ---------- */
  function renderFrame(t) {
    for (let i = 0; i < 6 && pumpTerrain(30) > 0; i++) { }   // sin prisa: el terreno siempre al día
    renderer.render(scene, camera); renderRider(); drawHUD();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    cx.drawImage(canvasGL, 0, 0, OUT_W, OUT_H); cx.drawImage(hudEl, 0, 0, OUT_W, OUT_H);
    cx.setTransform(PR, 0, 0, PR, 0, 0);
    drawDomOverlays();
    drawCallouts(t);
    drawInputs();
  }
  function drawDomOverlays() {
    const W2 = CSS_W, H2 = CSS_H;
    if (vigAlpha > 0.01) {                                   // #vig
      const g = cx.createRadialGradient(W2 / 2, H2 / 2, 0, W2 / 2, H2 / 2, Math.hypot(W2, H2) / 2);
      g.addColorStop(0.45, 'rgba(255,40,20,0)'); g.addColorStop(1, 'rgba(255,40,20,.55)');
      cx.globalAlpha = vigAlpha; cx.fillStyle = g; cx.fillRect(0, 0, W2, H2); cx.globalAlpha = 1;
    }
    const wa = parseFloat(warnEl.style.opacity || '0');      // #warn
    if (wa > 0.01 && warnEl.textContent) {
      cx.save(); cx.globalAlpha = wa; cx.font = "700 18px 'Cinzel'"; cx.letterSpacing = '5.4px'; cx.textAlign = 'center'; cx.textBaseline = 'top';   // 18 px, al 22 % del alto
      cx.fillStyle = warnEl.style.color === 'var(--gold)' ? '#f2b84b' : '#ff4a3a'; cx.shadowColor = 'rgba(255,60,40,.7)'; cx.shadowBlur = 14;
      cx.fillText(warnEl.textContent, W2 / 2 + 2.7, H2 * 0.22); cx.restore();
    }
    for (const tt of S.toasts) {                             // #toast (el último manda)
      const age = gameTime - tt.t; if (age > 2.55 || tt !== S.toasts[S.toasts.length - 1]) continue;
      const a = Math.min(1, age / 0.35, (2.55 - age) / 0.35);
      cx.save(); cx.globalAlpha = clamp(a, 0, 1); cx.font = "700 20px 'Cinzel'"; cx.letterSpacing = '2.8px'; cx.textAlign = 'center'; cx.textBaseline = 'top';
      cx.fillStyle = '#f2b84b'; cx.shadowColor = 'rgba(0,0,0,.8)'; cx.shadowBlur = 12; cx.shadowOffsetY = 2;
      cx.fillText(tt.msg, W2 / 2 + 1.4, 78); cx.restore();
    }
    if (radioEl.classList.contains('on')) drawRadio(W2, H2); // v35: #radio (compañeros y Mando), abajo en el centro
    if (areaEl.classList.contains('on')) {                   // v35: #area (fuera del área de la misión: cuenta atrás)
      cx.save(); cx.textAlign = 'center'; cx.textBaseline = 'top'; cx.fillStyle = '#ff4a3a'; cx.shadowColor = 'rgba(255,60,40,.6)'; cx.shadowBlur = 16;
      const y0 = H2 * 0.29;
      cx.font = "700 21px 'Cinzel'"; cx.letterSpacing = '5px'; cx.fillText('ABANDONANDO EL ÁREA DE LA MISIÓN', W2 / 2 + 2.5, y0);
      cx.font = "700 66px 'Cinzel'"; cx.letterSpacing = '0px'; cx.fillText(areaCountEl.textContent, W2 / 2, y0 + 26);
      cx.shadowBlur = 8; cx.shadowColor = 'rgba(0,0,0,.85)'; cx.font = "13px 'Share Tech Mono'"; cx.letterSpacing = '1.8px'; cx.fillStyle = 'rgba(241,230,211,.9)'; cx.fillText(areaEdgeEl.textContent, W2 / 2 + 0.9, y0 + 98);
      cx.restore();
    }
    if (state === 'dead') {                                  // #dead
      cx.save(); cx.fillStyle = 'rgba(13,10,15,.55)'; cx.fillRect(0, 0, W2, H2);
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = "700 48px 'Cinzel'"; cx.letterSpacing = '3.8px'; cx.fillStyle = '#ff4a3a'; cx.fillText('Has caído', W2 / 2 + 1.9, H2 / 2 - 16);
      cx.font = "12px 'Share Tech Mono'"; cx.letterSpacing = '3.4px'; cx.fillStyle = '#ff7a2e'; cx.fillText(document.getElementById('deadwhy').textContent.toUpperCase(), W2 / 2 + 1.7, H2 / 2 + 26);
      cx.restore();
    }
  }
  /* v35: la caja de la radio como en el CSS (#radio: 364 px de ancho a 1024, 66 px sobre el borde de abajo): icono con la inicial, nombre y texto. */
  function drawRadio(W2, H2) {
    const w = clamp(W2 - 660, 300, 560), pad = 12, tx = 40 + 12, maxW = w - pad * 2 - tx - 3;
    cx.save();
    const words = radioTextEl.textContent.split(/\s+/), lines = []; let cur = '';
    cx.font = "15px 'Share Tech Mono'";
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (cx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
    if (cur) lines.push(cur);
    const h = Math.max(40, 18 + lines.length * 21) + 21, x = (W2 - w) / 2, y = H2 - 66 - h, col = radioIconEl.style.background || '#f2b84b';
    cx.fillStyle = 'rgba(13,10,15,.66)'; cx.fillRect(x, y, w, h);
    cx.strokeStyle = 'rgba(241,230,211,.16)'; cx.lineWidth = 1; cx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    cx.fillStyle = col; cx.fillRect(x, y, 3, h);
    cx.fillRect(x + 3 + pad, y + 10, 40, 40);
    cx.fillStyle = '#140d10'; cx.font = "700 21px 'Cinzel'"; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(radioIconEl.textContent, x + 3 + pad + 20, y + 31);
    cx.textAlign = 'left'; cx.textBaseline = 'top';
    cx.fillStyle = radioNameEl.style.color || col; cx.font = "11px 'Share Tech Mono'"; cx.letterSpacing = '2.6px'; cx.fillText(radioNameEl.textContent.toUpperCase(), x + 3 + pad + tx, y + 11);
    cx.fillStyle = '#f1e6d3'; cx.font = "15px 'Share Tech Mono'"; cx.letterSpacing = '0px';
    lines.forEach((l, i) => cx.fillText(l, x + 3 + pad + tx, y + 29 + i * 21));
    cx.restore();
  }
  /* Recuadros que señalan partes del HUD: [desde, hasta, caja [x, y, w, h] o función(t) → caja, texto] */
  function drawCallouts(t) {
    for (const [a, b, box, label] of S.scene.callouts || []) {
      if (t < a || t > b) continue;
      const r = typeof box === 'function' ? box(t, S) : box; if (!r) continue;
      const k = Math.min(1, (t - a) / 0.25, (b - t) / 0.25), pulse = 0.75 + 0.25 * Math.sin(t * 9);
      cx.save(); cx.globalAlpha = k;
      cx.strokeStyle = '#f2b84b'; cx.lineWidth = 2; cx.shadowColor = 'rgba(242,184,75,.8)'; cx.shadowBlur = 10 * pulse;
      cx.beginPath(); cx.roundRect(r[0], r[1], r[2], r[3], 6); cx.stroke();
      if (label) {
        cx.shadowBlur = 0; cx.font = "13px 'Share Tech Mono'"; cx.letterSpacing = '1.5px';
        const tw = cx.measureText(label).width + 16, above = r[1] > 40, lx = clamp(r[0] + r[2] / 2 - tw / 2, 6, CSS_W - tw - 6), ly = above ? r[1] - 26 : r[1] + r[3] + 6;
        cx.fillStyle = 'rgba(13,10,15,.86)'; cx.beginPath(); cx.roundRect(lx, ly, tw, 20, 3); cx.fill();
        cx.strokeStyle = 'rgba(242,184,75,.7)'; cx.lineWidth = 1; cx.stroke();
        cx.fillStyle = '#f2b84b'; cx.textBaseline = 'middle'; cx.fillText(label, lx + 8, ly + 10.5);
      }
      cx.restore();
    }
  }
  /* Mandos de la escena, abajo en el centro: teclas que se iluminan al pulsarlas y el ratón (botones y flecha de movimiento). */
  const CAP = { KeyW: 'W', KeyS: 'S', KeyQ: 'Q', KeyE: 'E', KeyR: 'R', KeyC: 'C', KeyZ: 'Z', KeyF: 'F', KeyX: 'X', KeyA: 'A', KeyD: 'D', ShiftLeft: 'SHIFT', Space: 'ESPACIO', ControlLeft: 'CTRL', Enter: 'INTRO' };   // (v35: teclas de la v26 y la v32)
  const KEY_W = { Space: 96, ShiftLeft: 64, ControlLeft: 56, Enter: 64 };
  function drawInputs() {
    const show = S.scene.show || []; if (!show.length) return;
    const items = show.map(k => k === 'mouse' ? { k, w: 34 } : { k, w: KEY_W[k] || 34 });
    const gap = 9, total = items.reduce((s, it) => s + it.w, 0) + gap * (items.length - 1), K = 1.35;   // K: escala de los mandos
    cx.save(); cx.translate(CSS_W / 2, S.scene.showTop ? 132 : CSS_H - 71); cx.scale(K, K);           // abajo en el centro, encima de la vida y la armadura (v35: showTop = arriba, si abajo va la radio)
    let x = -total / 2; const y = -46;
    const pad = 8;
    cx.fillStyle = 'rgba(13,10,15,.6)'; cx.beginPath(); cx.roundRect(x - pad, y - pad, total + pad * 2, 40 + pad * 2, 8); cx.fill();
    for (const it of items) {
      if (it.k === 'mouse') { drawMouse(x, y, it.w); x += it.w + gap; continue; }
      const on = !!S.down[it.k];
      const yy = y + 6 + (on ? 1.5 : 0), h = 32;
      cx.fillStyle = on ? 'rgba(255,122,46,.92)' : 'rgba(13,10,15,.78)';
      cx.strokeStyle = on ? '#ffc08a' : 'rgba(241,230,211,.5)'; cx.lineWidth = 1.2;
      if (on) { cx.shadowColor = 'rgba(255,122,46,.9)'; cx.shadowBlur = 14; }
      cx.beginPath(); cx.roundRect(x, yy, it.w, h, 5); cx.fill(); cx.shadowBlur = 0; cx.stroke();
      if (!on) { cx.fillStyle = 'rgba(241,230,211,.18)'; cx.fillRect(x + 4, yy + h - 3, it.w - 8, 1.5); }
      cx.font = (CAP[it.k].length > 1 ? '12px' : '15px') + " 'Share Tech Mono'"; cx.letterSpacing = CAP[it.k].length > 1 ? '1.5px' : '0px';
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = on ? '#1a0d06' : '#f1e6d3';
      cx.fillText(CAP[it.k], x + it.w / 2 + (CAP[it.k].length > 1 ? 0.75 : 0), yy + h / 2 + 1);
      x += it.w + gap;
    }
    cx.restore();
  }
  function drawMouse(x, y, w) {
    const mw = 26, mh = 40, mx = x + (w - mw) / 2, my = y, r = 12, split = my + 16;
    const L = !!S.down.mouseL, R = !!S.down.mouseR, M = !!S.down.mouseM;
    cx.save();
    cx.beginPath(); cx.roundRect(mx, my, mw, mh, r); cx.fillStyle = 'rgba(13,10,15,.78)'; cx.fill();
    cx.save(); cx.clip();
    cx.fillStyle = 'rgba(255,122,46,.95)';
    if (L) cx.fillRect(mx, my, mw / 2, split - my);
    if (R) cx.fillRect(mx + mw / 2, my, mw / 2, split - my);
    cx.restore();
    cx.strokeStyle = 'rgba(241,230,211,.6)'; cx.lineWidth = 1.2; cx.beginPath(); cx.roundRect(mx, my, mw, mh, r); cx.stroke();
    cx.beginPath(); cx.moveTo(mx, split); cx.lineTo(mx + mw, split); cx.moveTo(mx + mw / 2, my); cx.lineTo(mx + mw / 2, split); cx.stroke();
    cx.fillStyle = M ? '#ff7a2e' : 'rgba(241,230,211,.55)'; cx.beginPath(); cx.roundRect(mx + mw / 2 - 2.5, my + 5, 5, 8, 2.5); cx.fill();
    if (L || R || M) { cx.shadowColor = 'rgba(255,122,46,.9)'; cx.shadowBlur = 12; cx.strokeStyle = '#ffc08a'; cx.beginPath(); cx.roundRect(mx, my, mw, mh, r); cx.stroke(); cx.shadowBlur = 0; }
    // flecha de movimiento: hacia donde se mueve el ratón
    const sp = Math.hypot(S.mv.x, S.mv.y);
    if (sp > 40) {
      const a = clamp((sp - 40) / 260, 0, 1), dx = S.mv.x / sp, dy = S.mv.y / sp, c0x = mx + mw / 2, c0y = my + mh / 2;
      const r0 = 27, r1 = r0 + 6 + 12 * a;
      cx.globalAlpha = 0.45 + 0.55 * a; cx.strokeStyle = '#ff7a2e'; cx.fillStyle = '#ff7a2e'; cx.lineWidth = 2.6; cx.lineCap = 'round';
      cx.beginPath(); cx.moveTo(c0x + dx * r0, c0y + dy * r0); cx.lineTo(c0x + dx * r1, c0y + dy * r1); cx.stroke();
      const hx = c0x + dx * (r1 + 5), hy = c0y + dy * (r1 + 5);
      cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(hx - dx * 9 - dy * 6, hy - dy * 9 + dx * 6); cx.lineTo(hx - dx * 9 + dy * 6, hy - dy * 9 - dx * 6); cx.closePath(); cx.fill();
    }
    cx.restore();
  }

  /* ---------- Correr una escena ---------- */
  function begin(id) {
    const scene = SCENES[id]; if (!scene) throw new Error('no existe la escena ' + id);
    S = { id, scene, down: {}, toasts: [], mv: { x: 0, y: 0 }, puppets: [], free: [], ev: new Set(), noAA: scene.aa !== true, aimed: false, moves: (scene.moves || []).slice(),
      blocked: 0, hp: 100, state: 'playing', cam: HERO_CAM.slice() };
    if (scene.cam) for (let i = 0; i < 3; i++) if (scene.cam[i] != null) HERO_CAM[i] = scene.cam[i];   // cámara de 3ª persona más lejos (solo en el vídeo)
    Math.random = mulberry(scene.seed || 1234);
    if (state !== 'playing') { deadEl.hidden = true; state = 'playing'; }
    clearWorld();
    while (enemies.length < ENEMY_COUNT) enemies.push(makeEnemy());
    S.free = enemies.slice();
    place(scene.place);
    if (scene.setup) scene.setup(S, { puppet, aimAt, leadPoint });
    log(id + ':', 'inicio en', Math.round(S.base.x), Math.round(S.base.y), Math.round(S.base.z), '· suelo', Math.round(groundAt(S.base.x, S.base.z)));
    const pre = scene.pre != null ? scene.pre : 1.2;
    for (let t = -pre; t < 0; t += DT) step(t);
    return scene;
  }
  function end() {
    for (let i = 0; i < 3; i++) HERO_CAM[i] = S.cam[i];
    for (const k in S.down) if (S.down[k]) { if (k.startsWith('mouse')) setBtn(BTN.indexOf(k.slice(5)), false); else setKey(k, false); }
    Math.random = orig.random;
    log('  fin · vida', Math.round(F.health), '· estado', state, '· velocidad', Math.round(F.speed * 3.6), 'km/h');
  }
  REC.scene = id => SCENES[id];
  REC.list = () => Object.keys(SCENES);

  /* Hoja de fotogramas para revisar una escena (2 columnas, a media resolución), en un <img> fijo encima de la página. */
  REC.peek = async function (id, times, cols) {
    const scene = begin(id); times = times || [0, scene.dur * 0.33, scene.dur * 0.66, scene.dur - 0.1]; cols = cols || 2;
    const rows = Math.ceil(times.length / cols), tw = OUT_W / 2, th = OUT_H / 2;
    const sheet = document.createElement('canvas'); sheet.width = tw * cols; sheet.height = th * rows;
    const g = sheet.getContext('2d'); g.font = '16px monospace';
    let k = 0; const tEnd = Math.max(...times);
    for (let f = 0, t = 0; t <= tEnd + 1e-6; f++, t = f / FPS) {
      for (let s = 0; s < SUB; s++) step(t + s * DT);
      for (let i = 0; i < 6 && pumpTerrain(30) > 0; i++) { }
      if (k < times.length && t + 1e-6 >= times[k]) {
        renderFrame(t);
        const i = k, X = (i % cols) * tw, Y = Math.floor(i / cols) * th;
        g.drawImage(comp, X, Y, tw, th); g.fillStyle = '#000'; g.fillRect(X, Y, 70, 22); g.fillStyle = '#ff0'; g.fillText('t=' + times[i].toFixed(1), X + 4, Y + 16);
        k++;
      }
      if (f % 30 === 29) await yieldNow();
    }
    end();
    REC.show(sheet.toDataURL('image/jpeg', 0.9));
    return REC.log.slice(-12).join('\n');
  };
  /* Un fotograma a tamaño real (para revisar detalles). */
  REC.frame = async function (id, t) {
    const scene = begin(id);
    for (let f = 0, tt = 0; tt <= t + 1e-6; f++, tt = f / FPS) { for (let s = 0; s < SUB; s++) step(tt + s * DT); for (let i = 0; i < 6 && pumpTerrain(30) > 0; i++) { } if (f % 30 === 29) await yieldNow(); }
    renderFrame(t); end(); REC.show(comp.toDataURL('image/jpeg', 0.92));
    return REC.log.slice(-8).join('\n');
  };
  REC.show = function (src) {
    let im = document.getElementById('recPeek');
    if (!im) { im = document.createElement('img'); im.id = 'recPeek'; im.style.cssText = 'position:fixed;left:0;top:0;object-fit:contain;z-index:99;background:#000'; document.body.appendChild(im); }
    im.style.width = '780px'; im.style.height = '585px'; im.src = src; im.hidden = false;   // (v35: tamaño fijo: con innerWidth fijado a 1024, el panel del navegador recortaba la vista)
  };
  REC.hide = () => { const im = document.getElementById('recPeek'); if (im) im.hidden = true; };

  /* Grabar: VP9 a 1024×576 y 30 fps, fotograma clave cada 2 s; WebM hecho aquí (muxWebM) y subido al servidor. */
  REC.record = async function (id, opts) {
    opts = opts || {};
    const scene = begin(id), n = Math.round(scene.dur * FPS), chunks = [];
    let err = null;
    const enc = new VideoEncoder({ output: (ch) => { const b = new Uint8Array(ch.byteLength); ch.copyTo(b); chunks.push({ data: b, ts: Math.round(ch.timestamp / 1000), key: ch.type === 'key' }); }, error: e => { err = e; } });
    enc.configure({ codec: 'vp09.00.31.08', width: OUT_W, height: OUT_H, bitrate: opts.bitrate || 1800000, framerate: FPS, latencyMode: 'quality' });
    const t0 = performance.now();
    for (let f = 0; f < n; f++) {
      const t = f / FPS;
      for (let s = 0; s < SUB; s++) step(t + s * DT);
      renderFrame(t);
      const vf = new VideoFrame(comp, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      while (enc.encodeQueueSize > 3) await yieldNow();
      if (err) throw err;
    }
    await enc.flush(); enc.close();
    end();
    const webm = muxWebM(chunks, OUT_W, OUT_H, n * 1000 / FPS);
    const res = await fetch('/tutorial/' + id + '.webm', { method: 'PUT', body: webm });
    const msg = id + '.webm: ' + (webm.length / 1e6).toFixed(2) + ' MB, ' + n + ' fotogramas, ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s · ' + (res.ok ? 'guardado' : 'ERROR ' + res.status);
    log(msg); return msg;
  };
  REC.recordAll = async function (ids) {
    const out = [];
    for (const id of ids || Object.keys(SCENES)) out.push(await REC.record(id));
    return out.join('\n');
  };

  /* ---------- WebM mínimo (EBML): cabecera, SeekHead, Info (duración), Tracks (VP9), Clusters (uno por fotograma clave) y Cues ---------- */
  function muxWebM(frames, w, h, durMs) {
    const enc = new TextEncoder();
    const cat = parts => { let n = 0; for (const p of parts) n += p.length; const o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
    const uint = n => { const b = []; do { b.unshift(n % 256); n = Math.floor(n / 256); } while (n > 0); return new Uint8Array(b); };
    const u4 = n => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
    const f64 = x => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; };
    const size = n => { let len = 1; while (n >= Math.pow(2, 7 * len) - 1) len++; const o = new Uint8Array(len); let v = n; for (let i = len - 1; i >= 0; i--) { o[i] = v % 256; v = Math.floor(v / 256); } o[0] |= 1 << (8 - len); return o; };
    const el = (id, data) => { const d = Array.isArray(data) ? cat(data) : data; return cat([uint(id), size(d.length), d]); };
    const ebml = el(0x1A45DFA3, [el(0x4286, uint(1)), el(0x42F7, uint(1)), el(0x42F2, uint(4)), el(0x42F3, uint(8)), el(0x4282, enc.encode('webm')), el(0x4287, uint(4)), el(0x4285, uint(2))]);
    const info = el(0x1549A966, [el(0x2AD7B1, uint(1000000)), el(0x4D80, enc.encode('SkyApex')), el(0x5741, enc.encode('SkyApex grabar_tutorial')), el(0x4489, f64(durMs))]);
    const tracks = el(0x1654AE6B, [el(0xAE, [el(0xD7, uint(1)), el(0x73C5, uint(1)), el(0x83, uint(1)), el(0x9C, uint(0)), el(0x86, enc.encode('V_VP9')),
      el(0x23E383, uint(Math.round(1e9 / FPS))), el(0xE0, [el(0xB0, uint(w)), el(0xBA, uint(h))])])]);
    const clusters = []; let cur = null;
    for (const f of frames) {
      if (f.key || !cur || f.ts - cur.ts > 30000) { cur = { ts: f.ts, blocks: [] }; clusters.push(cur); }
      const rel = f.ts - cur.ts;
      cur.blocks.push(el(0xA3, cat([new Uint8Array([0x81, (rel >> 8) & 255, rel & 255, f.key ? 0x80 : 0]), f.data])));
    }
    const clEls = clusters.map(c => el(0x1F43B675, [el(0xE7, uint(c.ts)), ...c.blocks]));
    const seekEntry = (id, pos) => el(0x4DBB, [el(0x53AB, uint(id)), el(0x53AC, u4(pos))]);
    const seekLen = el(0x114D9B74, [seekEntry(0x1549A966, 0), seekEntry(0x1654AE6B, 0), seekEntry(0x1C53BB6B, 0)]).length;
    let off = seekLen + info.length + tracks.length; const pos = [];
    for (const c of clEls) { pos.push(off); off += c.length; }
    const cues = el(0x1C53BB6B, clusters.map((c, i) => el(0xBB, [el(0xB3, uint(c.ts)), el(0xB7, [el(0xF7, uint(1)), el(0xF1, uint(pos[i]))])])));
    const seek = el(0x114D9B74, [seekEntry(0x1549A966, seekLen), seekEntry(0x1654AE6B, seekLen + info.length), seekEntry(0x1C53BB6B, off)]);
    return cat([ebml, el(0x18538067, [seek, info, tracks, ...clEls, cues])]);
  }

  /* ---------- Escenas (una por sección del tutorial) ----------
     place: dónde empieza el dragón (ver place); pre: segundos de simulación antes de grabar (para que se asienten cámara y animación);
     dur: duración del vídeo. Torres: site.i = índice en TOWER_SITES. */
  const H0 = () => Math.atan2(START.dir.x, -START.dir.z);       // rumbo del punto de partida
  const towerBox = S => { const t = S.tower, p = {}; camera.getWorldPosition(_camP); return proj(t.x, t.y + TOWER_CRYSTAL_Y, t.z, p) ? [p.x - 26, p.y - 30, 52, 60] : null; };
  const aimBox = () => { const a = {}; camera.getWorldPosition(_camP); return proj(_camP.x + F.aimWorld.x * 1000, _camP.y + F.aimWorld.y * 1000, _camP.z + F.aimWorld.z * 1000, a) ? [a.x - 30, a.y + 25, 60, 22] : null; };
  /* v35: ayudantes de las escenas nuevas. rel: punto a r m a la derecha y f m por delante del inicio; hdg: rumbo del inicio en grados (el de
     las recetas); ptBox: recuadro de w × h px alrededor de un punto del mundo (si se ve); hold: lista de clics seguidos (fuego rápido). */
  const rel = (B, r, f) => ({ x: B.x + B.right.x * r + B.dir.x * f, z: B.z + B.right.z * r + B.dir.z * f });
  const hdg = B => Math.atan2(B.dir.x, -B.dir.z) * 180 / Math.PI;
  const ptBox = (p, w, h, dy) => { const a = {}; camera.getWorldPosition(_camP); return p && proj(p.x, p.y, p.z, a) && a.x > 0 && a.x < CSS_W && a.y > 0 && a.y < CSS_H ? [a.x - w / 2, a.y - h / 2 + (dy || 0), w, h] : null; };
  const noseBox = (w, h) => { camera.getWorldPosition(_camP); const f = _w.set(0, 0, -1).applyQuaternion(dragon.quaternion); return ptBox(_v.copy(_camP).addScaledVector(f, 1000), w, h, -10); };   // el marcador del morro
  const sizePx = (p, m) => { camera.getWorldPosition(_camP); return m * CSS_H / (2 * Math.max(1, p.distanceTo(_camP)) * Math.tan(camera.fov * Math.PI / 360)); };   // m metros a esa distancia, en px
  const taps = (a, b, gap, btn) => { const c = []; for (let t = a; t < b; t += gap) c.push([btn || 0, t, t + 0.06]); return c; };
  const nearestAlive = (list, P) => { let best = null, bd = 1e9; for (const u of list) if (!u.dead) { const d = u.pos.distanceTo(P); if (d < bd) { bd = d; best = u; } } return best; };
  /* Recuadros del HUD a 1024×576 (medidos en los fotogramas de la v35) */
  const BOX = { speed: [16, 232, 156, 106], boost: [16, 336, 156, 56], left: [16, 216, 156, 176], alt: [850, 232, 162, 132], agl: [850, 300, 162, 70],
    compass: [246, 8, 532, 76], objs: [790, 16, 222, 74], radar: [16, 392, 158, 182], weapons: [650, 358, 362, 200], ammo: [650, 376, 362, 42],
    msl: [650, 418, 362, 42], ult: [650, 502, 362, 44], health: [352, 508, 320, 60] };
  /* v35: las escenas con enemigos van con rumbo de ~3,5-3,8 rad (el sol, a 0,6, queda a la espalda: si no, salen a contraluz). */
  const SCENES = {
    direccion: {
      place: { x: 0, z: 0, heading: 0, agl: 380, speed: 430, throttle: 0.7, path: 4500 }, dur: 11, show: ['mouse', 'Space'],
      keys: [['Space', 6.6, 10.6]],
      moves: [[0.6, 1.3, 230, 0], [2.6, 3.6, -460, 0], [4.6, 5.2, 230, -60], [7.2, 8.0, 380, 60], [8.6, 9.6, -560, 0]],   // con Espacio: la mira se mueve y el dragón sigue recto
      callouts: [[7.0, 10.6, () => noseBox(150, 44), 'VUELO RECTO']]
    },
    alabeo: {
      place: { x: 0, z: 0, heading: 3.3, agl: 420, speed: 420, throttle: 0.7, third: true, path: 3500 }, dur: 8, show: ['KeyQ', 'KeyE', 'KeyX'],
      keys: [['KeyE', 0.7, 1.35], ['KeyQ', 2.4, 3.65], ['KeyX', 4.8, 6.6]]
    },
    esquiva: {
      place: { x: 0, z: 0, heading: 3.3, agl: 420, speed: 420, throttle: 0.7, third: true, path: 3500 }, dur: 8, show: ['KeyA', 'KeyD'],
      keys: [['KeyD', 1.0, 1.12], ['KeyA', 4.4, 4.52]]
    },
    hover: {
      place: { x: 0, z: 0, heading: 3.9, agl: 160, speed: 320, throttle: 0.6, third: true, path: 1500 }, dur: 9.5, show: ['ControlLeft', 'KeyW', 'KeyS'],
      keys: [['ControlLeft', 0.8, 0.95], ['KeyW', 3.4, 5.0], ['KeyS', 5.6, 6.9], ['ControlLeft', 7.8, 7.95]]
    },
    tierra: {                                                // v44: en hover sobre el llano de la artillería (sin árboles): baja y aterriza, anda, gira, llamarada y despega
      place: { x: -378, z: -458, heading: 3.8, agl: 9, speed: 0, hover: true, third: true }, dur: 14, show: ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'mouse'],
      keys: [['KeyS', 0.5, 2.0], ['KeyW', 3.6, 6.4], ['KeyA', 6.6, 7.8], ['Space', 11.6, 11.75]],
      clicks: [[2, 8.4, 10.8]],
      each(t, S) { if (t > 8.2 && t < 11) { const p = dragon.position; aimAt(_v.set(p.x, p.y, p.z).addScaledVector(_w.set(0, 0, -1).applyQuaternion(dragon.quaternion), 60).setY(groundAt(p.x, p.z)), 0.3); } }
    },
    camara: {
      place: { x: 0, z: 0, heading: 0.6, agl: 350, speed: 380, throttle: 0.6, path: 4000 }, dur: 12, show: ['KeyC', 'KeyZ', 'KeyF', 'mouse'], seed: 2,
      keys: [['KeyC', 0.8, 0.95], ['KeyZ', 2.4, 5.4], ['KeyC', 6.4, 6.55], ['KeyF', 8.0, 11.0]], moves: [[2.6, 5.0, 1300, -60]],
      setup(S, A) { S.e1 = A.puppet({ at: [-900, 120, -300], dir: 0.6, speed: 110 }); enemyLock.e = S.e1; }   // fijado, a la izquierda y por detrás: F lo busca
    },
    acelerar: {
      place: { x: 0, z: 0, heading: -0.8, agl: 380, speed: 250, throttle: 0.15, path: 3000 }, dur: 9, show: ['KeyW', 'KeyS'],
      keys: [['KeyW', 0.5, 2.6], ['KeyS', 5.6, 7.6]],
      callouts: [[0.4, 8.6, BOX.speed, 'VELOCIDAD Y ACELERADOR']]
    },
    boost: {
      place: { x: 0, z: 0, heading: 0, agl: 140, speed: 550, throttle: 1, path: 3600, clear: 110 }, dur: 8.5, show: ['ShiftLeft'],
      keys: [['ShiftLeft', 0.9, 4.6]],
      callouts: [[5.0, 8.4, BOX.boost, 'BARRA DE BOOST']]
    },
    picados: {
      place: { x: 0, z: 0, heading: 0.3, agl: 950, speed: 550, throttle: 1, path: 3500 }, dur: 9.5, show: ['mouse'],
      moves: [[0.4, 1.1, 0, -230], [3.2, 3.9, 0, 430], [4.2, 4.9, 0, 340], [7.3, 8.2, 0, -430], [8.4, 9.1, 0, -160]],
      callouts: [[0.3, 9.3, [16, 232, 156, 64], 'VELOCIDAD']]
    },
    fuego: {
      place: { x: 0, z: 0, heading: 0.9, agl: 420, speed: 420, throttle: 0.6, path: 2500 }, dur: 8.5, show: ['mouse'], seed: 7,
      clicks: [[1, 0.5, 0.6], ...taps(0.9, 4.9, 0.19)],
      setup(S, A) { S.e1 = A.puppet({ at: [-330, 20, 480], dir: -1.25, speed: 105 }); },
      each(t, S) { if (!S.e1.dead && t > 0.4) aimAt(t > 0.7 ? leadPoint(S.e1, _v) : S.e1.pos, 0.5); },
      callouts: [[1.0, 7.9, BOX.ammo, 'MUNICIÓN']]
    },
    fijar: {
      place: { x: 0, z: 0, heading: 1.6, agl: 420, speed: 380, throttle: 0.6, path: 2500 }, dur: 9, show: ['mouse'],
      clicks: [[1, 0.9, 1.0], [1, 2.6, 2.7]], moves: [[5.0, 6.2, 560, 0]],
      setup(S, A) { S.e1 = A.puppet({ at: [140, 30, 650], dir: -0.5, speed: 110 }); S.e2 = A.puppet({ at: [-330, -10, 1200], dir: 0.5, speed: 110 }); },
      each(t, S) { if (t < 0.9) aimAt(S.e1.pos, 0.3); }
    },
    guiada: {
      place: { x: 0, z: 0, heading: 2.4, agl: 450, speed: 420, throttle: 0.7, path: 3500 }, dur: 10, show: ['mouse'], seed: 3,
      clicks: [[1, 0.5, 0.6], [0, 1.3, 4.6]],
      setup(S, A) { S.e1 = A.puppet({ at: [-70, 40, 850], dir: 0.25, speed: 95, hp: Math.min(ENEMY_HP, STATS.base.guiado_dano * 0.85) }); },   // (ya tocado: una bola lo derriba; con las stats de Jorge, 60 < 70 de vida)
      each(t, S) { if (!S.e1.dead) aimAt(S.e1.pos, t > 0.9 ? 0.35 : 0.2); }
    },
    llamarada: {
      place: { x: 0, z: 0, heading: -1.9, agl: 430, speed: 360, throttle: 0.36, path: 2500 }, dur: 9, show: ['mouse'], seed: 5,
      clicks: [[2, 0.7, 4.9]],
      setup(S, A) { S.e1 = A.puppet({ at: [0, 4, 105], dir: 0, speed: 100, trail: false, hp: Math.min(ENEMY_HP, STATS.base.llamas_dano * 3) }); },   // (tocado: cae en unos 3 s de llamarada)
      each(t, S) { if (!S.e1.dead) aimAt(S.e1.pos, 0.3); },
      callouts: [[2.4, 8.8, aimBox, 'CALOR']]
    },
    rayo: {
      place: { x: 0, z: 0, heading: 3.7, agl: 500, speed: 380, throttle: 0.6, ult: 1, third: true, path: 3000 }, dur: 8.5, orbit: 1.0, show: ['mouse'], seed: 11,
      clicks: [[0, 1.2, 1.32], [2, 1.2, 1.32]],
      setup(S, A) { S.e1 = A.puppet({ at: [-150, 20, 900], dir: -1.2, speed: 120 }); S.e2 = A.puppet({ at: [250, 60, 1500], dir: 1.0, speed: 120 }); },
      each(t, S) { const e = !S.e1.dead ? S.e1 : !S.e2.dead ? S.e2 : null; if (e) aimAt(e.pos, t > 1.5 ? 0.12 : 0.4); F.lookYaw = (S.scene.orbit || 0) * smooth(1.0, 2.2, t) * (1 - smooth(6.6, 7.8, t)); },   // cámara de lado para ver el rayo entero
      callouts: [[0.0, 1.2, BOX.ult, 'BARRA LLENA']]
    },
    escudo: {
      place: { x: 0, z: 0, heading: 3.5, agl: 420, speed: 380, throttle: 0.6, third: true, path: 2500 }, dur: 9, show: ['KeyR'], seed: 9, cam: [10, 40],
      keys: [['KeyR', 3.0, 3.12]],
      setup(S, A) { S.e1 = A.puppet({ at: [-500, 120, 1700], dir: 'toward', speed: 110 }); },
      each(t, S) {
        if (!S.fired && t >= 0.4) { S.fired = true; const m = enemyMouth(S.e1, new THREE.Vector3()); spawnFireball(m, _w.subVectors(dragon.position, m).normalize(), true, 1, 'emsl'); S.e1.fireFlash = 1; }
      },
      callouts: [[3.2, 8.0, aimBox, 'CARGAS DE ESCUDO']]
    },
    recarga_escudo: {
      place: { x: 0, z: 0, heading: 2.9, agl: 400, speed: 380, throttle: 0.6, shield: 1, path: 2500 }, dur: 7, show: ['mouse'], seed: 4,
      clicks: taps(1.0, 2.6, 0.2),
      setup(S, A) { S.e1 = A.puppet({ at: [10, 10, 260], dir: 0.08, speed: 100, hp: 15, trail: false }); },
      each(t, S) { if (!S.e1.dead) aimAt(leadPoint(S.e1, _v), 0.5); },
      callouts: [[0.2, 6.8, aimBox, 'CARGAS DE ESCUDO']]
    },
    recarga_guiadas: {                                       // v35: la última bola guiada → SIN MUNICIÓN (desde la v25 no se recargan)
      place: { site: { i: 0, from: 'auto', dist: 1500 }, speed: 300, throttle: 0.4, msl: 1 }, dur: 9, show: ['mouse'], seed: 6,
      clicks: [[1, 0.4, 0.5], [0, 0.9, 4.0]],
      each(t, S) { const tw = S.tower; aimAt(_v.set(tw.x, tw.y + 60, tw.z), 0.4); },
      callouts: [[0.6, 8.8, BOX.msl, 'BOLAS GUIADAS']]
    },
    vida: {
      place: { x: 0, z: 0, heading: 4.2, agl: 150, speed: 420, throttle: 0.7, third: true, health: 74 }, dur: 8, show: ['mouse'], pre: 0.8,
      setup() { F.lastHit = gameTime - 3.5; },              // la vida empieza a rellenarse enseguida (v39; antes, la armadura)
      moves: [[4.2, 5.0, 0, 200], [6.4, 7.2, 0, -200]],
      callouts: [[0.0, 4.0, BOX.health, 'VIDA Y ARMADURA'], [4.2, 7.8, BOX.agl, 'SOBRE EL SUELO']]
    },
    dragones: {
      place: { x: 0, z: 0, heading: -0.4, agl: 420, speed: 360, throttle: 0.6, path: 3000 }, dur: 9, show: [], seed: 8,
      setup(S, A) { S.e1 = A.puppet({ at: [70, 14, 1500], dir: Math.PI, speed: 85, mode: 'pass' }); S.e2 = A.puppet({ at: [-1600, 260, 2600], dir: -1.45, speed: 130 }); },
      each(t, S) {
        for (const at of [3.6, 4.3, 5.0]) if (!S['f' + at] && t >= at) {
          S['f' + at] = true; const m = enemyMouth(S.e1, new THREE.Vector3());
          spawnFireball(m, _w.subVectors(dragon.position, m).normalize().add(_v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.012)).normalize(), true, 1);
          S.e1.fireFlash = 1;
        }
      }
    },
    misiles_enemigos: {
      place: { x: 0, z: 0, heading: -1.2, agl: 480, speed: 420, throttle: 0.8, path: 3500 }, dur: 11, show: ['mouse'], seed: 12, pre: 0.3, breakAt: 700, breakMoves: [[0, 0.6, 620, 120], [0.7, 1.3, 480, 0], [2.4, 3.4, -300, -100]],   // (probado: rompiendo a 450-550 m la bola acierta; a 700, pasa de largo)
      setup(S, A) { S.e1 = A.puppet({ at: [350, 80, 2050], dir: 'toward', speed: 90, mode: 'pass', mslCool: 0 }); },
      each(t, S) {                                         // giro fuerte cuando la bola está a ~700 m: pasa de largo
        const m = fireballs.find(f => f.kind === 'emsl');
        if (m && !S.broke && m.pos.distanceTo(dragon.position) < (S.scene.breakAt || 550)) { S.broke = t; for (const [a, b, dx, dy] of S.scene.breakMoves) S.moves.push([t + a, t + b, dx, dy]); log('  t=' + t.toFixed(2), 'rompe; bola a', Math.round(m.pos.distanceTo(dragon.position)), 'm'); }
        if (m && !S.launched) { S.launched = t; log('  t=' + t.toFixed(2), 'lanzan la bola a', Math.round(m.pos.distanceTo(dragon.position)), 'm'); }
        if (S.launched && !m && !S.gone) { S.gone = t; log('  t=' + t.toFixed(2), 'la bola desaparece · vida', Math.round(F.health)); }
      }
    },
    dirigibles: {                                            // v35: de costado dispara; la escena acaba antes de llegar al casco
      place: { x: 0, z: 0, heading: 3.6, agl: 520, speed: 300, throttle: 0.45, path: 2000 }, dur: 9, show: ['mouse'], seed: 21,
      setup(S) { const B = S.base, p = rel(B, 200, 1050); S.a = addAirship('REC', p.x, p.z, B.y - Math.max(groundAt(p.x, p.z), WL) + 30, hdg(B) + 90, []); },
      each(t, S) { aimAt(S.a.pos, 0.15); },
      callouts: [[1.0, 8.6, () => { const w = sizePx(S.a.pos, AIRSHIP_LEN) * 1.1 + 24; return ptBox(S.a.pos, w, w * 0.42 + 16, 0); }, 'SOLO DISPARAN POR LOS COSTADOS']]
    },
    superdirigible: {                                        // v35: el núcleo y luego una torreta (dos clics sin mover la mira)
      place: { x: 0, z: 0, heading: 3.8, agl: 1600, speed: 360, throttle: 0.5 }, dur: 11, show: ['mouse'], seed: 22,
      clicks: [[1, 3.4, 3.5], [1, 5.6, 5.7]],
      setup(S) { const B = S.base, p = rel(B, 300, 1650); S.u = addSuper(p.x, p.z, B.y - groundAt(p.x, p.z) - 60, hdg(B) + 70, []); },
      each(t, S) { aimAt(S.u.bc, 0.12); },
      callouts: [[0.6, 3.2, () => { const a = {}; camera.getWorldPosition(_camP); return proj(S.u.bc.x, S.u.bc.y - S.u.size * 0.06, S.u.bc.z, a) ? [a.x - 125, a.y + 12, 250, 40] : null; }, 'NÚCLEO Y TORRETAS']]
    },
    sierpe: {                                                // v35: en hover junto a ella: los disparos rebotan en el escudo; luego, fuego rápido a un hechicero (al torso: a los pies, los disparos dan en el lomo)
      place: { x: 0, z: 0, heading: 3.5, agl: 1900, speed: 0, hover: true }, dur: 11.5, show: ['mouse'], seed: 23,
      clicks: [...taps(0.8, 2.4, 0.2), [1, 4.3, 4.4], ...taps(4.8, 8.9, 0.19)],
      setup(S) { const B = S.base, p = rel(B, -120, 520); S.u = addSierpe(p.x, p.z, B.y - groundAt(p.x, p.z) - 70, hdg(B) + 75, [], 'idle'); },
      each(t, S) { const u = S.u, k = S.k || u.kids.find(x => !x.dead); if (t < 3.9 || !k || k.dead) aimAt(u.aimAt, 0.15); else { S.k = k; aimAt(_v.copy(k.pos).setY(k.pos.y + 7), 0.2); } }   // (al torso: a los pies, el disparo da en el lomo)
    },
    torres: {
      place: { site: { i: 1, from: 'auto', dist: 1600, y: 90 }, speed: 380, throttle: 0.6 }, dur: 9.5, show: ['mouse'], aa: true, seed: 13,
      clicks: taps(5.0, 7.6, 0.17),
      each(t, S) { const tw = S.tower; aimAt(_v.set(tw.x, tw.y + 100, tw.z), 0.25); },
      callouts: [[0.3, 2.6, (t, s) => towerBox(s), 'CRISTAL MORADO'], [3.0, 5.0, BOX.health, 'VIDA']]
    },
    artilleria: {                                            // v35: en hover delante de una línea de tres, en un llano sin árboles (-500, -300; buscado en la semilla 777): llamarada y fuego rápido
      place: { x: -378, z: -458, heading: 3.8, y: 85, speed: 0, hover: true, third: true }, dur: 10.5, show: ['mouse'], seed: 24, cam: [26, 42, -0.3],   // (cámara exterior alta: en la del jinete, la cabeza tapa el blanco)
      clicks: [[2, 1.2, 5.8], [1, 6.5, 6.6], ...taps(7.0, 9.4, 0.19)],
      setup(S) {
        const B = S.base, V = ['canon', 'balista', 'catapulta'], taken = []; S.us = [];
        for (let i = 0; i < 3; i++) { const q = rel(B, (i - 1) * 32, 200), p = dryNear(q.x, q.z, 10, taken); taken.push({ x: p.x, z: p.z, r: 10 }); S.us.push(addArtilleria(V[i], p.x, p.z, hdg(B) + 180, [])); }
      },
      each(t, S) { const u = S.us.find(x => !x.dead); if (u) aimAt(_v.copy(u.pos).setY(u.pos.y + 3), 0.2); }
    },
    batallones: {                                            // v35: en hover delante del bloque (en un llano sin árboles: -800, 1400), la llamarada lo barre de lado a lado
      place: { x: -790, z: 1230, heading: 3.2, y: 88, speed: 0, hover: true, third: true }, dur: 10, show: ['mouse'], seed: 25, cam: [42, 40, -0.5],
      clicks: [[2, 1.6, 6.4]],
      setup(S) { const B = S.base, q = rel(B, 0, 175), p = dryNear(q.x, q.z, 55, []); S.u = addBatallon(p.x, p.z, hdg(B) + 180, [], 1000, 77); },
      each(t, S) {                                         // la mira barre el bloque de izquierda a derecha y de la fila de delante a la de atrás
        const u = S.u, k = clamp((t - 1.4) / 5, 0, 1), side = Math.sin(t * 2.2) * u.w * 0.45, fwd = (k - 0.5) * u.d * 1.0;
        const fx = Math.sin(u.heading), fz = -Math.cos(u.heading);
        aimAt(_v.set(u.pos.x - fx * fwd - fz * side, u.pos.y, u.pos.z - fz * fwd + fx * side), 0.3);
      }
    },
    barcos: {                                                // v35: el lago grande al sur del inicio (semilla 777); bola guiada en parábola
      place: { x: -60, z: 3150, heading: Math.PI, agl: 260, speed: 330, throttle: 0.45 }, dur: 12, show: ['mouse'], seed: 26,
      clicks: [[1, 0.6, 0.7], [0, 1.1, 4.0]],
      setup(S) { S.u = addBarco(-60, 4558, 90, []); },
      each(t, S) { aimAt(S.u.bc, 0.3); }
    },
    hud: {
      place: { x: 0, z: 0, heading: -0.7, agl: 420, speed: 450, throttle: 0.75, path: 4500 }, dur: 11, show: [],
      setup(S, A) { S.e1 = A.puppet({ at: [-900, 80, 1600], dir: 0.9, speed: 120 }); },
      callouts: [
        [0.2, 1.6, BOX.left, 'VELOCIDAD · ACELERADOR · BOOST'], [1.6, 3.0, BOX.alt, 'ALTITUD'],
        [3.0, 4.4, BOX.compass, 'BRÚJULA'], [4.4, 5.8, BOX.objs, 'OBJETIVOS Y PUNTOS'],
        [5.8, 7.3, BOX.radar, 'RADAR'], [7.3, 8.8, BOX.weapons, 'ARMAS'],
        [8.8, 10.1, BOX.health, 'VIDA Y ARMADURA'], [10.1, 11, aimBox, 'MIRA Y ESCUDOS']
      ]
    },
    escuadron: {                                             // v35: el Escuadrón Paladin del Capítulo 01 en formación y Seraphin por radio
      place: { x: 0, z: 0, heading: 3.5, agl: 450, speed: 360, throttle: 0.55, path: 4000 }, dur: 12, show: ['KeyZ', 'mouse'], showTop: true, seed: 27,
      keys: [['KeyZ', 4.6, 8.4]], moves: [[4.8, 6.4, 1500, 40]],
      setup() {
        const C = MISSIONS.capitulo1;
        mission = Object.assign({}, orig.mission, { allies: C.allies, radio: C.radio });
        allyStart();
        radioSay('seraphin', { en: "Percival, they're yours. Show me what I taught you. We'll keep them off your back.", es: 'Percival, son tuyos. Demuéstrame lo que te he enseñado. Nosotros te los quitamos de encima.' }, 6.5);   // (una frase del guion)
      },
      callouts: [[0.6, 4.2, () => { const al = allies.find(a => a.on && a.id === 'seraphin'); return al ? ptBox(al.e.pos, 150, 70, -20) : null; }, 'COMPAÑERO'], [8.8, 11.8, BOX.radar, 'COMPAÑEROS EN EL RADAR']]
    },
    misiones: {                                              // v35: objetivos, TGT y salir del área (cuenta atrás) · sustituye a «objetivo»
      place: { x: 0, z: 0, heading: 3.4, agl: 420, speed: 430, throttle: 0.8, path: 1700 }, dur: 12, show: [], seed: 28,
      setup(S) {
        const B = S.base, c = rel(B, 0, -2900);               // el borde del área, unos 600 m por delante
        mission = Object.assign({}, orig.mission, { area: { x: c.x, z: c.z, r: 3500 }, free: false });
        MS.objs = [
          { id: 'a', text: 'Destruye las torres', hud: 'TORRES', target: 'tower', count: 3, n: 1, done: false, shown: true },
          { id: 'b', text: 'Derriba la patrulla', hud: 'DRAGONES', target: 'dragon', count: 4, n: 4, done: true, doneT: -1, shown: true },
          { id: 'c', text: 'Dirigibles', hud: 'DIRIGIBLES', target: 'airship', count: 2, n: 0, done: false, shown: false, optional: true }
        ];
        MS.t = 0;
      },
      each(t, S) { if (!S.shown && t >= 1.6) { S.shown = true; MS.objs[2].shown = true; S.toasts.push({ msg: 'Nuevo objetivo  ·  Dirigibles', t: gameTime }); } },
      callouts: [[0.3, 4.2, BOX.objs, 'OBJETIVOS'], [7.0, 11.8, BOX.radar, 'ÁREA DE LA MISIÓN']]
    }
  };
  REC.SCENES = SCENES;
})();
