"""Syrax, paso 10: renders con Cycles (RTX 2060) de las animaciones de 09_animar.py.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/syrax/10_video.py [-- fotos | videos]
· fotos: fotogramas sueltos grandes (para revisar la deformación) → salida/syrax/10_fotos_<clip>.png
· videos: un MP4 por clip (H.264, 960×540, 30 fps) → salida/syrax/syrax_<clip>.mp4 (el vuelo y el hover, dos vueltas; el planeo, una)"""
import bpy, os, sys, math
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C

PRJ = os.path.join(C.PROYECTOS, 'Syrax'); OUT = C.carpeta(C.SALIDA, 'syrax')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
modo = args[0] if args else 'fotos'
bpy.ops.wm.open_mainfile(filepath=os.path.join(PRJ, 'syrax_anim.blend'))
esc = bpy.context.scene
arm = next(o for o in esc.objects if o.type == 'ARMATURE'); malla = next(o for o in esc.objects if o.type == 'MESH')
arm.hide_render = True

# Cycles en la RTX 2060, con eliminación de ruido
esc.render.engine = 'CYCLES'
cy = bpy.context.preferences.addons['cycles'].preferences; cy.compute_device_type = 'OPTIX'
try: cy.refresh_devices()
except AttributeError: cy.get_devices()
for d in cy.devices: d.use = d.type == 'OPTIX'
esc.cycles.device = 'GPU'; esc.cycles.samples = 32; esc.cycles.use_denoising = True
try: esc.cycles.denoiser = 'OPTIX'
except Exception: pass
esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = 960, 540, 100
esc.view_settings.view_transform = 'Standard'                 # (AgX y Filmic lavan el dorado)
# cielo y sol
w = esc.world or bpy.data.worlds.new('cielo'); esc.world = w; w.use_nodes = True
bg = w.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (0.40, 0.56, 0.82, 1); bg.inputs['Strength'].default_value = 0.55
sd = bpy.data.lights.new('sol', 'SUN'); sd.energy = 2.6; sd.color = (1.0, 0.94, 0.84); sd.angle = math.radians(3)
sol = bpy.data.objects.new('sol', sd); esc.collection.objects.link(sol); sol.rotation_euler = (math.radians(40), math.radians(-25), math.radians(35))

cam = C.camara('cam_video'); cam.data.lens = 50
def encuadre(direccion, centro=(0, -2, 6.5), dist=95):
    d = Vector(direccion).normalized(); c = Vector(centro)
    cam.location = c + d * dist; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_start, cam.data.clip_end = 1, 1000


def poner(clip, vueltas):
    act = bpy.data.actions[clip]; arm.animation_data.action = act
    for fc in act.fcurves if hasattr(act, 'fcurves') else []:
        if not any(m.type == 'CYCLES' for m in fc.modifiers): fc.modifiers.new('CYCLES')
    try:                                                      # (acciones por capas de Blender 4.4+: las curvas están en los canales)
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for fc in cb.fcurves:
                        if not any(m.type == 'CYCLES' for m in fc.modifiers): fc.modifiers.new('CYCLES')
    except AttributeError:
        pass
    a, b = act.frame_range; n = int(round(b - a))
    esc.frame_start, esc.frame_end = 0, n * vueltas - 1
    return n


VISTAS = {   # clip: [(dirección de la cámara, vueltas)]
    'vuelo': [((1.0, -1.15, 0.35), 2), ((-1.0, 0.12, 0.08), 1)],
    'hover': [((-1.0, -0.9, 0.15), 2)],
    'planeo': [((-0.7, 1.0, 0.55), 1)],
}
if modo == 'fotos':
    for clip, vs in VISTAS.items():
        n = poner(clip, 1); rutas = []
        for i, (d, _) in enumerate(vs[:1] + [((-1.0, 0.1, 0.1), 1)]):
            encuadre(d)
            for k in range(4):
                esc.frame_set(round(k * n / 4)); r = os.path.join(OUT, 'v%d%d.png' % (i, k))
                esc.render.filepath = r; esc.render.image_settings.file_format = 'PNG'; bpy.ops.render.render(write_still=True); rutas.append(r)
        C.hoja(rutas, os.path.join(OUT, '10_fotos_%s.png' % clip), 4)
        for r in rutas: os.remove(r)
        C.ok('10_fotos_%s.png' % clip)
else:
    try: esc.render.image_settings.media_type = 'VIDEO'           # (Blender 5: el vídeo es otro «tipo de medio»)
    except (AttributeError, TypeError): pass
    esc.render.image_settings.file_format = 'FFMPEG'
    esc.render.ffmpeg.format = 'MPEG4'; esc.render.ffmpeg.codec = 'H264'; esc.render.ffmpeg.constant_rate_factor = 'HIGH'
    esc.render.fps = 30
    for clip, vs in VISTAS.items():
        for i, (d, vueltas) in enumerate(vs):
            n = poner(clip, vueltas); encuadre(d)
            esc.render.filepath = os.path.join(OUT, 'syrax_%s%s.mp4' % (clip, '' if i == 0 else '_lado'))
            bpy.ops.render.render(animation=True)
            C.ok(esc.render.filepath)
