"""Vuelo Libre (v38): el terreno de 24 × 24 km, generado con numpy dentro de Blender.
Diseño a mano (macizo nevado al norte, fiordo, lago central, cañón al este, llanura dorada con río y lagos al sur) + ruido de cordillera
+ erosión hidráulica (modelo de tuberías virtuales) + tallado final de las aguas. Lo usan 01_generate.py (mapas y vista previa) y
02_scene.py (escena de Blender y renders).
Ejes como en el juego: x = este, z = sur (norte = -z), y = altura sobre el agua (WL = 0). Fila 0 de las rejillas = el borde norte."""
import math, time
import numpy as np

SIZE = 24000.0                     # m de lado
HALF = SIZE / 2
WL = 0.0


def info(t): print('     ' + t, flush=True)


# ---------------------------------------------------------------- ruido (Perlin 2D vectorizado)
class Ruido:
    def __init__(self, seed):
        rng = np.random.default_rng(seed)
        p = rng.permutation(256).astype(np.int32)
        self.p = np.concatenate([p, p])
        a = rng.random(256) * 2 * np.pi
        self.gx, self.gy = np.cos(a).astype(np.float32), np.sin(a).astype(np.float32)

    def __call__(self, x, y):
        xf0, yf0 = np.floor(x), np.floor(y)
        xi, yi = xf0.astype(np.int32) & 255, yf0.astype(np.int32) & 255
        xf, yf = (x - xf0).astype(np.float32), (y - yf0).astype(np.float32)
        u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
        v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
        p, gx, gy = self.p, self.gx, self.gy
        xi1, yi1 = (xi + 1) & 255, (yi + 1) & 255
        def g(ix, iy, dx, dy):
            h = p[p[ix] + iy]
            return gx[h] * dx + gy[h] * dy
        n00 = g(xi, yi, xf, yf); n10 = g(xi1, yi, xf - 1, yf)
        n01 = g(xi, yi1, xf, yf - 1); n11 = g(xi1, yi1, xf - 1, yf - 1)
        a = n00 + (n10 - n00) * u; b = n01 + (n11 - n01) * u
        return (a + (b - a) * v) * 1.41


def fbm(R, x, y, octavas=5, lac=2.03, gan=0.5):
    s, a, f, tot = 0.0, 1.0, 1.0, 0.0
    for i in range(octavas):
        s = s + R(x * f + i * 17.1, y * f - i * 9.3) * a
        tot += a; a *= gan; f *= lac
    return s / tot


def ridged(R, x, y, octavas=8, lac=2.07, gan=2.1, H=0.92):
    """Multifractal de crestas (Musgrave): crestas afiladas que se ramifican, como aristas de montaña."""
    sig = 1.0 - np.abs(R(x, y)); sig = sig * sig
    res, f = sig.copy(), 1.0
    for i in range(1, octavas):
        f *= lac
        w = np.clip(sig * gan, 0, 1)
        sig = 1.0 - np.abs(R(x * f + i * 31.7, y * f - i * 11.9)); sig = sig * sig * w
        res += sig * f ** (-H)
    return res


def smooth(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def smin(a, b, k):
    """Mínimo suave (k m de transición): las aguas talladas no dejan aristas."""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


# ---------------------------------------------------------------- rutas (fiordos, cañón, ríos, valles)
def densificar(pts, paso=50.0):
    """Catmull-Rom por los puntos de control → polilínea densa."""
    P = np.array(pts, dtype=np.float64)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(math.ceil(np.hypot(*(p2 - p1)) / paso)))
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


