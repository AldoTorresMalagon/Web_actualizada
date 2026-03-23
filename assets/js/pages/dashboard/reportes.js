// Estado global
const estado = {
    desde:      null,
    hasta:      null,
    agrupacion: 'dia',
    diasPrediccion: 7,
    datosPeriodo:   [],
    datosTop:       [],
    ventasIndividuales: [],   // ventas individuales para Excel detallado
    // Paginación tablas internas
    detallePag:     1,
    stockPag:       1,
};
const DETALLE_POR_PAG = 15;
const STOCK_POR_PAG   = 10;

// Instancias de gráficas
const graficas = {
    ventasPeriodo: null,
    distribucion:  null,
    topProductos:  null,
    horasPico:     null,
    prediccion:    null,
};

// Colores consistentes para los tipos de producto y elementos del dashboard
const COLORES = {
    primario:   '#1E3A5F',
    azul:       '#2E75B6',
    verde:      '#198754',
    naranja:    '#fd7e14',
    rojo:       '#dc3545',
    amarillo:   '#f59e0b',
    info:       '#0dcaf0',
    platillo:   '#198754',
    bebida:     '#0dcaf0',
    snack:      '#f59e0b',
};

// Opciones base ApexCharts
const opcionesBase = {
    chart:   { fontFamily: 'Arial, sans-serif', toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false } } },
    tooltip: { theme: 'light' },
    grid:    { borderColor: '#f0f0f0' },
    noData:  { text: 'Sin datos para el período', style: { fontSize: '14px', color: '#999' } },
};

// Helper: llamada autenticada a la API 
async function apiFetch(url) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        headers: AuthUtils.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error en la API');
    return data.data;
}

// Helper: variación porcentual
function renderVariacion(valor, elementId, prefijo = '') {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (valor === null || valor === undefined) {
        el.textContent = 'Sin comparativa';
        el.className = 'kpi-variacion neutro mt-1';
        return;
    }
    const signo = valor >= 0 ? '▲' : '▼';
    const clase  = valor > 0 ? 'positivo' : valor < 0 ? 'negativo' : 'neutro';
    el.textContent = `${signo} ${Math.abs(valor)}% ${prefijo}vs período anterior`;
    el.className = `kpi-variacion ${clase} mt-1`;
}

// Calcular fechas según período seleccionado 
function calcularFechas(periodo) {
    const hoy   = new Date();
    const pad   = n => String(n).padStart(2, '0');
    const fmt   = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    // Agrupación recomendada según el rango de días del período
    // hoy/semana → día | mes/trimestre → día | año → mes
    switch (periodo) {
        case 'hoy': {
            const f = fmt(hoy);
            return { desde: f, hasta: f, agrupacion: 'dia' };
        }
        case 'semana': {
            const lunes = new Date(hoy);
            lunes.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
            return { desde: fmt(lunes), hasta: fmt(hoy), agrupacion: 'dia' };
        }
        case 'mes': {
            const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            return { desde: fmt(ini), hasta: fmt(hoy), agrupacion: 'dia' };
        }
        case 'trimestre': {
            const ini = new Date(hoy);
            ini.setMonth(hoy.getMonth() - 2);
            ini.setDate(1);
            return { desde: fmt(ini), hasta: fmt(hoy), agrupacion: 'semana' };
        }
        case 'año': {
            const ini = new Date(hoy.getFullYear(), 0, 1);
            return { desde: fmt(ini), hasta: fmt(hoy), agrupacion: 'mes' };
        }
        default: return null;
    }
}

// Sincronizar el botón visual de agrupación con el estado actual
function sincronizarBtnAgrupacion(agrupacion) {
    document.querySelectorAll('[data-agrupacion]').forEach(b => {
        b.classList.toggle('active', b.dataset.agrupacion === agrupacion);
    });
}

// Cargar todos los datos del período
async function cargarTodo() {
    const { desde, hasta } = estado;
    if (!desde || !hasta) return;
    const qs = `?desde=${desde}&hasta=${hasta}`;

    try {
        await Promise.all([
            cargarKPIs(qs),
            cargarVentasPeriodo(qs),
            cargarDistribucion(qs),
            cargarTopProductos(qs),
            cargarHorasPico(qs),
            cargarStockCritico(),
            cargarVentasIndividuales(qs),
        ]);
    } catch (err) {
        console.error('Error cargando reportes:', err);
        Toast.error('Error al cargar algunos datos del reporte');
    }
}

