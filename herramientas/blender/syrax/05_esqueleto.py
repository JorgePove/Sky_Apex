"""Syrax, paso 5: crea el esqueleto (puntos.py), lo une a la malla baja con pesos automáticos y prueba poses.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/05_esqueleto.py
Guarda BLENDER_PROYECTOS/Syrax/syrax_rig.blend y, en salida/syrax/: 05_pesos.png (cada vértice con el color de su hueso principal) y
05_poses.png (poses de prueba: alas arriba y abajo, cuello girado con la boca cerrada, cola y patas dobladas)."""
import bpy, os, sys, json, math, colorsys
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comun as C
import puntos as PT

OUT = C.carpeta(C.SALIDA, 'syrax')
PRJ = os.path.join(C.PROYECTOS, 'Syrax')
bpy.ops.wm.open_mainfile(filepath=os.path.join(PRJ, 'syrax_baja.blend'))
malla = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for o in bpy.context.scene.objects:
    if o.type != 'MESH': bpy.data.objects.remove(o)
# limpieza: la reducción deja vértices repetidos y triángulos degenerados, y con ellos los pesos automáticos fallan en toda la malla
import bmesh
bm = bmesh.new(); bm.from_mesh(malla.data); a = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.002)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(malla.data); bm.free()
C.ok('malla limpia: %d → %d vértices, %d triángulos' % (a, len(malla.data.vertices), len(malla.data.polygons)))


def remuestrear(pol, n):
    """n+1 puntos a igual distancia a lo largo de una polilínea."""
    P = [Vector(p) for p in pol]; L = [0.0]
    for a, b in zip(P, P[1:]): L.append(L[-1] + (b - a).length)
    out = []
    for i in range(n + 1):
        s = L[-1] * i / n; k = max(j for j in range(len(L)) if L[j] <= s + 1e-9); k = min(k, len(P) - 2)
        t = (s - L[k]) / max(L[k + 1] - L[k], 1e-9); out.append(P[k].lerp(P[k + 1], min(max(t, 0), 1)))
    return out


# ---------- huesos ----------
H = []   # (nombre, cabeza, cola, padre, conectado, eje Z de referencia para el giro sobre sí mismo)
UP, FWD = (0, 0, 1), (0, -1, 0)
for n, (h, t, p, c) in PT.TRONCO.items(): H.append((n, h, t, p, c, FWD if n == 'root' else UP))
cu = PT.CUELLO
for i in range(len(cu) - 1): H.append(('neck_%02d' % (i + 1), cu[i], cu[i + 1], 'spine_02' if i == 0 else 'neck_%02d' % i, True, UP))
H.append(('head', PT.HEAD[0], PT.HEAD[1], 'neck_%02d' % (len(cu) - 1), True, UP))
H.append(('jaw', PT.JAW[0], PT.JAW[1], 'head', False, UP))
cola = json.load(open(os.path.join(OUT, 'puntos.json')))['tubos']['cola']
cp = remuestrear(PT.COLA_INICIO + [tuple(p) for p in cola], PT.COLA_HUESOS)
for i in range(PT.COLA_HUESOS): H.append(('tail_%02d' % (i + 1), cp[i], cp[i + 1], 'pelvis' if i == 0 else 'tail_%02d' % i, i > 0, UP))
for s, A in PT.ALAS.items():
    sx = 1 if s == 'L' else -1
    # normal de la membrana (para el giro de los dedos): perpendicular a los dedos 2 y 4
    nud = Vector(A['nudillo']); nm = (Vector(A['f2'][-1]) - nud).cross(Vector(A['f4'][-1]) - nud).normalized()
    if nm.x * sx < 0: nm = -nm
    H += [('clavicle.' + s, A['clav'], A['hombro'], 'spine_02', False, UP), ('upperarm.' + s, A['hombro'], A['codo'], 'clavicle.' + s, True, UP),
          ('forearm.' + s, A['codo'], A['muneca'], 'upperarm.' + s, True, tuple(nm)), ('hand.' + s, A['muneca'], A['nudillo'], 'forearm.' + s, True, tuple(nm)),
          ('thumb.' + s, A['nudillo'], A['pulgar'], 'hand.' + s, False, UP)]
    for f in ('f1', 'f2', 'f3', 'f4'):
        pts = [A['nudillo']] + A[f]
        for i in range(len(pts) - 1):
            H.append(('%s_%02d.%s' % (f, i + 1, s), pts[i], pts[i + 1], 'hand.' + s if i == 0 else '%s_%02d.%s' % (f, i, s), i > 0, tuple(nm)))
for s, P in PT.PATAS.items():
    H += [('thigh.' + s, P['cadera'], P['rodilla'], 'pelvis', False, FWD), ('shin.' + s, P['rodilla'], P['tobillo'], 'thigh.' + s, True, FWD),
          ('foot.' + s, P['tobillo'], P['bola'], 'shin.' + s, True, FWD), ('toes.' + s, P['bola'], P['dedos'], 'foot.' + s, True, UP)]

ad = bpy.data.armatures.new('syrax_rig'); arm = bpy.data.objects.new('syrax_rig', ad)
bpy.context.scene.collection.objects.link(arm)
ad.display_type = 'STICK'
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for n, h, t, p, c, z in H:
    eb = ad.edit_bones.new(n); eb.head = Vector(h); eb.tail = Vector(t)
    if p: eb.parent = ad.edit_bones[p]; eb.use_connect = c and (ad.edit_bones[p].tail - eb.head).length < 1e-4
    zz = Vector(z); d = (eb.tail - eb.head).normalized()
    if abs(zz.dot(d)) > 0.95: zz = Vector(FWD) if abs(Vector(FWD).dot(d)) < 0.95 else Vector((1, 0, 0))
    eb.align_roll(zz)
    eb.use_deform = n != 'root'
