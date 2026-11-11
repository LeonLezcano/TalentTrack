/**
 * TalentTrack Skills & Internal Talent Hunting Engine
 * Manages standard competencies, levels (1-4), hidden previous skills,
 * and multi-criteria talent queries.
 */

export const SKILL_CATEGORIES = {
  OPERACIONES: 'Operaciones & Producción',
  LOGISTICA: 'Logística & Transporte',
  CALIDAD_SEGURIDAD: 'Calidad, BPM & Seguridad',
  ADMIN_DIGITAL: 'Administración & Digital',
  IDIOMAS: 'Idiomas & Comunicación'
};

export const STANDARD_SKILLS = [
  { id: 'bpm', name: 'Buenas Prácticas de Manufactura (BPM)', category: 'CALIDAD_SEGURIDAD' },
  { id: 'haccp', name: 'Análisis de Peligros y Puntos Críticos (HACCP)', category: 'CALIDAD_SEGURIDAD' },
  { id: 'autoelevador', name: 'Operación de Autoelevador / Clark', category: 'OPERACIONES' },
  { id: 'cadena_frio', name: 'Gestión de Cadena de Frío y Cámaras', category: 'OPERACIONES' },
  { id: 'soldadura', name: 'Soldadura TIG / MIG', category: 'OPERACIONES' },
  { id: 'mantenimiento_mec', name: 'Mantenimiento Electromecánico', category: 'OPERACIONES' },
  { id: 'chofer_pesado', name: 'Conducción Camión Pesado / Articulado', category: 'LOGISTICA' },
  { id: 'ruteo_urbano', name: 'Ruteo y Reparto Urbano de Alimentos', category: 'LOGISTICA' },
  { id: 'cargas_peligrosas', name: 'Transporte de Cargas Peligrosas', category: 'LOGISTICA' },
  { id: 'excel_avanzado', name: 'Excel Avanzado / Tablas Dinámicas', category: 'ADMIN_DIGITAL' },
  { id: 'facturacion_erp', name: 'Facturación AFIP y Gestión ERP', category: 'ADMIN_DIGITAL' },
  { id: 'liquidacion_sueldos', name: 'Liquidación de Sueldos y Jornales', category: 'ADMIN_DIGITAL' },
  { id: 'ingles_intermedio', name: 'Inglés Profesional Intermedio/Avanzado', category: 'IDIOMAS' },
  { id: 'primeros_auxilios', name: 'Primeros Auxilios y RCP', category: 'CALIDAD_SEGURIDAD' }
];

export const SKILL_LEVELS = {
  1: { level: 1, label: 'Básico', badgeClass: 'bg-slate-100 text-slate-700' },
  2: { level: 2, label: 'Intermedio', badgeClass: 'bg-blue-100 text-blue-700 font-medium' },
  3: { level: 3, label: 'Avanzado', badgeClass: 'bg-emerald-100 text-emerald-800 font-semibold' },
  4: { level: 4, label: 'Experto / Capacitador', badgeClass: 'bg-purple-100 text-purple-900 font-bold' }
};

export class SkillsEngine {
  /**
   * Searches employees matching requested skills criteria.
   * @param {Array<Object>} employees 
   * @param {Object} query 
   * @param {Array<string>} [query.requiredSkills=[]] Array of skill names or ids
   * @param {number} [query.minLevel=1]
   * @param {string} [query.sourceFilter='ALL'] 'ALL' | 'PREVIOUS_ONLY' | 'CURRENT_ONLY'
   * @param {string} [query.companyId=null]
   * @returns {Array<{ employee: Object, matchScore: number, matchedSkills: Array<Object> }>}
   */
  static searchTalent(employees = [], query = {}) {
    const {
      requiredSkills = [],
      minLevel = 1,
      sourceFilter = 'ALL',
      companyId = null,
      freeText = ''
    } = query;

    const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim()).filter(Boolean);
    const normalizedFreeText = freeText ? freeText.toLowerCase().trim() : '';

    const results = [];

    employees.forEach(emp => {
      if (companyId && emp.companyId !== companyId) return;

      const empSkills = emp.skills || [];
      const matchedSkills = [];

      empSkills.forEach(skill => {
        // Filtro por fuente (actual vs experiencia previa)
        if (sourceFilter === 'PREVIOUS_ONLY' && skill.source !== 'PREVIOUS_EXPERIENCE') return;
        if (sourceFilter === 'CURRENT_ONLY' && skill.source !== 'CURRENT_ROLE') return;

        // Filtro por nivel mínimo
        if ((skill.level || 1) < minLevel) return;

        const skillNameLower = (skill.name || '').toLowerCase();
        const skillIdLower = (skill.id || '').toLowerCase();

        // Si se especificaron skills requeridas
        if (normalizedRequired.length > 0) {
          const matchFound = normalizedRequired.some(req => 
            skillNameLower.includes(req) || skillIdLower.includes(req)
          );
          if (matchFound) {
            matchedSkills.push(skill);
          }
        } else if (normalizedFreeText) {
          // Búsqueda libre
          if (
            skillNameLower.includes(normalizedFreeText) ||
            (skill.notes && skill.notes.toLowerCase().includes(normalizedFreeText)) ||
            (emp.role && emp.role.toLowerCase().includes(normalizedFreeText))
          ) {
            matchedSkills.push(skill);
          }
        } else {
          // Si no hay filtro, incluye todas
          matchedSkills.push(skill);
        }
      });

      // Calcular match score
      let matchScore = 0;
      if (normalizedRequired.length > 0) {
        if (matchedSkills.length > 0) {
          matchScore = Math.round((matchedSkills.length / normalizedRequired.length) * 100);
          results.push({
            employee: emp,
            matchScore: Math.min(matchScore, 100),
            matchedSkills
          });
        }
      } else if (normalizedFreeText) {
        if (matchedSkills.length > 0) {
          results.push({
            employee: emp,
            matchScore: 100,
            matchedSkills
          });
        }
      } else {
        // Retornar los que tengan skills coincidentes con los filtros aplicados
        if (matchedSkills.length > 0) {
          results.push({
            employee: emp,
            matchScore: 100,
            matchedSkills
          });
        }
      }
    });

    return results.sort((a, b) => b.matchScore - a.matchScore || b.matchedSkills.length - a.matchedSkills.length);
  }
}
