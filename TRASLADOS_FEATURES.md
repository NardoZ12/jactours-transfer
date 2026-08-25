# Sistema de Traslados Mejorado

## Características

### 1. Calculador de Precios Dinámico
Los precios se calculan automáticamente basándose en:
- **Distancia**: Primeros 15 km incluidos, luego costo por km adicional
- **Vehículo seleccionado**: Cada vehículo tiene tarifa diferente
- **Cantidad de pasajeros**: El vehículo se sugiere automáticamente según capacidad

### 2. Vehículos Disponibles

| Vehículo | Capacidad | Tarifa 0-15km | Costo/km extra |
|----------|-----------|---------------|----------------|
| Starex   | 1-6       | $1.75         | $1.00          |
| Hiace    | 7-11      | $2.00         | $1.50          |
| Coaster  | 12-22     | $5.00         | $2.00          |
| Universe | 23-49     | $7.50         | $3.00          |

### 3. Selector de Ubicación
- Desplegable con ubicaciones comunes
- Botón "Mi ubicación" que usa GPS del navegador
- Almacena coordenadas para navegación

### 4. Flujo de Reserva
1. Usuario selecciona pickup y destino
2. Ingresa distancia o sistema calcula con GPS
3. Especifica cantidad de pasajeros
4. Sistema muestra vehículos disponibles y precios
5. Elige vehículo
6. Ingresa datos personales
7. Procede al pago

## Uso

### Página Principal
```html
<a href="./reserva-traslados.html" class="btn">Reservar Traslado</a>
```

### Integrar Calculador en Página Existente
```html
<script src="./assets/traslados-calculator.js"></script>

<!-- Estructura requerida -->
<select id="pickupLocation"></select>
<button id="getCurrentLocationBtn">Mi ubicación</button>
<select id="destination"></select>
<input id="distance" type="number" />
<input id="passengers" type="number" />
<div id="vehicleOptions"></div>
<input id="selectedVehicle" type="hidden" />
<input id="transportPrice" type="hidden" />
```

### Acceder a Datos
```javascript
const calculator = window.trasladosCalc;
const data = calculator.getSelectedData();
// {
//   vehicle: 'starex',
//   vehicleName: 'Starex (1-6 personas)',
//   price: 1.75,
//   distance: 10,
//   passengers: 2,
//   pickup: 'Punta Cana Resort',
//   destination: 'Aeropuerto',
//   gps: '18.7298,-86.7325'
// }
```

## Archivos Creados

- `01-website-mirror/site/assets/traslados-calculator.js` - Lógica de calculador
- `01-website-mirror/site/reserva-traslados.html` - Página de reserva completa

## Próximas Mejoras

- [ ] Integración con Google Maps para calcular distancia automática
- [ ] Historial de ubicaciones guardadas por usuario
- [ ] Soporte para reservas recurrentes/regulares
- [ ] Descuentos por volumen para traslados múltiples
- [ ] Integración con sistema de pagos para pre-autorización

## Testing

Probar en:
1. Desktop (Chrome, Firefox, Safari)
2. Mobile (iOS Safari, Chrome Mobile)
3. Diferentes combinaciones de pasajeros/distancia
4. Geolocalización (con permisos)
5. Checkout después de reservar