class Rejilla:
    def __init__(self, n):
        self.n = n
        self.c = np.linspace(-HALF, HALF, n)              # coordenadas de las columnas (x) y filas (z)
        self.X, self.Z = np.meshgrid(self.c.astype(np.float32), self.c.astype(np.float32))
        self.paso = SIZE / (n - 1)
        self.wx = self.wz = None                       # deformación de las rutas (meandros): la pone generar()

    def idx(self, v):
        return (v + HALF) / self.paso

    def ruta(self, pts, radio, meandro=0.0):
        """Distancia (m) a la polilínea y su abscisa s (m desde el primer punto), solo hasta «radio» m. Fuera: inf.
        meandro: m de deformación (con ruido) para que el trazado no sea una curva perfecta."""
        P = densificar(pts)
        L = np.hypot(*np.diff(P, axis=0).T)
        S0 = np.concatenate([[0], np.cumsum(L)])
        D = np.full((self.n, self.n), np.inf, np.float32); S = np.zeros((self.n, self.n), np.float32)
        for k in range(len(P) - 1):
            A, B = P[k], P[k + 1]
            i0 = max(0, int(self.idx(min(A[0], B[0]) - radio))); i1 = min(self.n, int(self.idx(max(A[0], B[0]) + radio)) + 2)
            j0 = max(0, int(self.idx(min(A[1], B[1]) - radio))); j1 = min(self.n, int(self.idx(max(A[1], B[1]) + radio)) + 2)
            if i0 >= i1 or j0 >= j1: continue
            x, z = self.X[j0:j1, i0:i1], self.Z[j0:j1, i0:i1]
            if meandro: x, z = x + self.wx[j0:j1, i0:i1] * meandro, z + self.wz[j0:j1, i0:i1] * meandro
            ab = B - A; l2 = max(ab @ ab, 1e-9)
            t = np.clip(((x - A[0]) * ab[0] + (z - A[1]) * ab[1]) / l2, 0, 1)
            d = np.hypot(x - (A[0] + t * ab[0]), z - (A[1] + t * ab[1]))
            sub = D[j0:j1, i0:i1]; m = d < sub
            sub[m] = d[m]; S[j0:j1, i0:i1][m] = (S0[k] + t * L[k])[m]
        return D, S, S0[-1]


def perfil(s, L, claves):
    """Valor a lo largo de una ruta: claves [(fracción 0..1, valor)], interpolado."""
    f, v = zip(*claves)
    return np.interp(s / L, f, v).astype(np.float32)


