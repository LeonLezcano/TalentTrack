/**
 * Capa 1: Pruebas Unitarias & Fuzzing (AiAppFactory Standard)
 */

import { ExpirationEngine, STATUS_LEVELS } from '../src/modules/compliance/expirationEngine.js';
import { Sanitizer } from '../src/utils/sanitizer.js';
import { DigitalSignaturePad } from '../src/utils/signature.js';
import { rateLimiter } from '../src/utils/rateLimiter.js';
import { AuthService } from '../src/utils/authService.js';
import { EPP_CATALOG } from '../src/state/initialData.js';
import { EppEngine } from '../src/modules/epp/eppEngine.js';
import { ImageUploadService } from '../src/utils/imageUploadService.js';
import { LeaveEngine, LEAVE_TYPES, LEAVE_STATUS } from '../src/modules/leaves/leaveEngine.js';
import { PayrollEngine, PERIOD_TYPES } from '../src/modules/payroll/payrollEngine.js';
import { CCT_CATALOG } from '../src/modules/payroll/cctCatalog.js';
import { LsdExporter } from '../src/modules/payroll/lsdExporter.js';

export async function runUnitTests(harness) {
  const refDate = new Date('2026-11-11T00:00:00.000Z');

  // --- Semáforo de Vencimientos ---
  const resExpired = ExpirationEngine.evaluateDate('2026-11-05', refDate);
  harness.assert(resExpired.status.code === 'EXPIRED', 'Fecha pasada retorna estado EXPIRED');
  harness.assert(resExpired.daysRemaining === -6, 'Días restantes negativos correctos para fecha vencida');

  const resUrgent = ExpirationEngine.evaluateDate('2026-11-16', refDate);
  harness.assert(resUrgent.status.code === 'URGENT', 'Fecha en menos de 7 días retorna URGENT');
  harness.assert(resUrgent.daysRemaining === 5, 'Días restantes correctos para estado URGENT');

  const resWarningHigh = ExpirationEngine.evaluateDate('2026-11-23', refDate);
  harness.assert(resWarningHigh.status.code === 'WARNING_HIGH', 'Fecha en 12 días retorna WARNING_HIGH');

  const resWarningMed = ExpirationEngine.evaluateDate('2026-12-05', refDate);
  harness.assert(resWarningMed.status.code === 'WARNING_MEDIUM', 'Fecha en 24 días retorna WARNING_MEDIUM');

  const resValid = ExpirationEngine.evaluateDate('2027-05-20', refDate);
  harness.assert(resValid.status.code === 'VALID', 'Fecha superior a 30 días retorna VALID');
  harness.assert(resValid.daysRemaining > 30, 'Días restantes > 30 para estado VALID');

  const resNull = ExpirationEngine.evaluateDate(null, refDate);
  harness.assert(resNull.status.code === 'NOT_APPLICABLE', 'Fecha nula retorna NOT_APPLICABLE sin arrojar error');

  const resInvalid = ExpirationEngine.evaluateDate('fecha-invalida', refDate);
  harness.assert(resInvalid.status.code === 'NOT_APPLICABLE', 'Fecha mal formada retorna NOT_APPLICABLE');

  // --- Sanitización XSS ---
  const escapedScript = Sanitizer.escapeHTML('<script>alert("xss")</script>');
  harness.assert(!escapedScript.includes('<script>'), 'Sanitizer escapa etiqueta <script>');
  harness.assert(escapedScript.includes('&lt;script&gt;'), 'Sanitizer reemplaza por entidades &lt; y &gt;');

  const escapedQuotes = Sanitizer.escapeHTML('Carlos "El Chofer" & \'Gómez\'');
  harness.assert(escapedQuotes.includes('&quot;') && escapedQuotes.includes('&#39;') && escapedQuotes.includes('&amp;'), 'Sanitizer escapa comillas dobles, simples y ampersands');

  const escapedNull = Sanitizer.escapeHTML(null);
  harness.assert(escapedNull === '', 'Sanitizer maneja null retornando string vacío');

  const safeUrl = Sanitizer.sanitizeURL('https://example.com/carnet.jpg');
  harness.assert(safeUrl === 'https://example.com/carnet.jpg', 'Sanitizer permite URLs HTTPS válidas');

  const blockedJsUrl = Sanitizer.sanitizeURL('javascript:alert(1)');
  harness.assert(blockedJsUrl === '#', 'Sanitizer bloquea protocolo javascript:');

  const blockedDataHtml = Sanitizer.sanitizeURL('data:text/html,<script>alert(1)</script>');
  harness.assert(blockedDataHtml === '#', 'Sanitizer bloquea data:text/html');

  const allowedDataImg = Sanitizer.sanitizeURL('data:image/png;base64,iVBORw0KGgo=');
  harness.assert(allowedDataImg.startsWith('data:image/png'), 'Sanitizer permite data:image/ para fotos de carnet');

  // --- Hashes Forenses y Criptografía ---
  const dummySig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const hash1 = await DigitalSignaturePad.computeForensicHash(dummySig, 'Carlos Gómez', '2026-11-11T12:00:00Z');
  harness.assert(typeof hash1 === 'string' && hash1.length > 10, 'Hash forense de firma generado con éxito');

  const hash2 = await DigitalSignaturePad.computeForensicHash(dummySig, 'Carlos Gómez', '2026-11-11T12:00:01Z');
  harness.assert(hash1 !== hash2, 'Hash forense varía ante diferencias de timestamp (invariante de sellado)');

  const pwdHash1 = await AuthService.hashPassword('Admin1234', 'salt_a');
  const pwdHash2 = await AuthService.hashPassword('Admin1234', 'salt_b');
  harness.assert(pwdHash1 !== pwdHash2, 'Hash de contraseña incorpora salado criptográfico');

  // --- RateLimiter ---
  rateLimiter.reset('test_key');
  for (let i = 0; i < 5; i++) {
    rateLimiter.recordFailure('test_key');
  }
  harness.assert(rateLimiter.isBlocked('test_key') === true, 'RateLimiter bloquea tras 5 intentos fallidos');
  harness.assert(rateLimiter.getRemainingLockoutSeconds('test_key') > 0, 'RateLimiter calcula tiempo de bloqueo restante');
  rateLimiter.reset('test_key');
  harness.assert(rateLimiter.isBlocked('test_key') === false, 'RateLimiter se reinicia correctamente');

  // --- Fuzzing Caótico ---
  const chaoticInputs = ['', '   ', '🚨💡⚠️🔥', 'A'.repeat(5000), '--SELECT * FROM users;', 'null', 'undefined'];
  let fuzzErrors = 0;
  for (const input of chaoticInputs) {
    try {
      Sanitizer.escapeHTML(input);
      Sanitizer.sanitizeURL(input);
      Sanitizer.truncate(input, 50);
      ExpirationEngine.evaluateDate(input, refDate);
    } catch {
      fuzzErrors++;
    }
  }
  harness.assert(fuzzErrors === 0, 'Fuzzing caótico: 0 excepciones ante payloads extremos');

  // --- Capa 1: Módulo EPP (Res. SRT 299/11) ---
  harness.assert(EPP_CATALOG.CALZADO_SEGURIDAD && EPP_CATALOG.CALZADO_SEGURIDAD.standard.includes('Sello S'), 'Catálogo EPP incluye Calzado con Sello S oficial');
  harness.assert(EPP_CATALOG.CHALECO_REFLECTIVO.standard.includes('IRAM 3859'), 'Catálogo EPP incluye Chaleco bajo norma IRAM 3859');
  harness.assert(EPP_CATALOG.CALZADO_SEGURIDAD.renewalDays === 180, 'Calzado exige recambio semestral (180 días)');

  const mockEmp = { id: 'test_emp', role: 'Chofer' };
  const mockReqs = [{ role: 'Chofer', mandatoryEpp: ['CALZADO_SEGURIDAD', 'CHALECO_REFLECTIVO'] }];
  
  // Caso 1: Sin entregas (0% de cobertura)
  const evalEmpty = EppEngine.evaluateEmployeeEppStatus(mockEmp, [], mockReqs);
  harness.assert(evalEmpty.complianceRate === 0 && evalEmpty.isCompliant === false, 'Sin entregas: 0% cobertura y no conforme');
  harness.assert(evalEmpty.missing.length === 2, 'Detecta 2 EPP obligatorios faltantes');

  // Caso 2: Entrega completa y vigente (100% de cobertura)
  const mockDeliveries = [
    { employeeId: 'test_emp', eppId: 'CALZADO_SEGURIDAD', deliveryDate: '2026-08-01', expirationDate: '2027-02-01' },
    { employeeId: 'test_emp', eppId: 'CHALECO_REFLECTIVO', deliveryDate: '2026-08-01', expirationDate: '2027-08-01' }
  ];
  const evalFull = EppEngine.evaluateEmployeeEppStatus(mockEmp, mockDeliveries, mockReqs);
  harness.assert(evalFull.complianceRate === 100 && evalFull.isCompliant === true, 'Con entregas vigentes: 100% cobertura y conforme');

  // Caso 3: Entrega con calzado vencido
  const mockExpiredDeliveries = [
    { employeeId: 'test_emp', eppId: 'CALZADO_SEGURIDAD', deliveryDate: '2026-01-01', expirationDate: '2026-07-01' },
    { employeeId: 'test_emp', eppId: 'CHALECO_REFLECTIVO', deliveryDate: '2026-08-01', expirationDate: '2027-08-01' }
  ];
  const evalExp = EppEngine.evaluateEmployeeEppStatus(mockEmp, mockExpiredDeliveries, mockReqs);
  harness.assert(evalExp.expired.length === 1 && evalExp.isCompliant === false, 'Detecta EPP vencido y marca no conformidad');

  // Escaneo de alertas EPP para el semáforo
  const eppAlerts = EppEngine.scanEppAlerts(mockExpiredDeliveries, [mockEmp]);
  harness.assert(eppAlerts.length >= 1, 'scanEppAlerts detecta recambio vencido para semáforo');
  harness.assert(eppAlerts[0].isEpp === true, 'Alerta etiquetada correctamente como isEpp');

  // --- Capa 1: ImageUploadService (Failover Engine & Resiliencia) ---
  harness.assert(ImageUploadService.config.cloudinary.cloudName === 'ebfnvo2l', 'Cloudinary configurado como proveedor principal');
  harness.assert(ImageUploadService.config.imgbb.apiKey === '38bd25c1dbba4f07fbc3e87f8f43f382', 'ImgBB configurado como proveedor de fallback');

  // Fallback offline resiliente cuando ambos proveedores remotos simulan falla
  const originalCloudinary = ImageUploadService._uploadToCloudinary;
  const originalImgbb = ImageUploadService._uploadToImgbb;

  ImageUploadService._uploadToCloudinary = async () => { throw new Error('Cloudinary simulated offline'); };
  ImageUploadService._uploadToImgbb = async () => { throw new Error('ImgBB simulated offline'); };

  const offlineRes = await ImageUploadService.uploadImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'test_carnet');
  harness.assert(offlineRes.success === true, 'ImageUploadService no bloquea la app si fallan proveedores');
  harness.assert(offlineRes.provider === 'local', 'Conmuta automáticamente a almacenamiento local resiliente');
  harness.assert(offlineRes.isLocalFallback === true, 'Flag isLocalFallback activo ante contingencia');

  // Restaurar métodos
  ImageUploadService._uploadToCloudinary = originalCloudinary;
  ImageUploadService._uploadToImgbb = originalImgbb;

  // --- Capa 1: Módulo de Vacaciones y Licencias (LCT 20.744) ---
  // 1. Escala legal de vacaciones según antigüedad (Art. 150 LCT)
  const entitLow = LeaveEngine.calculateVacationEntitlement('2024-03-01', 2026);
  harness.assert(entitLow.yearsOfSeniority === 2 && entitLow.totalEntitledDays === 14, 'Antigüedad < 5 años asigna 14 días corridos');

  const entitMid = LeaveEngine.calculateVacationEntitlement('2019-05-15', 2026);
  harness.assert(entitMid.yearsOfSeniority === 7 && entitMid.totalEntitledDays === 21, 'Antigüedad 5 a 9 años asigna 21 días corridos');

  const entitHigh = LeaveEngine.calculateVacationEntitlement('2014-01-10', 2026);
  harness.assert(entitHigh.yearsOfSeniority === 12 && entitHigh.totalEntitledDays === 28, 'Antigüedad 10 a 19 años asigna 28 días corridos');

  const entitMax = LeaveEngine.calculateVacationEntitlement('2001-08-20', 2026);
  harness.assert(entitMax.yearsOfSeniority === 25 && entitMax.totalEntitledDays === 35, 'Antigüedad >= 20 años asigna 35 días corridos');

  const entitNull = LeaveEngine.calculateVacationEntitlement(null, 2026);
  harness.assert(entitNull.yearsOfSeniority === 0 && entitNull.totalEntitledDays === 0, 'Fecha de ingreso nula retorna 0 días sin excepciones');

  // 2. Cálculo de días entre fechas (inclusive)
  harness.assert(LeaveEngine.calculateDaysBetween('2026-12-01', '2026-12-01') === 1, 'Mismo día computa 1 día de licencia');
  harness.assert(LeaveEngine.calculateDaysBetween('2026-12-01', '2026-12-14') === 14, 'Rango de 14 días corridos calculado correctamente');
  harness.assert(LeaveEngine.calculateDaysBetween('2026-12-14', '2026-12-01') === 0, 'Rango con fechas invertidas retorna 0');
  harness.assert(LeaveEngine.calculateDaysBetween(null, '2026-12-01') === 0, 'Fechas nulas retornan 0');

  // 3. Balance de vacaciones
  const mockEmpVac = { id: 'emp_vac_test', hireDate: '2019-01-01' }; // 7 años -> 21 días
  const mockLeaves = [
    { employeeId: 'emp_vac_test', type: 'VACATION', status: 'APPROVED', startDate: '2026-01-10', days: 7 },
    { employeeId: 'emp_vac_test', type: 'VACATION', status: 'PENDING', startDate: '2026-07-01', days: 5 }, // no debe restar
    { employeeId: 'emp_vac_test', type: 'MEDICAL', status: 'APPROVED', startDate: '2026-03-01', days: 3 } // no resta vacaciones
  ];
  const balance = LeaveEngine.calculateVacationBalance(mockEmpVac, mockLeaves, 2026);
  harness.assert(balance.totalEntitledDays === 21, 'Balance: Días asignados correspondientes a 7 años');
  harness.assert(balance.takenDays === 7, 'Balance: Solo computa días tomados de vacaciones aprobadas');
  harness.assert(balance.remainingDays === 14, 'Balance: Saldo restante exacto (21 - 7 = 14)');

  // 4. Detección de solapamiento de licencias
  const existingActive = [
    { id: 'lev_1', employeeId: 'emp_vac_test', startDate: '2026-07-10', endDate: '2026-07-20', status: 'APPROVED' },
    { id: 'lev_2', employeeId: 'emp_vac_test', startDate: '2026-08-01', endDate: '2026-08-05', status: 'REJECTED' }
  ];

  // Caso A: Solapamiento exacto
  harness.assert(LeaveEngine.hasOverlap(existingActive, 'emp_vac_test', '2026-07-10', '2026-07-20') === true, 'Detecta solapamiento en fechas idénticas');
  // Caso B: Solapamiento parcial al inicio
  harness.assert(LeaveEngine.hasOverlap(existingActive, 'emp_vac_test', '2026-07-05', '2026-07-15') === true, 'Detecta solapamiento parcial al inicio');
  // Caso C: Solapamiento parcial al final
  harness.assert(LeaveEngine.hasOverlap(existingActive, 'emp_vac_test', '2026-07-15', '2026-07-25') === true, 'Detecta solapamiento parcial al final');
  // Caso D: Sin solapamiento
  harness.assert(LeaveEngine.hasOverlap(existingActive, 'emp_vac_test', '2026-07-21', '2026-07-30') === false, 'Permite rango contiguo posterior sin solapamiento');
  // Caso E: Solapamiento con licencia rechazada -> debe permitirse
  harness.assert(LeaveEngine.hasOverlap(existingActive, 'emp_vac_test', '2026-08-01', '2026-08-05') === false, 'Permite fechas de licencias previamente rechazadas');

  // 5. Catálogos normativos y tipos de licencia
  harness.assert(LEAVE_TYPES.VACATION.isPaid === true, 'Vacaciones declaradas con goce de haberes');
  harness.assert(LEAVE_TYPES.MEDICAL.requiresCertificate === true, 'Licencia médica exige certificado obligatorio');
  harness.assert(LEAVE_STATUS.APPROVED.code === 'APPROVED', 'Estado APPROVED normativo disponible');

  // --- Capa 1: Motor de Liquidación de Sueldos Multiconvenio (LCT 20.744) ---
  // A. Catálogo Multiconvenio Oficial de los 5 CCTs
  harness.assert(CCT_CATALOG.CCT_130_75 && CCT_CATALOG.CCT_130_75.name.includes('FAECYS'), 'CCT 130/75 Comercio presente con FAECYS');
  harness.assert(CCT_CATALOG.CCT_40_89 && CCT_CATALOG.CCT_40_89.name.includes('FEDACAM'), 'CCT 40/89 Camioneros presente con FEDACAM');
  harness.assert(CCT_CATALOG.CCT_244_94 && CCT_CATALOG.CCT_244_94.name.includes('STIA'), 'CCT 244/94 Alimentación presente con STIA');
  harness.assert(CCT_CATALOG.CCT_76_75 && CCT_CATALOG.CCT_76_75.name.includes('UOCRA'), 'CCT 76/75 Construcción presente con UOCRA');
  harness.assert(CCT_CATALOG.CCT_260_75 && CCT_CATALOG.CCT_260_75.name.includes('UOM'), 'CCT 260/75 Metalúrgicos presente con UOM');

  // B. Liquidación CCT 130/75 (Comercio - Administrativo A con 5 años de antigüedad)
  const empComercio = {
    id: 'emp_comercio',
    firstName: 'Martín',
    lastName: 'Gómez',
    cuil: '20-33445566-9',
    hireDate: '2021-11-01', // 5 años
    cctId: 'CCT_130_75',
    cctCategoryId: 'ADM_A'
  };
  const liqComercio = PayrollEngine.calculateEmployeePayroll({
    employee: empComercio,
    period: { periodStr: '2026-11', type: 'MONTHLY' },
    novedades: { presentismo: true }
  });

  harness.assert(liqComercio.totalRemunerativo > 850000, 'Comercio: Total remunerativo incluye básico + presentismo + antigüedad');
  harness.assert(liqComercio.totalDescuentos > 0, 'Comercio: Aplica deducciones de ley');
  harness.assert(liqComercio.totalNeto === liqComercio.totalBruto - liqComercio.totalDescuentos, 'Comercio: Neto = Bruto - Retenciones');
  harness.assert(liqComercio.items.some(i => i.code === '1010' && i.description.includes('Antigüedad')), 'Comercio: Rubro de antigüedad 1% por año liquidado');
  harness.assert(liqComercio.items.some(i => i.code === '1020' && i.description.includes('Presentismo')), 'Comercio: Rubro de presentismo (Art. 40 CCT 130/75) liquidado');

  // C. Liquidación CCT 40/89 (Camioneros - Chofer Primera con viáticos y km)
  const empCamioneros = {
    id: 'emp_camionero',
    firstName: 'Esteban',
    lastName: 'Rojas',
    cuil: '20-29881123-4',
    hireDate: '2018-05-10', // 8 años
    cctId: 'CCT_40_89',
    cctCategoryId: 'CHOF_1'
  };
  const liqCamioneros = PayrollEngine.calculateEmployeePayroll({
    employee: empCamioneros,
    period: { periodStr: '2026-11', type: 'MONTHLY' },
    novedades: { kmLargaDistancia: 3500 }
  });

  harness.assert(liqCamioneros.totalNoRemunerativo > 0, 'Camioneros: Contiene rubros no remunerativos (viáticos y comida Art. 4.1)');
  harness.assert(liqCamioneros.items.some(i => i.code === '2010'), 'Camioneros: Viático comida liquidado');
  harness.assert(liqCamioneros.items.some(i => i.code === '1039'), 'Camioneros: Adicional por km de larga distancia liquidado');

  // D. Liquidación CCT 76/75 (UOCRA - Quincenal Oficial Albañil con Fondo Cese Laboral)
  const empUocra = {
    id: 'emp_uocra',
    firstName: 'Ramón',
    lastName: 'Vargas',
    cuil: '20-31223344-5',
    hireDate: '2026-03-01',
    cctId: 'CCT_76_75',
    cctCategoryId: 'OFIC'
  };
  const liqUocra = PayrollEngine.calculateEmployeePayroll({
    employee: empUocra,
    period: { periodStr: '2026-11-Q1', type: 'BIWEEKLY_1' },
    novedades: { workedHours: 88 }
  });

  harness.assert(liqUocra.periodType === 'BIWEEKLY_1', 'UOCRA: Período quincenal liquidado correctamente');
  harness.assert(liqUocra.items.some(i => i.code === '1000' && i.quantity === 88), 'UOCRA: Jornal quincenal liquidado por 88 horas');
  harness.assert(liqUocra.items.some(i => i.code === '5040' && i.description.includes('Cese Laboral')), 'UOCRA: Aporte Fondo Cese Laboral (Ley 22.250) liquidado');

  // E. Liquidación CCT 244/94 (Alimentación - Operario Calificado)
  const empAlimentacion = {
    id: 'emp_stia',
    firstName: 'Lucía',
    lastName: 'Méndez',
    cuil: '27-36778899-2',
    hireDate: '2023-01-15',
    cctId: 'CCT_244_94',
    cctCategoryId: 'OPER_CALIF'
  };
  const liqAlimentacion = PayrollEngine.calculateEmployeePayroll({
    employee: empAlimentacion,
    period: { periodStr: '2026-11', type: 'MONTHLY' },
    novedades: { presentismo: true }
  });
  harness.assert(liqAlimentacion.cctId === 'CCT_244_94', 'Alimentación: CCT 244/94 correctamente referenciado');
  harness.assert(liqAlimentacion.totalBruto > 0, 'Alimentación: Bruto calculado conforme a escala STIA');

  // F. Liquidación CCT 260/75 (UOM - Oficial Múltiple Metalúrgico)
  const empUom = {
    id: 'emp_uom',
    firstName: 'Jorge',
    lastName: 'Herrera',
    cuil: '20-27665544-1',
    hireDate: '2020-04-01',
    cctId: 'CCT_260_75',
    cctCategoryId: 'OF_MULT'
  };
  const liqUom = PayrollEngine.calculateEmployeePayroll({
    employee: empUom,
    period: { periodStr: '2026-11', type: 'MONTHLY' },
    novedades: { overtimeHours50: 10, overtimeHours100: 4 }
  });
  harness.assert(liqUom.cctId === 'CCT_260_75', 'UOM: CCT 260/75 referenciado correctamente');
  harness.assert(liqUom.items.some(i => i.code === '1040'), 'UOM: Horas extras al 50% liquidadas');
  harness.assert(liqUom.items.some(i => i.code === '1045'), 'UOM: Horas extras al 100% liquidadas');

  // G. Liquidación de SAC (Aguinaldo semestral)
  const liqSac = PayrollEngine.calculateEmployeePayroll({
    employee: empComercio,
    period: { periodStr: '2026-06', type: 'SAC' },
    novedades: { bestHalfYearSalary: 1200000, semesterDaysWorked: 180 }
  });
  harness.assert(liqSac.periodType === 'SAC', 'SAC: Tipo de período SAC asignado');
  harness.assert(liqSac.totalRemunerativo === 600000, 'SAC: 50% de la mejor remuneración del semestre (600.000)');

  // H. Plus Vacacional (División por 25 según Art. 155 LCT)
  const liqVac = PayrollEngine.calculateEmployeePayroll({
    employee: empComercio,
    period: { periodStr: '2026-12', type: 'MONTHLY' },
    novedades: { vacationDaysTaken: 14 }
  });
  const vacItem = liqVac.items.find(i => i.code === '1060');
  harness.assert(vacItem !== undefined, 'LCT Art. 155: Rubro de adelanto/plus vacacional generado');
  harness.assert(vacItem.description.includes('Plus Vacacional'), 'LCT Art. 155: Descripción formal de plus vacacional');

  // I. Conversión de montos a palabras (numberToSpanishWords)
  harness.assert(PayrollEngine.numberToSpanishWords(0).includes('Cero pesos'), 'Conversor de letras: 0 pesos');
  harness.assert(PayrollEngine.numberToSpanishWords(1000000).toLowerCase().includes('un millón'), 'Conversor de letras: 1 millón');
  harness.assert(PayrollEngine.numberToSpanishWords(850430).toLowerCase().includes('ochocientos cincuenta mil cuatrocientos treinta'), 'Conversor de letras: 850.430 pesos');

  // J. Exportador LSD ARCA / AFIP (Resolución General 3781 - 500 bytes por línea)
  const mockCompany = {
    name: 'TransAndina Logística SA',
    cuit: '30-68954120-7'
  };
  const mockPayrollRun = {
    id: 'run_test_lsd',
    period: '2026-11',
    periodType: 'MONTHLY',
    runNumber: 1,
    payslips: [liqComercio, liqCamioneros]
  };
  const lsdOutput = LsdExporter.generateLsdText(mockCompany, mockPayrollRun);
  const lsdLines = lsdOutput.replace(/\r?\n$/, '').split('\r\n');

  harness.assert(lsdLines.length >= 4, 'LSD: Archivo contiene múltiples registros (01, 02, 03, 04)');
  harness.assert(lsdLines[0].startsWith('01'), 'LSD: Primer registro es 01 (Carátula)');
  harness.assert(lsdLines.some(l => l.startsWith('02')), 'LSD: Contiene registro 02 (Trabajadores)');
  harness.assert(lsdLines.some(l => l.startsWith('03')), 'LSD: Contiene registro 03 (Conceptos liquidación)');
  harness.assert(lsdLines.some(l => l.startsWith('04')), 'LSD: Contiene registro 04 (Totales generales)');

  let lineLengthMismatch = 0;
  for (const line of lsdLines) {
    if (line.length !== 500) {
      lineLengthMismatch++;
    }
  }
  harness.assert(lineLengthMismatch === 0, 'LSD Invariante Normativo: Cada línea mide exactamente 500 caracteres (RG AFIP 3781)');
}
