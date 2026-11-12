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

  // --- Capa 2: Integración de EPP & Dotación ---
  const cat = store.getEppCatalog();
  harness.assert(cat && cat.CALZADO_SEGURIDAD, 'Store expone catálogo oficial de EPP');

  store.setSession({
    userId: 'usr_admin_alimentos',
    role: 'HR_ADMIN',
    companyId: compAlimentosId,
    token: 'ADMIN_TOKEN'
  });

  const initialDels = store.getEppDeliveries();
  harness.assert(initialDels.length >= 2, 'Store inicializa entregas de EPP para la empresa');

  const newDel = store.addEppDelivery({
    employeeId: empTarget.id,
    eppId: 'PROTECTOR_AUDITIVO',
    brandModel: '3M Peltor Optime 98',
    standard: 'IRAM 4060',
    quantity: 1,
    deliveryDate: '2026-11-01',
    trainedInUse: true,
    signature: 'data:image/svg+xml;base64,mockSig',
    signatureHash: 'hash-test-del'
  });

  harness.assert(newDel && newDel.id.startsWith('epp_del_'), 'addEppDelivery genera ID único');
  harness.assert(newDel.employeeName.length > 0, 'addEppDelivery vincula nombre del colaborador');

  const delsForEmp = store.getEppDeliveriesByEmployee(empTarget.id);
  harness.assert(delsForEmp.some(d => d.id === newDel.id), 'getEppDeliveriesByEmployee retorna la nueva entrega');

  // Confinamiento de rol EMPLOYEE para EPP
  store.setSession({
    userId: empTarget.id,
    employeeId: empTarget.id,
    role: 'EMPLOYEE',
    companyId: compAlimentosId,
    token: 'EMP_TOKEN'
  });

  const empEppDeliveries = store.getEppDeliveries();
  harness.assert(empEppDeliveries.every(d => d.employeeId === empTarget.id), 'Confinamiento EPP: Colaborador solo ve sus propias entregas');

  // Reingresar como admin y borrar entrega
  store.setSession({
    userId: 'usr_admin_alimentos',
    role: 'HR_ADMIN',
    companyId: compAlimentosId,
    token: 'ADMIN_TOKEN'
  });

  const delCountBefore = store.getEppDeliveries().length;
  store.deleteEppDelivery(newDel.id);
  harness.assert(store.getEppDeliveries().length === delCountBefore - 1, 'deleteEppDelivery elimina el registro correctamente');

  // --- Capa 2: Integración de Vacaciones, Licencias y Ausentismo (LCT 20.744) ---
  const allInitialLeaves = store.getLeaves();
  harness.assert(allInitialLeaves.length >= 2, 'Store inicializa licencias demo para la empresa');
  harness.assert(allInitialLeaves.some(l => l.type === 'VACATION'), 'Existe solicitud inicial de vacaciones');
  harness.assert(allInitialLeaves.some(l => l.type === 'MEDICAL'), 'Existe solicitud inicial de licencia médica');

  // Solicitud de licencia válida
  const newLeave = store.requestLeave({
    employeeId: empTarget.id,
    type: 'VACATION',
    startDate: '2026-12-15',
    endDate: '2026-12-28',
    reason: 'Vacaciones de fin de año con la familia'
  });
  harness.assert(newLeave && (newLeave.id.startsWith('leave_') || newLeave.id.startsWith('lev_')), 'requestLeave genera ID único de licencia');
  harness.assert(newLeave.days === 14, 'requestLeave calcula 14 días corridos automáticamente');
  harness.assert(newLeave.status === 'PENDING', 'Nueva licencia inicia en estado PENDING');

  // Intento de solapamiento en el mismo rango de fechas
  let overlapBlocked = false;
  let overlapErrorMsg = '';
  try {
    store.requestLeave({
      employeeId: empTarget.id,
      type: 'STUDY_EXAM',
      startDate: '2026-12-20',
      endDate: '2026-12-22',
      reason: 'Examen de logística'
    });
  } catch (err) {
    overlapBlocked = true;
    overlapErrorMsg = err.message;
  }
  harness.assert(overlapBlocked === true, 'Bloquea solicitud que se solapa con licencia activa');
  harness.assert(overlapErrorMsg.includes('superpone') || overlapErrorMsg.includes('solap'), 'Mensaje de error explícito ante solapamiento');

  // Aprobación de licencia por RRHH
  const approvedLeave = store.reviewLeave(newLeave.id, 'APPROVED', {
    notes: 'Aprobado según cronograma de turnos',
    reviewerName: 'Lic. RRHH Alimentos'
  });
  harness.assert(approvedLeave && approvedLeave.status === 'APPROVED', 'reviewLeave permite aprobar licencia');
  harness.assert(approvedLeave.reviewedBy === 'Lic. RRHH Alimentos', 'Registra responsable de la aprobación');

  // Confinamiento de rol EMPLOYEE en visualización de licencias
  store.setSession({
    userId: empTarget.id,
    employeeId: empTarget.id,
    role: 'EMPLOYEE',
    companyId: compAlimentosId,
    token: 'EMP_TOKEN'
  });

  const empOwnLeaves = store.getLeaves();
  harness.assert(empOwnLeaves.every(l => l.employeeId === empTarget.id), 'Confinamiento de Licencias: Colaborador solo ve sus propias licencias');

  // Volver a rol Admin para rechazo y eliminación
  store.setSession({
    userId: 'usr_admin_alimentos',
    role: 'HR_ADMIN',
    companyId: compAlimentosId,
    token: 'ADMIN_TOKEN'
  });

  const rejectedLeave = store.reviewLeave(newLeave.id, 'REJECTED', {
    notes: 'Rechazado por necesidad de cobertura de temporada'
  });
  harness.assert(rejectedLeave && rejectedLeave.status === 'REJECTED', 'reviewLeave permite rechazar licencia con motivo');

  const leavesCountBefore = store.getLeaves().length;
  store.deleteLeave(newLeave.id);
  harness.assert(store.getLeaves().length === leavesCountBefore - 1, 'deleteLeave elimina la licencia del registro');
}
