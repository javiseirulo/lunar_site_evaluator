# lunar-calc

Máquina de **cálculo** en Google Cloud (efemérides, terreno, scoring). No aloja la web.

Creada el 2026-11-14 por @javocruz. El crédito de prueba se gasta mientras esté encendida.

## Dónde está

| | |
|---|---|
| Proyecto | My First Project |
| ID | `glossy-monitor-514715-k4` |
| Instancia | `lunar-calc` |
| Zona | `europe-west1-b` |
| Tamaño | e2-standard-4 (4 CPU, 16 GB RAM), disco 100 GB |
| Sistema | Ubuntu 24.04 |
| IP externa | `34.79.31.95` |
| Consola | https://console.cloud.google.com/compute/instances?project=glossy-monitor-514715-k4 |

Cuentas con acceso: `jcruz.ieu2024@student.ie.edu` (Owner) y `cuentasecundariajavichi@gmail.com` (Admin). Hay que entrar con una de esas cuentas de Google.

## Conectar

Instala el CLI si no lo tienes: https://cloud.google.com/sdk/docs/install

```bash
gcloud auth login
gcloud config set project glossy-monitor-514715-k4
gcloud compute ssh lunar-calc --project=glossy-monitor-514715-k4 --zone=europe-west1-b
```

La primera vez, gcloud crea una clave SSH y la sube a la instancia. Acepta la huella del host.

El primer arranque instala Python 3, venv, pip, GDAL, git y herramientas de compilación. Tarda unos minutos. Dentro de la máquina:

```bash
cloud-init status --wait
python3 --version
gdalinfo --version
```

## Trabajar

Los datos pesados se quedan en la máquina. No se suben al repo (`.tif`, kernels SPICE, `data_raw/`).

```bash
mkdir -p ~/work
cd ~/work
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
```

Clona el repo en `~/work` si hace falta el código. Los resultados que quepan en git salen por un PR a `dev`, igual que el resto del equipo.

## Encender y apagar

Apagar cuando nadie esté calculando:

```bash
gcloud compute instances stop lunar-calc --project=glossy-monitor-514715-k4 --zone=europe-west1-b
```

Volver a encender:

```bash
gcloud compute instances start lunar-calc --project=glossy-monitor-514715-k4 --zone=europe-west1-b
```

La IP externa puede cambiar al arrancar de nuevo. Si `ssh` falla, mírala en la consola o con:

```bash
gcloud compute instances describe lunar-calc --project=glossy-monitor-514715-k4 --zone=europe-west1-b --format='value(networkInterfaces[0].accessConfigs[0].natIP)'
```
