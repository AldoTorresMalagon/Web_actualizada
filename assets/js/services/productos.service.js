const ProductosService = {

    /* PRODUCTOS */

    /* GET /api/productos */
    async getAll(headers = {}) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar productos');
        return data.data || [];
    },

    /* GET /api/productos/:id */
    async getById(id) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Producto no encontrado');
        return data.data;
    },

    /* GET /api/productos/platillos */
    async getPlatillos() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/platillos`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar platillos');
        return data.data || [];
    },

    /* GET /api/productos/platillos/recientes (usa vista v_platillos_recientes) — más nuevos primero */
    async getPlatillosRecientes() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/platillos/recientes`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar platillos recientes');
        return data.data || [];
    },

    /* GET /api/productos/bebidas */
    async getBebidas() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/bebidas`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar bebidas');
        return data.data || [];
    },

    /* POST /api/productos */
    async crear(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear producto');
        return data;
    },

    /* PUT /api/productos/:id */
    async actualizar(id, payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar producto');
        return data;
    },

    /* DELETE /api/productos/:id */
    async eliminar(id, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar producto');
        return data;
    },

    /* CATEGORÍAS */

    /* GET /api/categorias */
    async getCategorias(headers = {}) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/categorias`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar categorías');
        return data.data || [];
    },

    /* POST /api/categorias — payload: { descripcion } */
    async crearCategoria(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/categorias`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear categoría');
        return data;
    },

    /* PUT /api/categorias/:id — payload: { descripcion } */
    async actualizarCategoria(id, payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/categorias/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar categoría');
        return data;
    },

    /* DELETE /api/categorias/:id */
    async eliminarCategoria(id, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/categorias/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar categoría');
        return data;
    },

    /* PROVEEDORES */

    /* GET /api/proveedores */
    async getProveedores(headers = {}) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/proveedores`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar proveedores');
        return data.data || [];
    },

    /* POST /api/proveedores — payload: { nombre, distribuidora, correo, telefono, direccion } */
    async crearProveedor(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/proveedores`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear proveedor');
        return data;
    },

    /* PUT /api/proveedores/:id */
    async actualizarProveedor(id, payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/proveedores/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar proveedor');
        return data;
    },

    /* DELETE /api/proveedores/:id */
    async eliminarProveedor(id, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/proveedores/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar proveedor');
        return data;
    },

    /* PROMOCIONES */

    /* GET /api/promociones */
    async getPromociones(headers = {}) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar promociones');
        return data.data || [];
    },

    /* GET /api/promociones/activas */
    async getPromocionesActivas() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones/activas`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar promociones activas');
        return data.data || [];
    },

    /*
     * POST /api/promociones
     * payload: { titulo, descripcion, porcentajeDescuento, fechaInicio, fechaFin, imagen? }
     * Nota: activo y estado los gestiona la API automáticamente al crear
     */
    async crearPromocion(payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear promoción');
        return data; // data.data.id contiene el id de la nueva promoción
    },

    /*
     * PUT /api/promociones/:id */
    async actualizarPromocion(id, payload, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar promoción');
        return data;
    },

    /* DELETE /api/promociones/:id */
    async eliminarPromocion(id, headers) {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar promoción');
        return data;
    },
};