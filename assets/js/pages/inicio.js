const CATEGORIAS_BEBIDAS_INICIO = [1, 4, 5, 8];
const CATEGORIAS_PLATILLOS_INICIO = [9];

function getDetalleUrlInicio(idProducto, idCategoria) {
  const id = parseInt(idCategoria);
  if (CATEGORIAS_PLATILLOS_INICIO.includes(id)) return `detalle_producto.html?id=${idProducto}`;
  if (CATEGORIAS_BEBIDAS_INICIO.includes(id)) return `detalle_bebida.html?id=${idProducto}`;
  return `detalle_producto_snack.html?id=${idProducto}`;
}

/* Helpers de imagen */
/* buildImageUrl → FormatUtils.imagenUrl */

function fallbackImg(el, nombre) {
  el.onerror = null;
  el.src = FormatUtils.imagenFallback(nombre);
}

/* Carrusel de platillos */
async function cargarCarrusel() {
  const indicadores = document.getElementById('carousel-indicators');
  const slides = document.getElementById('carousel-slides');
  if (!indicadores || !slides) return;

  try {
    const platillosData = await ProductosService.getPlatillosRecientes();
    const json = { success: true, data: platillosData };

    if (!json.data?.length) {
      slides.innerHTML = `
        <div class="carousel-item active">
          <div class="carousel-placeholder d-flex flex-column align-items-center justify-content-center">
            <i class="bi bi-exclamation-circle fs-1 mb-3 opacity-50"></i>
            <p class="mb-0">No hay platillos disponibles por el momento</p>
          </div>
        </div>`;
      return;
    }

    const platillos = json.data; // vista v_platillos_recientes ya devuelve LIMIT 8
    indicadores.innerHTML = '';
    slides.innerHTML = '';

    platillos.forEach((p, i) => {
      const imgUrl = FormatUtils.imagenUrl(p.Imagen);
      const precio = parseFloat(p.PrecioVenta).toFixed(2); // raw para template
      const activo = i === 0 ? 'active' : '';

      // Indicador
      indicadores.innerHTML += `
        <button type="button" data-bs-target="#platillosCarousel"
          data-bs-slide-to="${i}" class="${activo}"
          aria-label="Slide ${i + 1}" ${activo ? 'aria-current="true"' : ''}>
        </button>`;

      // Slide
      slides.innerHTML += `
        <div class="carousel-item ${activo}">
          ${imgUrl
          ? `<img src="${imgUrl}" class="carousel-img d-block w-100"
               alt="${p.Nombre}" loading="lazy"
               onerror="fallbackImg(this, '${p.Nombre.replace(/'/g, '')}')">`
          : `<div class="carousel-placeholder d-flex align-items-center justify-content-center">
               <i class="bi bi-image fs-1 opacity-25"></i>
             </div>`
        }
          <div class="carousel-caption-custom">
            <span class="carousel-badge">${p.categoria || 'Platillo'}</span>
            <h3 class="carousel-title">${p.Nombre}</h3>
            ${p.Descripcion ? `<p class="carousel-desc">${p.Descripcion}</p>` : ''}
            <div class="carousel-footer-row">
              <span class="carousel-precio">$${precio} MXN</span>
              <a href="${getDetalleUrlInicio(p.idProducto, p.idCategoria)}" class="btn btn-carousel">
                Ver más <i class="bi bi-arrow-right ms-1"></i>
              </a>
            </div>
          </div>
        </div>`;
    });

  } catch (err) {
    console.error('Error cargando carrusel:', err);
    slides.innerHTML = `
      <div class="carousel-item active">
        <div class="carousel-placeholder d-flex flex-column align-items-center justify-content-center">
          <i class="bi bi-wifi-off fs-1 mb-3 opacity-50"></i>
          <p class="mb-0">No se pudo cargar el menú. Intenta más tarde.</p>
        </div>
      </div>`;
  }
}

