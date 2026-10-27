"""Resumen de un FBX binario sin Blender: versión, ejes, mallas (vértices/triángulos), huesos, skin, materiales,
texturas (y si van incrustadas) y animaciones (duración y nº de curvas).
Uso: python info_fbx.py archivo.fbx [--huesos]"""
import struct, sys, zlib
from collections import Counter

if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
path = sys.argv[1]
SHOW_BONES = '--huesos' in sys.argv
data = open(path, 'rb').read()
if not data.startswith(b'Kaydara FBX Binary'):
    print('No es un FBX binario (¿ASCII?):', data[:60]); sys.exit(1)
version = struct.unpack_from('<I', data, 23)[0]
wide = version >= 7500
HEAD = 25 if wide else 13

def read_prop(o):
    t = chr(data[o]); o += 1
    if t == 'Y': return struct.unpack_from('<h', data, o)[0], o + 2
    if t == 'C': return data[o] != 0, o + 1
    if t == 'I': return struct.unpack_from('<i', data, o)[0], o + 4
    if t == 'F': return struct.unpack_from('<f', data, o)[0], o + 4
    if t == 'D': return struct.unpack_from('<d', data, o)[0], o + 8
    if t == 'L': return struct.unpack_from('<q', data, o)[0], o + 8
    if t in 'fdlib':
        n, enc, clen = struct.unpack_from('<III', data, o); o += 12
        return ('ARR', t, n, enc, o, clen), o + clen
    if t in 'SR':
        n = struct.unpack_from('<I', data, o)[0]; o += 4
        v = data[o:o + n]
        return (v.decode('utf8', 'replace') if t == 'S' else ('RAW', n)), o + n
    raise ValueError('tipo de propiedad desconocido ' + t + ' en ' + str(o))

def array(p):
    _, t, n, enc, o, clen = p
    raw = data[o:o + clen]
    if enc == 1: raw = zlib.decompress(raw)
    fmt = {'f': 'f', 'd': 'd', 'l': 'q', 'i': 'i', 'b': 'b'}[t]
    return struct.unpack('<%d%s' % (n, fmt), raw[:n * struct.calcsize(fmt)])

def read_node(o):
    if wide: end, nprop, plen = struct.unpack_from('<QQQ', data, o); o += 24
    else: end, nprop, plen = struct.unpack_from('<III', data, o); o += 12
    nlen = data[o]; o += 1
    if end == 0: return None, o
    name = data[o:o + nlen].decode('ascii', 'replace'); o += nlen
    props = []
    for _ in range(nprop):
        v, o = read_prop(o); props.append(v)
    kids = []
    while o < end - HEAD + 1 and o < end:
        if data[o:o + HEAD] == b'\0' * HEAD: o += HEAD; break
        k, o = read_node(o)
        if k is None: break
        kids.append(k)
    return {'n': name, 'p': props, 'c': kids}, end

top = []
o = 27
while o < len(data) - HEAD:
    nd, o2 = read_node(o)
    if nd is None: break
    top.append(nd); o = o2

def find(node_list, name): return [n for n in node_list if n['n'] == name]
def child(n, name):
    for c in n['c']:
        if c['n'] == name: return c
    return None
def p70(n, key):
    p = child(n, 'Properties70')
    if not p: return None
    for c in p['c']:
        if c['p'] and c['p'][0] == key: return c['p'][4:] if len(c['p']) > 4 else c['p'][1:]
    return None
clean = lambda s: s.split('\x00\x01')[0] if isinstance(s, str) else s

print(f'== {path}\nFBX {version} · {len(data) / 1e6:.1f} MB')
hdr = find(top, 'FBXHeaderExtension')
if hdr:
    ci = child(hdr[0], 'Creator')
    if ci: print('Creado con:', ci['p'][0])
gs = find(top, 'GlobalSettings')
if gs:
    g = gs[0]
    print('Ejes: Up', p70(g, 'UpAxis'), 'signo', p70(g, 'UpAxisSign'), '· Front', p70(g, 'FrontAxis'), p70(g, 'FrontAxisSign'), '· escala unidad (cm)', p70(g, 'UnitScaleFactor'), '· fps modo', p70(g, 'TimeMode'), p70(g, 'CustomFrameRate'))
