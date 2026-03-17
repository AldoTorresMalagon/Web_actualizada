/* Helper UI */
function setBtnLoading(btnId, activo, textoOriginal) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = activo;
    btn.innerHTML = activo
        ? `<span class="spinner-border spinner-border-sm me-2"></span>Generando...`
        : textoOriginal;
}

/* Cargar estadísticas generales */
async function cargarEstadisticas() {
    try {
        const headers = AuthUtils.getHeaders();
        // Cargar ventas, productos y usuarios en paralelo con los servicios
        const [ventas, productos, usuarios] = await Promise.all([
            CarritoService.getTodasVentas(headers),
            ProductosService.getAll(headers),
            AuthService.getUsuarios(headers),
        ]);

        // Ventas de hoy usando FechaRegistro
        const hoy = new Date().toDateString();
        const ventasHoy = ventas.filter(v => new Date(v.FechaRegistro).toDateString() === hoy);

        const totalIngresos = ventas.reduce((sum, v) => sum + parseFloat(v.MontoTotal || 0), 0);
        const promedio = ventas.length ? totalIngresos / ventas.length : 0;

        // Producto más vendido — ventas tiene el cliente pero no el detalle de productos
        document.getElementById('stat-total-ventas').textContent = ventas.length;
        document.getElementById('stat-ingresos').textContent = FormatUtils.moneda(totalIngresos, false);
        document.getElementById('stat-promedio').textContent = FormatUtils.moneda(promedio, false);
        document.getElementById('stat-producto-estrella').textContent = '—'; // requiere detalle

        return { ventas, productos, usuarios };
    } catch (err) {
        console.error('Error cargando estadísticas:', err);
        return { ventas: [], productos: [], usuarios: [] };
    }
}

/* Generar reporte filtrado */
async function generarReporte() {
    const tipo = document.getElementById('filtro-tipo').value;
    const fechaInicio = document.getElementById('filtro-fecha-inicio').value;
    const fechaFin = document.getElementById('filtro-fecha-fin').value;

    setBtnLoading('btn-generar-reporte', true, '<i class="bi bi-bar-chart me-1"></i>Generar Reporte');
    try {
        let ventas = await CarritoService.getTodasVentas(AuthUtils.getHeaders());

        // Filtrar por fechas usando FechaRegistro
        if (fechaInicio)
            ventas = ventas.filter(v => new Date(v.FechaRegistro) >= new Date(fechaInicio));
        if (fechaFin)
            ventas = ventas.filter(v => new Date(v.FechaRegistro) <= new Date(fechaFin + 'T23:59:59'));

        renderReporte(tipo, ventas);
    } catch (err) {
        Toast?.error('Error al generar reporte: ' + err.message);
    } finally {
        setBtnLoading('btn-generar-reporte', false, '<i class="bi bi-bar-chart me-1"></i>Generar Reporte');
    }
}

/* Renderizar tabla del reporte */
function renderReporte(tipo, ventas) {
    const contenedor = document.getElementById('contenedor-reporte') || crearContenedor();
    if (!contenedor) return;

    const titulos = {
        ventas: 'Reporte de Ventas',
        productos: 'Productos más Vendidos',
        ingresos: 'Reporte de Ingresos',
    };
    const tituloEl = document.getElementById('grafica-titulo');
    if (tituloEl) tituloEl.textContent = titulos[tipo] || 'Reporte';

    if (tipo === 'ventas') {
        contenedor.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead><tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                </tr></thead>
                <tbody>
                ${ventas.length
                ? ventas.slice(0, 50).map(v => `
                        <tr>
                            <td>#${v.idVenta}</td>
                            <td>${v.cliente || 'Sin nombre'}</td>
                            <td>${FormatUtils.badgePrecio(v.MontoTotal)}</td>
                            <td>${FormatUtils.badgeEstadoVenta(v.estado)}</td>
                            <td>${FormatUtils.fechaCorta(v.FechaRegistro)}</td>
                        </tr>`).join('')
                : '<tr><td colspan="5" class="text-center text-muted py-3">Sin datos para el período</td></tr>'
            }
                </tbody>
            </table>
        </div>`;

    } else if (tipo === 'ingresos') {
        const total = ventas.reduce((s, v) => s + parseFloat(v.MontoTotal || 0), 0);
        const completadas = ventas.filter(v => v.estado === 'Completada');
        const ingresoReal = completadas.reduce((s, v) => s + parseFloat(v.MontoTotal || 0), 0);
        const canceladas = ventas.filter(v => v.estado === 'Cancelada').length;

        contenedor.innerHTML = `
        <div class="row g-3 text-center">
            <div class="col-md-3">
                <div class="card border-0 bg-light p-3">
                    <h3 class="text-primary">${FormatUtils.moneda(total, false)}</h3>
                    <p class="mb-0 text-muted">Total bruto</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 bg-light p-3">
                    <h3 class="text-success">${FormatUtils.moneda(ingresoReal, false)}</h3>
                    <p class="mb-0 text-muted">Ingresos reales</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 bg-light p-3">
                    <h3 class="text-info">${ventas.length}</h3>
                    <p class="mb-0 text-muted">Transacciones</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 bg-light p-3">
                    <h3 class="text-danger">${canceladas}</h3>
                    <p class="mb-0 text-muted">Canceladas</p>
                </div>
            </div>
        </div>`;

    } else if (tipo === 'productos') {
        // Para top productos necesitamos el detalle de cada venta, lo cual puede ser costoso. Mostramos un spinner mientras se carga.
        contenedor.innerHTML = `
        <div class="text-center py-4 text-muted">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Calculando productos más vendidos...
        </div>`;
        cargarTopProductos(ventas, contenedor);
    }
}

/* Top productos */
async function cargarTopProductos(ventas, contenedor) {
    try {
        const conteo = {};
        await Promise.all(ventas.slice(0, 30).map(async v => {
            try {
                const detalle = await CarritoService.getVentaById(v.idVenta, AuthUtils.getHeaders());
                (detalle.detalle || []).forEach(d => {
                    if (!conteo[d.producto]) conteo[d.producto] = 0;
                    conteo[d.producto] += d.Cantidad;
                });
            } catch { /* ignorar error individual */ }
        }));

        const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 10);

        contenedor.innerHTML = top.length ? `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead><tr><th>#</th><th>Producto</th><th>Unidades vendidas</th></tr></thead>
                <tbody>
                ${top.map(([nombre, total], i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${nombre}</td>
                        <td><span class="badge bg-success">${total} unidades</span></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : `<p class="text-center text-muted py-3">Sin datos de ventas</p>`;

        // Actualizar el stat de producto estrella
        if (top.length) {
            const el = document.getElementById('stat-producto-estrella');
            if (el) el.textContent = top[0][0];
        }
    } catch (err) {
        contenedor.innerHTML = `<p class="text-danger text-center py-3">Error al cargar productos: ${err.message}</p>`;
    }
}

function crearContenedor() {
    const card = document.querySelector('.card-body');
    if (!card) return null;
    const div = document.createElement('div');
    div.id = 'contenedor-reporte';
    div.className = 'mt-4';
    card.appendChild(div);
    return div;
}

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await cargarEstadisticas();

    document.getElementById('btn-generar-reporte')?.addEventListener('click', generarReporte);
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', () => {
        Toast?.info('Función de exportar PDF próximamente');
    });
    document.getElementById('btn-exportar-excel')?.addEventListener('click', () => {
        Toast?.info('Función de exportar Excel próximamente');
    });
});