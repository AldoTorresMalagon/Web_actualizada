/* Formatear hora 24h → 12h  */
function formatHora(hora) {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = ((h % 12) || 12);
    return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/* Cargar datos desde API */
async function cargarContacto() {
    try {
        const res = { ok: true, json: async () => ({ data: await AcercaService.get() }) };
        const json = await res.json();
        if (!json.success) return;

        const d = json.data;

        // Teléfono
        if (d.telefono) {
            const telEl = document.getElementById('info-telefono');
            if (telEl) telEl.innerHTML =
                `<a href="tel:${d.telefono}" class="text-decoration-none text-primary fw-semibold">${d.telefono}</a>`;
        }

        // Email
        if (d.email) {
            const emailEl = document.getElementById('info-email');
            if (emailEl) emailEl.innerHTML =
                `<a href="mailto:${d.email}" class="text-decoration-none text-primary fw-semibold">${d.email}</a>`;
        }

        // WhatsApp (usa mismo teléfono si existe)
        const waEl = document.getElementById('info-whatsapp');
        if (waEl) {
            const numero = (d.telefono || '').replace(/\D/g, '');
            if (numero) {
                waEl.innerHTML =
                    `<a href="https://wa.me/52${numero}" target="_blank" class="text-decoration-none text-success fw-semibold">${d.telefono}</a>`;
            } else {
                waEl.textContent = 'No disponible';
            }
        }

        // Dirección
        const dirEl = document.getElementById('info-direccion');
        if (dirEl) dirEl.textContent = d.direccion || 'Instituto Tecnológico de Huejutla, Hidalgo';

        // Horario
        const horEl  = document.getElementById('info-horario');
        const diasEl = document.getElementById('info-dias');
        if (horEl) horEl.textContent =
            `${formatHora(d.horario_apertura)} – ${formatHora(d.horario_cierre)}`;
        if (diasEl) diasEl.textContent = d.dias_servicio || '—';

    } catch {
        // Fallback estático
        document.getElementById('info-telefono')?.closest('.card-body')
            ?.querySelector('.card-text')?.textContent === 'Cargando...' &&
            (document.getElementById('info-telefono').textContent = 'No disponible');
    }
}

/* Formulario de contacto */
function initFormulario() {
    const form    = document.getElementById('form-contacto');
    const msgOk   = document.getElementById('msg-enviado');
    const btnEnviar = document.getElementById('btn-enviar');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Deshabilitar botón y mostrar spinner
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

        // Simular envío (500ms)
        await new Promise(r => setTimeout(r, 600));

        form.classList.add('d-none');
        msgOk.style.display = 'block';

        // Scroll al mensaje
        msgOk.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    cargarContacto();
    initFormulario();
});