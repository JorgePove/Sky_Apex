
/* ============================================================
   7c. STATS DE LAS UNIDADES (v24): el Excel datos/sky_apex_stats.xlsx
   Las stats de los dragones del jugador (pestaña «Base» y una por dragón), de los enemigos y de Lance salen de ese Excel.
   · El juego lo lee al abrirse y al empezar cada partida; abierto desde un servidor local (Jugar.bat), además lo vigila cada
     STATS_POLL s: al guardar en Excel, los valores nuevos se aplican al momento (también en pleno vuelo).
   · Si no puede leerlo (sky_apex.html abierto con doble clic: el navegador no deja leer archivos sueltos), usa la copia que
     construir.mjs mete en el HTML al construirlo (STATS_EMBED).
   · STATS_SCHEMA: qué hay en cada tipo de pestaña (clave, nombre, unidad, valor por defecto, descripción y si es un ajuste extra, que
     Jorge no pidió pero estaba en el código). Lo usan el juego, construir.mjs y herramientas/stats_excel.mjs (crea o amplía el Excel).
     Una clave que falte en el Excel toma el valor de la Base (en los dragones) o el de aquí, y sale un aviso en la consola.
   · xlsxSheets: lector de .xlsx propio (un .xlsx es un zip con XML): lee el valor guardado de cada celda, también el de las fórmulas
     (Excel lo guarda al grabar). statsFromSheets busca en cada pestaña la fila con «Valor» y «Clave» y lee las filas de debajo.
   Esta primera parte (hasta «En el juego») no toca nada del juego: construir.mjs y stats_excel.mjs la cargan en Node.
   ============================================================ */
