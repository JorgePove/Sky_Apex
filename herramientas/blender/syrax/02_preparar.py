"""Syrax, paso 2: normalizar el STL y sacar la versión de juego.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/02_preparar.py [-- tris]
· Alta: el STL entero (2,3 M triángulos) centrado, con los pies en el suelo (Z = 0), mirando a -Y y escalado a 34 m de envergadura
  (la del juego). Se guarda en BLENDER_PROYECTOS/Syrax/syrax_alta.blend (sirve para hornear el detalle en mapas de normales).
· Baja: la misma malla reducida a ~50 000 triángulos (o los que se pidan) → syrax_baja.blend.
· Renders de revisión en salida/syrax/: 02_baja.png (cuatro vistas) y 02_detalle.png (cabeza, ala, patas y cola, alta y baja)."""
import bpy, bmesh, os, sys, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

STL = os.path.join(C.RAIZ, 'Syrax_whole.stl')
OUT = C.carpeta(C.SALIDA, 'syrax')
PRJ = C.carpeta(C.PROYECTOS, 'Syrax')
SPAN = 34.0
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TRIS = int(args[0]) if args else 50000

C.vacia()
bpy.ops.wm.stl_import(filepath=STL, up_axis='Y', forward_axis='NEGATIVE_Z')
alta = bpy.context.selected_objects[0]; alta.name = 'syrax_alta'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = alta.data
n = len(me.vertices)
import numpy as np
co = np.empty(n * 3, dtype=np.float64); me.vertices.foreach_get('co', co); co = co.reshape(n, 3)
mn, mx = co.min(0), co.max(0)
# línea media: la X media de la parte delantera (cabeza y cuello, el 22 % más adelantado en -Y)
frente = co[co[:, 1] < mn[1] + 0.22 * (mx[1] - mn[1])]
xm = float(np.median(frente[:, 0]))
k = SPAN / float(mx[0] - mn[0])
T = Matrix.Diagonal((k, k, k, 1.0)) @ Matrix.Translation((-xm, -(mn[1] + mx[1]) / 2, -mn[2]))
me.transform(T); me.update()
co = np.empty(n * 3, dtype=np.float64); me.vertices.foreach_get('co', co); co = co.reshape(n, 3)
mn, mx = co.min(0), co.max(0)
C.ok('alta normalizada: escala %.4f, línea media en x=%.2f del STL' % (k, xm))
C.info('medidas: %.2f (envergadura) × %.2f (largo) × %.2f (alto) m;  x %.2f..%.2f  y %.2f..%.2f' % (*(mx - mn), mn[0], mx[0], mn[1], mx[1]))
# simetría: cuánto se parecen la mitad izquierda y la derecha (distancia media de una muestra reflejada a la malla)
bvh_src = alta
from mathutils.bvhtree import BVHTree
bm = bmesh.new(); bm.from_mesh(me); bvh = BVHTree.FromBMesh(bm)
muestra = co[:: max(1, n // 4000)]
d = [bvh.find_nearest(Vector((-p[0], p[1], p[2])))[3] for p in muestra]
d = np.array([x for x in d if x is not None])
C.info('simetría izquierda/derecha: distancia media %.3f m, 90 %% < %.3f m, máx %.2f m' % (d.mean(), np.percentile(d, 90), d.max()))
bm.free()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PRJ, 'syrax_alta.blend'))
C.ok('guardado ' + os.path.join(PRJ, 'syrax_alta.blend'))

# versión baja
t0 = time.time()
baja = alta.copy(); baja.data = alta.data.copy(); baja.name = 'syrax_baja'; bpy.context.scene.collection.objects.link(baja)
m = baja.modifiers.new('reducir', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = TRIS / len(me.polygons); m.use_collapse_triangulate = True
bpy.context.view_layer.objects.active = baja
for o in bpy.context.selected_objects: o.select_set(False)
baja.select_set(True)
bpy.ops.object.modifier_apply(modifier='reducir')
bm = bmesh.new(); bm.from_mesh(baja.data)
malas = sum(1 for e in bm.edges if not e.is_manifold); sueltos = sum(1 for v in bm.verts if not v.link_faces)
bm.free()
C.ok('baja: %d triángulos, %d vértices (%.1f s); aristas no manifold %d, vértices sueltos %d' % (len(baja.data.polygons), len(baja.data.vertices), time.time() - t0, malas, sueltos))
for p in baja.data.polygons: p.use_smooth = True
bpy.data.objects.remove(alta)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PRJ, 'syrax_baja.blend'))
C.ok('guardado ' + os.path.join(PRJ, 'syrax_baja.blend'))

# renders de la baja
C.vistas(os.path.join(OUT, '02_baja'), [baja], nombres=('frente', 'izquierda', 'arriba', 'tres_cuartos'), color='SINGLE')
C.ok('vistas: ' + os.path.join(OUT, '02_baja.png'))
