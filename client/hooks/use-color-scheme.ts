/**
 * La app es de tema oscuro: no sigue la preferencia del sistema, así que el
 * esquema es siempre el mismo en todas las plataformas.
 */
export function useColorScheme(): 'dark' {
  return 'dark';
}
