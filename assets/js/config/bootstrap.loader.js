(function () {
    const BOOTSTRAP_VERSION = '5.3.0';
    const ICONS_VERSION     = '1.11.0';

    const BASE_CDN = 'https://cdn.jsdelivr.net/npm';

    // CSS: Bootstrap + Bootstrap Icons
    const cssSources = [
        `${BASE_CDN}/bootstrap@${BOOTSTRAP_VERSION}/dist/css/bootstrap.min.css`,
        `${BASE_CDN}/bootstrap-icons@${ICONS_VERSION}/font/bootstrap-icons.css`,
    ];

    cssSources.forEach(href => {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    });

    // JS: Bootstrap Bundle (incluye Popper)
    // Se carga con defer para no bloquear el render
    const script = document.createElement('script');
    script.src   = `${BASE_CDN}/bootstrap@${BOOTSTRAP_VERSION}/dist/js/bootstrap.bundle.min.js`;
    script.defer = true;
    document.head.appendChild(script);
})();