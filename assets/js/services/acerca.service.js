const AcercaService = {
    async get() {
        const res = await fetch(`${API_CONFIG.BASE_URL}/acerca`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cargar información');
        return data.data || data;
    },
};