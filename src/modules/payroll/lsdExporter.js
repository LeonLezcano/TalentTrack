/**
 * lsdExporter.js - Exportador Normativo de Libro de Sueldos Digital (LSD ARCA / AFIP)
 * Conforme a la Resolución General AFIP 3781 y especificación técnica de archivo plano de 500 bytes.
 */

export const LsdExporter = {
  /**
   * Genera el archivo plano de texto con longitud fija de 500 caracteres por línea.
   * 
   * @param {Object} company - Datos de la empresa con CUIT
   * @param {Object} payrollRun - Corrida de liquidación con período y recibos
   * @returns {string} Contenido del archivo de texto para importar en ARCA
   */
  generateLsdText(company, payrollRun) {
    if (!company || !payrollRun || !payrollRun.payslips) {
      throw new Error('Datos insuficientes para generar Libro de Sueldos Digital.');
    }

    const lines = [];
    const cuitClean = (company.cuit || '30714589234').replace(/\D/g, '').padEnd(11, '0').slice(0, 11);
    
    // Período AAAAMM
    const periodRaw = payrollRun.period || '2026-11';
    const periodYm = periodRaw.replace(/\D/g, '').slice(0, 6);

    const tipoLiq = payrollRun.periodType === 'SAC' ? 'S' : (payrollRun.periodType?.startsWith('BIWEEKLY') ? 'Q' : 'M');
    const nroLiq = String(payrollRun.runNumber || 1).padStart(5, '0');

    // --- REGISTRO 01: Carátula de Liquidación (500 bytes) ---
    let reg01 = '01';
    reg01 += cuitClean; // Pos 3-13: CUIT Empleador (11)
    reg01 += periodYm;  // Pos 14-19: Período (6)
    reg01 += tipoLiq;   // Pos 20: Tipo Liquidación (1)
    reg01 += nroLiq;    // Pos 21-25: Número Liquidación (5)
    reg01 += ' '.repeat(500 - reg01.length);
    lines.push(reg01);

    // Iterar por cada recibo de la liquidación
    for (const payslip of payrollRun.payslips) {
      const cuilClean = (payslip.cuil || payslip.dni || '20324589124').replace(/\D/g, '').padEnd(11, '0').slice(0, 11);

      // --- REGISTRO 02: Datos del Trabajador & Bases Imponibles (500 bytes) ---
      let reg02 = '02';
      reg02 += cuilClean;   // Pos 3-13: CUIL Trabajador (11)
      reg02 += '001';       // Pos 14-16: Situación de Revista (001 Activo)
      reg02 += '001';       // Pos 17-19: Condición (001 Servicios Comunes)
      reg02 += '049';       // Pos 20-22: Actividad
      reg02 += '000';       // Pos 23-25: Zona
      reg02 += '008';       // Pos 26-28: Modalidad Contratación (008 T. Indeterminado)

      // Montos en centavos con ceros a la izquierda (12 caracteres: 10 enteros + 2 decimales)
      const formatMonto12 = (num) => Math.round((Number(num) || 0) * 100).toString().padStart(12, '0');

      reg02 += formatMonto12(payslip.totalBruto);        // Remuneración Total
      reg02 += formatMonto12(payslip.totalRemunerativo);  // Base Imponible 1 (SIPA)
      reg02 += formatMonto12(payslip.totalRemunerativo);  // Base Imponible 2 (INSSJyP)
      reg02 += formatMonto12(payslip.totalRemunerativo);  // Base Imponible 3 (FNE)
      reg02 += formatMonto12(payslip.totalRemunerativo);  // Base Imponible 4 (Obra Social)
      reg02 += formatMonto12(payslip.totalRemunerativo);  // Base Imponible 5 (ART)
      reg02 += ' '.repeat(500 - reg02.length);
      lines.push(reg02);

      // --- REGISTRO 03: Detalle de Conceptos Liquidados (500 bytes cada uno) ---
      for (const item of payslip.items) {
        let reg03 = '03';
        reg03 += cuilClean; // Pos 3-13: CUIL (11)
        reg03 += (item.code || '1000').padEnd(10, ' ').slice(0, 10); // Código Concepto (10)
        reg03 += String(Math.round(item.quantity || 1)).padStart(5, '0'); // Cantidad (5)

        // Tipo: D (Débito/Descuento/Retención) / C (Crédito/Remunerativo) / N (No Remunerativo)
        let tipoConcepto = 'C';
        if (item.type === 'RETENCION') tipoConcepto = 'D';
        else if (item.type === 'NO_REMUNERATIVO') tipoConcepto = 'N';

        reg03 += tipoConcepto;
        // Importe en 15 dígitos (13 enteros + 2 decimales)
        const formatMonto15 = (num) => Math.round((Number(num) || 0) * 100).toString().padStart(15, '0');
        reg03 += formatMonto15(item.amount);
        reg03 += ' '.repeat(500 - reg03.length);
        lines.push(reg03);
      }

      // --- REGISTRO 04: Totales de la Liquidación del Empleado (500 bytes) ---
      let reg04 = '04';
      reg04 += cuilClean;
      const formatMonto15 = (num) => Math.round((Number(num) || 0) * 100).toString().padStart(15, '0');
      reg04 += formatMonto15(payslip.totalNeto);
      reg04 += ' '.repeat(500 - reg04.length);
      lines.push(reg04);
    }

    return lines.join('\r\n') + '\r\n';
  },

  /**
   * Dispara la descarga del archivo en el navegador
   */
  downloadLsdFile(company, payrollRun, filename = null) {
    const content = this.generateLsdText(company, payrollRun);
    const fname = filename || `LSD_${company.cuit || 'CUIT'}_${payrollRun.period || '202611'}.txt`;
    const blob = new Blob([content], { type: 'text/plain;charset=ISO-8859-1' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return content;
  }
};
