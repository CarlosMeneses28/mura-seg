// Lee el id de la URL
const params = new URLSearchParams(location.search);
const sessionId = params.get('id') || '(sin id)';

const sessionEl = document.getElementById('session');
const statusEl = document.getElementById('status');
sessionEl.textContent = sessionId;

// Mapa Leaflet
const BOGOTA = [4.7110, -74.0721];
const map = L.map('map', { zoomControl: true });
map.setView(BOGOTA, 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);
setTimeout(() => map.invalidateSize(), 0);

const marker = L.marker(BOGOTA).addTo(map);
const poly = L.polyline([], { weight: 4 }).addTo(map);

// Firestore
const db = window.__mura_db;
const { doc, collection, onSnapshot, query, orderBy, limit } = window.__mura_firestore;

if (sessionId && sessionId !== '(sin id)') {
  const sessRef = doc(db, 'sessions', sessionId);
  const posCol = collection(sessRef, 'positions');

  // 1) Escucha la última posición para mover marcador
  onSnapshot(sessRef, (snap) => {
    const d = snap.data();
    if (d?.lastLat && d?.lastLng) {
      const p = [d.lastLat, d.lastLng];
      marker.setLatLng(p);
      map.setView(p, map.getZoom(), { animate: true });
      statusEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString();
    }
  });

  // 2) Escucha el historial para dibujar la ruta (últimos 500 puntos)
  const q = query(posCol, orderBy('ts', 'asc'), limit(500));
  onSnapshot(q, (snap) => {
    const pts = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.lat && d.lng) pts.push([d.lat, d.lng]);
    });
    poly.setLatLngs(pts);
  });
}

// Controles
document.getElementById('center').addEventListener('click', () => {
  map.setView(marker.getLatLng(), map.getZoom(), { animate: true });
});

document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    statusEl.textContent = 'Enlace copiado';
    setTimeout(() => statusEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString(), 1200);
  } catch {
    statusEl.textContent = 'No se pudo copiar';
  }
});

document.getElementById('end').addEventListener('click', () => {
  statusEl.textContent = 'Sesión (demo): este botón no corta el envío desde el teléfono.';
});
