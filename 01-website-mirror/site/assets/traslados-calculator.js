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

class TrasladosCalculator {
  constructor() {
    this.currentLocation = null;
    this.destination = null;
    this.distance = 0;
    this.passengers = 1;
    this.selectedVehicle = null;
    this.prices = {};
    this.init();
  }

  init() {
    console.log('🚗 Traslados Calculator inicializado');
    this.setupEventListeners();
    this.loadLocations();
  }

  setupEventListeners() {
    const pickupBtn = document.getElementById('getCurrentLocationBtn');
    if (pickupBtn) {
      pickupBtn.addEventListener('click', () => this.getCurrentLocation());
    }

    const distanceInput = document.getElementById('distance');
    if (distanceInput) {
      distanceInput.addEventListener('change', (e) => {
        this.distance = Number(e.target.value) || 0;
        this.calculatePrices();
      });
      distanceInput.addEventListener('input', (e) => {
        this.distance = Number(e.target.value) || 0;
        this.calculatePrices();
      });
    }

    const passengersInput = document.getElementById('passengers');
    if (passengersInput) {
      passengersInput.addEventListener('change', (e) => {
        this.passengers = Math.max(1, Number(e.target.value) || 1);
        this.calculatePrices();
      });
    }

    // Auto-select vehicle based on passengers
    document.querySelectorAll('[data-vehicle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const vehicleKey = btn.dataset.vehicle;
        this.selectVehicle(vehicleKey);
      });
    });
  }

  loadLocations() {
    // Cargar ubicaciones comunes (esto puede venir de Supabase después)
    const commonLocations = [
      'Punta Cana Resort',
      'Playa Bávaro',
      'Aeropuerto Punta Cana',
      'Casco Viejo - Santo Domingo',
      'Hotel Barceló',
      'Club Med',
      'Otra ubicación',
    ];

    const pickup = document.getElementById('pickupLocation');
    const destination = document.getElementById('destination');

    if (pickup) {
      pickup.innerHTML = '<option value="">Selecciona ubicación de salida</option>';
      commonLocations.forEach((loc) => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        pickup.appendChild(option);
      });
    }

    if (destination) {
      destination.innerHTML = '<option value="">Selecciona destino</option>';
      commonLocations.forEach((loc) => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        destination.appendChild(option);
      });
    }
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible en tu navegador');
      return;
    }

    const btn = document.getElementById('getCurrentLocationBtn');
    if (btn) btn.disabled = true;
    if (btn) btn.textContent = 'Obteniendo ubicación...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.currentLocation = { latitude, longitude };

        const pickupInput = document.getElementById('pickupLocation');
        if (pickupInput) {
          pickupInput.value = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }

        const gpsInput = document.getElementById('gpsCoordinates');
        if (gpsInput) {
          gpsInput.value = `${latitude},${longitude}`;
        }

        console.log('📍 Ubicación actual:', latitude, longitude);
        if (btn) btn.textContent = 'Ubicación obtenida ✓';
        if (btn) btn.disabled = false;
      },
      (error) => {
        console.error('❌ Error obteniendo ubicación:', error);
        alert('No pudimos obtener tu ubicación. Verifica permisos.');
        if (btn) btn.textContent = 'Obtener mi ubicación';
        if (btn) btn.disabled = false;
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
    this.prices = {};

    // Filtrar vehículos por capacidad de pasajeros
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

    // Actualizar UI
    document.querySelectorAll('[data-vehicle]').forEach((btn) => {
      btn.classList.remove('selected');
      if (btn.dataset.vehicle === vehicleKey) {
        btn.classList.add('selected');
      }
    });

    // Guardar en input oculto
    const vehicleInput = document.getElementById('selectedVehicle');
    if (vehicleInput) {
      vehicleInput.value = vehicleKey;
    }

    const priceInput = document.getElementById('transportPrice');
    if (priceInput) {
      priceInput.value = this.prices[vehicleKey];
    }

    console.log('🚗 Vehículo seleccionado:', vehicleKey, 'Precio:', this.prices[vehicleKey]);
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
      card.data.vehicle = key;
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

  // API pública
  getSelectedData() {
    return {
      vehicle: this.selectedVehicle,
      vehicleName: VEHICLES[this.selectedVehicle]?.name || '',
      price: this.prices[this.selectedVehicle] || 0,
      distance: this.distance,
      passengers: this.passengers,
      pickup: document.getElementById('pickupLocation')?.value || '',
      destination: document.getElementById('destination')?.value || '',
      gps: document.getElementById('gpsCoordinates')?.value || '',
    };
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.trasladosCalc = new TrasladosCalculator();
  });
} else {
  window.trasladosCalc = new TrasladosCalculator();
}
