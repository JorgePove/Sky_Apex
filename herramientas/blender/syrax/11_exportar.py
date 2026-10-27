"""Syrax, paso 11: exportar a GLB (malla, esqueleto, texturas en JPEG y los clips de 09_animar.py) y comprobarlo reimportándolo.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/11_exportar.py [-- ruta_salida.glb]
Por defecto escribe salida/syrax/syrax_prueba.glb (para el juego irá a modelos/ cuando se integre)."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

PRJ = os.path.join(C.PROYECTOS, 'Syrax')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
dest = os.path.abspath(args[0]) if args else os.path.join(C.carpeta(C.SALIDA, 'syrax'), 'syrax_prueba.glb')
bpy.ops.wm.open_mainfile(filepath=os.path.join(PRJ, 'syrax_anim.blend'))
esc = bpy.context.scene
arm = next(o for o in esc.objects if o.type == 'ARMATURE'); malla = next(o for o in esc.objects if o.type == 'MESH')
for o in list(esc.objects):
    if o not in (arm, malla): bpy.data.objects.remove(o)
arm.animation_data.action = None
for tr in arm.animation_data.nla_tracks: tr.mute = False
# nombres para el juego: sin «_01» al final en los huesos del centro (el juego quita los sufijos «_número» al emparejar huesos:
# neck_01…neck_06 serían todos «neck»). Blender renombra con ellos los grupos de vértices y las curvas de las animaciones.
import re
for b in arm.data.bones:
    m = re.match(r'^(spine|neck|tail)_0*(\d+)$', b.name)
    if m: b.name = m.group(1) + m.group(2)
C.ok('huesos: ' + ', '.join(b.name for b in arm.data.bones if not b.name.endswith(('.L', '.R'))))
# color para el juego: más oscuro y saturado (color^1,8 · 0,78). El juego usa las texturas de los dragones sin descodificar el sRGB y con
# la luz pensada para los otros (luminancia media ~0,17); el dorado tal cual (0,36) salía amarillo chillón.
import numpy as np
mat = malla.data.materials[0]
nodo = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and 'color' in n.image.name)
src = nodo.image; w, h = src.size
px = np.empty(w * h * 4, dtype=np.float32); src.pixels.foreach_get(px); px = px.reshape(-1, 4)
px[:, :3] = np.power(np.clip(px[:, :3], 0, 1), 1.8) * 0.78
juego = bpy.data.images.new('syrax_color_juego', w, h, alpha=False)
juego.pixels.foreach_set(px.ravel())
juego.filepath_raw = os.path.join(PRJ, 'texturas', 'syrax_color_juego.png'); juego.file_format = 'PNG'; juego.save()
nodo.image = juego
C.ok('textura de color para el juego: %s' % juego.filepath_raw)
for o in bpy.context.selected_objects: o.select_set(False)
arm.select_set(True); malla.select_set(True); bpy.context.view_layer.objects.active = arm
quiero = dict(filepath=dest, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
              export_image_format='JPEG', export_jpeg_quality=88, export_def_bones=False, export_skins=True, export_morph=False,
              export_yup=True, export_tangents=False, export_force_sampling=True, export_optimize_animation_size=True, export_extras=False)
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
falta = [k for k in quiero if k not in props]
if falta: C.aviso('opciones que esta versión no tiene: %s' % falta)
bpy.ops.export_scene.gltf(**{k: v for k, v in quiero.items() if k in props})
C.ok('exportado %s (%.2f MB)' % (dest, os.path.getsize(dest) / 1048576))
# comprobación: reimportar en una escena vacía
C.vacia()
bpy.ops.import_scene.gltf(filepath=dest)
objs = list(bpy.context.scene.objects)
a = next(o for o in objs if o.type == 'ARMATURE')
C.ok('reimportado: %d mallas, %d triángulos, %d huesos, %d imágenes, animaciones: %s' % (len(C.mallas(objs)), C.triangulos(objs), len(a.data.bones), len(bpy.data.images),
     ', '.join('%s (%d-%d)' % (x.name, x.frame_range[0], x.frame_range[1]) for x in bpy.data.actions)))
