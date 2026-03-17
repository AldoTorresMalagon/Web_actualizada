const FormatUtils = {

    /* MONEDA */

    /* $1,234.56 MXN */
    moneda(valor, conSufijo = true) {
        const num = parseFloat(valor || 0).toFixed(2);
        return conSufijo ? `$${num} MXN` : `$${num}`;
    },

    /* Badge de precio: <span class="badge bg-primary">$12.00</span> */
    badgePrecio(valor) {
        return `<span class="badge bg-primary">$${parseFloat(valor || 0).toFixed(2)}</span>`;
    },

    /* FECHAS */

    /* 15 de marzo de 2026 */
    fechaLarga(f) {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    },

    /* 15/03/2026 */
    fechaCorta(f) {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-MX');
    },

    /* 15/03/2026 10:44 p.m. */
    fechaHora(f) {
        if (!f) return '—';
        return new Date(f).toLocaleString('es-MX');
    },

    /* FECHA Y HORA ACTUAL */

    /* lun., 16 mar. 2026 — fecha actual con día de semana */
    fechaActual() {
        return new Date().toLocaleDateString('es-MX', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    },

    /* 10:44:32 p.m. — hora actual con segundos */
    horaActual() {
        return new Date().toLocaleTimeString('es-MX');
    },

    /* STOCK */

    /* Badge de stock con color según cantidad */
    badgeStock(stock, texto = null) {
        const s = parseInt(stock || 0);
        if (s <= 0) return `<span class="badge bg-danger">${texto || 'Agotado'}</span>`;
        if (s < 10) return `<span class="badge bg-warning text-dark">${texto || `${s} disponibles`}</span>`;
        return `<span class="badge bg-success">${texto || `${s} disponibles`}</span>`;
    },

    /* Clase CSS según stock */
    claseStock(stock) {
        const s = parseInt(stock || 0);
        if (s <= 0) return 'text-danger fw-bold';
        if (s < 10) return 'text-warning fw-bold';
        return 'text-success';
    },

    /* ESTADOS */

    /* Badge activo/inactivo genérico */
    badgeEstado(activo, textoActivo = 'Activo', textoInactivo = 'Inactivo') {
        return activo
            ? `<span class="badge bg-success">${textoActivo}</span>`
            : `<span class="badge bg-secondary">${textoInactivo}</span>`;
    },

    /* Badge de estado de venta con color dinámico */
    badgeEstadoVenta(estado) {
        const map = {
            'Completada': 'bg-success',
            'Cancelada': 'bg-danger',
            'Pendiente': 'bg-warning text-dark',
        };
        const cls = map[estado] || 'bg-secondary';
        return `<span class="badge ${cls}">${estado || '—'}</span>`;
    },

    /* Badge de rol de usuario */
    badgeRol(rol) {
        const r = (rol || '').toLowerCase();
        if (r === 'administrador') return `<span class="badge bg-danger">Administrador</span>`;
        if (r === 'trabajador') return `<span class="badge bg-warning text-dark">Trabajador</span>`;
        return `<span class="badge bg-primary">Estudiante</span>`;
    },

    /* Badge de tipo de movimiento de inventario */
    badgeMovimiento(tipo) {
        if (tipo === 'Entrada') return `<span class="badge bg-success">${tipo}</span>`;
        if (tipo === 'Salida') return `<span class="badge bg-danger">${tipo}</span>`;
        return `<span class="badge bg-warning text-dark">${tipo || 'Ajuste'}</span>`;
    },

    /* IMÁGENES */

    /* Construir URL de imagen (Cloudinary o relativa) */
    imagenUrl(img) {
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `${API_CONFIG.BASE_URL.replace('/api', '')}/${img}`;
    },

    /* URL de placeholder */
    imagenFallback(nombre) {
        return `https://placehold.co/400x300/0b265c/ffffff?text=${encodeURIComponent(nombre || 'Producto')}`;
    },

    /* TEXTO */

    /* Truncar texto con … */
    truncar(texto, max = 60) {
        if (!texto) return '';
        return texto.length > max ? texto.substring(0, max) + '…' : texto;
    },

    /* Nombre completo desde campos separados */
    nombreCompleto(nombre, apellidoPaterno, apellidoMaterno) {
        return [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ');
    },
};