# ---------------------------------------------------------------- diseño del mapa
# Regiones: (x, z, altura base m, radio m, rugosidad 0..1)
REGIONES = [
    (0, -8500, 1150, 5200, 1.0), (-7200, -8800, 1000, 4600, 0.95), (7400, -8600, 1050, 4600, 0.95),   # macizo norte
    (-10500, -11500, 900, 3000, 0.9), (10800, -11200, 950, 3000, 0.9),
    (-9200, -1000, 420, 3800, 0.42), (-9800, 3600, 360, 3000, 0.38),                                    # páramo del oeste
    (7600, 1600, 860, 4200, 0.30), (10000, -2200, 980, 3200, 0.40), (6200, 4600, 640, 2800, 0.30),       # meseta del este
    (11000, 7600, 700, 3200, 0.55),
    (0, 0, 180, 2800, 0.35),                                                                            # alrededor del lago central
    (500, 8800, 26, 5200, 0.06), (-3600, 6400, 30, 3400, 0.08), (4600, 9800, 32, 3600, 0.07),            # llanura dorada
    (-2500, 11200, 60, 3000, 0.10),
    (-8600, 8600, 760, 3600, 0.85), (-11000, 11000, 650, 2600, 0.7),                                    # sierra del sur
]
# Picos: (x, z, altura extra m, radio m)
PICOS = [
    (-2400, -8200, 1650, 3300),     # Pico Mayor (~2.800 m)
    (-6900, -7000, 1150, 2600), (4600, -9300, 1350, 2900), (7700, -6300, 950, 2400), (500, -10900, 1150, 2600),
    (-9900, -10300, 1000, 2600), (10600, -9800, 1100, 2600), (-4300, -4700, 650, 1800), (3900, -3700, 750, 1800),
    (-700, -4500, 450, 1500), (-11200, -6000, 700, 2000),
    (-8300, 8200, 1000, 2400), (-10300, 5600, 650, 1900), (-6300, 10700, 700, 2000),                   # sierra del sur
    (-1000, 10600, 520, 1100), (6600, 8100, 650, 1300), (11300, 10800, 700, 2200), (-5600, -1200, 420, 1400),
]
# Aguas y valles. fiordo: perfil en U con el fondo bajo el agua; canon: paredes casi verticales con bancales; rio: llanura de inundación y cauce;
# valle: valle glaciar en U con el fondo subiendo hacia la cabecera.
RUTAS = {
    'fiordo_oeste': dict(tipo='fiordo', pts=[(-13000, 2700), (-10200, 2000), (-7700, 2950), (-5300, 1900), (-3000, 2350), (-1300, 900), (0, 0)],
                         ancho=[(0, 560), (0.4, 700), (0.75, 520), (1, 800)], fondo=[(0, -55), (1, -45)], pared=(1700, 1500)),
    'fiordo_norte': dict(tipo='fiordo', pts=[(400, -600), (900, -1700), (1900, -3300), (1500, -5000), (2600, -6600), (2100, -8300), (2600, -9600)],
                         ancho=[(0, 650), (0.5, 450), (0.8, 330), (1, 260)], fondo=[(0, -45), (0.62, -35), (0.78, 60), (1, 760)], pared=(1900, 1300)),
    'canon': dict(tipo='canon', pts=[(2200, 700), (3900, 250), (4700, 1350), (5500, 650), (6300, 1950), (7300, 1450), (7900, 2950), (9100, 2550),
                                     (9900, 4150), (11000, 4250), (13000, 5700)],
                  ancho=[(0, 230), (0.12, 95), (0.22, 70), (0.3, 210), (0.38, 60), (0.5, 80), (0.58, 240), (0.68, 70), (0.8, 110), (0.9, 55), (1, 90)],
                  fondo=[(0, -8), (0.08, 4), (1, 300)], pared=(900, 170)),
    'rio_llanura': dict(tipo='rio', pts=[(10500, 11800), (8800, 10300), (7000, 9900), (4800, 10400), (3000, 8500), (600, 9000), (-1700, 7300),
                                         (-3500, 7900), (-5200, 5900), (-4700, 3900), (-4300, 2400)],
                        ancho=[(0, 45), (0.5, 70), (1, 110)], llanura=[(0, 250), (0.4, 650), (1, 900)]),
    'valle_mayor': dict(tipo='valle', pts=[(-1300, 900), (-2300, -2000), (-2600, -4200), (-3400, -5800), (-3100, -6900)],
                        ancho=[(0, 380), (1, 160)], fondo=[(0, -20), (0.2, 30), (0.6, 420), (1, 1150)], pared=(1400, 1300)),
    'valle_oeste': dict(tipo='valle', pts=[(-7700, 2950), (-8400, 300), (-7600, -2300), (-8300, -4800), (-7700, -6000)],
                        ancho=[(0, 420), (1, 180)], fondo=[(0, -25), (0.15, 40), (0.6, 380), (1, 980)], pared=(1200, 1250)),
    'valle_este': dict(tipo='valle', pts=[(1900, -3300), (3900, -5200), (5800, -6600), (6900, -8300)],
                       ancho=[(0, 330), (1, 150)], fondo=[(0, -10), (0.18, 80), (0.6, 520), (1, 1250)], pared=(1300, 1200)),
}
# Lagos al nivel del mar (agua del juego) y lagos de montaña (agua pintada en el terreno, a su altura)
LAGOS = [  # (x, z, radio x, radio z, giro °, fondo m)
    (250, -150, 2500, 1700, 25, -38), (2000, 9300, 950, 600, -20, -14), (-2500, 6200, 700, 520, 40, -12),
    (-5900, 4700, 520, 380, -30, -9),
]
TARNS = [(-5200, -9300, 420, 330, 15), (3900, -6900, 330, 260, -40), (-7900, 7600, 300, 240, 0), (8900, -2600, 380, 280, 30)]   # (x, z, rx, rz, giro °): su nivel sale del terreno

AREA_R = 11500.0                   # radio de la zona de juego (en el juego, «Área con 15 s»)
INICIO = dict(x=300, z=1900, heading=350, height=650)   # sobre la orilla sur del lago central, mirando al fiordo norte y al Pico Mayor


