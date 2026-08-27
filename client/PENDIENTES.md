# Pendientes

Estado al 27 de agosto de 2026.

## Bloqueado: necesito que lo hagas vos

- [ ] **Volver a correr `supabase/schema.sql`** para que la base limpie sola: las marcas de
      borrado vencidas (`tombstone_ttl`) y los gastos de más de dos años (`retention_period`).
      No pude confirmarlo desde afuera —esas funciones no están expuestas a la anon key, así que
      la respuesta es la misma existan o no—, pero por lo que quedó anotado no se corrió todavía.
      Correrlo de nuevo no rompe nada: el script es idempotente. El lado del dispositivo ya
      funciona sin tocar esto.
- [ ] **Confirmar el nombre del proyecto en Vercel.** Quedaba renombrarlo de `dist` a
      `gastos-gestionados`. Probé `gastos-gestionados.vercel.app` y `dist-tomassale.vercel.app`
      y las dos dan 404, así que no sé con qué nombre quedó publicado. Se hace desde el panel: el
      token del CLI no autoriza el cambio.
- [ ] **Borrar los datos de prueba de la nube**: el hogar `casa-prueba-9271-vk` con un gasto de
      prueba, otro llamado "x", y el de la prueba de sincronización automática
      (`Prueba sincronización`, del 27/8/2026). Se borran con `supabase/reset.sql`, o el último
      solo con `delete from households where name = 'Prueba sincronización';`.
- [ ] **Commitear lo de esta sesión** (los commits los hacés vos). Sin commitear quedan la
      sincronización automática —`hooks/use-sync.ts`, `hooks/use-synced-state.ts`,
      `contexts/sync-context.tsx`, los dos contextos de datos, `lib/sync.ts`,
      `hooks/use-persisted-state.ts`, las tres pantallas— y los íconos regenerados
      (`splash-icon.png`, `favicon.png`, `scripts/make-icons.py`).

## Sin verificar

- [ ] **La sincronización automática, con dos dispositivos en la mano.** Lo verificado el
      27/8/2026 es la capa de red, contra la base real y con dos dispositivos simulados: la
      subida llega, el pull incremental con margen trae lo nuevo sin volver a bajar todo, y las
      bajas viajan. Falta ver los temporizadores en vivo: cargar un gasto en un teléfono y verlo
      aparecer solo en el otro, sin tocar nada.

## Para hacer

- [ ] **Redesplegar para que el sitio tome el favicon nuevo.** Como Vercel ya está conectado al
      repo, alcanza con pushear: el `dist/` que hay en la compu quedó con el favicon viejo.
- [ ] **APK con EAS Build**, si querés la app instalada de verdad y no depender de la compu con
      Metro corriendo. Va de la mano con EAS Update, para publicar cambios sin reinstalar. Es
      además la única forma de ver el ícono y el splash nuevos en el teléfono: recargar no
      alcanza, esos assets se hornean en el build.
- [ ] **GitHub Action programada que consulte Supabase una vez por día.** El plan gratuito
      **pausa el proyecto tras una semana sin actividad**; no se pierden datos, pero hay que
      despausarlo a mano desde el panel. Con la app siendo local-first la pausa no rompe nada,
      solo frena la sincronización.
- [ ] **El README sigue siendo el del template de Expo.** Cuando quieras documentar, se hace con
      el subagente `documentador`.

## Deuda técnica

- [ ] **No hay respaldo de lo que se borra por antigüedad.** Con la retención de dos años y sin
      exportación a Excel, esos gastos desaparecen sin dejar rastro. Si alguna vez importa
      conservarlos, la salida sería guardar un resumen por mes antes de borrar el detalle.
- [ ] **El motor de sincronización no tiene tests.** Lo puro sí está cubierto (`applyRemote`,
      `withOverlap`), pero los temporizadores, el reintento y el `AppState` de
      `hooks/use-sync.ts` no se prueban solos: haría falta montar React en los tests, y hoy no
      hay con qué. Es la parte que más se va a tocar y la que menos red tiene.
