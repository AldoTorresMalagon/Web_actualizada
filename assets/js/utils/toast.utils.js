(function () {
    function crearContenedor() {
        let c = document.getElementById('toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toast-container';
            c.style.cssText = `
        position:fixed; top:1rem; right:1rem; z-index:9999;
        display:flex; flex-direction:column; gap:.5rem;
        max-width:320px; width:calc(100vw - 2rem);
      `;
            document.body.appendChild(c);
        }
        return c;
    }

    const ICONS = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-triangle-fill', warning: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
    const COLORS = { success: '#198754', danger: '#dc3545', warning: '#e6a817', info: '#0b265c' };

    window.Toast = {
        show(msg, tipo = 'info', duracion = 3500) {
            const c = crearContenedor();
            const t = document.createElement('div');
            t.style.cssText = `
        background:#fff; border-left:4px solid ${COLORS[tipo] || COLORS.info};
        border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.12);
        padding:.75rem 1rem; display:flex; align-items:flex-start; gap:.65rem;
        animation:slideInToast .25s ease; font-size:.9rem;
      `;
            t.innerHTML = `
        <i class="bi ${ICONS[tipo] || ICONS.info}" style="color:${COLORS[tipo]};font-size:1.1rem;flex-shrink:0;margin-top:.1rem"></i>
        <span style="flex:1;color:#333">${msg}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#999;font-size:1rem;padding:0;line-height:1">✕</button>
      `;
            c.appendChild(t);
            setTimeout(() => t.style.animation = 'fadeOutToast .3s ease forwards', duracion);
            setTimeout(() => t.remove(), duracion + 300);
        },
        success(m, d) { this.show(m, 'success', d); },
        error(m, d) { this.show(m, 'danger', d); },
        warning(m, d) { this.show(m, 'warning', d); },
        info(m, d) { this.show(m, 'info', d); }
    };

    // Inyectar keyframes
    const style = document.createElement('style');
    style.textContent = `
    @keyframes slideInToast  { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:none } }
    @keyframes fadeOutToast  { to   { opacity:0; transform:translateX(20px) } }
  `;
    document.head.appendChild(style);
})();