const ExcelExport = (() => {

    // ── Colores corporativos (ARGB para SheetJS)
    const COLOR = {
        primario:   'FF0B265C',
        acento:     'FF1E40AF',
        verde:      'FF198754',
        rojo:       'FFDC3545',
        naranja:    'FFFD7E14',
        amarillo:   'FFF59E0B',
        gris:       'FF6C757D',
        grisClaroF: 'FFF8F9FA',
        blanco:     'FFFFFFFF',
        negro:      'FF212529',
        borde:      'FFDEE2E6',
    };

    // Estilos reutilizables
    const estilo = {
        encabezado: {
            font:      { bold: true, color: { argb: COLOR.blanco }, sz: 11 },
            fill:      { patternType: 'solid', fgColor: { argb: COLOR.primario } },
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            border:    bordes(),
        },
        subEncabezado: {
            font:      { bold: true, color: { argb: COLOR.blanco }, sz: 10 },
            fill:      { patternType: 'solid', fgColor: { argb: COLOR.acento } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border:    bordes(),
        },
        celda: {
            alignment: { vertical: 'middle' },
            border:    bordes(COLOR.borde),
        },
        celdaDerecha: {
            alignment: { horizontal: 'right', vertical: 'middle' },
            border:    bordes(COLOR.borde),
        },
        celdaCentro: {
            alignment: { horizontal: 'center', vertical: 'middle' },
            border:    bordes(COLOR.borde),
        },
        filaPar: {
            fill:   { patternType: 'solid', fgColor: { argb: COLOR.grisClaroF } },
            border: bordes(COLOR.borde),
        },
        kpi: {
            font:      { bold: true, sz: 14 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border:    bordes(COLOR.acento),
        },
        titulo: {
            font:      { bold: true, color: { argb: COLOR.primario }, sz: 14 },
            alignment: { horizontal: 'left', vertical: 'middle' },
        },
        subtitulo: {
            font:      { italic: true, color: { argb: COLOR.gris }, sz: 10 },
            alignment: { horizontal: 'left', vertical: 'middle' },
        },
    };

    function bordes(color = COLOR.negro) {
        const b = { style: 'thin', color: { argb: color } };
        return { top: b, bottom: b, left: b, right: b };
    }

    // Aplicar estilo a una celda
    function aplicarEstilo(celda, estObj) {
        if (!celda) return;
        if (estObj.font)      celda.font      = estObj.font;
        if (estObj.fill)      celda.fill      = estObj.fill;
        if (estObj.alignment) celda.alignment = estObj.alignment;
        if (estObj.border)    celda.border    = estObj.border;
    }

    // Escribir fila de encabezado
    function escribirEncabezado(ws, fila, cols, rowIdx) {
        cols.forEach((col, ci) => {
            const ref  = XLSX.utils.encode_cell({ r: rowIdx, c: ci });
            ws[ref]    = { v: col.header, t: 's' };
            const est  = { ...estilo.encabezado };
            if (col.color) est.fill = { patternType: 'solid', fgColor: { argb: col.color } };
            aplicarEstilo(ws[ref], est);
        });
    }

    // Escribir fila de datos
    function escribirFila(ws, fila, cols, rowIdx, esPar = false) {
        cols.forEach((col, ci) => {
            const ref = XLSX.utils.encode_cell({ r: rowIdx, c: ci });
            const val = fila[col.key] !== undefined ? fila[col.key] : '';
            ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : 's' };

            // Estilo base
            let est = { ...(esPar ? estilo.filaPar : estilo.celda) };
            if (col.align === 'right')  est = { ...est, ...estilo.celdaDerecha };
            if (col.align === 'center') est = { ...est, ...estilo.celdaCentro };

            // Color condicional
            if (col.colorFn) {
                const color = col.colorFn(val, fila);
                est.font = { ...(est.font || {}), color: { argb: color }, bold: col.boldFn?.(val) };
            }

            if (esPar) {
                est.fill = { patternType: 'solid', fgColor: { argb: COLOR.grisClaroF } };
            }

            aplicarEstilo(ws[ref], est);

            // Formato numérico
            if (col.formato) ws[ref].z = col.formato;
        });
    }

    // Hoja 1: Resumen ejecutivo
    function hojaResumen(wb, estado) {
        const ws   = {};
        const cols = ['A','B','C','D','E','F'];
        let r = 0;

        // Título
        ws['A1'] = { v: 'REPORTE DE VENTAS — CAFETERÍA ITH', t: 's' };
        aplicarEstilo(ws['A1'], estilo.titulo);
        ws['A2'] = { v: `Período: ${estado.desde}  →  ${estado.hasta}  |  Agrupación: ${estado.agrupacion}`, t: 's' };
        aplicarEstilo(ws['A2'], estilo.subtitulo);
        ws['A3'] = { v: `Generado: ${new Date().toLocaleString('es-MX')}`, t: 's' };
        aplicarEstilo(ws['A3'], estilo.subtitulo);

        r = 4; // Fila 5 (base 0)

        // KPIs
        const kpis = estado._kpis || {};
        const datosKPI = [
            ['Total Ventas',       kpis.totalVentas || 0,       'n', COLOR.acento],
            ['Completadas',        kpis.completadas || 0,        'n', COLOR.verde],
            ['Canceladas',         kpis.canceladas || 0,         'n', COLOR.rojo],
            ['Ingresos Totales',   kpis.totalIngresos || 0,      'n', COLOR.verde],
            ['Ticket Promedio',    kpis.ticketPromedio || 0,     'n', COLOR.naranja],
            ['Tasa Cancelación %', kpis.tasaCancelacion || 0,    'n', COLOR.rojo],
        ];

        // Cabecera KPIs
        datosKPI.forEach((kpi, i) => {
            const ref = XLSX.utils.encode_cell({ r, c: i });
            ws[ref] = { v: kpi[0], t: 's' };
            aplicarEstilo(ws[ref], {
                font:      { bold: true, color: { argb: COLOR.blanco }, sz: 9 },
                fill:      { patternType: 'solid', fgColor: { argb: kpi[3] } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
                border:    bordes(),
            });
        });
        r++;

        // Valores KPIs
        datosKPI.forEach((kpi, i) => {
            const ref = XLSX.utils.encode_cell({ r, c: i });
            ws[ref] = { v: kpi[1], t: kpi[2] };
            aplicarEstilo(ws[ref], {
                ...estilo.kpi,
                font: { bold: true, sz: 13, color: { argb: kpi[3] } },
            });
            if (kpi[0].includes('$') || kpi[0].includes('Ingreso') || kpi[0].includes('Ticket')) {
                ws[ref].z = '"$"#,##0.00';
            }
        });
        r++;

        // Producto estrella
        r++;
        ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: '⭐ Producto estrella del período:', t: 's' };
        aplicarEstilo(ws[XLSX.utils.encode_cell({ r, c: 0 })],
            { font: { bold: true, color: { argb: COLOR.primario } } });
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: kpis.productoEstrella || '—', t: 's' };
        r += 2;

        // Actualizar rango
        const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 5 } });
        ws['!ref'] = ref;
        ws['!cols'] = Array(6).fill({ wch: 22 });
        ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 32 }, { hpt: 40 }];

        XLSX.utils.book_append_sheet(wb, ws, '📋 Resumen');
    }

    // Hoja 2a: Resumen de ventas por período (agregado)
    function hojaDetalle(wb, estado) {
        const ws = {};
        let r = 0;

        ws['A1'] = { v: 'RESUMEN DE VENTAS POR PERIODO — CAFETERIA ITH', t: 's' };
        aplicarEstilo(ws['A1'], estilo.titulo);
        const agrup = estado.agrupacion.charAt(0).toUpperCase() + estado.agrupacion.slice(1);
        ws['A2'] = { v: `Agrupación: ${agrup}  |  Período: ${estado.desde} al ${estado.hasta}  |  Generado: ${new Date().toLocaleString('es-MX')}`, t: 's' };
        aplicarEstilo(ws['A2'], estilo.subtitulo);
        r = 3;

        const cols = [
            { header: 'Fecha',               key: 'fecha',             align: 'left'   },
            { header: 'Ventas Completadas',   key: 'ventasCompletadas', align: 'center' },
            { header: 'Ventas Canceladas',    key: 'ventasCanceladas',  align: 'center',
              colorFn: v => v > 0 ? COLOR.rojo : COLOR.negro },
            { header: 'Ingresos ($)',         key: 'ingresos',          align: 'right',
              formato: '"$"#,##0.00', colorFn: () => COLOR.verde },
            { header: 'Ticket Promedio ($)',  key: 'ticketPromedio',    align: 'right',
              formato: '"$"#,##0.00' },
        ];

        escribirEncabezado(ws, null, cols, r++);
        estado.datosPeriodo.forEach((fila, fi) => {
            escribirFila(ws, fila, cols, r++, fi % 2 !== 0);
        });

        // Fila de totales
        const total = estado.datosPeriodo.reduce((acc, d) => ({
            fecha:             'TOTAL',
            ventasCompletadas: acc.ventasCompletadas + (d.ventasCompletadas || 0),
            ventasCanceladas:  acc.ventasCanceladas  + (d.ventasCanceladas  || 0),
            ingresos:          acc.ingresos          + (d.ingresos          || 0),
            ticketPromedio:    0,
        }), { fecha: 'TOTAL', ventasCompletadas: 0, ventasCanceladas: 0, ingresos: 0, ticketPromedio: 0 });

        cols.forEach((col, ci) => {
            const ref = XLSX.utils.encode_cell({ r, c: ci });
            ws[ref] = { v: total[col.key] || '', t: ci === 0 ? 's' : 'n' };
            aplicarEstilo(ws[ref], {
                font: { bold: true, color: { argb: COLOR.blanco } },
                fill: { patternType: 'solid', fgColor: { argb: COLOR.primario } },
                alignment: { horizontal: col.align || 'left', vertical: 'middle' },
                border: bordes(),
            });
            if (col.formato) ws[ref].z = col.formato;
        });

        ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols.length - 1 } });
        ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 20 }];
        ws['!rows'] = [{ hpt: 24 }, { hpt: 14 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Resumen Periodo');
    }

    // Hoja 2b: Ventas individuales del período
    function hojaVentasIndividuales(wb, estado) {
        const ventas = estado.ventasIndividuales || [];
        const ws = {};
        let r = 0;

        ws['A1'] = { v: 'VENTAS INDIVIDUALES DEL PERIODO — CAFETERIA ITH', t: 's' };
        aplicarEstilo(ws['A1'], estilo.titulo);
        ws['A2'] = { v: `Período: ${estado.desde} al ${estado.hasta}  |  Total registros: ${ventas.length}  |  Generado: ${new Date().toLocaleString('es-MX')}`, t: 's' };
        aplicarEstilo(ws['A2'], estilo.subtitulo);
        r = 3;

        // KPIs rápidos de las ventas individuales
        const completadas  = ventas.filter(v => !['Cancelada'].includes(v.estado)).length;
        const canceladas   = ventas.filter(v => v.estado === 'Cancelada').length;
        const totalIngresos = ventas
            .filter(v => v.estado !== 'Cancelada')
            .reduce((s, v) => s + parseFloat(v.MontoTotal || 0), 0);

        const kpisV = [
            ['Total Ventas',   ventas.length,                         COLOR.acento  ],
            ['Completadas',    completadas,                            COLOR.verde   ],
            ['Canceladas',     canceladas,                             COLOR.rojo    ],
            ['Ingresos Total', +totalIngresos.toFixed(2),             COLOR.verde   ],
        ];

        kpisV.forEach((kpi, i) => {
            const ref = XLSX.utils.encode_cell({ r, c: i });
            ws[ref] = { v: kpi[0], t: 's' };
            aplicarEstilo(ws[ref], {
                font:      { bold: true, color: { argb: COLOR.blanco }, sz: 9 },
                fill:      { patternType: 'solid', fgColor: { argb: kpi[2] } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
                border:    bordes(),
            });
        });
        r++;
        kpisV.forEach((kpi, i) => {
            const ref = XLSX.utils.encode_cell({ r, c: i });
            ws[ref] = { v: kpi[1], t: 'n' };
            aplicarEstilo(ws[ref], {
                ...estilo.kpi,
                font: { bold: true, sz: 13, color: { argb: kpi[2] } },
            });
            if (i === 3) ws[ref].z = '"$"#,##0.00';
        });
        r += 2;

        if (!ventas.length) {
            ws[XLSX.utils.encode_cell({ r, c: 0 })] = {
                v: 'Sin ventas en este período', t: 's'
            };
            aplicarEstilo(ws[XLSX.utils.encode_cell({ r, c: 0 })], estilo.subtitulo);
            r++;
        } else {
            const cols = [
                { header: '#Venta',        key: 'idVenta',       align: 'center' },
                { header: 'Cliente',       key: 'cliente',       align: 'left'   },
                { header: 'Método Pago',   key: 'TipoDocumento', align: 'center' },
                { header: 'Monto Total',   key: 'MontoTotal',    align: 'right',
                  formato: '"$"#,##0.00',  colorFn: () => COLOR.verde },
                { header: 'Monto Pagado',  key: 'MontoPago',     align: 'right',
                  formato: '"$"#,##0.00' },
                { header: 'Cambio',        key: 'MontoCambio',   align: 'right',
                  formato: '"$"#,##0.00' },
                { header: 'Estado',        key: 'estado',        align: 'center',
                  colorFn: v => v === 'Cancelada' ? COLOR.rojo
                              : v === 'Entregado'  ? COLOR.verde
                              : COLOR.naranja },
                { header: 'Fecha',         key: 'FechaRegistro', align: 'left'   },
            ];

            escribirEncabezado(ws, null, cols, r++);

            ventas.forEach((v, fi) => {
                escribirFila(ws, {
                    ...v,
                    MontoTotal:    parseFloat(v.MontoTotal  || 0),
                    MontoPago:     parseFloat(v.MontoPago   || 0),
                    MontoCambio:   parseFloat(v.MontoCambio || 0),
                    FechaRegistro: v.FechaRegistro
                        ? new Date(v.FechaRegistro).toLocaleString('es-MX')
                        : '—',
                    cliente: v.cliente || '—',
                }, cols, r++, fi % 2 !== 0);
            });

            // Fila total
            const refT = ci => XLSX.utils.encode_cell({ r, c: ci });
            ['#Venta','Cliente','Método Pago','','','','',''].forEach((_, ci) => {
                ws[refT(ci)] = {
                    v: ci === 0 ? 'TOTAL' : ci === 3 ? +totalIngresos.toFixed(2) : '',
                    t: ci === 3 ? 'n' : 's',
                };
                aplicarEstilo(ws[refT(ci)], {
                    font: { bold: true, color: { argb: COLOR.blanco } },
                    fill: { patternType: 'solid', fgColor: { argb: COLOR.primario } },
                    border: bordes(),
                });
                if (ci === 3) ws[refT(ci)].z = '"$"#,##0.00';
            });
            r++;

            ws['!cols'] = [
                { wch: 10 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
                { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 },
            ];
        }

        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 7 } });
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas Individuales');
    }

    // Hoja 3: Top productos
    function hojaTopProductos(wb, estado) {
        if (!estado.datosTop?.length) return;
        const ws = {};
        let r = 0;

        ws['A1'] = { v: 'Top 10 Productos — Ventas e Ingresos', t: 's' };
        aplicarEstilo(ws['A1'], estilo.titulo);
        r = 1;

        const cols = [
            { header: '#',          key: 'posicion',         align: 'center', color: COLOR.acento },
            { header: 'Producto',   key: 'nombre',           align: 'left'   },
            { header: 'Tipo',       key: 'tipo',             align: 'center' },
            { header: 'Subcategoría', key: 'subcategoria',   align: 'left'   },
            { header: 'Unidades',   key: 'unidadesVendidas', align: 'center' },
            { header: 'Ingresos', key: 'ingresos', align: 'right',
              formato: '"$"#,##0.00', colorFn: () => COLOR.verde },
            { header: 'Ganancia', key: 'ganancia', align: 'right',
              formato: '"$"#,##0.00',
              colorFn: v => parseFloat(v) >= 0 ? COLOR.verde : COLOR.rojo },
            { header: 'Margen %',   key: 'margenPct',        align: 'right',
              formato: '0.00"%"' },
        ];

        escribirEncabezado(ws, null, cols, r++);
        estado.datosTop.forEach((fila, fi) => {
            escribirFila(ws, fila, cols, r++, fi % 2 !== 0);
        });

        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols.length - 1 } });
        ws['!cols'] = [
            { wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 },
            { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, '🏆 Top Productos');
    }

    // Hoja 4: Stock crítico
    function hojaStock(wb, estado) {
        const items = estado._stockItems || [];
        if (!items.length) return;

        const ws = {};
        let r = 0;

        ws['A1'] = { v: 'Stock Crítico — Productos con reposición urgente', t: 's' };
        aplicarEstilo(ws['A1'], {
            font: { bold: true, color: { argb: COLOR.rojo }, sz: 13 },
        });
        r = 1;

        const cols = [
            { header: 'Producto',  key: 'nombre', align: 'left' },
            { header: 'Tipo',      key: 'tipo',   align: 'center' },
            { header: 'Stock',     key: 'stock',  align: 'center',
              colorFn: v => parseInt(v) === 0 ? COLOR.rojo : COLOR.naranja },
            { header: 'Estado',    key: 'nivel',  align: 'center',
              colorFn: v => v === 'agotado' ? COLOR.rojo : COLOR.naranja },
        ];

        escribirEncabezado(ws, null, cols, r++);
        items.forEach((fila, fi) => {
            escribirFila(ws, {
                ...fila,
                nivel: fila.nivel === 'agotado' ? 'AGOTADO' : 'CRÍTICO',
            }, cols, r++, fi % 2 !== 0);
        });

        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols.length - 1 } });
        ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];

        XLSX.utils.book_append_sheet(wb, ws, '⚠️ Stock Crítico');
    }

    // Generar Excel completo
    function generar(estado) {
        if (!window.XLSX) {
            Toast.error('SheetJS no está disponible');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            hojaResumen(wb, estado);
            hojaDetalle(wb, estado);
            hojaVentasIndividuales(wb, estado);
            hojaTopProductos(wb, estado);
            hojaStock(wb, estado);

            const nombre = `reporte_cafeteria_${estado.desde}_${estado.hasta}.xlsx`;
            XLSX.writeFile(wb, nombre);
            Toast.success('Excel generado correctamente');
        } catch (err) {
            console.error('ExcelExport error:', err);
            Toast.error('Error al generar Excel: ' + err.message);
        }
    }


    // Hoja: Historial de Inventario
    function hojaInventario(wb, movimientos, stats) {
        const ws = {};
        let r = 0;

        // Título y metadatos
        ws['A1'] = { v: 'HISTORIAL DE INVENTARIO — CAFETERÍA ITH', t: 's' };
        aplicarEstilo(ws['A1'], estilo.titulo);
        const periodoLabel = stats.periodo
            ? `Período: ${stats.periodo}  |  `
            : '';
        ws['A2'] = { v: `${periodoLabel}Generado: ${new Date().toLocaleString('es-MX')}`, t: 's' };
        aplicarEstilo(ws['A2'], estilo.subtitulo);
        r = 2;

        // Fila vacía
        r++;

        // KPIs de inventario
        const kpisInv = [
            ['Total Productos',   stats.total      || 0, COLOR.acento  ],
            ['Stock Bajo (<10)',  stats.stockBajo   || 0, COLOR.amarillo],
            ['Sin Stock',        stats.sinStock     || 0, COLOR.rojo    ],
            ['Movimientos Hoy',  stats.movHoy       || 0, COLOR.acento  ],
        ];

        kpisInv.forEach((kpi, i) => {
            const ref = XLSX.utils.encode_cell({ r, c: i });
            ws[ref] = { v: kpi[0], t: 's' };
            aplicarEstilo(ws[ref], {
                font:      { bold: true, color: { argb: COLOR.blanco }, sz: 9 },
                fill:      { patternType: 'solid', fgColor: { argb: kpi[2] } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
                border:    bordes(),
            });
        });
        r++;
        kpisInv.forEach((kpi, i) => {
            const ref = XLSX.utils.encode_cell({ r, c: i });
            ws[ref] = { v: kpi[1], t: 'n' };
            aplicarEstilo(ws[ref], {
                ...estilo.kpi,
                font: { bold: true, sz: 13, color: { argb: kpi[2] } },
            });
        });
        r += 2;

        // Tabla de movimientos
        const cols = [
            { header: 'Producto',       key: 'producto',        align: 'left'   },
            { header: 'Código',         key: 'codigo',          align: 'center' },
            { header: 'Stock Anterior', key: 'stock_anterior',  align: 'center' },
            { header: 'Stock Nuevo',    key: 'stock_nuevo',     align: 'center',
              colorFn: v => parseInt(v) <= 0 ? COLOR.rojo : parseInt(v) < 10 ? COLOR.naranja : COLOR.verde },
            { header: 'Movimiento',     key: 'tipo_movimiento', align: 'center' },
            { header: 'Cantidad',       key: 'cantidad',        align: 'center' },
            { header: 'Usuario',        key: 'usuario',         align: 'left'   },
            { header: 'Observaciones',  key: 'observaciones',   align: 'left'   },
            { header: 'Fecha',          key: 'fecha_movimiento',align: 'left'   },
        ];

        escribirEncabezado(ws, null, cols, r++);

        movimientos.forEach((fila, fi) => {
            escribirFila(ws, {
                ...fila,
                stock_anterior:  fila.stock_anterior  ?? '—',
                stock_nuevo:     fila.stock_nuevo      ?? 0,
                cantidad:        fila.cantidad != null ? Math.abs(fila.cantidad) : '—',
                usuario:         fila.usuario          || '—',
                observaciones:   fila.observaciones    || '—',
                fecha_movimiento: fila.fecha_movimiento
                    ? new Date(fila.fecha_movimiento).toLocaleString('es-MX')
                    : '—',
            }, cols, r++, fi % 2 !== 0);
        });

        ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols.length - 1 } });
        ws['!cols'] = [
            { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
            { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 35 }, { wch: 22 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    }

    // Exportar inventario completo
    function generarInventario(movimientos, stats) {
        if (!window.XLSX) {
            Toast.error('SheetJS no está disponible');
            return;
        }
        if (!movimientos?.length) {
            Toast.warning('No hay movimientos para exportar');
            return;
        }
        try {
            const wb = XLSX.utils.book_new();
            hojaInventario(wb, movimientos, stats);
            const periodo = stats.periodo
                ? stats.periodo.replace(/ /g, '_').replace(/\//g, '-')
                : new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `inventario_cafeteria_${periodo}.xlsx`);
            Toast.success('Excel de inventario generado correctamente');
        } catch (err) {
            console.error('ExcelExport.generarInventario error:', err);
            Toast.error('Error al generar Excel: ' + err.message);
        }
    }

    return { generar, generarInventario };

})();