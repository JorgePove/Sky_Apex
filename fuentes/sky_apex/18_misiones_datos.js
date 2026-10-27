
/* ============================================================
   M1. MISIONES: DATOS (v15)
   Cada misión es una receta de datos, sin código: el motor (M2, el módulo siguiente) la lee y la ejecuta. Solo números, textos y
   listas, para poder editarlas a mano y llevarlas tal cual a otro motor (Unity, Unreal) si el juego se migra.
   Campos de una misión:
   · name, place: nombre y lugar (menú, resultados y, más adelante, briefing y mapa del mundo). free: true = modo libre (textos de
     «partida» en lugar de «misión»).
   · world (v19): el mundo de la misión. { seed, biome }
       seed: número entero; la misma semilla da siempre el mismo terreno, las mismas islas y los mismos árboles. null = la del arranque
       (al azar cada vez que se abre el juego, o la de ?semilla=N). Si es otra que la del mundo cargado, al empezar se genera el nuevo
       (pantalla de carga de unos segundos). La tecla º (modo diseño) muestra la semilla del mundo en el que se vuela.
       biome: de momento solo 'valle' (BIOMES, en M3; los demás llegarán en la Fase 3).
   · start (v19): punto de partida. { x, z, heading, height } en metros: heading = rumbo en grados como en la brújula (0 = norte, 90 = este;
     null = hacia donde más relieve hay), height = metros sobre el suelo (o el agua). Con y, la altitud absoluta en lugar de height (nunca
     a menos de 40 m del suelo). Si cae dentro de una isla, se sube por encima. Las coordenadas se leen en vuelo con el modo diseño (º).
   · area: zona de juego, un círculo { x, z, r } en metros. null = sin límites.
     Al salir: aviso con cuenta atrás de AREA_GRACE s (15) para volver; si no, MISIÓN FALLIDA. El radar dibuja el borde.
   · death: 'fail' = caer es MISIÓN FALLIDA (con «Reintentar»); 'respawn' = reapareces y la partida sigue.
   · timeLimit: segundos para cumplirla (null = sin límite). Si se acaba: MISIÓN FALLIDA.
   · towers: torres de cristal del mapa. total, zone (anillo [r mín, r máx] alrededor del punto de partida, en m) e islands ([mín, máx] de
     ellas sobre islas flotantes). El reparto sale siempre igual con la semilla del mundo; random: true = uno nuevo en cada partida.
   · dragons: dragones enemigos. total (en toda la misión) y atOnce (a la vez en el aire: al caer uno sale otro hasta llegar al total).
   · objectives: lo que se muestra arriba a la derecha.
       { id, text (frase para avisos y briefing), hud (etiqueta corta del HUD), target ('tower' | 'dragon'), count,
         hidden (no se ve hasta que un evento lo muestra: «show»), optional (no hace falta para ganar) }
     La misión se cumple sola cuando están hechos todos los objetivos no opcionales (los ocultos también: antes hay que mostrarlos).
     Para decidir el final a mano: autoWin: false y un evento con «win».
   · radio: quién habla. { id: { name, color, icon } } (icon: una letra; provisional hasta que haya retratos).
   · events: reglas «cuando → haz». Cada una salta una sola vez (con repeat: s, puede volver a saltar pasados esos segundos).
       when (se tienen que cumplir todas):
         t: s de misión · kills: { tower: n, dragon: n } (al menos) · done: [objetivos cumplidos] · pending: [objetivos sin cumplir]
         · hp: vida por debajo de · inside: { x, z, r } (el jugador dentro) · after: { event: id, t: s } (s después de otro evento)
       do (en orden):
         say: [quién, texto, segundos (opcional: si no, según lo largo)] · show: id de un objetivo oculto · toast: texto
         · dragons: n (refuerzos: n dragones más en el total) · win: segundos de espera · fail: motivo
   Las misiones de la campaña las define Jorge (premisa, escenario, encuentros): estas dos son solo para probar el motor.
   ============================================================ */
const MISSIONS = {
  /* La partida de la v14 como misión: mismas torres y dragones, pero con área delimitada, caer = fallar y algo de radio. */
  prueba: {
    name: 'Misión de prueba', place: 'Valle de las Torres',
    world: { seed: 777, biome: 'valle' },                  // v19: siempre el mismo valle (el de los vídeos del tutorial)
    start: { x: 0, z: 0, heading: null, height: 260 },
    area: { x: 0, z: 0, r: 10500 },
    death: 'fail',
    timeLimit: null,
    towers: { total: 30, zone: [1500, 9000], islands: [10, 15] },
    dragons: { total: 20, atOnce: 6 },
    objectives: [
      { id: 'torres', text: 'Destruye las torres de cristal', hud: 'TORRES', target: 'tower', count: 30 },
      { id: 'dragones', text: 'Derriba a los dragones enemigos', hud: 'DRAGONES', target: 'dragon', count: 20 }
    ],
    radio: {
      mando: { name: 'Mando', color: '#f2b84b', icon: 'M' }
    },
    events: [
      { id: 'inicio', when: { t: 2 }, do: [{ say: ['mando', 'Jinete, aquí Mando. Treinta torres de cristal y una bandada enemiga en el valle. Despéjalo todo.'] }] },
      { when: { after: { event: 'inicio', t: 9 } }, do: [{ say: ['mando', 'No salgas de la zona de operaciones: el radar marca el límite en rojo.'] }] },
      { when: { kills: { tower: 1 } }, do: [{ say: ['mando', 'Primera torre abajo. Al caer, cada una te recarga bolas guiadas.'] }] },
      { when: { kills: { dragon: 1 } }, do: [{ say: ['mando', 'Dragón derribado. Cada derribo te devuelve una carga de escudo.'] }] },
      { when: { kills: { tower: 15 }, pending: ['torres'] }, do: [{ say: ['mando', 'La mitad de las torres, destruidas. Sigue así.'] }] },
      { when: { kills: { dragon: 10 }, pending: ['dragones'] }, do: [{ say: ['mando', 'Diez dragones menos. Todavía quedan en el aire.'] }] },
      { when: { done: ['torres'], pending: ['dragones'] }, do: [{ say: ['mando', 'Todas las torres destruidas. Acaba con los dragones.'] }] },
      { when: { done: ['dragones'], pending: ['torres'] }, do: [{ say: ['mando', 'Cielo despejado. Remata las torres que quedan.'] }] },
      { when: { done: ['torres', 'dragones'] }, do: [{ say: ['mando', 'Objetivos cumplidos. Buen trabajo, jinete: vuelve a la base.'] }] },
      { when: { hp: 30 }, repeat: 25, do: [{ say: ['mando', '¡Estás muy tocado! Aléjate del fuego y espera a recuperarte.'] }] }
    ]
  },
  /* Combate libre: la partida de la v14 tal cual (sin límites, reapareciendo al caer; mundo al azar al abrir el juego y torres nuevas en
     cada partida). */
  libre: {
    name: 'Combate libre', place: 'Mundo abierto', free: true,
    world: { seed: null, biome: 'valle' },
    start: { x: 0, z: 0, heading: null, height: 260 },
    area: null,
    death: 'respawn',
    timeLimit: null,
    towers: { total: 30, zone: [1500, 9000], islands: [10, 15], random: true },
    dragons: { total: 20, atOnce: 6 },
    objectives: [
      { id: 'torres', text: 'Destruye las torres de cristal', hud: 'TORRES', target: 'tower', count: 30 },
      { id: 'dragones', text: 'Derriba a los dragones enemigos', hud: 'DRAGONES', target: 'dragon', count: 20 }
    ],
    radio: {},
    events: []
  }
};
