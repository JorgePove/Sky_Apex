
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
     v21: sites = torres fijas [{ x, z, tag }] (en tierra; cuentan dentro de total) y tag = etiqueta de las demás.
   · airships (v21): dirigibles enemigos, quietos en el aire (ver 6c). total, zone (anillo, como las torres), alt ([mín, máx] m sobre el
     suelo; por defecto 500-1000), sites = fijos [{ x, z, height, heading, tag }] (cuentan dentro de total), tag, random.
     v23: fleet = flota en movimiento { x, z (el de cabeza), heading (°), speed (km/h), gap: [mín, máx] m entre uno y otro }: los total
     dirigibles van en formación con ese rumbo, cada uno a una altitud de alt (sobre el agua, como la ALTITUD del HUD; sube solo si hay
     montaña o isla delante). escape: 'fail' = si uno sale del área,
     MISIÓN FALLIDA (el HUD muestra «BORDE» con lo que le falta al más adelantado).
   · callsign (v23): nombre en clave del jugador (lo usan los textos de la radio).
   · ally (v23): compañero de escuadrón (ver 6e). { id (el de radio, con su nombre y color), lines: { start, engage, protect, kill,
     regroup } (un texto o una lista: dice uno al azar) }. Va en formación hasta que hay enemigos a 2 km; no recibe daño.
   · dragons: dragones enemigos. total (en toda la misión) y atOnce (a la vez en el aire: al caer uno sale otro hasta llegar al total).
     v21: tag = su etiqueta. v23: escort: true = escoltan la flota de dirigibles (nacen y patrullan junto a ella, los relevos despegan
     de los dirigibles y salen a por el jugador si se acerca a 2,5 km de cualquiera).
   · squads (v21): escuadrones de dragones que salen con un evento («squad»). { id: { n, at: { x, z, height } (sin at: a dist m del
     jugador, por delante), dist, attack (false = patrullan hasta verte), tag (por defecto, el id) } }. No reaparecen.
   · objectives: lo que se muestra arriba a la derecha.
       { id, text (frase para avisos y briefing), hud (etiqueta corta del HUD), target ('tower' | 'dragon' | 'airship'), tag (v21: solo
         los que llevan esa etiqueta; con target y tag, las dos cosas), count (sin count: todos los de la misión que cumplen la selección),
         hidden (no se ve hasta que un evento lo muestra: «show»), optional (no hace falta para ganar) }
     La misión se cumple sola cuando están hechos todos los objetivos no opcionales (los ocultos también: antes hay que mostrarlos).
     Para decidir el final a mano: autoWin: false y un evento con «win».
     v21: lo que cuenta para un objetivo visible, sin cumplir y no opcional lleva la marca TGT (HUD y radar); lo demás, no.
   · radio: quién habla. { id: { name, color, icon } } (icon: una letra; provisional hasta que haya retratos).
   · events: reglas «cuando → haz». Cada una salta una sola vez (con repeat: s, puede volver a saltar pasados esos segundos).
       when (se tienen que cumplir todas):
         t: s de misión · kills: { tower: n, dragon: n, airship: n, <etiqueta>: n } (al menos) · cleared: [etiquetas] (destruidos
         todos los que la llevan) · done: [objetivos cumplidos] · pending: [objetivos sin cumplir] · hp: vida por debajo de
         · inside: { x, z, r } (el jugador dentro) · after: { event: id, t: s } (s después de otro evento)
         · airshipEdge: m (v23: algún dirigible a menos de m del borde del área)
       do (en orden):
         say: [quién, texto, segundos (opcional: si no, según lo largo)] · show: id de un objetivo oculto · toast: texto
         · dragons: n (refuerzos: n dragones más en el total) · squad: id (o [ids]) de squads · win: segundos de espera · fail: motivo
   Las misiones de la campaña las define Jorge (premisa, escenario, encuentros). «mision1» es la suya (Fase 1, v23); las otras tres son
   solo para probar el motor.
   ============================================================ */
