let todasLasCategorias = [];
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

/* Cargar categorías */
async function cargarCategorias() {
    setLoading('tabla-categorias', 5);
    try {
        todasLasCategorias = await ProductosService.getCategorias();
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        setError('tabla-categorias', 5, 'Error al cargar categorías');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    document.getElementById('stat-total').textContent = todasLasCategorias.length;
    document.getElementById('stat-activas').textContent = todasLasCategorias.length; // API ya filtra Estado=1
    document.getElementById('stat-productos').textContent = 0; // No disponible en este endpoint
}

/* Filtrar y renderizar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-categorias')?.value.toLowerCase().trim() || '';
    const orden = document.getElementById('ordenar-categorias')?.value || 'nombre-asc';

    let lista = todasLasCategorias.filter(c =>
        c.Descripcion?.toLowerCase().includes(termino)
    );

    if (orden === 'nombre-asc') lista.sort((a, b) => (a.Descripcion || '').localeCompare(b.Descripcion || ''));
    if (orden === 'nombre-desc') lista.sort((a, b) => (b.Descripcion || '').localeCompare(a.Descripcion || ''));

    const total = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;

    const inicio = (paginaActual - 1) * POR_PAGINA;
    renderTabla(lista.slice(inicio, inicio + POR_PAGINA));
    renderPaginacion(total, totalPags);
}

/* Renderizar tabla */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-categorias');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron categorías</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(c => `
        <tr>
            <td>${c.idCategoria}</td>
            <td class="fw-semibold">${c.Descripcion || '—'}</td>
            <td><small class="text-muted">${FormatUtils.fechaCorta(c.FechaRegistro)}</small></td>
            <td><span class="badge bg-success">Activa</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" title="Editar"
                            onclick="abrirEditar(${c.idCategoria})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Eliminar"
                            onclick="confirmarEliminar(${c.idCategoria}, '${(c.Descripcion || '').replace(/'/g, "\\'")}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

/* Guardar categoría */
async function guardarCategoria() {
    const nombre = document.getElementById('agregar-nombre').value.trim();
    if (!nombre) {
        document.getElementById('agregar-nombre').classList.add('is-invalid');
        document.getElementById('agregar-nombre-error').textContent = 'El nombre es obligatorio';
        return;
    }
    document.getElementById('agregar-nombre').classList.remove('is-invalid');

    setBtnLoading('btn-guardar-categoria', true, '<i class="bi bi-floppy me-1"></i>Guardar');
    try {
        await ProductosService.crearCategoria({ descripcion: nombre }, AuthUtils.getHeaders());
        bootstrap.Modal.getInstance(document.getElementById('agregarCategoriaModal'))?.hide();
        document.getElementById('agregar-nombre').value = '';
        Toast?.success('Categoría agregada exitosamente');
        await cargarCategorias();
    } catch (err) {
        Toast?.error(err.message);
    } finally {
        setBtnLoading('btn-guardar-categoria', false, '<i class="bi bi-floppy me-1"></i>Guardar');
    }
}

/* Abrir edición */
window.abrirEditar = function (id) {
    const cat = todasLasCategorias.find(c => c.idCategoria === id);
    if (!cat) return;
    document.getElementById('editar-id').value = cat.idCategoria;
    document.getElementById('editar-nombre').value = cat.Descripcion || '';
    new bootstrap.Modal(document.getElementById('editarCategoriaModal')).show();
};

/* Actualizar categoría */
async function actualizarCategoria() {
    const id = document.getElementById('editar-id').value;
    const nombre = document.getElementById('editar-nombre').value.trim();
    if (!nombre) {
        document.getElementById('editar-nombre').classList.add('is-invalid');
        document.getElementById('editar-nombre-error').textContent = 'El nombre es obligatorio';
        return;
    }
    document.getElementById('editar-nombre').classList.remove('is-invalid');

    setBtnLoading('btn-actualizar-categoria', true, '<i class="bi bi-floppy me-1"></i>Actualizar');
    try {
        await ProductosService.actualizarCategoria(id, { descripcion: nombre }, AuthUtils.getHeaders());
        bootstrap.Modal.getInstance(document.getElementById('editarCategoriaModal'))?.hide();
        Toast?.success('Categoría actualizada exitosamente');
        await cargarCategorias();
    } catch (err) {
        Toast?.error(err.message);
    } finally {
        setBtnLoading('btn-actualizar-categoria', false, '<i class="bi bi-floppy me-1"></i>Actualizar');
    }
}

/* Confirmar eliminar */
window.confirmarEliminar = function (id, nombre) {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?\nNo se puede eliminar si tiene productos activos.`)) return;
    eliminarCategoria(id);
};

async function eliminarCategoria(id) {
    try {
        await ProductosService.eliminarCategoria(id, AuthUtils.getHeaders());
        Toast?.success('Categoría eliminada');
        await cargarCategorias();
    } catch (err) {
        Toast?.error(err.message);
    }
}

/* Paginación */
function renderPaginacion(total, totalPags) {
    let contenedor = document.getElementById('paginacion-categorias');
    if (!contenedor) {
        const card = document.getElementById('tabla-categorias')?.closest('.card-body');
        if (card) {
            contenedor = document.createElement('div');
            contenedor.id = 'paginacion-categorias';
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
            <button class="page-link" onclick="irAPaginaCategorias(${i})">${i}</button></li>`;
    }
    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${inicio}–${fin} de ${total} categorías</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaCategorias(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaCategorias(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPaginaCategorias = function (n) {
    const totalPags = Math.ceil(todasLasCategorias.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await cargarCategorias();

    let debounce;
    document.getElementById('ordenar-categorias')?.addEventListener('change', () => { paginaActual = 1; aplicarFiltrosYRenderizar(); });
    document.getElementById('buscador-categorias')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });
    document.getElementById('btn-guardar-categoria')?.addEventListener('click', guardarCategoria);
    document.getElementById('btn-actualizar-categoria')?.addEventListener('click', actualizarCategoria);
});