const STATS_FILE = 'datos/sky_apex_stats.xlsx', STATS_POLL = 2;
/* Filas: [clave, nombre, unidad, por defecto, descripción, extra]; { sec } = título de sección. */
const STATS_SCHEMA = {
  dragon: [
    { sec: 'Vida y defensa' },
    ['vida', 'Puntos de vida', 'puntos', 100, 'Vida máxima. Ya no se regenera: lo que pierdes no vuelve hasta la siguiente misión (o al reaparecer en el combate libre).'],
    ['armadura', 'Puntos de armadura', 'puntos', 50, 'Barra amarilla encima de la de vida. El daño la gasta primero a ella y, cuando llega a 0, a la vida.'],
    ['armadura_espera', 'Espera para regenerar la armadura', 's', 5, 'Segundos sin recibir daño antes de que la armadura empiece a rellenarse.'],
    ['armadura_regen', 'Regeneración de armadura', 'puntos/s', 5, 'Lo que se rellena cada segundo, hasta el máximo.'],
    ['escudos', 'Slots de escudo', 'cargas', 2, 'Cargas del escudo (R) al empezar; también es el máximo.'],
    ['escudo_duracion', 'Duración del escudo', 's', 5, 'Segundos que dura cada carga.', 1],
    ['escudo_por_derribo', 'Escudo por dragón derribado', 'cargas', 1, 'Cargas que devuelve cada dragón que derribas tú (0 = no se recargan).', 1],
    { sec: 'Disparo básico (clic izquierdo)' },
    ['basico_dano', 'Daño disparo básico', 'puntos', 5, 'Daño de cada impacto.'],
    ['basico_municion', 'Munición disparo básico', 'disparos', 20, 'Disparos seguidos; se recargan solos.'],
    ['basico_pausa', 'Pausa mínima entre disparos', 's', 0.1, 'Un disparo por clic, como mucho uno cada tanto.', 1],
    ['basico_recarga_espera', 'Espera antes de recargar', 's', 1, 'Segundos sin disparar antes de que vuelva la munición.', 1],
    ['basico_recarga', 'Recarga de munición', 'disparos/s', 8, 'Disparos que vuelven cada segundo.', 1],
    { sec: 'Disparo guiado (clic izquierdo mantenido)' },
    ['guiado_dano', 'Daño disparo guiado', 'puntos', 60, 'Daño del impacto.'],
    ['guiado_municion', 'Munición disparo guiado', 'disparos', 20, 'Cantidad fija por misión: no se recargan. A 0, no hay más.'],
    ['guiado_alcance', 'Alcance del fijado', 'm', 3000, 'Distancia máxima al blanco para cargar el guiado.', 1],
    ['guiado_fijado', 'Tiempo de fijado', 's', 3, 'Segundos con la mira en el círculo rojo hasta que sale.', 1],
    { sec: 'Lanzallamas (clic derecho)' },
    ['llamas_dano', 'Daño lanzallamas', 'puntos/s', 15, 'Daño por segundo a todo lo que toca.'],
    ['llamas_alcance', 'Alcance lanzallamas', 'm', 300, 'Largo del chorro.'],
    ['llamas_sobrecarga', 'Tiempo sobrecarga del lanzallamas', 's', 5, 'Segundos de fuego seguido hasta sobrecalentarse.'],
    ['llamas_bloqueo', 'Tiempo sin armas al sobrecalentarse', 's', 10, 'Al sobrecalentarse, ninguna arma funciona durante este tiempo.', 1],
    ['llamas_enfriado', 'Tiempo en enfriarse', 's', 4, 'Al soltar antes de sobrecalentarse, el calor baja de 100 % a 0 en este tiempo.', 1],
    { sec: 'Rayo láser (los dos clics a la vez)' },
    ['rayo_dano', 'Daño rayo láser', 'puntos/s', 50, 'Daño por segundo a todo lo que cruza.'],
    ['rayo_duracion', 'Duración rayo láser', 's', 5, 'Segundos desde que lo lanzas.'],
    ['rayo_alcance', 'Distancia rayo láser', 'km', 8, 'Largo máximo del rayo (se corta al chocar con el terreno o una isla).'],
    ['rayo_recarga', 'Recarga rayo láser', '%/s', 0.5, 'Carga con el tiempo (con 0,5 %/s, de 0 a 100 % en 200 s).'],
    ['rayo_por_derribo', 'Recarga por enemigo destruido', '%', 5, 'Por cada dragón, torre, dirigible u otra unidad enemiga que destruyes tú (no Lance; los soldados sueltos no cuentan, el batallón entero sí).'],
    { sec: 'Vuelo' },
    ['vel_max', 'Velocidad máxima', 'km/h', 600, 'A todo gas y en vuelo nivelado, sin boost (en picado se puede pasar).'],
    ['vel_boost', 'Velocidad boost', 'km/h', 1000, 'Con boost. También es el tope absoluto, picados incluidos.'],
    ['boost_duracion', 'Duración boost', 's', 10, 'Segundos de boost seguido con la barra llena.'],
    ['boost_aceleracion', 'Aceleración del boost', 's', 3, 'Segundos en pasar de la velocidad máxima a la de boost.'],
    ['boost_espera', 'Espera para recargar el boost', 's', 2, 'Segundos sin usarlo antes de que empiece a recargarse.'],
    ['boost_recarga', 'Recarga boost', '%/s', 2, 'Lo que se recarga cada segundo (con 2 %/s, de 0 a 100 % en 50 s).'],
    ['giro_radio', 'Radio de giro', 'm', 110, 'El del giro más cerrado a la velocidad máxima (medido en el juego; el de antes de la v24). Más despacio gira más cerrado; con boost, mucho más abierto.']
  ],
  enemigo: [
    { sec: 'Vida y vuelo' },
    ['vida', 'Puntos de vida', 'puntos', 100, ''],
    ['velocidad', 'Velocidad máxima', 'km/h', 550, ''],
    ['giro_radio', 'Radio de giro', 'm', 130, 'El del giro más cerrado a su velocidad máxima: cuanto más grande, más abiertos sus giros. Si es mayor que el tuyo (Base: 110 m), al perseguirlo puedes cerrar el giro y apuntarle (v26: 130; antes, unos 104 m).'],
    ['deteccion', 'Distancia de detección', 'm', 2000, 'A esta distancia te detecta y empieza sus pasadas.'],
    ['perder', 'Distancia a la que te pierde', 'm', 3800, ''],
    ['puntos', 'Puntos al derribarlo', 'puntos', 300, ''],
    { sec: 'Huida (cuando le persigues)' },
    ['huida_distancia', 'Distancia a la que se siente perseguido', 'm', 1800, 'Con el jugador detrás, apuntándole y más cerca que esto, huye hacia delante con maniobras amplias (eses, curvas abiertas, tirabuzón, subidas y picados).', 1],
    ['huida_min', 'Tiempo de huida (mínimo)', 's', 10, 'Pasado este tiempo (entre el mínimo y el máximo) da la vuelta con una curva abierta y vuelve a atacar.', 1],
    ['huida_max', 'Tiempo de huida (máximo)', 's', 18, '', 1],
    { sec: 'Bola de fuego' },
    ['bola_dano', 'Daño bola de fuego', 'puntos', 15, ''],
    ['bola_alcance', 'Alcance', 'm', 1000, ''],
    ['bola_pausa_min', 'Pausa entre bolas (mínima)', 's', 1.7, ''],
    ['bola_pausa_max', 'Pausa entre bolas (máxima)', 's', 2.9, ''],
    ['bola_error', 'Error de puntería', '% de la distancia', 2.2, ''],
    { sec: 'Bola guiada' },
    ['guiada_dano', 'Daño bola guiada', 'puntos', 35, ''],
    ['guiada_fijado', 'Tiempo de fijado', 's', 4, 'Segundos fijándote (aviso «TE ESTÁN FIJANDO») antes de lanzarla.'],
    ['guiada_alcance_min', 'Distancia mínima de lanzamiento', 'm', 500, ''],
    ['guiada_alcance_max', 'Distancia máxima de lanzamiento', 'm', 2500, ''],
    ['guiada_pausa', 'Pausa entre guiadas de un mismo dragón', 's', 60, ''],
    ['guiada_separacion', 'Separación entre guiadas de todos', 's', 20, 'Entre dos lanzamientos de dragones cualesquiera.'],
    ['guiada_vel', 'Velocidad máxima de la guiada', 'km/h', 1152, ''],
    ['guiada_giro', 'Giro de la guiada', '°/s', 40, 'Cuanto menos, más fácil esquivarla rompiendo fuerte.'],
    { sec: 'Choques' },
    ['choque_dano', 'Daño que te hace al chocar', 'puntos', 25, ''],
    ['choque_recibe', 'Daño que recibe al chocar', 'puntos', 50, '']
  ],
  torre: [
    { sec: 'Vida' },
    ['vida', 'Puntos de vida', 'puntos', 60, ''],
    ['puntos', 'Puntos al destruirla', 'puntos', 100, ''],
    ['guiada_destruye', 'Un disparo guiado la destruye siempre', '1 = sí, 0 = no', 1, 'Con 1, una guiada la tira aunque haga menos daño que su vida.'],
    { sec: 'Fuego antiaéreo' },
    ['aa_dano', 'Daño por proyectil', 'puntos', 3, ''],
    ['aa_alcance', 'Alcance', 'm', 1500, ''],
    ['aa_rafaga', 'Proyectiles por ráfaga', 'disparos', 5, ''],
    ['aa_cadencia', 'Pausa entre disparos de la ráfaga', 's', 0.12, ''],
    ['aa_pausa_min', 'Pausa entre ráfagas (mínima)', 's', 2.2, ''],
    ['aa_pausa_max', 'Pausa entre ráfagas (máxima)', 's', 3.6, ''],
    ['aa_vel', 'Velocidad del proyectil', 'm/s', 1100, ''],
    ['aa_dispersion', 'Dispersión', '°', 1.43, '']
  ],
  dirigible: [
    { sec: 'Vida' },
    ['vida', 'Puntos de vida', 'puntos', 50, ''],
    ['puntos', 'Puntos al destruirlo', 'puntos', 200, ''],
    { sec: 'Cañones (solo por los costados)' },
    ['dano', 'Daño por proyectil', 'puntos', 2, ''],
    ['alcance', 'Alcance', 'm', 2000, ''],
    ['cadencia', 'Pausa entre disparos', 's', 0.3, 'Disparan sin pausas entre ráfagas.'],
    ['vel', 'Velocidad del proyectil', 'm/s', 800, ''],
    ['dispersion', 'Dispersión', '°', 1.72, ''],
    ['muerto_proa', 'Ángulo muerto a proa y a popa', '°', 35, 'Medido desde el eje del barco: ahí no pueden apuntarte.'],
    ['muerto_vertical', 'Elevación máxima de los cañones', '°', 70, 'Más arriba o más abajo no pueden apuntarte.']
  ],
  /* v29: unidades nuevas (6f; lista de Jorge del 30-oct). Valores provisionales, para ajustar en la galería de enemigos. */
  artilleria: [
    { sec: 'Vida' },
    ['vida', 'Puntos de vida', 'puntos', 40, 'Balista, catapulta y cañón son iguales: solo cambia el aspecto (y el aspecto del proyectil).'],
    ['puntos', 'Puntos al destruirla', 'puntos', 80, ''],
    { sec: 'Tamaño y movimiento' },
    ['largo', 'Largo', 'm', 11, 'Tamaño en el juego: los tres modelos se escalan a este largo.'],
    ['velocidad', 'Velocidad', 'km/h', 20, 'Unidad de tierra lenta. Aún sin uso: en la galería están quietas (llegará con las misiones).'],
    { sec: 'Disparo (muy de vez en cuando)' },
    ['dano', 'Daño por proyectil', 'puntos', 3, 'Anecdótico: en las misiones su papel será atacar a las unidades de tierra aliadas.'],
    ['alcance', 'Alcance', 'm', 1500, ''],
    ['pausa_min', 'Pausa entre disparos (mínima)', 's', 6, ''],
    ['pausa_max', 'Pausa entre disparos (máxima)', 's', 10, ''],
    ['vel', 'Velocidad del proyectil', 'm/s', 200, 'Con parábola: la gravedad lo hace caer (apuntan con adelanto).'],
    ['dispersion', 'Dispersión', '°', 2.5, '']
  ],
  batallon: [
    { sec: 'Soldados' },
    ['soldados_min', 'Soldados por batallón (mínimo)', 'soldados', 80, 'Cada bloque sale con un número al azar entre el mínimo y el máximo (la receta puede fijarlo).'],
    ['soldados_max', 'Soldados por batallón (máximo)', 'soldados', 300, ''],
    ['separacion', 'Separación entre soldados', 'm', 1.6, 'En la formación rectangular. Se nota al empezar otra partida o al restaurar la galería.'],
    ['vida', 'Vida de cada soldado', 'puntos', 2, 'Con la llamarada (15/s) arden casi al instante.'],
    ['puntos_soldado', 'Puntos por soldado', 'puntos', 2, ''],
    ['puntos', 'Puntos al aniquilar el batallón', 'puntos', 150, 'Además de los de cada soldado.'],
    ['velocidad', 'Velocidad de marcha', 'km/h', 5, 'Aún sin uso: en la galería están quietos.', 1],
    { sec: 'Daño que reciben' },
    ['radio_llamas', 'Radio extra de la llamarada', 'm', 3, 'Se suma al cono de la llamarada (2 m + un 11 % de la distancia).'],
    ['radio_basico', 'Radio del disparo básico', 'm', 2.5, 'Mueren los soldados a menos de esto del impacto.'],
    ['radio_guiado', 'Radio del disparo guiado', 'm', 12, ''],
    ['radio_rayo', 'Radio del rayo láser', 'm', 5, ''],
    { sec: 'Flechas (sobre todo un efecto)' },
    ['flechas_alcance', 'Alcance', 'm', 400, 'Disparan cuando pasas a menos de esto.'],
    ['flechas_andanada', 'Flechas por andanada', 'flechas', 40, 'Con el batallón entero (con menos soldados, menos flechas).'],
    ['flechas_pausa', 'Pausa entre andanadas', 's', 2.5, ''],
    ['flechas_vel', 'Velocidad de las flechas', 'm/s', 75, 'Con parábola.'],
    ['flechas_dispersion', 'Dispersión', '°', 4, ''],
    ['flechas_dano', 'Daño por flecha', 'puntos', 0.1, 'Despreciable, a propósito (en hover justo encima, ~1 punto por segundo).']
  ],
  barco_naval: [
    { sec: 'Vida' },
    ['vida', 'Puntos de vida', 'puntos', 50, 'Como los dirigibles: un disparo guiado (60) lo hunde.'],
    ['puntos', 'Puntos al hundirlo', 'puntos', 200, ''],
    { sec: 'Tamaño y movimiento' },
    ['largo', 'Eslora', 'm', 110, ''],
    ['velocidad', 'Velocidad', 'km/h', 30, 'Aún sin uso: en la galería están quietos.'],
    { sec: 'Cañones (solo por los costados, como los dirigibles)' },
    ['dano', 'Daño por proyectil', 'puntos', 2, ''],
    ['alcance', 'Alcance', 'm', 2000, ''],
    ['cadencia', 'Pausa entre disparos', 's', 0.3, ''],
    ['vel', 'Velocidad del proyectil', 'm/s', 800, ''],
    ['dispersion', 'Dispersión', '°', 1.72, ''],
    ['muerto_proa', 'Ángulo muerto a proa y a popa', '°', 35, 'Medido desde el eje del barco: ahí no pueden apuntarte.'],
    ['muerto_vertical', 'Elevación máxima de los cañones', '°', 70, '']
  ],
  superdirigible: [
    { sec: 'Núcleo (el casco)' },
    ['vida', 'Puntos de vida del núcleo', 'puntos', 1500, 'Se puede dañar aunque queden torretas; al caer, caen todas.'],
    ['puntos', 'Puntos al destruirlo', 'puntos', 2000, ''],
    ['largo', 'Eslora', 'm', 1000, 'Jorge: 500 m como mínimo (v29) y luego el doble (v30). Las torretas no cambian de tamaño: quedan más separadas.'],
    ['altura_min', 'Altura mínima de vuelo', 'm', 1500, 'Sobre el suelo. La receta puede ponerlo más alto, nunca más bajo.'],
    ['velocidad', 'Velocidad', 'km/h', 60, 'Aún sin uso: en la galería está quieto.'],
    { sec: 'Torretas (cañones y balistas sobre la cubierta)' },
    ['torretas', 'Torretas por costado', 'torretas', 6, 'Alternan cañón y balista; se fijan y se destruyen una a una (como mucho 6).'],
    ['torreta_vida', 'Vida de cada torreta', 'puntos', 50, ''],
    ['torreta_puntos', 'Puntos por torreta', 'puntos', 100, ''],
    ['torreta_largo', 'Tamaño de cada torreta', 'm', 24, ''],
    ['torreta_cadencia', 'Pausa entre disparos de cada torreta', 's', 1.5, 'Cada torreta dispara por su cuenta, solo hacia su costado.'],
    ['dano', 'Daño por proyectil', 'puntos', 2, 'Como los cañones de los dirigibles.'],
    ['alcance', 'Alcance', 'm', 2000, ''],
    ['vel', 'Velocidad del proyectil', 'm/s', 800, ''],
    ['dispersion', 'Dispersión', '°', 1.72, ''],
    ['muerto_proa', 'Ángulo muerto a proa y a popa', '°', 35, 'Como los dirigibles: medido desde el eje del casco.'],
    ['muerto_vertical', 'Elevación máxima', '°', 70, '']
  ],
  sierpe: [
    { sec: 'Vida y tamaño' },
    ['vida', 'Puntos de vida', 'puntos', 3000, 'Solo recibe daño cuando cae su escudo.'],
    ['puntos', 'Puntos al abatirla', 'puntos', 5000, ''],
    ['largo', 'Largo', 'm', 500, ''],
    { sec: 'Vuelo' },
    ['altura', 'Altura de vuelo', 'm', 2000, 'Sobre el suelo, si la receta no dice otra.'],
    ['radio_circulo', 'Radio del círculo', 'm', 3500, 'En vuelo circular: su patrulla (en la galería, sobre todo el campo).'],
    ['velocidad', 'Velocidad', 'km/h', 150, 'En vuelo circular.'],
    { sec: 'Llamarada (si te pones delante de la cabeza)' },
    ['llamas_dano', 'Daño', 'puntos/s', 40, ''],
    ['llamas_alcance', 'Alcance', 'm', 900, ''],
    ['llamas_angulo', 'Ángulo para empezarla', '°', 25, 'Te tiene que tener delante de la cabeza, a menos de este ángulo.'],
    ['llamas_duracion', 'Duración', 's', 4, ''],
    ['llamas_pausa', 'Pausa entre llamaradas', 's', 6, ''],
    { sec: 'Bolas de fuego (como los dragones enemigos)' },
    ['bola_dano', 'Daño', 'puntos', 15, ''],
    ['bola_alcance', 'Alcance', 'm', 1500, ''],
    ['bola_pausa_min', 'Pausa entre bolas (mínima)', 's', 1.2, ''],
    ['bola_pausa_max', 'Pausa entre bolas (máxima)', 's', 2.4, ''],
    { sec: 'Hechiceros y escudo' },
    ['hechiceros', 'Hechiceros en el lomo', 'hechiceros', 3, 'Mientras quede alguno, el escudo la protege de todo daño (como mucho 3).'],
    ['hechicero_vida', 'Vida de cada hechicero', 'puntos', 60, ''],
    ['hechicero_puntos', 'Puntos por hechicero', 'puntos', 300, '']
  ],
  lance: [
    { sec: 'Armas (solo disparo básico y lanzallamas)' },
    ['basico_dano', 'Daño disparo básico', 'puntos', 5, ''],
    ['basico_pausa_min', 'Pausa entre disparos (mínima)', 's', 0.14, ''],
    ['basico_pausa_max', 'Pausa entre disparos (máxima)', 's', 0.26, ''],
    ['basico_alcance', 'Alcance de tiro', 'm', 1000, ''],
    ['basico_error', 'Error de puntería', '% de la distancia', 1, ''],
    ['llamas_dano', 'Daño lanzallamas', 'puntos/s', 70, 'El de antes de la v24 (el tuyo baja a 15).'],
    ['llamas_alcance', 'Alcance lanzallamas', 'm', 200, ''],
    { sec: 'Vuelo y combate' },
    ['vel_max', 'Velocidad máxima', 'km/h', 1100, 'Para alcanzarte en formación; en combate vuela como los dragones enemigos.'],
    ['combate_distancia', 'Distancia para entrar en combate', 'm', 2000, 'Con un enemigo a menos de esto (de ti o de él), deja la formación y ataca.'],
    ['proteger_dist', 'Distancia de protección', 'm', 1000, 'Dragones que van a por ti a menos de esto: los que Lance prefiere atacar.'],
    ['proteger_prob', 'Probabilidad de protegerte', '%', 60, 'Al cambiar de blanco, elige a uno de esos dragones con esta probabilidad.'],
    ['proteger_urgente', 'Distancia de protección urgente', 'm', 600, 'Un dragón que va a por ti a menos de esto: Lance va a por él al momento.'],
    ['blanco_min', 'Tiempo con el mismo blanco (mínimo)', 's', 5, ''],
    ['blanco_max', 'Tiempo con el mismo blanco (máximo)', 's', 10, '']
  ]
};
/* Pestañas del Excel → unidad del juego (las de los dragones, con el id de DRAGONS). */
const STATS_TABS = [
  { tab: 'Base', unit: 'base', kind: 'dragon' },
  { tab: 'Alientormenta', unit: 'tyrant', kind: 'dragon' }, { tab: 'Abrasanubes', unit: 'rojo', kind: 'dragon' },
  { tab: 'Ventoscuro', unit: 'drogon', kind: 'dragon' }, { tab: 'Fulgor', unit: 'fulgor', kind: 'dragon' },
  { tab: 'Dragón enemigo', unit: 'enemigo', kind: 'enemigo' }, { tab: 'Torre', unit: 'torre', kind: 'torre' },
  { tab: 'Dirigible', unit: 'dirigible', kind: 'dirigible' },
  // v29: unidades nuevas (6f); note = subtítulo de su pestaña en el Excel
  { tab: 'Artillería', unit: 'artilleria', kind: 'artilleria', note: 'Nueva (v29): balistas, catapultas y cañones, la defensa terrestre móvil. Valores provisionales.' },
  { tab: 'Batallón', unit: 'batallon', kind: 'batallon', note: 'Nueva (v29): bloques de soldados, el objetivo de la llamarada a ras de tierra. Valores provisionales.' },
  { tab: 'Barco naval', unit: 'barco_naval', kind: 'barco_naval', note: 'Nueva (v29): barcos en el mar, como los dirigibles. Valores provisionales.' },
  { tab: 'Superdirigible', unit: 'superdirigible', kind: 'superdirigible', note: 'Nueva (v29): megaestructura del cielo con torretas que se destruyen aparte. Valores provisionales.' },
  { tab: 'Sierpe', unit: 'sierpe', kind: 'sierpe', note: 'Nueva (v29): dragón serpiente gigante (minijefe) con hechiceros que la escudan. Valores provisionales.' },
  { tab: 'Lance (aliado)', unit: 'lance', kind: 'lance' }
];
const statsNorm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* .xlsx → { pestaña: filas } (filas[i][j] = valor de la celda: número, texto, true/false o undefined). filas.f[«i,j»] = fórmula, si la hay
   (texto, o '' si es una fórmula compartida de Excel). inflateRaw(bytes) → bytes descomprimidos (Promise o no): en el navegador con
   DecompressionStream, en Node con zlib. */
