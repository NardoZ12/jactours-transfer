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
const DEFAULT_CENTER = [18.7298, -86.7325]; // Punta Cana

class TrasladosCalculatorLeaflet {
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
    this.polyline = null;
    this.init();
  }

  init() {
    console.log('🚗 Traslados Calculator Leaflet inicializando...');
    this.setupMap();
    this.setupAutocomplete();
    this.setupEventListeners();
    console.log('✅ Calculador inicializado sin Google Maps');
  }

  setupMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.warn('⚠️ Contenedor de mapa no encontrado');
      return;
    }

    // Inicializar mapa con Leaflet
    this.map = L.map('map').setView(DEFAULT_CENTER, 11);

    // Agregar OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Click en el mapa para seleccionar ubicación
    this.map.on('click', (e) => {
      const isPickup = document.getElementById('mapMode')?.value === 'pickup';
      this.selectLocationFromMap(e.latlng.lat, e.latlng.lng, isPickup);
    });

    console.log('✅ Mapa Leaflet inicializado');
  }

  setupAutocomplete() {
    const pickupInput = document.getElementById('pickupInput');
    const destinationInput = document.getElementById('destinationInput');

    if (pickupInput) {
      this.setupAddressAutocomplete(pickupInput, (lat, lng, address) => {
        this.setPickupLocation(lat, lng, address);
      });
    }

    if (destinationInput) {
      this.setupAddressAutocomplete(destinationInput, (lat, lng, address) => {
        this.setDestinationLocation(lat, lng, address);
      });
    }

    console.log('✅ Autocomplete configurado (Nominatim)');
  }

  setupAddressAutocomplete(input, callback) {
    let autocompleteTimeout;
    const suggestionsList = document.createElement('ul');
    suggestionsList.className = 'autocomplete-suggestions';
    input.parentElement.appendChild(suggestionsList);

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 3) {
        suggestionsList.innerHTML = '';
        return;
      }

      clearTimeout(autocompleteTimeout);
      autocompleteTimeout = setTimeout(() => {
        this.searchNominatim(query, (results) => {
          suggestionsList.innerHTML = '';
          if (results.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No se encontraron resultados';
            li.className = 'no-results';
            suggestionsList.appendChild(li);
            return;
          }

          results.slice(0, 5).forEach((result) => {
            const li = document.createElement('li');
            li.textContent = result.display_name;
            li.addEventListener('click', () => {
              input.value = result.display_name;
              suggestionsList.innerHTML = '';
              callback(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
            });
            suggestionsList.appendChild(li);
          });
        });
      }, 300);
    });
  }

  searchNominatim(query, callback) {
    // Buscar en OpenStreetMap Nominatim API (gratuito)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=do&limit=5`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => callback(data))
      .catch((err) => {
        console.error('Error en Nominatim:', err);
        callback([]);
      });
  }

  setPickupLocation(lat, lng, address) {
    this.currentLocation = { lat, lng, address };

    const pickupInput = document.getElementById('pickupInput');
    if (pickupInput) pickupInput.value = address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const gpsInput = document.getElementById('gpsCoordinates');
    if (gpsInput) gpsInput.value = `${lat},${lng}`;

    // Actualizar marcador
    if (this.pickupMarker) this.map.removeLayer(this.pickupMarker);
    this.pickupMarker = L.marker([lat, lng], {
      title: 'Punto de salida',
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).addTo(this.map);

    this.calculateDistance();
    console.log('📍 Pickup:', address, lat, lng);
  }

  setDestinationLocation(lat, lng, address) {
    this.destination = { lat, lng, address };

    const destinationInput = document.getElementById('destinationInput');
    if (destinationInput) destinationInput.value = address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Actualizar marcador
    if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);
    this.destinationMarker = L.marker([lat, lng], {
      title: 'Destino',
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).addTo(this.map);

    this.calculateDistance();
    console.log('📍 Destination:', address, lat, lng);
  }

  calculateDistance() {
    if (!this.currentLocation || !this.destination || !this.map) return;

    const R = 6371; // Radio de la Tierra en km
    const dLat = ((this.destination.lat - this.currentLocation.lat) * Math.PI) / 180;
    const dLon = ((this.destination.lng - this.currentLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((this.currentLocation.lat * Math.PI) / 180) *
        Math.cos((this.destination.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    this.distance = Math.round((R * c) * 10) / 10;

    const distanceInput = document.getElementById('distance');
    if (distanceInput) distanceInput.value = this.distance;

    // Dibujar polyline
    if (this.polyline) this.map.removeLayer(this.polyline);
    this.polyline = L.polyline(
      [
        [this.currentLocation.lat, this.currentLocation.lng],
        [this.destination.lat, this.destination.lng],
      ],
      { color: '#f27d2e', weight: 3, opacity: 0.7 }
    ).addTo(this.map);

    // Ajustar zoom
    const group = new L.featureGroup([this.pickupMarker, this.destinationMarker]);
    this.map.fitBounds(group.getBounds(), { padding: [50, 50] });

    this.calculatePrices();
    console.log('📏 Distancia calculada:', this.distance, 'km');
  }

  selectLocationFromMap(lat, lng, isPickup) {
    const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    if (isPickup) {
      this.setPickupLocation(lat, lng, address);
    } else {
      this.setDestinationLocation(lat, lng, address);
    }
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

  setupEventListeners() {
    const currentLocationBtn = document.getElementById('getCurrentLocationBtn');
    if (currentLocationBtn) {
      currentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
    }

    const distanceInput = document.getElementById('distance');
    if (distanceInput) {
      distanceInput.addEventListener('change', () => this.calculatePrices());
      distanceInput.addEventListener('input', () => this.calculatePrices());
    }

    const passengersInput = document.getElementById('passengers');
    if (passengersInput) {
      passengersInput.addEventListener('change', () => {
        this.passengers = Math.max(1, Number(passengersInput.value) || 1);
        this.calculatePrices();
      });
    }

    document.querySelectorAll('[data-vehicle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const vehicleKey = btn.dataset.vehicle;
        this.selectVehicle(vehicleKey);
      });
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
    window.trasladosCalc = new TrasladosCalculatorLeaflet();
  });
} else {
  window.trasladosCalc = new TrasladosCalculatorLeaflet();
}
