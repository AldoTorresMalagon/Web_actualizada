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

    // Estado de la API — ping simple, no necesita servicio
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

/* Estadísticas principales*/
async function cargarEstadisticas() {
    try {
        const headers = AuthUtils.getHeaders();

        // Usar los servicios existentes en paralelo
        const [ventas, usuarios, productos] = await Promise.all([
            CarritoService.getTodasVentas(headers),
            AuthService.getUsuarios(headers),
            ProductosService.getAll(headers),
        ]);

        // Ventas de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const ventasHoy = ventas.filter(v => v.FechaRegistro?.startsWith(hoy));
        document.getElementById('stat-ventas-hoy').textContent = ventasHoy.length;

        // Ingresos del mes
        const mesActual = new Date().toISOString().slice(0, 7);
        const ingresosMes = ventas
            .filter(v => v.FechaRegistro?.startsWith(mesActual))
            .reduce((sum, v) => sum + parseFloat(v.MontoTotal || 0), 0);
        document.getElementById('stat-ingresos-mes').textContent = FormatUtils.moneda(ingresosMes, false);

        // Usuarios activos
        document.getElementById('stat-usuarios').textContent = usuarios.length;

        // Productos con stock bajo (< 10)
        const stockBajo = productos.filter(p => p.Stock < 10).length;
        document.getElementById('stat-stock-bajo').textContent = stockBajo;

    } catch (err) {
        console.error('Error cargando estadísticas:', err);
    }
}

/* Pedidos recientes */
async function cargarPedidosRecientes() {
    const tbody = document.getElementById('tabla-pedidos-recientes');
    try {
        const ventas = await CarritoService.getTodasVentas(AuthUtils.getHeaders());
        const recientes = ventas.slice(0, 8);

        if (!recientes.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No hay pedidos recientes</td></tr>`;
            return;
        }

        tbody.innerHTML = recientes.map(v => {
            const fecha = new Date(v.FechaRegistro);
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
        const ventas = await CarritoService.getTodasVentas(AuthUtils.getHeaders());

        // Contar unidades por producto usando el detalle de las últimas ventas
        const conteo = {};
        await Promise.all(ventas.slice(0, 20).map(async v => {
            try {
                const detalle = await CarritoService.getVentaById(v.idVenta, AuthUtils.getHeaders());
                (detalle.detalle || []).forEach(d => {
                    if (!conteo[d.producto]) conteo[d.producto] = 0;
                    conteo[d.producto] += d.Cantidad;
                });
            } catch { /* ignorar error individual */ }
        }));

        const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (!top.length) {
            tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-muted">Sin datos de ventas</td></tr>`;
            return;
        }

        tbody.innerHTML = top.map(([nombre, total]) => `
            <tr>
                <td>${nombre}</td>
                <td><span class="badge bg-success">${total} unidades</span></td>
            </tr>`).join('');

    } catch {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-danger">Error al cargar datos</td></tr>`;
    }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthUtils.requiereAdmin()) return;

    cargarInfoSistema();
    cargarEstadisticas();
    cargarPedidosRecientes();
    cargarProductosPopulares();

    document.getElementById('btn-actualizar')?.addEventListener('click', () => {
        cargarEstadisticas();
        cargarPedidosRecientes();
        cargarProductosPopulares();
        Toast?.success('Dashboard actualizado');
    });
});