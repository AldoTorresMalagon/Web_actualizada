let todosLosMovimientos = [];
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

/* Cargar inventario */
async function cargarInventario() {
    setLoading('tabla-inventario', 9);
    try {
        todosLosMovimientos = await InventarioService.getMovimientos(AuthUtils.getHeaders());
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        setError('tabla-inventario', 9, 'Error al cargar inventario');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    const porProducto = new Map();
    todosLosMovimientos.forEach(m => {
        if (!porProducto.has(m.producto) ||
            new Date(m.fecha_movimiento) > new Date(porProducto.get(m.producto).fecha_movimiento)) {
            porProducto.set(m.producto, m);
        }
    });

    const productos = [...porProducto.values()];
    const stockBajo = productos.filter(p => (p.stock_nuevo || 0) > 0 && (p.stock_nuevo || 0) < 10).length;
    const sinStock = productos.filter(p => (p.stock_nuevo || 0) <= 0).length;

    document.getElementById('stat-total').textContent = productos.length;
    document.getElementById('stat-stock-bajo').textContent = stockBajo;
    document.getElementById('stat-sin-stock').textContent = sinStock;

    // Movimientos Hoy — contar entradas del historial de hoy
    const hoyStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const movHoy = (todosLosMovimientos || []).filter(m => {
        const fecha = new Date(m.fecha_movimiento);
        return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }) === hoyStr;
    }).length;
    if (document.getElementById('stat-movimientos-hoy'))
        document.getElementById('stat-movimientos-hoy').textContent = movHoy;
}

