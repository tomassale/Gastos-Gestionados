# Pendientes

Estado al 27 de agosto de 2026.

## Bloqueado: necesito que lo hagas vos

- [ ] **Correr `supabase/schema.sql` de nuevo, y esta vez sí hace falta.** Trae lo que salió de
      la auditoría de seguridad: el freno por intentos fallidos contra la fuerza bruta del
      código, bcrypt en cost 12, la búsqueda por índice, la clave primaria por hogar y los topes
      de tamaño. Sigue siendo idempotente y migra solo lo que encuentra hecho de antes. Hasta que
      no lo corras, la base sigue como está: la app anda igual, pero sin ninguna de esas defensas.
      Al correrlo, verificá que el freno tenga de dónde leer la IP —`select client_ip();` desde
      el SQL Editor no sirve, tiene que ser a través de PostgREST—; si diera null, el freno no
      bloquea a nadie a propósito, que es preferible a bloquear a quien sí sabe el código.
- [ ] **Los hogares que ya existan tienen código elegido a mano.** La app ahora genera el código
      con 80 bits de azar, pero eso no alcanza para los que ya están: el código viejo no se puede
      derivar del hash. Si el hogar tiene datos que importan, creá uno nuevo y volvé a entrar
      desde los dos dispositivos.
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

- [ ] **Los íconos, a ojo, después de recortar la tipografía.** Los siete glifos están en la
      fuente y el mapa de nombres lo genera el mismo script, así que no deberían faltar, pero un
      error acá se ve como un cuadrado vacío y no como un error de compilación. Son las cuatro
      solapas de abajo, el botón de agregar y las flechas del selector de mes.
- [ ] **El APK en un teléfono.** Compila y queda bien armado —firmado, con el bundle de JS y la
      tipografía recortada adentro, y las cuatro arquitecturas—, pero no había ningún dispositivo
      conectado para instalarlo y verlo arrancar. Lo que más conviene mirar es que los íconos se
      dibujen y que la app no se caiga al abrir: se quitó `react-native-reanimated`, que en web
      quedó demostrado que no lo usa nadie, pero en nativo no se probó.
- [ ] **La CSP en el navegador.** Verifiqué que el build no tenga recursos de otros orígenes,
      ni `blob:`, ni workers, ni `eval` que llegue a ejecutarse, y que las cabeceras salgan bien
      servidas. Falta abrir el sitio publicado con la consola a la vista y confirmar que no
      aparezca ninguna violación: la extensión de Chrome no respondió cuando lo intenté.

- [ ] **La sincronización automática, con dos dispositivos en la mano.** Lo verificado el
      27/8/2026 es la capa de red, contra la base real y con dos dispositivos simulados: la
      subida llega, el pull incremental con margen trae lo nuevo sin volver a bajar todo, y las
      bajas viajan. Falta ver los temporizadores en vivo: cargar un gasto en un teléfono y verlo
      aparecer solo en el otro, sin tocar nada.

## Para hacer

- [ ] **Redesplegar para que el sitio tome el favicon nuevo.** Como Vercel ya está conectado al
      repo, alcanza con pushear: el `dist/` que hay en la compu quedó con el favicon viejo.
- [ ] **EAS Update**, si alguna vez querés publicar cambios sin reinstalar el APK. El APK ya no
      necesita EAS: se compila en esta misma máquina con `expo prebuild --platform android` y
      `android/gradlew assembleRelease`, porque están el JDK 17 y el SDK de Android. Sale firmado
      con la clave de debug, que alcanza para instalarlo a mano pero no para publicar en Play
      Store; para eso hay que generar un keystore propio y configurarlo en
      `android/app/build.gradle`. Ojo con `android/local.properties`: la ruta del SDK va con
      barras normales, porque en formato properties `\t` de `\tomas` se lee como tabulación y el
      build falla con un error que no dice nada.
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
- [ ] **Advertencias de deprecación de `react-native-web`** en el arranque: `shadow*` hay que
      pasarlo a `boxShadow`, y `props.pointerEvents` a `style.pointerEvents`. Hoy solo ensucian
      el log; en la próxima major dejan de andar.
- [ ] **`logo.png` quedó con geometría propia.** El ícono, el splash y el favicon dibujan el
      anillo con la misma proporción; el logo de adentro de la app lo dibuja más grande y sin
      fondo, que para uso inline está bien. Si alguna vez se quiere unificar del todo, sale de
      la constante `OUTER` en `scripts/make-icons.py`.

## Decisiones tomadas, para no rediscutirlas

- **El código del hogar lo genera el dispositivo, no la persona** (27/8/2026, sale de la
  auditoría de seguridad). Son 16 símbolos de un alfabeto de 32 sin caracteres confundibles: 80
  bits. Un código pensado a mano caía con un diccionario, y como la base lo busca entre todos los
  hogares a la vez, cada intento del atacante se probaba contra todos y no contra uno.
- **La base busca el código por un HMAC indexado y lo verifica con bcrypt** (27/8/2026). El
  bcrypt lleva salt propio y no se puede indexar, así que antes cada llamada probaba un bcrypt
  por cada hogar de la tabla —y `pull_changes` corre 180 veces por hora por dispositivo—. La
  pimienta del HMAC vive en `app_secrets`, cerrada como el resto. El precio, dicho de frente: con
  un volcado de la tabla se vería qué filas comparten código; sin la pimienta no se puede probar
  diccionarios contra ella, y quien decide el match sigue siendo bcrypt.
- **Se sube solo lo que cambió desde la última subida confirmada** (27/8/2026), con la marca
  guardada en disco. Antes, editar un gasto reenviaba el historial entero —454 KB con dos años
  cargados— y el servidor reescribía las 2400 filas para dejarlas igual.
- **Sin `react-native-reanimated`** (27/8/2026). Era el 33% del bundle web y no lo usaba nadie:
  venía del template de Expo. Sacarlo bajó el JS de 1,88 MB a 1,07 MB.
- **La tipografía de íconos se recorta a los que se usan** (27/8/2026), con
  `scripts/subset-icon-font.py`: 2234 glifos y 349 KB pasaron a siete glifos y 1,7 KB. El JSON
  que genera es además la lista de nombres válidos, así que agregar un ícono sin regenerar la
  fuente no compila en vez de dibujar un cuadrado vacío.

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
- **Cuatro pantallas, una por tarea** (27/8/2026). Gastos muestra solo el mes actual, que es lo
  que se mira todos los días; Historial los meses ya cerrados, y no deja avanzar hasta el actual
  para que el mismo gasto no aparezca en dos lugares iguales; Resumen quedó con los números del
  mes (total, promedio, por categoría y el balance entre personas); Configuración junta el hogar
  compartido y la administración de personas, que antes vivían en dos modales sueltos. Las
  rutas `/people` y `/household` ya no existen.
- **Los íconos se generan, no se dibujan a mano.** `scripts/make-icons.py` los produce sin
  dependencias, y el ícono, el splash y el favicon salen de la misma proporción para que sean la
  misma figura en todos lados. Los de Android van más chicos a propósito: el launcher recorta el
  lienzo y solo garantiza el 66% central.

## Antes de dar el proyecto por terminado

Cuando declares que está listo, corresponde el ritual: página de términos y condiciones si la
querés, auditoría de seguridad y auditoría de eficiencia con los subagentes correspondientes.