def campo_regiones(G, R):
    """Altura base y rugosidad: mezcla gaussiana de las regiones, con los bordes deformados por ruido."""
    wx = fbm(R, G.X / 5200 + 3.1, G.Z / 5200 - 1.7, 4) * 1600
    wz = fbm(R, G.X / 5200 - 7.3, G.Z / 5200 + 4.9, 4) * 1600
    X, Z = G.X + wx, G.Z + wz
    sw = np.full_like(G.X, 1e-6); sh = np.zeros_like(G.X); sr = np.zeros_like(G.X)
    for (x, z, h, r, rug) in REGIONES:
        w = np.exp(-((X - x) ** 2 + (Z - z) ** 2) / (r * r)).astype(np.float32)
        sw += w; sh += w * h; sr += w * rug
    base = sh / sw; rug = sr / sw
    # fuera del mapa (esquinas): cordillera media, para que el borde enlace con el terreno lejano del juego
    rr = np.hypot(G.X, G.Z)
    borde = smooth(AREA_R + 300, HALF * 1.35, rr)
    base = base + (900 - base) * borde * 0.6; rug = rug + (0.9 - rug) * borde * 0.6
    return base, rug, X, Z


def generar(n, erosion=True, iters=None, semilla=38):
    t0 = time.time()
    G = Rejilla(n); R = Ruido(semilla); R2 = Ruido(semilla + 1); R3 = Ruido(semilla + 2)
    base, rug, WX, WZ = campo_regiones(G, R)
    G.wx = fbm(R3, G.X / 650 + 12, G.Z / 650 - 5, 4); G.wz = fbm(R3, G.X / 650 - 8, G.Z / 650 + 21, 4)
    info(f'regiones ({time.time() - t0:.1f} s)')
    # picos con aristas: cono suave modulado por crestas
    cr = ridged(R2, WX / 3800, WZ / 3800, 7)
    cr = cr / np.percentile(cr, 99.5)
    picos = np.zeros_like(G.X)
    for (x, z, hx, r) in PICOS:
        d = np.hypot(WX - x, WZ - z) / r
        picos = np.maximum(picos, hx * 0.8 * np.exp(-d ** 1.7) * (0.5 + 0.5 * cr))
    # detalle de cordillera (crestas que se ramifican) según la rugosidad
    det = ridged(R3, WX / 2600 + 5.5, WZ / 2600 - 2.2, 8)
    det = det / np.percentile(det, 99.5)
    G.det = det                                          # las paredes de fiordos y valles conservan las crestas (espolones, canales)
    suave = fbm(R, G.X / 1400, G.Z / 1400, 5)
    mont = np.maximum(0, picos + rug * (det - 0.3) * 950)
    mont = mont ** 1.28 / 2000 ** 0.28                   # laderas cóncavas: valles anchos abajo, cumbres afiladas arriba
    h = base + mont - rug * 120 + (1 - rug) * suave * 60
    h += fbm(R2, G.X / 420, G.Z / 420, 4) * (6 + rug * 25)
    info(f'relieve ({time.time() - t0:.1f} s): {h.min():.0f}..{h.max():.0f} m')

    # aguas y valles (solo bajan el terreno)
    h, agua = tallar(G, h, R, completo=True)
    info(f'tallado ({time.time() - t0:.1f} s)')

    flujo = np.zeros_like(h); h0 = h.copy()
    if erosion:
        h, flujo = erosionar(h, G.paso, iters or int(220 * (n / 512) ** 0.5))
        info(f'erosión ({time.time() - t0:.1f} s)')
        h, agua = tallar(G, h, R, completo=False)    # el agua vuelve a su sitio (la erosión rellena fondos)
    sed = h - h0
    return dict(G=G, h=h.astype(np.float32), flujo=flujo.astype(np.float32), sed=sed.astype(np.float32), agua=agua, rug=rug.astype(np.float32))


