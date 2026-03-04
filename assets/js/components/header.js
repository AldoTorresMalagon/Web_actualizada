(function renderHeader() {
    const headerEl = document.getElementById('header');
    if (!headerEl) return;

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
  
        <button class="header-menu-btn" data-bs-toggle="offcanvas" data-bs-target="#sidebarMenu" aria-label="Abrir menú">
          <i class="bi bi-list"></i>
        </button>
      </header>
    `;
})();