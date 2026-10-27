"""Syrax, paso 9: animaciones hechas desde cero, por código (cada hueso, una función del tiempo).
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/09_animar.py
Sobre la pose base de vuelo (08_pose_base.py). Clips (30 fps, en bucle: el último fotograma = el primero):
· vuelo (1,2 s): aleteo. Bajada algo más rápida que la subida; el antebrazo, la mano y las puntas de los dedos van con retraso
  (la membrana «sigue» al brazo); al subir el ala se pliega hacia atrás y la mano se gira (menos resistencia); el cuerpo sube con
  cada bajada, el cuello compensa para que la cabeza vaya estable y la cola ondula con una onda que la recorre.
· hover (1,1 s): cuerpo inclinado 24°, aletazos amplios hacia delante y atrás, patas colgando y la cola curvada hacia atrás.
· planeo (3 s): alas quietas con un ligero diedro, respiración, la cabeza mira un poco a los lados y la cola se mece.
Guarda BLENDER_PROYECTOS/Syrax/syrax_anim.blend (las acciones van en pistas NLA, para exportarlas) y salida/syrax/09_<clip>.png
(8 fotogramas de cada clip)."""
import bpy, os, sys, math
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comun as C
import poses as PO

PRJ = os.path.join(C.PROYECTOS, 'Syrax'); OUT = C.carpeta(C.SALIDA, 'syrax')
bpy.ops.wm.open_mainfile(filepath=os.path.join(PRJ, 'syrax_vuelo.blend'))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); malla = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
esc = bpy.context.scene; esc.render.fps = 30
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
S = (('L', 1), ('R', -1))
d2r, sin, cos = math.radians, math.sin, math.cos
DEDOS = {'f1': 2, 'f2': 3, 'f3': 3, 'f4': 3}


def g(n, eje, grados):
    if abs(grados) > 1e-4: PO.girar(arm, n, eje, grados)


def ejes():
    """Ejes del cuerpo en la pose actual: adelante (de la pelvis al pecho), arriba y lateral (hacia +X)."""
    B = arm.pose.bones
    fwd = (B['spine_02'].tail - B['pelvis'].head).normalized()
    lat = fwd.cross(Vector((0, 0, 1))).normalized(); lat = -lat if lat.x < 0 else lat
    up = lat.cross(fwd).normalized()
    return fwd, up, lat


def alas(fase, amp, sube, retraso=0.6, pliegue=12, abanico_pl=18, giro=8, ondas=6, barrido=0.0):
    """Un aleteo: fase en radianes; amp (°) arriba y abajo; sube (°) desplaza el centro; barrido (°) mueve el ala adelante/atrás
    (hover). El brazo sube y baja alrededor del eje del cuerpo; antebrazo, mano y dedos con retraso creciente."""
    fwd, up, lat = ejes()
    th = amp * sin(fase + 0.3 * sin(fase)) + sube                 # bajada algo más rápida que la subida
    subiendo = 0.5 + 0.5 * cos(fase)                              # 1 a mitad de la subida, 0 a mitad de la bajada
    for s, k in S:
        g('upperarm.' + s, fwd, k * th)
        if barrido: g('upperarm.' + s, up, -k * barrido * cos(fase))
        g('forearm.' + s, fwd, k * 0.25 * amp * sin(fase - retraso))
        g('forearm.' + s, up, k * pliegue * subiendo)             # al subir, la muñeca va hacia atrás (ala plegada)
        g('hand.' + s, fwd, k * 0.30 * amp * sin(fase - 2 * retraso))
        g('hand.' + s, up, k * abanico_pl * (0.5 + 0.5 * cos(fase - retraso)))
        PO.torcer(arm, 'hand.' + s, k * giro * cos(fase - retraso))
        for f, nj in DEDOS.items():
            for j in range(2, nj + 1):
                g('%s_%02d.%s' % (f, j, s), fwd, k * ondas * sin(fase - 2 * retraso - 0.45 * j))


def cola(fase, vert, lat, onda=0.42):
    fwd, up, latax = ejes()
    for i in range(1, 17):
        g('tail_%02d' % i, latax, vert * sin(fase - onda * i) * (0.4 + i / 16))
        g('tail_%02d' % i, up, lat * sin(fase * 0.5 - onda * i) if lat else 0)


def cuello(cabeceo, cabeza=0.0, giro=0.0):
    fwd, up, lat = ejes()
    for i in range(1, 7):
        g('neck_%02d' % i, lat, cabeceo / 6)
        g('neck_%02d' % i, up, giro / 6)
    g('head', lat, cabeza)


