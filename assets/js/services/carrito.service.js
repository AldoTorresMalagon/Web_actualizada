const CarritoService = {

    /* GET /api/ventas/metodos-pago → {id_metodo_pago, nombre_metodo} */
    async getMetodosPago(headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas/metodos-pago`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar métodos de pago');
        return data.data || [];
    },

    /* POST /api/ventas — crear venta desde carrito público */
    async crearVenta(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al procesar el pedido');
        return data.data;
    },

    /* GET /api/ventas/mis-ventas — historial del usuario autenticado */
    async getMisVentas(headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas/mis-ventas`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar ventas');
        return data.data || [];
    },

    /* GET /api/ventas/:id — detalle de una venta (devuelve {venta, detalle[]}) */
    async getVentaById(id, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas/${id}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar detalle de venta');
        return data.data;
    },

    /* GET /api/ventas — todas (dashboard admin/trabajador) */
    async getTodasVentas(headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar ventas');
        return data.data || [];
    },

    /* PUT /api/ventas/:id/cancelar */
    async cancelarVenta(id, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas/${id}/cancelar`, {
            method: 'PUT',
            headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cancelar venta');
        return data;
    },

    /* GET /api/ventas/estados */
    async getEstados(headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/ventas/estados`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar estados');
        return data.data || [];
    },

    /* GET /api/ventas/top-productos?limit=N */
    async getTopProductos(headers, limit = 5) {
        const res = await apiFetch(
            `${API_CONFIG.BASE_URL}/ventas/top-productos?limit=${limit}`,
            { headers }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar top productos');
        return data.data || [];
    },
};