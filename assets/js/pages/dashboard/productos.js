/* Estado global */
let todosLosProductos = [];
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
    try {
        const cats = await ProductosService.getCategorias();

        // Filtro de la tabla
        const filtro = document.getElementById('filtro-categoria');
        cats.forEach(c => {
            filtro.innerHTML += `<option value="${c.idCategoria}">${c.Descripcion}</option>`;
        });

        // Selects de modales
        ['agregar-categoria', 'editar-categoria'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Seleccionar categoría</option>';
            cats.forEach(c => {
                sel.innerHTML += `<option value="${c.idCategoria}">${c.Descripcion}</option>`;
            });
        });
    } catch { /* no crítico */ }
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
async function cargarProductos() {
    setLoading('tabla-productos', 7);
    try {
        todosLosProductos = await ProductosService.getAll(AuthUtils.getHeaders());
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        mostrarError('tabla-productos', 7, 'Error al cargar productos');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    const total = todosLosProductos.length;
    const activos = todosLosProductos.filter(p => p.Estado !== 0).length;
    const stockBajo = todosLosProductos.filter(p => p.Stock > 0 && p.Stock < 10).length;
    const sinStock = todosLosProductos.filter(p => p.Stock <= 0).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-stock-bajo').textContent = stockBajo;
    document.getElementById('stat-sin-stock').textContent = sinStock;
}

/* Filtrar + ordenar + paginar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-productos')?.value.toLowerCase().trim() || '';
    const catFiltro = document.getElementById('filtro-categoria')?.value || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || '';
    const ordenamiento = document.getElementById('ordenar-productos')?.value || 'nombre-asc';

    let lista = todosLosProductos.filter(p => {
        const coincideBusqueda =
            p.Nombre?.toLowerCase().includes(termino) ||
            p.Codigo?.toLowerCase().includes(termino) ||
            p.categoria?.toLowerCase().includes(termino);
        const coincideCategoria = !catFiltro || String(p.idCategoria) === catFiltro;
        const coincideEstado = estadoFiltro === '' || String(p.Estado ?? 1) === estadoFiltro;
        return coincideBusqueda && coincideCategoria && coincideEstado;
    });

    // Ordenamiento
    switch (ordenamiento) {
        case 'nombre-asc': lista.sort((a, b) => a.Nombre.localeCompare(b.Nombre)); break;
        case 'nombre-desc': lista.sort((a, b) => b.Nombre.localeCompare(a.Nombre)); break;
        case 'precio-asc': lista.sort((a, b) => a.PrecioVenta - b.PrecioVenta); break;
        case 'precio-desc': lista.sort((a, b) => b.PrecioVenta - a.PrecioVenta); break;
        case 'stock-asc': lista.sort((a, b) => a.Stock - b.Stock); break;
        case 'stock-desc': lista.sort((a, b) => b.Stock - a.Stock); break;
    }

    const total = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const pagina = lista.slice(inicio, inicio + POR_PAGINA);

    renderTabla(pagina);
    renderPaginacion(total, totalPags);
}

/* Renderizar tabla */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-productos');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron productos</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const imgHtml = p.Imagen
            ? `<img src="${p.Imagen}" class="img-thumbnail" style="width:48px;height:48px;object-fit:cover;"
                    onerror="this.src='https://placehold.co/48x48/e2e8f0/94a3b8?text=?'">`
            : `<div class="bg-light rounded d-flex align-items-center justify-content-center"
                    style="width:48px;height:48px;"><i class="bi bi-image text-muted"></i></div>`;

        const stockClass = FormatUtils.claseStock(p.Stock);

        const estadoBadge = FormatUtils.badgeEstado(p.Estado !== 0);

        return `
        <tr>
            <td>${imgHtml}</td>
            <td>
                <div class="fw-semibold">${p.Nombre}</div>
                <small class="text-muted">${p.Codigo || '—'}</small>
            </td>
            <td><span class="badge bg-primary">${p.categoria || '—'}</span></td>
            <td class="fw-semibold">${FormatUtils.moneda(p.PrecioVenta, false)}</td>
            <td class="${stockClass}">${p.Stock}</td>
            <td>${estadoBadge}</td>
            <td>
                <div class="btn-group btn-group-sm">
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

/* Paginación */
function renderPaginacion(total, totalPags) {
    const contenedor = document.getElementById('paginacion-productos');
    if (!contenedor) return;

    const inicio = (paginaActual - 1) * POR_PAGINA + 1;
    const fin = Math.min(paginaActual * POR_PAGINA, total);

    let btns = '';
    for (let i = 1; i <= totalPags; i++) {
        if (totalPags > 7 && i > 2 && i < totalPags - 1 && Math.abs(i - paginaActual) > 1) {
            if (i === 3 || i === totalPags - 2) btns += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            continue;
        }
        btns += `<li class="page-item ${i === paginaActual ? 'active' : ''}">
            <button class="page-link" onclick="irAPagina(${i})">${i}</button></li>`;
    }

    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${total ? inicio : 0}–${fin} de ${total} productos</small>
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
    const totalPags = Math.ceil(todosLosProductos.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Guardar nuevo producto */
async function guardarProducto() {
    const nombre = document.getElementById('agregar-nombre').value.trim();
    const categoria = document.getElementById('agregar-categoria').value;
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
    if (!categoria) {
        document.getElementById('agregar-categoria').classList.add('is-invalid');
        document.getElementById('agregar-categoria-error').textContent = 'Selecciona una categoría';
        valido = false;
    } else {
        document.getElementById('agregar-categoria').classList.remove('is-invalid');
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
        const payload = {
            nombre,
            codigo: document.getElementById('agregar-codigo').value.trim(),
            descripcion: document.getElementById('agregar-descripcion').value.trim(),
            precioVenta: parseFloat(precio),
            precioCompra: parseFloat(document.getElementById('agregar-precio-compra').value) || 0,
            stock: parseInt(stock) || 0,
            idCategoria: parseInt(categoria),
            idProveedor: parseInt(proveedor) || null,
            imagen: imagen || '',
            estado: document.getElementById('agregar-estado').checked ? 1 : 0,
        };

        const json = await ProductosService.crear(payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al guardar');

        bootstrap.Modal.getInstance(document.getElementById('agregarProductoModal'))?.hide();
        limpiarModalAgregar();
        Toast?.success('Producto agregado exitosamente');
        await cargarProductos();

    } catch (err) {
        Toast?.error(err.message);
    } finally {
        setBtnLoading('btn-guardar-producto', false, '<i class="bi bi-floppy me-1"></i>Guardar Producto');
    }
}

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
        await Promise.all([
            setSelectValue('editar-categoria', p.idCategoria),
            setSelectValue('editar-proveedor', p.idProveedor),
        ]);

        new bootstrap.Modal(document.getElementById('editarProductoModal')).show();
    } catch (err) {
        Toast?.error('Error al cargar producto: ' + err.message);
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
    const categ = document.getElementById('editar-categoria').value;
    const precio = document.getElementById('editar-precio-venta').value;

    if (!nombre || !categ || !precio) {
        Toast?.warning('Nombre, categoría y precio son obligatorios');
        return;
    }

    setBtnLoading('btn-actualizar-producto', true, '<i class="bi bi-floppy me-1"></i>Actualizar Producto');

    try {
        const imagen = await leerImagenBase64('editar-imagen');
        const payload = {
            nombre,
            codigo: document.getElementById('editar-codigo').value.trim(),
            descripcion: document.getElementById('editar-descripcion').value.trim(),
            precioVenta: parseFloat(precio),
            precioCompra: parseFloat(document.getElementById('editar-precio-compra').value) || 0,
            stock: parseInt(document.getElementById('editar-stock').value) || 0,
            idCategoria: parseInt(categ),
            idProveedor: parseInt(document.getElementById('editar-proveedor').value) || null,
            imagen: imagen || undefined,
            estado: document.getElementById('editar-estado').checked ? 1 : 0,
        };

        const json = await ProductosService.actualizar(id, payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al actualizar');

        bootstrap.Modal.getInstance(document.getElementById('editarProductoModal'))?.hide();
        Toast?.success('Producto actualizado exitosamente');
        await cargarProductos();

    } catch (err) {
        Toast?.error(err.message);
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
        Toast?.success('Stock actualizado correctamente');
        await cargarProductos();

    } catch (err) {
        Toast?.error(err.message);
    } finally {
        setBtnLoading('btn-confirmar-stock', false, '<i class="bi bi-check-circle me-1"></i>Aplicar Ajuste');
    }
}

/* Eliminar producto */
window.confirmarEliminar = function (id, nombre) {
    if (!confirm(`¿Eliminar el producto "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
    eliminarProducto(id);
};

