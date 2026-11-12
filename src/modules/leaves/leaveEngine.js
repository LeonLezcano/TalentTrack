/**
 * LeaveEngine - Motor Normativo de Vacaciones, Licencias y Ausentismo
 * Basado en la Ley de Contrato de Trabajo de Argentina (LCT 20.744) y normativas laborales de LatAm.
 */

export const LEAVE_TYPES = {
  VACATION: {
    code: 'VACATION',
    label: 'Vacaciones Ordinarias',
    icon: '🏖️',
    isPaid: true,
    requiresCertificate: false,
    description: 'Descanso anual remunerado según antigüedad (Art. 150 LCT).'
  },
  MEDICAL: {
    code: 'MEDICAL',
    label: 'Licencia Médica / Enfermedad',
    icon: '🩺',
    isPaid: true,
    requiresCertificate: true,
    description: 'Enfermedad inculpable o accidente con certificado médico obligatorio (Art. 208 LCT).'
  },
  MATERNITY_PATERNITY: {
    code: 'MATERNITY_PATERNITY',
    label: 'Maternidad / Nacimiento',
    icon: '👶',
    isPaid: true,
    requiresCertificate: true,
    description: 'Licencia especial por nacimiento de hijo/a.'
  },
  BEREAVEMENT: {
    code: 'BEREAVEMENT',
    label: 'Duelo Familiar',
    icon: '🕯️',
    isPaid: true,
    requiresCertificate: true,
    description: 'Fallecimiento de cónyuge, hijos o padres (3 días corr.) o hermanos (1 día).'
  },
  STUDY_EXAM: {
    code: 'STUDY_EXAM',
    label: 'Examen de Estudio',
    icon: '🎓',
    isPaid: true,
    requiresCertificate: true,
    description: 'Examen en enseñanza media o universitaria (hasta 2 días por examen, máx. 10 al año).'
  },
  UNPAID_SPECIAL: {
    code: 'UNPAID_SPECIAL',
    label: 'Licencia Sin Goce de Sueldo',
    icon: '📋',
    isPaid: false,
    requiresCertificate: false,
    description: 'Permiso acordado entre las partes sin remuneración.'
  }
};

export const LEAVE_STATUS = {
  PENDING: {
    code: 'PENDING',
    label: 'Pendiente de Aprobación',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200'
  },
  APPROVED: {
    code: 'APPROVED',
    label: 'Aprobada',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Rechazada',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200'
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Cancelada',
    badgeClass: 'bg-slate-50 text-slate-600 border border-slate-200'
  }
};

export const LeaveEngine = {
  /**
   * Calcula los días corridos de vacaciones anuales que le corresponden a un empleado
   * según su fecha de ingreso y la antigüedad al 31 de diciembre del año en curso (Art. 150 LCT).
   * 
   * - Menor a 5 años: 14 días corridos
   * - De 5 a menos de 10 años: 21 días corridos
   * - De 10 a menos de 20 años: 28 días corridos
   * - Más de 20 años: 35 días corridos
   * 
   * @param {string} hireDateStr - Fecha de ingreso (YYYY-MM-DD)
   * @param {number} [targetYear] - Año a calcular (por defecto año actual)
   * @returns {{yearsOfSeniority: number, totalEntitledDays: number}}
   */
  calculateVacationEntitlement(hireDateStr, targetYear = new Date().getFullYear()) {
    if (!hireDateStr) return { yearsOfSeniority: 0, totalEntitledDays: 0 };

    const hireDate = new Date(hireDateStr);
    const cutoffDate = new Date(targetYear, 11, 31); // 31 de diciembre

    let diffYears = cutoffDate.getFullYear() - hireDate.getFullYear();
    const m = cutoffDate.getMonth() - hireDate.getMonth();
    if (m < 0 || (m === 0 && cutoffDate.getDate() < hireDate.getDate())) {
      diffYears--;
    }

    const years = Math.max(0, diffYears);

    let days = 14;
    if (years >= 20) {
      days = 35;
    } else if (years >= 10) {
      days = 28;
    } else if (years >= 5) {
      days = 21;
    } else {
      days = 14;
    }

    return {
      yearsOfSeniority: years,
      totalEntitledDays: days
    };
  },

  /**
   * Calcula la cantidad de días entre dos fechas (inclusive)
   */
  calculateDaysBetween(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  },

  /**
   * Calcula el balance de vacaciones de un colaborador
   * 
   * @param {Object} employee - Colaborador con hireDate
   * @param {Array} leaves - Listado de licencias del colaborador
   * @param {number} [year] - Año evaluado
   */
  calculateVacationBalance(employee, leaves = [], year = new Date().getFullYear()) {
    const entitlement = this.calculateVacationEntitlement(employee.hireDate, year);
    
    // Sumar días aprobados de tipo VACATION para el período
    const approvedVacations = leaves.filter(l => 
      l.employeeId === employee.id &&
      l.type === 'VACATION' &&
      l.status === 'APPROVED' &&
      new Date(l.startDate).getFullYear() === year
    );

    const takenDays = approvedVacations.reduce((sum, l) => sum + (l.days || 0), 0);
    const remainingDays = Math.max(0, entitlement.totalEntitledDays - takenDays);

    return {
      year,
      totalEntitledDays: entitlement.totalEntitledDays,
      takenDays,
      remainingDays,
      yearsOfSeniority: entitlement.yearsOfSeniority
    };
  },

  /**
   * Evalúa si una nueva solicitud se solapa con una licencia existente aprobada o pendiente
   */
  hasOverlap(existingLeaves, employeeId, startDateStr, endDateStr, excludeLeaveId = null) {
    const newStart = new Date(startDateStr).getTime();
    const newEnd = new Date(endDateStr).getTime();

    return existingLeaves.some(leave => {
      if (leave.employeeId !== employeeId) return false;
      if (excludeLeaveId && leave.id === excludeLeaveId) return false;
      if (leave.status === 'REJECTED' || leave.status === 'CANCELLED') return false;

      const exStart = new Date(leave.startDate).getTime();
      const exEnd = new Date(leave.endDate).getTime();

      // Solapamiento: (StartA <= EndB) and (EndA >= StartB)
      return (newStart <= exEnd && newEnd >= exStart);
    });
  }
};
