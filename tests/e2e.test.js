/**
 * Capa 5: Pruebas End-to-End con Autenticación Real (AiAppFactory Standard)
 */

import { store } from '../src/state/store.js';
import { AuthService } from '../src/utils/authService.js';
import { ExpirationEngine } from '../src/modules/compliance/expirationEngine.js';
import { Exporter } from '../src/modules/reports/exporter.js';
import { DigitalSignaturePad } from '../src/utils/signature.js';
import { LeaveEngine } from '../src/modules/leaves/leaveEngine.js';
import { LsdExporter } from '../src/modules/payroll/lsdExporter.js';

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

  // 9. Entrega oficial de EPP con firma digital (Res. SRT 299/11)
  store.setSession({
    userId: 'usr_admin_transandina',
    role: 'HR_ADMIN',
    companyId: 'comp_logistica',
    token: 'ADMIN_TOKEN'
  });

  const eppSigHash = await DigitalSignaturePad.computeForensicHash(dummySig, newDriver.id, new Date().toISOString());
  const eppDel = store.addEppDelivery({
    employeeId: newDriver.id,
    eppId: 'CALZADO_SEGURIDAD',
    brandModel: 'Voran Energy Sport T43',
    standard: 'Sello S / IRAM 3610',
    quantity: 1,
    deliveryDate: today.toISOString().split('T')[0],
    trainedInUse: true,
    signature: dummySig,
    signatureHash: eppSigHash,
    deliveredBy: 'Lic. Higiene y Seguridad'
  });

  harness.assert(eppDel && eppDel.id, 'E2E Paso 9: Entrega de EPP registrada con éxito');
  harness.assert(eppDel.signatureHash === eppSigHash, 'E2E Paso 9: Hash de firma forense estampado en acta de EPP');

  // 10. Consulta de dotación en portal del colaborador
  store.setSession({
    userId: newDriver.id,
    employeeId: newDriver.id,
    role: 'EMPLOYEE',
    companyId: 'comp_logistica',
    token: 'EMP_TOKEN'
  });

  const driverDels = store.getEppDeliveries();
  harness.assert(driverDels.length === 1 && driverDels[0].eppId === 'CALZADO_SEGURIDAD', 'E2E Paso 10: Colaborador visualiza su EPP asignado en su portal');

  // 11. Exportación de Planilla Oficial SRT 299/11
  const srtCsv = Exporter.exportSrt299Planilla(driverDels, { name: 'TransAndina Logística', cuit: '30-68954120-7' }, 'srt_e2e.csv');
  harness.assert(srtCsv.startsWith('\uFEFF'), 'E2E Paso 11: Planilla SRT 299/11 contiene BOM UTF-8');
  harness.assert(srtCsv.includes('35.998.112') && srtCsv.includes(eppSigHash), 'E2E Paso 11: Planilla SRT contiene DNI y hash de firma del chofer');

  // 12. Flujo Completo de Ausentismo y Vacaciones (LCT 20.744)
  // Colaborador solicita 7 días de vacaciones
  const vacReq = store.requestLeave({
    employeeId: newDriver.id,
    type: 'VACATION',
    startDate: '2026-12-01',
    endDate: '2026-12-07',
    reason: 'Descanso anual'
  });
  harness.assert(vacReq && (vacReq.id.startsWith('leave_') || vacReq.id.startsWith('lev_')), 'E2E Paso 12: Chofer solicita vacaciones desde su portal');
  harness.assert(vacReq.days === 7, 'E2E Paso 12: Duración calculada en 7 días');

  // Admin aprueba la solicitud
  store.setSession({
    userId: 'usr_admin_transandina',
    role: 'HR_ADMIN',
    companyId: 'comp_logistica',
    token: 'ADMIN_TOKEN'
  });

  const reviewApprove = store.reviewLeave(vacReq.id, 'APPROVED', { notes: 'Aprobado formalmente por Gerencia' });
  harness.assert(reviewApprove && reviewApprove.status === 'APPROVED', 'E2E Paso 12: RRHH aprueba las vacaciones');

  // Chofer reingresa y verifica descuento en su saldo
  store.setSession({
    userId: newDriver.id,
    employeeId: newDriver.id,
    role: 'EMPLOYEE',
    companyId: 'comp_logistica',
    token: 'EMP_TOKEN'
  });

  const allDriverLeaves = store.getLeaves();
  const balanceChofer = LeaveEngine.calculateVacationBalance(newDriver, allDriverLeaves, 2026);
  harness.assert(balanceChofer.takenDays === 7, 'E2E Paso 12: Saldo refleja 7 días tomados');
  harness.assert(balanceChofer.remainingDays === balanceChofer.totalEntitledDays - 7, 'E2E Paso 12: Saldo remanente descontado con exactitud');

  // 13. Flujo Completo de Liquidación de Sueldos & Firma Digital de Recibos (LCT 20.744)
  // Admin corre liquidación de Noviembre 2026 para TransAndina Logística
  store.setSession({
    userId: 'usr_admin_transandina',
    role: 'HR_ADMIN',
    companyId: 'comp_logistica',
    token: 'ADMIN_TOKEN'
  });

  newDriver.cctId = 'CCT_40_89';
  newDriver.cctCategoryId = 'CHOF_1';
  newDriver.cuil = '20-35998112-4';
  newDriver.bank = 'Banco de la Nación Argentina';
  newDriver.cbu = '0110599520000035998112';

  const e2ePayroll = store.runPayroll({
    period: '2026-11',
    periodStr: 'Noviembre 2026',
    periodType: 'MONTHLY',
    novedadesMap: {
      [newDriver.id]: { kmLargaDistancia: 3200 }
    }
  });

  harness.assert(e2ePayroll && e2ePayroll.id.startsWith('pay_'), 'E2E Paso 13: Corrida de liquidación ejecutada');
  const driverPayslip = e2ePayroll.payslips.find(ps => ps.employeeId === newDriver.id);
  harness.assert(driverPayslip !== undefined, 'E2E Paso 13: Recibo generado para el nuevo chofer');
  harness.assert(driverPayslip.status === 'PENDING_SIGNATURE', 'E2E Paso 13: Recibo inicia en estado PENDING_SIGNATURE');
  harness.assert(driverPayslip.totalNeto > 1000000, 'E2E Paso 13: Sueldo neto liquidado según escala Camioneros');

  // Exportar LSD ARCA oficial y verificar estructura
  const transandinaComp = store.companies.find(c => c.id === 'comp_logistica');
  const lsdTxt = LsdExporter.generateLsdText(transandinaComp, e2ePayroll);
  const lsdRows = lsdTxt.replace(/\r?\n$/, '').split('\r\n');
  harness.assert(lsdRows.length >= 4, 'E2E Paso 13: LSD contiene registros de exportación para ARCA');
  harness.assert(lsdRows.every(r => r.length === 500), 'E2E Paso 13: Toda línea de LSD cumple 500 caracteres RG 3781');

  // Chofer inicia sesión en el Portal Móvil y firma su recibo
  store.setSession({
    userId: newDriver.id,
    employeeId: newDriver.id,
    role: 'EMPLOYEE',
    companyId: 'comp_logistica',
    token: 'EMP_TOKEN'
  });

  const choferPayslips = store.getPayslips();
  const psToSign = choferPayslips.find(ps => ps.id === driverPayslip.id);
  harness.assert(psToSign !== undefined, 'E2E Paso 13: Chofer visualiza su recibo en su portal móvil');

  const payslipHash = await DigitalSignaturePad.computeForensicHash(dummySig, driverPayslip.id, new Date().toISOString());
  const signedResult = store.signPayslip(e2ePayroll.id, driverPayslip.id, {
    signature: dummySig,
    signatureHash: payslipHash,
    ipAddress: '181.44.120.45'
  });

  harness.assert(signedResult.status === 'SIGNED', 'E2E Paso 13: Recibo de sueldo firmado electrónicamente');
  harness.assert(signedResult.signatureHash === payslipHash, 'E2E Paso 13: Hash forense de recibo estampado');
  harness.assert(signedResult.ipAddress === '181.44.120.45', 'E2E Paso 13: Auditoría IP registrada con éxito');
}
