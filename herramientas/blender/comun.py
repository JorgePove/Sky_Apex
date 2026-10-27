"""Funciones compartidas por los scripts de Blender del proyecto (renders de revisión, hojas de contacto, rutas).
Uso desde un script de herramientas/blender/<carpeta>/:   sys.path.insert(0, os.path.dirname(os.path.dirname(__file__))); import comun"""
import bpy, os, sys, math
import numpy as np
from mathutils import Vector, Matrix

try:
    sys.stdout.reconfigure(encoding='utf-8'); sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

RAIZ = os.environ.get('SKY_PROYECTO', os.getcwd())
SALIDA = os.environ.get('SKY_SALIDA', os.path.join(RAIZ, 'herramientas', 'blender', 'salida'))
PROYECTOS = os.environ.get('BLENDER_PROYECTOS', SALIDA)
os.makedirs(SALIDA, exist_ok=True)


def ok(t): print('[OK] ' + t, flush=True)
def aviso(t): print('[!!] ' + t, flush=True)
def info(t): print('     ' + t, flush=True)
def vacia(): bpy.ops.wm.read_factory_settings(use_empty=True)
def mallas(objs): return [o for o in objs if o.type == 'MESH']
def triangulos(objs): return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in mallas(objs))


def carpeta(*partes):
    d = os.path.join(*partes); os.makedirs(d, exist_ok=True); return d


