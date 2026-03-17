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
    // stat-valor-total no se puede calcular sin precios en este endpoint
    if (document.getElementById('stat-valor-total'))
        document.getElementById('stat-valor-total').textContent = '—';
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
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron registros</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(m => `
        <tr>
            <td class="fw-semibold">${m.producto || '—'}</td>
            <td>${m.codigo || '—'}</td>
            <td>${m.stock_anterior ?? '—'}</td>
            <td class="${FormatUtils.claseStock(m.stock_nuevo)}">${m.stock_nuevo ?? 0}</td>
            <td>${FormatUtils.badgeMovimiento(m.tipo_movimiento)}</td>
            <td>${m.cantidad || '—'}</td>
            <td><small>${m.usuario || '—'}</small></td>
            <td><small>${FormatUtils.truncar(m.observaciones || '—', 40)}</small></td>
            <td><small>${FormatUtils.fechaHora(m.fecha_movimiento)}</small></td>
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
        Toast?.success('Stock actualizado correctamente');
        await cargarInventario();
    } catch (err) {
        Toast?.error(err.message);
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
    document.getElementById('btn-confirmar-stock')?.addEventListener('click', confirmarAjusteStock);
});