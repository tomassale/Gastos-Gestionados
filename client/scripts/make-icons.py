"""Genera los iconos de la app sin dependencias externas.

El simbolo es un anillo partido en dos porciones: los gastos del hogar
repartidos entre quienes los ponen. Colores de la app: fondo #0E1116, acento
turquesa #2DD4BF y un turquesa profundo para la porcion menor.
"""

import math
import os
import struct
import zlib

BG = (0x0E, 0x11, 0x16)
MAIN = (0x2D, 0xD4, 0xBF)
SECOND = (0x0F, 0x76, 0x6E)

# Proporciones del anillo dentro del lienzo, en fracciones del lado. Salen del
# icono principal: el splash y el favicon usan las mismas para que en todos
# lados se vea la misma figura y no una version mas chica o mas gorda.
OUTER = 340 / 1024
INNER = 196 / 1024

# Donde se corta el anillo, en grados. La porcion mayor va de START a SPLIT.
START = -90.0
SPLIT = 118.0
GAP = 7.0  # separacion entre porciones, en grados


def write_png(path, width, height, rgba):
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)  # filtro "none"
        raw += rgba[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as fh:
        fh.write(png)


def smooth(edge, value, softness=1.2):
    """Cobertura entre 0 y 1 para suavizar un borde a `softness` pixeles."""
    t = (edge - value) / softness + 0.5
    return 0.0 if t <= 0 else 1.0 if t >= 1 else t


def angle_gap_coverage(deg, boundary, radius, softness_deg):
    """Cuanto tapa el corte entre porciones, suavizado."""
    diff = abs((deg - boundary + 180.0) % 360.0 - 180.0)
    return smooth(diff, softness_deg, 0.9)


def render(size, ring_outer, ring_inner, background=None, mono=False):
    """Dibuja el anillo. `background` None deja el fondo transparente."""
    center = size / 2.0
    px = bytearray(size * size * 4)
    softness = max(1.0, size / 512.0)
    # El gap se define en grados pero se ve mejor constante en pixeles.
    gap_deg = math.degrees(GAP * math.pi / 180.0)

    for y in range(size):
        dy = y + 0.5 - center
        row = y * size * 4
        for x in range(size):
            dx = x + 0.5 - center
            dist = math.hypot(dx, dy)

            if background is not None:
                r, g, b = background
                a = 255
            else:
                r = g = b = 0
                a = 0

            if ring_inner - softness * 2 < dist < ring_outer + softness * 2:
                cover = smooth(ring_outer, dist, softness) * smooth(dist, ring_inner, softness)
                if cover > 0:
                    deg = math.degrees(math.atan2(dy, dx))
                    if mono:
                        color = (255, 255, 255)
                    else:
                        rel = (deg - START) % 360.0
                        color = MAIN if rel <= (SPLIT - START) % 360.0 else SECOND

                    # Separacion entre las dos porciones.
                    cover *= angle_gap_coverage(deg, START, dist, gap_deg)
                    cover *= angle_gap_coverage(deg, SPLIT, dist, gap_deg)

                    if cover > 0:
                        if background is not None:
                            r = round(r + (color[0] - r) * cover)
                            g = round(g + (color[1] - g) * cover)
                            b = round(b + (color[2] - b) * cover)
                        else:
                            r, g, b = color
                            a = round(255 * cover)

            i = row + x * 4
            px[i] = r
            px[i + 1] = g
            px[i + 2] = b
            px[i + 3] = a
    return px


def solid(size, color):
    px = bytearray(size * size * 4)
    for i in range(0, len(px), 4):
        px[i], px[i + 1], px[i + 2], px[i + 3] = color[0], color[1], color[2], 255
    return px


def icon(size, background=None, mono=False):
    """El simbolo con las proporciones del icono principal."""
    return render(size, round(size * OUTER), round(size * INNER), background, mono)


# Junto al script, para que siga funcionando si el proyecto cambia de carpeta.
BASE = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'images')
)

# Icono principal: simbolo sobre el fondo de la app.
write_png(f'{BASE}/icon.png', 1024, 1024, icon(1024, background=BG))

# Adaptive icon de Android: aca el simbolo va mas chico porque el launcher
# recorta el lienzo, y solo el 66% central esta garantizado.
write_png(f'{BASE}/android-icon-foreground.png', 1024, 1024, render(1024, 268, 155))
write_png(f'{BASE}/android-icon-background.png', 1024, 1024, solid(1024, BG))
write_png(f'{BASE}/android-icon-monochrome.png', 1024, 1024, render(1024, 268, 155, mono=True))

# Splash: mismo dibujo que el icono. Se deja transparente porque el color de
# fondo lo pone app.json, y asi el mismo archivo sirve en claro y en oscuro.
write_png(f'{BASE}/splash-icon.png', 1024, 1024, icon(1024))

# Favicon: el mismo icono, en el tamano que pide la pestana del navegador.
write_png(f'{BASE}/favicon.png', 64, 64, icon(64, background=BG))

# Logo para usar dentro de la app: sin fondo y sin el margen del launcher, que
# ahi no hace falta reservar lugar para el recorte.
write_png(f'{BASE}/logo.png', 256, 256, render(256, 120, 69))

print(f'iconos generados en {BASE}')
