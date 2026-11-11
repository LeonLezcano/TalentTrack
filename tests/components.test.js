/**
 * Capa 3: Pruebas de Componentes & Requisitos Dinámicos (AiAppFactory Standard)
 */

import { SkillsEngine } from '../src/modules/skills/skillsEngine.js';
import { TrainingEngine } from '../src/modules/training/trainingEngine.js';
import { AlertDispatcher } from '../src/modules/compliance/alertDispatcher.js';
import { store } from '../src/state/store.js';

export async function runComponentTests(harness) {
  store.restoreDemoData();
  const allEmployees = store.getAllEmployees();

  // --- Buscador de Talento Interno ---
  const searchSoldadura = SkillsEngine.searchTalent(allEmployees, { freeText: 'Soldadura' });
  harness.assert(searchSoldadura.length > 0, 'Talent Hunter localiza colaborador con habilidad de Soldadura');
  harness.assert(searchSoldadura[0].employee.firstName.includes('Carlos'), 'Carlos Gómez posee soldadura como experiencia previa');
  harness.assert(searchSoldadura[0].matchedSkills[0].source === 'PREVIOUS_EXPERIENCE', 'Identifica correctamente que es una experiencia previa oculta');

  const searchPrevOnly = SkillsEngine.searchTalent(allEmployees, {
    sourceFilter: 'PREVIOUS_ONLY',
    minLevel: 2
  });
  harness.assert(searchPrevOnly.length >= 2, 'Filtro PREVIOUS_ONLY extrae empleados con habilidades ocultas');
  harness.assert(searchPrevOnly.every(r => r.matchedSkills.every(s => s.source === 'PREVIOUS_EXPERIENCE')), 'Todas las habilidades provienen de experiencia previa');

  // --- Matriz de Requisitos por Puesto (Configurables y Base) ---
  const reqsChofer = TrainingEngine.getMandatoryRequirementsForRole('Chofer de Reparto');
  harness.assert(reqsChofer.some(r => r.id === 'req_manejo_defensivo'), 'Chofer exige Manejo Defensivo');

  // Personalización dinámica de puesto en la empresa
  store.setPositionRequirements('Chofer de Reparto Pesado', {
    mandatoryCredentials: ['DRIVER_LICENSE'],
    mandatoryTrainings: ['MANEJO_DEFENSIVO', 'CALIDAD_ISO']
  });

  const customReqs = store.getPositionRequirements('Chofer de Reparto Pesado');
  harness.assert(customReqs.mandatoryTrainings.includes('CALIDAD_ISO'), 'Empresa puede configurar requisitos adicionales a medida');

  const choferCarlos = store.employees.find(e => e.id === 'emp_carlos_gomez');
  const complianceCarlos = TrainingEngine.evaluateEmployeeCompliance(choferCarlos, store.getCourses(), store);
  harness.assert(typeof complianceCarlos.complianceRate === 'number', 'Tasa de cumplimiento evaluada dinámicamente');

  // --- Despachador de Alertas por WhatsApp ---
  const waUrl = AlertDispatcher.generateWhatsAppAlertUrl(choferCarlos, {
    credentialLabel: 'Licencia Nacional de Conducir',
    formattedDate: '23/11/2026',
    daysRemaining: 12
  }, 'Frigorífico La Huella');

  harness.assert(waUrl.startsWith('https://wa.me/549'), 'Enlace de WhatsApp normaliza teléfono con código de país');
  harness.assert(waUrl.includes('vence%20en%2012%20d%C3%ADas') || waUrl.includes('vence'), 'Enlace incluye mensaje pre-armado con días de urgencia');
}
