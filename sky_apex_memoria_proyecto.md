# Sky Apex (antes «Alas de Brasa») — memoria del proyecto

Documento de contexto para empezar un chat nuevo en Claude. Resume todo lo hecho hasta ahora: qué es el juego, cómo funciona por dentro, qué se pidió y en qué orden, qué se probó, qué se aprendió y por dónde seguir.

Fecha de este resumen: 30 de octubre de 2026, v29 (la primera versión es del 16 de octubre).

> **v15 (26-oct): empieza la campaña «Ace Combat con dragones»** (sección 7d). La fuente ya no es un solo archivo: se edita por módulos en `fuentes/sky_apex/` y `herramientas/construir.mjs` genera `fuentes/sky_apex.src.html` y `sky_apex.html`. Hay un motor de misiones por datos (recetas en `18_misiones_datos.js`), una «Misión de prueba» y el «Combate libre» de la v14. Jugada por Jorge: «todo parece funcionar correctamente».
> **v16 (26-oct): tres dragones** (sección 7c, «v16»): en «Elige tu dragón», botones arriba a la izquierda para elegir entre tres dragones, cada uno con sus colores. Los otros dos copian en cada fotograma la pose del Tyrant (`09b_dragones.js`). Jorge: Drogon salía roto y el rojo mal en la plataforma.
> **v17 (26-oct): los tres dragones arreglados, con nombre y stats** (sección 7c, «v17»): **Alientormenta** (el Tyrant: vida 120, velocidad +20 %, daño −15 %), **Abrasanubes** (el Red Dragon: vida 80, +15 %, +15 %) y **Ventoscuro** (Drogon: vida 130, −25 %, +15 %). Jorge: Ventoscuro mejor, pero Abrasanubes se desmadejaba en la plataforma y su cabeza se veía mal en vuelo.
> **v18 (26-oct): Abrasanubes estable** (sección 7c, «v18»): los giros del reposo por código ya no se acumulan y la cabeza vuelve a su sitio. **Aceptada por Jorge** («funciona lo suficientemente bien»), con un pendiente para más adelante: **la posición de la cámara de 1ª persona** en los dragones (todavía mejorable).
> **v19 (26-oct): mundo configurable por misión** (sección 7c, «v19»): cada receta trae su semilla, su bioma (de momento solo «valle») y su punto de partida; al empezar una misión con otro mundo se genera detrás de una pantalla de carga, sin recargar la página. La misión de prueba es siempre el mismo valle (semilla 777) con las mismas torres. Tecla **º** = modo diseño (coordenadas, altitud, altura, rumbo, semilla; Intro marca un punto y lo copia con el formato de las recetas). Entregada, sin jugar aún.
> **v20 (27-oct): cuarto dragón, «Fulgor»** (sección 7c, «v20»): el Syrax riggeado, texturizado y animado en Blender (sección 8.3), con las stats de Ventoscuro; en «Elige tu dragón» flota con su propio hover; en vuelo copia al Tyrant como los demás (cuello hacia la mira, mandíbula, cola, boost); 1ª persona con el jinete justo detrás de la base del cuello y la cámara elevada (corregido tras jugarla Jorge: el jinete flotaba muy atrás y la cámara iba muy atrás y baja).
> **27-oct (chat nuevo): repositorio de GitHub** `JorgePove/Sky_Apex`, público, con la web en GitHub Pages desde `main` (sección 13 y `CLAUDE.md`). Commit y push al terminar cada entrega; las versiones son etiquetas de git.
> **v23 (27-oct): Misión 1 «la flota» y el compañero Lance** (sección 7c, «v23»): Fase 1 empezada. Diez dirigibles en formación huyen hacia el borde (si sale uno, se falla) con 15 dragones de escolta; Lance, aliado con IA, vuela en formación y luego ataca protegiendo al jugador (Percival). Entregada, sin jugar aún.
> **v25 (28-oct): valores de Jorge, sin guiadas a costa de vida y armadura como marco** (sección 7c, «v25»): Jorge cambió a mano los valores de los enemigos en el Excel; se quitó lanzar guiadas sin munición a costa de vida máxima («mantenerlo simple») y la armadura pasa a ser un marco amarillo alrededor de la barra de vida, según su boceto. Entregada, sin jugar aún.
> **v29 (30-oct): lista de enemigos y galería de enemigos** (sección 7c, «v29»): los siete tipos nuevos de la lista de Jorge en el juego y en el Excel (artillería —balistas, catapultas y cañones—, batallones de 80-300 soldados, barcos navales, superdirigible de 500 m con 12 torretas, sierpe de 500 m con 3 hechiceros y escudo), modelos preparados en Blender (soldado y hechicero hechos desde cero) y el modo nuevo **Galería de enemigos**: campo de pruebas llano de blockout con todos los enemigos quietos en formaciones. Entregada, sin jugar aún.
> **v28 (30-oct): vuelo hacia la mira e impacto de la llamarada** (sección 7c, «v28»): Jorge, tras la v27: «mucho mejor». Con la mira en el 0° de la escalera de cabeceo el dragón vuela horizontal (antes perdía ~2,5 m/s y había que apuntar algo por encima) y el marcador pequeño del HUD es la trayectoria; la llamarada se corta en el punto de contacto y de ahí saltan chispas, fragmentos de tierra o roca y polvo; cámara de apuntado más baja (la cola tapaba el impacto). **Aprobada por Jorge** («Bien, está mucho mejor así»); con ella acaba este chat.
> **v27 (30-oct): llamarada para pasadas rasantes y modo Dev Test** (sección 7c, «v27»): Jorge jugó la v26 («funciona todo bastante bien»). El vuelo recto se autonivela (alas y morro) y trae una cámara de apuntado como la de su vídeo de referencia; la llamarada va de la boca al punto exacto de la mira y se corta en el suelo, con un círculo blanco donde caerá, tierra que salta, vapor en el agua y quemaduras que duran 60 s; modo nuevo **Dev Test** (combate libre con trucos y un panel de pruebas con Tab). Entregada, sin jugar aún.
> **v26 (30-oct): logo nuevo, enemigos que huyen, vuelo recto, cámara al objetivo y entrada de cine** (sección 7c, «v26»): logo recortado de Jorge con transparencia; los dragones enemigos giran con 130 m de radio (tope del giro total) y, si los persigues, huyen hacia delante con maniobras amplias; controles nuevos (**Espacio** mantenido = vuelo recto con la mira libre, **Ctrl izq.** = hover, **F** mantenida = cámara al blanco fijado, **R** = escudo, **X** = nivelar); al empezar cada misión, unos segundos de vuelo automático con bandas negras de cine. Entregada, sin jugar aún.
> **v24 (28-oct): stats en un Excel** (sección 7c, «v24»): Jorge jugó la v23 («la misión funciona»; flota destruida en 3 min, pero en medio de todo te acribillan; el balance de misiones irá más adelante). Rediseño de las stats del jugador (vida sin regeneración, **armadura** amarilla que se regenera, 2 escudos, guiadas fijas por misión que cuestan vida máxima, llamarada 15/s y 300 m, rayo 50/s, 5 s y 8 km, 600/1000 km/h, boost de 10 s) y todas las stats en **`datos/sky_apex_stats.xlsx`** (Base, una pestaña por dragón, Comparativa, enemigos y Lance), que el juego lee solo; **`Jugar.bat`** abre el juego con servidor local para que lea el Excel al momento. Entregada, sin jugar aún.
> **v21 (27-oct): objetivos genéricos y dirigibles** (sección 7c, «v21»): marca TGT, etiquetas, sitios fijos, escuadrones por eventos y fijar cualquier blanco; dirigibles quietos que disparan por los costados y estallan en una explosión de energía; misión nueva «Prueba de objetivos». Entregada, sin jugar aún.
> **27-oct, al cerrar el chat:** v20 corregida tras jugarla Jorge (el jinete de Fulgor flotaba muy atrás y la 1ª persona iba muy atrás y baja); sin nueva respuesta suya aún. Blender enlazado al proyecto (sección 8.3).

Estado:
- **v29 entregada (30-oct-2026, sin jugar aún)**: lista de enemigos en el juego y en el Excel, y la Galería de enemigos (sección 7c, «v29»). Pendiente de que Jorge la juegue: aspecto y tamaño de cada enemigo, sensación de disparo, valores provisionales del Excel y rendimiento en la Vega 10.
- **Para el chat nuevo (30-oct-2026)**: la v28 está aprobada y subida (etiqueta `v28`). Jorge no ha dicho aún qué toca. Lo pendiente o anunciado: lo que queda de la Fase 1 de la campaña (briefing, hangar con loadout, mapa del mundo, resultados con rango y guardado: preguntarle cada cosa), la lista completa de enemigos y sus stats, regrabar los vídeos del tutorial que muestran teclas o controles viejos (hover, alabeo, escudo, boost, guiadas, vida), y los ajustes que salgan de jugar con el panel del modo Dev Test (Tab; «Copiar ajustes» y «Copiar cambios» dan los valores para fijarlos en el código o en el Excel). Preguntarle por dónde seguir.
- Nombre provisional del juego: **Sky Apex** (desde el 23-oct; antes «Alas de Brasa»). Desde la v5 los archivos de la línea activa se llaman `sky_apex*` (este documento incluido); la v6 estable, la rama humanoide y las copias de `versiones/` conservan el nombre antiguo.
- Versión estable: v6 (mundo abierto con IAs enemigas).
- Línea de trabajo activa: la **rama Tyrant v14** (sección 7c), en `sky_apex.html`, **aprobada por Jorge** («Vale todo perfecto», 26-oct). La v12 añadió el Tutorial, la v13 la nueva sensación de vuelo, el sonido y las torres en islas, y la v14 arregló la cámara en loopings, adelantó la música y cambió el logo. Es ya un juego completo de mundo abierto con:
  - Intro tras un clic (1,5 s en negro; SKY entra y empieza la música; choque de APEX, llamas) con el logo nuevo en una línea, y menú en negro con Elige tu dragón / Tutorial (secciones con texto y vídeo) / Controles / Opciones / Salir.
  - Dragón TyrantDragon riggeado con jinete (brazos en 1ª persona, caballero completo en 3ª) y personalización de colores.
  - Cuatro armas a la vez (fuego rápido, bola guiada, llamarada, rayo «kamehameha»), escudo (F), mirar alrededor (Z).
  - Enemigos: 20 dragones en total (6 a la vez) que lanzan bolas guiadas esquivables, y 30 torres antiaéreas fijas con un cristal morado (10-15 de ellas sobre islas flotantes, distintas en cada partida).
  - Vuelo con peso: ligero retraso entre ratón y dragón, cuerpo con muelles (alabeos marcados) y cámara con retraso; viento y aleteo con sonido.
  - Objetivo: destruir las 30 torres y los 20 dragones → pantalla de VICTORIA con estadísticas.
- **v12 (25-oct): Tutorial** (sección 7c, «v12»): el botón «Tutorial» del menú abre el «Manual del jinete», con 21 secciones en 6 categorías (Vuelo, Velocidad, Ataques, Defensa, Enemigos, Partida). Cada una se despliega con su texto (función, controles, consejos) y a la derecha se reproduce en bucle un vídeo corto grabado con el propio juego (`tutorial/<id>.webm`). Aprobado por Jorge («Los tutoriales funcionan perfectos, tanto las descripciones como los vídeos»).
- **v13 (26-oct): sensación de vuelo, torres en islas, sonido** (sección 7c, «v13»): entre 10 y 15 de las 30 torres van sobre islas flotantes (distintas en cada partida); viento en capas y aleteo nuevos; el dragón sigue a la mira con un ligero retraso e inercia; el cuerpo se inclina y se balancea con muelles encima del rumbo, y la cámara le sigue con retraso (a partir de un vídeo de «Dragontwin»); la música del menú empieza al quedar SKY en el centro. Jorge: «funciona todo bastante bien, iremos tocándolo».
- **v14 (26-oct)**: arreglo de la cámara en loopings (al pasar por la vertical daba vueltas de golpe), música del menú en cuanto SKY entra en escena y **logo nuevo** en una línea (`imagenes/logo_v2.jpg`, fondo blanco, separado en SKY y APEX). Aprobada («Vale todo perfecto»); con ella acaba este chat y Jorge sigue en uno nuevo.
- **Para el chat nuevo**: Jorge no ha dicho aún qué toca. Lo que hay pendiente o anunciado: retocar la sensación de vuelo cuando la juegue más («iremos tocándolo para seguir mejorándolo»); regrabar los vídeos del tutorial, que aún muestran la cámara y el control de la v12; el «campo de pruebas» guiado (guía justo debajo); el modo carreras, más adelante. Preguntarle por dónde seguir.
- **Fase anunciada por Jorge (sin fecha)**: el «campo de pruebas», un tutorial activo y guiado mientras se juega (tiempo parado para explicar cada control y pedir que se use). El botón ya está en la ventana, desactivado («próximamente»). Ver la guía justo debajo.
- Hay dos ramas aparcadas: la humanoide (7b) y la de carreras (7). Jorge quiere implementar el modo carreras más adelante.

---

## Guía para la siguiente fase: el campo de pruebas (tutorial guiado)

Petición de Jorge (25-oct), para «más adelante»: «una especie de "campo de tiro" o de pruebas, donde cada tutorial sea activo y te guíe y te lleve por el proceso en tiempo real mientras juegas, con tiempos parados para explicar los controles y pedirle al jugador que los use, etc. Como un tutorial profesional». La v12 dejó preparado:
- Los **id de sección** de `TUTORIAL` (sección 8b de la fuente): `direccion`, `alabeo`, `hover`, `camara`, `acelerar`, `boost`, `picados`, `fuego`, `fijar`, `guiada`, `llamarada`, `rayo`, `escudo`, `recarga_escudo`, `recarga_guiadas`, `vida`, `dragones`, `misiles_enemigos`, `torres`, `hud`, `objetivo`. Cada lección guiada debería usar el mismo id (y su texto y vídeo como referencia).
- El botón `.tut-range` («Campo de pruebas · próximamente», desactivado) en la cabecera de la ventana.
- `herramientas/grabar_tutorial.js` ya resuelve casi todo lo que hará falta para montar situaciones: colocar al dragón (`place`), limpiar el mundo (`clearWorld`), dragones «títere» con trayectoria fija (`puppet`, con `thinkEnemy`/`steerEnemy` sustituidos), torres sin fuego antiaéreo, entradas simuladas, avisos y recuadros sobre el HUD (`callouts`) y el dibujo de las teclas pulsadas (`drawInputs`). Es una herramienta aparte, pero sus piezas se pueden pasar al juego.

Lo que ya existía y sigue sirviendo:
- **Flujo**: se edita `fuentes/sky_apex.src.html` y se genera `sky_apex.html` con el comando de la sección 7c (paso 3, incluye `--extra caballero-glb`). La v14 ya está copiada en `versiones/` (`sky_apex_v14.html` y `.src.html`); antes de cambiar la v15, copiarla igual.
- **Botón**: `#mTutorial` abre `#pTutorial` (`openTutorial`). Los paneles del menú son `.mpanel` (`openPanel`, `closePanels`); el de controles (`#pControls`) también sirve de guion.
- **Estados** (`state`): `loading`, `menu`, `select` («Elige tu dragón»), `playing`, `paused`, `dead`, `victory`. Partida: `startGame()` (solo desde `menu`; llama a `resetRun(true)`: estadísticas, torres, proyectiles y dragón al punto de partida `START`), `spawnEnemies()`, `backToMenu()`, `restartGame()`, `quitGame()`. Victoria: `checkVictory`/`showVictory` con `TOWER_TOTAL` (30) y `ENEMY_TOTAL` (20).
- **Mensajes en pantalla**: `toast(texto)` (arriba, ~2,2 s; va por encima de las capas del menú), `setWarn(texto, color, alfa)` (aviso central, el de los misiles), y el HUD en canvas (`drawHUD` y sus `draw…`).
- **Estado del jugador y armas**: `F` (vuelo: `speed`, `health`, `hover`, `boost`, `third`, `lookYaw`…), `W` (armas: `ammo`, `msl`, `lock`, `heat`, `overheat`, `ult`, `laser`, `shield`, `shieldT`…), `keys` (teclas pulsadas), `enemyLock.e` (dragón fijado). Constantes de cada arma al principio del bloque «Armas del jugador» (sección 7).
- **Enemigos y torres**: `enemies` (cada uno con `pos`, `vel`, `hp`, `dead`, `mode`, `mslCool`…), `placeEnemy`, `damageEnemy`, `killEnemy`; `TOWER_SITES` (las 30 de la partida, las rellena `planTowers`; `site.isl` = su isla, si está en una), `towers` (las cargadas), `addTower`, `dropTower`, `damageTower`, `towerState` (`destroyed`, `kills`, `score`); torres antiaéreas en `updateTowerAI` (`AA_…`); bolas guiadas enemigas en `enemyMissileTry` (`EMSL_…`).
- **Pruebas**: sección 8.1 (simulación con `updateAim`/`updateFlight`/`updateWorld`, capturas, trucos del navegador integrado).

## 0. Cómo usar este documento (para Claude)

- Jorge escribe en español (también en inglés con soltura). Responde y entrega en español, de forma breve y directa.
- Desde el 16-oct-2026 se trabaja en **Claude Code (app de escritorio, Windows)**, en la carpeta `D:\Proyectos\Dragon Racing`, que desde el 27-oct es un repositorio git (sección 13 y `CLAUDE.md`).
  - Hasta la v20 las versiones se guardaban a mano en `versiones/`; desde la v21, con etiquetas de git.
  - Claude Code tiene además una memoria propia (`MEMORY.md` y sus notas), que remite a este documento.
- La versión estable `alas_de_brasa.html` (v6) no se toca salvo que Jorge lo pida.
  - Las modificaciones grandes van en un archivo aparte, "sin cambiar lo que ya tenemos". Así nacieron las ramas.
  - Antes de cambiar una rama, copia su versión actual a `versiones/`.
- Entrega siempre el HTML final.
  - Desde el 27-oct el repositorio y la web son públicos: Jorge decidió que las licencias no son un problema (proyecto personal sin ánimo de lucro).
- Antes de entregar, prueba el juego en el navegador integrado de la app (ver sección 8). Aclara siempre que esas pruebas no sirven para juzgar la "sensación" de control y velocidad: eso lo juzga Jorge jugando.
- Mensajes típicos de aprobación de Jorge: "funciona todo perfecto" o "está perfecto todo". Pide cambios en listas de viñetas con varios puntos a la vez.

### 0.1 Archivos de la carpeta del proyecto

