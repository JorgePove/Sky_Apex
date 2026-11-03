# Sky Apex: instrucciones para Claude

Juego web de dragones de Jorge (Level Designer), proyecto personal de portfolio. La memoria de Claude Code es de cada equipo y no viaja con el repositorio: lo que viaja es este archivo y `docs/project_memory.md`.

## Al empezar cada sesión
1. `git pull --ff-only`. Si falla, hay un conflicto o hay cambios locales sin subir, avisar a Jorge antes de tocar nada.
2. Leer `docs/project_memory.md`: arquitectura, constantes, historial de versiones, ramas, entorno de pruebas y preguntas abiertas. Desde la v46 los archivos tienen nombres en inglés: la tabla «Nombres nuevos (v46)», al principio de ese documento, traduce los nombres antiguos que salen en el historial.
3. Si es la primera vez en este equipo, seguir «Equipo nuevo».

## Cómo trabajar con Jorge
- Español, breve y directo. Itera en pasos pequeños y pide los cambios en listas. Preguntarle cualquier duda en cada paso.
- Misiones de la campaña: antes de crear cada una, preguntarle la base, la premisa y el escenario. Claude solo propone.
- Probar en el navegador integrado antes de entregar y avisar de que esas pruebas no juzgan el control ni la sensación de vuelo: eso lo juzga Jorge jugando.
- No tocar `legacy/alas_de_brasa_v6.html` (v6 estable) salvo que Jorge lo pida.
- Publicación: Jorge decidió (27-oct-2026) hacer público el repositorio y la web. Es un proyecto personal sin ánimo de lucro.

## Estructura y nombres (desde la v46)
- Todo en inglés, en minúsculas y `snake_case`: carpetas, archivos, ids de recursos, clips de animación, misiones (`chapter_01`, `free_flight`…) y secciones del tutorial. Los textos que ve el jugador siguen en castellano (y las voces, en inglés). Las claves de las stats del Excel y los ids de dragones y unidades que salen de él (`tyrant`, `rojo`, `superdirigible`…) se quedan como están.
- `src/`: los módulos del juego (`NN_*.html|css|js`, en ese orden). `assets/`: `models/` (GLB), `audio/sfx|voice|music/`, `images/`, `maps/` (mapas hechos a mano en `.js`) y `tutorial/` (vídeos `<sección>.webm`). `data/`: el Excel de stats. `docs/`: la memoria del proyecto. `tools/`: herramientas de Node y `tools/blender/`. `legacy/`: el juego antiguo (v6) y la rama humanoide. `source_assets/` (fuera de git): originales pesados y referencias.
- Raíz: `index.html` (el juego entero, el «HTML maestro», generado), `sky_apex.html` (redirección a `index.html`, para el enlace de siempre), `play.bat`, este archivo.
- Recursos (desde la v46): no van dentro del HTML. Con servidor (la web, `play.bat`, el de pruebas) el juego pide los archivos de `assets/` tal cual; abierto con doble clic (`file://`) usa sus copias `assets/packed/<ruta>.js` (base64 en `window.SKY_ASSETS`), que genera `tools/build.mjs` y van al repositorio. `loadBytes(url)`/`loadGLB(url)` (09) eligen solos; `?packed=1` fuerza las copias con servidor. Un recurso nuevo: dejarlo en `assets/` y construir (las copias se rehacen solas si cambia el archivo).

