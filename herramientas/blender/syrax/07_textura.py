"""Syrax, paso 7: UV y texturas horneadas (en la pose de pie, la que coincide con la malla alta).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/07_textura.py [-- 2048]
· UV automáticas (Smart UV Project) en la malla baja del esqueleto.
· Color procedural en la malla alta (por vértice): oro en el lomo, crema en el vientre, ámbar en las membranas, bronce en la cresta,
  garras oscuras y dientes y cuernos de marfil, con manchas suaves. Se hornea con Cycles (RTX 2060) a la baja: color, normales
  (el detalle esculpido de 2,3 M triángulos) y oclusión ambiental; color final = color × oclusión.
· Material para el juego (Principled: color + normales) y texturas en BLENDER_PROYECTOS/Syrax/texturas/. Guarda syrax_rig.blend."""
import bpy, os, sys, math, time
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

PRJ = os.path.join(C.PROYECTOS, 'Syrax'); TEX = C.carpeta(PRJ, 'texturas'); OUT = C.carpeta(C.SALIDA, 'syrax')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RES = int(args[0]) if args else 2048
bpy.ops.wm.open_mainfile(filepath=os.path.join(PRJ, 'syrax_rig.blend'))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); baja = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
arm.data.pose_position = 'REST'
esc = bpy.context.scene

# ---------- UV ----------
t0 = time.time()
for o in bpy.context.selected_objects: o.select_set(False)
baja.select_set(True); bpy.context.view_layer.objects.active = baja
while baja.data.uv_layers: baja.data.uv_layers.remove(baja.data.uv_layers[0])
baja.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.002, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
bpy.ops.uv.pack_islands(rotate=True, margin=0.002)
bpy.ops.object.mode_set(mode='OBJECT')
C.ok('UV en %.1f s' % (time.time() - t0))