def raiz_z(dz):
    arm.pose.bones['root'].location = (0, dz, 0)                  # (el hueso raíz apunta arriba: su Y local es la Z del mundo)
    PO.actualizar()


def pose_vuelo(t, T=1.2):
    fa = 2 * math.pi * t / T
    PO.reposo(arm); raiz_z(-0.45 * sin(fa))
    g('pelvis', (1, 0, 0), 1.5 * cos(fa))
    alas(fa, amp=28, sube=6)
    cuello(-1.8 * sin(fa - 0.4) * 6, cabeza=6 * sin(fa - 0.4))
    cola(fa, vert=2.6, lat=0.8)
    for s, k in S: g('thigh.' + s, (1, 0, 0), 2.5 * sin(fa - 1))


def pose_hover(t, T=1.1):
    fa = 2 * math.pi * t / T
    PO.reposo(arm); raiz_z(-0.3 * sin(fa))
    g('pelvis', (1, 0, 0), -24 + 2 * cos(fa))                     # morro arriba (v20: menos, para la plataforma de «Elige tu dragón»)
    alas(fa, amp=40, sube=8, retraso=0.7, pliegue=20, abanico_pl=28, giro=22, ondas=8, barrido=22)
    cuello(20 - 3 * sin(fa - 0.4), cabeza=6)
    fwd, up, lat = ejes()
    g('tail_01', lat, -8)                                          # la cola baja un poco y se curva hacia atrás y arriba (no cuelga)
    for i in range(3, 17): g('tail_%02d' % i, lat, 3.2)
    cola(fa, vert=2.0, lat=1.5)
    for s, k in S:                                                 # patas colgando (direcciones del mundo), con un poco de vaivén
        PO.apuntar(arm, 'thigh.' + s, (k * 0.15, -0.25 + 0.06 * sin(fa - 1), -1))
        PO.apuntar(arm, 'shin.' + s, (0, 0.35 + 0.08 * sin(fa - 1.4), -1))
        PO.apuntar(arm, 'foot.' + s, (0, -0.6, -0.8))


def pose_planeo(t, T=3.0):
    fa = 2 * math.pi * t / T
    PO.reposo(arm); raiz_z(-0.15 * sin(fa))
    fwd, up, lat = ejes()
    for s, k in S:
        g('upperarm.' + s, fwd, k * (6 + 1.5 * sin(fa)))
        g('hand.' + s, fwd, k * 1.5 * sin(fa - 0.7))
        for f, nj in DEDOS.items(): g('%s_%02d.%s' % (f, nj, s), fwd, k * 2.5 * sin(fa - 1.2))
    g('spine_01', lat, 1.0 * sin(fa)); g('spine_02', lat, 0.8 * sin(fa - 0.3))
    cuello(-2 * sin(fa), cabeza=2 * sin(fa - 0.5), giro=10 * sin(fa * 1 - 0.2))
    fwd, up, lat = ejes()
    for i in range(1, 17): g('tail_%02d' % i, up, 1.6 * sin(fa - 0.35 * i))


CLIPS = (('vuelo', pose_vuelo, 1.2), ('hover', pose_hover, 1.1), ('planeo', pose_planeo, 3.0))
ad = arm.animation_data or arm.animation_data_create()
for nombre, fn, T in CLIPS:
    act = bpy.data.actions.new(nombre); act.use_fake_user = True
    ad.action = act
    N = int(round(T * 30))
    for f in range(N + 1):
        fn(f / 30.0, T)
        for pb in arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=f)       # (desde el 0: el clip exportado empieza en t = 0, sin pausa en el bucle)
            if pb.name == 'root': pb.keyframe_insert('location', frame=f)
    tr = ad.nla_tracks.new(); tr.name = nombre; st = tr.strips.new(nombre, 0, act); tr.mute = True
    C.ok('%s: %d fotogramas (%.1f s)' % (nombre, N + 1, T))
    # hoja con 8 fotogramas del clip
    arm.hide_render = True; rutas = []
    for k in range(8):
        f = round(k * N / 8); esc.frame_set(f)
        rutas.append(C.foto(os.path.join(OUT, 'f%d.png' % k), [malla], (1.0, -1.1, 0.45), 640, 360, color='TEXTURE', centro=(0, -2, 6.5), radio=24))
    C.hoja(rutas, os.path.join(OUT, '09_%s.png' % nombre), 4)
    for r in rutas: os.remove(r)
ad.action = None
PO.reposo(arm); arm.pose.bones['root'].location = (0, 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PRJ, 'syrax_anim.blend'))
C.ok('guardado ' + os.path.join(PRJ, 'syrax_anim.blend'))
