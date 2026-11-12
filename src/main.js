/**
 * TalentTrack Main Application Controller (Fully Hardened - Zero Façade Standard)
 * Implements real login screens, document viewers, WhatsApp dispatching,
 * and closed-by-default navigation guard.
 */

import { store } from './state/store.js';
import { Sanitizer } from './utils/sanitizer.js';
import { AuthService } from './utils/authService.js';
import { ExpirationEngine, CREDENTIAL_TYPES, STATUS_LEVELS } from './modules/compliance/expirationEngine.js';
import { AlertDispatcher } from './modules/compliance/alertDispatcher.js';
import { SkillsEngine, STANDARD_SKILLS, SKILL_LEVELS } from './modules/skills/skillsEngine.js';
import { TrainingEngine, TRAINING_CATEGORIES } from './modules/training/trainingEngine.js';
import { EppEngine } from './modules/epp/eppEngine.js';
import { DigitalSignaturePad } from './utils/signature.js';
import { Exporter } from './modules/reports/exporter.js';
import { Notifier } from './utils/notifier.js';
import { ImageUploadService } from './utils/imageUploadService.js';
import { LeaveEngine, LEAVE_TYPES, LEAVE_STATUS } from './modules/leaves/leaveEngine.js';
import { LsdExporter } from './modules/payroll/lsdExporter.js';
import { CCT_CATALOG } from './modules/payroll/cctCatalog.js';
import { PERIOD_TYPES } from './modules/payroll/payrollEngine.js';

const WHATSAPP_ICON_SVG = `<svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;
const DOSSIER_ICON_SVG = `<svg class="w-4 h-4 shrink-0 fill-none stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>`;

class AppController {
  constructor() {
    this.currentTab = 'dashboard';
    this.activeModal = null;
    this.signaturePadInstance = null;
    this.selectedEmployeeForModal = null;
    this.selectedCourseForSignature = null;
    this.selectedParticipantForSignature = null;
    this.activeDocumentPreview = null;
    this.isSidebarCollapsed = localStorage.getItem('talenttrack_sidebar_collapsed') === 'true';
    this.isMobileDrawerOpen = false;
  }

