"""Convierte una imagen que Node no sabe leer (WebP, por ejemplo) a PNG RGBA de 8 bits, con la transparencia tal cual (v26).
Uso:  node herramientas/blender/lanzar.mjs herramientas/blender/imagen_a_png.py -- entrada.webp salida.png
Lee los píxeles en bruto (sin gestión de color) y escribe el PNG a mano con zlib, así que los valores salen exactamente como vienen."""
import bpy, os, sys, struct, zlib

try:
    sys.stdout.reconfigure(encoding='utf-8'); sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) < 2:
    raise SystemExit('Uso: imagen_a_png.py -- entrada salida.png')
src, dst = (os.path.abspath(a) for a in args[:2])

img = bpy.data.images.load(src)
img.colorspace_settings.name = 'Non-Color'                 # sin conversiones: los bytes del archivo, divididos entre 255
img.alpha_mode = 'STRAIGHT'
w, h = img.size
px = img.pixels[:]                                         # RGBA en coma flotante, de abajo arriba
rows = []
for y in range(h - 1, -1, -1):                             # PNG: de arriba abajo
    o = y * w * 4
    rows.append(b'\x00' + bytes(max(0, min(255, round(v * 255))) for v in px[o:o + w * 4]))
raw = b''.join(rows)


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


os.makedirs(os.path.dirname(dst), exist_ok=True)
with open(dst, 'wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
alpha = px[3::4]
print(f'{os.path.basename(src)} → {dst}: {w}×{h}, alfa {min(alpha):.3f}-{max(alpha):.3f}, {sum(1 for a in alpha if a < 0.02)} píxeles transparentes de {w * h}')
