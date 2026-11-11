/**
 * TalentTrack Universal CSV & Data Exporter (AiAppFactory Standard)
 * Generates standards-compliant CSVs with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility,
 * zero external dependencies, and complete data safety.
 */

export class Exporter {
  /**
   * Triggers a browser download of CSV string.
   * @param {string} csvContent 
   * @param {string} filename 
   */
  static downloadCSV(csvContent, filename) {
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (typeof window !== 'undefined' && window.document) {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return bom + csvContent;
  }

  /**
   * Escapes a single CSV cell according to RFC 4180.
   * @param {any} value 
   * @returns {string}
   */
  static escapeCell(value) {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  }

  /**
   * Generates a CSV export of active employees with their skills and compliance status.
   * @param {Array<Object>} employees 
   * @param {string} [filename='empleados_talenttrack.csv']
   * @returns {string}
   */
  static exportEmployees(employees = [], filename = 'empleados_talenttrack.csv') {
    const headers = [
      'ID',
      'Apellido',
      'Nombre',
      'DNI',
      'Puesto',
      'Departamento',
      'Fecha Ingreso',
      'Email',
      'Teléfono',
      'Cantidad Habilidades',
      'Habilidades Ocultas / Previas',
      'Cantidad Habilitaciones'
    ];

    const rows = employees.map(emp => {
      const prevSkills = (emp.skills || [])
        .filter(s => s.source === 'PREVIOUS_EXPERIENCE')
        .map(s => `${s.name} (Nivel ${s.level})`)
        .join('; ');

      return [
        emp.id,
        emp.lastName,
        emp.firstName,
        emp.dni,
        emp.role,
        emp.department,
        emp.hireDate,
        emp.email,
        emp.phone,
        (emp.skills || []).length,
        prevSkills || 'Ninguna',
        (emp.credentials || []).length
      ].map(this.escapeCell).join(',');
    });

    const csvContent = [headers.map(this.escapeCell).join(','), ...rows].join('\r\n');
    return this.downloadCSV(csvContent, filename);
  }

  /**
   * Generates an official compliance and expiration audit report for SENASA, ART, Tránsito.
   * @param {Array<Object>} alerts 
   * @param {string} [filename='auditoria_vencimientos.csv']
   * @returns {string}
   */
  static exportComplianceAudit(alerts = [], filename = 'auditoria_vencimientos.csv') {
    const headers = [
      'Estado Semáforo',
      'Días Restantes',
      'Colaborador',
      'Puesto',
      'Tipo Habilitación',
      'Categorías / Alcance',
      'Fecha Vencimiento'
    ];

    const rows = alerts.map(a => [
      a.status.label,
      a.daysRemaining !== null ? `${a.daysRemaining} días` : 'N/A',
      a.employeeName,
      a.employeeRole,
      a.credentialLabel,
      (a.categories || []).join(' | ') || 'Estándar',
      a.formattedDate
    ].map(this.escapeCell).join(','));

    const csvContent = [headers.map(this.escapeCell).join(','), ...rows].join('\r\n');
    return this.downloadCSV(csvContent, filename);
  }

  /**
   * Generates an official course attendance register for ISO 9001 / SRT compliance.
   * @param {Object} course 
   * @param {string} [filename=null]
   * @returns {string}
   */
  static exportCourseAttendance(course, filename = null) {
    const targetFilename = filename || `acta_asistencia_${course.id}.csv`;
    const headers = [
      'Curso',
      'Fecha',
      'Instructor',
      'Colaborador',
      'Asistió',
      'Calificación',
      'Estado',
      'Firmado Digitalmente',
      'Hash Forense'
    ];

    const rows = (course.participants || []).map(p => [
      course.title,
      course.date,
      course.instructorName,
      p.employeeName,
      p.attended ? 'SÍ' : 'NO',
      p.score !== null ? String(p.score) : 'S/C',
      p.passed ? 'APROBADO' : 'NO APROBADO',
      p.signature ? 'SÍ (CONFORME)' : 'PENDIENTE',
      p.signatureHash || 'SIN FIRMA'
    ].map(this.escapeCell).join(','));

    const csvContent = [headers.map(this.escapeCell).join(','), ...rows].join('\r\n');
    return this.downloadCSV(csvContent, targetFilename);
  }
}