| Archivo o carpeta | Qué es |
|---|---|
| `alas_de_brasa.html` | v6 estable (dragón procedural, un único HTML) |
| `datos/sky_apex_stats.xlsx` | (v24) **Stats de todas las unidades**: el juego las lee de aquí (sección 7c, «v24»). Lo edita Jorge; se crea o amplía con `herramientas/stats_excel.mjs` |
| `Jugar.bat` | (v24) Abre el juego con un servidor local (`herramientas/servidor_juego.mjs`, puerto 8770) para que lea el Excel al momento |
| `sky_apex.html` | Línea activa (rama Tyrant v5) para jugar (10,6 MB, con el dragón, los brazos y el logo incrustados en base64). **Generado: no editar ni leer entero**. Necesita la carpeta `musica/` al lado. Hasta la v4 se llamaba `alas_de_brasa_tyrant.html` |
| `alas_de_brasa_humanoide.html` | Rama humanoide para jugar (7 MB, generado) |
| `fuentes/sky_apex/` | (v15) Módulos de la línea activa (`NN_*.html`, `.css`, `.js`): **aquí se edita**. `herramientas/construir.mjs` los junta y genera los HTML |
| `fuentes/*.src.html` | `sky_apex.src.html` (desde la v15, generado a partir de los módulos: no editar) y `alas_de_brasa_humanoide.src.html` (editable). Cargan los modelos desde `../modelos/` |
| `modelos/` | (v20: `syrax_web.glb`, 4,5 MB, Fulgor, exportado desde Blender) `tyrant_web.glb` (5,7 MB), `brazos_jinete.glb` (1 MB, brazos riggeados del caballero), `caballero.glb` (0,76 MB, el caballero entero riggeado, 1,9 m), `dragon_01_web.glb` (5,1 MB), `dragon_01.glb` (original, 444 MB). Desde la v16: `dragon_rojo.glb` (7 MB, de `red_dragon.glb` con `herramientas/preparar_dragon_rojo.mjs`) y `drogon_web.glb` (3,1 MB, de `Drogon/Drogon/Dragon.fbx` con `herramientas/preparar_drogon.mjs`) |
| `modelos/` (v29) | Enemigos nuevos, preparados en Blender (`herramientas/blender/enemigos/`), todos de 1 m de largo con el frente a -Z (el juego los escala con la stat «largo»): `artilleria_balista.glb`, `artilleria_catapulta.glb`, `artilleria_canon.glb` (de los «… guay.glb» de Jorge), `barco_naval.glb` («barco guay», de 896k a 26k triángulos), `superdirigible.glb` («barco guay 02», color por vértice), `sierpe.glb` (Kang Jin Long de `dragones raw/`, 60k triángulos, sin esqueleto) y `soldado.glb` (soldado y hechicero hechos desde cero, 172 y 156 triángulos). Los originales «… guay.glb» y sus zip no van a GitHub |
| `imagenes/` | `logo_sky.png` y `logo_apex.png`: las dos palabras del logo, del mismo tamaño para superponerlas (v26: 1737×611, sacadas de `logo_v3.webp`, el logo recortado de Jorge con transparencia, con `herramientas/blender/imagen_a_png.py` + `herramientas/separar_logo_alfa.mjs`; las de la v14, de `logo_v2.jpg` con fondo blanco, quedan como `logo_*_v2.png`, y las del primer logo, de `menu_logo.png`, como `logo_*_v1.png`) |
| `musica/` | `musica_menu.mp3` («Dragon's Ascent») y `musica_game.mp3` («Course de Ciel»). El juego busca `musica/musica_menu` y `musica/musica_game` con extensión mp3, ogg, m4a, wav, aac, flac, opus o webm: Jorge puede cambiar las canciones dejando otro archivo con ese nombre |
| `menu_logo.png` | Logo «Sky Apex» original de Jorge (PNG con transparencia) |
| `Knighty.fbx` / `Knighty.obj` | Caballero de Jorge (23-oct): 1,5 M de triángulos en 129 piezas, **sin esqueleto, sin UV ni materiales**, en pose A, unas 556 unidades de alto (×50 en el FBX). Comprado en una web de modelos 3D gratis |
| `herramientas/` | Scripts de Node: `preparar_fbx.mjs`, `fbx_node.mjs`, `optimizar_modelo.mjs`, `incrustar_modelo.mjs` (ahora con `--extra id=ruta`), `preparar_brazos.mjs` (Knighty → brazos riggeados), `preparar_caballero.mjs` (Knighty → caballero entero riggeado), `analizar_caballero.mjs` y `analizar_caballero2.mjs` (cortes por alturas, solo informativos) y `separar_logo.mjs` (y, desde la v14, `separar_logo_blanco.mjs` para el logo nuevo sobre fondo blanco); desde la v12, `grabar_tutorial.js` (graba los vídeos del tutorial con el juego) y `servidor_tutorial.mjs`; desde la v13, `banco_pruebas.js` (ayudantes de prueba para el navegador: entrar en partida, teletransportar, simular y capturar). Visores `visor_fbx.html`, `visor_modelo.html` y `visor_brazos.html`; `info_fbx.py`; `modulo_tyrant.js` (copia de las secciones 5c, 5e y 5d, solo de referencia) |
| `herramientas/blender/` | (27-oct) Enlace con Blender: `lanzar.mjs` (lanza Blender sin ventana y ejecuta un script de Python), `comprobar.py` (prueba de conexión), `ruta_local.txt` (rutas de este equipo: **no se sube a GitHub**) y `salida/` (renders y GLB de prueba: tampoco). Ver la sección 8.3 |
| `versiones/` | Copias de la rama Tyrant: v1 a v4 (html y src, con el nombre antiguo `alas_de_brasa_tyrant_vN`), v5 a v10 como `sky_apex_vN.html` / `.src.html`, los glb del dragón de v1 y v2 (v3 a v5 usan el de la v2) y `brazos_jinete_v4.glb` |
| `Drogon/Drogon/` | Pack comprado: Drogon (`Dragon.fbx` y `.blend`) y el bonus TyrantDragon (FBX y 29 animaciones) |
| `tutorial/` | (v12) Los 21 vídeos del tutorial, `<id de sección>.webm` (VP9, 1024×576, 30 fps, 7-11 s, 1,4-2,4 MB cada uno; 39 MB en total). El juego los busca junto al HTML (o en `../tutorial/` desde `fuentes/`), en `.webm` o `.mp4`: Jorge puede sustituir cualquiera por una grabación suya con el mismo nombre |
| `.claude/launch.json` | Servidor local `alas-de-brasa` (`python -m http.server 8765`) para el navegador integrado y, desde la v12, `grabador-tutorial` (`node herramientas/servidor_tutorial.mjs`, puerto 8766: sirve la carpeta y guarda los vídeos que sube el grabador). Desde la v15, `sky-apex-2` (el mismo servidor en el 8767), para cuando otro chat tiene ocupado el 8765 |
| Material nuevo (20–22 oct) | `WYRMRUSH_GDD_v1_0.pdf` (unas 27 páginas), vídeos de referencia (`Squadragon_42.webm`, `Sdragon_42_v0.2.3.mp4`, `Dragonriding-Race…`, `Dragontwin-Game…`, etc.) y música (`Dragon Grand Prix`, `Course de Ciel`, `Climb the Peaks`, `Dragon's Ascent`). Lo añadió Jorge y **aún no se ha revisado ni comentado**, salvo «Dragon's Ascent», que desde la v4 es la música del menú (`musica/musica_menu.mp3`). Sin poppler (`pdftoppm`) instalado, Claude Code no puede leer el PDF |

## 1. Resumen en 30 segundos

Simulador de vuelo en primera persona de un dragón, en un único archivo HTML. Mundo procedural infinito (cordilleras, valles, ríos, lagos, bosques) con islas flotantes, torres de vigía con ballesta y dragones enemigos amarillos con IA. Controles tipo War Thunder (el ratón mueve un marcador y el dragón gira hacia él, con alabeo automático). Bolas de fuego, boost, hover, HUD completo, radar, fijación de objetivo e indicador de adelanto, y sonido procedural. Three.js r128 desde cdnjs, tipografías de Google Fonts, sin otras dependencias.

La rama Tyrant (7c) cambia el dragón procedural por un modelo riggeado con animaciones reales (TyrantDragon), tanto el del jugador como los enemigos. También añade:
- Pantalla de título y pantalla «Elige tu dragón» con colores personalizables.
- Cámara de jinete en 1ª persona.
- Efectos de boost.

Enlaces (privados, cuenta de Jorge):
- Juego v6: https://claude.ai/artifact/EKKmh1kqW76KSyjj8MbgeF
- Prototipo de carreras: https://claude.ai/artifact/JNdqTzfzKmBW8ufgvt4YvG
- Rama humanoide (v1): https://claude.ai/artifact/2xLZQ1SrJFEBscc2hLRLiY
- La rama Tyrant no está publicada (licencia).

## 2. Sobre Jorge y cómo trabaja

- Level Designer en Madrid, con experiencia profesional en desarrollo de videojuegos. Hace proyectos personales de juegos y apps web para ampliar su portfolio.
- Piensa como diseñador de niveles: pide escenarios, ritmo, maniobrabilidad, "sensación de velocidad", lectura visual de los enemigos.
- Itera en pasos pequeños: cada mensaje añade una mejora, la prueba y confirma.
- Para cambios grandes pide un archivo aparte "sin cambiar lo que ya tenemos". Así nació la rama de carreras.
- Prefiere prototipar primero lo esencial (por ejemplo escenario y sensación de velocidad) y dejar para después lo secundario (IAs rivales).

## 3. Estado actual del juego (v6)

Mundo
- Terreno infinito generado con ruido simplex y semilla (`SEED`, aleatoria salvo que se fije `window.__SEED`). Tierras bajas, cordilleras de hasta unos 1150 m con crestas, ríos y lagos (nivel del agua `WL = 0`).
- Niebla exponencial, sol bajo ("hora dorada"), cielo y agua con shaders propios.
- Árboles instanciados por chunk.
- Islas flotantes procedurales: lentes de roca con relieve arriba y cara inferior colgante, en tres planos de altura, con árboles, cascadas desde el borde de las grandes y torres de vigía en las más grandes. Nunca rozan las montañas de debajo. El mismo perfil analítico genera la malla y las colisiones (dragón, bolas de fuego, ballestas, puntería).
- Torres de vigía con ballesta (3 de vida, alcance 1150 m) que disparan al jugador. Dan 100 puntos y al caer dejan una ruina permanente.

Dragón del jugador
- Cuello articulado, cabeza con mandíbula, alas con aleteo. Cámara sobre los hombros (se ve el cuello y la raíz de las alas). `C` alterna tercera persona.
- Banking automático al virar, alabeo manual con Q/E, nivelado con R.
- Boost con barra que se gasta y se recarga. Hover con control vertical en W/S.
- Bola de fuego con clic izquierdo.

Enemigos
- 6 dragones amarillos simultáneos (siempre hay 6: al derribar uno aparece otro lejos a los 6-10 s). 4 impactos para derribarlos, 300 puntos cada uno.
- Mismo modelo de vuelo y velocidad máxima sin boost que el jugador. Son un 50 % más grandes que el dragón del jugador (`ENEMY_SCALE = 1.5`).
- Dejan una estela amarilla que se desvanece con la distancia (1100 m), con grosor mínimo en pantalla para verla desde lejos.
- IA: patrulla → detección → pasada de ataque con aproximación en arco → rompe y se aleja → se recoloca a la espalda del jugador → nueva pasada.

HUD (canvas 2D)
- Brújula, escalera de cabeceo (solo en primera persona), marcador del ratón, marcadores de enemigos y radar.
- Izquierda: velocidad en km/h, acelerador y boost. Derecha: altitud, altura sobre el suelo y velocidad vertical. Abajo: vida. Arriba a la derecha: torres, dragones y puntos.
- Clic derecho fija el siguiente dragón enemigo a la vista: cuadrado de HUD alrededor, o flecha en el borde de pantalla si está fuera (como Ace Combat).
- Sobre el dragón fijado aparece un círculo gris de adelanto (estilo Star Citizen). Disparar a ese círculo impacta, porque el disparo converge al punto de interceptación.

Daño y muerte
- Vida 100. Daño recibido: bola de fuego enemiga 15, virote de ballesta 12 (vuela a 215 m/s, vive 7 s; aviso "PROYECTIL" cuando pasa a menos de 400 m) y choque con un dragón enemigo 25 (y 2 de daño al enemigo, con enfriamiento de 2 s). Regenera 3/s tras 7 s sin recibir daño.
- Mueres al chocar con terreno, agua o isla (o a 0 de vida). Reapareces a unos 300 m sobre el suelo, a 80 m/s y con los enemigos calmados.

Sonido y menú
- Sonido 100 % procedural con Web Audio (`sfx`): aleteo, fuego, rugido, explosión, impacto, daño, fijación, pitido, boost, hover y boost agotado, más un sonido continuo ligado a velocidad, acelerador, boost y hover. `M` silencia.
- Menú con demo en piloto automático de fondo, deslizador de sensibilidad, pausa con Esc/P y bloqueo de puntero (si el navegador no lo permite, el dragón gira hacia el cursor).

## 4. Controles

Los de Sky Apex v26 (en el juego, menú → Controles). La v6 estable usaba otros: clic izquierdo = bola de fuego, clic derecho = fijar. En la v26 cambiaron: hover de Espacio a Ctrl izq., escudo de F a R, nivelar de R a X, y son nuevos Espacio (vuelo recto) y F (cámara al objetivo).

| Entrada | Acción |
|---|---|
| (pantalla inicial) | Clic o tecla para empezar la intro |
| Ratón | Dirección y puntería (el dragón gira hacia la mira y se inclina al virar) |
| W / S | Acelerar / frenar. En hover, subir / bajar |
| Shift | Boost (se gasta; recarga 2 s después de soltar; aletea el doble de rápido) |
| Espacio (mantener) | (v26) Vuelo recto; desde la v27 se autonivela (alas y morro, horizontal) y pasa a la cámara de apuntado; la mira sigue al ratón y la cabeza y la llamarada van a ella |
| Tab | (v27, solo en el modo Dev Test) Panel de pruebas |
| Ctrl izq. | (v26; antes Espacio) Hover: parar en el aire. Otra vez: volar |
| Q / E | Alabeo izquierda / derecha |
| X (mantener) | (v26; antes R) Nivelar el horizonte |
| Clic izquierdo | Fuego rápido (un proyectil por clic; 20 de munición que se recargan solos) |
| Clic izquierdo mantenido | Bola guiada: con un dragón fijado y la mira en el círculo rojo (0,5 s + 3 s de carga; 5 bolas, +2 por torre) |
| Clic derecho mantenido | Llamarada de 200 m (se sobrecalienta: 10 s sin armas) |
| Izq. + dcho. a la vez | Rayo de fuego, con la barra llena (90 s o haciendo daño) |
| Clic central | Fijar el siguiente dragón a la vista |
| R | (v26; antes F) Escudo 5 s (cargas del Excel; +1 por dragón derribado) |
| F (mantener) | (v26) Cámara al blanco fijado, como en Ace Combat (sin blanco, fija el mejor a la vista); al soltar vuelve al frente |
| Z (mantener) | Mirar alrededor (1ª persona ±170°; 3ª, órbita de 360°) |
| C · M · Esc/P | Cámara 1ª/3ª persona · Sonido · Pausa |

## 5. Historial de versiones y peticiones

El reparto de funciones por versión está reconstruido a partir del registro de tareas y del código. Las peticiones literales de Jorge están entre comillas (con la ortografía corregida y recortes marcados con […]).

1. **v1** — Mundo procedural infinito con shaders, dragón en primera persona, modelo de vuelo, bolas de fuego, torres enemigas con ballesta, HUD y sonido procedural.
2. **v2** — Banking, boost (Shift) y hover (Espacio) en el vuelo, con animaciones, HUD y sonido para cada uno. Después, W/S suben y bajan en hover.
3. **v3** — Islas flotantes procedurales con colisión (dragón, bolas de fuego, ballestas).
4. **v4** — Dragones enemigos con IA, spawn, daño, muerte, puntuación y radar.
5. **v5** — Petición de Jorge: "Todos los dragones enemigos van dejando tras de sí una estela de color amarillo, que se va disipando con la distancia […] Vamos a hacer que los dragones enemigos sean un 50 % más grandes […] Con clic derecho, el jugador puede ir fijando dragones enemigos que estén en su campo de visión […] Un enemigo fijado tiene un pequeño cuadrado de HUD rodeándole […] Si no está en el campo de visión, aparece la típica flecha en los bordes de la pantalla […] como en los juegos de Ace Combat."
6. **v6** — "Puedes añadir el indicador de adelanto, por favor? Un pequeño círculo gris por delante del dragón enemigo fijado, indicando a dónde tiene que disparar el jugador para impactar. Al estilo de cómo funciona en Star Citizen."
7. **Rama de carreras** — "Vamos a crear otro archivo aparte para esta gran modificación […] plantear este juego como un juego de carreras de dragones, donde el principal elemento es que los escenarios son túneles por dentro de las islas flotantes, profundos valles y grutas donde la maniobrabilidad del jugador es lo más importante, giros cerrados, subidas a picos de montañas, vuelos por profundas cuevas con estalagmitas, estalactitas y cascadas de lava […] mantener los controles del dragón tal cual son ahora […] Por ahora esta versión no tendrá otras IAs corriendo contra el jugador. Quiero prototipar primero el escenario y la sensación de velocidad." Resultado: prototipo entregado y confirmado ("el circuito está bien").
8. **16-oct-2026** — "Por ahora vamos a volver a la versión normal de mundo abierto con IAs enemigas volando por ahí. Quiero mejorar el proyecto." Ese día se migró a Claude Code. A la v6 se le añadió la cabecera `<!doctype html>` + `<meta charset="utf-8">`: sin ella, en local salía en windows-1252 y los acentos se rompían.
9. **Rama humanoide (16-oct)** — Modelo `dragon_01` (dragón humanoide de Sketchfab, CC-BY-NC) en 3ª persona, con vuelo horizontal "tipo Superman / Iron Man" y los mismos controles. Se entregó sin feedback (ver 7b).
10. **Rama Tyrant v1 (19-oct)** — Jorge compró un pack de modelos ("Drogon"). Se analizó y se metió su bonus, el TyrantDragon, en lugar del humanoide, con los clips de vuelo y hover reales. A petición de Jorge, la 1ª persona pasó a ser la cámara por defecto.
11. **Rama Tyrant v2 (19-oct)** — "La cámara […] que parezca que el jugador es un jinete sobre el lomo del dragón. Ahora mismo […] está algo alta. […] que el cuello y la cabeza del dragón se movieran más cuando se mueve el cursor". Además:
    - Menú nuevo con pantalla de título y el botón «Elige tu dragón».
    - Pantalla de selección: plataforma giratoria con el dragón animado (reposo, aliento de fuego y rugido).
    - Ruedas de color para la piel y el aliento.
12. **Rama Tyrant v3 (19-oct)** — Jorge aprobó la v2 ("Está perfecto todo") y pidió:
    - Un botón bajo la rueda del aliento para lanzar la llamarada.
    - Acercar la cámara de 1ª persona a la base del cuello "aunque se vea un poco menos de las alas".
    - Acercar la cámara de 3ª persona.
    - En el boost: "un mayor cambio de FOV […], un ligero camera shake y más líneas de velocidad y efecto túnel".
    - "Que el dragón enemigo también use el mismo modelo […] manteniendo ese color amarillo […] y el tamaño aumentado".
13. **23-oct (mañana)** — Pendiente de que Jorge juegue la v3. En la carpeta hay material nuevo sin revisar (GDD «WYRMRUSH», vídeos y música; ver 0.1).
14. **Rama Tyrant v4 «Sky Apex» (23-oct)** — Jorge pidió (resumen):
    - Cambiar el nombre a «Sky Apex». Al arrancar, pantalla negra; SKY entra desde el borde izquierdo y APEX desde el derecho, se juntan en el medio «con un estallido y un efecto de llamas VFX que rodea a todo el logo»; con las palabras empieza la música del menú. Las mitades salen de `menu_logo.png`.
    - Carpeta `musica` donde él pueda subir cualquier canción llamada `musica_menu` (de momento «Dragon's Ascent»). Suena en el menú y en «Elige tu dragón».
    - Selector de volumen / silencio de la música en el menú.
    - «La sensación de estar controlando a un piloto de dragones»: los brazos del caballero `Knighty` riggeados sujetando las riendas, con la cámara en la cabeza del jinete. Controles y jugabilidad, sin cambios.
    - El modo carreras, más adelante.
15. **v5 (23-oct, tarde)** — Jorge: «Está genial para empezar». Pidió:
    - Música de partida `musica_game` («Course de Ciel»), a volumen medio-bajo «para que tampoco sea cargante».
    - Renombrar los archivos a `sky_apex`.
    - Velocidad máxima normal 550 km/h y con boost 1100 km/h; más FOV con el boost.
    - Riendas: le encantan, pero al bajar a la boca parecían atravesar el cuello. Que acaben a mitad del cuello.
    - Más sensación de gravedad, sin ser un simulador: subir hace perder velocidad, bajar la gana y en picado se gana mucha.
    - Sobre Knighty: comprado en una web de modelos 3D gratis.
16. **v6 (23-oct, noche)** — Jorge aprobó la v5 («Está todo estupendo») y pidió cambiar el ataque básico por cuatro armas, todas disponibles a la vez (sin cambiar de arma), con la información abajo a la derecha «similar a las armas de los Ace Combat modernos». Fijar objetivo pasa del clic derecho al central. Resumen:
    - Clic izquierdo: proyectiles pequeños, muy rápidos y de poco daño, uno por clic, pausa de 0,1 s; 30 de munición que se rellenan de uno en uno tras 1 s sin disparar.
    - Clic izquierdo mantenido: con un enemigo fijado a menos de 3 km aparece un círculo rojo; 4 s con la mira dentro → gran bola de fuego guiada «como un misil del Ace Combat o Star Citizen».
    - Clic derecho mantenido: llamarada de 100 m, mucho daño; barra de sobrecalentamiento: si se llena, todas las armas inutilizadas 10 s; al soltar se vacía sola.
    - Izquierdo + derecho: la ultimate, un rayo fino de llamas concentradas de 3 km durante 10 s que sigue a la mira y daña todo lo que cruza; su barra parpadea al 100 %.
    - Dudas resueltas con Jorge: munición 30 (no 20); si el clic empieza con la mira dentro del círculo, **no** dispara fuego rápido, solo carga; los dos clics tienen que llegar casi a la vez (≤ 0,3 s); la ultimate se carga con el tiempo **y** al hacer daño.
17. **v7 (23-oct, noche)** — Jorge: «está todo perfecto» (la v6). Pidió:
    - Rayo más gordo, «que parezca un kamehameha», con sonido de rayo de energía.
    - Llamarada de 200 m.
    - Error: con un enemigo fijado, el clic izquierdo cargaba la bola guiada y no dejaba disparar fuego rápido. Ahora la carga solo empieza tras mantener el clic 0,5 s; los clics cortos son disparos normales.
    - Que todos los ataques salgan de un socket en la boca, para que al girar no parezcan salir «de un punto vacío».
    - Munición de bolas guiadas: 5 al empezar y +2 por torre destruida («una razón para destruir las torres»).
    - Torres el triple de altas y el doble de anchas, con un gran cristal morado iluminado que gira en la cima para verlas de lejos.
    - (La lista acababa en una viñeta vacía: era un error, no faltaba nada.)
18. **v8 (23-oct, noche)** — Jorge jugó media hora sin morir y pidió más reto:
    - Dragones y torres fijan al jugador y le lanzan bolas guiadas de 35 de daño, con guiado imperfecto: aviso de «Proyectil aproximándose» y, maniobrando, pueden pasar de largo, fallar o chocar con una isla o una torre. Cada tirador, una cada 30 s.
    - Subir un poco la cámara del jinete para ver la grupa, el cuello y la cabeza desde más arriba.
    - Usar el resto del caballero para que se vea sentado en la grupa en 3ª persona (el cambio con la C era raro: desaparecían los brazos y no había nada encima del dragón).
    - Tecla Z mantenida: el ratón gira la cámara. En 1ª persona como la cabeza del caballero, hasta 170° a cada lado; en 3ª, 360° alrededor del dragón.
    - «Elige tu dragón»: siempre en reposo (la llamarada solo con el botón), más zoom para ver detalles y el caballero de pie al lado para ver la escala (1,9 m).
19. **v9 (23-oct, noche)** — «Nos hemos pasado de dificultad ahora». Pidió: los enemigos fijan 4 s antes de lanzar y el jugador 3 s; asiento del jinete 1 m más atrás a la misma altura (se veían menos las alas); aleteo al doble con boost; límite global de una bola enemiga cada 20 s y de una por minuto por enemigo; no lanzan a menos de 500 m y su alcance máximo es 2500 m; arreglar la Z («luego hace un giro extraño y parece que no sigue bien el eje»); y un escudo con la F: 3 cargas marcadas con 3 rayas azules bajo la mira (la usada queda negra), que solo se recargan derribando dragones, esfera azul translúcida de energía que niega el daño de misiles y otros proyectiles durante 5 s, y luego parpadea y se disipa.
20. **v10 (25-oct)** — Jorge: «el escudo funciona perfectamente». Pidió: munición del fuego rápido 20 (no 30); círculo de la bola guiada a la mitad; solo los dragones lanzan bolas guiadas, las torres pasan a antiaéreas con el proyectil rápido y aún menos daño que el del jugador; intro nueva (clic → 3 s en negro → SKY llega al centro → APEX choca con chispas → llamas y música épica), fondo del menú en negro y botones Elige tu dragón, Tutorial (aún sin hacer), Controles, Opciones (volúmenes) y Salir; objetivo final de 30 torres y 20 dragones con pantalla de VICTORIA, estadísticas y volver al menú / reiniciar / salir.
    - Dudas resueltas: exactamente 30 torres en el mundo (repartidas alrededor del inicio, con ayuda en el radar), 20 dragones en total (después no salen más), Salir intenta cerrar la pestaña y si no puede muestra una despedida, y Opciones con música del menú, música de la partida y efectos.

21. **v11 (25-oct)** — «Está todo perfecto». Solo pidió bajar el negro inicial de la intro de 3 s a 1,5 s. Anunció el Tutorial como siguiente fase, en un chat nuevo.
22. **v12 (25-oct): Tutorial** — «Quiero que al clicar el botón de tutorial del principio se abra la ventana de tutorial», con «diferentes secciones listadas, con todos los controles del dragón, los enemigos, etc.»: controles de vuelo y de velocidad, cada tipo de ataque uno por uno, los escudos, «cómo recargar los escudos matando dragones, cómo recargar los misiles matando torres». «Al clicar en cada sección, se despliega un texto explicando su función básica, controles, y un corto vídeo en una ventana pequeña a la derecha típica de otros tutoriales». Para el futuro: el «campo de pruebas» guiado (ver la guía del principio); «de momento vamos a montar la estructura […] con las explicaciones escritas y los vídeos».
23. **v13 (26-oct)** — «Los tutoriales funcionan perfectos». Jorge completó una partida entera (20 dragones y 30 torres) sin fallos y pidió:
    - Que en cada partida «entre 10 y 15 torres aparezcan en diferentes islas flotantes, ya que esto le da mucha verticalidad y variedad» (desde la v10 nunca salían en islas). Interpretado como: siguen siendo 30 en total y de ellas, 10-15 en islas.
    - «Una gran pasada para mejorar la sensación de vuelo, de peso y de manejo del dragón»: un sonido de viento que crece o baja al acelerar o frenar; con cada batir de alas, «un pequeño sonido de alas batiendo y aire moviéndose».
    - Analizar el vídeo `Dragontwin-Game-SnapYT.App (1).mp4` (sobre todo 1:10-1:37): «cómo se mueve la cámara según se mueve el dragón, cómo el propio dragón se mueve y se orienta con la dirección que le da el jugador para aumentar el dinamismo y la sensación de peso y velocidad», y adaptarlo con nuestras animaciones y huesos.
    - «Seguimos sin querer que se vuelva demasiado simulador, y el manejo inmediato que tenemos ahora está bastante bien, pero un ligero input lag entre el movimiento del ratón y el movimiento del dragón podría ayudar».
    - Que la música del menú empiece en cuanto SKY queda colocado en el medio.
    - Decisiones de Claude (no preguntadas, comunicadas en la entrega): los vídeos se graban con el propio motor (escenas con guion y las teclas pulsadas dibujadas encima), van fuera del HTML en `tutorial/` como la música y se pueden sustituir por grabaciones propias con el mismo nombre; textos en español con los valores reales del código.
## 6. Arquitectura técnica del juego base

### 6.1 Cómo está construido

En el chat original, el juego se desarrolló en módulos y se ensambló en un único HTML. Esos archivos sueltos no están en esta carpeta: hoy se edita directamente el HTML, o la fuente `.src.html` en las ramas. En el HTML final cada módulo empieza con un banner `/* ==== N. TÍTULO ==== */`, así que se puede volver a dividir por ahí.

| Módulo | Contenido |
|---|---|
| `p0_head.html` | DOM del menú y del HUD, CSS, textos de ayuda |
| `p1_world.js` | Utilidades (`clamp`, `lerp`, `smooth`), ruido simplex (`N1`, `N2`, `N3`), `terrain(x,z,out,full)`, `heightAt`, `slopeAt`, `towerInCell` |
| `p2_render.js` | Renderer, escena, cámara, cielo, agua, material del terreno (shaders), niebla |
| `p3_terrain.js` | Quadtree de chunks con LOD y faldones: `buildChunk`, `selectLeaves`, `refreshTerrainSelection`, `pumpTerrain` |
| `p4_props.js` | Árboles instanciados por chunk, torres de vigía (`towers`, `towerState`, `damageTower`) |
| `p4b_islands.js` | Islas flotantes: perfil analítico, malla, colisión, árboles, cascadas, streaming |
| `p5_dragon.js` | Rig del dragón (`buildRig`, `animateRig`, `animateDragon`), materiales del jugador (rojo) y enemigos (amarillo) |
| `p6_fx.js` | Partículas, explosiones, bolas de fuego, sonido procedural (`sfx`) |
| `p6b_enemies.js` | IA enemiga, estelas, derribo, punto de interceptación, fijación de objetivo |
| `p7_game.js` | Entrada, estado `F`, modelo de vuelo (`updateAim`, `updateFlight`), disparo, `crash`, `respawn`, `hurtDragon` |
| `p8_loop.js` | HUD (`drawHUD` y ayudantes), `updateWorld`, `frame`, arranque |

Orden de concatenación (`build.sh`): `p1_world p2_render p3_terrain p4_props p4b_islands p5_dragon p6_fx p6b_enemies p7_game p8_loop` → `all.js`. `game.html` = `p0_head.html` + `all.js` + `</script>`. Se valida con `node --check all.js`.

### 6.2 Convenciones

- Ejes: +Y arriba, norte = −Z, este = +X. En el sistema local del dragón: −Z adelante, +Y arriba, +X derecha.
- Unidades: metros y segundos. La velocidad se muestra en km/h (m/s × 3,6).
- El dragón se orienta con un cuaternión. Cabeceo, guiñada y alabeo son siempre ejes locales, así que "arriba/abajo/adelante" son correctos con cualquier alabeo.
- La velocidad es `adelante × velocidad`, sin vector de velocidad independiente. Por eso una respuesta a colisiones tiene que mover la posición y ajustar la velocidad a mano.
- Three.js r128 con `ShaderMaterial`. El terreno y el cielo calculan su niebla en el propio shader (no con `scene.fog`).
- Partículas: puntos con shader, `emit(P,x,y,z,vx,vy,vz,life,s0,s1,r,g,b,a,drag,grav)` con dos sistemas, `fxAdd` (aditivo) y `fxSmoke`.

### 6.3 Modelo de vuelo (`p7_game.js`)

- Valores de la v6 (en Sky Apex v5 cambian, ver 7c): mínima de pérdida de sustentación `VMIN = 33`, máxima `VMAX = 200`, crucero máximo sin boost `VCRUISE_MAX = 105` m/s.
- Empuje `2 + 18·acelerador + 32·boostFx`, resistencia `0,0018·v²`, más la gravedad (picado acelera, ascenso frena). Velocidad acotada entre 18 y `VMAX`.
- Por debajo de `VMIN` el dragón pierde sustentación y se hunde (hasta ≈ 36 m/s de hundimiento), sin entrar en barrena. Con velocidad normal se hunde 2,5 m/s si no se corrige.
- Giro hacia el marcador: tasa máxima `lerp(1.75, 0.95, sn)` rad/s con ganancia 2,6. Radio de giro ≈ 110 m a 105 m/s. Con boost la autoridad de giro cae a `BOOST_STEER = 0.2`.
- Banking: `BANK_GAIN = 0.30`, `BANK_MAX = 0.50` rad (≈ 29°).
- Boost: se gasta a 0,25/s, se recarga a 0,125/s tras 2 s sin pulsar, y tras agotarse necesita un 20 % de carga para volver a usarse.
- Hover: frenada total (`HOVER_BRAKE = 2.6`), velocidad vertical máxima `HOVER_VSPEED = 26`, salida a `HOVER_EXIT_SPEED = 28`.
- Colisión: terreno a menos de 2,2 m, agua, o isla con margen 2,6 m → `crash(motivo)`.
- Cámara: FOV `lerp(76, 88, sn)` más boost. En primera persona va en (0, 3,2, 1,5) respecto al dragón. Plano cercano 0,25 y lejano 16000.
- Piloto automático (`auto`): se usa en el menú y en las pruebas. Mantiene rumbo suave y altura segura sobre terreno e islas.

### 6.4 Combate

- Bola de fuego: velocidad fija en el mundo de 340 m/s (no hereda la del dragón), vida de 6 s.
- Daño del jugador a enemigos: 1 impacto por bola; 4 para derribar a un dragón.
- Asistencia de puntería ligera: `aimPointFrom` marcha a lo largo del rayo del marcador y, si pasa cerca de un enemigo, el disparo converge a su punto de interceptación (`interceptPoint`, resuelve la ecuación cuadrática bola-objetivo), no a su posición actual.
- Círculo gris de adelanto = ese mismo punto, proyectado en pantalla.

### 6.5 IA enemiga: constantes de ajuste (`p6b_enemies.js`)

| Constante | Valor | Significado |
|---|---|---|
| `ENEMY_COUNT` | 6 | Dragones simultáneos |
| `ENEMY_HP` | 4 | Impactos para derribarlo |
| `ENEMY_DMG` | 15 | Daño de su bola al jugador |
| `ENEMY_SCORE` | 300 | Puntos por derribo |
| `ENEMY_VMAX` | 105 | Velocidad máxima (= jugador sin boost) |
| `ENEMY_DETECT` / `ENEMY_LOSE` | 2000 / 3800 m | Detecta al jugador / lo pierde |
| `ENEMY_FIRE_RANGE` | 1000 m | Alcance de disparo |
| `ENEMY_FIRE_CD` | 1,7–2,9 s | Pausa entre bolas |
| `ENEMY_AIM_ERR` | 0,022 rad | Imprecisión de puntería (±2,2 % de la distancia) |
| `ENEMY_STAGGER` | 0,4 s | Separación mínima entre disparos de distintos dragones |
| `ENEMY_SCALE` | 1,5 | Tamaño respecto al jugador |
| `ENEMY_BREAK` | 230 m | Distancia a la que rompen la pasada |
| `ENEMY_HIT_R` / `PLAYER_HIT_R` | 19,5 / 10 m | Radios de impacto |
| `ENEMY_RESPAWN` | 6–10 s | Tiempo hasta el sustituto |
| `TRAIL_LEN`, `TRAIL_PX` | 1100 m, 3,6 px | Estela amarilla y grosor mínimo en pantalla |

Detalles de la IA: la pasada de ataque lleva el adelanto del jugador y, a media distancia, se aproxima en arco para flanquear (el desvío se limita según la velocidad de cierre para que sigan acercándose aunque el jugador huya). Los enemigos evitan el terreno. Modos: `patrol`, `pass`, `extend`, `reposition`.

### 6.6 Terreno e islas: constantes

- Terreno: `TL_BASE = 128`, `TL_MAX = 6`, `TL_N = 32`, `TL_SPLIT = 1.15`. El nivel L mide 128·2^L m y siempre tiene 32×32 celdas (de 4 m a 256 m).
- Islas: `ISL_FINE = 900`, `ISL_BIG = 2600`, `ISL_DATA_R = 9500`; probabilidad de isla por celda 0,46 (fina) y 0,42 (grande). Alturas base por plano: bajo 430–710 m, medio 820–1340 m, alto 1450–2250 m (se suben si hace falta para no rozar las montañas de debajo).
- Torres: celdas de 1100 m, carga a 3600 m y descarga a 4600 m.
- Niebla: `FOG_DENSITY = 0.00021`.

## 7. Rama experimental: prototipo de carreras

Entregado como `alas_de_brasa_carreras.html` (también publicado como artifact). Se hizo en una carpeta aparte copiando el juego, sin tocar la v6. Se aparcó por decisión de Jorge, pero hay piezas reutilizables.

Qué es
- Circuito cerrado de 16,6 km con 14 puertas secuenciales, 2 vueltas por defecto, cronómetro, penalización de +2 s por puerta fallada y +3 s por reaparición, y reaparición en la última puerta. `Enter` reinicia la carrera.
- Sin IAs, sin torres, sin vida. Controles y bola de fuego idénticos.
- Secciones: cañón de salida y "Cañón del Amanecer", "La Aguja" (espiral de 1,9 vueltas alrededor de un pico de 720 m de alto), descenso, "Gruta de los Cristales" (túnel con estalactitas y estalagmitas azules), "Cavernas de Brasa" (túnel grande con lago de lava, pilares y cascadas de lava), archipiélago, "Valle de Ceniza", "Túnel de la Ventisca" (con una S de dos horquillas) y "Garganta final" (conector que cierra el circuito).

Cómo se hizo
- Línea central cerrada generada con una "tortuga" de piezas `[longitud, giro°, altura]`, un tramo analítico en espiral y un conector Hermite para cerrar. Remuestreo cada ~8 m con suavizado y marcos sin alabeo (basados en el vector arriba del mundo).
- Túneles: barrido de un tubo con radio interior variable y una carcasa exterior tipo isla flotante (radio limitado por la curvatura para que no se autointersecte). Estalactitas, estalagmitas, pilares y cascadas de lava como mallas aparte. Luces de pista aditivas y puertas como toros.
- Terreno: gancho `terrainHook` en `terrain()` que aplana la zona, talla los cañones (media ponderada de tramos cercanos, para evitar acantilados) y levanta la aguja. Las islas decorativas y las torres se excluyen cerca de la pista.
- Colisión: consulta a la línea central con hash espacial y ventana local; contactos con pared interior del túnel, isla exterior, espolones, pilares, lava y terreno (esfera de radio 7 m). Raspar paredes quita velocidad; un impacto frontal fuerte (normal > 62 m/s) o la lava prolongada (1,1 s) matan.
- Sensación de velocidad: FOV extra a alta velocidad, temblor de cámara cerca de las paredes, 280 rayas de viento fijas en el mundo estiradas con la velocidad, rayas de velocidad en el HUD, viento sonoro con término de proximidad, brasas y bruma en las cuevas de lava, y exterior oculto cuando se está profundo dentro de un túnel.
- HUD de carrera: minimapa con perfil de altitud, diamantes de línea de carrera, marcador de la siguiente puerta o flecha en el borde, panel de vuelta, tiempo y puertas, y holgura a la pared dentro de los túneles.

Resultados de las pruebas
- Un piloto automático dio la vuelta completa en 204,8 s sin ningún choque (≈ 80 m/s de crucero).
- Choque contra pared de túnel → muerte → reaparición en la última puerta con +3 s: funciona. `Enter` reinicia: funciona.
- Mallas de la pista: ≈ 118 000 vértices y 216 000 triángulos en 157 mallas. En el Chromium sin GPU (software) iba a unos 22 fps a 960×540. En una GPU real debería ir sobrado, pero no está medido.
- Sin errores de página en la consola.

Perillas de ajuste de esa rama
- Sensación de velocidad: FOV extra (`smooth(105, 200, F.speed) * 6`), temblor (`tremor`), rayas de viento (`updateStreaks`).
- Circuito: `SEC_DEF` define cada sección (`[longitud, giro°, altura final]`, radio del túnel, grosor de roca, espolones, pilares, cascadas).
- Cuevas: `CAVE_FOG` y la intensidad de la linterna del dragón en el shader `caveMat`.
- Reglas: `RACE.laps`, `CRASH_VN`, `OFF_TIME`, `MISS_PENALTY`, `RESPAWN_PENALTY`.

Qué no se pudo comprobar
- El manejo real en las curvas cerradas, la sensación de velocidad y la legibilidad de las cuevas con un monitor y un ratón. Jorge dijo que el circuito estaba bien, sin pedir ajustes.

Ideas del prototipo que se podrían llevar al mundo abierto (opcional, no decidido)
- Efectos de sensación de velocidad (rayas de viento y FOV con la velocidad, temblor cerca del suelo o de paredes).
- Respuesta de colisión que raspa en lugar de matar siempre (hoy el mundo abierto mata al tocar terreno).
- Cuevas o túneles como zonas opcionales dentro de una isla grande.

## 7b. Rama humanoide (aparcada, sin feedback)

- Modelo: "Dragon Character 3d" de Oscar Creativo (Sketchfab), licencia **CC-BY-NC 4.0**. El crédito está en el menú.
  - El original (`modelos/dragon_01.glb`) pesa 444 MB: 48 texturas 4K UDIM, 167k triángulos y 100 huesos. Su único clip, «MOTION», es de exhibición en el suelo.
  - Optimizado con `herramientas/optimizar_modelo.mjs --ratio 0.3 --tile 512` → `dragon_01_web.glb` (5,1 MB, 50k triángulos, atlas JPEG).
- Fuente: `fuentes/alas_de_brasa_humanoide.src.html` (módulo "5c. DRAGÓN HUMANOIDE").
  - Para jugar se genera `alas_de_brasa_humanoide.html` con `cd herramientas && node incrustar_modelo.mjs`.
  - Usa la cámara siempre en 3ª persona.
  - Los enemigos son los wyverns procedurales de la v6.
- Animación:
  - Las alas mezclan dos poses del clip: "arriba" a los 6,0 s y "abajo" a los 10,5 s.
  - El resto se coloca por código.
  - Constantes: `HERO_SCALE 11` (unos 17 m), `HERO_CAM`, `HERO_HOVER_PITCH`.

## 7c. Rama Tyrant (línea activa, v14)

### Modelo y licencia
- Viene de la carpeta `Drogon/Drogon/`, un pack comprado por Jorge (863 MB) con dos modelos:
  - **Drogon**: 39k triángulos, rig Biped de 291 huesos y 52 animaciones de combate de un juego de Unreal. No trae un ciclo de vuelo hacia delante que cierre en bucle.
  - **TyrantDragon** (bonus):
    - 158k triángulos, 596 huesos (alas con dedos de 8 segmentos, mandíbula Jaw0-2). El FBX tiene Z arriba.
    - Textura difusa UDIM de 5 casillas.
    - 29 FBX de animación: `Fly_VariantA` (2,77 s, ciclo de vuelo), `FlyingIdle` (1,77 s, hover), TakeOff, Landing, BreathFire, Roar, Idle…
- **Dudas de licencia**, ya comunicadas a Jorge:
  - Los nombres internos (`SKM_DaenerysDragon`…) apuntan a un recurso de un juego comercial sobre un personaje de HBO.
  - El origen del bonus no está claro.
  - **No publicar** hasta aclararlo.

### Flujo de archivos (todo en Node, sin Blender)
1. `herramientas/preparar_fbx.mjs` lee los FBX. Usa `fbx_node.mjs`: FBXLoader de three@0.169 con un DOM simulado, instalado en `herramientas/node_modules`. Escribe `modelos/tyrant_web.glb` (5,7 MB):
   - Malla reducida a 52k triángulos, con 459 huesos que deforman.
   - Atlas de 3072×2048.
   - Clips `vuelo`, `hover`, `reposo`, `fuego` y `rugido`, a 15–20 fps y con rotaciones int16 (`--fps`, `--cuantizar`).
   - Nodo raíz con Rx(−90°): Y arriba y cabeza hacia +Z.
2. **Desde la v15 la fuente se edita por módulos**, en `fuentes/sky_apex/` (ver «v15»), y `node herramientas/construir.mjs` hace los pasos 2 y 3 de una vez: junta los módulos en `fuentes/sky_apex.src.html` (generado; hasta la v14 era el archivo que se editaba) y genera `sky_apex.html`. Sin el modelo incrustado, la fuente carga `../modelos/tyrant_web.glb`, así que necesita el servidor local.
3. Para generar el archivo de juego (dragón, brazos y logo dentro; la música queda fuera, en `musica/`); desde la v15 lo hace `construir.mjs`:
   `cd herramientas && node incrustar_modelo.mjs --fuente ../fuentes/sky_apex.src.html --modelo ../modelos/tyrant_web.glb --extra brazos-glb=../modelos/brazos_jinete.glb --extra caballero-glb=../modelos/caballero.glb --extra logo-sky-png=../imagenes/logo_sky.png --extra logo-apex-png=../imagenes/logo_apex.png --salida ../sky_apex.html`
4. Tras cada cambio, copiar las secciones 5c, 5e y 5d de la fuente a `herramientas/modulo_tyrant.js` (solo de referencia). **Desde la v6 no se ha vuelto a copiar: está desfasado; manda la fuente.**
5. Brazos del jinete: `node preparar_brazos.mjs --fbx ../Knighty.fbx --salida ../modelos/brazos_jinete.glb` (con `--analizar` saca mapas de texto de la mano para ajustar articulaciones). Logo: `node separar_logo.mjs`.

### Cómo funciona (fuente, secciones 5–7)
- `hero` = el Tyrant del jugador. Es un `wrap` (giro de 180° y escala por envergadura `HERO_SPAN = 34` m) que cuelga del grupo `dragon` (el que vuela y lleva la cámara). El pivote está en el hueso `spine_02`.
- `animateTyrant(R, A, dt, st)` anima cualquier Tyrant, el jugador o un enemigo:
  - Acciones del mixer: vuelo, planeo (copia del vuelo congelada a 1,11 s, el fotograma con más envergadura) y hover.
  - Capa por código encima, con giros en el espacio del modelo (`rotModel`/`rotAxis`):
    - Cuello (Neck1-4 y head) hacia el marcador (`HERO_LOOK`, `HERO_NECK_W`, `HERO_NECK_UP`), con anticipo del giro.
    - `Jaw0` se abre al disparar (`HERO_JAW`).
    - Cola Tail0-9 con el giro.
    - Brazos recogidos en boost (`HERO_TUCK`).
  - La boca está en el hueso `LipUpperMid`.
- `animateHero(dt, st)` llama a `animateTyrant(hero, …)` y añade el fogonazo de la boca y la cámara:
  - 1ª persona (por defecto): `HERO_FP = [1.55, -0.5, -0.05]`, es decir, altura sobre `spine_02`, retroceso (negativo = adelante, sobre los hombros) y cabeceo. Sigue al lomo de forma suavizada.
  - 3ª persona (tecla C): `HERO_CAM = [8, 22, -0.07]`; en hover baja `HERO_CAM_HOVER = 3` m.
  - Menú: la cámara gira lenta alrededor del dragón.
- Pantalla de título → «Elige tu dragón» (sección 5d, estado `select`, escena `show` aparte) → partida. Esc o «← Menú» vuelven al menú.
  - `hero.wrap` se pasa a la plataforma y vuelve con `showroomLeave`. `restorePose0` restaura todos los huesos.
  - Clips `reposo` en bucle y, al azar, `fuego` o `rugido`. El botón «Probar llamarada» (`#fireTry`) lanza `fuego` al momento; las llamas salen a los ~2,5 s por la carga del clip. **La boca la abre `Jaw1`** en estos clips.
  - Clic derecho gira la plataforma; la rueda del ratón acerca.
  - Ruedas HSV para la piel y el aliento:
    - La piel se tiñe en el shader (`tintSkinMaterial(m, U)`, onBeforeCompile sobre `map_fragment`).
    - El aliento cambia `ATTACK`: bolas, estelas, fogonazo y luces.
    - Se guardan en `localStorage['alasDeBrasa.colores']`.
- Enemigos (sección 6b): 6 copias del Tyrant (`cloneTyrant`).
  - Cada copia tiene un esqueleto nuevo, que comparten sus 3 mallas, y materiales propios. Comparten con el jugador el código del shader (mismo programa).
  - Piel amarilla `ENEMY_TINT = (1.7, 1.25, 0.18)`. Por encima de 1 compensa la luz azulada del cielo: con 1,0 salía verde oliva.
  - Ojos rojos `ENEMY_EYES`. Destello naranja al recibir un impacto (uniforme `uHit`) y fogonazo de la boca al disparar.
  - Tamaño `ENEMY_SCALE = 1.5`: unos 51 m de envergadura.
  - Ahorro:
    - Los que no se ven salen de la escena (`showEnemy`, prueba de frustum).
    - LOD de animación `ENEMY_ANIM_LOD = [700, 1800]`: cada fotograma, cada 2 o cada 3 según la distancia.
    - Fuera de escena, la boca y la estela usan `hero.mouthLocal` y `hero.tailLocal`.
  - La IA, el daño, la estela amarilla y la fijación de objetivo son los de la v6.
- Boost (v3):
  - FOV: `lerp(76, 88, sn) + BOOST_FOV (14)·boostFx + BOOST_KICK_FOV (4)·kickFx` (de 86° a ~102°). `kickFx` es el golpe al activarlo.
  - Temblor de cámara con senos de 7–11 Hz (`BOOST_SHAKE`).
  - HUD: túnel (bordes oscuros que se cierran) y 90 líneas radiales en `drawSpeedLines`. Llevan `shadowBlur = 0`: con sombra, el relleno a pantalla completa sale caro.
  - Estelas de viento 3D (`wind`, `WIND_N/R/FAR/ALPHA/PX/LEN`): cintas quietas en el mundo, en un tubo alrededor de la trayectoria.
- Del juego base se quitó el dragón procedural (`buildRig`, `animateRig`…): ya no lo usaba nadie.

### v4 «Sky Apex» (23-oct): intro, música y jinete
- **Intro y menú** (sección 8b de la fuente, `INTRO`, `intro`, `updateIntro`):
  - Pantalla negra mientras cargan dragón y brazos. Si el navegador no deja sonar audio sin gesto (se prueba con un WAV mudo, `canAutoplay`), sale «Haz clic para empezar» (vale cualquier clic o tecla).
  - Tiempos (s): SKY entra de 0,08 a 0,7 desde la izquierda y espera un 8 % antes de su sitio; APEX entra desde 0,42 acelerando (potencia 1,7); choque en 0,95 (SKY da el último tirón en 0,08 s). Inclinación (skew) según la velocidad, sacudida y golpe de escala tras el choque. A 1,9 s aparece el resto del menú (`.reveal`); a 2,6 s el negro se funde y deja ver el mundo (si ya cargó).
  - Efectos en dos lienzos a media resolución (`#fxBack` detrás del logo: resplandor y llamas; `#fxFront` delante: brasas, chispas, destello y dos ondas). Las llamas salen del contorno de cada mitad (calculado de sus píxeles en un lienzo de 360×180, `logoEdges`); mientras se mueven dejan estela. Unas 200 llamas/s por mitad en reposo.
  - Durante la intro, el terreno se genera con 5 ms por fotograma en vez de 24 (`intro.busy`) para que no dé tirones.
- **Música** (`music`): `HTMLAudioElement` en bucle; busca `musica/musica_menu.*` (o `../musica/` desde `fuentes/`). Volumen y silencio en el pie del menú (`#musVol`, `#musMute`), guardados en `localStorage['skyApex.musica']`. Sigue en «Elige tu dragón» y se funde (1,6 s) al empezar la partida. La tecla M sigue silenciando solo los efectos.
- **Jinete** (sección 5e, `rider`, `updateRider`, `renderRider`):
  - Modelo: `modelos/brazos_jinete.glb` de `preparar_brazos.mjs`. Brazo izquierdo del Knighty (lado +X del modelo) recortado por islas de malla (las placas entran enteras; la cota de malla se recorta por triángulos), reducido a unos 16k triángulos y con 18 huesos sin giro en reposo (Brazo, Antebrazo, Mano, índice/corazón/anular/meñique 1-3 y pulgar 1-3). Las placas pequeñas van rígidas con un hueso; el guante se pesa por vértice. El derecho es el espejo. Escala 0,004 (antebrazo 0,23 m). Articulaciones medidas: hombro (66,208,14), codo (123,170,17), muñeca (161,129,34), punta (183,88,40) en unidades del FBX ×50.
  - Se dibuja en una segunda pasada (`renderer.clearDepth()` y escena propia con las mismas luces, un mapa de entorno de degradado para el acero y la luz del fogonazo). Su cámara copia orientación, FOV y aspecto de la del juego, pero va en el origen. Cuesta ~0,4 ms de GPU y 0,12 ms de CPU.
  - Pose: IK de dos huesos en ejes del jinete (x izquierda, y arriba, z adelante). Constantes `RIDER_SHOULDER`, `RIDER_GRIP`, `RIDER_POLE`, `RIDER_FIST`, `RIDER_THUMB`, `RIDER_CURL`, `RIDER_TWIST` (el antebrazo se lleva el 60 % del giro de la muñeca). Reacciones: `RIDER_PULL` (girar tira de la rienda de ese lado), `RIDER_CLIMB`, `RIDER_BOOST` (manos adelante y abajo, hombros adelante, temblor), `RIDER_HOVER` (riendas recogidas), aletazo, fogonazo y la cabeza del dragón (`headYaw`) arrastrando las manos.
  - Riendas: tubos de 24 tramos, del puño a `LipUpper01_l/_r`, pasando por encima de `Neck1`, `Neck3` y `head` (`RIDER_REIN_PATH`) con una Catmull-Rom; solo el tramo libre (mano → cuello) hace comba, que se tensa al tirar. **Van en la pasada del jinete**: en la escena del mundo el lomo del dragón las tapaba.
  - Solo en 1ª persona y en partida (en 3ª persona, menú y selección no se ven).

### v5 (23-oct): música de partida, velocidad, gravedad, FOV y riendas
- **Música**: `music.menu` y `music.game` (fábrica `musicTrack`), con volumen y silencio comunes (`musicMix`, el pie del menú). Al empezar la partida, la del menú se funde en 1,6 s y entra `musica_game` en 2,5 s a `MUSIC_GAME_GAIN = 0.4` del volumen general (0,28 con el 70 % por defecto). La M silencia ahora efectos y música.
- **Vuelo** (sección 7):
  - `VCRUISE_MAX = 550/3,6` (152,8 m/s), `VMAX = 1100/3,6` (305,6 m/s).
  - Empuje `THRUST = [3, 27]` (+ `BOOST_THRUST = 90`, el triple: con resistencia ∝ v², dobla la velocidad). `DRAG` se calcula para que a todo gas y nivelado el equilibrio sea VCRUISE_MAX.
  - Pendiente: `GRAVITY = 30` m/s² a lo largo de la trayectoria (`-GRAVITY·sen(cabeceo)`). En picado (`smooth(0.2, 0.8, -fwd.y)`) la resistencia baja hasta un 40 % (`DIVE_DRAG`): alas plegadas.
  - Medido: crucero 552-554 km/h; boost ~1060 km/h al acabar la barra (4 s); subida de 30° 6 s → 422 km/h; picado de 60° 5 s → 889 km/h; al nivelar vuelve a ~630 en 4 s.
  - A todo gas sin boost en vertical hacia abajo el equilibrio ronda 1000 km/h; el tope absoluto es VMAX.
- **FOV**: `BOOST_FOV = 18`, `BOOST_KICK_FOV = 5` y `SPEED_FOV = 8·smooth(VCRUISE_MAX, VMAX, v)` (también se abre en los picados). Con boost a tope, unos 114°.
- **Enemigos**: `ENEMY_VMAX = 550/3,6` (como el jugador sin boost). Siguen haciendo pasadas.
- **Bolas de fuego**: las del jugador van a `PLAYER_FIREBALL_SPEED = 520` m/s (a 340 apenas se separaban del dragón en boost); las enemigas siguen a 340. La interceptación y el círculo de adelanto usan la del jugador.
- **Terreno**: con boost a 400 m del suelo, como mucho 14 trozos pendientes (media 0,2): da tiempo a generarlo.
- **Riendas**: ya no llegan a la boca. Van del puño, por encima de `Neck1` y `Neck2`, a una **collera** (`RIDER_COLLAR`, en `Neck2Part2`) que abraza el cuello por arriba, a media altura. Los puntos usan los ejes de cada tramo del cuello (`neckFrame`), así que siguen sus giros. Tubos con `riderTube` y `fillTube`.

### v6 (23-oct, noche): cuatro armas
Todo en la sección 7 de la fuente, bloque «Armas del jugador» (constantes arriba y estado `W`). Controles nuevos: clic izq. fuego rápido (mantenido: bola guiada), clic dcho. llamarada, izq. + dcho. rayo, **clic central fijar** (antes, clic derecho).
- Vida en puntos de daño: dragón `ENEMY_HP = 100`, torre `TOWER_HP = 60`. `damageEnemy(e, n, at, soft)` y `damageTower(t, n, soft)`: `soft` = daño continuo (chispas y sonido cada 0,22 s). Embestida: 50. La vida del enemigo se muestra como barra, no como pips.
- **Fuego rápido** (`fireGun`): `GUN_AMMO 30`, `GUN_COOL 0,1`, `GUN_REFILL_DELAY 1`, `GUN_REFILL_RATE 8`/s, `GUN_SPEED 1100` m/s, `GUN_LIFE 2,8`, `GUN_DMG 5` (20 impactos por dragón). Comparte `fireballs` con `kind: 'gun'` (sprites pequeños y trazadora de chispas, 3 subpasos). La interceptación, la asistencia de puntería y el círculo gris de adelanto usan ya `GUN_SPEED` (se quitó `PLAYER_FIREBALL_SPEED`). Sin ráfaga al mantener.
- **Bola guiada** (`lockCircle`, `launchMissile`, `steerMissile`): `MSL_RANGE 3000`, `MSL_LOCK 4` s, fuera del círculo la carga cae ×`MSL_DECAY 2`, círculo de radio ≥ `MSL_CIRCLE` (10 % del alto) y nunca menor que el cuadro dorado. Sale a max(160, velocidad del dragón + 40) m/s, acelera a 260 m/s² hasta 400, gira 3,2 rad/s hacia el punto de interceptación (×3 a menos de 200 m), vive 15 s, daño 70. Pitidos de bloqueo cada vez más rápidos. Hay que soltar y volver a pulsar para la siguiente.
- **Llamarada** (`flameFx`): `FLAME_RANGE 100`, `FLAME_DPS 70`, se sobrecalienta en `FLAME_HEAT 5` s seguidos, se enfría en `FLAME_COOL 4` s (tras 0,35 s), `OVERHEAT_T 10`. Partículas que heredan la velocidad del dragón y salen a ~170 m/s (el chorro se curva al girar). Daño en un cono que se abre un 12 % de la distancia. Vapor por la boca durante el sobrecalentamiento.
- **Rayo** (`tryLaser`, `laserFx`): `LASER_T 10`, `LASER_RANGE 3000`, `LASER_DPS 220`; carga `ULT_TIME 90` s + `ULT_PER_DMG 0,001` por punto de daño + `ULT_PER_KILL 0,05` por derribo (torre, la mitad). Dos cintas aditivas orientadas a la cámara (`beamCore`, `beamGlow`, anchos `BEAM_W_*` en la boca, a 25 m y al final) con textura de vetas que corre hacia fuera; acaba en el primer obstáculo del rayo de la mira (`beamRay`). Mientras dura, las demás armas callan.
- Sonido nuevo en `sfx`: `shot`, `launch`, `lockTick`, `locked`, `overheat`, `ultReady`, `laserOn` y el bucle `breath(llamarada, rayo)` (se silencia en pausa).
- HUD: panel «ARMAS» abajo a la derecha (`drawWeapons`: mando, nombre, estado y barra por arma; lo inutilizable se atenúa); el **radar pasa abajo a la izquierda**; arco de calor a la derecha de la mira y «SOBRECALENTADO» debajo; círculo rojo con la carga en dorado (`drawLockCircle`). La mira se pone gris sin armas.
- Probado en simulación: 10 impactos = 50; munición 20 → 26 en 1 s → 30; la bola guiada alcanzó a un dragón con su IA en 2,3 s (−70); llamarada −70 en 1 s y sobrecalentamiento a los 5 s; el rayo mata a 2 km en 0,5 s y se apaga a los 10 s; combos y clic central con eventos de ratón reales. Falta que Jorge juegue: daños, tiempos, legibilidad de la llamarada en 1ª persona (tapa un poco la mira) y el rendimiento con muchas partículas.

### v7 (23-oct, noche): rayo kamehameha, socket, munición de bolas y torres
- **Socket de la boca** (`hero.mouth`, «BocaSocket»): Object3D hijo de `MuzzleNose`, entre `LipUpperMid` y `LipLowerMid` y 0,3 m por delante; `heroMouth` devuelve su posición. Los disparos ya no salen en el evento del ratón ni en `updateWeapons`: se encolan (`W.shotQ`, `W.mslQ`) y salen en `updateAttacks`, que va en `updateWorld` después de `animateHero`, con la boca ya animada (medido: el proyectil nace a 0 m de la boca girando a tope). Los sprites de los proyectiles nacen ya colocados.
- **Clic izquierdo**: cada pulsación dispara fuego rápido (también con blanco fijado y la mira en el círculo). Mantenido más de `MSL_HOLD 0,5` s empieza a cargar la bola guiada (los 4 s de carga van después).
- **Bolas guiadas**: `MSL_AMMO 5`, máximo `MSL_MAX 5`, `MSL_TOWER 2` por torre destruida (el aviso de la torre lo dice). No se recargan al morir; sí al empezar partida. Sin bolas no hay círculo y el panel dice «DESTRUYE TORRES». En el panel, bolitas doradas tras el nombre.
- **Llamarada**: `FLAME_RANGE 200`, llamas a `FLAME_SPEED 240` m/s, partículas más grandes; `fxAdd` sube a 3400 partículas.
- **Rayo (kamehameha)**: carga de `LASER_CHARGE 0,4` s (bola de energía que crece en la boca y chispas que convergen, sin daño); después el rayo sale a `LASER_SHOOT 6000` m/s hasta la mira o el primer obstáculo (máx. 3 km). Tres cintas que miran a la cámara (`BEAM_LAYERS`: núcleo casi blanco de 5 m, halo de 12 y aura de 22; `N_BEAM` = 10 puntos a lo largo) que se abren en los primeros 30 m y laten con ondas hacia fuera; bola de energía en la punta (más grande al chocar, con llamaradas `burstFx`) y espiral de dos hebras en los primeros 600 m. Radio de daño `LASER_R 8`. Los 10 s cuentan desde el clic.
- **Sonido del rayo**: voz continua creada en `sfx.init` (dos dientes de sierra desafinados a 73 Hz + octava + subgrave, por un paso bajo resonante con LFO de 7,5 Hz, chisporroteo agudo y trémolo de 31 Hz) que controla `sfx.breath`; `laserOn` = silbido de carga y estallido a los 0,38 s; `laserOff` al acabar.
- **Torres**: `TOWER_SX 2` y `TOWER_SY 3` aplicados a la geometría (la ruina, ×2); se quitó el mástil con la bandera. `TOWER_TOP` (~106 m) y `TOWER_R` (8,8 m) para impactos, puntería, ballesta (`27·TOWER_SY`) y **choque del jugador** (nuevo: «Te estrellaste contra una torre»). Llamarada y rayo contra torres con `towerSegDist2` (distancia entre segmentos). Cristal (`makeCrystal`): octaedro de 15×30 m, `MeshPhongMaterial` morado con brillo propio, que gira y flota a `TOWER_CRYSTAL_Y`; halo aditivo de 85 m que late y una chispa de tamaño fijo en pantalla (`TOWER_BEACON_PX 16`, `sizeAttenuation: false`). Al caer la torre el cristal estalla en esquirlas moradas. Las torres se crean y descargan con `addTower` / `dropTower`.
- Probado: socket a 0,3 m de los labios; clic corto con blanco fijado dispara; carga 0 a los 0,4 s y 25 % a los 1,5 s; 5 → 4 bolas al lanzar; sin bolas no carga; torre destruida +2 y cristal fuera; la llamarada daña a 180 m y no a 240; el rayo no daña en la carga y alcanza 2 km; choque contra torre. Capturas de torres y cristal a 400 m y 1 km, y del rayo en 1ª y 3ª persona. El sonido no se ha podido oír.

### v8 (23-oct, noche): bolas guiadas enemigas, caballero completo, mirar con la Z
- **Bolas guiadas enemigas** (sección 6b, tras `enemyShoot`): `enemyMissileTry(s, from, dt, can)` para dragones (desde la boca, si están en combate y tienen al jugador por delante) y torres (desde el cristal). Fijan `EMSL_LOCK 1,5` s seguidos con línea de visión entre `EMSL_RANGE` 250 y 1900 m; cada tirador, `EMSL_CD 30` s de espera (al empezar, entre 6 y 30 s al azar); entre dos lanzamientos de cualquiera, `EMSL_GAP 4` s. Proyectil `kind: 'emsl'` en `fireballs`: 35 de daño (`EMSL_DMG`), sale a 170 m/s y acelera a 320, vive 14 s. Guiado imperfecto (`steerEnemyMissile`): persecución con un 35 % de adelanto, giro de 0,7 rad/s y, si el jugador sale del cono de ±1,2 rad del buscador, lo pierde y sigue recto. Choca con terreno, agua, islas y torres (sin dañarlas). Al morir y reaparecer, nadie lanza en 8 s.
  - Medido con bolas lanzadas a mano: con giro 1,1 no se podía esquivar; con 0,75 se esquiva rompiendo fuerte (90°) con la bola a 400-600 m de frente o ~400 m por detrás; antes o después, impacta. Se dejó en 0,7.
  - Avisos: `threat` (se rellena cada fotograma). El texto `#warn` dice «TE ESTÁN FIJANDO» (dorado, pitido doble `sfx.warnLock`) o «¡PROYECTIL APROXIMÁNDOSE!» (rojo, pitidos `sfx.warnMissile` cada vez más rápidos); `drawMissileWarn` pone un rombo rojo con la distancia sobre cada bola en pantalla y, si no se ve, una flecha roja en un anillo alrededor del centro. En el radar, puntos rojos que parpadean.
- **Caballero completo** (sección 5f, `knight`): `herramientas/preparar_caballero.mjs` lee `Knighty.fbx` entero (129 mallas, 1,5 M triángulos), crea 17 huesos sin giro en reposo con articulaciones medidas por cortes (pelvis y = −55, cadera ±40/−65, rodilla −135, tobillo −193, cuello 238, cabeza 256; hombro, codo y muñeca los de los brazos), pesa por zonas (placas pequeñas rígidas; faldón delantero y malla entre las piernas a medias entre los dos muslos; faldón trasero y espada del costado con la pelvis; piezas de la espalda con el pecho), suelda por posición (si no, el simplificador no reduce) y deja 38 158 triángulos a 1,9 m (0,00343 m por unidad). El caballero es estilizado: torso largo y piernas de ~45 cm.
  - Poses por direcciones de cada tramo (`KNIGHT_SEAT` a horcajadas con las riendas, `KNIGHT_STAND` de pie con los brazos abajo); `knightPose` y `aimKnightBone`.
  - En partida cuelga del dragón con los ojos donde va la cámara de 1ª persona; se ve cuando la mezcla de cámara pasa de `KNIGHT_SHOW_CAM 0,12`, y a la vez se ocultan los brazos de la 1ª persona. Riendas y collera de la 3ª persona en la escena del mundo (`rider.reins3`, `rider.collar3`), desde sus puños (`knightFist`); el código de riendas es común (`layReins`). Materiales y reflejos compartidos con los brazos (`riderMaterial`, `steelEnv`).
  - Incrustado como `caballero-glb` (comando de la sección 7c con `--extra caballero-glb=../modelos/caballero.glb`).
- **Cámara de 1ª persona**: `HERO_FP = [2.3, -0.5, -0.12]` (antes 1,55 de alto y −0,05 de cabeceo). Medido: el lomo, en ese punto, está ~1 m sobre `spine_02`, y el caballero sentado tiene los ojos 1,33 m sobre el asiento.
- **Mirar alrededor (Z)**: `updateLook` (dentro de `updateAim`): con la Z, el ratón mueve `F.lookYaw`/`F.lookPit` y no la mira. En 1ª persona, ±170° y de −1,1 a 1 rad; en 3ª, sin tope de guiñada (órbita alrededor del pivote del dragón) y de −0,9 a 1,1 rad. Al soltar, vuelve al frente (`LOOK_RETURN 5`/s, por el camino corto). `animateHero` aplica el mismo giro como cabeza (1ª) u órbita (3ª). Los brazos de la 1ª persona siguen al lomo, no a la cabeza (`rider.root` ≠ `rider.cam`). Sin puntero bloqueado, mientras se mira, la mira se queda quieta.
- **«Elige tu dragón»**: solo reposo; la llamarada con el botón y vuelta al reposo. Zoom `SHOW_ZOOM` de 0,22 a 1,6 (antes 0,6) y, de cerca, la cámara apunta algo más abajo; plano cercano a 0,2 m. El caballero, de pie en la plataforma en `KNIGHT_SHOW`.
- Probado: fijado y lanzamiento de dragón y torre a los 1,5 s, espera de 30 s, avisos, impacto en vuelo recto, esquiva con el giro elegido; la Z en 1ª (tope de 170°, mira y brazos quietos) y en 3ª (órbita completa) y la vuelta al soltar; capturas del caballero de pie y sentado (también sobre el dragón, con riendas), de la nueva 1ª persona y del aviso con rombo y flecha; el HTML generado carga todo sin errores. No se ha podido oír el sonido ni juzgar el feeling.

### v9 (23-oct, noche): menos bolas enemigas, escudo, asiento atrás, aleteo en boost y arreglo de la Z
- Jorge: «Nos hemos pasado de dificultad ahora. Hay demasiados misiles apuntando al jugador.»
- **Bolas guiadas enemigas**: fijan en `EMSL_LOCK 4` s; cada tirador, una por minuto (`EMSL_CD 60`); entre dos lanzamientos de cualquiera, `EMSL_GAP 20` s; solo entre 500 y 2500 m (`EMSL_RANGE`). Nadie empieza a fijar hasta que faltan menos de `EMSL_LOCK` s para poder lanzar (si no, el aviso «TE ESTÁN FIJANDO» se quedaba encendido toda la espera). Medido: a 400 m no lanzan; a 2400 m, a los 4 s; el segundo tirador, 20 s después del primero.
- **Bola guiada del jugador**: `MSL_LOCK 3` (más el medio segundo de clic mantenido).
- **Asiento**: `HERO_FP = [2.3, 0.5, -0.12]`: misma altura, 1 m más atrás (entre las alas). El caballero completo se mueve con él.
- **Boost**: `HERO_FLAP_BOOST 2.6`, el doble que a todo gas (antes 1,7).
- **Fallo de la Z**: los temblores de cámara hacían `camera.rotation.z = 0` en cada fotograma, con el orden de ejes XYZ por defecto. Con la vista girada e inclinada, la z de ese orden no es el alabeo: borrarla dejaba la dirección pero giraba la imagen sobre su eje (medido: 140° con 120° de guiñada y 29° de cabeceo). Arreglo: `camera.rotation.order = 'YXZ'` (guiñada, cabeceo, alabeo), y así la z es el alabeo. Medido después: 0° de error y alabeo 0 en todas las posiciones.
- **Escudo (F)** (sección 7, tras el bloque de armas): `SHIELD_MAX 3` cargas (empieza con 3; +1 por dragón derribado; al morir no se recargan); dura `SHIELD_T 5` s, parpadea en el último `SHIELD_BLINK 1,2` s y se disipa. Esfera `shieldMesh` hija del dragón (radio `SHIELD_R 18`, centro `SHIELD_POS`; con 21 m la cámara de 3ª persona quedaba justo en el borde), con un shader aditivo: borde brillante (fresnel), retícula de energía que se desliza y destello donde choca algo (`uHit`, `uHitDir`). Anula bolas de fuego, bolas guiadas y virotes, que revientan contra ella con chispas azules (`shieldHit`); no protege de los choques. Al estrellarse se apaga. HUD: tres rayas bajo la mira (azules = cargas; la que está en uso, más clara, se vacía con el tiempo; las gastadas, negras). Sonidos `shieldOn`, `shieldHit`, `shieldOff`.
- Probado: la F gasta una carga y una segunda pulsación con el escudo puesto no; una bola guiada, una bola de fuego y un virote no quitan vida con el escudo; sin escudo, la bola guiada quita 35; derribar un dragón devuelve una carga; sin cargas no se activa; parpadeo final y apagado; capturas en 1ª y 3ª persona y de las rayas.

### v10 (25-oct): menú nuevo, objetivo final y torres antiaéreas
- **Fuego rápido**: `GUN_AMMO 20`. **Círculo de la bola guiada**: `MSL_CIRCLE_K 0,5` (la mitad).
- **Torres antiaéreas** (`updateTowerAI`): ráfagas de `AA_BURST 5` proyectiles `kind: 'aa'` (como los del jugador: 1100 m/s, trazadora naranja) cada 0,12 s, pausa de 2,2-3,6 s, hasta `AA_RANGE 1500` m, al punto de interceptación con dispersión `AA_SPREAD 0,025` rad; `AA_DMG 3` (el del jugador, 5). El impacto es «ligero» (`hurtDragon(n, why, light)`: menos sacudida, sin estallido). El escudo los para. Ya no lanzan bolas guiadas ni virotes (los virotes siguen en el código, sin usarse; `TOWER_RANGE` se quitó).
- **30 torres fijas**: `TOWER_SITES` (se calculan al cargar con la semilla): `TOWER_TOTAL 30` en un anillo de 1,5 a 9 km alrededor del inicio, en tierra firme (altura 9-600 m, pendiente < 0,3) y a más de 1300 m entre sí (medido: 1,9 a 8,9 km). `updateTowerStreaming` las carga a 3,6 km como antes; ya no hay torres por celdas (`towerInCell`, `siteAt` fuera) ni en las islas (`ensureIslandTowers` vacía). El radar pinta todas las que quedan (las lejanas, en el borde) y «Torre más cercana» cuenta todas.
- **20 dragones**: `ENEMY_TOTAL 20`, `enemyState.spawned`; siguen saliendo de 6 en 6 hasta que han aparecido 20.
- **Victoria** (sección 7, antes de `startGame`): `checkVictory` (al derribar o destruir) → 2,5 s después, `showVictory`: estado `'victory'`, suelta el puntero, música del menú y `#victory` con 12 estadísticas (`stats`: tiempo, puntos, torres, dragones, caídas, precisión del fuego rápido, bolas guiadas, rayos, escudos y proyectiles parados, daño recibido, distancia, velocidad máxima) y botones Menú principal (`backToMenu`), Reiniciar (`restartGame`) y Salir (`quitGame`). HUD: «TORRES n / 30», «DRAGONES n / 20».
- **Partida nueva** (`resetRun`, desde `startGame`): estadísticas a cero, torres reconstruidas, proyectiles fuera y el dragón en `START` (el punto de partida del arranque), con el terreno generado de golpe. En el menú el dragón ya no vuela: espera en el punto de partida (y allí se va generando el terreno).
- **Intro** (8b): siempre espera a un clic o tecla («Pulsa cualquier tecla o haz clic»; se quitó `canAutoplay`). `INTRO = { black: 3, sky: [3, 3.8], apex: [4.15, 4.7], ui: 5.9 }`: negro; SKY entra y se queda en el centro; APEX choca a los 4,7 s → chispas, llamas alrededor del logo y `music.menu.play()`; botones a los 5,9 s. Sin estela de fuego mientras entran. El fondo del menú es negro (`#introBlack` ya no se quita).
- **Menú**: botones `#go` (Elige tu dragón, con la barra de carga), `#mTutorial` (aviso «próximamente»), `#mControls` y `#mOptions` (paneles `.mpanel`: lista completa de controles y el objetivo; volúmenes `audioVol` de música del menú, de la partida y de efectos, más la sensibilidad), `#mQuit`. Esc cierra los paneles. Se quitó el pie antiguo (controles, música y sensibilidad).
- **Volúmenes**: `audioVol = { menu: 0.7, game: 0.28, sfx: 1 }` en `localStorage['skyApex.audio']` (si no existe, se toma el volumen antiguo de `skyApex.musica`); `musicTrack(nombre, clave)`; `sfx.applyVolume()` (maestro 0,55 × efectos). La M sigue silenciando todo.
- **Salir** (`quitGame`): `window.close()` y, si el navegador no deja (pestaña normal), `#bye` en negro: «Gracias por jugar · Ya puedes cerrar la pestaña» con «← Volver al menú». En el navegador integrado de la app la pestaña sí se cierra.
- El aviso (`#toast`) va por encima de las capas del menú (z-index 8).
- Probado: línea de tiempo de la intro (negro hasta 3 s, SKY centrada a 3,8, choque y música a 4,7, botones a 5,9); paneles y volúmenes guardados; ráfagas antiaéreas de 5 y 3 de daño, ninguna bola guiada de torre; tope de 20 dragones; victoria con estadísticas; reiniciar, salir (despedida) y volver al menú; el HTML generado sin errores. No se ha oído el sonido ni juzgado el feeling.

### v11 (25-oct): intro más corta
- `INTRO = { black: 1.5, sky: [1.5, 2.3], apex: [2.65, 3.2], ui: 4.4 }`: 1,5 s en negro (antes 3) y el resto de la intro adelantado lo mismo (SKY centrada a 2,3 s, choque y música a 3,2 s, botones a 4,4 s). Comprobado en el HTML generado. Es la versión aprobada con la que empieza la fase del Tutorial.

### v12 (25-oct): Tutorial con vídeos
- **Ventana** (`#pTutorial`, clases `.tut-*`; HTML dentro de `#menu`, código en la sección 8b tras los botones del menú): cabecera «Tutorial · Manual del jinete» con el botón desactivado «Campo de pruebas · próximamente» y «← Volver»; a la izquierda la lista de `TUTORIAL` (6 categorías, 21 secciones numeradas) y a la derecha el vídeo (16:9, en bucle y sin sonido), con categoría, número, título y una frase. Al elegir una sección (`tutSelect`) se despliega su texto (párrafos + lista de teclas) y se pliegan las demás; la lista se desplaza sola para que se vea. Clic en el vídeo: pausa; botón de esquina: ampliar el vídeo a todo el panel (`.zoom`; Esc lo reduce y un segundo Esc cierra). ↑ ↓ cambian de sección. Recuerda la última sección (`localStorage['skyApex.tutorial']`). Por debajo de 860 px de ancho, el vídeo arriba y la lista debajo. `closePanels` pausa el vídeo.
- **Vídeos**: `tutorial/<id>.webm` (o `.mp4`), buscados como la música (`../tutorial/` desde `fuentes/`); si no hay, aviso «Vídeo no disponible…». Duran de 7 a 11 s.
- **Textos**: con los números del código (velocidades, daños, tiempos, cargas). Si se cambia una constante del juego, revisar el texto de su sección.
- **Grabador** (`herramientas/grabar_tutorial.js`, no lo carga el juego; instrucciones en su cabecera):
  - Se inyecta en la página de la fuente servida por `servidor_tutorial.mjs` (puerto 8766, preview `grabador-tutorial`) con `?semilla=777` (la fuente acepta `?semilla=N` desde la v12). `REC.prepare()` para el bucle del juego (`frame` sustituido), fija la ventana a 1024×576 (sustituye `innerWidth`/`innerHeight`/`devicePixelRatio`: el HUD cabe sin solaparse; a 800×450 las armas pisaban la altitud), silencia, entra en partida y captura los `toast`.
  - Cada escena de `SCENES` (una por sección): `place` (posición, rumbo, altura sobre el suelo o sobre la trayectoria `path`, velocidad, cámara, munición; o una torre de `TOWER_SITES` con llegada `'auto'`: la de terreno más bajo y el sol a la espalda), `setup` (títeres: `puppet({ at: [derecha, arriba, delante], dir, speed, turn, mode, hp, trail })`), entradas `keys`/`clicks`/`moves` (eventos reales al juego; el ratón como píxeles con el puntero bloqueado), `each(t, S)` (p. ej. `aimAt`), `callouts` (recuadros dorados sobre el HUD), `show` (mandos dibujados), `cam` (3ª persona más lejos, en el escudo), `orbit` (cámara de lado, en el rayo).
  - Simulación a paso fijo (2 × 1/60 s por fotograma), render del mundo, del jinete y del HUD, y encima los avisos del DOM redibujados (`#toast`, `#warn`, viñeta, «Has caído») y los mandos. VP9 con WebCodecs a 1,8 Mb/s, fotograma clave cada 2 s; el WebM lo monta `muxWebM` (con duración, SeekHead y Cues: el `<video>` puede buscar y hacer bucle) y se sube con `PUT /tutorial/<id>.webm`.
  - `REC.peek(id, [t…])` enseña una hoja de fotogramas; `REC.frame(id, t)`, uno a tamaño real; `REC.record(id)`, `REC.recordAll()`. Registro en `REC.log` (derribos, impactos, escudo, caídas). Con el panel oculto graba a ~4 fotogramas/s: ~1 min por vídeo, ~22 min los 21; hay que lanzarlo sin `await` y consultar `REC.log`.
  - Ajustes encontrados: en 3ª persona, rumbos con el sol a la espalda (si no, el dragón sale a contraluz); estela de los títeres muy cercanos desactivada (tapaba media pantalla); la bola guiada enemiga se esquiva rompiendo a ~700 m (a 450-550 m acierta); el rayo se ve mejor de lado (`orbit`).

### v13 (26-oct): torres en islas, viento y aleteo, sensación de vuelo
- **Torres en islas** (sección 4, `planTowers`): `TOWER_SITES` ya no es fijo; se rellena al arrancar y en cada `resetRun`. Entre `TOWER_ISL` (10-15, al azar) torres van en islas de la zona (`TOWER_ZONE`) de al menos `TOWER_ISL_R` (110 m) de radio, separadas `TOWER_GAP`; el resto, al azar entre `GROUND_SITES` (44 candidatas fijas con la semilla, en tierra) a `TOWER_GAP` entre sí y `TOWER_ISL_GAP` (700 m, en planta) de las de las islas. Sitio en la isla: `islandTowerSpot` (cerca del centro, base hundida en el punto más bajo de su planta); `setIslandTower` rehace los árboles de la isla para que no salgan dentro de la torre. Ids `I…` (islas) y `T…` (tierra); `site.isl` = la isla. Medido: siempre 30, de 10 a 15 en islas, a 480-1490 m de altura. Radar: las de las islas, cuadrado hueco. El grabador del tutorial usa solo las de tierra.
- **Viento** (`sfx`, v13): tres capas que siguen a `F.speed / VMAX` y crecen al acelerar (`F.accS`, aceleración suavizada): soplo grave (ruido marrón, paso bajo), siseo agudo en estéreo con ráfagas lentas (ruido blanco, dos canales) y un silbido estrecho a partir de unos 600 km/h (picados y boost). Fuera de partida, en pausa, en la selección y en la victoria, en silencio (`sfx.quiet`). **Aleteo**: `sfx.flap(fuerza, cerca)` al bajar las alas (golpe sordo, soplo que barre de grave a agudo y unos chasquidos de la membrana) y `sfx.flapUp` al subirlas; menos al planear y algo más lejano en 3ª persona. No se ha podido oír: lo juzga Jorge.
- **Control** (sección 7): `F.steer` persigue a la mira (`F.aimLocal`) con `STEER_LAG 12`/s; las tasas responden con `RATE_RESP [6, 4]` (antes 7,5 y 4,5) y `STEER_GAIN 2.2` (antes 2,6). La mira sigue siendo inmediata (las armas apuntan donde está). Medido: a un salto de 20° llega a la mitad en ~0,5 s, al 90 % en ~0,75 s y se pasa 1° (antes ~0,35 s y sin pasarse). `BANK_GAIN 0.40`, `BANK_MAX 0.80` (antes 0,30 y 0,50).
- **Cuerpo** (sección 5c, `animateHero`): `hero.bodyQ`, giro del modelo encima del rumbo con muelles (`BODY_SPRING [6.5, 0.55]`): alabeo extra al virar (`BODY_ROLL`), morro que se adelanta a cabeceos y giros (`BODY_PITCH`, `BODY_YAW`), sube y baja con cada aletazo (`BODY_HEAVE 0,3` m), alas recogidas en picado (`HERO_DIVE_TUCK`) y el ala de dentro del giro algo recogida (`HERO_TURN_TUCK`, también en los enemigos). `hero.wrap` = `bodyQ` × giro de 180°. El caballero (3ª persona) va con el cuerpo; los brazos de la 1ª persona siguen el `RIDER_LEAN` (60 %) de su giro.
- **Cámara** (`animateHero`): `dragonAnim.camQ` (marco en el mundo) persigue al del dragón con `CAM_LAG [10, 4.2]`/s (1ª y 3ª persona) y con el alabeo reducido (`CAM_ROLL [0.6, 0.7]`: parte del alabeo del rumbo + cuerpo que sigue el horizonte; cerca de la vertical, sin corregir). Ese retraso gira el brazo de la 3ª persona y la vista de las dos: al girar, el dragón se escapa hacia el lado del giro y se le ve el costado; al subir queda arriba, al picar abajo. Al acelerar la cámara se queda atrás (`CAM_PUSH`: hasta 5 m en 3ª, 0,22 m en 1ª). Temblor leve por encima del crucero (`SPEED_SHAKE`). El temblor de los golpes ya no pone el alabeo de la cámara a 0 (lo suma). `camQ = null` al reaparecer, teletransportar o en el menú (sin retraso).
- **Música del menú**: empieza cuando SKY queda en el centro (`INTRO.sky[1]`, 2,3 s), no con el choque de APEX (3,2 s). (En la v14, antes aún.)
- Probado en el navegador integrado: reparto de torres (8 partidas), torre sobre su isla, giros en 1ª y 3ª persona, boost, picado, hover, caída y reaparición, «Elige tu dragón» y vuelta, la intro, y el HTML generado sin errores. **Los vídeos del tutorial siguen siendo los de la v12** (cámara y control anteriores): regrabarlos cuando Jorge dé por buena la sensación nueva (`REC.recordAll()`; puede que haya que retocar alguna escena por el retraso, p. ej. el momento del giro para esquivar la bola enemiga).

### v14 (26-oct): cámara en loopings, música y logo nuevo (aprobada)
- Jorge: «al subir mucho e intentar hacer un giro completo, al llegar casi a los 90 grados la cámara parece fallar y hacer cosas raras». **Causa**: la corrección del horizonte de la cámara (v13) usa el alabeo respecto al horizonte (`atan2(derecha.y, arriba.y)`); al pasar por la vertical el dragón queda boca abajo y ese ángulo salta entre +180° y −180°: el objetivo de la cámara daba saltos y `camQ` se reenganchaba de golpe (medido: giros de hasta 144° en un fotograma, 8 saltos por looping). **Arreglo**: la corrección solo actúa con el dragón derecho (`smooth(0.05, 0.4, arriba.y)`); en vertical o boca abajo la cámara sigue al dragón tal cual (con su retraso). Medido después: loopings hacia arriba y hacia abajo, con y sin giro, en 1ª y 3ª persona: como mucho 1° por fotograma y ningún salto.
- **Música del menú** («sigue sonando un poco tarde: en cuanto entre SKY a escena, que empiece»): empieza en `INTRO.sky[0]` (1,5 s, cuando SKY empieza a entrar) y desde `MUSIC_MENU_LEAD` (0,45 s): «Dragon's Ascent» tiene ~0,45 s de silencio al principio (medido decodificando el mp3), que se sumaba al retraso. `musicTrack(…).play(fundido, desde)` acepta el segundo de inicio. Si se cambia la canción, revisar `MUSIC_MENU_LEAD`.
- **Logo nuevo**: imagen de Jorge (2000×1116, JPG con fondo blanco) guardada en `imagenes/logo_v2.jpg`. `herramientas/separar_logo_blanco.mjs` (jpeg-js + pngjs): el fondo es el blanco conectado con el borde más los huecos cerrados de más de 120 px (dentro de la A y la P); a 3 px o más del fondo todo es opaco (los brillos dorados no se transparentan); en bordes y llamas finas, opacidad = 1 − canal más bajo y color «desmezclado» del blanco (sin halo). Separación por la línea del hueco entre la Y y la A (`SPLIT`), cada mancha opaca entera a su lado. Salida: `imagenes/logo_sky.png` y `logo_apex.png`, 1734×633 las dos (se superponen). Las del logo anterior quedan como `logo_sky_v1.png` / `logo_apex_v1.png`. En la fuente: `.logo-stage` con proporción 1734/633 y ancho `min(64vw, 150vh, 880px)`; `LOGO_W`, `LOGO_H`, `LOGO_BOX` (cajas de respaldo) y `LOGO_HIT` (el choque, entre la Y y la A, en fracción del logo).
- Probado: los loopings (números y capturas), la música a los 1,5 s desde 0,45 s, la intro con el logo nuevo (SKY entrando, choque, menú) y el HTML generado sin errores.

### v15 (26-oct): módulos y motor de misiones (Fase 0 de la campaña, primera parte)
Ver la sección 7d (plan de la campaña). Lo hecho:
- **Fuente por módulos**: `fuentes/sky_apex/NN_*.html|css|js` (00 cabecera, 01 estilos, 02 DOM, 03-17 las secciones 1-8b de siempre, 18-19 misiones, 20 bucle y arranque, 21 cierre). La división se comprobó byte a byte contra la v14. `node herramientas/construir.mjs` junta los módulos en `fuentes/sky_apex.src.html` (generado: **no editarlo**), comprueba la sintaxis (`node --check`) e incrusta los recursos en `sky_apex.html`; con `--solo-fuente` hace solo lo primero (para probar).
- **Motor de misiones** (`19_misiones_motor.js`) que lee recetas de datos (`18_misiones_datos.js`, `MISSIONS`; formato explicado en su cabecera): área (círculo), muerte (`fail`/`respawn`), tiempo límite, torres y dragones (`RUN`), objetivos (ocultos, opcionales), radio (personajes con icono provisional) y eventos «cuando → haz» (`t`, `kills`, `done`, `pending`, `hp`, `inside`, `after` → `say`, `show`, `toast`, `dragons`, `win`, `fail`). Funciones: `chooseMission`, `missionSetup`, `missionStart`, `missionUpdate` (desde `updateFlight` y, muerto, desde el bucle), `missionDeath`, `missionWin`, `missionFail`; estado en `MS`.
- **Área de la misión**: barrera invisible; al salir, aviso «Abandonando el área de la misión» con cuenta atrás de 15 s (`AREA_GRACE`), distancia al borde, pitido por segundo y flecha dorada hacia la zona; al volver (60 m dentro, `AREA_HYST`) se anula; a 0 → MISIÓN FALLIDA. El radar sombrea en rojo lo de fuera y dibuja el borde discontinuo. Los dragones aparecen y patrullan dentro (`inMissionArea`, `clampToArea`).
- **Final**: `showResult(win, motivo)` (antes `showVictory`): MISIÓN CUMPLIDA / MISIÓN FALLIDA (en rojo, con el motivo) y las estadísticas; botones Menú / Reintentar o Repetir misión / Salir. Caer en una misión con `death: 'fail'` la falla (tras los 2,6 s de caída); con los objetivos ya cumplidos no se puede fallar. La misión se cumple 4 s después de cumplir los objetivos (`MISSION_END_DELAY`).
- **Radio**: abajo en el centro (entre radar y armas; arriba si la ventana mide menos de 1000 px de ancho), un mensaje cada vez, con cola y pitido (`sfx.radio`).
- **Menú**: «Misión de prueba» (el botón grande) y «Combate libre» → «Elige tu dragón» («Empezar misión» / «Empezar partida»). Con 720 px de alto los botones se compactan para no pisar la nota del pie. **Pausa** con Continuar / Reintentar misión / Menú principal.
- **Misión de prueba**: la partida de la v14 con área de 10,5 km de radio, caer = fallar y radio de «Mando». **Combate libre**: la v14 tal cual (sin área, reaparece). Las dos con 30 torres y 20 dragones (6 a la vez).
- Torres y dragones salen de `RUN` (copiado de la receta): `planTowers` usa `RUN.towers` y `groundSites(zona)`; `spawnEnemies` usa `RUN.dragons` (los que sobran quedan `off`). Las constantes `TOWER_TOTAL`, `ENEMY_TOTAL`… son los valores por defecto.
- Probado en el navegador integrado (servidor `sky-apex-2`, puerto 8767, porque otro chat tenía el 8765): combate libre igual que la v14 (aviso, reaparición), radio, salir y volver al área, fallo por área y por caída, victoria (también cayendo tras cumplir), pausa (reintentar, continuar, menú), capturas de HUD, radar, resultados, menú y pausa, y el HTML generado sin errores. Sin comprobar: el sonido nuevo (radio, cuenta atrás) y el ritmo real jugando.
- Siguiente (v16, segunda parte de la Fase 0): mundo configurable por misión (semilla, y más adelante bioma) y objetivos genéricos (que se pueda fijar y contar cualquier cosa destruible, no solo torres y dragones).

### v16 (26-oct): tres dragones para elegir
Petición de Jorge: implementar el Red Dragon y Drogon (descartado el Syrax en STL: sin UV ni esqueleto) y, en «Elige tu dragón», botones arriba a la izquierda para cambiar entre los tres y personalizar sus colores por separado.
- **Modelos**:
  - `herramientas/preparar_dragon_rojo.mjs`: `red_dragon.glb` (Sketchfab, GadgetHamster, CC-BY 4.0: hay que citarlo, ya va en la nota del menú y en «Elige tu dragón») → `modelos/dragon_rojo.glb`. Texturas 4K PNG → JPEG de 2048 (color, relieve) y 1024 (ORM, brillo); fuera las UV sobrantes y las 9 «animaciones» (poses de un fotograma). El rig usaba IK de Blender: la mano del ala, las manos y los pies colgaban de la raíz; se reenganchan a lowerWing, forearm y ankle conservando la pose.
  - `herramientas/preparar_drogon.mjs` (adaptado de preparar_fbx.mjs; ~1 min): `Dragon.fbx` → `modelos/drogon_web.glb`, con las dos texturas en un atlas de 3072×1536 y tres clips propios (reposo, rugido, cielo) que de momento no se usan.
- **Cómo se mueven** (`09b_dragones.js`, sección 5g): el Tyrant sigue siendo el esqueleto que lo mueve todo (clips y capa por código). Con otro dragón elegido se oculta y en cada fotograma su pose se copia hueso a hueso (`DRAGONS[id].map`): cuánto ha girado cada hueso desde una pose de referencia común (el Tyrant en planeo).
  - **La referencia del otro modelo se endereza al cargar** (`matchRefPose`): cada hueso emparejado se orienta hacia sus hijos como su pareja del Tyrant. Sin esto, Drogon (en su pose de enlace tiene las alas levantadas hacia atrás) plegaba mal y salía torcido.
  - La alineación con el Tyrant (H) se calcula **una sola vez**, antes de enderezar, y se usa para todo. Recalcularla después torcía el aleteo distinto en cada ala.
  - Al cargar se calculan solos la escala (envergadura `span`, 34 m), la boca (la punta del morro: `D.mouth`), la altura del asiento sobre el lomo (`heroFP`, en lugar de `HERO_FP`) y el grosor del cuello (`neckK`: riendas y collera). El asiento va un hueso por detrás de donde nacen las alas (`seatBone`: spine1 en el rojo, Bip002-Spine3 en Drogon); el recorrido de las riendas y la collera, en `DRAGONS[id].rider`.
  - Coste: copiar la pose, ~0,11 ms por fotograma. Los enemigos siguen siendo Tyrants amarillos (`cloneTyrant` fuerza sus copias visibles).
- **«Elige tu dragón»**: botones `#selDragons` (desactivados hasta que carga cada modelo), nombre y descripción provisionales (`DRAGONS[id].name/desc`) y crédito. Cada dragón guarda su piel y su aliento (`dragonColors`, en `localStorage['skyApex.dragones']` junto con el elegido; los colores de antes pasan al Tyrant). Cada uno tiene sus propios valores de tinte (`D.U`; `tintSkinMaterial` calcula la luminancia de cada textura). El dragón rojo (`show: 'aire'`) flota sobre la plataforma con el hover, porque el reposo del Tyrant le pondría las alas en el suelo; su «Probar llamarada» abre la boca por código (`showJaw`). Drogon (`show: 'suelo'`) copia el reposo, la llamarada y el rugido del Tyrant.
- Probado en el navegador integrado: los tres en la plataforma, vuelo (simétrico, comparado desde detrás con el Tyrant), hover, reposo, la boca (marcada con una bola roja), primera y tercera persona con el jinete y las riendas, el caballero sentado, colores independientes, recordar el dragón elegido al recargar, partida con misión, enemigos visibles y el HTML generado (25 MB) sin errores. Sin comprobar: la sensación jugando y el rendimiento en la Vega 10.
- Pendiente o posible: nombres y descripciones definitivos; stats distintos por dragón (Fase 1, hangar); usar los clips propios de Drogon en la plataforma.

### v17 (26-oct): dragones arreglados, nombres y stats
Lo que dijo Jorge de la v16, con capturas: Drogon «totalmente roto» (cuello torcido y girado, patas mal, deformaciones), también en partida; el dragón rojo, en la plataforma, bajo y con la cola atravesando el suelo (pidió que estuviera posado a cuatro patas, batiendo un poco las alas y moviendo la cabeza; en vuelo funcionaba bien). Y nombres y stats nuevos.
- **Por qué se rompía Drogon** (y cómo se arregló, en `09b_dragones.js`):
  1. Arrancaba de la pose guardada en los nodos del FBX, que trae huesos girados sobre sí mismos. Ahora parte de la **pose de enlace de la piel** (`bindPose`, `ref: 'enlace'`).
  2. El enderezado solo apuntaba cada hueso a sus hijos y le dejaba el giro sobre su eje (cuello retorcido, membrana abierta). Ahora cada hueso se gira para que **todo lo que cuelga de él** (hijos, nietos…, con más peso los cercanos) quede como en el Tyrant: el giro de mejor encaje por el método de Horn (`bestRotation`, cuaterniones e iteración de potencias; probado con un giro conocido, error 0).
  3. Su **mandíbula es la «coleta» del Biped** (`Bip002-Ponytail1`, ~3900 vértices); `Bone013/014` solo son las comisuras. Ahora abre la boca al disparar.
- **La plataforma ya no copia al Tyrant para los otros dos**: copiar una pose de suelo entre cuerpos con otras proporciones deja alas que no llegan al suelo o patas en el aire (la «mano rosada» flotando delante del pecho de Drogon era la muñeca del ala). Cada uno usa lo suyo (`DRAGONS[id].showClip`, `playDragonClip`):
  - Ventoscuro: su reposo de combate (clip propio «reposo»). Con un rig Biped de 3ds Max la pose de enlace es la «figura» con el cuerpo vertical, así que la alineación del vuelo gira el modelo ~100°: para sus clips se usa otra, la de la pose guardada (`H0`, `pos0`), y al salir se vuelve a la del vuelo (`restoreDragonRef`).
  - Abrasanubes: la pose «ref» del original (de pie a cuatro patas, alas medio alzadas), que `preparar_dragon_rojo.mjs` guarda ahora como el clip «pie» pasada a la jerarquía reenganchada, y encima un reposo por código (`dragonIdle`: respira, agita un poco las alas, mira alrededor, mece la cola).
  - «Probar llamarada» en los dos: la boca se abre por código (`dragonShowLayer`; bisagra = eje lateral visto desde la cabeza, con el sentido que la abre hacia abajo comprobado al cargar) y sale fuego de la boca. Encuadre más cercano para ellos (posados, con las alas recogidas, son más pequeños).
- **Nombres y stats** (`DRAGONS[id].name/desc/stats`, `heroStats()`): vida máxima (inicio, reaparición, regeneración y barra del HUD), velocidad punta (la resistencia se divide entre su cuadrado y el tope se multiplica: crucero medido 660 / 632 / 412 km/h) y daño de todos los ataques del jugador (`damageEnemy`, `damageTower`: un proyectil rápido quita 4,25 / 5,75 / 5,75). **La bola guiada sigue destruyendo una torre de un impacto** con los tres (parámetro `sure` de `damageTower`; con −15 % se habría quedado en 59,5 de 60). Las stats se ven en «Elige tu dragón» con barras (dorado si mejora, rojo si empeora). El tutorial ya no habla de «Tyrants» (los enemigos son «dragones amarillos de la raza de Alientormenta») y explica que en una misión caer es MISIÓN FALLIDA.
- Ayudantes de prueba: `herramientas/banco_dragones.js` (objeto `BD`: `listo`, `foto`, `rejilla`, `ver`, `jugar`, `vuela`, `capJuego`, `camara`); se inyecta en la página servida por el preview `sky-apex-2`.
- Probado: los tres en la plataforma (de frente, de lado y de cerca), la llamarada de prueba, Ventoscuro en vuelo durante un aleteo entero (tercera persona) y de cerca con el caballero y las riendas, la boca al disparar, las stats medidas, la torre con la bola guiada y el HTML generado (25,3 MB) sin errores. Copias: `versiones/sky_apex_v17.*` y `versiones/dragon_rojo_v16.glb` (el GLB anterior, sin la pose «pie»). Sin comprobar: la sensación jugando y el rendimiento en la Vega 10.

### v18 (26-oct): Abrasanubes estable en la plataforma y su cabeza en vuelo
Jorge, con capturas: Abrasanubes «se vuelve loco» en «Elige tu dragón» (partes girando sin parar hasta desmadejarse) y, en vuelo, «se ha jodido un poco la perspectiva de la cabeza y el cuello» (en 1ª persona se veía la cabeza como una punta vertical). Ventoscuro, mejor.
- **Los giros se acumulaban**, por dos causas (en `09b_dragones.js`; en las pruebas de 2-3 s de la v17 no se notaba, en un minuto un ala había girado 172°):
  1. three.js solo vuelve a escribir un valor de animación si ha cambiado (`PropertyMixer`): con un clip fijo (la pose «pie») el clip no reponía nada cada fotograma y la capa por código se sumaba a la anterior. Ahora cada hueso que toca la capa guarda su valor sin ella (`e.base`) y se repone antes de cada `mixer.update` (`dragonShowBase`, `dragonShowList`).
  2. `Quaternion.invert()` es el conjugado, el inverso solo si el cuaternión es unitario: con un redondeo mínimo cerca de la raíz, cada hueso de la cola multiplicaba el error del anterior (un giro de 1,5° en la punta de 14 huesos llegaba a 64°). Ahora `modelQuats`, `dragonRot` y `dragonPose` normalizan.
  Medido: misma fase del reposo antes y después de 2 min con llamaradas cada 20 s → 0,00° de diferencia; amplitudes del reposo como se diseñaron (alas 17,5°, antebrazos 10,5°, cuello 6,3°).
- **La cabeza**: en la v17, al enderezar la referencia (`matchRefPose`) la cabeza se orientaba también por la posición de la mandíbula, que en cada modelo está en otro sitio; la del dragón rojo quedaba mirando arriba. Las mandíbulas vuelven a no contar (como en la v16). Medido: cabeceo de la cabeza respecto al rumbo −7° en el rojo (antes apuntaba arriba), −15° en Ventoscuro, −30° en Alientormenta.
- Probado: 3 min simulados en la plataforma con los dos (y capturas a los 3 s, 30 s, 1 min y 2 min), la llamarada repetida, la 1ª y 3ª persona de los tres y el HTML generado sin errores. Copia en `versiones/sky_apex_v18.*`.

### v19 (26-oct): mundo configurable por misión (Fase 0, segunda parte)
Plan acordado en la sección 7d. Lo hecho:
- **Semilla variable**: `SEED` ya es `let`; `SEED_BOOT` es la del arranque (`?semilla=N`, `window.__SEED` o al azar) y es la del combate libre. `setSeed(s)` rehace los ruidos `N1`-`N3`; `hash2` lee la semilla actual. La textura de detalle del terreno (`makeNoiseTexture`) ya no depende de la semilla (`hashSeed`, sin semilla): así una misión se ve igual aunque el juego se abra con otra semilla de arranque.
- **Receta** (`18_misiones_datos.js`, formato en su cabecera): `world: { seed, biome }` (`seed: null` = la del arranque) y `start: { x, z, heading, height }` (rumbo en grados de brújula, `null` = hacia donde más relieve hay, como siempre; `height` sobre el suelo; con `y`, altitud absoluta, nunca a menos de 40 m del suelo; si cae en una isla, por encima). Misión de prueba: semilla **777** (el valle de los vídeos del tutorial), inicio en 0, 0. Combate libre: `seed: null`.
- **Torres**: el anillo `zone` se centra en el punto de partida (`RUN.towers.center`) y el reparto sale siempre igual con la semilla (`seededRandom`, mulberry32); `towers.random: true` = reparto nuevo en cada partida (lo tiene el combate libre, como antes). `groundSites(zona, cx, cz)`.
- **Módulo nuevo `19b_mundo.js`** (M3): `BIOMES` (hueco para la Fase 3: solo `valle`), `WORLD` (el mundo generado ahora: semilla, bioma, clave del inicio), `missionWorld` (receta → `RUN.world`, desde `missionSetup`), `worldNeedsGen`, `clearWorld` (borra chunks y sus árboles, islas y su caché `islCells`, torres, `TOWER_SITES` y `groundSiteCache`), `placeStart` (coloca el dragón y fija `START`; `bestHeading(x, z)` se movió aquí), `beginWorldGen` y `updateWorldGen`.
- **Flujo**: `startGame` → `missionSetup` → si la semilla o el inicio no son los del mundo cargado, `beginWorldGen` (con otra semilla borra el mundo; con la misma solo mueve el inicio) y estado **`worldgen`**: pantalla negra `#worldgen` con lugar, nombre, barra (terreno hasta el 85 %, luego las islas cercanas) y «Semilla N · Valle templado»; el bucle llama a `updateWorldGen` (sin pintar el mundo) y al acabar vuelve a llamar a `startGame`, que ya no regenera. Reintentar, repetir o volver al menú no regeneran. El arranque genera el mundo del combate libre (`missionSetup('libre')` + `placeStart`), así que `banco_pruebas.js` y `grabar_tutorial.js` siguen igual; con `?semilla=777` la misión de prueba tampoco regenera (mismo mundo).
- **Modo diseño (tecla º)**, `DESIGN`, `drawDesign` (desde `drawHUD`): panel arriba a la izquierda con misión, semilla y bioma; X y Z; altitud (sobre el agua) y altura (sobre el suelo); rumbo; distancia al inicio y al borde del área. **Intro** marca un punto (rombo dorado numerado en el mundo; «INICIO» marca el punto de partida) y copia al portapapeles la lista de marcas de esa semilla como `{ x, z, heading, height },   // n · altitud`, que vale tal cual para `start` (y sus x, z para áreas). Acepta `Backquote`, `º` y `` ` `` (la herramienta del navegador manda la tecla sin `code`). Añadido a «Controles».
- Probado (preview `sky-apex-2`, 8767): la misión de prueba genera la semilla 777 en ~0,5 s en este equipo (19 fotogramas); mismo mundo (alturas, islas, 30 torres, 15 en islas, inicio y rumbo) al reintentar, al volver del combate libre y **tras recargar la página con otra semilla de arranque** (firma idéntica); el combate libre vuelve a la semilla del arranque y sigue cambiando las torres en cada partida; inicios con rumbo 90°, `height`, `y` absoluta, `y` demasiado baja (sube a 40 m) y dentro de una isla (sube por encima); misma semilla con otro inicio: sin borrar el terreno; º e Intro con pulsaciones reales (marca y copia al portapapeles); capturas del panel de diseño, de la pantalla de carga y de «Controles»; 20 s de partida simulada en el HTML generado (25,3 MB) sin errores. Sin comprobar: la duración de la carga en la Vega 10 y el portapapeles abriendo `sky_apex.html` como archivo local (si falla, hay un método de respaldo y el aviso lo dice). Copia en `versiones/sky_apex_v19.*`.

### v20 (27-oct): cuarto dragón, Fulgor
Petición de Jorge: tras ver los vídeos del Syrax (sección 8.3) y corregir el ala (giraba 180° en la muñeca), integrarlo como **cuarto dragón** (no sustituye a Ventoscuro), llamado **Fulgor**, con las stats de Ventoscuro de momento, y que las dos cámaras funcionen bien; en 1ª persona, que se vean bien el cuello y la cabeza, parte de la grupa y las alas batiendo a los lados.
- **Modelo**: `modelos/syrax_web.glb` (4,5 MB; `herramientas/blender/syrax/11_exportar.py -- modelos/syrax_web.glb`), incrustado como `fulgor-glb` (`construir.mjs`, `02_dom.html`). Al exportar, los huesos del centro pierden el «_01» (`neck1`…`neck6`, `tail1`…`tail16`, `spine1`, `spine2`): el juego quita los sufijos «_número» al emparejar (`nameKey`) y `neck_01`…`neck_06` habrían sido todos «neck». El color se exporta más oscuro (color^1,8 · 0,78): el juego usa las texturas de los dragones sin descodificar el sRGB y su luz está pensada para dragones oscuros; tal cual (luminancia media 0,36 frente a 0,16-0,19 de los otros) salía amarillo chillón; ahora 0,22.
- **`DRAGONS.fulgor`** (`09b_dragones.js`): `ref: 'enlace'` (su pose de enlace ya es el planeo), `span: 34` (con eso el tronco mide como el del Tyrant, 3,3 m, y las alas ~42 m de punta a punta), dedos emparejados por su papel en el planeo del Tyrant (medido): f4, el largo, borde de ataque ← `wingIndex`; f3 ← `wingMiddle`; f2 ← `wingRing`; f1 ← `wingPinky`; pulgar ← `wingBigThumb` (`wingFirst` sin pareja); cuello de 6 + cabeza ← Neck1-4 + head; patas: pie (metatarso) ← `Knee1`, dedos ← `foot`; cola de 16 ← Tail0-9. 67 de 69 huesos emparejados.
- **1ª persona y jinete** (corregido tras jugarla Jorge: el caballero «medio flotando y muy atrás» y la 1ª persona «muy atrás y muy baja»): ajuste por dragón `fpAdj` [altura, retroceso, cabeceo, elevación solo de la cámara] y función `dragonSeat(D)` (09b). Con `fpAdj`, el lomo se mide **donde se sienta el jinete** (hueso del asiento + retroceso), no en el hueso: en la primera entrega (asiento en la pelvis y 2 m atrás) la grupa ya bajaba hacia la cola y el caballero flotaba. La elevación (4º valor de `D.fp`) sube solo la cámara (09_tyrant: `heroFP[3]`), no al caballero, que sigue sentado. Fulgor: asiento `spine1`, `fpAdj [0, 0.5, -0.08, 1.0]`: el jinete ~1,9 m tras los hombros, sentado justo detrás de la base del cuello; la cámara 1 m por encima de sus ojos y algo más inclinada (-0,20 rad), para ver el cuello entero y la cabeza por encima de las púas, con el lomo delante; las alas asoman a los lados según la fase del aleteo (para verlas batir enteras la cámara tendría que ir ~3,5 m tras los hombros, lo que Jorge vio demasiado atrás). Los otros tres dragones, sin cambios (sin `fpAdj`).
- **Plataforma**: su clip «hover» (rehecho: cuerpo a 24° y la cola curvada hacia atrás; con la cola colgando, el juego apoyaba la punta de la cola y el cuerpo quedaba fuera de cuadro), `showLift` 1,5 m por encima, etiqueta `showTag` «Vuelo estático». Cuatro botones en una fila (`.sel-top` más ancho, botones más compactos). Crédito en la nota del menú.
- Probado (navegador integrado, 1280×720): plataforma (encuadre, de cerca, «Probar llamarada» con la boca abierta y fuego por ella, tinte de piel en azul y rojo), vuelo en 3ª persona (planeo, aletazo, boost con las alas recogidas, hover), 1ª persona (recto, con la mira a los lados: la cabeza gira +30° y −38°; al disparar la mandíbula se abre 26°; riendas), primer plano del caballero sobre la grupa, comparación del hover en 1ª persona con Alientormenta y Ventoscuro (la cabeza de Fulgor queda algo más alta, por debajo de la mira), el dragón elegido se recuerda al recargar, y el HTML generado (31,6 MB) con los cuatro dragones jugando la misión de prueba sin errores. Sin comprobar: la sensación jugando y el rendimiento en la Vega 10. Copias en `versiones/sky_apex_v20.*` (la corregida; la primera entrega, en `sky_apex_v20a.*`) y `versiones/syrax_web_v20.glb`.

### v21 (27-oct): objetivos genéricos y dirigibles (Fase 0, última parte)
Petición de Jorge: lo planeado para la v21 (sección 7d) y, además, el primer tipo nuevo de enemigo: **dirigibles** con el modelo `barcos/airship.glb`, quietos y repartidos a 500-1000 m de altura; a menos de 1000 m disparan ráfagas continuas de proyectiles arcanos (como los de las torres, sin pausa, menos cadencia y poco daño) **solo por los costados** (mejor atacarlos de frente o por detrás); 50 de vida y, al llegar a 0, una explosión de energía violenta (VFX nuevo). Decisiones suyas: fijar con «TGT primero» y probarlo todo en una misión de prueba nueva.
- **Modelo**: `barcos/airship.glb` es «Airship» de Shinsin (Sketchfab, **CC-BY 4.0**; crédito en la nota del menú). 305 piezas, 96 materiales de un color, sin texturas, 130k triángulos. `herramientas/blender/dirigible/02_preparar.py` lo deja en `modelos/dirigible.glb` (3,1 MB, 56k triángulos): color de cada material → color por vértice, una sola malla y un material, proa a -Z, centrado. Se reducen solo las piezas con muchos triángulos para su tamaño (21 engranajes de menos de 1 m sumaban 34k); reducir con una proporción fija arrugaba las bolsas de gas. Incrustado como `dirigible-glb`. Ojo: Blender guarda el color por vértice en enteros de 16 bits normalizados; el juego lo pasa a sRGB en coma flotante al cargar (`loadAirships`).
- **Dirigibles** (módulo nuevo `14b_dirigibles.js`, sección 6c): `AIRSHIP_LEN` 95 m de eslora, `AIRSHIP_HP` 50, 200 puntos, vaivén leve. Cañones: `AIRSHIP_RANGE` 1000 m, un disparo cada `AIRSHIP_RATE` 0,3 s sin pausas, `AIRSHIP_DMG` 2, 800 m/s (proyectil `'arc'`, morado, `ARC_COLOR`), desde 5 troneras por costado; ángulos muertos: `AIRSHIP_ARC` 35° a proa y a popa y `AIRSHIP_ELEV` 70° en la vertical. Casco = cápsula (`AIRSHIP_HULL`) para proyectiles, llamarada, rayo, asistencia de puntería y choques («Te estrellaste contra un dirigible»). Muerte: 0,45 s de agonía (el casco se carga de energía morada) y `airshipBlast`: destello, núcleo, esfera de choque con borde brillante, onda plana, relámpagos durante 0,6 s, esquirlas, chispas, brasas, humo, luz (`fbLight`), temblor y sonido (`sfx.energyCharge`, `sfx.energyBlast`, `sfx.arcShot`). Se colocan en cada partida (`planAirships`, desde `resetRun`): fijos de la receta y el resto al azar en un anillo, dentro del área, separados 900 m y por encima de las islas.
- **Blancos** (módulo nuevo `14c_blancos.js`, sección 6d): torres (cada sitio de `TOWER_SITES`), dragones y dirigibles comparten `{ kind, pos, vel, dead, tags }` (`BLANCO`, `eachTarget`, `matchSel`). **TGT** (`isTgt`) = cuenta para un objetivo visible, sin cumplir y no opcional: «TGT» delante de la distancia en el HUD (torres TGT con una marca sobre el tejado, dirigibles con un rombo hueco) y rojo vivo en el radar (lo demás, apagado; los dirigibles son cápsulas huecas; debajo, «TGT más cercano»). **Fijar** (`cycleTarget`): cualquier blanco en pantalla (torres y dirigibles a menos de 6 km), primero los TGT y de más cerca a más lejos; `enemyLock.e` puede ser de cualquier tipo; el recuadro y el círculo de la bola guiada se ajustan a su tamaño (`targetHalf`); la bola guiada persigue a cualquiera.
- **Recetas** (`18_misiones_datos.js`, formato en su cabecera): `towers.sites` (torres fijas con `tag`) y `towers.tag`; `airships` (total, zone, alt, sites, tag, random); `dragons.tag`; `squads` (escuadrones: n, at o dist, attack, tag); objetivos con `target: 'airship'` y `tag`, y `count` opcional (sin él, todos los que cumplen la selección); eventos con `kills` por tipo o etiqueta, `cleared: [etiquetas]` y la acción `squad`. Motor (M2): `missionKill` cuenta cada destrucción por tipo, por etiqueta y por objetivo; `plannedCount`; `spawnSquad` (en `14_enemigos.js`: cuña de dragones que miran al jugador; no reaparecen). Resultados con «Dirigibles destruidos» y los dragones de los escuadrones en el total.
- **«Prueba de objetivos»** (botón nuevo del menú; semilla 777, la misma del valle): 6 dirigibles (uno fijo 2,6 km por delante del inicio, de costado), 12 torres de las que solo 3 son TGT (las baterías fijas, juntas por delante a la izquierda), escolta de 4 dragones sin TGT (objetivo opcional), y al caer el tercer dirigible sale el **escuadrón Alfa** (4 dragones, objetivo oculto que aparece entonces). No es una misión de la campaña.
- Textos: Controles, nota del menú (compactada para que quepa con siete botones a 720 px), tutorial (fijar, bola guiada, HUD, objetivo y una sección nueva «Dirigibles», sin vídeo de momento).
- Probado (navegador integrado, `sky-apex-2`): colocación (alturas 570-920 m sobre el suelo, sin islas), aspecto de cerca, ángulos de tiro (costado sí; proa, popa, vertical y más de 1 km no), fijado con TGT, derribo con bola guiada (2,1 s), agonía y explosión en capturas, la misión entera por eventos (escuadrón, baterías, Alfa, victoria con resultados), la misión de prueba y el combate libre igual que antes (30 torres TGT, sin dirigibles), vuelo real simulado sin errores y el HTML generado (35,9 MB) jugando 15 s. Sin comprobar: la sensación jugando, el sonido nuevo y el rendimiento en la Vega 10 con varios dirigibles a la vista (56k triángulos cada uno, una llamada de dibujo).
- Etiqueta `v21` en git (ya no se copia a `versiones/`).

### v22 (27-oct): menú «Jugar» y alcance de los dirigibles
Jorge jugó la v21: «Todo parece funcionar correctamente». Pidió dos mejoras:
- **Menú principal**: un solo botón **Jugar** (el grande, con la barra de carga) en lugar de los tres modos; al pulsarlo, en la misma pantalla (título, llamas y música) salen «Modo de juego»: Misión de prueba, Combate libre, Prueba de objetivos y «← Volver». Esc o «← Volver» regresan; volver desde «Elige tu dragón» deja abiertos los modos; terminar una partida vuelve al menú principal. Código: `#mMain` y `#mPlay` (`02_dom.html`), `showPlayMenu` y `playMenuOpen` (`17_intro_menu_tutorial.js`), Esc en `15_vuelo_estado.js`.
- **Dirigibles**: `AIRSHIP_RANGE` 2000 m (antes 1000) y `AIRSHIP_SHOT_LIFE` 2,8 s para que los proyectiles lleguen. Medido: disparan hasta 2000 m y no más allá; a 1,5-2 km casi no aciertan por la dispersión (`AIRSHIP_SPREAD` 0,03 rad), aunque pasan a unos 20 m.
- Probado en el navegador integrado: los botones y Esc, las tres misiones desde el submenú, capturas de los dos menús a 1280×720, el alcance a 800, 1500, 1950 y 2100 m y el HTML generado jugando 10 s sin errores. Etiqueta `v22`.

### v23 (27-oct): Misión 1, la flota, y el compañero Lance (Fase 1, primera parte)
Diseño de Jorge: destruir una flota de 10 dirigibles que vuela hacia el borde del mapa antes de que llegue (si sale uno, MISIÓN FALLIDA). Vuelan en formación con el mismo rumbo a 100 km/h, a 700-900 m de altitud y a 300-600 m entre uno y otro, con 15 dragones de escolta que no son TGT. El jugador («Percival») sale a 10 km de la flota, con un aliado con IA, «Lance» (Tyrant), a 200 m y algo por detrás: va en formación hasta 2 km de la escolta o de los dirigibles y entonces ataca al azar a dragones y dirigibles, sobre todo protegiendo al jugador; solo fuego rápido y llamarada, y no puede morir. Respuestas de Jorge a mis preguntas: la flota **se aleja** del jugador (persecución), tarda **unos 6 min** en llegar al borde, escolta **8 a la vez** (relevos hasta 15) y esta versión es **solo la misión y Lance** (mapa, briefing, hangar y resultados con rango, después).
- **Receta** `mision1` («Misión 1: la flota», primer botón de «Modo de juego»): semilla 777, área de 11 km de radio en 0, 0; rumbo de la flota 285° (sin islas en su camino a esa altitud); cabeza de la flota a 1 km del centro, borde a 10 km (360 s a 100 km/h); jugador 9,5 km detrás del centro, a 750 m. Radio de Mando (inicio, escolta, 1, 5 y 9 derribados, avisos a 3 km y 1 km del borde, final) y frases de Lance en `ally.lines` (start, engage, protect, kill, regroup). Nombres y textos provisionales: los cambia Jorge.
- **Flota** (`planFleet`, 6c): la cabeza en el punto de la receta y el resto detrás y a los lados (fondo 1,8 km, ancho ±0,9 km), cada uno a 300-600 m de otro. Cada uno a su **altitud** (sobre el agua, como la ALTITUD del HUD): solo sube si hay terreno a menos de 150 m o una isla delante (mira 1,2 km; al bajar comprueba todo el tramo vertical) y luego vuelve a bajar. Medido en 6 min: altitudes 702-1098 m (el 87 % del tiempo en la suya), ninguna isla rozada y escapa a los 360 s exactos. `escape: 'fail'` → MISIÓN FALLIDA «Un dirigible escapó de la zona»; el HUD muestra **BORDE** (lo que le falta al más adelantado; en rojo y parpadeando a menos de 2 km) y los eventos tienen `airshipEdge`. Los TGT se marcan en el HUD hasta 15 km y, de lejos, solo el más cercano lleva texto (si no, las etiquetas se amontonan).
- **Escolta** (`dragons.escort`, 6b): nacen y patrullan alrededor de los dirigibles (puntos de paso junto a uno al azar, algo por delante); los relevos **despegan de un dirigible**; atacan al jugador si se acerca a 2,5 km de la flota o a 2 km de ellos; si se alejan más de 5 km de la flota en patrulla, vuelven.
- **Lance** (módulo nuevo `14d_aliado.js`, sección 6e): una copia del Tyrant teñida de azul (`ALLY_TINT`) del tamaño del jugador, con el vuelo de los enemigos (`steerEnemy`, con tope `e.vmax` = VMAX para alcanzar al jugador) y la animación común (`animateEnemyModel`, sacada de `updateEnemies`). Formación: 200 m a la derecha y 70 m detrás (`ALLY_SLOT`); en hover le da vueltas. Combate a menos de 2 km (`ALLY_ENGAGE`) y vuelta a la formación tras 6 s sin enemigos. Elige blanco: un dragón en pasada de ataque a menos de 600 m del jugador, al momento; si no, sigue con el suyo 5-10 s y al cambiar elige con un 60 % de probabilidad al que ataca al jugador (a menos de 1 km) o, si no, un dragón o un dirigible al azar. Fuego rápido azul en un cono de ~10° hasta 1 km y llamarada de cerca; rompe la pasada para no chocar y no atraviesa los dirigibles. No recibe daño. Sus derribos cuentan para la misión pero no dan al jugador rayo, escudo ni bolas guiadas (`byAlly`), ni cuentan en sus estadísticas de precisión. HUD: chevrón azul «LANCE · distancia» y triángulo azul en el radar.
- Probado (navegador integrado, simulaciones del juego): colocación (10 dirigibles a 9,4-10,5 km, 705-878 m, separación 321-475 m, 100 km/h; 8 escoltas junto a la flota, sin TGT); la flota escapa a los 360 s con los avisos de radio; formación de Lance (200 m / 64-100 m detrás, a la misma velocidad; sube por encima de las islas y vuelve); entra en combate a 2 km y protege; en 40 s de combate, 29 disparos, ~200 de daño y un derribo; victoria con resultados; las otras misiones, sin Lance y sin errores; HTML generado (36 MB) sin errores. Captura de Lance (azul). Sin comprobar: la sensación jugando, el rendimiento con 10 dirigibles y 8 dragones a la vez en la Vega 10 y una captura del HUD de esta misión (el panel del navegador no dejaba capturar).
- Etiqueta `v23`.

### v24 (28-oct): stats de las unidades en un Excel
Jorge jugó la v23: «la misión funciona». Destruyó los 10 dirigibles en 3 min, pero metido en medio de todo te acribillan enseguida; el balance de las misiones irá más adelante: ahora quiere la estructura base. Petición: rediseñar las stats de los dragones del jugador (luego las de los enemigos) y llevarlas a un Excel en la carpeta del proyecto, con una pestaña por dragón jugable y luego los enemigos, que el juego lea siempre, para verlas de un vistazo y cambiarlas sin tocar código.
- **Stats base del jugador** (pestaña «Base»; los cuatro dragones empiezan iguales, decisión de Jorge: él pondrá las variaciones): vida 100, **sin regeneración**; **armadura** 50 (barra amarilla encima de la vida: el daño la gasta primero; tras 5 s sin daño se rellena a 5/s); 2 escudos (+1 por dragón derribado, como antes); disparo básico 5 de daño y 20 de munición; guiado 60 de daño y **20 por misión, sin recarga** (las torres ya no dan guiadas; en el HUD, «X/20»; lanzarlas sin munición a costa de 15 de vida máxima se quitó en la v25); lanzallamas 15/s, 300 m, 5 s de fuego hasta sobrecalentarse (bloqueo, 10 s como antes: respuesta de Jorge); rayo 50/s, 5 s, 8 km, recarga 0,5 %/s y +5 % por blanco destruido (dragón, torre o dirigible; ya no carga con el daño hecho); 600 km/h, boost a 1000 km/h que dura 10 s, tarda 3 s en llegar y se recarga al 2 %/s tras 2 s; radio de giro 110 m (el de antes, medido).
- **El Excel** (`datos/sky_apex_stats.xlsx`, 11 pestañas): Léeme, Comparativa (Base y los cuatro dragones lado a lado, solo fórmulas; en naranja lo que cambia), Base, Alientormenta, Abrasanubes, Ventoscuro, Fulgor (su «Valor» es la fórmula `=Base!B<fila>` hasta que Jorge escriba un número: esa es su variación, en naranja, con su «Diferencia» en %), Dragón enemigo, Torre, Dirigible y Lance (aliado) (valores de ahora, conectados ya: decisión de Jorge). Columnas: Stat, Valor (amarilla, lo único que se edita), Unidad, (Base, Diferencia), Descripción, Clave (gris: así reconoce el juego cada stat; no cambiarla ni renombrar pestañas). En gris cursiva, los ajustes «extra» que no estaban en la lista de Jorge (pausa entre disparos, recarga de munición, duración del escudo, alcance y tiempo de fijado…), con los valores de antes. 224 valores.
- **Código**: módulo nuevo `19c_stats.js` (sección 7c): `STATS_SCHEMA` (claves, nombres, unidades, valores por defecto, descripciones), `STATS_TABS` (pestaña → unidad), lector de .xlsx propio `xlsxSheets` (zip + XML; descomprime con `DecompressionStream` en el navegador y `zlib` en Node; lee los valores guardados de las fórmulas), `statsFromSheets` (busca la fila con «Valor» y «Clave»), `statsResolve` (falta una clave → la de la Base o la de por defecto, con aviso en la consola), `applyStats` (enemigos, torres, dirigibles, Lance) y `applyHeroStats` (las del dragón elegido; también en `setDragon`). Las constantes de balance pasaron de `const` a `let` en sus módulos y se asignan desde ahí; `heroStats()` = `STATS[alt.id]`. Se quitaron `DRAGONS[].stats`, el multiplicador `heroStats().dmg`, `ULT_PER_DMG`, `MSL_MAX`, `MSL_TOWER` y la regeneración de vida.
- **Cómo llega el Excel al juego**: `construir.mjs` mete una copia (`STATS_EMBED`) en el HTML. Al abrirse, el juego aplica la copia y enseguida pide el Excel (`statsFetch`, sin caché); en localhost lo vuelve a pedir cada 2 s y, si cambió, lo aplica en pleno vuelo con el aviso «Stats actualizadas desde el Excel» (si un máximo sube, lo actual sube lo mismo). Con doble clic en `sky_apex.html` (`file://`) el navegador no deja leerlo: usa la copia. Por eso **`Jugar.bat`** → `herramientas/servidor_juego.mjs` (puerto 8770, sin caché, con rangos para los vídeos, abre el navegador). En la web de GitHub, el Excel del último push. Opciones → «Stats de las unidades» dice de dónde salen.
- **Herramienta** `herramientas/stats_excel.mjs` (necesita `exceljs` 4.4.0, en `herramientas/package.json`): crea el Excel desde `STATS_SCHEMA` o, si existe, lo rehace conservando los valores de Jorge por pestaña y clave (copia del anterior en `herramientas/salida/`; el formato a mano se pierde). Para añadir stats: añadirlas a `STATS_SCHEMA`, usarlas en `applyStats`/`applyHeroStats` y lanzar la herramienta.
- **HUD y textos**: barra de armadura con su número sobre la de vida (late mientras se regenera), «BOLA GUIADA X/20» (en rojo a 0, con «−15 VIDA MÁX.»), escudos centrados sea cual sea su número; «Elige tu dragón» con Vida, Armadura, Velocidad, Boost y Daño (media de las cuatro armas respecto a la Base), en dorado lo que supera la Base; resultados con la vida máxima gastada en guiadas; los textos del tutorial llevan `{clave}` y `{unidad.clave}` que se rellenan con las stats al abrirlo (`statText`); la sección «recarga_guiadas» pasa a «Guiadas sin munición» y «vida» a «Vida, armadura y caídas».
- **Giro**: `TURN_RATE` sale del radio (`giro_radio`) con `TURN_K` = 1,45 (el alabeo y el cabeceo ayudan a girar: medido en un giro sostenido a todo gas, v23 109-114 m y v24 110-113 m).
- **Probado** (navegador integrado, `sky-apex-2`): el juego lee el Excel (224 valores, ninguno sin leer); crucero 600 km/h; boost 600 → 733 → 867 → 1000 km/h en 3 s, 10 s de barra, recarga 2 %/s a los 2 s; giro igual que antes; daño 30 → armadura 20 y vida 100, 35 más → armadura 0 y vida 85, regeneración de la armadura a los 5 s hasta 50 en 16 s y la vida sin moverse; guiada sin munición → vida máxima 85, bloqueada con 10 de vida máxima; rayo 5 % en 10 s y +5 % por derribo; escudo +1 por derribo; sobrecalentamiento a los 5,1 s; **Excel cambiado con el juego abierto** (Alientormenta 150 de vida y 700 km/h, Fulgor 130 de vida en pleno vuelo): aplicado a los 2 s con el aviso y la vida actual subió; «Elige tu dragón», Opciones y tutorial (sin `{…}` sin rellenar); Misión 1 con Lance y la flota sin errores; HTML generado (36 MB) con la copia y leyendo el Excel; servidor de `Jugar.bat` (Excel sin caché, rangos 206, nada fuera de la carpeta). Sin comprobar: la sensación jugando (sobre todo el boost nuevo y la llamarada a 15/s), abrir el Excel en Excel de verdad (formato, fórmulas, guardado) y `Jugar.bat` con doble clic. Los vídeos del tutorial (guiadas, vida, boost) siguen mostrando lo de antes.
- Etiqueta `v24`.

### v25 (28-oct): valores de Jorge en el Excel, guiadas simples y armadura como marco
Jorge editó el Excel a mano (solo valores de enemigos: dragón enemigo con vida 70, 500 km/h, te pierde a 3500 m, bola de 10, guiada de 30 con 2000 m de alcance máximo y 30°/s de giro; torre con 2° de dispersión; dirigible con 1 de daño y 50° de elevación máxima) y pidió:
- **Web con sus valores**: HTML reconstruido (la copia del Excel va dentro) y subido.
- **Sin guiadas a costa de vida** («vamos a mantenerlo simple»): a 0 no se pueden lanzar (panel «SIN MUNICIÓN» en rojo). Fuera `guiado_coste_vida` (también del Excel: rehecho con `stats_excel.mjs` conservando sus valores, con Excel cerrado), `MSL_HP_COST`, `F.hpLost`, `mslCanFire` y la vida rayada. La sección del tutorial pasa a «Munición guiada».
- **Armadura como marco** (boceto de Jorge: «100/100» amarillo encima y la barra de vida con «100/100» dentro, rodeada por un marco amarillo a trazos): `drawHealth` (16_hud_mundo.js). Barra de vida de 300 × 18 px con «vida/máxima» centrado (oscuro sobre lo lleno, claro sobre lo vacío; roja por debajo del 35 %); alrededor, el marco de la armadura (relleno amarillo claro y borde a trazos de 4 px) que se vacía de derecha a izquierda dejando un trazo tenue y late mientras se regenera; encima, «armadura/máxima» en amarillo.
- Probado (navegador integrado): los valores de Jorge aplicados (vida enemiga 70, etc.); la guiada no carga sin munición; capturas de la barra con 50/50 y 100/100, 21/50, 0/50 y 62/100, y 35/50 con 27/100 en rojo; HTML generado con la Misión 1 25 s sin errores y el tutorial sin huecos. Sin comprobar: la sensación jugando.
- Etiqueta `v25`.

### v26 (30-oct): logo nuevo, giro y huida de los enemigos, vuelo recto, cámara al objetivo y entrada de cine
Petición de Jorge (lista de cinco puntos). Respuestas suyas a mis preguntas: el escudo pasa de la F a la **R** y nivelar, de la R a la **X**.
- **Logo**: su imagen recortada, con transparencia de verdad (`imagenes/logo_v3.webp`, 2000×1116, WebP con canal alfa). Node no lee WebP: `herramientas/blender/imagen_a_png.py` lo pasa a PNG con Blender (píxeles en bruto; comparado con el navegador: diferencia máxima 2/255) y `herramientas/separar_logo_alfa.mjs` lo separa en SKY y APEX (manchas opacas a cada lado de la línea entre la Y y la A; la llama de la Y va con SKY) en dos PNG de 1737×611. Cambian `LOGO_W`, `LOGO_H`, `LOGO_BOX`, `LOGO_HIT` (17) y el `aspect-ratio` de `.logo-stage` (01). Las piezas de la v14 quedan como `logo_*_v2.png`. La intro del menú funciona igual (el choque sale entre la Y y la A).
- **Giro de los enemigos** (Jorge: más radio = giro más abierto → 130): stat nueva `giro_radio` en la pestaña «Dragón enemigo» (130 m). Medí lo que había: cada eje (guiñada y cabeceo) tenía su tope por separado (1,75 y 0,95 rad/s) y, sumados, giraban hasta 1,34 rad/s: unos 104 m a 500 km/h, y en giros extremos (blanco a 90° o más) hacían bucles cerrados. Es decir, **giraban más que el jugador** (110 m a 600 km/h ≈ 1,5 rad/s): por eso la espiral no acababa. Ahora el tope es del giro total (`steerEnemy`: si la suma pasa del tope, se escalan los dos) y sale del radio: `ENEMY_TURN[1] = ENEMY_VMAX / giro_radio` (`applyStats`). Medido en 3D a 500 km/h: 130-131 m (a 45° y a 90°). Lance conserva el giro de antes (`ALLY_TURN`).
- **Huida** (modo nuevo `evade`, 14_enemigos.js): si el jugador lo persigue (lo tiene detrás, a menos de `huida_distancia` m, 1800, y le apunta ±35°) durante 0,6 s, deja la pasada o la recolocación y huye hacia delante encadenando maniobras amplias (`evadePick`/`evadeWant`, rumbo y cabeceo por tiempo): recta con vaivén leve (3-5 s), eses (6-9 s, ±30-50°), curvas abiertas (0,25-0,45 rad/s, 4-7 s), tirabuzón (3,5-6 s), subida y picado (solo con altura); no repite la anterior y cerca del borde del área gira hacia dentro. Pasados `huida_min`-`huida_max` s (10-18) o sin perseguidor (`e.chase` baja a 0), da la vuelta con una curva abierta hacia el jugador (0,4 rad/s) y vuelve a la pasada. Las tres son stats nuevas del Excel (huida: ajustes «extra»). Simulado (40 s persiguiendo a uno a 600 km/h): 38 s huyendo (eses, rectas, tirabuzones, una vuelta), 18 s a menos de 8° del morro del jugador y ninguna espiral.
- **Espacio mantenido = vuelo recto**: el dragón deja de seguir a la mira y mantiene la dirección del morro (0,3 s para frenar el giro que traía, `STRAIGHT_SETTLE`; luego fija esa dirección y levanta el morro lo justo para compensar el hundimiento, así que nivelado no pierde altura). La mira sigue al ratón (en vuelo recto puede bajar hasta -0,95 rad) y el cuello y los ataques la siguen (lo que ya hacía `animateTyrant`). HUD: el marcador del morro dorado con «VUELO RECTO». En hover, Espacio impide que gire hacia la mira. Medido: 8 s con la mira 40° abajo y 29° a la derecha: rumbo y altitud sin cambios, cuello a -43°.
- **Ctrl izq. = hover** (antes Espacio). Riesgo: **Ctrl+W cierra la pestaña y el navegador no deja anularlo**; en partida (y pausa) la página pide confirmación antes de salir (`beforeunload`; Chrome solo la muestra si se ha hecho clic en la página, que en partida siempre). Los demás atajos con Ctrl (Ctrl+S, Ctrl+R…) y Ctrl + rueda se anulan en partida.
- **F mantenida = cámara al objetivo**: gira la vista (el mismo giro que la Z: cabeza del jinete en 1ª persona, órbita en 3ª) hacia el blanco fijado con un muelle amortiguado (`TARGET_CAM_W` 6: media vuelta en ~1 s, arranca y llega suave) y lo sigue; al soltar vuelve igual al frente. Sin blanco, al pulsar fija el mejor a la vista. El ratón sigue moviendo la mira. La Z manda sobre la F. Medido: blanco a 151° detrás → 4° (lo que cabecea la cámara) en ~1 s, en 1ª y 3ª persona.
- **R = escudo** (antes F) y **X = nivelar** (antes R).
- **Entrada de cine** (15_vuelo_estado.js, `cine`): al empezar o reintentar cualquier misión, el dragón vuela solo, recto y nivelado con el rumbo de salida (solo sube si hay terreno o una isla delante: mira hasta 2 km, máx. 17° medido en la misión de prueba, que sale hacia las montañas), con bandas negras arriba y abajo (12 % del alto), el nombre de la misión y su lugar (o el objetivo, en el combate libre) en la de arriba, sin HUD y sin armas, hover, escudo, vuelo recto, cámara al objetivo ni daño; la radio sigue (queda sobre la banda de abajo, como un subtítulo). Luego las bandas se retiran en 1,8 s, el HUD vuelve y el jugador toma el control con la mira delante del morro. Duración: campo nuevo `intro` de la receta (s; 0 = sin entrada; por defecto `CINE_T` 7): Misión 1, 9 s (Lance y el principio del Mando); misión de prueba y prueba de objetivos, 7; combate libre, 4. Esc pausa; C y M funcionan.
- **Textos**: Controles, tutorial (vuelo recto en «Dirección y puntería», F en «Cámara», hover con Ctrl, nivelar con X, escudo con R, la huida en «Dragones enemigos») y la descripción del escudo en el Excel. **Los vídeos del tutorial de hover, alabeo y escudo siguen mostrando las teclas de antes.**
- Probado (navegador integrado, `sky-apex-2`, simulando el bucle): logo (separación, intro con el choque en su sitio), giro medido, huida, vuelo recto (también en hover), controles con eventos de teclado (Ctrl, R, X, F y Ctrl+S; bloqueados en la entrada de cine), cámara al objetivo en 1ª y 3ª persona, la entrada de cine en las cuatro misiones (duración, títulos, radio, HUD), sin errores. Sin comprobar: la sensación jugando (la huida, el vuelo recto, la cámara al objetivo y la entrada), Ctrl+W de verdad y el aviso de salir.
- Etiqueta `v26`.

### v27 (30-oct): llamarada para pasadas rasantes y modo Dev Test
Jorge jugó la v26: «funciona todo bastante bien». Pidió pulir el vuelo recto y la llamarada, con un vídeo de referencia (`D:\Descargas\demo lanzallamas.mp4`, de otro juego: cámara en 3ª persona detrás y algo por encima que, al apuntar el lanzallamas hacia abajo, mira al suelo con el dragón arriba de la pantalla, y un círculo blanco en el terreno donde caerá el chorro), y un modo de pruebas. Respuestas suyas: el autonivelado nivela **alas y morro**; la cámara de apuntado entra **al mantener Espacio** (dispare o no) y **también sale de la 1ª persona**; el panel lleva **trucos, stats en vivo y vuelo/cámara/depuración** (no «mundo y enemigos»).
- **Autonivelado** (`updateFlight`): con Espacio, el morro va al horizonte con el rumbo que llevaba (0,3 s para frenar el giro; luego fijo) y las alas a 0° (el término de nivelar de la X; Q/E no cuentan). Medido: de 29° de alabeo y -20° de cabeceo a 0° y 0° en 1 s; luego altitud constante.
- **Cámara de apuntado** (`AIM_CAM`, 09_tyrant.js, en `animateHero` encima de la normal): con Espacio (y el puntero bloqueado, sin Z ni F) la cámara pasa a 3ª persona (`third` forzado: el caballero aparece y los brazos se van) y se pone detrás del dragón, a `d` 24 m y `elev` 0,26 rad por encima, girada hacia el lado de la mira (`yawK` 0,8 de su guiñada); mira a un punto entre el dragón y el punto de la mira (`mix` 0,62). La clave del vídeo: la cámara queda por debajo de la línea mira-dragón, así que al apuntar abajo el dragón sale arriba de la pantalla y el suelo al que apuntas, debajo, sin taparlo. Entrada y salida suaves (`blend`, 1/s) y el punto de la mira suavizado (`follow`). La escalera de cabeceo solo se dibuja en 1ª persona de verdad (`dragonAnim.cam < 0.5`).
- **Por qué la llamarada parecía paralela al suelo**: iba hacia un punto a 300 m en la línea de la mira desde la cámara, no hacia lo que toca la mira, y atravesaba el terreno. Ahora `F.aimPt` (cada fotograma en `updateAttacks`) = lo que toca el rayo de la mira desde la cámara (`aimPointFrom`), y la llamarada va de la boca a ese punto (`flameAim`); se busca lo primero que toca de terreno, agua o isla (`FL.kind`) y las llamas viven justo hasta ahí (vistas desde el dragón, línea recta de la boca a la mira). El daño ya no atraviesa el terreno. Medido en 1ª persona a 40 m del suelo: desvío del chorro respecto al punto de la mira, 0 m.
- **Cabeza**: mira a `F.aimPt` desde la base del cuello (`HEAD_BASE`, 16), no en la dirección de la mira desde la cámara, y baja hasta `HERO_LOOK_DOWN` 1,25 rad (antes 0,8). En vuelo recto con la mira 40° abajo: cabeza a -72°.
- **Módulo nuevo `13b_impactos.js`**: círculo de impacto (`impactMark`: disco blanco cálido aditivo, tumbado según la normal del terreno, radio 5 m + 7 % de la distancia, más brillante y latiendo con la llamarada; solo si llega, `reach ≤ FLAME_RANGE`); impactos (`flameImpact`, 30 ráfagas/s: en tierra, polvo marrón, terrones con gravedad, fuego que se abre a ras de suelo y destellos; en islas, lo mismo gris; en el agua, vapor y gotas); al dar a dragones, torres o dirigibles, salpicadura de fuego y chispas (`flameHit`); **quemaduras** (`scorchAt`): una sola malla con hasta 2400 manchas de 3×3 puntos pegadas al terreno (`heightAt` + 0,55 m, desfase de profundidad), textura de carbón hecha con canvas (borde irregular, centro negro, brasas), brasas naranjas los primeros `SCORCH.glow` 5 s y desvanecido en los últimos `SCORCH.fade` 20 s de `SCORCH.life` 60 s (todo en el shader con el tiempo de nacimiento; solo se suben a la gráfica las nuevas). Se borran al empezar partida.
- **Modo Dev Test** (receta `devtest`, botón nuevo en «Modo de juego»; `dev: true`, sin entrada de cine ni final, 200 dragones): módulo nuevo `19d_dev.js`. Trucos (`DEV`, por defecto todos activos): invulnerable, sin choques (`crash` solo te deja encima del terreno), munición, guiadas, boost y escudos infinitos, sin sobrecalentamiento y rayo siempre listo. **Tab** abre el panel (`#dev`, a la derecha) sin parar la partida: suelta el ratón, la mira se queda quieta y el dragón sigue recto; Tab o un clic en el juego lo cierran. Secciones: Trucos; Stats en vivo (todas las de la unidad elegida —tu dragón, dragón enemigo, torre, dirigible, Lance— con sus nombres y secciones del esquema; se aplican al momento con `applyStats(STATS, 'panel de pruebas')`; en dorado las que ya no son las del Excel; «Copiar cambios» y «Volver al Excel»; si el Excel cambia, manda el Excel); Vuelo y cámara (`STEER_LAG`, `STEER_GAIN`, `RATE_RESP`, `BANK_*`, `BODY_SPRING`, `CAM_LAG`, `HERO_CAM`, `FOV_BASE` —nuevo—, `TARGET_CAM_W`, `AIM_CAM`, `HERO_LOOK_DOWN`; pasaron de `const` a `let`; «Copiar ajustes» con el nombre de cada constante y «Restablecer»); Depuración (FPS en el HUD, hitboxes de dragones, Lance, jugador y torres, duración de las quemaduras, borrarlas, probar la entrada de cine, reaparecer). En el HUD, «DEV TEST · Tab: panel de pruebas».
- Textos: Controles (Espacio, Dev Test) y tutorial (vuelo recto con autonivelado y cámara de apuntado; círculo, impactos y quemaduras en «Llamarada»).
- Probado (navegador integrado, simulando el bucle): autonivelado, cámara de apuntado (capturas: dragón arriba, mira y círculo en el suelo), chorro hasta la mira en 1ª persona y en vuelo recto, partículas que acaban en el suelo, círculo, 23 quemaduras en 1,5 s, el panel entero (4 secciones, 57 controles; stats aplicadas al momento y vuelta al Excel; ajustes y restablecer; trucos; sin choques; hitboxes; Tab y cierre), las demás misiones sin cambios y el HTML generado. Sin comprobar: la sensación jugando (sobre todo la cámara de apuntado y el autonivelado), el aspecto de las quemaduras de cerca en movimiento y el rendimiento con muchas quemaduras en la Vega 10.
- Etiqueta `v27`.

### v28 (30-oct): vuelo hacia la mira e impacto de la llamarada
Jorge jugó la v27: «mucho mejor» (la cámara de apuntado «funciona perfectamente»). Pidió dos cosas, con una captura de la 1ª persona:
- **HUD desajustado con el horizonte**: en vuelo recto, la mira quedaba ~3,5° por encima del 0° de la escalera. Causa: el modelo de vuelo tiene un hundimiento fijo (`F.sink`, 2,5 m/s más lo que añade la pérdida de sustentación) que deja la trayectoria por debajo del morro, así que para no perder altura había que llevar la mira algo por encima del horizonte (más cuanto más despacio), y el marcador pequeño del HUD era el morro. Ahora (`updateFlight`) el dragón levanta el morro lo justo para compensar el hundimiento en la vertical del mundo (hasta 0,06 rad; por debajo de la velocidad mínima ya no llega: sigue perdiendo sustentación), y la trayectoria va justo a la mira; el marcador pequeño (`drawMarkers`) es la **trayectoria** (la velocidad; en hover o muy despacio, el morro). Medido con la mira en el horizonte a 325, 471 y 595 km/h: 0 m perdidos en 4 s, trayectoria 0,00° (el morro, 1,6-0,9° por encima) y el marcador sobre la línea del 0° (0 px). Tutorial («Dirección y puntería») actualizado.
- **Impacto de la llamarada**: la llama tiene que cortarse en el punto de contacto y saltar chispas y fragmentos. Partículas: opción nueva `hold` en `emit` (mantiene el brillo hasta el final y se apaga de golpe). La llamarada que choca vive justo hasta el contacto (descontado el adelanto con el que sale), con `hold` y sin hincharse tanto (8-13 m al final, antes 15-24): el chorro llega entero y se corta en el círculo. `flameImpact` (13b), por ráfaga (30/s): destello en el contacto; fuego que se aplasta y se abre en el plano del terreno, sobre todo hacia donde iba el chorro; 8 chispas grandes que saltan y caen; 6 fragmentos de tierra (o de roca gris, en islas) de 2-3,4 m de tonos variados; polvo claro. En el agua: destello, vapor y gotas.
- **Cámara de apuntado más baja**: `AIM_CAM.elev` 0,26 → 0,08 rad. Con la cámara más alta, la cola del dragón (que apunta hacia la cámara) tapaba el punto de impacto; casi a la altura del dragón queda como el vídeo de referencia (alas arriba, el círculo debajo).
- Probado (navegador integrado, simulando): vuelo horizontal con la mira en el horizonte (y en el HTML generado: 0,02 m en 4 s), marcador en el 0°, capturas del impacto en tierra (chorro cortado en el círculo, chispas, suelo ardiendo) y en el agua (vapor), y las variantes de elevación de la cámara.
- Jorge la jugó: «Bien, está mucho mejor así». Aprobada.
- Etiqueta `v28`.
- Truco de prueba aprendido: para capturar algo pequeño del juego (un impacto), simular, renderizar y recortar el lienzo a resolución completa alrededor de su proyección, todo en una sola llamada (entre llamadas, el bucle del juego mueve la cámara y, sin puntero bloqueado de verdad, `F.locked` vuelve a false).

### v29 (30-oct): lista de enemigos y galería de enemigos
Petición de Jorge: definir la lista provisional de todos los tipos de enemigos (rol y modelo de cada uno), implementarlos en el juego y en el Excel para ajustarlos fácilmente, y un campo de pruebas llano (suelo infinito de blockout) con todos en formaciones, quietos (solo animaciones de reposo), para ver cómo se ven y probar a dispararles. Lista de Jorge:
- **Dragones enemigos**, **torres** y **dirigibles** («barcos aéreos»): como hasta ahora (los dirigibles serán bombarderos más adelante).
- **Artillería** (balistas, catapultas y cañones; modelos «balista guay», «catapulta guay», «canon guay»): defensa terrestre móvil, los «tanques» de Ace Combat; lentas, disparan al jugador muy de vez en cuando con daño anecdótico (en misiones atacarán a las unidades de tierra aliadas). Iguales salvo el aspecto.
- **Batallones de soldados**: formaciones rectangulares de 80 a 300 soldados (al azar), objetivo principal de la llamarada a ras de tierra; el modelo lo hace Claude en Blender (caballero muy simplificado); flechas al pasar cerca, daño despreciable (efecto visual).
- **Barcos navales** («barco guay»): como los dirigibles pero en el mar, misma vida (mueren de un guiado).
- **Superdirigible** («barco guay 02»): megaestructura de 500 m como mínimo, a 1500 m de altura como mínimo, con 6 cañones/balistas por costado que se destruyen y se fijan por separado (y el núcleo); mismo daño y ángulos que los dirigibles.
- **Sierpe** («black_myth_wukong_-_kang_jin_long_static» de `dragones raw/`): minijefe de 500 m que vuela en círculo a gran altura, con la llamarada sostenida del jugador (mucho mayor) si te pones delante y las bolas de los dragones enemigos; sin guiadas ni rayo; 3 hechiceros en el lomo la escudan de todo daño hasta que caen.
Hecho:
- **Modelos** (`herramientas/blender/enemigos/`): `01_analizar.py` (triángulos, texturas, esqueletos y vistas de los originales), `02_preparar.py` (aplica transformaciones y el esqueleto, quita piezas invisibles —planos de rayos del cañón, mallas invisibles de la sierpe—, junta, reduce, orienta con el frente a +Y de Blender, escala a 1 m de largo, apoya en el suelo o centra, deja solo la textura de color en JPEG de 1024 px; el superdirigible sin texturas pasa a color por vértice), `03_soldado.py` (soldado: grebas, cota, sobreveste roja, yelmo, escudo y lanza; hechicero: túnica morada, capucha, báculo con orbe; color por vértice y la pieza en la UV para animarla), `04_sondear.py` (rayos contra las mallas: altura y borde de la cubierta del superdirigible para las torretas, perfil del cuerpo de la sierpe). La sierpe del archivo «static» resultó tener esqueleto (738 huesos) y estar recta: no hizo falta riggearla (ver «Sierpe»).
- **Sistema común** (módulo nuevo `14e_unidades.js`, sección 6f): `UNITS` (todas, también las montadas: torretas y hechiceros con `parent`), cápsulas de impacto en el mundo (`unitSegHit`, `unitRayHit`, `unitPointHit`, `unitsFlame`, `unitsLaser`) enganchadas a los proyectiles (13), la llamarada, el rayo, la asistencia de puntería y los choques (15); `damageUnit`/`killUnit` (puntos, rayo, misión, aviso); proyectiles propios `ushot` en `fireballs` (`spawnUnitShot`, con gravedad y aspecto: piedra ardiendo, bola verde, virote dorado o arcano) y tiro parabólico con adelanto (`ballisticAim`); restos quemados que humean (`wreckUnit`); blancos fijables uno a uno (14c: `eachTarget`, `t.half`, `t.lockRange`, `t.label`); HUD (16: cuadrado para la artillería y las torretas, rectángulo con los soldados que quedan, rombo para barcos, rombo doble con nombre para superdirigible y sierpe —«ESCUDO» mientras lo tiene—, círculo para los hechiceros; radar); misiones (19: `plannedCount`, `missionKill` por tipo `artilleria`, `batallon`, `barco`, `superdirigible`, `torreta`, `sierpe`, `hechicero`). Receta nueva **`units`** (formato en la cabecera de 18): grupos con tipo, posición, rumbo, número y formación (línea, columna, cuña, rejilla); `planUnits` desde `resetRun`.
- **Artillería**: 11 m de largo (stat), dispara cada 6-10 s con parábola hasta 1500 m, 3 de daño; al caer, restos oscuros e inclinados que humean 45 s.
- **Batallones** (módulo `14g_batallones.js`, 6g): una `InstancedMesh` por bloque (una llamada de dibujo), rejilla con algo de desorden; balanceo leve en el shader (cuerpo y lanza). Cada soldado con 2 de vida: la llamarada los quema dentro de su cono (+3 m), el básico mata en 2,5 m, el guiado en 12 y el rayo en 5; al morir arden 1,3 s (naranja que parpadea, llamitas), caen de espaldas y quedan carbonizados. El blanco es el batallón (vida = soldados en pie; impacto contra una caja baja, `battBox`). Flechas: andanadas de 40 cada 2,5 s a menos de 400 m, líneas finas con parábola (un solo `LineSegments`), 0,1 de daño.
- **Barco naval**: 110 m, en el agua (calado `BARCO_DRAFT`), se mece; andanadas por el costado como los dirigibles (`broadside`); al morir escora, arde y se hunde en 9 s.
- **Superdirigible**: 500 m a 1500 m (o más), 1500 de vida en el núcleo; 12 torretas de 24 m en el borde de la cubierta (cañón y balista alternos) con su vida (50), su disparo cada 1,5 s solo hacia su costado y fuera de los ángulos muertos de los dirigibles, y que giran hacia el jugador (±75°). Al caer el núcleo: explosiones por todo el casco 3,5 s, tres explosiones de energía y caen todas las torretas.
- **Sierpe** (módulo `14f_sierpe.js`, 6h): sin esqueleto: el shader coloca cada vértice en su punto de una **columna de 40 puntos** (posición y orientación, uniformes `uSpP`/`uSpQ`) que se calcula cada fotograma: modo `idle` (quieta, una onda le recorre el cuerpo de la cabeza a la cola) o `circle` (vuela en círculo de 2500 m a 150 km/h, con el cuerpo detrás por el mismo círculo y algo inclinada hacia dentro). Cápsulas de impacto a lo largo de la columna. Escudo: la misma malla hinchada, aditiva, con brillo en los bordes y un dibujo que se mueve; los proyectiles lo hacen destellar sin daño (la primera vez, un aviso). Tres hechiceros (60 de vida, 13 m) sobre el lomo, con chispas arcanas en el orbe; al caer el último, el escudo se rompe con un destello. Ataques: llamarada sostenida de 900 m (40/s, 4 s, pausa 6 s) si te tiene a menos de 25° delante de la cabeza, y bolas de fuego (15) cada 1,2-2,4 s. Al morir cae envuelta en explosiones 4,5 s.
- **Dragones quietos** (galería): `spawnStatue` (14): flotan en hover sin IA ni disparos ni reaparecer.
- **Stats** (19c): pestañas nuevas **Artillería**, **Batallón**, **Barco naval**, **Superdirigible** y **Sierpe** (valores provisionales, con su nota en la fila 2 del Excel, campo `note` de `STATS_TABS`); las unidades leen `STATS.x.y` al usarlas (un cambio se nota al momento) y `applyUnitStats` aplica tamaños y vidas máximas. Excel rehecho con `stats_excel.mjs`: 14 pestañas, 295 valores, los de Jorge intactos (comprobado: 0 diferencias). Las velocidades de las unidades están en el Excel pero aún no se usan (en la galería no se mueven).
- **Mundo llano** (bioma `pruebas`, M3): `FLAT` en `terrain` (03): suelo a 1,5 m y lagos rectangulares (`world.lakes`) de 12 m de hondo; sin islas (`islandsInRange`) ni árboles; suelo de blockout en el shader del terreno (`uGrid`: cuadros grises de 10 m con borde blanco y líneas gruesas cada 100 m). Cambiar de bioma regenera el mundo (`shapeKey`, `setBiome`).
- **Galería de enemigos** (receta `galeria`, botón nuevo en «Modo de juego»; trucos y panel del Dev Test): delante del inicio, artillería (5 balistas en línea, 5 catapultas en columna, 5 cañones en cuña y 9 mezcladas en rejilla), 4 batallones (80, 150, 220 y 300 soldados), 3 torres y 8 dragones quietos (cuña de 5 y línea de 3); detrás, 3 dirigibles, el superdirigible y la sierpe; a la derecha, un lago con 5 barcos. Panel (Tab), sección nueva **Enemigos**: «Los enemigos disparan» (también en Dev Test), «Sierpe: vuelo circular», «Restaurar galería» e «Ir a…» cada grupo; las hitboxes incluyen las cápsulas nuevas.
- Probado (navegador integrado, simulando el bucle): carga de los 8 modelos (fuente y HTML generado, incrustados), colocación de las 50 unidades y los 8 dragones, capturas de cada tipo de cerca (orientación, texturas, soldados con sus colores, sierpe ondulando y en círculo, torretas en la cubierta), fijar (ciclo por distancia), básico y guiado contra artillería, llamarada contra un batallón (92 de 150 en 2 s), guiado y básico contra soldados, escudo (sin daño), hechiceros → escudo roto → daño, superdirigible y torretas, hundimiento, muerte de la sierpe, restaurar, fuego enemigo (flechas, artillería, torretas, llamarada y bolas de la sierpe), el panel, ida y vuelta galería ↔ Misión 1 ↔ combate libre sin errores. Medido con toda la galería a la vista: ~2 ms de lógica y ~13,5 ms de render (1,5 M de triángulos, 201 llamadas; los 8 dragones quietos son la mayor parte). Sin comprobar: la sensación jugando, el rendimiento en la Vega 10 y el sonido nuevo.
- Etiqueta `v29`.

### Medidas (Radeon Vega 10 integrada)
- v6: 35–43 fps a 800×600.
- El Tyrant del jugador cuesta unos 2 ms de render y 0,3–0,6 ms de CPU de animación.
- Cada enemigo visible cuesta unos 0,4 ms de CPU: 0,16 de mixer, 0,07 de capa por código, 0,13 de matrices y 0,03 de esqueleto.
- Crear los 6 enemigos al empezar la partida tarda unos 70 ms.
- Partidas simuladas de 30 s: sin errores.

### Pendiente
- **v29 entregada** (30-oct, sin jugar aún): lista de enemigos (artillería, batallones, barcos navales, superdirigible, sierpe) en el juego y en el Excel, y la Galería de enemigos. Para ajustar al jugarla: todo el Excel nuevo (valores provisionales), tamaños (`largo`), dónde está cada grupo en la galería (receta `galeria`). Siguiente natural: que se muevan (velocidades del Excel) y usarlos en misiones (preguntar a Jorge cada una).
- **v28 aprobada** (30-oct, «Bien, está mucho mejor así»): vuelo hacia la mira (marcador de trayectoria en el 0°) e impacto de la llamarada (corte en el suelo, chispas y fragmentos), cámara de apuntado más baja. Con ella acaba el chat; lo siguiente lo decide Jorge (ver «Para el chat nuevo», arriba).
- **v27 jugada** (30-oct): «mucho mejor»; correcciones en la v28.
- **v27 entregada** (30-oct, sin jugar aún): vuelo recto con autonivelado y cámara de apuntado, llamarada hasta la mira con círculo, impactos y quemaduras, y el modo Dev Test con su panel. Para ajustar al jugarla: `AIM_CAM` (desde el panel, con «Copiar ajustes») y la duración de las quemaduras.
- **v26 jugada** (30-oct): «funciona todo bastante bien»; correcciones en la v27.
- **v26 entregada** (30-oct, sin jugar aún): logo nuevo, enemigos con 130 m de radio que huyen en patrones amplios, vuelo recto (Espacio), cámara al objetivo (F, para probar: Jorge la quitará si no convence), hover en Ctrl, escudo en R, nivelar en X y entrada de cine en cada misión. Para ajustar al jugarla: radio de giro y huida (Excel), `TARGET_CAM_W`, `intro` de cada receta. Regrabar los vídeos del tutorial de hover, alabeo y escudo (teclas nuevas).
- **v25 entregada** (28-oct, sin jugar aún): valores de enemigos de Jorge, guiadas sin el coste de vida, armadura como marco de la vida.
- **v24 entregada** (28-oct): stats en `datos/sky_apex_stats.xlsx` y `Jugar.bat`; Jorge ya editó el Excel a mano (valores de enemigos). Siguiente: que Jorge pase las stats de cada enemigo y la lista completa de enemigos (otra fase); luego, lo que queda de la Fase 1 (briefing, hangar con loadout, mapa del mundo, resultados con rango y guardado). Regrabar los vídeos del tutorial de boost, guiadas y vida.
- **v23 jugada** (28-oct): «la misión funciona»; balance pendiente (flota en 3 min; en medio de todo te acribillan).
- **v23 entregada** (27-oct): Misión 1 (la flota) con el compañero Lance. Etiqueta `v23`. Para ajustar al jugarla: la dificultad (10 dirigibles disparando a 2 km y 8 escoltas), cuánto ayuda Lance (`ALLY_PROTECT_P`, `ALLY_AIM`, `ALLY_GUN_CD`) y el tiempo hasta el borde. Siguiente de la Fase 1: briefing, hangar con loadout, mapa del mundo y resultados con rango y guardado (preguntar a Jorge cada cosa).
- **v22 aprobada** («Está todo perfecto, la misión tiene éxito», 27-oct): menú con «Jugar» y los modos de juego detrás; dirigibles con 2 km de alcance (la dispersión se queda como está). Etiqueta `v22`.
- **v21 jugada** («Todo parece funcionar correctamente», 27-oct): objetivos genéricos (TGT, etiquetas, sitios fijos, escuadrones por eventos, fijar cualquier blanco) y dirigibles, con la «Prueba de objetivos». Etiqueta `v21` en git. Para ajustar al jugarla: tamaño (`AIRSHIP_LEN`), cadencia, daño y ángulos muertos de los dirigibles. Con ella acaba la Fase 0 de la campaña (sección 7d); lo siguiente lo decide Jorge.
- **v20**: Fulgor, cuarto dragón. Jorge dio por cerrados los dragones de momento (27-oct). Pendiente para más adelante: la descripción definitiva y las stats propias de Fulgor (ahora las de Ventoscuro).
- **v19 entregada** (26-oct, sin jugar aún), copiada en `versiones/sky_apex_v19.*`.
- **v18 aceptada** («funciona lo suficientemente bien», 26-oct), copiada en `versiones/sky_apex_v18.*`.
- **Pendiente de los dragones (para más adelante, no ahora)**: la posición de la cámara de 1ª persona en los tres (Jorge: «hay cosas que solucionar todavía»; se calcula en `setupDragon` con la altura del lomo, `D.fp` / `heroFP`, sobre `seatBone`). También sin tocar: usar los clips propios de Ventoscuro en más sitios y el rendimiento en la Vega 10 con 25 MB de HTML.
- **v17** (nombres, stats, Ventoscuro arreglado) jugada: Abrasanubes se desmadejaba en la plataforma (arreglado en la v18), copiada en `versiones/sky_apex_v17.*`.
- **v16** (tres dragones) jugada: Drogon roto y el rojo mal en la plataforma (arreglado en la v17), copiada en `versiones/sky_apex_v16.*`.
- **v15 aprobada** («todo parece funcionar correctamente»), copiada en `versiones/sky_apex_v15.*`.
- **v14 aprobada** («Vale todo perfecto», 26-oct) y copiada en `versiones/sky_apex_v14.*`.
- Candidatos: retoques de la sensación de vuelo (todas las constantes con nombre: `STEER_LAG`, `RATE_RESP`, `STEER_GAIN`, `BANK_*`, `BODY_*`, `CAM_LAG`, `CAM_ROLL`, `CAM_PUSH`, `SPEED_SHAKE`); **regrabar los vídeos del tutorial** con el vuelo de la v13-v14 (`REC.recordAll()`; puede que haya que retocar escenas por el retraso, p. ej. el momento del giro para esquivar la bola enemiga, `breakAt`); el «campo de pruebas» guiado (guía al principio del documento); el modo carreras.
- Estado de las versiones: v5 a v14 aprobadas (la v8 resultó demasiado difícil y se corrigió en la v9). Copias en `versiones/sky_apex_v5` a `sky_apex_v14`.
- Desde el 27-oct la carpeta es un repositorio git (`JorgePove/Sky_Apex`): las versiones nuevas son etiquetas (`v21`…); `versiones/` guarda las anteriores y no va al repo.
- Ideas que salieron por el camino, sin pedir: silla de montar; que el puño suelte una rienda al disparar; disparar a las bolas guiadas enemigas para derribarlas; que los enemigos esquiven las torres; LOD de malla para enemigos lejanos; radial blur real en el boost; menú de pausa con «Volver al menú».
- Sin comprobar por Claude: el sonido (rayo de energía, escudo, avisos de misil, viento y aleteo de la v13) y el rendimiento en la Vega 10 con la llamarada de 200 m y el rayo (muchas partículas). El modo carreras sigue aparcado.

## 7d. Campaña «Ace Combat con dragones» (desde el 26-oct)

Pitch de Jorge para el juego final: **«Ace Combat pero con dragones»**, dentro de lo que puede llevar él solo. Lo que pidió:
- 10 misiones con encuentros, objetivos y entornos distintos (cuevas, volcanes, tundra helada, ciudades flotantes, bosques, desiertos…).
- 3 dragones con stats distintos (vida, velocidad, potencia de fuego…) y un **loadout** por slots en cada misión: más cargas de escudo, más munición, más bolas guiadas, más llamarada, más vida, armadura (una segunda barra que se vacía antes que la vida).
- Enemigos nuevos: **batallones de soldados** en tierra (cientos; el caballero en low-poly) que se queman con la llamarada en pasadas rasantes o desde el hover; y **jefes** tipo aeronave de Ace Combat, empezando por una **sierpe alada** gigante (tipo dragón chino) con hechiceros-torreta en el lomo, que la escudan y la curan, y un aliento frontal muy peligroso.
- Narrativa con un reparto de aliados y villanos, **compañeros de escuadrón** con IA y un **mapa del mundo** para elegir la misión.

Decisiones de Jorge:
- Solo local, como portfolio. Si algún día quiere publicarlo, lo migrará a Unity o Unreal con assets con licencia: conviene que las recetas de misión y el diseño no dependan del motor web.
- Cada misión tiene un **área delimitada**: barreras invisibles, aviso y 15 s para volver o la misión falla.
- Sin arte 2D: iconos provisionales.
- **Caer en una misión = MISIÓN FALLIDA** («Reintentar»; más adelante, puntos de control en las largas).
- La partida de la v14 queda como «Misión de prueba» y, además, como «Combate libre».
- **Misiones**: Claude puede proponer ideas, pero antes de crear cada una tiene que preguntar a Jorge la base, la premisa y el escenario.

Fases propuestas (análisis de viabilidad del 26-oct):
0. Cimientos: módulos, motor de misiones por datos (v15) y mundo configurable por misión (v19) y objetivos genéricos (v20). (De la v16 a la v18 se adelantaron los tres dragones.)
1. Una misión completa de principio a fin: mapa del mundo sencillo, briefing, hangar (dragón y loadout), misión 1 con un compañero y radio, resultados con rango y guardado del progreso.
2. Enemigos nuevos: batallones (InstancedMesh y marcha animada en el shader) y luego la sierpe (cuerpo por segmentos que siguen a la cabeza).
3. Biomas (paleta, relieve, niebla y cielo; volcán, ciudad flotante…). Las cuevas, como «misión del túnel» lineal con los túneles del prototipo de carreras, no como combate libre.
4. Campaña: historia, reparto y las 10 misiones (diseño de Jorge).
5. Pulido.
Riesgos señalados: tres dragones de aspecto realmente distinto (solo hay un modelo con vuelo: variantes del Tyrant), arte 2D y voces (fuera de alcance), rendimiento en la Vega 10 con todo a la vez (presupuesto por misión) y la licencia del Tyrant y de Knighty si algún día se publica. (Los tres dragones se resolvieron después, en las v16-v18.)

### v19, mundo configurable por misión (acordado con Jorge el 26-oct; hecho, ver 7c «v19»)
Lo que se le explicó y aprobó («me parecen bien estas dos fases»):
- **Semilla fija por misión** en su receta (`18_misiones_datos.js`): el mapa de cada misión será siempre el mismo, que es lo que hace falta para diseñarla. El combate libre sigue como ahora (mundo al azar cada vez que se abre el juego).
- **Cambiar de mundo sin recargar la página**: al empezar una misión con otra semilla se borra y se regenera el terreno, las islas, los árboles y las torres, con una carga de unos segundos (como al abrir el juego).
- **Punto de partida en la receta**: dónde empiezas, hacia dónde miras y a qué altura (hoy siempre en 0, 0, con `bestHeading`).
- **Hueco para el bioma** en la receta: de momento solo el valle actual; los biomas son la Fase 3.
- **Tecla de diseño** que muestra en el HUD las coordenadas (X, Z, altura) y la semilla, para que Jorge vuele a un sitio y apunte dónde quiere cada cosa.
- Lo que notará al jugar: la misión de prueba será siempre el mismo valle y tendrá una pequeña carga al empezar.
Notas técnicas para empezar: la semilla es una constante (`SEED`, en `03_utilidades_terreno.js`, también por `?semilla=`) y los ruidos `N1`-`N3` y `hash2` se construyen con ella al cargar; dependen de ella los trozos de terreno (`05_terreno_chunks.js`), las islas (`07_islas.js`), los árboles y las torres (`06_vegetacion_torres.js`, con la caché `groundSiteCache` por zona, que tendrá que incluir la semilla) y el punto de partida (`START`, en el arranque de `20_bucle_arranque.js`). `MISSIONS` y el motor están en `18_misiones_datos.js` y `19_misiones_motor.js`.
**v21, objetivos genéricos: hecha** (27-oct; ver 7c «v21»): forma común de los blancos, marca TGT en HUD y radar, sitios fijos o al azar, escuadrones por eventos, fijar cualquier blanco; además, el primer enemigo nuevo, los **dirigibles**. Con ella acaba la Fase 0. **Fase 1 empezada en la v23** (27-oct): la misión 1 (diseño de Jorge: la flota de dirigibles) con el compañero Lance. Quedan de la Fase 1: briefing, hangar con loadout, mapa del mundo y resultados con rango y guardado del progreso.
Recordatorio: las misiones de la campaña las diseña Jorge; antes de crear cada una, preguntarle la base, la premisa y el escenario.

## 8. Entorno de pruebas (lo que funcionó)

### 8.1 En Claude Code (desde el 16-oct)
- Servidor: `preview_start` con el nombre `alas-de-brasa` (puerto 8765, raíz del proyecto). Abrir `http://localhost:8765/fuentes/sky_apex.src.html` (carga el glb suelto) o el HTML generado. `file://` no se puede abrir.
- El panel del navegador suele estar oculto. Entonces `requestAnimationFrame` casi no corre y el juego se queda en `loading`. Hay que:
  1. Bombear el terreno con `pumpTerrain(24)` hasta que devuelva 0.
  2. Forzar el menú: `__game.setState('menu')`, `updateTowerStreaming`, `updateIslandStreaming`, `pumpIslands(4000)`.
  3. Entrar a la partida con `__game.enterSelect()` + `__game.leaveSelect(true)`.
- Simulación: en un bucle, `gameTime += dt; updateAim(dt,false); updateFlight(dt,false); updateWorld(dt)`.
  - Hacer cada prueba entera en **una sola llamada** de JavaScript: entre llamadas, el bucle del juego sigue corriendo a ratos y mueve al dragón.
  - Las constantes `const` del script se pueden leer desde el evaluador, y los elementos de los arrays (`HERO_FP[0] = …`) se pueden cambiar.
- Capturas:
  1. Renderizar en síncrono (`renderer.render(scene, camera)` + `drawHUD()`).
  2. Copiar el lienzo a otro canvas (rejillas de 2×2 para comparar variantes) y mostrarlo como `<img>` fijo.
  3. Esperar 1 s antes de la captura.
  - Con DPR 1,25 la captura se recorta: emular 1280×720 y dar al `<img>` un tamaño de 62vw × 62vh (o emular 640×360).
  - Para ver un objeto de cerca, recortar el lienzo alrededor de su proyección.
  - Al acabar, quitar la emulación del tamaño de ventana.
- `window.__game` expone `F`, `dragon`, `hero`, `enemies`, `show`, `colors`, `startGame`, `enterSelect`, `leaveSelect`, `setState`, `damageEnemy`, `rider`, `music`, `intro`, `introStart`… Las funciones de nivel superior (`updateEnemies`, `animateTyrant`, `wind`, `updateIntro`, `updateRider`…) también son accesibles.
- Con el puntero sin bloquear, el rumbo sale de `F.ndcX`/`F.ndcY` (no de `F.aimWorld`): para girar en una simulación, poner `F.ndcX = ±0,7`.
- Las capturas del panel oculto a veces llegan con un paso de retraso: hacer dos seguidas. Si fallan por tiempo, la ventana está en segundo plano.
- Intro: para verla en un instante T, poner `intro.t0 = performance.now() - T·1000` y llamar a `updateIntro` en un bucle con marcas de tiempo sintéticas hasta `performance.now()` (si no, el bucle del juego la pisa).
- Si el navegador sirve una versión vieja de la fuente, añadir `?v=…` a la URL.
- (Desde la v10) La página arranca esperando un clic: para pasar de la pantalla inicial, `document.getElementById('menu').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`. La línea de tiempo de la intro se prueba fijando `intro.t0` y llamando a `updateIntro` con marcas sintéticas. En el menú el dragón no vuela (espera en `START`).
- La app para el servidor `alas-de-brasa` entre sesiones: si la navegación falla, `preview_start` con ese nombre otra vez.
- En el navegador integrado `window.close()` sí cierra la pestaña (la abrió la app): para probar «Salir», sustituir antes `window.close = () => {}`.
- Las capturas por `<img>` llegan a veces con un paso de retraso o se mezclan con la página viva: repetir la captura y comprobar con números (proyectar puntos, leer píxeles del lienzo del HUD) antes de sacar conclusiones.
- Las constantes `const` no se pueden reasignar desde el evaluador, pero las funciones de nivel superior sí (sirve para probar variantes, p. ej. otro guiado de misil, sin recargar).

### 8.2 En el chat original (claude.ai, histórico)

- Playwright con Chromium sin cabeza y renderizado por software: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` con `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --enable-webgl --no-sandbox`.
- Three.js local en `lib/three.min.js`, servido con intercepción de ruta a `https://cdnjs.cloudflare.com/**`. Las fuentes de Google se abortan.
- Semilla fija con `window.__SEED = 777` (`add_init_script`) para que el mundo sea reproducible.
- `window.__game` expone el estado para los tests (`F`, `dragon`, `keys`, `chunks`, `heightAt`, `fireballs`, `enemies`…).
- Pruebas de lógica: avanzar la simulación dentro de un único `page.evaluate`, llamando a `updateAim`, `updateFlight` y `updateWorld` con `dt = 1/60`. Es muy rápido y determinista. Antes de proyectar puntos a pantalla, llamar a `scene.updateMatrixWorld(true)`.
- Resolución: 480×270 para pruebas de lógica; 960×540 solo para capturas (a esa resolución el render por software da ~0,5 fps con frames reales). El contador `fps` interno engaña porque `dt` está limitado a 0,05 s.
- Tests largos: lanzarlos en segundo plano con `(nohup python3 -u t.py > t.log 2>&1 &)` y consultar el log con esperas cortas (el comando en primer plano tiene un límite de ~2 min). Matar procesos con `pkill -x python3; pkill -x chrome`, nunca con `pkill -f` (mató el propio shell).
- Cuando el estado `loading` está activo el bucle solo carga terreno y no mueve al dragón: sirve para congelar la escena mientras se generan chunks antes de una captura.

### 8.3 Blender (desde el 27-oct-2026)
Blender 5.2.3 LTS portátil (ZIP oficial, SHA-256 comprobado), instalado por Jorge en `D:\Herramientas\Blender\blender-5.2.3-windows-x64\` (sin administrador; `C:` tiene poco sitio). Cycles usa la RTX 2060 por OptiX (Jorge lo activó en las preferencias; con `--factory-startup` se reactiva por script). La Vega 10 solo sirve de pantalla; el portátil tiene las dos tarjetas.
- **Cómo se usa**: `node herramientas/blender/lanzar.mjs script.py [-- argumentos]` (sin ventana: `-b --factory-startup --python-exit-code 1`) o `node herramientas/blender/lanzar.mjs --ventana [archivo.blend]` (con ventana, para que Jorge mire o retoque a mano). `--ruta` dice qué Blender ha encontrado. El script de Python recibe `SKY_PROYECTO`, `SKY_SALIDA` y `BLENDER_PROYECTOS` en el entorno, así que no lleva rutas fijas.
- **Dónde busca Blender** (por orden): variable `BLENDER_EXE`, `herramientas/blender/ruta_local.txt` (`blender=…` y `proyectos=…`, propio de cada equipo), `D:\Herramientas\Blender\*` y `C:\Program Files\Blender Foundation\*`, y el PATH. En otro equipo basta con instalar Blender y cambiar `ruta_local.txt`.
- **Dónde va cada cosa** (Jorge dio permiso para escribir en las dos): los `.blend` de trabajo, en `D:\Herramientas\Blender\Proyectos` (fuera del proyecto: pesan y son binarios, no van a GitHub); los **GLB finales** y los scripts de Python, en el proyecto (`modelos/`, `herramientas/blender/`). Hay un `Untitled.blend` en esa carpeta que no es mío (no se toca).
- **Prueba de conexión** (`comprobar.py`, 15 s; etapas `arranque`, `basico`, `modelos`): Python 3.13; importadores de GLB, FBX, OBJ y STL y exportador de GLB, todos presentes; Cycles ve la RTX 2060 (OptiX) y la CPU; crea y renderiza un cubo (Workbench, ~2 s por imagen), exporta GLB y guarda un `.blend` en `Proyectos` (lo borra); y abre nuestros modelos: Alientormenta 52 633 triángulos, 488 huesos y 5 animaciones (fuego, hover, reposo, rugido, vuelo); Abrasanubes 59 770 triángulos, 266 huesos y 1 animación («pie»); Ventoscuro 39 318 triángulos, 165 huesos y 3 animaciones (cielo, reposo, rugido); y `Drogon/Drogon/Dragon.blend` (126 MB): 39 238 triángulos, 291 huesos y 52 animaciones. Los renders quedan en `herramientas/blender/salida/` (el de Abrasanubes sale de canto y casi negro: encuadre y luz de la prueba, no un juicio del modelo).
- **Avisos normales**: «HIPEW initialization failed» (no hay AMD HIP, irrelevante) y «DDS image failed to load» (texturas DDS del `.blend` de Drogon; el GLB ya lleva las suyas).
- **Para GitHub** (siguiente paso): ignorar `herramientas/blender/ruta_local.txt` y `herramientas/blender/salida/`.
- **Límites a recordar**: no veo la ventana de Blender, itero con renders; los pesos automáticos necesitan mallas limpias; la animación artística y el modelado orgánico desde cero no son lo mío; cada modelo de internet, según su licencia.

#### Syrax: primer rig y animación hechos desde cero (27-oct-2026)
Petición de Jorge: riggear y animar `Syrax_whole.stl` para ver qué tal sale el proceso completo y, si queda bien, usarlo en lugar del modelo de Drogon (Ventoscuro). Scripts en `herramientas/blender/syrax/` (numerados, se lanzan con `lanzar.mjs`); funciones comunes de render en `herramientas/blender/comun.py` (vistas, hojas de contacto y **vistas ortográficas con rejilla métrica y números**, `ortho_rejilla`, para leer coordenadas y colocar huesos). Los `.blend` de cada paso quedan en `D:\Herramientas\Blender\Proyectos\Syrax\` (alta, baja, rig, vuelo, anim) y las texturas en su carpeta `texturas/`.
1. `01_analizar.py`: STL de impresión, 2,33 M triángulos, **una sola pieza cerrada** (19 aristas raras). Con Y arriba no está en vuelo asimétrico (lo que se anotó el 26-oct, mal orientado): **está posado como los wyverns de la serie**, apoyado en las muñecas con los dedos hacia arriba y atrás, la cabeza alzada rugiendo, en pose de paso (pata izquierda adelantada) y algo asimétrico (el ala derecha más plegada).
2. `02_preparar.py`: centrado, pies en Z = 0, mirando a -Y, 34 m de envergadura (de pie) → `syrax_alta.blend`; reducido a 50 000 triángulos → `syrax_baja.blend`.
3. `03_rejillas.py`, `puntos.py`, `04_sondear.py`: articulaciones leídas en vistas con rejilla (los nudillos de los dedos se ven como bultos en la membrana) y completadas con **rayos contra la malla** (la profundidad que no se ve) y **cortes que siguen los tubos** (cola: 30 puntos). Recortes por cajas para ver las patas detrás de la membrana. 68 huesos: raíz, pelvis, 2 de columna, 6 de cuello, cabeza, mandíbula, 16 de cola; por ala clavícula, brazo, antebrazo, mano, pulgar y 4 dedos (2-3 falanges); por pata muslo, espinilla, pie y dedos (patas de ave: rodilla hacia delante).
4. `05_esqueleto.py`: pesos automáticos (difusión de calor). **Fallaban en toda la malla** por vértices repetidos y triángulos degenerados de la reducción: se arregla soldando a 2 mm y disolviendo degenerados antes (`bmesh.remove_doubles` + `dissolve_degenerate`).
5. `poses.py`, `06_vuelo.py`: **pose de planeo** por código (`apuntar`, `girar`, `abanico`: la mano y los cuatro dedos giran como un bloque para no estirar la membrana). De pie los dedos están plegados ~150° contra el antebrazo; en vuelo la muñeca se abre ~125° y se retuerce ~60°. Probado: la deformación con conservación de volumen (cuaterniones duales) hincha la membrana, peor que la normal; girar el antebrazo sobre su eje no reduce la deformación (búsqueda por estiramiento de aristas); el pulgar apuntando hacia delante deja limpia la muñeca. Envergadura en planeo: 67,3 m (los dedos son muy largos). **Corrección tras verlo Jorge (27-oct)**: en la primera versión el abanico de dedos salía **girado 180° en la muñeca** (la mano apuntaba hacia dentro, el dedo corto f1 hacía de borde de ataque y el largo f4 quedaba detrás): `abanico` decidía qué cara de la membrana va arriba con el signo de la normal medida con el brazo ya movido, y ese signo depende del giro del brazo. Ahora, de los dos giros posibles, elige el que deja la punta de f4 delante de la de f1 (comprobado: f4 llega a x = 32 en y = -5,8 y f1 queda atrás; membrana dorada arriba y crema abajo en todo el ciclo).
6. `07_textura.py`: UV automáticas, color procedural en la malla alta (oro en el lomo, crema en el vientre, ámbar en las membranas —detectadas por grosor con rayos—, bronce en la cresta, garras oscuras, dientes y cuernos de marfil —por curvatura—) y horneado con Cycles en la RTX 2060 de **normales** (el detalle de 2,3 M triángulos), color y oclusión (texturas de 2048). El horneado de emisión de un color por vértice salía negro: se hornea como DIFFUSE con el filtro COLOR.
7. `08_pose_base.py`: **la pose de planeo pasa a ser la pose de enlace** (se aplica la deformación a la malla, «aplicar pose como reposo» y pesos nuevos en esa pose), con la boca cerrada. Así el aleteo solo dobla un poco cada articulación. → `syrax_vuelo.blend`.
8. `09_animar.py`: clips hechos por código (cada hueso, una función del tiempo; 30 fps, en bucle): **vuelo** (1,2 s: bajada más rápida que la subida, antebrazo, mano y puntas de los dedos con retraso, ala plegada y mano girada al subir, el cuerpo sube con cada bajada, el cuello estabiliza la cabeza, onda por la cola), **hover** (1,1 s: cuerpo a 35°, aletazos amplios adelante y atrás, patas colgando, cola caída) y **planeo** (3 s: respiración, diedro, la cabeza mira a los lados). → `syrax_anim.blend` (acciones en pistas NLA).
9. `10_video.py`: renders con Cycles (OptiX, 32 muestras y eliminación de ruido; vista «Standard»: AgX y Filmic lavan el dorado) → `herramientas/blender/salida/syrax/syrax_<clip>.mp4` y hojas `10_fotos_<clip>.png`.
Integrado en el juego en la v20 como **Fulgor**, cuarto dragón (sección 7c, «v20»). Licencia: personaje de HBO, como el Tyrant: solo local.

#### Enemigos de la v29 (30-oct-2026)
Scripts en `herramientas/blender/enemigos/` (ver 7c, «v29»): analizar, preparar (los seis modelos de Jorge), el soldado y el hechicero desde cero y sondear (rayos para montar las torretas y medir el cuerpo de la sierpe). Lo aprendido: los GLB de Sketchfab traen piezas que no se ven (planos de rayos, mallas «invisible») y texturas de normales y rugosidad que el juego no usa (fuera: el barco pasó de 74 MB a 2,5 MB); `bpy.ops.object.convert(target='MESH')` aplica el esqueleto y deja la pose; el soldado salió con dos atributos de color (COLOR_0 blanco y el bueno en COLOR_1): el juego usa `color_1` si lo hay.

## 9. Lecciones y errores resueltos

- (v29) Un cuerpo de serpiente de 500 m no necesita esqueleto: basta con una columna de puntos (posición y orientación) en uniformes y que el shader coloque cada vértice en la suya según su posición a lo largo del modelo (recto en reposo). Así el cuerpo sigue exactamente el camino de la cabeza.
- (v29) En three r128, `BufferAttribute` no tiene `getComponent` (usar `getX/Y/Z`). La cámara del juego cuelga de otro objeto: para capturas desde cualquier sitio, una cámara aparte.

- (v28) El hundimiento fijo del modelo de vuelo (`F.sink`) separa la trayectoria del morro: si el dragón apunta el morro a la mira, va por debajo de ella. Para que «apuntar al 0° = volar horizontal», el morro compensa el hundimiento y el marcador del HUD muestra la trayectoria, no el morro.
- (v26) Con un tope de giro por eje (guiñada y cabeceo por separado), un dragón gira más de lo que dice ese tope: los dos se suman y, alabeado, el cabeceo también cambia el rumbo. Los enemigos giraban hasta 1,34 rad/s (más que el jugador) y las persecuciones acababan en espirales sin fin. El tope tiene que ser del giro total; y el radio se mide en 3D (en los bucles, el rumbo en planta engaña).
- Los enemigos al principio no cerraban distancia sobre un jugador que huía: se limitó el desvío del arco según la velocidad de cierre y se alargó el tiempo máximo de pasada a 28 s.
- Los fallos del indicador de adelanto con IA real venían de la evitación de terreno de los enemigos; la matemática se verificó con objetivos cinemáticos (37 de 37 impactos).
- La flecha del borde se solapaba con el HUD izquierdo y tenía poco contraste sobre el ala naranja: se añadió un disco oscuro y márgenes mayores.
- En el prototipo de carreras: un bucle del túnel que se cruzaba consigo mismo (30 m entre ejes) dejaba ver trozos de roca exterior dentro del túnel. Se resolvió cambiándolo por una S. Lección general: comprobar siempre la separación mínima entre tramos no contiguos del circuito.
- Un tallado de cañón por "segmento más cercano" creaba acantilados; el "mínimo" fallaba por segmentos lejanos; funcionó una media ponderada de los segmentos casi equidistantes.
- Si se vuelve a mezclar terreno tallado con otras estructuras, los muros de un cañón pueden invadir una espiral cercana: hubo que desvanecer el cañón dentro del círculo de la aguja.

## 10. Límites conocidos del juego base

- Nunca se ha probado con mando. Pensado para ordenador (teclado y ratón).
- GPU real: solo se ha probado la Radeon Vega 10 integrada del equipo de Jorge (v6: 35–43 fps a 800×600). Es un equipo modesto: conviene medir cada cosa que se añada. **El portátil tiene además una GeForce RTX 2060**: desde el 27-oct-2026 Jorge tiene Chrome en «Alto rendimiento» (NVIDIA), así que cuando juega va por la RTX 2060; las medidas anteriores (y el navegador integrado de Claude) son de la Vega 10, que queda como caso modesto de referencia.
- No hay guardado ni progresión. Las opciones se limitan a la sensibilidad y, en la rama Tyrant, a los colores del dragón.
- Los detalles de v1 a v3 de la sección 5 están reconstruidos, no son citas.

## 11. Posibles mejoras para el mundo abierto (ideas, no decisiones)

Lo hecho desde entonces está en la rama Tyrant (7c): modelo riggeado, menú y selección con colores, cámara de jinete y efectos de boost. Sigue habiendo direcciones abiertas para proponer y que Jorge elija:

- Enemigos: más tipos de dragón (rápidos, pesados), formaciones, comportamiento distinto al ser dañados, dificultad progresiva.
- Combate: indicador de daño direccional, aviso de misil o bola entrante, distintos proyectiles, recarga o calor del aliento.
- Objetivos y progresión: misiones (derribar torres de un campamento, escoltar, cazar a un jefe), puntuaciones guardadas, desbloqueos.
- Mundo: biomas (nieve, desierto, lava), clima, ciclo día-noche, más variedad de islas y estructuras.
- Feedback de vuelo: efectos de velocidad como en el prototipo de carreras, estela en el dragón del jugador.
- Calidad: mando, opciones gráficas, rendimiento en equipos modestos.
- Retomar el modo carrera como modo aparte, ahora con IAs rivales, reutilizando la pista.

Preguntas abiertas para Jorge
- ¿Cuál es la siguiente fase? (¿el modo carreras?)
- Knighty viene de una web de modelos gratis: falta saber qué licencia exacta tiene si algún día se publica.
- ¿Para qué es el material nuevo (GDD «WYRMRUSH», vídeos de referencia de carreras de dragones, música)? ¿Es un proyecto nuevo o la dirección de este?
- ¿La rama Tyrant pasa a ser la versión principal? ¿Qué se hace con la licencia del modelo si se quiere publicar?
- ¿Quiere que el modo carrera conviva con el mundo abierto en el mismo juego?

## 12. Texto sugerido para las instrucciones del proyecto

> Eres mi ayudante para "Sky Apex" (antes "Alas de Brasa"), un juego de vuelo de dragón hecho en un único HTML con Three.js r128. Contesta siempre en español y de forma breve. La línea activa es «Sky Apex» (rama Tyrant, v14): se edita `fuentes/sky_apex.src.html` y se genera `sky_apex.html` con `herramientas/incrustar_modelo.mjs` (comando en la sección 7c, con brazos, caballero y logo). `alas_de_brasa.html` (v6) es la versión estable antigua; no la sobrescribas. Antes de cada versión, guarda una copia en `versiones/`. Antes de entregar, prueba en el navegador integrado y avisa de que eso no sustituye a jugarlo. No se publica (licencia del modelo). Los vídeos del tutorial van en `tutorial/` y se graban con `herramientas/grabar_tutorial.js`. Lee `sky_apex_memoria_proyecto.md` para el contexto completo; lo siguiente previsto es el «campo de pruebas» (tutorial guiado jugando).

## 13. GitHub: plan para el chat nuevo (27-oct-2026)

Jorge quiere un repositorio **privado** en GitHub para trabajar en el portátil (este equipo) y en el PC de casa, con Claude haciendo commit y push. Se lo expliqué antes de empezar (viable y recomendable: además da copia de seguridad, porque hoy todo está solo en el portátil, y un historial real que sustituye a `versiones/`). Lo hará en un chat nuevo.

Datos medidos el 27-oct:
- Git 2.56 instalado (versión MSYS2 ucrt64); **GitHub CLI (`gh`) no instalado**.
- El proyecto ocupa unos 3,7 GB en 499 archivos, sin `node_modules`.
- **9 archivos de más de 100 MB** (límite duro de GitHub):

| Archivo | Tamaño |
|---|---|
| `modelos/dragon_01.glb` | 423 MB |
| `wynvernSTL.rar` | 199 MB |
| `Knighty.obj` | 143 MB |
| `sky apex test 01.webm` | 138 MB |
| `Drogon/Drogon/Dragon.blend` | 127 MB |
| `barcos/steampunk_airship__brass-plated_vessel.glb` | 123 MB |
| `Syrax_whole.stl` | 111 MB |
| `sky apex test 02.mp4` | 106 MB |
| `dragones raw/black-myth-wukong-kang-jin-long-static.zip` | 106 MB |

- Dos carpetas nuevas de Jorge **sin revisar**: `barcos/` (273 MB, dirigibles steampunk en GLB y zip) y `dragones raw/` (558 MB: Kang Jin Long de Black Myth Wukong, Deathwing, una estatua de dragón en STL y GLB…).

Plan propuesto (confirmarlo con Jorge antes de ejecutarlo):
1. **Qué entra en el repo:** `fuentes/`, `herramientas/` (sin `node_modules`), los modelos procesados que usa el juego (`tyrant_web`, `dragon_rojo`, `drogon_web`, `syrax_web`, `brazos_jinete`, `caballero`), `imagenes/`, `musica/`, `tutorial/`, los documentos y `.claude/launch.json`. Medir el tamaño real antes de subir: debería quedar por debajo de unos 150 MB.
2. **`.gitignore`:**
   - originales pesados y material de referencia: `Drogon/`, STL, OBJ y FBX sueltos, vídeos, zip y rar, `barcos/`, `dragones raw/`, `modelos/dragon_01.glb`, `red_dragon.glb`;
   - `versiones/` (git la sustituye con etiquetas `v20`…);
   - `herramientas/node_modules/`;
   - `herramientas/blender/ruta_local.txt` y `herramientas/blender/salida/`;
   - `.claude/settings.local.json`.
   - **Por decidir con Jorge:** `sky_apex.html` (31,6 MB). Se regenera con `node herramientas/construir.mjs`, pero él juega con ese archivo.
3. **`CLAUDE.md` en la raíz** con lo esencial, porque la memoria de Claude Code no viaja: es de cada equipo y depende de la ruta de la carpeta. Debe recoger:
   - español breve;
   - leer este documento;
   - no tocar `alas_de_brasa.html`;
   - flujo de módulos y `construir.mjs`;
   - probar en el navegador integrado y avisar de que eso no juzga la sensación;
   - preguntar antes de cada misión;
   - solo local (licencias);
   - Blender con `herramientas/blender/lanzar.mjs`.
4. **Credenciales:** Jorge se identifica él mismo, una vez por equipo: instalar GitHub CLI y `gh auth login`, o el gestor de credenciales de Git. Lo más acotado es un token limitado a ese repositorio. Claude nunca escribe contraseñas ni tokens.
5. **Primer commit** con todo lo anterior y la etiqueta `v20`. **Push solo cuando Jorge lo pida.**
6. **Flujo diario:** al empezar en un equipo, traer lo último (pull); al terminar, commit y push. No editar en los dos equipos a la vez sin sincronizar.
7. **PC de casa:**
   - instalar Git, Node 24, Python (para el servidor de pruebas) y Blender 5.2.3 (ZIP portátil);
   - clonar el repo y abrir la carpeta en Claude Desktop;
   - `npm install` en `herramientas/`;
   - crear su `herramientas/blender/ruta_local.txt`.
8. **Archivos que se sincronizan aparte:** los `.blend` de trabajo (`D:\Herramientas\Blender\Proyectos\`) y los originales pesados, si hacen falta en casa, con OneDrive o un disco externo.

**Hecho (27-oct-2026, chat nuevo):**
- Repositorio `https://github.com/JorgePove/Sky_Apex`, rama `main`, etiqueta `v20`. Primer commit: 111 archivos, ~95 MB comprimidos. `sky_apex.html` entra en el repo (decisión de Jorge).
- Cambios sobre el plan: **push automático** al terminar cada entrega (Jorge lo pidió) y **repositorio público** con la web en GitHub Pages desde `main` (raíz): `https://jorgepove.github.io/Sky_Apex/`. Jorge decidió que las licencias no son un problema: los modelos son comprados o de webs legítimas y el proyecto no tiene ánimo de lucro.
- `index.html` (lleva a `sky_apex.html` con los parámetros) y `.nojekyll`. Reglas de trabajo y de git en `CLAUDE.md`.
- Credenciales: Git for Windows con el Git Credential Manager. Había una credencial vieja de SourceTree (con contraseña) que GitHub rechazaba; se arregló con `git credential-manager github login` (inicio de sesión en el navegador).
- Fuera del repo, además de lo previsto: `herramientas/salida/`, los vídeos, mp3 y PDF de la raíz y `.claude/worktrees/`.
