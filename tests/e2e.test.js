/**
 * Capa 5: Pruebas End-to-End (AiAppFactory Standard)
 * Simula el flujo completo de vida:
 * Alta Chofer -> Carnet por Vencer (Semáforo Alerta) -> Convocatoria a Curso ->
 * Firma Táctil Doble (Alumno + Instructor) -> Acreditación Automática en Legajo ->
 * Exportación de Acta de Asistencia con BOM UTF-8 para Auditoría.
 */

import { store } from '../src/state/store.js';
import { ExpirationEngine } from '../src/modules/compliance/expirationEngine.js';
import { Exporter } from '../src/modules/reports/exporter.js';
import { DigitalSignaturePad } from '../src/utils/signature.js';

export async function runE2ETests(harness) {
  store.restoreDemoData();

  // 1. Alta de nuevo chofer en empresa de logística
  const newDriver = store.addEmployee({
    companyId: 'comp_logistica',
    firstName: 'Gonzalo',
    lastName: 'Pérez',
    dni: '35.998.112',
    role: 'Chofer de Semirremolque Pesado',
    department: 'Transporte de Larga Distancia',
    email: 'gonzalo.perez@transandina.com'
  });
  harness.assert(newDriver && newDriver.id, 'E2E Paso 1: Chofer incorporado exitosamente');

  // 2. Carga de carnet de conducir con vencimiento en 10 días
  const today = new Date();
  const expDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);
  const expDateStr = expDate.toISOString().split('T')[0];

  store.addCredentialToEmployee(newDriver.id, {
    type: 'DRIVER_LICENSE',
    customLabel: 'Licencia Nacional Habilitante (LNH)',
    number: '35998112-LNH',
    categories: ['E (Articulados/Acoplado)', 'LNH (CNRT Cargas Generales)'],
    expirationDate: expDateStr
  });
  harness.assert(newDriver.credentials.length === 1, 'E2E Paso 2: Carnet LNH asignado al chofer');

  // 3. Verificación de Semáforo Preventivo en el Dashboard
  const alerts = ExpirationEngine.scanAlerts(store.getEmployees('comp_logistica'));
  const driverAlert = alerts.find(a => a.employeeId === newDriver.id);
  harness.assert(driverAlert !== undefined, 'E2E Paso 3: Semáforo detecta carnet en zona de alerta');
  harness.assert(driverAlert.status.code === 'WARNING_HIGH', 'E2E Paso 3: Estado semáforo correcto (WARNING_HIGH < 15 días)');

  // 4. Agendar curso obligatorio de Manejo Defensivo
  const newCourse = store.addCourse({
    companyId: 'comp_logistica',
    title: 'Capacitación Anual Manejo Defensivo y Seguridad en Carretera',
    category: 'MANEJO_DEFENSIVO',
    date: today.toISOString().split('T')[0],
    durationHours: 4,
    instructorName: 'Téc. Seguridad Vial Marcelo Benítez',
    participants: [
      {
        employeeId: newDriver.id,
        employeeName: `${newDriver.firstName} ${newDriver.lastName}`,
        attended: false,
        passed: false
      }
    ]
  });
  harness.assert(newCourse && newCourse.id, 'E2E Paso 4: Curso programado y chofer convocado');

  // 5. Firma táctil del alumno/chofer
  const dummySignatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const driverSigHash = await DigitalSignaturePad.computeForensicHash(
    dummySignatureDataUrl,
    newDriver.id,
    new Date().toISOString()
  );

  const signedDriver = store.signParticipant(newCourse.id, newDriver.id, {
    signature: dummySignatureDataUrl,
    signatureHash: driverSigHash,
    passed: true,
    score: 10
  });
  harness.assert(signedDriver === true, 'E2E Paso 5: Asistencia y firma táctil del chofer registradas');

  // 6. Firma táctil del instructor docente
  const instructorSigHash = await DigitalSignaturePad.computeForensicHash(
    dummySignatureDataUrl,
    'INSTRUCTOR',
    new Date().toISOString()
  );
  const signedInstructor = store.signInstructor(newCourse.id, {
    signature: dummySignatureDataUrl,
    signatureHash: instructorSigHash
  });
  harness.assert(signedInstructor === true, 'E2E Paso 6: Firma digital del instructor sellada en acta');

  // 7. Cierre del curso y acreditación automática en legajo
  const completed = store.completeCourse(newCourse.id);
  harness.assert(completed === true, 'E2E Paso 7: Curso marcado como COMPLETADO');

  const updatedDriver = store.getEmployeeById(newDriver.id);
  const hasCreditedSkill = updatedDriver.skills.some(s => s.name.includes('Manejo Defensivo'));
  harness.assert(hasCreditedSkill, 'E2E Paso 7: Habilidad acreditada automáticamente en el legajo del chofer');

  // 8. Exportación de acta de asistencia y auditoría con BOM UTF-8
  const csvAttendance = Exporter.exportCourseAttendance(newCourse, 'test_asistencia.csv');
  harness.assert(csvAttendance.startsWith('\uFEFF'), 'E2E Paso 8: CSV contiene BOM UTF-8 para Excel en Windows');
  harness.assert(csvAttendance.includes(newDriver.lastName), 'E2E Paso 8: CSV incluye apellido del chofer participante');
  harness.assert(csvAttendance.includes(driverSigHash), 'E2E Paso 8: CSV incluye hash forense de la firma');

  const csvAudit = Exporter.exportComplianceAudit(alerts, 'test_auditoria.csv');
  harness.assert(csvAudit.includes(driverAlert.credentialLabel), 'E2E Paso 8: CSV de auditoría incluye habilitación por vencer');
}
