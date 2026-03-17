// Coordenadas del ITH
const ITH_LAT = 21.153678;
const ITH_LNG = -98.370479;
const ITH_ZOOM = 17;

/* Inicializar mapa Leaflet */
function initMapa() {
    const mapa = L.map('mapa-ith').setView([ITH_LAT, ITH_LNG], ITH_ZOOM);

    // Capa de tiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(mapa);

    // Marcador personalizado
    const iconoCafeteria = L.divIcon({
        className: '',
        html: `<div style="
            background: #0d6efd;
            border: 3px solid #fff;
            border-radius: 50% 50% 50% 0;
            width: 36px; height: 36px;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;">
            <span style="transform: rotate(45deg); color: #fff; font-size: 16px;">☕</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
    });

    const marcador = L.marker([ITH_LAT, ITH_LNG], { icon: iconoCafeteria }).addTo(mapa);

    marcador.bindPopup(`
        <div style="min-width: 180px; text-align: center;">
            <strong style="color: #0d6efd;">☕ Cafetería ITH</strong><br>
            <small class="text-muted">Instituto Tecnológico de Huejutla</small><br>
            <small>Huejutla de Reyes, Hidalgo</small>
        </div>
    `, { maxWidth: 220 }).openPopup();

    return mapa;
}

/* Formatear hora de 24h a 12h */
function formatHora(timeStr) {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* Verificar si está abierto ahora */
function verificarEstado(apertura, cierre, dias) {
    try {
        const ahora = new Date();
        const diaSem = ahora.getDay(); // 0=Dom, 1=Lun ... 6=Sab

        // Detectar si hoy aplica según dias_servicio
        const diasTexto = (dias || '').toLowerCase();
        let diaAplica = false;

        if (diasTexto.includes('lunes a viernes') || diasTexto.includes('lun') && diasTexto.includes('vie')) {
            diaAplica = diaSem >= 1 && diaSem <= 5;
        } else if (diasTexto.includes('lunes a sábado') || diasTexto.includes('lun') && diasTexto.includes('sáb')) {
            diaAplica = diaSem >= 1 && diaSem <= 6;
        } else if (diasTexto.includes('todos') || diasTexto.includes('diario')) {
            diaAplica = true;
        } else {
            // Fallback: asumir lunes a viernes
            diaAplica = diaSem >= 1 && diaSem <= 5;
        }

        if (!diaAplica) return { abierto: false, msg: 'Hoy no hay servicio' };

        // Comparar hora actual con horario
        const [hA, mA] = (apertura || '07:00').split(':').map(Number);
        const [hC, mC] = (cierre || '21:00').split(':').map(Number);
        const minActual = ahora.getHours() * 60 + ahora.getMinutes();
        const minApertura = hA * 60 + mA;
        const minCierre = hC * 60 + mC;

        if (minActual >= minApertura && minActual < minCierre) {
            const minRestantes = minCierre - minActual;
            const hRestantes = Math.floor(minRestantes / 60);
            const mRestantes = minRestantes % 60;
            const tiempoMsg = hRestantes > 0
                ? `Cierra en ${hRestantes}h ${mRestantes}m`
                : `Cierra en ${mRestantes} min`;
            return { abierto: true, msg: tiempoMsg };
        } else if (minActual < minApertura) {
            return { abierto: false, msg: `Abre a las ${formatHora(apertura)}` };
        } else {
            return { abierto: false, msg: 'Cerrado por hoy' };
        }
    } catch {
        return { abierto: false, msg: 'Horario no disponible' };
    }
}

/* Poblar datos desde API */
async function cargarInfo() {
    try {
        const res = { ok: true, json: async () => ({ data: await AcercaService.get() }) };
        const json = await res.json();
        if (!json.success) return;

        const d = json.data;

        // Dirección
        document.getElementById('info-direccion').textContent = d.direccion || 'Instituto Tecnológico de Huejutla, Hidalgo';

        // Link Google Maps con dirección real
        document.getElementById('link-maps').href = `https://maps.google.com/?q=21.153678,-98.370479`;

        // Horario
        document.getElementById('info-dias').textContent = d.dias_servicio || '—';
        document.getElementById('info-horas').textContent =
            `${formatHora(d.horario_apertura)} – ${formatHora(d.horario_cierre)}`;

        // Estado abierto/cerrado
        const estado = verificarEstado(d.horario_apertura, d.horario_cierre, d.dias_servicio);
        const iconEl = document.getElementById('estado-icon');
        const txtEl = document.getElementById('estado-texto');

        if (estado.abierto) {
            iconEl.style.color = '#198754';
            txtEl.className = 'estado-abierto';
            txtEl.textContent = `Abierto ahora · ${estado.msg}`;
        } else {
            iconEl.style.color = '#dc3545';
            txtEl.className = 'estado-cerrado';
            txtEl.textContent = `Cerrado · ${estado.msg}`;
        }

        // Contacto
        if (d.telefono) {
            document.getElementById('info-telefono').textContent = d.telefono;
            document.getElementById('link-telefono').href = `tel:${d.telefono}`;
        }
        if (d.email) {
            document.getElementById('info-email').textContent = d.email;
            document.getElementById('link-email').href = `mailto:${d.email}`;
        }

    } catch {
        document.getElementById('info-direccion').textContent = 'Instituto Tecnológico de Huejutla, Hidalgo';
    }
}

/* Init*/
document.addEventListener('DOMContentLoaded', () => {
    initMapa();
    cargarInfo();
});