def caja(objs):
    """Caja envolvente en el mundo de las mallas (evaluadas: con la pose del esqueleto)."""
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in mallas(objs):
        oe = o.evaluated_get(dg)
        pts += [oe.matrix_world @ Vector(c) for c in oe.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def camara(nombre='cam_revision'):
    esc = bpy.context.scene
    cam = bpy.data.objects.get(nombre)
    if cam is None:
        cd = bpy.data.cameras.new(nombre); cam = bpy.data.objects.new(nombre, cd); esc.collection.objects.link(cam)
    esc.camera = cam
    return cam


def preparar_render(ancho=960, alto=540, color='TEXTURE', fondo=(0.13, 0.13, 0.16), cavidad=True):
    esc = bpy.context.scene
    esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = ancho, alto, 100
    esc.render.image_settings.file_format = 'PNG'
    if esc.world is None: esc.world = bpy.data.worlds.new('mundo_revision')
    esc.world.color = fondo
    esc.render.engine = 'BLENDER_WORKBENCH'
    sh = esc.display.shading
    sh.light = 'STUDIO'; sh.color_type = color
    try:
        sh.show_cavity = cavidad; sh.cavity_type = 'BOTH'
    except Exception:
        pass
    esc.display.render_aa = '8'


def foto(ruta, objs, direccion=(1.0, -1.3, 0.7), ancho=960, alto=540, orto=False, margen=1.05, centro=None, radio=None, color='TEXTURE', arriba=(0, 0, 1)):
    """Render de revisión: encuadra las mallas de objs mirando desde «direccion» (hacia el centro). orto: proyección ortográfica."""
    esc = bpy.context.scene
    mn, mx = caja(objs)
    c = Vector(centro) if centro is not None else (mn + mx) / 2
    r = radio if radio is not None else 0.5 * max(mx - mn) * margen
    cam = camara(); cd = cam.data
    preparar_render(ancho, alto, color)
    d = Vector(direccion).normalized()
    if orto:
        cd.type = 'ORTHO'; cd.ortho_scale = 2 * r * max(1.0, ancho / alto) if ancho >= alto else 2 * r
        dist = r * 4
    else:
        cd.type = 'PERSP'; cd.lens = 50
        medio_v = math.atan((18.0 * min(alto, ancho) / max(alto, ancho)) / cd.lens)
        dist = r / math.sin(medio_v)
    cam.location = c + d * dist
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y' if abs(d.z) < 0.99 else 'Y').to_euler()
    if abs(d.z) >= 0.99:                                      # mirando desde arriba o abajo: la Y de la imagen = «arriba» dado
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.clip_start, cd.clip_end = dist / 500, dist * 20
    esc.render.filepath = ruta
    bpy.ops.render.render(write_still=True)
    return ruta


VISTAS = {   # dirección desde la que mira la cámara (Blender: Z arriba). El frente del modelo se fija en cada script.
    'frente': (0, -1, 0.0001), 'detras': (0, 1, 0.0001), 'izquierda': (-1, 0, 0.0001), 'derecha': (1, 0, 0.0001),
    'arriba': (0, -0.0001, 1), 'abajo': (0, -0.0001, -1), 'tres_cuartos': (1, -1.3, 0.7), 'tres_cuartos_atras': (-1, 1.2, 0.6)
}


def hoja(rutas, salida, columnas=2, titulo=None):
    """Junta varias imágenes PNG del mismo tamaño en una hoja de contacto (filas de «columnas»)."""
    imgs = [bpy.data.images.load(r, check_existing=False) for r in rutas]
    w, h = imgs[0].size
    filas = (len(imgs) + columnas - 1) // columnas
    out = np.zeros((filas * h, columnas * w, 4), dtype=np.float32); out[..., 3] = 1
    for k, im in enumerate(imgs):
        px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(h, w, 4)
        f, c = divmod(k, columnas)
        out[(filas - 1 - f) * h:(filas - f) * h, c * w:(c + 1) * w] = px     # (las filas de Blender van de abajo arriba)
    res = bpy.data.images.new('hoja', columnas * w, filas * h, alpha=False)
    res.pixels.foreach_set(out.ravel()); res.filepath_raw = salida; res.file_format = 'PNG'; res.save()
    for im in imgs: bpy.data.images.remove(im)
    bpy.data.images.remove(res)
    return salida


"""Vistas ortográficas con rejilla métrica, para leer coordenadas en la imagen y colocar huesos.
vista: 'arriba' (imagen: derecha = +X, arriba = +Y), 'frente' (cámara en -Y: derecha = +X, arriba = +Z),
       'izquierda' (cámara en -X: derecha = -Y, arriba = +Z), 'derecha' (cámara en +X: derecha = +Y, arriba = +Z).
u0..u1 y v0..v1: el rectángulo del mundo que se ve, en las coordenadas MUNDIALES de los ejes de la imagen (para 'izquierda', u es Y
creciendo hacia la izquierda de la imagen: se pasa en coordenadas del mundo y se invierte solo)."""
EJES = {'arriba': ((1, 0, 0), (0, 1, 0), (0, 0, 1)), 'frente': ((1, 0, 0), (0, 0, 1), (0, -1, 0)),
        'izquierda': ((0, -1, 0), (0, 0, 1), (-1, 0, 0)), 'derecha': ((0, 1, 0), (0, 0, 1), (1, 0, 0))}
_DIG = {'0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
        '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
        '-': '000000111000000', '.': '000000000000010'}


def _texto(px, x, y, s, col, k=3):
    """Escribe s en px (alto × ancho × 4, fila 0 = abajo) con la esquina inferior izquierda en (x, y); dígitos de 3×5 escalados k."""
    h, w = px.shape[:2]
    for ch in s:
        pat = _DIG.get(ch)
        if pat:
            for r in range(5):
                for c in range(3):
                    if pat[r * 3 + c] == '1':
                        y0, x0 = y + (4 - r) * k, x + c * k
                        if 0 <= y0 and y0 + k <= h and 0 <= x0 and x0 + k <= w: px[y0:y0 + k, x0:x0 + k] = col
        x += 4 * k


def ortho_rejilla(ruta, objs, vista, u0, u1, v0, v1, ppm=40, paso=1.0, etiquetas=5.0, color='SINGLE', marcas=None):
    """marcas: [(x, y, z, (r, g, b))] puntos del mundo que se dibujan como cruces (para comprobar dónde van los huesos)."""
    eu, ev, ed = (Vector(e) for e in EJES[vista])
    flip = vista == 'izquierda'                                  # u del mundo (Y) crece hacia la izquierda de la imagen
    a0, a1 = (-u1, -u0) if flip else (u0, u1)
    W, H = int(round((a1 - a0) * ppm)), int(round((v1 - v0) * ppm))
    centro_u, centro_v = (a0 + a1) / 2, (v0 + v1) / 2
    c = eu * centro_u + ev * centro_v
    cam = camara(); cd = cam.data; cd.type = 'ORTHO'; cd.ortho_scale = max(a1 - a0, v1 - v0)
    preparar_render(W, H, color)
    cam.location = c + ed * 200
    cam.rotation_euler = Matrix((eu, ev, ed)).transposed().to_euler()
    cd.clip_start, cd.clip_end = 1, 400
    bpy.context.scene.render.filepath = ruta
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(ruta, check_existing=False)
    px = np.empty(W * H * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(H, W, 4)
    def linea_u(u, col, al):                                     # línea vertical en el valor de mundo u
        a = -u if flip else u; x = int(round((a - a0) * ppm))
        if 0 <= x < W: px[:, x, :3] = px[:, x, :3] * (1 - al) + np.array(col) * al
    def linea_v(v, col, al):
        y = int(round((v - v0) * ppm))
        if 0 <= y < H: px[y, :, :3] = px[y, :, :3] * (1 - al) + np.array(col) * al
    import math as _m
    for k in range(int(_m.floor(u0 / paso)), int(_m.ceil(u1 / paso)) + 1):
        u = k * paso; fuerte = abs(u / etiquetas - round(u / etiquetas)) < 1e-6
        linea_u(u, (1, 0.3, 0.3) if abs(u) < 1e-6 else (1, 1, 1), 0.6 if abs(u) < 1e-6 else (0.32 if fuerte else 0.12))
        if fuerte:
            a = -u if flip else u; _texto(px, int(round((a - a0) * ppm)) + 3, 4, ('%g' % u), (1, 0.85, 0.3, 1))
    for k in range(int(_m.floor(v0 / paso)), int(_m.ceil(v1 / paso)) + 1):
        v = k * paso; fuerte = abs(v / etiquetas - round(v / etiquetas)) < 1e-6
        linea_v(v, (0.3, 1, 0.3) if abs(v) < 1e-6 else (1, 1, 1), 0.6 if abs(v) < 1e-6 else (0.32 if fuerte else 0.12))
        if fuerte: _texto(px, 4, int(round((v - v0) * ppm)) + 3, ('%g' % v), (0.4, 0.9, 1, 1))
    for (x, y, z, col) in (marcas or []):
        p = Vector((x, y, z)); u = p.dot(eu) if not flip else -p.dot(eu); v = p.dot(ev)
        a = -u if flip else u
        X, Y = int(round((p.dot(eu) - a0) * ppm)), int(round((v - v0) * ppm))
        for d in range(-6, 7):
            if 0 <= X + d < W and 0 <= Y < H: px[Y, X + d, :3] = col
            if 0 <= X < W and 0 <= Y + d < H: px[Y + d, X, :3] = col
    im.pixels.foreach_set(px.ravel()); im.filepath_raw = ruta; im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
    return ruta


def vistas(prefijo, objs, nombres=('frente', 'izquierda', 'arriba', 'tres_cuartos'), ancho=800, alto=450, orto=True, columnas=2, **kw):
    """Renderiza varias vistas y las junta en <prefijo>.png (las sueltas se borran)."""
    rutas = []
    for n in nombres:
        rutas.append(foto(prefijo + '_' + n + '.png', objs, VISTAS[n], ancho, alto, orto=orto and n != 'tres_cuartos' and n != 'tres_cuartos_atras', **kw))
    hoja(rutas, prefijo + '.png', columnas)
    for r in rutas: os.remove(r)
    return prefijo + '.png'
