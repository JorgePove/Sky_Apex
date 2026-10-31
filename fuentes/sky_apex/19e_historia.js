
/* ============================================================
   M4. MODO HISTORIA (v34): capítulos, pantalla de capítulo, voces y subtítulos, planos de cámara y reacciones de los compañeros
   Petición de Jorge (31-oct): «Jugar → Modo Historia» abre la selección de capítulos (de momento, el Capítulo 01: Trial by Fire; receta
   capitulo1 en 18b_capitulo1.js). Todo en castellano salvo las voces, que serán en inglés.
   · Subtítulos: los textos de la radio pueden venir en dos idiomas ({ en, es }); txt() da el de Opciones (subLang, guardado en el navegador).
   · Voces (VOICES: id → [recurso incrustado, archivo de audio/]): mensajes mentales grabados. La radio (M2) las reproduce, dura lo que
     ellas y saca el texto a trozos (subChunks: frases repartidas por su largo). Se paran con la pausa y siguen al reanudar; la música baja
     mientras suenan. Sin el archivo, solo subtítulos.
   · Pantalla de capítulo (receta: card): negro, textos que se escriben solos con una fuente militar (Graduate), una pausa, unos segundos
     quietos y fundido. Encima de la entrada de cine (que empieza a la vez). Intro la salta.
   · Planos de cámara de las entradas de cine (receta: intro.shots, o los de la acción cine): posiciones respecto al dragón del jugador
     (m: x a la derecha, y arriba, z hacia atrás) y hacia dónde mirar (look: un punto respecto al dragón, o lookAt: 'portal' | 'super').
   · Reacciones (receta: chatter { kill, ship, battalion, unit, hurt, missile, lowhp: [[quién, texto], …] }): los compañeros comentan
     lo que pasa (como en Ace Combat), como mucho uno cada CHATTER_GAP s y nunca encima de otro mensaje.
   · Menú: botón «Modo Historia» en «Modo de juego» y la ventana de capítulos (los MISSIONS con chapter).
   ============================================================ */
const STORY = { chatter: false, chatT: -99, last: {} };
const CHATTER_GAP = 7, CHATTER_P = 0.75;

/* ---------- Subtítulos: idioma ---------- */
const SUB_KEY = 'skyApex.subtitulos';
let subLang = 'es';
try { const v = localStorage.getItem(SUB_KEY); if (v === 'en' || v === 'es') subLang = v; } catch (err) { }
const txt = t => t == null ? '' : typeof t === 'string' ? t : (t[subLang] || t.es || t.en || '');
{ const sel = document.getElementById('subLang'); sel.value = subLang; sel.addEventListener('change', () => { subLang = sel.value; try { localStorage.setItem(SUB_KEY, subLang); } catch (err) { } }); }