// KPIs
async function cargarKPIs(qs) {
    try {
        const d = await apiFetch(`/reportes/resumen${qs}`);

        document.getElementById('kpi-ventas').textContent    = d.actual.totalVentas;
        document.getElementById('kpi-ingresos').textContent  = FormatUtils.moneda(d.actual.totalIngresos, false);
        document.getElementById('kpi-ticket').textContent    = FormatUtils.moneda(d.actual.ticketPromedio, false);
        document.getElementById('kpi-estrella').textContent  = d.productoEstrella?.Nombre || '—';
        document.getElementById('kpi-cancelacion').textContent =
            `Tasa cancelación: ${d.actual.tasaCancelacion}%`;

        // Guardar KPIs en estado para exportación PDF/Excel
        estado._kpis = {
            totalVentas:      d.actual.totalVentas,
            completadas:      d.actual.completadas,
            canceladas:       d.actual.canceladas,
            totalIngresos:    d.actual.totalIngresos,
            ticketPromedio:   d.actual.ticketPromedio,
            tasaCancelacion:  d.actual.tasaCancelacion,
            productoEstrella: d.productoEstrella?.Nombre || null,
        };

        renderVariacion(d.comparativa.ventas,   'kpi-ventas-var');
        renderVariacion(d.comparativa.ingresos, 'kpi-ingresos-var');
        renderVariacion(d.comparativa.ticket,   'kpi-ticket-var');
    } catch (err) {
        console.error('KPIs:', err);
    }
}

// Gráfica de ventas en el período
async function cargarVentasPeriodo(qs) {
    try {
        const d = await apiFetch(`/reportes/ventas-periodo${qs}&agrupacion=${estado.agrupacion}`);
        estado.datosPeriodo = d.datos;

        const categorias = d.datos.map(r => r.fecha);
        const ventas     = d.datos.map(r => r.ventasCompletadas);
        const ingresos   = d.datos.map(r => r.ingresos);

        const opciones = {
            ...opcionesBase,
            chart:  { ...opcionesBase.chart, type: 'area', height: 280 },
            series: [
                { name: 'Ventas', data: ventas },
                { name: 'Ingresos ($)', data: ingresos },
            ],
            xaxis:  { categories: categorias, labels: { rotate: -30, style: { fontSize: '11px' } } },
            yaxis:  [
                { title: { text: 'Ventas' }, labels: { formatter: v => Math.round(v) } },
                { opposite: true, title: { text: 'Ingresos ($)' }, labels: { formatter: v => `$${v.toFixed(0)}` } },
            ],
            colors:  [COLORES.azul, COLORES.verde],
            stroke:  { curve: 'smooth', width: 2 },
            fill:    { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
            markers: { size: d.datos.length <= 15 ? 4 : 0 },
            tooltip: { shared: true, intersect: false },
        };

        if (graficas.ventasPeriodo) {
            graficas.ventasPeriodo.updateOptions(opciones);
        } else {
            graficas.ventasPeriodo = new ApexCharts(document.getElementById('chart-ventas-periodo'), opciones);
            graficas.ventasPeriodo.render();
        }

        // Actualizar tabla de detalle
        renderTablaDetalle(d.datos, 1);
    } catch (err) {
        console.error('Ventas período:', err);
    }
}

// Gráfica distribución por tipo
async function cargarDistribucion(qs) {
    try {
        const d = await apiFetch(`/reportes/distribucion-tipo${qs}`);

        const labels  = d.datos.map(r => r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1));
        const valores = d.datos.map(r => r.ingresos);
        const colores = d.datos.map(r => COLORES[r.tipo] || COLORES.azul);

        const opciones = {
            ...opcionesBase,
            chart:  { ...opcionesBase.chart, type: 'donut', height: 240 },
            series: valores,
            labels,
            colors: colores,
            legend: { position: 'bottom' },
            plotOptions: { pie: { donut: { size: '65%', labels: {
                show: true,
                total: { show: true, label: 'Total', formatter: w =>
                    `$${w.globals.seriesTotals.reduce((a,b) => a+b, 0).toFixed(0)}`
                },
            } } } },
            tooltip: { y: { formatter: v => `$${v.toFixed(2)}` } },
        };

        if (graficas.distribucion) {
            graficas.distribucion.updateOptions(opciones);
        } else {
            graficas.distribucion = new ApexCharts(document.getElementById('chart-distribucion'), opciones);
            graficas.distribucion.render();
        }
    } catch (err) {
        console.error('Distribución:', err);
    }
}

