/* ============================================================
   8b. INTRO «SKY APEX» Y MÚSICA DEL MENÚ
   · Al abrir: pantalla negra con «Pulsa cualquier tecla o haz clic» (el gesto, además, deja sonar la música).
   · v10: tras el clic, INTRO.black s en negro; SKY entra desde la izquierda y se queda en el centro; luego APEX llega disparado desde la
     derecha y choca con SKY (destello, onda, chispas, sacudida). Entonces el logo queda envuelto en llamas. La música épica empieza (v13) en
     cuanto SKY queda colocado en el centro; v14: en cuanto SKY entra en escena (INTRO.sky[0]), saltándose el silencio del principio de la
     canción (MUSIC_MENU_LEAD).
     Luego aparecen los botones. El fondo del menú sigue en negro (ya no se ve el mundo detrás).
   · Las llamas salen del contorno de cada mitad del logo (se calcula con sus píxeles) en dos lienzos a media resolución:
     detrás del logo (resplandor y llamas) y delante (brasas, chispas, onda y destello).
   · Música: musica/musica_menu.* y musica/musica_game.* junto al HTML (prueba varias extensiones). La del menú suena en el
     menú, en «Elige tu dragón» y en la victoria; al empezar la partida se funde y entra la de juego.
     Volúmenes de música del menú, de la partida y de efectos en «Opciones» (audioVol, se guardan en el navegador); la M silencia todo.
   ============================================================ */
const MUSIC_EXT = ['mp3', 'ogg', 'm4a', 'wav', 'aac', 'flac', 'opus', 'webm'], MUSIC_KEY = 'skyApex.musica', AUDIO_KEY = 'skyApex.audio';
const MUSIC_MENU_LEAD = 0.45;   // v14: silencio al principio de «Dragon's Ascent» (s; medido): la intro empieza la canción ahí. Si se cambia la canción, ajustar
/* Volúmenes (0-1) de «Opciones»: música del menú, música de la partida (por defecto más baja, que no canse) y efectos. Se guardan en el
   navegador. La M silencia todo (musicMix.muted y sfx). */
const audioVol = { menu: 0.7, game: 0.28, sfx: 1 };
const musicMix = { muted: false, tracks: [] };
try {
  const a = JSON.parse(localStorage.getItem(AUDIO_KEY) || 'null');
  if (a) { for (const k in audioVol) if (typeof a[k] === 'number') audioVol[k] = clamp(a[k], 0, 1); }
  else { const o = JSON.parse(localStorage.getItem(MUSIC_KEY) || '{}'); if (typeof o.vol === 'number') { audioVol.menu = clamp(o.vol, 0, 1); audioVol.game = audioVol.menu * 0.4; } }
} catch (err) { }
function saveAudio() { try { localStorage.setItem(AUDIO_KEY, JSON.stringify(audioVol)); } catch (err) { } }
/* Una pista: musica/<nombre>.<extensión> junto al HTML (o ../musica/ desde fuentes/), en bucle, con fundidos. */
function musicTrack(name, key) {
  const el = new Audio(); el.loop = true; el.preload = 'auto';
  const dirs = /\/fuentes\//.test(location.pathname) ? ['../musica/', 'musica/'] : ['musica/', '../musica/'];
  const cands = []; for (const d of dirs) for (const x of MUSIC_EXT) cands.push(d + name + '.' + x);
  let i = -1, found = false, want = false, fade = 0, fadeTo = 0, fadeSpeed = 10;
  const apply = () => { el.volume = clamp((musicMix.muted ? 0 : audioVol[key]) * fade, 0, 1); };
  const next = () => {                                     // siguiente candidato (carpeta y extensión) hasta dar con el archivo
    if (++i < cands.length) { el.src = cands[i]; el.load(); }
    else console.warn('Sin música: falta musica/' + name + ' (.mp3, .ogg, .wav…) junto al HTML');
  };
  el.addEventListener('error', () => { if (!found) next(); });
  let startAt = null;                                       // (v14) segundo de la canción por el que empezar (lo pide play)
  el.addEventListener('loadedmetadata', () => { found = true; apply(); if (want) { if (startAt != null) { el.currentTime = Math.min(startAt, el.duration || 0); startAt = null; } el.play().catch(() => { }); } });
  next(); apply();
  const T = {
    el, apply, get found() { return found; },
    play(fadeIn, from) {                                   // sin fundido (o muy corto): a su volumen al momento. from: empezar en ese segundo
      if (from != null) { if (found) el.currentTime = from; else startAt = from; }
      want = true; fadeTo = 1; fadeSpeed = 1 / Math.max(fadeIn || 0, 0.02); if (!(fadeIn > 0.3)) fade = 1; apply();
      if (found && el.paused) el.play().catch(() => { });
    },
    stop(fadeOut) { fadeTo = 0; fadeSpeed = 1 / Math.max(fadeOut || 0, 0.02); },   // se pausa al acabar el fundido
    update(dt) {
      if (fade !== fadeTo) { fade = fadeTo > fade ? Math.min(fadeTo, fade + dt * fadeSpeed) : Math.max(fadeTo, fade - dt * fadeSpeed); apply(); }
      if (want && fadeTo === 0 && fade === 0) { want = false; el.pause(); }
    }
  };
  musicMix.tracks.push(T); return T;
}
const music = {
  menu: musicTrack('musica_menu', 'menu'),                 // menú, «Elige tu dragón» y victoria
  game: musicTrack('musica_game', 'game'),                 // partida
  get muted() { return musicMix.muted; },
  setMuted(m) { musicMix.muted = !!m; musicMix.tracks.forEach(t => t.apply()); },
  update(dt) { musicMix.tracks.forEach(t => t.update(dt)); }
};
/* ---------- Menú principal: botones y paneles ---------- */
const optEls = { menu: ['volMenu', 'volMenuV'], game: ['volGame', 'volGameV'], sfx: ['volSfx', 'volSfxV'] };
function syncAudioUI() {
  for (const k in optEls) { const v = Math.round(audioVol[k] * 100); document.getElementById(optEls[k][0]).value = v; document.getElementById(optEls[k][1]).textContent = String(v); }
}
for (const k in optEls) document.getElementById(optEls[k][0]).addEventListener('input', e => {
  audioVol[k] = e.target.value / 100; document.getElementById(optEls[k][1]).textContent = e.target.value;
  musicMix.tracks.forEach(t => t.apply()); sfx.applyVolume(); saveAudio();
});
syncAudioUI();
function openPanel(id) {
  closePanels(); const el = document.getElementById(id); el.hidden = false; el.scrollTop = 0;
  const b = el.querySelector('[data-close]'); if (b) b.focus({ preventScroll: true });
}
function closePanels() {
  for (const el of document.querySelectorAll('.mpanel')) el.hidden = true;
  document.getElementById('tutVideo').pause(); document.getElementById('pTutorial').classList.remove('zoom');   // (el vídeo del tutorial, parado)
}
for (const b of document.querySelectorAll('.mpanel [data-close]')) b.addEventListener('click', closePanels);
/* v22: «Jugar» abre, en la misma pantalla (título y música), los modos de juego; «← Volver» o Esc vuelven a los botones principales. */
const menuMainEl = document.getElementById('mMain'), menuPlayEl = document.getElementById('mPlay');
function showPlayMenu(on) {
  closePanels(); menuMainEl.hidden = on; menuPlayEl.hidden = !on;
  document.getElementById(on ? 'mM1' : 'go').focus({ preventScroll: true });
}
const playMenuOpen = () => !menuPlayEl.hidden;
document.getElementById('mBack').addEventListener('click', () => showPlayMenu(false));
document.getElementById('mTutorial').addEventListener('click', () => { sfx.init(); openTutorial(); });
document.getElementById('mControls').addEventListener('click', () => openPanel('pControls'));
document.getElementById('mOptions').addEventListener('click', () => openPanel('pOptions'));
document.getElementById('mQuit').addEventListener('click', quitGame);

