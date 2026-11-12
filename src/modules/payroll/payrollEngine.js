/**
 * payrollEngine.js - Motor de Liquidación de Sueldos Multiconvenio (AiAppFactory Standard)
 * Conforme a la Ley de Contrato de Trabajo (LCT 20.744), normativas de seguridad social de Argentina
 * y escalas de los 5 CCTs más importantes.
 */

import { CCT_CATALOG, LEGAL_DEDUCTIONS, EMPLOYER_CONTRIBUTIONS } from './cctCatalog.js';
import { LeaveEngine } from '../leaves/leaveEngine.js';

export const PERIOD_TYPES = {
  MONTHLY: { code: 'MONTHLY', label: 'Mensual Normal', codeAfip: 'M' },
  BIWEEKLY_1: { code: 'BIWEEKLY_1', label: '1ª Quincena (Jornalizados)', codeAfip: 'Q1' },
  BIWEEKLY_2: { code: 'BIWEEKLY_2', label: '2ª Quincena (Jornalizados)', codeAfip: 'Q2' },
  SAC: { code: 'SAC', label: 'Aguinaldo (SAC Semestral)', codeAfip: 'S' },
  VACATION: { code: 'VACATION', label: 'Liquidación Adelanto Vacaciones', codeAfip: 'V' }
};

// Tope de base imponible mensual SIPA de ARCA (tope de referencia actualizado)
export const ARCA_MAX_TAXABLE_BASE = 2950000;

