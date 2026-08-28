# Pendientes

Estado al 27 de agosto de 2026.

## Bloqueado: necesito que lo hagas vos

- [ ] **Verificar que el freno por intentos fallidos tenga de dónde leer la IP.** El schema
      ya está aplicado —el keep-alive devolvió 200 y `heartbeat()` solo es ejecutable por
      `anon` después del `grant` que cierra el archivo, así que corrió entero—. Falta un
      detalle: `select client_ip();` desde el SQL Editor no sirve, tiene que ser a través de
      PostgREST. Si diera null, el freno no bloquea a nadie a propósito, que es preferible a
      bloquear a quien sí sabe el código.
- [ ] **Los hogares que ya existan tienen código elegido a mano.** La app ahora genera el código
      con 80 bits de azar, pero eso no alcanza para los que ya están: el código viejo no se puede
      derivar del hash. Si el hogar tiene datos que importan, creá uno nuevo y volvé a entrar
      desde los dos dispositivos.
- [ ] **Commitear el retoque del keep-alive.** Quedó sin commitear
      `.github/workflows/supabase-keepalive.yml`: se le corrigió un comentario que nombraba
      `client/vercel.json` —borrado al sacar la web— y el mensaje de error, que ahora explica
      la diferencia entre Repository secrets y Environment secrets. El workflow en sí ya
      funciona: la corrida manual del 27/8/2026 devolvió 200.
- [ ] **Borrar el proyecto de Vercel de la cuenta personal**, si seguía existiendo. La app
      ya no se publica en web y el repo no tiene con qué compilar un sitio.
- [ ] **Borrar los datos de prueba de la nube**: el hogar `casa-prueba-9271-vk` con un gasto de
      prueba, otro llamado "x", y el de la prueba de sincronización automática
      (`Prueba sincronización`, del 27/8/2026). Se borran con `supabase/reset.sql`, o el último
      solo con `delete from households where name = 'Prueba sincronización';`.
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
- [ ] **La sincronización automática, con dos dispositivos en la mano.** Lo verificado el
      27/8/2026 es la capa de red, contra la base real y con dos dispositivos simulados: la
      subida llega, el pull incremental con margen trae lo nuevo sin volver a bajar todo, y las
      bajas viajan. Falta ver los temporizadores en vivo: cargar un gasto en un teléfono y verlo
      aparecer solo en el otro, sin tocar nada.

## Para hacer

- [ ] **EAS Update**, si alguna vez querés publicar cambios sin reinstalar el APK. El APK ya no
      necesita EAS: se compila en esta misma máquina con `expo prebuild --platform android` y
      `android/gradlew assembleRelease`, porque están el JDK 17 y el SDK de Android. Sale firmado
      con la clave de debug, que alcanza para instalarlo a mano pero no para publicar en Play
      Store; para eso hay que generar un keystore propio y configurarlo en
      `android/app/build.gradle`. Ojo con `android/local.properties`: la ruta del SDK va con
      barras normales, porque en formato properties `\t` de `\tomas` se lee como tabulación y el
      build falla con un error que no dice nada.
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
- [ ] **`logo.png` quedó con geometría propia.** El ícono y el splash dibujan el anillo con
      la misma proporción; el logo de adentro de la app lo dibuja más grande y sin
      fondo, que para uso inline está bien. Si alguna vez se quiere unificar del todo, sale de
      la constante `OUTER` en `scripts/make-icons.py`.

## Decisiones tomadas, para no rediscutirlas

- **El keep-alive de Supabase anda** (27/8/2026). Una GitHub Action llama a `heartbeat()` una
  vez por día para que el plan gratuito no pause la base tras una semana sin actividad. Los dos
  valores van como **Repository secrets**, no como Environment secrets: un job solo ve los de un
  entorno si lo declara con `environment:`, y cargados en el entorno equivocado llegan vacíos.
  La trampa que queda es de GitHub: si el repo pasa **60 días sin commits**, las tareas
  programadas se desactivan solas —avisa por mail— y hay que rehabilitarlas desde Actions.
- **La app es solo móvil: se sacó el soporte web** (27/8/2026). Se fueron `vercel.json` con su
  CSP, `dist/`, los scripts `build` y `web`, el bloque `web` de `app.json`, `favicon.png` y las
  dependencias `react-native-web` y `react-dom`. No había nada compartido que romper: cero
  archivos `.web.tsx`, cero `Platform.OS === 'web'` y ningún import propio de esas dos librerías.
  Ojo con dos nombres que engañan: `scripts/make-icons.py` genera también los íconos de Android,
  y `expo-web-browser` abre el navegador in-app en el teléfono —ninguno de los dos es web—.
  Sacarlas de `dependencies` no achicó nada: `expo` y `expo-router` las siguen instalando como
  transitivas. Si alguna vez vuelve la web, lo que hay que reponer es la CSP: era la única
  defensa contra XSS del sitio.
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
  dependencias, y el ícono y el splash salen de la misma proporción para que sean la misma
  figura en todos lados. Los de Android van más chicos a propósito: el launcher recorta el
  lienzo y solo garantiza el 66% central.

## Antes de dar el proyecto por terminado

Cuando declares que está listo, corresponde el ritual: página de términos y condiciones si la
querés, auditoría de seguridad y auditoría de eficiencia con los subagentes correspondientes.
