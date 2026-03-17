const AuthUtils = {
    /* Guardar sesión */
    guardarSesion(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    /* Limpiar sesión */
    cerrarSesion(redirigir = true) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (redirigir) window.location.href = 'login.html';
    },

    /* Obtener token */
    getToken() {
        return localStorage.getItem('token');
    },

    /* Obtener usuario */
    getUser() {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); }
        catch { return null; }
    },

    /* ¿Está autenticado? */
    estaAutenticado() {
        const token = this.getToken();
        if (!token) return false;
        try {
            // Decodificar payload JWT (sin verificar firma, solo para expiración)
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && Date.now() / 1000 > payload.exp) {
                this.cerrarSesion(false);
                return false;
            }
            return true;
        } catch {
            return !!token; // si no podemos decodificar, confiar en presencia
        }
    },

    /* ¿Es admin o trabajador? */
    esAdmin() {
        const user = this.getUser();
        return user && ['administrador', 'trabajador'].includes(user.rol?.toLowerCase());
    },

    /*  Requiere login (redirige si no está autenticado) */
    requiereLogin() {
        if (!this.estaAutenticado()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    /* Requiere admin (redirige si no tiene rol) */
    requiereAdmin() {
        if (!this.estaAutenticado() || !this.esAdmin()) {
            window.location.href = '../public/inicio.html';
            return false;
        }
        return true;
    },

    /* Header Authorization para fetch */
    getHeaders(extra = {}) {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...extra
        };
    }
};

/* Accesibilidad */
(function aplicarAccesibilidadInicial() {
    const STORAGE_KEY = 'cafeteria_accesibilidad';
    let cfg;
    try { cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { cfg = {}; }

    const html = document.documentElement;

    if (cfg.tamano_fuente && cfg.tamano_fuente !== 'normal')
        html.setAttribute('data-font-size', cfg.tamano_fuente);

    if (cfg.alto_contraste) html.classList.add('alto-contraste');
    if (cfg.modo_oscuro) html.classList.add('modo-oscuro');
    if (cfg.modo_lectura) html.classList.add('modo-lectura');
    if (cfg.fuente_dislexia) html.classList.add('fuente-dislexia');
    if (cfg.subrayar_enlaces) html.classList.add('subrayar-enlaces');
    if (cfg.reducir_movimiento) html.classList.add('reducir-movimiento');
    if (cfg.cursor_grande) html.classList.add('cursor-grande');
    if (cfg.resaltar_focus) html.classList.add('resaltar-focus');

    if (cfg.saturacion && cfg.saturacion !== 'normal')
        html.setAttribute('data-saturacion', cfg.saturacion);

    if (cfg.fuente_dislexia) {
        const link = document.createElement('link');
        link.id = 'font-dyslexic';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css';
        document.head.appendChild(link);
    }
})();