const user = AuthUtils.getUser();
const esAdmin = user && ['administrador', 'trabajador'].includes(user.rol?.toLowerCase());

/* ID a cargar: ?id=X (solo admin), o el propio */
function getTargetId() {
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('id');
    if (paramId && esAdmin) return paramId;
    return user?.id;
}

let perfilData = null; // datos cargados desde la API
let modoEdicion = false;

/* Helpers */
function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
}
function val(id) {
    return document.getElementById(id)?.value.trim() ?? '';
}
function mostrarAlerta(tipo, msg) {
    const el = document.getElementById(`alerta-${tipo}`);
    const txt = document.getElementById(`alerta-${tipo}-msg`);
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 5000);
}
/* formatFecha → FormatUtils.fechaLarga */

/* Poblar vista de solo lectura */
function poblarVista(u) {
    const nombreCompleto = FormatUtils.nombreCompleto(u.Nombre, u.ApellidoPaterno, u.ApellidoMaterno);
    set('perfil-nombre-completo', nombreCompleto);
    set('perfil-rol-carrera', [u.rol, u.carrera].filter(Boolean).join(' · '));

    set('info-nombre', u.Nombre);
    set('info-apellido-paterno', u.ApellidoPaterno);
    set('info-apellido-materno', u.ApellidoMaterno);
    set('info-correo', u.Correo);
    set('info-telefono', u.Telefono || 'No registrado');
    set('info-edad', u.Edad ? `${u.Edad} años` : 'No registrada');
    set('info-matricula', u.matricula || 'No registrada');
    set('info-username', u.nombre_usuario || '—');
    set('info-rol', u.rol);
    set('info-carrera', u.carrera || 'No asignada');
    set('info-fecha-registro', FormatUtils.fechaLarga(u.fecha_registro));

    const badge = document.getElementById('info-estado-badge');
    if (badge) { badge.innerHTML = FormatUtils.badgeEstado(true); badge.className = 'mt-2'; }
}

/* Modo edición: convertir spans en inputs */
function activarEdicion() {
    if (modoEdicion) return;
    modoEdicion = true;

    const u = perfilData;
    const campos = document.getElementById('campos-info-personal');
    campos.innerHTML = `
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label fw-bold text-primary">Nombre(s) *</label>
        <input type="text" id="edit-nombre" class="form-control" value="${u.Nombre || ''}">
        <div class="invalid-feedback" id="edit-nombre-error"></div>
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold text-primary">Apellido Paterno *</label>
        <input type="text" id="edit-ap" class="form-control" value="${u.ApellidoPaterno || ''}">
        <div class="invalid-feedback" id="edit-ap-error"></div>
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold text-primary">Apellido Materno</label>
        <input type="text" id="edit-am" class="form-control" value="${u.ApellidoMaterno || ''}">
      </div>
      <div class="col-md-6">
        <label class="form-label fw-bold text-primary">Correo Electrónico</label>
        <input type="email" class="form-control bg-light" value="${u.Correo || ''}" readonly>
        <small class="text-muted">El correo no se puede modificar</small>
      </div>
      <div class="col-md-6">
        <label class="form-label fw-bold text-primary">Nombre de Usuario</label>
        <input type="text" id="edit-username" class="form-control" value="${u.nombre_usuario || ''}" placeholder="usuario123">
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold text-primary">Teléfono</label>
        <input type="tel" id="edit-telefono" class="form-control" value="${u.Telefono || ''}" placeholder="7711234567" maxlength="10">
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold text-primary">Edad</label>
        <input type="number" id="edit-edad" class="form-control" value="${u.Edad || ''}" min="16" max="80">
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold text-primary">Carrera</label>
        <select id="edit-carrera" class="form-select">
          <option value="">Sin carrera</option>
        </select>
      </div>
    </div>`;

    cargarCarreras(u.id_carrera);

    // Cambiar botones
    document.getElementById('btn-editar').classList.add('d-none');
    document.getElementById('btns-guardar').classList.remove('d-none');
}

function cancelarEdicion() {
    modoEdicion = false;
    poblarCamposVista(perfilData);
    document.getElementById('btn-editar').classList.remove('d-none');
    document.getElementById('btns-guardar').classList.add('d-none');
}

