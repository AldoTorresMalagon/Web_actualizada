/* Estado global */
let paginaActual = 1;
const POR_PAGINA = 10;

let todosLosUsuarios = [];
let catalogoRoles = [];
let carreras = [];

/* Helpers UI */
function setLoading(tbodyId, cols, msg = 'Cargando...') {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4 text-muted">
        <span class="spinner-border spinner-border-sm me-2"></span>${msg}</td></tr>`;
}
function mostrarError(tbodyId, cols, msg) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4 text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>${msg}</td></tr>`;
}
function setBtnLoading(btnId, activo, textoOriginal) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = activo;
    btn.innerHTML = activo ? `<span class="spinner-border spinner-border-sm me-2"></span>Guardando...` : textoOriginal;
}

/* Cargar carreras para selects */
async function cargarRoles() {
    try {
        catalogoRoles = await AuthService.getRoles(AuthUtils.getHeaders());
        ['agregar-rol', 'editar-rol'].forEach(selectId => {
            const sel = document.getElementById(selectId);
            if (!sel) return;
            const defaultOpt = selectId === 'agregar-rol'
                ? '<option value="">Seleccionar rol</option>'
                : '';
            sel.innerHTML = defaultOpt + catalogoRoles.map(r =>
                `<option value="${r.intidrol}">${r.vchrolnombre}</option>`
            ).join('');
        });
    } catch { /* fallback — mantiene options del HTML si los hubiera */ }
}

async function cargarCarreras() {
    try {
        carreras = await AuthService.getCarreras();
        ['agregar-carrera', 'editar-carrera'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Sin carrera</option>';
            carreras.forEach(c => {
                sel.innerHTML += `<option value="${c.id_carrera}">${c.nombre_carrera}</option>`;
            });
        });
    } catch { /* no crítico */ }
}

/* Cargar usuarios */
async function cargarUsuarios() {
    setLoading('tabla-usuarios', 7);
    try {
        todosLosUsuarios = await AuthService.getUsuarios(AuthUtils.getHeaders());
        actualizarEstadisticas();
        aplicarFiltrosYRenderizar();
    } catch (err) {
        mostrarError('tabla-usuarios', 7, 'Error al cargar usuarios');
        console.error(err);
    }
}

/* Estadísticas */
function actualizarEstadisticas() {
    const total = todosLosUsuarios.length;
    const activos = todosLosUsuarios.filter(u => u.estado === 'activo').length;
    const admins = todosLosUsuarios.filter(u => u.rol?.toLowerCase() === 'administrador').length;
    const estudiantes = todosLosUsuarios.filter(u => u.rol?.toLowerCase() === 'estudiante').length;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-admins').textContent = admins;
    document.getElementById('stat-estudiantes').textContent = estudiantes;
}

/* Filtrar y renderizar */
function aplicarFiltrosYRenderizar() {
    const termino = document.getElementById('buscador-usuarios')?.value.toLowerCase().trim() || '';
    const rolFiltro = document.getElementById('filtro-rol')?.value || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || '';

    const orden = document.getElementById('ordenar-usuarios')?.value || 'nombre-asc';
    let lista = todosLosUsuarios.filter(u => {
        const nombre = `${u.Nombre || ''} ${u.ApellidoPaterno || ''} ${u.ApellidoMaterno || ''}`.toLowerCase();
        const coincideBusqueda = nombre.includes(termino) ||
            u.Correo?.toLowerCase().includes(termino) ||
            u.nombre_usuario?.toLowerCase().includes(termino) ||
            u.matricula?.toLowerCase().includes(termino);
        const coincideRol = !rolFiltro || u.rol?.toLowerCase() === rolFiltro;
        const coincideEstado = !estadoFiltro || u.estado === estadoFiltro;
        return coincideBusqueda && coincideRol && coincideEstado;
    });
    if (orden === 'nombre-asc') lista.sort((a, b) => (a.Nombre || '').localeCompare(b.Nombre || ''));
    else if (orden === 'nombre-desc') lista.sort((a, b) => (b.Nombre || '').localeCompare(a.Nombre || ''));
    const total = lista.length;
    const totalPags = Math.ceil(total / POR_PAGINA) || 1;
    if (paginaActual > totalPags) paginaActual = totalPags;
    const inicio = (paginaActual - 1) * POR_PAGINA;
    renderTabla(lista.slice(inicio, inicio + POR_PAGINA));
    renderPaginacion(total, totalPags);
}

