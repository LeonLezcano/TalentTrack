/**
 * TalentTrack Training & LMS Engine
 * Coordinates course scheduling, mandatory position requirements,
 * dual digital signature capture (trainer + attendees) and legajo certification sync.
 */

export const TRAINING_CATEGORIES = {
  ALIMENTOS_BPM: { label: 'BPM & Inocuidad de Alimentos', color: 'bg-emerald-100 text-emerald-800' },
  SEGURIDAD_HIGIENE: { label: 'Seguridad e Higiene Laboral', color: 'bg-amber-100 text-amber-900' },
  MANEJO_DEFENSIVO: { label: 'Manejo Defensivo y Seguridad Vial', color: 'bg-blue-100 text-blue-800' },
  TECNICO_OPERATIVO: { label: 'Técnico & Operaciones Industriales', color: 'bg-indigo-100 text-indigo-800' },
  CALIDAD_ISO: { label: 'Normas de Calidad & Procesos', color: 'bg-purple-100 text-purple-900' }
};

export class TrainingEngine {
  /**
   * Evaluates mandatory training compliance for an employee based on their job role.
   * @param {Object} employee 
   * @param {Array<Object>} allCourses 
   * @returns {{ completedCount: number, pendingCount: number, requirements: Array<Object> }}
   */
  static evaluateEmployeeCompliance(employee, allCourses = []) {
    const roleRequirements = this.getMandatoryRequirementsForRole(employee.role);
    const completedRequirements = [];
    const pendingRequirements = [];

    roleRequirements.forEach(req => {
      // Verificar si el empleado tiene un curso completado y firmado correspondiente a este requisito
      const hasCompleted = allCourses.some(course => {
        if (course.status !== 'COMPLETED') return false;
        if (course.category !== req.category && course.id !== req.courseId) return false;
        
        const participant = (course.participants || []).find(p => p.employeeId === employee.id);
        return participant && participant.attended && participant.passed && participant.signature;
      });

      if (hasCompleted) {
        completedRequirements.push(req);
      } else {
        pendingRequirements.push(req);
      }
    });

    return {
      completedCount: completedRequirements.length,
      pendingCount: pendingRequirements.length,
      complianceRate: roleRequirements.length > 0
        ? Math.round((completedRequirements.length / roleRequirements.length) * 100)
        : 100,
      completedRequirements,
      pendingRequirements
    };
  }

  /**
   * Returns standard mandatory training requirements mapped by job role.
   * @param {string} role 
   * @returns {Array<Object>}
   */
  static getMandatoryRequirementsForRole(role = '') {
    const r = (role || '').toLowerCase();
    const reqs = [];

    if (r.includes('chofer') || r.includes('reparto') || r.includes('conductor') || r.includes('distribucion')) {
      reqs.push({
        id: 'req_manejo_defensivo',
        title: 'Curso de Manejo Defensivo y Seguridad Vial',
        category: 'MANEJO_DEFENSIVO',
        periodicityMonths: 12
      });
      reqs.push({
        id: 'req_cargas_generales',
        title: 'Estiba Segura y Sujeción de Cargas',
        category: 'SEGURIDAD_HIGIENE',
        periodicityMonths: 24
      });
    }

    if (r.includes('alimento') || r.includes('planta') || r.includes('operario') || r.includes('elaboracion') || r.includes('frigorifico')) {
      reqs.push({
        id: 'req_bpm_anual',
        title: 'Buenas Prácticas de Manufactura (BPM) y POES',
        category: 'ALIMENTOS_BPM',
        periodicityMonths: 12
      });
      reqs.push({
        id: 'req_epp_quimicos',
        title: 'Uso de EPP y Manejo Seguro de Sanitizantes',
        category: 'SEGURIDAD_HIGIENE',
        periodicityMonths: 12
      });
    }

    if (r.includes('autoelevador') || r.includes('clark') || r.includes('deposito')) {
      reqs.push({
        id: 'req_autoelevadores_seguros',
        title: 'Operación Segura de Autoelevadores (Res. SRT 960/15)',
        category: 'TECNICO_OPERATIVO',
        periodicityMonths: 12
      });
    }

    // Inducción general para todo puesto
    if (reqs.length === 0) {
      reqs.push({
        id: 'req_induccion_seguridad',
        title: 'Inducción General a la Seguridad e Higiene Laboral',
        category: 'SEGURIDAD_HIGIENE',
        periodicityMonths: 24
      });
    }

    return reqs;
  }
}