def tallar(G, h, R, completo):
    """Fiordos, cañón, río, valles y lagos. completo=False: solo los fondos (tras la erosión)."""
    agua = np.zeros_like(h)                    # agua pintada (cañón, lagos de montaña): 0..1
    for nombre, P in RUTAS.items():
        t = P['tipo']
        radio = {'fiordo': P.get('pared', (0, 1500))[1] + 1400, 'canon': 900, 'rio': 2600, 'valle': 1700}[t]
        D, S, L = G.ruta(P['pts'], radio, {'fiordo': 380, 'canon': 150, 'rio': 260, 'valle': 300}[t])
        m = np.isfinite(D)
        if not m.any(): continue
        d, s = D[m], S[m]
        nz = fbm(R, G.X[m] / 900 + 40, G.Z[m] / 900, 3)
        fade = smooth(radio, radio * 0.7, d)       # sin escalón donde acaba la influencia de la ruta
        h0 = h[m].copy()
        if t in ('fiordo', 'valle'):
            w0 = perfil(s, L, P['ancho']) * (1 + 0.32 * nz)
            fondo = perfil(s, L, P['fondo'])
            Hw, Ww = P['pared']
            nw = fbm(R, G.X[m] / 380 - 7, G.Z[m] / 380 + 2, 3)
            sobre = smooth(0, 350, d - w0)
            p = fondo + Hw * (np.maximum(0, d - w0) / Ww) ** 1.75 + nw * 110 * sobre + (G.det[m] - 0.35) * 520 * sobre
            if not completo: p = np.where(d < w0 + 120, p, 1e6)
            h[m] = h0 + (smin(h0, p, 35 if completo else 10) - h0) * fade
        elif t == 'canon':
            w0 = perfil(s, L, P['ancho']) * (1 + 0.25 * nz)
            fondo = perfil(s, L, P['fondo'])
            Hw, Ww = P['pared']
            x = np.maximum(0, d - w0) / Ww
            sobre = smooth(0, 120, d - w0)
            p = fondo + Hw * x ** 1.15 + (G.det[m] - 0.35) * 260 * sobre + fbm(R, G.X[m] / 160 + 3, G.Z[m] / 160, 3) * 70 * sobre
            ter = 38.0                              # bancales: estratos de 38 m
            q = (p - fondo) / ter; fr = q - np.floor(q)
            p = fondo + ter * (np.floor(q) + smooth(0.0, 0.35, fr))
            if not completo: p = np.where(d < w0 + 30, p, 1e6)
            h[m] = h0 + (smin(h0, p, 6) - h0) * fade
            rio = 1 - smooth(0.45, 0.75, d / np.maximum(w0, 1))
            agua[m] = np.maximum(agua[m], rio * smooth(-2, 3, fondo))   # el río del cañón (donde el fondo está sobre el mar)
        elif t == 'rio':
            fp = perfil(s, L, P['llanura']) * (1 + 0.3 * nz)
            w = perfil(s, L, P['ancho']) * (1 + 0.25 * nz)
            valle = 6 + 260 * (np.maximum(0, d - fp) / 1400) ** 1.4
            cauce = np.where(d < w * 0.5, -3.5, -3.5 + (d - w * 0.5) * 0.35)
            if completo: h[m] = h0 + (smin(smin(h0, valle, 12), cauce, 3) - h0) * fade
            else: h[m] = smin(h0, np.where(d < w * 0.5 + 15, cauce, 1e6), 3)
    for (x, z, rx, rz, giro, fondo) in LAGOS:
        e = elipse(G, x, z, rx, rz, giro, R)
        fuera = np.maximum(0, (e - 1) * min(rx, rz))          # m desde la orilla, aproximado
        if completo:
            p = np.where(e < 1, fondo * smooth(1.0, 0.55, e), 4 + fuera * 0.06 + (fuera / 450) ** 2 * 80)
            h = h + (smin(h, p, 20) - h) * smooth(1100, 700, fuera)   # la orilla solo influye hasta ~1 km
        else:
            h = smin(h, np.where(e < 0.97, fondo * smooth(1.0, 0.55, e), 1e6), 5)
    for (x, z, rx, rz, giro) in TARNS:
        e = elipse(G, x, z, rx, rz, giro, R)
        j, i = int(G.idx(z)), int(G.idx(x))
        nivel = float(np.percentile(h[max(0, j - 3):j + 4, max(0, i - 3):i + 4], 30))
        w = smooth(1.5, 1.0, e)
        h = np.where(e < 1.0, nivel, h * (1 - w) + nivel * w)
        agua = np.maximum(agua, smooth(1.02, 0.92, e))
    return h, agua


