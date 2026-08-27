import { useWindowDimensions } from 'react-native';

import {
  CONTENT_MAX_WIDTH,
  NARROW_BREAKPOINT,
  WIDE_BREAKPOINT,
  WIDE_CONTENT_MAX_WIDTH,
} from '@/constants/layout';

export type ContentWidth = { width: '100%'; maxWidth: number; alignSelf: 'center' };

export type Layout = {
  /** Ventanas de escritorio, donde el contenido se reparte en dos columnas. */
  isWide: boolean;
  /** Teléfonos chicos, donde lo que va en fila conviene apilarlo. */
  isNarrow: boolean;
  /** Centra el contenido en pantallas anchas en vez de dejarlo estirarse. */
  contentWidth: ContentWidth;
  /** Igual que `contentWidth` pero para pantallas que usan dos columnas. */
  wideContentWidth: ContentWidth;
};

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return {
    isWide,
    isNarrow: width < NARROW_BREAKPOINT,
    contentWidth: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
    wideContentWidth: {
      width: '100%',
      maxWidth: isWide ? WIDE_CONTENT_MAX_WIDTH : CONTENT_MAX_WIDTH,
      alignSelf: 'center',
    },
  };
}
