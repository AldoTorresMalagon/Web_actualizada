(function initNotificacionesPanel() {

    if (document.getElementById('notif-wrapper')) return;

    // Inyectar HTML
    const wrapper = document.createElement('div');
    wrapper.id = 'notif-wrapper';
    wrapper.innerHTML = `
        <div id="notif-overlay"></div>

        <div id="notif-panel" role="dialog" aria-label="Panel de notificaciones">

            <!-- Header -->
            <div class="notif-header">
                <div class="notif-header-izq">
                    <i class="bi bi-bell-fill" aria-hidden="true"></i>
                    <h6 class="notif-header-titulo">Notificaciones</h6>
                    <span id="notif-badge-panel" class="badge bg-danger" aria-live="polite">0</span>
                </div>
                <div class="notif-header-der">
                    <button id="btn-marcar-todas" class="btn btn-sm btn-outline-light"
                            title="Marcar todas como leídas">
                        <i class="bi bi-check-all me-1"></i>Leídas
                    </button>
                    <button id="btn-cerrar-panel" class="btn btn-sm btn-outline-light"
                            title="Cerrar panel" aria-label="Cerrar panel de notificaciones">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Filtros -->
            <div class="notif-filtros" role="group" aria-label="Filtrar notificaciones">
                <button class="notif-filtro-btn activo" data-filtro="todas">Todas</button>
                <button class="notif-filtro-btn" data-filtro="no-leidas">No leídas</button>
                <button class="notif-filtro-btn" data-filtro="stock">Stock</button>
                <button class="notif-filtro-btn" data-filtro="reportes">Reportes</button>
            </div>

            <!-- Lista -->
            <div id="notif-lista" role="list" aria-live="polite" aria-label="Lista de notificaciones"></div>

            <!-- Footer -->
            <div class="notif-footer">
                <span class="notif-footer-ts" id="notif-ultima-actualizacion">—</span>
                <button id="btn-limpiar-todas" class="btn btn-sm btn-outline-danger">
                    <i class="bi bi-trash me-1"></i>Limpiar todo
                </button>
            </div>
        </div>`;

    document.body.appendChild(wrapper);

    // Referencias
    const panel   = document.getElementById('notif-panel');
    const overlay = document.getElementById('notif-overlay');
    const lista   = document.getElementById('notif-lista');
    const badgeH  = document.getElementById('badge-notif');
    const badgeP  = document.getElementById('notif-badge-panel');
    const tsEl    = document.getElementById('notif-ultima-actualizacion');

    let notificaciones = [];
    let filtroActivo   = 'todas';
    let panelAbierto   = false;

    // Abrir / cerrar 
    function abrirPanel() {
        panel.classList.add('abierto');
        overlay.style.display = 'block';
        panelAbierto = true;
        cargarNotificaciones();
        document.getElementById('btn-cerrar-panel')?.focus();
    }

    function cerrarPanel() {
        panel.classList.remove('abierto');
        overlay.style.display = 'none';
        panelAbierto = false;
        document.getElementById('btn-campana')?.focus();
    }

    // Badge
    function actualizarBadge(noLeidas) {
        const txt = noLeidas > 99 ? '99+' : String(noLeidas);
        [badgeH, badgeP].forEach(b => {
            if (!b) return;
            b.textContent   = txt;
            b.style.display = noLeidas > 0 ? 'inline-block' : 'none';
        });
        // Título de la pestaña
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

    // Skeleton
    function mostrarSkeleton() {
        lista.innerHTML = Array(4).fill(`
            <div class="notif-skeleton" aria-hidden="true">
                <div class="notif-skeleton-line ancho-3q"></div>
                <div class="notif-skeleton-line ancho-full"></div>
                <div class="notif-skeleton-line ancho-mid"></div>
                <div class="notif-skeleton-line ancho-sm"></div>
            </div>`).join('');
    }

    // Filtrar
    function filtrar(items) {
        switch (filtroActivo) {
            case 'no-leidas': return items.filter(n => !n.leida);
            case 'stock':     return items.filter(n => n.modulo === 'inventario');
            case 'reportes':  return items.filter(n => n.modulo === 'reportes');
            default:          return items;
        }
    }

    // Renderizar con agrupación por fecha
    function renderLista() {
        const items = filtrar(notificaciones);

        if (!items.length) {
            const msgs = {
                'no-leidas': 'No tienes notificaciones sin leer',
                'stock':     'Sin alertas de stock',
                'reportes':  'Sin alertas de reportes',
                'todas':     'Sin notificaciones por el momento',
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
            <div class="notif-grupo-fecha" aria-label="${etiq}">${etiq}</div>
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
                                   onclick="notifMarcarLeida(${n.idNotificacion})"
                                   aria-label="Ver detalle de: ${n.titulo}">
                                    Ver <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                </a>` : ''}
                                ${!n.leida ? `
                                <button class="notif-btn-accion notif-btn-leer"
                                        onclick="notifMarcarLeida(${n.idNotificacion})"
                                        title="Marcar como leída"
                                        aria-label="Marcar como leída: ${n.titulo}">
                                    <i class="bi bi-check2" aria-hidden="true"></i>
                                </button>` : ''}
                                <button class="notif-btn-accion notif-btn-eliminar"
                                        onclick="notifEliminar(${n.idNotificacion})"
                                        title="Eliminar"
                                        aria-label="Eliminar notificación: ${n.titulo}">
                                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`).join('')}
        `).join('');

        // Clic / teclado en item
        lista.querySelectorAll('.notif-item').forEach(el => {
            el.addEventListener('click', e => {
                if (e.target.closest('button, a')) return;
                notifMarcarLeida(parseInt(el.dataset.id));
            });
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    notifMarcarLeida(parseInt(el.dataset.id));
                }
            });
        });
    }

    // Cargar desde API
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

    // Polling ligero (solo no leídas)
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

    // Acciones globales
    window.notifMarcarLeida = async function(id) {
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

    window.notifEliminar = async function(id) {
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
        if (e.target.closest('#btn-campana'))
            panelAbierto ? cerrarPanel() : abrirPanel();
    });

    document.getElementById('btn-cerrar-panel')?.addEventListener('click', cerrarPanel);
    overlay.addEventListener('click', cerrarPanel);

    document.querySelectorAll('.notif-filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.notif-filtro-btn').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            filtroActivo = btn.dataset.filtro;
            renderLista();
        });
    });

    document.getElementById('btn-marcar-todas')?.addEventListener('click', async () => {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/notificaciones/leer-todas`, {
                method: 'PUT', headers: AuthUtils.getHeaders(),
            });
            notificaciones.forEach(n => { n.leida = 1; });
            actualizarBadge(0);
            renderLista();
            Toast?.success('Todas marcadas como leídas');
        } catch { Toast?.error('Error al marcar notificaciones'); }
    });

    document.getElementById('btn-limpiar-todas')?.addEventListener('click', () => {
        Toast.confirm({
            titulo:  'Limpiar notificaciones',
            msg:     '¿Eliminar todas las notificaciones de tu vista?',
            tipo:    'danger',
            labelOk: 'Sí, limpiar',
        }, async () => {
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
    });

    // Cerrar con Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && panelAbierto) cerrarPanel();
    });

    // Init
    if (AuthUtils.estaAutenticado()) {
        pollNoLeidas();
        setInterval(pollNoLeidas, 60_000);
    }

})();