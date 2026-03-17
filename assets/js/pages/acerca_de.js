function formatHora(hora) {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
    return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${sufijo}`;
}

async function cargarAcerca() {
    try {
        const res = { ok: true, json: async () => ({ data: await AcercaService.get() }) };
        const json = await res.json();
        if (!json.success) return;

        const d = json.data;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.textContent = val;
        };

        set('info-telefono', d.telefono);
        set('info-email', d.email);
        set('info-direccion', d.direccion || 'Instituto Tecnológico de Huejutla, Hidalgo');
        set('info-dias', d.dias_servicio);

        if (d.horario_apertura && d.horario_cierre) {
            set('info-horario', `${formatHora(d.horario_apertura)} – ${formatHora(d.horario_cierre)}`);
        }

        // Nombre de la cafetería si la API lo devuelve
        if (d.nombre) set('info-nombre', d.nombre);

    } catch {
        // Silencioso — los valores estáticos del HTML permanecen
    }
}

document.addEventListener('DOMContentLoaded', cargarAcerca);