def elipse(G, x, z, rx, rz, giro, R):
    a = math.radians(giro); c, s_ = math.cos(a), math.sin(a)
    dx, dz = G.X - x, G.Z - z
    u, v = (dx * c + dz * s_) / rx, (-dx * s_ + dz * c) / rz
    return np.hypot(u, v) * (1 + 0.16 * fbm(R, G.X / 700 + 9, G.Z / 700 - 4, 3))


# ---------------------------------------------------------------- erosión hidráulica (Mei et al. 2007, tuberías virtuales) + térmica
def erosionar(hm, paso, iters):
    """hm en metros, paso en m. Trabaja en unidades de celda (altura / paso). Devuelve la altura y el caudal medio (para arroyos y verdor)."""
    b = (hm / paso).astype(np.float32)
    H, W = b.shape
    d = np.zeros_like(b); s = np.zeros_like(b); flujo = np.zeros_like(b)
    fL = np.zeros_like(b); fR = np.zeros_like(b); fT = np.zeros_like(b); fB = np.zeros_like(b)
    dt, A, g = 0.05, 1.0, 9.81
    Kc, Ks, Kd, Ke, lluvia = 0.9, 0.04, 0.12, 0.012, 0.004
    dmax, tmin = 0.15, 0.02
    jj, ii = np.mgrid[0:H, 0:W].astype(np.float32)
    def vec(a, dy, dx):                         # valor del vecino (borde: sale fuera, sin agua)
        return np.roll(np.roll(a, dy, 0), dx, 1)
    agua_mar = b <= 0.0                         # el mar no erosiona ni recibe sedimento
    erod = 0.3 + 0.7 * smooth(60 / paso, 500 / paso, b)   # las tierras bajas se erosionan menos (llanuras suaves)
    for it in range(iters):
        if it < iters * 0.8: d += lluvia * dt * (0.6 + 0.4 * np.clip(b * paso / 1500, 0, 1.5))
        hw = b + d
        hwL, hwR, hwT, hwB = vec(hw, 0, 1), vec(hw, 0, -1), vec(hw, 1, 0), vec(hw, -1, 0)
        hwL[:, 0] = b[:, 0] - 1; hwR[:, -1] = b[:, -1] - 1; hwT[0, :] = b[0, :] - 1; hwB[-1, :] = b[-1, :] - 1
        fL = np.maximum(0, fL + dt * A * g * (hw - hwL)); fR = np.maximum(0, fR + dt * A * g * (hw - hwR))
        fT = np.maximum(0, fT + dt * A * g * (hw - hwT)); fB = np.maximum(0, fB + dt * A * g * (hw - hwB))
        sf = fL + fR + fT + fB
        K = np.minimum(1, d / (sf * dt + 1e-9)); fL *= K; fR *= K; fT *= K; fB *= K
        inR = vec(fR, 0, 1); inL = vec(fL, 0, -1); inB = vec(fB, 1, 0); inT = vec(fT, -1, 0)   # lo que entra desde cada vecino
        inR[:, 0] = 0; inL[:, -1] = 0; inB[0, :] = 0; inT[-1, :] = 0
        d2 = np.maximum(0, d + dt * (inR + inL + inB + inT - (fL + fR + fT + fB)))
        dm = np.maximum((d + d2) * 0.5, 1e-4)
        u = (inR - fL + fR - inL) * 0.5 / dm; v = (inB - fT + fB - inT) * 0.5 / dm
        d = d2
        gx = (vec(b, 0, -1) - vec(b, 0, 1)) * 0.5; gz = (vec(b, -1, 0) - vec(b, 1, 0)) * 0.5
        sen = np.maximum(np.sqrt(gx * gx + gz * gz) / np.sqrt(1 + gx * gx + gz * gz), tmin)
        vel = np.sqrt(u * u + v * v)
        C = Kc * sen * vel * np.clip(d / dmax, 0, 1)
        dif = C - s
        er = np.where(dif > 0, np.minimum(Ks * dif, 0.02), 0) * erod; de = np.where(dif < 0, Kd * (-dif), 0)
        er[agua_mar] = 0
        b += de - er; s += er - de
        # transporte del sedimento (semilagrangiano)
        x = np.clip(ii - u * dt, 0, W - 1.001); y = np.clip(jj - v * dt, 0, H - 1.001)
        x0 = x.astype(np.int32); y0 = y.astype(np.int32); fx = x - x0; fy = y - y0
        s = (s[y0, x0] * (1 - fx) * (1 - fy) + s[y0, x0 + 1] * fx * (1 - fy) + s[y0 + 1, x0] * (1 - fx) * fy + s[y0 + 1, x0 + 1] * fx * fy)
        d *= (1 - Ke * dt)
        if it >= iters * 0.4: flujo += vel * d
        if it % 50 == 0: info(f'  erosión {it}/{iters}  agua media {d.mean():.4f}  sedimento {s.mean():.5f}')
    b += s                                       # lo que quedaba en suspensión se posa
    b = termica(b, 25, 0.9)
    return b * paso, flujo / max(1, iters * 0.6)


