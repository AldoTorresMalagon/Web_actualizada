let todasLasVentas = [];
let metodosPago = [];
let carritoVenta = [];
let descuentosCache = {}; // { idProducto: porcentaje } — cargado al abrir el modal
let paginaActual = 1;
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

/* Cargar métodos de pago */
async function cargarMetodosPago() {
    try {
        metodosPago = await CarritoService.getMetodosPago(AuthUtils.getHeaders());
        const sel = document.getElementById('metodo-pago-venta');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccionar método</option>';
            metodosPago.forEach(m => {
                sel.innerHTML += `<option value="${m.nombre_metodo}">${m.nombre_metodo}</option>`;
            });
        }
    } catch { /* no crítico */ }
}

/* Cargar ventas */
async function cargarVentas() {
    setLoading('tabla-ventas', 7);
    try {
        todasLasVentas = await CarritoService.getTodasVentas(AuthUtils.getHeaders());
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        setError('tabla-ventas', 7, 'Error al cargar ventas');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    const hoy = new Date().toDateString();
    // comparar YYYY-MM para incluir el año y evitar mezclar meses de distintos años
    const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const ventasHoy = todasLasVentas.filter(v => new Date(v.FechaRegistro).toDateString() === hoy);
    const ventasMes = todasLasVentas.filter(v => v.FechaRegistro?.startsWith(mesActual));
    const totalGeneral = todasLasVentas.reduce((s, v) => s + parseFloat(v.MontoTotal || 0), 0);
    const promedio = todasLasVentas.length ? totalGeneral / todasLasVentas.length : 0;

    document.getElementById('stat-ventas-hoy').textContent = ventasHoy.length;
    document.getElementById('stat-ventas-mes').textContent = ventasMes.length;
    document.getElementById('stat-venta-promedio').textContent = FormatUtils.moneda(promedio, false);
    document.getElementById('stat-total-general').textContent = FormatUtils.moneda(totalGeneral, false);
}

/* Filtrar y renderizar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-ventas')?.value.toLowerCase().trim() || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || '';

    let lista = todasLasVentas.filter(v => {
        const coincide = v.cliente?.toLowerCase().includes(termino) ||
            String(v.idVenta).includes(termino);
        const coincideEstado = !estadoFiltro || v.estado === estadoFiltro;
        return coincide && coincideEstado;
    });

    const total = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;

    const inicio = (paginaActual - 1) * POR_PAGINA;
    renderTabla(lista.slice(inicio, inicio + POR_PAGINA));
    renderPaginacion(total, totalPags);
}

/* ── Renderizar tabla ── */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-ventas');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron ventas</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(v => `
        <tr>
            <td><span class="fw-semibold">#${v.idVenta}</span></td>
            <td>${v.cliente || 'Sin nombre'}</td>
            <td>${FormatUtils.badgePrecio(v.MontoTotal)}</td>
            <td>${v.TipoDocumento || '—'}</td>
            <td>${FormatUtils.badgeEstadoVenta(v.estado || 'Pendiente')}</td>
            <td><small>${FormatUtils.fechaHora(v.FechaRegistro)}</small></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" title="Ver detalle"
                            onclick="verDetalle(${v.idVenta})">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${v.estado === 'Pendiente' ? `
                    <button class="btn btn-outline-danger" title="Cancelar"
                            onclick="abrirCancelar(${v.idVenta})">
                        <i class="bi bi-x-circle"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

/* Paginación */
function renderPaginacion(total, totalPags) {
    let cont = document.getElementById('paginacion-ventas');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'paginacion-ventas';
        document.getElementById('tabla-ventas')?.closest('.card-body')?.appendChild(cont);
    }
    if (totalPags <= 1) { cont.innerHTML = ''; return; }

    const inicio = (paginaActual - 1) * POR_PAGINA + 1;
    const fin = Math.min(paginaActual * POR_PAGINA, total);
    let btns = '';
    for (let i = 1; i <= totalPags; i++) {
        if (totalPags > 7 && i > 2 && i < totalPags - 1 && Math.abs(i - paginaActual) > 1) {
            if (i === 3 || i === totalPags - 2)
                btns += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            continue;
        }
        btns += `<li class="page-item ${i === paginaActual ? 'active' : ''}">
            <button class="page-link" onclick="irAPagina(${i})">${i}</button></li>`;
    }
    cont.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${inicio}–${fin} de ${total}</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPagina(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPagina(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPagina = function (n) {
    const totalPags = Math.ceil(todasLasVentas.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Ver detalle de venta */
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
            <div class="mb-3">
                <strong>Cliente:</strong> ${v.cliente || '—'}<br>
                <strong>Fecha:</strong> ${FormatUtils.fechaHora(v.FechaRegistro)}<br>
                <strong>Estado:</strong> ${FormatUtils.badgeEstadoVenta(v.estado)}<br>
                <strong>Tipo documento:</strong> ${v.TipoDocumento || '—'}
            </div>
            <table class="table table-sm">
                <thead><tr>
                    <th>Producto</th>
                    <th class="text-center">Cant.</th>
                    <th class="text-end">Precio</th>
                    <th class="text-end">Subtotal</th>
                </tr></thead>
                <tbody>${items}</tbody>
                <tfoot><tr>
                    <td colspan="3" class="text-end fw-bold">Total:</td>
                    <td class="text-end fw-bold">${FormatUtils.moneda(v.MontoTotal, false)}</td>
                </tr></tfoot>
            </table>`;

        new bootstrap.Modal(document.getElementById('detalleVentaModal')).show();
    } catch (err) {
        Toast.error('Error al cargar detalle: ' + err.message);
    }
};

