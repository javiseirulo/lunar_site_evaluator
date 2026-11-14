# Catálogo de sitios (#48) — qué necesita Pablo (terreno)

> Autor: @javiseirulo (con Claude Code). Fecha: 2026-11-14.
> Fuente única: `python/export/catalog.yaml` (59 sitios con cita y URL; ninguno inventado).
> Coordenadas: latitud planetocéntrica y longitud este-positiva en grados (-180..180), marco Moon ME.
> Las fuentes LOLA y LROC usan ME/DE421; no se ha corregido la diferencia con DE440.

## Qué pedimos

Para cada sitio **polar** de la tabla (|lat| ≥ 80°):

1. **Perfil de horizonte** con paso de 0,1° (3600 azimuts), observador a **5 m** sobre el terreno,
   alcance de **≥100–150 km** y **curvatura incluida** (en el polo el Sol va a ±1,5°, así que el relieve lejano cuenta).
2. **Pendiente** en el punto (y, si puedes, la media en un radio pequeño; tú decides el radio y lo documentas).

Formato de salida (ya acordado en `docs/10-plan-tecnico.md`):

```
web/public/data/horizon/<id>.json
{ version, site_id, lat, lon, observer_height_m: 5, az_step_deg: 0.1,
  elev_deg[3600], max_range_km, source }
```

- Azimut desde el norte local, en sentido horario; `elev_deg` en grados.
- `lat`/`lon` se copian de `catalog.yaml`; `site_id` = `id` del catálogo.
- Tú decides cuántos sitios da tiempo a procesar: hazlos en el orden **P1 → P2 → P3**.

## Prioridades

- **P1**: los 20 ids que ya usan los demás módulos (mocks y `timeseries/`). Se mantienen los ids, pero varias coordenadas **han cambiado** respecto al mock (ver `note` en el YAML).
- **P2**: nuevos sitios Artemis o muy iluminados, los aterrizajes IM-1 e IM-2 y los 3 sitios del **polo norte**.
- **P3**: sitios candidatos de Flahaut et al. 2020 (centros de zonas grandes con 0,1° de precisión; en latitud son unos 3 km).

Para el polo norte hace falta un DEM polar norte. Si no da tiempo, deja esos tres sitios para el final o sin perfil
(entonces la web mostrará horizonte geométrico con la etiqueta "no terrain").

## Tabla de sitios polares (41)

| Prio | id | lat | lon | Polo | Precisión |
|---|---|---|---|---|---|
| P1 | `shackleton_rim_01` | -89.7755 | -156.448 | S | region_representative_point |
| P1 | `shackleton_rim_02` | -89.812 | 52.125 | S | region_representative_point |
| P1 | `connecting_ridge` | -89.4679 | -137.411 | S | region_representative_point |
| P1 | `de_gerlache_rim_01` | -88.6952 | -68.2846 | S | region_representative_point |
| P1 | `de_gerlache_rim_02` | -88.45 | -67.859 | S | published_point |
| P1 | `peak_near_shackleton` | -88.8247 | 124.1359 | S | region_representative_point |
| P1 | `malapert_massif` | -85.9756 | -2.11241 | S | region_representative_point |
| P1 | `leibnitz_beta` | -85.4596 | 31.78053 | S | region_representative_point |
| P1 | `haworth_rim` | -87.05 | -24.24 | S | published_point |
| P1 | `nobile_rim_01` | -85.295 | 36.917 | S | published_point |
| P1 | `nobile_rim_02` | -83.918 | 59.326 | S | published_point |
| P1 | `faustini_rim` | -87.749 | 95.084 | S | published_point |
| P1 | `amundsen_rim` | -84.229 | 69.877 | S | published_point |
| P1 | `cabeus_b` | -83.369 | -67.665 | S | published_point |
| P1 | `shoemaker_rim` | -87.1 | 65.4 | S | region_representative_point |
| P1 | `sverdrup_rim` | -87.4 | -148.2 | S | region_representative_point |
| P1 | `slater_plain` | -87.131 | 127.857 | S | published_point |
| P1 | `de_gerlache_kocher` | -85.777 | -116.502 | S | published_point |
| P1 | `mons_mouton` | -84.805 | 24.887 | S | published_point |
| P1 | `plain_81s` | -84.6 | 115.7 | S | region_representative_point |
| P2 | `connecting_ridge_extension` | -89.011 | -94.61 | S | published_point |
| P2 | `connecting_ridge_c2` | -89.3157 | -114.06 | S | published_point |
| P2 | `connecting_ridge_cr05` | -89.421 | -149.472 | S | published_point |
| P2 | `peak_near_shackleton_pns02` | -89.061 | 128.442 | S | published_point |
| P2 | `malapert_mp2` | -86.0265 | 2.757964 | S | region_representative_point |
| P2 | `im1_odysseus` | -80.13 | 1.44 | S | landed_position |
| P2 | `im2_athena` | -84.7906 | 29.1957 | S | landed_position |
| P2 | `hinshelwood_rim` | 89.6564 | -33.56 | N | published_point |
| P2 | `peary_rim` | 89.726 | 123.11 | N | published_point |
| P2 | `whipple_rim` | 89.3766 | 126.48 | N | published_point |
| P3 | `south_amundsen` | -85.0 | 90.0 | S | region_representative_point |
| P3 | `shackleton_vicinity_25e` | -89.5 | 25.5 | S | region_representative_point |
| P3 | `faustini_ridge` | -87.6 | 103.7 | S | region_representative_point |
| P3 | `shackleton_vicinity_101e` | -88.6 | 101.4 | S | region_representative_point |
| P3 | `ibn_bajja_sw` | -86.4 | -86.7 | S | region_representative_point |
| P3 | `cabeus_b_south` | -84.0 | -60.5 | S | region_representative_point |
| P3 | `de_gerlache_north` | -87.9 | -65.1 | S | region_representative_point |
| P3 | `sverdrup_west` | -88.0 | 173.2 | S | region_representative_point |
| P3 | `wiechert_p_south` | -87.2 | 146.7 | S | region_representative_point |
| P3 | `amundsen_west` | -85.8 | 112.7 | S | region_representative_point |
| P3 | `wiechert_j_south` | -86.5 | 176.6 | S | region_representative_point |

Datos útiles de terreno:

- Barker et al. 2021 dice que los sitios 1, 4, 7 y 11 de PGDA 78 (DEM LOLA de 5 m) son las RoI CR1, SR1, SV1 y GR1
  de De Rosa et al. 2012. Es decir: `connecting_ridge`, `shackleton_rim_01`, `peak_near_shackleton` y `de_gerlache_rim_01`.
- PGDA 78 también tiene DEMs de 5 m de Malapert, Leibnitz β / Mons Mouton, Nobile 1 y 2, de Gerlache–Kocher, Haworth,
  Amundsen rim, Faustini rim A y Connecting ridge extension. No se ha comprobado si cada punto cae dentro de su recorte;
  el alcance de ≥100 km necesita además un DEM más amplio para el relieve lejano.

## Sitios no polares (18)

Son los aterrizajes históricos (Apollo, Luna, Surveyor 1, Chang'e 3–6, Chandrayaan-3, SLIM y Blue Ghost M1).
Lejos del polo, un **horizonte plano basta**. Si quieres, el DEM global de LOLA a 118 m sirve para un perfil
aproximado. Esto lo decides tú.
