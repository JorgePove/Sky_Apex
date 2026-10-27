"""Syrax: dónde va cada articulación (datos para 04_esqueleto.py).
Coordenadas en metros, en el modelo normalizado (syrax_baja / syrax_alta): Z arriba, mira a -Y, pies en Z = 0, envergadura 34 m.
Lado .L = +X (izquierda del dragón), .R = -X. Las lecturas salen de las vistas con rejilla de 03_rejillas.py.
Tipos de punto:
  ('F', x, z, y_aprox)   rayo de frente (a lo largo de +Y) por (x, z): el centro del tramo de malla atravesado más cercano a y_aprox
  ('T', x, y, z_aprox)   rayo desde arriba (a lo largo de -Z) por (x, y)
  ('S', y, z, x_aprox)   rayo de lado (a lo largo de +X) por (y, z)
  ('P', x, y, z)         punto tal cual (dentro del cuerpo, donde no hay referencia visible)
Cadenas de tubo (cuello, cola, patas): se siguen por la malla desde una semilla con 'trazar' (centro de cada corte)."""

# Alas: puntas, nudillos (los bultos de la membrana) y codo, leídos en las vistas de frente (03_ala_1_frente y 03_ala_d_0_frente)
ALA = {
    'L': {
        'hombro': ('P', 2.7, -4.8, 6.0),
        'codo': ('F', 6.3, 5.1, -3.3),
        'muneca': ('F', 4.9, 0.7, -7.6),
        'nudillo': ('F', 6.3, 0.45, -8.0),
        'pulgar': ('T', 7.0, -9.6, 0.2),
        'f1': [('F', 6.44, 2.48, -3.0), ('F', 5.99, 6.45, 2.0)],
        'f2': [('F', 7.8, 3.29, -3.5), ('F', 8.43, 6.71, 1.3), ('F', 8.0, 9.43, 6.0)],
        'f3': [('F', 9.35, 3.69, -3.1), ('F', 11.13, 7.09, 3.0), ('F', 11.9, 9.86, 7.0)],
        'f4': [('F', 12.55, 2.45, -3.9), ('F', 16.2, 5.74, 2.0), ('F', 17.07, 9.03, 9.3)],
    },
    'R': {
        'hombro': ('P', -2.9, -4.8, 6.0),
        'codo': ('F', -7.29, 5.43, -3.3),
        'muneca': ('F', -5.7, 0.7, -7.6),
        'nudillo': ('F', -7.2, 0.4, -8.0),
        'pulgar': ('T', -8.2, -9.7, 0.2),
        'f1': [('F', -7.43, 2.5, -3.0), ('F', -6.57, 6.4, 2.0)],
        'f2': [('F', -9.07, 2.96, -3.5), ('F', -9.6, 5.86, 1.3), ('F', -9.03, 8.17, 6.0)],
        'f3': [('F', -10.64, 3.0, -3.1), ('F', -12.26, 5.6, 3.0), ('F', -12.79, 7.79, 7.0)],
        'f4': [('F', -13.5, 1.21, -3.9), ('F', -16.29, 3.6, 2.0), ('F', -16.36, 6.43, 9.3)],
    },
}

# Cabeza (vista de lado 03_cabeza_0): base del cráneo, punta del morro, bisagra y punta de la mandíbula (boca abierta)
CABEZA = {'craneo': ('P', 0.0, -14.4, 5.65), 'morro': ('P', 0.0, -17.6, 5.35), 'bisagra': ('P', 0.0, -15.2, 5.2), 'barbilla': ('P', 0.0, -16.95, 3.75)}

# Tronco: cadera y pecho (se centran con cortes); de ahí salen la columna, el cuello y la cola
CADERA = (0.0, 1.6, 3.6)
PECHO = (0.0, -5.6, 5.2)

