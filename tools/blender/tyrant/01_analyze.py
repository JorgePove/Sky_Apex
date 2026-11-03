"""Manchas del Tyrant (v37), paso 1: comparar el FBX original (con su textura UDIM) y el GLB del juego.
Lanzar:  node tools/blender/run.mjs tools/blender/tyrant/01_analyze.py
Saca: materiales, rango de las UV por casilla UDIM (y las caras que se salen de su casilla) y vistas de arriba y de abajo
de los dos modelos con su textura, en salida/tyrant/."""
import bpy, os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C

TYR = os.path.join(C.RAIZ, 'source_assets', 'models', 'drogon_pack', 'Drogon', 'BONUS - TyrantDragon', 'Dragon')
FBX = os.path.join(TYR, 'SKM_TyrantDragon.FBX')
TEX = os.path.join(TYR, 'Textures', 'T_TyrantDragon_D.<UDIM>.PNG')
GLB = os.path.join(C.RAIZ, 'assets', 'models', 'dragon_tyrant.glb')
out = C.carpeta(C.SALIDA, 'tyrant')


def uv_casillas(o):
    """UV por cara: casilla UDIM de cada cara (por su centro) y cuántas caras tienen algún vértice fuera de esa casilla."""
    me = o.data; uvl = me.uv_layers.active.data
    n = len(me.loops); uv = np.empty(n * 2, dtype=np.float64); uvl.foreach_get('uv', uv); uv = uv.reshape(n, 2)
    res = {}
    for p in me.polygons:
        idx = list(p.loop_indices); q = uv[idx]; c = q.mean(axis=0)
        t = (int(math.floor(c[0])), int(math.floor(c[1])))
        mat = me.materials[p.material_index].name if me.materials else '-'
        r = res.setdefault((mat, t), [0, 0, np.inf, -np.inf, np.inf, -np.inf])
        r[0] += 1
        if (q[:, 0] < t[0] - 1e-4).any() or (q[:, 0] > t[0] + 1 + 1e-4).any() or (q[:, 1] < t[1] - 1e-4).any() or (q[:, 1] > t[1] + 1 + 1e-4).any(): r[1] += 1
        r[2] = min(r[2], q[:, 0].min()); r[3] = max(r[3], q[:, 0].max()); r[4] = min(r[4], q[:, 1].min()); r[5] = max(r[5], q[:, 1].max())
    for (mat, t), r in sorted(res.items()):
        C.info('  %-28s casilla u=%d v=%d: %6d caras, %4d fuera de su casilla; u %.3f..%.3f  v %.3f..%.3f' % (mat, t[0], t[1], r[0], r[1], *r[2:]))


def material_udim(ms):
    img = bpy.data.images.load(TEX.replace('<UDIM>', '1001'))
    img.source = 'TILED'
    for k in range(2, 6):
        if not any(t.number == 1000 + k for t in img.tiles): img.tiles.new(1000 + k)
    img.filepath = TEX
    img.reload()
    C.info('imagen UDIM: casillas %s' % [t.number for t in img.tiles])
    for o in ms:
        for m in o.data.materials:
            if not m or 'Body' not in m.name: continue
            m.use_nodes = True
            nt = m.node_tree
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf: nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
            nt.nodes.active = tn


def vistas(nombre, objs):
    ms = C.mallas(objs)
    rutas = []
    for v in ('arriba', 'abajo', 'tres_cuartos', 'tres_cuartos_atras'):
        rutas.append(C.foto(os.path.join(out, '%s_%s.png' % (nombre, v)), ms, direccion=C.VISTAS[v], ancho=1200, alto=800, orto=v in ('arriba', 'abajo'), margen=1.0))
    C.hoja(rutas, os.path.join(out, '%s_vistas.png' % nombre), columnas=2)
    for r in rutas: os.remove(r)


# 1. FBX original
C.vacia()
bpy.ops.import_scene.fbx(filepath=FBX)
objs = list(bpy.context.scene.objects); ms = C.mallas(objs)
C.ok('FBX: %d mallas, %d triángulos' % (len(ms), C.triangulos(ms)))
for o in ms:
    C.info('%s: materiales %s' % (o.name, [m.name for m in o.data.materials if m]))
    uv_casillas(o)
material_udim(ms)
vistas('fbx', objs)

# 2. GLB del juego
C.vacia()
bpy.ops.import_scene.gltf(filepath=GLB)
objs = list(bpy.context.scene.objects); ms = C.mallas(objs)
C.ok('GLB: %d mallas, %d triángulos' % (len(ms), C.triangulos(ms)))
for o in ms: C.info('%s: materiales %s' % (o.name, [m.name for m in o.data.materials if m]))
vistas('glb', objs)
C.ok('vistas en %s' % out)