// Gráfica top productos
async function cargarTopProductos(qs, tipo = '') {
    try {
        const filtroTipo = tipo ? `&tipo=${tipo}` : '';
        const d = await apiFetch(`/reportes/top-productos${qs}&limit=10${filtroTipo}`);
        estado.datosTop = d.datos;

        // Poblar selector de producto en la sección de predicción
        const selProd = document.getElementById('selector-producto-pred');
        if (selProd) {
            const valorActual = selProd.value;
            selProd.innerHTML = '<option value="">📊 Ventas generales</option>'
                + d.datos.map(r =>
                    `<option value="${r.idProducto}">${r.nombre}</option>`
                ).join('');
            if (valorActual) selProd.value = valorActual;
        }

        const nombres  = d.datos.map(r => r.nombre.length > 22 ? r.nombre.slice(0,22)+'…' : r.nombre);
        const unidades = d.datos.map(r => r.unidadesVendidas);
        const margenes = d.datos.map(r => r.margenPct);

        // ApexCharts no soporta barras horizontales con doble eje Y
        // Se usan barras verticales con dos series independientes
        const opciones = {
            ...opcionesBase,
            chart:  { ...opcionesBase.chart, type: 'bar', height: 300 },
            series: [
                { name: 'Unidades vendidas', data: unidades },
                { name: 'Margen %',           data: margenes },
            ],
            xaxis: {
                categories: nombres,
                labels: { rotate: -35, style: { fontSize: '11px' } },
            },
            yaxis: [
                { title: { text: 'Unidades' }, labels: { formatter: v => Math.round(v) } },
                { opposite: true, title: { text: 'Margen %' }, min: 0, max: 100,
                  labels: { formatter: v => `${v.toFixed(0)}%` } },
            ],
            plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
            colors:  [COLORES.verde, COLORES.naranja],
            tooltip: { shared: true, intersect: false,
                y: [
                    { formatter: v => `${Math.round(v)} uds` },
                    { formatter: v => `${v ? v.toFixed(1) : 0}%` },
                ],
            },
            dataLabels: { enabled: false },
        };

        // Evento clic en barra → abrir reporte del producto
        opciones.chart.events = {
            dataPointSelection: (e, chart, config) => {
                const idx  = config.dataPointIndex;
                const prod = d.datos[idx];
                if (prod) abrirModalProducto(prod.idProducto, prod.nombre);
            },
        };

        if (graficas.topProductos) {
            graficas.topProductos.updateOptions(opciones);
        } else {
            graficas.topProductos = new ApexCharts(document.getElementById('chart-top-productos'), opciones);
            graficas.topProductos.render();
        }
    } catch (err) {
        console.error('Top productos:', err);
    }
}

// Gráfica horas pico
async function cargarHorasPico(qs) {
    try {
        const d = await apiFetch(`/reportes/horas-pico${qs}`);

        const horas  = d.datos.map(r => r.etiqueta);
        const ventas = d.datos.map(r => r.ventas);

        const opciones = {
            ...opcionesBase,
            chart:  { ...opcionesBase.chart, type: 'bar', height: 300 },
            series: [{ name: 'Ventas', data: ventas }],
            xaxis:  { categories: horas, labels: { rotate: -45, style: { fontSize: '10px' } } },
            colors: [COLORES.info],
            plotOptions: { bar: { borderRadius: 4 } },
            annotations: { yaxis: [{ y: Math.max(...ventas) * 0.8,
                borderColor: COLORES.rojo, strokeDashArray: 4,
                label: { text: 'Hora pico: ' + d.horaPico, style: { color: '#fff', background: COLORES.rojo } }
            }]},
        };

        if (graficas.horasPico) {
            graficas.horasPico.updateOptions(opciones);
        } else {
            graficas.horasPico = new ApexCharts(document.getElementById('chart-horas-pico'), opciones);
            graficas.horasPico.render();
        }
    } catch (err) {
        console.error('Horas pico:', err);
    }
}

