const AuthService = {

    /* AUTH */

    /* POST /api/auth/login */
    async login(correo, password, captchaToken) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena: password, captchaToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');
        return data;
    },

    /* REGISTRO PÚBLICO */

    /* POST /api/usuarios/registro */
    async registro(payload) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al registrarse');
        return data;
    },

    /* PERFIL (usuario autenticado)*/

    /* GET /api/usuarios/perfil */
    async getPerfil(headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios/perfil`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar perfil');
        return data.data;
    },

    /* PUT /api/usuarios/perfil */
    async actualizarPerfil(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios/perfil`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar perfil');
        return data;
    },

    /* PUT /api/usuarios/perfil/password */
    async cambiarPassword(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios/perfil/password`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cambiar contraseña');
        return data;
    },

    /* USUARIOS (dashboard admin) */

    /* GET /api/usuarios */
    async getUsuarios(headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar usuarios');
        return data.data || [];
    },

    /*
     * POST /api/usuarios  (crear desde dashboard — solo admin)
     * Diferente a /registro: no requiere captcha y el admin asigna el rol
     */
    async crearUsuario(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear usuario');
        return data;
    },

    /* PUT /api/usuarios/:id */
    async actualizarUsuario(id, payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar usuario');
        return data;
    },

    /* DELETE /api/usuarios/:id — soft delete (estado = inactivo) */
    async eliminarUsuario(id, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar usuario');
        return data;
    },

    /* CATÁLOGOS */

    /* GET /api/carreras — devuelve { id_carrera, nombre_carrera, siglas, modalidad } */
    async getCarreras() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/carreras`);
        const data = await res.json();
        if (!res.ok) throw new Error('Error al cargar carreras');
        return data.data || [];
    },

    /* GET /api/roles — solo admin, devuelve { intidrol, vchrolnombre, nivel_acceso } */
    async getRoles(headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/roles`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error('Error al cargar roles');
        return data.data || [];
    },
};