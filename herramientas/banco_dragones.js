/* Ayudantes de prueba de los tres dragones (v16-v17), para el navegador integrado. No forma parte del juego.
   Uso, en la página de la fuente servida por el preview (http://localhost:8767/fuentes/sky_apex.src.html):
     await new Promise(r => { const s = document.createElement('script'); s.src = '../herramientas/banco_dragones.js?' + Date.now(); s.onload = r; document.head.appendChild(s); });
     await BD.listo();                       // terreno, Tyrant y los otros dos cargados, y estado «menu»
     BD.ver(BD.rejilla([BD.foto('drogon', 'reposo', 1, 0, BD.FRENTE), …]))   // capturas de «Elige tu dragón» en una rejilla 2×2
   Las capturas se pintan en un <img> fijo encima de todo (el WebGL del panel oculto no siempre llega a la captura). */
window.BD = {
  FRENTE: [0, 12, 40, 0, 5, 0], LADO: [0, 10, 34, 0, 5, 0], CERCA: [6, 9, 22, 0, 5, 0],
  async listo() {
    let n = 0; while (pumpTerrain(24) > 0 && n < 400) n++;
    await new Promise(r => { const t0 = performance.now(); (function w() { if ((hero.ready && DRAGONS.rojo.ready && DRAGONS.drogon.ready) || performance.now() - t0 > 60000) r(); else setTimeout(w, 300); })(); });
    for (let i = 0; i < 5 && state === 'loading'; i++) frame(performance.now());
    window.dispatchEvent(new Event('resize'));
    return { tyrant: hero.ready, rojo: DRAGONS.rojo.ready, drogon: DRAGONS.drogon.ready, state };
  },
  /* el lienzo WebGL tras dibujar una escena, copiado (al tamaño del HUD) */
  cap(scn, cam) { renderer.render(scn, cam); const c = document.createElement('canvas'); c.width = hudEl.width; c.height = hudEl.height; c.getContext('2d').drawImage(canvasGL, 0, 0, c.width, c.height); return c; },
  rejilla(cs) { const W = cs[0].width / 2, H = cs[0].height / 2, o = document.createElement('canvas'); o.width = W * 2; o.height = H * 2; const g = o.getContext('2d'); cs.forEach((c, i) => g.drawImage(c, (i % 2) * W, Math.floor(i / 2) * H, W, H)); return o; },
  ver(c) { let img = document.getElementById('capImg'); if (!img) { img = document.createElement('img'); img.id = 'capImg'; document.body.appendChild(img); } img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:20;pointer-events:none;background:#000'; img.src = c.toDataURL('image/jpeg', 0.9); },
  quitar() { const img = document.getElementById('capImg'); if (img) img.remove(); },
  /* el Tyrant en un clip y un instante (sin mezclas) */
  pose(clip, t) { hero.mixer.stopAllAction(); restorePose0(); const a = hero.mixer.clipAction(hero.clips[clip]); a.reset(); a.setEffectiveWeight(1); a.play(); a.time = t; hero.mixer.update(0); },
  /* «Elige tu dragón»: un dragón en una pose del Tyrant, la plataforma girada yaw y la cámara en c = [x, y, z, mira x, y, z] */
  foto(id, clip, t, yaw, c) {
    if (state !== 'select') { if (state !== 'menu') backToMenu(); enterSelect(); show.vel = 0; show.idle = -1e9; }
    chooseDragon(id); if (clip) { this.pose(clip, t); dragonPose(); }
    show.table.rotation.y = show.yaw = yaw; show.cam.position.set(c[0], c[1], c[2]); show.cam.lookAt(c[3], c[4], c[5]);
    show.cam.aspect = innerWidth / innerHeight; show.cam.updateProjectionMatrix();
    return this.cap(show.scene, show.cam);
  },
  /* partida: simula s segundos con la mira fija (fire: fogonazo); devuelve la captura con HUD */
  vuela(s, aim, fire) { const dt = 1 / 60; for (let i = 0; i < s * 60; i++) { gameTime += dt; if (state === 'playing') { F.locked = true; F.aimWorld.copy(aim); if (fire) F.fireFlash = 1; updateAim(dt, false); updateFlight(dt, false); } updateWorld(dt); } },
  capJuego() { renderer.render(scene, camera); renderRider(); drawHUD(); const c = document.createElement('canvas'); c.width = hudEl.width; c.height = hudEl.height; const g = c.getContext('2d'); g.drawImage(canvasGL, 0, 0, c.width, c.height); g.drawImage(hudEl, 0, 0); return c; },
  /* cámara de partida colocada a mano (es hija del dragón: posición en sus ejes) mirando a un punto del mundo */
  camara(local, mira) { camera.position.copy(local); camera.updateMatrixWorld(true); camera.lookAt(mira); camera.updateMatrixWorld(true); renderer.render(scene, camera); const c = document.createElement('canvas'); c.width = hudEl.width; c.height = hudEl.height; c.getContext('2d').drawImage(canvasGL, 0, 0, c.width, c.height); return c; },
  /* empezar una partida con un dragón (desde el menú o la plataforma) */
  jugar(id, mision) { if (state !== 'select') { if (state !== 'menu') backToMenu(); enterSelect(); } chooseDragon(id); chooseMission(mision || 'libre'); leaveSelect(true); return state; }
};
