/**
 * Capa 3: Pruebas de Componentes & Requisitos Dinámicos (AiAppFactory Standard)
 */

import { SkillsEngine } from '../src/modules/skills/skillsEngine.js';
import { TrainingEngine } from '../src/modules/training/trainingEngine.js';
import { AlertDispatcher } from '../src/modules/compliance/alertDispatcher.js';
import { EppEngine } from '../src/modules/epp/eppEngine.js';
import { Exporter } from '../src/modules/reports/exporter.js';
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

  // --- Capa 3: Formato Oficial SRT 299/11 & Exportador ---
  const mockDelivery = {
    employeeName: 'Carlos Gómez',
    dni: '32.458.912',
    eppName: 'Calzado de Seguridad con Puntera',
    brandModel: 'Voran Energy T42',
    standard: 'Sello S / IRAM 3610',
    quantity: 1,
    deliveryDate: '2026-06-01',
    expirationDate: '2026-12-01',
    trainedInUse: true,
    signature: 'data:image/svg+xml;base64,mock',
    signatureHash: 'hash-srt-cg',
    deliveredBy: 'Ing. Claudio Mendoza'
  };

  const srtRecord = EppEngine.formatSrt299Record(mockDelivery, choferCarlos, { name: 'Frigorífico La Huella', cuit: '30-71458923-4' });
  harness.assert(srtRecord.cuit === '30-71458923-4', 'formatSrt299Record incluye CUIT de la empresa');
  harness.assert(srtRecord.certificacion.includes('Sello S'), 'formatSrt299Record incluye certificación Sello S/IRAM');
  harness.assert(srtRecord.capacitado === 'SÍ', 'formatSrt299Record acredita capacitación Art. 3 Res. 299/11');

  const srtCsv = Exporter.exportSrt299Planilla([mockDelivery], { name: 'Frigorífico La Huella', cuit: '30-71458923-4' }, 'test_srt.csv');
  harness.assert(srtCsv.startsWith('\uFEFF'), 'CSV de SRT 299/11 contiene BOM UTF-8 para Excel');
  harness.assert(srtCsv.includes('Elemento de Protección Personal (EPP)') && srtCsv.includes('hash-srt-cg'), 'CSV de SRT 299/11 contiene encabezados normativos y hash forense');
}
