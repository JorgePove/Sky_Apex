"""Vuelo Libre (v38), paso 1: genera el terreno (terreno.py) y guarda las rejillas y una vista cenital para revisarlo.
Uso: node herramientas/blender/lanzar.mjs herramientas/blender/paisaje/01_generar.py -- [N=1024] [--sin-erosion]
Salida en herramientas/blender/salida/paisaje/: terreno_N.npz (altura, materiales) y plano_N.png."""
import os, sys, time
import numpy as np
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI); sys.path.insert(0, os.path.dirname(AQUI))
import bpy
import comun
import terreno as T

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
n = int(next((a for a in args if a.isdigit()), 1024))
eros = '--sin-erosion' not in args
OUT = comun.carpeta(comun.SALIDA, 'paisaje')


def guardar_png(ruta, rgb):
    """rgb: (alto, ancho, 3) en 0..1 (sRGB), fila 0 = arriba."""
    H, W, _ = rgb.shape
    img = bpy.data.images.new('tmp', W, H, alpha=True)
    px = np.ones((H, W, 4), np.float32); px[..., :3] = rgb
    img.pixels.foreach_set(px[::-1].ravel())
    img.filepath_raw = ruta; img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(img)


t0 = time.time()
res = T.generar(n, erosion=eros)
M = T.materiales(res)
h = res['h']
comun.ok(f'terreno {n}×{n} ({T.SIZE / 1000:.0f} km) en {time.time() - t0:.0f} s: {h.min():.0f}..{h.max():.0f} m, '
         f'mar {100 * (h < 0).mean():.1f} %, nieve {100 * (M["nieve"] > 0.5).mean():.1f} %, roca {100 * (M["roca"] > 0.5).mean():.1f} %')
np.savez_compressed(os.path.join(OUT, f'terreno_{n}.npz'), h=h, roca=M['roca'], nieve=M['nieve'], agua=M['agua'], verde=M['verde'], flujo=res['flujo'], sed=res['sed'])
guardar_png(os.path.join(OUT, f'plano_{n}.png'), T.vista_plano(res, M))
guardar_png(os.path.join(OUT, f'albedo_{n}.png'), T.color_albedo(res, M))           # para la escena de Blender (02_escena.py)
guardar_png(os.path.join(OUT, f'agua_{n}.png'), np.repeat(M['agua'][..., None], 3, -1))
comun.ok('guardado en ' + OUT)
