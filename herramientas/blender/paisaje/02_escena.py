"""Vuelo Libre (v38), paso 2: monta el terreno en una escena de Blender (malla, color, agua, cielo y sol) y saca los renders para revisar
el trazado: el plano cenital con los nombres y varias vistas a la altura del dragón, con bruma. Guarda la escena en BLENDER_PROYECTOS.
Uso: node herramientas/blender/lanzar.mjs herramientas/blender/paisaje/02_escena.py -- [N=1024] [plano] [inicio] [macizo] …
Antes: 01_generar.py con la misma N."""
import os, sys, math
import numpy as np
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI); sys.path.insert(0, os.path.dirname(AQUI))
import bpy
import comun
import terreno as T

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
n = int(next((a for a in args if a.isdigit()), 1024))
SOLO = [a for a in args if not a.isdigit()]
OUT = comun.carpeta(comun.SALIDA, 'paisaje')
dat = np.load(os.path.join(OUT, f'terreno_{n}.npz'))
H = dat['h']
c = np.linspace(-T.HALF, T.HALF, n)


def suelo(x, z):
    i = int(round((x + T.HALF) / T.SIZE * (n - 1))); j = int(round((z + T.HALF) / T.SIZE * (n - 1)))
    return float(H[min(n - 1, max(0, j)), min(n - 1, max(0, i))])


comun.vacia()
esc = bpy.context.scene