async function xlsxSheets(buf, inflateRaw) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), dec = new TextDecoder();
  let e = u8.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;    // fin del directorio central del zip
  if (e < 0) throw new Error('no es un archivo .xlsx');
  const files = {};
  for (let i = 0, n = dv.getUint16(e + 10, true), p = dv.getUint32(e + 16, true); i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('el .xlsx está dañado');
    const nl = dv.getUint16(p + 28, true);
    files[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
    p += 46 + nl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  const text = async name => {
    const f = files[name]; if (!f) return null;
    const s = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), raw = u8.subarray(s, s + f.size);
    return dec.decode(f.method === 0 ? raw : await inflateRaw(raw));
  };
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const unxml = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, c) => c[0] === '#' ? String.fromCodePoint(c[1] === 'x' || c[1] === 'X' ? parseInt(c.slice(2), 16) : +c.slice(1)) : ENT[c] ?? m);
  const attrs = s => { const o = {}; for (const m of s.matchAll(/([\w:]+)="([^"]*)"/g)) o[m[1]] = unxml(m[2]); return o; };
  const runs = s => { let o = ''; for (const m of s.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) o += unxml(m[1]); return o; };
  const ss = [], sst = await text('xl/sharedStrings.xml');
  if (sst) for (const m of sst.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) ss.push(runs(m[1]));
  const wb = await text('xl/workbook.xml'), rels = await text('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('el .xlsx no tiene libro');
  const target = {}; for (const m of rels.matchAll(/<Relationship\b([^>]*?)\/?>/g)) { const a = attrs(m[1]); target[a.Id] = a.Target; }
  const out = {};
  for (const m of wb.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const a = attrs(m[1]); let t = target[a['r:id']]; if (!t) continue;
    const xml = await text(t[0] === '/' ? t.slice(1) : 'xl/' + t); if (!xml) continue;
    const rows = []; rows.f = {};
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ca = attrs(c[1]), ref = /^([A-Z]+)(\d+)$/.exec(ca.r || ''); if (!ref) continue;
      let col = 0; for (const ch of ref[1]) col = col * 26 + ch.charCodeAt(0) - 64;
      const body = c[2] || '', v = /<v>([\s\S]*?)<\/v>/.exec(body), r = +ref[2] - 1;
      let val;
      if (ca.t === 's') val = v ? ss[+v[1]] : undefined;
      else if (ca.t === 'inlineStr') { const is = /<is>([\s\S]*?)<\/is>/.exec(body); val = is ? runs(is[1]) : ''; }
      else if (ca.t === 'str' || ca.t === 'e') val = v ? unxml(v[1]) : undefined;
      else if (ca.t === 'b') val = v ? v[1] === '1' : undefined;
      else val = v ? +v[1] : undefined;
      (rows[r] || (rows[r] = []))[col - 1] = val;
      const f = /<f\b[^>]*?(?:\/>|>([\s\S]*?)<\/f>)/.exec(body);
      if (f) rows.f[r + ',' + (col - 1)] = f[1] ? unxml(f[1]) : '';
    }
    out[a.name] = rows;
  }
  return out;
}
/* { pestaña: filas } → { unidad: { clave: número } }: en cada pestaña conocida, la fila de cabecera con «Valor» y «Clave» y las de debajo. */
function statsFromSheets(sheets) {
  const out = {}, byName = {};
  for (const n in sheets) byName[statsNorm(n)] = sheets[n];
  for (const T of STATS_TABS) {
    const rows = byName[statsNorm(T.tab)]; if (!rows) continue;
    let h = 0, ck = -1, cv = -1;
    const col = (r, w) => { for (let j = 0; j < r.length; j++) if (typeof r[j] === 'string' && statsNorm(r[j]) === w) return j; return -1; };
    for (; h < Math.min(rows.length, 15); h++) { const r = rows[h] || []; ck = col(r, 'clave'); cv = col(r, 'valor'); if (ck >= 0 && cv >= 0) break; }
    if (ck < 0 || cv < 0) continue;
    const o = out[T.unit] = {};
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const k = r[ck], v = r[cv];
      if (typeof k === 'string' && k.trim() && typeof v === 'number' && isFinite(v)) o[k.trim()] = v;
    }
  }
  return out;
}
/* Valores leídos + los de la Base (dragones) + los de STATS_SCHEMA → stats completos de cada unidad; miss = lo que faltaba en el Excel. */
function statsResolve(vals) {
  const R = {}, miss = [];
  for (const T of STATS_TABS) {
    const src = vals[T.unit] || {}, base = T.kind === 'dragon' ? vals.base || {} : {}, o = R[T.unit] = {};
    for (const row of STATS_SCHEMA[T.kind]) {
      if (!Array.isArray(row)) continue;
      const k = row[0];
      o[k] = k in src ? src[k] : k in base ? base[k] : row[3];
      if (!(k in src) && vals[T.unit]) miss.push(T.tab + ' · ' + row[1]);
    }
  }
  return { R, miss };
}