def termica(b, iters, talud):
    """Erosión térmica: lo que supera el talud (pendiente en unidades de celda) cae al vecino más bajo; suaviza picos de la hidráulica."""
    for _ in range(iters):
        out = np.zeros_like(b); inn = np.zeros_like(b)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            n = np.roll(np.roll(b, dy, 0), dx, 1)
            dh = b - n - talud
            mv = np.where(dh > 0, dh * 0.1, 0)
            out += mv; inn += np.roll(np.roll(mv, -dy, 0), -dx, 1)
        b = b - out + inn
    return b


# ---------------------------------------------------------------- materiales (lo que lee el juego) y color de la vista previa
def materiales(res, semilla=38):
    """Mapa de materiales 0..1: roca, nieve, agua pintada (cañón, lagos de montaña, arroyos) y verdor (0 = hierba dorada, 1 = verde)."""
    G, h, flujo, sed, agua = res['G'], res['h'], res['flujo'], res['sed'], res['agua']
    R = Ruido(semilla + 7)
    gz, gx = np.gradient(h, G.paso)
    pend = np.hypot(gx, gz)
    norte = np.clip(gz / (pend + 1e-6), -1, 1) * smooth(0.08, 0.4, pend)   # > 0: ladera que mira al norte (más nieve, menos sol)
    n1 = fbm(R, G.X / 900, G.Z / 900, 4); n2 = fbm(R, G.X / 260 + 3, G.Z / 260, 3)
    roca = smooth(0.78, 1.25, pend + n2 * 0.25) + smooth(-15, -70, sed) * 0.4
    roca = np.clip(roca, 0, 1) * smooth(-1, 4, h)
    nl = 1480 + n1 * 230 - norte * 260
    nieve = smooth(nl, nl + 240, h) * (1 - smooth(0.95, 1.35, pend))
    manchas = smooth(nl - 420, nl - 60, h) * smooth(0.15, 0.45, n2 + norte * 0.3 + 0.1) * (1 - smooth(0.7, 1.0, pend))   # neveros sueltos
    nieve = np.clip(np.maximum(nieve, manchas * 0.9), 0, 1)
    fq = flujo / (np.percentile(flujo[flujo > 0], 99) + 1e-9) if (flujo > 0).any() else flujo
    humedo = smooth(0.04, 0.5, fq)
    verde = 0.55 * (1 - smooth(60, 700, h)) + 0.55 * humedo + 0.35 * smooth(1.5, 12, sed) + 0.25 * norte + n1 * 0.35 - 0.15
    verde = np.clip(verde, 0, 1)
    arroyo = smooth(0.35, 0.9, fq) * smooth(0.04, 0.12, pend) * smooth(2, 12, h) * (1 - nieve)
    agua_p = np.clip(np.maximum(agua, arroyo), 0, 1)
    return dict(roca=roca.astype(np.float32), nieve=nieve.astype(np.float32), agua=agua_p.astype(np.float32), verde=verde.astype(np.float32),
                pend=pend.astype(np.float32), gx=gx, gz=gz)


