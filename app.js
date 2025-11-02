// Lee el id de la URL y prepara estado UI
const params = new URLSearchParams(location.search);
const sessionId = params.get('id') || '(sin id)';
const sessionEl = document.getElementById('session');
const statusEl = document.getElementById('status');
sessionEl.textContent = sessionId;

// ---- Mapa Leaflet -------------------------------------
const map = L.map('map', { zoomControl: true });

// Punto inicial (CDMX centro) — puedes cambiarlo
const start = [19.4326, -99.1332];
map.setView(start, 14);

// Capa base (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Marcador del usuario + ruta
const marker = L.marker(start).addTo(map);
const path = [start];
const poly = L.polyline(path, { weight: 4 }).addTo(map);

// ---- Simulación de movimiento --------------------------
// Crea una “ruta” corta alrededor del punto inicial
function makeRoute(origin, steps = 40, delta = 0.0008) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const dx = (Math.random() - 0.5) * delta;
    const dy = (Math.random() - 0.5) * delta;
    origin = [origin[0] + dx, origin[1] + dy];
    pts.push(origin);
  }
  return pts;
}

let simulated = makeRoute(start);

// Avanza el marcador cada N ms
let i = 0;
const intervalMs = 1200;
let timer = setInterval(() => {
  if (i >= simulated.length) {
    clearInterval(timer);
    statusEl.textContent = 'Sesión finalizada (recorrido simulado)';
    return;
  }
  const p = simulated[i++];
  marker.setLatLng(p);
  path.push(p);
  poly.setLatLngs(path);
  statusEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString();
}, intervalMs);

// ---- Controles ----------------------------------------
document.getElementById('center').addEventListener('click', () => {
  map.panTo(marker.getLatLng());
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
  clearInterval(timer);
  statusEl.textContent = 'Seguimiento terminado por el usuario (demo)';
});
