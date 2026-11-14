# Street View v0 — implementación del motor (#46)

2026-11-14. Rama `pabloizgui/46-lunar-streetview` desde `origin/dev` 6a9395e.
El issue #46 conserva un texto antiguo de roles A–E: se sigue el bloque de Pablo
de docs/10-plan-tecnico.md, publicado mediante #59/#62. No se cierra el issue
completo: perfiles de horizonte y validación científica todavía no están hechos.

## Alcance ejecutado

Solo el componente de Pablo y la configuración/dependencias que necesita su
motor. No se modifican páginas, router, store, globo, capas ni juego del equipo.
Se mantienen las interfaces seleccion/tiempo/series y el reloj común.

- Carga diferida de Cesium y assets propios con Vite.
- Elipsoide lunar explícito, sin modificar el valor global ni usar servicios
  terrestres por defecto.
- Cámara en altura muestreada de la malla + 1,7 m, configurable para la vista.
  Arrastre/touch/teclas y botones de giro; sin órbita o traslación accidental.
- Marcadores direccionales Sol/Tierra desde azimut/elevación de la serie del
  sitio. Son puntos con etiquetas, no discos con tamaño/fase físicamente modelados.
- Validación de sitio, intervalo temporal y muestra utilizada; se conserva el
  timestamp muestreado y la visibilidad desconocida de Tierra.
- Cancelación al desmontar, destrucción del visor y recursos, limpieza de
  listeners/ResizeObserver; error/reintento y límite de 60 s en carga.
- Token público de lectura por variable VITE_CESIUM_ION_TOKEN o entrada temporal
  de desarrollo. La UI publicada no pide tokens a sus visitantes. No se persiste
  el token local ni se interpolan valores del token en keys o mensajes de error.

## Verificación y evidencia

- Tipos y ESLint correctos; 25 pruebas Vitest correctas, 12 nuevas sobre geometría
  lunar, polos, elevación, pertenencia al sitio, límites temporales y cámara.
- Build de producción correcto; cuatro directorios Cesium copiados. El chunk
  Cesium ronda 5 MB (1,39 MB gzip); se carga bajo demanda al activar el renderer.
  No se ha desactivado la advertencia de tamaño del bundler.
- Lockfile comprobado con pnpm 9.15.9 `--frozen-lockfile --lockfile-only` en una
  copia aislada de los manifiestos bajo data/, para no relinkear el visor activo.
- Navegador de gstack, sin token: ruta directa, formulario local, etiquetas mock
  y timestamp; Play/Pause cambian el reloj y la muestra del Street View. Pantallas
  escritorio y 375 px revisadas visualmente. Sin errores de consola en ese flujo.
- La cámara 3D, tacto sobre terreno, acceso al asset y calibración de alturas
  **no están verificados en vivo**: Pablo aún está creando el token. No sustituir
  esta prueba por las pruebas numéricas o por una captura del formulario.
- El helper gstack-checks detecta los comandos del repo, pero devuelve 127 en su
  runner Windows. No se declara READY_FOR_SHIP. Las comprobaciones equivalentes
  se ejecutaron con los binarios locales de TypeScript/ESLint/Vitest/Vite y pasan.

## Dependencias y decisiones locales

La instalación usa el pnpm 11 disponible en el host; el repo fija pnpm 9.
Se mantuvieron las versiones del equipo. Cesium 1.145.0 resolvía engine 26.5.0,
que quitó exports pedidos por el agregador, y fallaba el build; engine 26.3.0 /
widgets 16.2.0 son las versiones mínimas declaradas y quedan fijadas.
Los mismos overrides se expresan en package.json para pnpm 9 y en workspace YAML
para pnpm 11. El lockfile resuelve los dos motores y se ha validado con pnpm 9.

La política de antigüedad del host rechazó lucide-react 1.73.0, postcss 8.5.33 y
tapable 2.3.4, ya en el lockfile del equipo. Pablo autorizó explícitamente solo
esas excepciones. Se aplicaron durante la instalación y se retiraron del cambio
publicable; no se habilitaron scripts de ciclo de vida (`--ignore-scripts`).
Después de retirar la configuración temporal, pnpm 11 intenta revalidar/instalar
automáticamente antes de algunos scripts y vuelve a rechazar las versiones
recientes. La última verificación se ejecutó directamente con los comprobadores
ya instalados y autorizados, sin reinstalar ni cambiar la política del equipo.

## DEM y siguientes comprobaciones del motor

El fichero `ldem_87s_5mpp.tif` ya contiene 3.465.285.714 bytes.
SHA-256 local: `417a85715406c346e2ecb2fc3abc93d3717121466e3d4950e1a6b977f207b881`.
Tres ventanas locales se decodifican con valores finitos, incluido el entorno del
polo. Es lectura parcial del raster completo, no validación científica total.

Con token real: comprobar carga del asset, ausencia de geometría terrestre,
altura/cámara al cambiar sitio, giro/touch, reflejo del reloj, pérdida de red,
reintento y salida/entrada de modo sin contextos WebGL retenidos. Comparar después
alturas y marco con el DEM; no aplicar automáticamente offsets de reportes ajenos.

El encargo posterior de Pablo limita esta sesión a Street View. El heightmap
polar de Marta, el diseño detallado de la web, las constelaciones y el cálculo
de horizontes no se amplían como parte de este bloque.

## Ajuste posterior a Javi J0/J10 (2026-11-14)

Integrado `origin/dev` en `461507a`, conservando `a1c6216`. Valor inicial de
cámara/reintento/escena: 5 m desde la misma configuración JSON de producción
de terreno. El ajuste visual del usuario no recalcula visibilidad científica.
El muestreador de series local pasa a llamarse `sampleSiteSky`, para reservar
`skyAt(lat, lon, t)` a `@/ephem` de Javi. Este módulo y sus vectores no están
en `dev` todavía: se mantiene el muestreo del mismo sitio/ventana, sin inventar datos.
La prueba real anterior mostró terreno pero un giro produjo una vista gris;
no se considera cerrada la cámara 360°, ni calibradas las alturas Cesium/LOLA.

Verificado en esta rama: 26 pruebas web, TypeScript, lint y build correctos.
El primer lint encontró un bloqueo transitorio de lectura en OneDrive; el
reintento terminó correctamente sin cambiar dependencias ni políticas.
