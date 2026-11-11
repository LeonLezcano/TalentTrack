/**
 * Capa 2: Pruebas de Integración & Persistencia (AiAppFactory Standard)
 */

import { store } from '../src/state/store.js';

export async function runIntegrationTests(harness) {
  store.restoreDemoData();
  harness.assert(store.companies.length >= 2, 'Store inicializado con empresas demo');
  harness.assert(store.employees.length >= 5, 'Store inicializado con colaboradores demo');
  harness.assert(store.courses.length >= 2, 'Store inicializado con capacitaciones demo');
  harness.assert(store.isAuthenticated() === true, 'Sesión activa creada correctamente');

  // --- Aislamiento Multi-Tenant (Regla 10) ---
  const compAlimentosId = 'comp_alimentos';
  const compLogisticaId = 'comp_logistica';

  // Configurar sesión como RRHH de Alimentos
  store.setSession({
    userId: 'usr_admin_alimentos',
    role: 'HR_ADMIN',
    companyId: compAlimentosId,
    token: 'TEST_TOKEN'
  });

  const empsAlimentos = store.getEmployees();
  harness.assert(empsAlimentos.length === 3, 'Aislamiento: RRHH Alimentos ve exactamente sus colaboradores');
  harness.assert(!empsAlimentos.some(e => e.companyId === compLogisticaId), 'Zero Cross-Tenant Leak: 0 colaboradores de otra empresa');

  // Confinamiento estricto de empleado
  const empTarget = empsAlimentos[0];
  store.setSession({
    userId: empTarget.id,
    employeeId: empTarget.id,
    role: 'EMPLOYEE',
    companyId: compAlimentosId,
    token: 'EMP_TOKEN'
  });

  const empSelfOnly = store.getEmployees();
  harness.assert(empSelfOnly.length === 1 && empSelfOnly[0].id === empTarget.id, 'Confinamiento de rol EMPLOYEE: solo accede a su propio legajo');

  // Restaurar rol admin para seguir pruebas
  store.setSession({
    userId: 'usr_admin_alimentos',
    role: 'HR_ADMIN',
    companyId: compAlimentosId,
    token: 'ADMIN_TOKEN'
  });

  // --- Ciclo de Vida de Legajos ---
  const nuevoChofer = store.addEmployee({
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
  harness.assert(store.getEmployees().some(e => e.id === nuevoChofer.id) === false, 'Tombstone: empleado dado de baja no aparece en listado activo');

  // --- Credencial con Adjunto de Foto ---
  store.addCredentialToEmployee(empTarget.id, {
    type: 'DRIVER_LICENSE',
    customLabel: 'Licencia Municipal',
    number: '998877',
    categories: ['B (Auto/Camioneta)', 'C (Camión)'],
    expirationDate: '2027-10-10',
    attachment: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  });

  const empAfterCred = store.getEmployeeById(empTarget.id);
  const credAttached = empAfterCred.credentials.find(c => c.number === '998877');
  harness.assert(credAttached !== undefined, 'Credencial asociada al colaborador');
  harness.assert(credAttached.attachment !== null, 'Comprobante/foto adjunta persistida en el legajo');

  // --- Invariante Anti-Siembras Fantasma ---
  store.purgeAllData();
  harness.assert(store.employees.length === 0, 'Purga: Base de empleados queda en 0');
  
  store.isInitialized = false;
  store.init();
  harness.assert(store.employees.length === 0, 'Invariante Anti-Siembra Fantasma: Re-init no resucita datos purgados');

  store.restoreDemoData();
  harness.assert(store.employees.length >= 5, 'Restauración de demo restablece el estado correctamente');
}
