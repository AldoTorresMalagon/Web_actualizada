(function renderNavbar() {
    const navbarEl = document.getElementById('navbar');
    const sidebarEl = document.getElementById('sidebar');
    if (!navbarEl || !sidebarEl) return;

    // Detectar si hay sesión activa (validación completa la hace auth.utils.js)
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isAdmin = user && ['administrador', 'trabajador'].includes(user.rol);

    navbarEl.innerHTML = `
      <nav class="site-nav">
        <div class="container">
          <div class="nav-links">
            <a href="inicio.html" class="btn btn-primary">
              <i class="bi bi-house-door me-1"></i>Inicio
            </a>
            <a href="menu.html" class="btn btn-primary">
              <i class="bi bi-cup-hot me-1"></i>Comidas
            </a>
            <a href="productos.html" class="btn btn-primary">
              <i class="bi bi-box-seam me-1"></i>Productos
            </a>
            <a href="bebidas.html" class="btn btn-primary">
              <i class="bi bi-cup-straw me-1"></i>Bebidas
            </a>
  
            ${isAdmin ? `
            <a href="../dashboard/index.html" class="btn btn-success">
              <i class="bi bi-speedometer2 me-1"></i>Dashboard
            </a>` : ''}
  
            ${token ? `
            <a href="carrito.html" class="btn btn-primary">
              <i class="bi bi-cart me-1"></i>Mi Carrito
            </a>
            <a href="perfil.html" class="btn btn-primary">
              <i class="bi bi-person me-1"></i>Mi Perfil
            </a>` : `
            <a href="login.html" class="btn btn-outline-primary">
              <i class="bi bi-box-arrow-in-right me-1"></i>Iniciar Sesión
            </a>
            <a href="registro.html" class="btn btn-outline-primary">
              <i class="bi bi-person-plus me-1"></i>Registrarse
            </a>`}
          </div>
        </div>
      </nav>
    `;

    sidebarEl.innerHTML = `
      <div class="offcanvas offcanvas-end" tabindex="-1" id="sidebarMenu" aria-labelledby="sidebarMenuLabel">
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="sidebarMenuLabel">
            <i class="bi bi-cup-hot-fill me-2"></i>Menú
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button>
        </div>
  
        <div class="offcanvas-body">
  
          <!-- Navegación principal -->
          <ul class="nav flex-column">
            <li class="nav-item">
              <a class="nav-link" href="inicio.html">
                <i class="bi bi-house-door me-2"></i>Inicio
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="menu.html">
                <i class="bi bi-cup-hot me-2"></i>Comidas
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="productos.html">
                <i class="bi bi-box-seam me-2"></i>Productos
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="bebidas.html">
                <i class="bi bi-cup-straw me-2"></i>Bebidas
              </a>
            </li>
          </ul>
  
          <hr class="sidebar-divider">
  
          <!-- Sección de usuario -->
          ${token ? `
          <ul class="nav flex-column">
            <li class="nav-item">
              <a class="nav-link" href="carrito.html">
                <i class="bi bi-cart me-2"></i>Mi Carrito
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="perfil.html">
                <i class="bi bi-person me-2"></i>Mi Perfil
              </a>
            </li>
            ${isAdmin ? `
            <li class="nav-item">
              <a class="nav-link text-success" href="../dashboard/index.html">
                <i class="bi bi-speedometer2 me-2"></i>Dashboard
              </a>
            </li>` : ''}
            <li class="nav-item">
              <a class="nav-link text-danger" href="#" id="sidebar-logout">
                <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
              </a>
            </li>
          </ul>` : `
          <ul class="nav flex-column">
            <li class="nav-item">
              <a class="nav-link" href="login.html">
                <i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="registro.html">
                <i class="bi bi-person-plus me-2"></i>Registrarse
              </a>
            </li>
          </ul>`}
  
          <hr class="sidebar-divider">
  
          <!-- Información -->
          <p class="sidebar-section-label">Información</p>
          <ul class="nav flex-column">
            <li class="nav-item"><a class="nav-link" href="contacto.html"><i class="bi bi-telephone me-2"></i>Contacto</a></li>
            <li class="nav-item"><a class="nav-link" href="acerca_de.html"><i class="bi bi-info-circle me-2"></i>Acerca de</a></li>
            <li class="nav-item"><a class="nav-link" href="ubicacion.html"><i class="bi bi-geo-alt me-2"></i>Ubicación</a></li>
            <li class="nav-item"><a class="nav-link" href="ayuda.html"><i class="bi bi-question-circle me-2"></i>Ayuda</a></li>
            <li class="nav-item"><a class="nav-link" href="privacidad.html"><i class="bi bi-shield-check me-2"></i>Privacidad</a></li>
            <li class="nav-item"><a class="nav-link" href="accesibilidad.html"><i class="bi bi-universal-access me-2"></i>Accesibilidad</a></li>
          </ul>
  
        </div>
      </div>
    `;

    // Logout desde sidebar
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
})();