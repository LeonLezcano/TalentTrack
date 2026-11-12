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

class AppController {
  constructor() {
    this.currentTab = 'dashboard';
    this.activeModal = null;
    this.signaturePadInstance = null;
    this.selectedEmployeeForModal = null;
    this.selectedCourseForSignature = null;
    this.selectedParticipantForSignature = null;
    this.activeDocumentPreview = null;
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
  }

  handleAction(action, id, target) {
    switch (action) {
      case 'switch-tab':
        this.currentTab = id;
        this.render();
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
        const docUrl = target.getAttribute('data-doc-url');
        const docTitle = target.getAttribute('data-doc-title') || 'Documento / Carnet';
        this.openDocumentModal(docUrl, docTitle);
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
          attachmentData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
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

  // --- Main View Rendering ---
  render() {
    const appEl = document.getElementById('app-view');
    const headerEl = document.getElementById('main-header');
    if (!appEl) return;

    // 1. Enrutamiento cerrado por defecto (Regla 24): Si no está autenticado, renderizar Login
    if (!store.isAuthenticated()) {
      if (headerEl) headerEl.classList.add('hidden');
      this.renderLoginView(appEl);
      return;
    }

    // 2. Si está autenticado, mostrar header y vista correspondiente
    if (headerEl) headerEl.classList.remove('hidden');
    this.updateHeaderControls();

    const session = store.getSession();

    // Confinamiento estricto: El rol EMPLOYEE solo tiene acceso a su Portal Móvil
    if (session.role === 'EMPLOYEE') {
      Sanitizer.renderTemplate(appEl, this.renderPortalTab());
      return;
    }

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

    const userNameEl = document.getElementById('header-user-name');
    if (userNameEl && session) {
      userNameEl.textContent = `${session.name} (${session.role === 'HR_ADMIN' ? 'RRHH' : 'Colaborador'})`;
    }

    // Badge de alertas (Habilitaciones + Recambios EPP)
    const credAlerts = ExpirationEngine.scanAlerts(store.getEmployees());
    const eppAlerts = EppEngine.scanEppAlerts(store.getEppDeliveries(), store.getEmployees());
    const alerts = [...credAlerts, ...eppAlerts];

    const badgeEl = document.getElementById('pending-alerts-badge');
    if (badgeEl) {
      if (alerts.length > 0) {
        badgeEl.textContent = alerts.length;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Blindaje de Visibilidad RBAC en DOM (Regla 11)
    const navTabsEl = document.getElementById('header-nav-tabs');
    const isEmployee = session && session.role === 'EMPLOYEE';

    if (navTabsEl) {
      if (isEmployee) {
        navTabsEl.classList.add('hidden');
        navTabsEl.style.setProperty('display', 'none', 'important');
      } else {
        navTabsEl.classList.remove('hidden');
        navTabsEl.style.removeProperty('display');
      }
    }

    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      if (isEmployee) {
        btn.classList.add('hidden');
        btn.style.setProperty('display', 'none', 'important');
      } else {
        btn.classList.remove('hidden');
        btn.style.removeProperty('display');
        const tabId = btn.getAttribute('data-nav-tab');
        if (tabId === this.currentTab) {
          btn.className = 'px-3.5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow-sm flex items-center gap-2';
        } else {
          btn.className = 'px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2';
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

    const alertsRows = alerts.map(a => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold ${a.status.badgeClass}">
            ${Sanitizer.escapeHTML(a.status.label)}
          </span>
        </td>
        <td class="py-3 px-4 font-semibold text-slate-900">${Sanitizer.escapeHTML(a.employeeName)}</td>
        <td class="py-3 px-4 text-xs text-slate-600">${Sanitizer.escapeHTML(a.employeeRole)}</td>
        <td class="py-3 px-4 text-xs font-medium text-slate-800">${Sanitizer.escapeHTML(a.credentialLabel)}</td>
        <td class="py-3 px-4 text-xs text-slate-500">${Sanitizer.escapeHTML((a.categories || []).join(', ') || 'General')}</td>
        <td class="py-3 px-4 text-xs font-semibold ${a.daysRemaining < 0 ? 'text-red-600' : 'text-amber-700'}">
          ${Sanitizer.escapeHTML(a.formattedDate)} (${a.daysRemaining !== null ? `${a.daysRemaining}d` : '-'})
        </td>
        <td class="py-3 px-4 text-right flex items-center justify-end gap-2">
          <button data-action="send-whatsapp-alert" data-emp-id="${a.employeeId}" data-cred-id="${a.credentialId}" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm" title="Avisar por WhatsApp">
            💬 WhatsApp
          </button>
          <button data-action="open-modal-edit-employee" data-id="${a.employeeId}" class="text-xs text-blue-600 hover:underline font-medium">Legajo</button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <th class="py-3 px-4">Estado</th>
                    <th class="py-3 px-4">Colaborador</th>
                    <th class="py-3 px-4">Puesto</th>
                    <th class="py-3 px-4">Habilitación</th>
                    <th class="py-3 px-4">Categoría</th>
                    <th class="py-3 px-4">Vencimiento</th>
                    <th class="py-3 px-4 text-right">Acción Rápida</th>
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
      const skillsHtml = (emp.skills || []).map(s => `
        <span class="px-2 py-0.5 rounded text-[11px] font-medium ${s.source === 'PREVIOUS_EXPERIENCE' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700'}">
          ${Sanitizer.escapeHTML(s.name)} (Nv.${s.level})
          ${s.source === 'PREVIOUS_EXPERIENCE' ? '⭐' : ''}
        </span>
      `).join('');

      const credsHtml = (emp.credentials || []).map(c => {
        const evalRes = ExpirationEngine.evaluateDate(c.expirationDate);
        return `
          <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
            <div>
              <span class="text-slate-800 font-semibold block">${Sanitizer.escapeHTML(c.customLabel || c.type)}</span>
              <span class="text-[10px] text-slate-400">${(c.categories || []).join(', ') || 'N/A'}</span>
            </div>
            <div class="flex items-center gap-1.5">
              ${c.attachment ? `
                <button data-action="view-document" data-doc-url="${Sanitizer.sanitizeURL(c.attachment)}" data-doc-title="${Sanitizer.escapeHTML(c.customLabel || 'Carnet')}" class="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold">
                  👁️ Ver Foto
                </button>
              ` : ''}
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${evalRes.status.badgeClass}">
                ${Sanitizer.escapeHTML(evalRes.status.label)}
              </span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-base font-bold text-slate-900">${Sanitizer.escapeHTML(emp.firstName + ' ' + emp.lastName)}</h3>
              <p class="text-xs font-semibold text-blue-600">${Sanitizer.escapeHTML(emp.role)}</p>
              <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(emp.department)} • DNI: ${Sanitizer.escapeHTML(emp.dni)}</p>
            </div>
            <div class="flex gap-1.5">
              <button data-action="open-modal-edit-employee" data-id="${emp.id}" class="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100" title="Editar">✏️</button>
              <button data-action="delete-employee" data-id="${emp.id}" class="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100" title="Baja">🗑️</button>
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-600">Habilidades & Experiencia:</p>
              <button data-action="open-modal-add-skill" data-id="${emp.id}" class="text-[11px] text-blue-600 hover:underline font-semibold">+ Sumar Skill</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${skillsHtml || '<span class="text-xs text-slate-400">Sin habilidades registradas</span>'}
            </div>
          </div>

          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div class="flex justify-between items-center mb-1.5">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-600">Habilitaciones & Comprobantes:</p>
              <button data-action="open-modal-add-cred" data-id="${emp.id}" class="text-[11px] text-blue-600 hover:underline font-semibold">+ Cargar Carnet</button>
            </div>
            <div>
              ${credsHtml || '<p class="text-xs text-slate-400">Sin carnets asociados</p>'}
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
            <p class="text-xs text-slate-500">Nómina operativa de la empresa. Asigne habilidades y gestione carnets con fotos respaldatorias.</p>
          </div>
          <div class="flex gap-2">
            <button data-action="export-employees-csv" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              📥 Exportar Nómina CSV
            </button>
            <button data-action="open-modal-new-employee" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2">
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
                <button data-action="send-whatsapp-alert" data-emp-id="${del.employeeId}" data-cred-id="${del.id}" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1">
                  💬 WhatsApp
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
  window.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}
