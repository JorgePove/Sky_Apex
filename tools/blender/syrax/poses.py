"""Syrax: herramientas para posar el esqueleto desde scripts (todas en el espacio del esqueleto: Z arriba, el dragón mira a -Y).
· apuntar(arm, hueso, dirección): gira el hueso (con todo lo que cuelga de él) para que apunte en esa dirección (giro mínimo).
· abanico(arm, lado, dirección, normal): gira la mano con los cuatro dedos como un bloque: la dirección media de los dedos pasa a
  «dirección» y la normal de la membrana a «normal». Así la membrana no se estira entre dedos.
· girar(arm, hueso, eje, grados): gira el hueso alrededor de un eje del mundo que pasa por su cabeza.
· pose_vuelo(arm, abierto): la pose de planeo (alas extendidas en horizontal, cuello y cola rectos, patas recogidas); abierto de 0 a 1."""
import bpy, math
from mathutils import Vector, Matrix

DEDOS = ('f1', 'f2', 'f3', 'f4')


def actualizar(): bpy.context.view_layer.update()


def reposo(arm):
    for pb in arm.pose.bones: pb.matrix_basis = Matrix()
    actualizar()


def girar(arm, n, eje, grados):
    pb = arm.pose.bones[n]; M = pb.matrix.copy(); o = M.translation.copy()
    pb.matrix = Matrix.Translation(o) @ Matrix.Rotation(math.radians(grados), 4, Vector(eje)) @ Matrix.Translation(-o) @ M
    actualizar()


def direccion(arm, n):
    return (arm.pose.bones[n].matrix.to_3x3() @ Vector((0, 1, 0))).normalized()


def apuntar(arm, n, d, mezcla=1.0):
    d = Vector(d).normalized(); cur = direccion(arm, n)
    q = cur.rotation_difference(d)
    if mezcla < 1: q = Matrix().to_quaternion().slerp(q, mezcla)
    pb = arm.pose.bones[n]; M = pb.matrix.copy(); o = M.translation.copy()
    pb.matrix = Matrix.Translation(o) @ q.to_matrix().to_4x4() @ Matrix.Translation(-o) @ M
    actualizar()


def _marco(d, n):
    d = Vector(d).normalized(); n = (Vector(n) - d * Vector(n).dot(d)).normalized(); b = d.cross(n)
    return Matrix((d, n, b)).transposed()


def abanico_reposo(arm, s):
    """Dirección media de los dedos (de la raíz a la punta) y normal de la membrana, en la pose actual."""
    B = arm.pose.bones
    raiz = B['hand.' + s].tail
    puntas = [B['%s_%02d.%s' % (f, 3 if f != 'f1' else 2, s)].tail for f in DEDOS]
    d = sum(((p - raiz).normalized() for p in puntas), Vector()).normalized()
    n = (puntas[1] - raiz).cross(puntas[3] - raiz).normalized()
    sx = 1 if s == 'L' else -1
    if n.x * sx < 0: n = -n                                       # misma cara de la membrana en los dos lados (la de arriba)
    if n.z < 0 and abs(n.x) < 0.5: n = -n
    return d, n


def abanico(arm, s, d, n):
    """La mano (y con ella los dedos) gira como un bloque: dirección media → d, normal de la membrana → ±n.
    Hay dos giros posibles (la membrana boca arriba o boca abajo, con los dedos en orden inverso). La normal medida no sirve para
    elegir (su signo depende de cómo haya quedado el brazo; con la regla antigua el abanico salía girado 180°: el dedo corto delante
    y la mano apuntando hacia dentro). Se elige el giro que deja el dedo largo (f4, el borde de ataque) DELANTE del corto (f1)."""
    d0, n0 = abanico_reposo(arm, s)
    B = arm.pose.bones; pb = B['hand.' + s]; M = pb.matrix.copy(); o = M.translation.copy()
    p1, p4 = B['f1_02.' + s].tail.copy(), B['f4_03.' + s].tail.copy()
    mejor = None
    for sg in (1, -1):
        R = _marco(d, Vector(n) * sg) @ _marco(d0, n0).inverted()
        y1, y4 = (o + R @ (p1 - o)).y, (o + R @ (p4 - o)).y
        if mejor is None or y4 - y1 < mejor[0]: mejor = (y4 - y1, R)     # (el dragón mira a -Y: delante = menos Y)
    pb.matrix = Matrix.Translation(o) @ mejor[1].to_4x4() @ Matrix.Translation(-o) @ M
    actualizar()


def torcer(arm, n, grados):
    """Gira el hueso sobre su propio eje."""
    girar(arm, n, direccion(arm, n), grados)


def retorcido(arm, padre, hijo):
    """Cuánto se ha retorcido (grados, sobre el eje del hijo) la articulación padre → hijo respecto a la pose de reposo."""
    A0 = arm.data.bones[padre].matrix_local.to_3x3(); B0 = arm.data.bones[hijo].matrix_local.to_3x3()
    A1 = arm.pose.bones[padre].matrix.to_3x3(); B1 = arm.pose.bones[hijo].matrix.to_3x3()
    q = (A0.inverted() @ B0).to_quaternion().inverted() @ (A1.inverted() @ B1).to_quaternion()
    tw = math.degrees(2 * math.atan2(q.y, q.w))
    return (tw + 180) % 360 - 180


