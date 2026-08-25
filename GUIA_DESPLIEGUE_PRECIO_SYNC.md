# Guía de Despliegue: Sincronización de Precios en Tiempo Real

## Problema Resuelto
Cuando realizabas cambios en el Dashboard Operativo (precios, ofertas, etiquetas), estos **no se reflejaban en los productos del website**. La causa era que las políticas de seguridad (RLS) de Supabase bloqueaban el acceso anónimo a la tabla de servicios.

## Solución Implementada
Se creó una **Función Edge de Supabase** (get-services) que:
- Usa credenciales de backend (SERVICE_ROLE_KEY) para bypass de RLS
- Devuelve todos los servicios activos con precios y ofertas
- Permite que price-sync.js en el website obtenga los datos actualizados
- Sincroniza automáticamente cada 15 segundos

## Pasos de Despliegue

### 1. Verificar Instalación de Supabase CLI
```bash
supabase --version
```

Si no está instalado:
```bash
npm install -g supabase
```

### 2. Conectar a tu Proyecto Supabase
```bash
cd /ruta/a/jactours-transfer/02-sistema-reservas

# Inicializar Supabase (si no lo está)
supabase init

# Conectar a tu proyecto
supabase link --project-ref jxetcadstgvcrfkphofe
```

### 3. Desplegar la Función
```bash
supabase functions deploy get-services
```

**Salida esperada:**
```
✓ Function deployed successfully
- Endpoint: https://jxetcadstgvcrfkphofe.supabase.co/functions/v1/get-services
- Auth: None (Public)
```

### 4. Verificar Despliegue con cURL
```bash
curl -X GET "https://jxetcadstgvcrfkphofe.supabase.co/functions/v1/get-services" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Respuesta esperada:**
```json
[
  {
    "id": "uuid-1",
    "slug": "isla-saona",
    "title": "Excursión a Isla Saona",
    "category": "excursiones",
    "base_price": 59,
    "offer_price": null,
    "offer_label": null,
    "offer_active": false
  },
  // ... más servicios
]
```

## Prueba de Funcionamiento

### En el Dashboard Operativo:
1. Navega a `http://tu-dominio/02-sistema-reservas/panelweb/productos-tarifas.html`
2. Cambia el precio de un producto (ej: Isla Saona de $49 a $59)
3. Haz clic en "Guardar"

### En el Website:
1. Abre la página de producto en una pestaña nueva (ej: `/servicios/isla-saona`)
2. Abre la Consola del Navegador (F12 → Console)
3. Espera máximo 15 segundos
4. Deberías ver logs como:
   ```
   🔄 Iniciando sincronización de precios...
   📦 Servicios obtenidos: 12
   ✅ Precios actualizados: 12
   ```
5. El precio en el website debe actualizarse a $59

## Troubleshooting

### Error: "Function not found"
- Verifica que la función se desplegó correctamente: `supabase functions list`
- Espera 2-3 minutos después del despliegue (puede haber latencia)
- Revisa los logs: `supabase functions describe get-services`

### Error: "403 Forbidden" o "CORS blocked"
- Verifica que CORS headers estén en la función (ya están configurados)
- Comprueba que la URL de la función es correcta en price-sync.js
- En la consola del navegador busca: `❌ Error cargando servicios`

### Precios no se actualizan
- Abre la Consola del Navegador en la página del producto (F12)
- Busca errores rojos
- Si ves `"HTTP 400"` o `"HTTP 500"`, revisa logs de la función:
  ```bash
  supabase functions logs get-services
  ```

### Base de datos devuelve datos vacíos
- Verifica que en la tabla `services` hay registros con `active = true`
- En Supabase Dashboard → SQL Editor:
  ```sql
  SELECT id, slug, title, base_price, active FROM services WHERE active = true;
  ```

## Estructura de Archivos

```
jactours-transfer/
├── 01-website-mirror/site/
│   └── assets/
│       └── price-sync.js ✅ ACTUALIZADO (llama get-services)
└── 02-sistema-reservas/
    └── supabase/
        └── functions/
            └── get-services/
                └── index.ts ✅ NUEVO (middleware de precios)
```

## Cómo Funciona el Flujo

```
Dashboard Operativo
    ↓ (cambio de precio)
Tabla services (Supabase)
    ↓ (cada 15 segundos)
Función get-services
    ↓ (HTTP GET)
price-sync.js en website
    ↓ (actualiza DOM)
Producto mostrado con nuevo precio ✅
```

## Configuración de Sincronización

Si quieres ajustar la frecuencia de sincronización, edita `price-sync.js`:

```javascript
// Línea ~290: cambiar 15000 (15 segundos) a otro valor
setInterval(function () {
  // Re-sincronizar cada 15 segundos (más frecuente)
  loadAllServices()...
}, 15000); // ← cambiar este número
```

- `5000` = cada 5 segundos (más rápido, más carga)
- `15000` = cada 15 segundos (recomendado)
- `30000` = cada 30 segundos (más lento)

## Próximos Pasos

Una vez confirmado que la sincronización funciona:

1. **Bloqueo de cupo en tiempo real** - Evitar overbooking de experiencias
2. **Email de confirmación** - Enviar confirmación automática de reserva
3. **Página de estado de reserva** - Cliente puede ver estado de su reserva
4. **Cancelación/Reprogramación** - Permitir cambios en reservas existentes

---

**Fecha de creación:** 2026-08-25  
**Función:** Sincronización de precios Dashboard → Website
