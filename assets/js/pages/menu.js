const CATEGORY = window.PAGE_CATEGORY || 'productos';

/* Endpoint según categoría */
const ENDPOINT_MAP = {
    comidas: `${API_CONFIG.BASE_URL}/productos/platillos`,
    bebidas: `${API_CONFIG.BASE_URL}/productos/bebidas`,
    productos: `${API_CONFIG.BASE_URL}/productos/snacks`,
    todos: `${API_CONFIG.BASE_URL}/productos`
};

const ENDPOINT = ENDPOINT_MAP[CATEGORY];

/* Estado */
let todosLosProductos = [];
let mapaDescuentos = {}; // { idProducto: { porcentaje, idPromocion } }

/* Determinar catálogo según idCategoria */
/* routing delegado a CategoriaRouting */

const getCatalogoInfo = (id) => CategoriaRouting.getCatalogoInfo(id);

const getDetalleUrl = (id, idCat) => CategoriaRouting.getDetalleUrl(id, idCat);

/* Helpers de imagen */
/* buildImageUrl → FormatUtils.imagenUrl */

window.fallbackImg = function (el, nombre) {
    el.onerror = null;
    el.src = FormatUtils.imagenFallback(nombre);
};

/* Renderizar tarjeta de producto */
function renderTarjeta(p) {
    const imgUrl = FormatUtils.imagenUrl(p.Imagen);
    const precio = parseFloat(p.PrecioVenta).toFixed(2);
    const stock = p.Stock > 0;
    const estaAutenticado = !!localStorage.getItem('token');

    // Descuento de promoción activa si existe
    const desc = mapaDescuentos[p.idProducto];
    const precioDesc = desc
        ? (parseFloat(p.PrecioVenta) * (1 - desc.porcentaje / 100)).toFixed(2)
        : null;

    return `
    <div class="col">
      <div class="card h-100 border-0 shadow-sm product-card"
           style="border-radius:var(--radius-lg);overflow:hidden;">

        <!-- Imagen -->
        <div style="position:relative;height:200px;background:#f1f5f9;overflow:hidden;">
          ${imgUrl
            ? `<img src="${imgUrl}"
                    alt="${p.Nombre}"
                    loading="lazy"
                    onerror="fallbackImg(this,'${p.Nombre.replace(/'/g, '').replace(/"/g, '')}')"
                    style="width:100%;height:100%;object-fit:cover;transition:transform .35s ease;"
                    class="catalog-img">`
            : `<div class="d-flex align-items-center justify-content-center h-100 text-muted">
                 <i class="bi bi-image fs-1 opacity-25"></i>
               </div>`
        }
          <!-- Badge subcategoría -->
          <span class="badge bg-primary position-absolute"
                style="top:.6rem;left:.6rem;font-size:.7rem;">
            ${p.subcategoria || p.tipo || ''}
          </span>
          <!-- Badge stock -->
          <span class="badge position-absolute"
                style="top:.6rem;right:.6rem;font-size:.7rem;
                       background:${stock ? '#dcfce7;color:#15803d' : '#fee2e2;color:#dc2626'}">
            ${stock ? `${p.Stock} disp.` : 'Agotado'}
          </span>
          ${desc ? `<span style="position:absolute;bottom:.6rem;left:.6rem;background:#f59e0b;color:#fff;font-size:.7rem;font-weight:700;padding:.2rem .55rem;border-radius:50px;box-shadow:0 2px 6px rgba(0,0,0,.2);"><i class='bi bi-tag-fill' style='margin-right:.25rem;'></i>-${desc.porcentaje}%</span>` : ''}
        </div>

        <!-- Cuerpo -->
        <div class="card-body d-flex flex-column p-3">
          <h3 class="h6 fw-bold mb-1">${p.Nombre}</h3>
          ${p.Descripcion
            ? `<p class="text-muted small mb-2 flex-grow-1"
                  style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                 ${p.Descripcion}
               </p>`
            : '<div class="flex-grow-1"></div>'
        }

          <div class="d-flex justify-content-between align-items-center mt-2">
            <div>
              ${desc
            ? `<div><small class="text-muted text-decoration-line-through">$${precio}</small></div>
                   <span class="fw-bold text-success">$${precioDesc} <small class="text-muted fw-normal">MXN</small></span>`
            : `<span class="fw-bold text-primary">$${precio} <small class="text-muted fw-normal">MXN</small></span>`
        }
            </div>
            <a href="${getDetalleUrl(p.idProducto, p.idCategoria)}"
               class="btn btn-outline-primary btn-sm">
              Ver <i class="bi bi-arrow-right ms-1"></i>
            </a>
          </div>

          <!-- Botón agregar al carrito -->
          ${estaAutenticado && stock
            ? `<button class="btn btn-primary btn-sm mt-2 w-100 btn-agregar-carrito"
                       data-id="${p.idProducto}"
                       data-nombre="${p.Nombre.replace(/"/g, '&quot;')}"
                       data-precio="${desc ? precioDesc : precio}"
                       data-img="${imgUrl || ''}">
                 <i class="bi bi-cart-plus me-1"></i>Agregar al carrito
               </button>`
            : !estaAutenticado
                ? `<a href="login.html" class="btn btn-outline-secondary btn-sm mt-2 w-100">
                   <i class="bi bi-box-arrow-in-right me-1"></i>Inicia sesión para pedir
                 </a>`
                : `<button class="btn btn-secondary btn-sm mt-2 w-100" disabled>
                   <i class="bi bi-x-circle me-1"></i>Sin stock
                 </button>`
        }
        </div>
      </div>
    </div>`;
}