// Gráfica predicción
async function cargarPrediccion(dias = estado.diasPrediccion) {
    try {
        const d = await apiFetch(`/reportes/prediccion?dias=${dias}`);

        if (!d.suficienteDatos) {
            document.getElementById('chart-prediccion').innerHTML =
                `<div class="text-center py-4 text-muted">
                    <i class="bi bi-clock-history fs-2 mb-2 d-block"></i>
                    ${d.mensaje}
                </div>`;
            return;
        }

        const fechasHist = d.historial.map(h => h.fecha);
        const ventasHist = d.historial.map(h => h.ventas);
        const fechasPred = d.prediccion.map(p => p.fecha);
        const ventasPred = d.prediccion.map(p => p.ventasEsperadas);
        const ventasMin  = d.prediccion.map(p => p.ventasMin);
        const ventasMax  = d.prediccion.map(p => p.ventasMax);

        // Serie rangeArea para la banda de confianza (min/max)
        // + línea de historial real + línea de predicción esperada
        const opciones = {
            ...opcionesBase,
            chart: { ...opcionesBase.chart, type: 'line', height: 260 },
            series: [
                // Serie 1: historial real (línea sólida)
                {
                    name: 'Historial real',
                    type: 'line',
                    data: ventasHist.map((v, i) => ({ x: new Date(fechasHist[i]).getTime(), y: v })),
                },
                // Serie 2: predicción esperada (línea punteada)
                {
                    name: 'Predicción',
                    type: 'line',
                    data: ventasPred.map((v, i) => ({ x: new Date(fechasPred[i]).getTime(), y: v })),
                },
                // Serie 3: área de confianza (max como límite superior)
                {
                    name: 'Máx. esperado',
                    type: 'area',
                    data: ventasMax.map((v, i) => ({ x: new Date(fechasPred[i]).getTime(), y: v })),
                },
                // Serie 4: límite inferior del área (min)
                {
                    name: 'Mín. esperado',
                    type: 'area',
                    data: ventasMin.map((v, i) => ({ x: new Date(fechasPred[i]).getTime(), y: v })),
                },
            ],
            stroke: {
                curve:     'smooth',
                width:     [2.5, 2, 0, 0],
                dashArray: [0, 6, 0, 0],
            },
            fill: {
                type:    ['solid', 'solid', 'solid', 'solid'],
                opacity: [1, 1, 0.18, 1],
            },
            colors: [COLORES.azul, COLORES.naranja, COLORES.naranja, COLORES.blanco || '#ffffff'],
            xaxis:  { type: 'datetime', labels: { datetimeUTC: false, format: 'dd MMM' } },
            yaxis:  { title: { text: 'Ventas estimadas' }, min: 0,
                      labels: { formatter: v => Math.round(v) } },
            legend: { position: 'top',
                      customLegendItems: ['Historial real', 'Predicción esperada', 'Rango min/máx'] },
            tooltip: {
                shared: true,
                x: { format: 'dd MMM yyyy' },
                y: { formatter: (v, { seriesIndex }) => {
                    if (seriesIndex === 3) return undefined; // ocultar serie invisible
                    return `${Math.round(v)} ventas`;
                }},
            },
            markers: { size: [0, 4, 0, 0] },
        };

        if (graficas.prediccion) {
            graficas.prediccion.updateOptions(opciones);
        } else {
            graficas.prediccion = new ApexCharts(document.getElementById('chart-prediccion'), opciones);
            graficas.prediccion.render();
        }

        // Mostrar badge con el modelo utilizado
        const badgeEl = document.getElementById('badge-modelo-prediccion');
        if (badgeEl) {
            if (d.modeloLogistico) {
                badgeEl.innerHTML =
                    `<span class="badge-modelo badge-modelo--logistico">
                        <i class="bi bi-graph-up-arrow me-1"></i>
                        Modelo Logístico
                        <span class="badge-modelo__detalle">dP/dt = r·P·(1 − P/K)</span>
                        <span class="badge-modelo__dias">${d.diasHistorial} días de historial</span>
                    </span>`;
            } else {
                badgeEl.innerHTML =
                    `<span class="badge-modelo badge-modelo--movil">
                        <i class="bi bi-bar-chart-line me-1"></i>
                        Promedio Móvil Ponderado
                        <span class="badge-modelo__detalle">+ Tendencia lineal</span>
                        <span class="badge-modelo__dias">${d.diasHistorial} días de historial</span>
                    </span>`;
            }
        }

        // Actualizar aviso con el texto real de la API
        const avisoEl = document.getElementById('prediccion-aviso');
        if (avisoEl && d.advertencia) {
            avisoEl.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${d.advertencia}`;
        }

        // Mostrar parámetros del modelo logístico si aplica
        const paramsEl  = document.getElementById('params-logistico');
        if (paramsEl) {
            if (d.modeloLogistico && d.parametrosLogistico) {
                document.getElementById('param-r').textContent  = d.parametrosLogistico.r;
                document.getElementById('param-K').textContent  = d.parametrosLogistico.K;
                document.getElementById('param-P0').textContent = d.parametrosLogistico.P0;
                paramsEl.style.display = 'flex';
            } else {
                paramsEl.style.display = 'none';
            }
        }

    } catch (err) {
        console.error('Predicción:', err);
    }
}


// Predicción por producto individual
async function cargarPrediccionProducto(idProducto, nombreProducto, dias) {
    const aviso = document.getElementById('prediccion-aviso');
    if (aviso) {
        aviso.innerHTML = `<i class="bi bi-box-seam me-1"></i>
            Predicción para <strong>${nombreProducto}</strong> —
            valores estimados con base en el historial de ese producto.`;
    }

    try {
        const qs = `?desde=${estado.desde}&hasta=${estado.hasta}`;
        const d  = await apiFetch(`/reportes/producto/${idProducto}${qs}&dias=${dias}`);

        if (!d.suficienteDatos || !d.prediccion.length) {
            document.getElementById('chart-prediccion').innerHTML =
                `<div class="text-center py-4 text-muted">
                    <i class="bi bi-clock-history fs-2 mb-2 d-block"></i>
                    Historial insuficiente para predecir este producto (mínimo 7 días requeridos).
                </div>`;
            return;
        }

        const { ventasPeriodo: hist, prediccion: pred } = d;

        const opciones = {
            ...opcionesBase,
            chart: { ...opcionesBase.chart, type: 'line', height: 260 },
            series: [
                {
                    name: 'Historial real',
                    type: 'line',
                    data: hist.map(h => ({ x: new Date(h.fecha).getTime(), y: h.unidades })),
                },
                {
                    name: 'Predicción',
                    type: 'line',
                    data: pred.map(p => ({ x: new Date(p.fecha).getTime(), y: p.unidadesEsperadas })),
                },
                {
                    name: 'Máx. esperado',
                    type: 'area',
                    data: pred.map(p => ({ x: new Date(p.fecha).getTime(), y: p.unidadesMax })),
                },
                {
                    name: 'Mín. esperado',
                    type: 'area',
                    data: pred.map(p => ({ x: new Date(p.fecha).getTime(), y: p.unidadesMin })),
                },
            ],
            stroke: { curve: 'smooth', width: [2.5, 2, 0, 0], dashArray: [0, 6, 0, 0] },
            fill:   { type: ['solid','solid','solid','solid'], opacity: [1, 1, 0.18, 1] },
            colors: [COLORES.verde, COLORES.naranja, COLORES.naranja, '#ffffff'],
            xaxis:  { type: 'datetime', labels: { datetimeUTC: false, format: 'dd MMM' } },
            yaxis:  { title: { text: 'Unidades' }, min: 0,
                      labels: { formatter: v => Math.round(v) } },
            legend: { position: 'top',
                      customLegendItems: ['Historial real', 'Predicción esperada', 'Rango min/máx'] },
            tooltip: { shared: true, x: { format: 'dd MMM yyyy' },
                y: { formatter: (v, { seriesIndex }) =>
                    seriesIndex === 3 ? undefined : `${Math.round(v)} uds` } },
            markers: { size: [0, 4, 0, 0] },
        };

        if (graficas.prediccion) {
            graficas.prediccion.updateOptions(opciones);
        } else {
            graficas.prediccion = new ApexCharts(document.getElementById('chart-prediccion'), opciones);
            graficas.prediccion.render();
        }
    } catch (err) {
        console.error('Predicción producto:', err);
    }
}

// Abrir modal de detalle por producto
async function abrirModalProducto(idProducto, nombreProducto) {
    const modal      = new bootstrap.Modal(document.getElementById('modal-producto'));
    const tituloEl   = document.getElementById('modal-producto-titulo');
    const bodyEl     = document.getElementById('modal-producto-body');
    const periodoEl  = document.getElementById('modal-producto-periodo');

    if (tituloEl)  tituloEl.textContent  = nombreProducto;
    if (periodoEl) periodoEl.textContent = `${estado.desde} → ${estado.hasta}`;
    if (bodyEl)    bodyEl.innerHTML = `
        <div class="text-center py-4">
            <span class="spinner-border text-primary"></span>
            <p class="mt-2 text-muted">Cargando reporte de ${nombreProducto}...</p>
        </div>`;

    modal.show();

    try {
        const qs = `?desde=${estado.desde}&hasta=${estado.hasta}&dias=${estado.diasPrediccion}`;
        const d  = await apiFetch(`/reportes/producto/${idProducto}${qs}`);

        // Indicador del modelo usado
        const modeloTag = d.prediccion?.length
            ? `<span class="badge bg-info text-dark ms-2" style="font-size:.72rem;">
                 ${d.suficienteDatos ? 'Predicción disponible' : 'Historial insuficiente'}
               </span>`
            : '';

        bodyEl.innerHTML = `
            <!-- Resumen del producto -->
            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                    <div class="text-center p-2 bg-light rounded">
                        <div class="fw-bold fs-5 text-primary">${d.resumen.totalUnidades}</div>
                        <small class="text-muted">Unidades</small>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="text-center p-2 bg-light rounded">
                        <div class="fw-bold fs-5 text-success">${FormatUtils.moneda(d.resumen.totalIngresos, false)}</div>
                        <small class="text-muted">Ingresos</small>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="text-center p-2 bg-light rounded">
                        <div class="fw-bold fs-5 text-warning">${FormatUtils.moneda(d.resumen.ganancia, false)}</div>
                        <small class="text-muted">Ganancia</small>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="text-center p-2 bg-light rounded">
                        <div class="fw-bold fs-5 text-info">${d.resumen.margenPct}%</div>
                        <small class="text-muted">Margen</small>
                    </div>
                </div>
            </div>

            <!-- Info adicional -->
            <div class="d-flex gap-3 mb-3 flex-wrap">
                <span class="badge bg-secondary">${d.producto.tipo || '—'}</span>
                ${d.producto.subcategoria ? `<span class="badge bg-primary">${d.producto.subcategoria}</span>` : ''}
                <span class="text-muted small"><i class="bi bi-box-seam me-1"></i>Stock actual: <strong>${d.producto.Stock}</strong></span>
                <span class="text-muted small"><i class="bi bi-calendar-check me-1"></i>Días con ventas: <strong>${d.resumen.diasConVentas}</strong></span>
            </div>

            <!-- Gráfica de historial + predicción -->
            <h6 class="fw-semibold mb-2">
                Historial de unidades vendidas ${modeloTag}
            </h6>
            <div id="chart-modal-producto" style="min-height:220px;"></div>`;

        // Renderizar gráfica dentro del modal
        if (d.ventasPeriodo.length) {
            const hist = d.ventasPeriodo;
            const pred = d.prediccion || [];

            const series = [
                {
                    name: 'Historial real',
                    type: 'line',
                    data: hist.map(h => ({ x: new Date(h.fecha).getTime(), y: h.unidades })),
                },
            ];

            if (pred.length) {
                series.push({
                    name: 'Predicción',
                    type: 'line',
                    data: pred.map(p => ({ x: new Date(p.fecha).getTime(), y: p.unidadesEsperadas })),
                });
                series.push({
                    name: 'Rango',
                    type: 'area',
                    data: pred.map(p => ({ x: new Date(p.fecha).getTime(), y: p.unidadesMax })),
                });
            }

            const opcModal = {
                ...opcionesBase,
                chart:  { ...opcionesBase.chart, type: 'line', height: 220 },
                series,
                stroke: { curve: 'smooth', width: pred.length ? [2.5, 2, 0] : [2.5], dashArray: pred.length ? [0, 6, 0] : [0] },
                fill:   { type: 'solid', opacity: pred.length ? [1, 1, 0.15] : [1] },
                colors: [COLORES.azul, COLORES.naranja, COLORES.naranja],
                xaxis:  { type: 'datetime', labels: { datetimeUTC: false, format: 'dd MMM' } },
                yaxis:  { title: { text: 'Unidades' }, min: 0, labels: { formatter: v => Math.round(v) } },
                legend: { show: pred.length > 0 },
                markers: { size: [0, 4, 0] },
                tooltip: { shared: true, x: { format: 'dd MMM yyyy' } },
            };

            setTimeout(() => {
                const el = document.getElementById('chart-modal-producto');
                if (el) {
                    const g = new ApexCharts(el, opcModal);
                    g.render();
                }
            }, 100);
        }

    } catch (err) {
        if (bodyEl) bodyEl.innerHTML = `
            <div class="text-center py-4 text-danger">
                <i class="bi bi-exclamation-triangle fs-2 mb-2 d-block"></i>
                Error al cargar el reporte: ${err.message}
            </div>`;
    }
}

// Stock crítico 
async function cargarStockCritico() {
    const tbody = document.getElementById('tabla-stock-critico');
    try {
        const d = await apiFetch('/reportes/stock-critico?umbral=5');
        const items = d.stockBajo;
        estado._stockItems = items; // guardar para paginación

        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-success">
                <i class="bi bi-check-circle me-1"></i>Stock en buen nivel</td></tr>`;
            renderPaginacionStock(items, 0);
            return;
        }

        renderTablaStock(items, 1);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger">Error al cargar</td></tr>`;
    }
}

