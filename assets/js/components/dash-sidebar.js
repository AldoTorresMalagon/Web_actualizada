(function renderDashSidebar() {
    const el = document.getElementById('dash-sidebar');
    if (!el) return;

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const nombre = user?.nombre || user?.Nombre || 'Usuario';
    const rol = user?.rol?.toLowerCase() || '';
    const esAdmin = rol === 'administrador';

    const paginaActual = window.location.pathname.split('/').pop();
    function linkActivo(pagina) {
        return paginaActual === pagina ? 'nav-link active' : 'nav-link';
    }

    el.innerHTML = `
      <aside class="dash-sidebar">

        <div class="dash-sidebar-user">
          <div class="dash-sidebar-avatar">
            <i class="bi bi-person-circle"></i>
          </div>
          <div class="dash-sidebar-user-info">
            <span class="dash-sidebar-nombre">${nombre}</span>
            <small class="dash-sidebar-rol">${rol}</small>
          </div>
        </div>

        <div class="sidebar-nav">
          <a href="index.html" class="${linkActivo('index.html')}">
            <i class="bi bi-speedometer2"></i><span>Dashboard</span>
          </a>
          <a href="productos.html" class="${linkActivo('productos.html')}">
            <i class="bi bi-box-seam"></i><span>Productos</span>
          </a>
          <a href="ventas.html" class="${linkActivo('ventas.html')}">
            <i class="bi bi-receipt"></i><span>Ventas</span>
          </a>
          <a href="categorias.html" class="${linkActivo('categorias.html')}">
            <i class="bi bi-tags"></i><span>Categorías</span>
          </a>
          <a href="subcategorias.html" class="${linkActivo('subcategorias.html')}">
            <i class="bi bi-tag"></i><span>Subcategorías</span>
          </a>
          ${esAdmin ? `
          <a href="proveedores.html" class="${linkActivo('proveedores.html')}">
            <i class="bi bi-truck"></i><span>Proveedores</span>
          </a>
          <a href="usuarios.html" class="${linkActivo('usuarios.html')}">
            <i class="bi bi-people"></i><span>Usuarios</span>
          </a>
          <a href="inventario.html" class="${linkActivo('inventario.html')}">
            <i class="bi bi-clipboard-data"></i><span>Inventario</span>
          </a>
          <a href="reportes.html" class="${linkActivo('reportes.html')}">
            <i class="bi bi-graph-up"></i><span>Reportes</span>
          </a>
          <a href="promociones.html" class="${linkActivo('promociones.html')}">
            <i class="bi bi-percent"></i><span>Promociones</span>
          </a>` : ''}
        </div>

        <div class="dash-sidebar-footer">
          <hr class="sidebar-divider">
          <a href="../public/perfil.html" class="nav-link">
            <i class="bi bi-person"></i><span>Mi Perfil</span>
          </a>
          <a href="../public/accesibilidad.html" class="${linkActivo('accesibilidad.html')}">
            <i class="bi bi-universal-access"></i><span>Accesibilidad</span>
          </a>
          <a href="../public/inicio.html" class="nav-link">
            <i class="bi bi-eye"></i><span>Ver Sitio</span>
          </a>
          <a href="#" class="nav-link text-danger" id="dash-btn-logout">
            <i class="bi bi-box-arrow-right"></i><span>Cerrar Sesión</span>
          </a>
        </div>

      </aside>

      <!-- Modal logout -->
      <div class="modal fade" id="logoutModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title"><i class="bi bi-exclamation-triangle me-2"></i>Cerrar Sesión</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
              <i class="bi bi-box-arrow-right text-warning" style="font-size:3rem"></i>
              <h5 class="mt-3">¿Estás seguro?</h5>
              <p class="text-muted">Serás redirigido al inicio de sesión</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i>Cancelar
              </button>
              <button class="btn btn-danger" id="dash-confirmar-logout">
                <i class="bi bi-box-arrow-right me-1"></i>Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Lógica del logout
    setTimeout(() => {
        document.getElementById('dash-btn-logout')?.addEventListener('click', (e) => {
            e.preventDefault();
            new bootstrap.Modal(document.getElementById('logoutModal')).show();
        });
        document.getElementById('dash-confirmar-logout')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('carrito');
            window.location.href = '../public/login.html';
        });
    }, 100);

})();