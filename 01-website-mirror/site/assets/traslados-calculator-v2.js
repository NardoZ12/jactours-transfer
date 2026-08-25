const VEHICLES = {
  starex: {
    name: 'Starex (1-6 personas)',
    capacity: 6,
    basePriceFree: 1.75,
    extraKmPrice: 1.0,
    color: '#3196e2',
  },
  hiace: {
    name: 'Hiace (7-11 personas)',
    capacity: 11,
    basePriceFree: 2.0,
    extraKmPrice: 1.5,
    color: '#f27d2e',
  },
  coaster: {
    name: 'Coaster (12-22 personas)',
    capacity: 22,
    basePriceFree: 5.0,
    extraKmPrice: 2.0,
    color: '#53d2dc',
  },
  universe: {
    name: 'Universe (23-49 personas)',
    capacity: 49,
    basePriceFree: 7.5,
    extraKmPrice: 3.0,
    color: '#ff826c',
  },
};

const FREE_KM = 15;

class TrasladosCalculatorV2 {
  constructor() {
    this.currentLocation = null;
    this.destination = null;
    this.distance = 0;
    this.passengers = 1;
    this.selectedVehicle = null;
    this.prices = {};
    this.map = null;
    this.pickupMarker = null;
    this.destinationMarker = null;
    this.pickupAutocomplete = null;
    this.destinationAutocomplete = null;
    this.init();
  }

  init() {
    console.log('🚗 Traslados Calculator v2 inicializando...');
    loadGoogleMapsScript(() => {
      this.setupMap();
      this.setupAutocomplete();
      this.setupEventListeners();
    });
  }

  setupMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.warn('Contenedor de mapa no encontrado');
      return;
    }

    this.map = new google.maps.Map(mapContainer, {
      zoom: 12,
      center: GOOGLE_MAPS_CONFIG.defaultLocation,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: false,
    });

    // Click en el mapa para seleccionar ubicación
    this.map.addListener('click', (event) => {
      const isPickup = document.getElementById('mapMode')?.value === 'pickup';
      this.selectLocationFromMap(event.latLng, isPickup);
    });

    console.log('✅ Mapa inicializado');
  }

  setupAutocomplete() {
    const pickupInput = document.getElementById('pickupInput');
    const destinationInput = document.getElementById('destinationInput');

    if (pickupInput) {
      this.pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, {
        componentRestrictions: { country: 'do' },
        fields: ['geometry', 'formatted_address', 'name'],
        types: ['establishment', 'geocode'],
      });

      this.pickupAutocomplete.addListener('place_changed', () => {
        const place = this.pickupAutocomplete.getPlace();
        if (place.geometry) {
          this.setPickupLocation(
            place.geometry.location.lat(),
            place.geometry.location.lng(),
            place.formatted_address || place.name
          );
        }
      });
    }

    if (destinationInput) {
      this.destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, {
        componentRestrictions: { country: 'do' },
        fields: ['geometry', 'formatted_address', 'name'],
        types: ['establishment', 'geocode'],
      });

      this.destinationAutocomplete.addListener('place_changed', () => {
        const place = this.destinationAutocomplete.getPlace();
        if (place.geometry) {
          this.setDestinationLocation(
            place.geometry.location.lat(),
            place.geometry.location.lng(),
            place.formatted_address || place.name
          );
        }
      });
    }

    console.log('✅ Autocomplete configurado');
  }

  setupEventListeners() {
    // Botón de ubicación actual
    const currentLocationBtn = document.getElementById('getCurrentLocationBtn');
    if (currentLocationBtn) {
      currentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
    }

    // Distancia
    const distanceInput = document.getElementById('distance');
    if (distanceInput) {
      distanceInput.addEventListener('change', () => this.calculatePrices());
      distanceInput.addEventListener('input', () => this.calculatePrices());
    }

    // Pasajeros
    const passengersInput = document.getElementById('passengers');
    if (passengersInput) {
      passengersInput.addEventListener('change', () => {
        this.passengers = Math.max(1, Number(passengersInput.value) || 1);
        this.calculatePrices();
      });
    }

    // Modo de mapa
    const mapModeSelect = document.getElementById('mapMode');
    if (mapModeSelect) {
      mapModeSelect.addEventListener('change', (e) => {
        const label = document.getElementById('mapModeLabel');
        if (label) {
          label.textContent = e.target.value === 'pickup' ? '📍 Clickea en el mapa para seleccionar SALIDA' : '📍 Clickea en el mapa para seleccionar DESTINO';
        }
      });
    }

    // Vehículos
    document.querySelectorAll('[data-vehicle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const vehicleKey = btn.dataset.vehicle;
        this.selectVehicle(vehicleKey);
      });
    });

    console.log('✅ Event listeners configurados');
  }

  setPickupLocation(lat, lng, address) {
    this.currentLocation = { lat, lng, address };

    const pickupInput = document.getElementById('pickupInput');
    if (pickupInput) pickupInput.value = address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const gpsInput = document.getElementById('gpsCoordinates');
    if (gpsInput) gpsInput.value = `${lat},${lng}`;

    // Actualizar marcador en mapa
    if (this.map) {
      if (this.pickupMarker) this.pickupMarker.setMap(null);
      this.pickupMarker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: 'Punto de salida',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });
      this.map.panTo({ lat, lng });
    }

    this.calculateDistance();
    console.log('📍 Pickup:', address, lat, lng);
  }

  setDestinationLocation(lat, lng, address) {
    this.destination = { lat, lng, address };

    const destinationInput = document.getElementById('destinationInput');
    if (destinationInput) destinationInput.value = address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Actualizar marcador en mapa
    if (this.map) {
      if (this.destinationMarker) this.destinationMarker.setMap(null);
      this.destinationMarker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: 'Destino',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      });
      this.map.panTo({ lat, lng });
    }

    this.calculateDistance();
    console.log('📍 Destination:', address, lat, lng);
  }

  calculateDistance() {
    if (!this.currentLocation || !this.destination || !this.map) return;

    const pickup = new google.maps.LatLng(this.currentLocation.lat, this.currentLocation.lng);
    const dest = new google.maps.LatLng(this.destination.lat, this.destination.lng);

    const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(pickup, dest);
    this.distance = Math.round((distanceMeters / 1000) * 10) / 10; // Redondear a 1 decimal

    const distanceInput = document.getElementById('distance');
    if (distanceInput) distanceInput.value = this.distance;

    // Dibujar línea entre marcadores
    if (this.pickupMarker && this.destinationMarker) {
      const polyline = new google.maps.Polyline({
        path: [pickup, dest],
        geodesic: true,
        strokeColor: '#f27d2e',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        map: this.map,
      });

      // Ajustar zoom para ver ambos puntos
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(dest);
      this.map.fitBounds(bounds);
    }

    this.calculatePrices();
    console.log('📏 Distancia calculada:', this.distance, 'km');
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible');
      return;
    }

    const btn = document.getElementById('getCurrentLocationBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Obteniendo ubicación...';
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.setPickupLocation(latitude, longitude, 'Mi ubicación actual');
        if (btn) {
          btn.textContent = '✓ Ubicación obtenida';
          btn.disabled = false;
        }
      },
      (error) => {
        console.error('Error:', error);
        alert('No pudimos obtener tu ubicación');
        if (btn) {
          btn.textContent = 'Obtener mi ubicación';
          btn.disabled = false;
        }
      }
    );
  }

  calculatePrice(vehicleKey, km) {
    const vehicle = VEHICLES[vehicleKey];
    if (!vehicle) return 0;

    if (km <= FREE_KM) {
      return vehicle.basePriceFree;
    }

    const extraKm = km - FREE_KM;
    return vehicle.basePriceFree + extraKm * vehicle.extraKmPrice;
  }

  calculatePrices() {
    this.distance = Number(document.getElementById('distance')?.value) || 0;
    this.prices = {};

    Object.entries(VEHICLES).forEach(([key, vehicle]) => {
      if (this.passengers <= vehicle.capacity) {
        const price = this.calculatePrice(key, this.distance);
        this.prices[key] = price;
      }
    });

    this.updatePriceDisplay();
  }

  selectVehicle(vehicleKey) {
    if (!this.prices[vehicleKey]) {
      alert('Este vehículo no tiene capacidad para ' + this.passengers + ' personas');
      return;
    }

    this.selectedVehicle = vehicleKey;

    document.querySelectorAll('[data-vehicle]').forEach((btn) => {
      btn.classList.remove('selected');
      if (btn.dataset.vehicle === vehicleKey) {
        btn.classList.add('selected');
      }
    });

    const vehicleInput = document.getElementById('selectedVehicle');
    if (vehicleInput) vehicleInput.value = vehicleKey;

    const priceInput = document.getElementById('transportPrice');
    if (priceInput) priceInput.value = this.prices[vehicleKey];

    console.log('🚗 Vehicle selected:', vehicleKey, 'Price:', this.prices[vehicleKey]);
  }

  updatePriceDisplay() {
    const container = document.getElementById('vehicleOptions');
    if (!container) return;

    container.innerHTML = '';

    if (Object.keys(this.prices).length === 0) {
      container.innerHTML = `<p class="no-vehicles">No hay vehículos disponibles para ${this.passengers} personas</p>`;
      return;
    }

    Object.entries(this.prices).forEach(([key, price]) => {
      const vehicle = VEHICLES[key];
      const isSelected = this.selectedVehicle === key;

      const card = document.createElement('button');
      card.className = `vehicle-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-vehicle', key);
      card.innerHTML = `
        <div class="vehicle-info">
          <h4>${vehicle.name}</h4>
          <p class="vehicle-price">$${price.toFixed(2)} USD</p>
          <small>
            ${this.distance <= FREE_KM
              ? `Tarifa fija (0-${FREE_KM}km)`
              : `${FREE_KM}km incluidos + $${vehicle.extraKmPrice}/km adicional`
            }
          </small>
        </div>
      `;
      card.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectVehicle(key);
      });

      container.appendChild(card);
    });
  }

  getSelectedData() {
    return {
      vehicle: this.selectedVehicle,
      vehicleName: VEHICLES[this.selectedVehicle]?.name || '',
      price: this.prices[this.selectedVehicle] || 0,
      distance: this.distance,
      passengers: this.passengers,
      pickup: this.currentLocation?.address || document.getElementById('pickupInput')?.value || '',
      pickupLat: this.currentLocation?.lat || null,
      pickupLng: this.currentLocation?.lng || null,
      destination: this.destination?.address || document.getElementById('destinationInput')?.value || '',
      destinationLat: this.destination?.lat || null,
      destinationLng: this.destination?.lng || null,
    };
  }
}

// Inicializar cuando DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.trasladosCalc = new TrasladosCalculatorV2();
  });
} else {
  window.trasladosCalc = new TrasladosCalculatorV2();
}
