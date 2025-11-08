// Lee el id de la URL
const params = new URLSearchParams(location.search);
const sessionId = params.get('id') || '(sin id)';

const sessionEl = document.getElementById('session');
const statusEl = document.getElementById('status');
sessionEl.textContent = sessionId;

// Mapa Leaflet - Inicializar con vista por defecto
const BOGOTA = [4.7110, -74.0721];
const map = L.map('map', { 
  zoomControl: true,
  // Añadir estas opciones para mejor rendimiento
  preferCanvas: true,
  fadeAnimation: false
});

// Configurar tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, 
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Intentar geolocalización del navegador
let userLocation = BOGOTA;
let locationFound = false;

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = [position.coords.latitude, position.coords.longitude];
      locationFound = true;
      console.log('Ubicación encontrada:', userLocation);
      
      // Centrar mapa en ubicación real
      map.setView(userLocation, 14);
      statusEl.textContent = 'Ubicación detectada - ' + new Date().toLocaleTimeString();
    },
    (error) => {
      console.warn('Error de geolocalización:', error);
      // Usar Bogotá como fallback
      map.setView(BOGOTA, 12);
      statusEl.textContent = 'Usando ubicación por defecto - ' + new Date().toLocaleTimeString();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
} else {
  // Navegador no soporta geolocalización
  map.setView(BOGOTA, 12);
  statusEl.textContent = 'Geolocalización no soportada - ' + new Date().toLocaleTimeString();
}

// Forzar redimensionamiento del mapa después de que todo cargue
window.addEventListener('load', () => {
  setTimeout(() => {
    map.invalidateSize(true);
    map.setView(map.getCenter(), map.getZoom()); // Re-centrar
  }, 100);
});

// También redimensionar cuando cambia el tamaño de la ventana
window.addEventListener('resize', () => {
  map.invalidateSize(true);
});

const marker = L.marker(userLocation).addTo(map);
const poly = L.polyline([], { 
  weight: 4,
  color: '#1c4d6b',
  opacity: 0.8
}).addTo(map);

// Firestore
const db = window.__mura_db;
const { doc, collection, onSnapshot, query, orderBy, limit } = window.__mura_firestore;

// Función para actualizar el mapa con nueva posición
function updateMapPosition(lat, lng) {
  const newPos = [lat, lng];
  marker.setLatLng(newPos);
  
  // Solo centrar automáticamente si el usuario no ha movido el mapa manualmente
  const currentCenter = map.getCenter();
  const distance = map.distance(currentCenter, newPos);
  
  // Si está lejos del marcador, centrar (umbral de ~2km)
  if (distance > 2000) {
    map.setView(newPos, map.getZoom(), { 
      animate: true,
      duration: 1.0
    });
  }
  
  statusEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString();
}

// Función para actualizar la polyline
function updatePolyline(positions) {
  poly.setLatLngs(positions);
}

if (sessionId && sessionId !== '(sin id)') {
  const sessRef = doc(db, 'sessions', sessionId);
  const posCol = collection(sessRef, 'positions');

  console.log('Escuchando sesión:', sessionId);

  // 1) Escucha la última posición para mover marcador
  onSnapshot(sessRef, (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      console.log('Datos de sesión:', d);
      
      if (d?.lastLat && d?.lastLng) {
        updateMapPosition(d.lastLat, d.lastLng);
      }
    } else {
      console.warn('Sesión no encontrada en Firestore');
      statusEl.textContent = 'Sesión no encontrada - ' + new Date().toLocaleTimeString();
    }
  }, (error) => {
    console.error('Error escuchando sesión:', error);
    statusEl.textContent = 'Error conectando a Firestore';
  });

  // 2) Escucha el historial para dibujar la ruta (últimos 500 puntos)
  const q = query(posCol, orderBy('ts', 'asc'), limit(500));
  onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const pts = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.lat && d.lng) pts.push([d.lat, d.lng]);
      });
      console.log('Puntos de ruta cargados:', pts.length);
      updatePolyline(pts);
    } else {
      console.log('No hay puntos de posición aún');
    }
  }, (error) => {
    console.error('Error escuchando posiciones:', error);
  });
} else {
  console.warn('No hay sessionId válido');
  statusEl.textContent = 'Esperando sessionId...';
}

// Controles
document.getElementById('center').addEventListener('click', () => {
  const markerPos = marker.getLatLng();
  if (markerPos) {
    map.setView(markerPos, Math.max(map.getZoom(), 14), { 
      animate: true,
      duration: 1.0
    });
  }
});

document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    const originalText = statusEl.textContent;
    statusEl.textContent = '✓ Enlace copiado';
    setTimeout(() => statusEl.textContent = originalText, 2000);
  } catch {
    statusEl.textContent = '❌ No se pudo copiar';
  }
});

document.getElementById('end').addEventListener('click', () => {
  statusEl.textContent = 'Sesión (demo): este botón no corta el envío desde el teléfono.';
});

// Debug: información del mapa
setTimeout(() => {
  console.log('Estado del mapa:', {
    center: map.getCenter(),
    zoom: map.getZoom(),
    size: map.getSize(),
    container: document.getElementById('map').getBoundingClientRect()
  });
}, 1000);

// Después de tu código existente, añade:
console.log('=== DEBUG FIREBASE ===');

// Verificar la configuración
console.log('Firebase config cargada:', !!window.__mura_db);
console.log('Session ID:', sessionId);

// Función para verificar manualmente los datos
async function checkFirestoreData() {
  try {
    const db = window.__mura_db;
    const { doc, getDoc, collection, getDocs } = window.__mura_firestore;
    
    // Verificar sesión
    const sessRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessRef);
    console.log('📋 Sesión en Firestore:', sessionSnap.exists() ? sessionSnap.data() : 'NO EXISTE');
    
    // Verificar posiciones
    const posCol = collection(sessRef, 'positions');
    const positionsSnap = await getDocs(posCol);
    console.log('📍 Número de posiciones:', positionsSnap.size);
    
    positionsSnap.forEach(doc => {
      console.log('   Posición:', doc.id, doc.data());
    });
    
  } catch (error) {
    console.error('❌ Error verificando Firestore:', error);
  }
}

// Ejecutar después de 3 segundos para dar tiempo a la carga
setTimeout(checkFirestoreData, 3000);

// Verificar soporte de geolocalización
console.log('🌍 Geolocalización soportada:', !!navigator.geolocation);

// Probar geolocalización manualmente
function testGeolocation() {
  if (!navigator.geolocation) {
    console.log('❌ Geolocalización NO soportada');
    return;
  }
  
  console.log('🔍 Probando geolocalización...');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('✅ Geolocalización exitosa:');
      console.log('   Lat:', position.coords.latitude);
      console.log('   Lng:', position.coords.longitude);
      console.log('   Precisión:', position.coords.accuracy + 'm');
    },
    (error) => {
      console.log('❌ Error geolocalización:');
      switch(error.code) {
        case error.PERMISSION_DENIED:
          console.log('   Permiso denegado por el usuario');
          break;
        case error.POSITION_UNAVAILABLE:
          console.log('   Posición no disponible');
          break;
        case error.TIMEOUT:
          console.log('   Timeout');
          break;
        default:
          console.log('   Error desconocido:', error);
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Ejecutar test
setTimeout(testGeolocation, 2000);
