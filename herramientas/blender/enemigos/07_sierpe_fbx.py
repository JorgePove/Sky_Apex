"""Enemigos (v30), paso 7: la sierpe desde el FBX original (kjwl.fbx, del zip «black-myth-wukong-kang-jin-long-static.zip»).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/enemigos/07_sierpe_fbx.py -- <ruta de kjwl.fbx>
Lo importa y dibuja las vistas de lado y de arriba con su pose y en la de reposo del esqueleto, para comparar las patas delanteras con
las del GLB (que salían retorcidas)."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

fbx = sys.argv[sys.argv.index('--') + 1]
C.vacia()
bpy.ops.import_scene.fbx(filepath=fbx)
objs = list(bpy.context.scene.objects)
ms = C.mallas(objs)
for o in ms:
    C.info('%s: %d tris, materiales %s, modificadores %s' % (o.name, C.triangulos([o]), [m.name for m in o.data.materials if m], [m.type for m in o.modifiers]))
arm = next((o for o in objs if o.type == 'ARMATURE'), None)
C.info('esqueleto: %s, %d huesos; acciones %s' % (arm.name if arm else None, len(arm.data.bones) if arm else 0, [a.name for a in bpy.data.actions]))
mn, mx = C.caja(ms); C.info('caja con pose %s → %s' % (tuple(round(v, 1) for v in mn), tuple(round(v, 1) for v in mx)))
out = C.carpeta(C.SALIDA, 'enemigos')
C.vistas(os.path.join(out, '07_fbx_pose'), ms, ('izquierda', 'arriba', 'frente', 'tres_cuartos'), color='TEXTURE')
if arm:
    arm.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    mn, mx = C.caja(ms); C.info('caja en reposo %s → %s' % (tuple(round(v, 1) for v in mn), tuple(round(v, 1) for v in mx)))
    C.vistas(os.path.join(out, '07_fbx_reposo'), ms, ('izquierda', 'arriba', 'frente', 'tres_cuartos'), color='TEXTURE')
C.ok('vistas en ' + out)
