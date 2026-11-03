# Sky Apex: créditos y origen de los recursos

Lo que se sabe del origen de cada recurso del juego (sacado de `project_memory.md`). Lo marcado como «por confirmar» no consta en la documentación.
Jorge decidió (27-oct-2026) publicar el repositorio y la web como proyecto personal sin ánimo de lucro; si algún día se publica de otra forma, hay que revisar estas licencias.

## Modelos (`assets/models/`)
| Archivo | Origen | Licencia |
|---|---|---|
| `dragon_tyrant.glb` | Bonus «TyrantDragon» del pack «Drogon», comprado por Jorge (`source_assets/models/drogon_pack/`). Malla y animaciones convertidas con `tools/prepare_fbx_model.mjs`. | Del pack; dudas sobre su origen (nombres internos de un juego comercial sobre un personaje de HBO). |
| `dragon_drogon.glb` | Drogon, del mismo pack comprado (`tools/prepare_drogon.mjs`). | Ídem. |
| `dragon_red.glb` | «red_dragon» de GadgetHamster (Sketchfab), `tools/prepare_red_dragon.mjs`. | CC-BY 4.0 (crédito en la nota del menú y en «Elige tu dragón»). |
| `dragon_syrax.glb` | Syrax, STL (`source_assets/models/syrax/`), riggeado y animado por Claude en Blender (`tools/blender/syrax/`). | Por confirmar (personaje de HBO). |
| `rider_arms.glb`, `knight.glb` | «Knighty», de una web de modelos 3D gratis (`source_assets/models/knighty/`), `tools/prepare_rider_arms.mjs` y `tools/prepare_knight.mjs`. | Por confirmar. |
| `airship.glb` | «Airship» de Shinsin (Sketchfab), `tools/blender/airship/`. | CC-BY 4.0 (crédito en la nota del menú). |
| `artillery_ballista.glb`, `artillery_catapult.glb`, `artillery_cannon.glb`, `naval_ship.glb`, `super_airship.glb` | Modelos que pasó Jorge (`source_assets/models/artillery_variants/`, los «guay»), `tools/blender/enemies/02_prepare.py`. | Por confirmar. |
| `serpent.glb` | «Black Myth: Wukong – Kang Jin Long (static)» (Sketchfab, `source_assets/models/dragons_raw/`), desde su FBX. | Por confirmar. |
| `soldier.glb` | Soldado y hechicero hechos desde cero por Claude en Blender (`tools/blender/enemies/03_soldier.py`). | Propio. |

## Sonido (`assets/audio/`)
| Archivo | Origen | Licencia |
|---|---|---|
| `sfx/dragon_wings_flap.mp3`, `sfx/dragon_roar.mp3`, `sfx/dragon_fire_breath.mp3`, `sfx/dragon_growl.mp3` | Sonidos que pasó Jorge, de «dragon-studio» (nombres originales `dragon-studio-…-NNNNNN.mp3`). | Por confirmar (probablemente Pixabay). |
| `music/menu.mp3`, `music/game.mp3`, `music/tension.mp3` | Música que pasó Jorge. | Por confirmar. |
| `voice/seraphin_01.mp3`, `voice/volger_01.wav` | Voces de prueba del Capítulo 01 que pasó Jorge. | Por confirmar. |

## Otros
- `assets/images/logo_sky.png`, `logo_apex.png`: logo de Jorge, separado en dos mitades con `tools/split_logo_alpha.mjs`.
- `assets/maps/free_flight.js`: paisaje de Vuelo Libre hecho desde cero en Blender (`tools/blender/landscape/`).
- `assets/tutorial/*.webm`: grabados con el propio juego (`tools/tutorial_recorder.js`).
- Motor: three.js r128 (MIT), cargado desde cdnjs.
