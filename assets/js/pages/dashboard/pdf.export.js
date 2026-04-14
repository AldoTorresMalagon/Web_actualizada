const PDFExport = (() => {

    // Colores
    const C = {
        primario: [11, 38, 92],   // #0b265c
        secundario: [8, 26, 66],   // #081a42
        acento: [30, 64, 175],   // #1e40af
        verde: [25, 135, 84],   // #198754
        rojo: [220, 53, 69],   // #dc3545
        naranja: [253, 126, 20],   // #fd7e14
        amarillo: [245, 158, 11],   // #f59e0b
        gris: [108, 117, 125],   // #6c757d
        grisClarot: [248, 249, 250],   // #f8f9fa
        blanco: [255, 255, 255],
        negro: [33, 37, 41],   // #212529
        borde: [222, 226, 230],   // #dee2e6
    };

    // Helpers
    // Usa FormatUtils.moneda (conSufijo=false) para consistencia con el resto del sistema
    const moneda = v => FormatUtils.moneda(v, false);
    const fmt = s => s ? String(s) : '--';

    // Dibujar rectangulo con relleno
    function rect(pdf, x, y, w, h, color, radio = 0) {
        pdf.setFillColor(...color);
        if (radio > 0) {
            pdf.roundedRect(x, y, w, h, radio, radio, 'F');
        } else {
            pdf.rect(x, y, w, h, 'F');
        }
    }

    // Texto centrado dentro de un ancho
    function textoCentrado(pdf, texto, y, xIni, ancho, color = C.negro, size = 10) {
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        const tw = pdf.getTextWidth(texto);
        pdf.text(texto, xIni + (ancho - tw) / 2, y);
    }

    // Linea separadora
    function linea(pdf, y, margin = 14) {
        pdf.setDrawColor(...C.borde);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, 210 - margin, y);
    }

    // Pie de pagina en todas las hojas
    function piePagina(pdf, periodo, totalPags) {
        const total = pdf.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            pdf.setPage(i);
            const pY = 287;
            linea(pdf, pY - 3);
            pdf.setFontSize(8);
            pdf.setTextColor(...C.gris);
            pdf.text(`Cafeteria ITH - Reporte generado el ${new Date().toLocaleDateString('es-MX')}`, 14, pY);
            pdf.text(`Periodo: ${periodo}`, 105, pY, { align: 'center' });
            pdf.text(`Pag. ${i} / ${total}`, 196, pY, { align: 'right' });
        }
    }

    // Portada
    function portada(pdf, estado, logoBase64 = null) {
        const W = 210, H = 297;

        // Fondo superior degradado simulado (jsPDF no soporta gradientes - usamos 3 bandas)
        rect(pdf, 0, 0, W, 100, C.secundario);
        rect(pdf, 0, 100, W, 20, C.primario);
        rect(pdf, 0, 120, W, 3, C.acento);

        // Logo centrado — si carga correctamente, insertar imagen
        // Si no, usar texto de fallback
        const logoSize = 28; // tamaño del logo en mm
        const logoX = (W - logoSize) / 2;

        if (logoBase64) {
            try {
                pdf.addImage(logoBase64, 'PNG', logoX, 22, logoSize, logoSize);
            } catch {
                // fallback si la imagen falla
                pdf.setFontSize(30);
                pdf.setTextColor(...C.blanco);
                textoCentrado(pdf, 'ITH', 42, 0, W, C.blanco, 30);
            }
        } else {
            pdf.setFontSize(30);
            pdf.setTextColor(...C.blanco);
            textoCentrado(pdf, 'ITH', 42, 0, W, C.blanco, 30);
        }

        // Titulo debajo del logo
        pdf.setFont('helvetica', 'bold');
        textoCentrado(pdf, 'CAFETERIA ITH', 58, 0, W, C.blanco, 20);

        pdf.setFont('helvetica', 'normal');
        textoCentrado(pdf, 'Reporte de Ventas y Analisis', 66, 0, W, [180, 195, 220], 12);

        // Periodo
        const periodoStr = `${estado.desde}  ->  ${estado.hasta}`;
        rect(pdf, 55, 84, 100, 10, C.acento, 3);
        textoCentrado(pdf, periodoStr, 90.5, 55, 100, C.blanco, 9);

        // Seccion de KPIs en portada
        const kpis = [
            { label: 'Total Ventas', valor: fmt(estado._kpis?.totalVentas), color: C.acento },
            { label: 'Ingresos', valor: moneda(estado._kpis?.totalIngresos), color: C.verde },
            { label: 'Ticket Promedio', valor: moneda(estado._kpis?.ticketPromedio), color: C.naranja },
            { label: 'Tasa Cancelacion', valor: `${estado._kpis?.tasaCancelacion || 0}%`, color: C.rojo },
        ];

        const kW = 40, kH = 22, kY = 140, kGap = 5;
        const totalKW = kpis.length * kW + (kpis.length - 1) * kGap;
        let kX = (W - totalKW) / 2;

        kpis.forEach(k => {
            rect(pdf, kX, kY, kW, kH, C.grisClarot, 3);
            pdf.setDrawColor(...k.color);
            pdf.setLineWidth(0.8);
            pdf.roundedRect(kX, kY, kW, kH, 3, 3, 'S');
            pdf.setFontSize(7);
            pdf.setTextColor(...C.gris);
            textoCentrado(pdf, k.label, kY + 7, kX, kW);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...k.color);
            textoCentrado(pdf, k.valor, kY + 15, kX, kW, k.color, 11);
            pdf.setFont('helvetica', 'normal');
            kX += kW + kGap;
        });

        // Producto estrella
        if (estado._kpis?.productoEstrella) {
            pdf.setFontSize(9);
            pdf.setTextColor(...C.gris);
            textoCentrado(pdf, '* Producto estrella del periodo', 178, 0, W, C.gris, 9);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...C.primario);
            textoCentrado(pdf, estado._kpis.productoEstrella, 186, 0, W, C.primario, 12);
            pdf.setFont('helvetica', 'normal');
        }

        // Fecha de generacion
        pdf.setFontSize(8);
        pdf.setTextColor(...C.gris);
        textoCentrado(pdf,
            `Generado el ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
            200, 0, W, C.gris, 8
        );
    }

    // Encabezado de seccion
    function encabezadoSeccion(pdf, titulo, icono, y) {
        rect(pdf, 14, y, 182, 9, C.primario, 2);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...C.blanco);
        pdf.text(`${icono}  ${titulo}`, 18, y + 6.5);
        pdf.setFont('helvetica', 'normal');
        return y + 14;
    }

    // Tabla generica
    function tabla(pdf, y, cols, filas, opcs = {}) {
        const margin = opcs.margin || 14;
        const ancho = 210 - margin * 2;
        const rowH = opcs.rowH || 7;
        const headH = opcs.headH || 8;
        const maxY = 278;

        // Calcular anchos de columna
        const anchos = cols.map(c => (c.pct || 1 / cols.length) * ancho);

        // Cabecera
        rect(pdf, margin, y, ancho, headH, C.secundario);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...C.blanco);
        let cx = margin;
        cols.forEach((col, i) => {
            const tw = pdf.getTextWidth(col.header);
            const xText = col.align === 'right'
                ? cx + anchos[i] - tw - 2
                : col.align === 'center'
                    ? cx + (anchos[i] - tw) / 2
                    : cx + 2;
            pdf.text(col.header, xText, y + headH - 2);
            cx += anchos[i];
        });

        y += headH;
        pdf.setFont('helvetica', 'normal');

        // Filas
        filas.forEach((fila, fi) => {
            // Nueva pagina si es necesario
            if (y + rowH > maxY) {
                pdf.addPage();
                y = 20;
                // Repetir cabecera
                rect(pdf, margin, y, ancho, headH, C.secundario);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(...C.blanco);
                cx = margin;
                cols.forEach((col, i) => {
                    pdf.text(col.header, cx + 2, y + headH - 2);
                    cx += anchos[i];
                });
                y += headH;
                pdf.setFont('helvetica', 'normal');
            }

            const bg = fi % 2 === 0 ? C.blanco : C.grisClarot;
            rect(pdf, margin, y, ancho, rowH, bg);

            // Borde inferior
            pdf.setDrawColor(...C.borde);
            pdf.setLineWidth(0.15);
            pdf.line(margin, y + rowH, margin + ancho, y + rowH);

            pdf.setFontSize(8);
            cx = margin;
            cols.forEach((col, i) => {
                const val = fmt(fila[col.key]);
                const color = col.colorFn ? col.colorFn(fila[col.key], fila) : C.negro;
                pdf.setTextColor(...color);
                const tw = pdf.getTextWidth(val);
                const xText = col.align === 'right'
                    ? cx + anchos[i] - tw - 2
                    : col.align === 'center'
                        ? cx + (anchos[i] - tw) / 2
                        : cx + 2;
                pdf.text(val, xText, y + rowH - 2);
                cx += anchos[i];
            });

            y += rowH;
        });

        // Borde exterior de la tabla
        pdf.setDrawColor(...C.borde);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, y - rowH * filas.length - headH, ancho, rowH * filas.length + headH, 'S');

        return y + 4;
    }

    // Cargar imagen como base64
    async function cargarImagenBase64(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    // Generar PDF completo
    async function generar(estado) {
        if (!window.jspdf) {
            Toast.error('jsPDF no esta disponible');
            return;
        }

        Toast.info('Generando PDF, un momento...');

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const periodo = `${estado.desde}  ->  ${estado.hasta}`;

            // Cargar logo — ruta relativa desde /dashboard/
            const logoBase64 = await cargarImagenBase64('../assets/images/logo.png');

            // Pagina 1: Portada
            portada(pdf, estado, logoBase64);

            // Pagina 2: Detalle de ventas + distribucion 
            pdf.addPage();
            let y = 20;

            // Titulo de pagina
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...C.primario);
            pdf.text('Detalle de Ventas por Periodo', 14, y);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(...C.gris);
            pdf.text(`Agrupacion: ${estado.agrupacion}  |  Periodo: ${periodo}`, 14, y + 6);
            y += 16;

            if (estado.datosPeriodo.length) {
                y = tabla(pdf, y, [
                    { header: 'Fecha', key: 'fecha', pct: 0.22 },
                    { header: 'Ventas completadas', key: 'ventasCompletadas', pct: 0.20, align: 'center' },
                    {
                        header: 'Canceladas', key: 'ventasCanceladas', pct: 0.16, align: 'center',
                        colorFn: v => v > 0 ? C.rojo : C.negro
                    },
                    {
                        header: 'Ingresos ($)', key: 'ingresos', pct: 0.22, align: 'right',
                        colorFn: () => C.verde
                    },
                    { header: 'Ticket promedio', key: 'ticketPromedio', pct: 0.20, align: 'right' },
                ], estado.datosPeriodo.map(r => ({
                    ...r,
                    ingresos: moneda(r.ingresos),
                    ticketPromedio: moneda(r.ticketPromedio),
                })));
            } else {
                pdf.setFontSize(9);
                pdf.setTextColor(...C.gris);
                pdf.text('Sin datos para el periodo seleccionado.', 14, y);
                y += 10;
            }

            // Seccion: Top productos
            if (y + 20 > 270) { pdf.addPage(); y = 20; }
            y = encabezadoSeccion(pdf, 'Top 10 Productos', '+', y);

            if (estado.datosTop.length) {
                y = tabla(pdf, y, [
                    { header: '#', key: 'posicion', pct: 0.06, align: 'center' },
                    { header: 'Producto', key: 'nombre', pct: 0.30 },
                    { header: 'Tipo', key: 'tipo', pct: 0.12, align: 'center' },
                    { header: 'Unidades', key: 'unidadesVendidas', pct: 0.12, align: 'center' },
                    {
                        header: 'Ingresos', key: 'ingresos', pct: 0.18, align: 'right',
                        colorFn: () => C.verde
                    },
                    {
                        header: 'Ganancia', key: 'ganancia', pct: 0.12, align: 'right',
                        colorFn: v => parseFloat(v) >= 0 ? C.verde : C.rojo
                    },
                    { header: 'Margen %', key: 'margenPct', pct: 0.10, align: 'right' },
                ], estado.datosTop.map(r => ({
                    ...r,
                    ingresos: moneda(r.ingresos),
                    ganancia: moneda(r.ganancia),
                    margenPct: `${r.margenPct}%`,
                })));
            }

            // Seccion: Stock critico
            const stockItems = estado._stockItems || [];
            if (stockItems.length) {
                if (y + 20 > 270) { pdf.addPage(); y = 20; }
                y = encabezadoSeccion(pdf, 'Stock Critico', '!', y);

                y = tabla(pdf, y, [
                    { header: 'Producto', key: 'nombre', pct: 0.45 },
                    { header: 'Tipo', key: 'tipo', pct: 0.15, align: 'center' },
                    {
                        header: 'Stock', key: 'stock', pct: 0.15, align: 'center',
                        colorFn: v => parseInt(v) === 0 ? C.rojo : C.naranja
                    },
                    {
                        header: 'Estado', key: 'nivel', pct: 0.25, align: 'center',
                        colorFn: v => v === 'agotado' ? C.rojo : C.naranja
                    },
                ], stockItems.map(p => ({
                    ...p,
                    nivel: p.nivel === 'agotado' ? 'AGOTADO' : 'CRITICO',
                })));
            }

            // Seccion: Resumen ejecutivo
            if (estado._kpis) {
                if (y + 40 > 270) { pdf.addPage(); y = 20; }
                y = encabezadoSeccion(pdf, 'Resumen Ejecutivo', '>', y);

                const kpis = [
                    ['Total de ventas', fmt(estado._kpis.totalVentas)],
                    ['Ventas completadas', fmt(estado._kpis.completadas)],
                    ['Ventas canceladas', fmt(estado._kpis.canceladas)],
                    ['Ingresos totales', moneda(estado._kpis.totalIngresos)],
                    ['Ticket promedio', moneda(estado._kpis.ticketPromedio)],
                    ['Tasa de cancelacion', `${estado._kpis.tasaCancelacion}%`],
                    ['Producto estrella', estado._kpis.productoEstrella || '--'],
                    ['Agrupacion del reporte', estado.agrupacion],
                ];

                // Tabla de 2 columnas: col izq y col der
                const labelW = 55, valW = 35, gapCol = 8;
                const xDer = 14 + labelW + valW + gapCol;

                kpis.forEach(([label, val], i) => {
                    const fila = Math.floor(i / 2);
                    const col = i % 2;
                    const baseX = col === 0 ? 14 : xDer;
                    const ry = y + fila * 9;

                    pdf.setFontSize(8.5);
                    pdf.setTextColor(...C.gris);
                    pdf.text(label + ':', baseX, ry);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(...C.negro);
                    pdf.text(String(val), baseX + labelW, ry);
                    pdf.setFont('helvetica', 'normal');
                });

                y += Math.ceil(kpis.length / 2) * 9 + 6;
            }

            // Pie de pagina en todas las hojas
            piePagina(pdf, periodo);

            // Guardar
            const nombre = `reporte_cafeteria_${estado.desde}_${estado.hasta}.pdf`;
            pdf.save(nombre);
            Toast.success('PDF generado correctamente');

        } catch (err) {
            console.error('PDFExport error:', err);
            Toast.error('Error al generar PDF: ' + err.message);
        }
    }

    return { generar };

})();