let todasLasSubcats = [];
let todasLasCategorias = [];

/* Estado global */
let todosLosProductos = []; // página actual
let totalProductos = 0;
let totalPaginas = 0;
let paginaActual = 1;
const POR_PAGINA = 10;

/* Helpers UI */
function setLoading(tbodyId, cols, msg = 'Cargando...') {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4 text-muted">
        <span class="spinner-border spinner-border-sm me-2"></span>${msg}</td></tr>`;
}

function mostrarError(tbodyId, cols, msg) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4 text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>${msg}</td></tr>`;
}

function setBtnLoading(btnId, activo, textoOriginal, textoLoading = 'Guardando...') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = activo;
    btn.innerHTML = activo
        ? `<span class="spinner-border spinner-border-sm me-2"></span>${textoLoading}`
        : textoOriginal;
}

/* Imagen: leer archivo como base64 */
/* Delegar a CloudinaryService */
const leerImagenBase64 = (inputId) => CloudinaryService.leerBase64(inputId);
const initPreviewImagen = (inputId, previewId) => CloudinaryService.initPreview(inputId, previewId);

/* Cargar categorías en selects */
async function cargarCategorias() {
    // Los selects de categoría fueron reemplazados por tipo + subcategoria
}

/* Cargar proveedores en selects */
async function cargarProveedores() {
    try {
        const provs = await ProductosService.getProveedores(AuthUtils.getHeaders());

        ['agregar-proveedor', 'editar-proveedor'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Seleccionar proveedor</option>';
            provs.forEach(p => {
                sel.innerHTML += `<option value="${p.idProveedor}">${p.Nombre}</option>`;
            });
        });
    } catch { /* no crítico */ }
}

/* Cargar y renderizar productos */
/* Cargar productos del servidor — paginación real
 * Los filtros de búsqueda, tipo, subcategoría, estado y ordenamiento
 * se aplican en el frontend sobre la página actual.
 * Al cambiar de página se hace una nueva llamada al servidor.
 */
async function cargarProductos(pagina = 1) {
    setLoading('tabla-productos', 7);
    paginaActual = pagina;
    try {
        // Subcategorías y categorías se cargan una sola vez (catálogos ligeros)
        if (!todasLasSubcats.length || !todasLasCategorias.length) {
            const [subcats, cats] = await Promise.all([
                SubcategoriasService.getSubcategorias(),
                ProductosService.getCategorias(),
            ]);
            todasLasSubcats = subcats;
            todasLasCategorias = cats;
        }

        const resultado = await ProductosService.getAllPaginado(
            AuthUtils.getHeaders(), pagina, POR_PAGINA
        );
        todosLosProductos = resultado.items || [];
        totalProductos = resultado.total || 0;
        totalPaginas = resultado.totalPaginas || 0;

        actualizarEstadisticas();
        renderTabla(todosLosProductos);
        renderPaginacion();
    } catch (err) {
        mostrarError('tabla-productos', 7, 'Error al cargar productos');
        console.error(err);
    }
}

/* Estadísticas — usa stock-critico para conteos precisos sobre todos los productos */
function actualizarEstadisticas() {
    // Total viene del servidor
    document.getElementById('stat-total').textContent = totalProductos;

    // Activos, stock bajo y sin stock: calculados sobre la página actual
    // (aproximación visual — los conteos exactos están en reportes/stock-critico)
    const activos = todosLosProductos.filter(p => p.Estado !== 0).length;
    const stockBajo = todosLosProductos.filter(p => p.Stock > 0 && p.Stock < 10).length;
    const sinStock = todosLosProductos.filter(p => p.Stock <= 0).length;

    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-stock-bajo').textContent = stockBajo;
    document.getElementById('stat-sin-stock').textContent = sinStock;
}

