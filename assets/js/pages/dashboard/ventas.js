let estadosDisponibles = [];
let metodosPago = [];
let carritoVenta = [];
let paginaActual = 1;
let totalVentas = 0;
let totalPaginas = 0;
let filtroEstado = '';
let filtroBusqueda = '';
const POR_PAGINA = 10;

/* Helpers UI */
function setLoading(tbodyId, cols) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4 text-muted">
        <span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>`;
}
function setError(tbodyId, cols, msg) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4 text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>${msg}</td></tr>`;
}
function setBtnLoading(btnId, activo, textoOriginal) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = activo;
    btn.innerHTML = activo
        ? `<span class="spinner-border spinner-border-sm me-2"></span>Procesando...`
        : textoOriginal;
}

/* Cargar estados y métodos de pago
 * IMPORTANTE: debe completarse ANTES de cargar ventas,
 * para que renderTabla tenga estadosDisponibles llenos.
 */
async function cargarCatalogos() {
    try {
        // Estados
        const resEstados = await fetch(`${API_CONFIG.BASE_URL}/ventas/estados`, {
            headers: AuthUtils.getHeaders(),
        });
        const dataEstados = await resEstados.json();
        estadosDisponibles = dataEstados.data || [];

        // Poblar filtro de estados del encabezado
        const filtro = document.getElementById('filtro-estado');
        if (filtro) {
            filtro.innerHTML = '<option value="">Todos los estados</option>';
            estadosDisponibles.forEach(e => {
                filtro.innerHTML += `<option value="${e.nombre_estado}">${e.nombre_estado}</option>`;
            });
        }

        // Métodos de pago
        metodosPago = await CarritoService.getMetodosPago(AuthUtils.getHeaders());
        const sel = document.getElementById('metodo-pago-venta');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccionar método</option>';
            metodosPago.forEach(m => {
                sel.innerHTML += `<option value="${m.nombre_metodo}">${m.nombre_metodo}</option>`;
            });
        }
    } catch (err) {
        console.error('Error cargando catálogos:', err);
    }
}

/* Cargar ventas de la página actual desde el servidor */
async function cargarVentas(pagina = 1) {
    setLoading('tabla-ventas', 7);
    paginaActual = pagina;
    try {
        // Construir URL con filtros opcionales
        let url = `${API_CONFIG.BASE_URL}/ventas?page=${pagina}&limit=${POR_PAGINA}`;

        const resultado = await fetch(url, { headers: AuthUtils.getHeaders() })
            .then(r => r.json());

        if (!resultado.success) throw new Error(resultado.message || 'Error al cargar ventas');

        const datos = resultado.data;
        totalVentas = datos.total || 0;
        totalPaginas = datos.totalPaginas || 0;
        const items = datos.items || [];

        actualizarEstadisticas(datos);
        renderTabla(items);
        renderPaginacion();
    } catch (err) {
        setError('tabla-ventas', 7, 'Error al cargar ventas');
        console.error(err);
    }
}

/* Estadísticas — calculadas desde los datos de la página actual
 * Los totales reales los entrega el endpoint de reportes (dashboard index).
 * Aquí solo mostramos conteos simples de lo que ya está en pantalla.
 */
function actualizarEstadisticas(datos) {
    const hoy = new Date().toDateString();
    const mesActual = new Date().toISOString().slice(0, 7);

    // Para estadísticas precisas necesitamos todos los registros del día/mes,
    // no solo la página actual. Hacemos una llamada rápida al resumen.
    const hoySql = new Date().toISOString().split('T')[0];
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0];

    fetch(`${API_CONFIG.BASE_URL}/reportes/resumen?desde=${hoySql}&hasta=${hoySql}`,
        { headers: AuthUtils.getHeaders() })
        .then(r => r.json())
        .then(res => {
            const d = res.data?.actual || {};
            document.getElementById('stat-ventas-hoy').textContent = d.totalVentas ?? '—';
            document.getElementById('stat-venta-promedio').textContent =
                d.ticketPromedio ? FormatUtils.moneda(d.ticketPromedio, false) : '$0.00';
        }).catch(() => { });

    fetch(`${API_CONFIG.BASE_URL}/reportes/resumen?desde=${primerDiaMes}&hasta=${hoySql}`,
        { headers: AuthUtils.getHeaders() })
        .then(r => r.json())
        .then(res => {
            const d = res.data?.actual || {};
            document.getElementById('stat-ventas-mes').textContent = d.totalVentas ?? '—';
            document.getElementById('stat-total-general').textContent =
                FormatUtils.moneda(d.totalIngresos || 0, false);
        }).catch(() => { });
}

