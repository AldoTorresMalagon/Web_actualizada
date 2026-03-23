/* routing delegado a CategoriaRouting */
const getDetalleProductoUrl = (id, idCat) => CategoriaRouting.getDetalleUrl(id, idCat);

/* Calcular precio con descuento */
function precioConDescuento(precio, porcentaje) {
    return parseFloat(precio) * (1 - parseFloat(porcentaje) / 100);
}

/* Renderizar grid de productos */
function renderProductos(productos, porcentaje) {
    const grid = document.getElementById('promo-productos-grid');
    const sinProductos = document.getElementById('promo-sin-productos');
    const totalBadge = document.getElementById('promo-total-productos');

    totalBadge.textContent = productos.length;

    if (!productos.length) {
        grid.classList.add('d-none');
        sinProductos.classList.remove('d-none');
        return;
    }

    sinProductos.classList.add('d-none');
    grid.classList.remove('d-none');

    const estaAutenticado = !!localStorage.getItem('token');

    grid.innerHTML = productos.map(p => {
        const imgUrl = FormatUtils.imagenUrl(p.Imagen);
        const precioOriginal = parseFloat(p.PrecioVenta);
        const precioFinal = precioConDescuento(precioOriginal, porcentaje);
        const ahorro = (precioOriginal - precioFinal).toFixed(2);
        const detalleUrl = getDetalleProductoUrl(p.idProducto, p.idCategoria);
        const stock = p.Stock > 0;

        return `
        <div class="col">
            <div class="card producto-promo-card h-100">
                <!-- Imagen -->
                <div style="position:relative;">
                    ${imgUrl
                ? `<img src="${imgUrl}" class="producto-promo-img" alt="${p.Nombre}"
                                onerror="this.src='${FormatUtils.imagenFallback(p.Nombre)}';">`
                : `<div class="producto-promo-img d-flex align-items-center justify-content-center bg-light">
                               <i class="bi bi-image fs-1 text-muted opacity-25"></i>
                           </div>`
            }
                    <span class="badge bg-warning text-dark position-absolute" style="top:.6rem;right:.6rem;font-size:.75rem;">
                        -${porcentaje}% OFF
                    </span>
                    ${!stock ? `<span class="badge bg-danger position-absolute" style="top:.6rem;left:.6rem;">Agotado</span>` : ''}
                </div>

                <!-- Cuerpo -->
                <div class="card-body d-flex flex-column p-3">
                    <span class="badge bg-primary bg-opacity-10 text-primary mb-1" style="width:fit-content;font-size:.72rem;">
                        ${p.categoria || '—'}
                    </span>
                    <h3 class="h6 fw-bold mb-1">${p.Nombre}</h3>
                    ${p.Descripcion
                ? `<p class="text-muted small mb-2 flex-grow-1">${FormatUtils.truncar(p.Descripcion, 60)}</p>`
                : '<div class="flex-grow-1"></div>'
            }

                    <!-- Precios -->
                    <div class="mb-2">
                        <span class="precio-original me-2">$${precioOriginal.toFixed(2)}</span>
                        <span class="precio-descuento">$${precioFinal.toFixed(2)} MXN</span>
                        <br>
                        <span class="badge-ahorro mt-1 d-inline-block">
                            <i class="bi bi-piggy-bank me-1"></i>Ahorras $${ahorro}
                        </span>
                    </div>

                    <!-- Botones -->
                    <div class="d-flex gap-2 mt-auto">
                        <a href="${detalleUrl}" class="btn btn-outline-primary btn-sm flex-grow-1">
                            <i class="bi bi-eye me-1"></i>Ver
                        </a>
                        ${estaAutenticado && stock
                ? `<button class="btn btn-primary btn-sm flex-grow-1 btn-agregar-carrito"
                                       data-id="${p.idProducto}"
                                       data-nombre="${p.Nombre.replace(/"/g, '&quot;')}"
                                       data-precio="${precioFinal.toFixed(2)}"
                                       data-img="${imgUrl || ''}">
                                   <i class="bi bi-cart-plus me-1"></i>Agregar
                               </button>`
                : !estaAutenticado
                    ? `<a href="login.html" class="btn btn-outline-secondary btn-sm flex-grow-1">
                                       <i class="bi bi-box-arrow-in-right me-1"></i>Login
                                   </a>`
                    : `<button class="btn btn-secondary btn-sm flex-grow-1" disabled>
                                       Sin stock
                                   </button>`
            }
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Listeners de agregar al carrito
    grid.querySelectorAll('.btn-agregar-carrito').forEach(btn => {
        btn.addEventListener('click', () => agregarAlCarrito(btn));
    });
}

/* Agregar al carrito con precio de promoción */
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

    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>¡Agregado!';
    btn.classList.replace('btn-primary', 'btn-success');
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.replace('btn-success', 'btn-primary');
        btn.disabled = false;
    }, 1500);

    Toast.success(`${nombre} agregado al carrito`);
}

/* Cargar detalle de la promoción */
async function cargarPromocion() {
    const id = new URLSearchParams(window.location.search).get('id');

    const loading = document.getElementById('detalle-loading');
    const noEncontrado = document.getElementById('detalle-no-encontrado');
    const contenido = document.getElementById('detalle-contenido');

    if (!id) {
        loading.classList.add('d-none');
        noEncontrado.classList.remove('d-none');
        return;
    }

    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones/${id}`);
        const json = await res.json();

        if (!res.ok || !json.success) throw new Error(json.message || 'No encontrada');

        const p = json.data;
        document.title = `${p.titulo} — Cafetería ITH`;
        document.getElementById('promo-titulo').textContent = p.titulo;
        document.getElementById('promo-descripcion').textContent = p.descripcion;
        document.getElementById('promo-descuento').textContent = `${p.porcentaje_descuento}%`;
        document.getElementById('promo-fecha-fin').textContent = FormatUtils.fechaLarga(p.fecha_fin);

        renderProductos(p.productos || [], p.porcentaje_descuento);

        loading.classList.add('d-none');
        contenido.classList.remove('d-none');

    } catch (err) {
        loading.classList.add('d-none');
        noEncontrado.classList.remove('d-none');
    }
}

document.addEventListener('DOMContentLoaded', async () => { await CategoriaRouting.init(); cargarPromocion(); });