/* ---------- Voces ---------- */
const VOICES = {                                           // id: [recurso incrustado en sky_apex.html, archivo (desde fuentes/)]
  seraphin_01: ['voz-seraphin-01', '../audio/audio Seraphin test 01.mpeg'],
  volger_01: ['voz-volger-01', '../audio/audio Volger test 01.mpeg']
};
const VO = { bufs: {}, state: {}, src: null, id: null, t0: 0, off: 0, paused: false };
function voicesLoad(ids) {
  if (!ids.length) return;
  sfx.init();
  for (const id of ids) {
    if (VO.state[id]) continue;
    const f = VOICES[id]; if (!f) { VO.state[id] = 'none'; continue; }
    VO.state[id] = 'loading';
    loadBytes(f[0], f[1]).then(b => sfx.decode(b)).then(buf => { VO.bufs[id] = buf; VO.state[id] = 'ready'; })
      .catch(err => { VO.state[id] = 'none'; console.warn('Voz «' + id + '» no cargada (solo subtítulos):', err); });
  }
}
const voiceState = id => VO.state[id] || 'none';
/* Empieza la voz id; devuelve su duración (s) o 0 si no está. */
function voicePlay(id) {
  voiceStop();
  const buf = VO.bufs[id]; if (!buf || !sfx.ready) return 0;
  VO.src = sfx.voice(buf, 0); VO.id = id; VO.off = 0; VO.t0 = sfx.now; VO.paused = false;
  music.duck(0.45);
  return buf.duration;
}
function voiceStop() {
  if (VO.src) { try { VO.src.stop(); } catch (err) { } VO.src = null; }
  VO.id = null; VO.paused = false; music.duck(1);
}
function voicePause() { if (VO.src && !VO.paused) { VO.off += sfx.now - VO.t0; try { VO.src.stop(); } catch (err) { } VO.src = null; VO.paused = true; } }
function voiceResume() { if (VO.paused && VO.id && VO.bufs[VO.id]) { VO.src = sfx.voice(VO.bufs[VO.id], VO.off); VO.t0 = sfx.now; VO.paused = false; } }
/* Subtítulos: el texto en frases (las cortas, juntas; nunca más de ~130 caracteres) y cuándo empieza cada una en dur s (por su largo). */
function subChunks(s, dur) {
  const parts = s.match(/[^.!?…]+(?:[.!?…]+["»”']?|$)\s*/g) || [s], out = [];
  for (let p of parts) {
    p = p.trim(); if (!p) continue;
    const L = out.length - 1;
    if (L >= 0 && (out[L].length < 45 || p.length < 20) && out[L].length + p.length < 130) out[L] += ' ' + p; else out.push(p);
  }
  if (!out.length) out.push(s);
  const w = out.map(p => p.length + 8), tot = w.reduce((a, b) => a + b, 0);
  let t = 0;
  return out.map((p, i) => { const c = { s: p, t }; t += dur * w[i] / tot; return c; });
}

/* ---------- Al empezar y al acabar ---------- */
const cardEl = document.getElementById('card'), fadeEl = document.getElementById('fade'), hintEl = document.getElementById('hint');
function storyStart() {
  STORY.chatter = false; STORY.chatT = -99; STORY.last = {};
  MS.card = null; cardEl.hidden = true; fadeReset(); hintHide(); portalReset(); CC.on = false; CC.k = 0;
  voicesLoad(mission.voices || []);
  if (mission.chapter) music.tension.prime();             // (la música de tensión: que vaya cargando)
}
/* Al salir de la partida (resultados, menú, reintentar): fuera las voces, la pantalla de capítulo y el consejo; el fundido, al volver al menú. */
function storyStop(keepFade) {
  voiceStop(); if (MS.card) { MS.card.on = false; } cardEl.hidden = true; hintHide();
  if (!keepFade) fadeReset();
}

/* ---------- Pantalla de capítulo ---------- */
const cardTopEl = document.getElementById('cardTop'), cardBotEl = document.getElementById('cardBot');
function cardStart(def) {
  const C = MS.card = { on: true, done: false, def, t: 0, li: 0, ci: 0, acc: 0, wait: def.delay != null ? def.delay : 0.9, phase: 'type', els: [], tickT: 0 };
  cardTopEl.innerHTML = ''; cardBotEl.innerHTML = '';
  for (const L of def.lines) {
    if (L.pause) { C.els.push(null); continue; }
    const d = document.createElement('div'); d.className = 'card-line' + (L.big ? ' big' : '') + (L.space ? ' space' : '');
    (L.big ? cardTopEl : cardBotEl).appendChild(d); C.els.push(d);
  }
  cardEl.style.opacity = '1'; cardEl.hidden = false; cardEl.classList.remove('done');
}
function cardUpdate(dt) {
  const C = MS.card, D = C.def, L = D.lines;
  if (C.phase === 'type') {
    if (C.wait > 0) { C.wait -= dt; return; }
    const line = L[C.li];
    if (!line) { C.phase = 'hold'; C.wait = D.hold != null ? D.hold : 3; cardEl.classList.add('done'); return; }
    if (line.pause) { C.li++; C.wait = line.pause; return; }
    const el = C.els[C.li], full = line.text;
    for (const e of C.els) if (e) e.classList.toggle('cur', e === el);
    C.acc += dt * (D.speed || 20);
    let n = C.ci; while (C.acc >= 1 && n < full.length) { C.acc -= 1; n++; }
    if (n > C.ci) { C.tickT -= dt; if (C.tickT <= 0 && full[n - 1] !== ' ') { C.tickT = 0.045; sfx.tick(); } }
    C.ci = n; el.textContent = full.slice(0, n);
    if (n >= full.length) { C.li++; C.ci = 0; C.acc = 0; C.wait = D.gap != null ? D.gap : 0.45; }
  } else if (C.phase === 'hold') { C.wait -= dt; if (C.wait <= 0) { C.phase = 'fade'; C.t = 0; } }
  else if (C.phase === 'fade') {
    C.t += dt; const k = clamp(C.t / (D.fade || 1.5), 0, 1);
    cardEl.style.opacity = String(1 - k * k * (3 - 2 * k));
    if (k >= 1) { C.on = false; C.done = true; cardEl.hidden = true; }
  }
}
function cardSkip() {
  const C = MS.card; if (!C || !C.on || C.phase === 'fade') return;
  C.def.lines.forEach((L, i) => { if (C.els[i]) C.els[i].textContent = L.text; });
  C.phase = 'fade'; C.t = (C.def.fade || 1.5) * 0.4; cardEl.classList.add('done');
}

/* ---------- Fundido a negro y consejos ---------- */
function fadeBlack(s) { fadeEl.style.transition = 'opacity ' + s + 's linear'; fadeEl.hidden = false; void fadeEl.offsetWidth; fadeEl.classList.add('on'); }
function fadeReset() { fadeEl.style.transition = 'none'; fadeEl.classList.remove('on'); fadeEl.hidden = true; }
let hintTimer = 0;
function hintShow(s) { hintEl.textContent = s; hintEl.classList.add('on'); clearTimeout(hintTimer); hintTimer = setTimeout(hintHide, 9000); }
function hintHide() { hintEl.classList.remove('on'); }

/* ---------- Saltar (Intro): la pantalla de capítulo y la voz de la entrada de cine ---------- */
window.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.repeat || state !== 'playing' || DESIGN.on) return;
  if (MS.card && MS.card.on) { e.preventDefault(); cardSkip(); return; }
  if (cine.on && cine.skip && MS.cur) { e.preventDefault(); MS.radioT = 0; voiceStop(); }   // corta el mensaje que suena (la entrada acaba con él)
});

