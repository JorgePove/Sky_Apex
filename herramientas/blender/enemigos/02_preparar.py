"""Enemigos nuevos (v29), paso 2: dejar los modelos que pasó Jorge listos para el juego y exportarlos a modelos/.
Lanzar:  node herramientas/blender/lanzar.mjs herramientas/blender/enemigos/02_preparar.py [-- nombre1 nombre2 …]
Nombres: balista, catapulta, canon, barco, superdirigible, sierpe (sin nombres: todos).
Para cada uno: se aplican las transformaciones (y el esqueleto, en la sierpe: queda la malla en su pose recta), se quitan las piezas que
no se ven, se junta todo en una malla, se reduce a TRIS triángulos, se orienta (frente hacia +Y de Blender = -Z en three.js, el «adelante»
del juego; arriba +Z), se escala a 1 m de largo (el juego lo escala con la stat «largo» del Excel) y se apoya en el suelo (Z = 0) o se
centra. Las texturas: solo el color base, como mucho a TEX px y en JPEG (las de normales, rugosidad, etc. no se usan en el juego).
El superdirigible no tiene texturas: el color de cada material pasa a color por vértice (como el dirigible) y queda un solo material.
Vistas de revisión en salida/enemigos/02_<nombre>.png."""
import bpy, bmesh, os, sys, math, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comun as C
from mathutils import Matrix, Vector

# nombre: (archivo, giro en Z (°) que deja el frente en +Y, triángulos, apoyo, px de textura, materiales que se quitan, salida)
MODELOS = {
    'balista': ('modelos/balista guay.glb', 0, 7000, 'suelo', 1024, (), 'artilleria_balista.glb'),
    'catapulta': ('modelos/catapulta guay.glb', -90, 7500, 'suelo', 1024, (), 'artilleria_catapulta.glb'),
    'canon': ('modelos/canon guay.glb', 180, 9000, 'suelo', 1024, ('lightning',), 'artilleria_canon.glb'),
    'barco': ('modelos/barco guay.glb', -90, 26000, 'suelo', 1024, (), 'barco_naval.glb'),
    'superdirigible': ('modelos/barco guay 02.glb', -90, 40000, 'centro', 0, (), 'superdirigible.glb'),
    # v30: la sierpe sale del FBX original del zip (el GLB de Sketchfab traía las patas delanteras estiradas desde un «anillo»); sus texturas
    # van aparte en el zip y se asignan por el nombre del material (Dither_Inst = las aletas, textura «qi», recortada por su alfa)
    'sierpe': ('dragones raw/black-myth-wukong-kang-jin-long-static.zip', 180, 48000, 'centro', 1024, ('invisible',), 'sierpe.glb'),
}
SIERPE_TEX = {'tou': 'tou', 'shenti': 'shenti', 'eye': 'eye', 'weiba': 'weiba', 'dither': 'qi'}   # material → T_LYS_KangJinLong_<x>_D.png
# v30: huesos de las patas (Biped): sus vértices van rígidos con el hombro o la cadera de su pata (segundo canal UV: x = punto de la columna del
# hombro, y = peso de la pata); si no, la onda del cuerpo las retorcía
import re
PATA = re.compile(r'(clavicle|upperarm|uparm|forearm|foretwist|lowerarm|hand|finger|thumb|index|middle|ring|pinky|thigh|calf|horselink|foot|toe|ball)', re.I)


def anclas_patas(o, arm):
    """Por vértice: peso total de los huesos de pata y la Y (mundo, con la pose) media del hombro o cadera de sus patas → capa UV «ancla»."""
    raiz_y = {}
    for b in arm.pose.bones:
        if not PATA.search(b.name): continue
        r = b
        while r.parent and PATA.search(r.parent.name): r = r.parent
        raiz_y[b.name] = (arm.matrix_world @ r.head).y
    grupos = {g.index: g.name for g in o.vertex_groups}
    por_vertice = []
    for v in o.data.vertices:
        tot = sum(g.weight for g in v.groups) or 1.0
        w = sy = 0.0
        for g in v.groups:
            n = grupos.get(g.group)
            if n in raiz_y: w += g.weight; sy += g.weight * raiz_y[n]
        por_vertice.append((sy / w if w > 0 else 0.0, w / tot))
    uv = o.data.uv_layers.new(name='ancla')
    for poly in o.data.polygons:
        for li in poly.loop_indices:
            y, w = por_vertice[o.data.loops[li].vertex_index]; uv.data[li].uv = (y, w)
    o.data.uv_layers.active_index = 0
    C.info('anclas de las patas: %d vértices con peso de pata' % sum(1 for y, w in por_vertice if w > 0.05))
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_dir = C.carpeta(C.SALIDA, 'enemigos')
info = {}


