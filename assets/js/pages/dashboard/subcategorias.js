let todasLas    = [];   // todas las subcategorías cargadas
let todasLasCats = [];  // categorías para obtener idCategoria por tipo
let paginaActual = 1;
const POR_PAGINA = 10;

// Badges de tipo
const TIPO_INFO = {
    platillo: { label: 'Platillo', color: 'success', icon: 'bi-egg-fried' },
    bebida:   { label: 'Bebida',   color: 'info',    icon: 'bi-cup-straw' },
    snack:    { label: 'Snack',    color: 'warning', icon: 'bi-bag'       },
};

// Helpers
function setBtnLoading(id, cargando, textoOriginal) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = cargando;
    btn.innerHTML = cargando
        ? `<span class="spinner-border spinner-border-sm me-2"></span>Guardando...`
        : textoOriginal;
}

// bit(1) de MariaDB puede llegar como Buffer, boolean o number
function esActivo(val) {
    if (val === true || val === 1 || val === '1') return true;
    if (Buffer && Buffer.isBuffer && Buffer.isBuffer(val)) return val[0] === 1;
    return false;
}

// Obtener idCategoria a partir del tipo seleccionado
function idCategoriaDeTipo(tipo) {
    const cat = todasLasCats.find(c => c.tipo === tipo);
    return cat ? cat.idCategoria : null;
}

// Carga inicial
async function cargarTodo() {
    document.getElementById('tabla-subcategorias').innerHTML =
        `<tr><td colspan="7" class="text-center py-4 text-muted">
         <span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>`;
    try {
        // La API devuelve TODAS (activas e inactivas) cuando no se pasa ?estado
        [todasLas, todasLasCats] = await Promise.all([
            SubcategoriasService.getSubcategorias(),
            ProductosService.getCategorias(),
        ]);
        actualizarEstadisticas();
        aplicarFiltros();
    } catch (err) {
        document.getElementById('tabla-subcategorias').innerHTML =
            `<tr><td colspan="7" class="text-center py-4 text-danger">
             <i class="bi bi-exclamation-triangle me-2"></i>Error al cargar: ${err.message}</td></tr>`;
        console.error(err);
    }
}

function actualizarEstadisticas() {
    document.getElementById('stat-total').textContent     = todasLas.length;
    document.getElementById('stat-platillos').textContent = todasLas.filter(s => s.tipo === 'platillo').length;
    document.getElementById('stat-bebidas').textContent   = todasLas.filter(s => s.tipo === 'bebida').length;
}

// Filtros y render
function aplicarFiltros() {
    const termino = (document.getElementById('buscador-subcategorias')?.value || '').toLowerCase().trim();
    const tipo    =  document.getElementById('filtro-tipo-sub')?.value   || '';
    const estado  =  document.getElementById('filtro-estado-sub')?.value ?? '';
    const orden   =  document.getElementById('ordenar-subcategorias')?.value || 'nombre-asc';

    let lista = todasLas.filter(s => {
        const coincideNombre = (s.Descripcion || '').toLowerCase().includes(termino);
        const coincideTipo   = !tipo || s.tipo === tipo;
        const coincideEstado = estado === ''
            ? true
            : (esActivo(s.Estado) ? '1' : '0') === estado;
        return coincideNombre && coincideTipo && coincideEstado;
    });

    switch (orden) {
        case 'nombre-asc':     lista.sort((a,b)=>(a.Descripcion||'').localeCompare(b.Descripcion||'')); break;
        case 'nombre-desc':    lista.sort((a,b)=>(b.Descripcion||'').localeCompare(a.Descripcion||'')); break;
        case 'tipo-asc':       lista.sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')); break;
        case 'productos-desc': lista.sort((a,b)=>(b.totalProductos||0)-(a.totalProductos||0)); break;
    }

    const total     = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;

    renderTabla(lista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA));
    renderPaginacion(total, totalPags);
}

