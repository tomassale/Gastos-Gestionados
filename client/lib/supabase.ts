/**
 * Acceso a Supabase por REST, sin SDK: son cuatro funciones y evitamos
 * arrastrar dependencias que en React Native traen polyfills propios.
 *
 * La anon key es pública por diseño y sola no sirve de nada: las tablas tienen
 * RLS sin políticas y las funciones exigen el código del hogar.
 */

/** Acepta tanto la URL del proyecto como el endpoint REST, que es lo que copia el panel. */
function baseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
}

const URL = baseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
const ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

/**
 * Una llamada que no contesta en este plazo se da por perdida. Sin esto, un
 * servidor que acepta la conexión y no responde —el proyecto pausado por
 * inactividad, por ejemplo— deja la promesa colgada para siempre y con ella el
 * cerrojo de la sincronización, que no vuelve a intentar hasta reiniciar.
 */
const TIMEOUT_MS = 15_000;

type RpcName = 'create_household' | 'check_household' | 'pull_changes' | 'push_changes';

/**
 * PostgREST devuelve el código `P0001` para los `raise exception` del esquema,
 * que son los mensajes escritos para que los lea una persona. Cualquier otro
 * error es interno —una restricción violada, un tipo que no convierte— y su
 * texto nombra columnas y detalles del esquema, así que no se muestra.
 */
async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; code?: string };
    if (body.code === 'P0001' && body.message) return body.message;
  } catch {
    // Cuerpo ilegible: cae en el mensaje genérico.
  }
  return 'No se pudo completar la operación. Probá de nuevo en un rato.';
}

export async function rpc<T>(name: RpcName, args: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error('Falta configurar Supabase en el archivo .env.');
  }
  // El código del hogar viaja en el cuerpo de cada llamada: sin TLS iría en claro.
  if (!URL.startsWith('https://')) {
    throw new Error('La URL de Supabase tiene que empezar con https.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}