/* Cancelar venta */
window.abrirCancelar = function (id) {
    document.getElementById('cancelar-venta-id').value = id;
    new bootstrap.Modal(document.getElementById('cancelarVentaModal')).show();
};

async function confirmarCancelar() {
    const id = document.getElementById('cancelar-venta-id').value;
    setBtnLoading('btn-confirmar-cancelar', true, '<i class="bi bi-x-circle me-1"></i>Cancelar Venta');
    try {
        const json = await CarritoService.cancelarVenta(id, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al cancelar');
        bootstrap.Modal.getInstance(document.getElementById('cancelarVentaModal'))?.hide();
        Toast.success('Venta cancelada');
        await cargarVentas();
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
        // consultar precio con descuento via fn_precio_final
        let precioFinal = precio;
        let precioOriginal = null;
        try {
            const res = await apiFetch(
                `${API_CONFIG.BASE_URL}/promociones/precio/${id}/1`,
                { headers: AuthUtils.getHeaders() }
            );
            const json = await res.json();
            if (json.success && json.data?.tieneDescuento) {
                precioFinal  = json.data.precioFinal;
                precioOriginal = precio;
            }
        } catch { /* sin descuento, usar precio normal */ }

        carritoVenta.push({ idProducto: id, nombre, precio: precioFinal,
                            precioOriginal, cantidad: 1, stock });
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
                <div class="input-group input-group-sm" class="input-cantidad">
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
        if (!json.success) throw new Error(json.message || 'Error al registrar venta');

        bootstrap.Modal.getInstance(document.getElementById('nuevaVentaModal'))?.hide();
        carritoVenta = [];
        renderCarrito();
        Toast.success('Venta registrada exitosamente');
        await cargarVentas();
    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-confirmar-venta', false, '<i class="bi bi-check-circle me-1"></i>Confirmar Venta');
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await Promise.all([cargarMetodosPago(), cargarVentas()]);

    let debounce;
    document.getElementById('buscador-ventas')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });
    document.getElementById('filtro-estado')?.addEventListener('change', () => {
        paginaActual = 1; aplicarFiltrosYRenderizar();
    });
    document.getElementById('buscar-producto-venta')?.addEventListener('input', buscarProductoVenta);
    document.getElementById('btn-confirmar-venta')?.addEventListener('click', confirmarVenta);
    document.getElementById('btn-confirmar-cancelar')?.addEventListener('click', confirmarCancelar);
});