function renderTabla(lista) {
    const tbody = document.getElementById('tabla-subcategorias');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron subcategorías</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(s => {
        const t      = TIPO_INFO[s.tipo] || { label: s.tipo, color: 'secondary', icon: 'bi-tag' };
        const activo = esActivo(s.Estado);

        return `
        <tr>
            <td>${s.idSubcategoria}</td>
            <td class="fw-semibold">${s.Descripcion || '—'}</td>
            <td>
                <span class="badge bg-${t.color}">
                    <i class="bi ${t.icon} me-1"></i>${t.label}
                </span>
            </td>
            <td><span class="badge bg-secondary">${s.totalProductos || 0} productos</span></td>
            <td>
                <span class="badge ${activo ? 'bg-success' : 'bg-danger'}">
                    ${activo ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td><small class="text-muted">${FormatUtils.fechaCorta(s.FechaRegistro)}</small></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" title="Editar"
                            onclick="abrirEditar(${s.idSubcategoria})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Eliminar"
                            onclick="confirmarEliminar(${s.idSubcategoria}, '${(s.Descripcion || '').replace(/'/g, "\\'")}', ${s.totalProductos || 0})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Guardar
async function guardarSubcategoria() {
    const tipo   = document.getElementById('agregar-tipo-sub').value;
    const nombre = document.getElementById('agregar-nombre-sub').value.trim();

    // Validar
    let valido = true;
    const setInvalid = (id, errId, msg) => {
        document.getElementById(id).classList.add('is-invalid');
        document.getElementById(errId).textContent = msg;
        valido = false;
    };
    const clearInvalid = (id) => document.getElementById(id).classList.remove('is-invalid');

    if (!tipo)   { setInvalid('agregar-tipo-sub',    'agregar-tipo-error',   'Selecciona un tipo'); }
    else           clearInvalid('agregar-tipo-sub');
    if (!nombre) { setInvalid('agregar-nombre-sub',  'agregar-nombre-error', 'El nombre es obligatorio'); }
    else           clearInvalid('agregar-nombre-sub');
    if (!valido) return;

    const idCategoria = idCategoriaDeTipo(tipo);
    if (!idCategoria) { Toast.error('No se encontró la categoría para este tipo'); return; }

    setBtnLoading('btn-guardar-sub', true, '<i class="bi bi-floppy me-1"></i>Guardar');
    try {
        await SubcategoriasService.crearSubcategoria(
            { descripcion: nombre, idCategoria },
            AuthUtils.getHeaders()
        );
        bootstrap.Modal.getInstance(document.getElementById('modalAgregar'))?.hide();
        document.getElementById('agregar-tipo-sub').value = '';
        document.getElementById('agregar-nombre-sub').value = '';
        Toast.success('Subcategoría creada exitosamente');
        await cargarTodo();
    } catch (err) {
        Toast.error(err.message || 'Error al guardar');
    } finally {
        setBtnLoading('btn-guardar-sub', false, '<i class="bi bi-floppy me-1"></i>Guardar');
    }
}

// Editar
window.abrirEditar = function(id) {
    const sub = todasLas.find(s => s.idSubcategoria === id);
    if (!sub) { Toast.error('Subcategoría no encontrada'); return; }

    document.getElementById('editar-id-sub').value      = sub.idSubcategoria;
    document.getElementById('editar-tipo-sub').value    = sub.tipo || '';
    document.getElementById('editar-nombre-sub').value  = sub.Descripcion || '';
    document.getElementById('editar-estado-sub').checked = esActivo(sub.Estado);

    new bootstrap.Modal(document.getElementById('modalEditar')).show();
};

async function actualizarSubcategoria() {
    const id     = document.getElementById('editar-id-sub').value;
    const tipo   = document.getElementById('editar-tipo-sub').value;
    const nombre = document.getElementById('editar-nombre-sub').value.trim();
    const estado = document.getElementById('editar-estado-sub').checked ? 1 : 0;

    if (!nombre) {
        document.getElementById('editar-nombre-sub').classList.add('is-invalid');
        document.getElementById('editar-nombre-error').textContent = 'El nombre es obligatorio';
        return;
    }
    document.getElementById('editar-nombre-sub').classList.remove('is-invalid');

    const idCategoria = idCategoriaDeTipo(tipo);
    if (!idCategoria) { Toast.error('No se encontró la categoría para este tipo'); return; }

    setBtnLoading('btn-actualizar-sub', true, '<i class="bi bi-floppy me-1"></i>Actualizar');
    try {
        await SubcategoriasService.actualizarSubcategoria(
            id,
            { descripcion: nombre, idCategoria, estado },
            AuthUtils.getHeaders()
        );
        bootstrap.Modal.getInstance(document.getElementById('modalEditar'))?.hide();
        Toast.success('Subcategoría actualizada');
        await cargarTodo();
    } catch (err) {
        Toast.error(err.message || 'Error al actualizar');
    } finally {
        setBtnLoading('btn-actualizar-sub', false, '<i class="bi bi-floppy me-1"></i>Actualizar');
    }
}

// Eliminar
window.confirmarEliminar = function(id, nombre, totalProductos) {
    if (totalProductos > 0) {
        Toast.warning(`"${nombre}" tiene ${totalProductos} producto(s) vinculado(s) y no puede eliminarse.`);
        return;
    }
    Toast.confirm(
        {
            titulo:  'Eliminar subcategoría',
            msg:     `¿Eliminar permanentemente <strong>"${nombre}"</strong>?<br>
                      <span style="color:#dc3545;font-size:.85rem;">Esta acción no se puede deshacer.</span>`,
            tipo:    'danger',
            labelOk: 'Sí, eliminar',
        },
        () => eliminarSubcategoria(id, nombre)
    );
};

async function eliminarSubcategoria(id, nombre) {
    try {
        await SubcategoriasService.eliminarSubcategoria(id, AuthUtils.getHeaders());
        Toast.success(`Subcategoría "${nombre}" eliminada correctamente`);
        await cargarTodo();
    } catch (err) {
        Toast.error(err.message || 'Error al eliminar');
    }
}

// Paginación
function renderPaginacion(total, totalPags) {
    const c = document.getElementById('paginacion-subcategorias');
    if (!c) return;
    if (totalPags <= 1) { c.innerHTML = ''; return; }

    const ini = (paginaActual - 1) * POR_PAGINA + 1;
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

    c.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${ini}–${fin} de ${total} subcategorías</small>
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

window.irAPagina = function(n) {
    const t = Math.ceil(todasLas.length / POR_PAGINA) || 1;
    if (n < 1 || n > t) return;
    paginaActual = n;
    aplicarFiltros();
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;

    await cargarTodo();

    document.getElementById('btn-guardar-sub')?.addEventListener('click', guardarSubcategoria);
    document.getElementById('btn-actualizar-sub')?.addEventListener('click', actualizarSubcategoria);

    let debounce;
    document.getElementById('buscador-subcategorias')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltros(); }, 300);
    });

    ['filtro-tipo-sub', 'filtro-estado-sub', 'ordenar-subcategorias'].forEach(id =>
        document.getElementById(id)?.addEventListener('change', () => {
            paginaActual = 1;
            aplicarFiltros();
        })
    );
});