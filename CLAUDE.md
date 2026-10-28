# Sky Apex: instrucciones para Claude

Juego web de dragones de Jorge (Level Designer), proyecto personal de portfolio. La memoria de Claude Code es de cada equipo y no viaja con el repositorio: lo que viaja es este archivo y `sky_apex_memoria_proyecto.md`.

## Al empezar cada sesión
1. `git pull --ff-only`. Si falla, hay un conflicto o hay cambios locales sin subir, avisar a Jorge antes de tocar nada.
2. Leer `sky_apex_memoria_proyecto.md`: arquitectura, constantes, historial de versiones, ramas, entorno de pruebas y preguntas abiertas.
3. Si es la primera vez en este equipo, seguir «Equipo nuevo».

## Cómo trabajar con Jorge
- Español, breve y directo. Itera en pasos pequeños y pide los cambios en listas.
- Misiones de la campaña: antes de crear cada una, preguntarle la base, la premisa y el escenario. Claude solo propone.
- Probar en el navegador integrado antes de entregar y avisar de que esas pruebas no juzgan el control ni la sensación de vuelo: eso lo juzga Jorge jugando.
- No tocar `alas_de_brasa.html` (v6 estable) salvo que Jorge lo pida.
- Publicación: Jorge decidió (27-oct-2026) hacer público el repositorio y la web. Es un proyecto personal sin ánimo de lucro.

## Flujo del juego (línea activa, rama Tyrant)
- Editar solo los módulos de `fuentes/sky_apex/` (`NN_*.html|css|js`, en ese orden; misiones en `18_misiones_datos.js` y `19_misiones_motor.js`).
- `node herramientas/construir.mjs` junta los módulos y genera `fuentes/sky_apex.src.html` (para probar con servidor) y `sky_apex.html` (para jugar, con los modelos incrustados y una copia de las stats del Excel). Con `--solo-fuente`, solo la fuente.
- Stats de las unidades (desde la v24): en `datos/sky_apex_stats.xlsx`, que edita Jorge y el juego lee solo. Ningún valor de balance fijo en el código: se añade a `STATS_SCHEMA` (`19c_stats.js`), se usa en `applyStats`/`applyHeroStats` y se amplía el Excel con `node herramientas/stats_excel.mjs` (conserva los valores de Jorge). `Jugar.bat` abre el juego con servidor local para que lea el Excel al momento.
- Nunca editar ni leer entero un HTML generado: lleva líneas base64 de varios MB.
- Fuera del HTML, junto a él: `musica/`, `tutorial/`, `imagenes/` y `datos/`. Modelos procesados en `modelos/`.
- Servidores de prueba en `.claude/launch.json`; el habitual es `sky-apex-2` (8767): `http://localhost:8767/fuentes/sky_apex.src.html`.
- Blender: `node herramientas/blender/lanzar.mjs script.py`. Los `.blend` de trabajo van fuera del repo (`D:\Herramientas\Blender\Proyectos`); los GLB finales, a `modelos/`.

## Git y GitHub (sincronización automática, pedida por Jorge el 27-oct-2026)
- Repositorio público `https://github.com/JorgePove/Sky_Apex`, rama `main`. Trabajar directamente en esta carpeta, no en worktrees.
- Web: GitHub Pages desde `main` (raíz), en `https://jorgepove.github.io/Sky_Apex/`. `index.html` lleva a `sky_apex.html` y `.nojekyll` evita que GitHub procese los archivos. Cada push a `main` la actualiza en un par de minutos, así que en `main` solo va lo que funciona.
- Al terminar cada entrega (cada versión o corrección que Jorge va a probar): commit con un mensaje claro en español y `git push`, sin pedir permiso cada vez.
- Cada versión nueva lleva su etiqueta (`git tag v21`, `git push --tags`). Las etiquetas sustituyen a las copias de `versiones/`.
- Nunca subir trabajo a medias ni algo que no construye. Revisar `git status` antes del commit: ningún archivo de más de 100 MB (límite de GitHub) ni nada de la lista de abajo.
- Credenciales: las pone Jorge en la ventana del Git Credential Manager, una vez por equipo. Claude nunca escribe contraseñas ni tokens.
- No trabajar en los dos equipos a la vez sin sincronizar.

## Qué no está en el repo
Originales pesados y material de referencia (pack `Drogon/`, STL, OBJ, FBX, zip y rar, `barcos/`, `dragones raw/`, `modelos/dragon_01.glb`, `red_dragon.glb`, vídeos, mp3 y PDF de la raíz), `versiones/`, `node_modules`, las carpetas `salida/` de las herramientas y `herramientas/blender/ruta_local.txt`. Si hacen falta en otro equipo, se pasan con OneDrive o un disco externo.

## Equipo nuevo (PC de casa)
1. Instalar Git for Windows (trae el Git Credential Manager), Node 24, Python 3 y Blender 5.2.3 (ZIP portátil).
2. Clonar en `D:\Proyectos\Dragon Racing` y abrir esa carpeta en Claude Desktop.
3. `npm install` en `herramientas/`.
4. Crear `herramientas/blender/ruta_local.txt` con las rutas de ese equipo (`blender=…\blender.exe` y `proyectos=…`; formato en la cabecera de `herramientas/blender/lanzar.mjs`).
