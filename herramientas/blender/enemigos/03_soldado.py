"""Enemigos nuevos (v29), paso 3: soldado y hechicero low-poly hechos desde cero, para repetirse cientos de veces (InstancedMesh).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/enemigos/03_soldado.py
Escribe modelos/soldado.glb con dos mallas: «soldado» (caballero con yelmo, sobreveste, escudo y lanza; ~1,9 m) y «hechicero» (túnica,
capucha y báculo con un orbe; ~2 m). Sin texturas: color por vértice. La primera coordenada UV guarda la pieza (u) para animarla en el
shader del juego: 0 cuerpo, 1 brazo derecho y lanza (o báculo), 2 brazo izquierdo y escudo, 3 pierna izquierda, 4 pierna derecha,
5 orbe (brilla). Frente hacia +Y de Blender (-Z en el juego), pies en Z = 0."""
import bpy, bmesh, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C
from mathutils import Matrix, Vector


def lin(h):                                   # color sRGB (hex) → lineal (Blender guarda los colores por vértice en lineal)
    return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)) + (1.0,)


ACERO, ACERO_OSC, TELA, TELA_OSC, ORO, MADERA, PIEL = lin('9aa0a8'), lin('5d636c'), lin('8c1c1c'), lin('5a1010'), lin('d8a640'), lin('6b4a2b'), lin('c89a78')
TUNICA, TUNICA_OSC, ORBE = lin('3b1f5c'), lin('22123a'), lin('f2d8ff')


class Pieza:
    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new('Col')
        self.uv = self.bm.loops.layers.uv.new('UVMap')

    def _pinta(self, caras, color, parte):
        for f in caras:
            for l in f.loops:
                l[self.col] = color; l[self.uv].uv = (parte, 0.0)

    def caja(self, cx, cy, cz0, sx, sy, sz, color, parte=0, sx1=None, sy1=None):
        """Caja de sx × sy en la base (sx1 × sy1 arriba: tronco de pirámide) desde cz0 hasta cz0 + sz, centrada en (cx, cy)."""
        sx1 = sx if sx1 is None else sx1; sy1 = sy if sy1 is None else sy1
        v = []
        for z, a, b in ((cz0, sx, sy), (cz0 + sz, sx1, sy1)):
            for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                v.append(self.bm.verts.new((cx + dx * a / 2, cy + dy * b / 2, z)))
        idx = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        self._pinta([self.bm.faces.new([v[i] for i in f]) for f in idx], color, parte)

    def cilindro(self, cx, cy, cz0, r0, r1, sz, color, parte=0, n=8, tapa=True):
        """Tronco de cono vertical de n lados (r1 = 0: cono)."""
        abajo = [self.bm.verts.new((cx + math.cos(a) * r0, cy + math.sin(a) * r0, cz0)) for a in (i * 2 * math.pi / n for i in range(n))]
        if r1 > 0:
            arriba = [self.bm.verts.new((cx + math.cos(a) * r1, cy + math.sin(a) * r1, cz0 + sz)) for a in (i * 2 * math.pi / n for i in range(n))]
            caras = [self.bm.faces.new((abajo[i], abajo[(i + 1) % n], arriba[(i + 1) % n], arriba[i])) for i in range(n)]
            if tapa: caras.append(self.bm.faces.new(list(reversed(arriba))) if False else self.bm.faces.new(arriba))
        else:
            punta = self.bm.verts.new((cx, cy, cz0 + sz))
            caras = [self.bm.faces.new((abajo[i], abajo[(i + 1) % n], punta)) for i in range(n)]
        if tapa: caras.append(self.bm.faces.new(list(reversed(abajo))))
        self._pinta(caras, color, parte)

    def octaedro(self, cx, cy, cz, r, color, parte):
        p = [self.bm.verts.new(q) for q in ((cx + r, cy, cz), (cx, cy + r, cz), (cx - r, cy, cz), (cx, cy - r, cz), (cx, cy, cz + r), (cx, cy, cz - r))]
        caras = [self.bm.faces.new((p[i], p[(i + 1) % 4], p[4])) for i in range(4)] + [self.bm.faces.new((p[(i + 1) % 4], p[i], p[5])) for i in range(4)]
        self._pinta(caras, color, parte)

    def objeto(self, nombre):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(nombre); self.bm.to_mesh(me); self.bm.free()
        me.color_attributes.active_color = me.color_attributes['Col']
        o = bpy.data.objects.new(nombre, me); bpy.context.scene.collection.objects.link(o)
        mat = bpy.data.materials.get('unidad') or bpy.data.materials.new('unidad')
        if not mat.use_nodes:
            mat.use_nodes = True
            nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
            ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
            nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 0.8
        me.materials.append(mat)
        return o