- [ ] **Los dos formularios del hogar comparten el campo de código**: escribir en "Entrar"
      también completa "Crear uno nuevo". Funciona, pero confunde.
- [ ] **Advertencias de deprecación de `react-native-web`** en el arranque: `shadow*` hay que
      pasarlo a `boxShadow`, y `props.pointerEvents` a `style.pointerEvents`. Hoy solo ensucian
      el log; en la próxima major dejan de andar.
- [ ] **`logo.png` quedó con geometría propia.** El ícono, el splash y el favicon dibujan el
      anillo con la misma proporción; el logo de adentro de la app lo dibuja más grande y sin
      fondo, que para uso inline está bien. Si alguna vez se quiere unificar del todo, sale de
      la constante `OUTER` en `scripts/make-icons.py`.

## Decisiones tomadas, para no rediscutirlas

- **El Excel se sacó por completo** (27/8/2026). Importar y exportar, la librería `xlsx` y las
  dependencias que solo servían para eso (`expo-document-picker`, `expo-sharing`,
  `expo-file-system`). Con la sincronización andando, el Excel ya no era el puente entre
  dispositivos. El bundle web bajó de 2,29 MB a 1,88 MB.
- **Los gastos de más de dos años se borran solos**, contados por la fecha del gasto. Se aplica
  en el dispositivo al cargar los datos y en la base dentro de `push_changes`. Tiene que ser en
  los dos lados: si se borrara solo en la base, el teléfono los volvería a subir en la próxima
  sincronización. **No hay respaldo**: al no existir más la exportación a Excel, lo que se borra
  se pierde.
- **La sincronización es automática** (27/8/2026, reemplaza a la decisión anterior de
  sincronizar solo al abrir). Lo que se carga en un dispositivo sube **a los 1,5 segundos** y
  aparece en los demás **a los 20 segundos como mucho**, que es cada cuánto se pregunta por
  novedades con la app a la vista. Además sincroniza al volver a primer plano y sube lo pendiente
  al pasar a segundo plano. "Sincronizar ahora" queda como atajo.
  El costo son ~180 llamadas por hora y por dispositivo con la app abierta; cuando no hay nada
  propio para subir, la consulta periódica hace **una sola** llamada (`pull_changes`) y no
  reenvía el historial.
- **No se usa Supabase Realtime**, que daría aviso instantáneo por WebSocket en vez de preguntar
  cada 20 segundos. Realtime respeta RLS y hoy las tablas están cerradas sin políticas: habría
  que abrirlas a la anon key —que viaja dentro de la app— y eso tira abajo el modelo de
  seguridad del código de hogar. La consulta periódica es más tosca y mucho más barata en riesgo.
- **Acceso por código de hogar, sin login.** Es lo que elegiste sabiendo el riesgo: la anon key
  viaja dentro de la app y es visible en el sitio publicado, así que lo único que protege los
  datos es el código. Que sea largo y no circule por canales públicos. Las tablas están cerradas
  con RLS sin políticas y todo pasa por funciones que validan el código, guardado con bcrypt.
- **Ante conflicto gana la última escritura.** Si el mismo gasto se edita en dos dispositivos a
  la vez, queda el más reciente. Resolverlo mejor requiere un servidor que ordene los cambios.
- **Un gasto pagado entre varias personas se reparte en partes iguales.** Si alguna vez hace
  falta que cada uno ponga un monto distinto, hay que cambiar el modelo.
- **Sin `@supabase/supabase-js`.** Son cuatro llamadas REST y el SDK arrastra polyfills que en
  React Native ya rompieron una vez.
- **Los íconos se generan, no se dibujan a mano.** `scripts/make-icons.py` los produce sin
  dependencias, y el ícono, el splash y el favicon salen de la misma proporción para que sean la
  misma figura en todos lados. Los de Android van más chicos a propósito: el launcher recorta el
  lienzo y solo garantiza el 66% central.

## Antes de dar el proyecto por terminado

Cuando declares que está listo, corresponde el ritual: página de términos y condiciones si la
querés, auditoría de seguridad y auditoría de eficiencia con los subagentes correspondientes.
