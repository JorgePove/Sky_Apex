"""Enemigos (v30), paso 6: la sierpe original con y sin el esqueleto aplicado (las patas delanteras salían retorcidas).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/enemigos/06_sierpe_sin_esqueleto.py
Vistas de lado de la zona de las patas: con el modificador de esqueleto (como se exportó en la v29) y sin él (la malla en su pose de enlace)."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

C.vacia()
bpy.ops.import_scene.gltf(filepath=os.path.join(C.RAIZ, 'dragones raw', 'black_myth_wukong_-_kang_jin_long_static.glb'))
ms = [o for o in C.mallas(bpy.context.scene.objects) if not any(m and ('invisible' in m.name.lower() or 'dither' in m.name.lower()) for m in o.data.materials)]
for o in ms:
    C.info('%s: modificadores %s, padre %s, grupos %d' % (o.name, [(m.type, m.object.name if getattr(m, 'object', None) else None) for m in o.modifiers], o.parent.name if o.parent else None, len(o.vertex_groups)))
arm = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
if arm:
    pb = arm.pose.bones
    raros = [(b.name, round(b.rotation_quaternion.angle, 2), tuple(round(x, 2) for x in b.scale)) for b in pb if b.rotation_quaternion.angle > 0.01 or abs(b.scale.x - 1) > 0.01 or b.location.length > 1e-3]
    C.info('huesos con pose distinta del reposo: %d de %d; ejemplos %s' % (len(raros), len(pb), raros[:12]))
out = C.carpeta(C.SALIDA, 'enemigos')
mn, mx = C.caja(ms); L = mx.y - mn.y
C.info('caja con esqueleto %s → %s' % (tuple(round(v, 1) for v in mn), tuple(round(v, 1) for v in mx)))
C.vistas(os.path.join(out, '06_con_esqueleto'), ms, ('izquierda', 'arriba'), color='TEXTURE', columnas=1)
for o in ms:
    for m in o.modifiers:
        if m.type == 'ARMATURE': m.show_viewport = m.show_render = False
mn, mx = C.caja(ms)
C.info('caja sin esqueleto %s → %s' % (tuple(round(v, 1) for v in mn), tuple(round(v, 1) for v in mx)))
C.vistas(os.path.join(out, '06_sin_esqueleto'), ms, ('izquierda', 'arriba'), color='TEXTURE', columnas=1)
C.ok('vistas en ' + out)
