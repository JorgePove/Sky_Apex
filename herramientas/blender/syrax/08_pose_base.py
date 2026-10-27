"""Syrax, paso 8: la pose de planeo pasa a ser la pose de reposo (la de enlace) del modelo, con la boca cerrada.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/08_pose_base.py
Por qué: de pie, los dedos están plegados contra el antebrazo (~150°); en vuelo se abren ~100°. Si el modelo se enlaza de pie, cada
fotograma de vuelo deforma mucho la muñeca. Enlazado ya en vuelo, el aleteo solo dobla un poco cada articulación.
Pasos: posar (poses.pose_vuelo, con el antebrazo girado lo que menos deforma) → aplicar la deformación a la malla → «aplicar pose como
reposo» en el esqueleto → pesos automáticos nuevos en esta pose (si fallan, se conservan los anteriores).
Guarda BLENDER_PROYECTOS/Syrax/syrax_vuelo.blend y salida/syrax/08_base.png."""
import bpy, os, sys, math, bmesh
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comun as C
import poses as PO

PRJ = os.path.join(C.PROYECTOS, 'Syrax'); OUT = C.carpeta(C.SALIDA, 'syrax')
bpy.ops.wm.open_mainfile(filepath=os.path.join(PRJ, 'syrax_rig.blend'))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); malla = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
arm.data.pose_position = 'POSE'
PO.pose_vuelo(arm, malla=malla)
C.ok('giro del antebrazo elegido: %s' % PO.GIRO_ANTEBRAZO)
# boca cerrada: la mandíbula, 9° por debajo de la cabeza
dh = PO.direccion(arm, 'head'); lat = dh.cross(Vector((0, 0, 1))).normalized()
PO.apuntar(arm, 'jaw', Matrix.Rotation(math.radians(-9), 3, lat) @ dh if (Matrix.Rotation(math.radians(-9), 3, lat) @ dh).z < dh.z else Matrix.Rotation(math.radians(9), 3, lat) @ dh)
viejos = {g.name: g.index for g in malla.vertex_groups}

# 1. la malla, deformada, pasa a ser la malla base
for o in bpy.context.selected_objects: o.select_set(False)
malla.select_set(True); bpy.context.view_layer.objects.active = malla
bpy.ops.object.modifier_apply(modifier=malla.modifiers[0].name)
# 2. la pose actual pasa a ser el reposo del esqueleto
for o in bpy.context.selected_objects: o.select_set(False)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
C.ok('pose de vuelo aplicada como reposo')
# 3. pesos nuevos en esta pose (respaldo: los de antes, que siguen en los grupos)
import numpy as np
antes = [[(g.group, g.weight) for g in v.groups] for v in malla.data.vertices]
for o in bpy.context.selected_objects: o.select_set(False)
malla.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
sin = sum(1 for v in malla.data.vertices if not any(g.weight > 1e-6 for g in v.groups))
if sin > len(malla.data.vertices) * 0.02:
    C.aviso('pesos nuevos fallidos (%d sin peso): vuelvo a los de antes' % sin)
    for g in list(malla.vertex_groups): malla.vertex_groups.remove(g)
    for nombre in viejos: malla.vertex_groups.new(name=nombre)
    inv = {i: n for n, i in viejos.items()}
    for i, lst in enumerate(antes):
        for gi, w in lst: malla.vertex_groups[inv[gi]].add([i], w, 'REPLACE')
else:
    C.ok('pesos nuevos en la pose de vuelo: %d vértices sin peso (los asigno al hueso más cercano)' % sin)
    if sin:
        segs = [(b.name, b.head_local, b.tail_local) for b in arm.data.bones if b.use_deform]
        def dseg(p, a, b):
            ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (a + ab * t - p).length
        for v in malla.data.vertices:
            if not any(g.weight > 1e-6 for g in v.groups):
                n, _, _ = min(segs, key=lambda s: dseg(v.co, s[1], s[2])); malla.vertex_groups[n].add([v.index], 1.0, 'REPLACE')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PRJ, 'syrax_vuelo.blend'))
C.ok('guardado ' + os.path.join(PRJ, 'syrax_vuelo.blend'))
arm.hide_render = True
co = np.empty(len(malla.data.vertices) * 3); malla.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
C.info('envergadura %.1f m, largo %.1f m' % (np.ptp(co[:, 0]), np.ptp(co[:, 1])))
C.vistas(os.path.join(OUT, '08_base'), [malla], nombres=('arriba', 'frente', 'izquierda', 'tres_cuartos'), color='TEXTURE', ancho=900, alto=520)
C.ok(os.path.join(OUT, '08_base.png'))
