# MIS HORAS JUGADAS

Esta versión NO contiene los CSV.

La web obtiene las direcciones de los tres CSV desde `CONFIGURACION.xlsx`.

## Cómo se actualiza

1. Abre `CONFIGURACION.xlsx`.
2. En la hoja `Fuentes`, pega o cambia únicamente las URLs de:
   - JUEGOS
   - SERIES
   - DIRECTOS
3. Guarda el Excel.
4. Sube el Excel junto con la web a GitHub Pages.

Así, si algún día cambias la ubicación de los CSV, no tienes que tocar `app.js`.

## CSV de DIRECTOS

El CSV de DIRECTOS debe usar `TIEMPO_JUGADO` en lugar de `HORA_ESPAÑA`.

Ejemplos válidos:
- `02:30` = 2 horas y 30 minutos
- `01:05` = 1 hora y 5 minutos
- `2h 30m`

La web suma ese tiempo para obtener las horas de cada juego, serie y el total.

## Estructura
- `index.html`
- `style.css`
- `app.js`
- `CONFIGURACION.xlsx`
- `images/`
- `background.webp`
- `icon.png`

No hay copias locales de los CSV.
