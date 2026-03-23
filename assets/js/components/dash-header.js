(function renderDashHeader() {
    const el = document.getElementById('dash-header');
    if (!el) return;

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const nombre = user?.nombre || user?.Nombre || 'Usuario';
    const rol = user?.rol || '';

    // Detectar título según la página actual
    const pagina = window.location.pathname.split('/').pop();
    const titulos = {
        'index.html': 'DASHBOARD',
        'productos.html': 'PRODUCTOS',
        'ventas.html': 'VENTAS',
        'categorias.html': 'CATEGORÍAS',
        'proveedores.html': 'PROVEEDORES',
        'usuarios.html': 'USUARIOS',
        'inventario.html': 'INVENTARIO',
        'reportes.html': 'REPORTES',
        'promociones.html': 'PROMOCIONES',
    };
    const titulo = titulos[pagina] || 'DASHBOARD';

    el.innerHTML = `
      <header class="dash-header">

        <!-- Logo -->
        <div class="dash-header-logo">
          <img src="../assets/images/logo.png" alt="Cafetería ITH"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <span style="display:none">
            <i class="bi bi-cup-hot-fill me-2"></i>CAFETERÍA ITH
          </span>
        </div>

        <!-- Título centrado -->
        <span class="dash-header-title">${titulo}</span>

        <!-- Usuario + campana de notificaciones -->
        <div class="dash-header-user">
          <!-- Campana — a la izquierda del avatar -->
          <div id="btn-campana" title="Notificaciones"
               style="cursor:pointer;position:relative;margin-right:.75rem;">
            <i class="bi bi-bell-fill"
               style="font-size:1.25rem;color:rgba(255,255,255,.85);"></i>
            <span id="badge-notif"
                  class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style="font-size:.6rem;min-width:18px;display:none;">0</span>
          </div>
          <!-- Avatar -->
          <div class="dash-header-avatar">
            <i class="bi bi-person-fill"></i>
          </div>
          <!-- Nombre y rol -->
          <div class="dash-header-user-info">
            <span class="dash-header-nombre">${nombre}</span>
            <small class="dash-header-rol">${rol}</small>
          </div>
        </div>

      </header>
    `;
})();