"""ESQUELETO definitivo (revisado con 03_rejillas.py, 04_sondear.py y los recortes de patas y tronco).
Notas de anatomía del modelo: posado como los wyverns de la serie (se apoya en las muñecas con los dedos hacia arriba y atrás); en
pose de paso (pata izquierda adelantada con el metatarso casi horizontal, la derecha atrás y vertical); patas de ave (rodilla hacia
delante); la cadera queda a media altura del tronco, 2,4 m por detrás de los hombros; el ala derecha (-X) está algo más plegada."""
TRONCO = {   # nombre: (cabeza, cola, padre, conectado)
    'root': ((0, -2.4, 0), (0, -2.4, 1.5), None, False),
    'pelvis': ((0, -1.6, 5.1), (0, -3.4, 5.4), 'root', False),
    'spine_01': ((0, -3.4, 5.4), (0, -5.0, 5.6), 'pelvis', True),
    'spine_02': ((0, -5.0, 5.6), (0, -6.8, 5.75), 'spine_01', True),
}
CUELLO = [(0, -6.8, 5.75), (0, -8.1, 5.8), (0, -9.4, 5.95), (0, -10.7, 5.9), (0, -11.9, 5.7), (0, -13.1, 5.4), (0, -14.3, 5.45)]
HEAD = ((0, -14.3, 5.45), (0, -17.6, 5.35))
JAW = ((0, -15.0, 5.0), (0, -16.95, 3.75))
COLA_INICIO = [(0, -1.6, 5.1), (0, 0.0, 5.1), (0, 2.0, 4.4)]      # parte trasera del tronco; luego el recorrido medido (puntos.json)
COLA_HUESOS = 16
ALAS = {   # clavícula (desde la columna), hombro, codo, muñeca, nudillo (raíz de los dedos), punta del pulgar, dedos (articulaciones y punta)
    'L': dict(clav=(0.6, -4.8, 6.4), hombro=(2.7, -4.8, 6.0), codo=(6.30, -3.32, 5.10), muneca=(4.90, -6.68, 0.70), nudillo=(6.30, -8.05, 0.45),
              pulgar=(7.21, -9.57, 0.25),
              f1=[(6.44, -3.38, 2.48), (5.97, 2.14, 6.45)],
              f2=[(7.80, -3.30, 3.29), (8.43, 1.43, 6.71), (8.0, 6.07, 9.43)],
              f3=[(9.35, -2.95, 3.69), (11.13, 1.65, 7.09), (11.9, 6.45, 9.86)],
              f4=[(12.55, -3.59, 2.45), (16.2, 2.63, 5.74), (17.07, 8.63, 9.03)]),
    'R': dict(clav=(-0.6, -4.8, 6.4), hombro=(-2.8, -4.8, 6.0), codo=(-7.29, -2.99, 5.43), muneca=(-5.70, -6.52, 0.70), nudillo=(-7.20, -7.26, 0.40),
              pulgar=(-8.71, -9.07, 0.25),
              f1=[(-7.43, -3.00, 2.50), (-6.57, 2.14, 6.40)],
              f2=[(-9.07, -2.47, 2.96), (-9.60, 2.65, 5.86), (-9.03, 6.90, 8.17)],
              f3=[(-10.64, -1.69, 3.00), (-12.26, 3.35, 5.60), (-12.79, 8.34, 7.79)],
              f4=[(-13.50, -1.82, 1.21), (-16.29, 5.35, 3.60), (-16.36, 11.48, 6.43)]),
}
PATAS = {   # cadera, rodilla, tobillo, bola del pie, punta de los dedos
    'L': dict(cadera=(1.4, -2.4, 4.6), rodilla=(1.3, -4.3, 3.6), tobillo=(0.95, -2.0, 1.5), bola=(1.1, -4.3, 0.4), dedos=(1.5, -5.7, 0.1)),
    'R': dict(cadera=(-1.4, -2.4, 4.6), rodilla=(-1.85, -0.7, 3.3), tobillo=(-1.95, 1.0, 1.5), bola=(-1.95, 0.75, 0.35), dedos=(-2.4, -0.3, 0.1)),
}

# Tubos que se siguen por la malla: semilla, dirección inicial, paso (m), radio de búsqueda (m) y pasos máximos
TUBOS = {
    'cuello': dict(semilla=(0.0, -7.2, 5.8), dir=(0, -1, 0.05), paso=0.6, radio=1.6, n=12, hasta_y=-14.4),
    'cola': dict(semilla=(0.0, 3.0, 3.0), dir=(0, 1, -0.3), paso=0.7, radio=1.1, n=40, radio_fin=0.35),
    'pata_L': dict(semilla=(1.8, 0.8, 0.6), dir=(0, 0.3, 1), paso=0.35, radio=0.55, n=10),
    'pata_R': dict(semilla=(-1.9, 0.8, 0.6), dir=(0, 0.3, 1), paso=0.35, radio=0.55, n=10),
}
