const STORAGE_KEY = 'cafeteria_accesibilidad';

const DEFAULTS = {
    tamano_fuente: 'normal',
    alto_contraste: false,
    modo_oscuro: false,
    modo_lectura: false,
    fuente_dislexia: false,
    subrayar_enlaces: false,
    reducir_movimiento: false,
    cursor_grande: false,
    resaltar_focus: false,
    saturacion: 'normal',
};

function cargarConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
}

function guardarConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

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
    // Saturación — aplicar filter inline a todos los elementos del body
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

// Sincroniza TODOS los controles visibles (página + panel flotante)
function sincronizarUI(cfg) {
    document.querySelectorAll('[data-opcion="tamano_fuente"]').forEach(b =>
        b.classList.toggle('activo', b.dataset.valor === cfg.tamano_fuente));
    document.querySelectorAll('[data-opcion="saturacion"]').forEach(b =>
        b.classList.toggle('activo', b.dataset.valor === cfg.saturacion));

    const toggles = {
        toggleContraste: 'alto_contraste',
        toggleOscuro: 'modo_oscuro',
        toggleLectura: 'modo_lectura',
        toggleFuente: 'fuente_dislexia',
        toggleEnlaces: 'subrayar_enlaces',
        toggleMovimiento: 'reducir_movimiento',
        toggleCursor: 'cursor_grande',
        toggleFocus: 'resaltar_focus',
        toggleContrastePanel: 'alto_contraste',
        toggleOscuroPanel: 'modo_oscuro',
        toggleLecturaPanel: 'modo_lectura',
        toggleFuentePanel: 'fuente_dislexia',
        toggleEnlacesPanel: 'subrayar_enlaces',
        toggleMovimientoPanel: 'reducir_movimiento',
        toggleCursorPanel: 'cursor_grande',
        toggleFocusPanel: 'resaltar_focus',
    };
    Object.entries(toggles).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!cfg[key];
    });
}

// Lee el estado actual de los controles de la PÁGINA (excluye el panel flotante)
function leerConfigPagina() {
    const cfg = cargarConfig();

    const btnFuente = [...document.querySelectorAll('[data-opcion="tamano_fuente"].activo')]
        .find(b => !b.closest('#panelAccesibilidad'));
    if (btnFuente) cfg.tamano_fuente = btnFuente.dataset.valor;

    const btnSat = [...document.querySelectorAll('[data-opcion="saturacion"].activo')]
        .find(b => !b.closest('#panelAccesibilidad'));
    if (btnSat) cfg.saturacion = btnSat.dataset.valor;

    cfg.alto_contraste = document.getElementById('toggleContraste')?.checked ?? cfg.alto_contraste;
    cfg.modo_oscuro = document.getElementById('toggleOscuro')?.checked ?? cfg.modo_oscuro;
    cfg.modo_lectura = document.getElementById('toggleLectura')?.checked ?? cfg.modo_lectura;
    cfg.fuente_dislexia = document.getElementById('toggleFuente')?.checked ?? cfg.fuente_dislexia;
    cfg.subrayar_enlaces = document.getElementById('toggleEnlaces')?.checked ?? cfg.subrayar_enlaces;
    cfg.reducir_movimiento = document.getElementById('toggleMovimiento')?.checked ?? cfg.reducir_movimiento;
    cfg.cursor_grande = document.getElementById('toggleCursor')?.checked ?? cfg.cursor_grande;
    cfg.resaltar_focus = document.getElementById('toggleFocus')?.checked ?? cfg.resaltar_focus;

    return cfg;
}

function guardarYAplicarPagina() {
    const cfg = leerConfigPagina();
    guardarConfig(cfg);
    aplicarConfig(cfg);
    sincronizarUI(cfg);
}

document.addEventListener('DOMContentLoaded', () => {
    // Cargar y aplicar config guardada
    const cfg = cargarConfig();
    aplicarConfig(cfg);
    sincronizarUI(cfg);

    // Botones de opción (tamaño fuente, saturación) — aplicación inmediata
    document.querySelectorAll('[data-opcion]').forEach(btn => {
        if (btn.closest('#panelAccesibilidad')) return; // los maneja el panel
        btn.addEventListener('click', () => {
            const opcion = btn.dataset.opcion;
            // Desmarcar los demás botones del mismo grupo (fuera del panel)
            document.querySelectorAll(`[data-opcion="${opcion}"]`).forEach(b => {
                if (!b.closest('#panelAccesibilidad')) b.classList.remove('activo');
            });
            btn.classList.add('activo');
            guardarYAplicarPagina();
        });
    });

    // Toggles de la página — aplicación inmediata al cambiar
    ['toggleContraste', 'toggleOscuro', 'toggleLectura', 'toggleFuente',
        'toggleEnlaces', 'toggleMovimiento', 'toggleCursor', 'toggleFocus'
    ].forEach(id => {
        document.getElementById(id)?.addEventListener('change', guardarYAplicarPagina);
    });

    // Botón restablecer
    document.getElementById('btnResetear')?.addEventListener('click', () => {
        guardarConfig({ ...DEFAULTS });
        aplicarConfig({ ...DEFAULTS });
        sincronizarUI({ ...DEFAULTS });
        Toast?.info('Configuración restablecida a valores predeterminados');
    });
});