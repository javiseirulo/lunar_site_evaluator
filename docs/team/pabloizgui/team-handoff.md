# Entrega de Pablo: terreno y Lunar Street View

## Entrega vigente — 2026-11-15

Rama `pabloizgui/46-globe-streetview`, desde dev `0ca606d` (PR #91, globo v2 #97, despliegue #98, Mission #90 y datos/capas/restyle #101 integrados).
La nueva integración se describe en [globe-surface-integration.md](globe-surface-integration.md);
la guía científica sigue en [ephemeris-integration.md](ephemeris-integration.md).
Estado y dependencias: [tasks.md](tasks.md). Los estados antiguos se conservan como historial.

| Persona | Archivos actuales incluidos en Git | Uso |
|---|---|---|
| Marta | `web/public/data/terrain/heightmap.json`, `heights.f32`, `valid.u8`, `layers.json`, `elevation.png`, `slope.png` | Entrega visual original intacta: vértices 1025², metros, máscara, NoData; ventana sur hasta 80°S |
| Javi | `web/public/data/horizon/<id>.json` (41) | Contrato v1.1, coordenadas del catálogo real, 5 m, norte horario, 0,1°, alcance 310 km; sin interpolar perfiles entre sitios |
| Javi / Marta / Javi2 | `web/public/data/terrain/catalog.json`, `catalog-terrain.csv` | 59 elevaciones/pendientes y PSR con cobertura/error explícitos; fuentes y precisión por punto. Sustituyen a `site-terrain.*` para el catálogo real |
| Equipo | `web/public/data/terrain/catalog-delivery.json`, `delivery.json` | Convergencia/cobertura, origen y estado de los productos; la configuración antigua es nominal, el perfil describe el cálculo publicado |
| Javi / Marta | `contracts/types.ts`, `web/src/core/store.ts`, `web/src/core/surfaceNavigation.ts` | `selectedPoint` aditivo; selección de sitio lo limpia. El astronauta y el retorno al globo lo usan; URL reproducible con coordenadas y UTC |
| Equipo | `web/src/streetview/` | Cámara, controles, cielo SPICE, reloj UTC común y QR; ruta `/streetview/<id>` |

Para ejecutar: `pnpm install`, `pnpm dev`, abrir `/explore?view=3d` y arrastrar
el astronauta a la Luna. La ruta y el acceso desde fichas existentes se reutilizan.
El PNG transparente está en `web/public/streetview/astronaut-ai.png`, con origen y
hash en `assets.json`; es una ilustración IA marcada, sin insignias de agencias.

Por petición explícita posterior de Pablo, el token público de aplicación está
en `web/src/streetview/cesiumAccess.ts`; sustituye la instrucción anterior de
mantener este token concreto fuera de Git. No hace falta introducirlo ni crear
otra cuenta. Tiene solo lectura de Moon y permite localhost/127.0.0.1:5173 según
confirmación del dueño. `VITE_CESIUM_ION_TOKEN` tiene prioridad para despliegues.
Las claves privadas siguen fuera de Git; los enlaces/QR no incluyen ninguna.
Un QR para clase necesita una URL accesible y permitida por el token.

Marta: `web/src/globe/GlobeSurfaceBridge.tsx` añade solo el arrastre/colocación;
`web/src/core/surfaceNavigation.ts` publica coordenadas y UTC por core. No se añade
otro motor de transición ni se altera su ficha; se reutiliza `standHere` de Marta
con un callback opcional para conservar la URL de coordenadas/UTC al aterrizar. `web/src/core/savedPlaces.ts`
conserva su clave `lunar-globe-custom-pins`, IDs y esquema `{id,name,lat,lon}`;
`globe/customPins.ts` mantiene sus exports. Los lugares se guardan por navegador,
no se suben a una cuenta. El retorno pide Explore 3D centrado en el punto actual.

Los GeoTIFF originales y kernels están fuera de Git. Los compañeros pueden
consumir todos los productos anteriores sin descargar varios GB ni ejecutar
Python. Javi ya entregó las efemérides y el catálogo: dejaron de ser bloqueos.
El PR #101 ya incorpora los 41 horizontes y alturas/pendientes/PSR al export,
regenera series/evaluación y publica capas reales. PSR permanece pendiente en
18 sitios sin cobertura. Las rejillas por celda siguen geométricas: esta entrega
no añade horizontes densos a toda la Luna. El parche de Marta consume alturas,
máscara y ahora las capas de Javi. No hace falta volver a entregar estos archivos.

## Historial de la entrega anterior

Actualizado 2026-11-14. Rama de entrega unificada:
`pabloizgui/46-lunar-streetview`, con el último `dev` (`e6825cd`, incluye #66)
y el trabajo de `pabloizgui/37-terrain-handoff`. No hace falta cambiar de rama
para disponer del visor y los datos. La rama #37 se conserva como historial.

## Qué puede usar cada compañero

Todos los caminos siguientes son relativos a la raíz del repositorio y están
incluidos en la rama. No dependen del ZIP local ni de descargar los DEM grandes.

| Destinatario | Archivos | Uso y condiciones |
|---|---|---|
| Marta | `web/public/data/terrain/heightmap.json`, `heights.f32`, `valid.u8` en la misma carpeta | Malla polar 1025² Float32 LE, metros, extremos incluidos; máscara 1 válido / 0 NoData; ventana de `layers.json` hasta −80°S |
| Marta / Javi2 | `web/public/data/terrain/layers.json`, `elevation.png`, `slope.png` | Dos capas reales 512² gris8 + alfa. Revisar integración; no reemplazar el catálogo principal con sus otras capas mock |
| Javi | `web/public/data/terrain/site-terrain.json` y `site-terrain.csv` | Elevación/pendiente del píxel nativo de 80 m en 20 coordenadas de fixtures; no son scores ni sitios oficiales validados |
| Javi / Pablo | `config/terrain-processing.json` y `web/public/data/terrain/processing.json` | Observador 5 m, azimut 0,1° en sitios curados / 1° en celdas, alcance inicial 300 km, comprobación hasta 310 km |
| Todo el equipo | `web/public/data/terrain/delivery.json` y `provenance.json` | Archivos listos, hashes, fuentes y dependencias. Declaran **0 perfiles de horizonte calculados** y efemérides pendientes |
| Marta / Javi2 | `contracts/types.ts` (`PolarHeightmap`) y `contracts/heightmap.schema.json` | Propuesta aditiva de contrato, pendiente de revisión de los consumidores |
| Todo el equipo | `web/src/streetview/` | Componente React/Cesium, geometría local, controles, reloj/selección del store y pruebas |
| Pablo / Javi | `python/terrain/`, `scripts/terrain_data.py`, `config/terrain-sources.json`, `requirements-terrain.txt` | Adquisición y exportación reproducibles; los GeoTIFF originales van a `data/terrain/`, fuera de Git |

Los nombres abreviados de la primera fila están todos en
`web/public/data/terrain/`. La guía de lectura, UV, orientación, NoData y marco:
[terrain-handoff.md](terrain-handoff.md). No sumar 5 m al heightmap: ese valor
corresponde al observador. Omitir triángulos con vértices inválidos.

## Ejecutar Street View con la cuenta de Pablo

La aplicación pide los tiles con un token de aplicación de la cuenta de Pablo.
Los compañeros no necesitan una cuenta propia de Cesium ni entrar al dashboard.
El token debe llegarles por un canal privado del equipo; no se incluye su valor
en Git, commits, PRs, documentación ni archivos de prueba.

Con Node 22 y pnpm 9.15.9, desde la raíz:

```powershell
git switch pabloizgui/46-lunar-streetview
pnpm install --frozen-lockfile
if (-not (Test-Path web/.env.local)) { Copy-Item web/.env.example web/.env.local }
# Editar web/.env.local: VITE_CESIUM_ION_TOKEN=<token de aplicación facilitado por Pablo>
pnpm dev
```

El archivo local se crea **solo si no existe**; no sobrescribir una configuración
propia. En macOS/Linux puede usarse `cp -n web/.env.example web/.env.local`.
Abrir `http://127.0.0.1:5173/streetview/de_gerlache_rim_01`.
Vite queda fijado a 5173 y falla si el puerto está ocupado, en lugar de pasar a
un puerto que el token no permite. Reiniciar Vite tras cambiar `.env.local`.

En el ordenador de Pablo el archivo ya está configurado. El panel de acceso de
desarrollo sigue disponible para un token temporal. `VITE_CESIUM_ION_TOKEN`
también se puede configurar como variable del entorno de compilación: Vite lo
incorpora en el JavaScript del navegador. Solo admite un token **público** de
lectura; nunca permisos de administración, escritura o gestión de tokens.

Configuración confirmada por Pablo: `assets:read`, solo Cesium Moon (`2684829`),
URLs `http://localhost:5173` y `http://127.0.0.1:5173`. Prueba real del endpoint:
origen local HTTP 200; origen externo HTTP 403. La API de metadatos del token
respondió 404, por lo que sus permisos concretos están confirmados por el dueño,
no certificados mediante una introspección de la API.

Para producción, Javi2 configura la variable durante el build y Pablo prepara
otro token limitado al dominio elegido. No se deben ampliar las URLs a cualquier
origen. Todos los clientes consumen las cuotas de la cuenta propietaria; en
Community la página de precios publica 15 GB/mes de streaming.
[Tokens Cesium](https://cesium.com/learn/ion/cesium-ion-access-tokens/),
[cuotas](https://cesium.com/platform/cesium-ion/pricing/).

## Qué necesita Pablo del resto

| De quién | Entrega o decisión pendiente | Qué desbloquea |
|---|---|---|
| Javi | `@/ephem`, `ephem/index.json` y vectores anuales 2026–2055; Sol unitario XYZ, Tierra XYZ en km desde el centro lunar | Cielo en coordenadas arbitrarias, con paralaje terrestre; hoy solo se usan series del mismo sitio y ventana |
| Javi | Confirmar realización MOON_ME y transformación DE421/DE440; contrato final de horizonte y política de cobertura incompleta | Combinar DEM/horizonte con efemérides reales sin cambiar etiquetas de marco |
| Equipo responsable de #48 | Catálogo curado con IDs/coordenadas definitivas y orden de prioridad | Pasar del primer benchmark técnico al lote de horizontes; las 20 coordenadas actuales son fixtures |
| Marta | Revisión de `PolarHeightmap`, registro en vértices, máscara y lectura Float32; integración de su malla | Uso del heightmap en Explore; no bloquea la cámara Cesium |
| Javi2 | Revisión del contrato/loader de capas y dominio de despliegue; variable de build de Cesium | Publicación y prueba del visor desde una URL del equipo |
| Cristóbal | Escenarios y selección de sitios según catálogo/contratos de Javi | Comprobación del paso Mission → sitio/tiempo → Street View; no requiere otro motor ni otro reloj |

Ya está integrado de Javi: `missionConfig`, selector Design/Mission y modelo de
llegada (#66). El módulo de vectores reales y el contrato v1.1 completo todavía
no están en `dev`. No usar el modelo de llegada como sustituto de efemérides.

## Próximo bloque de Pablo

1. Corregir y comprobar el giro 360°: una prueba previa produjo una vista gris
   tras girar 90°. Revisar altura, orientación, clipping y carga de tiles antes
   de dar la cámara por cerrada.
2. Mejorar la legibilidad del Street View sin rediseñar el shell: visor como
   contenido principal, controles claros, azimut/elevación comprensibles,
   estados de carga/error y separación de información didáctica/técnica.
3. Medir un horizonte técnico con los DEM ya descargados. Validar curvatura,
   norte local, solapes, paso radial, cobertura y convergencia 300/310 km.
4. Procesar el catálogo acordado y conectar `@/ephem` cuando llegue. Mostrar
   «no terrain» si el punto no tiene un perfil válido; no rellenar huecos con 0°.
5. Calibración Cesium/LOLA, ubicación libre y enlaces/QR reproducibles.

Pablo puede avanzar en cámara, legibilidad y benchmark sin esperar a los vectores
de Javi. El mapa de calor completo y PSR no bloquean esta entrega.

## Estado de revisión y publicación

El push se prepara contra `dev`; no se publica a `main` ni se da por mergeado.
El detalle de pruebas y cualquier puerta bloqueada se registra con el commit
candidato. Los datos científicos incompletos permanecen marcados como pendientes.
Resultados y límite del flujo automático: [push-validation.md](push-validation.md).
Una revisión automática rechazó crear una excepción persistente al escáner para
un JWT real; se retiró la inclusión del valor en el repositorio y se usa el
archivo local/variable de build. No se desactivó ni modificó el escáner.

## Street View y horizontes de prueba — Pablo, 2026-11-14

El nuevo bloque de trabajo está descrito en [streetview-navigation-v1.md](streetview-navigation-v1.md).
La entrega de Marta sigue en `web/public/data/terrain/heightmap.json`, `heights.f32`,
`valid.u8` y `layers.json`; su verificador mantiene 823 469 muestras válidas.
No necesita descargar el nuevo DEM global para integrar esos archivos.

Javi recibe `web/public/data/terrain/trials/shackleton_fixture_01deg_refined4.json`,
el CSV equivalente y `benchmark.json`. Son **experimentos**, no perfiles de
producción: todavía no se copian a `horizon/` ni alteran métricas de misión.
Los pilotos globales a 1° demuestran lectura del DEM grueso en ecuador/norte.

El Street View admite giro/zoom táctil, movimiento cercano con transición,
coordenadas globales, luz de lectura y nombres IAU/USGS. Las coordenadas libres
son locales al módulo mientras llega `selectedPoint`. Se invalida el cielo al
moverse; no se reaprovechan las efemérides de Shackleton en otro punto.

Pendiente del equipo: Javi, catálogo #48, vectores/`@/ephem` y validación de
horizonte/frame; Javi2, `selectedPoint`, dominio/token de despliegue y revisión
core/contratos; Marta, loader heightmap y acuerdo de resolución de rejilla;
Cristóbal, escenarios enlazados por sitio/fecha de core. Pendiente de Pablo:
validación angular/catálogo, DEM fino norte si aplica, calibración Cesium/LOLA,
QR y QA en dispositivo físico. El token actual limitado a localhost no permite
abrir directamente el visor desde la dirección LAN del ordenador en un móvil.
