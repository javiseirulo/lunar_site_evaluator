# Validación de efemérides: pipeline frente a JPL Horizons

> Generado por `python/ephem/horizons_check.py` (`uv run python -m ephem.horizons_check`).
> No editar a mano: se regenera con el script.

**Resultado: CUMPLE el objetivo |Δ| < 0.01°.** Diferencia máxima en cualquier sitio, época, cuerpo y ángulo: **6.8e-04°** con los vectores SPICE y **6.8e-04°** con el `.bin` float32 + interpolación que usa la web (≈ 15 veces por debajo del objetivo).

## Método

- **Referencia:** API de JPL Horizons (`https://ssd.jpl.nasa.gov/api/horizons.api`), consultada el 2026-11-14T18:25:42Z: una petición por sitio y cuerpo (7 × 2 = 14 peticiones secuenciales, con pausa).
  - `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='<lon E>,<lat>,0'` (altitud 0 km), `QUANTITIES='4'` (az/el aparentes), `APPARENT='AIRLESS'`, `ANG_FORMAT='DEG'`, `CSV_FORMAT='YES'`, `EXTRA_PREC='YES'`, `TIME_TYPE='UT'` y un `TLIST` con las mismas 6 épocas UTC para todos los sitios (2026-03-20T06:30:00Z, 2031-08-11T17:45:00Z, 2037-01-05T03:15:00Z, 2042-06-21T12:00:00Z, 2048-10-30T21:20:00Z, 2055-12-31T22:40:00Z). Casi todas caen entre dos muestras horarias, para probar también la interpolación.
  - Cuerpos: Sol (`10`) y Tierra (`399`). Az/el *aparentes*: corregidos de tiempo de luz, deflexión gravitatoria y aberración estelar; sin refracción. Azimut desde el norte, sentido horario; elevación sobre el plano normal al cénit local.
  - Respuestas guardadas en `python/ephem/horizons_reference.json`; los tests y `contracts/fixtures/golden-azel.json` las usan sin red.
