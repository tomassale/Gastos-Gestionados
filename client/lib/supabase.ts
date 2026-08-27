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

type RpcName = 'create_household' | 'check_household' | 'pull_changes' | 'push_changes';

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

export async function rpc<T>(name: RpcName, args: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error('Falta configurar Supabase en el archivo .env.');
  }

  const response = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}
