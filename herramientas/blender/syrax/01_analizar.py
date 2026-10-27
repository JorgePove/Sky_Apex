"""Syrax, paso 1: importar el STL de impresión 3D y analizarlo (sin cambiar nada).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/01_analizar.py
Escribe en herramientas/blender/salida/syrax/: 01_vistas.png (frente, izquierda, arriba, 3/4) y un informe en la consola:
triángulos, vértices soldados, medidas, piezas sueltas (con su tamaño y centro) y aristas abiertas."""
import bpy, bmesh, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

STL = os.path.join(C.RAIZ, 'Syrax_whole.stl')
OUT = C.carpeta(C.SALIDA, 'syrax')

C.vacia()
t0 = time.time()
bpy.ops.wm.stl_import(filepath=STL, up_axis='Y', forward_axis='NEGATIVE_Z')
ob = bpy.context.selected_objects[0]; ob.name = 'syrax_stl'
me = ob.data
C.ok('importado en %.1f s: %d triángulos, %d vértices' % (time.time() - t0, len(me.polygons), len(me.vertices)))
mn, mx = C.caja([ob])
C.info('medidas (X ancho, Y largo, Z alto): %.1f × %.1f × %.1f   min %s   max %s' % (*(mx - mn), tuple(round(v, 1) for v in mn), tuple(round(v, 1) for v in mx)))

# soldar vértices repetidos (sopa de triángulos) en una copia para contar piezas
t0 = time.time()
bm = bmesh.new(); bm.from_mesh(me)
antes = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
C.ok('soldado en %.1f s: %d → %d vértices' % (time.time() - t0, antes, len(bm.verts)))
abiertas = sum(1 for e in bm.edges if not e.is_manifold)
C.info('aristas no «manifold» (abiertas o con más de 2 caras): %d de %d' % (abiertas, len(bm.edges)))

# piezas sueltas
t0 = time.time()
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
visto = bytearray(len(bm.verts)); piezas = []
for v0 in bm.verts:
    if visto[v0.index]: continue
    pila = [v0]; visto[v0.index] = 1; idx = []
    while pila:
        v = pila.pop(); idx.append(v.index)
        for e in v.link_edges:
            w = e.other_vert(v)
            if not visto[w.index]: visto[w.index] = 1; pila.append(w)
    piezas.append(idx)
piezas.sort(key=len, reverse=True)
C.ok('%d piezas sueltas (%.1f s)' % (len(piezas), time.time() - t0))
for k, p in enumerate(piezas[:15]):
    co = [bm.verts[i].co for i in p[:: max(1, len(p) // 400)]]
    cx = sum(c.x for c in co) / len(co); cy = sum(c.y for c in co) / len(co); cz = sum(c.z for c in co) / len(co)
    C.info('pieza %2d: %8d vértices  centro (%.1f, %.1f, %.1f)' % (k, len(p), cx, cy, cz))
if len(piezas) > 15: C.info('… y %d piezas más con %d vértices en total' % (len(piezas) - 15, sum(len(p) for p in piezas[15:])))
bm.free()

C.vistas(os.path.join(OUT, '01_vistas'), [ob], nombres=('frente', 'izquierda', 'arriba', 'tres_cuartos'), color='SINGLE')
C.ok('vistas: ' + os.path.join(OUT, '01_vistas.png'))
