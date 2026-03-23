(function () {

    // Contenedor de toasts
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

    const ICONS = {
        success: 'bi-check-circle-fill',
        danger:  'bi-exclamation-triangle-fill',
        warning: 'bi-exclamation-circle-fill',
        info:    'bi-info-circle-fill'
    };
    const COLORS = {
        success: '#198754',
        danger:  '#dc3545',
        warning: '#e6a817',
        info:    '#0b265c'
    };

    // Inyectar keyframes una sola vez
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInToast { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:none } }
        @keyframes fadeOutToast  { to   { opacity:0; transform:translateX(20px) } }

        /* Modal de confirmación */
        #toast-confirm-overlay {
            position:fixed; inset:0; z-index:10000;
            background:rgba(0,0,0,.45);
            display:flex; align-items:center; justify-content:center;
            animation:fadeInOverlay .15s ease;
        }
        @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }

        #toast-confirm-box {
            background:#fff; border-radius:12px;
            box-shadow:0 8px 32px rgba(0,0,0,.2);
            padding:1.5rem; max-width:420px; width:calc(100vw - 2rem);
            animation:slideInConfirm .2s ease;
        }
        @keyframes slideInConfirm { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:none } }

        #toast-confirm-box .confirm-title {
            font-weight:700; font-size:1rem; margin-bottom:.4rem;
            display:flex; align-items:center; gap:.5rem;
        }
        #toast-confirm-box .confirm-msg {
            color:#555; font-size:.9rem; margin-bottom:1.2rem; line-height:1.5;
        }
        #toast-confirm-box .confirm-actions {
            display:flex; justify-content:flex-end; gap:.5rem;
        }
        #toast-confirm-box .btn-cancel {
            padding:.4rem 1rem; border-radius:6px; border:1px solid #dee2e6;
            background:#fff; cursor:pointer; font-size:.9rem; color:#555;
            transition:background .15s;
        }
        #toast-confirm-box .btn-cancel:hover { background:#f8f9fa; }
        #toast-confirm-box .btn-confirm {
            padding:.4rem 1.2rem; border-radius:6px; border:none;
            cursor:pointer; font-size:.9rem; font-weight:600; color:#fff;
            transition:opacity .15s;
        }
        #toast-confirm-box .btn-confirm:hover { opacity:.88; }
    `;
    document.head.appendChild(style);

    // API pública
    window.Toast = {

        // Muestra un toast de notificación
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
        error(m, d)   { this.show(m, 'danger',  d); },
        warning(m, d) { this.show(m, 'warning', d); },
        info(m, d)    { this.show(m, 'info',    d); },

        // Modal de confirmación
        confirm(opcionesOMsg, onConfirm, onCancel) {
            // Aceptar string simple o objeto de opciones
            const opts = typeof opcionesOMsg === 'string'
                ? { msg: opcionesOMsg }
                : opcionesOMsg;

            const {
                titulo   = 'Confirmar acción',
                msg      = '¿Deseas continuar?',
                tipo     = 'danger',
                labelOk  = 'Confirmar',
                labelNo  = 'Cancelar',
            } = opts;

            const colorBtn = COLORS[tipo]  || COLORS.danger;
            const iconTit  = tipo === 'danger'  ? 'bi-exclamation-triangle-fill'
                           : tipo === 'warning' ? 'bi-exclamation-circle-fill'
                           : 'bi-question-circle-fill';

            // Crear overlay
            const overlay = document.createElement('div');
            overlay.id = 'toast-confirm-overlay';
            overlay.innerHTML = `
                <div id="toast-confirm-box">
                    <div class="confirm-title">
                        <i class="bi ${iconTit}" style="color:${colorBtn};font-size:1.2rem;"></i>
                        ${titulo}
                    </div>
                    <div class="confirm-msg">${msg}</div>
                    <div class="confirm-actions">
                        <button class="btn-cancel" id="toast-confirm-no">${labelNo}</button>
                        <button class="btn-confirm" id="toast-confirm-ok"
                                style="background:${colorBtn};">${labelOk}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const cerrar = () => overlay.remove();

            document.getElementById('toast-confirm-ok').addEventListener('click', () => {
                cerrar();
                if (typeof onConfirm === 'function') onConfirm();
            });
            document.getElementById('toast-confirm-no').addEventListener('click', () => {
                cerrar();
                if (typeof onCancel === 'function') onCancel();
            });
            // Cerrar al hacer clic fuera del box
            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    cerrar();
                    if (typeof onCancel === 'function') onCancel();
                }
            });
            // Cerrar con Escape
            const onKey = e => {
                if (e.key === 'Escape') {
                    cerrar();
                    if (typeof onCancel === 'function') onCancel();
                    document.removeEventListener('keydown', onKey);
                }
            };
            document.addEventListener('keydown', onKey);
        },
    };

})();