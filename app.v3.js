// Lee el id de la URL
const params = new URLSearchParams(location.search);
const sessionId = params.get('id') || '(sin id)';

const sessionEl = document.getElementById('session');
const statusEl = document.getElementById('status');
sessionEl.textContent = sessionId;

// Mapa Leaflet - Inicializar con vista por defecto (Bogotá como fallback)
const BOGOTA = [4.7110, -74.0721];
let map, marker, poly;

// Función para inicializar el mapa de forma segura
function initializeMap(center, zoom) {
    console.log('🗺️ Inicializando mapa en ubicación por defecto');
    
    map = L.map('map', { 
        zoomControl: true,
        preferCanvas: true
    }).setView(center, zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, 
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    marker = L.marker(center).addTo(map);
    poly = L.polyline([], { 
        weight: 4,
        color: '#1c4d6b',
        opacity: 0.8
    }).addTo(map);
    
    console.log('✅ Mapa inicializado correctamente');
    return map;
}

// Firestore
const db = window.__mura_db;
const { doc, collection, onSnapshot, query, orderBy, limit } = window.__mura_firestore;

// Función para actualizar el mapa con nueva posición de la persona en emergencia
function updateMapPosition(lat, lng) {
    const newPos = [lat, lng];
    console.log('📍 Actualizando posición de la persona en emergencia:', newPos);
    
    if (marker) {
        marker.setLatLng(newPos);
    }
    
    if (map) {
        // SIEMPRE centrar en la persona en emergencia (no en el visor)
        console.log('🎯 Centrando mapa en persona en emergencia');
        map.setView(newPos, Math.max(map.getZoom(), 14), { 
            animate: true,
            duration: 1.0
        });
    }
    
    statusEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString();
}

// Función para actualizar la polyline
function updatePolyline(positions) {
    if (poly) {
        console.log('🔄 Actualizando ruta con', positions.length, 'puntos');
        poly.setLatLngs(positions);
        
        // Si hay posiciones, centrar en la última (más reciente)
        if (positions.length > 0) {
            const lastPosition = positions[positions.length - 1];
            if (map) {
                map.setView(lastPosition, Math.max(map.getZoom(), 14));
            }
        }
    }
}

// Función para inicializar Firestore
function initializeFirestore() {
    if (sessionId && sessionId !== '(sin id)') {
        const sessRef = doc(db, 'sessions', sessionId);
        const posCol = collection(sessRef, 'positions');

        console.log('📡 Escuchando sesión en Firestore:', sessionId);

        // 1) Escucha la última posición para mover marcador
        onSnapshot(sessRef, (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                console.log('📋 Datos de sesión recibidos:', d);
                
                if (d?.lastLat && d?.lastLng) {
                    updateMapPosition(d.lastLat, d.lastLng);
                } else {
                    console.log('ℹ️ Sesión sin coordenadas aún');
                    statusEl.textContent = 'Esperando primera ubicación...';
                }
            } else {
                console.warn('❌ Sesión no encontrada en Firestore');
                statusEl.textContent = 'Sesión no encontrada - ' + new Date().toLocaleTimeString();
            }
        }, (error) => {
            console.error('💥 Error escuchando sesión:', error);
            statusEl.textContent = 'Error conectando a Firestore - ' + new Date().toLocaleTimeString();
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
                console.log('🔄 Puntos de ruta cargados:', pts.length);
                updatePolyline(pts);
            } else {
                console.log('ℹ️ No hay puntos de posición aún');
                statusEl.textContent = 'Esperando ubicación de la persona...';
            }
        }, (error) => {
            console.error('💥 Error escuchando posiciones:', error);
        });
    } else {
        console.warn('⚠️ No hay sessionId válido');
        statusEl.textContent = 'Enlace inválido - falta sessionId';
    }
}

// Inicialización principal - SIN geolocalización del visor
function initializeApp() {
    console.log('🚀 Iniciando aplicación en modo VISOR');
    
    // Inicializar mapa con ubicación por defecto (NO con geolocalización del visor)
    initializeMap(BOGOTA, 12);
    statusEl.textContent = 'Conectando... - ' + new Date().toLocaleTimeString();
    
    // Inicializar Firestore para seguir a la persona en emergencia
    initializeFirestore();
}

// Forzar redimensionamiento después de que todo cargue
window.addEventListener('load', () => {
    console.log('🚀 Página completamente cargada');
    setTimeout(() => {
        if (map) {
            map.invalidateSize(true);
            console.log('♻️ Mapa redimensionado');
        }
    }, 100);
});

// También redimensionar cuando cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    if (map) {
        map.invalidateSize(true);
        console.log('📏 Mapa ajustado al nuevo tamaño');
    }
});

// Controles
document.getElementById('center').addEventListener('click', () => {
    if (map && marker) {
        const markerPos = marker.getLatLng();
        if (markerPos) {
            console.log('🎯 Centrando en persona en emergencia:', markerPos);
            map.setView(markerPos, Math.max(map.getZoom(), 14), { 
                animate: true,
                duration: 1.0
            });
        }
    }
});

document.getElementById('copy').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(location.href);
        const originalText = statusEl.textContent;
        statusEl.textContent = '✓ Enlace copiado';
        setTimeout(() => statusEl.textContent = originalText, 2000);
        console.log('📋 Enlace copiado al portapapeles');
    } catch {
        statusEl.textContent = '❌ No se pudo copiar';
        console.error('❌ Error copiando enlace');
    }
});

document.getElementById('end').addEventListener('click', () => {
    statusEl.textContent = 'Sesión (demo): este botón no corta el envío desde el teléfono.';
    console.log('⏹️ Botón de terminar seguimiento presionado (demo)');
});

// Iniciar la aplicación
console.log('🚀 Iniciando aplicación MÜRA en modo VISOR...');
initializeApp();
