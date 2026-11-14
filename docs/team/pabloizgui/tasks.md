# Pablo: progreso y pendientes

Actualizado: 2026-11-14. Contexto vigente: `docs/10-plan-tecnico.md`, §5 y §9;
`origin/dev` en `e6825cd` integrado conservando los commits locales; decisiones
de Javi J0/J10 de `461507a`. Prioridad: desbloquear a Marta y
entregar los datos que necesitan los demás módulos antes de continuar el visor.

Entrega unificada en `pabloizgui/46-lunar-streetview`: incluye el terreno de #37
y el visor. Índice por destinatario, puesta en marcha con la cuenta de Pablo y
dependencias concretas: [team-handoff.md](team-handoff.md). El push se está
preparando como PR borrador por autorización expresa de Pablo; no se considera
integrado en `dev` hasta revisión y merge.

| Prioridad | Tarea | Estado / criterio de cierre |
|---|---|---|
| P0 | Entrega unificada y revisión | Publicación manual como PR borrador autorizada por Pablo con pruebas nativas (24 Python / 37 web). Pendientes CI remoto y revisión del contrato; gate gstack (exit 127 y mapeo) documentado, sin merge automático |
| P0 | Adquirir DEM LOLA 5 m de 87–90°S | Hecho localmente: 3 465 285 714 bytes, SHA-256, metadatos y tres ventanas decodificadas; no validación de todos los píxeles |
| P0 | Exportar recortes científicos | Hecho: herramientas, primer recorte y entrega polar; 24 pruebas Python y verificación JS del producto tras el ajuste J0 |
| P1 | Heightmap polar para Marta hasta −80° | Hecho en rama #37: 1025×1025 Float32 LE + máscara + manifest sobre `layers.json`; producto real PGDA 90 de 80 m |
| P1 | Altitud y pendiente para Marta/Javi2 | Hecho: dos capas 512² gray8 + alfa y GeoTIFF; pendiente del LDSM publicado, no del heightmap reducido; integración pendiente |
| P1 | Datos de terreno de los sitios para Javi | Hecho: CSV/JSON, 20/20 coordenadas cubiertas, píxel nativo 80 m; coordenadas aún del fixture, no métricas de aterrizaje finales |
| P2 | Horizonte científico para Javi / Street View | Configurado según J0: 5 m, 0,1° curados / 1° celdas, alcance inicial 300 km y validación hasta 310 km; DEM lejano 240 m hasta −60°S. Pendientes benchmark, catálogo #48 y cálculo: 0 perfiles listos |
| P2 | Revisión e integración de contrato heightmap | Pendiente: propuesta aditiva por PR a `dev`, revisión Marta/Javi2; no editar su loader sin coordinar |
| P1 | Cámara Street View en todas las orientaciones | Valor inicial 5 m desde configuración común. Giro de 90° produjo vista gris en prueba previa: revisar altura, orientación, clipping y tiles antes de cerrar |
| P1 | Street View más amigable | Siguiente bloque: visor como protagonista, controles claros, legibilidad, carga/error y distinción didáctica/técnica; no rediseñar el shell ni ocultar el carácter mock del cielo |
| P2 | Sol/Tierra reales y fecha compartida | Consumir `@/ephem` de Javi: vectores anuales 2026–2055, paralaje terrestre exacta; confirmar DE421/DE440. Módulo/datos todavía no disponibles en dev; series actuales mock |
| P3 | Calibrar altura Cesium frente al DEM | Pendiente: varios puntos, mismo frame y datum; no aplicar un offset supuesto |
| P3 | Ubicación libre y enlaces/QR didácticos | Pendiente tras cerrar datos y navegación; mantener estado compartido y ruta reproducible |
| P3 | `grid_metrics.bin`, PSR y productos adicionales | Después de acordar semántica con Javi; no inventar datos ni ampliar contratos innecesariamente |

## Decisiones de esta entrega