/* ---------- En el juego ---------- */
const STATS_EMBED = /*STATS_EMBED*/null/*FIN*/;           // copia del Excel: la escribe construir.mjs al construir
let STATS = statsResolve({}).R;                            // stats de cada unidad (STATS.tyrant, STATS.enemigo…): los de ahora
const statsInfo = { src: 'por defecto', at: null, sig: '', err: '', miss: [] };
let ARMOR_MAX = 50, ARMOR_WAIT = 5, ARMOR_REGEN = 5, SHIELD_PER_KILL = 1;   // (v24) jugador: armadura y escudo
let BOOST_ACCEL = 37;                                      // m/s² de más con boost (de la velocidad máxima a la de boost en boost_aceleracion s)
const TURN_RATE = [1.75, 0.95];                            // giro máximo (rad/s) despacio y a la velocidad máxima: sale de giro_radio
const TURN_K = 1.45;                                       // el alabeo y el cabeceo ayudan a girar: el rumbo cambia ~1,45 veces más deprisa que la guiñada
                                                           // pedida (medido en un giro sostenido a todo gas: v23, 109-114 m; v24 con 110, 110-113 m)
let ENEMY_RAM_DMG = 25, ENEMY_RAM_TAKEN = 50, TOWER_SCORE = 100, TOWER_MSL_SURE = true;
let ALLY_GUN_DMG = 5, ALLY_FLAME_DPS = 70, ALLY_FLAME_RANGE = 200, ALLY_VMAX = 1100 / 3.6;
const deg = d => d * Math.PI / 180;

