# Pablo: progreso y pendientes

Actualizado: 2026-11-14. Contexto vigente: `docs/10-plan-tecnico.md`, §5 y §9;
`origin/dev` en `bd0880d` integrado conservando los commits locales; decisiones
de Javi J0/J10 de `461507a`. Prioridad: desbloquear a Marta y
entregar los datos que necesitan los demás módulos antes de continuar el visor.

| Prioridad | Tarea | Estado / criterio de cierre |
|---|---|---|
| P0 | Adquirir DEM LOLA 5 m de 87–90°S | Hecho localmente: 3 465 285 714 bytes, SHA-256, metadatos y tres ventanas decodificadas; no validación de todos los píxeles |
| P0 | Exportar recortes científicos | Hecho: herramientas, primer recorte y entrega polar; 24 pruebas Python y verificación JS del producto tras el ajuste J0 |
| P1 | Heightmap polar para Marta hasta −80° | Hecho en rama #37: 1025×1025 Float32 LE + máscara + manifest sobre `layers.json`; producto real PGDA 90 de 80 m |
| P1 | Altitud y pendiente para Marta/Javi2 | Hecho: dos capas 512² gray8 + alfa y GeoTIFF; pendiente del LDSM publicado, no del heightmap reducido; integración pendiente |
| P1 | Datos de terreno de los sitios para Javi | Hecho: CSV/JSON, 20/20 coordenadas cubiertas, píxel nativo 80 m; coordenadas aún del fixture, no métricas de aterrizaje finales |
| P2 | Horizonte científico para Javi / Street View | Configurado según J0: 5 m, 0,1° curados / 1° celdas, alcance inicial 300 km y validación hasta 310 km; DEM lejano 240 m hasta −60°S. Pendientes benchmark, catálogo #48 y cálculo: 0 perfiles listos |
| P2 | Revisión e integración de contrato heightmap | Pendiente: propuesta aditiva por PR a `dev`, revisión Marta/Javi2; no editar su loader sin coordinar |
| P2 | Cámara Street View en todas las orientaciones | Rama #46 actualizada con dev y commit `24e3250`: valor inicial 5 m desde la configuración común, 26 tests web. Giro de 90° produjo vista gris en prueba previa: investigar antes de cerrar |
| P2 | Sol/Tierra reales y fecha compartida | Consumir `@/ephem` de Javi: vectores anuales 2026–2055, paralaje terrestre exacta; confirmar DE421/DE440. Módulo/datos todavía no disponibles en dev; series actuales mock |
| P3 | Calibrar altura Cesium frente al DEM | Pendiente: varios puntos, mismo frame y datum; no aplicar un offset supuesto |
| P3 | Ubicación libre y enlaces/QR didácticos | Pendiente tras cerrar datos y navegación; mantener estado compartido y ruta reproducible |
| P3 | `grid_metrics.bin`, PSR y productos adicionales | Después de acordar semántica con Javi; no inventar datos ni ampliar contratos innecesariamente |

## Decisiones de esta entrega

- Separar el trabajo de datos en `pabloizgui/37-terrain-handoff` desde `dev`.
  El trabajo del visor se conserva en su rama; no se ha publicado ni eliminado.
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

Siguiente orden: (1) revisar/integrar contrato y entrega con Marta/Javi2 por PR,
(2) calcular/validar horizontes para Javi, (3) corregir y comprobar cámara 360°,
(4) alinear marcos/alturas y conectar efemérides reales. No hay push ni PR nuevos.