objs = find(top, 'Objects')[0]['c'] if find(top, 'Objects') else []
cnt = Counter()
for ob in objs:
    sub = clean(ob['p'][2]) if len(ob['p']) > 2 else ''
    cnt[ob['n'] + ('/' + sub if sub else '')] += 1
print('Objetos:', dict(cnt))

tot_tri = tot_v = 0
for ob in objs:
    if ob['n'] != 'Geometry' or (len(ob['p']) > 2 and ob['p'][2] != 'Mesh'): continue
    vv = child(ob, 'Vertices'); pv = child(ob, 'PolygonVertexIndex')
    if not vv or not pv: continue
    nv = vv['p'][0][2] // 3
    idx = array(pv['p'][0]); polys = tri = 0; k = 0
    for x in idx:
        k += 1
        if x < 0: polys += 1; tri += k - 2; k = 0
    layers = [c['n'] for c in ob['c'] if c['n'].startswith('LayerElement')]
    uvs = sum(1 for c in ob['c'] if c['n'] == 'LayerElementUV')
    shapes = 0
    print(f"  Malla '{clean(ob['p'][1])}': {nv} vértices, {polys} polígonos → {tri} triángulos · capas UV {uvs} · {sorted(set(layers))}")
    tot_tri += tri; tot_v += nv
if tot_tri: print(f'  TOTAL mallas: {tot_v} vértices, {tot_tri} triángulos')

bones = [clean(ob['p'][1]) for ob in objs if ob['n'] == 'Model' and len(ob['p']) > 2 and ob['p'][2] == 'LimbNode']
clusters = sum(1 for ob in objs if ob['n'] == 'Deformer' and len(ob['p']) > 2 and ob['p'][2] == 'Cluster')
skins = sum(1 for ob in objs if ob['n'] == 'Deformer' and len(ob['p']) > 2 and ob['p'][2] == 'Skin')
blend = sum(1 for ob in objs if ob['n'] == 'Deformer' and len(ob['p']) > 2 and ob['p'][2] in ('BlendShape', 'BlendShapeChannel'))
print(f'Huesos (LimbNode): {len(bones)} · skins {skins} · clusters (huesos que deforman) {clusters} · blendshapes {blend}')
if bones:
    print('  Muestra de nombres:', bones[:12], '...' if len(bones) > 12 else '')
    if SHOW_BONES: print('  TODOS:', bones)

for ob in objs:
    if ob['n'] == 'Material': print(f"  Material '{clean(ob['p'][1])}'")
for ob in objs:
    if ob['n'] == 'Texture':
        fn = child(ob, 'RelativeFilename') or child(ob, 'FileName')
        print(f"  Textura '{clean(ob['p'][1])}' → {fn['p'][0] if fn else '?'}")
for ob in objs:
    if ob['n'] == 'Video':
        ct = child(ob, 'Content'); fn = child(ob, 'RelativeFilename')
        size = ct['p'][0][1] if ct and ct['p'] and isinstance(ct['p'][0], tuple) else 0
        print(f"  Imagen incrustada '{clean(ob['p'][1])}' ({fn['p'][0] if fn else ''}): {size / 1e6:.2f} MB")

KT = 46186158000
stacks = [ob for ob in objs if ob['n'] == 'AnimationStack']
curves = [ob for ob in objs if ob['n'] == 'AnimationCurve']
keys = [child(c, 'KeyTime')['p'][0][2] for c in curves if child(c, 'KeyTime')]
for s in stacks:
    a = p70(s, 'LocalStart') or [0]; b = p70(s, 'LocalStop')
    dur = (b[0] - a[0]) / KT if b else None
    print(f"Animación '{clean(s['p'][1])}': {dur:.2f} s" if dur is not None else f"Animación '{clean(s['p'][1])}'")
if curves: print(f'Curvas de animación: {len(curves)} · claves por curva: máx {max(keys) if keys else 0}, media {sum(keys) / max(len(keys), 1):.0f}')
