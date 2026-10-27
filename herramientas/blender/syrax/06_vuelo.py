"""Syrax, paso 6: pose de planeo (poses.py) y renders para revisarla.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/06_vuelo.py
Escribe salida/syrax/06_vuelo.png (arriba, frente, lado y 3/4) e informa de la envergadura y del estiramiento de la membrana."""
import bpy, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comun as C
import poses as PO

OUT = C.carpeta(C.SALIDA, 'syrax')
bpy.ops.wm.open_mainfile(filepath=os.path.join(C.PROYECTOS, 'Syrax', 'syrax_rig.blend'))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); malla = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
arm.hide_render = True


def aristas(obj):
    """Largo de cada arista de la malla evaluada (con la pose)."""
    dg = bpy.context.evaluated_depsgraph_get(); me = obj.evaluated_get(dg).to_mesh()
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    e = np.empty(len(me.edges) * 2, dtype=np.int64); me.edges.foreach_get('vertices', e); e = e.reshape(-1, 2)
    L = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1); obj.evaluated_get(dg).to_mesh_clear(); return L, co


L0, _ = aristas(malla)
PO.pose_vuelo(arm)
L1, co = aristas(malla)
r = L1 / np.maximum(L0, 1e-6)
C.ok('planeo: envergadura %.1f m, largo %.1f m, alto %.1f m' % (np.ptp(co[:, 0]), np.ptp(co[:, 1]), np.ptp(co[:, 2])))
C.info('estiramiento de aristas: mediana %.2f, 95 %% < %.2f, máx %.1f; más del doble: %d de %d' % (np.median(r), np.percentile(r, 95), r.max(), int((r > 2).sum()), len(r)))
C.vistas(os.path.join(OUT, '06_vuelo'), [malla], nombres=('arriba', 'frente', 'izquierda', 'tres_cuartos'), color='SINGLE', ancho=900, alto=520)
C.ok(os.path.join(OUT, '06_vuelo.png'))
# de cerca: el ala izquierda desde arriba y desde abajo, y el hombro y la muñeca en perspectiva
B = arm.pose.bones
mu = B['hand.L'].head; hom = B['upperarm.L'].head
rutas = [C.foto(os.path.join(OUT, '06_c1.png'), [malla], (0.05, -0.05, 1), 900, 520, orto=True, centro=(hom + mu) / 2 + (mu - hom) * 0.6, radio=13),
         C.foto(os.path.join(OUT, '06_c2.png'), [malla], (0.05, 0.05, -1), 900, 520, orto=True, centro=(hom + mu) / 2 + (mu - hom) * 0.6, radio=13),
         C.foto(os.path.join(OUT, '06_c3.png'), [malla], (0.6, -1, 0.55), 900, 520, centro=(hom + mu) / 2, radio=6),
         C.foto(os.path.join(OUT, '06_c4.png'), [malla], (0.3, 0.6, 0.9), 900, 520, centro=(hom + mu) / 2, radio=7)]
C.hoja(rutas, os.path.join(OUT, '06_vuelo_cerca.png'), 2)
for r in rutas: os.remove(r)
C.ok(os.path.join(OUT, '06_vuelo_cerca.png'))