C.vacia()
# ---------- soldado: caballero con yelmo, sobreveste, escudo (brazo izquierdo) y lanza (brazo derecho) ----------
s = Pieza()
s.caja(-0.11, 0, 0, 0.16, 0.2, 0.86, ACERO_OSC, 3, 0.17, 0.19)          # piernas (grebas)
s.caja(0.11, 0, 0, 0.16, 0.2, 0.86, ACERO_OSC, 4, 0.17, 0.19)
s.caja(0, 0, 0.84, 0.44, 0.26, 0.62, ACERO, 0, 0.5, 0.28)                # torso (cota y peto)
s.caja(0, 0.02, 0.62, 0.42, 0.29, 0.72, TELA, 0, 0.46, 0.3)              # sobreveste (por fuera del torso, hasta medio muslo)
s.caja(0, 0, 1.33, 0.56, 0.3, 0.13, ACERO, 0, 0.5, 0.26)                 # hombreras
s.cilindro(0, 0, 1.45, 0.13, 0.13, 0.25, ACERO, 0, n=8)                  # yelmo
s.cilindro(0, 0, 1.70, 0.13, 0, 0.1, ACERO_OSC, 0, n=8, tapa=False)      # cimera del yelmo
s.caja(0, 0.125, 1.56, 0.17, 0.02, 0.03, ACERO_OSC, 0)                   # visera (ranura)
s.caja(0.31, 0.02, 0.9, 0.12, 0.13, 0.5, ACERO, 1, 0.13, 0.14)           # brazo derecho
s.caja(0.33, 0.12, 0.25, 0.045, 0.045, 2.3, MADERA, 1)                   # lanza
s.cilindro(0.33, 0.12, 2.55, 0.05, 0, 0.26, ACERO, 1, n=4, tapa=False)   # punta de la lanza
s.caja(-0.31, 0.02, 0.9, 0.12, 0.13, 0.5, ACERO, 2, 0.13, 0.14)          # brazo izquierdo
s.caja(-0.3, 0.2, 0.62, 0.46, 0.05, 0.66, TELA_OSC, 2, 0.5, 0.05)        # escudo
s.caja(-0.3, 0.235, 0.88, 0.12, 0.03, 0.14, ORO, 2)                      # umbo
soldado = s.objeto('soldado')

# ---------- hechicero: túnica, capucha, brazos alzados hacia delante y báculo con un orbe que brilla ----------
h = Pieza()
h.cilindro(0, 0, 0, 0.46, 0.24, 1.42, TUNICA, 0, n=10)                    # túnica
h.cilindro(0, 0, 0, 0.47, 0.44, 0.12, ORO, 0, n=10, tapa=False)           # ribete dorado
h.cilindro(0, 0, 1.4, 0.26, 0.2, 0.18, TUNICA_OSC, 0, n=8)                # hombros
h.cilindro(0, 0.01, 1.55, 0.17, 0, 0.5, TUNICA_OSC, 0, n=8, tapa=False)   # capucha puntiaguda
h.caja(0, 0.12, 1.6, 0.16, 0.04, 0.16, lin('140a1e'), 0)                  # rostro en sombra
h.caja(0.27, 0.18, 1.18, 0.11, 0.42, 0.11, TUNICA, 1, 0.1, 0.42)          # brazo derecho, hacia delante
h.caja(0.36, 0.38, 0.0, 0.05, 0.05, 2.25, MADERA, 1)                      # báculo
h.octaedro(0.36, 0.38, 2.42, 0.17, ORBE, 5)                               # orbe
h.caja(-0.27, 0.22, 1.25, 0.11, 0.48, 0.11, TUNICA, 2, 0.1, 0.48)         # brazo izquierdo, alzado
h.octaedro(-0.27, 0.5, 1.31, 0.09, ORBE, 5)                               # luz en la mano
hechicero = h.objeto('hechicero')
hechicero.location.x = 1.5                                                # (solo para las vistas: se exporta en su sitio)

for o in (soldado, hechicero):
    C.ok('%s: %d triángulos, %.2f m de alto' % (o.name, C.triangulos([o]), o.dimensions.z))
out = C.carpeta(C.SALIDA, 'enemigos')
C.vistas(os.path.join(out, '03_soldado'), [soldado, hechicero], ('frente', 'izquierda', 'tres_cuartos', 'tres_cuartos_atras'), color='VERTEX', orto=False)
hechicero.location.x = 0
dest = os.path.join(C.RAIZ, 'modelos', 'soldado.glb')
for o in bpy.context.scene.objects: o.select_set(o in (soldado, hechicero))
opciones = dict(filepath=dest, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True,
                export_materials='EXPORT', export_animations=False, export_yup=True)
try:
    bpy.ops.export_scene.gltf(**opciones, export_vertex_color='ACTIVE')
except TypeError:
    bpy.ops.export_scene.gltf(**opciones)
C.ok('exportado %s (%.1f KB)' % (dest, os.path.getsize(dest) / 1024))
