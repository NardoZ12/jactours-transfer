/* Calculadora de traslados con mapa Leaflet + geocodificacion OpenStreetMap (Nominatim) + ruta OSRM. */
(function () {
  var VEHICLES = [
    { id: 'starex', name: 'Starex', capacity: 6, tier1: 1.75, tier2: 1.00 },
    { id: 'hiace', name: 'Hiace', capacity: 11, tier1: 2.00, tier2: 1.50 },
    { id: 'coaster', name: 'Coaster', capacity: 22, tier1: 5.00, tier2: 2.00 },
    { id: 'universe', name: 'Universe', capacity: 49, tier1: 7.50, tier2: 3.00 }
  ];

  var PUNTA_CANA_CENTER = [18.582, -68.405];
  var TIER_KM = 15;
  var NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
  var OSRM_URL = 'https://router.project-osrm.org';

  var state = {
    map: null,
    pickupMarker: null,
    destinationMarker: null,
    pickup: null, // { lat, lng, address }
    destination: null,
    manualDistance: false,
    distanceKm: 0,
    passengers: 1,
    selectedVehicleId: null
  };

  function priceForVehicle(vehicle, distanceKm) {
    if (distanceKm <= TIER_KM) return distanceKm * vehicle.tier1;
    return TIER_KM * vehicle.tier1 + (distanceKm - TIER_KM) * vehicle.tier2;
  }

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLng = (b.lng - a.lng) * Math.PI / 180;
    var lat1 = a.lat * Math.PI / 180;
    var lat2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function el(id) { return document.getElementById(id); }

  function initMap() {
    state.map = L.map('jtMap').setView(PUNTA_CANA_CENTER, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(state.map);

    state.map.on('click', function (e) {
      var mode = el('jtMapMode').value;
      setPoint(mode, { lat: e.latlng.lat, lng: e.latlng.lng }, null);
      reverseGeocode(e.latlng.lat, e.latlng.lng, function (address) {
        setPoint(mode, { lat: e.latlng.lat, lng: e.latlng.lng }, address);
      });
    });
  }

  function markerIcon(color) {
    return L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:' + color + ';border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg)"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 22]
    });
  }

  function setPoint(mode, latlng, address) {
    var isPickup = mode === 'pickup';
    var point = { lat: latlng.lat, lng: latlng.lng, address: address || (isPickup ? state.pickup && state.pickup.address : state.destination && state.destination.address) || '' };

    if (isPickup) {
      state.pickup = point;
      if (!state.pickupMarker) {
        state.pickupMarker = L.marker([point.lat, point.lng], { icon: markerIcon('#f27d2e') }).addTo(state.map);
      } else {
        state.pickupMarker.setLatLng([point.lat, point.lng]);
      }
      if (address) el('jtPickupInput').value = address;
    } else {
      state.destination = point;
      if (!state.destinationMarker) {
        state.destinationMarker = L.marker([point.lat, point.lng], { icon: markerIcon('#0a5c7a') }).addTo(state.map);
      } else {
        state.destinationMarker.setLatLng([point.lat, point.lng]);
      }
      if (address) el('jtDestinationInput').value = address;
    }

    fitMapToPoints();
    recalculateDistance();
  }

  function fitMapToPoints() {
    if (state.pickup && state.destination) {
      state.map.fitBounds([
        [state.pickup.lat, state.pickup.lng],
        [state.destination.lat, state.destination.lng]
      ], { padding: [40, 40] });
    } else if (state.pickup) {
      state.map.setView([state.pickup.lat, state.pickup.lng], 13);
    } else if (state.destination) {
      state.map.setView([state.destination.lat, state.destination.lng], 13);
    }
  }

  function reverseGeocode(lat, lng, callback) {
    fetch(NOMINATIM_URL + '/reverse?format=jsonv2&lat=' + lat + '&lon=' + lng)
      .then(function (r) { return r.json(); })
      .then(function (data) { callback(data && data.display_name ? data.display_name : (lat.toFixed(5) + ', ' + lng.toFixed(5))); })
      .catch(function () { callback(lat.toFixed(5) + ', ' + lng.toFixed(5)); });
  }

  function recalculateDistance() {
    if (!state.pickup || !state.destination) return;

    if (state.manualDistance) {
      renderVehicles();
      return;
    }

    var fallbackKm = haversineKm(state.pickup, state.destination) * 1.3;

    fetch(OSRM_URL + '/route/v1/driving/' + state.pickup.lng + ',' + state.pickup.lat + ';' + state.destination.lng + ',' + state.destination.lat + '?overview=false')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var meters = data && data.routes && data.routes[0] && data.routes[0].distance;
        var km = meters ? meters / 1000 : fallbackKm;
        applyDistance(km);
      })
      .catch(function () { applyDistance(fallbackKm); });
  }

  function applyDistance(km) {
    state.distanceKm = Math.round(km * 10) / 10;
    el('jtDistance').value = state.distanceKm;
    renderVehicles();
  }

  function renderVehicles() {
    var container = el('jtVehicleOptions');
    var passengers = state.passengers;
    var available = VEHICLES.filter(function (v) { return v.capacity >= passengers; });

    if (!available.length) {
      container.innerHTML = '<div class="jt-no-vehicles">No hay vehiculos disponibles para ' + passengers + ' pasajeros.</div>';
      state.selectedVehicleId = null;
      updateHiddenFields();
      return;
    }

    if (state.selectedVehicleId && !available.some(function (v) { return v.id === state.selectedVehicleId; })) {
      state.selectedVehicleId = null;
    }

    container.innerHTML = available.map(function (v) {
      var price = priceForVehicle(v, state.distanceKm || 0);
      var selected = v.id === state.selectedVehicleId ? ' selected' : '';
      return '<button type="button" class="jt-vehicle-card' + selected + '" data-vehicle="' + v.id + '">' +
        '<h4>' + v.name + '</h4>' +
        '<div class="jt-vehicle-price">$' + price.toFixed(2) + '</div>' +
        '<small>Hasta ' + v.capacity + ' pasajeros</small>' +
        '</button>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('.jt-vehicle-card'), function (card) {
      card.addEventListener('click', function () {
        state.selectedVehicleId = card.getAttribute('data-vehicle');
        renderVehicles();
      });
    });

    updateHiddenFields();
  }

  function updateHiddenFields() {
    var vehicle = VEHICLES.find(function (v) { return v.id === state.selectedVehicleId; });
    el('jtSelectedVehicle').value = vehicle ? vehicle.id : '';
    el('jtTransportPrice').value = vehicle ? priceForVehicle(vehicle, state.distanceKm || 0).toFixed(2) : '';
  }

  function renderSuggestions(input, listEl, items, onPick) {
    if (!items.length) {
      listEl.innerHTML = '<li class="no-results">Sin resultados</li>';
      listEl.style.display = 'block';
      return;
    }
    listEl.innerHTML = items.map(function (item, index) {
      return '<li data-index="' + index + '">' + item.display_name + '</li>';
    }).join('');
    listEl.style.display = 'block';

    Array.prototype.forEach.call(listEl.querySelectorAll('li[data-index]'), function (li) {
      li.addEventListener('click', function () {
        var item = items[Number(li.getAttribute('data-index'))];
        onPick(item);
        listEl.style.display = 'none';
      });
    });
  }

  function attachAutocomplete(inputId, mode) {
    var input = el(inputId);
    var wrapper = input.parentElement;
    var list = document.createElement('ul');
    list.className = 'jt-autocomplete-suggestions';
    list.style.display = 'none';
    wrapper.appendChild(list);

    var search = debounce(function (query) {
      if (!query || query.length < 3) { list.style.display = 'none'; return; }
      fetch(NOMINATIM_URL + '/search?format=jsonv2&countrycodes=do&limit=6&q=' + encodeURIComponent(query))
        .then(function (r) { return r.json(); })
        .then(function (items) {
          renderSuggestions(input, list, items || [], function (item) {
            input.value = item.display_name;
            setPoint(mode, { lat: Number(item.lat), lng: Number(item.lon) }, item.display_name);
          });
        })
        .catch(function () { list.style.display = 'none'; });
    }, 400);

    input.addEventListener('input', function () { search(input.value.trim()); });
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) list.style.display = 'none';
    });
  }

  function initControls() {
    el('jtMapMode').addEventListener('change', function () {
      var isPickup = el('jtMapMode').value === 'pickup';
      el('jtMapModeLabel').textContent = isPickup
        ? '📍 Clickea en el mapa para seleccionar SALIDA'
        : '📍 Clickea en el mapa para seleccionar DESTINO';
    });

    el('jtGetCurrentLocationBtn').addEventListener('click', function () {
      if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalizacion');
        return;
      }
      var btn = el('jtGetCurrentLocationBtn');
      btn.disabled = true;
      btn.textContent = '📍 Buscando...';
      navigator.geolocation.getCurrentPosition(function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        el('jtGpsCoordinates').value = lat + ',' + lng;
        reverseGeocode(lat, lng, function (address) {
          setPoint('pickup', { lat: lat, lng: lng }, address);
          btn.disabled = false;
          btn.textContent = '📍 Detectar';
        });
      }, function () {
        alert('No se pudo obtener tu ubicacion');
        btn.disabled = false;
        btn.textContent = '📍 Detectar';
      });
    });

    el('jtDistance').addEventListener('input', function () {
      state.manualDistance = true;
      state.distanceKm = Number(el('jtDistance').value) || 0;
      renderVehicles();
    });

    el('jtPassengers').addEventListener('input', function () {
      state.passengers = Math.max(1, Number(el('jtPassengers').value) || 1);
      renderVehicles();
    });

    attachAutocomplete('jtPickupInput', 'pickup');
    attachAutocomplete('jtDestinationInput', 'destination');
  }

  function getSelectedData() {
    var vehicle = VEHICLES.find(function (v) { return v.id === state.selectedVehicleId; });
    return {
      vehicle: state.selectedVehicleId || '',
      vehicleName: vehicle ? vehicle.name : '',
      distance: state.distanceKm || 0,
      passengers: state.passengers,
      price: vehicle ? priceForVehicle(vehicle, state.distanceKm || 0) : 0,
      pickup: state.pickup ? state.pickup.address : '',
      pickupLat: state.pickup ? state.pickup.lat : null,
      pickupLng: state.pickup ? state.pickup.lng : null,
      destination: state.destination ? state.destination.address : '',
      destinationLat: state.destination ? state.destination.lat : null,
      destinationLng: state.destination ? state.destination.lng : null
    };
  }

  function init() {
    if (!el('jtMap')) return;
    initMap();
    initControls();
    state.passengers = Math.max(1, Number(el('jtPassengers').value) || 1);
    renderVehicles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.trasladosCalc = { getSelectedData: getSelectedData };
})();
