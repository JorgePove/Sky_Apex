"""Enemigos nuevos (v29), paso 4: medir dónde montar las torretas del superdirigible y el perfil del cuerpo de la sierpe.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/enemigos/04_sondear.py
Lee los GLB ya preparados (1 m de largo, frente +Y) y lanza rayos contra la malla:
· superdirigible: altura de la cubierta (rayo de arriba abajo) en una rejilla a lo largo (y) y a lo ancho (x).
· sierpe: por cada tramo a lo largo, centro y medio grosor del cuerpo (rayos laterales y verticales por el eje)."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C
from mathutils import Vector


def carga(n):
    C.vacia(); bpy.ops.import_scene.gltf(filepath=os.path.join(C.RAIZ, 'modelos', n))
    o = C.mallas(bpy.context.scene.objects)[0]
    dg = bpy.context.evaluated_depsgraph_get()
    return o, o.evaluated_get(dg)


def rayo(oe, o, d):
    ok, loc, nor, i = oe.ray_cast(Vector(o), Vector(d))
    return loc if ok else None


o, oe = carga('superdirigible.glb')
print('SUPER caja', [round(v, 4) for v in o.dimensions])
for y in [i / 20 for i in range(-9, 10)]:
    fila = []
    for x in (0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09):
        h = rayo(oe, (x, y, 1), (0, 0, -1))
        fila.append('%6.3f' % h.z if h else '   -  ')
    lado = rayo(oe, (1, y, 0), (-1, 0, 0))
    print('SUPER y=%5.2f  cubierta z(x=0..0.09): %s   costado x=%s' % (y, ' '.join(fila), '%.3f' % lado.x if lado else '-'))

o, oe = carga('sierpe.glb')
print('SIERPE caja', [round(v, 4) for v in o.dimensions])
for y in [i / 40 for i in range(-20, 21)]:
    arriba = rayo(oe, (0, y, 1), (0, 0, -1)); abajo = rayo(oe, (0, y, -1), (0, 0, 1))
    izq = rayo(oe, (1, y, (arriba.z + abajo.z) / 2 if arriba and abajo else 0), (-1, 0, 0))
    if arriba and abajo:
        print('SIERPE y=%6.3f  arriba %.4f  abajo %.4f  centro %.4f  medio alto %.4f  medio ancho %s' % (y, arriba.z, abajo.z, (arriba.z + abajo.z) / 2, (arriba.z - abajo.z) / 2, '%.4f' % izq.x if izq else '-'))
    else:
        print('SIERPE y=%6.3f  -' % y)
