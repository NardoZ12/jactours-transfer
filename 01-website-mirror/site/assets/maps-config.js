// Configuración de Google Maps
// NOTA: API key restringida por dominio en Google Cloud Console
// Incluye: Maps JS, Places, Geocoding, Directions, Distance Matrix y más
const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyBQs1JgAxNdd4ZiDT5OkR9VqOQvLcMc-fQ',
  defaultLocation: {
    lat: 18.7298,
    lng: -86.7325, // Centro de Punta Cana
  },
};

// Ubicaciones comunes en Punta Cana
const COMMON_LOCATIONS = [
  {
    name: 'Punta Cana Resort',
    lat: 18.7298,
    lng: -86.7325,
  },
  {
    name: 'Playa Bávaro',
    lat: 18.8045,
    lng: -86.7485,
  },
  {
    name: 'Aeropuerto Punta Cana',
    lat: 18.7304,
    lng: -86.6784,
  },
  {
    name: 'Casco Viejo - Santo Domingo',
    lat: 18.4861,
    lng: -69.9312,
  },
  {
    name: 'Hotel Barceló',
    lat: 18.8005,
    lng: -86.7565,
  },
  {
    name: 'Club Med',
    lat: 18.8157,
    lng: -86.7648,
  },
  {
    name: 'La Romana',
    lat: 18.6285,
    lng: -68.9696,
  },
];

// Función para cargar Google Maps Script dinámicamente
function loadGoogleMapsScript(callback) {
  if (window.google && window.google.maps) {
    console.log('✅ Google Maps ya estaba cargado');
    callback();
    return;
  }

  // Evitar cargar múltiples veces
  if (window._googleMapsLoading) {
    console.log('⏳ Google Maps ya se está cargando...');
    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkInterval);
        callback();
      }
    }, 100);
    return;
  }

  window._googleMapsLoading = true;
  console.log('📍 Cargando Google Maps API...');

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=places,geometry&language=es&region=DO`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    console.log('✅ Google Maps API cargado correctamente');
    callback();
  };
  script.onerror = () => {
    console.error('❌ Error cargando Google Maps API');
    alert('Error al cargar Google Maps. Por favor recarga la página.');
  };
  document.head.appendChild(script);
}