/* ---------- Entradas de cine de la receta y música ---------- */
/* a = 'end' (acaba la que haya) o { shots, to ('portal' | 'super': el dragón vuela hacia allí), climb (m que sube como mucho), name, sub }. */
function storyCine(a) {
  if (a === 'end') { if (cine.on) cineEnd(false); return; }
  const P = dragon.position, to = ccTarget(a.to);
  cineStart(a.dur || Infinity, txt(a.name), txt(a.sub), { shots: a.shots, to, y: a.climb != null ? Math.max(P.y, groundAt(P.x, P.z) + 250) + a.climb : null });
}
function storyMusic(m) {
  if (m === 'tension') { music.game.stop(2.5); music.tension.play(2.5, 0); }
  else if (m === 'game') { music.tension.stop(2.5); music.game.play(2.5); }
}

/* ---------- Planos de cámara ---------- */
const CC = { on: false, k: 0, shots: null, t: 0, fov: null, pos: new THREE.Vector3(), tgt: new THREE.Vector3() };   // (fov: el del plano, o null)
const _cc1 = new THREE.Vector3(), _cc2 = new THREE.Vector3(), _ccq = new THREE.Quaternion(), _ccq2 = new THREE.Quaternion();
function cineCamStart(shots) { CC.shots = shots && shots.length ? shots : null; CC.t = 0; CC.on = !!CC.shots; }
function ccTarget(name) {
  if (name === 'portal') return PORTAL.mesh ? PORTAL.pos : null;
  if (name === 'super') { const u = UNITS.find(x => x.kind === 'superdirigible' && !x.dead); return u ? u.bc : null; }
  return null;
}
/* Al final de animateHero: mezcla la cámara normal con la del plano que toca (CC.k sube al empezar y baja al acabar). */
function cineCamApply(dt) {
  CC.k += ((CC.on && cine.on ? 1 : 0) - CC.k) * (1 - Math.exp(-dt * 1.5));
  if (CC.k < 0.002) { CC.k = 0; return; }
  if (cine.on && CC.shots && !(MS.card && MS.card.on)) CC.t += dt;   // (los planos empiezan cuando se va la pantalla de capítulo)
  const S = CC.shots || [];
  let t = CC.t, s = S[S.length - 1], u = 1;
  for (const x of S) { if (t < x.dur) { s = x; u = t / x.dur; break; } t -= x.dur; }
  if (!s) return;
  CC.fov = s.fov || null;                                  // (campo de visión del plano, °: lo aplica updateWorld)
  const e = u * u * (3 - 2 * u), f = s.from, o = s.to || s.from;
  CC.pos.set(lerp(f[0], o[0], e), lerp(f[1], o[1], e), lerp(f[2], o[2], e));
  const W = s.lookAt && ccTarget(s.lookAt);
  if (W) CC.tgt.copy(W); else { const l = s.look || [0, 0, 0]; CC.tgt.set(l[0], l[1], l[2]); dragon.localToWorld(CC.tgt); }
  _cc1.copy(camera.position); _ccq.copy(camera.quaternion);
  camera.position.copy(CC.pos); camera.lookAt(CC.tgt);
  _cc2.copy(camera.position); _ccq2.copy(camera.quaternion);
  const k = CC.k * CC.k * (3 - 2 * CC.k);
  camera.position.lerpVectors(_cc1, _cc2, k); camera.quaternion.copy(_ccq).slerp(_ccq2, k);
}