/* ---------- Tutorial (v12) ----------
   Ventana del menú con todas las secciones (TUTORIAL: categorías → secciones). Al elegir una se despliega su texto (para qué sirve, controles
   y consejos) y a la derecha se reproduce en bucle su vídeo: tutorial/<id>.webm (o .mp4) junto al HTML, como la música (desde fuentes/,
   ../tutorial/). Los vídeos se graban con el propio juego (herramientas/grabar_tutorial.js, escenas con guion, y servidor_tutorial.mjs);
   se pueden cambiar por otros con el mismo nombre. Sin vídeo, un aviso en su lugar.
   Más adelante, el «campo de pruebas» (tutorial guiado jugando) usará los mismos id de sección. */
const K = (...k) => k.map(x => `<kbd>${x}</kbd>`).join('');
const TUTORIAL = [
  { cat: 'Vuelo', items: [
    { id: 'direccion', title: 'Dirección y puntería', sum: 'El dragón vuela siempre hacia la mira.', keys: [[['Ratón'], 'Mover la mira: el dragón gira hacia ella'], [['Espacio'], 'Mantener: vuelo recto']], text: [
      'Mueve el ratón para llevar la <b>mira</b> (el círculo naranja) adonde quieras ir: el dragón gira hacia ella y se inclina solo al virar. El marcador blanco pequeño señala hacia dónde vas en ese momento (tu trayectoria); cuando los dos coinciden, vas justo hacia la mira. En 1ª persona, con la mira en el 0 de la escalera de cabeceo, vuelas horizontal.',
      'Cuanto más lejos del morro pongas la mira, más cerrado será el giro. A poca velocidad el dragón gira más deprisa; a mucha, los giros son más abiertos.',
      'La mira es también el punto de mira de todas las armas. La sensibilidad del ratón se cambia en <b>Opciones</b>.',
      'Mantén ' + K('Espacio') + ' para volar recto: el dragón deja de seguir a la mira, se nivela solo (alas y morro) y vuela horizontal con el rumbo que llevaba, mientras la mira sigue al ratón y la cabeza del dragón la sigue. La cámara pasa a la de <b>apuntado</b>, detrás y por encima del dragón, para ver el suelo al que apuntas. Sirve para barrer el suelo con la llamarada en una pasada rasante. El marcador del morro se vuelve dorado y pone <b>VUELO RECTO</b>. Al soltar, el dragón vuelve a girar hacia la mira y la cámara a la de antes.'] },
    { id: 'alabeo', title: 'Alabeo y nivelar', sum: 'Inclina al dragón sobre su eje y recupera el horizonte.', keys: [[['Q', 'E'], 'Alabeo a izquierda / derecha'], [['X'], 'Mantener: nivelar el horizonte']], text: [
      K('Q') + ' y ' + K('E') + ' inclinan al dragón sobre su eje, como un avión. Para girar no hacen falta (el dragón ya se inclina solo), pero sirven para pasar de lado entre montañas e islas o para encarar una pasada.',
      'Mantén ' + K('X') + ' y el dragón vuelve poco a poco a las alas niveladas con el horizonte. En hover no funcionan: el dragón se mantiene siempre nivelado.'] },
    { id: 'esquiva', title: 'Esquiva', sum: 'Un salto rápido de lado con un tonel, para el último segundo.', keys: [[['A', 'D'], 'Esquivar a la izquierda / derecha']], text: [   // v32
      K('A') + ' y ' + K('D') + ' lanzan al dragón de golpe hacia la izquierda o la derecha de la pantalla, sin cambiar el rumbo, mientras da un tonel completo hacia ese lado.',
      'Úsala en el último segundo: para no chocar con una torre, una isla o un dirigible que se te echa encima, o para quitarte de encima una <b>bola guiada</b>: las que vienen a por ti y están cerca pierden el blanco y siguen rectas.',
      'En la cámara exterior, la cámara tarda un momento en seguirte (el dragón sale hacia un lado de la pantalla y luego la cámara se recoloca); en la del jinete, la vista da la vuelta con el dragón. Entre una esquiva y la siguiente hay una pequeña espera.'] },
    { id: 'hover', title: 'Hover: parar en el aire', sum: 'Frena del todo y quédate aleteando en el sitio.', keys: [[['Ctrl izq.'], 'Entrar o salir del hover'], [['W', 'S'], 'En hover: subir / bajar']], text: [
      'Pulsa ' + K('Ctrl izq.') + ' y el dragón frena hasta quedarse quieto en el aire, aleteando. En pantalla aparece <b>HOVER</b> y la barra del acelerador pasa a ser la de <b>ALTURA</b>.',
      'En hover, ' + K('W') + ' sube y ' + K('S') + ' baja. El dragón sigue girando hacia la mira, así que puedes apuntar con calma, por ejemplo a una torre. El boost y el alabeo no funcionan.',
      'Pulsa ' + K('Ctrl izq.') + ' otra vez para volver a volar: el dragón arranca con un impulso de alas.'] },
    { id: 'camara', title: 'Cámara y mirar alrededor', sum: 'Vista del jinete o exterior, y mirar sin cambiar el rumbo.', keys: [[['C'], 'Vista del jinete (1ª persona) / exterior (3ª)'], [['Z'], 'Mantener + ratón: mirar alrededor'], [['F'], 'Mantener: mirar al blanco fijado']], text: [
      K('C') + ' cambia entre la vista del jinete, sobre el lomo del dragón, y la cámara exterior, detrás de él.',
      'Mantén ' + K('Z') + ' y mueve el ratón para mirar alrededor: en 1ª persona el jinete gira la cabeza hasta 170° a cada lado; en 3ª, la cámara da la vuelta completa al dragón. Mientras miras, la mira no se mueve y el dragón mantiene el rumbo. Al soltar ' + K('Z') + ', la vista vuelve al frente.',
      'Mantén ' + K('F') + ' y la cámara gira despacio hacia el blanco fijado y lo sigue, como en Ace Combat: así ves dónde está para ir a por él. Si no tienes ninguno fijado, fija el mejor a la vista. El ratón sigue moviendo la mira. Al soltar ' + K('F') + ', la vista vuelve sola al frente.'] }
  ] },
  { cat: 'Velocidad', items: [
    { id: 'acelerar', title: 'Acelerar y frenar', sum: 'W abre el acelerador y S lo cierra.', keys: [[['W', 'S'], 'Acelerar / frenar']], text: [
      K('W') + ' abre el acelerador y ' + K('S') + ' lo cierra. A la izquierda tienes la <b>VELOCIDAD</b> en km/h y, debajo, la barra del <b>ACELERADOR</b>. A todo gas, en vuelo nivelado, el dragón llega a {vel_max} km/h.',
      'Volar más despacio permite girar más cerrado, pero por debajo de unos 120 km/h el dragón pierde sustentación y empieza a hundirse.'] },
    { id: 'boost', title: 'Boost', sum: 'Mucha más velocidad durante unos segundos.', keys: [[['Shift'], 'Mantener: boost']], text: [
      'Mantén ' + K('Shift') + ': el dragón bate las alas al doble de ritmo y en {boost_aceleracion} s pasa de {vel_max} a {vel_boost} km/h. La barra <b>BOOST</b> dura {boost_duracion} s de uso seguido.',
      'Se recarga sola {boost_espera} s después de soltar ' + K('Shift') + ' (<b>RECARGA EN…</b> y luego <b>RECARGANDO</b>), un {boost_recarga} % por segundo. Si la vacías por completo (<b>AGOTADO</b>), tiene que recargar un poco antes de volver a usarla.',
      'Con boost casi no se puede girar: úsalo en línea recta para acercarte, escapar o esquivar. En hover no funciona.'] },
    { id: 'picados', title: 'Subidas y picados', sum: 'Subir cuesta velocidad; bajar la da.', keys: [[['Ratón'], 'Mira arriba: subir · abajo: picar']], text: [
      'La gravedad cuenta: al subir, el dragón pierde velocidad, y al bajar la gana. En un picado pronunciado pliega las alas y puede llegar a {vel_boost} km/h sin usar el boost.',
      'Aprovéchalo: pica para ganar velocidad antes de un ataque o para escapar, y no encadenes subidas largas si vas despacio. Al picar, vigila <b>SOBRE EL SUELO</b>.'] }
  ] },
  { cat: 'Ataques', items: [
    { id: 'fuego', title: 'Fuego rápido', sum: 'Un proyectil rápido por clic, hacia la mira.', keys: [[['Clic izq.'], 'Un disparo por clic']], text: [
      'Cada clic izquierdo lanza un proyectil pequeño y muy rápido (1100 m/s) hacia la mira. Hace poco daño ({basico_dano} por impacto: un dragón enemigo tiene {enemigo.vida} de vida y una torre, {torre.vida}), pero acierta fácil y desde lejos.',
      'Tienes {basico_municion} disparos, que ves en el panel de <b>ARMAS</b> (abajo a la derecha). {basico_recarga_espera} s después de dejar de disparar empiezan a recargarse solos: las marcas se vuelven doradas.',
      'Si tienes un dragón fijado, apunta al pequeño círculo gris que va por delante de él: es donde estará cuando le llegue el disparo.'] },
    { id: 'fijar', title: 'Fijar objetivo', sum: 'Elige a qué blanco seguir.', keys: [[['Clic central'], 'Fijar el siguiente blanco a la vista']], text: [
      'El clic central (la rueda) fija un blanco que tengas en pantalla: un dragón, una torre o un dirigible (estos dos, a menos de 6 km). Primero los que cuentan para la misión (<b>TGT</b>), del más cercano al más lejano; luego los demás. Lo rodea un recuadro dorado con su distancia. Cada clic pasa al siguiente; si no hay otro, lo suelta.',
      'Con un blanco fijado aparecen el círculo gris de adelanto (para el fuego rápido) y el círculo rojo de la bola guiada. Si sale de la pantalla, una flecha dorada en el borde te indica hacia dónde girar.'] },
    { id: 'guiada', title: 'Bola guiada', sum: 'Una gran bola de fuego que persigue a su blanco.', keys: [[['Clic central'], 'Fijar el blanco'], [['Clic izq.'], 'Mantener, con la mira en el círculo rojo']], text: [
      'Fija un blanco (clic central) a menos de {guiado_alcance} m: a su alrededor aparece un círculo rojo. Mantén pulsado el clic izquierdo (el primer clic dispara fuego rápido) y lleva la mira dentro del círculo.',
      'Tras medio segundo empieza la carga (<b>FIJANDO %</b>); a los {guiado_fijado} s sale una gran bola de fuego que persigue al blanco y le quita {guiado_dano} de vida. Si la mira sale del círculo, la carga baja poco a poco.',
      'Tienes {guiado_municion} por misión (el contador del panel) y no se recargan: guárdalas para los blancos que lo merezcan.'] },
    { id: 'llamarada', title: 'Llamarada', sum: 'Chorro de fuego a corta distancia. Cuidado con el calor.', keys: [[['Clic dcho.'], 'Mantener: llamarada']], text: [
      'Mientras mantienes el clic derecho, el dragón escupe un chorro de fuego de {llamas_alcance} m que quema todo lo que toca ({llamas_dano} de daño por segundo). Sirve para torres y para dragones que tienes encima.',
      'Si el suelo (o el agua, o una isla) está a su alcance en la dirección de la mira, un <b>círculo blanco</b> marca dónde caerá. Al tocarlo, la tierra salta y deja una mancha quemada que dura un minuto; en el agua levanta vapor.',
      'Se calienta: el arco a la derecha de la mira se llena en {llamas_sobrecarga} s seguidos. Si llega al 100 %, <b>SOBRECALENTADO</b>: ninguna arma funciona durante {llamas_bloqueo} s. Suelta antes y se enfría sola.'] },
    { id: 'rayo', title: 'Rayo de fuego', sum: 'El ataque definitivo: un rayo larguísimo durante unos segundos.', keys: [[['Clic izq.', 'Clic dcho.'], 'A la vez, con la barra llena']], text: [
      'Su barra, la última del panel de <b>ARMAS</b>, se llena con el tiempo ({rayo_recarga} % por segundo) y un {rayo_por_derribo} % más por cada enemigo que destruyes (dragón, torre o dirigible). Llena, parpadea y pone <b>LISTO</b>.',
      'Pulsa los dos botones a la vez: la energía se concentra en la boca y sale un rayo de hasta {rayo_alcance} km que sigue a la mira durante {rayo_duracion} s y quema todo lo que cruza ({rayo_dano} de daño por segundo). Mientras dura, las demás armas no funcionan.'] }
  ] },
  { cat: 'Defensa', items: [
    { id: 'escudo', title: 'Escudo', sum: 'Unos segundos a salvo de los proyectiles.', keys: [[['R'], 'Activar el escudo']], text: [
      K('R') + ' rodea al dragón con una esfera de energía durante {escudo_duracion} s: los proyectiles (bolas guiadas, bolas de fuego, fuego antiaéreo y de los dirigibles) revientan contra ella sin hacerte daño. No te protege de los choques.',
      'Tienes {escudos} cargas: las rayas azules bajo la mira. La que está en uso se vacía mientras dura y las gastadas quedan negras. Cuando el escudo parpadea, está a punto de apagarse.',
      'Guárdalo para cuando veas <b>¡PROYECTIL APROXIMÁNDOSE!</b> y no puedas esquivarlo.'] },
    { id: 'recarga_escudo', title: 'Recargar el escudo', sum: 'Los dragones derribados devuelven cargas.', keys: [[['R'], 'Usar una carga']], text: [
      'Las cargas del escudo no vuelven solas ni al reaparecer: solo derribando dragones. Cada dragón que derribas te devuelve {escudo_por_derribo} (hasta {escudos}), y el aviso lo confirma: <b>Dragón derribado · +1 escudo</b>.',
      'Cuantos más dragones derribes, más escudos tendrás para lo que venga.'] },
    { id: 'recarga_guiadas', title: 'Munición guiada', sum: 'No se recargan: administra las de la misión.', keys: [], text: [
      'Las bolas guiadas no se recargan: tienes {guiado_municion} por misión. El panel de <b>ARMAS</b> lleva la cuenta junto a <b>BOLA GUIADA</b> y, al llegar a 0, pone <b>SIN MUNICIÓN</b> en rojo.',
      'Gástalas en los blancos duros o que más importan para la misión, y acaba el resto con el fuego rápido y la llamarada.'] },
    { id: 'vida', title: 'Vida, armadura y caídas', sum: 'La armadura se regenera; la vida, no.', keys: [], text: [
      'Abajo, en el centro, tienes la barra de <b>VIDA</b> ({vida}) rodeada por el marco amarillo de la <b>ARMADURA</b> ({armadura}, con su número encima). El daño se lo lleva primero la armadura y, cuando se acaba, la vida.',
      'La armadura se regenera: tras {armadura_espera} s sin recibir daño se rellena a {armadura_regen} por segundo (mientras tanto, el marco late). La vida no: lo que pierdes no vuelve en toda la misión.',
      'Hacen daño las bolas de fuego ({enemigo.bola_dano}) y las bolas guiadas ({enemigo.guiada_dano}) de los dragones, el fuego antiaéreo de las torres ({torre.aa_dano} por impacto), los cañones de los dirigibles ({dirigible.dano}) y chocar con un dragón ({enemigo.choque_dano}).',
      'Estrellarte contra el terreno, el agua, una isla flotante, una torre o un dirigible te derriba al instante, igual que quedarte sin vida. En una misión, caer es MISIÓN FALLIDA; en el combate libre, a los pocos segundos reapareces en el aire con la vida y la armadura llenas (pero no recuperas escudos ni bolas guiadas).',
      'Vigila <b>SOBRE EL SUELO</b>, a la derecha: se pone en rojo por debajo de 60 m.'] }
  ] },
  { cat: 'Enemigos', items: [
    { id: 'dragones', title: 'Dragones enemigos', sum: 'Dragones amarillos que te buscan y te disparan.', keys: [], text: [
      'Son dragones amarillos de la raza de Alientormenta, más grandes que el tuyo, y dejan una estela amarilla que se ve desde muy lejos. Sobre cada uno, un triángulo rojo marca su distancia y, si está herido, su vida ({enemigo.vida}).',
      'Patrullan hasta que te detectan (a unos {enemigo.deteccion} m). Entonces hacen pasadas: se acercan, te disparan bolas de fuego, se alejan y vuelven por tu espalda. Vuelan a {enemigo.velocidad} km/h.',
      'Si te pegas a su cola, huyen hacia delante con maniobras amplias (eses, curvas abiertas, tirabuzones, subidas y picados): síguelos y apunta. Al rato dan la vuelta con una curva abierta para volver a atacarte.',
      'Hay 20 en toda la partida, como mucho 6 a la vez. En el radar son triángulos rojos.'] },
    { id: 'misiles_enemigos', title: 'Esquivar bolas guiadas', sum: 'Los dragones también lanzan bolas guiadas.', keys: [[['Ratón'], 'Giro fuerte para esquivar'], [['R'], 'Escudo, si no hay escapatoria']], text: [
      'Un dragón que te tiene delante puede fijarte: verás <b>TE ESTÁN FIJANDO</b>. A los {enemigo.guiada_fijado} s lanza una bola guiada ({enemigo.guiada_dano} de daño) y aparece <b>¡PROYECTIL APROXIMÁNDOSE!</b>, con un rombo rojo y su distancia (o una flecha roja si viene por detrás).',
      'Su guiado no es perfecto: cuando esté a unos 700 m, gira fuerte hacia un lado y pasará de largo. También puede estrellarse contra el terreno, una isla o una torre si la llevas cerca. Si no puedes esquivarla, usa el escudo (' + K('R') + ').'] },
    { id: 'torres', title: 'Torres antiaéreas', sum: '30 torres fijas que disparan ráfagas.', keys: [], text: [
      'Hay 30 torres repartidas alrededor del punto de partida; en cada partida, entre 10 y 15 de ellas están sobre islas flotantes. Se reconocen de lejos por el gran cristal morado que gira en su cima, y el radar las marca todas: cuadrados rojos (huecos si la torre está en una isla).',
      'A menos de {torre.aa_alcance} m te disparan ráfagas antiaéreas de {torre.aa_rafaga} proyectiles ({torre.aa_dano} de daño cada uno). Aguantan {torre.vida} de daño y destruirlas da {torre.puntos} puntos. No se pueden atravesar: rodéalas o pasa por encima.'] },
    { id: 'dirigibles', title: 'Dirigibles', sum: 'Barcos voladores que disparan por los costados.', keys: [], text: [
      'Grandes barcos voladores quietos en el aire, entre 500 y 1000 m sobre el suelo. Sobre cada uno, un rombo rojo hueco marca su distancia; en el radar son cápsulas huecas que apuntan hacia su proa.',
      'A menos de {dirigible.alcance} m disparan sin parar proyectiles arcanos morados ({dirigible.dano} de daño cada uno), pero <b>solo por los costados</b>: si te acercas de frente o por detrás, o justo por encima o por debajo, no pueden apuntarte.',
      'Aguantan {dirigible.vida} de daño y dan {dirigible.puntos} puntos. Al caer revientan en una explosión de energía. Su casco no se puede atravesar.'] }
  ] },
  { cat: 'Partida', items: [
    { id: 'hud', title: 'La pantalla (HUD)', sum: 'Dónde está cada indicador.', keys: [[['Esc', 'P'], 'Pausa'], [['M'], 'Silenciar el sonido']], text: [
      '<b>Izquierda</b>: velocidad, acelerador y boost. <b>Derecha</b>: altitud, altura sobre el suelo y velocidad vertical. <b>Arriba</b>: la brújula con tu rumbo; arriba a la derecha, torres, dragones y puntos.',
      '<b>Abajo a la izquierda</b>, el radar (2,4 km): tú eres el triángulo dorado del centro; los dragones, triángulos rojos; las torres, cuadrados rojos (las lejanas, en el borde); los dirigibles, cápsulas huecas. Lo que no cuenta para la misión sale apagado. Debajo, la distancia al blanco <b>TGT</b> más cercano.',
      '<b>Abajo a la derecha</b>, el panel de armas; <b>abajo en el centro</b>, la vida, rodeada por la armadura; y <b>en el centro</b>, la mira con las cargas del escudo.'] },
    { id: 'objetivo', title: 'Objetivo de la partida', sum: '30 torres y 20 dragones.', keys: [], text: [
      'Para ganar, destruye las 30 torres y derriba los 20 dragones. Los contadores de arriba a la derecha llevan la cuenta, y el radar te guía hasta las torres que quedan.',
      'Los blancos que cuentan para la misión llevan la marca <b>TGT</b> junto a su distancia. En otras misiones puede haber enemigos sin ella: también te atacan, pero no hace falta destruirlos para ganar. Los objetivos con un rombo (◇) son opcionales.',
      'Al conseguirlo verás la pantalla de <b>VICTORIA</b> con tus estadísticas (tiempo, puntos, precisión, daño recibido…). Desde ahí puedes volver al menú o empezar otra partida.'] }
  ] }
];
const TUT_KEY = 'skyApex.tutorial', TUT_EXT = ['webm', 'mp4'];
const tutEls = { panel: document.getElementById('pTutorial'), list: document.getElementById('tutList'), video: document.getElementById('tutVideo'), box: document.getElementById('tutVideoBox'),
  none: document.getElementById('tutNoVideo'), prog: document.getElementById('tutProg'), cat: document.getElementById('tutCapCat'), title: document.getElementById('tutCapTitle'),
  sum: document.getElementById('tutCapSum'), zoom: document.getElementById('tutZoom') };
