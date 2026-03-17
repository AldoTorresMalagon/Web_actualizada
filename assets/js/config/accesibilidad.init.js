(function () {
    const STORAGE_KEY = 'cafeteria_accesibilidad';
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { }

    const h = document.documentElement;
    if (cfg.tamano_fuente && cfg.tamano_fuente !== 'normal') h.setAttribute('data-font-size', cfg.tamano_fuente);
    if (cfg.alto_contraste) h.classList.add('alto-contraste');
    if (cfg.modo_oscuro) h.classList.add('modo-oscuro');
    if (cfg.modo_lectura) h.classList.add('modo-lectura');
    if (cfg.fuente_dislexia) h.classList.add('fuente-dislexia');
    if (cfg.subrayar_enlaces) h.classList.add('subrayar-enlaces');
    if (cfg.reducir_movimiento) h.classList.add('reducir-movimiento');
    if (cfg.cursor_grande) h.classList.add('cursor-grande');
    if (cfg.resaltar_focus) h.classList.add('resaltar-focus');
    if (cfg.saturacion && cfg.saturacion !== 'normal') h.setAttribute('data-saturacion', cfg.saturacion);
})();