export const PayrollEngine = {
  /**
   * Liquida los haberes de un colaborador para un período determinado.
   */
  calculateEmployeePayroll({ employee, period, cctConfig = null, novedades = {}, leaves = [] }) {
    if (!employee) throw new Error('Colaborador inválido para liquidación.');
    
    // Obtener configuración de convenio
    const cctKey = employee.cctId || 'CCT_130_75';
    const baseCct = CCT_CATALOG[cctKey] || CCT_CATALOG.CCT_130_75;
    const cct = cctConfig ? { ...baseCct, ...cctConfig } : baseCct;

    // Buscar categoría salarial del empleado
    const catId = employee.cctCategoryId || (cct.categories[0] ? cct.categories[0].id : null);
    const category = cct.categories.find(c => c.id === catId) || cct.categories[0] || { basicSalary: 850000 };

    const basicSalary = Number(category.basicSalary) || 850000;
    const hourlyRate = Number(category.hourlyRate) || Math.round(basicSalary / 176);

    // Antigüedad en años
    const entitlement = LeaveEngine.calculateVacationEntitlement(employee.hireDate, new Date().getFullYear());
    const yearsSeniority = entitlement.yearsOfSeniority || 0;

    const periodType = period.type || 'MONTHLY';
    const isQuincenal = periodType === 'BIWEEKLY_1' || periodType === 'BIWEEKLY_2';
    const isSac = periodType === 'SAC';

    const items = [];

    // --- 1. Haberes Remunerativos ---
    let sueldoBasicoPeriodo = basicSalary;
    if (isQuincenal) {
      const horasTrabajadas = Number(novedades.workedHours) || cct.rules.hoursPerQuincenaDefault || 88;
      sueldoBasicoPeriodo = hourlyRate * horasTrabajadas;
      items.push({
        code: '1000',
        afipCode: '010000',
        description: `Jornal Quincenal (${horasTrabajadas} hs)`,
        type: 'REMUNERATIVO',
        quantity: horasTrabajadas,
        amount: Math.round(sueldoBasicoPeriodo)
      });
    } else if (isSac) {
      // SAC: 50% de la mejor remuneración
      const baseSac = Number(novedades.bestHalfYearSalary) || basicSalary;
      const daysWorkedSemester = Math.min(180, Number(novedades.semesterDaysWorked) || 180);
      sueldoBasicoPeriodo = Math.round((baseSac / 2) * (daysWorkedSemester / 180));
      items.push({
        code: '1050',
        afipCode: '010050',
        description: `Sueldo Anual Complementario (SAC ${period.periodStr || ''})`,
        type: 'REMUNERATIVO',
        quantity: daysWorkedSemester,
        amount: sueldoBasicoPeriodo
      });
    } else {
      // Mensual regular
      items.push({
        code: '1000',
        afipCode: '010000',
        description: `Sueldo Básico (${category.label})`,
        type: 'REMUNERATIVO',
        quantity: 30,
        amount: Math.round(basicSalary)
      });
    }

    // Antigüedad (si no es SAC puro)
    if (!isSac) {
      const antigPct = (cct.rules.antiguedadPctPerYear || 0.01) * yearsSeniority;
      if (antigPct > 0) {
        const montoAntig = Math.round(sueldoBasicoPeriodo * antigPct);
        items.push({
          code: '1010',
          afipCode: '010010',
          description: `Antigüedad (${yearsSeniority} años - ${(antigPct * 100).toFixed(1)}%)`,
          type: 'REMUNERATIVO',
          quantity: yearsSeniority,
          amount: montoAntig
        });
      }

      // Presentismo / Asistencia
      const presentismoPct = cct.rules.presentismoPct || cct.rules.presentismoPerfectoPct || cct.rules.asistenciaMensualPct || (isQuincenal ? cct.rules.asistenciaQuincenalPct : 0);
      const hasUnjustifiedAbsences = (Number(novedades.unjustifiedAbsenceDays) || 0) > 0;
      if (presentismoPct > 0 && !hasUnjustifiedAbsences) {
        const subtotalBase = sueldoBasicoPeriodo * (1 + (cct.rules.antiguedadPctPerYear || 0.01) * yearsSeniority);
        const montoPresentismo = Math.round(subtotalBase * presentismoPct);
        items.push({
          code: '1020',
          afipCode: '010020',
          description: `Presentismo / Asistencia (${(presentismoPct * 100).toFixed(2)}%)`,
          type: 'REMUNERATIVO',
          quantity: 1,
          amount: montoPresentismo
        });
      }

      // Adicionales específicos según CCT
      if (cct.rules.adicionalCamaraPct && (novedades.workedInColdChamber || employee.worksInColdChamber)) {
        const montoCamara = Math.round(sueldoBasicoPeriodo * cct.rules.adicionalCamaraPct);
        items.push({
          code: '1030',
          afipCode: '010030',
          description: 'Adicional Trabajo en Cámara de Frío (12%)',
          type: 'REMUNERATIVO',
          quantity: 1,
          amount: montoCamara
        });
      }

      if (cct.rules.adicionalTituloTecnicoPct && employee.hasTechnicalDegree) {
        const montoTitulo = Math.round(sueldoBasicoPeriodo * cct.rules.adicionalTituloTecnicoPct);
        items.push({
          code: '1035',
          afipCode: '010035',
          description: 'Adicional Título Secundario Técnico (8%)',
          type: 'REMUNERATIVO',
          quantity: 1,
          amount: montoTitulo
        });
      }

      if (cct.rules.plusDescargaPct && novedades.performedUnloading) {
        const montoDescarga = Math.round(sueldoBasicoPeriodo * cct.rules.plusDescargaPct);
        items.push({
          code: '1038',
          afipCode: '010038',
          description: 'Plus Control y Descarga en Ruta (10%)',
          type: 'REMUNERATIVO',
          quantity: 1,
          amount: montoDescarga
        });
      }

      const kmRecorridos = Number(novedades.kmLargaDistancia) || 0;
      if (kmRecorridos > 0 && cct.rules.plusKmLargaDistancia) {
        const montoKm = Math.round(kmRecorridos * cct.rules.plusKmLargaDistancia);
        items.push({
          code: '1039',
          afipCode: '010039',
          description: `Kilómetros Recorridos Larga Distancia (${kmRecorridos} km - Art. 4.2.3)`,
          type: 'REMUNERATIVO',
          quantity: kmRecorridos,
          amount: montoKm
        });
      }

      // Horas Extras al 50%
      const hs50 = Number(novedades.overtimeHours50) || 0;
      if (hs50 > 0) {
        const valorHora = isQuincenal ? hourlyRate : (basicSalary / 200);
        const montoHs50 = Math.round(valorHora * 1.5 * hs50);
        items.push({
          code: '1040',
          afipCode: '010040',
          description: `Horas Extras 50% (${hs50} hs)`,
          type: 'REMUNERATIVO',
          quantity: hs50,
          amount: montoHs50
        });
      }

      // Horas Extras al 100% (Feriados / Domingos)
      const hs100 = Number(novedades.overtimeHours100) || 0;
      if (hs100 > 0) {
        const valorHora = isQuincenal ? hourlyRate : (basicSalary / 200);
        const montoHs100 = Math.round(valorHora * 2.0 * hs100);
        items.push({
          code: '1045',
          afipCode: '010045',
          description: `Horas Extras 100% / Feriados (${hs100} hs)`,
          type: 'REMUNERATIVO',
          quantity: hs100,
          amount: montoHs100
        });
      }

      // Plus Vacacional LCT (Art. 155 LCT: sueldo / 25 vs sueldo / 30)
      const vacDays = Number(novedades.vacationDaysTaken) || 0;
      if (vacDays > 0) {
        // En LCT el día de vacaciones se paga dividiendo por 25 en vez de 30, generando un plus del 20% sobre esos días
        const valorDiaNormal = basicSalary / 30;
        const valorDiaVacacional = basicSalary / 25;
        const plusVacacional = Math.round((valorDiaVacacional - valorDiaNormal) * vacDays);
        items.push({
          code: '1060',
          afipCode: '010060',
          description: `Plus Vacacional LCT (${vacDays} días)`,
          type: 'REMUNERATIVO',
          quantity: vacDays,
          amount: plusVacacional
        });
      }
    }

    // --- 2. Haberes No Remunerativos ---
    if (!isSac) {
      if (cct.rules.viaticoComidaFijo) {
        items.push({
          code: '2010',
          afipCode: '020010',
          description: 'Viático Especial Comida (Art. 4.1.4 CCT 40/89)',
          type: 'NO_REMUNERATIVO',
          quantity: 1,
          amount: Math.round(cct.rules.viaticoComidaFijo)
        });
      }

      const nonTaxableAllowance = Number(novedades.nonTaxableAllowance) || 0;
      if (nonTaxableAllowance > 0) {
        items.push({
          code: '2020',
          afipCode: '020020',
          description: 'Asignación Extraordinaria No Remunerativa Homologada',
          type: 'NO_REMUNERATIVO',
          quantity: 1,
          amount: Math.round(nonTaxableAllowance)
        });
      }
    }

    // Subtotal Remunerativo y No Remunerativo
    const totalRemunerativo = items
      .filter(i => i.type === 'REMUNERATIVO')
      .reduce((acc, i) => acc + i.amount, 0);

    const totalNoRemunerativo = items
      .filter(i => i.type === 'NO_REMUNERATIVO')
      .reduce((acc, i) => acc + i.amount, 0);

    // --- 3. Retenciones de Ley y Descuentos ---
    // Base imponible para SIPA con tope máximo legal de ARCA
    const baseSipa = Math.min(totalRemunerativo, ARCA_MAX_TAXABLE_BASE);

    // Jubilación (11%)
    const jubilacionMonto = Math.round(baseSipa * LEGAL_DEDUCTIONS.JUBILACION.rate);
    items.push({
      code: '5000',
      afipCode: LEGAL_DEDUCTIONS.JUBILACION.afipCode,
      description: LEGAL_DEDUCTIONS.JUBILACION.label,
      type: 'RETENCION',
      quantity: 11,
      amount: jubilacionMonto
    });

    // PAMI / Ley 19.032 (3%)
    const inssjypMonto = Math.round(baseSipa * LEGAL_DEDUCTIONS.INSSJYP.rate);
    items.push({
      code: '5010',
      afipCode: LEGAL_DEDUCTIONS.INSSJYP.afipCode,
      description: LEGAL_DEDUCTIONS.INSSJYP.label,
      type: 'RETENCION',
      quantity: 3,
      amount: inssjypMonto
    });

    // Obra Social (3%)
    const obraSocialMonto = Math.round(baseSipa * LEGAL_DEDUCTIONS.OBRA_SOCIAL.rate);
    items.push({
      code: '5020',
      afipCode: LEGAL_DEDUCTIONS.OBRA_SOCIAL.afipCode,
      description: LEGAL_DEDUCTIONS.OBRA_SOCIAL.label,
      type: 'RETENCION',
      quantity: 3,
      amount: obraSocialMonto
    });

    // Cuota Sindical / Aporte Solidario
    const sindicatoRate = cct.rules.sindicatoPct || 0.02;
    const sindicatoMonto = Math.round(totalRemunerativo * sindicatoRate);
    items.push({
      code: '5030',
      afipCode: '210000',
      description: `Aporte Sindical (${(sindicatoRate * 100).toFixed(1)}%)`,
      type: 'RETENCION',
      quantity: Math.round(sindicatoRate * 100),
      amount: sindicatoMonto
    });

    // Fondo Cese Laboral UOCRA (Ley 22.250)
    if (cct.id === 'CCT_76_75' && cct.rules.fondoCeseLaboralFirstYearPct) {
      const fondoRate = yearsSeniority < 1 ? cct.rules.fondoCeseLaboralFirstYearPct : cct.rules.fondoCeseLaboralNextYearsPct;
      const fondoMonto = Math.round(totalRemunerativo * fondoRate);
      items.push({
        code: '5040',
        afipCode: '220000',
        description: `Fondo de Cese Laboral IERIC Ley 22.250 (${(fondoRate * 100).toFixed(0)}%)`,
        type: 'RETENCION',
        quantity: Math.round(fondoRate * 100),
        amount: fondoMonto
      });
    }

    // Descuento por ausencias injustificadas
    const unjustifiedDays = Number(novedades.unjustifiedAbsenceDays) || 0;
    if (unjustifiedDays > 0) {
      const valorDia = basicSalary / 30;
      const descuentoAusencia = Math.round(valorDia * unjustifiedDays);
      items.push({
        code: '5050',
        afipCode: '310000',
        description: `Descuento Ausencias Injustificadas (${unjustifiedDays} d)`,
        type: 'RETENCION',
        quantity: unjustifiedDays,
        amount: descuentoAusencia
      });
    }

    const totalDescuentos = items
      .filter(i => i.type === 'RETENCION')
      .reduce((acc, i) => acc + i.amount, 0);

    const totalBruto = totalRemunerativo + totalNoRemunerativo;
    const totalNeto = Math.max(0, totalBruto - totalDescuentos);

    // --- 4. Contribuciones Patronales Informativas (F.931) ---
    const sipaPatronal = Math.round(baseSipa * EMPLOYER_CONTRIBUTIONS.SIPAPATRONAL.rate);
    const inssjypPatronal = Math.round(baseSipa * EMPLOYER_CONTRIBUTIONS.INSSJYPPATRONAL.rate);
    const asignacionesPatronal = Math.round(baseSipa * EMPLOYER_CONTRIBUTIONS.ASIGNACIONES.rate);
    const fnePatronal = Math.round(baseSipa * EMPLOYER_CONTRIBUTIONS.FONDO_EMPLEO.rate);
    const obraSocialPatronal = Math.round(baseSipa * EMPLOYER_CONTRIBUTIONS.OBRA_SOCIAL_PATRONAL.rate);
    const artPatronal = Math.round(totalRemunerativo * EMPLOYER_CONTRIBUTIONS.ART_ESTIMADA.rate);
    const seguroVidaPatronal = EMPLOYER_CONTRIBUTIONS.SEGURO_VIDA.fixedPerEmp;

    const totalContribucionesPatronales = sipaPatronal + inssjypPatronal + asignacionesPatronal +
      fnePatronal + obraSocialPatronal + artPatronal + seguroVidaPatronal;

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      cuil: employee.cuil || employee.dni || '20-00000000-0',
      role: employee.role,
      hireDate: employee.hireDate,
      cctId: cct.id,
      cctName: cct.name,
      cctCategory: category.label,
      bank: employee.bank || 'Banco de la Nación Argentina',
      cbu: employee.cbu || '0110599540000012345678',
      periodStr: period.periodStr || '2026-11',
      periodType,
      items,
      totalRemunerativo,
      totalNoRemunerativo,
      totalBruto,
      totalDescuentos,
      totalNeto,
      netoInWords: this.numberToSpanishWords(totalNeto),
      employerContributions: {
        sipaPatronal,
        inssjypPatronal,
        asignacionesPatronal,
        fnePatronal,
        obraSocialPatronal,
        artPatronal,
        seguroVidaPatronal,
        total: totalContribucionesPatronales
      }
    };
  },

  /**
   * Convierte un monto numérico a palabras en español para el recibo legal.
   */
  numberToSpanishWords(amount) {
    if (isNaN(amount) || amount === 0) return 'Cero pesos con 00/100';

    const entero = Math.floor(amount);
    const centavos = Math.round((amount - entero) * 100);
    const centavosStr = centavos < 10 ? `0${centavos}` : `${centavos}`;

    function _convertGroup(n) {
      const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
      const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
      const especiales = {
        11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
        16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
        21: 'veintiún', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
        25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve'
      };
      const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

      if (n === 100) return 'cien';
      let res = '';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;

      if (c > 0) res += centenas[c] + ' ';

      const resto = n % 100;
      if (especiales[resto]) {
        res += especiales[resto];
      } else {
        if (d > 0) {
          res += decenas[d];
          if (u > 0) res += ' y ' + unidades[u];
        } else if (u > 0) {
          res += unidades[u];
        }
      }
      return res.trim();
    }

    let millones = Math.floor(entero / 1000000);
    let miles = Math.floor((entero % 1000000) / 1000);
    let unidades = entero % 1000;

    let partes = [];
    if (millones > 0) {
      partes.push(millones === 1 ? 'un millón' : `${_convertGroup(millones)} millones`);
    }
    if (miles > 0) {
      partes.push(miles === 1 ? 'mil' : `${_convertGroup(miles)} mil`);
    }
    if (unidades > 0) {
      partes.push(_convertGroup(unidades));
    }

    const texto = partes.join(' ');
    const capitalize = texto.charAt(0).toUpperCase() + texto.slice(1);
    return `${capitalize} pesos con ${centavosStr}/100`;
  }
};
