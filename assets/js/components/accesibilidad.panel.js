(function initAccPanel() {
    if (document.getElementById('acc-wrapper')) return;

    const panelWrapper = document.createElement('div');
    panelWrapper.id = 'acc-wrapper';
    panelWrapper.innerHTML = `
    <button class="btn-accesibilidad-flotante" id="btnAbrirPanel"
            title="Opciones de accesibilidad" aria-label="Abrir panel de accesibilidad">
        <i class="bi bi-universal-access"></i>
    </button>

    <div class="panel-accesibilidad" id="panelAccesibilidad">

        <div class="panel-header">
            <span><i class="bi bi-universal-access me-2"></i>Accesibilidad</span>
            <button class="btn btn-sm btn-light" id="btnCerrarPanel" aria-label="Cerrar">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="panel-body">

            <!-- Tamaño de texto -->
            <div class="acc-seccion">
                <div class="acc-seccion-titulo"><i class="bi bi-fonts me-1"></i>Tamaño del Texto</div>
                <div class="btn-opcion-grupo">
                    <button class="btn btn-opcion" data-opcion="tamano_fuente" data-valor="pequeno" title="Pequeño">A<sup>−</sup></button>
                    <button class="btn btn-opcion" data-opcion="tamano_fuente" data-valor="normal"  title="Normal">A</button>
                    <button class="btn btn-opcion" data-opcion="tamano_fuente" data-valor="grande"  title="Grande">A<sup>+</sup></button>
                    <button class="btn btn-opcion" data-opcion="tamano_fuente" data-valor="muy_grande" title="Muy grande">A<sup>++</sup></button>
                </div>
            </div>

            <!-- Color y visión -->
            <div class="acc-seccion">
                <div class="acc-seccion-titulo"><i class="bi bi-palette me-1"></i>Color y Visión</div>
                <div class="acc-grid">
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-circle-half"></i> Alto Contraste</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleContrastePanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-moon-stars"></i> Modo Nocturno</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleOscuroPanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <div class="acc-seccion-titulo mt-2"><i class="bi bi-droplet-half me-1"></i>Saturación</div>
                <div class="btn-opcion-grupo">
                    <button class="btn btn-opcion" data-opcion="saturacion" data-valor="ninguna" title="Sin color">B/N</button>
                    <button class="btn btn-opcion" data-opcion="saturacion" data-valor="baja"    title="Baja">−</button>
                    <button class="btn btn-opcion" data-opcion="saturacion" data-valor="normal"  title="Normal">○</button>
                    <button class="btn btn-opcion" data-opcion="saturacion" data-valor="alta"    title="Alta">+</button>
                </div>
            </div>

            <!-- Lectura -->
            <div class="acc-seccion">
                <div class="acc-seccion-titulo"><i class="bi bi-book me-1"></i>Lectura</div>
                <div class="acc-grid">
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-layout-text-window"></i> Modo Lectura</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleLecturaPanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-type"></i> Fuente Dislexia</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleFuentePanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-link-45deg"></i> Subrayar Links</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleEnlacesPanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Navegación -->
            <div class="acc-seccion">
                <div class="acc-seccion-titulo"><i class="bi bi-cursor me-1"></i>Navegación</div>
                <div class="acc-grid">
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-stop-circle"></i> Reducir Movimiento</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleMovimientoPanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-cursor-fill"></i> Cursor Grande</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleCursorPanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="acc-toggle-item">
                        <div class="acc-toggle-label"><i class="bi bi-bounding-box"></i> Resaltar Focus</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggleFocusPanel">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Footer del panel -->
            <div class="acc-footer">
                <button class="btn btn-outline-secondary btn-sm w-100" id="btnResetearPanel">
                    <i class="bi bi-arrow-clockwise me-1"></i>Restablecer todo
                </button>
                <a href="../public/accesibilidad.html" class="btn btn-outline-primary btn-sm w-100">
                    <i class="bi bi-sliders me-1"></i>Más opciones
                </a>
            </div>

        </div>
    </div>
  `;
    document.body.appendChild(panelWrapper);

    /*  Lógica */
    const STORAGE_KEY = 'cafeteria_accesibilidad';
    const DEFAULTS = {
        tamano_fuente: 'normal', alto_contraste: false, modo_oscuro: false,
        modo_lectura: false, fuente_dislexia: false, subrayar_enlaces: false,
        reducir_movimiento: false, cursor_grande: false, resaltar_focus: false,
        saturacion: 'normal',
    };

    const btnAbrir = document.getElementById('btnAbrirPanel');
    const btnCerrar = document.getElementById('btnCerrarPanel');
    const panel = document.getElementById('panelAccesibilidad');
    const btnReset = document.getElementById('btnResetearPanel');

    // Abrir / cerrar
    btnAbrir.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('panel-visible');
    });
    btnCerrar.addEventListener('click', () => panel.classList.remove('panel-visible'));
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !btnAbrir.contains(e.target))
            panel.classList.remove('panel-visible');
    });

    // Leer estado actual del panel
    function getCfg() {
        return {
            tamano_fuente: panel.querySelector('[data-opcion="tamano_fuente"].activo')?.dataset.valor || 'normal',
            saturacion: panel.querySelector('[data-opcion="saturacion"].activo')?.dataset.valor || 'normal',
            alto_contraste: document.getElementById('toggleContrastePanel')?.checked || false,
            modo_oscuro: document.getElementById('toggleOscuroPanel')?.checked || false,
            modo_lectura: document.getElementById('toggleLecturaPanel')?.checked || false,
            fuente_dislexia: document.getElementById('toggleFuentePanel')?.checked || false,
            subrayar_enlaces: document.getElementById('toggleEnlacesPanel')?.checked || false,
            reducir_movimiento: document.getElementById('toggleMovimientoPanel')?.checked || false,
            cursor_grande: document.getElementById('toggleCursorPanel')?.checked || false,
            resaltar_focus: document.getElementById('toggleFocusPanel')?.checked || false,
        };
    }

    // Guardar y aplicar inmediatamente
    function guardarYAplicar() {
        const cfg = getCfg();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        aplicarConfig(cfg);
    }

    // Botones de opción — activo + aplicar
    panel.querySelectorAll('[data-opcion]').forEach(btn => {
        btn.addEventListener('click', () => {
            const op = btn.dataset.opcion;
            panel.querySelectorAll(`[data-opcion="${op}"]`).forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            guardarYAplicar();
        });
    });

    // Toggles — aplicar al cambiar
    ['toggleContrastePanel', 'toggleOscuroPanel', 'toggleLecturaPanel', 'toggleFuentePanel',
        'toggleEnlacesPanel', 'toggleMovimientoPanel', 'toggleCursorPanel', 'toggleFocusPanel'
    ].forEach(id => document.getElementById(id)?.addEventListener('change', guardarYAplicar));

    // Aplicar config al DOM
    function aplicarConfig(cfg) {
        const h = document.documentElement;
        h.removeAttribute('data-font-size');
        if (cfg.tamano_fuente !== 'normal') h.setAttribute('data-font-size', cfg.tamano_fuente);
        h.classList.toggle('alto-contraste', cfg.alto_contraste);
        h.classList.toggle('modo-oscuro', cfg.modo_oscuro);
        h.classList.toggle('modo-lectura', cfg.modo_lectura);
        h.classList.toggle('fuente-dislexia', cfg.fuente_dislexia);
        h.classList.toggle('subrayar-enlaces', cfg.subrayar_enlaces);
        h.classList.toggle('reducir-movimiento', cfg.reducir_movimiento);
        h.classList.toggle('cursor-grande', cfg.cursor_grande);
        h.classList.toggle('resaltar-focus', cfg.resaltar_focus);

        const satMap = { baja: 'saturate(0.3)', ninguna: 'saturate(0)', alta: 'saturate(2)', normal: '' };
        const satFilter = satMap[cfg.saturacion] || '';
        document.querySelectorAll('body > *:not(#acc-wrapper)').forEach(el => el.style.filter = satFilter);

        if (cfg.fuente_dislexia && !document.getElementById('font-dyslexic')) {
            const link = document.createElement('link');
            link.id = 'font-dyslexic'; link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css';
            document.head.appendChild(link);
        }
    }

    // Sincronizar UI del panel con config guardada
    function sincronizar(cfg) {
        panel.querySelectorAll('[data-opcion="tamano_fuente"]').forEach(b =>
            b.classList.toggle('activo', b.dataset.valor === cfg.tamano_fuente));
        panel.querySelectorAll('[data-opcion="saturacion"]').forEach(b =>
            b.classList.toggle('activo', b.dataset.valor === cfg.saturacion));
        const map = {
            toggleContrastePanel: 'alto_contraste', toggleOscuroPanel: 'modo_oscuro',
            toggleLecturaPanel: 'modo_lectura', toggleFuentePanel: 'fuente_dislexia',
            toggleEnlacesPanel: 'subrayar_enlaces', toggleMovimientoPanel: 'reducir_movimiento',
            toggleCursorPanel: 'cursor_grande', toggleFocusPanel: 'resaltar_focus',
        };
        Object.entries(map).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!cfg[key];
        });
    }

    // Restablecer
    btnReset.addEventListener('click', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS }));
        aplicarConfig({ ...DEFAULTS });
        sincronizar({ ...DEFAULTS });
        if (typeof Toast !== 'undefined') Toast.info('Configuración restablecida');
    });

    // Cargar config guardada al iniciar
    let cfg;
    try { cfg = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { cfg = { ...DEFAULTS }; }
    aplicarConfig(cfg);
    sincronizar(cfg);

})();