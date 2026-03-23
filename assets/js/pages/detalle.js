/* routing delegado a CategoriaRouting */
const getCatalogoInfo = (id) => CategoriaRouting.getCatalogoInfo(id);

/* Mapa de descuentos — reutiliza la misma lógica que menu.js */
let mapaDescuentos = {};

async function cargarMapaDescuentos() {
    try {
        const promos = await ProductosService.getPromocionesActivas();
        mapaDescuentos = {};
        promos.forEach(p => {
            const ids = p.productos_ids || [];
            ids.forEach(idProducto => {
                if (!mapaDescuentos[idProducto] ||
                    p.porcentaje_descuento > mapaDescuentos[idProducto].porcentaje) {
                    mapaDescuentos[idProducto] = {
                        porcentaje:  p.porcentaje_descuento,
                        idPromocion: p.id_promocion,
                        titulo:      p.titulo,
                    };
                }
            });
        });
    } catch { /* sin descuentos */ }
}

/* Leer ?id= de la URL */
function getIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

/* Imagen con fallback */
/* buildImageUrl → FormatUtils.imagenUrl */

/* Poblar el detalle con los datos del producto */
function poblarDetalle(p) {
    const imgUrl = FormatUtils.imagenUrl(p.Imagen);

    // Imagen
    const imgEl = document.getElementById('producto-imagen');
    const placeholder = document.getElementById('producto-placeholder');
    const placeholderNombre = document.getElementById('placeholder-nombre');

    if (imgUrl && imgEl) {
        imgEl.src = imgUrl;
        imgEl.classList.remove('d-none');
        placeholder?.classList.add('d-none');
    } else {
        imgEl?.classList.add('d-none');
        placeholder?.classList.remove('d-none');
    }
    if (placeholderNombre) placeholderNombre.textContent = p.Nombre;

    // Campos de texto
    document.getElementById('producto-nombre').textContent = p.Nombre;
    document.getElementById('producto-categoria').textContent = p.subcategoria || p.tipo || '—';
    document.getElementById('producto-descripcion').textContent = p.Descripcion || 'Sin descripción disponible.';
    // Aplicar descuento si hay promoción activa para este producto
    const desc = mapaDescuentos[p.idProducto];
    const precioBase  = parseFloat(p.PrecioVenta);
    const precioFinal = desc
        ? +(precioBase * (1 - desc.porcentaje / 100)).toFixed(2)
        : precioBase;

    const elPrecio = document.getElementById('producto-precio');
    if (elPrecio) {
        if (desc) {
            elPrecio.innerHTML = `
                <span class="text-muted text-decoration-line-through me-2" style="font-size:.85em;">
                    ${FormatUtils.moneda(precioBase)}
                </span>
                <span class="text-success fw-bold">${FormatUtils.moneda(precioFinal)}</span>
                <span class="badge ms-2" style="background:#f59e0b;color:#fff;font-size:.75rem;">
                    <i class="bi bi-tag-fill me-1"></i>-${desc.porcentaje}% ${desc.titulo || ''}
                </span>`;
        } else {
            elPrecio.textContent = FormatUtils.moneda(precioBase);
        }
    }
    document.getElementById('producto-codigo').textContent = p.Codigo || '—';
    document.getElementById('producto-proveedor').textContent = p.proveedor || '—';

    // Título de la página
    document.title = `${p.Nombre} — Cafetería ITH`;

    // Badge de stock
    const stockEl = document.getElementById('producto-stock');
    if (stockEl) {
        stockEl.outerHTML = FormatUtils.badgeStock(p.Stock).replace('class="badge', 'id="producto-stock" class="badge fs-6');
    }

    // Badge de estado
    const estadoEl = document.getElementById('producto-estado');
    if (estadoEl) {
        estadoEl.textContent = 'Disponible';
        estadoEl.className = 'badge bg-success';
    }

    // Botón "Ver más" dinámico según categoría del producto
    const catalogo = getCatalogoInfo(p.idCategoria);
    document.querySelectorAll('a[href$=".html"]').forEach(a => {
        if (a.textContent.trim().startsWith('Ver más')) {
            a.href = catalogo.url;
            a.innerHTML = `<i class="bi ${catalogo.icon} me-1"></i>${catalogo.label}`;
        }
    });
    // También el botón de "no encontrado"
    const btnNoEnc = document.querySelector('#detalle-no-encontrado a.btn-primary');
    if (btnNoEnc) btnNoEnc.href = catalogo.url;

    // Selector de cantidad (máx. stock, máx. 10)
    const selectCantidad = document.getElementById('select-cantidad');
    if (selectCantidad) {
        const max = Math.min(p.Stock, 10);
        selectCantidad.innerHTML = '';
        for (let i = 1; i <= max; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            selectCantidad.appendChild(opt);
        }
    }

    // Bloques autenticado / no autenticado
    const estaAutenticado = !!localStorage.getItem('token');
    const bloqueAuth = document.getElementById('bloque-autenticado');
    const bloqueNoAuth = document.getElementById('bloque-no-autenticado');
    const avisoAgotado = document.getElementById('aviso-agotado');
    const btnAgregar = document.getElementById('btn-agregar-carrito');

    if (estaAutenticado) {
        bloqueAuth?.classList.remove('d-none');
        bloqueNoAuth?.classList.add('d-none');

        if (p.Stock <= 0) {
            btnAgregar && (btnAgregar.disabled = true);
            avisoAgotado?.classList.remove('d-none');
            selectCantidad && (selectCantidad.disabled = true);
        }
    } else {
        bloqueAuth?.classList.add('d-none');
        bloqueNoAuth?.classList.remove('d-none');
    }

    // Guardar datos en el botón para usarlos al agregar
    if (btnAgregar) {
        btnAgregar.dataset.id = p.idProducto;
        btnAgregar.dataset.nombre = p.Nombre;
        // Guardar el precio final (con descuento si aplica) para el carrito
        btnAgregar.dataset.precio = precioFinal.toFixed(2);
        if (desc) {
            btnAgregar.dataset.precioOriginal = precioBase.toFixed(2);
            btnAgregar.dataset.descuento      = desc.porcentaje;
        }
        btnAgregar.dataset.img = imgUrl || '';
    }
}

