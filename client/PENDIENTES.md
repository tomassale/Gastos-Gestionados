# Pendientes

Estado al 26 de agosto de 2026.

## Bloqueado: necesito estos datos tuyos

- [x] ~~Supabase: Project URL y anon key~~ — configuradas en `.env`.
- [x] ~~Correr `supabase/schema.sql`~~ — aplicado y verificado: las funciones responden, la
      función interna da 401 y las tablas 404 con la anon key, que es lo que se buscaba.
- [ ] **Volver a correr `supabase/schema.sql`** para que la base limpie sola: las marcas de
      borrado vencidas (`tombstone_ttl`) y los gastos de más de dos años (`retention_period`).
      Ninguna de las dos funciones está todavía allá. El lado del dispositivo ya funciona sin
      tocar nada.
- [ ] **URL del repositorio de GitHub** que ya creaste, para configurar el remoto.
- [x] **Vercel: desactivar la protección de acceso** en Settings → Deployment Protection →
      Vercel Authentication → *Disabled*. Hoy el sitio publicado pide iniciar sesión en Vercel,
      así que no se puede abrir desde otro dispositivo. También queda renombrar el proyecto de
      `dist` a `gastos-gestionados`. Lo intenté por API y el token del CLI no autoriza; se hace
      desde el panel, o autorizando la integración de Vercel con el enlace que te pasé.
- [ ] **El commit inicial**, que lo hacés vos. El repo está reiniciado y los 66 archivos están
      en el índice.

## Sin verificar

- [x] ~~Sincronización de punta a punta~~ — **verificada contra la base real** el 27/8/2026, en
      las dos direcciones: un gasto enviado desde afuera apareció solo en el emulador (con su
      persona), y uno cargado en el emulador llegó a la nube. También se probó que un gasto
      cargado *antes* de entrar al hogar se sube al entrar, y que un gasto pagado entre dos
      personas viaja con las dos.
- [x] ~~Layout de escritorio~~ — confirmado por vos: anda bien.
- [x] ~~Barra de navegación de Android~~ — confirmado por vos: quedó oscura.

## Para hacer cuando estén los datos de arriba

- [ ] Cargar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el proyecto de
      Vercel y redesplegar. Las variables se compilan dentro del bundle: sin redeploy no toman
      efecto.
- [ ] Conectar el repo de GitHub a Vercel para que cada push despliegue solo, en vez de correr
      el deploy a mano.
- [ ] GitHub Action programada que consulte Supabase una vez por día. El plan gratuito **pausa
      el proyecto tras una semana sin actividad**; no se pierden datos, pero hay que despausarlo
      a mano desde el panel. Con la app siendo local-first, la pausa no rompe nada, solo frena la
      sincronización.
- [ ] APK con EAS Build, si querés la app instalada de verdad y no depender de la compu con
      Metro corriendo. Va de la mano con EAS Update, para poder publicar cambios sin reinstalar.

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
- **La sincronización corre una sola vez al abrir la app**, y después solo a pedido con
  "Sincronizar ahora". Lo que se carga durante la sesión no viaja hasta la próxima apertura o
  hasta tocar el botón: menos llamadas, a costa de que el otro dispositivo pueda ver datos
  viejos.
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

## Errores encontrados por los tests, ya corregidos

- **Los montos con punto de miles se guardaban mil veces menos.** `parseAmountInput('12.500')`
  devolvía `12.5`: al haber un solo separador se asumía decimal. Ahora un punto seguido de
  exactamente tres dígitos se lee como separador de miles, y con cualquier otra cantidad como
  decimal. Fue el primer test que corrí y falló.

## Errores encontrados al probar la sincronización, ya corregidos

- **La sincronización pisaba lo que cargabas mientras estaba en vuelo.** Tomaba una foto de los
  datos, iba al servidor y al volver reemplazaba la lista entera con el resultado de esa foto:
  todo gasto cargado en el medio se perdía sin aviso. Ahora lo remoto se combina sobre el estado
  del momento, y si llega un cambio durante una sincronización se reintenta al terminar.
- **Las personas se duplicaban entre dispositivos.** Cada dispositivo generaba su propio
  identificador, así que dos "Ana" cargadas por separado quedaban como dos personas distintas.
  Ahora el identificador sale del nombre (`persona-ana`), y los dos llegan al mismo.
- **Tres errores en el SQL**: `pgcrypto` vive en el esquema `extensions` y las funciones no lo
  tenían en su `search_path`; `check_household` no validaba nada con la tabla vacía; y el
  `revoke` no cerraba la función interna porque en Postgres toda función es ejecutable por
  `PUBLIC` por defecto.

## Deuda técnica

- [ ] **No hay respaldo de lo que se borra por antigüedad.** Con la retención de dos años y sin
      exportación a Excel, esos gastos desaparecen sin dejar rastro. Si alguna vez importa
      conservarlos, la salida sería guardar un resumen por mes antes de borrar el detalle.

- [x] ~~No hay tests automatizados~~ — 70 tests en `lib/__tests__`, se corren con `bun test`.
      Cubren montos, fechas, meses, resumen, balance y reparto, validación del formulario, ida y
      vuelta por Excel, y la fusión (Excel y sincronización). Para poder probarla sin montar
      React, la fusión de planillas salió del contexto a `lib/merge.ts`.
- [ ] **El README sigue siendo el del template de Expo.** Cuando quieras documentar, se hace con
      el subagente `documentador`.
- [x] ~~El ícono de Android tenía fondo claro~~ — íconos nuevos: un anillo partido en dos
      porciones, en el turquesa de la app sobre `#0E1116`. Se generan con
      `scripts/make-icons.py`, sin dependencias.
- [ ] **Los dos formularios del hogar comparten el campo de código**: escribir en "Entrar"
      también completa "Crear uno nuevo". Funciona, pero confunde.
- [ ] **Quedaron datos de prueba en la nube**: el hogar `casa-prueba-9271-vk` con un gasto de
      prueba, y otro hogar llamado "x". Se borran con `reset.sql` o dejándolos morir.
- [ ] **No hay forma de sincronizar al cerrar la app.** Con la sincronización solo al inicio, si
      cargás gastos y cerrás sin tocar el botón, quedan esperando a la próxima apertura. Se
      podría enganchar al pasar a segundo plano con `AppState`.
- [x] ~~Los tombstones no se limpian nunca~~ — se olvidan a los **90 días** (`lib/tombstones.ts`),
      tanto en el dispositivo al cargar los datos como en la base, dentro de `push_changes`. El
      plazo tiene que ser mayor que lo que un teléfono puede estar sin abrir la app: si se olvida
      antes de que ese dispositivo se entere, el gasto borrado le reaparece.

## Antes de dar el proyecto por terminado

Cuando declares que está listo, corresponde el ritual: página de términos y condiciones si la
querés, auditoría de seguridad y auditoría de eficiencia con los subagentes correspondientes.