## Flujo del juego (línea activa)
- Editar solo los módulos de `src/` (misiones en `18_missions_data.js` y `19_missions_engine.js`).
- Modo Historia (desde la v34): cada capítulo en su módulo (`18b_chapter_01.js`: receta y guion, en inglés para las voces y en castellano para los subtítulos); el modo (pantalla de capítulo, voces, subtítulos, planos de cine, reacciones) en `19e_story.js`; el portal y el rayo del superdirigible en `14h_portal.js`. Voces nuevas: archivo en `assets/audio/voice/` y su entrada en `VOICES` (19e); al construir sale su copia en `assets/packed/`.
- `node tools/build.mjs` junta los módulos en `index.html` (con una copia de las stats del Excel), comprueba la sintaxis y rehace las copias de `assets/packed/` que hayan cambiado. Con `--no-pack`, sin las copias.
- Stats de las unidades (desde la v24): en `data/sky_apex_stats.xlsx`, que edita Jorge y el juego lee solo. Ningún valor de balance fijo en el código: se añade a `STATS_SCHEMA` (`19c_stats.js`), se usa en `applyStats`/`applyHeroStats` y se amplía el Excel con `node tools/stats_sheet.mjs` (conserva los valores de Jorge). `play.bat` abre el juego con servidor local para que lea el Excel al momento.
- Para cambiar un valor del Excel cuando Jorge lo pida: `node tools/stats_sheet.mjs --poner unidad.clave=valor` (con el Excel cerrado; conserva los demás).
- Modo Tierra (desde la v44, solo el Tyrant): aterrizar, andar y despegar en `15b_ground.js`; sus clips (`walk`, `land`, `takeoff`) van en `assets/models/dragon_tyrant.glb`, que se regenera con `tools/prepare_fbx_model.mjs` (comando en la memoria del proyecto, 7c «v44», con los nombres de clip nuevos: `fly`, `idle`, `breath_fire`, `roar`…). Para renombrar clips sin regenerar: `tools/rename_clips.mjs`.
- Enemigos nuevos (desde la v29: artillería, batallones, barcos navales, superdirigible, sierpe) en `14e_units.js`, `14f_serpent.js` y `14g_battalions.js`; se colocan con la receta `units` y se prueban en el modo Galería de enemigos (`enemy_gallery`). Sus modelos se preparan con `tools/blender/enemies/`.
- Nunca leer entero un archivo generado con base64 (`assets/packed/*.js`, `legacy/*.html`, `assets/maps/*.js`): llevan líneas de varios MB. `index.html` se genera: editar `src/`.
- Servidores de prueba en `.claude/launch.json`: `sky-apex` (8767, `http://localhost:8767/index.html`; con `?packed=1`, como con doble clic) y `tutorial-recorder` (8766, para grabar los vídeos del tutorial con `tools/tutorial_recorder.js`).
- Blender: `node tools/blender/run.mjs script.py`. Los `.blend` de trabajo van fuera del repo (`D:\Herramientas\Blender\Proyectos`); los GLB finales, a `assets/models/`; las capturas, a `tools/blender/output/`.

## Git y GitHub (sincronización automática, pedida por Jorge el 27-oct-2026)
- Repositorio público `https://github.com/JorgePove/Sky_Apex`, rama `main`. Trabajar directamente en esta carpeta, no en worktrees.
- Web: GitHub Pages desde `main` (raíz), en `https://jorgepove.github.io/Sky_Apex/`. `index.html` es el juego (`sky_apex.html` redirige a él) y `.nojekyll` evita que GitHub procese los archivos. Cada push a `main` la actualiza en un par de minutos, así que en `main` solo va lo que funciona.
- Al terminar cada entrega (cada versión o corrección que Jorge va a probar): commit con un mensaje claro en español y `git push`, sin pedir permiso cada vez.
- Cada versión nueva lleva su etiqueta (`git tag v21`, `git push --tags`). Las etiquetas sustituyen a las copias antiguas de `source_assets/old_versions/`.
- Nunca subir trabajo a medias ni algo que no construye. Revisar `git status` antes del commit: ningún archivo de más de 100 MB (límite de GitHub) ni nada de la lista de abajo.
- Credenciales: las pone Jorge en la ventana del Git Credential Manager, una vez por equipo. Claude nunca escribe contraseñas ni tokens.
- No trabajar en los dos equipos a la vez sin sincronizar.

## Qué no está en el repo
`source_assets/` entero (originales pesados y material de referencia: el pack de Drogon, los dragones y dirigibles en bruto, STL, OBJ, FBX, zip y rar, vídeos y música de referencia, capturas, el GDD y las copias de versiones antiguas), `node_modules`, las carpetas `output/` de las herramientas y `tools/blender/local_paths.txt`. Si hacen falta en otro equipo, se pasan con OneDrive o un disco externo.

## Equipo nuevo (PC de casa)
1. Instalar Git for Windows (trae el Git Credential Manager), Node 24, Python 3 y Blender 5.2.3 (ZIP portátil).
2. Clonar en `D:\Proyectos\Sky Apex` y abrir esa carpeta en Claude Desktop. (Si ya estaba clonado como `Dragon Racing`, cerrar Claude Desktop, renombrar la carpeta a `Sky Apex`, hacer `git pull` y renombrar `herramientas/blender/ruta_local.txt`, si sigue ahí, a `tools/blender/local_paths.txt`.)
3. `npm install` en `tools/`.
4. Crear `tools/blender/local_paths.txt` con las rutas de ese equipo (`blender=…\blender.exe` y `proyectos=…`; formato en la cabecera de `tools/blender/run.mjs`).
