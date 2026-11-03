"""Enemigos nuevos (v29), paso 1: analizar los modelos que pasó Jorge y sacar vistas de revisión.
Lanzar:  node tools/blender/run.mjs tools/blender/enemies/01_analyze.py [-- nombre1 nombre2 …]
Para cada GLB: piezas, triángulos, materiales, texturas (y su tamaño), esqueletos, animaciones y caja; vistas en salida/enemigos/."""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C

MODELOS = {
    'balista': 'source_assets/models/artillery_variants/ballista_alt.glb',
    'catapulta': 'source_assets/models/artillery_variants/catapult_alt.glb',
    'canon': 'source_assets/models/artillery_variants/cannon_alt.glb',
    'barco': 'source_assets/models/artillery_variants/ship_alt.glb',
    'barco02': 'source_assets/models/artillery_variants/ship_alt_02.glb',
    'sierpe': 'source_assets/models/dragons_raw/black_myth_wukong_-_kang_jin_long_static.glb',
}
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = C.carpeta(C.SALIDA, 'enemies')
for nombre, rel in MODELOS.items():
    if args and nombre not in args: continue
    C.vacia()
    ruta = os.path.join(C.RAIZ, rel)
    bpy.ops.import_scene.gltf(filepath=ruta)
    objs = list(bpy.context.scene.objects)
    ms = C.mallas(objs)
    mn, mx = C.caja(ms)
    C.ok('%s (%s, %.1f MB): %d objetos, %d mallas, %d triángulos; caja %.2f × %.2f × %.2f (min %s)' % (
        nombre, rel, os.path.getsize(ruta) / 1048576, len(objs), len(ms), C.triangulos(ms), *(mx - mn), tuple(round(v, 2) for v in mn)))
    mats = {m.name for o in ms for m in o.data.materials if m}
    C.info('materiales %d: %s' % (len(mats), ', '.join(sorted(mats))[:400]))
    for im in bpy.data.images:
        C.info('textura %s %dx%d' % (im.name, im.size[0], im.size[1]))
    arms = [o for o in objs if o.type == 'ARMATURE']
    for a in arms: C.info('esqueleto %s: %d huesos' % (a.name, len(a.data.bones)))
    for ac in bpy.data.actions: C.info('animación %s: %d-%d' % (ac.name, *ac.frame_range))
    piezas = sorted(ms, key=lambda o: -C.triangulos([o]))[:12]
    for o in piezas:
        a, b = C.caja([o])
        C.info('  pieza %-40s %7d tris  caja %.2f×%.2f×%.2f  centro (%.2f, %.2f, %.2f)' % (o.name[:40], C.triangulos([o]), *(b - a), *((a + b) / 2)))
    C.vistas(os.path.join(out, '01_' + nombre), ms, ('izquierda', 'frente', 'arriba', 'tres_cuartos'))
C.ok('vistas en ' + out)
