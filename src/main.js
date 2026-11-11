/**
 * TalentTrack Main Application Controller
 * Manages SPA navigation, DOM rendering, modal states, event dispatching,
 * and reactive synchronization with the central store.
 */

import { store } from './state/store.js';
import { Sanitizer } from './utils/sanitizer.js';
import { ExpirationEngine, CREDENTIAL_TYPES, STATUS_LEVELS } from './modules/compliance/expirationEngine.js';
import { SkillsEngine, STANDARD_SKILLS, SKILL_LEVELS } from './modules/skills/skillsEngine.js';
import { TrainingEngine, TRAINING_CATEGORIES } from './modules/training/trainingEngine.js';
import { DigitalSignaturePad } from './utils/signature.js';
import { Exporter } from './modules/reports/exporter.js';
import { Notifier } from './utils/notifier.js';

class AppController {
  constructor() {
    this.currentTab = 'dashboard'; // 'dashboard' | 'employees' | 'skills' | 'training' | 'portal' | 'reports'
    this.activeModal = null;
    this.signaturePadInstance = null;
    this.selectedEmployeeForModal = null;
    this.selectedCourseForSignature = null;
    this.selectedParticipantForSignature = null;
  }

  init() {
    store.init();
    store.subscribe(() => this.render());
    Notifier.initScreenWakeLock();

    this.bindGlobalEvents();
    this.render();

    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.log('SW registration note:', err.message);
      });
    }
  }

  bindGlobalEvents() {
    // Manejo de clicks delegados
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');

      this.handleAction(action, id, target);
    });

    // Cambio de empresa en selector
    const companySelect = document.getElementById('company-selector');
    if (companySelect) {
      companySelect.addEventListener('change', (e) => {
        store.setCurrentCompany(e.target.value);
        Notifier.showToast('Empresa seleccionada actualizada', 'info');
      });
    }

    // Switch de rol (Admin RRHH vs Empleado)
    const roleSelect = document.getElementById('role-selector');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        store.currentUserRole = e.target.value;
        if (store.currentUserRole === 'EMPLOYEE') {
          this.currentTab = 'portal';
        } else {
          this.currentTab = 'dashboard';
        }
        store.notify();
      });
    }
  }

  handleAction(action, id, target) {
    switch (action) {
      case 'switch-tab':
        this.currentTab = id;
        this.render();
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

      case 'open-modal-new-course':
        this.openModal('modal-new-course');
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
        if (confirm('⚠️ ¿ATENCIÓN: Desea purgar todos los datos de muestra y dejar la base limpia?')) {
          store.purgeAllData();
          Notifier.showToast('Datos de demostración purgados con éxito', 'warning');
        }
        break;

      case 'restore-demo':
        store.restoreDemoData();
        Notifier.showToast('Datos de demostración restaurados correctamente', 'success');
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
    let title = 'Firma Digital de Asistencia';
    let subtitle = '';

    if (isInstructor) {
      title = 'Firma Digital del Instructor / Capacitador';
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
              <h3 class="font-bold text-lg">${Sanitizer.escapeHTML(title)}</h3>
              <p class="text-xs text-slate-300">${Sanitizer.escapeHTML(subtitle)}</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <div class="p-6">
            <p class="text-xs text-slate-600 mb-2">
              Trace su firma en el recuadro utilizando el dedo, lápiz óptico o cursor. Esta firma se sellará con timestamp criptográfico para validez en auditorías.
            </p>
            <div class="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden">
              <canvas id="signature-canvas" width="460" height="200" class="signature-canvas w-full h-[200px]"></canvas>
            </div>
            <div class="flex justify-between items-center mt-4">
              <button type="button" data-action="clear-signature" class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 font-medium">
                🔄 Limpiar Trazo
              </button>
              <div class="flex gap-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                  Cancelar
                </button>
                <button type="button" data-action="save-signature" class="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md">
                  Confirmar y Sellar Firma
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
      Notifier.showToast('Firma del instructor sellada con éxito', 'success');
    } else {
      store.signParticipant(this.selectedCourseForSignature, this.selectedParticipantForSignature, {
        signature: dataUrl,
        signatureHash: hash,
        passed: true,
        score: 10
      });
      Notifier.showToast('Asistencia y firma del colaborador registradas', 'success');
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
            <h3 class="font-bold text-lg">${isEdit ? 'Editar Legajo de Empleado' : 'Alta de Nuevo Colaborador'}</h3>
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
                <label class="block text-xs font-semibold text-slate-700 mb-1">DNI / Documento *</label>
                <input type="text" name="dni" required value="${Sanitizer.escapeHTML(emp.dni || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Puesto de Trabajo *</label>
                <input type="text" name="role" required placeholder="Ej: Chofer de Reparto / Operario" value="${Sanitizer.escapeHTML(emp.role || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
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
                <label class="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                <input type="tel" name="phone" value="${Sanitizer.escapeHTML(emp.phone || '')}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
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
              <h3 class="font-bold text-lg">Asignar Habilidad / Skill</h3>
              <p class="text-xs text-slate-300">${Sanitizer.escapeHTML(empName)}</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form id="skill-form" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Origen de la Habilidad *</label>
              <select name="source" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="PREVIOUS_EXPERIENCE">⭐ Experiencia Previa Oculta (Trabajos anteriores, oficios, estudios)</option>
                <option value="CURRENT_ROLE">💼 Puesto Actual de Trabajo</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Habilidad *</label>
              <input list="skills-list" name="name" required placeholder="Seleccione o escriba..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <datalist id="skills-list">${skillOptions}</datalist>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Nivel de Dominio *</label>
                <select name="level" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="1">1 - Básico</option>
                  <option value="2" selected>2 - Intermedio</option>
                  <option value="3">3 - Avanzado</option>
                  <option value="4">4 - Experto / Instructor</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Años de Práctica</label>
                <input type="number" name="yearsExperience" min="1" max="50" value="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Detalles / Evidencia de la Habilidad</label>
              <textarea name="notes" rows="2" placeholder="Ej: Manejo de soldadura en empresa metalúrgica durante 4 años..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"></textarea>
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
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-lg">Registrar Habilitación / Carnet</h3>
              <p class="text-xs text-slate-300">${Sanitizer.escapeHTML(empName)}</p>
            </div>
            <button data-action="close-modal" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form id="cred-form" class="p-6 space-y-4">
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
              <p class="text-[11px] text-slate-500 mt-1">El sistema emitirá avisos automáticos a los 30, 15 y 7 días previos al vencimiento.</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Entidad Emisora</label>
              <input type="text" name="notes" placeholder="Ej: Municipalidad de Pilar / CNRT / ART Asociart" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
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
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const categories = formData.getAll('categories');

        store.addCredentialToEmployee(this.selectedEmployeeForModal, {
          type: formData.get('type'),
          customLabel: CREDENTIAL_TYPES[formData.get('type')]?.label || 'Habilitación',
          number: formData.get('number')?.trim(),
          categories,
          issueDate: formData.get('issueDate'),
          expirationDate: formData.get('expirationDate'),
          notes: formData.get('notes')?.trim()
        });

        Notifier.showToast('Habilitación y vencimiento incorporados al semáforo', 'success');
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
                <input type="text" name="instructorName" required placeholder="Nombre del docente/técnico" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Temario y Objetivos</label>
              <textarea name="description" rows="2" placeholder="Detalle los contenidos normativos..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Asignar Colaboradores Convocados:</label>
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

  // --- Main View Rendering ---
  render() {
    const appEl = document.getElementById('app-view');
    if (!appEl) return;

    // Actualizar encabezados y selector de empresa
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
      case 'portal':
        contentHtml = this.renderPortalTab();
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

  updateHeaderControls() {
    const companies = store.getCompanies();
    const compSelect = document.getElementById('company-selector');
    if (compSelect) {
      const optionsHtml = companies.map(c => 
        `<option value="${c.id}" ${c.id === store.currentCompanyId ? 'selected' : ''}>🏢 ${Sanitizer.escapeHTML(c.name)}</option>`
      ).join('');
      Sanitizer.renderTemplate(compSelect, optionsHtml);
    }

    // Actualizar badges de alerta
    const alerts = ExpirationEngine.scanAlerts(store.getEmployees());
    const badgeEl = document.getElementById('pending-alerts-badge');
    if (badgeEl) {
      if (alerts.length > 0) {
        badgeEl.textContent = alerts.length;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Actualizar estado activo en navegación
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      const tabId = btn.getAttribute('data-nav-tab');
      if (tabId === this.currentTab) {
        btn.className = 'px-3.5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow-sm flex items-center gap-2';
      } else {
        btn.className = 'px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2';
      }
    });
  }

  renderDashboard() {
    const employees = store.getEmployees();
    const courses = store.getCourses();
    const alerts = ExpirationEngine.scanAlerts(employees);

    // Contadores
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
        <td class="py-3 px-4 text-right">
          <button data-action="open-modal-edit-employee" data-id="${a.employeeId}" class="text-xs text-blue-600 hover:underline font-medium">Ver Legajo</button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="space-y-6">
        <!-- Banner de bienvenida y KPIs -->
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
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Carnets Vencidos / Críticos</p>
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

        <!-- Semáforo de Vencimientos y Habilitaciones (Prioridad Máxima de RRHH) -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🚦 Semáforo de Habilitaciones, Carnets de Conducir y Exámenes</span>
              </h2>
              <p class="text-xs text-slate-500">Control preventivo a 30, 15 y 7 días de licencias de choferes, libretas sanitarias de alimentos (BPM) y aptos médicos ART.</p>
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
                    <th class="py-3 px-4">Alcance / Categoría</th>
                    <th class="py-3 px-4">Vencimiento</th>
                    <th class="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>${alertsRows}</tbody>
              </table>
            ` : `
              <div class="p-8 text-center text-slate-500 text-sm">
                🎉 No hay habilitaciones vencidas ni próximas a vencer. Todo el personal se encuentra al día.
              </div>
            `}
          </div>
        </div>

        <!-- Acceso Rápido a Reclutamiento Interno y Agenda -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 uppercase tracking-wider">Detector de Oportunidades</span>
              <h3 class="text-xl font-bold mt-2">Buscador de Talento Interno</h3>
              <p class="text-sm text-blue-200 mt-1">¿Necesita cubrir un puesto o un reemplazo imprevisto? Consulte las habilidades previas u ocultas de los empleados que no fueron contratados para esa tarea.</p>
            </div>
            <button data-action="switch-tab" data-id="skills" class="mt-4 px-4 py-2.5 bg-white text-blue-900 font-bold rounded-xl text-sm shadow hover:bg-blue-50 transition w-fit">
              Explorar Matriz de Habilidades →
            </button>
          </div>

          <div class="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 uppercase tracking-wider">Cumplimiento Normativo</span>
              <h3 class="text-xl font-bold mt-2">Capacitaciones con Firma Digital</h3>
              <p class="text-sm text-emerald-200 mt-1">Genere actas de capacitación conformadas legalmente con firma táctil en pantalla del instructor y los participantes para SENASA, SRT o ISO.</p>
            </div>
            <button data-action="switch-tab" data-id="training" class="mt-4 px-4 py-2.5 bg-white text-emerald-900 font-bold rounded-xl text-sm shadow hover:bg-emerald-50 transition w-fit">
              Ver Agenda de Cursos →
            </button>
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
          <div class="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
            <span class="text-slate-800 font-medium">${Sanitizer.escapeHTML(c.customLabel || c.type)}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${evalRes.status.badgeClass}">
              ${Sanitizer.escapeHTML(evalRes.status.label)} (${evalRes.formattedDate})
            </span>
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

          <!-- Skills -->
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-600">Habilidades & Experiencia:</p>
              <button data-action="open-modal-add-skill" data-id="${emp.id}" class="text-[11px] text-blue-600 hover:underline font-semibold">+ Sumar Skill</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${skillsHtml || '<span class="text-xs text-slate-400">Sin habilidades registradas</span>'}
            </div>
          </div>

          <!-- Credenciales & Carnets -->
          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div class="flex justify-between items-center mb-1.5">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-600">Habilitaciones & Carnets:</p>
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
            <p class="text-xs text-slate-500">Administre la nómina, asigne habilidades del puesto o previas, y cargue habilitaciones vehiculares o sanitarias.</p>
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
    const employees = store.getEmployees();

    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Buscador de Talento Interno & Matriz de Skills</h2>
          <p class="text-xs text-slate-500">Localice al instante colaboradores con habilidades específicas, independientemente de que las ejerzan en su puesto actual o las hayan adquirido en experiencias laborales previas.</p>
        </div>

        <!-- Barra de búsqueda y filtros -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Buscar por Habilidad o Palabra Clave</label>
              <input type="text" id="hunter-free-text" placeholder="Ej: Soldadura / BPM / Excel / Camión..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Origen de la Experiencia</label>
              <select id="hunter-source-filter" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todas las fuentes</option>
                <option value="PREVIOUS_ONLY">⭐ Solo Experiencia Previa Oculta (Otros trabajos)</option>
                <option value="CURRENT_ONLY">💼 Solo Habilidades del Puesto Actual</option>
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

        <!-- Resultados dinámicos -->
        <div id="hunter-results" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Renderizado dinámico en postRenderBindings -->
        </div>
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
              <img src="${p.signature}" alt="Firma" class="h-6 max-w-[80px] border border-slate-200 rounded bg-white">
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
              <p class="text-xs text-slate-500">📅 ${Sanitizer.escapeHTML(course.date)} • ⏱️ ${course.durationHours} horas • Instructor: ${Sanitizer.escapeHTML(course.instructorName)}</p>
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

          <!-- Asistencia y firmas -->
          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Acta de Asistencia (${(course.participants || []).length} Convocados)</h4>
              <button data-action="export-course-csv" data-id="${course.id}" class="text-[11px] text-blue-600 hover:underline font-semibold">📥 Exportar Acta CSV</button>
            </div>
            <div>${participantsHtml || '<p class="text-xs text-slate-400">Sin participantes asignados</p>'}</div>
          </div>

          <!-- Firma del Instructor -->
          <div class="pt-2 border-t border-slate-100 flex justify-between items-center">
            <div class="text-xs">
              <span class="text-slate-500">Firma Instructor:</span>
              ${course.instructorSignature ? `
                <span class="font-bold text-emerald-700 ml-1">Conforme</span>
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
            <h2 class="text-xl font-bold text-slate-900">Agenda de Capacitaciones & Actas Digitales</h2>
            <p class="text-xs text-slate-500">Planifique cursos obligatorios por puesto (BPM, Seguridad, Manejo Defensivo) y recopile firmas táctiles con validez para auditorías.</p>
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

  renderPortalTab() {
    const currentEmp = store.employees.find(e => e.id === store.currentEmployeeId) || store.employees[0];
    if (!currentEmp) {
      return `<div class="p-8 text-center text-slate-500">No hay empleados registrados en la compañía.</div>`;
    }

    const allCourses = store.getCourses();
    const myCourses = allCourses.filter(c => (c.participants || []).some(p => p.employeeId === currentEmp.id));
    const compliance = TrainingEngine.evaluateEmployeeCompliance(currentEmp, allCourses);

    return `
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-3xl shadow-lg">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
              👤
            </div>
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20">Portal del Colaborador (Móvil)</span>
              <h2 class="text-2xl font-extrabold mt-1">${Sanitizer.escapeHTML(currentEmp.firstName + ' ' + currentEmp.lastName)}</h2>
              <p class="text-sm text-blue-200">${Sanitizer.escapeHTML(currentEmp.role)} • ${Sanitizer.escapeHTML(currentEmp.department)}</p>
            </div>
          </div>
        </div>

        <!-- Estado de Cumplimiento de Capacitaciones Obrigadas -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-slate-900 text-sm">Cumplimiento de Cursos Obligatorios de mi Puesto</h3>
            <span class="text-sm font-extrabold text-blue-600">${compliance.complianceRate}%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div class="bg-blue-600 h-3 rounded-full transition-all duration-500" style="width: ${compliance.complianceRate}%"></div>
          </div>
        </div>

        <!-- Mis Cursos Programados -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 class="font-bold text-slate-900 text-sm">Mis Próximas Capacitaciones Convocadas</h3>
          ${myCourses.length > 0 ? myCourses.map(c => `
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
              <div>
                <p class="font-semibold text-sm text-slate-900">${Sanitizer.escapeHTML(c.title)}</p>
                <p class="text-xs text-slate-500">📅 ${Sanitizer.escapeHTML(c.date)} • Instructor: ${Sanitizer.escapeHTML(c.instructorName)}</p>
              </div>
              <button data-action="open-modal-sign-course" data-course-id="${c.id}" data-participant-id="${currentEmp.id}" class="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
                ✍️ Firmar Asistencia
              </button>
            </div>
          `).join('') : '<p class="text-xs text-slate-400">No tiene cursos pendientes asignados actualmente.</p>'}
        </div>

        <!-- Mis Habilitaciones y Carnets -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-slate-900 text-sm">Mis Habilitaciones y Carnets</h3>
            <button data-action="open-modal-add-cred" data-id="${currentEmp.id}" class="text-xs text-blue-600 font-semibold hover:underline">+ Cargar Nuevo Carnet</button>
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
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold ${evalRes.status.badgeClass}">
                    ${Sanitizer.escapeHTML(evalRes.status.label)} (${evalRes.formattedDate})
                  </span>
                </div>
              `;
            }).join('') || '<p class="text-xs text-slate-400">Sin carnets registrados</p>'}
          </div>
        </div>
      </div>
    `;
  }

  renderReportsTab() {
    const employees = store.getEmployees();
    const alerts = ExpirationEngine.scanAlerts(employees);

    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Centro de Informes, Auditoría & Exportación</h2>
          <p class="text-xs text-slate-500">Genere archivos limpios para presentar ante inspectores de SENASA, Dirección de Tránsito, Aseguradoras de Riesgos del Trabajo (ART) o auditorías ISO 9001.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">📋</div>
            <h3 class="font-bold text-slate-900 text-base">Nómina Integral de Personal</h3>
            <p class="text-xs text-slate-500">Exporta la totalidad de colaboradores con sus datos de contacto, puestos y el desglose de habilidades previas y actuales.</p>
            <button data-action="export-employees-csv" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
              Descargar CSV Nómina
            </button>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">🚦</div>
            <h3 class="font-bold text-slate-900 text-base">Auditoría de Vencimientos</h3>
            <p class="text-xs text-slate-500">Listado oficial de carnets de conducir, licencias CNRT, libretas sanitarias y exámenes ocupacionales clasificados por semáforo.</p>
            <button data-action="export-audit-csv" class="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold">
              Descargar Auditoría de Vencimientos
            </button>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="text-2xl">🖨️</div>
            <h3 class="font-bold text-slate-900 text-base">Impresión Limpia para Inspección</h3>
            <p class="text-xs text-slate-500">Imprima en papel o guarde en PDF la pantalla actual sin elementos superfluos de navegación ni botones (@media print).</p>
            <button data-action="print-window" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
              Imprimir / Guardar en PDF
            </button>
          </div>
        </div>

        <!-- Control de Datos de Demostración -->
        <div class="p-5 bg-slate-100 rounded-2xl border border-slate-200 flex justify-between items-center">
          <div>
            <h4 class="font-bold text-sm text-slate-800">Administración de Datos Demo (AiAppFactory Standard)</h4>
            <p class="text-xs text-slate-500">Puede purgar los datos de prueba para comenzar desde cero, o restaurarlos en cualquier momento.</p>
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
    // Si estamos en la pestaña de Skills, vincular el motor de búsqueda en tiempo real
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
              🔍 No se encontraron colaboradores con las habilidades solicitadas. Intente ajustar los filtros o el nivel mínimo.
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

// Instanciar y arrancar en browser
export const app = new AppController();
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}
