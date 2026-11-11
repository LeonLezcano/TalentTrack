/**
 * Capa 5: Pruebas End-to-End con Autenticación Real (AiAppFactory Standard)
 */

import { store } from '../src/state/store.js';
import { AuthService } from '../src/utils/authService.js';
import { ExpirationEngine } from '../src/modules/compliance/expirationEngine.js';
import { Exporter } from '../src/modules/reports/exporter.js';
import { DigitalSignaturePad } from '../src/utils/signature.js';

export async function runE2ETests(harness) {
  store.restoreDemoData();

  // 1. Login formal de Administrador de RRHH
  const loginRes = await AuthService.authenticate(store, 'rrhh@transandina.com', 'Admin1234');
  harness.assert(loginRes.success === true, 'E2E Paso 1: Autenticación exitosa de Administrador de RRHH');
  harness.assert(store.isAuthenticated() === true, 'E2E Paso 1: Token de sesión emitido en la bóveda');

  // 2. Alta de nuevo chofer
  const newDriver = store.addEmployee({
    firstName: 'Gonzalo',
    lastName: 'Pérez',
    dni: '35.998.112',
    role: 'Chofer de Semirremolque Pesado',
    department: 'Transporte de Larga Distancia',
    email: 'gonzalo.perez@transandina.com',
    phone: '+54 9 341 778-8990'
  });
  harness.assert(newDriver && newDriver.id, 'E2E Paso 2: Chofer incorporado exitosamente');

  // 3. Carga de carnet con adjunto y vencimiento en 10 días
  const today = new Date();
  const expDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);
  const expDateStr = expDate.toISOString().split('T')[0];

  store.addCredentialToEmployee(newDriver.id, {
    type: 'DRIVER_LICENSE',
    customLabel: 'Licencia Nacional Habilitante (LNH)',
    number: '35998112-LNH',
    categories: ['E (Articulados/Acoplado)', 'LNH (CNRT Cargas Generales)'],
    expirationDate: expDateStr,
    attachment: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  });
  harness.assert(newDriver.credentials.length === 1, 'E2E Paso 3: Carnet LNH asignado con comprobante adjunto');

  // 4. Detección en semáforo preventivo
  const alerts = ExpirationEngine.scanAlerts(store.getEmployees());
  const driverAlert = alerts.find(a => a.employeeId === newDriver.id);
  harness.assert(driverAlert !== undefined, 'E2E Paso 4: Semáforo detecta carnet en alerta preventiva');
  harness.assert(driverAlert.status.code === 'WARNING_HIGH', 'E2E Paso 4: Severidad calculada (< 15 días)');

  // 5. Convocatoria a curso y firmas electrónicas dobles
  const newCourse = store.addCourse({
    title: 'Capacitación Anual Manejo Defensivo y Seguridad en Carretera',
    category: 'MANEJO_DEFENSIVO',
    date: today.toISOString().split('T')[0],
    durationHours: 4,
    instructorName: 'Téc. Seguridad Vial Marcelo Benítez',
    participants: [{ employeeId: newDriver.id, employeeName: `${newDriver.firstName} ${newDriver.lastName}`, attended: false, passed: false }]
  });

  const dummySig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const driverSigHash = await DigitalSignaturePad.computeForensicHash(dummySig, newDriver.id, new Date().toISOString());
  store.signParticipant(newCourse.id, newDriver.id, { signature: dummySig, signatureHash: driverSigHash, passed: true, score: 10 });

  const instructorSigHash = await DigitalSignaturePad.computeForensicHash(dummySig, 'INSTRUCTOR', new Date().toISOString());
  store.signInstructor(newCourse.id, { signature: dummySig, signatureHash: instructorSigHash });

  // 6. Cierre de curso y acreditación en legajo
  store.completeCourse(newCourse.id);
  const updatedDriver = store.getEmployeeById(newDriver.id);
  const hasSkill = updatedDriver.skills.some(s => s.name.includes('Manejo Defensivo'));
  harness.assert(hasSkill, 'E2E Paso 6: Habilidad acreditada en legajo tras firma de acta');

  // 7. Login de colaborador (Portal Móvil)
  const empLogin = await AuthService.authenticate(store, '35998112', '8112');
  harness.assert(empLogin.success === true, 'E2E Paso 7: Login exitoso de colaborador mediante DNI y PIN');
  harness.assert(store.getSession().role === 'EMPLOYEE', 'E2E Paso 7: Sesión de colaborador activada');

  // 8. Exportación CSV con BOM UTF-8
  const csvAttendance = Exporter.exportCourseAttendance(newCourse, 'test_asistencia.csv');
  harness.assert(csvAttendance.startsWith('\uFEFF'), 'E2E Paso 8: CSV contiene BOM UTF-8');
  harness.assert(csvAttendance.includes(driverSigHash), 'E2E Paso 8: CSV incluye hash forense de la firma');
}
