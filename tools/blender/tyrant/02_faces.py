"""Manchas del Tyrant (v37), paso 2: ¿asoma la capa de abajo de la membrana por la de arriba? ¿Lo arregla no dibujar las caras traseras?
Lanzar:  node tools/blender/run.mjs tools/blender/tyrant/02_faces.py [-- nombre=ruta.glb ...]
Por cada GLB (por defecto, el del juego): vistas de arriba y de abajo dibujando las dos caras (como el juego hasta la v36) y solo las
delanteras (sin caras traseras), en salida/tyrant/<nombre>_caras.png (fila 1: las dos caras; fila 2: solo las delanteras).
Con «fbx» en la lista, también el FBX original con su textura UDIM (para ver si tiene zonas de una sola capa)."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
modelos = [a.split('=', 1) for a in args if '=' in a] or [['glb', os.path.join(C.RAIZ, 'assets', 'models', 'dragon_tyrant.glb')]]
if 'fbx' in args: modelos.append(['fbx', None])
out = C.carpeta(C.SALIDA, 'tyrant')
TYR = os.path.join(C.RAIZ, 'source_assets', 'models', 'drogon_pack', 'Drogon', 'BONUS - TyrantDragon', 'Dragon')

for nombre, ruta in modelos:
    C.vacia()
    if ruta:
        bpy.ops.import_scene.gltf(filepath=ruta)
    else:
        bpy.ops.import_scene.fbx(filepath=os.path.join(TYR, 'SKM_TyrantDragon.FBX'))
        img = bpy.data.images.load(os.path.join(TYR, 'Textures', 'T_TyrantDragon_D.1001.PNG')); img.source = 'TILED'
        for k in range(2, 6):
            if not any(t.number == 1000 + k for t in img.tiles): img.tiles.new(1000 + k)
        img.filepath = os.path.join(TYR, 'Textures', 'T_TyrantDragon_D.<UDIM>.PNG'); img.reload()
        for o in C.mallas(bpy.context.scene.objects):
            for m in o.data.materials:
                if m and 'Body' in m.name:
                    nt = m.node_tree; tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
    ms = [o for o in C.mallas(bpy.context.scene.objects) if o.data.materials]
    rutas = []
    for cull in (False, True):
        for v in ('arriba', 'abajo'):
            bpy.context.scene.display.shading.show_backface_culling = cull
            rutas.append(C.foto(os.path.join(out, '_%s_%s_%d.png' % (nombre, v, cull)), ms, direccion=C.VISTAS[v], ancho=1200, alto=700, orto=True, margen=1.0))
    C.hoja(rutas, os.path.join(out, '%s_caras.png' % nombre), columnas=2)
    for r in rutas: os.remove(r)
    C.ok('%s: %s' % (nombre, os.path.join(out, '%s_caras.png' % nombre)))