function poblarCamposVista(u) {
    document.getElementById('campos-info-personal').innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <div class="mb-4">
          <label class="form-label fw-bold text-primary">Nombre(s)</label>
          <div class="readonly-field"><i class="bi bi-person me-2 text-muted"></i><span id="info-nombre">-</span></div>
        </div>
        <div class="mb-4">
          <label class="form-label fw-bold text-primary">Apellido Paterno</label>
          <div class="readonly-field"><i class="bi bi-person me-2 text-muted"></i><span id="info-apellido-paterno">-</span></div>
        </div>
        <div class="mb-4">
          <label class="form-label fw-bold text-primary">Apellido Materno</label>
          <div class="readonly-field"><i class="bi bi-person me-2 text-muted"></i><span id="info-apellido-materno">-</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="mb-4">
          <label class="form-label fw-bold text-primary">Correo Electrónico</label>
          <div class="readonly-field"><i class="bi bi-envelope me-2 text-muted"></i><span id="info-correo">-</span></div>
          <small class="text-muted">El correo no se puede modificar</small>
        </div>
        <div class="mb-4">
          <label class="form-label fw-bold text-primary">Teléfono</label>
          <div class="readonly-field"><i class="bi bi-telephone me-2 text-muted"></i><span id="info-telefono">-</span></div>
        </div>
        <div class="mb-4">
          <label class="form-label fw-bold text-primary">Edad</label>
          <div class="readonly-field"><i class="bi bi-calendar me-2 text-muted"></i><span id="info-edad">-</span></div>
        </div>
      </div>
    </div>`;
    poblarVista(u);
}

/* Cargar carreras */
async function cargarCarreras(idActual) {
    const select = document.getElementById('edit-carrera');
    if (!select) return;
    try {
        const carreras = await AuthService.getCarreras();
        carreras.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id_carrera;
            opt.textContent = `${c.nombre_carrera} (${c.modalidad})`;
            if (c.id_carrera == idActual) opt.selected = true;
            select.appendChild(opt);
        });
    } catch { /* no crítico */ }
}

/* Guardar cambios */
async function guardarCambios() {
    const nombre = val('edit-nombre');
    const apPat = val('edit-ap');

    // Validación básica
    let valido = true;
    if (!nombre || nombre.length < 2) {
        document.getElementById('edit-nombre').classList.add('is-invalid');
        document.getElementById('edit-nombre-error').textContent = 'Nombre obligatorio (mín. 2 caracteres)';
        valido = false;
    } else {
        document.getElementById('edit-nombre').classList.remove('is-invalid');
    }
    if (!apPat || apPat.length < 2) {
        document.getElementById('edit-ap').classList.add('is-invalid');
        document.getElementById('edit-ap-error').textContent = 'Apellido paterno obligatorio';
        valido = false;
    } else {
        document.getElementById('edit-ap').classList.remove('is-invalid');
    }
    if (!valido) return;

    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando…';

    try {
        const payload = {
            nombre,
            apellidoPaterno: val('edit-ap'),
            apellidoMaterno: val('edit-am'),
            telefono: val('edit-telefono'),
            nombreUsuario: val('edit-username'),
            idCarrera: document.getElementById('edit-carrera')?.value || null,
        };

        const json = await AuthService.actualizarPerfil(payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al guardar');

        // Actualizar datos locales y volver a vista
        perfilData = {
            ...perfilData, ...payload, Nombre: payload.nombre,
            ApellidoPaterno: payload.apellidoPaterno, ApellidoMaterno: payload.apellidoMaterno,
            Telefono: payload.telefono, nombre_usuario: payload.nombreUsuario
        };

        modoEdicion = false;
        poblarCamposVista(perfilData);
        set('perfil-nombre-completo', FormatUtils.nombreCompleto(payload.nombre, payload.apellidoPaterno, payload.apellidoMaterno));

        document.getElementById('btn-editar').classList.remove('d-none');
        document.getElementById('btns-guardar').classList.add('d-none');
        Toast?.success('Perfil actualizado correctamente');

    } catch (err) {
        mostrarAlerta('error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Guardar Cambios';
    }
}

/* Cambiar contraseña (con reCAPTCHA v3) */
async function cambiarPassword() {
    const actual = document.getElementById('password-actual')?.value.trim();
    const nueva = document.getElementById('nueva-password')?.value.trim();
    const confirmar = document.getElementById('confirmar-password')?.value.trim();

    if (!actual || !nueva || !confirmar) { Toast?.warning('Completa todos los campos'); return; }
    if (nueva.length < 6) { Toast?.warning('Mínimo 6 caracteres'); return; }
    if (nueva !== confirmar) { Toast?.error('Las contraseñas no coinciden'); return; }

    const btn = document.getElementById('btn-cambiar-password');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando…';

    try {
        // reCAPTCHA v3 — invisible
        const captchaToken = await grecaptcha.execute(API_CONFIG.RECAPTCHA_SITE_KEY, { action: 'cambiar_password' });

        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando…';

        const json = await AuthService.cambiarPassword(
            { passwordActual: actual, passwordNueva: nueva, captchaToken },
            AuthUtils.getHeaders()
        );
        if (!json.success) throw new Error(json.message || 'Error al cambiar contraseña');

        ['password-actual', 'nueva-password', 'confirmar-password']
            .forEach(id => document.getElementById(id).value = '');
        Toast?.success('Contraseña actualizada correctamente');

    } catch (err) {
        Toast?.error(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-key me-2"></i>Cambiar Contraseña';
    }
}

/* Toggle show/hide password */
function initTogglesPassword() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.input-group').querySelector('input');
            const icon = btn.querySelector('i');
            const esPass = input.type === 'password';
            input.type = esPass ? 'text' : 'password';
            icon.className = `bi ${esPass ? 'bi-eye-slash' : 'bi-eye'}`;
        });
    });
}

/* Cargar estadísticas */
async function cargarEstadisticas() {
    const BEBIDAS = [1, 4, 5, 8];
    const PLATILLOS = [9];

    try {
        const ventas = await CarritoService.getMisVentas(AuthUtils.getHeaders());
        document.getElementById('stat-pedidos').textContent = ventas.length;

        // Contar unidades por categoría usando idCategoria del detalle
        let comidas = 0, bebidas = 0;
        for (const venta of ventas) {
            try {
                const jv = await CarritoService.getVentaById(venta.idVenta, AuthUtils.getHeaders());
                for (const d of (jv?.detalle || [])) {
                    if (PLATILLOS.includes(d.idCategoria)) comidas += d.Cantidad;
                    else if (BEBIDAS.includes(d.idCategoria)) bebidas += d.Cantidad;
                }
            } catch { /* ignorar error individual */ }
        }

        document.getElementById('stat-comidas').textContent = comidas;
        document.getElementById('stat-bebidas').textContent = bebidas;

    } catch { /* no crítico */ }
}

/* Cargar perfil desde API */
async function cargarPerfil() {
    const targetId = getTargetId();
    const endpoint = esAdmin && targetId !== user?.id
        ? `${API_CONFIG.BASE_URL}/usuarios/${targetId}`
        : `${API_CONFIG.BASE_URL}/usuarios/perfil`;

    try {
        const json = { success: true, data: await AuthService.getPerfil(AuthUtils.getHeaders()) };
        if (!json.success) throw new Error('Error al cargar perfil');

        perfilData = json.data;
        poblarCamposVista(perfilData);

        // Ocultar edición si es admin viendo a otro usuario
        const esPerfitPropio = !new URLSearchParams(window.location.search).get('id') ||
            String(perfilData.intidusuario) === String(user?.id);
        if (!esPerfitPropio) {
            document.getElementById('btn-editar')?.classList.add('d-none');
            document.getElementById('seccion-password')?.classList.add('d-none');
            document.getElementById('seccion-stats')?.classList.add('d-none');
        }

    } catch (err) {
        set('perfil-nombre-completo', 'Error al cargar');
        mostrarAlerta('error', 'No se pudo cargar la información del perfil.');
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthUtils.requiereLogin()) return;

    cargarPerfil();
    cargarEstadisticas();
    initTogglesPassword();

    document.getElementById('btn-editar')
        ?.addEventListener('click', activarEdicion);
    document.getElementById('btn-guardar')
        ?.addEventListener('click', guardarCambios);
    document.getElementById('btn-cancelar')
        ?.addEventListener('click', cancelarEdicion);
    document.getElementById('btn-cambiar-password')
        ?.addEventListener('click', cambiarPassword);
});