/* Filtrar + ordenar la página actual y re-renderizar sin ir al servidor */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-productos')?.value.toLowerCase().trim() || '';
    const tipoFiltro = document.getElementById('filtro-tipo')?.value || '';
    const subFiltro = document.getElementById('filtro-subcategoria')?.value || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || '';
    const ordenamiento = document.getElementById('ordenar-productos')?.value || 'nombre-asc';

    let lista = todosLosProductos.filter(p => {
        const coincideBusqueda =
            p.Nombre?.toLowerCase().includes(termino) ||
            p.Codigo?.toLowerCase().includes(termino) ||
            p.subcategoria?.toLowerCase().includes(termino);
        const coincideTipo = !tipoFiltro || p.tipo === tipoFiltro;
        const coincideSub = !subFiltro || String(p.idSubcategoria) === subFiltro;
        const coincideEstado = estadoFiltro === '' || String(p.Estado ?? 1) === estadoFiltro;
        return coincideBusqueda && coincideTipo && coincideSub && coincideEstado;
    });

    switch (ordenamiento) {
        case 'nombre-asc': lista.sort((a, b) => a.Nombre.localeCompare(b.Nombre)); break;
        case 'nombre-desc': lista.sort((a, b) => b.Nombre.localeCompare(a.Nombre)); break;
        case 'precio-asc': lista.sort((a, b) => a.PrecioVenta - b.PrecioVenta); break;
        case 'precio-desc': lista.sort((a, b) => b.PrecioVenta - a.PrecioVenta); break;
        case 'stock-asc': lista.sort((a, b) => a.Stock - b.Stock); break;
        case 'stock-desc': lista.sort((a, b) => b.Stock - a.Stock); break;
    }

    renderTabla(lista);
}