/* Cargar mapa de descuentos desde promociones activas */
async function cargarMapaDescuentos() {
    try {
        const promos = await ProductosService.getPromocionesActivas();
        mapaDescuentos = {};
        promos.forEach(p => {
            // La API devuelve productos_ids como array de números
            const ids = p.productos_ids || [];
            ids.forEach(idProducto => {
                if (!mapaDescuentos[idProducto] ||
                    p.porcentaje_descuento > mapaDescuentos[idProducto].porcentaje) {
                    mapaDescuentos[idProducto] = {
                        porcentaje: p.porcentaje_descuento,
                        idPromocion: p.id_promocion,
                        titulo: p.titulo,
                    };
                }
            });
        });
    } catch { /* sin descuentos */ }
}

/* Mostrar productos en el grid */
function mostrarProductos(lista) {
    const grid = document.getElementById('productos-grid');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');

    if (loadingState) loadingState.remove();

    if (!lista.length) {
        grid.innerHTML = '';
        emptyState?.classList.remove('d-none');
        return;
    }

    emptyState?.classList.add('d-none');
    grid.innerHTML = lista.map(renderTarjeta).join('');

    // Hover zoom en imágenes
    grid.querySelectorAll('.catalog-img').forEach(img => {
        img.closest('.product-card').addEventListener('mouseenter', () => img.style.transform = 'scale(1.06)');
        img.closest('.product-card').addEventListener('mouseleave', () => img.style.transform = 'scale(1)');
    });

    // Listeners de agregar al carrito
    grid.querySelectorAll('.btn-agregar-carrito').forEach(btn => {
        btn.addEventListener('click', () => agregarAlCarrito(btn));
    });
}

/* Cargar productos desde la API */
async function cargarProductos() {
    try {
        let productos = [];
        if (CATEGORY === 'comidas') productos = await ProductosService.getPlatillos();
        else if (CATEGORY === 'bebidas') productos = await ProductosService.getBebidas();
        else if (CATEGORY === 'productos') productos = await ProductosService.getSnacks();
        else productos = await ProductosService.getAll();

        todosLosProductos = productos;
        poblarFiltroSubcategorias();   // llenar el select con las subcats reales
        mostrarProductos(todosLosProductos);

    } catch (err) {
        console.error('Error cargando catálogo:', err);
        const grid = document.getElementById('productos-grid');
        grid.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-wifi-off display-4 d-block mb-3"></i>
        <p>No se pudo cargar el catálogo. Intenta más tarde.</p>
      </div>`;
    }
}

/* Búsqueda y ordenamiento */
function aplicarFiltros() {
    const termino = document.getElementById('buscador')?.value.toLowerCase().trim() || '';
    const orden = document.getElementById('ordenamiento')?.value || 'default';
    const subcat = document.getElementById('filtro-subcategoria')?.value || '';

    let resultado = todosLosProductos.filter(p => {
        const coincideTexto = p.Nombre.toLowerCase().includes(termino) ||
            (p.Descripcion || '').toLowerCase().includes(termino) ||
            (p.subcategoria || p.tipo || '').toLowerCase().includes(termino);
        const coincideSubcat = !subcat || String(p.idSubcategoria) === subcat;
        return coincideTexto && coincideSubcat;
    });

    switch (orden) {
        case 'nombre-asc': resultado.sort((a, b) => a.Nombre.localeCompare(b.Nombre)); break;
        case 'nombre-desc': resultado.sort((a, b) => b.Nombre.localeCompare(a.Nombre)); break;
        case 'precio-asc': resultado.sort((a, b) => a.PrecioVenta - b.PrecioVenta); break;
        case 'precio-desc': resultado.sort((a, b) => b.PrecioVenta - a.PrecioVenta); break;
    }

    mostrarProductos(resultado);
}

// Poblar select de subcategorías desde los productos cargados
function poblarFiltroSubcategorias() {
    const sel = document.getElementById('filtro-subcategoria');
    if (!sel) return;
    const vistos = new Map();
    todosLosProductos.forEach(p => {
        if (p.idSubcategoria && p.subcategoria && !vistos.has(p.idSubcategoria)) {
            vistos.set(p.idSubcategoria, p.subcategoria);
        }
    });
    sel.innerHTML = '<option value="">Todas las subcategorías</option>'
        + [...vistos.entries()]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
}

/* Carrito (localStorage) */
function agregarAlCarrito(btn) {
    const id = btn.dataset.id;
    const nombre = btn.dataset.nombre;
    const precio = parseFloat(btn.dataset.precio);
    const img = btn.dataset.img;

    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const idx = carrito.findIndex(i => i.id === id);

    if (idx >= 0) {
        carrito[idx].cantidad += 1;
    } else {
        carrito.push({ id, nombre, precio, img, cantidad: 1 });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));

    // Feedback visual
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>¡Agregado!';
    btn.classList.replace('btn-primary', 'btn-success');
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.classList.replace('btn-success', 'btn-primary');
        btn.disabled = false;
    }, 1500);

    // Toast si está disponible
    if (typeof Toast !== 'undefined') {
        Toast.success(`${nombre} agregado al carrito`);
    }

    // Actualizar contador del navbar si existe
    actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const total = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const badge = document.getElementById('carrito-badge');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'inline' : 'none';
    }
}

/* Alerta de login */
function mostrarAlertaLogin() {
    if (!localStorage.getItem('token')) {
        document.getElementById('alerta-login')?.classList.remove('d-none');
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    mostrarAlertaLogin();
    CategoriaRouting.init().then(() => cargarMapaDescuentos().then(cargarProductos));

    // Búsqueda con debounce
    let debounce;
    document.getElementById('buscador')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(aplicarFiltros, 300);
    });

    document.getElementById('ordenamiento')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-subcategoria')?.addEventListener('change', aplicarFiltros);
});