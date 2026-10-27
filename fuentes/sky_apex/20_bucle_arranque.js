/* ---------- Bucle ---------- */
let lastT = performance.now(), loadTotal = 1;
const loadBar = document.getElementById('loadbar'), goBtn = document.getElementById('go');
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 0.05);
  fpsEMA += (1 / dt - fpsEMA) * 0.05;
  if (state === 'loading') {
    const left = pumpTerrain(intro.busy ? 5 : 24);          // durante la entrada del logo, poco terreno por fotograma (que no dé tirones)
    loadBar.style.width = (100 * (1 - left / loadTotal)).toFixed(0) + '%';
    if (left === 0 && !hero.ready) goBtn.textContent = hero.error ? 'No se pudo cargar el dragón' : 'Despertando al dragón…';
    if (left === 0 && hero.ready) {
      state = 'menu'; goBtn.disabled = false; goBtn.textContent = 'Misión de prueba'; document.getElementById('mFree').disabled = false;   // v15
      updateTowerStreaming(dragon.position.x, dragon.position.z);
      updateIslandStreaming(dragon.position.x, dragon.position.z); pumpIslands(4000);
      for (let i = 0, s; i < 6 && (s = islandAt(dragon.position.x, dragon.position.y, dragon.position.z, 90)); i++) dragon.position.y = s.yMax + 130;
    }
  } else if (state === 'menu' || state === 'playing' || state === 'dead') {
    gameTime += dt;
    if (state === 'dead') { F.deadT += dt; missionUpdate(dt); if (F.deadT > 2.6 && state === 'dead') missionDeath(); }   // v15: reaparecer o MISIÓN FALLIDA
    else if (state === 'playing') { updateAim(dt, false); updateFlight(dt, false); }   // en el menú (en negro) el dragón espera en el punto de partida
    updateWorld(dt);
  } else if (state === 'select') { gameTime += dt; updateShowroom(dt); }
  else if (state === 'worldgen') updateWorldGen();         // v19: generando el mundo de la misión (en negro: no hace falta pintar el mundo)
  if (state === 'select') renderer.render(show.scene, show.cam); else if (state !== 'worldgen') { renderer.render(scene, camera); renderRider(); }
  drawHUD();
  music.update(dt);
  updateIntro(now);
}

/* ---------- Arranque ---------- */
(function boot() {
  missionSetup('libre');                                   // v19: al abrir el juego, el mundo del combate libre (semilla del arranque)
  placeStart(RUN.world.start); WORLD.startKey = startKey(RUN.world.start);
  refreshTerrainSelection(dragon.position.x, dragon.position.y, dragon.position.z, true);
  loadTotal = Math.max(1, terrainState.pending.length);
  planTowers();
  goBtn.addEventListener('click', () => chooseMission('prueba'));                                   // v15: menú → misión → «Elige tu dragón»
  document.getElementById('mFree').addEventListener('click', () => chooseMission('libre'));
  loadHero().then(loadDragons); loadRider(); loadKnight(); introBoot();   // v16: los otros dos dragones, en cuanto está el Tyrant
  window.__game = { F, dragon, keys, towers, chunks, towerState, hero, dragonAnim, animateHero, heroMouth, get state() { return state; }, startGame, enterSelect, leaveSelect, show, colors, applyColors, setState(s) { state = s; }, get fps() { return fpsEMA; }, get SEED() { return SEED; }, WORLD, DESIGN, heightAt, fireballs, bolts, enemies, enemyState, enemyLock, cycleTarget, damageEnemy, W, islands: islActive, islLoaded, islandAt, updateIslandStreaming, pumpIslands, rider, music, intro, introStart, MISSIONS, MS, get mission() { return mission; }, chooseMission, missionSetup, RUN, DRAGONS, alt, chooseDragon };
  requestAnimationFrame(frame);
})();
