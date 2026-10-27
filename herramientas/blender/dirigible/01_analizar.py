"""Dirigible, paso 1: importar barcos/airship.glb (Sketchfab, Shinsin, CC-BY 4.0), medirlo y sacar vistas de revisión.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/dirigible/01_analizar.py
Escribe salida/dirigible/01_vistas.png."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

C.vacia()
bpy.ops.import_scene.gltf(filepath=os.path.join(C.RAIZ, 'barcos', 'airship.glb'))
objs = list(bpy.context.scene.objects)
ms = C.mallas(objs)
mn, mx = C.caja(objs)
C.ok('objetos %d, mallas %d, materiales %d, triángulos %d' % (len(objs), len(ms), len(bpy.data.materials), C.triangulos(objs)))
C.ok('caja: min (%.2f, %.2f, %.2f)  max (%.2f, %.2f, %.2f)  tamaño (%.2f, %.2f, %.2f)' % (*mn, *mx, *(mx - mn)))
# reparto de triángulos por pieza (las 12 más pesadas) y por material
pesos = sorted(((sum(len(p.vertices) - 2 for p in o.data.polygons), o.name) for o in ms), reverse=True)
for t, n in pesos[:12]: C.info('%6d  %s' % (t, n))
out = C.carpeta(C.SALIDA, 'dirigible')
C.vistas(os.path.join(out, '01_vistas'), objs, ('frente', 'izquierda', 'arriba', 'tres_cuartos'), color='MATERIAL')
C.ok('vistas en ' + out)
