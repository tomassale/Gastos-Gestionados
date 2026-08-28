// En Android y web los íconos salen de Material Icons; en iOS, de SF Symbols
// nativos (`icon-symbol.ios.tsx`).

// Por la ruta directa y no por '@expo/vector-icons': el índice del paquete
// importa todos los sets de íconos, y con ellos entran al bundle las
// tipografías de Ionicons, FontAwesome y compañía, que acá no se usan.
import createIconSet from '@expo/vector-icons/build/createIconSet';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

import glyphMap from '@/assets/fonts/material-icons-subset.json';

/**
 * La tipografía completa de Material Icons son 2234 glifos y 349 KB para los
 * siete que se dibujan acá. Esta es la versión recortada que produce
 * `scripts/subset-icon-font.py`, junto con el mapa de nombres de al lado.
 */
const MaterialIcons = createIconSet(
  glyphMap,
  'MaterialIconsSubset',
  require('@/assets/fonts/material-icons-subset.ttf')
);

/** Los nombres que quedaron en la fuente recortada: fuera de estos no hay glifo. */
type MaterialIconName = keyof typeof glyphMap;

/**
 * Mapeo de SF Symbols a Material Icons. Solo están los íconos que la app usa:
 * agregar uno pide agregarlo también a `scripts/subset-icon-font.py` y volver a
 * correrlo, o esto no compila.
 */
const MAPPING: Record<string, MaterialIconName> = {
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'list.bullet': 'receipt-long',
  'chart.pie.fill': 'pie-chart',
  'plus': 'add',
  'clock.arrow.circlepath': 'history',
  'gearshape.fill': 'settings',
} satisfies Record<string, MaterialIconName>;

export type IconSymbolName = Extract<SymbolViewProps['name'], keyof typeof MAPPING>;

/**
 * Un ícono con el mismo aspecto en las tres plataformas. Los nombres son los de
 * SF Symbols y se traducen a mano a Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
