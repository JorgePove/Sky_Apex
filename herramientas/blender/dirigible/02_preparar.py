"""Dirigible, paso 2: dejar barcos/airship.glb listo para el juego y exportarlo a GLB.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/dirigible/02_preparar.py [-- ruta_salida.glb]
Por defecto escribe modelos/dirigible.glb y salida/dirigible/02_vistas.png (para comparar con 01_vistas.png).
- El original no tiene texturas: 305 piezas con 96 materiales de un solo color. El color de cada material pasa a color por vértice
  (COLOR_0) y todo se junta en una sola malla con un solo material (una llamada de dibujo por dirigible).
- Se reducen las piezas con muchos triángulos para su tamaño (DENSIDAD): 21 engranajes de menos de 1 m sumaban 34 000. Las grandes y
  lisas (bolsas de gas) quedan igual: reducirlas con una proporción fija las arrugaba.
- Proa hacia +Y de Blender (= -Z en three.js, el «adelante» del juego), costados en ±X; origen en el centro de la caja y en metros del
  original (20,6 m de eslora): la escala la pone el juego (AIRSHIP_LEN)."""
import bpy, bmesh, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C
from mathutils import Matrix, Vector

DENSIDAD, MINIMO = 25, 300                # cada pieza se queda con como mucho max(MINIMO, DENSIDAD · diagonal²) triángulos (diagonal en m)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
dest = os.path.abspath(args[0]) if args else os.path.join(C.RAIZ, 'modelos', 'dirigible.glb')

C.vacia()
bpy.ops.import_scene.gltf(filepath=os.path.join(C.RAIZ, 'barcos', 'airship.glb'))
esc = bpy.context.scene
ms = C.mallas(esc.objects)
antes = C.triangulos(ms)

# 1. color de cada material → atributo de color por esquina (en lineal, como el baseColorFactor del glTF)
def color_de(mat):
    if mat is None: return (0.5, 0.5, 0.5, 1)
    if mat.use_nodes:
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED': return tuple(n.inputs['Base Color'].default_value)
    return tuple(mat.diffuse_color)
datos_hechos = set()
for o in ms:
    me = o.data
    if me.name in datos_hechos: continue                 # (mallas compartidas entre varias piezas: una vez basta)
    datos_hechos.add(me.name)
    cols = [color_de(m) for m in me.materials] or [(0.5, 0.5, 0.5, 1)]
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for p in me.polygons:
        c = cols[min(p.material_index, len(cols) - 1)]
        for li in p.loop_indices: attr.data[li].color = c
    me.color_attributes.active_color = attr

# 2. reducir las piezas pesadas (cada una por separado, para no fundir piezas distintas)
for o in ms:
    t = sum(len(p.vertices) - 2 for p in o.data.polygons)
    mn, mx = C.caja([o]); meta = max(MINIMO, DENSIDAD * (mx - mn).length_squared)
    if t <= meta: continue
    k = meta / t
    if o.data.users > 1: o.data = o.data.copy()
    md = o.modifiers.new('diezmo', 'DECIMATE'); md.ratio = k; md.use_collapse_triangulate = True
for o in ms:
    for o2 in bpy.context.selected_objects: o2.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    if o.data.users > 1: o.data = o.data.copy()
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)

# 3. juntar todo en una malla con la transformación aplicada (sin padres)
for o in bpy.context.selected_objects: o.select_set(False)
for o in ms:
    o.select_set(True)
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
bpy.context.view_layer.objects.active = ms[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
barco = bpy.context.view_layer.objects.active; barco.name = 'dirigible'; barco.data.name = 'dirigible'
for o in list(esc.objects):
    if o is not barco: bpy.data.objects.remove(o)

# 4. un solo material que usa el color por vértice (doble cara: velas y aletas son planos)
mat = bpy.data.materials.new('dirigible'); mat.use_nodes = True; mat.use_backface_culling = False
nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.6; bsdf.inputs['Metallic'].default_value = 0.0
barco.data.materials.clear(); barco.data.materials.append(mat)
for p in barco.data.polygons: p.material_index = 0

# 5. orientar (proa a +Y) y centrar
bm = bmesh.new(); bm.from_mesh(barco.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
bm.to_mesh(barco.data); bm.free()
barco.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
mn, mx = C.caja([barco]); centro = (mn + mx) / 2
barco.data.transform(Matrix.Translation(-centro))
barco.data.update()
mn, mx = C.caja([barco])
C.ok('triángulos %d → %d; caja (%.2f, %.2f, %.2f)' % (antes, C.triangulos([barco]), *(mx - mn)))

# 6. exportar
for o in bpy.context.selected_objects: o.select_set(False)
barco.select_set(True)
opciones = dict(filepath=dest, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=False, export_normals=True,
                export_materials='EXPORT', export_animations=False, export_yup=True)
try:
    bpy.ops.export_scene.gltf(**opciones, export_vertex_color='ACTIVE')
except TypeError:
    bpy.ops.export_scene.gltf(**opciones)
C.ok('exportado %s (%.2f MB)' % (dest, os.path.getsize(dest) / 1048576))
out = C.carpeta(C.SALIDA, 'dirigible')
C.vistas(os.path.join(out, '02_vistas'), [barco], ('izquierda', 'frente', 'arriba', 'tres_cuartos'), color='VERTEX')
C.ok('vistas en ' + out)
