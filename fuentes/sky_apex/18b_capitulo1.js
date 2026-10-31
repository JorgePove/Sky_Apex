
/* ============================================================
   M1b. MODO HISTORIA · CAPÍTULO 01: TRIAL BY FIRE (v34)
   Diseño de Jorge (31-oct): el jugador (Percival, Paladin 3), su maestra (Seraphin, Paladin 1) y tres jinetes más (Lance, Paladin 2;
   Minotaur, Paladin 4; Jester, Paladin 5) patrullan sobre la cordillera de Skyreach y salen a ver qué hace una escuadra de dragones sin
   identificar en su espacio aéreo. Fases: la patrulla de 5 (a 9 km al norte) → dos escuadrones de 6 (este y oeste, a 8 km) → un ejército
   en las llanuras del norte (4 batallones de 1000 soldados, 10 piezas de artillería y 6 dirigibles de escolta a 400-600 m) → un portal
   arcano a 6 km y 1500 m de altura del que sale el superdirigible (500 de vida) con 6 dragones, y a los 60 s su rayo contra los aliados.
   Guion (voces y radio) escrito por Claude al estilo de Ace Combat salvo las dos primeras líneas (las grabadas de Jorge). Los textos van
   en inglés (para grabar las voces) y en castellano (los subtítulos salen en el idioma de Opciones). Oracle es el Mando.
   Campos nuevos de la v34 (formato completo en M1):
   · chapter: { n, title, squad, brief } = sale en «Modo Historia»; card = pantalla de capítulo (19e); voices = voces que usa (VOICES).
   · intro: { title, shots } = entrada de cine hasta que la acaba un evento, con planos de cámara (19e).
   · world.relief / world.islands: cordillera alrededor del inicio, llanura al norte y sin islas (M3).
   · allies (6e), squads con rel, y, gap, cruise, unknown y from: 'super' (6b), units con wave (6f), chatter (reacciones, 19e).
   · Eventos: when.card, quiet, engaged, calm, close, signal (+ n, nMin; each: true = cada vez que llega), near, unitHp;
     do: say + voice, sayFor, hush, spawn, engage, portal, cine, music, fade, chatter, hint.
   ============================================================ */