- **Cómo define Horizons el marco lunar de los sitios de superficie.** El manual (<https://ssd.jpl.nasa.gov/horizons/manual.html>, apartados *User-Defined Topocentric Site Coordinates* y *Lunar Mean-Earth Frame of DE421*) dice que las coordenadas de un sitio en la Luna son planetodésicas en el sistema **Mean Earth / polar axis de DE421** (rotación fija del marco de ejes principales de DE440; el marco PA no está disponible en Horizons), con longitud **este positiva** (la Luna es una de las excepciones, junto con la Tierra y el Sol). La cabecera de cada respuesta lo confirma:
  - `Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}`
  - `Center radii    : 1737.4, 1737.4, 1737.4 km       {Equator_a, b, pole_c}`: esfera de 1737,4 km, la misma R que usamos.
  - Efeméride: `DE441`; refracción: `NO (AIRLESS)`.
  - `Center geodetic` devuelto (lon E, lat, alt km): shackleton_rim `0.0, -89.9, 3.85781E-13`; connecting_ridge `223.0, -89.45, 3.85804E-13`; malapert_massif `359.9, -85.99, 0.0`; mons_mouton `31.0, -84.3, 3.87284E-13`; plain_81s `120.0, -81.5, 0.0`; apollo_11 `23.47297, .67408, 0.0`; change_4 `177.5991, -45.4446, 5.45875E-13`.
  - Nuestro marco: `MOON_ME`, alias identidad de `MOON_ME_DE440_ME421` en `moon_de440_250416.tf` (DE440 PA rotado con los ángulos de Park et al. 2021 para quedar alineado con el ME de DE421, < 1 m de diferencia). Es el mismo sistema.
- **Nuestro cálculo**, con `elev_m = 0` y `h_obs_m = 0` (la altitud 0 de Horizons):
  - `spice`: `spkpos('SUN'|'EARTH', et, 'MOON_ME_DE440_ME421', 'LT+S', 'MOON')` en la época exacta (UTC → TDB con `naif0012.tls`) y `ephem.topo.azel`: Tierra con paralaje exacta `r_tierra − r_sitio`, Sol con el vector unitario.
  - `bin`: lo que hace la web. Vectores float32 de `web/public/data/ephem/<año>.bin`, interpolación lineal entre las dos horas que rodean la época (el Sol se renormaliza) y `azel`.
  - `azlcpo` (diagnóstico): az/el topocéntricos calculados por el propio SPICE (`azlcpo`, observador fijo en la superficie, tiempo de luz y aberración desde el sitio).
- Δ = nuestro − Horizons; Δaz reducido a [−180°, 180°).

## Diferencias máximas por sitio (grados)

### Vectores SPICE en la época exacta

| Sitio | lat | lon E | max \|Δaz\| Sol | max \|Δel\| Sol | max \|Δaz\| Tierra | max \|Δel\| Tierra |
|---|---:|---:|---:|---:|---:|---:|
| Shackleton rim | -89.9 | 0.0 | 1.4e-08 | 6.8e-04 | 7.6e-07 | 2.4e-05 |
| Connecting ridge | -89.45 | -137.0 | 2.1e-08 | 6.8e-04 | 7.4e-07 | 2.4e-05 |
| Malapert massif | -85.99 | -0.1 | 6.9e-08 | 6.7e-04 | 8.9e-07 | 2.5e-05 |
| Mons Mouton | -84.3 | 31.0 | 9.9e-08 | 6.8e-04 | 9.3e-07 | 2.5e-05 |
| Plain at 81S | -81.5 | 120.0 | 1.3e-07 | 6.7e-04 | 6.4e-07 | 2.4e-05 |
| Apollo 11 | 0.67408 | 23.47297 | 2.1e-07 | 6.0e-04 | 2.2e-06 | 1.0e-05 |
| Chang'e 4 | -45.4446 | 177.5991 | 8.1e-07 | 6.6e-04 | 1.3e-06 | 1.6e-05 |
| **Todos** | | | **8.1e-07** | **6.8e-04** | **2.2e-06** | **2.5e-05** |

Separación máxima en el cielo (círculo máximo): Sol 6.8e-04°, Tierra 2.5e-05°.

### `.bin` float32 + interpolación lineal (camino de la web)

| Sitio | lat | lon E | max \|Δaz\| Sol | max \|Δel\| Sol | max \|Δaz\| Tierra | max \|Δel\| Tierra |
|---|---:|---:|---:|---:|---:|---:|
| Shackleton rim | -89.9 | 0.0 | 1.4e-06 | 6.8e-04 | 6.6e-05 | 7.6e-05 |
| Connecting ridge | -89.45 | -137.0 | 1.3e-06 | 6.8e-04 | 6.6e-05 | 7.5e-05 |
| Malapert massif | -85.99 | -0.1 | 2.1e-06 | 6.8e-04 | 6.5e-05 | 7.6e-05 |
| Mons Mouton | -84.3 | 31.0 | 2.1e-06 | 6.8e-04 | 6.2e-05 | 7.9e-05 |
| Plain at 81S | -81.5 | 120.0 | 1.0e-06 | 6.8e-04 | 6.0e-05 | 8.3e-05 |
| Apollo 11 | 0.67408 | 23.47297 | 6.4e-05 | 6.0e-04 | 1.0e-04 | 8.4e-05 |
| Chang'e 4 | -45.4446 | 177.5991 | 6.9e-06 | 6.7e-04 | 1.1e-04 | 6.2e-05 |
| **Todos** | | | **6.4e-05** | **6.8e-04** | **1.1e-04** | **8.4e-05** |

Separación máxima en el cielo (círculo máximo): Sol 6.8e-04°, Tierra 1.0e-04°.

### Diagnóstico: `azlcpo` de SPICE (todo topocéntrico)

| Sitio | lat | lon E | max \|Δaz\| Sol | max \|Δel\| Sol | max \|Δaz\| Tierra | max \|Δel\| Tierra |
|---|---:|---:|---:|---:|---:|---:|
| Shackleton rim | -89.9 | 0.0 | 1.2e-08 | 8.9e-10 | 6.7e-07 | 6.0e-08 |
| Connecting ridge | -89.45 | -137.0 | 1.1e-08 | 1.1e-09 | 6.7e-07 | 5.6e-08 |
| Malapert massif | -85.99 | -0.1 | 1.2e-08 | 8.8e-10 | 6.7e-07 | 6.3e-08 |
| Mons Mouton | -84.3 | 31.0 | 1.1e-08 | 9.9e-10 | 6.8e-07 | 9.5e-08 |
| Plain at 81S | -81.5 | 120.0 | 1.2e-08 | 2.2e-09 | 6.6e-07 | 1.5e-07 |
| Apollo 11 | 0.67408 | 23.47297 | 1.7e-08 | 1.1e-08 | 5.8e-07 | 6.6e-07 |
| Chang'e 4 | -45.4446 | 177.5991 | 8.9e-09 | 8.0e-09 | 9.3e-07 | 1.0e-07 |
| **Todos** | | | **1.7e-08** | **1.1e-08** | **9.3e-07** | **6.6e-07** |

Separación máxima en el cielo (círculo máximo): Sol 1.2e-08°, Tierra 6.7e-07°.

## De dónde sale el residuo

| Fuente | Tamaño medido | Afecta a |
|---|---:|---|
| Paralaje solar no aplicada (el Sol se trata como dirección; cota R/1 ua = 6.7e-04°) | ≤ 6.8e-04° | Sol, sobre todo la elevación (es casi toda la diferencia máxima) |
| Aberración estelar aplicada al vector desde el **centro** lunar y luego paralaje (≈ (v/c)·R/d = 2.6e-05°) | 2.5e-05° | Tierra |
| Interpolación lineal horaria del `.bin` (todo 2027, a mitad de hora) | Tierra 1.3e-04° (0.85 km), Sol 1.5e-05° | camino `bin` |
| Almacenamiento float32 (todo 2027, en las horas exactas) | Tierra 6.9e-07°, Sol 2.3e-06° | camino `bin` |
| DE440 (nuestros kernels) frente a DE441 (Horizons) + precisión de impresión (1e-9°) | 9.3e-07° (`azlcpo`) | todo |

Elección de la corrección de aberración (centro + paralaje, máximo |Δ| frente a Horizons en cualquier sitio/época):

| `abcorr` | Sol az | Sol el | Tierra az | Tierra el |
|---|---:|---:|---:|---:|
| `NONE` | 7.4e-03 | 6.5e-03 | 2.9e-04 | 2.0e-04 |
| `LT` | 7.4e-03 | 6.5e-03 | 8.4e-03 | 5.5e-03 |
| `LT+S` | 8.1e-07 | 6.8e-04 | 2.2e-06 | 2.5e-05 |

`LT+S` (apariencia completa) es la única que coincide con Horizons; sin aberración (`NONE`, `LT`) el error sube a ~1e-3°–1e-2°. Por eso los `.bin` usan `LT+S`.

## Conclusión

- Las dos rutas del pipeline quedan muy por debajo del objetivo de 0.01° en los siete sitios (polo sur, cara visible y cara oculta) y en épocas repartidas entre 2026 y 2055. No hace falta corregir nada.
- Marco (`MOON_ME` alineado con DE421), corrección `LT+S`, escala de tiempo y signo de la longitud (este positiva) coinciden con Horizons. Tiempo: entrada en UTC en los dos lados; `naif0012.tls` no tiene saltos de segundo después de 2017 y Horizons usa el último conocido para el futuro. Un desfase de 1 s movería el Sol ~1,4e-4°, y `azlcpo` coincide con Horizons a ~1e-8° en el Sol, así que no lo hay.
- `azlcpo` (SPICE, todo topocéntrico) reproduce Horizons a ~1e-6°: la efeméride es la misma. Lo que queda en nuestra ruta son las dos simplificaciones elegidas (Sol sin paralaje y aberración desde el centro) más, en la web, la interpolación lineal horaria. Si algún día hiciera falta más precisión: guardar la distancia al Sol en el `.bin` o interpolar con Hermite cúbico.
- La precisión final de la app la dominan el DEM y el perfil de horizonte (decenas de metros ≈ 0,1° a 20–50 km), no la efeméride.
- En azimut, las diferencias se amplifican por 1/cos(el) cerca del cénit (p. ej. el Sol a ~86° en Apollo 11); por eso se da también la separación en el cielo.

## Detalle por época

Valores de Horizons y Δ = nuestro − Horizons de la ruta `.bin` (la de la web), en grados.

| Sitio | Época (UTC) | Sol az | Sol el | Tierra az | Tierra el | Δaz☉ | Δel☉ | Δaz⊕ | Δel⊕ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Shackleton rim | 2026-03-20T06:30:00Z | 160.278957 | -0.624128 | 356.177639 | 3.872560 | +1.8e-07 | +6.6e-04 | +4.4e-05 | -6.3e-05 |
| Shackleton rim | 2031-08-11T17:45:00Z | 256.051917 | 1.520510 | 5.240377 | -1.783760 | -1.4e-06 | +6.7e-04 | -3.1e-05 | +3.4e-05 |
| Shackleton rim | 2037-01-05T03:15:00Z | 319.998075 | -0.538275 | 1.561038 | 1.976988 | +6.3e-07 | +6.7e-04 | -2.2e-05 | -4.8e-06 |
| Shackleton rim | 2042-06-21T12:00:00Z | 139.561637 | -1.500985 | 5.164566 | 6.008253 | +9.1e-07 | +6.6e-04 | -3.2e-07 | -1.7e-05 |
| Shackleton rim | 2048-10-30T21:20:00Z | 253.827511 | 1.017852 | 354.376850 | -5.937920 | -5.0e-07 | +6.8e-04 | +6.6e-05 | +7.6e-05 |
| Shackleton rim | 2055-12-31T22:40:00Z | 19.149972 | -0.521870 | 355.825255 | -4.939038 | -1.7e-07 | +6.7e-04 | +4.7e-05 | +3.5e-05 |
| Connecting ridge | 2026-03-20T06:30:00Z | 297.282737 | -0.277896 | 133.205125 | 3.396196 | +2.3e-07 | +6.6e-04 | +4.4e-05 | -6.3e-05 |
| Connecting ridge | 2031-08-11T17:45:00Z | 33.063817 | 2.005573 | 142.229735 | -2.318052 | -1.3e-06 | +6.7e-04 | -3.1e-05 | +3.4e-05 |
| Connecting ridge | 2037-01-05T03:15:00Z | 96.991257 | -0.681852 | 138.573294 | 1.464598 | +5.9e-07 | +6.7e-04 | -2.2e-05 | -4.7e-06 |
| Connecting ridge | 2042-06-21T12:00:00Z | 276.576577 | -1.361945 | 142.198699 | 5.473947 | +9.1e-07 | +6.6e-04 | -3.0e-07 | -1.7e-05 |
| Connecting ridge | 2048-10-30T21:20:00Z | 30.835553 | 1.517973 | 131.332697 | -6.400614 | -4.5e-07 | +6.8e-04 | +6.6e-05 | +7.5e-05 |
| Connecting ridge | 2055-12-31T22:40:00Z | 156.146931 | -1.119365 | 132.789539 | -5.412328 | -1.7e-07 | +6.7e-04 | +4.7e-05 | +3.4e-05 |
| Malapert massif | 2026-03-20T06:30:00Z | 160.322342 | -4.306660 | 356.250449 | 7.776131 | +1.2e-07 | +6.6e-04 | +4.5e-05 | -6.2e-05 |
| Malapert massif | 2031-08-11T17:45:00Z | 256.082182 | 0.582174 | 5.342984 | 2.109305 | -2.1e-06 | +6.7e-04 | -3.1e-05 | +3.4e-05 |
| Malapert massif | 2037-01-05T03:15:00Z | 320.055920 | 2.460926 | 1.669403 | 5.886617 | +7.9e-07 | +6.7e-04 | -2.2e-05 | -4.9e-06 |
| Malapert massif | 2042-06-21T12:00:00Z | 139.529237 | -4.478997 | 5.316606 | 9.903982 | +9.6e-07 | +6.5e-04 | -4.4e-07 | -1.7e-05 |
| Malapert massif | 2048-10-30T21:20:00Z | 253.896237 | -0.065891 | 354.501402 | -2.047149 | -1.1e-06 | +6.8e-04 | +6.5e-05 | +7.6e-05 |
| Malapert massif | 2055-12-31T22:40:00Z | 19.279805 | 3.169283 | 355.938504 | -1.039768 | -3.4e-07 | +6.7e-04 | +4.7e-05 | +3.5e-05 |
| Mons Mouton | 2026-03-20T06:30:00Z | 129.099307 | -4.133523 | 324.812400 | 8.445275 | -1.8e-07 | +6.6e-04 | +4.8e-05 | -6.0e-05 |
| Mons Mouton | 2031-08-11T17:45:00Z | 225.087528 | -2.482562 | 334.200286 | 3.250441 | -2.1e-06 | +6.7e-04 | -3.1e-05 | +3.3e-05 |
| Mons Mouton | 2037-01-05T03:15:00Z | 288.967909 | 1.240600 | 330.333013 | 6.838247 | +1.0e-06 | +6.7e-04 | -2.1e-05 | -6.0e-06 |
| Mons Mouton | 2042-06-21T12:00:00Z | 108.343394 | -3.230451 | 333.779516 | 11.034685 | +9.3e-07 | +6.5e-04 | -5.0e-07 | -1.7e-05 |
| Mons Mouton | 2048-10-30T21:20:00Z | 222.899918 | -3.133784 | 323.583301 | -1.456584 | -1.0e-06 | +6.8e-04 | +6.2e-05 | +7.9e-05 |
| Mons Mouton | 2055-12-31T22:40:00Z | 348.105756 | 4.961937 | 324.965260 | -0.375267 | -1.6e-07 | +6.7e-04 | +4.4e-05 | +3.7e-05 |
| Plain at 81S | 2026-03-20T06:30:00Z | 40.540518 | 5.947140 | 235.972522 | -0.977671 | -4.5e-07 | +6.6e-04 | +5.1e-05 | -5.7e-05 |
| Plain at 81S | 2031-08-11T17:45:00Z | 135.898160 | -4.572757 | 245.701200 | -5.416566 | -9.5e-08 | +6.7e-04 | -3.2e-05 | +3.0e-05 |
| Plain at 81S | 2037-01-05T03:15:00Z | 200.233361 | -8.598132 | 241.544735 | -2.177649 | +1.0e-06 | +6.6e-04 | -1.9e-05 | -7.5e-06 |
| Plain at 81S | 2042-06-21T12:00:00Z | 19.692168 | 6.582898 | 244.576648 | 2.292276 | +7.8e-07 | +6.5e-04 | -2.7e-07 | -1.7e-05 |
| Plain at 81S | 2048-10-30T21:20:00Z | 133.625729 | -4.835382 | 235.384025 | -10.930404 | +5.8e-07 | +6.8e-04 | +6.0e-05 | +8.3e-05 |
| Plain at 81S | 2055-12-31T22:40:00Z | 259.356161 | -2.204133 | 236.712987 | -9.762207 | +5.6e-07 | +6.7e-04 | +4.2e-05 | +4.0e-05 |
| Apollo 11 | 2026-03-20T06:30:00Z | 88.509067 | -46.790861 | 259.970049 | 62.194610 | -8.1e-06 | +4.6e-04 | +1.0e-04 | +4.7e-05 |
| Apollo 11 | 2031-08-11T17:45:00Z | 268.570019 | -37.422891 | 273.177795 | 71.668193 | -1.4e-05 | +5.2e-04 | -4.1e-05 | -2.5e-05 |
| Apollo 11 | 2037-01-05T03:15:00Z | 270.349994 | 26.528309 | 262.598601 | 67.806930 | +5.2e-06 | +6.0e-04 | +7.0e-05 | -1.4e-05 |
| Apollo 11 | 2042-06-21T12:00:00Z | 88.084608 | -26.061652 | 249.235570 | 70.401274 | -9.7e-08 | +5.9e-04 | +6.2e-07 | -7.9e-06 |
| Apollo 11 | 2048-10-30T21:20:00Z | 269.199617 | -39.649030 | 280.607200 | 60.389048 | -1.2e-05 | +5.2e-04 | -8.3e-05 | +8.4e-05 |
| Apollo 11 | 2055-12-31T22:40:00Z | 269.250371 | 85.677156 | 278.977017 | 61.966064 | +6.4e-05 | +5.0e-05 | -8.2e-05 | +4.6e-05 |
| Chang'e 4 | 2026-03-20T06:30:00Z | 336.563198 | 41.541977 | 178.135856 | -40.701855 | +1.5e-06 | +5.0e-04 | +5.8e-05 | -6.2e-05 |
| Chang'e 4 | 2031-08-11T17:45:00Z | 82.805351 | 9.181633 | 190.966841 | -45.850424 | +6.9e-06 | +6.6e-04 | -4.4e-05 | +2.3e-05 |
| Chang'e 4 | 2037-01-05T03:15:00Z | 132.393318 | -34.296212 | 185.354058 | -42.476641 | -1.7e-06 | +5.5e-04 | -2.6e-05 | -1.1e-05 |
| Chang'e 4 | 2042-06-21T12:00:00Z | 313.203800 | 32.324076 | 189.554292 | -38.151468 | +4.1e-07 | +5.5e-04 | +1.1e-06 | -1.3e-05 |
| Chang'e 4 | 2048-10-30T21:20:00Z | 80.829660 | 10.368004 | 174.981840 | -50.404053 | +5.9e-06 | +6.7e-04 | +1.1e-04 | +6.2e-05 |
| Chang'e 4 | 2055-12-31T22:40:00Z | 209.276172 | -41.313241 | 177.287093 | -49.476920 | +2.8e-06 | +5.0e-04 | +7.6e-05 | +3.7e-05 |

