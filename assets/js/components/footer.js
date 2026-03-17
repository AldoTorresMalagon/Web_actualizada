(function renderFooter() {
  const footerEl = document.getElementById('footer');
  if (!footerEl) return;

  const token = localStorage.getItem('token');

  footerEl.innerHTML = `
    <footer class="site-footer mt-auto">

      <div class="footer-top">
        <div class="container">
          <div class="row align-items-center">
            <div class="col-md-6 text-center text-md-start mb-2 mb-md-0">
              <h5 class="mb-0 fw-bold">
                <i class="bi bi-cup-hot-fill me-2"></i>CAFETERÍA ITH
              </h5>
            </div>
            <div class="col-md-6 text-center text-md-end">
              <span class="me-2 small">Síguenos:</span>
              <a href="https://www.facebook.com/TecNMHuejutlaOficial/" target="_blank" class="footer-social-btn" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
              <a href="https://instagram.com" target="_blank" class="footer-social-btn" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
              <a href="https://x.com/TecNMHuejutla" target="_blank" class="footer-social-btn" aria-label="Twitter"><i class="bi bi-twitter"></i></a>
              <a href="https://www.youtube.com/channel/UCU5minsrNi_agfUcV2V3rKw" target="_blank" class="footer-social-btn" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-links">
        <div class="container">
          <div class="row g-3">
            <div class="col-6 col-md-3">
              <h6 class="footer-col-title"><i class="bi bi-info-circle me-1"></i>Información</h6>
              <ul class="list-unstyled small">
                <li class="mb-1"><a href="contacto.html">Contacto</a></li>
                <li class="mb-1"><a href="privacidad.html">Privacidad</a></li>
                <li class="mb-1"><a href="accesibilidad.html">Accesibilidad</a></li>
              </ul>
            </div>
            <div class="col-6 col-md-3">
              <h6 class="footer-col-title"><i class="bi bi-cup-straw me-1"></i>Servicios</h6>
              <ul class="list-unstyled small">
                <li class="mb-1"><a href="menu.html">Comidas</a></li>
                <li class="mb-1"><a href="productos.html">Productos</a></li>
                <li class="mb-1"><a href="bebidas.html">Bebidas</a></li>
              </ul>
            </div>
            <div class="col-6 col-md-3">
              <h6 class="footer-col-title"><i class="bi bi-person-circle me-1"></i>Mi Cuenta</h6>
              <ul class="list-unstyled small">
                ${token ? `
                <li class="mb-1"><a href="perfil.html">Mi Perfil</a></li>
                <li class="mb-1"><a href="carrito.html">Mi Carrito</a></li>` : `
                <li class="mb-1"><a href="login.html">Iniciar Sesión</a></li>
                <li class="mb-1"><a href="registro.html">Registrarse</a></li>`}
                <li class="mb-1"><a href="ayuda.html">Ayuda</a></li>
              </ul>
            </div>
            <div class="col-6 col-md-3">
              <h6 class="footer-col-title"><i class="bi bi-building me-1"></i>Acerca de</h6>
              <ul class="list-unstyled small">
                <li class="mb-1"><a href="acerca_de.html">Acerca de</a></li>
                <li class="mb-1"><a href="ubicacion.html">Ubicación</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="container">
          <div class="row align-items-center">
            <div class="col-md-6 text-center text-md-start">
              <p class="mb-0 small">© 2025 ITH - Cafetería Escolar</p>
            </div>
            <div class="col-md-6 text-center text-md-end">
              <p class="mb-0 small">Hecho con <i class="bi bi-heart-fill text-danger"></i> por estudiantes ITH</p>
            </div>
          </div>
        </div>
      </div>

    </footer>
  `;
})();