const tut = { items: [], cur: null, srcs: [], tries: 0, raf: 0 };
/* v24: se construye al abrir la ventana: los números de los textos ({clave}) salen de las stats del Excel en ese momento (statText, 7c). */
function buildTutorial() {
  let html = ''; tut.items = [];
  for (const c of TUTORIAL) {
    html += `<div class="tut-cat">${c.cat}</div>`;
    for (const it of c.items) {
      tut.items.push(it); it.n = tut.items.length; it.cat = c.cat;
      const keys = it.keys.length ? `<dl class="keys">${it.keys.map(([k, d]) => `<dt>${K(...k)}</dt><dd>${d}</dd>`).join('')}</dl>` : '';
      html += `<div class="tut-item" data-id="${it.id}"><button class="tut-btn" aria-expanded="false" aria-controls="tt-${it.id}"><span class="n">${String(it.n).padStart(2, '0')}</span>${it.title}<i class="chev" aria-hidden="true"></i></button>`
        + `<div class="tut-text" id="tt-${it.id}">${it.text.map(p => `<p>${statText(p)}</p>`).join('')}${keys}</div></div>`;
    }
  }
  tutEls.list.innerHTML = html;
  for (const el of tutEls.list.querySelectorAll('.tut-item')) el.querySelector('.tut-btn').addEventListener('click', () => tutSelect(el.dataset.id));
}
/* Elegir una sección: se despliega su texto (las demás se pliegan) y empieza su vídeo. */
function tutSelect(id) {
  const it = tut.items.find(i => i.id === id) || tut.items[0];
  for (const el of tutEls.list.querySelectorAll('.tut-item')) {
    const on = el.dataset.id === it.id;
    el.classList.toggle('open', on); el.querySelector('.tut-btn').setAttribute('aria-expanded', String(on));
    if (on) {                                                // que se vea en la lista (sin mover nada más)
      const L = tutEls.list, a = el.offsetTop, b = a + el.offsetHeight;
      if (a < L.scrollTop) L.scrollTop = a - 6; else if (b > L.scrollTop + L.clientHeight) L.scrollTop = Math.min(a - 6, b - L.clientHeight + 6);
    }
  }
  if (tut.cur === it) return;
  tut.cur = it; try { localStorage.setItem(TUT_KEY, it.id); } catch (err) { }
  tutEls.cat.textContent = it.cat + '  ·  ' + it.n + ' / ' + tut.items.length; tutEls.title.textContent = it.title; tutEls.sum.textContent = it.sum;
  const dirs = /\/fuentes\//.test(location.pathname) ? ['../tutorial/', 'tutorial/'] : ['tutorial/', '../tutorial/'];
  tut.srcs = []; for (const d of dirs) for (const x of TUT_EXT) tut.srcs.push(d + it.id + '.' + x);
  tut.tries = 0; tutEls.none.hidden = true; tutEls.box.classList.remove('paused'); tutLoad();
}
function tutLoad() { const v = tutEls.video; v.src = tut.srcs[tut.tries]; v.load(); v.play().catch(() => { }); }
tutEls.video.addEventListener('error', () => {                // siguiente carpeta o extensión; si no hay ninguna, el aviso
  if (!tut.cur || !tutEls.video.getAttribute('src')) return;
  if (++tut.tries < tut.srcs.length) tutLoad();
  else { tutEls.none.textContent = 'Vídeo no disponible: falta tutorial/' + tut.cur.id + '.webm junto al juego'; tutEls.none.hidden = false; }
});
function tutTick() {                                         // barra de progreso del vídeo
  if (tutEls.panel.hidden) { tut.raf = 0; return; }
  const v = tutEls.video; tutEls.prog.style.width = (v.duration > 0 ? 100 * v.currentTime / v.duration : 0).toFixed(2) + '%';
  tut.raf = requestAnimationFrame(tutTick);
}
function openTutorial() {
  buildTutorial(); openPanel('pTutorial');
  let id = null; try { id = localStorage.getItem(TUT_KEY); } catch (err) { }
  tut.cur = null; tutSelect(id);
  if (!tut.raf) tut.raf = requestAnimationFrame(tutTick);
}
function tutZoom(on) {
  tutEls.panel.classList.toggle('zoom', on);
  const t = on ? 'Reducir el vídeo' : 'Ampliar el vídeo'; tutEls.zoom.setAttribute('aria-label', t); tutEls.zoom.title = t;
}
tutEls.zoom.addEventListener('click', e => { e.stopPropagation(); tutZoom(!tutEls.panel.classList.contains('zoom')); });
tutEls.box.addEventListener('click', () => {
  const v = tutEls.video; if (!v.getAttribute('src')) return;
  if (v.paused) { v.play().catch(() => { }); tutEls.box.classList.remove('paused'); } else { v.pause(); tutEls.box.classList.add('paused'); }
});
/* Teclado: ↑ ↓ cambian de sección; Esc reduce el vídeo ampliado (y, si no lo está, cierra la ventana: ver la entrada, sección 7). */
window.addEventListener('keydown', e => {
  if (tutEls.panel.hidden || state !== 'menu') return;
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    e.preventDefault();
    const i = tut.items.indexOf(tut.cur), j = clamp(i + (e.code === 'ArrowDown' ? 1 : -1), 0, tut.items.length - 1);
    tutSelect(tut.items[j].id); tutEls.list.querySelector(`[data-id="${tut.items[j].id}"] .tut-btn`).focus({ preventScroll: true });
  }
});
function tutEscape() {                                       // true si solo había que reducir el vídeo
  if (tutEls.panel.hidden || !tutEls.panel.classList.contains('zoom')) return false;
  tutZoom(false); return true;
}