async function eliminarProducto(id) {
    try {
        const json = await ProductosService.eliminar(id, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al eliminar');

        Toast?.success('Producto eliminado correctamente');
        await cargarProductos();
    } catch (err) {
        Toast?.error(err.message);
    }
}

/* Limpiar modal agregar */
function limpiarModalAgregar() {
    ['agregar-nombre', 'agregar-codigo', 'agregar-descripcion',
        'agregar-precio-venta', 'agregar-precio-compra', 'agregar-stock'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.classList.remove('is-invalid'); }
        });
    document.getElementById('agregar-categoria').value = '';
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

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;

    inyectarToolbarOrdenamiento();
    initPreviewImagen('agregar-imagen', 'agregar-imagen-preview');

    await Promise.all([cargarCategorias(), cargarProveedores()]);
    await cargarProductos();

    // Búsqueda con debounce
    let debounce;
    document.getElementById('buscador-productos')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });

    document.getElementById('ordenar-productos')?.addEventListener('change', () => {
        paginaActual = 1; aplicarFiltrosYRenderizar();
    });
    document.getElementById('filtro-categoria')?.addEventListener('change', () => {
        paginaActual = 1; aplicarFiltrosYRenderizar();
    });

    document.getElementById('filtro-estado')?.addEventListener('change', () => {
        paginaActual = 1; aplicarFiltrosYRenderizar();
    });

    document.getElementById('btn-guardar-producto')?.addEventListener('click', guardarProducto);
    document.getElementById('btn-actualizar-producto')?.addEventListener('click', actualizarProducto);
    document.getElementById('btn-confirmar-stock')?.addEventListener('click', confirmarAjusteStock);
});