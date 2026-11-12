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
}