def color_de(mat):
    if mat is None: return (0.5, 0.5, 0.5, 1)
    if mat.use_nodes:
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED': return tuple(n.inputs['Base Color'].default_value)
    return tuple(mat.diffuse_color)


def imagen_base(mat):
    """Imagen conectada (directa o a través de nodos intermedios) al color base del Principled, o None."""
    if not mat or not mat.use_nodes: return None
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: return None
    pila = [l.from_node for l in bsdf.inputs['Base Color'].links]
    while pila:
        n = pila.pop()
        if n.type == 'TEX_IMAGE' and n.image: return n.image
        for i in n.inputs: pila += [l.from_node for l in i.links]
    return None


def simplificar_material(mat, tex):
    """Deja el material con un Principled y, si la había, la textura del color base reducida a tex px (sin normales ni rugosidad).
    Con mat['recorte'] (aletas de la sierpe), el alfa de la textura recorta (se exporta como MASK y la textura en PNG)."""
    img = imagen_base(mat)
    recorte = bool(mat.get('recorte'))
    col = color_de(mat)
    nt = mat.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    outn = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], outn.inputs['Surface'])
    bsdf.inputs['Roughness'].default_value = 0.8; bsdf.inputs['Metallic'].default_value = 0.0
    if img is not None:
        if recorte: tex = min(tex, 512)                      # (va en PNG por el alfa: más pequeña)
        if max(img.size) > tex:
            k = tex / max(img.size); img.scale(max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k)))
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img
        nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
        if recorte:                                          # alfa → redondeo → alfa del BSDF: el exportador lo entiende como recorte (MASK)
            rd = nt.nodes.new('ShaderNodeMath'); rd.operation = 'ROUND'
            nt.links.new(tn.outputs['Alpha'], rd.inputs[0]); nt.links.new(rd.outputs[0], bsdf.inputs['Alpha'])
    else:
        bsdf.inputs['Base Color'].default_value = col
    return img


def importar(rel):
    """GLB, o un zip con un FBX dentro (se extrae en salida/; las texturas del zip se asignan por el nombre del material)."""
    ruta = os.path.join(C.RAIZ, rel)
    if not rel.endswith('.zip'):
        bpy.ops.import_scene.gltf(filepath=ruta); return
    import zipfile
    dest = C.carpeta(C.SALIDA, 'zip_' + os.path.splitext(os.path.basename(rel))[0])
    with zipfile.ZipFile(ruta) as z:
        for n in z.namelist():
            if n.endswith('/') or os.path.exists(os.path.join(dest, n)): continue
            z.extract(n, dest)
    fbx = next(os.path.join(r, f) for r, _, fs in os.walk(dest) for f in fs if f.lower().endswith('.fbx'))
    bpy.ops.import_scene.fbx(filepath=fbx)
    texdir = next((r for r, _, fs in os.walk(dest) if any(f.lower().endswith('.png') for f in fs)), dest)
    for m in bpy.data.materials:
        clave = next((v for k, v in SIERPE_TEX.items() if k in m.name.lower()), None)
        f = os.path.join(texdir, 'T_LYS_KangJinLong_%s_D.png' % clave) if clave else None
        if not f or not os.path.exists(f): continue
        m.use_nodes = True; nt = m.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None) or nt.nodes.new('ShaderNodeBsdfPrincipled')
        for l in list(bsdf.inputs['Base Color'].links): nt.links.remove(l)
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(f, check_existing=True)
        nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
        if clave == 'qi': m['recorte'] = 1


