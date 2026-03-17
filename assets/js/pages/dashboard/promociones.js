let todasLasPromociones = [];
let productosDisponibles = [];
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
        ? `<span class="spinner-border spinner-border-sm me-2"></span>Guardando...`
        : textoOriginal;
}

/* Cargar productos para checkboxes */
async function cargarProductos() {
    try {
        productosDisponibles = await ProductosService.getAll(AuthUtils.getHeaders());
        ['agregar-productos-lista', 'editar-productos-lista'].forEach(id => {
            const cont = document.getElementById(id);
            if (!cont) return;
            cont.innerHTML = productosDisponibles.map(p => `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox"
                           value="${p.idProducto}" id="${id}-${p.idProducto}">
                    <label class="form-check-label" for="${id}-${p.idProducto}">
                        ${p.Nombre} — ${FormatUtils.moneda(p.PrecioVenta, false)}
                    </label>
                </div>`).join('');
        });
    } catch { /* no crítico */ }
}

/* Cargar promociones */
async function cargarPromociones() {
    setLoading('tabla-promociones', 8);
    try {
        todasLasPromociones = await ProductosService.getPromociones(AuthUtils.getHeaders());
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        setError('tabla-promociones', 8, 'Error al cargar promociones');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    const hoy = new Date();
    const total = todasLasPromociones.length;
    const activas = todasLasPromociones.filter(p => p.activo === 'si').length;
    const proximas = todasLasPromociones.filter(p =>
        p.activo === 'si' && new Date(p.fecha_inicio) > hoy
    ).length;
    const expiradas = todasLasPromociones.filter(p =>
        p.activo === 'no' && new Date(p.fecha_fin) < hoy
    ).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-activas').textContent = activas;
    document.getElementById('stat-proximas').textContent = proximas;
    document.getElementById('stat-expiradas').textContent = expiradas;
}

/* Filtrar y renderizar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-promociones')?.value.toLowerCase().trim() || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || '';

    // estadoFiltro usa 'si'/'no' para alinearse con el campo activo de la API
    let lista = todasLasPromociones.filter(p => {
        const coincide = p.titulo?.toLowerCase().includes(termino) ||
            p.descripcion?.toLowerCase().includes(termino);
        const coincideEstado = !estadoFiltro || p.activo === estadoFiltro;
        return coincide && coincideEstado;
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
    const tbody = document.getElementById('tabla-promociones');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron promociones</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(p => `
        <tr>
            <td class="fw-semibold">${p.titulo}</td>
            <td>${FormatUtils.truncar(p.descripcion || '—', 50)}</td>
            <td><span class="badge bg-warning text-dark">${p.porcentaje_descuento || 0}%</span></td>
            <td class="text-center">${p.total_productos || 0}</td>
            <td>${FormatUtils.fechaCorta(p.fecha_inicio)}</td>
            <td>${FormatUtils.fechaCorta(p.fecha_fin)}</td>
            <td>${FormatUtils.badgeEstado(p.activo === 'si', 'Activa', 'Inactiva')}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" title="Editar"
                            onclick="abrirEditar(${p.id_promocion})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Eliminar"
                            onclick="confirmarEliminar(${p.id_promocion}, '${(p.titulo || '').replace(/'/g, "\\'")}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

/* Guardar promoción */
async function guardarPromocion() {
    const titulo = document.getElementById('agregar-titulo').value.trim();
    if (!titulo) {
        document.getElementById('agregar-titulo').classList.add('is-invalid');
        return;
    }
    document.getElementById('agregar-titulo').classList.remove('is-invalid');

    setBtnLoading('btn-guardar-promocion', true, '<i class="bi bi-floppy me-1"></i>Guardar');
    try {
        const payload = {
            titulo,
            descripcion: document.getElementById('agregar-descripcion')?.value.trim() || '',
            porcentajeDescuento: parseFloat(document.getElementById('agregar-porcentaje')?.value) || 0,
            fechaInicio: document.getElementById('agregar-fecha-inicio')?.value || '',
            fechaFin: document.getElementById('agregar-fecha-fin')?.value || '',
        };

        const nuevaPromo = await ProductosService.crearPromocion(payload, AuthUtils.getHeaders());
        const nuevoId = nuevaPromo?.data?.id || nuevaPromo?.id;

        // Guardar productos seleccionados si hay alguno marcado
        if (nuevoId) {
            const checkboxes = document.querySelectorAll('#agregar-productos-lista input[type="checkbox"]:checked');
            const seleccionados = [...checkboxes].map(cb => parseInt(cb.value));
            await Promise.allSettled(
                seleccionados.map(idP => fetch(`${API_CONFIG.BASE_URL}/promociones/${nuevoId}/productos`, {
                    method: 'POST', headers: AuthUtils.getHeaders(),
                    body: JSON.stringify({ idProducto: idP })
                }))
            );
        }

        bootstrap.Modal.getInstance(document.getElementById('agregarPromocionModal'))?.hide();
        Toast?.success('Promoción creada exitosamente');
        await cargarPromociones();
    } catch (err) {
        Toast?.error(err.message);
    } finally {
        setBtnLoading('btn-guardar-promocion', false, '<i class="bi bi-floppy me-1"></i>Guardar');
    }
}

/* Abrir edición */
window.abrirEditar = async function (id) {
    const p = todasLasPromociones.find(x => x.id_promocion === id);
    if (!p) return;

    document.getElementById('editar-id').value = p.id_promocion;
    document.getElementById('editar-titulo').value = p.titulo || '';
    document.getElementById('editar-descripcion').value = p.descripcion || '';
    document.getElementById('editar-porcentaje').value = p.porcentaje_descuento || 0;
    document.getElementById('editar-fecha-inicio').value = p.fecha_inicio?.split('T')[0] || '';
    document.getElementById('editar-fecha-fin').value = p.fecha_fin?.split('T')[0] || '';
    document.getElementById('editar-activo').checked = (p.activo === 'si');

    // Cargar y marcar los productos ya asignados a esta promoción
    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones/${id}`, { headers: AuthUtils.getHeaders() });
        const json = await res.json();
        if (json.success && json.data?.productos) {
            const idsAsignados = json.data.productos.map(pr => pr.idProducto);
            const lista = document.getElementById('editar-productos-lista');
            if (lista) {
                lista.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = idsAsignados.includes(parseInt(cb.value));
                });
            }
        }
    } catch { /* no crítico */ }

    new bootstrap.Modal(document.getElementById('editarPromocionModal')).show();
};

/* Actualizar promoción */
async function actualizarPromocion() {
    const id = document.getElementById('editar-id').value;
    const titulo = document.getElementById('editar-titulo').value.trim();
    if (!titulo) {
        document.getElementById('editar-titulo').classList.add('is-invalid');
        return;
    }
    document.getElementById('editar-titulo').classList.remove('is-invalid');

    setBtnLoading('btn-actualizar-promocion', true, '<i class="bi bi-floppy me-1"></i>Actualizar');
    try {
        const activoVal = document.getElementById('editar-activo').checked ? 'si' : 'no';
        const payload = {
            titulo,
            descripcion: document.getElementById('editar-descripcion').value.trim(),
            porcentajeDescuento: parseFloat(document.getElementById('editar-porcentaje').value) || 0,
            fechaInicio: document.getElementById('editar-fecha-inicio').value,
            fechaFin: document.getElementById('editar-fecha-fin').value,
            activo: activoVal,
            estado: activoVal === 'si' ? 'activa' : 'inactiva',
        };

        await ProductosService.actualizarPromocion(id, payload, AuthUtils.getHeaders());

        // Sincronizar productos seleccionados
        const checkboxes = document.querySelectorAll('#editar-productos-lista input[type="checkbox"]');
        const seleccionados = [...checkboxes].filter(cb => cb.checked).map(cb => parseInt(cb.value));

        // Obtener productos actuales de la promo
        const resActual = await fetch(`${API_CONFIG.BASE_URL}/promociones/${id}`, { headers: AuthUtils.getHeaders() });
        const jActual = await resActual.json();
        const actuales = (jActual.data?.productos || []).map(pr => pr.idProducto);

        // Agregar los nuevos
        const agregar = seleccionados.filter(x => !actuales.includes(x));
        // Quitar los desmarcados
        const quitar = actuales.filter(x => !seleccionados.includes(x));

        await Promise.allSettled([
            ...agregar.map(idP => fetch(`${API_CONFIG.BASE_URL}/promociones/${id}/productos`, {
                method: 'POST', headers: AuthUtils.getHeaders(),
                body: JSON.stringify({ idProducto: idP })
            })),
            ...quitar.map(idP => fetch(`${API_CONFIG.BASE_URL}/promociones/${id}/productos/${idP}`, {
                method: 'DELETE', headers: AuthUtils.getHeaders(),
            })),
        ]);

        bootstrap.Modal.getInstance(document.getElementById('editarPromocionModal'))?.hide();
        Toast?.success('Promoción actualizada exitosamente');
        await cargarPromociones();
    } catch (err) {
        Toast?.error(err.message);
    } finally {
        setBtnLoading('btn-actualizar-promocion', false, '<i class="bi bi-floppy me-1"></i>Actualizar');
    }
}

/* Confirmar eliminar */
window.confirmarEliminar = function (id, titulo) {
    document.getElementById('eliminar-promocion-titulo').textContent = titulo;
    document.getElementById('eliminar-promocion-id').value = id;
    new bootstrap.Modal(document.getElementById('eliminarPromocionModal')).show();
};

async function eliminarPromocion() {
    const id = document.getElementById('eliminar-promocion-id').value;
    try {
        await ProductosService.eliminarPromocion(id, AuthUtils.getHeaders());
        bootstrap.Modal.getInstance(document.getElementById('eliminarPromocionModal'))?.hide();
        Toast?.success('Promoción eliminada');
        await cargarPromociones();
    } catch (err) {
        Toast?.error(err.message);
    }
}

/* Paginación */
function renderPaginacion(total, totalPags) {
    let contenedor = document.getElementById('paginacion-promociones');
    if (!contenedor) {
        const card = document.getElementById('tabla-promociones')?.closest('.card-body');
        if (card) {
            contenedor = document.createElement('div');
            contenedor.id = 'paginacion-promociones';
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
            <button class="page-link" onclick="irAPaginaPromociones(${i})">${i}</button></li>`;
    }
    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${inicio}–${fin} de ${total} promociones</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaPromociones(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaPromociones(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPaginaPromociones = function (n) {
    const totalPags = Math.ceil(todasLasPromociones.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await Promise.all([cargarProductos(), cargarPromociones()]);

    let debounce;
    document.getElementById('buscador-promociones')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });
    document.getElementById('filtro-estado')?.addEventListener('change', () => {
        paginaActual = 1; aplicarFiltrosYRenderizar();
    });
    document.getElementById('btn-guardar-promocion')?.addEventListener('click', guardarPromocion);
    document.getElementById('btn-actualizar-promocion')?.addEventListener('click', actualizarPromocion);
    document.getElementById('btn-confirmar-eliminar')?.addEventListener('click', eliminarPromocion);
});