/* Vida máxima del jugador: la de su dragón. */
function heroHpMax() { return Math.max(1, heroStats().vida); }
/* El dragón elegido (o el Excel) cambia: sus stats pasan a las variables de vuelo y armas. En partida, si un máximo sube, lo actual sube
   lo mismo (cambiar el Excel en pleno vuelo se nota al momento); si baja, lo actual baja al nuevo máximo. */
let heroPools = null;                                      // máximos de la última vez (vida, armadura, munición, guiadas, escudos)
function applyHeroStats() {
  const S = heroStats(), old = heroPools;
  VCRUISE_MAX = S.vel_max / 3.6; VMAX = Math.max(S.vel_boost, S.vel_max) / 3.6;
  DRAG = (THRUST[0] + THRUST[1]) / (VCRUISE_MAX * VCRUISE_MAX);
  BOOST_DRAIN = 1 / Math.max(0.1, S.boost_duracion); BOOST_REFILL = S.boost_recarga / 100; BOOST_DELAY = S.boost_espera;
  BOOST_ACCEL = (VMAX - VCRUISE_MAX) / Math.max(0.1, S.boost_aceleracion);
  TURN_RATE[1] = VCRUISE_MAX / (Math.max(20, S.giro_radio) * TURN_K); TURN_RATE[0] = TURN_RATE[1] * 1.75 / 0.95;   // (la proporción de antes entre despacio y deprisa)
  ARMOR_MAX = S.armadura; ARMOR_WAIT = S.armadura_espera; ARMOR_REGEN = S.armadura_regen;
  SHIELD_MAX = Math.max(0, Math.round(S.escudos)); SHIELD_T = S.escudo_duracion; SHIELD_PER_KILL = Math.round(S.escudo_por_derribo);
  GUN_DMG = S.basico_dano; GUN_AMMO = Math.max(1, Math.round(S.basico_municion)); GUN_COOL = S.basico_pausa; GUN_REFILL_DELAY = S.basico_recarga_espera; GUN_REFILL_RATE = S.basico_recarga;
  MSL_DMG = S.guiado_dano; MSL_AMMO = Math.max(0, Math.round(S.guiado_municion)); MSL_RANGE = S.guiado_alcance; MSL_LOCK = Math.max(0.1, S.guiado_fijado);
  FLAME_DPS = S.llamas_dano; FLAME_RANGE = S.llamas_alcance; FLAME_HEAT = Math.max(0.1, S.llamas_sobrecarga); OVERHEAT_T = Math.max(0.1, S.llamas_bloqueo); FLAME_COOL = Math.max(0.1, S.llamas_enfriado);
  LASER_DPS = S.rayo_dano; LASER_T = Math.max(LASER_CHARGE + 0.2, S.rayo_duracion); LASER_RANGE = S.rayo_alcance * 1000;
  ULT_TIME = 100 / Math.max(0.001, S.rayo_recarga); ULT_PER_KILL = S.rayo_por_derribo / 100;
  heroPools = { hp: S.vida, armor: ARMOR_MAX, ammo: GUN_AMMO, msl: MSL_AMMO, shield: SHIELD_MAX };
  if (old && state !== 'menu' && state !== 'loading' && state !== 'select' && state !== 'worldgen') {
    const fit = (cur, k, max) => clamp(cur + Math.max(0, heroPools[k] - old[k]), 0, max);
    F.health = fit(F.health, 'hp', heroHpMax()); F.armor = fit(F.armor, 'armor', ARMOR_MAX); W.ammo = Math.round(fit(W.ammo, 'ammo', GUN_AMMO));
    W.msl = Math.max(0, W.msl + Math.max(0, MSL_AMMO - old.msl)); W.shield = Math.round(fit(W.shield, 'shield', SHIELD_MAX));
    if (W.laser > LASER_T) W.laser = LASER_T;
  }
}
/* Valores del Excel (o de la copia) → STATS y variables de enemigos, torres, dirigibles y Lance; luego, las del dragón elegido. */
function applyStats(vals, src) {
  const r = statsResolve(vals || {});
  STATS = r.R; statsInfo.src = src; statsInfo.at = new Date(); statsInfo.miss = r.miss;
  if (r.miss.length) console.warn('Stats: faltan en el Excel (uso la Base o el valor de antes):\n  ' + r.miss.join('\n  '));
  const E = STATS.enemigo;
  ENEMY_HP = E.vida; ENEMY_VMAX = E.velocidad / 3.6; ENEMY_DETECT = E.deteccion; ENEMY_LOSE = E.perder; ENEMY_SCORE = E.puntos;
  ENEMY_TURN[1] = ENEMY_VMAX / Math.max(20, E.giro_radio); ENEMY_TURN[0] = ENEMY_TURN[1] * 1.75 / 0.95;   // (v26: el giro total; despacio, más cerrado, como el jugador)
  ENEMY_EVADE_DIST = E.huida_distancia; ENEMY_EVADE_T[0] = E.huida_min; ENEMY_EVADE_T[1] = Math.max(E.huida_min, E.huida_max);
  ENEMY_DMG = E.bola_dano; ENEMY_FIRE_RANGE = E.bola_alcance; ENEMY_FIRE_CD[0] = E.bola_pausa_min; ENEMY_FIRE_CD[1] = Math.max(E.bola_pausa_min, E.bola_pausa_max); ENEMY_AIM_ERR = E.bola_error / 100;
  EMSL_DMG = E.guiada_dano; EMSL_LOCK = Math.max(0.1, E.guiada_fijado); EMSL_RANGE[0] = E.guiada_alcance_min; EMSL_RANGE[1] = E.guiada_alcance_max;
  EMSL_CD = E.guiada_pausa; EMSL_GAP = E.guiada_separacion; EMSL_SPEED[1] = Math.max(EMSL_SPEED[0], E.guiada_vel / 3.6); EMSL_TURN = deg(E.guiada_giro);
  ENEMY_RAM_DMG = E.choque_dano; ENEMY_RAM_TAKEN = E.choque_recibe;
  const T = STATS.torre;
  TOWER_HP = T.vida; TOWER_SCORE = T.puntos; TOWER_MSL_SURE = T.guiada_destruye >= 0.5;
  AA_DMG = T.aa_dano; AA_RANGE = T.aa_alcance; AA_BURST = Math.max(1, Math.round(T.aa_rafaga)); AA_RATE = T.aa_cadencia; AA_PAUSE[0] = T.aa_pausa_min; AA_PAUSE[1] = Math.max(T.aa_pausa_min, T.aa_pausa_max);
  AA_SPEED = Math.max(50, T.aa_vel); AA_SPREAD = deg(T.aa_dispersion); AA_LIFE = AA_RANGE * 1.25 / AA_SPEED;
  const D = STATS.dirigible;
  AIRSHIP_HP = D.vida; AIRSHIP_SCORE = D.puntos; AIRSHIP_DMG = D.dano; AIRSHIP_RANGE = D.alcance; AIRSHIP_RATE = Math.max(0.02, D.cadencia);
  AIRSHIP_SHOT_SPEED = Math.max(50, D.vel); AIRSHIP_SPREAD = deg(D.dispersion); AIRSHIP_ARC = deg(D.muerto_proa); AIRSHIP_ELEV = deg(D.muerto_vertical);
  AIRSHIP_SHOT_LIFE = AIRSHIP_RANGE * 1.12 / AIRSHIP_SHOT_SPEED;   // (llega algo más allá del alcance, como antes: 2,8 s a 800 m/s)
  const L = STATS.lance;
  ALLY_GUN_DMG = L.basico_dano; ALLY_GUN_CD[0] = L.basico_pausa_min; ALLY_GUN_CD[1] = Math.max(L.basico_pausa_min, L.basico_pausa_max); ALLY_GUN_RANGE = L.basico_alcance; ALLY_AIM_ERR = L.basico_error / 100;
  ALLY_FLAME_DPS = L.llamas_dano; ALLY_FLAME_RANGE = L.llamas_alcance; ALLY_VMAX = L.vel_max / 3.6; ALLY_ENGAGE = L.combate_distancia;
  ALLY_PROTECT = L.proteger_dist; ALLY_PROTECT_P = L.proteger_prob / 100; ALLY_URGENT = L.proteger_urgente; ALLY_PICK[0] = L.blanco_min; ALLY_PICK[1] = Math.max(L.blanco_min, L.blanco_max);
  if (ally.e) ally.e.vmax = ALLY_VMAX;
  if (typeof applyUnitStats === 'function') applyUnitStats();   // v29: tamaños y vidas de las unidades nuevas (6f; el resto lo leen al usarlo)
  applyHeroStats();
  if (typeof refreshDragonButtons === 'function' && DRAGONS.tyrant) refreshDragonButtons();
  if (src !== 'panel de pruebas' && typeof devStatsSnap === 'function') devStatsSnap();   // v27: referencia del panel de pruebas (19d)
  statsShowInfo();
}
const inflateRawWeb = async u8 => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
function statsUrl() { return (/\/fuentes\//.test(location.pathname) ? '../' : '') + STATS_FILE; }
/* Lee el Excel (si el juego viene de un servidor). Sin cambios desde la última vez, no hace nada. Devuelve si aplicó valores nuevos. */
async function statsFetch(quiet) {
  if (!/^https?:$/.test(location.protocol) || typeof DecompressionStream === 'undefined') return false;
  try {
    const res = await fetch(statsUrl(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = new Uint8Array(await res.arrayBuffer());
    let h = 2166136261; for (let i = 0; i < buf.length; i++) h = Math.imul(h ^ buf[i], 16777619);
    const sig = buf.length + ':' + (h >>> 0);
    if (sig === statsInfo.sig) return false;
    const vals = statsFromSheets(await xlsxSheets(buf, inflateRawWeb));
    const first = !statsInfo.sig; statsInfo.sig = sig; statsInfo.err = '';
    applyStats(vals, 'excel');
    if (!first && !quiet) toast('Stats actualizadas desde el Excel');
    return true;
  } catch (err) {
    const msg = String(err && err.message || err);
    if (msg !== statsInfo.err) console.warn('Stats: no pude leer ' + STATS_FILE + ' (' + msg + '); sigo con ' + statsInfo.src);
    statsInfo.err = msg; statsShowInfo(); return false;
  }
}
/* Opciones: de dónde salen las stats ahora. */
function statsShowInfo() {
  const el = document.getElementById('statsInfo'); if (!el) return;
  const t = statsInfo.at ? statsInfo.at.toLocaleTimeString('es-ES') : '';
  el.innerHTML = statsInfo.src === 'excel' ? `Leídas del Excel <b>${STATS_FILE}</b> a las ${t}` + (statsInfo.miss.length ? ` · faltan ${statsInfo.miss.length} (ver la consola)` : '')
    : (statsInfo.src === 'copia' ? 'Copia guardada en el HTML (la del último <i>construir.mjs</i>)' : 'Valores por defecto del código')
      + (location.protocol === 'file:' ? '. Para leer el Excel al momento, abre el juego con <b>Jugar.bat</b>.' : statsInfo.err ? ` · no se pudo leer el Excel (${statsInfo.err})` : '');
}
/* Arranque: la copia del HTML y, enseguida, el Excel; con servidor local, vigilarlo. */
function statsInit() {
  applyStats(STATS_EMBED, STATS_EMBED ? 'copia' : 'por defecto');
  statsFetch(true);
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) setInterval(() => { if (!document.hidden) statsFetch(false); }, STATS_POLL * 1000);
}
/* Textos del tutorial: {clave} = stat del dragón elegido; {unidad.clave} = de otra unidad (enemigo, torre, dirigible, lance). */
function fmtStat(v) { return (Math.round(v * 100) / 100).toLocaleString('es-ES'); }
function statText(s) {
  return s.replace(/\{(\w+)(?:\.(\w+))?\}/g, (m, a, b) => {
    const v = b ? STATS[a] && STATS[a][b] : heroStats()[a];
    return typeof v === 'number' ? fmtStat(v) : m;
  });
}