/* Filtrar y renderizar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-inventario')?.value.toLowerCase().trim() || '';
    const stockFiltro = document.getElementById('filtro-stock')?.value || '';

    const lista = todosLosMovimientos.filter(m => {
        const coincideBusqueda = m.producto?.toLowerCase().includes(termino) ||
            m.codigo?.toLowerCase().includes(termino);
        const stock = m.stock_nuevo || 0;
        const coincideStock = !stockFiltro ||
            (stockFiltro === 'bajo' && stock > 0 && stock < 10) ||
            (stockFiltro === 'sin' && stock <= 0) ||
            (stockFiltro === 'ok' && stock >= 10);
        return coincideBusqueda && coincideStock;
    });

    const total = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;

    const inicio = (paginaActual - 1) * POR_PAGINA;
    renderTabla(lista.slice(inicio, inicio + POR_PAGINA));
    renderPaginacion(total, totalPags);
}

/* Renderizar tabla */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-inventario');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron registros</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map((m, i) => `
        <tr>
            <td class="fw-semibold">${m.producto || '—'}</td>
            <td>
                <span class="text-muted small">${m.stock_anterior ?? '—'}</span>
                <i class="bi bi-arrow-right mx-1 text-muted"></i>
                <strong class="${FormatUtils.claseStock(m.stock_nuevo)}">${m.stock_nuevo ?? 0}</strong>
            </td>
            <td>${FormatUtils.badgeMovimiento(m.tipo_movimiento)}</td>
            <td><small>${FormatUtils.fechaHora(m.fecha_movimiento)}</small></td>
            <td>
                <button class="btn btn-outline-info btn-sm" title="Ver detalles"
                        data-idx="${i}" onclick="abrirDetalleInv(this.dataset.idx)">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>`).join('');
}

/* Ajustar stock */
async function confirmarAjusteStock() {
    const id = document.getElementById('stock-producto-id').value;
    const tipo = document.getElementById('stock-tipo').value;
    const cantidad = parseInt(document.getElementById('stock-cantidad').value);
    const motivo = document.getElementById('stock-motivo').value.trim();

    if (!cantidad || cantidad <= 0) {
        document.getElementById('stock-cantidad').classList.add('is-invalid');
        document.getElementById('stock-cantidad-error').textContent = 'Ingresa una cantidad válida';
        return;
    }
    document.getElementById('stock-cantidad').classList.remove('is-invalid');

    // idTipoMovimiento: 1=Entrada, 2=Salida, 3=Ajuste
    const tipoMap = { entrada: 1, salida: 2, ajuste: 3 };

    setBtnLoading('btn-confirmar-stock', true, '<i class="bi bi-check-circle me-1"></i>Aplicar Ajuste');
    try {
        await InventarioService.registrarMovimiento({
            idProducto: parseInt(id),
            cantidad,
            idTipoMovimiento: tipoMap[tipo],
            observaciones: motivo || 'Ajuste manual desde dashboard',
        }, AuthUtils.getHeaders());

        bootstrap.Modal.getInstance(document.getElementById('ajustarStockModal'))?.hide();
        Toast.success('Stock actualizado correctamente');
        await cargarInventario();
    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-confirmar-stock', false, '<i class="bi bi-check-circle me-1"></i>Aplicar Ajuste');
    }
}

/* Paginación */
function renderPaginacion(total, totalPags) {
    let contenedor = document.getElementById('paginacion-inventario');
    if (!contenedor) {
        const card = document.getElementById('tabla-inventario')?.closest('.card-body');
        if (card) {
            contenedor = document.createElement('div');
            contenedor.id = 'paginacion-inventario';
            card.appendChild(contenedor);
        }
    }
    if (!contenedor) return;
    if (totalPags <= 1) { contenedor.innerHTML = ''; return; }

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
            <button class="page-link" onclick="irAPaginaInventario(${i})">${i}</button></li>`;
    }
    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${inicio}–${fin} de ${total} movimientos</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaInventario(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaInventario(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPaginaInventario = function (n) {
    const totalPags = Math.ceil(todosLosMovimientos.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await cargarInventario();

    let debounce;
    document.getElementById('buscador-inventario')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });
    document.getElementById('filtro-stock')?.addEventListener('change', () => {
        paginaActual = 1; aplicarFiltrosYRenderizar();
    });
    document.getElementById('btn-actualizar-inventario')?.addEventListener('click', cargarInventario);

    // ── Selector de período para exportar ────────────────────
    // Estado del filtro de exportación
    const exportState = { periodo: 'hoy', desde: null, hasta: null };

    // Calcular fechas según período
    function calcularFechasExport(periodo) {
        const hoy = new Date();
        const pad = n => String(n).padStart(2, '0');
        const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        switch (periodo) {
            case 'hoy': {
                const f = fmt(hoy);
                return { desde: f, hasta: f };
            }
            case 'semana': {
                const lunes = new Date(hoy);
                lunes.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
                return { desde: fmt(lunes), hasta: fmt(hoy) };
            }
            default: return null;
        }
    }

    // Activar/desactivar botones del selector
    document.getElementById('selector-periodo-export')
        ?.addEventListener('click', e => {
            const btn = e.target.closest('[data-periodo-export]');
            if (!btn) return;
            document.querySelectorAll('[data-periodo-export]')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            exportState.periodo = btn.dataset.periodoExport;
            const rangoDiv = document.getElementById('rango-export');
            if (exportState.periodo === 'personalizado') {
                rangoDiv.classList.remove('d-none');
            } else {
                rangoDiv.classList.add('d-none');
                const f = calcularFechasExport(exportState.periodo);
                exportState.desde = f?.desde || null;
                exportState.hasta = f?.hasta || null;
            }
        });

    // Inicializar con "Hoy"
    const fechasHoy = calcularFechasExport('hoy');
    exportState.desde = fechasHoy.desde;
    exportState.hasta = fechasHoy.hasta;

    // Exportar Excel con filtro de fechas
    document.getElementById('btn-exportar')?.addEventListener('click', () => {
        // Resolver fechas según período seleccionado
        let desde = exportState.desde;
        let hasta = exportState.hasta;

        if (exportState.periodo === 'personalizado') {
            desde = document.getElementById('export-desde')?.value;
            hasta = document.getElementById('export-hasta')?.value;
            if (!desde || !hasta) {
                Toast.warning('Selecciona un rango de fechas válido');
                return;
            }
            if (desde > hasta) {
                Toast.warning('La fecha inicial no puede ser mayor a la final');
                return;
            }
        }

        // Filtrar movimientos por rango de fechas
        const desdeDate = new Date(desde + 'T00:00:00');
        const hastaDate = new Date(hasta + 'T23:59:59');

        const movFiltrados = todosLosMovimientos.filter(m => {
            const fecha = new Date(m.fecha_movimiento);
            return fecha >= desdeDate && fecha <= hastaDate;
        });

        if (!movFiltrados.length) {
            Toast.warning(`Sin movimientos del ${desde} al ${hasta}`);
            return;
        }

        // Calcular stats del período filtrado
        const porProducto = new Map();
        movFiltrados.forEach(m => {
            if (!porProducto.has(m.producto) ||
                new Date(m.fecha_movimiento) > new Date(porProducto.get(m.producto).fecha_movimiento)) {
                porProducto.set(m.producto, m);
            }
        });
        const productos = [...porProducto.values()];
        const hoyStr = new Date().toLocaleDateString('es-MX',
            { year: 'numeric', month: '2-digit', day: '2-digit' });

        const stats = {
            total: productos.length,
            stockBajo: productos.filter(p => (p.stock_nuevo || 0) > 0 && (p.stock_nuevo || 0) < 10).length,
            sinStock: productos.filter(p => (p.stock_nuevo || 0) <= 0).length,
            movHoy: movFiltrados.length, // en el export, es el total del período filtrado
            periodo: desde === hasta ? desde : `${desde} al ${hasta}`,
        };

        ExcelExport.generarInventario(movFiltrados, stats);
    });
    document.getElementById('btn-confirmar-stock')?.addEventListener('click', confirmarAjusteStock);
});
window.abrirDetalleInv = function (idx) {
    const m = todosLosMovimientos[parseInt(idx)];
    if (!m) return;
    const body = document.getElementById('detalle-inventario-body');
    body.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6"><small class="text-muted d-block">Producto</small><strong>${m.producto || '—'}</strong></div>
            <div class="col-md-6"><small class="text-muted d-block">Código</small><strong>${m.codigo || '—'}</strong></div>
            <div class="col-md-4"><small class="text-muted d-block">Stock anterior</small><strong>${m.stock_anterior ?? '—'}</strong></div>
            <div class="col-md-4"><small class="text-muted d-block">Stock nuevo</small><strong class="${FormatUtils.claseStock(m.stock_nuevo)}">${m.stock_nuevo ?? 0}</strong></div>
            <div class="col-md-4"><small class="text-muted d-block">Tipo movimiento</small>${FormatUtils.badgeMovimiento(m.tipo_movimiento)}</div>
            <div class="col-md-4"><small class="text-muted d-block">Cantidad</small><strong>${Math.abs(m.cantidad) || '—'}</strong></div>
            <div class="col-md-4"><small class="text-muted d-block">Usuario</small><strong>${m.usuario || '—'}</strong></div>
            <div class="col-md-4"><small class="text-muted d-block">Fecha y hora</small><small>${FormatUtils.fechaHora(m.fecha_movimiento)}</small></div>
            <div class="col-12"><small class="text-muted d-block">Observaciones</small><p class="mb-0">${m.observaciones || 'Sin observaciones'}</p></div>
        </div>`;
    new bootstrap.Modal(document.getElementById('detalleInventarioModal')).show();
};