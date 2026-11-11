/**
 * Capa 2: Pruebas de Integración & Persistencia (AiAppFactory Standard)
 * Verifica aislamiento multi-empresa, ciclo de vida de legajos,
 * y la invariante anti-siembras fantasma tras purgas de datos.
 */

import { store } from '../src/state/store.js';

export async function runIntegrationTests(harness) {
  // Inicialización limpia
  store.restoreDemoData();
  harness.assert(store.companies.length >= 2, 'Store inicializado con empresas demo');
  harness.assert(store.employees.length >= 5, 'Store inicializado con colaboradores demo');
  harness.assert(store.courses.length >= 2, 'Store inicializado con capacitaciones demo');

  // --- Test 21 a 23: Aislamiento Multi-Empresa ---
  const compAlimentosId = 'comp_alimentos';
  const compLogisticaId = 'comp_logistica';

  const empsAlimentos = store.getEmployees(compAlimentosId);
  const empsLogistica = store.getEmployees(compLogisticaId);

  harness.assert(empsAlimentos.length === 3, 'Aislamiento: Empresa Alimentos tiene exactamente sus colaboradores');
  harness.assert(empsLogistica.length === 2, 'Aislamiento: Empresa Logística tiene exactamente sus colaboradores');
  harness.assert(!empsAlimentos.some(e => e.companyId === compLogisticaId), 'Zero Cross-Tenant Leak: no hay fuga de empleados entre compañías');

  // --- Test 24 a 27: Ciclo de Vida de Legajos (Alta, Edición, Baja) ---
  const nuevoChofer = store.addEmployee({
    companyId: compAlimentosId,
    firstName: 'Roberto',
    lastName: 'Mansilla',
    dni: '28.112.990',
    role: 'Chofer de Semirremolque',
    department: 'Logística',
    email: 'roberto@lahuella.com'
  });

  harness.assert(nuevoChofer && nuevoChofer.id, 'Alta de empleado genera ID único');
  harness.assert(store.getEmployeeById(nuevoChofer.id) !== null, 'Empleado consultable por ID');

  const actualizado = store.updateEmployee(nuevoChofer.id, { role: 'Chofer Principal de Larga Distancia' });
  harness.assert(actualizado.role === 'Chofer Principal de Larga Distancia', 'Actualización de legajo reflejada');

  const borrado = store.deleteEmployee(nuevoChofer.id);
  harness.assert(borrado === true, 'Baja de empleado ejecutada con éxito');
  harness.assert(store.getEmployees(compAlimentosId).some(e => e.id === nuevoChofer.id) === false, 'Tombstone: empleado dado de baja no aparece en listado activo');

  // --- Test 28 a 30: Incorporación de Habilidades y Credenciales ---
  const empTarget = store.getEmployees(compAlimentosId)[0];
  const countSkillsBefore = (empTarget.skills || []).length;

  store.addSkillToEmployee(empTarget.id, {
    name: 'Operación Autoelevador Eléctrico',
    level: 3,
    source: 'PREVIOUS_EXPERIENCE',
    yearsExperience: 4,
    notes: 'Experiencia previa comprobable'
  });

  const empAfterSkill = store.getEmployeeById(empTarget.id);
  harness.assert(empAfterSkill.skills.length === countSkillsBefore + 1, 'Habilidad añadida al legajo del colaborador');
  harness.assert(empAfterSkill.skills.some(s => s.source === 'PREVIOUS_EXPERIENCE'), 'Habilidad previa clasificada con origen correcto');

  store.addCredentialToEmployee(empTarget.id, {
    type: 'DRIVER_LICENSE',
    customLabel: 'Licencia Municipal',
    number: '998877',
    categories: ['B (Auto/Camioneta)', 'C (Camión)'],
    expirationDate: '2027-10-10'
  });

  const empAfterCred = store.getEmployeeById(empTarget.id);
  harness.assert(empAfterCred.credentials.some(c => c.number === '998877'), 'Credencial/Carnet asociado con sus categorías');

  // --- Test 31 y 32: Invariante Anti-Siembras Fantasma (Purga de Datos) ---
  store.purgeAllData();
  harness.assert(store.employees.length === 0, 'Purga: Base de empleados queda en 0');
  
  // Re-inicializar tienda simulando recarga de página tras purga
  store.isInitialized = false;
  store.init();
  harness.assert(store.employees.length === 0, 'Invariante Anti-Siembra Fantasma: Re-init no resucita datos purgados');

  // Restaurar demo para siguientes tests
  store.restoreDemoData();
  harness.assert(store.employees.length >= 5, 'Restauración de demo restablece el estado correctamente');
}
