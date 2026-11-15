# Mission — secuencia cinemática y cierre del modo South Pole (#100)

- Idea y flujo: **@Manuelcgg165** (2026-11-15). La IA estructura y construye; decisiones técnicas marcadas **[IA]**.
- Decidido con Manuel: usar el **globo de Marta** con un modo cinemático opcional dentro de `web/src/globe/` (Marta revisa),
  integrar el **Street View de Pablo** (Cesium Moon, token público de lectura en `web/.env.local`, nunca en git; Pablo revisa),
  PR #90 ya mergeado; esto va en un PR nuevo.

## Secuencia de una partida (South Pole)
1. **Menú** (igual que ahora).
2. **Intro en la nave:** Dr. Regolith dentro de la nave explica por qué vamos al polo sur (hielo de agua en cráteres en sombra
   permanente, bordes con mucha luz, la Tierra baja en el horizonte). De fondo, **la Luna girando** (globo de Marta).
3. **Emergencia:** alarma y una **escena animada del tipo de fallo**:
   - propulsión → motor que falla con llamas entrecortadas y chispas;
   - tormenta solar → el Sol soltando llamaradas;
   - ordenador de guiado → pantallas con chispas y estática;
   - fuga de combustible → válvula que pierde vapor;
   - comunicaciones → antena doblada y señal que se rompe.
4. **Briefing:** vuelve el doctor **muy alterado**, dice qué ha pasado y qué hay que hacer.
5. **Aproximación:** el globo vuela al **polo sur** y aparecen los 4 sitios como puntos **anónimos y numerados** (sin nombre).
6. **Cartas:** aparecen las 4 cartas (como ahora). La cuenta atrás corre desde aquí.
7. **Descenso:** picado al sitio elegido con una **transición exponencial suave** (rápido al principio, se frena al final).
8. **Reconocimiento (Street View):** el jugador ve el sitio "en persona" y **puede girar la vista** para ver si la Tierra o el Sol
   quedarían tapados por una montaña. Dos botones: **"Simulate"** o **"Choose another site"** (vuelve a las cartas).
   - **[IA]** La cuenta atrás sigue corriendo en el reconocimiento (la presión es parte del juego), pero se **pausa durante la
     animación del descenso**. Si se agota durante el reconocimiento → OUT OF TIME.
   - **[IA]** Sin token de Cesium o si falla la carga, se muestra un **panorama de respaldo** (la ventana de la cabina con el cielo
     real de esa hora, arrastrable 360°) y un aviso discreto. El nombre del sitio y los nombres de accidentes cercanos siguen
     ocultos hasta el veredicto.
9. **Simulación:** la cabina actual, con la **barra de avance temporal dentro del cuadro de la superficie lunar**. El resto igual.
10. **Veredicto:** igual, más **coaching** cuando ganas con 1 o 2 estrellas: qué te faltó para 3 y qué habría pasado si la misión
    hubiera durado más ("You made it — but on day 10 the night would have passed 100 h").
    - **[IA]** "Si hubiera durado más" = simular la misma ventana extendida (hasta 14 días o el final de los datos) y contar el
      primer fallo; "qué te faltó" = los criterios con menor utilidad (sunlight, Earth link, noche, blackout) frente a su objetivo.
    - **[IA]** Al terminar, la cámara del globo se aleja y **ahora sí** se revela el nombre del sitio.

## Reparto técnico [IA]
- `web/src/globe/`: prop opcional de modo cinemático en `GlobeView` (cámara guiada por el juego, sin tarjetas, sin etiquetas, sin
  interacción, marcadores anónimos), reutilizando el vuelo existente (`streetViewFlight.ts`). Explore no cambia.
- `web/src/streetview/`: un export embebible (sitio, hora, sin etiquetas de nombres, sin enlaces para compartir) reutilizando
  `LunarViewport`. La página Street View no cambia.
- `web/src/game/`: nuevas fases `briefing`, `approach`, `descent`, `recon`; escenas de emergencia; coaching.
- Si algo de Marta o Pablo cambia, la integración queda detrás de dos envoltorios en `web/src/game/ui/` (`GameGlobe`,
  `SiteRecon`) para adaptarla en un único sitio.

## Estado 2026-11-15 (mediodía) — rama `Manuelcgg165/100-mission-cinematic`
- Hecho y probado en el navegador: intro dentro de la cabina (Luna girando en la ventana), **escenas animadas de emergencia**
  (`EmergencyScene.tsx` + `emergencyFx.ts`: la imagen de cada emergencia con efectos CSS anclados al punto que falla: llama
  entrecortada y chispas del motor, Sol con llamaradas, estática en las tres pantallas, vapor de la válvula, anillos de señal
  rotos y "NO SIGNAL"), **briefing con el doctor alterado** (retrato temblando, texto rápido; al acabar o con "Skip" se
  traza la aproximación en cuanto el reparto está listo), coaching, barra de tiempo y reconocimiento con Street View
  (rama `100-mission-recon` integrada). 378 tests en verde.
- **[IA]** Con reduced motion las escenas quedan quietas (sin partículas).
- **Pendiente (Pablo):** Cesium Ion responde **401** a `assets/2684829/endpoint` con el token de `web/.env.local` (antes daba 200
  en `localhost:5173`). 401 = token inválido o sin acceso a ese asset, no un problema de origen (eso sería 403). Hasta que se
  renueve, el reconocimiento usa el panorama de respaldo. `SiteRecon` ahora deja en consola el motivo
  (`[recon] 3D Street View unavailable (<motivo>)`).
- Pendiente aparte: el token para la web pública (Vercel) restringido a esa URL.