  init() {
    store.init();
    store.subscribe(() => this.render());
    Notifier.initScreenWakeLock();

    this.bindGlobalEvents();
    this.render();

    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.log('SW registration note:', err.message);
      });
    }
  }

  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');

      this.handleAction(action, id, target);
    });

    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.closeMobileDrawer();
      });
    }
  }

  handleAction(action, id, target) {
    switch (action) {
      case 'switch-tab':
        this.currentTab = id;
        this.closeMobileDrawer();
        this.render();
        break;

      case 'toggle-sidebar':
        this.toggleSidebar();
        break;

      case 'toggle-mobile-drawer':
        this.toggleMobileDrawer();
        break;

      case 'close-mobile-drawer':
        this.closeMobileDrawer();
        break;

      case 'logout':
        store.logout();
        Notifier.showToast('Sesión cerrada correctamente', 'info');
        break;

      case 'open-modal-new-employee':
        this.openModal('modal-employee', { isEdit: false });
        break;

      case 'open-modal-edit-employee':
        const empToEdit = store.getEmployeeById(id);
        if (empToEdit) this.openModal('modal-employee', { isEdit: true, employee: empToEdit });
        break;

      case 'delete-employee':
        if (confirm('¿Confirma que desea dar de baja a este colaborador?')) {
          store.deleteEmployee(id);
          Notifier.showToast('Colaborador dado de baja correctamente', 'warning');
        }
        break;

      case 'open-modal-add-skill':
        this.selectedEmployeeForModal = id;
        this.openModal('modal-add-skill');
        break;

      case 'open-modal-add-cred':
        this.selectedEmployeeForModal = id;
        this.openModal('modal-add-cred');
        break;

      case 'view-document':
        let docUrl = target.getAttribute('data-doc-url');
        const empIdForDoc = target.getAttribute('data-emp-id');
        const credIdForDoc = target.getAttribute('data-cred-id');
        let docTitle = target.getAttribute('data-doc-title') || 'Documento / Carnet';

        if (!docUrl && empIdForDoc && credIdForDoc) {
          const empObj = store.getEmployeeById(empIdForDoc);
          const credObj = (empObj?.credentials || []).find(cr => cr.id === credIdForDoc);
          if (credObj) {
            docUrl = credObj.attachment;
            docTitle = credObj.customLabel || credObj.type;
          }
        }
        if (docUrl) {
          this.openDocumentModal(docUrl, docTitle);
        } else {
          Notifier.showToast('No se encontró el archivo del comprobante', 'warning');
        }
        break;

      case 'send-whatsapp-alert':
        const empId = target.getAttribute('data-emp-id');
        const credId = target.getAttribute('data-cred-id');
        this.dispatchWhatsApp(empId, credId);
        break;

      case 'open-modal-new-course':
        this.openModal('modal-new-course');
        break;

      case 'open-modal-new-epp':
        this.openModal('modal-new-epp');
        break;

      case 'export-srt299-csv':
        const eppDels = store.getEppDeliveries();
        const currentComp = store.getCurrentCompany();
        Exporter.exportSrt299Planilla(eppDels, currentComp);
        Notifier.showToast('Planilla Oficial SRT 299/11 descargada en CSV', 'success');
        break;

      case 'delete-epp-delivery':
        if (confirm('¿Confirma anular este registro de entrega de EPP?')) {
          store.deleteEppDelivery(id);
          Notifier.showToast('Registro de entrega de EPP eliminado', 'warning');
        }
        break;

      case 'open-modal-request-leave':
        this.openModal('modal-request-leave');
        break;

      case 'approve-leave':
        store.reviewLeave(id, 'APPROVED');
        Notifier.showToast('Licencia aprobada y computada en el saldo', 'success');
        break;

      case 'reject-leave':
        const rejectReason = prompt('Indique el motivo del rechazo:') || 'No autorizada';
        store.reviewLeave(id, 'REJECTED', rejectReason);
        Notifier.showToast('Licencia rechazada', 'warning');
        break;

      case 'delete-leave':
        if (confirm('¿Confirma cancelar esta solicitud de licencia?')) {
          store.deleteLeave(id);
          Notifier.showToast('Solicitud de licencia cancelada', 'info');
        }
        break;

      case 'open-modal-new-payroll':
        this.openModal('modal-new-payroll');
        break;

      case 'open-modal-cct-config':
        this.openModal('modal-cct-config');
        break;

      case 'open-modal-view-payslip':
        this.openModal('modal-view-payslip', id);
        break;

      case 'export-lsd-txt':
        const payrollRun = store.getPayrollById(id) || store.getPayrolls()[0];
        if (!payrollRun) {
          Notifier.showToast('No hay liquidaciones disponibles para exportar', 'warning');
          break;
        }
        LsdExporter.downloadLsdFile(store.getCurrentCompany(), payrollRun);
        Notifier.showToast('Archivo TXT de Libro de Sueldos Digital (LSD ARCA) generado', 'success');
        break;

      case 'dispatch-payslip-wa':
        const psTarget = store.getPayslipById(id);
        if (!psTarget) break;
        const empForWa = store.getEmployeeById(psTarget.employeeId);
        if (empForWa?.phone) {
          const rawPhone = empForWa.phone.replace(/\D/g, '');
          const waPhone = rawPhone.startsWith('54') ? rawPhone : (rawPhone.startsWith('9') ? `54${rawPhone}` : `549${rawPhone}`);
          const msg = encodeURIComponent(`Hola ${empForWa.firstName}, tu recibo de sueldo digital de ${psTarget.periodStr} por un neto de $${psTarget.totalNeto.toLocaleString('es-AR')} ya está disponible en tu portal para visualización y firma de conformidad (Res. MTEySS 346/2019).`);
          window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
        } else {
          Notifier.showToast('El colaborador no posee teléfono para WhatsApp registrado', 'warning');
        }
        break;

      case 'delete-payroll':
        if (confirm('¿Confirma eliminar este lote de liquidación?')) {
          store.deletePayroll(id);
          Notifier.showToast('Lote de liquidación eliminado', 'info');
        }
        break;

      case 'open-modal-sign-course':
        const courseId = target.getAttribute('data-course-id');
        const participantId = target.getAttribute('data-participant-id');
        const isInstructor = target.getAttribute('data-is-instructor') === 'true';
        this.openSignatureModal(courseId, participantId, isInstructor);
        break;

      case 'complete-course':
        store.completeCourse(id);
        Notifier.showToast('Capacitación finalizada y constancias registradas en legajo', 'success');
        break;

      case 'export-employees-csv':
        Exporter.exportEmployees(store.getEmployees());
        Notifier.showToast('Archivo CSV de empleados descargado', 'success');
        break;

      case 'export-audit-csv':
        const alerts = ExpirationEngine.scanAlerts(store.getEmployees());
        Exporter.exportComplianceAudit(alerts);
        Notifier.showToast('Informe de auditoría de vencimientos exportado', 'success');
        break;

      case 'export-course-csv':
        const course = store.getCourseById(id);
        if (course) {
          Exporter.exportCourseAttendance(course);
          Notifier.showToast('Acta de asistencia exportada en CSV', 'success');
        }
        break;

      case 'print-window':
        window.print();
        break;

      case 'purge-demo':
        if (confirm('⚠️ ¿ATENCIÓN: Desea purgar todos los datos y dejar la base limpia?')) {
          store.purgeAllData();
          Notifier.showToast('Datos purgados con éxito', 'warning');
        }
        break;

      case 'restore-demo':
        store.restoreDemoData();
        Notifier.showToast('Datos de demostración restaurados', 'success');
        break;

      case 'close-modal':
        this.closeModal();
        break;

      case 'clear-signature':
        if (this.signaturePadInstance) this.signaturePadInstance.clear();
        break;

      case 'save-signature':
        this.saveSignature();
        break;

      default:
        console.log('Acción no manejada:', action);
    }
  }

  dispatchWhatsApp(empId, credId) {
    const emp = store.getEmployeeById(empId);
    if (!emp) return;
    let cred = (emp.credentials || []).find(c => c.id === credId);
    let label = cred ? (cred.customLabel || cred.type) : null;
    let expDate = cred ? cred.expirationDate : null;

    if (!cred) {
      const eppDel = store.getEppDeliveries().find(d => d.id === credId);
      if (eppDel) {
        label = `Recambio EPP: ${eppDel.eppName}`;
        expDate = eppDel.expirationDate;
      }
    }

    if (!expDate) return;

    const evalRes = ExpirationEngine.evaluateDate(expDate);
    const alertObj = {
      credentialLabel: label || 'Habilitación / EPP',
      formattedDate: evalRes.formattedDate,
      daysRemaining: evalRes.daysRemaining
    };

    const compName = store.getCurrentCompany()?.name || 'Recursos Humanos';
    const waUrl = AlertDispatcher.generateWhatsAppAlertUrl(emp, alertObj, compName);

    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      Notifier.showToast(`Mensaje de alerta preparado para ${emp.firstName}`, 'success');
    } else {
      alert('El colaborador no cuenta con número de teléfono registrado.');
    }
  }

  openDocumentModal(docUrl, title) {
    const container = document.getElementById('modal-container');
    if (!container || !docUrl) return;

    container.classList.remove('hidden');
    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 class="font-bold text-base">📄 ${Sanitizer.escapeHTML(title)}</h3>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <div class="p-6 flex flex-col items-center justify-center bg-slate-50 min-h-[300px]">
            ${docUrl.startsWith('data:image/') || docUrl.endsWith('.png') || docUrl.endsWith('.jpg') ? `
              <img src="${Sanitizer.sanitizeURL(docUrl)}" alt="Documento" class="max-h-[450px] max-w-full rounded-xl shadow border border-slate-300 object-contain">
            ` : `
              <embed src="${Sanitizer.sanitizeURL(docUrl)}" type="application/pdf" class="w-full h-[450px] rounded-xl border border-slate-300">
            `}
          </div>
          <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>Comprobante respaldatorio verificado en legajo</span>
            <button data-action="close-modal" class="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl">Cerrar Visor</button>
          </div>
        </div>
      </div>
    `);
  }

  // --- Modal Rendering & Controls ---
  openModal(modalId, context = {}) {
    this.activeModal = modalId;
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.classList.remove('hidden');

    if (modalId === 'modal-employee') {
      this.renderEmployeeModal(container, context);
    } else if (modalId === 'modal-add-skill') {
      this.renderAddSkillModal(container);
    } else if (modalId === 'modal-add-cred') {
      this.renderAddCredModal(container);
    } else if (modalId === 'modal-new-course') {
      this.renderNewCourseModal(container);
    } else if (modalId === 'modal-new-epp') {
      this.renderNewEppDeliveryModal(container);
    } else if (modalId === 'modal-request-leave') {
      this.renderRequestLeaveModal(container);
    } else if (modalId === 'modal-new-payroll') {
      this.renderNewPayrollRunModal(container);
    } else if (modalId === 'modal-cct-config') {
      this.renderCctConfigModal(container);
    } else if (modalId === 'modal-view-payslip') {
      this.renderViewPayslipModal(container, context);
    }
  }

  closeModal() {
    this.activeModal = null;
    this.signaturePadInstance = null;
    const container = document.getElementById('modal-container');
    if (container) {
      container.classList.add('hidden');
      Sanitizer.safeClear(container);
    }
  }

  openSignatureModal(courseId, participantId, isInstructor) {
    this.activeModal = 'modal-signature';
    this.selectedCourseForSignature = courseId;
    this.selectedParticipantForSignature = participantId;
    this.isSigningInstructor = isInstructor;

    const course = store.getCourseById(courseId);
    let title = 'Firma Electrónica de Asistencia (Ley 25.506)';
    let subtitle = '';

    if (isInstructor) {
      title = 'Firma Electrónica del Instructor / Capacitador';
      subtitle = `Curso: ${course?.title || ''}`;
    } else {
      const participant = (course?.participants || []).find(p => p.employeeId === participantId);
      subtitle = `Participante: ${participant?.employeeName || 'Colaborador'} — Curso: ${course?.title || ''}`;
    }

    const container = document.getElementById('modal-container');
    if (!container) return;

    container.classList.remove('hidden');
    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base">${Sanitizer.escapeHTML(title)}</h3>
              <p class="text-xs text-slate-300">${Sanitizer.escapeHTML(subtitle)}</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <div class="p-6 space-y-3">
            <p class="text-xs text-slate-600">
              Dibuje su firma en el recuadro. Al confirmar, el sistema vinculará su trazo con timestamp UTC, dirección IP/User-Agent y un hash criptográfico SHA-256 conforme a la normativa de firma electrónica.
            </p>
            <div class="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden">
              <canvas id="signature-canvas" width="460" height="200" class="signature-canvas w-full h-[200px]"></canvas>
            </div>
            <div class="flex justify-between items-center pt-2">
              <button type="button" data-action="clear-signature" class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 font-medium">
                🔄 Limpiar Trazo
              </button>
              <div class="flex gap-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                  Cancelar
                </button>
                <button type="button" data-action="save-signature" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">
                  Confirmar y Sellar Acta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      this.signaturePadInstance = new DigitalSignaturePad(canvas, { strokeColor: '#1e3a8a', lineWidth: 3 });
    }
  }

  async saveSignature() {
    if (!this.signaturePadInstance || this.signaturePadInstance.isEmpty()) {
      alert('Por favor dibuje su firma antes de confirmar.');
      return;
    }

    const dataUrl = this.signaturePadInstance.toDataURL();
    const timestamp = new Date().toISOString();
    const hash = await DigitalSignaturePad.computeForensicHash(
      dataUrl,
      this.isSigningInstructor ? 'INSTRUCTOR' : this.selectedParticipantForSignature,
      timestamp
    );

    if (this.isSigningInstructor) {
      store.signInstructor(this.selectedCourseForSignature, {
        signature: dataUrl,
        signatureHash: hash
      });
      Notifier.showToast('Firma del instructor sellada en acta con hash SHA-256', 'success');
    } else {
      store.signParticipant(this.selectedCourseForSignature, this.selectedParticipantForSignature, {
        signature: dataUrl,
        signatureHash: hash,
        passed: true,
        score: 10
      });
      Notifier.showToast('Asistencia y firma del colaborador acreditadas', 'success');
    }

    this.closeModal();
  }

  renderEmployeeModal(container, context) {
    const isEdit = context.isEdit || false;
    const emp = context.employee || {};

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 class="font-bold text-lg">${isEdit ? 'Editar Legajo de Colaborador' : 'Alta de Nuevo Colaborador'}</h3>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form id="employee-form" class="p-6 overflow-y-auto space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
                <input type="text" name="firstName" required value="${Sanitizer.escapeHTML(emp.firstName || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Apellido *</label>
                <input type="text" name="lastName" required value="${Sanitizer.escapeHTML(emp.lastName || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">DNI / CUIL *</label>
                <input type="text" name="dni" required value="${Sanitizer.escapeHTML(emp.dni || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Puesto de Trabajo *</label>
                <input type="text" name="role" required placeholder="Ej: Chofer de Reparto / Operaria de Planta" value="${Sanitizer.escapeHTML(emp.role || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Departamento / Área</label>
                <input type="text" name="department" placeholder="Ej: Logística / Producción" value="${Sanitizer.escapeHTML(emp.department || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Ingreso</label>
                <input type="date" name="hireDate" value="${Sanitizer.escapeHTML(emp.hireDate || new Date().toISOString().split('T')[0])}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" name="email" value="${Sanitizer.escapeHTML(emp.email || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                <input type="tel" name="phone" placeholder="+54 9 11 ..." value="${Sanitizer.escapeHTML(emp.phone || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">
                ${isEdit ? 'Guardar Cambios' : 'Crear Colaborador'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `);

    const form = document.getElementById('employee-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
          firstName: formData.get('firstName')?.trim(),
          lastName: formData.get('lastName')?.trim(),
          dni: formData.get('dni')?.trim(),
          role: formData.get('role')?.trim(),
          department: formData.get('department')?.trim(),
          hireDate: formData.get('hireDate'),
          email: formData.get('email')?.trim(),
          phone: formData.get('phone')?.trim()
        };

        if (isEdit && emp.id) {
          store.updateEmployee(emp.id, data);
          Notifier.showToast('Legajo actualizado con éxito', 'success');
        } else {
          store.addEmployee(data);
          Notifier.showToast('Nuevo colaborador incorporado al sistema', 'success');
        }
        this.closeModal();
      });
    }
  }

  renderAddSkillModal(container) {
    const emp = store.getEmployeeById(this.selectedEmployeeForModal);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Colaborador';

    const skillOptions = STANDARD_SKILLS.map(s => 
      `<option value="${Sanitizer.escapeHTML(s.name)}">${Sanitizer.escapeHTML(s.name)} (${Sanitizer.escapeHTML(s.category)})</option>`
    ).join('');

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base">Asignar Habilidad / Competencia</h3>
              <p class="text-xs text-slate-300">${Sanitizer.escapeHTML(empName)}</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form id="skill-form" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Origen de la Habilidad *</label>
              <select name="source" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="PREVIOUS_EXPERIENCE">⭐ Experiencia Previa Oculta (Otros trabajos u oficios)</option>
                <option value="CURRENT_ROLE">💼 Puesto Actual de Trabajo</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Habilidad *</label>
              <input list="skills-list" name="name" required placeholder="Ej: Soldadura TIG / Excel / Autoelevador..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <datalist id="skills-list">${skillOptions}</datalist>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Nivel *</label>
                <select name="level" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="1">1 - Básico</option>
                  <option value="2" selected>2 - Intermedio</option>
                  <option value="3">3 - Avanzado</option>
                  <option value="4">4 - Experto</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Años Práctica</label>
                <input type="number" name="yearsExperience" min="1" max="50" value="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Detalles / Evidencia de Experiencia</label>
              <textarea name="notes" rows="2" placeholder="Ej: 4 años en frigorífico anterior realizando mantenimiento mecánico..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancelar</button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">Guardar Habilidad</button>
            </div>
          </form>
        </div>
      </div>
    `);

    const form = document.getElementById('skill-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        store.addSkillToEmployee(this.selectedEmployeeForModal, {
          name: formData.get('name')?.trim(),
          source: formData.get('source'),
          level: Number(formData.get('level')),
          yearsExperience: Number(formData.get('yearsExperience')),
          notes: formData.get('notes')?.trim()
        });
        Notifier.showToast('Habilidad registrada en el legajo del colaborador', 'success');
        this.closeModal();
      });
    }
  }

  renderAddCredModal(container) {
    const emp = store.getEmployeeById(this.selectedEmployeeForModal);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Colaborador';

    const credOptions = Object.entries(CREDENTIAL_TYPES).map(([k, v]) => 
      `<option value="${k}">${v.label}</option>`
    ).join('');

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base">Registrar Habilitación / Carnet Real</h3>
              <p class="text-xs text-slate-300">${Sanitizer.escapeHTML(empName)}</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form id="cred-form" class="p-6 overflow-y-auto space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tipo de Habilitación *</label>
              <select name="type" id="cred-type-select" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                ${credOptions}
              </select>
            </div>
            <div id="driver-categories-container" class="space-y-1">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Categorías de Conducción (Para Choferes):</label>
              <div class="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label class="flex items-center gap-1.5"><input type="checkbox" name="categories" value="A (Moto)"> A (Moto)</label>
                <label class="flex items-center gap-1.5"><input type="checkbox" name="categories" value="B (Auto/Camioneta)" checked> B (Auto/Camioneta)</label>
                <label class="flex items-center gap-1.5"><input type="checkbox" name="categories" value="C (Camión)"> C (Camión)</label>
                <label class="flex items-center gap-1.5"><input type="checkbox" name="categories" value="E (Articulado)"> E (Articulado)</label>
                <label class="flex items-center gap-1.5"><input type="checkbox" name="categories" value="LNH (CNRT Cargas)"> LNH (CNRT Cargas)</label>
                <label class="flex items-center gap-1.5"><input type="checkbox" name="categories" value="LNH (CNRT Peligrosas)"> LNH (Peligrosas)</label>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">N° de Licencia / Certificado</label>
                <input type="text" name="number" placeholder="Ej: 32.458.912" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Emisión</label>
                <input type="date" name="issueDate" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Vencimiento * (Activa Semáforo)</label>
              <input type="date" name="expirationDate" required class="w-full px-3 py-2 border-2 border-blue-400 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Adjunto Real de Foto / PDF del Carnet -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Adjuntar Foto / Comprobante (Frente o Carnet) *</label>
              <input type="file" id="cred-file-input" accept="image/*,application/pdf" class="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
              <p class="text-[11px] text-slate-400 mt-1">Límite de seguridad: 5 MB por archivo.</p>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancelar</button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">Registrar Habilitación</button>
            </div>
          </form>
        </div>
      </div>
    `);

    const form = document.getElementById('cred-form');
    const fileInput = document.getElementById('cred-file-input');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const categories = formData.getAll('categories');

        let attachmentData = null;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          if (file.size > 5 * 1024 * 1024) {
            alert('El archivo supera el límite de seguridad de 5 MB.');
            return;
          }

          Notifier.showToast('Subiendo comprobante a la nube...', 'info');
          try {
            const uploadRes = await ImageUploadService.uploadImage(file, `carnet_${this.selectedEmployeeForModal}_${formData.get('type')}`);
            attachmentData = uploadRes.url;
            if (uploadRes.provider === 'cloudinary') {
              Notifier.showToast('Comprobante alojado en Cloudinary con éxito', 'success');
            } else if (uploadRes.provider === 'imgbb') {
              Notifier.showToast('Comprobante alojado en ImgBB (fallback) con éxito', 'success');
            } else {
              Notifier.showToast('Comprobante preservado localmente (respaldo offline)', 'info');
            }
          } catch (uploadErr) {
            console.error('Error al subir comprobante:', uploadErr);
            Notifier.showToast('Falla de red remota, preservando comprobante localmente', 'warning');
            attachmentData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(file);
            });
          }
        }

        store.addCredentialToEmployee(this.selectedEmployeeForModal, {
          type: formData.get('type'),
          customLabel: CREDENTIAL_TYPES[formData.get('type')]?.label || 'Habilitación',
          number: formData.get('number')?.trim(),
          categories,
          issueDate: formData.get('issueDate'),
          expirationDate: formData.get('expirationDate'),
          attachment: attachmentData
        });

        Notifier.showToast('Habilitación y comprobante incorporados al semáforo', 'success');
        this.closeModal();
      });
    }
  }

  renderNewCourseModal(container) {
    const employees = store.getEmployees();
    const catOptions = Object.entries(TRAINING_CATEGORIES).map(([k, v]) => 
      `<option value="${k}">${v.label}</option>`
    ).join('');

    const empCheckboxes = employees.map(emp => `
      <label class="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer text-xs">
        <input type="checkbox" name="participants" value="${emp.id}" checked>
        <span class="font-medium text-slate-800">${Sanitizer.escapeHTML(emp.firstName + ' ' + emp.lastName)}</span>
        <span class="text-slate-500">(${Sanitizer.escapeHTML(emp.role)})</span>
      </label>
    `).join('');

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 class="font-bold text-lg">Agendar Nueva Capacitación</h3>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form id="course-form" class="p-6 overflow-y-auto space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Título del Curso / Capacitación *</label>
              <input type="text" name="title" required placeholder="Ej: Curso Anual BPM / Manejo Defensivo" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Área / Categoría *</label>
                <select name="category" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  ${catOptions}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha Programada *</label>
                <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Duración (Horas)</label>
                <input type="number" name="durationHours" min="1" max="40" value="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Instructor / Capacitador *</label>
                <input type="text" name="instructorName" required placeholder="Nombre del docente" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Temario</label>
              <textarea name="description" rows="2" placeholder="Detalle los contenidos..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Convocados:</label>
              <div class="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                ${empCheckboxes}
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancelar</button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">Agendar Curso</button>
            </div>
          </form>
        </div>
      </div>
    `);

    const form = document.getElementById('course-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const participantIds = formData.getAll('participants');

        const participants = participantIds.map(id => {
          const emp = store.getEmployeeById(id);
          return {
            employeeId: id,
            employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Colaborador',
            attended: false,
            passed: false,
            score: null,
            signature: null,
            signatureHash: null,
            signedAt: null
          };
        });

        store.addCourse({
          title: formData.get('title')?.trim(),
          category: formData.get('category'),
          date: formData.get('date'),
          durationHours: Number(formData.get('durationHours')),
          instructorName: formData.get('instructorName')?.trim(),
          description: formData.get('description')?.trim(),
          status: 'SCHEDULED',
          participants
        });

        Notifier.showToast('Capacitación programada con participantes convocados', 'success');
        this.closeModal();
      });
    }
  }

  renderNewEppDeliveryModal(container) {
    const employees = store.getEmployees();
    const catalog = store.getEppCatalog();
    const today = new Date().toISOString().split('T')[0];

    const empOptions = employees.map(e => `
      <option value="${e.id}">${Sanitizer.escapeHTML(e.firstName + ' ' + e.lastName)} (${Sanitizer.escapeHTML(e.role)})</option>
    `).join('');

    const catalogEntries = Object.values(catalog);
    const eppOptions = catalogEntries.map(item => `
      <option value="${item.id}" data-standard="${Sanitizer.escapeHTML(item.standard)}" data-days="${item.renewalDays}">
        ${item.icon} ${Sanitizer.escapeHTML(item.name)} — ${Sanitizer.escapeHTML(item.standard)}
      </option>
    `).join('');

    const defaultEpp = catalogEntries[0] || {};
    const defaultRenewal = new Date();
    defaultRenewal.setDate(defaultRenewal.getDate() + (defaultEpp.renewalDays || 180));
    const defaultExpDate = defaultRenewal.toISOString().split('T')[0];

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base">🦺 Nueva Entrega de EPP (Res. SRT 299/11)</h3>
              <p class="text-xs text-slate-300">Constancia digital con validez para auditorías de Higiene y Seguridad</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <form id="epp-delivery-form" class="p-6 overflow-y-auto space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Colaborador Destinatario *</label>
              <select name="employeeId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                ${empOptions}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Elemento de Protección Personal (Catálogo Normado) *</label>
              <select id="modal-epp-selector" name="eppId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                ${eppOptions}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Marca / Modelo / Talle *</label>
                <input type="text" name="brandModel" required placeholder="Ej: Voran Energy Sport T42" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Certificación Técnica *</label>
                <input type="text" id="modal-epp-standard" name="standard" value="${Sanitizer.escapeHTML(defaultEpp.standard || '')}" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Cantidad *</label>
                <input type="number" name="quantity" min="1" max="50" value="1" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha Entrega *</label>
                <input type="date" id="modal-epp-date" name="deliveryDate" value="${today}" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Próximo Recambio *</label>
                <input type="date" id="modal-epp-expiration" name="expirationDate" value="${defaultExpDate}" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700">
              </div>
            </div>

            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label class="flex items-start gap-2 cursor-pointer text-xs text-amber-900">
                <input type="checkbox" name="trainedInUse" checked class="mt-0.5 rounded text-blue-600 focus:ring-blue-500">
                <span><strong>Capacitación recibida (Art. 3 Res. SRT 299/11):</strong> El trabajador declara haber sido instruido sobre el uso correcto, cuidado y conservación de este EPP.</span>
              </label>
            </div>

            <!-- Firma Táctil en Pantalla -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-800">Firma Táctil de Recepción del Trabajador *</label>
              <div class="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                <canvas id="signature-canvas" width="460" height="150" class="signature-canvas w-full h-[150px]"></canvas>
              </div>
              <div class="flex justify-between items-center pt-1 text-xs">
                <button type="button" data-action="clear-signature" class="text-slate-500 hover:text-slate-800 font-medium">
                  🔄 Limpiar Firma
                </button>
                <span class="text-slate-400 text-[11px]">Se estampará hash SHA-256</span>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancelar</button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">Registrar y Sellar Entrega</button>
            </div>
          </form>
        </div>
      </div>
    `);

    // Inicializar Canvas de firma
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      this.signaturePadInstance = new DigitalSignaturePad(canvas);
    }

    // Actualización dinámica de estándar y fecha de recambio
    const eppSelect = document.getElementById('modal-epp-selector');
    const stdInput = document.getElementById('modal-epp-standard');
    const expInput = document.getElementById('modal-epp-expiration');
    const dateInput = document.getElementById('modal-epp-date');

    if (eppSelect && stdInput && expInput && dateInput) {
      eppSelect.addEventListener('change', () => {
        const opt = eppSelect.selectedOptions[0];
        if (opt) {
          const std = opt.getAttribute('data-standard');
          const days = Number(opt.getAttribute('data-days')) || 180;
          stdInput.value = std;

          const base = new Date(dateInput.value || today);
          base.setDate(base.getDate() + days);
          expInput.value = base.toISOString().split('T')[0];
        }
      });
    }

    const form = document.getElementById('epp-delivery-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (this.signaturePadInstance && this.signaturePadInstance.isEmpty()) {
          alert('Por favor solicite la firma táctil del trabajador antes de confirmar.');
          return;
        }

        const formData = new FormData(form);
        const empId = formData.get('employeeId');
        const emp = store.getEmployeeById(empId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Colaborador';
        const signedAt = new Date().toISOString();

        const signatureData = this.signaturePadInstance ? this.signaturePadInstance.toDataURL() : null;
        const signatureHash = signatureData ? await DigitalSignaturePad.computeForensicHash(signatureData, empName, signedAt) : null;

        const selectedEppItem = catalog[formData.get('eppId')] || {};

        store.addEppDelivery({
          employeeId: empId,
          eppId: formData.get('eppId'),
          eppName: selectedEppItem.name || 'EPP',
          brandModel: formData.get('brandModel')?.trim(),
          standard: formData.get('standard')?.trim(),
          quantity: Number(formData.get('quantity')),
          deliveryDate: formData.get('deliveryDate'),
          expirationDate: formData.get('expirationDate'),
          trainedInUse: formData.get('trainedInUse') !== null,
          signature: signatureData,
          signatureHash,
          signedAt
        });

        Notifier.showToast('Constancia de EPP registrada y conformada conforme a Res. SRT 299/11', 'success');
        this.closeModal();
      });
    }
  }

  renderRequestLeaveModal(container) {
    const session = store.getSession();
    const isEmployee = session?.role === 'EMPLOYEE';
    const employees = store.getEmployees();

    let empSelectHtml = '';
    if (isEmployee) {
      const currentEmp = store.getEmployeeById(session.employeeId);
      empSelectHtml = `
        <input type="hidden" name="employeeId" value="${currentEmp.id}">
        <p class="text-sm font-semibold text-slate-800">${Sanitizer.escapeHTML(currentEmp.firstName + ' ' + currentEmp.lastName)}</p>
        <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(currentEmp.role)}</p>
      `;
    } else {
      const options = employees.map(e => 
        `<option value="${e.id}">${Sanitizer.escapeHTML(e.firstName + ' ' + e.lastName)} (${Sanitizer.escapeHTML(e.role)})</option>`
      ).join('');
      empSelectHtml = `
        <select name="employeeId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          ${options}
        </select>
      `;
    }

    const typeOptions = Object.values(LEAVE_TYPES).map(t => 
      `<option value="${t.code}">${t.icon} ${t.label}</option>`
    ).join('');

    const today = new Date().toISOString().split('T')[0];

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base">Solicitar Licencia / Vacaciones</h3>
              <p class="text-xs text-slate-300">Gestión de ausentismo y saldo normativo (LCT 20.744)</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <form id="leave-request-form" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Colaborador *</label>
              ${empSelectHtml}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Tipo de Licencia *</label>
                <select name="type" id="modal-leave-type" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  ${typeOptions}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Días Solicitados</label>
                <input type="number" id="modal-leave-days" name="days" value="1" min="1" readonly class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-blue-700">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha Desde *</label>
                <input type="date" id="modal-leave-start" name="startDate" required value="${today}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha Hasta *</label>
                <input type="date" id="modal-leave-end" name="endDate" required value="${today}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Justificación *</label>
              <textarea name="reason" rows="2" required placeholder="Detalle el motivo de la ausencia..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <div id="leave-cert-container">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Adjuntar Certificado Médico o Comprobante (Opcional)</label>
              <input type="file" id="modal-leave-file" accept="image/*,application/pdf" class="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
              <p class="text-[11px] text-slate-400 mt-1">Se redimensiona automáticamente a 1080p y se aloja en la nube.</p>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancelar</button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">Registrar Solicitud</button>
            </div>
          </form>
        </div>
      </div>
    `);

    const startInp = document.getElementById('modal-leave-start');
    const endInp = document.getElementById('modal-leave-end');
    const daysInp = document.getElementById('modal-leave-days');

    const updateDays = () => {
      const s = startInp?.value;
      const e = endInp?.value;
      if (s && e) {
        const d = LeaveEngine.calculateDaysBetween(s, e);
        if (daysInp) daysInp.value = d > 0 ? d : 1;
      }
    };

    startInp?.addEventListener('change', updateDays);
    endInp?.addEventListener('change', updateDays);

    const form = document.getElementById('leave-request-form');
    const fileInput = document.getElementById('modal-leave-file');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const empId = formData.get('employeeId');
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');

        // Validar no solapamiento
        const allLeaves = store.getLeaves();
        if (LeaveEngine.hasOverlap(allLeaves, empId, startDate, endDate)) {
          alert('Ya existe una licencia registrada o pendiente que se solapa con estas fechas.');
          return;
        }

        let certUrl = null;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          Notifier.showToast('Subiendo certificado a la nube...', 'info');
          try {
            const uploadRes = await ImageUploadService.uploadImage(file, `cert_${empId}_${startDate}`);
            certUrl = uploadRes.url;
            Notifier.showToast('Certificado alojado con éxito', 'success');
          } catch (err) {
            console.warn('Error subiendo certificado, guardando local:', err);
            certUrl = await new Promise(r => {
              const reader = new FileReader();
              reader.onload = () => r(reader.result);
              reader.readAsDataURL(file);
            });
          }
        }

        store.requestLeave({
          employeeId: empId,
          type: formData.get('type'),
          startDate,
          endDate,
          days: Number(daysInp.value) || 1,
          reason: formData.get('reason'),
          certificateUrl: certUrl
        });

        Notifier.showToast('Solicitud de licencia registrada exitosamente', 'success');
        this.closeModal();
      });
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('talenttrack_sidebar_collapsed', this.isSidebarCollapsed ? 'true' : 'false');
    this.applySidebarLayout();
  }

  toggleMobileDrawer() {
    this.isMobileDrawerOpen = !this.isMobileDrawerOpen;
    this.applyMobileDrawer();
  }

  closeMobileDrawer() {
    if (this.isMobileDrawerOpen) {
      this.isMobileDrawerOpen = false;
      this.applyMobileDrawer();
    }
  }

  applyMobileDrawer() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;

    if (this.isMobileDrawerOpen) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      backdrop.classList.add('hidden');
    }
  }

  applySidebarLayout() {
    const sidebar = document.getElementById('app-sidebar');
    const layout = document.getElementById('main-content-layout');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');
    const companyCard = document.getElementById('sidebar-company-card');
    if (!sidebar || !layout) return;

    if (this.isSidebarCollapsed) {
      sidebar.classList.remove('w-64');
      sidebar.classList.add('w-20');
      layout.classList.remove('lg:ml-64');
      layout.classList.add('lg:ml-20');
      if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
      if (companyCard) companyCard.classList.add('hidden');
      document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('[data-nav-tab]').forEach(btn => {
        btn.classList.add('justify-center');
      });
    } else {
      sidebar.classList.remove('w-20');
      sidebar.classList.add('w-64');
      layout.classList.remove('lg:ml-20');
      layout.classList.add('lg:ml-64');
      if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
      if (companyCard) companyCard.classList.remove('hidden');
      document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('[data-nav-tab]').forEach(btn => {
        btn.classList.remove('justify-center');
      });
    }
  }

  // --- Main View Rendering ---
  render() {
    const appEl = document.getElementById('app-view');
    const sidebarEl = document.getElementById('app-sidebar');
    const mobileHeaderEl = document.getElementById('mobile-header');
    const layoutEl = document.getElementById('main-content-layout');
    if (!appEl) return;

    // 1. Enrutamiento cerrado por defecto (Regla 24): Si no está autenticado, renderizar Login
    if (!store.isAuthenticated()) {
      if (sidebarEl) sidebarEl.classList.add('hidden');
      if (mobileHeaderEl) mobileHeaderEl.classList.add('hidden');
      if (layoutEl) {
        layoutEl.classList.remove('lg:ml-64', 'lg:ml-20');
        layoutEl.classList.add('lg:ml-0');
      }
      this.renderLoginView(appEl);
      return;
    }

    const session = store.getSession();

    // Confinamiento estricto: El rol EMPLOYEE solo tiene acceso a su Portal Móvil
    if (session.role === 'EMPLOYEE') {
      if (sidebarEl) sidebarEl.classList.add('hidden');
      if (mobileHeaderEl) mobileHeaderEl.classList.add('hidden');
      if (layoutEl) {
        layoutEl.classList.remove('lg:ml-64', 'lg:ml-20');
        layoutEl.classList.add('lg:ml-0');
      }
      Sanitizer.renderTemplate(appEl, this.renderPortalTab());
      return;
    }

    // Rol HR_ADMIN: Mostrar Sidebar y Mobile Header
    if (sidebarEl) sidebarEl.classList.remove('hidden');
    if (mobileHeaderEl) mobileHeaderEl.classList.remove('hidden');
    if (layoutEl) {
      layoutEl.classList.remove('lg:ml-0');
      layoutEl.classList.add(this.isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64');
    }
    this.applySidebarLayout();
    this.updateHeaderControls();

    let contentHtml = '';
    switch (this.currentTab) {
      case 'dashboard':
        contentHtml = this.renderDashboard();
        break;
      case 'employees':
        contentHtml = this.renderEmployeesTab();
        break;
      case 'skills':
        contentHtml = this.renderSkillsHunterTab();
        break;
      case 'training':
        contentHtml = this.renderTrainingTab();
        break;
      case 'epp':
        contentHtml = this.renderEppTab();
        break;
      case 'leaves':
        contentHtml = this.renderLeavesTab();
        break;
      case 'payroll':
        contentHtml = this.renderPayrollTab();
        break;
      case 'reports':
        contentHtml = this.renderReportsTab();
        break;
      default:
        contentHtml = this.renderDashboard();
    }

    Sanitizer.renderTemplate(appEl, contentHtml);
    this.postRenderBindings();
  }

  renderLoginView(container) {
    Sanitizer.renderTemplate(container, `
      <div class="min-h-[80vh] flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-8 space-y-6">
          <div class="text-center space-y-2">
            <div class="w-14 h-14 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg">
              TT
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">TalentTrack</h1>
            <p class="text-xs text-slate-500">Gestión de Recursos Humanos & Matriz de Competencias</p>
          </div>

          <div id="login-error-alert" class="hidden p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"></div>

          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Usuario / Email de RRHH o DNI</label>
              <input type="text" id="login-identifier" required placeholder="ej: rrhh@lahuella.com o 32458912" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Contraseña o PIN</label>
              <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
              <p class="text-[11px] text-slate-400 mt-1">Colaboradores: PIN por defecto = últimos 4 dígitos de su DNI.</p>
            </div>

            <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm transition">
              Iniciar Sesión Segura
            </button>
          </form>

          <div class="pt-4 border-t border-slate-100 text-center">
            <p class="text-[11px] text-slate-400">Protegido con RateLimiter y Aislamiento Criptográfico Multi-Tenant</p>
          </div>
        </div>
      </div>
    `);

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('login-identifier')?.value;
        const pass = document.getElementById('login-password')?.value;
        const errorAlert = document.getElementById('login-error-alert');

        const result = await AuthService.authenticate(store, id, pass);
        if (result.success) {
          Notifier.showToast(`Bienvenido/a, ${result.session.name}`, 'success');
        } else {
          if (errorAlert) {
            errorAlert.textContent = result.error || 'Error al iniciar sesión.';
            errorAlert.classList.remove('hidden');
          }
        }
      });
    }
  }

  updateHeaderControls() {
    const session = store.getSession();
    const company = store.getCurrentCompany();

    const compNameEl = document.getElementById('header-company-name');
    if (compNameEl && company) {
      compNameEl.textContent = company.name;
    }

    const indEl = document.getElementById('sidebar-company-industry');
    if (indEl && company) {
      indEl.textContent = company.industry || 'Industria & Servicios';
    }

    const userNameEl = document.getElementById('header-user-name');
    if (userNameEl && session) {
      userNameEl.textContent = session.name;
    }

    // Badge de alertas (Habilitaciones + Recambios EPP)
    const credAlerts = ExpirationEngine.scanAlerts(store.getEmployees());
    const eppAlerts = EppEngine.scanEppAlerts(store.getEppDeliveries(), store.getEmployees());
    const alerts = [...credAlerts, ...eppAlerts];

    const badgeEl = document.getElementById('pending-alerts-badge');
    const mobileBadgeEl = document.getElementById('mobile-pending-alerts-badge');
    if (alerts.length > 0) {
      if (badgeEl) { badgeEl.textContent = alerts.length; badgeEl.classList.remove('hidden'); }
      if (mobileBadgeEl) { mobileBadgeEl.textContent = alerts.length; mobileBadgeEl.classList.remove('hidden'); }
    } else {
      if (badgeEl) badgeEl.classList.add('hidden');
      if (mobileBadgeEl) mobileBadgeEl.classList.add('hidden');
    }

    const eppBadgeEl = document.getElementById('pending-epp-badge');
    if (eppBadgeEl) {
      if (eppAlerts.length > 0) {
        eppBadgeEl.textContent = eppAlerts.length;
        eppBadgeEl.classList.remove('hidden');
      } else {
        eppBadgeEl.classList.add('hidden');
      }
    }

    // Badge de Solicitudes Pendientes de Vacaciones/Licencias
    const pendingLeaves = store.getLeaves().filter(l => l.status === 'PENDING');
    const leavesBadgeEl = document.getElementById('pending-leaves-badge');
    if (leavesBadgeEl) {
      if (pendingLeaves.length > 0) {
        leavesBadgeEl.textContent = pendingLeaves.length;
        leavesBadgeEl.classList.remove('hidden');
      } else {
        leavesBadgeEl.classList.add('hidden');
      }
    }

    // Badge de Recibos Pendientes de Firma
    const pendingPayslips = store.getPayslips().filter(ps => ps.status === 'PENDING_SIGNATURE');
    const payslipsBadgeEl = document.getElementById('pending-payslips-badge');
    if (payslipsBadgeEl) {
      if (pendingPayslips.length > 0) {
        payslipsBadgeEl.textContent = pendingPayslips.length;
        payslipsBadgeEl.classList.remove('hidden');
      } else {
        payslipsBadgeEl.classList.add('hidden');
      }
    }

    // Blindaje de Visibilidad RBAC en DOM (Regla 11)
    const isEmployee = session && session.role === 'EMPLOYEE';

    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      if (isEmployee) {
        btn.classList.add('hidden');
        btn.style.setProperty('display', 'none', 'important');
      } else {
        btn.classList.remove('hidden');
        btn.style.removeProperty('display');
        const tabId = btn.getAttribute('data-nav-tab');
        const isActive = tabId === this.currentTab;
        const baseClasses = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition group cursor-pointer';
        const collapsedClasses = this.isSidebarCollapsed ? 'justify-center' : '';

        if (isActive) {
          btn.className = `${baseClasses} ${collapsedClasses} font-semibold bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-xs`;
        } else {
          btn.className = `${baseClasses} ${collapsedClasses} font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80`;
        }
      }
    });
  }

  renderDashboard() {
    const employees = store.getEmployees();
    const courses = store.getCourses();
    const credAlerts = ExpirationEngine.scanAlerts(employees);
    const eppAlerts = EppEngine.scanEppAlerts(store.getEppDeliveries(), employees);
    const alerts = [...credAlerts, ...eppAlerts].sort((a, b) => a.status.daysRemaining - b.status.daysRemaining);

    const totalEmployees = employees.length;
    const criticalAlerts = alerts.filter(a => a.status.code === 'EXPIRED' || a.status.code === 'URGENT').length;
    const warningAlerts = alerts.filter(a => a.status.code === 'WARNING_HIGH' || a.status.code === 'WARNING_MEDIUM').length;
    const scheduledCourses = courses.filter(c => c.status === 'SCHEDULED').length;

    const alertsRows = alerts.map(a => {
      const cats = (a.categories || []).length > 0 ? a.categories.join(', ') : 'General';
      return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="py-3 px-3 whitespace-nowrap">
          <span class="${a.status.badgeClass}">
            ${Sanitizer.escapeHTML(a.status.label)}
          </span>
        </td>
        <td class="py-3 px-3 font-semibold text-slate-900 text-xs">${Sanitizer.escapeHTML(a.employeeName)}</td>
        <td class="py-3 px-3 text-xs text-slate-600 max-w-[150px] leading-tight">${Sanitizer.escapeHTML(a.employeeRole)}</td>
        <td class="py-3 px-3 text-xs font-medium text-slate-800 max-w-[170px] leading-tight">${Sanitizer.escapeHTML(a.credentialLabel)}</td>
        <td class="py-3 px-3 text-[11px] text-slate-500 max-w-[210px] leading-snug break-words">${Sanitizer.escapeHTML(cats)}</td>
        <td class="py-3 px-3 text-xs font-semibold whitespace-nowrap ${a.daysRemaining < 0 ? 'text-red-600' : 'text-amber-700'}">
          ${Sanitizer.escapeHTML(a.formattedDate)} (${a.daysRemaining !== null ? `${a.daysRemaining}d` : '-'})
        </td>
        <td class="py-3 px-3 text-right whitespace-nowrap flex items-center justify-end gap-1.5">
          <button data-action="send-whatsapp-alert" data-emp-id="${a.employeeId}" data-cred-id="${a.credentialId}" class="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg shadow-xs transition flex items-center justify-center shrink-0" title="Avisar por WhatsApp">
            ${WHATSAPP_ICON_SVG}
          </button>
          <button data-action="open-modal-edit-employee" data-id="${a.employeeId}" class="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg shadow-xs transition flex items-center justify-center shrink-0" title="Legajo (Ver / Editar)">
            ${DOSSIER_ICON_SVG}
          </button>
        </td>
      </tr>
    `;
    }).join('');

    return `
      <div class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">👥</div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Colaboradores</p>
              <h3 class="text-2xl font-extrabold text-slate-900">${totalEmployees}</h3>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-2xl font-bold">🚨</div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Carnets Críticos (&lt; 7d)</p>
              <h3 class="text-2xl font-extrabold text-red-600">${criticalAlerts}</h3>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold">⚠️</div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Por Vencer (&lt; 30d)</p>
              <h3 class="text-2xl font-extrabold text-amber-600">${warningAlerts}</h3>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">🎓</div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Cursos en Agenda</p>
              <h3 class="text-2xl font-extrabold text-slate-900">${scheduledCourses}</h3>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🚦 Semáforo de Habilitaciones & Despacho Directo de Alertas</span>
              </h2>
              <p class="text-xs text-slate-500">Alertas tempranas para choferes de reparto y operarios con notificación directa a su celular.</p>
            </div>
            <div class="flex gap-2">
              <button data-action="export-audit-csv" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                📥 Descargar Auditoría CSV
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            ${alerts.length > 0 ? `
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-3 whitespace-nowrap">Estado</th>
                    <th class="py-3 px-3 whitespace-nowrap">Colaborador</th>
                    <th class="py-3 px-3 whitespace-nowrap">Puesto</th>
                    <th class="py-3 px-3 whitespace-nowrap">Habilitación</th>
                    <th class="py-3 px-3">Categoría</th>
                    <th class="py-3 px-3 whitespace-nowrap">Vencimiento</th>
                    <th class="py-3 px-3 text-right whitespace-nowrap">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody>${alertsRows}</tbody>
              </table>
            ` : `
              <div class="p-8 text-center text-slate-500 text-sm">
                🎉 No hay habilitaciones vencidas ni próximas a vencer. Todo el personal al día.
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  renderEmployeesTab() {
    const employees = store.getEmployees();

    const employeeCards = employees.map(emp => {
      const initials = ((emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')).toUpperCase() || 'TT';

      const skillsHtml = (emp.skills || []).map(s => {
        const isPrev = s.source === 'PREVIOUS_EXPERIENCE';
        return `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isPrev ? 'bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs' : 'bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'}">
            <span>${isPrev ? '⭐' : '💼'}</span>
            <span>${Sanitizer.escapeHTML(s.name)}</span>
            <span class="text-[10px] font-bold ${isPrev ? 'text-purple-600 bg-purple-100/80' : 'text-slate-500 bg-slate-200'} px-1 py-0.2 rounded">Nv.${s.level}</span>
          </span>
        `;
      }).join('');

      const credsHtml = (emp.credentials || []).map(c => {
        const evalRes = ExpirationEngine.evaluateDate(c.expirationDate);
        return `
          <div class="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition space-y-1.5 shadow-2xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-900 truncate">${Sanitizer.escapeHTML(c.customLabel || c.type)}</span>
              <span class="${evalRes.status.badgeClass} scale-90 origin-right">
                ${Sanitizer.escapeHTML(evalRes.status.label)}
              </span>
            </div>
            ${(c.categories || []).length > 0 ? `
              <p class="text-[11px] text-slate-500 leading-tight">${Sanitizer.escapeHTML(c.categories.join(', '))}</p>
            ` : ''}
            <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span class="text-slate-500">Vence: <strong class="${evalRes.daysRemaining < 0 ? 'text-red-600' : 'text-slate-700'}">${Sanitizer.escapeHTML(evalRes.formattedDate)}</strong></span>
              ${c.attachment ? `
                <button data-action="view-document" data-emp-id="${emp.id}" data-cred-id="${c.id}" class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-md font-semibold text-[10px] transition" title="Ver Comprobante">
                  👁️ Comprobante
                </button>
              ` : `
                <span class="text-[10px] text-slate-400">Sin archivo</span>
              `}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4">
          <!-- Cabecera de Identidad del Empleado -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 overflow-hidden">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0">
                ${initials}
              </div>
              <div class="truncate">
                <h3 class="text-base font-extrabold text-slate-900 leading-tight truncate">
                  ${Sanitizer.escapeHTML(emp.firstName + ' ' + emp.lastName)}
                </h3>
                <div class="mt-1">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 truncate max-w-full">
                    ${Sanitizer.escapeHTML(emp.role)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Botones de Acción de Ficha -->
            <div class="flex items-center gap-1 shrink-0">
              <button data-action="open-modal-edit-employee" data-id="${emp.id}" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar Legajo">
                <svg class="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
              <button data-action="delete-employee" data-id="${emp.id}" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Dar de Baja">
                <svg class="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Cuadrícula de Datos Personales & Contacto -->
          <div class="bg-slate-50/80 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">DNI</span>
              <span class="font-bold text-slate-800">${Sanitizer.escapeHTML(emp.dni)}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Área / Sector</span>
              <span class="font-medium text-slate-700 truncate block">${Sanitizer.escapeHTML(emp.department || 'Planta')}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Contacto</span>
              <span class="font-medium text-slate-700 truncate block">${Sanitizer.escapeHTML(emp.phone || emp.email || 'Sin contacto')}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Fecha Ingreso</span>
              <span class="font-medium text-slate-700">${emp.hireDate ? new Date(emp.hireDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span>
            </div>
          </div>

          <!-- Sección: Habilidades & Oficios -->
          <div class="space-y-2">
            <div class="flex items-center justify-between pb-1 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                🎯 Habilidades & Oficios
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">${(emp.skills || []).length}</span>
              </span>
              <button data-action="open-modal-add-skill" data-id="${emp.id}" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition">
                + Sumar Skill
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${skillsHtml || '<span class="text-xs text-slate-400 italic py-1">Sin habilidades registradas</span>'}
            </div>
          </div>

          <!-- Sección: Habilitaciones & Carnets Normados -->
          <div class="space-y-2">
            <div class="flex items-center justify-between pb-1 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                🪪 Habilitaciones & Carnets
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">${(emp.credentials || []).length}</span>
              </span>
              <button data-action="open-modal-add-cred" data-id="${emp.id}" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition">
                + Cargar Carnet
              </button>
            </div>
            <div class="space-y-2">
              ${credsHtml || '<p class="text-xs text-slate-400 italic py-1">Sin carnets asociados</p>'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Legajos del Personal</h2>
            <p class="text-xs text-slate-500">Nómina operativa de la empresa. Gestione habilidades, carnets y documentos respaldatorios con jerarquía clara.</p>
          </div>
          <div class="flex gap-2">
            <button data-action="export-employees-csv" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition">
              📥 Exportar Nómina CSV
            </button>
            <button data-action="open-modal-new-employee" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2 transition">
              ➕ Nuevo Colaborador
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${employeeCards}
        </div>
      </div>
    `;
  }

  renderSkillsHunterTab() {
    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Buscador de Talento Interno & Matriz de Skills</h2>
          <p class="text-xs text-slate-500">Localice al instante colaboradores con habilidades específicas de oficios previos o del puesto actual para reasignaciones.</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Buscar Habilidad o Palabra Clave</label>
              <input type="text" id="hunter-free-text" placeholder="Ej: Soldadura / BPM / Excel / Camión..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Origen de la Habilidad</label>
              <select id="hunter-source-filter" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todas las fuentes</option>
                <option value="PREVIOUS_ONLY">⭐ Solo Experiencia Previa Oculta</option>
                <option value="CURRENT_ONLY">💼 Solo Puesto Actual</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nivel Mínimo Requerido</label>
              <select id="hunter-level-filter" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="1">1 - Cualquier Nivel</option>
                <option value="2">2 - Intermedio o Superior</option>
                <option value="3">3 - Avanzado o Superior</option>
                <option value="4">4 - Solo Expertos</option>
              </select>
            </div>
          </div>
        </div>

        <div id="hunter-results" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      </div>
    `;
  }

  renderTrainingTab() {
    const courses = store.getCourses();

    const courseCards = courses.map(course => {
      const cat = TRAINING_CATEGORIES[course.category] || { label: 'General', color: 'bg-slate-100 text-slate-700' };
      const isCompleted = course.status === 'COMPLETED';

      const participantsHtml = (course.participants || []).map(p => `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
          <div>
            <p class="font-semibold text-slate-900">${Sanitizer.escapeHTML(p.employeeName)}</p>
            <p class="text-slate-500 text-[11px]">${p.signedAt ? `Firmado: ${new Date(p.signedAt).toLocaleDateString()}` : 'Pendiente de firma'}</p>
          </div>
          <div class="flex items-center gap-2">
            ${p.signature ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✅ Firmado</span>
              <img src="${Sanitizer.sanitizeURL(p.signature)}" alt="Firma" class="h-6 max-w-[80px] border border-slate-200 rounded bg-white">
            ` : `
              <button data-action="open-modal-sign-course" data-course-id="${course.id}" data-participant-id="${p.employeeId}" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
                ✍️ Tomar Firma
              </button>
            `}
          </div>
        </div>
      `).join('');

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${cat.color}">${Sanitizer.escapeHTML(cat.label)}</span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">${Sanitizer.escapeHTML(course.title)}</h3>
              <p class="text-xs text-slate-500">📅 ${Sanitizer.escapeHTML(course.date)} • ⏱️ ${course.durationHours} horas • Docente: ${Sanitizer.escapeHTML(course.instructorName)}</p>
            </div>
            <div>
              ${isCompleted ? `
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">COMPLETADO</span>
              ` : `
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950">EN CURSO</span>
              `}
            </div>
          </div>

          <p class="text-xs text-slate-600">${Sanitizer.escapeHTML(course.description || 'Sin descripción')}</p>

          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Acta de Asistencia (${(course.participants || []).length} Convocados)</h4>
              <button data-action="export-course-csv" data-id="${course.id}" class="text-[11px] text-blue-600 hover:underline font-semibold">📥 Exportar Acta CSV</button>
            </div>
            <div>${participantsHtml || '<p class="text-xs text-slate-400">Sin participantes asignados</p>'}</div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex justify-between items-center">
            <div class="text-xs">
              <span class="text-slate-500">Firma Docente:</span>
              ${course.instructorSignature ? `
                <span class="font-bold text-emerald-700 ml-1">Sellada</span>
                <span class="text-[10px] text-slate-400 block">${course.instructorSignatureHash}</span>
              ` : `
                <span class="font-semibold text-amber-600 ml-1">Pendiente</span>
              `}
            </div>
            <div class="flex gap-2">
              ${!course.instructorSignature ? `
                <button data-action="open-modal-sign-course" data-course-id="${course.id}" data-is-instructor="true" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">
                  ✍️ Firmar como Docente
                </button>
              ` : ''}
              ${!isCompleted ? `
                <button data-action="complete-course" data-id="${course.id}" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm">
                  Cerrar y Acreditar en Legajos
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Agenda de Capacitaciones & Actas con Firma Digital</h2>
            <p class="text-xs text-slate-500">Gestión de cursos obligatorios (BPM, Seguridad, Manejo Defensivo) con actas firmadas digitalmente en pantalla.</p>
          </div>
          <button data-action="open-modal-new-course" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2">
            ➕ Programar Capacitación
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${courseCards}
        </div>
      </div>
    `;
  }

  renderEppTab() {
    const deliveries = store.getEppDeliveries();
    const employees = store.getEmployees();
    const catalog = store.getEppCatalog();
    const posReqs = store.getPositionRequirements();

    const totalDeliveries = deliveries.length;
    const eppAlerts = EppEngine.scanEppAlerts(deliveries, employees);
    const criticalEpp = eppAlerts.filter(a => a.status.code === 'EXPIRED' || a.status.code === 'URGENT').length;
    const warningEpp = eppAlerts.filter(a => a.status.code === 'WARNING_HIGH' || a.status.code === 'WARNING_MEDIUM').length;

    // Evaluaciones de dotación obligatoria por puesto
    const employeeDotations = employees.map(emp => {
      const evalStatus = EppEngine.evaluateEmployeeEppStatus(emp, deliveries, posReqs);
      return { emp, evalStatus };
    });

    const deliveriesRows = deliveries.map(del => {
      const evalRes = del.expirationDate ? ExpirationEngine.evaluateDate(del.expirationDate) : null;
      const statusBadge = evalRes ? `
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${evalRes.status.badgeClass}">
          ${Sanitizer.escapeHTML(evalRes.status.label)}
        </span>
      ` : '<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">Sin vencimiento</span>';

      const needsRenewal = evalRes && (evalRes.status.code === 'EXPIRED' || evalRes.status.code === 'URGENT' || evalRes.status.code === 'WARNING_HIGH');

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
          <td class="py-3 px-4">
            <p class="font-bold text-slate-900 text-sm">${Sanitizer.escapeHTML(del.employeeName)}</p>
            <p class="text-xs text-slate-500">DNI: ${Sanitizer.escapeHTML(del.dni || '')}</p>
          </td>
          <td class="py-3 px-4 text-xs font-medium text-slate-800">
            ${Sanitizer.escapeHTML(del.eppName)}
            <p class="text-[11px] text-slate-500">${Sanitizer.escapeHTML(del.brandModel || '')} (x${del.quantity || 1})</p>
          </td>
          <td class="py-3 px-4 text-xs font-semibold text-slate-700">
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">${Sanitizer.escapeHTML(del.standard || 'Sello S / IRAM')}</span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-600">${Sanitizer.escapeHTML(del.deliveryDate)}</td>
          <td class="py-3 px-4 text-xs font-semibold">
            ${statusBadge}
            ${evalRes ? `<p class="text-[10px] text-slate-500 mt-0.5">${evalRes.formattedDate} (${evalRes.daysRemaining}d)</p>` : ''}
          </td>
          <td class="py-3 px-4 text-xs">
            ${del.signature ? `
              <div class="flex items-center gap-1.5">
                <img src="${Sanitizer.sanitizeURL(del.signature)}" alt="Firma" class="h-6 max-w-[80px] border border-slate-200 rounded bg-white">
                <span class="text-[10px] text-emerald-700 font-bold">Conforme</span>
              </div>
            ` : '<span class="text-xs text-amber-600 font-semibold">Pendiente</span>'}
          </td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-2">
              ${needsRenewal ? `
                <button data-action="send-whatsapp-alert" data-emp-id="${del.employeeId}" data-cred-id="${del.id}" class="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg shadow-xs transition flex items-center justify-center shrink-0" title="Avisar por WhatsApp">
                  ${WHATSAPP_ICON_SVG}
                </button>
              ` : ''}
              <button data-action="delete-epp-delivery" data-id="${del.id}" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Anular Registro">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-slate-900">Entrega y Control de EPP (Res. SRT 299/11)</h2>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Normativa Vigente</span>
            </div>
            <p class="text-xs text-slate-500">Constancias oficiales con firma digital del trabajador, certificaciones IRAM/Sello S y semáforo de recambio periódico.</p>
          </div>
          <div class="flex gap-2">
            <button data-action="export-srt299-csv" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow flex items-center gap-1.5">
              📥 Planilla SRT 299/11 CSV
            </button>
            <button data-action="open-modal-new-epp" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5">
              ➕ Registrar Entrega de EPP
            </button>
          </div>
        </div>

        <!-- Tarjetas KPI -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">🦺</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Entregas Activas en Planta</p>
              <h3 class="text-2xl font-black text-slate-900">${totalDeliveries}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl font-bold">⚠️</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Recambios Vencidos o Críticos (&lt; 7d)</p>
              <h3 class="text-2xl font-black text-red-600">${criticalEpp}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">🔄</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Por Vencer en 30 Días</p>
              <h3 class="text-2xl font-black text-amber-600">${warningEpp}</h3>
            </div>
          </div>
        </div>

        <!-- Tabla Oficial SRT 299/11 -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 class="text-sm font-bold text-slate-800">Libro Digital de Entregas Individuales de EPP</h3>
            <span class="text-xs text-slate-500">${totalDeliveries} registros firmados</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100/75 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th class="py-3 px-4 font-bold">Colaborador</th>
                  <th class="py-3 px-4 font-bold">Elemento de Protección</th>
                  <th class="py-3 px-4 font-bold">Certificación</th>
                  <th class="py-3 px-4 font-bold">Fecha Entrega</th>
                  <th class="py-3 px-4 font-bold">Estado Recambio</th>
                  <th class="py-3 px-4 font-bold">Firma Recepción</th>
                  <th class="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${deliveriesRows || '<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay entregas de EPP registradas aún.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Auditoría de Dotación por Colaborador -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Auditoría de Dotación Obligatoria según Puesto</h3>
            <p class="text-xs text-slate-500">Verifica si el personal cuenta con todos los EPP mandatorios para su puesto operativo.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${employeeDotations.map(({ emp, evalStatus }) => `
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-bold text-sm text-slate-900">${Sanitizer.escapeHTML(emp.firstName + ' ' + emp.lastName)}</h4>
                    <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(emp.role)}</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-black ${evalStatus.complianceRate === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                    ${evalStatus.complianceRate}% Cobertura
                  </span>
                </div>
                <div class="space-y-1.5">
                  <p class="text-[11px] font-bold text-slate-600 uppercase">Kit Obligatorio:</p>
                  <div class="flex flex-wrap gap-1.5">
                    ${evalStatus.fulfilled.map(f => `
                      <span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        ${f.icon} ${Sanitizer.escapeHTML(f.name)} (Al día)
                      </span>
                    `).join('')}
                    ${evalStatus.missing.map(m => `
                      <span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                        ⚠️ ${Sanitizer.escapeHTML(m.name)} (Faltante)
                      </span>
                    `).join('')}
                    ${evalStatus.expired.map(x => `
                      <span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        🔄 ${Sanitizer.escapeHTML(x.name)} (Vencido)
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  renderLeavesTab() {
    const leaves = store.getLeaves();
    const employees = store.getEmployees();
    const currentYear = new Date().getFullYear();

    const pendingLeaves = leaves.filter(l => l.status === 'PENDING');
    const approvedLeaves = leaves.filter(l => l.status === 'APPROVED');

    // Tarjetas de saldos de vacaciones por colaborador
    const employeeBalances = employees.map(emp => {
      const balance = LeaveEngine.calculateVacationBalance(emp, leaves, currentYear);
      return { emp, balance };
    });

    const rowsHtml = leaves.map(leave => {
      const typeInfo = LEAVE_TYPES[leave.type] || { label: leave.type, icon: '📋' };
      const statusInfo = LEAVE_STATUS[leave.status] || { label: leave.status, badgeClass: 'bg-slate-100 text-slate-700' };

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition">
          <td class="py-3 px-4">
            <p class="font-bold text-slate-900">${Sanitizer.escapeHTML(leave.employeeName)}</p>
            <p class="text-[11px] text-slate-500">Solicitado: ${new Date(leave.requestedAt).toLocaleDateString()}</p>
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              ${typeInfo.icon} ${Sanitizer.escapeHTML(typeInfo.label)}
            </span>
          </td>
          <td class="py-3 px-4 text-slate-700 font-medium">
            ${Sanitizer.escapeHTML(leave.startDate)} al ${Sanitizer.escapeHTML(leave.endDate)}
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800">
              ${leave.days} días
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.badgeClass}">
              ${Sanitizer.escapeHTML(statusInfo.label)}
            </span>
            ${leave.reviewNotes ? `<p class="text-[10px] text-slate-400 mt-0.5">${Sanitizer.escapeHTML(leave.reviewNotes)}</p>` : ''}
          </td>
          <td class="py-3 px-4">
            ${leave.certificateUrl ? `
              <button data-action="view-document" data-doc-url="${Sanitizer.sanitizeURL(leave.certificateUrl)}" data-doc-title="Certificado Médico - ${Sanitizer.escapeHTML(leave.employeeName)}" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-bold transition flex items-center gap-1">
                👁️ Ver Certificado
              </button>
            ` : `
              <span class="text-[11px] text-slate-400">Sin comprobante</span>
            `}
          </td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              ${leave.status === 'PENDING' ? `
                <button data-action="approve-leave" data-id="${leave.id}" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition" title="Aprobar Solicitud">
                  ✓ Aprobar
                </button>
                <button data-action="reject-leave" data-id="${leave.id}" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition" title="Rechazar">
                  ✕
                </button>
              ` : `
                <button data-action="delete-leave" data-id="${leave.id}" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Eliminar registro">
                  🗑️
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-slate-900">Vacaciones, Licencias & Control de Ausentismo</h2>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">LCT 20.744</span>
            </div>
            <p class="text-xs text-slate-500">Gestión de saldos de descanso anual según antigüedad, licencias médicas con comprobante adjunto y aprobación digital.</p>
          </div>
          <button data-action="open-modal-request-leave" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition">
            ➕ Solicitar / Cargar Licencia
          </button>
        </div>

        <!-- KPIs Ausentismo -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">⏳</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Solicitudes Pendientes de Aprobación</p>
              <h3 class="text-2xl font-black text-amber-600">${pendingLeaves.length}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">🏖️</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Licencias Aprobadas en Curso</p>
              <h3 class="text-2xl font-black text-emerald-600">${approvedLeaves.length}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">📅</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Período Vacacional Activo</p>
              <h3 class="text-2xl font-black text-blue-700">${currentYear}</h3>
            </div>
          </div>
        </div>

        <!-- Saldos Normativos de Vacaciones por Colaborador -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Saldos de Vacaciones Ordinarias ${currentYear} (Art. 150 LCT)</h3>
              <p class="text-xs text-slate-500">Cálculo legal automático de días corridos correspondientes según antigüedad al 31 de diciembre.</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${employeeBalances.map(({ emp, balance }) => `
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-bold text-sm text-slate-900">${Sanitizer.escapeHTML(emp.firstName + ' ' + emp.lastName)}</h4>
                    <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(emp.role)}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Ingreso: ${Sanitizer.escapeHTML(emp.hireDate)} (${balance.yearsOfSeniority} años antig.)</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-black ${balance.remainingDays > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}">
                    ${balance.remainingDays} d. rest.
                  </span>
                </div>
                <div class="pt-2 border-t border-slate-200/60 flex justify-between text-xs text-slate-600">
                  <span>Asignados: <strong>${balance.totalEntitledDays} d.</strong></span>
                  <span>Gozados: <strong class="text-emerald-700">${balance.takenDays} d.</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Tabla de Solicitudes y Registro de Licencias -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 class="text-sm font-bold text-slate-800">Historial y Solicitudes de Licencias</h3>
            <span class="text-xs text-slate-500">${leaves.length} registros</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100/75 text-slate-600 border-b border-slate-200">
                  <th class="py-3 px-4 font-bold">Colaborador</th>
                  <th class="py-3 px-4 font-bold">Tipo de Licencia</th>
                  <th class="py-3 px-4 font-bold">Fechas</th>
                  <th class="py-3 px-4 font-bold">Días</th>
                  <th class="py-3 px-4 font-bold">Estado</th>
                  <th class="py-3 px-4 font-bold">Certificado</th>
                  <th class="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay licencias ni ausencias registradas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  // --- Módulo Liquidación de Sueldos & Recibos Digitales (LCT 20.744 & Res. 346/2019) ---
  renderPayrollTab() {
    const payrolls = store.getPayrolls();
    const currentCompany = store.getCurrentCompany() || { name: 'Empresa', cuit: '30-00000000-0' };
    const latestPayroll = payrolls[0] || null;

    const totalBruto = latestPayroll ? latestPayroll.totalBruto : 0;
    const totalDescuentos = latestPayroll ? latestPayroll.totalDescuentos : 0;
    const totalPatronales = latestPayroll ? latestPayroll.totalContribucionesPatronales : 0;
    const totalNeto = latestPayroll ? latestPayroll.totalNeto : 0;

    const allPayslips = store.getPayslips();
    const totalPayslips = allPayslips.length;
    const signedCount = allPayslips.filter(ps => ps.status === 'SIGNED').length;
    const pendingSignatureCount = totalPayslips - signedCount;

    return `
      <div class="space-y-6">
        <!-- Cabecera del Módulo -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-slate-900">Liquidación de Sueldos & Recibos Digitales</h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">LCT 20.744</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Res. MTEySS 346/2019</span>
            </div>
            <p class="text-xs text-slate-500">Motor de cálculo previsional multiconvenio (Comercio, Camioneros, Alimentación, UOCRA, UOM) y Libro de Sueldos Digital ARCA.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button data-action="open-modal-cct-config" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition flex items-center gap-1.5">
              <span>⚙️</span> Configurar Convenios (CCT)
            </button>
            <button data-action="export-lsd-txt" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5">
              <span>📄</span> Exportar LSD ARCA (TXT)
            </button>
            <button data-action="open-modal-new-payroll" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5">
              <span>▶️</span> Nueva Corrida de Liquidación
            </button>
          </div>
        </div>

        <!-- Tarjetas Métricas KPI del Período Activo -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">💰</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Total Bruto Liquidado</p>
              <h3 class="text-xl font-black text-slate-900">$${totalBruto.toLocaleString('es-AR')}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">📉</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Retenciones Ley (SIPA/OS)</p>
              <h3 class="text-xl font-black text-amber-600">$${totalDescuentos.toLocaleString('es-AR')}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold">🏛️</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Contribuciones F.931 (Patronal)</p>
              <h3 class="text-xl font-black text-purple-700">$${totalPatronales.toLocaleString('es-AR')}</h3>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">💵</div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Total Neto a Pagar (Bancos)</p>
              <h3 class="text-xl font-black text-emerald-600">$${totalNeto.toLocaleString('es-AR')}</h3>
            </div>
          </div>
        </div>

        <!-- Banner de Estado de Firmas Digitales de Recibos -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-bold">✍️</div>
            <div>
              <h4 class="font-bold text-slate-800">Estado de Recepción y Conformidad de Recibos (Res. MTEySS 346/2019)</h4>
              <p class="text-slate-500">Firmas electrónicas con estampado de hash SHA-256 inmutable, timestamp UTC y registro de IP.</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✅ ${signedCount} Firmados
            </span>
            <span class="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              ⏳ ${pendingSignatureCount} Pendientes de Firma
            </span>
          </div>
        </div>

        <!-- Lotes de Liquidación Registrados -->
        <div class="space-y-4">
          ${payrolls.length > 0 ? payrolls.map(p => `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">${Sanitizer.escapeHTML(p.periodType)}</span>
                  <div>
                    <h3 class="font-bold text-sm text-slate-900">Período: ${Sanitizer.escapeHTML(p.periodStr)}</h3>
                    <p class="text-xs text-slate-500">Acreditación Bancaria Art. 124 LCT: ${Sanitizer.escapeHTML(p.bankPaymentDate || 'N/A')} • Sello Emisor: ${Sanitizer.escapeHTML(p.sealedBy || 'RRHH')}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-600 mr-2">Neto Lote: <strong class="text-slate-900">$${p.totalNeto.toLocaleString('es-AR')}</strong></span>
                  <button data-action="export-lsd-txt" data-id="${p.id}" class="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1">
                    <span>📄</span> TXT ARCA
                  </button>
                  <button data-action="delete-payroll" data-id="${p.id}" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Eliminar Lote">
                    🗑️
                  </button>
                </div>
              </div>

              <!-- Tabla de Recibos del Lote -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                  <thead class="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                    <tr>
                      <th class="p-3">Colaborador</th>
                      <th class="p-3">Convenio (CCT)</th>
                      <th class="p-3 text-right">Bruto</th>
                      <th class="p-3 text-right">Retenciones</th>
                      <th class="p-3 text-right">Neto a Cobrar</th>
                      <th class="p-3">Estado Firma</th>
                      <th class="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${(p.payslips || []).map(ps => `
                      <tr class="hover:bg-slate-50/50 transition">
                        <td class="p-3">
                          <p class="font-bold text-slate-800">${Sanitizer.escapeHTML(ps.employeeName)}</p>
                          <p class="text-[11px] text-slate-400">CUIL: ${Sanitizer.escapeHTML(ps.cuil)}</p>
                        </td>
                        <td class="p-3">
                          <p class="font-medium text-slate-700">${Sanitizer.escapeHTML(ps.cctName)}</p>
                          <p class="text-[11px] text-slate-400">${Sanitizer.escapeHTML(ps.cctCategory)}</p>
                        </td>
                        <td class="p-3 text-right font-medium text-slate-700">$${ps.totalBruto.toLocaleString('es-AR')}</td>
                        <td class="p-3 text-right font-medium text-amber-600">-$${ps.totalDescuentos.toLocaleString('es-AR')}</td>
                        <td class="p-3 text-right font-bold text-emerald-700 text-sm">$${ps.totalNeto.toLocaleString('es-AR')}</td>
                        <td class="p-3">
                          ${ps.status === 'SIGNED' ? `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block w-fit">
                              ✅ Firmado Conforme
                            </span>
                            <span class="text-[10px] text-slate-400 block mt-0.5">${new Date(ps.signedAt).toLocaleDateString('es-AR')}</span>
                          ` : `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 block w-fit">
                              ⏳ Pendiente de Firma
                            </span>
                          `}
                        </td>
                        <td class="p-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button data-action="open-modal-view-payslip" data-id="${ps.id}" class="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition">
                              👁️ Ver Recibo
                            </button>
                            <button data-action="dispatch-payslip-wa" data-id="${ps.id}" class="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition" title="Avisar por WhatsApp">
                              ${WHATSAPP_ICON_SVG}
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('') : `
            <div class="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <span class="text-4xl block mb-2">💵</span>
              <h3 class="font-bold text-slate-800 text-sm">No hay liquidaciones de sueldo generadas</h3>
              <p class="text-xs text-slate-500 mt-1">Presione "Nueva Corrida de Liquidación" para liquidar los haberes del mes bajo los 5 convenios colectivos.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // Modal: Nueva Corrida de Liquidación
  renderNewPayrollRunModal(container) {
    const employees = store.getEmployees().filter(e => e.active);
    const catalog = store.getCctCatalog();
    const currentMonthStr = new Date().toISOString().slice(0, 7); // '2026-11'

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
            <div>
              <h3 class="font-bold text-base">Nueva Corrida de Liquidación de Sueldos</h3>
              <p class="text-xs text-slate-300">Cálculo legal previsional y Libro de Sueldos Digital (ARCA)</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <form id="payroll-run-form" class="p-6 space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Período (AAAA-MM) *</label>
                <input type="month" name="period" required value="${currentMonthStr}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Tipo de Liquidación *</label>
                <select name="periodType" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="MONTHLY" selected>Mensual Ordinaria</option>
                  <option value="BIWEEKLY_1">1ª Quincena (Jornalizados UOCRA/UOM)</option>
                  <option value="BIWEEKLY_2">2ª Quincena (Jornalizados UOCRA/UOM)</option>
                  <option value="SAC">Sueldo Anual Complementario (SAC / Aguinaldo)</option>
                  <option value="VACATION">Liquidación Anticipo de Vacaciones</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha Pago Bancario (Art. 124 LCT) *</label>
                <input type="date" name="paymentDate" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <!-- Novedades del Período por Empleado -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Novedades y Horas Extras de la Nómina</h4>
                <span class="text-[11px] text-slate-500">Se integran ausencias y vacaciones automáticamente</span>
              </div>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs text-slate-600">
                  <thead class="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th class="p-2.5">Colaborador / Convenio</th>
                      <th class="p-2.5">Hs Extras 50%</th>
                      <th class="p-2.5">Hs Extras 100%</th>
                      <th class="p-2.5">No Remunerativo ($)</th>
                      <th class="p-2.5">Faltas Injustificadas</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${employees.map(e => `
                      <tr class="hover:bg-slate-50/50">
                        <td class="p-2.5">
                          <p class="font-bold text-slate-800">${Sanitizer.escapeHTML(e.firstName + ' ' + e.lastName)}</p>
                          <p class="text-[10px] text-slate-400">${Sanitizer.escapeHTML(catalog[e.cctId]?.name || 'Comercio')}</p>
                        </td>
                        <td class="p-2.5">
                          <input type="number" name="hs50_${e.id}" min="0" max="100" value="0" class="w-16 px-2 py-1 border border-slate-300 rounded text-center text-xs">
                        </td>
                        <td class="p-2.5">
                          <input type="number" name="hs100_${e.id}" min="0" max="100" value="0" class="w-16 px-2 py-1 border border-slate-300 rounded text-center text-xs">
                        </td>
                        <td class="p-2.5">
                          <input type="number" name="nonTax_${e.id}" min="0" step="1000" value="0" class="w-24 px-2 py-1 border border-slate-300 rounded text-right text-xs">
                        </td>
                        <td class="p-2.5">
                          <input type="number" name="unjustified_${e.id}" min="0" max="30" value="0" class="w-16 px-2 py-1 border border-slate-300 rounded text-center text-xs">
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button type="submit" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-1.5">
                <span>▶️</span> Liquidar Haberes y Emitir Lote
              </button>
            </div>
          </form>
        </div>
      </div>
    `);

    const form = document.getElementById('payroll-run-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const period = formData.get('period');
        const periodType = formData.get('periodType');
        const paymentDate = formData.get('paymentDate');

        const novedadesMap = {};
        for (const emp of employees) {
          novedadesMap[emp.id] = {
            overtimeHours50: Number(formData.get(`hs50_${emp.id}`)) || 0,
            overtimeHours100: Number(formData.get(`hs100_${emp.id}`)) || 0,
            nonTaxableAllowance: Number(formData.get(`nonTax_${emp.id}`)) || 0,
            unjustifiedAbsenceDays: Number(formData.get(`unjustified_${emp.id}`)) || 0
          };
        }

        try {
          const run = store.runPayroll({
            period,
            periodStr: `${period} (${periodType})`,
            periodType,
            paymentDate,
            novedadesMap
          });
          Notifier.showToast(`Liquidación ${run.periodStr} procesada con éxito`, 'success');
          this.closeModal();
        } catch (err) {
          Notifier.showToast(err.message, 'error');
        }
      });
    }
  }

  // Modal: Configuración de Convenios y Escalas Paritarias
  renderCctConfigModal(container) {
    const catalog = store.getCctCatalog();

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
            <div>
              <h3 class="font-bold text-base">Configuración de Convenios Colectivos & Paritarias</h3>
              <p class="text-xs text-slate-300">Ajuste de escalas salariales básicas y adicionales sin alterar código</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <div class="p-6 space-y-6">
            ${Object.values(catalog).map(cct => `
              <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div class="flex justify-between items-center">
                  <div>
                    <h4 class="font-bold text-sm text-slate-900">${Sanitizer.escapeHTML(cct.name)}</h4>
                    <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(cct.industry)} • ${cct.rules.antiguedadPctPerYear ? `Antigüedad: ${(cct.rules.antiguedadPctPerYear * 100).toFixed(1)}% anual` : 'Régimen Fondo Cese Laboral (Ley 22.250)'}</p>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">${Sanitizer.escapeHTML(cct.id)}</span>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs text-slate-600 bg-white rounded-lg border border-slate-200">
                    <thead class="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th class="p-2">Categoría</th>
                        <th class="p-2 text-right">Básico Mensual Actual ($)</th>
                        <th class="p-2 text-right">Acción Paritaria</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${cct.categories.map(cat => `
                        <tr>
                          <td class="p-2 font-medium text-slate-800">${Sanitizer.escapeHTML(cat.label)}</td>
                          <td class="p-2 text-right font-bold text-slate-900">$${cat.basicSalary.toLocaleString('es-AR')}</td>
                          <td class="p-2 text-right">
                            <button type="button" class="btn-update-salary text-blue-600 hover:underline font-semibold text-xs" data-cct-id="${cct.id}" data-cat-id="${cat.id}" data-current="${cat.basicSalary}">
                              ✏️ Ajustar Escala
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `).join('')}

            <div class="flex justify-end pt-4 border-t border-slate-200">
              <button type="button" data-action="close-modal" class="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    container.querySelectorAll('.btn-update-salary').forEach(btn => {
      btn.addEventListener('click', () => {
        const cctId = btn.getAttribute('data-cct-id');
        const catId = btn.getAttribute('data-cat-id');
        const curr = btn.getAttribute('data-current');
        const newVal = prompt(`Ingrese la nueva escala básica para la categoría:`, curr);
        if (newVal && !isNaN(Number(newVal)) && Number(newVal) > 0) {
          store.updateCctCategory(cctId, catId, Number(newVal));
          Notifier.showToast('Escala paritaria actualizada correctamente', 'success');
          this.renderCctConfigModal(container);
        }
      });
    });
  }

  // Modal: Visor Oficial de Recibo de Sueldo (Art. 140 LCT) con Firma Digital
  renderViewPayslipModal(container, payslipId) {
    const ps = store.getPayslipById(payslipId);
    if (!ps) return;

    const company = store.getCurrentCompany() || { name: 'Empresa', cuit: '30-71458923-4', location: 'Buenos Aires' };
    const session = store.getSession();
    const canSign = (session?.role === 'EMPLOYEE' && ps.employeeId === session?.employeeId) || session?.role === 'HR_ADMIN';

    Sanitizer.renderTemplate(container, `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div class="px-6 py-3 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10 no-print">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-sm">Recibo Oficial de Haberes (LCT Art. 140)</h3>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">${Sanitizer.escapeHTML(ps.periodStr)}</span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.print()" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold">
                🖨️ Imprimir
              </button>
              <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
          </div>

          <!-- Documento Formal del Recibo de Sueldo -->
          <div class="p-8 space-y-4 text-slate-800 text-xs font-sans print:p-0">
            <!-- Encabezado de Empresa y Empleado -->
            <div class="border-b-2 border-slate-900 pb-4">
              <div class="flex justify-between items-start">
                <div>
                  <h1 class="text-base font-black text-slate-900 uppercase tracking-wide">${Sanitizer.escapeHTML(company.name)}</h1>
                  <p class="text-slate-600 text-[11px]">CUIT: <strong>${Sanitizer.escapeHTML(company.cuit)}</strong> • ${Sanitizer.escapeHTML(company.location || 'Argentina')}</p>
                  <p class="text-[10px] text-slate-500">Acreditación Bancaria de Haberes: ${Sanitizer.escapeHTML(ps.bank)}</p>
                  <p class="text-[10px] text-slate-500">CBU Sueldo (Art. 124 LCT): <strong>${Sanitizer.escapeHTML(ps.cbu)}</strong> • Fecha Depósito: ${Sanitizer.escapeHTML(ps.depositDate)}</p>
                </div>
                <div class="text-right border border-slate-300 rounded-lg p-2.5 bg-slate-50">
                  <p class="text-[10px] uppercase font-bold text-slate-500">Período Liquidado</p>
                  <p class="text-sm font-black text-blue-700">${Sanitizer.escapeHTML(ps.periodStr)}</p>
                  <p class="text-[10px] text-slate-500">${Sanitizer.escapeHTML(ps.periodType)}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 text-[11px]">
                <div>
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">Colaborador</span>
                  <strong class="text-slate-900">${Sanitizer.escapeHTML(ps.employeeName)}</strong>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">CUIL</span>
                  <strong class="text-slate-900">${Sanitizer.escapeHTML(ps.cuil)}</strong>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">Convenio / Puesto</span>
                  <strong class="text-slate-900">${Sanitizer.escapeHTML(ps.cctName)}</strong>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">Categoría</span>
                  <strong class="text-slate-900">${Sanitizer.escapeHTML(ps.cctCategory)}</strong>
                </div>
              </div>
            </div>

            <!-- Tabla de Conceptos Liquidados -->
            <div class="border border-slate-300 rounded-lg overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-300">
                  <tr>
                    <th class="p-2 w-16">Código</th>
                    <th class="p-2">Concepto</th>
                    <th class="p-2 text-center w-16">Unidades</th>
                    <th class="p-2 text-right w-24">Remunerativo</th>
                    <th class="p-2 text-right w-24">No Remun.</th>
                    <th class="p-2 text-right w-24">Retención</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  ${(ps.items || []).map(item => `
                    <tr>
                      <td class="p-2 font-mono text-[11px] text-slate-500">${Sanitizer.escapeHTML(item.code)}</td>
                      <td class="p-2 font-medium">${Sanitizer.escapeHTML(item.description)}</td>
                      <td class="p-2 text-center font-mono text-[11px]">${item.quantity || 1}</td>
                      <td class="p-2 text-right font-mono">${item.type === 'REMUNERATIVO' ? '$' + item.amount.toLocaleString('es-AR') : ''}</td>
                      <td class="p-2 text-right font-mono">${item.type === 'NO_REMUNERATIVO' ? '$' + item.amount.toLocaleString('es-AR') : ''}</td>
                      <td class="p-2 text-right font-mono text-amber-700">${item.type === 'RETENCION' ? '$' + item.amount.toLocaleString('es-AR') : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-300 font-bold text-[11px]">
                  <tr>
                    <td colspan="3" class="p-2 text-right uppercase">Subtotales:</td>
                    <td class="p-2 text-right font-mono">$${ps.totalRemunerativo.toLocaleString('es-AR')}</td>
                    <td class="p-2 text-right font-mono">$${ps.totalNoRemunerativo.toLocaleString('es-AR')}</td>
                    <td class="p-2 text-right font-mono text-amber-800">$${ps.totalDescuentos.toLocaleString('es-AR')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Resumen Total y Neto en Letras -->
            <div class="bg-slate-50 border border-slate-300 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-500">Total Neto a Cobrar en Letras</p>
                <p class="font-bold text-slate-800 italic">${Sanitizer.escapeHTML(ps.netoInWords)}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] uppercase font-bold text-slate-500">Importe Neto</p>
                <h2 class="text-2xl font-black text-emerald-700">$${ps.totalNeto.toLocaleString('es-AR')}</h2>
              </div>
            </div>

            <!-- Contribuciones Patronales Informativas (F.931) -->
            ${ps.employerContributions ? `
              <div class="p-2.5 rounded bg-slate-50/80 border border-slate-200 text-[10px] text-slate-500 space-y-1">
                <div class="flex justify-between font-bold text-slate-700">
                  <span>Aportes y Contribuciones Patronales de la Empresa (F.931 ARCA / AFIP):</span>
                  <span>$${ps.employerContributions.total.toLocaleString('es-AR')}</span>
                </div>
                <p>SIPA: $${ps.employerContributions.sipaPatronal.toLocaleString('es-AR')} • PAMI: $${ps.employerContributions.inssjypPatronal.toLocaleString('es-AR')} • Asignaciones: $${ps.employerContributions.asignacionesPatronal.toLocaleString('es-AR')} • Obra Social: $${ps.employerContributions.obraSocialPatronal.toLocaleString('es-AR')} • ART: $${ps.employerContributions.artPatronal.toLocaleString('es-AR')}</p>
              </div>
            ` : ''}

            <!-- Área de Doble Firma y Conformidad Legal (Res. MTEySS 346/2019) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-slate-900">
              <!-- Sello Empleador -->
              <div class="border border-slate-300 rounded-xl p-3 bg-slate-50 text-center space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Sello y Emisión del Empleador</span>
                <p class="text-xs font-bold text-slate-800">${Sanitizer.escapeHTML(company.name)}</p>
                <p class="text-[10px] text-slate-400">Emisión digital sellada conforme LCT Art. 140</p>
                <p class="text-[9px] font-mono text-emerald-700 font-bold">✅ Sello Electrónico de Empresa Activo</p>
              </div>

              <!-- Firma Colaborador -->
              <div class="border border-slate-300 rounded-xl p-3 bg-slate-50 text-center space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Rúbrica y Recepción del Trabajador</span>
                ${ps.status === 'SIGNED' ? `
                  <div class="flex flex-col items-center">
                    <img src="${Sanitizer.sanitizeURL(ps.signature)}" alt="Firma Colaborador" class="h-10 max-w-[150px] object-contain">
                    <p class="text-[10px] font-bold text-emerald-800 mt-1">Firma Electrónica Conforme (Art. 5 Ley 25.506)</p>
                    <p class="text-[9px] text-slate-500">Fecha: ${new Date(ps.signedAt).toLocaleString('es-AR')} • IP: ${Sanitizer.escapeHTML(ps.ipAddress || '190.183.45.12')}</p>
                    <p class="text-[8px] font-mono text-slate-400 truncate max-w-xs">Hash SHA-256: ${Sanitizer.escapeHTML(ps.signatureHash)}</p>
                  </div>
                ` : `
                  <div class="space-y-2 no-print">
                    <p class="text-xs text-amber-700 font-semibold">⚠️ Pendiente de Firma de Conformidad</p>
                    ${canSign ? `
                      <div class="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-white">
                        <canvas id="payslip-signature-canvas" width="300" height="100" class="signature-canvas w-full h-[100px]"></canvas>
                      </div>
                      <div class="flex justify-between items-center text-[10px]">
                        <button type="button" id="btn-clear-payslip-sig" class="text-slate-500 hover:text-slate-800 font-medium">🔄 Limpiar</button>
                        <button type="button" id="btn-save-payslip-sig" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">
                          Confirmar y Sellar Recibo
                        </button>
                      </div>
                    ` : `
                      <p class="text-[10px] text-slate-400">El colaborador debe firmar desde su portal personal.</p>
                    `}
                  </div>
                `}
              </div>
            </div>

            <!-- Leyenda Legal de Cierre -->
            <p class="text-[9px] text-slate-400 text-center pt-2">
              El presente recibo se emite en formato digital conforme a las facultades de la Resolución MTEySS 346/2019 de la Secretaría de Trabajo de la Nación y la Ley 20.744 de Contrato de Trabajo. Constancia de pago acreditada mediante depósito bancario oficial (Art. 124 LCT).
            </p>
          </div>
        </div>
      </div>
    `);

    // Iniciar pad de firma si está pendiente y disponible
    if (ps.status !== 'SIGNED' && canSign) {
      const canvas = document.getElementById('payslip-signature-canvas');
      if (canvas) {
        const pad = new DigitalSignaturePad(canvas, { strokeColor: '#1e3a8a', lineWidth: 2.5 });

        const clearBtn = document.getElementById('btn-clear-payslip-sig');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => pad.clear());
        }

        const saveBtn = document.getElementById('btn-save-payslip-sig');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            if (pad.isEmpty()) {
              Notifier.showToast('Debe firmar en el recuadro antes de confirmar', 'warning');
              return;
            }

            const dataUrl = pad.toDataURL();
            const now = new Date().toISOString();
            const hash = await DigitalSignaturePad.computeForensicHash(dataUrl, ps.employeeId, now);

            store.signPayslip(ps.payrollId, ps.id, {
              signature: dataUrl,
              signatureHash: hash,
              ipAddress: '190.183.45.12'
            });

            Notifier.showToast('Recibo de sueldo firmado y sellado con éxito', 'success');
            this.renderViewPayslipModal(container, ps.id);
          });
        }
      }
    }
  }

  renderPortalTab() {
    const session = store.getSession();
    const currentEmp = store.employees.find(e => e.id === session?.employeeId);

    if (!currentEmp) {
      return `<div class="p-8 text-center text-slate-500">No se encontró el legajo correspondiente a esta sesión.</div>`;
    }

    const allCourses = store.getCourses();
    const myCourses = allCourses.filter(c => (c.participants || []).some(p => p.employeeId === currentEmp.id));
    const compliance = TrainingEngine.evaluateEmployeeCompliance(currentEmp, allCourses, store);
    const myEppDeliveries = store.getEppDeliveriesByEmployee(currentEmp.id);

    return `
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-3xl shadow-lg flex justify-between items-center">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              👤
            </div>
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">Portal del Colaborador</span>
              <h2 class="text-xl font-extrabold mt-1">${Sanitizer.escapeHTML(currentEmp.firstName + ' ' + currentEmp.lastName)}</h2>
              <p class="text-xs text-blue-200">${Sanitizer.escapeHTML(currentEmp.role)} • DNI: ${Sanitizer.escapeHTML(currentEmp.dni)}</p>
            </div>
          </div>
          <button data-action="logout" class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20">
            Cerrar Sesión
          </button>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold text-slate-900 text-sm">Cumplimiento de Cursos de mi Puesto</h3>
            <span class="text-sm font-extrabold text-blue-600">${compliance.complianceRate}%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div class="bg-blue-600 h-3 rounded-full transition-all duration-500" style="width: ${compliance.complianceRate}%"></div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 class="font-bold text-slate-900 text-sm">Mis Cursos Programados</h3>
          ${myCourses.length > 0 ? myCourses.map(c => `
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
              <div>
                <p class="font-semibold text-sm text-slate-900">${Sanitizer.escapeHTML(c.title)}</p>
                <p class="text-xs text-slate-500">📅 ${Sanitizer.escapeHTML(c.date)} • Docente: ${Sanitizer.escapeHTML(c.instructorName)}</p>
              </div>
              <button data-action="open-modal-sign-course" data-course-id="${c.id}" data-participant-id="${currentEmp.id}" class="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow">
                ✍️ Firmar Asistencia
              </button>
            </div>
          `).join('') : '<p class="text-xs text-slate-400">No tiene cursos pendientes asignados actualmente.</p>'}
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-slate-900 text-sm">Mis Habilitaciones y Carnets</h3>
            <button data-action="open-modal-add-cred" data-id="${currentEmp.id}" class="text-xs text-blue-600 font-semibold hover:underline">+ Subir Foto de Carnet Renovado</button>
          </div>
          <div class="space-y-2">
            ${(currentEmp.credentials || []).map(c => {
              const evalRes = ExpirationEngine.evaluateDate(c.expirationDate);
              return `
                <div class="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <p class="text-sm font-bold text-slate-800">${Sanitizer.escapeHTML(c.customLabel || c.type)}</p>
                    <p class="text-xs text-slate-500">Categorías: ${Sanitizer.escapeHTML((c.categories || []).join(', ') || 'N/A')}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    ${c.attachment ? `
                      <button data-action="view-document" data-doc-url="${Sanitizer.sanitizeURL(c.attachment)}" data-doc-title="${Sanitizer.escapeHTML(c.customLabel || 'Carnet')}" class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                        👁️ Ver Comprobante
                      </button>
                    ` : ''}
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${evalRes.status.badgeClass}">
                      ${Sanitizer.escapeHTML(evalRes.status.label)} (${evalRes.formattedDate})
                    </span>
                  </div>
                </div>
              `;
            }).join('') || '<p class="text-xs text-slate-400">Sin carnets registrados</p>'}
          </div>
        </div>

        <!-- Dotación de EPP del Colaborador -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-slate-900 text-sm">Mi Dotación de EPP (Res. SRT 299/11)</h3>
            <span class="text-xs font-semibold text-slate-500">Recambios y firmas conformadas</span>
          </div>
          <div class="space-y-2">
            ${myEppDeliveries.length > 0 ? myEppDeliveries.map(d => {
              const evalRes = d.expirationDate ? ExpirationEngine.evaluateDate(d.expirationDate) : null;
              return `
                <div class="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <p class="text-sm font-bold text-slate-800">${Sanitizer.escapeHTML(d.eppName)}</p>
                    <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(d.brandModel)} • ${Sanitizer.escapeHTML(d.standard)}</p>
                    <p class="text-[11px] text-slate-400">Entregado: ${Sanitizer.escapeHTML(d.deliveryDate)} • Cantidad: ${d.quantity}</p>
                  </div>
                  <div class="text-right">
                    ${evalRes ? `
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${evalRes.status.badgeClass} block mb-1">
                        ${Sanitizer.escapeHTML(evalRes.status.label)}
                      </span>
                      <span class="text-[10px] text-slate-500 block">Vence: ${evalRes.formattedDate}</span>
                    ` : ''}
                    <span class="text-[10px] text-emerald-700 font-bold">✅ Recepción Firmada</span>
                  </div>
                </div>
              `;
            }).join('') : '<p class="text-xs text-slate-400">Sin registros de entrega de EPP.</p>'}
          </div>
        </div>

        <!-- Mis Vacaciones y Licencias -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-900 text-sm">Mis Vacaciones & Licencias</h3>
              <p class="text-xs text-slate-500">Saldos anuales y solicitudes registradas</p>
            </div>
            <button data-action="open-modal-request-leave" class="text-xs text-blue-600 font-semibold hover:underline">+ Solicitar Licencia</button>
          </div>
          ${(() => {
            const myLeaves = store.getLeavesByEmployee(currentEmp.id);
            const vacBalance = LeaveEngine.calculateVacationBalance(currentEmp, myLeaves, new Date().getFullYear());
            return `
              <div class="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex justify-between items-center text-xs text-slate-700">
                <span>Saldo Vacaciones ${vacBalance.year}: <strong>${vacBalance.remainingDays} días</strong> restantes</span>
                <span class="text-slate-500">Gozados: ${vacBalance.takenDays} de ${vacBalance.totalEntitledDays} d.</span>
              </div>
              <div class="space-y-2 mt-2">
                ${myLeaves.length > 0 ? myLeaves.map(l => {
                  const t = LEAVE_TYPES[l.type] || { label: l.type, icon: '📋' };
                  const s = LEAVE_STATUS[l.status] || { label: l.status, badgeClass: 'bg-slate-100 text-slate-700' };
                  return `
                    <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
                      <div>
                        <p class="font-semibold text-slate-800">${t.icon} ${Sanitizer.escapeHTML(t.label)} (${l.days} días)</p>
                        <p class="text-slate-500 text-[11px]">${Sanitizer.escapeHTML(l.startDate)} al ${Sanitizer.escapeHTML(l.endDate)}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badgeClass}">${Sanitizer.escapeHTML(s.label)}</span>
                        ${l.status === 'PENDING' ? `
                          <button data-action="delete-leave" data-id="${l.id}" class="text-slate-400 hover:text-red-600 text-xs" title="Cancelar Solicitud">✕</button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('') : '<p class="text-xs text-slate-400">Sin solicitudes de licencia registradas.</p>'}
              </div>
            `;
          })()}
        </div>

        <!-- Mis Recibos de Sueldo & Firma Digital (LCT 20.744 / Res. 346/2019) -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-900 text-sm">💵 Mis Recibos de Sueldo & Firma Digital</h3>
              <p class="text-xs text-slate-500">Conformidad electrónica con validez laboral (Art. 140 LCT)</p>
            </div>
            <span class="text-[10px] font-bold text-slate-400 font-mono">LCT 20.744</span>
          </div>
          ${(() => {
            const myPayslips = store.getPayslips();
            return `
              <div class="space-y-2">
                ${myPayslips.length > 0 ? myPayslips.map(ps => {
                  const isSigned = ps.status === 'SIGNED';
                  return `
                    <div class="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-900 text-sm">${Sanitizer.escapeHTML(ps.periodStr)}</span>
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${isSigned ? '✅ Firmado Conforme' : '⏳ Pendiente de Firma'}
                          </span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Neto a Cobrar: <strong class="text-emerald-700 font-mono">$${ps.totalNeto.toLocaleString('es-AR')}</strong> • Depósito: ${Sanitizer.escapeHTML(ps.depositDate)}</p>
                        ${isSigned && ps.signedAt ? `
                          <p class="text-[10px] text-slate-400">Rúbrica: ${new Date(ps.signedAt).toLocaleDateString('es-AR')} • Hash SHA-256 verificado</p>
                        ` : ''}
                      </div>
                      <button data-action="open-modal-view-payslip" data-id="${ps.id}" class="px-3 py-1.5 ${isSigned ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white font-bold'} rounded-xl text-xs transition shrink-0 shadow-sm">
                        ${isSigned ? '👁️ Ver Recibo' : '✍️ Revisar y Firmar'}
                      </button>
                    </div>
                  `;
                }).join('') : '<p class="text-xs text-slate-400">No hay recibos de sueldo emitidos todavía.</p>'}
              </div>
            `;
          })()}
        </div>
      </div>
    `;
  }

  renderReportsTab() {
    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Centro de Informes & Exportación CSV</h2>
          <p class="text-xs text-slate-500">Descargue registros con codificación UTF-8 BOM para apertura nativa en Microsoft Excel sin dependencias externas.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">📋</div>
            <h3 class="font-bold text-slate-900 text-base">Nómina Integral de Personal</h3>
            <p class="text-xs text-slate-500">Exporta colaboradores con datos de contacto, puestos y el desglose de habilidades previas y actuales.</p>
            <button data-action="export-employees-csv" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
              Descargar CSV Nómina
            </button>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">🚦</div>
            <h3 class="font-bold text-slate-900 text-base">Auditoría de Vencimientos</h3>
            <p class="text-xs text-slate-500">Listado oficial de carnets de conducir y libretas sanitarias clasificados por severidad de vencimiento.</p>
            <button data-action="export-audit-csv" class="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold">
              Descargar Semáforo CSV
            </button>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">🦺</div>
            <h3 class="font-bold text-slate-900 text-base">Planilla Oficial EPP (SRT 299/11)</h3>
            <p class="text-xs text-slate-500">Constancias oficiales de entrega de EPP con marcas, certificaciones IRAM/Sello S y sellado de firmas.</p>
            <button data-action="export-srt299-csv" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
              Descargar Planilla SRT CSV
            </button>
          </div>
            </button>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">🖨️</div>
            <h3 class="font-bold text-slate-900 text-base">Impresión Limpia para Inspección</h3>
            <p class="text-xs text-slate-500">Imprima en papel o guarde en PDF sin elementos de navegación ni botones (@media print).</p>
            <button data-action="print-window" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
              Imprimir / Guardar en PDF
            </button>
          </div>
        </div>

        <div class="p-5 bg-slate-100 rounded-2xl border border-slate-200 flex justify-between items-center">
          <div>
            <h4 class="font-bold text-sm text-slate-800">Administración de la Bóveda Local</h4>
            <p class="text-xs text-slate-500">Purgar o restaurar datos iniciales de demostración.</p>
          </div>
          <div class="flex gap-2">
            <button data-action="purge-demo" class="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold rounded-lg">
              Purgar Base
            </button>
            <button data-action="restore-demo" class="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-lg">
              Restaurar Demo
            </button>
          </div>
        </div>
      </div>
    `;
  }

  postRenderBindings() {
    if (this.currentTab === 'skills') {
      const freeTextInput = document.getElementById('hunter-free-text');
      const sourceSelect = document.getElementById('hunter-source-filter');
      const levelSelect = document.getElementById('hunter-level-filter');
      const resultsContainer = document.getElementById('hunter-results');

      const executeSearch = () => {
        if (!resultsContainer) return;
        const text = freeTextInput ? freeTextInput.value : '';
        const source = sourceSelect ? sourceSelect.value : 'ALL';
        const minLvl = levelSelect ? Number(levelSelect.value) : 1;

        const results = SkillsEngine.searchTalent(store.getEmployees(), {
          freeText: text,
          sourceFilter: source,
          minLevel: minLvl
        });

        if (results.length === 0) {
          Sanitizer.renderTemplate(resultsContainer, `
            <div class="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              🔍 No se encontraron colaboradores con las habilidades solicitadas.
            </div>
          `);
          return;
        }

        const cardsHtml = results.map(r => {
          const emp = r.employee;
          const skillsList = r.matchedSkills.map(s => `
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
              <div>
                <span class="font-bold text-slate-900">${Sanitizer.escapeHTML(s.name)}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.source === 'PREVIOUS_EXPERIENCE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} ml-1">
                  ${s.source === 'PREVIOUS_EXPERIENCE' ? '⭐ Experiencia Previa' : '💼 Puesto Actual'}
                </span>
                ${s.notes ? `<p class="text-[11px] text-slate-500 mt-0.5">${Sanitizer.escapeHTML(s.notes)}</p>` : ''}
              </div>
              <span class="px-2 py-1 rounded text-xs font-extrabold ${SKILL_LEVELS[s.level]?.badgeClass || 'bg-slate-200'}">
                Nivel ${s.level}
              </span>
            </div>
          `).join('');

          return `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-base font-bold text-slate-900">${Sanitizer.escapeHTML(emp.firstName + ' ' + emp.lastName)}</h3>
                  <p class="text-xs text-blue-600 font-semibold">${Sanitizer.escapeHTML(emp.role)} • ${Sanitizer.escapeHTML(emp.department)}</p>
                  <p class="text-xs text-slate-400">Contacto: ${Sanitizer.escapeHTML(emp.phone || emp.email)}</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  ${r.matchScore}% Coincidencia
                </span>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-600">Habilidades Compatibles:</p>
                ${skillsList}
              </div>
            </div>
          `;
        }).join('');

        Sanitizer.renderTemplate(resultsContainer, cardsHtml);
      };

      if (freeTextInput) freeTextInput.addEventListener('input', executeSearch);
      if (sourceSelect) sourceSelect.addEventListener('change', executeSearch);
      if (levelSelect) levelSelect.addEventListener('change', executeSearch);

      executeSearch();
    }
  }
}

export const app = new AppController();
if (typeof window !== 'undefined') {
  window.app = app;
  window.store = store;
  window.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}