const SAY = (who, en, es, voice) => voice ? { say: [who, { en, es }], voice } : { say: [who, { en, es }] };   // (atajo para escribir el guion)
MISSIONS.capitulo1 = {
  name: 'Capítulo 01: Trial by Fire', place: 'Cordillera de Skyreach', callsign: 'Percival',
  chapter: { n: 1, title: 'Trial by Fire', squad: 'Escuadrón Paladin', brief: 'Una escuadra de dragones sin identificar ha entrado en vuestro espacio aéreo sobre la cordillera de Skyreach. El Escuadrón Paladin sale a interceptarla.' },
  world: {
    seed: 3401, biome: 'valle', islands: false,
    relief: [{ x: 0, z: -3000, r: 15000, edge: 3500, m: 1 },          // la cordillera de Skyreach, alrededor del inicio
             { x: 0, z: -21500, r: 7500, edge: 3200, m: 0 }]          // las llanuras del norte: colinas, bosques, ríos y lagos (el ejército)
  },
  start: { x: 0, z: 0, heading: 0, y: 1000 },             // hacia el norte, a 1000 m de altitud
  area: { x: 0, z: -11000, r: 26000 },
  death: 'fail', timeLimit: null, autoWin: false,
  towers: { total: 0 }, dragons: { total: 0, atOnce: 0 },
  voices: ['seraphin_01', 'volger_01'],
  card: { speed: 22, gap: 0.45, hold: 3, fade: 1.6, lines: [
    { text: 'Chapter 01:', big: true }, { text: 'Trial By Fire', big: true }, { pause: 2 },
    { text: '-Paladin Squadron-', space: true }, { text: 'Mission Briefing:' }, { text: 'Unknown threat interception above the Skyreach Mountains' }] },
  // Entrada de cine durante el mensaje de Seraphin (32,9 s): tres planos (posiciones respecto a Percival: x derecha, y arriba, z atrás; fov: zoom)
  intro: { title: [0, 0], shots: [
    { dur: 11, from: [24, 7, 62], to: [16, 5, 48], look: [-60, 6, -60], fov: 48 },           // detrás de Percival: él delante a la derecha, Seraphin por delante
    { dur: 12, from: [-70, 75, 330], to: [25, 52, 255], look: [0, 0, -160], fov: 58 },        // detrás y por encima: los cinco, rumbo norte, sobre la cordillera
    { dur: 10, from: [27, 6, -24], to: [18, 5, -9], look: [0, 1.5, 0], fov: 55 }] },          // de cerca: Percival y Volger
  allies: [
    { id: 'seraphin', slot: [-130, 120], y: 15, style: 'escort', lines: { protect: [{ en: "I've got the one on your tail.", es: 'Tengo al que llevas en la cola.' }, { en: "Keep flying, Percival. I'm on him.", es: 'Tú sigue volando, Percival. Ya voy yo a por él.' }] } },
    { id: 'lance', slot: [-100, -100], y: 5, style: 'escort', lines: { protect: [{ en: 'Bandit behind you, Percival! Moving in!', es: '¡Enemigo detrás de ti, Percival! ¡Voy!' }, { en: "I've got your six!", es: '¡Te cubro la espalda!' }] } },
    { id: 'minotaur', slot: [0, -105], y: 0, style: 'escort', lines: { protect: [{ en: "Hey, ugly! Over here!", es: '¡Eh, feo! ¡Aquí!' }, { en: "This one's mine. Nobody touches the rookie!", es: 'Este es mío. ¡Nadie toca al novato!' }] } },
    { id: 'jester', slot: [100, -100], y: 5, style: 'escort', lines: { protect: [{ en: "Shoo! Get away from him!", es: '¡Fuera! ¡Apártate de él!' }, { en: "Distracting the big scary one, as usual.", es: 'Distrayendo al grandote, como siempre.' }] } }
  ],
  radio: {
    oracle: { name: 'Oracle', tag: 'Mando', color: '#f2b84b', icon: 'O' },
    seraphin: { name: 'Seraphin', tag: 'Paladin 1', color: '#e3cfff', icon: 'S' },
    lance: { name: 'Lance', tag: 'Paladin 2', color: '#5ab4ff', icon: 'L' },
    minotaur: { name: 'Minotaur', tag: 'Paladin 4', color: '#ff9a5c', icon: 'M' },
    jester: { name: 'Jester', tag: 'Paladin 5', color: '#9fe07a', icon: 'J' },
    volger: { name: 'Volger', tag: 'Tu dragón', color: '#ff6a3d', icon: 'V' }
  },
  squads: {
    patrulla: { n: 5, rel: { bearing: 0, dist: 9000 }, y: 1050, gap: 110, cruise: { speed: 200, engage: 1200 }, unknown: true },
    este: { n: 6, rel: { bearing: 90, dist: 8000 }, y: 1100, gap: 100, cruise: { speed: 480, engage: 3000 } },
    oeste: { n: 6, rel: { bearing: 270, dist: 8000 }, y: 950, gap: 100, cruise: { speed: 480, engage: 3000 } },
    escolta: { n: 6, from: 'super' }
  },
  // El ejército de las llanuras (sale con la fase 3): mirando al sur, hacia las tierras de los Paladin
  units: [
    { wave: 'ejercito', tag: 'ejercito', type: 'batallon', n: 4, soldiers: 1000, formation: 'rejilla', gap: 260, x: 0, z: -21500, heading: 180 },
    { wave: 'ejercito', tag: 'ejercito', type: 'artilleria', variant: 'mixta', n: 5, formation: 'linea', gap: 120, x: 0, z: -21130, heading: 180 },
    { wave: 'ejercito', tag: 'ejercito', type: 'artilleria', variant: 'mixta', n: 5, formation: 'linea', gap: 120, x: 0, z: -21880, heading: 180 },
    { wave: 'ejercito', tag: 'ejercito', type: 'dirigible', n: 3, formation: 'columna', gap: 480, x: -700, z: -21500, heading: 180, height: [400, 600] },
    { wave: 'ejercito', tag: 'ejercito', type: 'dirigible', n: 3, formation: 'columna', gap: 480, x: 700, z: -21500, heading: 180, height: [400, 600] }
  ],
  objectives: [
    { id: 'patrulla', text: 'Derriba a la patrulla enemiga', hud: 'PATRULLA', tag: 'patrulla', hidden: true },
    { id: 'este', text: 'Derriba al escuadrón del este', hud: 'ESCUADRÓN ESTE', tag: 'este', hidden: true },
    { id: 'oeste', text: 'Derriba al escuadrón del oeste', hud: 'ESCUADRÓN OESTE', tag: 'oeste', hidden: true },
    { id: 'batallones', text: 'Quema los batallones', hud: 'BATALLONES', target: 'batallon', tag: 'ejercito', hidden: true },
    { id: 'artilleria', text: 'Destruye la artillería', hud: 'ARTILLERÍA', target: 'artilleria', tag: 'ejercito', hidden: true },
    { id: 'dirigibles', text: 'Derriba los dirigibles de escolta', hud: 'DIRIGIBLES', target: 'airship', tag: 'ejercito', hidden: true },
    { id: 'super', text: 'Destruye el superdirigible', hud: 'SUPERDIRIGIBLE', target: 'superdirigible', hidden: true },
    { id: 'escolta', text: 'Derriba a su escolta', hud: 'ESCOLTA', tag: 'escolta', hidden: true }
  ],
  // Reacciones de los compañeros a lo que pasa (19e): [quién, texto]
  chatter: {
    kill: [
      ['lance', { en: 'Splash one! Nice shot, Percival!', es: '¡Uno menos! ¡Buen tiro, Percival!' }],
      ['minotaur', { en: 'Ha! He went down in flames!', es: '¡Ja! ¡Ha caído envuelto en llamas!' }],
      ['jester', { en: 'Remind me never to make you angry.', es: 'Recordadme que nunca te haga enfadar.' }],
      ['seraphin', { en: 'Good kill. Next target.', es: 'Buen derribo. Siguiente objetivo.' }],
      ['oracle', { en: 'Hostile down.', es: 'Hostil abatido.' }],
      ['volger', { en: "That's how it's done, boy!", es: '¡Así se hace, chico!' }],
      ['jester', { en: 'Was that your first kill? Looked like your tenth.', es: '¿Ese era tu primer derribo? Parecía el décimo.' }],
      ['minotaur', { en: 'Save some for the rest of us!', es: '¡Déjanos alguno a los demás!' }]
    ],
    ship: [
      ['lance', { en: 'Airship down! Beautiful!', es: '¡Dirigible abatido! ¡Precioso!' }],
      ['oracle', { en: 'Airship destroyed.', es: 'Dirigible destruido.' }],
      ['minotaur', { en: 'Look at it burn!', es: '¡Mira cómo arde!' }]
    ],
    battalion: [
      ['minotaur', { en: "Ha! That's a whole battalion turned to ash!", es: '¡Ja! ¡Un batallón entero reducido a cenizas!' }],
      ['volger', { en: 'They will remember this fire!', es: '¡Recordarán este fuego!' }],
      ['jester', { en: "Well... that's going to leave a mark.", es: 'Vaya... eso va a dejar marca.' }],
      ['oracle', { en: 'Battalion destroyed.', es: 'Batallón destruido.' }]
    ],
    unit: [
      ['oracle', { en: 'Artillery piece destroyed.', es: 'Pieza de artillería destruida.' }],
      ['lance', { en: 'One less cannon pointed at our villages.', es: 'Un cañón menos apuntando a nuestras aldeas.' }]
    ],
    hurt: [
      ['seraphin', { en: "Percival, you're taking hits! Shake him off!", es: '¡Percival, te están dando! ¡Quítatelo de encima!' }],
      ['volger', { en: 'Agh! Watch it, boy! That one burned!', es: '¡Agh! ¡Cuidado, chico! ¡Esa ha quemado!' }],
      ['lance', { en: "I'm coming, Percival! Hang on!", es: '¡Ya voy, Percival! ¡Aguanta!' }]
    ],
    missile: [
      ['jester', { en: 'Missile on your six, Percival! Dodge it!', es: '¡Bola guiada a tus seis, Percival! ¡Esquívala!' }],
      ['seraphin', { en: 'Incoming! Break, break!', es: '¡Viene una! ¡Rompe, rompe!' }],
      ['volger', { en: 'Something is chasing us! Move!', es: '¡Algo nos persigue! ¡Muévete!' }]
    ],
    lowhp: [
      ['volger', { en: "I can't take much more of this, Percival!", es: '¡No aguanto mucho más, Percival!' }],
      ['seraphin', { en: 'Percival, pull back! Let your armor recover!', es: '¡Percival, retírate! ¡Deja que se recupere tu armadura!' }]
    ]
  },
  events: [
    // ---------- Entrada: pantalla de capítulo → Seraphin (voz) con la entrada de cine → el control → Volger (voz) ----------
    { id: 'briefing', when: { card: true }, do: [SAY('seraphin',
      "Alright, squad, listen up. We've got an unidentified dragon patrol crossing into our airspace. No identification, no response to our hails. They're either lost, stupid, or looking for trouble. None of those options makes me particularly happy. Stay sharp, hold formation, and keep your eyes on them. Don't make any sudden moves, but be ready for anything. We're here to assess the situation, not start a war.",
      'Muy bien, escuadrón, atentos. Una patrulla de dragones sin identificar está cruzando nuestro espacio aéreo. Sin identificación y sin responder a nuestras llamadas. O se han perdido, o son idiotas, o buscan problemas. Ninguna de las tres opciones me hace especialmente feliz. Atentos, mantened la formación y no les quitéis el ojo de encima. Nada de movimientos bruscos, pero estad listos para cualquier cosa. Hemos venido a evaluar la situación, no a empezar una guerra.',
      'seraphin_01')] },
    { id: 'control', when: { after: { event: 'briefing', t: 1 }, quiet: true }, do: [{ cine: 'end' }, { squad: 'patrulla' }] },
    { id: 'volger1', when: { after: { event: 'control', t: 2 } }, do: [SAY('volger',
      "I have a bad feeling about this, Percival... I don't trust them. Who would enter our airspace without permission? Unless... it's an invasion. Stay focused, boy! We might be about to be put to the test.",
      'Esto me da mala espina, Percival... No me fío de ellos. ¿Quién entraría en nuestro espacio aéreo sin permiso? A no ser que... sea una invasión. ¡Concéntrate, chico! Puede que estemos a punto de ponernos a prueba.',
      'volger_01')] },
    // ---------- Fase 1: la patrulla ----------
    { id: 'contacto', when: { after: { event: 'volger1', t: 0.4 }, quiet: true, calm: 'patrulla' }, do: [
      SAY('oracle', 'Paladins, Oracle. Five unknowns dead ahead, closing.', 'Paladins, aquí Oracle. Cinco desconocidos justo delante.'),
      SAY('seraphin', 'Copy. Nobody fires unless I say so.', 'Recibido. Que nadie dispare sin mi orden.')] },
    { id: 'aviso', when: { after: { event: 'contacto', t: 0.3 }, quiet: true, calm: 'patrulla' }, do: [
      SAY('seraphin', 'Unidentified dragons, this is Paladin One. Turn back now, or be escorted down.', 'Dragones sin identificar, aquí Paladin Uno. Dad media vuelta u os escoltaremos a tierra.'),
      SAY('oracle', "No response... They're speeding up!", 'No responden... ¡Están acelerando!')] },
    { id: 'rompen', when: { after: { event: 'aviso', t: 0.2 }, quiet: true, calm: 'patrulla' }, do: [{ engage: 'patrulla' }] },
    { id: 'combate1', when: { engaged: 'patrulla' }, do: [{ hush: true }, { show: 'patrulla' }, { chatter: true },
      SAY('seraphin', "They're breaking formation! Hostile intent confirmed! Paladins, weapons free!", '¡Rompen la formación! ¡Intención hostil confirmada! ¡Paladins, fuego a discreción!'),
      SAY('seraphin', "Percival, they're yours. Show me what I taught you. We'll keep them off your back.", 'Percival, son tuyos. Demuéstrame lo que te he enseñado. Nosotros te los quitamos de encima.'),
      { hint: 'Clic central: fijar un blanco  ·  F (mantener): mirar al blanco fijado  ·  A / D: esquivar' }] },
    { when: { kills: { patrulla: 3 }, pending: ['patrulla'] }, do: [SAY('oracle', 'Three down. Two left.', 'Tres abatidos. Quedan dos.')] },
    { id: 'fase1', when: { cleared: ['patrulla'] }, do: [{ hush: true }, { chatter: false },
      SAY('oracle', 'All five hostiles down. Good kills, Paladin Three.', 'Los cinco hostiles, abatidos. Buenos derribos, Paladin Tres.'),
      SAY('seraphin', 'Not bad, Percival. Not bad at all.', 'Nada mal, Percival. Nada mal.'),
      SAY('minotaur', 'Who were they? No colors, no banners...', '¿Quiénes eran? Sin colores, sin estandartes...'),
      SAY('seraphin', "Scouts. And scouts never fly alone.", 'Exploradores. Y los exploradores nunca vuelan solos.')] },
    // ---------- Fase 2: dos escuadrones, este y oeste ----------
    { id: 'fase2', when: { after: { event: 'fase1', t: 1.5 }, quiet: true }, do: [
      SAY('oracle', 'Alert! Two more squadrons inbound, east and west, eight kilometers out! Six dragons each!', '¡Alerta! Dos escuadrones más se acercan, por el este y por el oeste, a ocho kilómetros. ¡Seis dragones cada uno!'),
      { squad: ['este', 'oeste'] }, { show: 'este' }, { show: 'oeste' }, { chatter: true },
      SAY('jester', 'Oh, great. They brought friends.', 'Genial. Han traído amigos.'),
      SAY('seraphin', "They want to catch us in a pincer. Percival, pick a side and hit them hard. Paladins, keep his tail clean!", 'Quieren cogernos en una pinza. Percival, elige un flanco y golpea fuerte. ¡Paladins, mantened limpia su cola!')] },
    { when: { cleared: ['este'], pending: ['oeste'] }, do: [SAY('oracle', 'Eastern squadron eliminated. The western one is still coming.', 'Escuadrón del este, eliminado. El del oeste sigue ahí.')] },
    { when: { cleared: ['oeste'], pending: ['este'] }, do: [SAY('oracle', 'Western squadron eliminated. Turn east, Percival.', 'Escuadrón del oeste, eliminado. Gira al este, Percival.')] },
    { id: 'fase2b', when: { done: ['este', 'oeste'] }, do: [{ hush: true }, { chatter: false },
      SAY('oracle', 'Both squadrons destroyed. The sky over Skyreach is yours, Paladin.', 'Los dos escuadrones, destruidos. El cielo de Skyreach es vuestro, Paladin.'),
      SAY('lance', 'Seventeen dragons... This was no patrol, Seraphin.', 'Diecisiete dragones... Esto no era una patrulla, Seraphin.'),
      SAY('seraphin', 'No. It was a screen. They were clearing the sky for something else.', 'No. Era una pantalla. Estaban despejando el cielo para otra cosa.'),
      SAY('volger', 'I smell smoke on the wind, Percival. Smoke and steel. From the north.', 'Huelo humo en el viento, Percival. Humo y acero. Viene del norte.')] },
    // ---------- Fase 3: el ejército de las llanuras ----------
    { id: 'fase3', when: { after: { event: 'fase2b', t: 1 }, quiet: true }, do: [{ spawn: 'ejercito' },
      SAY('oracle', 'Paladin, the watchtowers on the northern plains just went dark. Large ground force, fifteen kilometers north of you: thousands of soldiers, siege artillery and an airship escort.', 'Paladin, las torres de vigía de las llanuras del norte acaban de apagarse. Una gran fuerza terrestre a quince kilómetros al norte: miles de soldados, artillería de asedio y una escolta de dirigibles.'),
      SAY('minotaur', 'An army? On our soil?', '¿Un ejército? ¿En nuestras tierras?'),
      SAY('seraphin', 'Then it IS an invasion. Paladins, north, full speed! We stop them on the plains, before they reach the villages.', 'Entonces sí es una invasión. ¡Paladins, al norte, a toda velocidad! Los detenemos en las llanuras, antes de que lleguen a las aldeas.'),
      { show: 'batallones' }, { show: 'artilleria' }, { show: 'dirigibles' }, { chatter: true },
      SAY('seraphin', 'Percival, burn those battalions. Fly low and straight, and let your flame do the work.', 'Percival, quema esos batallones. Vuela bajo y recto, y deja que tu llamarada haga el trabajo.'),
      { hint: 'Boost (Shift) para llegar antes  ·  Mantén Espacio para volar recto y barre los batallones con la llamarada (clic dcho.)' }] },
    { when: { near: { tag: 'ejercito', d: 6000 } }, do: [
      SAY('jester', "By the gods... look at them. It's a sea of spears down there.", 'Por todos los dioses... Miradlos. Ahí abajo hay un mar de lanzas.'),
      SAY('oracle', 'Airships escorting the column. Careful: their cannons cover the flanks.', 'Dirigibles escoltando la columna. Cuidado: sus cañones cubren los costados.'),
      SAY('seraphin', 'Hit them from the bow or the stern, Percival. Never the broadside.', 'Atácalos por la proa o por la popa, Percival. Nunca por el costado.')] },
    { when: { done: ['dirigibles'], pending: ['batallones'] }, do: [SAY('lance', "Their air cover's gone! Now the ground troops!", '¡Ya no tienen cobertura aérea! ¡Ahora, las tropas de tierra!')] },
    { when: { kills: { artilleria: 5 }, pending: ['artilleria'] }, do: [SAY('oracle', 'Half of their artillery is down.', 'La mitad de su artillería, destruida.')] },
    { id: 'fase3b', when: { done: ['batallones', 'artilleria', 'dirigibles'] }, do: [{ hush: true }, { chatter: false },
      SAY('oracle', 'Ground force neutralized. The plains are clear.', 'Fuerza terrestre neutralizada. Las llanuras están despejadas.'),
      SAY('jester', "Is it over? Tell me it's over.", '¿Se acabó? Decidme que se acabó.'),
      SAY('seraphin', "Stay sharp. Something about this still doesn't...", 'Atentos. Hay algo en todo esto que todavía no...', null)] },
    // ---------- Fase 4: el portal y el superdirigible ----------
    { id: 'portal', when: { after: { event: 'fase3b', t: 0.6 }, quiet: true }, do: [
      SAY('oracle', "Paladin, wait! Massive arcane surge, six kilometers north of you! I've never seen readings like this!", '¡Paladin, esperad! ¡Una oleada arcana enorme, a seis kilómetros al norte! ¡Nunca había visto lecturas así!'),
      { portal: { dist: 6000, bearing: 0, height: 1500, r: 480, form: 7, close: 3, hp: 500, tag: 'fortaleza', beam: true } },
      { cine: { to: 'portal', climb: 350, shots: [
        { dur: 9, from: [38, 26, 95], to: [24, 18, 62], lookAt: 'portal', fov: 34 },        // detrás de Percival, con teleobjetivo hacia el portal
        { dur: 16, from: [1500, 260, -2300], to: [1350, 220, -2050], lookAt: 'super', fov: 42 }] } },   // de lado, lejos: sale el superdirigible
      SAY('volger', 'Percival... the sky itself is tearing open.', 'Percival... el propio cielo se está desgarrando.'),
      SAY('jester', 'Is that... a door? In the sky?', '¿Eso es... una puerta? ¿En el cielo?')] },
    { when: { signal: 'portal_abierto' }, do: [{ music: 'tension' },
      SAY('minotaur', "That's not a ship. That's a fortress!", '¡Eso no es un barco! ¡Es una fortaleza!'),
      SAY('oracle', "Paladin, that thing is over a kilometer long! It's heading south... toward the capital!", '¡Paladin, esa cosa mide más de un kilómetro! Va hacia el sur... ¡hacia la capital!')] },
    { when: { signal: 'portal_fuera' }, do: [SAY('seraphin', "Everyone, listen to me. If that thing reaches the capital, it's over. We bring it down here. Now.", 'Escuchadme todos. Si esa cosa llega a la capital, se acabó. La derribamos aquí. Ahora.')] },
    { id: 'fase4', when: { signal: 'portal_cerrado' }, do: [{ cine: 'end' }, { squad: 'escolta' }, { show: 'super' }, { show: 'escolta' }, { chatter: true },
      SAY('lance', 'Dragons launching from its hull! Six of them!', '¡Salen dragones de su casco! ¡Seis!'),
      SAY('seraphin', "Percival, hit the core with everything you've got! We'll keep the escorts busy!", '¡Percival, dale al núcleo con todo lo que tengas! ¡Nosotros entretenemos a la escolta!'),
      { hint: 'El núcleo es el casco: las bolas guiadas y el rayo de fuego le hacen mucho daño. Sus torretas disparan por los costados' }] },
    // el rayo de la proa (6i): avisos y quién tiene que apartarse
    { when: { signal: 'rayo_carga', n: 1 }, do: [{ hush: true },
      SAY('jester', 'Uh... why is the front of that thing glowing?', 'Eh... ¿por qué brilla la proa de esa cosa?'),
      SAY('oracle', "Energy spike at the bow! It's charging a weapon!", '¡Pico de energía en la proa! ¡Está cargando un arma!'),
      SAY('seraphin', "Everyone, spread out! Don't stay in front of it!", '¡Dispersaos! ¡Que nadie se quede delante!')] },
    { when: { signal: 'rayo_carga', nMin: 2 }, each: true, do: [SAY('oracle', "It's charging again! Spread out!", '¡Está cargando otra vez! ¡Dispersaos!')] },
    { when: { signal: 'rayo_fuego' }, each: true, do: [{ hush: true }, { sayFor: { signal: 'rayo_fuego', lines: {
      seraphin: ['lance', { en: "Seraphin, it's targeting you! Break!", es: '¡Seraphin, te apunta a ti! ¡Apártate!' }],
      lance: ['seraphin', { en: "Lance, it's aiming at you! BREAK!", es: '¡Lance, te está apuntando! ¡APÁRTATE!' }],
      minotaur: ['seraphin', { en: 'Minotaur, break right! NOW!', es: '¡Minotaur, rompe a la derecha! ¡YA!' }],
      jester: ['seraphin', { en: 'Jester! Get out of there!', es: '¡Jester! ¡Sal de ahí!' }] } } }] },
    { when: { signal: 'rayo_fin' }, each: true, do: [{ sayFor: { signal: 'rayo_fuego', lines: {
      seraphin: ['seraphin', { en: 'Close. Too close. Percival, end this!', es: 'Cerca. Demasiado cerca. ¡Percival, acaba con esto!' }],
      lance: ['lance', { en: 'That was too close! I felt the heat through my armor!', es: '¡Por los pelos! ¡He sentido el calor a través de la armadura!' }],
      minotaur: ['minotaur', { en: 'Ha! Missed me, you overgrown bathtub!', es: '¡Ja! ¡Has fallado, bañera con alas!' }],
      jester: ['jester', { en: "I'm okay! I'm okay... I think my eyebrows are gone.", es: '¡Estoy bien! Estoy bien... Creo que me he quedado sin cejas.' }] } } }] },
    { when: { signal: 'rayo_fin', n: 1 }, do: [SAY('volger', "Percival, that weapon could melt a mountain. Don't let it fire again!", 'Percival, esa arma podría fundir una montaña. ¡No dejes que vuelva a disparar!')] },
    { when: { unitHp: { target: 'superdirigible', below: 0.5 } }, do: [SAY('oracle', 'The core is failing! Keep it up!', '¡El núcleo está cediendo! ¡Seguid así!')] },
    { when: { unitHp: { target: 'superdirigible', below: 0.2 } }, do: [SAY('seraphin', "It's breaking apart! Finish it, Percival!", '¡Se está haciendo pedazos! ¡Remátala, Percival!')] },
    { when: { done: ['super'] }, do: [{ hush: true },
      SAY('oracle', "The fortress is going down! I repeat, it's going down!", '¡La fortaleza cae! ¡Repito, la fortaleza cae!'),
      SAY('minotaur', 'YEAH! Burn, you monster!', '¡SÍ! ¡Arde, monstruo!')] },
    { when: { done: ['super'], pending: ['escolta'] }, do: [SAY('seraphin', 'Clean up the rest, Percival!', '¡Acaba con los que quedan, Percival!')] },
    // ---------- Final ----------
    { id: 'final', when: { done: ['super', 'escolta'], quiet: true }, do: [{ chatter: false },
      SAY('oracle', 'All hostiles eliminated. The skies over Skyreach are clear. Paladin Squadron... you did it.', 'Todos los hostiles eliminados. El cielo de Skyreach está despejado. Escuadrón Paladin... lo habéis conseguido.'),
      SAY('jester', 'Remind me to never complain about boring patrols again.', 'Recordadme que nunca más me queje de las patrullas aburridas.'),
      SAY('lance', 'You flew like a veteran out there, Percival.', 'Hoy has volado como un veterano, Percival.'),
      SAY('seraphin', "He did. Trial by fire, Percival. And you didn't burn.", 'Así es. Una prueba de fuego, Percival. Y no te has quemado.'),
      SAY('seraphin', 'But that portal... Whoever opened it is still out there. This was only the beginning.', 'Pero ese portal... Quien lo abriera sigue ahí fuera. Esto solo ha sido el principio.'),
      SAY('volger', "We were put to the test, boy. And we're still flying. Let's go home.", 'Nos han puesto a prueba, chico. Y seguimos volando. Volvamos a casa.'),
      SAY('seraphin', "Paladin Squadron, form up. We're going home.", 'Escuadrón Paladin, en formación. Volvemos a casa.')] },
    { id: 'fundido', when: { after: { event: 'final', t: 1 }, quiet: true }, do: [{ fade: 3 }] },
    { when: { after: { event: 'fundido', t: 3.4 } }, do: [{ win: 0 }] },
    { when: { hp: 30 }, repeat: 35, do: [SAY('oracle', "Paladin Three, you're badly hurt! Pull back and let your armor recover!", '¡Paladin Tres, estás muy tocado! ¡Retírate y deja que tu armadura se recupere!')] }
  ]
};