function renderTablaStock(items, pagina = 1) {
    estado.stockPag = pagina;
    const tbody     = document.getElementById('tabla-stock-critico');
    if (!tbody) return;

    const total     = items.length;
    const totalPags = Math.ceil(total / STOCK_POR_PAG);
    const inicio    = (pagina - 1) * STOCK_POR_PAG;
    const pagItems  = items.slice(inicio, inicio + STOCK_POR_PAG);

    tbody.innerHTML = pagItems.map(p => `
        <tr>
            <td class="fw-semibold">${p.nombre}</td>
            <td><span class="badge bg-secondary">${p.tipo}</span></td>
            <td class="text-center fw-bold ${p.stock === 0 ? 'text-danger' : 'text-warning'}">${p.stock}</td>
            <td><span class="badge ${p.nivel === 'agotado' ? 'stock-badge-agotado' : 'stock-badge-critico'}">
                ${p.nivel === 'agotado' ? 'Agotado' : 'Crítico'}</span></td>
        </tr>`).join('');

    renderPaginacionStock(items, totalPags);
}

function renderPaginacionStock(items, totalPags) {
    let cont = document.getElementById('pag-stock');
    if (!cont) {
        const card = document.getElementById('tabla-stock-critico')?.closest('.card-body');
        if (card) {
            cont = document.createElement('div');
            cont.id = 'pag-stock';
            card.appendChild(cont);
        }
    }
    if (!cont) return;
    if (totalPags <= 1) { cont.innerHTML = ''; return; }

    const p   = estado.stockPag;
    const ini = (p - 1) * STOCK_POR_PAG + 1;
    const fin = Math.min(p * STOCK_POR_PAG, items.length);
    let btns = '';
    for (let i = 1; i <= totalPags; i++) {
        btns += `<li class="page-item ${i === p ? 'active' : ''}">
            <button class="page-link" onclick="cambiarPagStock(${i})">${i}</button></li>`;
    }
    cont.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-1 mt-2">
            <small class="text-muted">Mostrando ${ini}–${fin} de ${items.length} productos</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${p === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="cambiarPagStock(${p - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${p === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="cambiarPagStock(${p + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.cambiarPagStock = function(n) {
    renderTablaStock(estado._stockItems || [], n);
};

// Tabla de detalle con paginación
function renderTablaDetalle(datos, pagina = 1) {
    estado.detallePag = pagina;
    const tbody = document.getElementById('tbody-ventas-detalle');
    if (!datos.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">Sin datos</td></tr>`;
        renderPaginacionDetalle(datos, 0);
        return;
    }
    const total     = datos.length;
    const totalPags = Math.ceil(total / DETALLE_POR_PAG);
    const inicio    = (pagina - 1) * DETALLE_POR_PAG;
    const pagData   = datos.slice(inicio, inicio + DETALLE_POR_PAG);

    tbody.innerHTML = pagData.map(r => `
        <tr>
            <td><small>${r.fecha}</small></td>
            <td class="fw-semibold">${r.ventasCompletadas}</td>
            <td>${FormatUtils.moneda(r.ingresos, false)}</td>
            <td>${FormatUtils.moneda(r.ticketPromedio, false)}</td>
        </tr>`).join('');

    renderPaginacionDetalle(datos, totalPags);
}

function renderPaginacionDetalle(datos, totalPags) {
    let cont = document.getElementById('pag-detalle');
    if (!cont) {
        const card = document.getElementById('tbody-ventas-detalle')?.closest('.card-body');
        if (card) {
            cont = document.createElement('div');
            cont.id = 'pag-detalle';
            card.appendChild(cont);
        }
    }
    if (!cont) return;
    if (totalPags <= 1) { cont.innerHTML = ''; return; }

    const p    = estado.detallePag;
    const ini  = (p - 1) * DETALLE_POR_PAG + 1;
    const fin  = Math.min(p * DETALLE_POR_PAG, datos.length);
    let btns = '';
    for (let i = 1; i <= totalPags; i++) {
        if (totalPags > 7 && i > 2 && i < totalPags - 1 && Math.abs(i - p) > 1) {
            if (i === 3 || i === totalPags - 2)
                btns += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            continue;
        }
        btns += `<li class="page-item ${i === p ? 'active' : ''}">
            <button class="page-link" onclick="cambiarPagDetalle(${i})">${i}</button></li>`;
    }
    cont.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-1 mt-2">
            <small class="text-muted">Mostrando ${ini}–${fin} de ${datos.length} registros</small>
            <nav><ul class="pagination pagination-sm mb-0">
                <li class="page-item ${p === 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="cambiarPagDetalle(${p - 1})">
                        <i class="bi bi-chevron-left"></i></button></li>
                ${btns}
                <li class="page-item ${p === totalPags ? 'disabled' : ''}">
                    <button class="page-link" onclick="cambiarPagDetalle(${p + 1})">
                        <i class="bi bi-chevron-right"></i></button></li>
            </ul></nav>
        </div>`;
}

window.cambiarPagDetalle = function(n) {
    renderTablaDetalle(estado.datosPeriodo, n);
};

// Exportar Excel — delegado a excel.export.js
// Cargar ventas individuales del período para Excel detallado
async function cargarVentasIndividuales(qs) {
    try {
        // Usa el endpoint de ventas con fechas — pide hasta 500 registros
        const d = await apiFetch(`/ventas?limit=500`);
        const items = Array.isArray(d) ? d : (d.items || []);

        // Filtrar por el período actual
        const desdeDate = new Date(estado.desde + 'T00:00:00');
        const hastaDate = new Date(estado.hasta + 'T23:59:59');

        estado.ventasIndividuales = items.filter(v => {
            const fecha = new Date(v.FechaRegistro);
            return fecha >= desdeDate && fecha <= hastaDate;
        });
    } catch (err) {
        estado.ventasIndividuales = [];
        console.warn('ventasIndividuales:', err.message);
    }
}

function exportarExcel() {
    if (!estado.datosPeriodo.length) {
        Toast.warning('Primero selecciona un período con datos');
        return;
    }
    ExcelExport.generar(estado);
}

// Exportar PDF — delegado a pdf.export.js
function exportarPDF() {
    if (!estado.datosPeriodo.length) {
        Toast.warning('Primero selecciona un período con datos');
        return;
    }
    PDFExport.generar(estado);
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthUtils.requiereAdmin()) return;

    // Período inicial: este mes (agrupación automática: día)
    const fechas = calcularFechas('mes');
    estado.desde     = fechas.desde;
    estado.hasta     = fechas.hasta;
    estado.agrupacion = fechas.agrupacion;
    sincronizarBtnAgrupacion(estado.agrupacion);

    // Cargar datos y predicción en paralelo
    await Promise.all([
        cargarTodo(),
        cargarPrediccion(7),
    ]);

    // Listeners selector período 
    document.getElementById('selector-periodo')
        ?.addEventListener('click', async e => {
            const btn = e.target.closest('.periodo-btn');
            if (!btn) return;

            document.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const periodo = btn.dataset.periodo;
            const rangoDiv = document.getElementById('rango-personalizado');

            if (periodo === 'personalizado') {
                rangoDiv.classList.remove('d-none');
                return;
            }
            rangoDiv.classList.add('d-none');
            const f = calcularFechas(periodo);
            estado.desde      = f.desde;
            estado.hasta      = f.hasta;
            estado.agrupacion = f.agrupacion;
            sincronizarBtnAgrupacion(estado.agrupacion);
            await cargarTodo();
        });

    // Aplicar rango personalizado
    document.getElementById('btn-aplicar-rango')?.addEventListener('click', async () => {
        const desde = document.getElementById('fecha-desde').value;
        const hasta = document.getElementById('fecha-hasta').value;
        if (!desde || !hasta || desde > hasta) {
            Toast.warning('Selecciona un rango de fechas válido');
            return;
        }
        estado.desde = desde;
        estado.hasta = hasta;
        // Inferir agrupación según el rango en días
        const diffDias = Math.round((new Date(hasta) - new Date(desde)) / 86400000);
        estado.agrupacion = diffDias <= 31 ? 'dia' : diffDias <= 90 ? 'semana' : 'mes';
        sincronizarBtnAgrupacion(estado.agrupacion);
        await cargarTodo();
    });

    // Agrupación de ventas (día/semana/mes)
    document.querySelectorAll('[data-agrupacion]').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('[data-agrupacion]')
                .forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            estado.agrupacion = this.dataset.agrupacion;
            const qs = `?desde=${estado.desde}&hasta=${estado.hasta}`;
            await cargarVentasPeriodo(qs);
        });
    });

    // Filtro tipo en top productos
    document.getElementById('filtro-tipo-top')?.addEventListener('change', async function() {
        const qs = `?desde=${estado.desde}&hasta=${estado.hasta}`;
        await cargarTopProductos(qs, this.value);
    });

    // Selector días predicción
    document.getElementById('selector-dias-prediccion')
        ?.addEventListener('click', async e => {
            const btn = e.target.closest('button[data-dias]');
            if (!btn) return;
            document.querySelectorAll('[data-dias]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            estado.diasPrediccion = parseInt(btn.dataset.dias);

            // Si hay un producto seleccionado, actualizar su predicción
            const selProd = document.getElementById('selector-producto-pred');
            const idProd  = selProd?.value;
            if (idProd) {
                const nombre = selProd.options[selProd.selectedIndex]?.text || '';
                await cargarPrediccionProducto(idProd, nombre, estado.diasPrediccion);
            } else {
                await cargarPrediccion(estado.diasPrediccion);
            }
        });

    // Selector de producto para predicción individual
    document.getElementById('selector-producto-pred')
        ?.addEventListener('change', async function() {
            const idProd = this.value;
            if (!idProd) {
                // Volver a predicción general
                const aviso = document.getElementById('prediccion-aviso');
                if (aviso) aviso.innerHTML = `
                    <i class="bi bi-info-circle me-1"></i>
                    Los valores son estimados con base en el historial disponible.
                    Períodos vacacionales o eventos especiales pueden alterar los resultados reales.`;
                await cargarPrediccion(estado.diasPrediccion);
            } else {
                const nombre = this.options[this.selectedIndex]?.text || '';
                await cargarPrediccionProducto(idProd, nombre, estado.diasPrediccion);
            }
        });

    // Buscador en tabla detalle
    let debounce;
    document.getElementById('buscador-detalle')?.addEventListener('input', function() {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            const termino = this.value.toLowerCase();
            const filtrado = estado.datosPeriodo.filter(r =>
                r.fecha.includes(termino)
            );
            renderTablaDetalle(filtrado, 1); // resetear a pág 1 al buscar
        }, 300);
    });

    // Exportar
    document.getElementById('btn-exportar-excel')?.addEventListener('click', exportarExcel);
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', exportarPDF);
});