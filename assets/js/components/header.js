(function renderHeader() {
  const headerEl = document.getElementById('header');
  if (!headerEl) return;

  const hasSidebar = !!document.getElementById('sidebar');

  headerEl.innerHTML = `
    <header class="site-header">
      <div class="header-logo">
        <img src="../assets/images/logo.png" alt="Logo Cafetería ITH" id="header-logo-img"
             onerror="this.style.display='none'; document.getElementById('header-logo-text').style.display='flex';">
        <span id="header-logo-text" class="header-logo-fallback" style="display:none;">
          <i class="bi bi-cup-hot-fill me-2"></i>CAFETERÍA ITH
        </span>
      </div>

      <h1 class="header-title" id="header-greeting">BIENVENIDO</h1>

      ${hasSidebar ? `
      <button class="header-menu-btn" data-bs-toggle="offcanvas" data-bs-target="#sidebarMenu" aria-label="Abrir menú">
        <i class="bi bi-list"></i>
      </button>` : `<span class="header-menu-spacer"></span>`}
    </header>
  `;

  // Saludo dinámico — se ejecuta en todas las páginas automáticamente
  const greeting = document.getElementById('header-greeting');
  if (!greeting) return;

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  if (user?.nombre) {
    greeting.textContent = `${saludo}, ${user.nombre.split(' ')[0]}`;
  } else {
    greeting.textContent = saludo;
  }
})();