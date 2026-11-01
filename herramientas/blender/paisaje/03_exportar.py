"""Vuelo Libre (v38), paso 3: convierte el terreno generado (terreno_N.npz) en el archivo que carga el juego, mapas/vuelo_libre.js.
Uso: node herramientas/blender/lanzar.mjs herramientas/blender/paisaje/03_exportar.py -- [N=2048]
El archivo lleva dos PNG en base64 (RGB de 8 bits, alfa siempre 255 para que el navegador no toque los colores al leerlos):
  alturas:    R, G = altura en 16 bits (h = h0 + (R·256 + G)·paso m) · B = verdor (0 = hierba dorada, 255 = verde)
  materiales: R = roca · G = nieve · B = agua pintada (río del cañón, lagos de montaña, arroyos)
Fila 0 = borde norte (z = -size/2), columna 0 = borde oeste (x = -size/2); la rejilla va de borde a borde (n puntos por lado)."""
import os, sys, json, base64, zlib, struct
import numpy as np
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI); sys.path.insert(0, os.path.dirname(AQUI))
import comun
import terreno as T

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
n = int(next((a for a in args if a.isdigit()), 2048))
OUT = comun.carpeta(comun.SALIDA, 'paisaje')
dat = np.load(os.path.join(OUT, f'terreno_{n}.npz'))
H0, PASO = -200.0, 0.06


def png_rgb(rgb):
    """PNG RGBA de 8 bits (alfa 255) con el filtro «Sub» en cada fila: las diferencias pequeñas comprimen bien."""
    h, w, _ = rgb.shape
    px = np.concatenate([rgb.astype(np.uint8), np.full((h, w, 1), 255, np.uint8)], -1)
    sub = px.astype(np.int16); sub[:, 1:] -= px[:, :-1]
    filas = np.concatenate([np.ones((h, 1), np.uint8), (sub & 255).astype(np.uint8).reshape(h, w * 4)], 1)
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(filas.tobytes(), 9)) + chunk(b'IEND', b''))


q = lambda a: np.clip(np.round(a * 255), 0, 255).astype(np.uint8)
hq = np.clip(np.round((dat['h'] - H0) / PASO), 0, 65535).astype(np.uint32)
alt = np.stack([hq >> 8, hq & 255, q(dat['verde'])], -1)
mat = np.stack([q(dat['roca']), q(dat['nieve']), q(dat['agua'])], -1)
p_alt, p_mat = png_rgb(alt), png_rgb(mat)
comun.info(f'alturas {len(p_alt) / 1e6:.1f} MB · materiales {len(p_mat) / 1e6:.1f} MB')
with open(os.path.join(OUT, f'mapa_alturas_{n}.png'), 'wb') as f: f.write(p_alt)       # para mirarlos
with open(os.path.join(OUT, f'mapa_materiales_{n}.png'), 'wb') as f: f.write(p_mat)

meta = dict(version=1, size=T.SIZE, n=n, h0=H0, paso=PASO, hMin=round(float(dat['h'].min()), 1), hMax=round(float(dat['h'].max()), 1),
            area=dict(x=0, z=0, r=T.AREA_R), inicio=T.INICIO)
dst = comun.carpeta(comun.RAIZ, 'mapas')
ruta = os.path.join(dst, 'vuelo_libre.js')
with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
    f.write('/* Sky Apex · mapa «vuelo_libre» (v38): paisaje de 24 × 24 km hecho en Blender. ARCHIVO GENERADO por\n'
            '   herramientas/blender/paisaje/03_exportar.py (formato en su cabecera): no editar a mano. Lo carga el juego al entrar en Vuelo Libre. */\n')
    f.write('(window.SKY_MAPAS = window.SKY_MAPAS || {}).vuelo_libre = Object.assign(' + json.dumps(meta, ensure_ascii=False) + ', {\n')
    f.write("  alturas: '" + base64.b64encode(p_alt).decode() + "',\n")
    f.write("  materiales: '" + base64.b64encode(p_mat).decode() + "'\n});\n")
comun.ok(f'{ruta} ({os.path.getsize(ruta) / 1e6:.1f} MB)')
