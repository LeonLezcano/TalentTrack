/**
 * Capa 3: Pruebas de Componentes & Lógica de Negocio (AiAppFactory Standard)
 * Verifica el Buscador de Talento Interno, la Matriz de Requisitos por Puesto,
 * y la evaluación de cumplimiento de cursos obligatorios.
 */

import { SkillsEngine } from '../src/modules/skills/skillsEngine.js';
import { TrainingEngine } from '../src/modules/training/trainingEngine.js';
import { store } from '../src/state/store.js';

export async function runComponentTests(harness) {
  store.restoreDemoData();
  const allEmployees = store.getAllEmployees();

  // --- Test 33 a 36: Buscador de Talento Interno (Headhunting Interno) ---
  // Búsqueda de una habilidad oculta: "Soldadura"
  const searchSoldadura = SkillsEngine.searchTalent(allEmployees, {
    freeText: 'Soldadura'
  });
  harness.assert(searchSoldadura.length > 0, 'Talent Hunter localiza colaborador con habilidad de Soldadura');
  harness.assert(searchSoldadura[0].employee.firstName.includes('Carlos'), 'El chofer Carlos Gómez tiene soldadura como habilidad previa');
  harness.assert(searchSoldadura[0].matchedSkills[0].source === 'PREVIOUS_EXPERIENCE', 'Identifica correctamente que es una experiencia previa oculta');

  // Búsqueda con filtro exclusivo de habilidades previas
  const searchPrevOnly = SkillsEngine.searchTalent(allEmployees, {
    sourceFilter: 'PREVIOUS_ONLY',
    minLevel: 2
  });
  harness.assert(searchPrevOnly.length >= 2, 'Filtro PREVIOUS_ONLY extrae empleados con habilidades ocultas');
  harness.assert(searchPrevOnly.every(r => r.matchedSkills.every(s => s.source === 'PREVIOUS_EXPERIENCE')), 'Todas las habilidades retornadas provienen de experiencia previa');

  // --- Test 37 y 38: Búsqueda por Nivel Mínimo ---
  const searchLevel3 = SkillsEngine.searchTalent(allEmployees, {
    minLevel: 3
  });
  harness.assert(searchLevel3.every(r => r.matchedSkills.every(s => s.level >= 3)), 'Filtro de nivel respeta cota mínima (Nivel >= 3)');

  // Búsqueda multi-requisito
  const searchMulti = SkillsEngine.searchTalent(allEmployees, {
    requiredSkills: ['BPM', 'Autoelevador']
  });
  harness.assert(searchMulti.length > 0, 'Búsqueda multi-requisito evalúa coincidencias con éxito');

  // --- Test 39 a 42: Matriz de Capacitaciones Obligatorias por Puesto ---
  const reqsChofer = TrainingEngine.getMandatoryRequirementsForRole('Chofer de Reparto');
  harness.assert(reqsChofer.some(r => r.id === 'req_manejo_defensivo'), 'Chofer exige obligatoriamente Manejo Defensivo');
  harness.assert(reqsChofer.some(r => r.id === 'req_cargas_generales'), 'Chofer exige Estiba y Sujeción de Cargas');

  const reqsAlimentos = TrainingEngine.getMandatoryRequirementsForRole('Operaria de Elaboración de Alimentos');
  harness.assert(reqsAlimentos.some(r => r.id === 'req_bpm_anual'), 'Operaria de planta exige obligatoriamente BPM');

  const reqsClark = TrainingEngine.getMandatoryRequirementsForRole('Operario de Autoelevador');
  harness.assert(reqsClark.some(r => r.id === 'req_autoelevadores_seguros'), 'Operario de autoelevador exige Res. SRT 960/15');

  // Evaluación de cumplimiento en un empleado
  const choferCarlos = store.employees.find(e => e.id === 'emp_carlos_gomez');
  const complianceCarlos = TrainingEngine.evaluateEmployeeCompliance(choferCarlos, store.getCourses());
  harness.assert(typeof complianceCarlos.complianceRate === 'number', 'Tasa de cumplimiento calculada numéricamente');
  harness.assert(complianceCarlos.completedCount >= 1, 'Carlos Gómez tiene su curso de Manejo Defensivo acreditado');
}
