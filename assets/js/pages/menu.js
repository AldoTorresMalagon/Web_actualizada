const CATEGORY = window.PAGE_CATEGORY || 'productos';

/* Endpoint según categoría */
const ENDPOINT_MAP = {
    comidas: `${API_CONFIG.BASE_URL}/productos/platillos`,
    bebidas: `${API_CONFIG.BASE_URL}/productos/bebidas`,
    productos: `${API_CONFIG.BASE_URL}/productos`
};

const ENDPOINT = ENDPOINT_MAP[CATEGORY];

/* Estado */
let todosLosProductos = [];

/* Determinar catálogo según idCategoria */
const CATEGORIAS_BEBIDAS = [1, 4, 5, 8];
const CATEGORIAS_PLATILLOS = [9];

function getCatalogoInfo(idCategoria) {
    const id = parseInt(idCategoria);
    if (CATEGORIAS_PLATILLOS.includes(id))
        return { url: 'menu.html', label: 'Ver más comidas', icon: 'bi-cup-hot' };
    if (CATEGORIAS_BEBIDAS.includes(id))
        return { url: 'bebidas.html', label: 'Ver más bebidas', icon: 'bi-cup-straw' };
    return { url: 'productos.html', label: 'Ver más productos', icon: 'bi-box-seam' };
}

function getDetalleUrl(idProducto, idCategoria) {
    const id = parseInt(idCategoria);
    if (CATEGORIAS_PLATILLOS.includes(id)) return `detalle_producto.html?id=${idProducto}`;
    if (CATEGORIAS_BEBIDAS.includes(id)) return `detalle_bebida.html?id=${idProducto}`;
    return `detalle_producto_snack.html?id=${idProducto}`;
}

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
          <!-- Badge categoría -->
          <span class="badge bg-primary position-absolute"
                style="top:.6rem;left:.6rem;font-size:.7rem;">
            ${p.categoria || ''}
          </span>
          <!-- Badge stock -->
          <span class="badge position-absolute"
                style="top:.6rem;right:.6rem;font-size:.7rem;
                       background:${stock ? '#dcfce7;color:#15803d' : '#fee2e2;color:#dc2626'}">
            ${stock ? `${p.Stock} disp.` : 'Agotado'}
          </span>
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
            <span class="fw-bold text-primary">$${precio} <small class="text-muted fw-normal">MXN</small></span>
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
                       data-precio="${precio}"
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
        if (CATEGORY === 'comidas')   productos = await ProductosService.getPlatillos();
        else if (CATEGORY === 'bebidas') productos = await ProductosService.getBebidas();
        else productos = await ProductosService.getAll();

        todosLosProductos = productos;
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

    let resultado = todosLosProductos.filter(p =>
        p.Nombre.toLowerCase().includes(termino) ||
        (p.Descripcion || '').toLowerCase().includes(termino) ||
        (p.categoria || '').toLowerCase().includes(termino)
    );

    switch (orden) {
        case 'nombre-asc': resultado.sort((a, b) => a.Nombre.localeCompare(b.Nombre)); break;
        case 'nombre-desc': resultado.sort((a, b) => b.Nombre.localeCompare(a.Nombre)); break;
        case 'precio-asc': resultado.sort((a, b) => a.PrecioVenta - b.PrecioVenta); break;
        case 'precio-desc': resultado.sort((a, b) => b.PrecioVenta - a.PrecioVenta); break;
    }

    mostrarProductos(resultado);
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
    cargarProductos();

    // Búsqueda con debounce
    let debounce;
    document.getElementById('buscador')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(aplicarFiltros, 300);
    });

    document.getElementById('ordenamiento')?.addEventListener('change', aplicarFiltros);
});