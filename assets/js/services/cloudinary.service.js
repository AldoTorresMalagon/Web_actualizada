const CloudinaryService = {

    /* Leer un input[type=file] como base64 */
    leerBase64(inputId) {
        return new Promise((resolve) => {
            const input = document.getElementById(inputId);
            if (!input || !input.files[0]) return resolve(null);
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(input.files[0]);
        });
    },

    /* Inicializar preview de imagen al seleccionar archivo */
    initPreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview) return;

        input.addEventListener('change', () => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.classList.remove('d-none');
                };
                reader.readAsDataURL(file);
            } else {
                preview.src = '';
                preview.classList.add('d-none');
            }
        });
    },

    /* Construir URL de imagen de Cloudinary con transformaciones opcionales */
    buildUrl(baseUrl, { width, height, fit = 'cover' } = {}) {
        if (!baseUrl) return null;
        // Si la URL ya es de Cloudinary, insertar transformaciones
        if (baseUrl.includes('cloudinary.com') && (width || height)) {
            const parts = baseUrl.split('/upload/');
            if (parts.length === 2) {
                const transforms = [
                    width ? `w_${width}` : '',
                    height ? `h_${height}` : '',
                    `c_${fit}`,
                ].filter(Boolean).join(',');
                return `${parts[0]}/upload/${transforms}/${parts[1]}`;
            }
        }
        return baseUrl;
    },
};