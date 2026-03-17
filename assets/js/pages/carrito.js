/* Helpers de localStorage */
function getCarrito() {
    return JSON.parse(localStorage.getItem('carrito') || '[]');
}
function setCarrito(carrito) {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

/* Helpers UI */
function mostrarEstado(id) {
    ['carrito-loading', 'carrito-vacio', 'carrito-con-productos'].forEach(el => {
        document.getElementById(el)?.classList.add('d-none');
    });
    document.getElementById(id)?.classList.remove('d-none');
}

function mostrarAlerta(tipo, msg) {
    const el = document.getElementById(`alerta-${tipo}`);
    const msg_el = document.getElementById(`alerta-${tipo}-msg`);
    if (!el || !msg_el) return;
    msg_el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 5000);
}

/* Calcular total */
function calcularTotal(carrito) {
    return carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

/* Renderizar tabla de items */
function renderCarrito() {
    const carrito = getCarrito();
    document.getElementById('carrito-loading')?.classList.add('d-none');

    if (!carrito.length) {
        mostrarEstado('carrito-vacio');
        return;
    }

    mostrarEstado('carrito-con-productos');

    const tbody = document.getElementById('carrito-tbody');
    tbody.innerHTML = carrito.map((item, idx) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          ${item.img
            ? `<img src="${item.img}" class="carrito-item-img" alt="${item.nombre}"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''
        }
          <div class="carrito-item-placeholder" ${item.img ? 'style="display:none"' : ''}>
            <i class="bi bi-bag"></i>
          </div>
          <span class="fw-semibold">${item.nombre}</span>
        </div>
      </td>
      <td>$${parseFloat(item.precio).toFixed(2)}</td>
      <td>
        <div class="cantidad-control">
          <button class="btn btn-outline-secondary btn-sm" onclick="cambiarCantidad(${idx}, -1)">
            <i class="bi bi-dash"></i>
          </button>
          <input type="number" class="form-control form-control-sm"
                 value="${item.cantidad}" min="1" max="99"
                 onchange="setCantidad(${idx}, this.value)">
          <button class="btn btn-outline-secondary btn-sm" onclick="cambiarCantidad(${idx}, 1)">
            <i class="bi bi-plus"></i>
          </button>
        </div>
      </td>
      <td class="fw-semibold">$${(item.precio * item.cantidad).toFixed(2)}</td>
      <td>
        <button class="btn btn-outline-danger btn-sm" onclick="eliminarItem(${idx})"
                title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');

    // Total
    const total = calcularTotal(carrito);
    document.getElementById('carrito-total').textContent = `$${total.toFixed(2)} MXN`;
    const montoPagar = document.getElementById('monto-pagar');
    if (montoPagar) montoPagar.value = `$${total.toFixed(2)} MXN`;
}

/* Cambiar cantidad */
window.cambiarCantidad = function (idx, delta) {
    const carrito = getCarrito();
    carrito[idx].cantidad = Math.max(1, carrito[idx].cantidad + delta);
    setCarrito(carrito);
    renderCarrito();
};

window.setCantidad = function (idx, val) {
    const cantidad = Math.max(1, parseInt(val) || 1);
    const carrito = getCarrito();
    carrito[idx].cantidad = cantidad;
    setCarrito(carrito);
    renderCarrito();
};

window.eliminarItem = function (idx) {
    const carrito = getCarrito();
    const nombre = carrito[idx].nombre;
    carrito.splice(idx, 1);
    setCarrito(carrito);
    renderCarrito();
    Toast?.info(`"${nombre}" eliminado del carrito`);
};

/* Vaciar carrito */
function vaciarCarrito() {
    if (!confirm('¿Estás seguro de que quieres vaciar el carrito?')) return;
    setCarrito([]);
    renderCarrito();
    Toast?.info('Carrito vaciado');
}

/* Cargar métodos de pago desde la API */
async function cargarMetodosPago() {
    const select = document.getElementById('metodo-pago');
    if (!select) return;

    try {
        const metodos = await CarritoService.getMetodosPago(AuthUtils.getHeaders());
        if (metodos.length) {
            select.innerHTML = metodos.map(m =>
                `<option value="${m.id_metodo_pago}">${m.nombre_metodo}</option>`
            ).join('');
        }
    } catch {
        // Fallback con opciones básicas si falla la API
        select.innerHTML = `
      <option value="1">Efectivo</option>
      <option value="2">Tarjeta Débito</option>
      <option value="3">Tarjeta Crédito</option>
      <option value="4">Transferencia</option>`;
    }
}

/* Confirmar pedido */
async function confirmarPedido() {
    const carrito = getCarrito();
    if (!carrito.length) {
        mostrarAlerta('error', 'El carrito está vacío');
        return;
    }

    const metodoPagoEl = document.getElementById('metodo-pago');
    const metodoPagoTexto = metodoPagoEl?.options[metodoPagoEl.selectedIndex]?.text || 'Efectivo';


    if (!metodoPagoTexto) {
        mostrarAlerta('error', 'Selecciona un método de pago');
        return;
    }

    const total = calcularTotal(carrito);
    const btn = document.getElementById('btn-confirmar-pedido');
    const txtOrig = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando pedido…';

    try {
        const payload = {
            metodoPago: metodoPagoTexto,
            montoPago: total.toFixed(2),
            productos: carrito.map(item => ({
                idProducto: parseInt(item.id),
                cantidad: item.cantidad
            }))
        };

        const ventaData = await CarritoService.crearVenta(payload, AuthUtils.getHeaders());

        // Pedido exitoso
        setCarrito([]);

        const { idVenta, montoTotal, montoCambio } = ventaData;

        // Mostrar confirmación
        mostrarEstado('carrito-vacio');
        document.getElementById('carrito-vacio').innerHTML = `
      <div class="text-center py-5">
        <div class="mb-4" style="font-size:5rem;color:var(--color-success)">
          <i class="bi bi-check-circle-fill"></i>
        </div>
        <h3 class="fw-bold mb-2">¡Pedido confirmado!</h3>
        <p class="text-muted mb-1">Pedido <strong>#${idVenta}</strong> registrado exitosamente</p>
        <p class="text-muted mb-4">Total: <strong>$${montoTotal.toFixed(2)} MXN</strong>
          ${montoCambio > 0 ? `· Cambio: <strong>$${montoCambio.toFixed(2)} MXN</strong>` : ''}
        </p>
        <div class="d-flex gap-3 justify-content-center flex-wrap">
          <a href="inicio.html" class="btn btn-primary">
            <i class="bi bi-house me-1"></i>Volver al Inicio
          </a>
          <a href="productos.html" class="btn btn-outline-primary">
            <i class="bi bi-bag me-1"></i>Seguir Comprando
          </a>
        </div>
      </div>`;

        Toast?.success('¡Pedido realizado con éxito!');

    } catch (err) {
        mostrarAlerta('error', err.message);
        btn.disabled = false;
        btn.innerHTML = txtOrig;
    }
}

/* Verificar sesión */
function verificarSesion() {
    if (!AuthUtils.estaAutenticado()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarSesion()) return;

    // Renderizar carrito inmediatamente desde localStorage (sin esperar API)
    renderCarrito();

    // Cargar métodos de pago en segundo plano
    cargarMetodosPago();

    document.getElementById('btn-vaciar')
        ?.addEventListener('click', vaciarCarrito);

    document.getElementById('btn-actualizar')
        ?.addEventListener('click', renderCarrito);

    document.getElementById('btn-confirmar-pedido')
        ?.addEventListener('click', confirmarPedido);
});