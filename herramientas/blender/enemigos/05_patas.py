"""Enemigos (v30), paso 5: mirar de cerca las patas de la sierpe (sierpe.glb ya preparado: 1 m de largo, cabeza hacia +Y de Blender).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/enemigos/05_patas.py
Dibuja vistas ortográficas con rejilla de la zona de las patas delanteras y traseras, y escribe cuántos vértices hay lejos del eje del
cuerpo (las patas) en cada tramo a lo largo, para saber dónde nacen."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C
from mathutils import Vector

C.vacia(); bpy.ops.import_scene.gltf(filepath=os.path.join(C.RAIZ, 'modelos', 'sierpe.glb'))
ms = C.mallas(bpy.context.scene.objects)
out = C.carpeta(C.SALIDA, 'enemigos')
AXIS_Z = float(os.environ.get('EJE', '0.0'))
# vértices lejos del eje (radio en el corte > 0.02): histograma a lo largo de y
hist = {}
for o in ms:
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        r = ((p.x) ** 2 + (p.z - AXIS_Z) ** 2) ** 0.5
        if r > 0.02 and p.z < AXIS_Z - 0.01:                     # (por debajo del vientre: las patas; las aletas van encima)
            k = round(p.y * 100) / 100
            hist.setdefault(k, [0, 0.0, 9, -9])
            h = hist[k]; h[0] += 1; h[1] = max(h[1], r); h[2] = min(h[2], p.z); h[3] = max(h[3], abs(p.x))
for k in sorted(hist):
    n, rmax, zmin, xmax = hist[k]
    if n > 5: print('PATAS y=%5.2f  vértices %5d  radio máx %.3f  z mín %.3f  |x| máx %.3f' % (k, n, rmax, zmin, xmax))
for nombre, (u0, u1, v0, v1), vista in [('patas_del_lado', (-0.25, 0.5, -0.12, 0.12), 'izquierda'), ('patas_del_arriba', (-0.25, 0.5, -0.12, 0.12), 'arriba'),
                                         ('patas_del_frente', (-0.12, 0.12, -0.1, 0.12), 'frente')]:
    C.ortho_rejilla(os.path.join(out, '05_' + nombre + '.png'), ms, vista, u0, u1, v0, v1, ppm=1800, paso=0.01, etiquetas=0.05, color='TEXTURE')
C.ok('vistas en ' + out)