def preparar(nombre):
    rel, giro, tris, apoyo, tex, quitar, salida = MODELOS[nombre]
    C.vacia()
    importar(rel)
    esc = bpy.context.scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.make_single_user(object=True, obdata=True)
    ms = C.mallas(esc.objects)
    # fuera las caras con materiales que no se ven (planos de rayos, invisibles…); la pieza que se queda sin caras, fuera
    for o in list(ms):
        malos = {i for i, m in enumerate(o.data.materials) if m and any(q in m.name.lower() for q in quitar)}
        if not malos: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in malos], context='FACES')
        bm.to_mesh(o.data); bm.free()
        if not o.data.polygons: bpy.data.objects.remove(o); ms.remove(o)
    antes = C.triangulos(ms)
    arm = next((o for o in esc.objects if o.type == 'ARMATURE'), None)
    if nombre == 'sierpe' and arm:
        for o in ms: anclas_patas(o, arm)
    # esqueleto y transformaciones aplicados: cada malla queda en el mundo con su pose (convert aplica los modificadores)
    for o in esc.objects: o.select_set(False)
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    bpy.ops.object.convert(target='MESH')
    for o in ms:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(esc.objects):
        if o.type != 'MESH': bpy.data.objects.remove(o)
    ms = C.mallas(esc.objects)
    sin_tex = tex == 0
    if sin_tex:                                              # color de cada material → color por vértice
        for o in ms:
            me = o.data; cols = [color_de(m) for m in me.materials] or [(0.5, 0.5, 0.5, 1)]
            attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
            for p in me.polygons:
                c = cols[min(p.material_index, len(cols) - 1)]
                for li in p.loop_indices: attr.data[li].color = c
            me.color_attributes.active_color = attr
    # juntar
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active; obj.name = obj.data.name = nombre
    # soldar y limpiar (la reducción falla con vértices repetidos) y reducir
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5 * max(obj.dimensions))
    bm.to_mesh(obj.data); bm.free()
    t = C.triangulos([obj])
    if t > tris:
        md = obj.modifiers.new('diezmo', 'DECIMATE'); md.ratio = tris / t; md.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=md.name)
    # orientar, escalar a 1 m de largo (eje Y) y apoyar o centrar
    obj.data.transform(Matrix.Rotation(math.radians(giro), 4, 'Z'))
    obj.data.update()
    mn, mx = C.caja([obj]); largo = mx.y - mn.y
    obj.data.transform(Matrix.Scale(1 / largo, 4))
    obj.data.update()
    mn, mx = C.caja([obj]); c = (mn + mx) / 2
    obj.data.transform(Matrix.Translation(Vector((-c.x, -c.y, -mn.z if apoyo == 'suelo' else -c.z))))
    obj.data.update()
    if 'ancla' in obj.data.uv_layers:                        # v30: la Y del hombro → su punto de la columna (0 = cabeza), con el mismo giro, escala y centrado
        uv = obj.data.uv_layers['ancla']; k = 1 if giro % 360 == 0 else -1
        for d in uv.data:
            y = k * d.uv[0] / largo - c.y
            d.uv = (0.5 - y if d.uv[1] > 0 else 0.0, d.uv[1])
    mn, mx = C.caja([obj])
    # materiales
    if sin_tex:
        mat = bpy.data.materials.new(nombre); mat.use_nodes = True
        nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
        nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.7
        obj.data.materials.clear(); obj.data.materials.append(mat)
        for p in obj.data.polygons: p.material_index = 0
    else:
        usados = {}
        for m in obj.data.materials:
            if m and m.name not in usados: usados[m.name] = simplificar_material(m, tex)
        for n, img in usados.items(): C.info('  material %s: %s' % (n, '%s %dx%d' % (img.name, *img.size) if img else 'sin textura'))
    dims = mx - mn
    info[nombre] = {'tris': C.triangulos([obj]), 'ancho': round(dims.x, 4), 'largo': round(dims.y, 4), 'alto': round(dims.z, 4),
                    'materiales': len(obj.data.materials), 'largo_original': round(largo, 3)}
    C.ok('%s: %d → %d triángulos; caja (ancho %.3f, largo %.3f, alto %.3f) · %d materiales' % (nombre, antes, info[nombre]['tris'], dims.x, dims.y, dims.z, len(obj.data.materials)))
    # exportar
    dest = os.path.join(C.RAIZ, 'modelos', salida)
    for o in esc.objects: o.select_set(False)
    obj.select_set(True)
    opciones = dict(filepath=dest, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=not sin_tex, export_normals=True,
                    export_materials='EXPORT', export_animations=False, export_yup=True)
    extra = [dict(export_vertex_color='ACTIVE')] if sin_tex else [dict(export_image_format='JPEG', export_jpeg_quality=82), {}]
    for e in extra + [{}]:
        try:
            bpy.ops.export_scene.gltf(**opciones, **e); break
        except TypeError as err:
            C.aviso('exportador: %s' % err)
    C.ok('exportado %s (%.2f MB)' % (dest, os.path.getsize(dest) / 1048576))
    C.vistas(os.path.join(out_dir, '02_' + nombre), [obj], ('izquierda', 'frente', 'arriba', 'tres_cuartos'), color='VERTEX' if sin_tex else 'TEXTURE')


for n in MODELOS:
    if not args or n in args: preparar(n)
print('INFO_JSON ' + json.dumps(info))
