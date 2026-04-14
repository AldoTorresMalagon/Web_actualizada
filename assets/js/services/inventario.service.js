const InventarioService = {
    /*
     * GET /api/inventario Devuelve historial completo de movimientos con campos: */
    async getMovimientos(headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/inventario`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar inventario');
        return data.data || [];
    },

    /*
     * POST /api/inventario Solo administrador puede registrar movimientos */
    async registrarMovimiento(payload, headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/inventario`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al registrar movimiento');
        return data;
    },

    /*
     * GET /api/inventario/tipos Devuelve: { id_tipo_movimiento, nombre_tipo, afecta_stock, descripcion } */
    async getTipos(headers) {
        const res = await apiFetch(`${API_CONFIG.BASE_URL}/inventario/tipos`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar tipos de movimiento');
        return data.data || [];
    },
};