/* Agregar al carrito */
function agregarAlCarrito() {
    const btn = document.getElementById('btn-agregar-carrito');
    const cantidad = parseInt(document.getElementById('select-cantidad')?.value || '1');

    const id = btn.dataset.id;
    const nombre = btn.dataset.nombre;
    const precio = parseFloat(btn.dataset.precio);
    const img = btn.dataset.img;

    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const idx = carrito.findIndex(i => i.id === id);

    if (idx >= 0) {
        carrito[idx].cantidad += cantidad;
    } else {
        carrito.push({ id, nombre, precio, img, cantidad });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));

    // Feedback visual
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>¡Agregado!';
    btn.classList.replace('btn-primary', 'btn-success');
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.classList.replace('btn-success', 'btn-primary');
        btn.disabled = false;
    }, 1800);

    if (typeof Toast !== 'undefined') {
        Toast.success(`${nombre} x${cantidad} agregado al carrito`);
    }
}

/* Cargar producto desde la API */
async function cargarProducto() {
    const id = getIdFromUrl();

    const loadingEl = document.getElementById('detalle-loading');
    const noEncontrado = document.getElementById('detalle-no-encontrado');
    const contenido = document.getElementById('detalle-contenido');

    if (!id) {
        loadingEl?.classList.add('d-none');
        noEncontrado?.classList.remove('d-none');
        return;
    }

    try {
        // Cargar descuentos y producto en paralelo
        const [producto] = await Promise.all([
            ProductosService.getById(id),
            cargarMapaDescuentos(),
        ]);

        loadingEl?.classList.add('d-none');
        contenido?.classList.remove('d-none');

        poblarDetalle(producto);

        // Listener del botón agregar
        document.getElementById('btn-agregar-carrito')
            ?.addEventListener('click', agregarAlCarrito);

    } catch (err) {
        console.error('Error cargando detalle:', err);
        loadingEl?.classList.add('d-none');
        noEncontrado?.classList.remove('d-none');
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', async () => { await CategoriaRouting.init(); cargarProducto(); });