_DEF = {}


def deformacion(arm, malla, centros, radio=2.5):
    """Cuánto se deforma la malla cerca de unos puntos (de reposo): media de |log(largo ahora / largo en reposo)| de sus aristas."""
    import numpy as np
    me0 = malla.data; k = id(me0)
    if k not in _DEF:
        co = np.empty(len(me0.vertices) * 3); me0.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        e = np.empty(len(me0.edges) * 2, dtype=np.int64); me0.edges.foreach_get('vertices', e); e = e.reshape(-1, 2)
        _DEF[k] = (co, e, np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1))
    co0, e, L0 = _DEF[k]
    mid = (co0[e[:, 0]] + co0[e[:, 1]]) / 2
    sel = np.zeros(len(e), dtype=bool)
    for c in centros: sel |= np.linalg.norm(mid - np.array(c), axis=1) < radio
    dg = bpy.context.evaluated_depsgraph_get(); ev = malla.evaluated_get(dg); me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3); ev.to_mesh_clear()
    L1 = np.linalg.norm(co[e[sel, 0]] - co[e[sel, 1]], axis=1)
    return float(np.abs(np.log(np.maximum(L1, 1e-6) / np.maximum(L0[sel], 1e-6))).mean())


def repartir_muneca(arm, s, d, n, parte=0.5, malla=None):
    """La mano conserva su orientación (abanico d, n), pero el antebrazo gira sobre su eje lo que menos deforme la malla alrededor
    de la muñeca y del codo (búsqueda de 10 en 10 grados). parte = 0 o sin malla: no se toca."""
    if parte <= 0 or malla is None: return 0
    B = arm.data.bones
    centros = [B['hand.' + s].head_local, B['forearm.' + s].head_local]
    pb = arm.pose.bones['forearm.' + s]; M0 = pb.matrix.copy()
    mejor = (1e9, 0)
    for a in range(-180, 180, 10):
        pb.matrix = M0; actualizar(); torcer(arm, 'forearm.' + s, a); abanico(arm, s, d, n)
        c = deformacion(arm, malla, centros)
        if c < mejor[0]: mejor = (c, a)
    pb.matrix = M0; actualizar(); torcer(arm, 'forearm.' + s, mejor[1]); abanico(arm, s, d, n)
    return mejor[1]


def espejo(v, s): return Vector((v[0], v[1], v[2])) if s == 'L' else Vector((-v[0], v[1], v[2]))


# Pose de planeo (lado izquierdo, +X; el derecho se refleja). Ajustada mirando 06_vuelo.png.
VUELO = dict(
    brazo=(0.85, 0.35, 0.35), antebrazo=(0.85, -0.52, 0.05), abanico=(0.92, 0.40, -0.02), normal=(0.0, -0.10, 1.0),
    pulgar=(0.15, -0.95, 0.05), reparto=0.5,
    cuello=(0, -1, 0.10), cabeza=(0, -1, -0.05), cola=(0, 1, 0.0), muslo=(0.05, 0.85, -0.45), espinilla=(0.0, 0.95, 0.25), pie=(0.0, 0.7, -0.7),
)


GIRO_ANTEBRAZO = {}                                              # el giro elegido para cada lado (se calcula una vez)


def pose_vuelo(arm, abierto=1.0, P=VUELO, malla=None):
    reposo(arm)
    for s in ('L', 'R'):
        apuntar(arm, 'upperarm.' + s, espejo(P['brazo'], s), abierto)
        apuntar(arm, 'forearm.' + s, espejo(P['antebrazo'], s), abierto)
        abanico(arm, s, espejo(P['abanico'], s), espejo(P['normal'], s))
        if s in GIRO_ANTEBRAZO:
            torcer(arm, 'forearm.' + s, GIRO_ANTEBRAZO[s]); abanico(arm, s, espejo(P['abanico'], s), espejo(P['normal'], s))
        else:
            GIRO_ANTEBRAZO[s] = repartir_muneca(arm, s, espejo(P['abanico'], s), espejo(P['normal'], s), P.get('reparto', 0.5), malla)
        apuntar(arm, 'thumb.' + s, espejo(P['pulgar'], s))
    for i in range(1, 7): apuntar(arm, 'neck_%02d' % i, P['cuello'])
    apuntar(arm, 'head', P['cabeza'])
    for i in range(1, 17): apuntar(arm, 'tail_%02d' % i, P['cola'])
    for s in ('L', 'R'):
        apuntar(arm, 'thigh.' + s, espejo(P['muslo'], s)); apuntar(arm, 'shin.' + s, espejo(P['espinilla'], s)); apuntar(arm, 'foot.' + s, espejo(P['pie'], s))