/* ---------- Reacciones de los compañeros ---------- */
function storyChatter(kind) {
  if (!STORY.chatter || MS.ended || cine.on || state !== 'playing') return;
  const C = mission.chatter && mission.chatter[kind];
  if (!C || !C.length || gameTime - STORY.chatT < CHATTER_GAP || !radioQuiet() || Math.random() > CHATTER_P) return;
  let i = Math.floor(Math.random() * C.length); if (C.length > 1 && i === STORY.last[kind]) i = (i + 1) % C.length;
  STORY.last[kind] = i; STORY.chatT = gameTime;
  radioSay(C[i][0], C[i][1]);
}

/* ---------- Menú: Modo Historia ---------- */
function storyMenu() {
  const list = document.getElementById('storyList'); let html = '';
  for (const id in MISSIONS) {
    const m = MISSIONS[id], c = m.chapter; if (!c) continue;
    html += `<button class="chap" data-id="${id}"><span class="chap-n">Capítulo ${String(c.n).padStart(2, '0')}</span><span class="chap-t">${c.title}</span>`
      + `<span class="chap-p">${m.place}  ·  ${c.squad}</span><span class="chap-b">${c.brief}</span><span class="chap-go">Jugar ›</span></button>`;
  }
  html += '<div class="chap locked"><span class="chap-n">Capítulo 02</span><span class="chap-t">Próximamente</span></div>';
  list.innerHTML = html;
  for (const b of list.querySelectorAll('.chap[data-id]')) b.addEventListener('click', () => { closePanels(); chooseMission(b.dataset.id); });
  openPanel('pStory');
}
