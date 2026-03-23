let todosLosProveedores = [];
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

/* Cargar proveedores */
async function cargarProveedores() {
    setLoading('tabla-proveedores', 7);
    try {
        todosLosProveedores = await ProductosService.getProveedores(AuthUtils.getHeaders());
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        setError('tabla-proveedores', 7, 'Error al cargar proveedores');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    const total = todosLosProveedores.length;
    const conDistribuidora = todosLosProveedores.filter(p => p.Distribuidora?.trim()).length;
    const sinDistribuidora = total - conDistribuidora;

    document.getElementById('stat-total')?.textContent !== undefined &&
        (document.getElementById('stat-total').textContent = total);
    document.getElementById('stat-con-distribuidora') &&
        (document.getElementById('stat-con-distribuidora').textContent = conDistribuidora);
    document.getElementById('stat-sin-distribuidora') &&
        (document.getElementById('stat-sin-distribuidora').textContent = sinDistribuidora);
}

/* Filtrar y renderizar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-proveedores')?.value.toLowerCase().trim() || '';
    const orden = document.getElementById('ordenar-proveedores')?.value || 'nombre-asc';

    let lista = todosLosProveedores.filter(p =>
        p.Nombre?.toLowerCase().includes(termino) ||
        p.Distribuidora?.toLowerCase().includes(termino) ||
        p.Correo?.toLowerCase().includes(termino)
    );

    if (orden === 'nombre-asc') lista.sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    if (orden === 'nombre-desc') lista.sort((a, b) => b.Nombre.localeCompare(a.Nombre));

    const total = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;

    const inicio = (paginaActual - 1) * POR_PAGINA;
    renderTabla(lista.slice(inicio, inicio + POR_PAGINA));
    renderPaginacion(total, totalPags);
}

/* Renderizar tabla */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-proveedores');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron proveedores</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(p => `
        <tr>
            <td>${p.idProveedor}</td>
            <td class="fw-semibold">${p.Nombre}</td>
            <td>${p.Distribuidora || '—'}</td>
            <td>${p.Telefono || '—'}</td>
            <td>${p.Correo || '—'}</td>
            <td>${p.Direccion || '—'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" title="Editar"
                            onclick="abrirEditar(${p.idProveedor})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Eliminar"
                            onclick="confirmarEliminar(${p.idProveedor}, '${(p.Nombre || '').replace(/'/g, "\\'")}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

/* Guardar proveedor */
async function guardarProveedor() {
    const nombre = document.getElementById('agregar-nombre').value.trim();
    if (!nombre) {
        document.getElementById('agregar-nombre').classList.add('is-invalid');
        document.getElementById('agregar-nombre-error').textContent = 'El nombre es obligatorio';
        return;
    }
    document.getElementById('agregar-nombre').classList.remove('is-invalid');

    setBtnLoading('btn-guardar-proveedor', true, '<i class="bi bi-floppy me-1"></i>Guardar');
    try {
        const payload = {
            nombre,
            distribuidora: document.getElementById('agregar-contacto').value.trim(),
            correo: document.getElementById('agregar-email').value.trim(),
            telefono: document.getElementById('agregar-telefono').value.trim(),
            direccion: document.getElementById('agregar-direccion').value.trim(),
        };
        await ProductosService.crearProveedor(payload, AuthUtils.getHeaders());
        bootstrap.Modal.getInstance(document.getElementById('agregarProveedorModal'))?.hide();
        Toast.success('Proveedor agregado exitosamente');
        await cargarProveedores();
    } catch (err) {
        Toast.error(err.message || 'Error al eliminar');
    } finally {
        setBtnLoading('btn-guardar-proveedor', false, '<i class="bi bi-floppy me-1"></i>Guardar');
    }
}

/* Abrir edición */
window.abrirEditar = function (id) {
    const p = todosLosProveedores.find(x => x.idProveedor === id);
    if (!p) return;
    document.getElementById('editar-id').value = p.idProveedor;
    document.getElementById('editar-nombre').value = p.Nombre || '';
    document.getElementById('editar-contacto').value = p.Distribuidora || '';
    document.getElementById('editar-telefono').value = p.Telefono || '';
    document.getElementById('editar-email').value = p.Correo || '';
    document.getElementById('editar-direccion').value = p.Direccion || '';
    new bootstrap.Modal(document.getElementById('editarProveedorModal')).show();
};

/* Actualizar proveedor */
async function actualizarProveedor() {
    const id = document.getElementById('editar-id').value;
    const nombre = document.getElementById('editar-nombre').value.trim();
    if (!nombre) {
        document.getElementById('editar-nombre').classList.add('is-invalid');
        document.getElementById('editar-nombre-error').textContent = 'El nombre es obligatorio';
        return;
    }
    document.getElementById('editar-nombre').classList.remove('is-invalid');

    setBtnLoading('btn-actualizar-proveedor', true, '<i class="bi bi-floppy me-1"></i>Actualizar');
    try {
        const payload = {
            nombre,
            distribuidora: document.getElementById('editar-contacto').value.trim(),
            correo: document.getElementById('editar-email').value.trim(),
            telefono: document.getElementById('editar-telefono').value.trim(),
            direccion: document.getElementById('editar-direccion').value.trim(),
        };
        await ProductosService.actualizarProveedor(id, payload, AuthUtils.getHeaders());
        bootstrap.Modal.getInstance(document.getElementById('editarProveedorModal'))?.hide();
        Toast.success('Proveedor actualizado exitosamente');
        await cargarProveedores();
    } catch (err) {
        Toast.error(err.message || 'Error al eliminar');
    } finally {
        setBtnLoading('btn-actualizar-proveedor', false, '<i class="bi bi-floppy me-1"></i>Actualizar');
    }
}

/* Confirmar eliminar */
window.confirmarEliminar = function (id, nombre) {
    Toast.confirm(
        {
            titulo: 'Eliminar proveedor',
            msg: `¿Eliminar a <strong>"${nombre}"</strong>?<br>
                      <span style="font-size:.85rem;color:#666;">No se puede eliminar si tiene productos activos.</span>`,
            tipo: 'danger',
            labelOk: 'Sí, eliminar',
        },
        () => eliminarProveedor(id)
    );
};

async function eliminarProveedor(id) {
    try {
        await ProductosService.eliminarProveedor(id, AuthUtils.getHeaders());
        Toast.success('Proveedor eliminado');
        await cargarProveedores();
    } catch (err) {
        Toast.error(err.message || 'Error al eliminar');
    }
}

/* Paginación */
function renderPaginacion(total, totalPags) {
    let contenedor = document.getElementById('paginacion-proveedores');
    if (!contenedor) {
        const card = document.getElementById('tabla-proveedores')?.closest('.card-body');
        if (card) {
            contenedor = document.createElement('div');
            contenedor.id = 'paginacion-proveedores';
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
            <button class="page-link" onclick="irAPaginaProveedores(${i})">${i}</button></li>`;
    }
    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${inicio}–${fin} de ${total} proveedores</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaProveedores(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaProveedores(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPaginaProveedores = function (n) {
    const totalPags = Math.ceil(todosLosProveedores.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await cargarProveedores();

    let debounce;
    document.getElementById('ordenar-proveedores')?.addEventListener('change', () => { paginaActual = 1; aplicarFiltrosYRenderizar(); });
    document.getElementById('buscador-proveedores')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });
    document.getElementById('btn-guardar-proveedor')?.addEventListener('click', guardarProveedor);
    document.getElementById('btn-actualizar-proveedor')?.addEventListener('click', actualizarProveedor);
});