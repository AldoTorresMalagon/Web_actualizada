function formatHora(hora) {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
    return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/* Cargar datos de contacto desde API */
async function cargarContacto() {
    try {
        const d = await AcercaService.get();
        if (!d) return;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.textContent = val;
        };

        set('soporte-telefono', d.telefono);
        set('soporte-email',    d.email);
        set('soporte-direccion',d.direccion || 'Instituto Tecnológico de Huejutla, Hidalgo');

        if (d.horario_apertura && d.horario_cierre) {
            set('soporte-horario',
                `${formatHora(d.horario_apertura)} – ${formatHora(d.horario_cierre)}, ${d.dias_servicio || ''}`);
        }

        // Horario dentro del FAQ
        if (d.horario_apertura && d.horario_cierre) {
            set('faq-horario',
                `${formatHora(d.horario_apertura)} – ${formatHora(d.horario_cierre)}`);
        }
        set('faq-dias', d.dias_servicio);

    } catch {
        // Silencioso — valores estáticos permanecen
    }
}

/* Buscador de FAQs en tiempo real */
function initBuscador() {
    const input    = document.getElementById('buscador-faq');
    const items    = document.querySelectorAll('.accordion-item');
    const noResult = document.getElementById('faq-no-results');
    if (!input) return;

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        let visible = 0;

        items.forEach(item => {
            const texto = item.textContent.toLowerCase();
            const match = !q || texto.includes(q);
            item.style.display = match ? '' : 'none';
            if (match) visible++;

            // Expandir automáticamente si hay búsqueda y solo hay 1 resultado
            if (match && q) {
                const collapse = item.querySelector('.accordion-collapse');
                const btn      = item.querySelector('.accordion-button');
                if (collapse && visible === 1) {
                    collapse.classList.add('show');
                    btn?.classList.remove('collapsed');
                }
            }
        });

        if (noResult) noResult.style.display = visible === 0 ? 'block' : 'none';
    });
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    cargarContacto();
    initBuscador();
});