const MISSIONS = {
  /* v23: Misión 1 (diseño de Jorge): una flota de 10 dirigibles huye hacia el borde del mapa; hay que destruirla antes de que salga (si
     sale uno, se falla). Vuela en formación con el mismo rumbo a 100 km/h, entre 700 y 900 m de altura y a 300-600 m entre uno y otro, con
     15 dragones de escolta (8 a la vez; no son TGT). El jugador (Percival) sale 10 km por detrás, con Lance (aliado, Tyrant) a 200 m y algo
     por detrás. Recorrido de la flota hasta el borde: 10 km (unos 6 min). Rumbo 285°: sin islas en su camino a esa altura. */
  mision1: {
    name: 'Misión 1: la flota', place: 'Valle de las Torres', callsign: 'Percival',
    world: { seed: 777, biome: 'valle' },
    start: { x: 9176, z: 2459, heading: 285, height: 750 },
    area: { x: 0, z: 0, r: 11000 },
    death: 'fail',
    timeLimit: null,
    towers: { total: 0 },
    airships: { total: 10, alt: [700, 900], fleet: { x: -966, z: -259, heading: 285, speed: 100, gap: [300, 600] }, escape: 'fail', tag: 'flota' },
    dragons: { total: 15, atOnce: 8, tag: 'escolta', escort: true },
    ally: {
      id: 'lance',
      lines: {
        start: 'Percival, aquí Lance. Estoy a tu derecha. Vamos a por esa flota.',
        engage: ['¡Contacto! Entro en combate.', 'Escolta a la vista. Me encargo de los que pueda.'],
        protect: ['¡Percival, tienes uno encima! Voy a por él.', 'Cuidado a tu espalda, lo tengo.', 'Te cubro.'],
        kill: ['¡Uno menos!', 'Derribado.', 'Ese ya no molesta.'],
        regroup: 'Zona despejada. Vuelvo a tu lado.'
      }
    },
    objectives: [
      { id: 'flota', text: 'Destruye la flota de dirigibles antes de que salga de la zona', hud: 'DIRIGIBLES', target: 'airship' }
    ],
    radio: {
      mando: { name: 'Mando', color: '#f2b84b', icon: 'M' },
      lance: { name: 'Lance', color: '#5ab4ff', icon: 'L' }
    },
    events: [
      { id: 'inicio', when: { t: 3 }, do: [{ say: ['mando', 'Percival, aquí Mando. Una flota de diez dirigibles huye hacia el borde de la región. Derríbalos antes de que escapen.'] }] },
      { when: { after: { event: 'inicio', t: 9 } }, do: [{ say: ['mando', 'Llevan escolta: quince dragones. Los dirigibles son la prioridad.'] }] },
      { when: { kills: { airship: 1 } }, do: [{ say: ['mando', 'Un dirigible menos. Quedan nueve.'] }] },
      { when: { kills: { airship: 5 } }, do: [{ say: ['mando', 'La mitad de la flota, abajo. No aflojes.'] }] },
      { when: { kills: { airship: 9 } }, do: [{ say: ['mando', '¡Solo queda uno!'] }] },
      { when: { airshipEdge: 3000 }, do: [{ say: ['mando', '¡La flota está a tres kilómetros del borde!'] }] },
      { when: { airshipEdge: 1000 }, do: [{ say: ['mando', '¡Un kilómetro! ¡Detenlos ya!'] }] },
      { when: { done: ['flota'] }, do: [{ say: ['mando', 'Flota destruida. Buen trabajo, Percival. Lance, volved a la base.'] }] },
      { when: { hp: 30 }, repeat: 25, do: [{ say: ['mando', '¡Percival, estás muy tocado! Aléjate y espera a recuperarte.'] }] }
    ]
  },
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
  /* v21: prueba técnica de los objetivos genéricos: dirigibles, torres fijas con etiqueta, blancos que no cuentan (sin TGT), un objetivo
     oculto con un escuadrón que sale por evento y uno opcional. No es una misión de la campaña. */
  objetivos: {
    name: 'Prueba de objetivos', place: 'Valle de las Torres',
    world: { seed: 777, biome: 'valle' },                  // el mismo valle que la misión de prueba (no hay que regenerar)
    start: { x: 0, z: 0, heading: null, height: 300 },
    area: { x: 0, z: 0, r: 8000 },
    death: 'fail',
    timeLimit: null,
    towers: { total: 12, zone: [2000, 7000], islands: [3, 5], sites: [   // tres baterías juntas, por delante a la izquierda del inicio (rumbo 75°)
      { x: 1988, z: -2027, tag: 'baterias' }, { x: 1532, z: -1005, tag: 'baterias' }, { x: 845, z: -1803, tag: 'baterias' }] },
    airships: { total: 6, zone: [2000, 6500], alt: [500, 1000], sites: [   // uno 2,6 km por delante, de costado (los otros cinco, al azar)
      { x: 2511, z: -673, height: 600, heading: 165 }] },
    dragons: { total: 4, atOnce: 2, tag: 'escolta' },
    squads: { alfa: { n: 4, dist: 2500, attack: true } },
    objectives: [
      { id: 'dirigibles', text: 'Destruye los dirigibles', hud: 'DIRIGIBLES', target: 'airship' },
      { id: 'baterias', text: 'Destruye las tres baterías marcadas', hud: 'BATERÍAS', tag: 'baterias' },
      { id: 'alfa', text: 'Derriba al escuadrón Alfa', hud: 'ESCUADRÓN ALFA', tag: 'alfa', hidden: true },
      { id: 'escolta', text: 'Derriba a los dragones de escolta', hud: 'ESCOLTA', tag: 'escolta', optional: true }
    ],
    radio: {
      mando: { name: 'Mando', color: '#f2b84b', icon: 'M' }
    },
    events: [
      { id: 'inicio', when: { t: 2 }, do: [{ say: ['mando', 'Prueba de objetivos. Solo cuentan los blancos marcados TGT: seis dirigibles y tres baterías.'] }] },
      { when: { after: { event: 'inicio', t: 9 } }, do: [{ say: ['mando', 'Los dirigibles solo disparan por los costados. Atácalos de frente o por detrás.'] }] },
      { when: { kills: { airship: 1 } }, do: [{ say: ['mando', 'Dirigible abajo. Quedan cinco.'] }] },
      { when: { kills: { airship: 3 } }, do: [{ say: ['mando', '¡Escuadrón Alfa entrando en la zona! Cuatro dragones a por ti.'] }, { squad: 'alfa' }, { show: 'alfa' }] },
      { when: { cleared: ['baterias'] }, do: [{ say: ['mando', 'Las tres baterías, destruidas.'] }] },
      { when: { cleared: ['alfa'] }, do: [{ say: ['mando', 'Escuadrón Alfa eliminado.'] }] },
      { when: { done: ['dirigibles', 'baterias', 'alfa'] }, do: [{ say: ['mando', 'Objetivos cumplidos. Buen trabajo, jinete.'] }] },
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