- #37 y #46 se reúnen para compartir un único checkout funcional; se mantienen
  los commits y la rama histórica de datos. El selector Design/Mission y
  `missionConfig` de Javi (#66) ya están integrados.
- Cuenta Cesium de Pablo mediante token público de lectura en `.env.local` o
  variable de build. El endpoint Moon responde 200 en local y 403 para un
  origen externo. No se publica el token ni se modifica el escáner de secretos.

- El trabajo de datos se inició en `pabloizgui/37-terrain-handoff`; ahora está
  integrado junto al visor en #46. Se conservan ambas ramas y sus commits.
- Usar `LDEM_80S_80MPP_ADJ.TIF` para el heightmap general de Marta. El DEM
  de 5 m se reserva para detalle local y cálculos que requieran esa resolución.
- Misma proyección, radio y límites que `layers.json`. La rejilla de malla tiene
  1025 vértices por eje: extremos incluidos, 1024 intervalos; manifest explícito
  para evitar un desplazamiento de medio píxel frente a las texturas.
- Descargar también `LDSM_80S_80MPP_ADJ.TIF` para entregar la pendiente del
  productor con su escala de 80 m; no calcular pendientes científicas sobre la
  malla visual de unos 594 m de separación.
- Datos brutos y productos grandes en `data/` ignorado por Git. Publicar código,
  contrato propuesto y documentación; el paquete entregable se genera aparte.
- Fuente oficial: <https://pgda.gsfc.nasa.gov/products/90>, Barker et al. (2023),
  DOI <https://doi.org/10.3847/PSJ/acf3e1>.

Implementación asistida por OpenAI Codex a partir de las tareas e ideas humanas
del equipo. Este documento no acredita integración ni validación científica final.

## Resultado de la entrega

Productos en `web/public/data/terrain/`; guía: [terrain-handoff.md](terrain-handoff.md).
Paquete original conservado: `data/exports/lunar-terrain-marta-v1.zip`.
Entrega actualizada: `data/exports/lunar-terrain-team-v2.zip`, con configuración
y estados de cobertura/horizonte/efemérides. Ver [ajuste a Javi](javi-context-sync.md).
1 050 625 muestras, 823 469 válidas; las esquinas/bordes del cuadrado fuera de
la cobertura circular quedan enmascarados. Rango de la malla remuestreada:
−6665,05 a 7005,42 m. Paso: 593,76171875 m; no equivale a la resolución fuente.

Siguiente orden: (1) cerrar revisión y publicación de la entrega,
(2) corregir cámara 360° y mejorar la vista, (3) benchmark/horizontes para Javi,
(4) integrar el catálogo final, alinear marcos y conectar efemérides reales.
Pablo puede avanzar en cámara/UX y benchmark sin esperar los vectores.

## Sincronización posterior con dev — 2026-11-14

Pull de `origin/dev` en `0e00fc3`: incorpora #68 (alcance global, #67) y #71
(globo v0 de Marta). Se conserva la entrega local del PR borrador #72; no se
publica ni se mergea ese PR por esta sincronización. Conflictos documentales
resueltos preservando ambas aportaciones y los estados reales de Marta/Pablo.

Información útil y dependencias:

- Toda la Luna seleccionable: Cesium sigue siendo global. El horizonte real,
  pendiente y PSR tienen cobertura propia; fuera de ella se muestra «no terrain»
  o «pending terrain». Javi amplía catálogo y evaluación, no hay que inventar
  métricas para completar coordenadas.
- PR #70, aún abierto, propone contrato v1.1 aditivo. `HorizonProfile` conserva
  los campos previstos en nuestra configuración (5 m; 0,1° para curados).
  Leer su schema como propuesta; no incorporarlo unilateralmente. Añade
  `pending_metrics`, `sun_frac`, `horizon_source` e índices binarios.
- Marta tiene globo, pins y coordenadas en dev. Sus pins propios siguen siendo
  estado local de `src/globe`; `selectedPoint` aún no existe en core. La conexión
  de un punto libre con Street View requiere ese acuerdo con Javi2.
- Siguen ausentes en dev `@/ephem`, los vectores anuales, perfiles calculados
  y `catalog-for-pablo.md`. El plan de implementación de Javi describe entregas
  futuras, no archivos ya consumibles.
- Nueva petición de Marta: teselas a 1 km, luego 200 m, con 72 azimuts (paso 5°),
  más resumen mensual por celda. Difiere de J0/J10 y nuestra configuración de
  1° para celdas de 5 km. Mantener los 0,1° de sitios curados separados y acordar
  coste/formato/resolución de rejilla antes del lote; hacer primero el benchmark.
- Explore v1 de Marta cambia a requisitos duros y orden sin pesos (#73), mientras
  §10 de Javi mantiene score ponderado. Ambos documentos reconocen el acuerdo
  pendiente; no cambiar por nuestra cuenta contratos ni la lógica de score.
- PR #72 sin comentarios, reviews ni comentarios inline al consultar. No hay
  comprobaciones CI reportadas sobre su head remoto; no afirmar aprobación.

Verificación de la integración local: 53 tests web y TypeScript correctos.
El primer intento de Vitest sufrió EBUSY en el watcher de Cesium bajo OneDrive;
el reintento con `CHOKIDAR_USEPOLLING=1` pasó. No se ha probado el giro WebGL 360°.
Siguiente bloque recomendado: cámara/legibilidad y benchmark de un horizonte;
después conectar el contrato y vectores cuando entren en dev. La nueva rejilla
y el polo norte amplían el alcance, no son entregables ya implementados.