const INTRO = { black: 1.5, sky: [1.5, 2.3], apex: [2.65, 3.2], ui: 4.4 };   // segundos desde el clic: negro (v11: 1,5 s), SKY entra, APEX entra y choca, botones
const intro = { phase: 'load', t0: 0, t: 0, last: 0, busy: false, hitAt: null, edges: [null, null], x: [0, 0], vx: [0, 0], rect: null, sc: 0.5,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, cleared: true };
const logoEls = [document.getElementById('logoSky'), document.getElementById('logoApex')], stageEl = logoEls[0].parentElement;
const fxBack = document.getElementById('fxBack'), fxFront = document.getElementById('fxFront'), fxB = fxBack.getContext('2d'), fxF = fxFront.getContext('2d');

const LOGO_FILES = ['../imagenes/logo_sky.png', '../imagenes/logo_apex.png'], LOGO_IDS = ['logo-sky-png', 'logo-apex-png'];
/* v14: logo en una sola línea, separado en dos PNG del mismo tamaño: SKY a la izquierda y APEX a la derecha. LOGO_BOX: caja de cada palabra
   (por si no se pueden leer los píxeles); LOGO_HIT: punto del choque (entre la Y y la A), en fracción del logo.
   v26: logo nuevo de Jorge, recortado y con transparencia de verdad (imagenes/logo_v3.webp), separado con herramientas/separar_logo_alfa.mjs
   en dos PNG de 1737×611 (los de la v14, de logo_v2.jpg con fondo blanco, quedan como logo_*_v2.png). */
