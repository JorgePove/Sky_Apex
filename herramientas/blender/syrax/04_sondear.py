"""Syrax, paso 4: calcula en la malla alta los puntos de puntos.py (rayos y tubos) y los guarda en salida/syrax/puntos.json.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/04_sondear.py
Para cada rayo escribe todos los tramos de malla que atraviesa (entrada → salida) y cuál elige; para cada tubo, su recorrido con el
radio medido. Después, 03_rejillas.py dibuja estos puntos sobre las vistas (cruces y líneas) para revisarlos."""
import bpy, os, sys, json
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comun as C
import puntos as PT

OUT = C.carpeta(C.SALIDA, 'syrax')
bpy.ops.wm.open_mainfile(filepath=os.path.join(C.PROYECTOS, 'Syrax', 'syrax_alta.blend'))
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
me = ob.data
n = len(me.vertices)
CO = np.empty(n * 3, dtype=np.float64); me.vertices.foreach_get('co', CO); CO = CO.reshape(n, 3)
verts = [tuple(v) for v in CO]
polys = [tuple(p.vertices) for p in me.polygons]
bvh = BVHTree.FromPolygons(verts, polys)
C.ok('malla alta: %d vértices' % n)


def tramos(o, d):
    """Todos los tramos (entrada, salida) a lo largo del rayo o + t·d."""
    hits, t, p = [], 0.0, Vector(o)
    while True:
        h = bvh.ray_cast(p, d, 200.0)
        if h[0] is None: break
        t = (h[0] - Vector(o)).dot(d); hits.append(t); p = h[0] + d * 1e-4
        if len(hits) > 60: break
    return [(hits[i], hits[i + 1]) for i in range(0, len(hits) - 1, 2)]


def resolver(nombre, spec):
    tipo = spec[0]
    if tipo == 'P': return Vector(spec[1:4])
    a, b, aprox = spec[1:4]
    if tipo == 'F': o, d, eje = Vector((a, -40, b)), Vector((0, 1, 0)), 1
    elif tipo == 'T': o, d, eje = Vector((a, b, 40)), Vector((0, 0, -1)), 2
    else: o, d, eje = Vector((-40, a, b)), Vector((1, 0, 0)), 0
    tr = tramos(o, d)
    if not tr:
        C.aviso('%s: el rayo no toca la malla (%s)' % (nombre, spec)); return None
    centros = [((o + d * ((t0 + t1) / 2))[eje], abs(t1 - t0)) for t0, t1 in tr]
    k = min(range(len(centros)), key=lambda i: abs(centros[i][0] - aprox))
    p = o + d * ((tr[k][0] + tr[k][1]) / 2)
    C.info('%-14s %s → tramos %s → elijo %d: (%.2f, %.2f, %.2f) grosor %.2f' % (nombre, tipo, ', '.join('%.2f[%.2f]' % c for c in centros), k, p.x, p.y, p.z, centros[k][1]))
    return p


def corte(q, d, radio, grosor):
    """Centro y radio del corte de la malla alrededor de q, perpendicular a d (losa de ese grosor y radio)."""
    rel = CO - np.array(q); a = rel @ np.array(d)
    m = (np.abs(a) < grosor / 2) & (np.einsum('ij,ij->i', rel, rel) < radio * radio)
    if m.sum() < 12: return None, 0, 0
    c = (CO[m].min(0) + CO[m].max(0)) / 2                       # centro del contorno (la media se iría hacia las escamas densas)
    r = float(np.sqrt(((CO[m] - c) ** 2).sum(1)).mean())
    return Vector(c), r, int(m.sum())


def trazar(nombre, semilla, dir, paso, radio, n, hasta_y=None, radio_fin=None):
    d = Vector(dir).normalized(); p = Vector(semilla)
    c, r, k = corte(p, d, radio, paso)
    if c is not None: p = c
    pts, rs, rad = [p], [r], radio
    for i in range(n):
        q = p + d * paso
        c, r, k = corte(q, d, rad, paso)
        if c is None: break
        if rs[-1] and r > rs[-1] * 2.2 and i > 2: C.info('%s: el corte se ensancha (%.2f → %.2f): paro' % (nombre, rs[-1], r)); break
        nd = (c - p).normalized(); d = (d * 0.4 + nd * 0.6).normalized(); p = c
        pts.append(p); rs.append(r)
        if radio_fin is not None: rad = max(radio_fin, min(radio, 2.4 * r))
        if hasta_y is not None and p.y < hasta_y: break
    C.info('%s: %d puntos' % (nombre, len(pts)))
    for p, r in zip(pts, rs): C.info('    (%.2f, %.2f, %.2f)  r %.2f' % (p.x, p.y, p.z, r))
    return [list(p) for p in pts], rs


res = {'ala': {}, 'tubos': {}, 'tronco': {}}
for lado, A in PT.ALA.items():
    R = {}
    for k in ('hombro', 'codo', 'muneca', 'nudillo', 'pulgar'):
        p = resolver(k + '.' + lado, A[k]); R[k] = list(p) if p else None
    for f in ('f1', 'f2', 'f3', 'f4'):
        R[f] = [list(p) if p else None for p in (resolver('%s_%d.%s' % (f, i + 1, lado), s) for i, s in enumerate(A[f]))]
    res['ala'][lado] = R
for k, s in PT.CABEZA.items(): res['tronco'][k] = list(resolver(k, s))
for k, q in (('cadera', PT.CADERA), ('pecho', PT.PECHO)):
    c, r, m = corte(Vector(q), Vector((0, 1, 0)), 3.0, 0.6)
    C.info('%s: centro del corte (%.2f, %.2f, %.2f), radio medio %.2f (%d vértices)' % (k, c.x, c.y, c.z, r, m))
    res['tronco'][k] = list(c)
for k, t in PT.TUBOS.items():
    res['tubos'][k], _ = trazar(k, **t)
json.dump(res, open(os.path.join(OUT, 'puntos.json'), 'w'), indent=1)
C.ok('guardado ' + os.path.join(OUT, 'puntos.json'))