bpy.ops.object.mode_set(mode='OBJECT')
C.ok('esqueleto: %d huesos (%d deforman)' % (len(ad.bones), sum(1 for b in ad.bones if b.use_deform)))
largos = {b.name: b.length for b in ad.bones}
for a, b in (('upperarm.L', 'upperarm.R'), ('forearm.L', 'forearm.R'), ('thigh.L', 'thigh.R'), ('shin.L', 'shin.R'), ('f4_01.L', 'f4_01.R')):
    C.info('largo %-11s %.2f m   %-11s %.2f m' % (a, largos[a], b, largos[b]))

# ---------- pesos automáticos (difusión de calor) ----------
for o in bpy.context.selected_objects: o.select_set(False)
malla.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
me = malla.data; nv = len(me.vertices)
grupos = {g.index: g.name for g in malla.vertex_groups}
W = np.zeros((nv, len(grupos)), dtype=np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
tot = W.sum(1); sin = int((tot < 1e-6).sum())
C.ok('pesos automáticos: %d vértices sin peso de %d' % (sin, nv))
if sin:   # respaldo: el hueso que deforma más cercano (distancia al segmento)
    segs = [(grupos[i], Vector(ad.bones[grupos[i]].head_local), Vector(ad.bones[grupos[i]].tail_local)) for i in grupos if ad.bones[grupos[i]].use_deform]
    def dseg(p, a, b):
        ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (a + ab * t - p).length
    for i in np.nonzero(tot < 1e-6)[0]:
        p = me.vertices[i].co; n, _, _ = min(segs, key=lambda s: dseg(p, s[1], s[2]))
        malla.vertex_groups[n].add([int(i)], 1.0, 'REPLACE')
    C.info('asignados al hueso más cercano')
cuenta = {grupos[j]: int((W.argmax(1) == j).sum()) for j in grupos}
C.info('vértices por hueso principal: ' + ', '.join('%s %d' % kv for kv in sorted(cuenta.items(), key=lambda kv: -kv[1])[:40]))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PRJ, 'syrax_rig.blend'))
C.ok('guardado ' + os.path.join(PRJ, 'syrax_rig.blend'))

# ---------- mapa de pesos: color del hueso principal ----------
W = np.zeros((nv, len(malla.vertex_groups)), dtype=np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
pal = {}
for i, g in enumerate(malla.vertex_groups):
    h = (i * 0.61803) % 1.0; pal[g.index] = colorsys.hsv_to_rgb(h, 0.75, 0.95)
ca = me.color_attributes.new('hueso', 'FLOAT_COLOR', 'POINT')
cols = np.array([pal[j] + (1,) for j in W.argmax(1)], dtype=np.float32)
ca.data.foreach_set('color', cols.ravel())
me.color_attributes.active_color = ca
arm.hide_render = True
C.vistas(os.path.join(OUT, '05_pesos'), [malla], nombres=('arriba', 'frente', 'izquierda', 'tres_cuartos'), color='VERTEX')
me.color_attributes.remove(ca)
C.ok('mapa de pesos: ' + os.path.join(OUT, '05_pesos.png'))

# ---------- poses de prueba ----------
def girar(n, eje, grados):
    pb = arm.pose.bones[n]; M = pb.matrix.copy(); o = M.translation.copy()
    pb.matrix = Matrix.Translation(o) @ Matrix.Rotation(math.radians(grados), 4, Vector(eje)) @ Matrix.Translation(-o) @ M
    bpy.context.view_layer.update()


def reposo():
    for pb in arm.pose.bones: pb.matrix_basis = Matrix()
    bpy.context.view_layer.update()


POSES = {
    'alas_arriba': [('upperarm.L', (0, 1, 0), -35), ('upperarm.R', (0, 1, 0), 35)],
    'alas_abajo': [('upperarm.L', (0, 1, 0), 30), ('upperarm.R', (0, 1, 0), -30), ('forearm.L', (0, 1, 0), 15), ('forearm.R', (0, 1, 0), -15)],
    'cuello_boca': [('neck_02', (0, 0, 1), 12), ('neck_03', (0, 0, 1), 12), ('neck_04', (0, 0, 1), 12), ('head', (0, 0, 1), 10), ('jaw', (1, 0, 0), -38)],
    'cola_patas': [('tail_06', (0, 0, 1), 25), ('tail_09', (0, 0, 1), 25), ('tail_12', (0, 0, 1), 25), ('thigh.L', (1, 0, 0), 35), ('shin.L', (1, 0, 0), -50), ('thigh.R', (1, 0, 0), -25)],
}
rutas = []
for nombre, giros in POSES.items():
    reposo()
    for n, e, g in giros: girar(n, e, g)
    r = os.path.join(OUT, '05_pose_' + nombre + '.png')
    C.foto(r, [malla], (1.0, -1.3, 0.7), 800, 450, color='SINGLE'); rutas.append(r)
reposo()
C.hoja(rutas, os.path.join(OUT, '05_poses.png'), 2)
for r in rutas: os.remove(r)
C.ok('poses: ' + os.path.join(OUT, '05_poses.png'))
