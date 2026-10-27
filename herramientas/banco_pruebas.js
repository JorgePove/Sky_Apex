/* Banco de pruebas para el navegador integrado (herramienta: el juego no lo carga). Se inyecta en la página de la fuente:
     await new Promise(r => { const s = document.createElement('script'); s.src = '../herramientas/banco_pruebas.js?v=' + Date.now(); s.onload = r; document.head.appendChild(s); });
     await T.start();                         // carga, entra en partida, para el bucle del juego y quita el sonido
     T.goTo(x, y, z, rumbo); T.sim(seg, cada); const c = T.cap('texto'); await T.sheet([c, …]);
   T.sim simula a 60 Hz como frame() en partida; cada(t) se llama en cada paso (p. ej. para mover F.pdx). T.cap renderiza en el acto y copia
   mundo + HUD; T.sheet los muestra en una rejilla en un <img> fijo (esperar ~1,5 s antes de la captura). */
(() => {
  const T = window.T = {};
  T.start = async function () {
    for (let i = 0; i < 3000 && pumpTerrain(40) > 0; i++) { }
    document.getElementById('menu').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    for (let i = 0; i < 200 && !(hero.ready && rider.ready && knight.ready); i++) await new Promise(r => setTimeout(r, 100));
    if (state === 'loading') { state = 'menu'; goBtn.disabled = false; }
    enterSelect(); leaveSelect(true);
    frame = function () { requestAnimationFrame(frame); };
    if (!sfx.muted) sfx.toggleMute(); music.setMuted(true); F.lockRequested = false; F.locked = true;
    return state;
  };
  T.cap = function (label) {
    renderer.render(scene, camera); renderRider(); drawHUD();
    const c = document.createElement('canvas'); c.width = canvasGL.width; c.height = canvasGL.height; const g = c.getContext('2d');
    g.drawImage(canvasGL, 0, 0); g.drawImage(hudEl, 0, 0, c.width, c.height);
    if (label) { g.fillStyle = '#000'; g.fillRect(0, 0, 12 + label.length * 10, 26); g.fillStyle = '#ff0'; g.font = '18px monospace'; g.fillText(label, 6, 19); }
    return c;
  };
  T.sheet = async function (canvases, cols) {
    cols = cols || 2; const w = canvases[0].width / 2, h = canvases[0].height / 2, rows = Math.ceil(canvases.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = h * rows; const g = c.getContext('2d');
    canvases.forEach((cv, i) => g.drawImage(cv, (i % cols) * w, Math.floor(i / cols) * h, w, h));
    let im = document.getElementById('bancoImg');
    if (!im) { im = document.createElement('img'); im.id = 'bancoImg'; im.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#000;z-index:99'; document.body.appendChild(im); }
    im.src = c.toDataURL('image/jpeg', 0.88); im.hidden = false; await new Promise(r => setTimeout(r, 1500));
  };
  T.hide = () => { const im = document.getElementById('bancoImg'); if (im) im.hidden = true; };
  T.sim = function (secs, each) {
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(secs * 60); i++) {
      if (each) each(i * dt);
      gameTime += dt;
      if (state === 'dead') { F.deadT += dt; if (F.deadT > 2.6) respawn(); } else if (state === 'playing') { updateAim(dt, false); updateFlight(dt, false); }
      updateWorld(dt);
      if (state === 'paused') { state = 'playing'; pauseEl.hidden = true; }
      F.locked = true; F.lockRequested = false;
    }
  };
  T.goTo = function (x, y, z, heading) {
    const d = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
    dragon.position.set(x, y, z); dragon.quaternion.setFromRotationMatrix(_m4.lookAt(ZERO, d, UP)); F.aimWorld.copy(d); F.steer.set(0, 0, -1);
    F.rate.p = F.rate.y = F.rate.r = 0; F.bank = 0; dragonAnim.camQ = null;
    refreshTerrainSelection(x, y, z, true); for (let i = 0; i < 3000 && pumpTerrain(40) > 0; i++) { }
    updateTowerStreaming(x, z); updateIslandStreaming(x, z); pumpIslands(5000);
  };
  T.noEnemies = function () { for (const e of enemies) { e.dead = true; showEnemy(e, false); e.respawnT = 1e9; resetTrail(e); } for (const t of towers.values()) t.cool = 1e9; };
})();
