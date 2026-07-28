# Jac Tours - Proyecto Organizado

Este repositorio fue organizado para separar claramente:

- Sitio espejo descargado (HTTrack/Framer)
- Sistema de reservas nuevo (Supabase + PayPal + panel web)
- Archivos de respaldo del espejo original

## Estructura

- `01-website-mirror/`
  - `site/dominicanbreeze.framer.website/` -> HTML del sitio espejo
  - `external/` -> recursos externos descargados (`connect.facebook.net`, `framerusercontent.com`)

- `02-sistema-reservas/`
  - Base de datos, edge functions y panel web del sistema nuevo
  - Ver `02-sistema-reservas/README.md`

- `99-archive/httrack/`
  - Archivos auxiliares y de índice generados por HTTrack
  - Se conservan solo como respaldo

## Recomendación de trabajo

1. Editar y versionar activamente solo `02-sistema-reservas/`.
2. Usar `01-website-mirror/` como referencia del contenido actual.
3. Mantener `99-archive/` sin cambios, solo histórico.
