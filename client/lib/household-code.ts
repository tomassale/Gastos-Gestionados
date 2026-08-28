import * as Crypto from 'expo-crypto';

/**
 * Alfabeto sin los caracteres que se confunden al dictar el código en voz alta
 * o al copiarlo a mano: falta la o, la l, la i, el cero y el uno. Quedan 32
 * símbolos, que son cinco bits cada uno.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Dieciséis símbolos son 80 bits de azar: fuera del alcance de la fuerza bruta. */
export const CODE_LENGTH = 16;

/**
 * El código es lo único que protege los datos del hogar, así que no lo elige
 * una persona: lo genera el dispositivo con el azar del sistema.
 *
 * Un código pensado a mano cae con un diccionario, y acá eso pesa más que de
 * costumbre: la base busca el código entre todos los hogares a la vez, así que
 * cada intento del atacante se prueba contra todos y no contra uno.
 */
export function generateHouseholdCode(): string {
  const bytes = Crypto.getRandomBytes(CODE_LENGTH);
  // 256 es múltiplo exacto de 32, así que el resto no favorece a ningún símbolo.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
