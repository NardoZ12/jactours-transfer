// Configuración de Google Maps
// NOTA: Estas keys están restringidas por dominio en Google Cloud Console
const GOOGLE_MAPS_CONFIG = {
  mapsApiKey: 'AIzaSyBQs1JgAxNdd4ZiDT5OkR9VqOQvLcMc-fQ',
  placesApiKey: 'AIzaSyBCM6sOhI8MgNcKdchLqg1LZWs4DPm5fAo',
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
    // Ya está cargado
    callback();
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.mapsApiKey}&libraries=places,geometry&language=es&region=DO`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  script.onerror = () => {
    console.error('Error cargando Google Maps');
  };
  document.head.appendChild(script);
}
