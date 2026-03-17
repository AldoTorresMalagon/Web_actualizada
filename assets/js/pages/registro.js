/* Helpers UI */
function setError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
    // Marcar campo como inválido/válido visualmente
    const campo = document.getElementById(id.replace('Error', '').replace('error', ''));
    if (campo) {
        campo.classList.toggle('is-invalid', !!msg);
        campo.classList.toggle('is-valid', !msg && campo.value.trim() !== '');
    }
}

function limpiarErrores() {
    ['nombreError', 'apellidoPaternoError', 'apellidoMaternoError', 'matriculaError',
        'fechaNacimientoError', 'telefonoError', 'carreraError', 'correoError',
        'nombreUsuarioError', 'passwordError', 'confirmPasswordError', 'terminosError'
    ].forEach(id => setError(id, ''));
    ocultarAlerta('alerta-error');
    ocultarAlerta('alerta-success');
}

function mostrarAlerta(id, msg) {
    const alerta = document.getElementById(id);
    const span = document.getElementById(id + '-msg');
    if (alerta && span) { span.textContent = msg; alerta.classList.remove('d-none'); }
}

function ocultarAlerta(id) {
    document.getElementById(id)?.classList.add('d-none');
}

function setLoading(activo) {
    const btn = document.getElementById('btn-registro');
    if (!btn) return;
    btn.disabled = activo;
    btn.innerHTML = activo
        ? '<span class="spinner-border spinner-border-sm me-2"></span>Registrando…'
        : '<i class="bi bi-person-plus me-2"></i>Registrarse como Estudiante';
}

async function cargarCarreras() {
    const select = document.getElementById('carrera');
    if (!select) return;
    try {
        const carreras = await AuthService.getCarreras();
        carreras.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id_carrera;
            opt.textContent = `${c.nombre_carrera} (${c.modalidad})`;
            select.appendChild(opt);
        });
    } catch {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = 'Error al cargar carreras';
        select.appendChild(opt);
    }
}

/* Validaciones */
function validarFormulario() {
    let valido = true;

    const nombre = document.getElementById('nombre').value.trim();
    if (!nombre || nombre.length < 2) {
        setError('nombreError', 'El nombre es obligatorio (mín. 2 caracteres)'); valido = false;
    } else setError('nombreError', '');

    const apPat = document.getElementById('apellido_paterno').value.trim();
    if (!apPat || apPat.length < 2) {
        setError('apellidoPaternoError', 'Apellido paterno obligatorio'); valido = false;
    } else setError('apellidoPaternoError', '');

    const apMat = document.getElementById('apellido_materno').value.trim();
    if (!apMat || apMat.length < 2) {
        setError('apellidoMaternoError', 'Apellido materno obligatorio'); valido = false;
    } else setError('apellidoMaternoError', '');

    const matricula = document.getElementById('matricula').value.trim();
    if (!matricula || matricula.length < 6) {
        setError('matriculaError', 'Matrícula inválida (6-10 caracteres)'); valido = false;
    } else setError('matriculaError', '');

    const fecha = document.getElementById('fecha_nacimiento').value;
    if (!fecha) {
        setError('fechaNacimientoError', 'Fecha de nacimiento obligatoria'); valido = false;
    } else {
        const edad = Math.floor((Date.now() - new Date(fecha)) / (365.25 * 24 * 3600 * 1000));
        if (edad < 16) {
            setError('fechaNacimientoError', 'Debes tener al menos 16 años'); valido = false;
        } else setError('fechaNacimientoError', '');
    }

    const tel = document.getElementById('telefono').value.trim();
    if (!/^\d{10}$/.test(tel)) {
        setError('telefonoError', 'El teléfono debe tener exactamente 10 dígitos'); valido = false;
    } else setError('telefonoError', '');

    const carrera = document.getElementById('carrera').value;
    if (!carrera) {
        setError('carreraError', 'Selecciona una carrera'); valido = false;
    } else setError('carreraError', '');

    const correo = document.getElementById('correo').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        setError('correoError', 'Ingresa un correo válido'); valido = false;
    } else setError('correoError', '');

    const usuario = document.getElementById('nombre_usuario').value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(usuario)) {
        setError('nombreUsuarioError', '3-20 caracteres: letras, números y _'); valido = false;
    } else setError('nombreUsuarioError', '');

    const pass = document.getElementById('password').value;
    if (pass.length < 6) {
        setError('passwordError', 'Mínimo 6 caracteres'); valido = false;
    } else setError('passwordError', '');

    const confirmPass = document.getElementById('confirm_password').value;
    if (pass !== confirmPass) {
        setError('confirmPasswordError', 'Las contraseñas no coinciden'); valido = false;
    } else setError('confirmPasswordError', '');

    const terminos = document.getElementById('terminos').checked;
    if (!terminos) {
        setError('terminosError', 'Debes aceptar los términos y condiciones'); valido = false;
    } else setError('terminosError', '');

    return valido;
}

/* Submit*/
async function handleRegistro() {
    limpiarErrores();
    if (!validarFormulario()) {
        // Scroll al primer error
        const primerError = document.querySelector('.is-invalid');
        if (primerError) primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Verificar reCAPTCHA v3 (invisible)
    let captchaToken = '';
    try {
        captchaToken = await grecaptcha.execute(API_CONFIG.RECAPTCHA_SITE_KEY, { action: 'registro' });
    } catch {
        mostrarAlerta('alerta-error', 'Error al verificar el CAPTCHA. Recarga la página e intenta de nuevo.');
        return;
    }

    setLoading(true);
    try {
        const payload = {
            nombre: document.getElementById('nombre').value.trim(),
            apellidoPaterno: document.getElementById('apellido_paterno').value.trim(),
            apellidoMaterno: document.getElementById('apellido_materno').value.trim(),
            matricula: document.getElementById('matricula').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            idCarrera: document.getElementById('carrera').value,
            correo: document.getElementById('correo').value.trim(),
            nombreUsuario: document.getElementById('nombre_usuario').value.trim(),
            password: document.getElementById('password').value,
            captchaToken
        };

        const data = await AuthService.registro(payload);

        if (!data.success) {
            throw new Error(data.message || 'Error al registrarse');
        }

        // Éxito
        document.getElementById('registroForm').classList.add('d-none');
        mostrarAlerta('alerta-success', '¡Registro exitoso! Redirigiendo al login…');

        setTimeout(() => { window.location.href = 'login.html'; }, 2000);

    } catch (err) {
        mostrarAlerta('alerta-error', err.message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
        setLoading(false);
    }
}

/* Toggle password */
function initTogglePassword() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.input-group').querySelector('input');
            if (!input) return;
            const esPassword = input.type === 'password';
            input.type = esPassword ? 'text' : 'password';
            btn.querySelector('i').className = `bi ${esPassword ? 'bi-eye-slash' : 'bi-eye'}`;
        });
    });
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    cargarCarreras();
    initTogglePassword();

    const btn = document.getElementById('btn-registro');
    if (btn) btn.addEventListener('click', handleRegistro);
});