/* Helpers UI */
function mostrarError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function limpiarErrores() {
    ['correo-error', 'password-error'].forEach(id => mostrarError(id, ''));
    const alerta = document.getElementById('alerta-error');
    if (alerta) alerta.classList.add('d-none');
}

function mostrarAlerta(msg) {
    const alerta = document.getElementById('alerta-error');
    const span = document.getElementById('alerta-error-msg');
    if (alerta && span) { span.textContent = msg; alerta.classList.remove('d-none'); }
}

function setLoading(activo) {
    const btn = document.getElementById('btn-login');
    if (!btn) return;
    btn.disabled = activo;
    btn.innerHTML = activo
        ? '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando sesión…'
        : '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión';
}

/* Validación */
function validarFormulario() {
    let valido = true;
    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;

    if (!correo) {
        mostrarError('correo-error', 'El correo es obligatorio');
        valido = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        mostrarError('correo-error', 'Ingresa un correo válido');
        valido = false;
    } else {
        mostrarError('correo-error', '');
    }

    if (!password) {
        mostrarError('password-error', 'La contraseña es obligatoria');
        valido = false;
    } else if (password.length < 6) {
        mostrarError('password-error', 'Mínimo 6 caracteres');
        valido = false;
    } else {
        mostrarError('password-error', '');
    }

    return valido;
}

/* Submit */
async function handleLogin() {
    limpiarErrores();
    if (!validarFormulario()) return;

    // Verificar reCAPTCHA v3
    let captchaToken = '';
    try {
        captchaToken = await grecaptcha.execute(API_CONFIG.RECAPTCHA_SITE_KEY, { action: 'login' });
    } catch {
        mostrarAlerta('Error al verificar el CAPTCHA. Recarga la página e intenta de nuevo.');
        return;
    }

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;

    setLoading(true);
    try {
        const data = await AuthService.login(correo, password, captchaToken);

        if (!data.success) {
            throw new Error(data.message || 'Credenciales incorrectas');
        }

        const { token, usuario } = data.data;

        // Guardar sesión usando AuthUtils para consistencia
        AuthUtils.guardarSesion(token, usuario);

        // Redirigir según rol
        const rol = usuario?.rol?.toLowerCase();

        if (rol === 'administrador' || rol === 'trabajador') {
            window.location.href = '../dashboard/index.html';
        } else {
            window.location.href = 'inicio.html';
        }

    } catch (err) {
        mostrarAlerta(err.message);
        // Resetear captcha si falla
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
    } finally {
        setLoading(false);
    }
}

/* Toggle password */
function initTogglePassword() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.input-group').querySelector('input[type="password"], input[type="text"]');
            if (!input) return;
            const esPassword = input.type === 'password';
            input.type = esPassword ? 'text' : 'password';
            btn.querySelector('i').className = `bi ${esPassword ? 'bi-eye-slash' : 'bi-eye'}`;
        });
    });
}

/* Redirigir si ya está logueado — usa AuthUtils para no duplicar lógica */
function verificarSesionActiva() {
    if (!AuthUtils.estaAutenticado()) return;
    try {
        const user = AuthUtils.getUser();
        const rol = user?.rol?.toLowerCase();
        window.location.href = (rol === 'administrador' || rol === 'trabajador')
            ? '../dashboard/index.html'
            : 'inicio.html';
    }
     catch { /* token inválido, ignorar */ }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    verificarSesionActiva();
    initTogglePassword();

    // Botón login
    const btn = document.getElementById('btn-login');
    if (btn) btn.addEventListener('click', handleLogin);

    // Enter en los campos
    ['correo', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    });
});