def srgb(c): return np.array(c, np.float32)


def color_albedo(res, M):
    h = res['h']
    dorado, seco, verde, musgo = srgb((0.66, 0.55, 0.24)), srgb((0.56, 0.47, 0.25)), srgb((0.33, 0.45, 0.16)), srgb((0.22, 0.33, 0.13))
    roca, roca2, nieve, arena = srgb((0.45, 0.45, 0.47)), srgb((0.30, 0.30, 0.33)), srgb((0.93, 0.95, 0.99)), srgb((0.72, 0.66, 0.50))
    G = res['G']; R = Ruido(91)
    n = fbm(R, G.X / 500, G.Z / 500, 3)[..., None]
    v = M['verde'][..., None]
    hierba = dorado * (1 - v) + verde * v
    hierba = hierba * (0.9 + 0.2 * n) + (seco - hierba) * np.clip(-n, 0, 1) * 0.5
    hierba = hierba + (musgo - hierba) * np.clip(v - 0.7, 0, 1)
    rk = roca + (roca2 - roca) * np.clip(0.5 + n, 0, 1)
    estr = 0.5 + 0.5 * np.sin(h / 38.0 * 2 * np.pi + n[..., 0] * 2.5)            # estratos de la roca (se ven en el cañón y las paredes)
    rk = rk * (0.86 + 0.22 * estr[..., None])
    c = hierba + (rk - hierba) * M['roca'][..., None]
    c = c + (nieve - c) * M['nieve'][..., None]
    orilla = (smooth(5.5, 1.0, h) * smooth(-3, 0.3, h))[..., None]
    c = c + (arena - c) * orilla
    c = c + (srgb((0.13, 0.33, 0.40)) - c) * M['agua'][..., None]          # agua pintada: río del cañón, lagos de montaña, arroyos
    return np.clip(c, 0, 1)


def vista_plano(res, M, sol=(-0.55, 0.62, -0.56)):
    """Vista cenital: color × sombreado + agua (la del mar y la pintada), con el área de juego y el inicio."""
    h, G = res['h'], res['G']
    c = color_albedo(res, M)
    nx, nz = -M['gx'], -M['gz']
    L = np.array(sol, np.float32); L /= np.linalg.norm(L)
    sh = (nx * L[0] + 1.0 * L[1] + nz * L[2]) / np.sqrt(nx * nx + 1 + nz * nz)
    sh = np.clip(sh, 0, 1) * 0.85 + 0.25
    c = c * sh[..., None]
    prof = np.clip(-h / 40, 0, 1)[..., None]
    mar = srgb((0.22, 0.52, 0.58)) * (1 - prof) + srgb((0.06, 0.22, 0.34)) * prof
    c = np.where((h < 0)[..., None], mar, c)
    ap = M['agua'][..., None] * (h >= 0)[..., None]
    c = c + (srgb((0.25, 0.55, 0.62)) * sh[..., None] - c) * ap
    rr = np.hypot(G.X, G.Z)
    borde = (np.abs(rr - AREA_R) < G.paso * 1.6)[..., None]
    c = np.where(borde, srgb((0.9, 0.2, 0.15)), c)
    fuera = (rr > AREA_R)[..., None]
    c = np.where(fuera, c * 0.72, c)
    ini = (np.hypot(G.X - INICIO['x'], G.Z - INICIO['z']) < G.paso * 4)[..., None]
    return np.where(ini, srgb((1, 0.85, 0.2)), c)
