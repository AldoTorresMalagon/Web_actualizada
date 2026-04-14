/* Información del sistema */
function cargarInfoSistema() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    document.getElementById('sys-usuario').textContent = user?.nombre || user?.Nombre || 'Usuario';
    document.getElementById('sys-rol').textContent = user?.rol || '—';
    document.getElementById('sys-version').textContent = 'v1.0.0';

    // Navegador
    const ua = navigator.userAgent;
    let browser = 'Desconocido';
    if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Opera')) browser = 'Opera';
    document.getElementById('sys-browser').textContent = browser;

    // Entorno
    const host = window.location.hostname;
    document.getElementById('sys-entorno').textContent =
        (host === '127.0.0.1' || host === 'localhost') ? 'Desarrollo' : 'Producción';

    // Reloj en tiempo real
    function actualizarReloj() {
        document.getElementById('sys-fecha').textContent = FormatUtils.fechaActual();
        document.getElementById('sys-hora').textContent = FormatUtils.horaActual();
    }
    actualizarReloj();
    setInterval(actualizarReloj, 1000);

    // Estado de la API — ping simple
    fetch(`${API_CONFIG.BASE_URL}/productos?limit=1`)
        .then(r => {
            document.getElementById('sys-api-status').innerHTML = r.ok
                ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>En línea</span>'
                : '<span class="badge bg-warning text-dark">Respuesta anormal</span>';
        })
        .catch(() => {
            document.getElementById('sys-api-status').innerHTML =
                '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Sin conexión</span>';
        });
}

/* Estadísticas principales
 * Usa /api/reportes/resumen en lugar de traer todas las ventas al frontend.
 * Mucho más eficiente: la BD hace los cálculos, no el navegador.
 */
async function cargarEstadisticas() {
    try {
        const headers = AuthUtils.getHeaders();
        const hoy = new Date().toISOString().split('T')[0];
        const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0];

        // KPIs del día, del mes, usuarios y stock crítico — todo en paralelo
        const [resumenHoy, resumenMes, usuarios, stockData] = await Promise.all([
            fetch(`${API_CONFIG.BASE_URL}/reportes/resumen?desde=${hoy}&hasta=${hoy}`,
                { headers }).then(r => r.json()),
            fetch(`${API_CONFIG.BASE_URL}/reportes/resumen?desde=${primerDiaMes}&hasta=${hoy}`,
                { headers }).then(r => r.json()),
            AuthService.getUsuarios(headers),
            fetch(`${API_CONFIG.BASE_URL}/reportes/stock-critico?umbral=10`,
                { headers }).then(r => r.json()),
        ]);

        const hoyData = resumenHoy.data?.actual || {};
        const mesData = resumenMes.data?.actual || {};

        // Ventas de hoy (todas las registradas, incluye pendientes)
        document.getElementById('stat-ventas-hoy').textContent =
            hoyData.totalVentas ?? '—';

        // Ticket promedio del día (solo completadas)
        const elTicket = document.getElementById('stat-ticket-promedio');
        if (elTicket) elTicket.textContent =
            hoyData.ticketPromedio
                ? FormatUtils.moneda(hoyData.ticketPromedio, false)
                : '$0.00';

        // Cancelaciones del día
        const elCancel = document.getElementById('stat-cancelaciones');
        if (elCancel) elCancel.textContent = hoyData.canceladas ?? '—';

        // Ingresos del mes (solo ventas completadas)
        document.getElementById('stat-ingresos-mes').textContent =
            FormatUtils.moneda(mesData.totalIngresos || 0, false);

        // Usuarios activos
        document.getElementById('stat-usuarios').textContent = usuarios.length;

        // Productos con stock bajo
        document.getElementById('stat-stock-bajo').textContent =
            stockData.data?.stockBajo?.length ?? '—';

    } catch (err) {
        console.error('Error cargando estadísticas:', err);
    }
}

/* Pedidos recientes — solo los 8 más recientes via paginación */
async function cargarPedidosRecientes() {
    const tbody = document.getElementById('tabla-pedidos-recientes');
    try {
        const resultado = await CarritoService.getVentasPaginadas(
            AuthUtils.getHeaders(), 1, 8
        );
        const recientes = resultado.items || [];

        if (!recientes.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No hay pedidos recientes</td></tr>`;
            return;
        }

        tbody.innerHTML = recientes.map(v => {
            const fecha = new Date(v.FechaRegistro?.replace(' ', 'T'));
            const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
            const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            return `
            <tr>
                <td><strong>#${v.idVenta}</strong></td>
                <td>${v.cliente || '—'}</td>
                <td>${FormatUtils.badgePrecio(v.MontoTotal)}</td>
                <td><span class="badge" style="background:${v.colorEstado || '#6c757d'}">${v.estado || '—'}</span></td>
                <td class="text-muted small">${fechaStr} ${horaStr}</td>
            </tr>`;
        }).join('');

    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Error al cargar pedidos</td></tr>`;
    }
}

/* Productos más vendidos */
async function cargarProductosPopulares() {
    const tbody = document.getElementById('tabla-productos-populares');
    try {
        const top = await CarritoService.getTopProductos(AuthUtils.getHeaders(), 5);

        if (!top.length) {
            tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-muted">Sin datos de ventas</td></tr>`;
            return;
        }

        tbody.innerHTML = top.map(p => `
            <tr>
                <td>${p.producto}</td>
                <td><span class="badge bg-success">${p.totalVendido} unidades</span></td>
            </tr>`).join('');

    } catch {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-danger">Error al cargar datos</td></tr>`;
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthUtils.requiereAdmin()) return;

    cargarInfoSistema();
    cargarEstadisticas();
    cargarPedidosRecientes();
    cargarProductosPopulares();

    // Generar alertas automáticas (no bloqueante)
    fetch(`${API_CONFIG.BASE_URL}/notificaciones/generar-alertas`, {
        method: 'POST',
        headers: AuthUtils.getHeaders(),
    }).catch(() => { /* silencioso */ });

    document.getElementById('btn-actualizar')?.addEventListener('click', () => {
        cargarEstadisticas();
        cargarPedidosRecientes();
        cargarProductosPopulares();
        Toast.success('Dashboard actualizado');
    });
});