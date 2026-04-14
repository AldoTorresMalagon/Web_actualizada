const ProductosService = {

    /* PRODUCTOS */

    /* GET /api/productos?page=N&limit=N — paginado del lado del servidor */
    async getAllPaginado(headers = {}, page = 1, limit = 10) {
        const res = await apiFetch(
            `${API_CONFIG.BASE_URL}/productos?page=${page}&limit=${limit}`,
            { headers }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar productos');
        return data.data || { items: [], total: 0, page, limit, totalPaginas: 0 };
    },

    /* GET /api/productos — todos sin paginar (búsqueda en modal de ventas) */
    async getAll(headers = {}) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/productos`, { headers });
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

    /* GET /api/productos/platillos/recientes */
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

    /* GET /api/productos/snacks */
    async getSnacks() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/productos/snacks`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar snacks');
        return data.data || [];
    },

    /* POST /api/productos */
    async crear(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/productos`, {
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
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/productos/${id}`, {
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
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/productos/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar producto');
        return data;
    },

    /* CATEGORÍAS */

    async getCategorias(headers = {}) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/categorias`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar categorías');
        return data.data || [];
    },

    async crearCategoria(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/categorias`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear categoría');
        return data;
    },

    async actualizarCategoria(id, payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/categorias/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar categoría');
        return data;
    },

    async eliminarCategoria(id, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/categorias/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar categoría');
        return data;
    },

    /* PROVEEDORES */

    async getProveedores(headers = {}) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/proveedores`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar proveedores');
        return data.data || [];
    },

    async crearProveedor(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/proveedores`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear proveedor');
        return data;
    },

    async actualizarProveedor(id, payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/proveedores/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar proveedor');
        return data;
    },

    async eliminarProveedor(id, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/proveedores/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar proveedor');
        return data;
    },

    /* PROMOCIONES */

    async getPromociones(headers = {}) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/promociones`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar promociones');
        return data.data || [];
    },

    async getPromocionesActivas() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/promociones/activas`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar promociones activas');
        return data.data || [];
    },

    async crearPromocion(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/promociones`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear promoción');
        return data;
    },

    async actualizarPromocion(id, payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/promociones/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar promoción');
        return data;
    },

    async eliminarPromocion(id, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/promociones/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar promoción');
        return data;
    },
};

// SubcategoriasService
const SubcategoriasService = {

    async getSubcategorias(params = {}) {
        const qs = new URLSearchParams(params).toString();
        const url = `${API_CONFIG.BASE_URL}/subcategorias${qs ? '?' + qs : ''}`;
        const res = await apiFetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al obtener subcategorías');
        return data.data || [];
    },

    async getSubcategoriaById(id) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/subcategorias/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Subcategoría no encontrada');
        return data.data;
    },

    async crearSubcategoria(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/subcategorias`, {
            method: 'POST', headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear subcategoría');
        return data;
    },

    async actualizarSubcategoria(id, payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/subcategorias/${id}`, {
            method: 'PUT', headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar subcategoría');
        return data;
    },

    async eliminarSubcategoria(id, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/subcategorias/${id}`, {
            method: 'DELETE', headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al eliminar subcategoría');
        return data;
    },
};