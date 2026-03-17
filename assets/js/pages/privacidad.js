function initScrollSpy() {
    const secciones = document.querySelectorAll('.policy-content [id]');
    const enlaces = document.querySelectorAll('.policy-toc a');
    if (!secciones.length || !enlaces.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                enlaces.forEach(a => a.classList.remove('fw-bold', 'text-primary'));
                const activo = document.querySelector(`.policy-toc a[href="#${entry.target.id}"]`);
                if (activo) activo.classList.add('fw-bold', 'text-primary');
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });

    secciones.forEach(s => observer.observe(s));
}

document.addEventListener('DOMContentLoaded', initScrollSpy);