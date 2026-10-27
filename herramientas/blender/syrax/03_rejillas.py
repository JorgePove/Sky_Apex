"""Syrax, paso 3: vistas ortográficas con rejilla métrica (para colocar los huesos) y, si existe, el esqueleto marcado encima.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/03_rejillas.py [-- zona ...]
zonas: general (arriba, frente, izquierda), cabeza, ala, patas, cola. Salida en salida/syrax/03_<zona>_<vista>.png.
Si hay un esqueleto (syrax_rig.blend), marca sus articulaciones con cruces: rojo = lado izquierdo (+X), azul = derecho, amarillo = centro."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

OUT = C.carpeta(C.SALIDA, 'syrax')
PRJ = os.path.join(C.PROYECTOS, 'Syrax')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
rig = os.path.join(PRJ, 'syrax_rig.blend')
bpy.ops.wm.open_mainfile(filepath=rig if os.path.exists(rig) and 'sin_huesos' not in args else os.path.join(PRJ, 'syrax_baja.blend'))
malla = [o for o in bpy.context.scene.objects if o.type == 'MESH']
arm = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
marcas = []
if arm:
    arm.data.pose_position = 'REST'
    for b in arm.data.bones:
        p = arm.matrix_world @ b.head_local
        col = (1, 0.15, 0.15) if b.name.endswith('.L') else (0.25, 0.5, 1) if b.name.endswith('.R') else (1, 1, 0.2)
        marcas.append((p.x, p.y, p.z, col))
        if not b.children:
            q = arm.matrix_world @ b.tail_local; marcas.append((q.x, q.y, q.z, (0.3, 1, 0.3)))
    arm.hide_render = True

ZONAS = {
    'general': [('arriba', -18, 18, -18.5, 18.5, 40), ('frente', -18, 18, -0.5, 11.5, 40), ('izquierda', -18.5, 18.5, -0.5, 11.5, 40)],
    'cabeza': [('izquierda', -18.5, -5, -0.5, 11.5, 90), ('arriba', -5, 5, -18.5, -5, 90), ('frente', -5, 5, -0.5, 11.5, 90)],
    'ala': [('arriba', 0, 18, -14, 12, 70), ('frente', 0, 18, -0.5, 11.5, 70), ('arriba', -18, 0, -14, 12, 70)],
    'ala_d': [('frente', -18, 0, -0.5, 11.5, 70)],
    'patas': [('izquierda', -8, 8, -0.5, 8, 90), ('frente', -6, 6, -0.5, 8, 90), ('arriba', -6, 6, -8, 8, 90)],
    'cola': [('arriba', -10, 10, -2, 18.5, 60), ('izquierda', -2, 18.5, -0.5, 11, 60)],
    # recortes (solo los vértices dentro de la caja): las patas sin la membrana delante, el tronco sin las alas
    'pierna_L': [('derecha', -7.5, 2, -0.2, 5.5, 100, ((0.4, 3.6), (-8, 2), (-1, 6)))],
    'pies': [('arriba', -4, 4, -7, 3, 100, ((-4, 4), (-7, 3), (-1, 1.6)))],
    'pierna_R': [('izquierda', -4, 4, -0.2, 5.5, 110, ((-3.6, -0.6), (-4, 4), (-1, 6)))],
    'piernas_frente': [('frente', -4, 4, -0.2, 5.5, 110, ((-4, 4), (-1.5, 3.0), (-1, 6)))],
    'tronco': [('izquierda', -18.5, 6, -0.5, 9, 60, ((-1.2, 1.2), (-19, 7), (-1, 12)))],
}
import json, bmesh
pj = os.path.join(OUT, 'puntos.json')
if not arm and os.path.exists(pj):                             # sin esqueleto: los puntos calculados por 04_sondear.py
    P = json.load(open(pj))
    def m(p, col):
        if p: marcas.append((p[0], p[1], p[2], col))
    for lado, A in P['ala'].items():
        col = (1, 0.15, 0.15) if lado == 'L' else (0.25, 0.5, 1)
        for k in ('hombro', 'codo', 'muneca', 'nudillo', 'pulgar'): m(A.get(k), col)
        for f in ('f1', 'f2', 'f3', 'f4'):
            for p in A[f]: m(p, col)
    for p in P['tronco'].values(): m(p, (1, 1, 0.2))
    for t in P['tubos'].values():
        for p in t: m(p, (0.3, 1, 0.3))


def recorte(caja):
    """Copia de la malla con solo los vértices dentro de la caja ((x0, x1), (y0, y1), (z0, z1))."""
    o = malla[0]; c = o.copy(); c.data = o.data.copy(); bpy.context.scene.collection.objects.link(c)
    bm = bmesh.new(); bm.from_mesh(c.data)
    (x0, x1), (y0, y1), (z0, z1) = caja
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (x0 <= v.co.x <= x1 and y0 <= v.co.y <= y1 and z0 <= v.co.z <= z1)], context='VERTS')
    bm.to_mesh(c.data); bm.free()
    for x in malla: x.hide_render = True
    return c


for z in (args and [a for a in args if a in ZONAS]) or ['general']:
    for k, v in enumerate(ZONAS[z]):
        vista, u0, u1, v0, v1, ppm = v[:6]
        objs, tmp = malla, None
        if len(v) > 6: tmp = recorte(v[6]); objs = [tmp]
        r = os.path.join(OUT, '03_%s_%d_%s.png' % (z, k, vista))
        C.ortho_rejilla(r, objs, vista, u0, u1, v0, v1, ppm=ppm, paso=1.0, etiquetas=5.0 if ppm < 80 else 1.0, marcas=marcas)
        if tmp:
            bpy.data.objects.remove(tmp)
            for x in malla: x.hide_render = False
        C.ok(r)
