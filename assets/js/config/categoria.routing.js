const CategoriaRouting = {
    _idsBebidas:   null,
    _idsPlatillos: null,

    async init() {
        try {
            const res  = await fetch(`${API_CONFIG.BASE_URL}/categorias`);
            const data = await res.json();
            this._idsBebidas   = new Set();
            this._idsPlatillos = new Set();
            (data.data || []).forEach(c => {
                if (c.tipo === 'platillo') this._idsPlatillos.add(c.idCategoria);
                if (c.tipo === 'bebida')   this._idsBebidas.add(c.idCategoria);
            });
        } catch {
            this._idsBebidas   = new Set([1, 4, 5, 6, 8]);
            this._idsPlatillos = new Set([9]);
        }
    },

    getDetalleUrl(idProducto, idCategoria) {
        const id = parseInt(idCategoria);
        if (this._idsPlatillos?.has(id)) return `detalle_producto.html?id=${idProducto}`;
        if (this._idsBebidas?.has(id))   return `detalle_bebida.html?id=${idProducto}`;
        return `detalle_producto_snack.html?id=${idProducto}`;
    },

    getCatalogoInfo(idCategoria) {
        const id = parseInt(idCategoria);
        if (this._idsPlatillos?.has(id))
            return { url: 'menu.html', label: 'Ver más comidas', icon: 'bi-cup-hot' };
        if (this._idsBebidas?.has(id))
            return { url: 'bebidas.html', label: 'Ver más bebidas', icon: 'bi-cup-straw' };
        return { url: 'productos.html', label: 'Ver más productos', icon: 'bi-box-seam' };
    },

    // Usa directamente el campo tipo que devuelve la API (más rápido, sin lookup)
    getDetalleUrlFromTipo(idProducto, tipo) {
        if (tipo === 'platillo') return `detalle_producto.html?id=${idProducto}`;
        if (tipo === 'bebida')   return `detalle_bebida.html?id=${idProducto}`;
        return `detalle_producto_snack.html?id=${idProducto}`;
    },

    tipo(idCategoria) {
        const id = parseInt(idCategoria);
        if (this._idsPlatillos?.has(id)) return 'platillo';
        if (this._idsBebidas?.has(id))   return 'bebida';
        return 'snack';
    },
};
