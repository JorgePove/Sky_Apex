"""Comprueba que Claude puede trabajar con Blender en este equipo (v19+).
Se lanza con:  node herramientas/blender/lanzar.mjs herramientas/blender/comprobar.py [-- etapa ...]
Etapas (por defecto, las tres):
  arranque  versión de Blender y de Python, importadores disponibles y tarjetas gráficas para Cycles
  basico    crea un cubo y un esqueleto, renderiza un PNG, exporta un GLB y guarda/borra un .blend de prueba en BLENDER_PROYECTOS
  modelos   abre nuestros modelos (los GLB del juego y Drogon/Dragon.blend), cuenta huesos, animaciones y triángulos y renderiza una vista de cada uno
Las imágenes y los GLB de prueba quedan en herramientas/blender/salida/ (no se sube a GitHub). Sale con código 1 si alguna etapa falla."""
import bpy, os, sys, math, traceback
from mathutils import Vector

try:
    sys.stdout.reconfigure(encoding='utf-8'); sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

RAIZ = os.environ.get('SKY_PROYECTO', os.getcwd())
SALIDA = os.environ.get('SKY_SALIDA', os.path.join(RAIZ, 'herramientas', 'blender', 'salida'))
PROYECTOS = os.environ.get('BLENDER_PROYECTOS')
os.makedirs(SALIDA, exist_ok=True)


def titulo(t): print('\n=== ' + t + ' ===')
def ok(t): print('[OK] ' + t)
def aviso(t): print('[!!] ' + t)
def vacia(): bpy.ops.wm.read_factory_settings(use_empty=True)


def existe_op(ruta):
    grupo, fn = ruta.split('.')
    try:
        getattr(getattr(bpy.ops, grupo), fn).get_rna_type(); return True
    except Exception:
        return False


def mallas(objs): return [o for o in objs if o.type == 'MESH']
def triangulos(objs): return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in mallas(objs))


def foto(ruta, objs, direccion=(1.0, -1.3, 0.7), ancho=960, alto=540):
    """Renderiza una vista tres cuartos de las mallas de objs (Workbench con texturas; si no puede, Cycles en CPU con pocas muestras)."""
    esc = bpy.context.scene
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in mallas(objs):
        oe = o.evaluated_get(dg)
        pts += [oe.matrix_world @ Vector(c) for c in oe.bound_box]
    if not pts:
        aviso('sin mallas que encuadrar: ' + os.path.basename(ruta)); return False
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centro, ext = (mn + mx) / 2, (mx - mn)
    cd = bpy.data.cameras.new('cam_prueba'); cd.lens = 50
    cam = bpy.data.objects.new('cam_prueba', cd); esc.collection.objects.link(cam); esc.camera = cam
    medio_v = math.atan((18.0 * alto / ancho) / cd.lens)
    d = 0.5 * max(ext) * 1.05 / math.sin(medio_v)
    cam.location = centro + Vector(direccion).normalized() * d
    cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.clip_start, cd.clip_end = d / 200, d * 20
    esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = ancho, alto, 100
    esc.render.image_settings.file_format = 'PNG'; esc.render.filepath = ruta
    if esc.world is None: esc.world = bpy.data.worlds.new('mundo_prueba')
    esc.world.color = (0.13, 0.13, 0.16)
    try:
        esc.render.engine = 'BLENDER_WORKBENCH'
        esc.display.shading.light = 'STUDIO'; esc.display.shading.color_type = 'TEXTURE'; esc.display.render_aa = '8'
        bpy.ops.render.render(write_still=True)
    except Exception as e:
        aviso('Workbench falló (%s): pruebo Cycles en CPU' % e)
        esc.render.engine = 'CYCLES'; esc.cycles.device = 'CPU'; esc.cycles.samples = 16
        bpy.ops.render.render(write_still=True)
    return os.path.exists(ruta)


def arranque():
    titulo('1. Arranque')
    ok('Blender %s · Python %s' % (bpy.app.version_string, sys.version.split()[0]))
    for nombre, op in [('glTF/GLB importar', 'import_scene.gltf'), ('glTF/GLB exportar', 'export_scene.gltf'), ('FBX importar', 'import_scene.fbx'),
                       ('OBJ importar', 'wm.obj_import'), ('STL importar', 'wm.stl_import')]:
        (ok if existe_op(op) else aviso)('%s (%s)' % (nombre, op))
    try:
        cy = bpy.context.preferences.addons['cycles'].preferences
        for tipo in ('OPTIX', 'CUDA'):
            try:
                cy.compute_device_type = tipo
                try: cy.refresh_devices()
                except AttributeError: cy.get_devices()
                nombres = [d.name for d in cy.devices if d.type == tipo]
                if nombres: ok('Cycles ve con %s: %s' % (tipo, ', '.join(nombres))); break
            except Exception:
                continue
        else:
            aviso('Cycles no encuentra una tarjeta NVIDIA (OptiX/CUDA): usará la CPU')
        otros = [d.name + ' (' + d.type + ')' for d in cy.devices if d.type not in ('OPTIX', 'CUDA')]
        if otros: print('     otros dispositivos: ' + ', '.join(otros))
    except Exception as e:
        aviso('No se pudo consultar Cycles: %s' % e)


