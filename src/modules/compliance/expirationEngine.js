/**
 * TalentTrack Compliance & Expiration Engine
 * Calculates traffic light compliance statuses (30, 15, 7 days alert threshold),
 * manages credential types, and generates audit reports.
 */

export const CREDENTIAL_TYPES = {
  DRIVER_LICENSE: {
    id: 'DRIVER_LICENSE',
    label: 'Carnet de Conducir',
    categories: ['A (Moto)', 'B (Auto/Camioneta)', 'C (Camión sin acoplado)', 'D (Pasajeros)', 'E (Articulados/Acoplado)', 'LNH (CNRT Cargas Generales)', 'LNH (CNRT Peligrosas)'],
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  FOOD_HANDLER_BPM: {
    id: 'FOOD_HANDLER_BPM',
    label: 'Libreta Sanitaria / BPM (Alimentos)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  MEDICAL_ART: {
    id: 'MEDICAL_ART',
    label: 'Examen Ocupacional / Apto ART',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  FORKLIFT_OPERATOR: {
    id: 'FORKLIFT_OPERATOR',
    label: 'Habilitación Autoelevador',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  WORK_AT_HEIGHT: {
    id: 'WORK_AT_HEIGHT',
    label: 'Trabajo en Altura (Seg. e Higiene)',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  OTHER: {
    id: 'OTHER',
    label: 'Certificación Especial',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200'
  }
};

export const STATUS_LEVELS = {
  EXPIRED: {
    code: 'EXPIRED',
    label: 'VENCIDO',
    badgeClass: 'bg-red-500 text-white font-bold animate-pulse',
    color: '#ef4444',
    severity: 4
  },
  URGENT: {
    code: 'URGENT',
    label: 'CRÍTICO (< 7 DÍAS)',
    badgeClass: 'bg-rose-500 text-white font-semibold',
    color: '#f43f5e',
    severity: 3
  },
  WARNING_HIGH: {
    code: 'WARNING_HIGH',
    label: 'ALERTA (< 15 DÍAS)',
    badgeClass: 'bg-orange-500 text-white font-semibold',
    color: '#f97316',
    severity: 2
  },
  WARNING_MEDIUM: {
    code: 'WARNING_MEDIUM',
    label: 'ATENCIÓN (< 30 DÍAS)',
    badgeClass: 'bg-amber-400 text-amber-950 font-semibold',
    color: '#fbbf24',
    severity: 1
  },
  VALID: {
    code: 'VALID',
    label: 'VIGENTE',
    badgeClass: 'bg-emerald-500 text-white font-medium',
    color: '#10b981',
    severity: 0
  },
  NOT_APPLICABLE: {
    code: 'NOT_APPLICABLE',
    label: 'NO DEFINIDO',
    badgeClass: 'bg-slate-400 text-white',
    color: '#94a3b8',
    severity: -1
  }
};

export class ExpirationEngine {
  /**
   * Computes the days remaining until an expiration date and assigns a traffic-light status.
   * @param {string|Date} dateStr 
   * @param {Date} [referenceDate=new Date()]
   * @returns {{ daysRemaining: number, status: typeof STATUS_LEVELS[keyof typeof STATUS_LEVELS], formattedDate: string }}
   */
  static evaluateDate(dateStr, referenceDate = new Date()) {
    if (!dateStr) {
      return {
        daysRemaining: null,
        status: STATUS_LEVELS.NOT_APPLICABLE,
        formattedDate: 'Sin fecha'
      };
    }

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return {
        daysRemaining: null,
        status: STATUS_LEVELS.NOT_APPLICABLE,
        formattedDate: 'Fecha inválida'
      };
    }

    // Normalizar a medianoche local para cálculo exacto de días
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

    const diffMs = targetMidnight.getTime() - refMidnight.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let status = STATUS_LEVELS.VALID;
    if (daysRemaining < 0) {
      status = STATUS_LEVELS.EXPIRED;
    } else if (daysRemaining <= 7) {
      status = STATUS_LEVELS.URGENT;
    } else if (daysRemaining <= 15) {
      status = STATUS_LEVELS.WARNING_HIGH;
    } else if (daysRemaining <= 30) {
      status = STATUS_LEVELS.WARNING_MEDIUM;
    } else {
      status = STATUS_LEVELS.VALID;
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');

    return {
      daysRemaining,
      status,
      formattedDate: `${dd}/${mm}/${yyyy}`
    };
  }

  /**
   * Scans a list of employees and extracts all active warnings / expired credentials.
   * @param {Array<Object>} employees 
   * @param {Date} [referenceDate=new Date()]
   * @returns {Array<Object>} List of alert objects sorted by highest severity
   */
  static scanAlerts(employees = [], referenceDate = new Date()) {
    const alerts = [];

    employees.forEach(emp => {
      if (!emp.credentials || !Array.isArray(emp.credentials)) return;

      emp.credentials.forEach(cred => {
        const evalResult = this.evaluateDate(cred.expirationDate, referenceDate);
        if (evalResult.status.severity > 0 || evalResult.status.code === 'EXPIRED') {
          alerts.push({
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            employeeRole: emp.role || 'Empleado',
            companyId: emp.companyId,
            credentialId: cred.id,
            credentialType: cred.type,
            credentialLabel: CREDENTIAL_TYPES[cred.type]?.label || cred.customLabel || 'Habilitación',
            categories: cred.categories || [],
            expirationDate: cred.expirationDate,
            formattedDate: evalResult.formattedDate,
            daysRemaining: evalResult.daysRemaining,
            status: evalResult.status
          });
        }
      });
    });

    return alerts.sort((a, b) => b.status.severity - a.status.severity || a.daysRemaining - b.daysRemaining);
  }
}