/* Productos destacados */
async function cargarDestacados() {
  const contenedor = document.getElementById('productos-destacados');
  if (!contenedor) return;

  // Skeleton loader
  contenedor.innerHTML = Array(4).fill(`
    <div class="col">
      <div class="card h-100 border-0 shadow-sm skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="card-body">
          <div class="skeleton skeleton-title mb-2"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-btn mt-3"></div>
        </div>
      </div>
    </div>`).join('');

  try {
    const [bebidasData, snacksData] = await Promise.all([
      ProductosService.getBebidas(),
      ProductosService.getLimit(4),
    ]);

    const bebidas = bebidasData.slice(0, 2);
    const snacks = snacksData.filter(p => p.idCategoria !== 9).slice(0, 2);

    const todos = [...bebidas, ...snacks];

    if (!todos.length) {
      contenedor.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
          <i class="bi bi-bag-x fs-1 mb-2 d-block"></i>
          No hay productos disponibles
        </div>`;
      return;
    }

    contenedor.innerHTML = todos.map(p => {
      const imgUrl = FormatUtils.imagenUrl(p.Imagen);
      const precio = parseFloat(p.PrecioVenta).toFixed(2); // raw para template
      const stock = p.Stock > 0;

      return `
        <div class="col">
          <div class="card h-100 border-0 shadow-sm product-card destacado-card"
               onclick="window.location.href='${getDetalleUrlInicio(p.idProducto, p.idCategoria)}'"
               style="cursor:pointer;">
            <div class="destacado-img-wrap">
              ${imgUrl
          ? `<img src="${imgUrl}" class="card-img-top destacado-img"
                     alt="${p.Nombre}" loading="lazy"
                     onerror="fallbackImg(this, '${p.Nombre.replace(/'/g, '')}')">`
          : `<div class="destacado-img-placeholder">
                     <i class="bi bi-image fs-2 opacity-25"></i>
                   </div>`
        }
              <span class="destacado-badge ${stock ? 'badge-stock' : 'badge-agotado'}">
                ${stock ? `${p.Stock} disp.` : 'Agotado'}
              </span>
            </div>
            <div class="card-body d-flex flex-column">
              <span class="destacado-categoria">${p.categoria || 'Producto'}</span>
              <h3 class="h6 fw-bold mb-1">${p.Nombre}</h3>
              ${p.Descripcion
          ? `<p class="text-muted small mb-2 flex-grow-1">${p.Descripcion.substring(0, 60)}${p.Descripcion.length > 60 ? '…' : ''}</p>`
          : '<div class="flex-grow-1"></div>'
        }
              <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="fw-bold text-primary fs-6">$${precio}</span>
                <a href="${getDetalleUrlInicio(p.idProducto, p.idCategoria)}"
                   class="btn btn-primary btn-sm"
                   onclick="event.stopPropagation()">
                  Ver <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando destacados:', err);
    contenedor.innerHTML = `
      <div class="col-12 text-center text-muted py-4">
        <i class="bi bi-wifi-off fs-1 mb-2 d-block"></i>
        Error al cargar productos
      </div>`;
  }
}

/* Promociones activas — Slider */
async function cargarPromociones() {
  const seccion = document.getElementById('seccion-promociones');
  const track = document.getElementById('promociones-grid');
  const dotsEl = document.getElementById('promo-dots');
  const countBadge = document.getElementById('promo-count');
  const btnPrev = document.getElementById('promo-prev');
  const btnNext = document.getElementById('promo-next');

  if (!seccion || !track) return;

  try {
    const promos = await ProductosService.getPromocionesActivas();

    if (!promos.length) { seccion.style.display = 'none'; return; }

    seccion.style.display = '';
    if (countBadge)
      countBadge.textContent = `${promos.length} activa${promos.length > 1 ? 's' : ''}`;

    /* Renderizar tarjetas */
    track.innerHTML = promos.map(p => {
      const tieneImgPromo = !!p.imagen_promocion;
      const tieneImg1 = !!p.img_producto_1;
      const tieneImg2 = !!p.img_producto_2;

      let imgHtml = '';
      if (tieneImgPromo) {
        imgHtml = `<img src="${p.imagen_promocion}" class="promo-card-img" alt="${p.titulo}"
                        onerror="this.src='${FormatUtils.imagenFallback(p.titulo)}'">`;
      } else if (tieneImg1 && tieneImg2) {
        imgHtml = `
          <div class="promo-mosaic">
            <img src="${p.img_producto_1}" class="promo-mosaic-img" alt=""
                 onerror="this.style.display='none'">
            <img src="${p.img_producto_2}" class="promo-mosaic-img" alt=""
                 onerror="this.style.display='none'">
          </div>`;
      } else if (tieneImg1) {
        imgHtml = `<img src="${p.img_producto_1}" class="promo-card-img" alt="${p.titulo}"
                        onerror="this.src='${FormatUtils.imagenFallback(p.titulo)}'">`;
      } else {
        imgHtml = `
          <div class="promo-card-img d-flex align-items-center justify-content-center bg-light">
            <i class="bi bi-tag fs-1 text-warning opacity-50"></i>
          </div>`;
      }

      return `
        <div class="promo-slide">
          <div class="promo-card h-100">
            <div class="promo-card-img-wrap position-relative">
              ${imgHtml}
              <span class="promo-descuento-badge">-${p.porcentaje_descuento}% OFF</span>
            </div>
            <div class="promo-card-body">
              <h3 class="promo-card-titulo">${p.titulo}</h3>
              <p class="promo-card-desc">${FormatUtils.truncar(p.descripcion, 70)}</p>
              <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
                <small class="text-muted">
                  <i class="bi bi-clock me-1"></i>Hasta ${FormatUtils.fechaCorta(p.fecha_fin)}
                </small>
                <a href="detalle_promocion.html?id=${p.id_promocion}"
                   class="btn btn-warning btn-sm fw-semibold">
                  Ver oferta <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    /* Dots */
    if (dotsEl) {
      dotsEl.innerHTML = promos.map((_, i) =>
        `<button class="promo-dot ${i === 0 ? 'active' : ''}"
                 data-index="${i}" aria-label="Promoción ${i + 1}"></button>`
      ).join('');
    }

    /* Lógica del slider */
    let current = 0;
    const slides = track.querySelectorAll('.promo-slide');
    const dots = dotsEl ? dotsEl.querySelectorAll('.promo-dot') : [];
    const total = slides.length;

    function irA(n) {
      current = (n + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    if (btnPrev) btnPrev.addEventListener('click', () => irA(current - 1));
    if (btnNext) btnNext.addEventListener('click', () => irA(current + 1));
    dots.forEach(d => d.addEventListener('click', () => irA(parseInt(d.dataset.index))));

    /* Ocultar controles si solo hay 1 promoción */
    if (total <= 1) {
      if (btnPrev) btnPrev.style.display = 'none';
      if (btnNext) btnNext.style.display = 'none';
      if (dotsEl) dotsEl.style.display = 'none';
    }

    /* Auto-avance cada 5s */
    if (total > 1) setInterval(() => irA(current + 1), 5000);

  } catch (err) {
    console.error('Error cargando promociones:', err);
    seccion.style.display = 'none';
  }
}


/* Card de auth (4° acceso rápido) */
function actualizarCardAuth() {
  const cardAuth = document.getElementById('card-auth');
  if (!cardAuth) return;

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (token && user) {
    cardAuth.innerHTML = `
      <div class="card h-100 shadow-sm border-0 product-card"
           onclick="window.location.href='carrito.html'">
        <div class="card-body text-center p-4">
          <div class="mb-3 card-icon">
            <i class="bi bi-cart-check text-primary"></i>
          </div>
          <h3 class="h5 fw-bold mb-2">Mi Carrito</h3>
          <p class="text-muted mb-3">Revisa tu pedido</p>
          <a href="carrito.html" class="btn btn-primary w-100">
            <i class="bi bi-cart me-1"></i>Ver Carrito
          </a>
        </div>
      </div>`;

    // Mostrar alerta solo para estudiantes sin pedidos recientes
    const alerta = document.getElementById('alerta-registro');
    if (alerta) alerta.classList.add('d-none');
  } else {
    // Usuario no autenticado — mostrar alerta de registro
    const alerta = document.getElementById('alerta-registro');
    if (alerta) alerta.classList.remove('d-none');
  }
}

/* Saludo dinámico — manejado por header.js */

/* Stats rápidos de horario */
function mostrarHorario() {
  const el = document.getElementById('horario-status');
  if (!el) return;

  const hora = new Date().getHours();
  const abierto = hora >= 7 && hora < 21;

  el.innerHTML = `
    <span class="horario-dot ${abierto ? 'dot-open' : 'dot-closed'}"></span>
    ${abierto ? 'Abierto ahora · Lun–Vie 7:00–21:00' : 'Cerrado · Abre mañana 7:00 AM'}`;
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  actualizarCardAuth();
  mostrarHorario();
  cargarCarrusel();
  cargarDestacados();
  cargarPromociones();
});

// Exponer para onerror en imágenes generadas dinámicamente
window.fallbackImg = fallbackImg;