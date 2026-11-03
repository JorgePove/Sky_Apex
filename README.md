# Sky Apex

Juego web de dragones, en three.js: vuelo, combate aéreo al estilo Ace Combat, Modo Historia, Vuelo Libre y modo Tierra. Proyecto personal de portfolio de Jorge (Level Designer), sin ánimo de lucro.

**Jugar**: https://jorgepove.github.io/Sky_Apex/ · en local, `play.bat` (servidor con Node; lee el Excel de stats al momento).

## Estructura
| Carpeta | Contenido |
|---|---|
| `src/` | Módulos del juego (`NN_*.html|css|js`), en orden. `node tools/build.mjs` los junta. |
| `assets/` | `models/` (GLB), `audio/` (`sfx/`, `voice/`, `music/`), `images/`, `maps/` y `tutorial/` (vídeos). |
| `data/` | `sky_apex_stats.xlsx`: el balance de todas las unidades (el juego lo lee solo). |
| `tools/` | Construcción, preparación de modelos, grabador del tutorial, servidores locales y scripts de Blender (`tools/blender/`). |
| `docs/` | Memoria del proyecto (`project_memory.md`) y créditos (`credits.md`). |
| `legacy/` | Versiones antiguas («Alas de Brasa» v6 y la rama humanoide). |

Los originales pesados y el material de referencia (`source_assets/`) no están en el repositorio. Créditos y licencias de los recursos: `docs/credits.md`.