/* Renderizar tabla */
function renderTabla(lista) {
    const tbody = document.getElementById('tabla-usuarios');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>No se encontraron usuarios</td></tr>`;
        return;
    }
    /* rolBadge → FormatUtils.badgeRol */
    tbody.innerHTML = lista.map(u => {
        const nombre = FormatUtils.nombreCompleto(u.Nombre, u.ApellidoPaterno, u.ApellidoMaterno);
        const estadoBadge = FormatUtils.badgeEstado(u.estado === 'activo');
        return `
        <tr>
            <td>${u.intidusuario}</td>
            <td>
                <div class="fw-semibold">${nombre}</div>
                <small class="text-muted">${u.matricula || ''}</small>
            </td>
            <td>${u.Correo || '—'}</td>
            <td>${u.nombre_usuario || '—'}</td>
            <td>${FormatUtils.badgeRol(u.rol)}</td>
            <td>${u.carrera || '—'}</td>
            <td>${estadoBadge}</td>
            <td>
                <button class="btn btn-outline-warning btn-sm" title="Editar"
                        onclick="abrirEditar(${u.intidusuario})">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

/* Guardar usuario */
async function guardarUsuario() {
    const nombre = document.getElementById('agregar-nombre').value.trim();
    const ap = document.getElementById('agregar-apellido-paterno').value.trim();
    const correo = document.getElementById('agregar-correo')?.value.trim();
    const password = document.getElementById('agregar-password')?.value;
    const rol = document.getElementById('agregar-rol').value;

    let valido = true;
    if (!nombre) { document.getElementById('agregar-nombre').classList.add('is-invalid'); valido = false; }
    else document.getElementById('agregar-nombre').classList.remove('is-invalid');
    if (!ap) { document.getElementById('agregar-apellido-paterno').classList.add('is-invalid'); document.getElementById('agregar-ap-error').textContent = 'Requerido'; valido = false; }
    else document.getElementById('agregar-apellido-paterno').classList.remove('is-invalid');
    if (!rol) { document.getElementById('agregar-rol').classList.add('is-invalid'); document.getElementById('agregar-rol-error').textContent = 'Selecciona un rol'; valido = false; }
    else document.getElementById('agregar-rol').classList.remove('is-invalid');
    if (!valido) return;

    setBtnLoading('btn-guardar-usuario', true, '<i class="bi bi-floppy me-1"></i>Guardar');
    try {
        const payload = {
            nombre,
            apellidoPaterno: ap,
            apellidoMaterno: document.getElementById('agregar-apellido-materno')?.value.trim() || '',
            correo: correo || '',
            password: password || '',
            matricula: document.getElementById('agregar-matricula')?.value.trim() || '',
            idRol: parseInt(rol),
            nombreUsuario: document.getElementById('agregar-username')?.value.trim() || '',
            idCarrera: parseInt(document.getElementById('agregar-carrera').value) || null,
            telefono: document.getElementById('agregar-telefono')?.value.trim() || '',
        };
        const json = await AuthService.crearUsuario(payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al guardar');
        bootstrap.Modal.getInstance(document.getElementById('agregarUsuarioModal'))?.hide();
        Toast.success('Usuario creado exitosamente');
        await cargarUsuarios();
    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-guardar-usuario', false, '<i class="bi bi-floppy me-1"></i>Guardar');
    }
}

/* Abrir edición */
window.abrirEditar = async function (id) {
    // Limpiar contraseña del modal anterior
    const inputPwd = document.getElementById('editar-password');
    if (inputPwd) inputPwd.value = '';
    const u = todosLosUsuarios.find(x => x.intidusuario === id);
    if (!u) return;
    document.getElementById('editar-id').value = u.intidusuario;
    document.getElementById('editar-nombre').value = u.Nombre || '';
    document.getElementById('editar-apellido-paterno').value = u.ApellidoPaterno || '';
    document.getElementById('editar-apellido-materno').value = u.ApellidoMaterno || '';
    document.getElementById('editar-correo').value = u.Correo || '';
    document.getElementById('editar-username').value = u.nombre_usuario || '';
    document.getElementById('editar-telefono').value = u.Telefono || '';

    // Preseleccionar rol — buscar el option cuyo texto coincida (dinámico, sin mapa hardcodeado)
    setTimeout(() => {
        const selRol = document.getElementById('editar-rol');
        if (selRol && u.rol) {
            const rolNombre = u.rol.toLowerCase();
            const match = catalogoRoles.find(r => r.vchrolnombre.toLowerCase() === rolNombre);
            if (match) selRol.value = match.intidrol;
        }
        // Preseleccionar carrera — buscar el option cuyo texto coincida
        const selCarrera = document.getElementById('editar-carrera');
        if (selCarrera && u.carrera) {
            const opt = [...selCarrera.options].find(o => o.text === u.carrera);
            if (opt) selCarrera.value = opt.value;
        }
    }, 50);

    new bootstrap.Modal(document.getElementById('editarUsuarioModal')).show();
};

/* Actualizar usuario */
async function actualizarUsuario() {
    const id = document.getElementById('editar-id').value;
    setBtnLoading('btn-actualizar-usuario', true, '<i class="bi bi-floppy me-1"></i>Actualizar');
    try {
        const payload = {
            nombre: document.getElementById('editar-nombre').value.trim(),
            apellidoPaterno: document.getElementById('editar-apellido-paterno').value.trim(),
            apellidoMaterno: document.getElementById('editar-apellido-materno').value.trim(),
            correo: document.getElementById('editar-correo').value.trim(),
            nombreUsuario: document.getElementById('editar-username').value.trim(),
            idRol: parseInt(document.getElementById('editar-rol').value) || null,
            password: document.getElementById('editar-password')?.value.trim() || '',
            idCarrera: parseInt(document.getElementById('editar-carrera').value) || null,
            telefono: document.getElementById('editar-telefono').value.trim(),
        };
        const json = await AuthService.actualizarUsuario(id, payload, AuthUtils.getHeaders());
        if (!json.success) throw new Error(json.message || 'Error al actualizar');
        bootstrap.Modal.getInstance(document.getElementById('editarUsuarioModal'))?.hide();
        Toast.success('Usuario actualizado exitosamente');
        await cargarUsuarios();
    } catch (err) {
        Toast.error(err.message);
    } finally {
        setBtnLoading('btn-actualizar-usuario', false, '<i class="bi bi-floppy me-1"></i>Actualizar');
    }
}

/* Paginación */
function renderPaginacion(total, totalPags) {
    let contenedor = document.getElementById('paginacion-usuarios');
    if (!contenedor) {
        const card = document.getElementById('tabla-usuarios')?.closest('.card-body');
        if (card) {
            contenedor = document.createElement('div');
            contenedor.id = 'paginacion-usuarios';
            card.appendChild(contenedor);
        }
    }
    if (!contenedor) return;

    if (totalPags <= 1) { contenedor.innerHTML = ''; return; }

    const inicio = (paginaActual - 1) * POR_PAGINA + 1;
    const fin = Math.min(paginaActual * POR_PAGINA, total);

    let btns = '';
    for (let i = 1; i <= totalPags; i++) {
        if (totalPags > 7 && i > 2 && i < totalPags - 1 && Math.abs(i - paginaActual) > 1) {
            if (i === 3 || i === totalPags - 2) btns += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            continue;
        }
        btns += `<li class="page-item ${i === paginaActual ? 'active' : ''}">
            <button class="page-link" onclick="irAPaginaUsuarios(${i})">${i}</button></li>`;
    }

    contenedor.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2 mt-3">
            <small class="text-muted">Mostrando ${total ? inicio : 0}–${fin} de ${total} usuarios</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaUsuarios(${paginaActual - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${paginaActual === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="irAPaginaUsuarios(${paginaActual + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.irAPaginaUsuarios = function (n) {
    const totalPags = Math.ceil(todosLosUsuarios.length / POR_PAGINA) || 1;
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    aplicarFiltrosYRenderizar();
};

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;
    await Promise.all([cargarRoles(), cargarCarreras(), cargarUsuarios()]);

    // Toggle visibilidad contraseña — modal Agregar
    document.getElementById('toggle-agregar-password')?.addEventListener('click', () => {
        const input = document.getElementById('agregar-password');
        const ico   = document.getElementById('ico-agregar-password');
        if (!input) return;
        const visible = input.type === 'text';
        input.type    = visible ? 'password' : 'text';
        if (ico) ico.className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
    });

    // Toggle visibilidad contraseña — modal Editar
    document.getElementById('toggle-editar-password')?.addEventListener('click', () => {
        const input = document.getElementById('editar-password');
        const ico   = document.getElementById('ico-editar-password');
        if (!input) return;
        const visible = input.type === 'text';
        input.type    = visible ? 'password' : 'text';
        if (ico) ico.className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
    });

    let debounce;
    document.getElementById('buscador-usuarios')?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { paginaActual = 1; aplicarFiltrosYRenderizar(); }, 300);
    });
    document.getElementById('ordenar-usuarios')?.addEventListener('change', () => { paginaActual = 1; aplicarFiltrosYRenderizar(); });
    document.getElementById('filtro-rol')?.addEventListener('change', () => { paginaActual = 1; aplicarFiltrosYRenderizar(); });
    document.getElementById('filtro-estado')?.addEventListener('change', () => { paginaActual = 1; aplicarFiltrosYRenderizar(); });
    document.getElementById('btn-guardar-usuario')?.addEventListener('click', guardarUsuario);
    document.getElementById('btn-actualizar-usuario')?.addEventListener('click', actualizarUsuario);
});