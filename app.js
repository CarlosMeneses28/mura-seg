// Lee el id de la URL y prepara estado UI
const params = new URLSearchParams(location.search);
const sessionId = params.get('id') || '(sin id)';
const sessionEl = document.getElementById('session');
const statusEl = document.getElementById('status');
sessionEl.textContent = sessionId;

// ---- Mapa Leaflet -------------------------------------
// Bogotá por defecto
const BOGOTA = [4.7110, -74.0721];

const map = L.map('map', { zoomControl: true });
map.setView(BOGOTA, 14);

// Capa base (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Asegura que Leaflet re-calcula el tamaño una vez que todo cargó
setTimeout(() => map.invalidateSize(), 0);
window.addEventListener('resize', () => map.invalidateSize());

// Marcador del usuario + ruta
const marker = L.marker(BOGOTA).addTo(map);
const path = [BOGOTA];
const poly = L.polyline(path, { weight: 4 }).addTo(map);

// ---- Simulación de movimiento --------------------------
function makeRoute(origin, steps = 40, delta = 0.0008) {
  const pts = [];
  let last = origin.slice();
  for (let i = 0; i < steps; i++) {
    const dx = (Math.random() - 0.5) * delta;
    const dy = (Math.random() - 0.5) * delta;
    last = [last[0] + dx, last[1] + dy];
    pts.push(last);
  }
  return pts;
}

let simulated = makeRoute(BOGOTA);

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
  const p = marker.getLatLng();
  map.setView(p, map.getZoom(), { animate: true });
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
