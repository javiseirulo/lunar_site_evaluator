# Verificación de la entrega unificada

2026-11-14 · base `origin/dev` en `e6825cd` · rama #46.

## Comprobaciones nativas ejecutadas

| Comprobación | Resultado |
|---|---|
| `python -m unittest discover -s tests -v` con el entorno de terreno | 24 pruebas correctas |
| Desde `web/`: `node node_modules/vitest/vitest.mjs run` | 37 pruebas correctas, incluidos los tests de Javi tras #66 |
| TypeScript `tsc --noEmit` | Correcto |
| ESLint de `web/` | Correcto |
| Vite build de `web/` | Correcto; Cesium diferido conserva aviso de tamaño (~5 MB minificados) |
| `node scripts/check-terrain-delivery.mjs` | Binario/máscara, hashes, proyección, cobertura polar y PNG correctos |
| Formato de los archivos de código modificados y `git diff --check` | Correctos |
| Prettier sobre todo el árbol preparado, exportado con EOL de Linux como en CI | Correcto |
| Endpoint Cesium Moon con token de Pablo | Local 200; origen externo 403; valor no impreso ni incluido en Git |

El build local incorpora el token desde `web/.env.local`; los artefactos de
`web/dist/` y ese archivo están ignorados. La prueba del token es una solicitud
real de lectura, no una certificación independiente de todos sus permisos:
las restricciones completas están confirmadas por Pablo.
Se ha comprobado que el token aparece en el build local y está ausente de todos
los archivos preparados para Git. El archivo de ejemplo contiene un valor vacío.

Los tests son de contratos/geometría/lógica y exportación. No dan por validada
la navegación WebGL 360°, el rendimiento en móviles o la precisión científica
de horizontes que todavía no se han calculado.

## Puerta automática gstack

La ruta `gstack-ship-preflight --tests-only --base dev` se detiene en el paso 5:
el runner local devuelve **exit 127** y señala **14 rutas sin mapeo de test**
bajo su política automática. Las pruebas completas nativas anteriores sí se
han ejecutado. No se afirma que el flujo ship ni su revisión formal estén verdes;
los pasos posteriores de publicación no se ejecutan automáticamente.

El primer intento señaló un JWT real y una clave React como credenciales.
Se retiró el valor del repositorio y se mantuvo únicamente en el entorno local.
La identidad React se expresa mediante `instanceId`, conservando exactamente
la combinación sitio/revisión; no contiene un secreto. El siguiente preflight
ya no señala credenciales. No existe una excepción ni un cambio al escáner.

La revisión automática rechazó crear una excepción persistente para el JWT
porque incrustarlo no autorizaba cambiar ese control. Se aplicó su alternativa
de configuración local/entorno. No se ha publicado el token.

## Antes de publicar o integrar

- Publicar como borrador solo con decisión explícita sobre el flujo automático
  pendiente, o reparar su runner/mapeo y repetirlo.
- Ejecutar CI remoto sobre el commit publicado.
- Revisar con Marta/Javi/Javi2 el contrato de terreno y los límites científicos.
- Mantener pendiente la cámara 360° y la mejora visual, sin presentar el v0
  como resultado científico ni como escena validada en todas las orientaciones.