# ---------- malla alta con el color por vértice ----------
with bpy.data.libraries.load(os.path.join(PRJ, 'syrax_alta.blend')) as (src, dst): dst.objects = ['syrax_alta']
alta = dst.objects[0]; esc.collection.objects.link(alta)
me = alta.data; n = len(me.vertices)
CO = np.empty(n * 3); me.vertices.foreach_get('co', CO); CO = CO.reshape(n, 3)
NO = np.empty(n * 3); me.vertices.foreach_get('normal', NO); NO = NO.reshape(n, 3)
E = np.empty(len(me.edges) * 2, dtype=np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
t0 = time.time()
# grosor: distancia hacia dentro (contra la normal) hasta la otra cara
bvh = BVHTree.FromPolygons([tuple(v) for v in CO], [tuple(p.vertices) for p in me.polygons])
G = np.full(n, 9.0)
paso = 1                                                       # (todos los vértices; tarda ~20 s)
for i in range(0, n, paso):
    p = Vector(CO[i]); d = -Vector(NO[i])
    h = bvh.ray_cast(p + d * 0.003, d, 3.0)
    if h[0] is not None: G[i] = h[3] + 0.003
C.ok('grosor en %.1f s (mediana %.2f m; membrana < 0,2 m: %.0f %%)' % (time.time() - t0, np.median(G), 100 * (G < 0.2).mean()))
# curvatura: cuánto difiere la normal de cada vértice de la de sus vecinos (púas, garras, dientes, cuernos)
dot = (NO[E[:, 0]] * NO[E[:, 1]]).sum(1)
K = np.zeros(n); cnt = np.zeros(n)
np.add.at(K, E[:, 0], 1 - dot); np.add.at(K, E[:, 1], 1 - dot); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
K = K / np.maximum(cnt, 1)
for _ in range(2):                                             # suavizado (dos pasadas por las aristas)
    S = np.zeros(n); np.add.at(S, E[:, 0], K[E[:, 1]]); np.add.at(S, E[:, 1], K[E[:, 0]]); K = 0.5 * K + 0.5 * S / np.maximum(cnt, 1)
x, y, z = CO[:, 0], CO[:, 1], CO[:, 2]; nz = NO[:, 2]


def mezcla(a, b, t): t = np.clip(t, 0, 1)[:, None]; return a * (1 - t) + b * t


def suave(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


ORO = np.array([0.78, 0.52, 0.12]); BRONCE = np.array([0.36, 0.20, 0.05]); CREMA = np.array([0.92, 0.80, 0.50])
AMBAR = np.array([0.80, 0.46, 0.14]); MARFIL = np.array([0.88, 0.82, 0.66]); UNA = np.array([0.10, 0.08, 0.07])
col = mezcla(np.tile(CREMA, (n, 1)), np.tile(ORO, (n, 1)), suave(-0.45, 0.25, nz))          # vientre crema → lomo oro
cresta = suave(0.9, 0.3, np.abs(x)) * suave(0.35, 0.8, nz) * suave(4.8, 6.2, z) * (y < 3)       # línea del lomo
col = mezcla(col, np.tile(BRONCE, (n, 1)), cresta * 0.85)
memb = suave(0.24, 0.12, G) * suave(0.08, 0.03, K)                                            # fina y lisa: membrana
col = mezcla(col, mezcla(np.tile(AMBAR, (n, 1)), np.tile(BRONCE * 1.4, (n, 1)), suave(-0.2, 0.6, nz) * 0.5), memb)
punta = suave(0.06, 0.16, K) * suave(0.45, 0.2, G)                                           # puntas finas y curvas
cabeza = suave(-13.5, -14.5, y)
col = mezcla(col, np.where((cabeza > 0.5)[:, None], MARFIL, BRONCE * 0.8), punta * 0.9)
col = mezcla(col, np.tile(UNA, (n, 1)), punta * suave(0.6, 0.25, z))                          # garras en el suelo
manchas = 0.5 + 0.25 * np.sin(x * 1.7 + np.sin(y * 0.9) * 2) * np.sin(y * 1.3 + np.sin(z * 1.1) * 2) + 0.25 * np.sin((x + y + z) * 4.1)
col *= (0.82 + 0.3 * manchas)[:, None]
ca = me.color_attributes.new('col_syrax', 'FLOAT_COLOR', 'POINT')
ca.data.foreach_set('color', np.hstack([np.clip(col, 0, 1), np.ones((n, 1))]).astype(np.float32).ravel())
C.ok('color por vértice en la malla alta')

me.color_attributes.active_color = ca; me.color_attributes.render_color_index = me.color_attributes.active_color_index
# material de la alta: difuso con el color del vértice (se hornea solo su color: DIFFUSE con el filtro COLOR)
ma = bpy.data.materials.new('alta_color'); ma.use_nodes = True; nt = ma.node_tree
for nd in list(nt.nodes): nt.nodes.remove(nd)
at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'col_syrax'
df = nt.nodes.new('ShaderNodeBsdfDiffuse'); outn = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(at.outputs['Color'], df.inputs['Color']); nt.links.new(df.outputs['BSDF'], outn.inputs['Surface'])
alta.data.materials.clear(); alta.data.materials.append(ma)

# ---------- material de la baja (el del juego) y las imágenes donde se hornea ----------
def imagen(nombre, color):
    im = bpy.data.images.get(nombre) or bpy.data.images.new(nombre, RES, RES, alpha=False, float_buffer=False)
    if im.size[0] != RES: im.scale(RES, RES)
    im.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    return im
ims = {k: imagen('syrax_' + k, k == 'color') for k in ('color', 'normal', 'ao')}
mb = bpy.data.materials.new('syrax_piel'); mb.use_nodes = True; nt = mb.node_tree
bsdf = nt.nodes.get('Principled BSDF')
nodos = {}
for k, im in ims.items():
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = im; nodos[k] = tn
nm = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(nodos['color'].outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(nodos['normal'].outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.62
baja.data.materials.clear(); baja.data.materials.append(mb)

# ---------- horneado (Cycles, RTX 2060) ----------
esc.render.engine = 'CYCLES'
try:
    cy = bpy.context.preferences.addons['cycles'].preferences; cy.compute_device_type = 'OPTIX'
    try: cy.refresh_devices()
    except AttributeError: cy.get_devices()
    for d in cy.devices: d.use = d.type == 'OPTIX'
    esc.cycles.device = 'GPU'
except Exception as e:
    C.aviso('sin GPU para Cycles: %s' % e)
esc.render.bake.use_selected_to_active = True
esc.render.bake.cage_extrusion = 0.12
esc.render.bake.max_ray_distance = 0.4
esc.render.bake.margin = 6
if esc.world is None: esc.world = bpy.data.worlds.new('mundo')
esc.world.light_settings.distance = 0.6
for o in bpy.context.selected_objects: o.select_set(False)
alta.select_set(True); baja.select_set(True); bpy.context.view_layer.objects.active = baja
for k, tipo, muestras in (('normal', 'NORMAL', 1), ('color', 'DIFFUSE', 1), ('ao', 'AO', 48)):
    nt.nodes.active = nodos[k]; esc.cycles.samples = muestras
    t0 = time.time()
    if tipo == 'DIFFUSE': bpy.ops.object.bake(type=tipo, pass_filter={'COLOR'})
    else: bpy.ops.object.bake(type=tipo)
    C.ok('horneado %s en %.1f s' % (k, time.time() - t0))

# color final = color × oclusión (suave); guardar
px = np.empty(RES * RES * 4, dtype=np.float32); ims['color'].pixels.foreach_get(px); px = px.reshape(-1, 4)
ao = np.empty(RES * RES * 4, dtype=np.float32); ims['ao'].pixels.foreach_get(ao); ao = ao.reshape(-1, 4)[:, :1]
px[:, :3] *= 0.3 + 0.7 * np.power(np.clip(ao, 0, 1), 1.2)
ims['color'].pixels.foreach_set(px.ravel())
for k, im in ims.items():
    im.filepath_raw = os.path.join(TEX, 'syrax_%s.png' % k); im.file_format = 'PNG'; im.save()
    im.filepath = im.filepath_raw
C.ok('texturas en ' + TEX)
nt.nodes.remove(nodos['ao']); nt.nodes.active = nodos['color']
bpy.data.objects.remove(alta); bpy.data.materials.remove(ma)
arm.data.pose_position = 'POSE'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PRJ, 'syrax_rig.blend'))
C.ok('guardado ' + os.path.join(PRJ, 'syrax_rig.blend'))
# vista previa: el color sobre la malla (Workbench, textura)
arm.hide_render = True
C.vistas(os.path.join(OUT, '07_textura'), [baja], nombres=('frente', 'izquierda', 'arriba', 'tres_cuartos'), color='TEXTURE', ancho=900, alto=520)
C.ok(os.path.join(OUT, '07_textura.png'))