# ---------------------------------------------------------------- malla
def malla_terreno(h, nombre):
    n = h.shape[0]; c = np.linspace(-T.HALF, T.HALF, n)
    X, Z = np.meshgrid(c, c)
    co = np.stack([X, -Z, h], -1).reshape(-1, 3).astype(np.float32)
    me = bpy.data.meshes.new(nombre)
    me.vertices.add(n * n); me.vertices.foreach_set('co', co.ravel())
    j, i = np.mgrid[0:n - 1, 0:n - 1]
    a = (j * n + i).ravel(); b = a + 1; cc = a + n + 1; d = a + n
    lp = np.stack([a, d, cc, b], -1).ravel().astype(np.int32)    # vistas desde arriba, en sentido antihorario (normal hacia +Z)
    F = (n - 1) ** 2
    me.loops.add(F * 4); me.loops.foreach_set('vertex_index', lp)
    me.polygons.add(F); me.polygons.foreach_set('loop_start', (np.arange(F) * 4).astype(np.int32))
    uv = me.uv_layers.new(name='UVMap')
    uv.data.foreach_set('uv', np.stack([(lp % n) / (n - 1), 1 - (lp // n) / (n - 1)], -1).ravel().astype(np.float32))
    me.update()
    me.polygons.foreach_set('use_smooth', np.ones(F, bool))
    ob = bpy.data.objects.new(nombre, me); esc.collection.objects.link(ob)
    return ob


ter = malla_terreno(H, 'terreno')
img_alb = bpy.data.images.load(os.path.join(OUT, f'albedo_{n}.png'))
img_agua = bpy.data.images.load(os.path.join(OUT, f'agua_{n}.png')); img_agua.colorspace_settings.name = 'Non-Color'
m = bpy.data.materials.new('terreno'); m.use_nodes = True
nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = img_alb; ta.interpolation = 'Cubic'
tw = nt.nodes.new('ShaderNodeTexImage'); tw.image = img_agua
mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 0.92; mr.inputs['To Max'].default_value = 0.06
# detalle para los renders: variación de color y relieve fino con ruido (en el juego lo pone el shader del terreno)
tc_ = nt.nodes.new('ShaderNodeTexCoord')
def ruido(escala, det=6.0):
    nn = nt.nodes.new('ShaderNodeTexNoise'); nn.inputs['Scale'].default_value = escala; nn.inputs['Detail'].default_value = det
    nt.links.new(tc_.outputs['Object'], nn.inputs['Vector']); return nn
n_g, n_f = ruido(1 / 90.0), ruido(1 / 9.0, 4.0)
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.55; bump.inputs['Distance'].default_value = 6.0
mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'ADD'
nt.links.new(n_g.outputs['Fac'], mx.inputs[0]); nt.links.new(n_f.outputs['Fac'], mx.inputs[1]); nt.links.new(mx.outputs[0], bump.inputs['Height'])
nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
var = nt.nodes.new('ShaderNodeMixRGB'); var.blend_type = 'OVERLAY'; var.inputs['Fac'].default_value = 0.35
nt.links.new(ta.outputs['Color'], var.inputs['Color1']); nt.links.new(n_g.outputs['Fac'], var.inputs['Color2'])
nt.links.new(var.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(tw.outputs['Color'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], bsdf.inputs['Roughness'])
ter.data.materials.append(m)
# más allá del mapa: copias en espejo (a media resolución) para que el horizonte no se corte, como hará el juego
lejos = malla_terreno(H[::2, ::2].copy(), 'terreno_lejos'); lejos.data.materials.append(m)
esc.collection.objects.unlink(lejos)
for ix in (-1, 0, 1):
    for iz in (-1, 0, 1):
        if ix == 0 and iz == 0: continue
        o = bpy.data.objects.new(f'espejo_{ix}_{iz}', lejos.data); esc.collection.objects.link(o)
        o.location = (ix * T.SIZE, -iz * T.SIZE, 0); o.scale = (-1 if ix else 1, -1 if iz else 1, 1)

# mar (el agua del juego, a WL = 0)
bpy.ops.mesh.primitive_plane_add(size=80000, location=(0, 0, 0)); mar = bpy.context.object; mar.name = 'agua'
mm = bpy.data.materials.new('agua'); mm.use_nodes = True
b2 = mm.node_tree.nodes['Principled BSDF']
b2.inputs['Base Color'].default_value = (0.012, 0.06, 0.075, 1); b2.inputs['Roughness'].default_value = 0.05
mar.data.materials.append(mm)

# ---------------------------------------------------------------- cielo y sol
SOL_ELEV, SOL_AZ = 38.0, 205.0          # grados: el sol alto de la referencia, desde el sur-suroeste
w = bpy.data.worlds.new('cielo'); esc.world = w; w.use_nodes = True     # cielo azul de la referencia: degradado de cenit a horizonte
wn = w.node_tree.nodes; tc = wn.new('ShaderNodeTexCoord'); sep = wn.new('ShaderNodeSeparateXYZ'); ramp = wn.new('ShaderNodeValToRGB')
w.node_tree.links.new(tc.outputs['Generated'], sep.inputs[0]); w.node_tree.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.55, 0.68, 0.88, 1)
ramp.color_ramp.elements[1].position = 0.55; ramp.color_ramp.elements[1].color = (0.07, 0.2, 0.62, 1)
bg = wn['Background']; w.node_tree.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.1
sd = bpy.data.lights.new('sol', 'SUN'); sd.energy = 5.5; sd.angle = math.radians(1.2); sd.color = (1.0, 0.96, 0.9)
sol = bpy.data.objects.new('sol', sd); esc.collection.objects.link(sol)


def orientar_sol(elev, az):
    sol.rotation_euler = (math.radians(90 - elev), 0, math.radians(180 - az))


orientar_sol(SOL_ELEV, SOL_AZ)

esc.render.engine = 'BLENDER_EEVEE'
ee = esc.eevee
for k, v in (('taa_render_samples', 48), ('use_raytracing', True), ('use_shadows', True), ('shadow_resolution_scale', 1.0),
             ('use_gtao', True), ('fast_gi_distance', 400.0)):
    if hasattr(ee, k):
        try: setattr(ee, k, v)
        except Exception: pass
esc.view_settings.view_transform = 'AgX'
try: esc.view_settings.look = 'AgX - Punchy'
except Exception: pass
esc.render.image_settings.file_format = 'PNG'

# ---------------------------------------------------------------- render con bruma (pasada de profundidad aparte)
prof = bpy.data.materials.new('profundidad'); prof.use_nodes = True
pn = prof.node_tree.nodes; pn.clear()
cd = pn.new('ShaderNodeCameraData'); em = pn.new('ShaderNodeEmission'); mo = pn.new('ShaderNodeOutputMaterial')
dv = pn.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = 100000.0
prof.node_tree.links.new(cd.outputs['View Distance'], dv.inputs[0]); prof.node_tree.links.new(dv.outputs[0], em.inputs['Color'])
prof.node_tree.links.new(em.outputs['Emission'], mo.inputs['Surface'])
negro = bpy.data.worlds.new('negro'); negro.color = (0, 0, 0)

HAZE = np.array([0.70, 0.79, 0.92], np.float32)   # color de la bruma lejana (sRGB), el azul pálido del horizonte de la referencia


def render(nombre, ancho, alto, bruma=True, k=1 / 22000.0):
    esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = ancho, alto, 100
    ruta = os.path.join(OUT, f'{nombre}.png')
    esc.render.filepath = ruta
    bpy.ops.render.render(write_still=True)
    if not bruma: return ruta
    # profundidad: la distancia a la cámara como emisión, sin cielo ni transformación de color
    vt, lk, wd = esc.view_settings.view_transform, esc.view_settings.look, esc.world
    esc.view_settings.view_transform = 'Standard'
    try: esc.view_settings.look = 'None'
    except Exception: pass
    esc.world = negro; bpy.context.view_layer.material_override = prof
    esc.render.image_settings.file_format = 'OPEN_EXR'; esc.render.image_settings.color_depth = '32'
    rz = os.path.join(OUT, '_prof.exr'); esc.render.filepath = rz
    smp = ee.taa_render_samples; ee.taa_render_samples = 1
    bpy.ops.render.render(write_still=True)
    ee.taa_render_samples = smp
    esc.render.image_settings.file_format = 'PNG'; esc.render.image_settings.color_depth = '8'
    esc.view_settings.view_transform = vt
    try: esc.view_settings.look = lk
    except Exception: pass
    esc.world = wd; bpy.context.view_layer.material_override = None
    iz = bpy.data.images.load(rz); dz = np.array(iz.pixels[:], np.float32).reshape(alto, ancho, 4)[..., 0] * 100000.0; bpy.data.images.remove(iz)
    ic = bpy.data.images.load(ruta); col = np.array(ic.pixels[:], np.float32).reshape(alto, ancho, 4); bpy.data.images.remove(ic)
    t = np.where(dz > 1, np.exp(-(dz * k) ** 1.35), 1.0)[..., None]
    col[..., :3] = col[..., :3] * t + HAZE * (1 - t)
    im = bpy.data.images.new('tmp', ancho, alto, alpha=True); im.pixels.foreach_set(col.ravel())
    im.filepath_raw = ruta; im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
    return ruta


cam = comun.camara('cam'); cam.data.clip_start = 2.0; cam.data.clip_end = 90000.0


def vista(nombre, x, z, alt, rumbo, cabeceo, fov=62, sobre_suelo=True, ancho=1280, alto=720):
    """Cámara en (x, z) del juego a alt m (sobre el suelo o el agua; o altitud absoluta), con rumbo de brújula y cabeceo en grados."""
    y = (max(suelo(x, z), 0) + alt) if sobre_suelo else alt
    cam.data.type = 'PERSP'; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.angle = math.radians(fov)
    cam.location = (x, -z, y); cam.rotation_euler = (math.radians(90 + cabeceo), 0, math.radians(-rumbo))
    comun.info(f'vista {nombre}: x {x:.0f} z {z:.0f} altitud {y:.0f} m (suelo {suelo(x, z):.0f})')
    return render('vista_' + nombre, ancho, alto)


def canon_fondo(x, z, r=350):
    """El punto más bajo cerca de (x, z): para meter la cámara en el cañón."""
    i0 = int((x - r + T.HALF) / T.SIZE * (n - 1)); j0 = int((z - r + T.HALF) / T.SIZE * (n - 1)); k = int(2 * r / T.SIZE * (n - 1)) + 1
    sub = H[j0:j0 + k, i0:i0 + k]; jj, ii = np.unravel_index(np.argmin(sub), sub.shape)
    return float(c[i0 + ii]), float(c[j0 + jj])


def vista_canon(f):
    """Dentro del cañón, a la fracción f de su recorrido, mirando cañón arriba."""
    P = T.densificar(T.RUTAS['canon']['pts']); k = int(f * (len(P) - 1))
    x, z = canon_fondo(*P[k], r=220); dx, dz = P[k + 6] - P[k]; L = math.hypot(dx, dz)
    return vista('canon', x - dx / L * 1300, z - dz / L * 1300, 1750, math.degrees(math.atan2(dx, -dz)) % 360, -30, sobre_suelo=False)


VISTAS = {
    'inicio': lambda: vista('inicio', T.INICIO['x'], T.INICIO['z'], T.INICIO['height'], T.INICIO['heading'], -9),
    'macizo': lambda: vista('macizo', -2600, -5600, 2450, 172, -17, sobre_suelo=False),
    'fiordo_oeste': lambda: vista('fiordo_oeste', -10200, 2200, 380, 82, -5, sobre_suelo=False),
    'fiordo_norte': lambda: vista('fiordo_norte', 1300, -3400, 520, 8, -6, sobre_suelo=False),
    'llanura': lambda: vista('llanura', 1500, 11200, 280, 340, -6),
    'canon': lambda: vista_canon(0.27),
}


def _emision(nombre, col, f):
    mt = bpy.data.materials.get(nombre)
    if mt: return mt
    mt = bpy.data.materials.new(nombre); mt.use_nodes = True
    b = mt.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = f
    return mt


# ---------------------------------------------------------------- plano cenital con nombres
NOMBRES = [('MACIZO NORTE', -3000, -10300, 520), ('Pico Mayor', -2400, -7400, 360), ('FIORDO NORTE', 3400, -4600, 380),
           ('LAGO CENTRAL', -900, -1300, 400), ('FIORDO DEL OESTE', -8600, 2350, 400), ('CAÑÓN DEL ESTE', 8600, 900, 400),
           ('MESETA DEL ESTE', 8900, -1500, 340), ('LLANURA DORADA', 2600, 6500, 480), ('Río', -800, 8300, 340),
           ('SIERRA DEL SUR', -8300, 10200, 380), ('PÁRAMO DEL OESTE', -8800, -1200, 360)]


def plano():
    orientar_sol(42, 315)                                # luz de mapa: desde el noroeste
    objs = []
    def texto(t, x, z, size=420, col=(1, 1, 1)):
        cu = bpy.data.curves.new('t', 'FONT'); cu.body = t; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
        cu.materials.append(_emision('txt', col, 4.0))
        ob = bpy.data.objects.new('t_' + t, cu); ob.location = (x, -z, 5200); esc.collection.objects.link(ob); objs.append(ob)
        cs = cu.copy(); cs.materials.clear(); cs.materials.append(_emision('sombra', (0, 0, 0), 0.0))
        sh = bpy.data.objects.new('s_' + t, cs); sh.location = (x + size * 0.07, -z - size * 0.07, 5100); esc.collection.objects.link(sh); objs.append(sh)
    for (t, x, z, s) in NOMBRES: texto(t, x, z, s)
    texto('INICIO', T.INICIO['x'] + 900, T.INICIO['z'] + 450, 300, (1, 0.85, 0.3))
    texto('N', 10800, -11000, 700, (1, 0.85, 0.3))
    texto('Límite del área (15 s)', 0, T.AREA_R - 600, 300, (1, 0.45, 0.4))
    bpy.ops.curve.primitive_bezier_circle_add(radius=T.AREA_R, location=(0, 0, 5000)); ci = bpy.context.object
    ci.data.bevel_depth = 45; ci.data.materials.append(_emision('area', (1, 0.15, 0.1), 3)); objs.append(ci)
    bpy.ops.mesh.primitive_cone_add(radius1=170, depth=10, location=(T.INICIO['x'], -T.INICIO['z'], 5000)); ini = bpy.context.object
    ini.data.materials.append(_emision('ini', (1, 0.85, 0.2), 4)); objs.append(ini)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = T.SIZE
    cam.location = (0, 0, 20000); cam.rotation_euler = (0, 0, 0)
    r = render('plano_vuelo_libre', 1600, 1600, bruma=False)
    for o in objs: bpy.data.objects.remove(o)
    orientar_sol(SOL_ELEV, SOL_AZ)
    return r


hechas = []
if not SOLO or 'plano' in SOLO: hechas.append(plano())
for k, f in VISTAS.items():
    if not SOLO or k in SOLO: hechas.append(f())
for r in hechas: comun.ok(r)
try:
    ruta = os.path.join(comun.PROYECTOS, 'sky_apex_vuelo_libre.blend')
    bpy.ops.wm.save_as_mainfile(filepath=ruta, compress=True); comun.ok('escena: ' + ruta)
except Exception as e:
    comun.aviso('no se pudo guardar la escena: ' + str(e))
