// bit(1) de MariaDB puede llegar como Buffer, boolean o number
function esActivo(val) {
    if (val === true || val === 1 || val === '1') return true;
    return false;
}

// categorias.js — tipos base (platillo/bebida/snack) con toggle de estado
let todasLasCategorias = [];

const TIPO_LABEL = {
    platillo: { label: 'Platillo', icon: 'bi-egg-fried', color: 'success' },
    bebida: { label: 'Bebida', icon: 'bi-cup-straw', color: 'info' },
    snack: { label: 'Snack', icon: 'bi-bag', color: 'warning' },
};

async function cargarCategorias() {
    const tbody = document.getElementById('tabla-categorias');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">
        <span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>`;
    try {
        todasLasCategorias = await ProductosService.getCategorias();
        actualizarEstadisticas();
        renderTabla(todasLasCategorias);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>Error al cargar</td></tr>`;
    }
}

function actualizarEstadisticas() {
    document.getElementById('stat-total').textContent = todasLasCategorias.length;
    document.getElementById('stat-activas').textContent =
        todasLasCategorias.filter(c => esActivo(c.Estado)).length;
    const totalSubs = todasLasCategorias.reduce((s, c) => s + (c.totalSubcategorias || 0), 0);
    document.getElementById('stat-productos').textContent = totalSubs;
}

function renderTabla(lista) {
    const tbody = document.getElementById('tabla-categorias');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Sin categorías</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(c => {
        const t = TIPO_LABEL[c.tipo] || { label: c.tipo, icon: 'bi-tag', color: 'secondary' };
        const activo = esActivo(c.Estado);
        return `
        <tr>
            <td>
                <span class="badge bg-${t.color} badge-tipo">
                    <i class="bi ${t.icon} me-1"></i>${t.label}
                </span>
            </td>
            <td>
                <a href="subcategorias.html" class="badge bg-secondary text-decoration-none">
                    <i class="bi bi-tags me-1"></i>${c.totalSubcategorias || 0} subcategorías
                </a>
            </td>
            <td>
                <span class="badge ${activo ? 'bg-success' : 'bg-danger'}">
                    ${activo ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" title="Ver detalles"
                            data-id="${c.idCategoria}" onclick="abrirDetalleCat(this.dataset.id)">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-${activo ? 'danger' : 'success'}"
                            onclick="toggleEstado(${c.idCategoria}, ${activo})"
                            title="${activo ? 'Desactivar' : 'Activar'}">
                        <i class="bi ${activo ? 'bi-toggle-on' : 'bi-toggle-off'}"></i>
                        ${activo ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.toggleEstado = async function (id, activo) {
    Toast.confirm(
        {
            titulo: activo ? 'Desactivar categoría' : 'Activar categoría',
            msg: `¿Deseas ${activo ? 'desactivar' : 'activar'} la categoría <strong>${activo ? 'seleccionada' : 'seleccionada'}</strong>?`,
            tipo: activo ? 'warning' : 'info',
            labelOk: activo ? 'Sí, desactivar' : 'Sí, activar',
        },
        async () => {
            try {
                await ProductosService.actualizarCategoria(id, { estado: activo ? 0 : 1 }, AuthUtils.getHeaders());
                Toast.success(`Categoría ${activo ? 'desactivada' : 'activada'} correctamente`);
                await cargarCategorias();
            } catch (err) {
                Toast.error(err.message || 'Error al cambiar estado');
            }
        }
    );
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await cargarCategorias();
});

window.abrirDetalleCat = function (id) {
    const cat = todasLasCategorias.find(x => String(x.idCategoria) === String(id));
    if (!cat) return;
    const t = TIPO_LABEL[cat.tipo] || { label: cat.tipo, icon: 'bi-tag', color: 'secondary' };
    const activo = esActivo(cat.Estado);
    const body = document.getElementById('detalle-cat-body');
    body.innerHTML = `
        <div class="row g-3">
            <div class="col-md-4"><small class="text-muted d-block">ID</small><strong>#${cat.idCategoria}</strong></div>
            <div class="col-md-4"><small class="text-muted d-block">Tipo</small>
                <span class="badge bg-${t.color} badge-tipo"><i class="bi ${t.icon} me-1"></i>${t.label}</span>
            </div>
            <div class="col-md-4"><small class="text-muted d-block">Estado</small>
                <span class="badge ${activo ? 'bg-success' : 'bg-danger'}">${activo ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div class="col-md-6"><small class="text-muted d-block">Total subcategorías</small><strong>${cat.totalSubcategorias || 0}</strong></div>
            <div class="col-md-6"><small class="text-muted d-block">Fecha de registro</small><small>${FormatUtils.fechaCorta(cat.FechaRegistro)}</small></div>
        </div>`;
    new bootstrap.Modal(document.getElementById('detalleCatModal')).show();
};