/* Renderizar tabla */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-productos');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron productos</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const imgHtml = p.Imagen
            ? `<img src="${p.Imagen}" class="img-tabla img-thumbnail"
                    onerror="this.src='https://placehold.co/48x48/e2e8f0/94a3b8?text=?'">`
            : `<div class="img-tabla img-tabla-placeholder bg-light rounded">
                    <i class="bi bi-image text-muted"></i></div>`;

        const stockClass = FormatUtils.claseStock(p.Stock);

        return `
        <tr>
            <td>${imgHtml}</td>
            <td>
                <div class="fw-semibold">${p.Nombre}</div>
                <small class="text-muted">${p.Codigo || '—'}</small>
            </td>
            <td><span class="badge bg-primary">${p.subcategoria || p.tipo || '—'}</span></td>
            <td class="fw-semibold">${FormatUtils.moneda(p.PrecioVenta, false)}</td>
            <td class="${stockClass} fw-semibold">${p.Stock}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" title="Ver detalles"
                            data-id="${p.idProducto}" onclick="abrirDetalle(this.dataset.id)">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning" title="Editar"
                            onclick="abrirEditar(${p.idProducto})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-info" title="Ajustar Stock"
                            onclick="abrirAjustarStock(${p.idProducto}, '${p.Nombre.replace(/'/g, "\\'")}', ${p.Stock})">
                        <i class="bi bi-boxes"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Eliminar"
                            onclick="confirmarEliminar(${p.idProducto}, '${p.Nombre.replace(/'/g, "\\'")}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

/* Paginación del servidor */
function renderPaginacion() {
    const contenedor = document.getElementById('paginacion-productos');
    if (!contenedor) return;
    if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }

    const inicio = (paginaActual - 1) * POR_PAGINA + 1;
    const fin = Math.min(paginaActual * POR_PAGINA, totalProductos);

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

    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${totalProductos ? inicio : 0}–${fin} de ${totalProductos} productos</small>
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
    cargarProductos(n);
};

/* Guardar nuevo producto */
async function guardarProducto() {
    const nombre = document.getElementById('agregar-nombre').value.trim();
    const subcategoria = document.getElementById('agregar-subcategoria').value;
    const proveedor = document.getElementById('agregar-proveedor').value;
    const precio = document.getElementById('agregar-precio-venta').value;
    const stock = document.getElementById('agregar-stock').value;

    // Validaciones
    let valido = true;
    if (!nombre) {
        document.getElementById('agregar-nombre').classList.add('is-invalid');
        document.getElementById('agregar-nombre-error').textContent = 'El nombre es obligatorio';
        valido = false;
    } else {
        document.getElementById('agregar-nombre').classList.remove('is-invalid');
    }
    if (!subcategoria) {
        document.getElementById('agregar-subcategoria').classList.add('is-invalid');
        document.getElementById('agregar-subcategoria-error').textContent = 'Selecciona una subcategoría';
        valido = false;
    } else {
        document.getElementById('agregar-subcategoria').classList.remove('is-invalid');
    }
    if (!precio || parseFloat(precio) <= 0) {
        document.getElementById('agregar-precio-venta').classList.add('is-invalid');
        document.getElementById('agregar-precio-error').textContent = 'Ingresa un precio válido';
        valido = false;
    } else {
        document.getElementById('agregar-precio-venta').classList.remove('is-invalid');
    }
    if (!valido) return;

    setBtnLoading('btn-guardar-producto', true, '<i class="bi bi-floppy me-1"></i>Guardar Producto');

    try {
        const imagen = await leerImagenBase64('agregar-imagen');
        // Obtener idCategoria desde el tipo seleccionado
        const tipoSel = document.getElementById('agregar-tipo').value;
        const catObj = todasLasCategorias.find(c => c.tipo === tipoSel);
        const idCategoria = catObj?.idCategoria || null;

        const payload = {
            nombre,
            codigo: document.getElementById('agregar-codigo').value.trim(),
            descripcion: document.getElementById('agregar-descripcion').value.trim(),
            precioVenta: parseFloat(precio),
            precioCompra: parseFloat(document.getElementById('agregar-precio-compra').value) || 0,
            stock: parseInt(stock) || 0,
            idCategoria,
            idSubcategoria: parseInt(subcategoria),
            idProveedor: parseInt(proveedor) || null,
            imagen: imagen || '',
            estado: document.getElementById('agregar-estado').checked ? 1 : 0,
        };

        const json = await ProductosService.crear(payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al guardar');

        bootstrap.Modal.getInstance(document.getElementById('agregarProductoModal'))?.hide();
        limpiarModalAgregar();
        Toast.success('Producto agregado exitosamente');
        await cargarProductos(1);

    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-guardar-producto', false, '<i class="bi bi-floppy me-1"></i>Guardar Producto');
    }
}


/* Ver detalles del producto */
window.abrirDetalle = function (id) {
    const p = todosLosProductos.find(x => String(x.idProducto) === String(id));
    if (!p) return;
    const modal = document.getElementById('detalleProductoModal');
    const body = document.getElementById('detalle-producto-body');
    const margen = p.PrecioCompra > 0
        ? (((p.PrecioVenta - p.PrecioCompra) / p.PrecioVenta) * 100).toFixed(1) + '%'
        : '—';
    body.innerHTML = `
        <div class="row g-3">
            <div class="col-md-4 text-center">
                ${p.Imagen
            ? `<img src="${p.Imagen}" class="img-fluid rounded shadow-sm"
                            style="max-height:200px;object-fit:cover;"
                            onerror="this.src='https://placehold.co/200x200/e2e8f0/94a3b8?text=Sin+imagen'">`
            : `<div class="bg-light rounded d-flex align-items-center justify-content-center"
                            style="height:200px;"><i class="bi bi-image fs-1 text-muted"></i></div>`
        }
                <div class="mt-2">${FormatUtils.badgeEstado(p.Estado !== 0)}</div>
            </div>
            <div class="col-md-8">
                <h5 class="fw-bold">${p.Nombre}</h5>
                <p class="text-muted small">${p.Descripcion || 'Sin descripción'}</p>
                <div class="row g-2">
                    <div class="col-6"><small class="text-muted d-block">Código</small><strong>${p.Codigo || '—'}</strong></div>
                    <div class="col-6"><small class="text-muted d-block">Tipo</small><span class="badge bg-secondary">${p.tipo || '—'}</span></div>
                    <div class="col-6"><small class="text-muted d-block">Subcategoría</small><span class="badge bg-primary">${p.subcategoria || '—'}</span></div>
                    <div class="col-6"><small class="text-muted d-block">Stock actual</small><strong class="${FormatUtils.claseStock(p.Stock)}">${p.Stock} unidades</strong></div>
                    <div class="col-6"><small class="text-muted d-block">Precio venta</small><strong class="text-success">${FormatUtils.moneda(p.PrecioVenta, false)}</strong></div>
                    <div class="col-6"><small class="text-muted d-block">Precio compra</small><strong>${FormatUtils.moneda(p.PrecioCompra, false)}</strong></div>
                    <div class="col-6"><small class="text-muted d-block">Margen de ganancia</small><strong class="text-info">${margen}</strong></div>
                    <div class="col-6"><small class="text-muted d-block">Estado</small>${FormatUtils.badgeEstado(p.Estado !== 0)}</div>
                </div>
            </div>
        </div>`;
    new bootstrap.Modal(modal).show();
};

/* Abrir modal de edición */
window.abrirEditar = async function (id) {
    try {
        const p = await ProductosService.getById(id);

        document.getElementById('editar-id').value = p.idProducto;
        document.getElementById('editar-nombre').value = p.Nombre || '';
        document.getElementById('editar-codigo').value = p.Codigo || '';
        document.getElementById('editar-descripcion').value = p.Descripcion || '';
        document.getElementById('editar-precio-venta').value = p.PrecioVenta || '';
        document.getElementById('editar-precio-compra').value = p.PrecioCompra || '';
        document.getElementById('editar-stock').value = p.Stock || 0;
        document.getElementById('editar-estado').checked = p.Estado !== 0;

        // Imagen actual
        const imgActual = document.getElementById('editar-imagen-actual');
        if (p.Imagen) {
            imgActual.src = p.Imagen;
            imgActual.classList.remove('d-none');
        } else {
            imgActual.classList.add('d-none');
        }

        // Selects — esperar que tengan opciones
        document.getElementById('editar-tipo').value = p.tipo || '';
        llenarSubcatsEditar(p.tipo, p.idSubcategoria);
        await Promise.all([
            setSelectValue('editar-proveedor', p.idProveedor),
        ]);

        new bootstrap.Modal(document.getElementById('editarProductoModal')).show();
    } catch (err) {
        Toast.error('Error al cargar producto: ' + err.message);
    }
};

function setSelectValue(selectId, value) {
    return new Promise(resolve => {
        setTimeout(() => {
            const sel = document.getElementById(selectId);
            if (sel) sel.value = value;
            resolve();
        }, 50);
    });
}

/* Actualizar producto */
async function actualizarProducto() {
    const id = document.getElementById('editar-id').value;
    const nombre = document.getElementById('editar-nombre').value.trim();
    const subcatEdit = document.getElementById('editar-subcategoria').value;
    const precio = document.getElementById('editar-precio-venta').value;

    if (!nombre || !subcatEdit || !precio) {
        Toast.warning('Nombre, subcategoría y precio son obligatorios');
        return;
    }

    setBtnLoading('btn-actualizar-producto', true, '<i class="bi bi-floppy me-1"></i>Actualizar Producto');

    try {
        const imagen = await leerImagenBase64('editar-imagen');
        // Obtener idCategoria desde el tipo seleccionado
        const tipoEdit = document.getElementById('editar-tipo').value;
        const catObjEdit = todasLasCategorias.find(ct => ct.tipo === tipoEdit);
        const idCatEdit = catObjEdit?.idCategoria || null;

        const payload = {
            nombre,
            codigo: document.getElementById('editar-codigo').value.trim(),
            descripcion: document.getElementById('editar-descripcion').value.trim(),
            precioVenta: parseFloat(precio),
            precioCompra: parseFloat(document.getElementById('editar-precio-compra').value) || 0,
            stock: parseInt(document.getElementById('editar-stock').value) || 0,
            idCategoria: idCatEdit,
            idSubcategoria: parseInt(subcatEdit),
            idProveedor: parseInt(document.getElementById('editar-proveedor').value) || null,
            imagen: imagen || undefined,
            estado: document.getElementById('editar-estado').checked ? 1 : 0,
        };

        const json = await ProductosService.actualizar(id, payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al actualizar');

        bootstrap.Modal.getInstance(document.getElementById('editarProductoModal'))?.hide();
        Toast.success('Producto actualizado exitosamente');
        await cargarProductos(paginaActual);

    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-actualizar-producto', false, '<i class="bi bi-floppy me-1"></i>Actualizar Producto');
    }
}

/* Ajustar stock */
window.abrirAjustarStock = function (id, nombre, stockActual) {
    document.getElementById('stock-producto-id').value = id;
    document.getElementById('stock-producto-nombre').textContent = nombre;
    document.getElementById('stock-actual').textContent = stockActual;
    document.getElementById('stock-cantidad').value = '';
    document.getElementById('stock-motivo').value = '';
    document.getElementById('stock-tipo').value = 'entrada';
    new bootstrap.Modal(document.getElementById('ajustarStockModal')).show();
};

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

    // Mapear tipo a id_tipo_movimiento de la API
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
        await cargarProductos(paginaActual);

    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-confirmar-stock', false, '<i class="bi bi-check-circle me-1"></i>Aplicar Ajuste');
    }
}

/* Eliminar producto */
window.confirmarEliminar = function (id, nombre) {
    Toast.confirm(
        {
            titulo: 'Eliminar producto',
            msg: `¿Eliminar permanentemente <strong>"${nombre}"</strong>?<br>
                      <span style="color:#dc3545;font-size:.85rem;">Esta acción no se puede deshacer.</span>`,
            tipo: 'danger',
            labelOk: 'Sí, eliminar',
        },
        () => eliminarProducto(id)
    );
};

async function eliminarProducto(id) {
    try {
        const json = await ProductosService.eliminar(id, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al eliminar');

        Toast.success('Producto eliminado correctamente');
        await cargarProductos(paginaActual);
    } catch (err) {
        Toast.error(err.message);
    }
}

/* Limpiar modal agregar */
function limpiarModalAgregar() {
    ['agregar-nombre', 'agregar-codigo', 'agregar-descripcion',
        'agregar-precio-venta', 'agregar-precio-compra', 'agregar-stock'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.classList.remove('is-invalid'); }
        });
    document.getElementById('agregar-tipo').value = '';
    document.getElementById('agregar-subcategoria').innerHTML = '<option value="">Primero selecciona un tipo</option>';
    document.getElementById('agregar-subcategoria').disabled = true;
    document.getElementById('agregar-nombre').value = '';
    document.getElementById('agregar-codigo').value = '';
    document.getElementById('agregar-descripcion').value = '';
    document.getElementById('agregar-precio-venta').value = '0.00';
    document.getElementById('agregar-precio-compra').value = '0.00';
    document.getElementById('agregar-stock').value = '0';
    document.getElementById('agregar-proveedor').value = '';
    document.getElementById('agregar-estado').checked = true;
    const preview = document.getElementById('agregar-imagen-preview');
    if (preview) { preview.src = ''; preview.classList.add('d-none'); }
    document.getElementById('agregar-imagen').value = '';
}

/* Contenedor de paginación */
function inyectarToolbarOrdenamiento() {
    if (!document.getElementById('paginacion-productos')) {
        const card = document.querySelector('#tabla-productos')?.closest('.card-body');
        if (card) {
            const div = document.createElement('div');
            div.id = 'paginacion-productos';
            card.appendChild(div);
        }
    }
}

// Helpers de selects dependientes
function llenarSubcatsAgregar(tipo) {
    const sel = document.getElementById('agregar-subcategoria');
    if (!sel) return;
    const lista = todasLasSubcats.filter(s => s.tipo === tipo);
    sel.disabled = lista.length === 0;
    sel.innerHTML = lista.length
        ? lista.map(s => `<option value="${s.idSubcategoria}">${s.Descripcion}</option>`).join('')
        : '<option value="">Sin subcategorías para este tipo</option>';
}

function llenarSubcatsEditar(tipo, valorSeleccionado) {
    const sel = document.getElementById('editar-subcategoria');
    if (!sel) return;
    const lista = todasLasSubcats.filter(s => s.tipo === tipo);
    sel.innerHTML = lista.length
        ? lista.map(s => `<option value="${s.idSubcategoria}">${s.Descripcion}</option>`).join('')
        : '<option value="">Sin subcategorías para este tipo</option>';
    if (valorSeleccionado) sel.value = String(valorSeleccionado);
}

function actualizarFiltroSubcategorias(tipo) {
    const sel = document.getElementById('filtro-subcategoria');
    if (!sel) return;
    const lista = tipo ? todasLasSubcats.filter(s => s.tipo === tipo) : todasLasSubcats;
    sel.innerHTML = '<option value="">Todas las subcategorías</option>'
        + lista.map(s => `<option value="${s.idSubcategoria}">${s.Descripcion}</option>`).join('');
}


/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;

    inyectarToolbarOrdenamiento();
    initPreviewImagen('agregar-imagen', 'agregar-imagen-preview');

    await Promise.all([cargarCategorias(), cargarProveedores()]);
    await cargarProductos(1);

    // Búsqueda con debounce — recarga del servidor en página 1
    let debounce;
    document.getElementById('buscador-productos')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => cargarProductos(1), 400);
    });

    // Ordenamiento — aplica sobre la página actual sin ir al servidor
    document.getElementById('ordenar-productos')?.addEventListener('change', () => {
        aplicarFiltrosYRenderizar();
    });

    document.getElementById('filtro-estado')?.addEventListener('change', () => {
        aplicarFiltrosYRenderizar();
    });

    document.getElementById('agregar-tipo')?.addEventListener('change', function () {
        llenarSubcatsAgregar(this.value);
    });
    document.getElementById('editar-tipo')?.addEventListener('change', function () {
        llenarSubcatsEditar(this.value, '');
    });
    document.getElementById('filtro-tipo')?.addEventListener('change', function () {
        actualizarFiltroSubcategorias(this.value);
        aplicarFiltrosYRenderizar();
    });
    document.getElementById('filtro-subcategoria')?.addEventListener('change', () => {
        aplicarFiltrosYRenderizar();
    });
    document.getElementById('btn-guardar-producto')?.addEventListener('click', guardarProducto);
    document.getElementById('btn-actualizar-producto')?.addEventListener('click', actualizarProducto);
    document.getElementById('btn-confirmar-stock')?.addEventListener('click', confirmarAjusteStock);
});