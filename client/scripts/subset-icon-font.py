"""Recorta la tipografía de íconos a los que la app usa de verdad.

MaterialIcons trae 2234 glifos y pesa 349 KB. La app dibuja siete íconos, así
que el resto se descarga para nada en la primera visita al sitio.

Produce dos archivos que van juntos y se versionan:

  assets/fonts/material-icons-subset.ttf   la fuente con esos siete glifos
  assets/fonts/material-icons-subset.json  el mapa nombre → código

El JSON es además la lista de nombres válidos: `components/ui/icon-symbol.tsx`
tipa su mapeo contra sus claves, así que agregar un ícono sin volver a correr
este script no compila, en vez de dibujar un cuadrado vacío.

Uso:  python scripts/subset-icon-font.py
Necesita fontTools (`pip install fonttools`); no corre en cada build.
"""

import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parent.parent

ORIGEN = (
    RAIZ
    / "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons"
)
FUENTE = ORIGEN / "Fonts/MaterialIcons.ttf"
GLYPHMAP = ORIGEN / "glyphmaps/MaterialIcons.json"

DESTINO = RAIZ / "assets/fonts"
TTF_SALIDA = DESTINO / "material-icons-subset.ttf"
JSON_SALIDA = DESTINO / "material-icons-subset.json"

# Los nombres de Material Icons que mapea `icon-symbol.tsx`. Si se agrega uno
# acá hay que volver a correr el script; si se agrega allá sin correrlo, no
# compila.
USADOS = [
    "add",
    "chevron-left",
    "chevron-right",
    "history",
    "pie-chart",
    "receipt-long",
    "settings",
]


def main() -> None:
    todos = json.loads(GLYPHMAP.read_text(encoding="utf-8"))

    faltantes = [nombre for nombre in USADOS if nombre not in todos]
    if faltantes:
        raise SystemExit(f"No existen en MaterialIcons: {', '.join(faltantes)}")

    reducido = {nombre: todos[nombre] for nombre in USADOS}

    fuente = TTFont(FUENTE)
    opciones = subset.Options()
    # El nombre de la familia se conserva para que `createIconSet` la encuentre.
    opciones.name_IDs = ["*"]

    subsetter = subset.Subsetter(options=opciones)
    subsetter.populate(unicodes=list(reducido.values()))
    subsetter.subset(fuente)

    DESTINO.mkdir(parents=True, exist_ok=True)
    fuente.save(TTF_SALIDA)
    JSON_SALIDA.write_text(
        json.dumps(reducido, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    antes = FUENTE.stat().st_size
    despues = TTF_SALIDA.stat().st_size
    print(f"{len(reducido)} de {len(todos)} glifos")
    print(f"{antes:,} B -> {despues:,} B ({100 - despues * 100 // antes}% menos)")


if __name__ == "__main__":
    main()
