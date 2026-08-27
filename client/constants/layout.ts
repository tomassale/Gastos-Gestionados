/** Ancho máximo del contenido: en pantallas anchas el contenido se centra en vez de estirarse. */
export const CONTENT_MAX_WIDTH = 680;

/** Ancho máximo cuando el contenido se reparte en dos columnas. */
export const WIDE_CONTENT_MAX_WIDTH = 1040;

/** A partir de este ancho de ventana el contenido se reparte en dos columnas. */
export const WIDE_BREAKPOINT = 900;

/** Por debajo de este ancho conviene apilar lo que normalmente va en fila. */
export const NARROW_BREAKPOINT = 380;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
