# Jac Tours - Proyecto Organizado

Este repositorio fue organizado para separar claramente:

- Sitio web público (contenido y recursos estáticos)
- Sistema de reservas (Supabase + PayPal + panel web)
- Archivos de respaldo internos

## Estructura

- `01-website-mirror/`
  - `site/` -> HTML público actualmente desplegado
  - `external/` -> recursos estáticos externos necesarios (`connect.facebook.net`, `framerusercontent.com`)

- `02-sistema-reservas/`
  - Base de datos, edge functions y panel web del sistema nuevo
  - Ver `02-sistema-reservas/README.md`

- `99-archive/`
  - Archivos de respaldo internos (no desplegados)

## Recomendación de trabajo

1. Editar y versionar activamente solo `02-sistema-reservas/`.
2. Usar `01-website-mirror/site/` como base del sitio público.
3. Mantener `99-archive/` como histórico interno no productivo.
