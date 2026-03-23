(function initNotificacionesPublica() {

    // Solo inicializar si el usuario está autenticado
    if (!AuthUtils?.estaAutenticado()) return;
    if (document.getElementById('notif-pub-wrapper')) return;

    // Inyectar campana en el header público
    // La campana se inserta junto al menú hamburguesa del navbar
    function inyectarCampanaPublica() {
        // Buscar el contenedor de la navbar donde va la campana
        // Envolver campana + hamburguesa en un contenedor flex para que queden juntos
        const btnHamburguesa = document.querySelector('.header-menu-btn');
        const header = document.querySelector('.site-header');
        if (!btnHamburguesa || !header) {
            setTimeout(intentarInyectarCampana, 300);
            return;
        }
        // Si ya hay un wrapper, no crear otro
        if (document.querySelector('.header-acciones-pub')) return;

        const campana = document.createElement('div');
        campana.className = 'notif-campana-pub';
        campana.id        = 'btn-campana-pub';
        campana.setAttribute('role', 'button');
        campana.setAttribute('tabindex', '0');
        campana.setAttribute('aria-label', 'Ver notificaciones');
        campana.setAttribute('title', 'Notificaciones');
        campana.innerHTML = `
            <i class="bi bi-bell-fill" aria-hidden="true"></i>
            <span id="badge-notif-pub"
                  class="badge rounded-pill bg-danger"
                  style="display:none;font-size:.6rem;min-width:18px;
                         position:absolute;top:-4px;right:-6px;">0</span>`;

        campana.style.cssText = `
            position:relative;
            cursor:pointer;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:38px;height:38px;
            border-radius:50%;
            color:rgba(255,255,255,.85);
            transition:background .2s;`;

        campana.addEventListener('mouseenter', () => campana.style.background = 'rgba(255,255,255,.15)');
        campana.addEventListener('mouseleave', () => campana.style.background = 'transparent');
        campana.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                campana.click();
            }
        });

        // Crear wrapper que agrupa campana + hamburguesa
        const wrapper = document.createElement('div');
        wrapper.className = 'header-acciones-pub';
        wrapper.style.cssText = 'display:flex;align-items:center;gap:.5rem;flex-shrink:0;';

        // Mover el botón hamburguesa dentro del wrapper
        header.insertBefore(wrapper, btnHamburguesa);
        wrapper.appendChild(campana);
        wrapper.appendChild(btnHamburguesa);
    }

    // Inyectar HTML del panel
    const wrapper = document.createElement('div');
    wrapper.id = 'notif-pub-wrapper';
    wrapper.innerHTML = `
        <div id="notif-overlay"></div>

        <div id="notif-panel" role="dialog" aria-label="Mis notificaciones">

            <!-- Header -->
            <div class="notif-header">
                <div class="notif-header-izq">
                    <i class="bi bi-bell-fill" aria-hidden="true"></i>
                    <h6 class="notif-header-titulo">Mis Notificaciones</h6>
                    <span id="notif-badge-panel" class="badge bg-danger" aria-live="polite">0</span>
                </div>
                <div class="notif-header-der">
                    <button id="btn-marcar-todas-pub" class="btn btn-sm btn-outline-light"
                            title="Marcar todas como leídas">
                        <i class="bi bi-check-all me-1"></i>Leídas
                    </button>
                    <button id="btn-cerrar-panel-pub" class="btn btn-sm btn-outline-light"
                            title="Cerrar" aria-label="Cerrar panel de notificaciones">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Filtros simplificados para el público -->
            <div class="notif-filtros" role="group" aria-label="Filtrar">
                <button class="notif-filtro-btn activo" data-filtro="todas">Todas</button>
                <button class="notif-filtro-btn" data-filtro="no-leidas">No leídas</button>
                <button class="notif-filtro-btn" data-filtro="pedidos">Mis pedidos</button>
            </div>

            <!-- Lista -->
            <div id="notif-lista" role="list" aria-live="polite"></div>

            <!-- Footer simplificado -->
            <div class="notif-footer">
                <span class="notif-footer-ts" id="notif-ts-pub">—</span>
                <button id="btn-limpiar-pub" class="btn btn-sm btn-outline-danger">
                    <i class="bi bi-trash me-1"></i>Limpiar
                </button>
            </div>
        </div>`;

    document.body.appendChild(wrapper);

    // Esperar a que el header esté inyectado
    const intentarInyectarCampana = () => {
        inyectarCampanaPublica();
        if (!document.getElementById('btn-campana-pub')) {
            setTimeout(intentarInyectarCampana, 300);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', intentarInyectarCampana);
    } else {
        setTimeout(intentarInyectarCampana, 200);
    }

    // Referencias
    const panel   = document.getElementById('notif-panel');
    const overlay = document.getElementById('notif-overlay');
    const lista   = document.getElementById('notif-lista');
    const badgeP  = document.getElementById('notif-badge-panel');
    const tsEl    = document.getElementById('notif-ts-pub');

    let notificaciones = [];
    let filtroActivo   = 'todas';
    let panelAbierto   = false;

    // Abrir / cerrar
    function abrirPanel() {
        panel.classList.add('abierto');
        overlay.style.display = 'block';
        panelAbierto = true;
        cargarNotificaciones();
        document.getElementById('btn-cerrar-panel-pub')?.focus();
    }

    function cerrarPanel() {
        panel.classList.remove('abierto');
        overlay.style.display = 'none';
        panelAbierto = false;
    }

    // Badge
    function actualizarBadge(noLeidas) {
        const txt = noLeidas > 99 ? '99+' : String(noLeidas);
        const badgeH = document.getElementById('badge-notif-pub');
        [badgeH, badgeP].forEach(b => {
            if (!b) return;
            b.textContent   = txt;
            b.style.display = noLeidas > 0 ? 'inline-block' : 'none';
        });
        const base = document.title.replace(/^\(\d+\+?\) /, '');
        document.title = noLeidas > 0 ? `(${txt}) ${base}` : base;
    }

    // Helpers
    function iconoTipo(tipo, icono) {
        if (icono) return `<i class="bi ${icono}" aria-hidden="true"></i>`;
        const map = {
            danger:  'bi-exclamation-octagon-fill text-danger',
            warning: 'bi-exclamation-triangle-fill text-warning',
            success: 'bi-check-circle-fill text-success',
            info:    'bi-info-circle-fill text-info',
        };
        return `<i class="bi ${map[tipo] || 'bi-bell-fill text-secondary'}" aria-hidden="true"></i>`;
    }

    function normalizarUrl(url) {
        if (!url) return '#';
        if (url.startsWith('http') || url.startsWith('/')) return url;
        return `${window.location.origin}/${url}`;
    }

    function etiquetaFecha(fechaStr) {
        const fecha = new Date(fechaStr);
        const hoy   = new Date();
        const ayer  = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
        if (fecha.toDateString() === hoy.toDateString())  return 'Hoy';
        if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
        return fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    function mostrarSkeleton() {
        lista.innerHTML = Array(3).fill(`
            <div class="notif-skeleton" aria-hidden="true">
                <div class="notif-skeleton-line ancho-3q"></div>
                <div class="notif-skeleton-line ancho-full"></div>
                <div class="notif-skeleton-line ancho-sm"></div>
            </div>`).join('');
    }

    // Filtrar
    function filtrar(items) {
        switch (filtroActivo) {
            case 'no-leidas': return items.filter(n => !n.leida);
            // Pedidos: notificaciones del módulo ventas o sin módulo específico
            case 'pedidos':   return items.filter(n => n.modulo === 'ventas' || !n.modulo);
            default:          return items;
        }
    }

    // Renderizar
    function renderLista() {
        const items = filtrar(notificaciones);

        if (!items.length) {
            const msgs = {
                'no-leidas': 'Todo al día — sin notificaciones pendientes',
                'pedidos':   'Sin novedades en tus pedidos',
                'todas':     'No tienes notificaciones por el momento',
            };
            lista.innerHTML = `
                <div class="notif-vacio" role="status">
                    <i class="bi bi-bell-slash" aria-hidden="true"></i>
                    <span>${msgs[filtroActivo] || 'Sin notificaciones'}</span>
                </div>`;
            return;
        }

        // Agrupar por fecha
        const grupos = {};
        items.forEach(n => {
            const etiq = etiquetaFecha(n.FechaRegistro);
            if (!grupos[etiq]) grupos[etiq] = [];
            grupos[etiq].push(n);
        });

        lista.innerHTML = Object.entries(grupos).map(([etiq, notifs]) => `
            <div class="notif-grupo-fecha">${etiq}</div>
            ${notifs.map(n => `
            <div class="notif-item ${n.leida ? 'leida' : 'no-leida'} tipo-${n.tipo || 'info'}"
                 data-id="${n.idNotificacion}"
                 role="listitem" tabindex="0"
                 aria-label="${n.titulo}${n.leida ? '' : ' — No leída'}">
                <div class="notif-item-inner">
                    <div class="notif-icono">${iconoTipo(n.tipo, n.icono)}</div>
                    <div class="notif-body">
                        <div class="notif-titulo ${n.leida ? '' : 'no-leida'}">${n.titulo}</div>
                        <div class="notif-mensaje">${n.mensaje}</div>
                        <div class="notif-meta">
                            <span class="notif-fecha">
                                <i class="bi bi-clock" aria-hidden="true"></i>
                                ${FormatUtils.fechaHora(n.FechaRegistro)}
                            </span>
                            <div class="notif-acciones">
                                ${n.urlAccion ? `
                                <a href="${normalizarUrl(n.urlAccion)}"
                                   class="notif-btn-ver"
                                   onclick="pubMarcarLeida(${n.idNotificacion})"
                                   aria-label="Ver detalle">
                                    Ver <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                </a>` : ''}
                                ${!n.leida ? `
                                <button class="notif-btn-accion notif-btn-leer"
                                        onclick="pubMarcarLeida(${n.idNotificacion})"
                                        title="Marcar como leída"
                                        aria-label="Marcar como leída">
                                    <i class="bi bi-check2" aria-hidden="true"></i>
                                </button>` : ''}
                                <button class="notif-btn-accion notif-btn-eliminar"
                                        onclick="pubEliminar(${n.idNotificacion})"
                                        title="Eliminar"
                                        aria-label="Eliminar">
                                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`).join('')}
        `).join('');

        lista.querySelectorAll('.notif-item').forEach(el => {
            el.addEventListener('click', e => {
                if (e.target.closest('button, a')) return;
                pubMarcarLeida(parseInt(el.dataset.id));
            });
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    pubMarcarLeida(parseInt(el.dataset.id));
                }
            });
        });
    }

    // Cargar
    async function cargarNotificaciones() {
        mostrarSkeleton();
        try {
            const res  = await fetch(`${API_CONFIG.BASE_URL}/notificaciones`, {
                headers: AuthUtils.getHeaders(),
            });
            const data = await res.json();
            if (!res.ok) return;

            notificaciones = data.data?.items || [];
            actualizarBadge(data.data?.noLeidas || 0);
            renderLista();

            const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            if (tsEl) tsEl.textContent = `Actualizado ${ahora}`;
        } catch { renderLista(); }
    }

    async function pollNoLeidas() {
        try {
            const res  = await fetch(`${API_CONFIG.BASE_URL}/notificaciones?leidas=false`, {
                headers: AuthUtils.getHeaders(),
            });
            const data = await res.json();
            if (!res.ok) return;
            actualizarBadge(data.data?.noLeidas || 0);
            if (panelAbierto) cargarNotificaciones();
        } catch { /* silencioso */ }
    }

    // Acciones
    window.pubMarcarLeida = async function(id) {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/notificaciones/${id}/leer`, {
                method: 'PUT', headers: AuthUtils.getHeaders(),
            });
            const n = notificaciones.find(x => x.idNotificacion === id);
            if (n) n.leida = 1;
            actualizarBadge(notificaciones.filter(x => !x.leida).length);
            renderLista();
        } catch { /* silencioso */ }
    };

    window.pubEliminar = async function(id) {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/notificaciones/${id}`, {
                method: 'DELETE', headers: AuthUtils.getHeaders(),
            });
            notificaciones = notificaciones.filter(x => x.idNotificacion !== id);
            actualizarBadge(notificaciones.filter(x => !x.leida).length);
            renderLista();
        } catch { /* silencioso */ }
    };

    // Listeners
    document.addEventListener('click', e => {
        if (e.target.closest('#btn-campana-pub'))
            panelAbierto ? cerrarPanel() : abrirPanel();
    });

    document.getElementById('btn-cerrar-panel-pub')?.addEventListener('click', cerrarPanel);
    overlay.addEventListener('click', cerrarPanel);

    document.querySelectorAll('.notif-filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.notif-filtro-btn').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            filtroActivo = btn.dataset.filtro;
            renderLista();
        });
    });

    document.getElementById('btn-marcar-todas-pub')?.addEventListener('click', async () => {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/notificaciones/leer-todas`, {
                method: 'PUT', headers: AuthUtils.getHeaders(),
            });
            notificaciones.forEach(n => { n.leida = 1; });
            actualizarBadge(0);
            renderLista();
            Toast?.success('Todas marcadas como leídas');
        } catch { Toast?.error('Error al marcar'); }
    });

    document.getElementById('btn-limpiar-pub')?.addEventListener('click', async () => {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/notificaciones/todas`, {
                method: 'DELETE', headers: AuthUtils.getHeaders(),
            });
            notificaciones = [];
            actualizarBadge(0);
            renderLista();
            Toast?.success('Notificaciones eliminadas');
        } catch { Toast?.error('Error al eliminar'); }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && panelAbierto) cerrarPanel();
    });

    // Init
    pollNoLeidas();
    setInterval(pollNoLeidas, 60_000);

})();