def basico():
    titulo('2. Lo básico: cubo, esqueleto, render y exportación')
    vacia()
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1)); cubo = bpy.context.active_object; cubo.name = 'cubo_prueba'
    bpy.ops.object.armature_add(location=(3, 0, 0)); arm = bpy.context.active_object; arm.name = 'esqueleto_prueba'
    ok('creados: %s (%d triángulos) y %s (%d hueso)' % (cubo.name, triangulos([cubo]), arm.name, len(arm.data.bones)))
    png = os.path.join(SALIDA, 'prueba_basico.png')
    ok('render: ' + png) if foto(png, [cubo]) else aviso('el render no se escribió')
    glb = os.path.join(SALIDA, 'prueba_basico.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB')
    ok('exportado GLB: %s (%d bytes)' % (glb, os.path.getsize(glb))) if os.path.exists(glb) else aviso('no se escribió el GLB')
    if PROYECTOS and os.path.isdir(PROYECTOS):
        r = os.path.join(PROYECTOS, 'prueba_conexion.blend')
        bpy.ops.wm.save_as_mainfile(filepath=r)
        if os.path.exists(r) and os.path.getsize(r) > 0:
            ok('escritura en la carpeta de proyectos: %s (%d bytes); la borro' % (r, os.path.getsize(r))); os.remove(r)
        else:
            aviso('no se pudo escribir en ' + PROYECTOS)
    else:
        aviso('BLENDER_PROYECTOS no está definida (línea «proyectos=» de ruta_local.txt) o la carpeta no existe')


def resumen(nombre, objs):
    arms = [o for o in objs if o.type == 'ARMATURE']
    print('     %s: %d mallas, %d triángulos, %d armaduras con %d huesos, %d materiales, %d imágenes' % (
        nombre, len(mallas(objs)), triangulos(objs), len(arms), sum(len(a.data.bones) for a in arms), len(bpy.data.materials), len(bpy.data.images)))
    acts = list(bpy.data.actions)
    if acts:
        print('     %d animaciones: %s' % (len(acts), ', '.join('%s (%d-%d)' % (a.name, a.frame_range[0], a.frame_range[1]) for a in acts[:12]) + (' …' if len(acts) > 12 else '')))
    return arms


def poner_accion(arm, trozo):
    """Pone la primera animación cuyo nombre contenga trozo, a mitad de recorrido; devuelve su nombre o None."""
    for a in bpy.data.actions:
        if trozo in a.name.lower():
            ad = arm.animation_data or arm.animation_data_create()
            ad.action = a
            bpy.context.scene.frame_set(int((a.frame_range[0] + a.frame_range[1]) / 2))
            bpy.context.view_layer.update()
            return a.name
    return None


def glb(nombre, ruta, accion=None):
    vacia()
    bpy.ops.import_scene.gltf(filepath=ruta)
    objs = list(bpy.context.scene.objects)
    ok('%s: importado %s (%.1f MB)' % (nombre, os.path.relpath(ruta, RAIZ), os.path.getsize(ruta) / 1048576))
    arms = resumen(nombre, objs)
    if accion and arms:
        p = poner_accion(arms[0], accion)
        print('     pose de la animación «%s»' % p if p else '     (sin animación «%s»: pose de reposo)' % accion)
    png = os.path.join(SALIDA, 'modelo_' + nombre.lower() + '.png')
    ok('render: ' + png) if foto(png, objs) else aviso('sin render de ' + nombre)


def blend(nombre, ruta):
    bpy.ops.wm.open_mainfile(filepath=ruta)
    objs = list(bpy.context.scene.objects)
    ok('%s: abierto %s (%.1f MB)' % (nombre, os.path.relpath(ruta, RAIZ), os.path.getsize(ruta) / 1048576))
    resumen(nombre, objs)
    png = os.path.join(SALIDA, 'modelo_' + nombre.lower() + '.png')
    ok('render: ' + png) if foto(png, [o for o in objs if o.visible_get() or True]) else aviso('sin render de ' + nombre)


def modelos():
    titulo('3. Nuestros modelos')
    for nombre, rel, acc in [('Alientormenta', 'modelos/tyrant_web.glb', 'vuelo'), ('Abrasanubes', 'modelos/dragon_rojo.glb', None), ('Ventoscuro', 'modelos/drogon_web.glb', None)]:
        ruta = os.path.join(RAIZ, rel)
        if os.path.exists(ruta): glb(nombre, ruta, acc)
        else: aviso('no existe ' + rel)
    ruta = os.path.join(RAIZ, 'Drogon', 'Drogon', 'Dragon.blend')
    if os.path.exists(ruta): blend('Drogon_blend', ruta)
    else: aviso('no existe Drogon/Drogon/Dragon.blend')


ETAPAS = {'arranque': arranque, 'basico': basico, 'modelos': modelos}
pedidas = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
fallos = 0
for n in (pedidas or list(ETAPAS)):
    if n not in ETAPAS:
        aviso('etapa desconocida: ' + n); fallos += 1; continue
    try:
        ETAPAS[n]()
    except Exception:
        fallos += 1; print('[XX] la etapa «%s» falló:' % n); traceback.print_exc()
print('\nRESULTADO: ' + ('todo bien' if not fallos else '%d etapa(s) con fallos' % fallos))
sys.exit(1 if fallos else 0)