const LOGO_W = 1737, LOGO_H = 611, LOGO_BOX = [[25, 25, 751, 548], [676, 95, 1710, 583]], LOGO_HIT = [0.411, 0.469];
function fireSprite(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
}
const FIRE_CORE = fireSprite([[0, 'rgba(255,250,225,1)'], [0.3, 'rgba(255,214,120,.85)'], [0.7, 'rgba(255,150,50,.25)'], [1, 'rgba(255,110,30,0)']]);
const FIRE_BODY = fireSprite([[0, 'rgba(255,160,60,.9)'], [0.4, 'rgba(240,90,25,.55)'], [0.75, 'rgba(160,35,10,.18)'], [1, 'rgba(90,15,5,0)']]);
/* Contorno de una mitad del logo: puntos (u, v) normalizados y la normal hacia fuera. */
function logoEdges(img, k) {
  const W = 360, H = 180, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); let d = null;
  try { g.drawImage(img, 0, 0, W, H); d = g.getImageData(0, 0, W, H).data; } catch (err) { }
  const pts = [];
  if (d) {
    const A = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (A(x, y) < 110 || (A(x + 1, y) >= 110 && A(x - 1, y) >= 110 && A(x, y + 1) >= 110 && A(x, y - 1) >= 110)) continue;
      const gx = A(x + 1, y) - A(x - 1, y), gy = A(x, y + 1) - A(x, y - 1), l = Math.hypot(gx, gy) || 1;
      pts.push((x + 0.5) / W, (y + 0.5) / H, -gx / l, -gy / l);
    }
  }
  if (pts.length < 40) {                                   // sin acceso a los píxeles: el borde de su caja
    const [x0, y0, x1, y1] = LOGO_BOX[k];
    for (let i = 0; i < 400; i++) { const top = i % 2, u = (x0 + Math.random() * (x1 - x0)) / LOGO_W; pts.push(u, (top ? y0 : y1) / LOGO_H, 0, top ? -1 : 1); }
  }
  return new Float32Array(pts);
}
function introBoot() {
  const imgs = Promise.all(logoEls.map((im, k) => new Promise(res => {
    im.onload = im.onerror = () => res();
    const b64 = embedded(LOGO_IDS[k]); im.src = b64 ? 'data:image/png;base64,' + b64 : LOGO_FILES[k];
  }))).then(() => { intro.edges = logoEls.map(logoEdges); });
  imgs.then(() => { intro.phase = 'wait'; menuEl.classList.add('wait'); });   // siempre se espera al clic (los modelos siguen cargando detrás)
}
function introStart() {
  if (intro.phase !== 'wait' && intro.phase !== 'load') return;
  intro.phase = 'play'; intro.t0 = intro.last = performance.now(); intro.hitAt = null; intro.fresh = true; intro.music = false;
  logoEls[0].style.transform = 'translate3d(-300vw,0,0)'; logoEls[1].style.transform = 'translate3d(300vw,0,0)';
  menuEl.classList.remove('wait'); menuEl.classList.add('playing');
  sfx.init();                                               // (la música empieza con el choque)
}
const onIntroGesture = e => { if (intro.phase === 'wait' && e.key !== 'Escape') introStart(); };
menuEl.addEventListener('pointerdown', onIntroGesture);
window.addEventListener('keydown', onIntroGesture);