/* Renderizar tabla con selector inline */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-ventas');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron ventas</td></tr>`;
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const puedeEditar = ['administrador', 'trabajador'].includes(user.rol);

    tbody.innerHTML = lista.map(v => {
        const cancelada = v.estado === 'Cancelada' || v.estado === 'Cancelado';

        // Selector inline — solo si puede editar y no está cancelada
        const selectorEstado = (puedeEditar && !cancelada)
            ? `<select class="form-select form-select-sm estado-inline"
                       style="min-width:145px;"
                       data-id="${v.idVenta}"
                       onchange="cambiarEstadoInline(this)">
                   ${estadosDisponibles
                .filter(e => e.nombre_estado !== 'Cancelado' && e.nombre_estado !== 'Cancelada')
                .map(e => `<option value="${e.id_estado_venta}"
                           ${e.nombre_estado === v.estado ? 'selected' : ''}>
                           ${e.nombre_estado}
                       </option>`).join('')}
               </select>`
            : FormatUtils.badgeEstadoVenta(v.estado || 'Pendiente');

        return `
        <tr>
            <td><span class="fw-semibold">#${v.idVenta}</span></td>
            <td>${v.cliente || 'Sin nombre'}</td>
            <td>${FormatUtils.badgePrecio(v.MontoTotal)}</td>
            <td>${v.TipoDocumento || '—'}</td>
            <td>${selectorEstado}</td>
            <td><small>${FormatUtils.fechaHora(v.FechaRegistro)}</small></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" title="Ver detalle"
                            onclick="verDetalle(${v.idVenta})">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${!cancelada ? `
                    <button class="btn btn-outline-danger" title="Cancelar"
                            onclick="abrirCancelar(${v.idVenta})">
                        <i class="bi bi-x-circle"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

/* Cambiar estado directo desde la tabla */
window.cambiarEstadoInline = async function (select) {
    const idVenta = parseInt(select.dataset.id);
    const idEstado = parseInt(select.value);
    const valorAnterior = Array.from(select.options)
        .find(o => o.defaultSelected)?.value || select.value;

    select.disabled = true;
    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/ventas/${idVenta}/estado`, {
            method: 'PUT',
            headers: { ...AuthUtils.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ idEstado }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar estado');

        const estadoObj = estadosDisponibles.find(e => e.id_estado_venta === idEstado);
        Toast.success(`Venta #${idVenta} → ${estadoObj?.nombre_estado || 'actualizada'}`);

        // Marcar la opción seleccionada como default para futuras reversiones
        Array.from(select.options).forEach(o => o.defaultSelected = false);
        select.options[select.selectedIndex].defaultSelected = true;

    } catch (err) {
        Toast.error(err.message);
        select.value = valorAnterior;
    } finally {
        select.disabled = false;
    }
};

/* Paginación del servidor */
function renderPaginacion() {
    let cont = document.getElementById('paginacion-ventas');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'paginacion-ventas';
        document.getElementById('tabla-ventas')?.closest('.card-body')?.appendChild(cont);
    }
    if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

    const inicio = (paginaActual - 1) * POR_PAGINA + 1;
    const fin = Math.min(paginaActual * POR_PAGINA, totalVentas);
    let btns = '';
    for (let i = 1; i <= totalPaginas; i++) {
        if (totalPaginas > 7 && i > 2 && i < totalPaginas - 1 && Math.abs(i - paginaActual) > 1) {
            if (i === 3 || i === totalPaginas - 2)
                btns += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            continue;
        }
        btns += `<li class="page-item ${i === paginaActual ? 'active' : ''}">
            <button class="page-link" onclick="irAPagina(${i})">${i}</button></li>`;
    }
    cont.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${inicio}–${fin} de ${totalVentas}</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPagina(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPagina(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPagina = function (n) {
    if (n < 1 || n > totalPaginas) return;
    cargarVentas(n);
};

/* Ver detalle — solo información, sin selector de estado */
window.verDetalle = async function (id) {
    try {
        const v = await CarritoService.getVentaById(id, AuthUtils.getHeaders());
        const body = document.getElementById('detalle-venta-body');
        if (!body) return;

        const items = (v.detalle || []).map(p => `
            <tr>
                <td>${p.producto || '—'}</td>
                <td class="text-center">${p.Cantidad}</td>
                <td class="text-end">${FormatUtils.moneda(p.PrecioUnitario, false)}</td>
                <td class="text-end">${FormatUtils.moneda(p.Subtotal, false)}</td>
            </tr>`).join('') || '<tr><td colspan="4" class="text-muted text-center">Sin detalle</td></tr>';

        body.innerHTML = `
            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <small class="text-muted d-block">Cliente</small>
                    <strong>${v.cliente || '—'}</strong>
                    <small class="text-muted d-block">${v.correoCliente || ''}</small>
                </div>
                <div class="col-md-3">
                    <small class="text-muted d-block">Fecha</small>
                    <span>${FormatUtils.fechaHora(v.FechaRegistro)}</span>
                </div>
                <div class="col-md-3">
                    <small class="text-muted d-block">Método de pago</small>
                    <span>${v.TipoDocumento || '—'}</span>
                </div>
            </div>
            <div class="mb-3">
                <small class="text-muted d-block">Estado</small>
                ${FormatUtils.badgeEstadoVenta(v.estado)}
            </div>
            <table class="table table-sm">
                <thead class="table-dark"><tr>
                    <th>Producto</th>
                    <th class="text-center">Cant.</th>
                    <th class="text-end">Precio unit.</th>
                    <th class="text-end">Subtotal</th>
                </tr></thead>
                <tbody>${items}</tbody>
                <tfoot>
                    <tr class="fw-bold">
                        <td colspan="3" class="text-end">Total:</td>
                        <td class="text-end">${FormatUtils.moneda(v.MontoTotal, false)}</td>
                    </tr>
                    ${v.MontoPago ? `
                    <tr class="text-muted small">
                        <td colspan="3" class="text-end">Pagado:</td>
                        <td class="text-end">${FormatUtils.moneda(v.MontoPago, false)}</td>
                    </tr>
                    <tr class="text-muted small">
                        <td colspan="3" class="text-end">Cambio:</td>
                        <td class="text-end">${FormatUtils.moneda(v.MontoCambio, false)}</td>
                    </tr>` : ''}
                </tfoot>
            </table>`;

        new bootstrap.Modal(document.getElementById('detalleVentaModal')).show();
    } catch (err) {
        Toast.error('Error al cargar detalle: ' + err.message);
    }
};

/* Cancelar venta */
window.abrirCancelar = function (id) {
    document.getElementById('cancelar-venta-id').textContent = `#${id}`;
    document.getElementById('cancelar-venta-id-input').value = id;
    new bootstrap.Modal(document.getElementById('cancelarVentaModal')).show();
};

async function confirmarCancelar() {
    const id = document.getElementById('cancelar-venta-id-input').value;
    setBtnLoading('btn-confirmar-cancelar', true, '<i class="bi bi-x-circle me-1"></i>Cancelar Venta');
    try {
        const json = await CarritoService.cancelarVenta(id, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al cancelar');
        bootstrap.Modal.getInstance(document.getElementById('cancelarVentaModal'))?.hide();
        Toast.success('Venta cancelada y stock revertido');
        await cargarVentas(paginaActual); // recargar la misma página
    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-confirmar-cancelar', false, '<i class="bi bi-x-circle me-1"></i>Cancelar Venta');
    }
}

/* Nueva venta — buscar producto */
async function buscarProductoVenta() {
    const termino = document.getElementById('buscar-producto-venta').value.trim();
    if (!termino) return;
    try {
        const todos = await ProductosService.getAll(AuthUtils.getHeaders());
        const filtrados = todos.filter(p =>
            p.Nombre?.toLowerCase().includes(termino.toLowerCase()) && p.Stock > 0
        );
        const tbody = document.getElementById('tabla-productos-venta');
        if (!tbody) return;
        tbody.innerHTML = filtrados.length
            ? filtrados.slice(0, 10).map(p => `
                <tr>
                    <td>${p.Nombre}</td>
                    <td>${FormatUtils.moneda(p.PrecioVenta, false)}</td>
                    <td>${p.Stock}</td>
                    <td>
                        <button class="btn btn-sm btn-success"
                                onclick="agregarAlCarrito(${p.idProducto}, '${p.Nombre.replace(/'/g, "\\'")}', ${p.PrecioVenta}, ${p.Stock})">
                            <i class="bi bi-plus"></i>
                        </button>
                    </td>
                </tr>`).join('')
            : '<tr><td colspan="4" class="text-muted text-center">Sin resultados</td></tr>';
    } catch (err) {
        Toast.error('Error al buscar: ' + err.message);
    }
}

/* Carrito */
window.agregarAlCarrito = async function (id, nombre, precio, stock) {
    const existe = carritoVenta.find(x => x.idProducto === id);
    if (existe) {
        if (existe.cantidad >= stock) { Toast.warning('Stock insuficiente'); return; }
        existe.cantidad++;
    } else {
        // Consultar precio con descuento vía promociones
        let precioFinal = precio;
        let precioOriginal = null;
        try {
            const res = await fetch(
                `${API_CONFIG.BASE_URL}/promociones/precio/${id}/1`,
                { headers: AuthUtils.getHeaders() }
            );
            const json = await res.json();
            if (json.success && json.data?.tieneDescuento) {
                precioFinal = json.data.precioFinal;
                precioOriginal = precio;
            }
        } catch { /* sin descuento, usar precio normal */ }

        carritoVenta.push({ idProducto: id, nombre, precio: precioFinal, precioOriginal, cantidad: 1, stock });
    }
    renderCarrito();
};

function renderCarrito() {
    const tbody = document.getElementById('tabla-carrito-venta');
    const totalEl = document.getElementById('venta-total');
    if (!tbody) return;

    if (!carritoVenta.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">Sin productos</td></tr>';
        if (totalEl) totalEl.textContent = '$0.00';
        return;
    }

    tbody.innerHTML = carritoVenta.map((item, i) => `
        <tr>
            <td>${item.nombre}</td>
            <td>
                <div class="input-group input-group-sm">
                    <button class="btn btn-outline-secondary" onclick="cambiarCantidad(${i}, -1)">−</button>
                    <input type="text" class="form-control text-center" value="${item.cantidad}" readonly>
                    <button class="btn btn-outline-secondary" onclick="cambiarCantidad(${i}, 1)">+</button>
                </div>
            </td>
            <td>
                ${item.precioOriginal
            ? `<small class="text-muted text-decoration-line-through me-1">
                           $${(item.precioOriginal * item.cantidad).toFixed(2)}
                       </small>`
            : ''}
                <span class="${item.precioOriginal ? 'text-success fw-semibold' : ''}">
                    ${FormatUtils.moneda(item.precio * item.cantidad, false)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="quitarDelCarrito(${i})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`).join('');

    const total = carritoVenta.reduce((s, x) => s + x.precio * x.cantidad, 0);
    if (totalEl) totalEl.textContent = FormatUtils.moneda(total, false);
}

window.cambiarCantidad = function (i, delta) {
    carritoVenta[i].cantidad += delta;
    if (carritoVenta[i].cantidad <= 0) carritoVenta.splice(i, 1);
    else if (carritoVenta[i].cantidad > carritoVenta[i].stock)
        carritoVenta[i].cantidad = carritoVenta[i].stock;
    renderCarrito();
};

window.quitarDelCarrito = function (i) {
    carritoVenta.splice(i, 1);
    renderCarrito();
};

/* Confirmar nueva venta */
async function confirmarVenta() {
    if (!carritoVenta.length) { Toast.warning('Agrega productos al carrito'); return; }

    const metodoPagoNombre = document.getElementById('metodo-pago-venta').value;
    if (!metodoPagoNombre) { Toast.warning('Selecciona un método de pago'); return; }

    setBtnLoading('btn-confirmar-venta', true, '<i class="bi bi-check-circle me-1"></i>Confirmar Venta');
    try {
        const total = carritoVenta.reduce((s, x) => s + x.precio * x.cantidad, 0);
        const payload = {
            metodoPago: metodoPagoNombre,
            montoPago: total.toFixed(2),
            productos: carritoVenta.map(x => ({ idProducto: x.idProducto, cantidad: x.cantidad })),
        };

        const json = await CarritoService.crearVenta(payload, AuthUtils.getHeaders());
        if (!json?.idVenta) throw new Error('Error al registrar venta');

        bootstrap.Modal.getInstance(document.getElementById('nuevaVentaModal'))?.hide();
        carritoVenta = [];
        renderCarrito();
        Toast.success('Venta registrada exitosamente');
        await cargarVentas(1); // volver a la primera página para ver la nueva venta
    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-confirmar-venta', false, '<i class="bi bi-check-circle me-1"></i>Confirmar Venta');
    }
}

/* Init — catálogos PRIMERO, ventas DESPUÉS */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;

    // Orden secuencial: los estados deben estar listos antes de renderizar la tabla
    await cargarCatalogos();
    await cargarVentas(1);

    let debounce;
    document.getElementById('buscador-ventas')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => cargarVentas(1), 400);
    });
    document.getElementById('filtro-estado')?.addEventListener('change', () => cargarVentas(1));
    document.getElementById('buscar-producto-venta')?.addEventListener('input', buscarProductoVenta);
    document.getElementById('btn-confirmar-venta')?.addEventListener('click', confirmarVenta);
    document.getElementById('btn-confirmar-cancelar')?.addEventListener('click', confirmarCancelar);
});