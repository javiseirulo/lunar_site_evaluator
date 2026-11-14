# 08 — Plan de trabajo para 5 personas (propuesta, 2026-11-14)

> Propuesta para que el equipo la acepte o ajuste. Quién es P1…P5 lo decide el equipo (asignar el issue en GitHub y anotarlo en
> `docs/00-protocol.md`, tabla de roles). Cada persona usa su propia IA con gstack y trabaja por issue → rama → PR.
> Entrega: **dom 15 nov 23:59 (hora local del Local Event)**. Idea y alcance: `docs/ideas/javiseirulo-explore-mission.md`, `docs/07-mvp-plan.md`.

## Principio que desbloquea el paralelismo
**Contrato de datos primero (#9) + fixtures con datos de mentira.** P3, P4 y P5 construyen contra los fixtures desde el minuto 1;
cuando P1 y P2 terminen los datos reales, se sustituyen sin tocar la UI. Sin esto, 4 personas esperan a 1.

## Roles
| Rol | Enfoque | Perfil ideal | Issues |
|---|---|---|---|
| **P1 · Datos y ciencia** | Pipeline de precompute: LOLA, efemérides con libración, horizonte con terreno + limbo, métricas, validación con Horizons | Python/ciencia de datos, geometría | #10 #11 #12 #13 |
| **P2 · Servicio, sitios y despliegue** | Contrato y fixtures, lista curada de sitios, filtrado/top 5/comparación/coordenadas propias, hosting público | Backend/datos, DevOps ligero | #9 (con P1) #14 #15 #16 |
| **P3 · Frontend Explore** | App, estilo visual, mapa/globo, filtros y barra temporal en vivo, top 5, comparación lado a lado, avanzado | Frontend, visualización | #17 #18 #19 |
| **P4 · Visualización de sitio** | Ficha de sitio con métricas y cuenta atrás Sunset/Earthset, horizonte 360° Sol/Tierra con animación (3D stretch) | Frontend/visual, gráficos | #20 #21 (#22 stretch) |
| **P5 · Mission y entrega** | Motor de misión + modo profesional/estudiante, diapositivas, formulario en inglés, References, declaración SI, coordinación de QA | Producto/lógica, comunicación | #23 #24 #25 #26 (#27 stretch) |

Si el equipo tiene menos de 5 perfiles técnicos: P5 delega el motor de misión a P4 cuando P4 acabe y deja la entrega en una sola persona.
Explore va primero; **Mission no se empieza hasta que Explore funcione con fixtures** (decisión del equipo).

## Fases
| Fase | Cuándo | Qué | Salida |
|---|---|---|---|
| 0 · Contrato | ahora (primeras horas) | #9 aprobado por un miembro de cada rol; fixtures publicados | `docs/09-data-contract.md` + `fixtures/` |
| 1 · Construcción paralela | esta noche / sáb | Cada rol con su issue contra fixtures. P1 produce datos reales de un sitio de prueba lo antes posible (aunque sea una sola rejilla pequeña) | Módulos que funcionan solos |
| 2 · Integración | sáb noche – dom mañana | Sustituir fixtures por datos reales; cerrar flujo filtrar → ficha → comparar → misión | Flujo de punta a punta |
| 3 · Congelar y entregar | dom tarde | #26 QA, #25 diapositivas finales, enlaces públicos probados. **Congelar funcionalidades** | Entrega enviada con margen |
Hito intermedio recomendado: **primer envío el sábado por la noche** (se puede reenviar; cuenta la última versión).
Si el cálculo real no llega, el plan B es una rejilla más gruesa o menos fechas, anotado en `decisions/log.md`: mejor poco y válido que mucho y dudoso.

## Dependencias
```
#9 contrato ─┬─> P1 #10 #11 ─> #12 ─> #13 validación
             ├─> P2 #14 #15 #16
             ├─> P3 #17 ─> #18 ─> #19
             ├─> P4 #20 ─> #21 (─> #22 stretch)
             └─> P5 #25 (desde ya) ; #23 ─> #24 (tras Explore) ; #26 al final
datos reales de P1 ──> P2 #15 ──> P3/P4/P5
```

## Reglas de integración
- Un PR por issue, pequeño y frecuente; `main` solo se actualiza por PR revisado (hook de pre-push lo bloquea).
- Nadie cambia el contrato por su cuenta: proponer en el issue #9 y avisar; cambia `docs/09-data-contract.md` y los fixtures en el mismo PR.
- Cada PR anota su uso de IA (`si-usage-log.md`) y sus recursos externos (`04-resources-data.md`).
- Cálculos científicos: comparación con Horizons descrita en el PR.
- Todo dato mostrado lleva fuente o versión; nada inventado en el producto (los fixtures llevan `"mock": true`).

## Riesgos del plan
1. **El cálculo de horizonte por celda puede tardar mucho** → empezar con una rejilla pequeña y subir resolución; decisión de resolución en #9.
2. **P1 es cuello de botella científico** → P2 le ayuda con ingesta (#10) y validación (#13) si va justo.
3. **Cinco personas, un repo** → ramas pequeñas, un directorio por rol (`pipeline/`, `serving/`, `web/`, etc.) para evitar conflictos de merge.
4. **Entrega sin dueño** → #25 es de P5 desde el principio, no "al final".