/* ---------- Partículas de la intro (en píxeles de pantalla) ---------- */
const fxP = [];                                            // kind: 0 llama · 1 brasa · 2 chispa
function fxEmit(kind, x, y, vx, vy, life, size) { if (fxP.length < 1800) fxP.push({ kind, x, y, vx, vy, age: 0, life, size, seed: Math.random() * 50 }); }
function emitLogo(k, n, kind) {
  const e = intro.edges[k], r = intro.rect; if (!e || !r) return;
  const s = r.width / 900, ox = intro.x[k], vx = intro.vx[k];
  for (let i = 0; i < n; i++) {
    const j = (Math.random() * e.length / 4 | 0) * 4, x = r.left + e[j] * r.width + ox, y = r.top + e[j + 1] * r.height;
    if (kind === 0) fxEmit(0, x, y, (e[j + 2] * 22 + rnd(-14, 14)) * s - vx * 0.1, (e[j + 3] * 16 - rnd(55, 135)) * s, rnd(0.45, 1.05), rnd(20, 42) * s);
    else fxEmit(1, x, y, rnd(-25, 25) * s - vx * 0.05, -rnd(35, 95) * s, rnd(1.3, 2.8), rnd(1.3, 2.7) * s);
  }
}
function introBurst() {
  const r = intro.rect, s = r.width / 900, cx = r.left + r.width * LOGO_HIT[0], cy = r.top + r.height * LOGO_HIT[1];   // (v14) donde APEX choca con SKY
  intro.hitAt = { x: cx, y: cy, t: intro.t };
  for (let i = 0; i < 180; i++) {
    const ang = Math.random() * Math.PI * 2, sp = rnd(260, 1200) * s * (0.55 + 0.45 * Math.abs(Math.cos(ang)));
    fxEmit(2, cx + rnd(-40, 40) * s, cy + rnd(-25, 25) * s, Math.cos(ang) * sp, Math.sin(ang) * sp * 0.75 - 140 * s, rnd(0.35, 1.1), rnd(1.6, 3.2) * s);
  }
  for (let k = 0; k < 2; k++) { emitLogo(k, 170, 0); emitLogo(k, 45, 1); }
}
function updateIntro(now) {
  const dt = clamp((now - intro.last) / 1000, 0, 0.05); intro.last = now;
  if (intro.phase === 'load' || intro.phase === 'wait') return;
  const t = intro.t = (now - intro.t0) / 1000;
  const hitT = INTRO.apex[1], since = t - hitT;
  intro.busy = intro.phase === 'play' && t > INTRO.black - 0.3 && t < hitT + 0.8;   // en negro se genera terreno a tope; durante la animación, poco
  const W = window.innerWidth, H = window.innerHeight;
  if (menuEl.hidden) {                                     // menú oculto (selección o partida): nada que dibujar
    if (!intro.cleared) { fxB.clearRect(0, 0, fxBack.width, fxBack.height); fxF.clearRect(0, 0, fxFront.width, fxFront.height); fxP.length = 0; intro.cleared = true; }
    return;
  }
  intro.cleared = false;
  const cw = Math.round(W * intro.sc), ch = Math.round(H * intro.sc);
  for (const c of [fxBack, fxFront]) if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  const r = intro.rect = stageEl.getBoundingClientRect(), s = r.width / 900;
  // 1. las dos palabras: SKY entra por la izquierda y se queda en el centro; luego APEX llega disparado por la derecha y choca con ella
  let x0, x1;
  if (intro.reduced) { x0 = t < INTRO.sky[0] ? -(r.right + 80) : 0; x1 = t < INTRO.apex[0] ? W - r.left + 80 : 0; }
  else {
    const a = clamp((t - INTRO.sky[0]) / (INTRO.sky[1] - INTRO.sky[0]), 0, 1);
    x0 = lerp(-(r.right + 80), 0, 1 - Math.pow(1 - a, 3));
    const b = clamp((t - INTRO.apex[0]) / (hitT - INTRO.apex[0]), 0, 1);
    x1 = lerp(W - r.left + 80, 0, Math.pow(b, 1.7));
  }
  for (let k = 0; k < 2; k++) {
    const x = k ? x1 : x0;
    intro.vx[k] = intro.fresh || dt <= 0 ? 0 : (x - intro.x[k]) / dt; intro.x[k] = x;
    let jx = 0, jy = 0, sc = 1, skew = clamp(-intro.vx[k] * 0.0045 / Math.max(s, 0.3), -20, 20);
    if (since > 0 && !intro.reduced) {                     // sacudida y golpe de escala tras el choque
      const amp = 0.022 * r.width * Math.exp(-since * 8);
      jx = (Math.random() - 0.5) * 2 * amp; jy = (Math.random() - 0.5) * 2 * amp;
      sc = 1 + 0.06 * Math.exp(-since * 6) * Math.cos(since * 22); skew = 0;
    }
    logoEls[k].style.transform = `translate3d(${(x + jx).toFixed(1)}px,${jy.toFixed(1)}px,0) skewX(${skew.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
  }
  intro.fresh = false;
  if (!intro.music && t >= INTRO.sky[0] && intro.phase === 'play') { intro.music = true; music.menu.play(0, MUSIC_MENU_LEAD); }   // v14: la música, en cuanto SKY entra en escena
  if (!intro.hitAt && t >= hitT) introBurst();                                                                   // el choque: chispas y llamas
  if (intro.phase === 'play' && t >= INTRO.ui) { menuEl.classList.remove('intro'); intro.phase = 'done'; }
  // 2. emisión: después del choque, llamas alrededor de todo el logo
  const heat = since < 0 ? 0 : 1 + 1.5 * Math.exp(-since * 2.2);
  for (let k = 0; k < 2; k++) {
    const n = 200 * heat * dt + (heat > 0 ? Math.random() : 0);
    emitLogo(k, n | 0, 0);
    if (since > 0 && Math.random() < 11 * dt) emitLogo(k, 1, 1);
  }
  // 3. simulación
  for (let i = fxP.length - 1; i >= 0; i--) {
    const p = fxP[i]; p.age += dt;
    if (p.age >= p.life) { fxP[i] = fxP[fxP.length - 1]; fxP.pop(); continue; }
    if (p.kind === 2) { const dr = Math.exp(-2.4 * dt); p.vx *= dr; p.vy = p.vy * dr + 520 * s * dt; }
    else { p.vx *= Math.exp(-1.6 * dt); p.vy -= (p.kind ? 10 : 40) * s * dt; p.x += Math.sin(p.age * 8 + p.seed) * (p.kind ? 18 : 26) * s * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  // 4. dibujo: detrás, resplandor y llamas; delante, brasas, chispas, onda y destello
  const S = intro.sc;
  for (const [c, el] of [[fxB, fxBack], [fxF, fxFront]]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, el.width, el.height); c.setTransform(S, 0, 0, S, 0, 0); c.globalCompositeOperation = 'lighter'; }
  const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.47;
  if (heat > 0) {
    const g = fxB.createRadialGradient(cx, cy, 0, cx, cy, r.width * 0.6), a = Math.min(1, heat) * (0.2 + 0.04 * Math.sin(t * 3.1)) + 0.12 * (heat - 1);
    g.addColorStop(0, `rgba(255,120,40,${a.toFixed(3)})`); g.addColorStop(0.6, `rgba(220,60,15,${(a * 0.35).toFixed(3)})`); g.addColorStop(1, 'rgba(160,30,5,0)');
    fxB.save(); fxB.translate(cx, cy); fxB.scale(1, 0.5); fxB.translate(-cx, -cy); fxB.fillStyle = g; fxB.fillRect(cx - r.width, cy - r.width, r.width * 2, r.width * 2); fxB.restore();
  }
  for (const p of fxP) {
    const f = p.age / p.life;
    if (p.kind === 0) {
      const w = p.size * (0.55 + 0.75 * Math.sin(Math.PI * Math.min(1, f * 1.15))), h = w * 1.45;
      fxB.globalAlpha = Math.pow(1 - f, 0.8) * 0.8; fxB.drawImage(FIRE_BODY, p.x - w / 2, p.y - h * 0.6, w, h);
      if (f < 0.4) { fxB.globalAlpha = (1 - f / 0.4) * 0.75; fxB.drawImage(FIRE_CORE, p.x - w * 0.3, p.y - h * 0.35, w * 0.6, h * 0.6); }
    } else if (p.kind === 1) {
      fxF.globalAlpha = (1 - f) * (0.55 + 0.45 * Math.sin(p.age * 23 + p.seed)); fxF.fillStyle = '#ffcf6b';
      fxF.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      fxF.globalAlpha = 1 - f; fxF.strokeStyle = f < 0.35 ? '#fff4c8' : '#ffb347'; fxF.lineWidth = p.size;
      fxF.beginPath(); fxF.moveTo(p.x, p.y); fxF.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); fxF.stroke();
    }
  }
  fxB.globalAlpha = fxF.globalAlpha = 1;
  if (intro.hitAt && !intro.reduced && since < 0.7) {
    const h = intro.hitAt, R = Math.max(W, H);
    const fa = 0.95 * Math.exp(-since * 7.5);                // destello
    if (fa > 0.01) {
      const g = fxF.createRadialGradient(h.x, h.y, 0, h.x, h.y, R * 0.8);
      g.addColorStop(0, `rgba(255,250,235,${fa.toFixed(3)})`); g.addColorStop(0.25, `rgba(255,170,80,${(fa * 0.55).toFixed(3)})`); g.addColorStop(1, 'rgba(255,90,20,0)');
      fxF.fillStyle = g; fxF.fillRect(0, 0, W, H);
    }
    for (const [d, wMax] of [[0, 16], [0.07, 7]]) {          // dos ondas expansivas
      const q = clamp((since - d) / 0.5, 0, 1); if (q <= 0 || q >= 1) continue;
      fxF.globalAlpha = Math.pow(1 - q, 1.6); fxF.strokeStyle = '#ffd9a0'; fxF.lineWidth = wMax * (1 - q) * s + 1;
      fxF.beginPath(); fxF.ellipse(h.x, h.y, q * r.width * 0.85, q * r.width * 0.42, 0, 0, Math.PI * 2); fxF.stroke();
    }
    fxF.globalAlpha = 1;
  }
}

