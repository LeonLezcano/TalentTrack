/**
 * TalentTrack Central Reactive Store (AiAppFactory Standard - Rule #6, #10 & #24)
 * Multi-tenant state, session management, file attachment handling,
 * and position requirements engine.
 */

import { INITIAL_COMPANIES, INITIAL_USERS, INITIAL_EMPLOYEES, INITIAL_COURSES, INITIAL_EPP_DELIVERIES, INITIAL_LEAVES, INITIAL_PAYROLLS, EPP_CATALOG } from './initialData.js';
import { LeaveEngine } from '../modules/leaves/leaveEngine.js';
import { PayrollEngine } from '../modules/payroll/payrollEngine.js';
import { CCT_CATALOG } from '../modules/payroll/cctCatalog.js';

const STORAGE_KEY_PREFIX = 'talenttrack_vault_';
const PURGE_FLAG_KEY = 'mipcontrol_demo_purged';
const SESSION_KEY = 'talenttrack_active_session';

class Store {
  constructor() {
    this.companies = [];
    this.users = [];
    this.employees = [];
    this.courses = [];
    this.eppDeliveries = [];
    this.leaves = [];
    this.payrolls = [];
    this.cctConfigs = {};
    this.activeSession = null;
    this.listeners = new Set();
    this.isInitialized = false;
    this._memoryFallbackStorage = new Map();
  }

  init() {
    if (this.isInitialized) return;

    const isPurged = this._getStorageItem(PURGE_FLAG_KEY) === 'true';

    if (isPurged) {
      this.companies = this._getStorageJSON('companies') || [];
      this.users = this._getStorageJSON('users') || [];
      this.employees = this._getStorageJSON('employees') || [];
      this.courses = this._getStorageJSON('courses') || [];
      this.eppDeliveries = this._getStorageJSON('eppDeliveries') || [];
      this.leaves = this._getStorageJSON('leaves') || [];
      this.payrolls = this._getStorageJSON('payrolls') || [];
      this.cctConfigs = this._getStorageJSON('cctConfigs') || {};
    } else {
      const storedCompanies = this._getStorageJSON('companies');
      const storedUsers = this._getStorageJSON('users');
      const storedEmployees = this._getStorageJSON('employees');
      const storedCourses = this._getStorageJSON('courses');
      const storedEpp = this._getStorageJSON('eppDeliveries');
      const storedLeaves = this._getStorageJSON('leaves');
      const storedPayrolls = this._getStorageJSON('payrolls');
      const storedCct = this._getStorageJSON('cctConfigs');

      this.companies = (storedCompanies && storedCompanies.length > 0) ? storedCompanies : JSON.parse(JSON.stringify(INITIAL_COMPANIES));
      this.users = (storedUsers && storedUsers.length > 0) ? storedUsers : JSON.parse(JSON.stringify(INITIAL_USERS));
      this.employees = (storedEmployees && storedEmployees.length > 0) ? storedEmployees : JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
      this.courses = (storedCourses && storedCourses.length > 0) ? storedCourses : JSON.parse(JSON.stringify(INITIAL_COURSES));
      this.eppDeliveries = (storedEpp && storedEpp.length > 0) ? storedEpp : JSON.parse(JSON.stringify(INITIAL_EPP_DELIVERIES));
      this.leaves = (storedLeaves && storedLeaves.length > 0) ? storedLeaves : JSON.parse(JSON.stringify(INITIAL_LEAVES));
      this.payrolls = (storedPayrolls && storedPayrolls.length > 0) ? storedPayrolls : JSON.parse(JSON.stringify(INITIAL_PAYROLLS));
      this.cctConfigs = (storedCct && Object.keys(storedCct).length > 0) ? storedCct : {};

      this._saveAll();
    }

    // Restaurar sesión activa si existiera
    const storedSession = this._getStorageJSON('session');
    if (storedSession && storedSession.token) {
      this.activeSession = storedSession;
    }

    this.isInitialized = true;
    this.notify();
  }

  // --- Sesión y Seguridad (Regla 24) ---
  getSession() {
    return this.activeSession;
  }

  isAuthenticated() {
    return this.activeSession !== null && !!this.activeSession.token;
  }

  setSession(session) {
    this.activeSession = session;
    this._setStorageJSON('session', session);
    this.notify();
  }

  logout() {
    this.activeSession = null;
    this._removeStorageItem(STORAGE_KEY_PREFIX + 'session');
    this.notify();
  }

  // --- Subscriptions ---
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('⚠️ [Store] Error en listener reactivo:', err);
      }
    }
  }

  // --- Companies & Multi-Tenant Aislamiento (Regla 10) ---
  getCompanies() {
    if (!this.isAuthenticated()) return [];
    if (this.activeSession.role === 'HR_ADMIN') {
      return this.companies.filter(c => c.id === this.activeSession.companyId);
    }
    return this.companies.filter(c => c.id === this.activeSession.companyId);
  }

  getCurrentCompany() {
    if (!this.isAuthenticated()) return null;
    return this.companies.find(c => c.id === this.activeSession.companyId) || null;
  }

  // --- Employees (Confinamiento Estricto Zero-Leak) ---
  getEmployees() {
    if (!this.isAuthenticated()) return [];

    // Si es colaborador, estrictamente solo se ve a sí mismo
    if (this.activeSession.role === 'EMPLOYEE') {
      return this.employees.filter(e => e.id === this.activeSession.employeeId && e.active !== false);
    }

    // Si es Administrador de RRHH, ve todos los de su empresa
    return this.employees.filter(e => e.companyId === this.activeSession.companyId && e.active !== false);
  }

  getAllEmployees() {
    return this.employees.filter(e => e.active !== false);
  }

  getEmployeeById(id) {
    const emp = this.employees.find(e => e.id === id);
    if (!emp) return null;

    // Regla de aislamiento: no permitir ver empleados de otra empresa
    if (this.isAuthenticated() && emp.companyId !== this.activeSession.companyId) {
      console.warn('⛔ [Store] Intento de acceso cross-tenant bloqueado');
      return null;
    }
    return emp;
  }

  addEmployee(empData) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('No autorizado para dar de alta colaboradores.');
    }

    const id = empData.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEmp = {
      id,
      companyId: this.activeSession.companyId,
      firstName: empData.firstName || '',
      lastName: empData.lastName || '',
      dni: empData.dni || '',
      email: empData.email || '',
      phone: empData.phone || '',
      role: empData.role || 'Empleado',
      department: empData.department || 'General',
      hireDate: empData.hireDate || new Date().toISOString().split('T')[0],
      active: true,
      skills: empData.skills || [],
      credentials: empData.credentials || []
    };

    this.employees.push(newEmp);
    this._saveAll();
    this.notify();
    return newEmp;
  }

  updateEmployee(id, updates) {
    const emp = this.getEmployeeById(id);
    if (!emp) return null;

    const idx = this.employees.findIndex(e => e.id === id);
    this.employees[idx] = {
      ...this.employees[idx],
      ...updates,
      id,
      companyId: emp.companyId // Inmutable
    };

    this._saveAll();
    this.notify();
    return this.employees[idx];
  }

  deleteEmployee(id) {
    const emp = this.getEmployeeById(id);
    if (!emp) return false;

    emp.active = false; // Tombstone pattern
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Skills ---
  addSkillToEmployee(employeeId, skill) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return false;

    if (!emp.skills) emp.skills = [];
    const skillId = skill.id || `sk_${Date.now()}`;
    const newSkill = {
      id: skillId,
      name: skill.name || 'Habilidad',
      level: Number(skill.level) || 1,
      source: skill.source || 'CURRENT_ROLE',
      yearsExperience: Number(skill.yearsExperience) || 1,
      notes: skill.notes || ''
    };

    const existingIdx = emp.skills.findIndex(s => s.name.toLowerCase() === newSkill.name.toLowerCase());
    if (existingIdx >= 0) {
      emp.skills[existingIdx] = { ...emp.skills[existingIdx], ...newSkill };
    } else {
      emp.skills.push(newSkill);
    }

    this._saveAll();
    this.notify();
    return true;
  }

  // --- Credenciales con Adjunto Real (Foto / Documento) ---
  addCredentialToEmployee(employeeId, cred) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return false;

    if (!emp.credentials) emp.credentials = [];
    const credId = cred.id || `cred_${Date.now()}`;
    const newCred = {
      id: credId,
      type: cred.type || 'OTHER',
      customLabel: cred.customLabel || 'Habilitación',
      number: cred.number || '',
      categories: cred.categories || [],
      issueDate: cred.issueDate || '',
      expirationDate: cred.expirationDate || '',
      notes: cred.notes || '',
      attachment: cred.attachment || null // DataURL o SVG del carnet real
    };

    emp.credentials.push(newCred);
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Capacitaciones LMS ---
  getCourses() {
    if (!this.isAuthenticated()) return [];
    const companyCourses = this.courses.filter(c => c.companyId === this.activeSession.companyId);

    // Si es colaborador, filtrar donde esté convocado
    if (this.activeSession.role === 'EMPLOYEE') {
      return companyCourses.filter(c => (c.participants || []).some(p => p.employeeId === this.activeSession.employeeId));
    }
    return companyCourses;
  }

  getCourseById(id) {
    const course = this.courses.find(c => c.id === id);
    if (!course) return null;
    if (this.isAuthenticated() && course.companyId !== this.activeSession.companyId) {
      return null;
    }
    return course;
  }

  addCourse(courseData) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('No autorizado para programar cursos.');
    }

    const id = courseData.id || `course_${Date.now()}`;
    const newCourse = {
      id,
      companyId: this.activeSession.companyId,
      title: courseData.title || 'Curso de Capacitación',
      category: courseData.category || 'SEGURIDAD_HIGIENE',
      description: courseData.description || '',
      date: courseData.date || new Date().toISOString().split('T')[0],
      durationHours: Number(courseData.durationHours) || 2,
      instructorName: courseData.instructorName || '',
      instructorSignature: courseData.instructorSignature || null,
      instructorSignatureHash: courseData.instructorSignatureHash || null,
      status: courseData.status || 'SCHEDULED',
      participants: courseData.participants || []
    };

    this.courses.push(newCourse);
    this._saveAll();
    this.notify();
    return newCourse;
  }

  signParticipant(courseId, employeeId, { signature, signatureHash, score, passed = true }) {
    const course = this.getCourseById(courseId);
    if (!course) return false;

    let participant = (course.participants || []).find(p => p.employeeId === employeeId);
    if (!participant) {
      const emp = this.getEmployeeById(employeeId);
      participant = {
        employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Participante',
        attended: true,
        passed,
        score: score || 10,
        signature,
        signatureHash,
        signedAt: new Date().toISOString()
      };
      if (!course.participants) course.participants = [];
      course.participants.push(participant);
    } else {
      participant.attended = true;
      participant.passed = passed;
      participant.score = score !== undefined ? score : participant.score;
      participant.signature = signature;
      participant.signatureHash = signatureHash;
      participant.signedAt = new Date().toISOString();
    }

    this._saveAll();
    this.notify();
    return true;
  }

  signInstructor(courseId, { signature, signatureHash, instructorName }) {
    const course = this.getCourseById(courseId);
    if (!course) return false;

    course.instructorSignature = signature;
    course.instructorSignatureHash = signatureHash;
    if (instructorName) course.instructorName = instructorName;

    this._saveAll();
    this.notify();
    return true;
  }

  completeCourse(courseId) {
    const course = this.getCourseById(courseId);
    if (!course) return false;

    course.status = 'COMPLETED';

    (course.participants || []).forEach(p => {
      if (p.attended && p.passed) {
        const emp = this.getEmployeeById(p.employeeId);
        if (emp) {
          let skillName = course.title;
          if (course.category === 'ALIMENTOS_BPM') skillName = 'Buenas Prácticas de Manufactura (BPM)';
          if (course.category === 'MANEJO_DEFENSIVO') skillName = 'Manejo Defensivo y Seguridad Vial';

          this.addSkillToEmployee(emp.id, {
            name: skillName,
            level: 3,
            source: 'CURRENT_ROLE',
            notes: `Capacitación completada con firma electrónica: ${course.title} (${course.date})`
          });
        }
      }
    });

    this._saveAll();
    this.notify();
    return true;
  }

  // --- Requisitos por Puesto Configurables (Desacople de Hardcode) ---
  getPositionRequirements(roleName) {
    const comp = this.getCurrentCompany();
    if (!comp || !comp.positionRequirements) return roleName ? null : [];
    if (!roleName) return comp.positionRequirements;
    return comp.positionRequirements.find(r => r.role.toLowerCase() === roleName.toLowerCase()) || null;
  }

  setPositionRequirements(roleName, { mandatoryCredentials = [], mandatoryTrainings = [] }) {
    const comp = this.getCurrentCompany();
    if (!comp) return false;
    if (!comp.positionRequirements) comp.positionRequirements = [];

    const existingIdx = comp.positionRequirements.findIndex(r => r.role.toLowerCase() === roleName.toLowerCase());
    const reqObj = { role: roleName, mandatoryCredentials, mandatoryTrainings };

    if (existingIdx >= 0) {
      comp.positionRequirements[existingIdx] = reqObj;
    } else {
      comp.positionRequirements.push(reqObj);
    }

    this._saveAll();
    this.notify();
    return true;
  }

  // --- Purga & Demo (Invariante Anti-Siembras Fantasma) ---
  purgeAllData() {
    this.companies = [];
    this.users = [];
    this.employees = [];
    this.courses = [];
    this.eppDeliveries = [];
    this.leaves = [];
    this.payrolls = [];
    this.cctConfigs = {};
    this.activeSession = null;

    this._setStorageItem(PURGE_FLAG_KEY, 'true');
    this._saveAll();
    this.notify();
  }

  restoreDemoData() {
    this._removeStorageItem(PURGE_FLAG_KEY);
    this.companies = JSON.parse(JSON.stringify(INITIAL_COMPANIES));
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.employees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
    this.courses = JSON.parse(JSON.stringify(INITIAL_COURSES));
    this.eppDeliveries = JSON.parse(JSON.stringify(INITIAL_EPP_DELIVERIES));
    this.leaves = JSON.parse(JSON.stringify(INITIAL_LEAVES));
    this.payrolls = JSON.parse(JSON.stringify(INITIAL_PAYROLLS));
    this.cctConfigs = {};

    // Sesión por defecto en demo para pruebas inmediatas
    this.activeSession = {
      userId: this.users[0].id,
      name: this.users[0].name,
      email: this.users[0].email,
      role: 'HR_ADMIN',
      companyId: this.users[0].companyId,
      token: 'TT_DEMO_TOKEN_ACTIVE',
      loginAt: new Date().toISOString()
    };

    this._saveAll();
    this.notify();
  }

  // --- Módulo de EPP & Dotación (Res. SRT 299/11) ---
  getEppCatalog() {
    return EPP_CATALOG;
  }

  getEppDeliveries() {
    if (!this.isAuthenticated()) return [];
    const companyDeliveries = this.eppDeliveries.filter(d => d.companyId === this.activeSession.companyId);

    if (this.activeSession.role === 'EMPLOYEE') {
      return companyDeliveries.filter(d => d.employeeId === this.activeSession.employeeId);
    }
    return companyDeliveries;
  }

  getEppDeliveriesByEmployee(empId) {
    if (!this.isAuthenticated()) return [];
    if (this.activeSession.role === 'EMPLOYEE' && this.activeSession.employeeId !== empId) {
      return [];
    }
    return this.eppDeliveries.filter(d => d.companyId === this.activeSession.companyId && d.employeeId === empId);
  }

  addEppDelivery(deliveryData) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('No autorizado para registrar entregas de EPP.');
    }

    const emp = this.getEmployeeById(deliveryData.employeeId);
    if (!emp) throw new Error('Colaborador no encontrado');

    const eppItem = EPP_CATALOG[deliveryData.eppId] || { name: deliveryData.eppName || 'EPP Personalizado', standard: 'Sello S / IRAM', renewalDays: 180 };
    const deliveryDate = deliveryData.deliveryDate || new Date().toISOString().split('T')[0];

    let expirationDate = deliveryData.expirationDate;
    if (!expirationDate) {
      const d = new Date(deliveryDate);
      d.setDate(d.getDate() + (eppItem.renewalDays || 180));
      expirationDate = d.toISOString().split('T')[0];
    }

    const id = deliveryData.id || `epp_del_${Date.now()}`;
    const newDelivery = {
      id,
      companyId: this.activeSession.companyId,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      dni: emp.dni,
      eppId: deliveryData.eppId,
      eppName: deliveryData.eppName || eppItem.name,
      brandModel: deliveryData.brandModel || 'Estándar Certificado',
      standard: deliveryData.standard || eppItem.standard,
      quantity: Number(deliveryData.quantity) || 1,
      deliveryDate,
      expirationDate,
      trainedInUse: deliveryData.trainedInUse !== false,
      signature: deliveryData.signature || null,
      signatureHash: deliveryData.signatureHash || null,
      signedAt: deliveryData.signedAt || new Date().toISOString(),
      deliveredBy: deliveryData.deliveredBy || this.activeSession.name
    };

    this.eppDeliveries.push(newDelivery);
    this._saveAll();
    this.notify();
    return newDelivery;
  }

  deleteEppDelivery(deliveryId) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('No autorizado para eliminar registros de EPP.');
    }

    const index = this.eppDeliveries.findIndex(d => d.id === deliveryId && d.companyId === this.activeSession.companyId);
    if (index === -1) return false;

    this.eppDeliveries.splice(index, 1);
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Módulo Vacaciones, Licencias & Ausentismo ---
  getLeaves() {
    if (!this.isAuthenticated()) return [];
    if (this.activeSession.role === 'EMPLOYEE') {
      return this.leaves.filter(l => l.employeeId === this.activeSession.employeeId);
    }
    return this.leaves.filter(l => l.companyId === this.activeSession.companyId);
  }

  getLeavesByEmployee(empId) {
    if (!this.isAuthenticated()) return [];
    if (this.activeSession.role === 'EMPLOYEE' && this.activeSession.employeeId !== empId) {
      return [];
    }
    return this.leaves.filter(l => l.employeeId === empId && l.companyId === this.activeSession.companyId);
  }

  requestLeave(leaveData) {
    if (!this.isAuthenticated()) {
      throw new Error('Debe iniciar sesión para solicitar una licencia.');
    }

    const empId = leaveData.employeeId || this.activeSession.employeeId;
    const emp = this.getEmployeeById(empId);
    if (!emp) throw new Error('Colaborador no encontrado.');

    if (!leaveData.startDate || !leaveData.endDate) {
      throw new Error('Debe especificar fecha de inicio y de fin.');
    }

    if (LeaveEngine.hasOverlap(this.leaves, emp.id, leaveData.startDate, leaveData.endDate)) {
      throw new Error('La solicitud se superpone con otra licencia ya registrada para estas fechas.');
    }

    const calculatedDays = LeaveEngine.calculateDaysBetween(leaveData.startDate, leaveData.endDate);
    const days = Number(leaveData.days) || calculatedDays || 1;

    const id = leaveData.id || `leave_${Date.now()}`;
    const newLeave = {
      id,
      companyId: this.activeSession.companyId,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      type: leaveData.type || 'VACATION',
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      days,
      reason: leaveData.reason?.trim() || '',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      certificateUrl: leaveData.certificateUrl || null
    };

    this.leaves.push(newLeave);
    this._saveAll();
    this.notify();
    return newLeave;
  }

  reviewLeave(leaveId, decision, reviewNotes = '') {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('Solo el Administrador de RRHH puede aprobar o rechazar licencias.');
    }

    const leave = this.leaves.find(l => l.id === leaveId && l.companyId === this.activeSession.companyId);
    if (!leave) throw new Error('Licencia no encontrada.');

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new Error('Decisión inválida. Debe ser APPROVED o REJECTED.');
    }

    const notes = typeof reviewNotes === 'object' ? (reviewNotes.notes || '') : reviewNotes;
    const reviewer = (typeof reviewNotes === 'object' && reviewNotes.reviewerName) ? reviewNotes.reviewerName : (this.activeSession.name || 'Administrador de RRHH');

    leave.status = decision;
    leave.reviewedBy = reviewer;
    leave.reviewedAt = new Date().toISOString();
    leave.reviewNotes = notes ? notes.trim() : null;

    this._saveAll();
    this.notify();
    return leave;
  }

  deleteLeave(leaveId) {
    if (!this.isAuthenticated()) return false;
    const index = this.leaves.findIndex(l => l.id === leaveId && l.companyId === this.activeSession.companyId);
    if (index === -1) return false;

    // Si es colaborador, solo puede cancelar si está pendiente
    if (this.activeSession.role === 'EMPLOYEE') {
      if (this.leaves[index].employeeId !== this.activeSession.employeeId || this.leaves[index].status !== 'PENDING') {
        throw new Error('Solo puede cancelar solicitudes pendientes propias.');
      }
    }

    this.leaves.splice(index, 1);
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Módulo Liquidación de Sueldos & Recibos Digitales ---
  getPayrolls() {
    if (!this.isAuthenticated()) return [];
    if (this.activeSession.role === 'EMPLOYEE') {
      const empId = this.activeSession.employeeId;
      return this.payrolls
        .filter(p => p.companyId === this.activeSession.companyId && p.payslips.some(ps => ps.employeeId === empId))
        .map(p => ({
          ...p,
          payslips: p.payslips.filter(ps => ps.employeeId === empId)
        }));
    }
    return this.payrolls.filter(p => p.companyId === this.activeSession.companyId);
  }

  getPayrollById(id) {
    if (!this.isAuthenticated()) return null;
    const payroll = this.payrolls.find(p => p.id === id && p.companyId === this.activeSession.companyId);
    if (!payroll) return null;
    if (this.activeSession.role === 'EMPLOYEE') {
      const empId = this.activeSession.employeeId;
      return {
        ...payroll,
        payslips: payroll.payslips.filter(ps => ps.employeeId === empId)
      };
    }
    return payroll;
  }

  getPayslips() {
    if (!this.isAuthenticated()) return [];
    const payrolls = this.getPayrolls();
    const list = [];
    for (const p of payrolls) {
      for (const ps of p.payslips) {
        list.push({ ...ps, payrollPeriod: p.periodStr, payrollStatus: p.status });
      }
    }
    return list;
  }

  getPayslipById(payslipId) {
    if (!this.isAuthenticated()) return null;
    const payslips = this.getPayslips();
    return payslips.find(ps => ps.id === payslipId) || null;
  }

  runPayroll({ period, periodStr, periodType = 'MONTHLY', paymentDate = null, novedadesMap = {} }) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('Solo el Administrador de RRHH puede ejecutar liquidaciones de sueldo.');
    }

    const employees = this.getEmployees().filter(e => e.active);
    if (employees.length === 0) {
      throw new Error('No hay colaboradores activos para liquidar.');
    }

    const payrollId = `pay_${Date.now()}`;
    const pStr = periodStr || period || '2026-11';
    const depositDate = paymentDate || new Date().toISOString().split('T')[0];

    const payslips = [];
    let batchBruto = 0;
    let batchRemunerativo = 0;
    let batchNoRemunerativo = 0;
    let batchDescuentos = 0;
    let batchNeto = 0;
    let batchContribuciones = 0;

    for (const emp of employees) {
      const empNovedades = novedadesMap[emp.id] || {};
      const empLeaves = this.getLeavesByEmployee(emp.id);

      const calc = PayrollEngine.calculateEmployeePayroll({
        employee: emp,
        period: { periodStr: pStr, type: periodType },
        cctConfig: this.cctConfigs[emp.cctId] || null,
        novedades: empNovedades,
        leaves: empLeaves
      });

      const psId = `ps_${emp.id}_${Date.now()}`;
      const payslip = {
        id: psId,
        companyId: this.activeSession.companyId,
        payrollId,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        cuil: calc.cuil,
        cctId: calc.cctId,
        cctName: calc.cctName,
        cctCategory: calc.cctCategory,
        periodStr: pStr,
        periodType,
        bank: calc.bank,
        cbu: calc.cbu,
        depositDate,
        status: 'PENDING_SIGNATURE', // Listo para firma digital
        signedAt: null,
        signature: null,
        signatureHash: null,
        ipAddress: null,
        totalRemunerativo: calc.totalRemunerativo,
        totalNoRemunerativo: calc.totalNoRemunerativo,
        totalBruto: calc.totalBruto,
        totalDescuentos: calc.totalDescuentos,
        totalNeto: calc.totalNeto,
        netoInWords: calc.netoInWords,
        employerContributions: calc.employerContributions,
        items: calc.items
      };

      payslips.push(payslip);

      batchBruto += calc.totalBruto;
      batchRemunerativo += calc.totalRemunerativo;
      batchNoRemunerativo += calc.totalNoRemunerativo;
      batchDescuentos += calc.totalDescuentos;
      batchNeto += calc.totalNeto;
      batchContribuciones += calc.employerContributions.total;
    }

    const newPayroll = {
      id: payrollId,
      companyId: this.activeSession.companyId,
      period: period || pStr,
      periodStr: pStr,
      periodType,
      runNumber: this.payrolls.filter(p => p.companyId === this.activeSession.companyId && p.period === period).length + 1,
      status: 'EMITTED',
      createdAt: new Date().toISOString(),
      sealedAt: new Date().toISOString(),
      sealedBy: this.activeSession.name || 'Administrador RRHH',
      bankPaymentDate: depositDate,
      totalBruto: batchBruto,
      totalRemunerativo: batchRemunerativo,
      totalNoRemunerativo: batchNoRemunerativo,
      totalDescuentos: batchDescuentos,
      totalNeto: batchNeto,
      totalContribucionesPatronales: batchContribuciones,
      payslips
    };

    this.payrolls.unshift(newPayroll);
    this._saveAll();
    this.notify();
    return newPayroll;
  }

  sealPayrollBatch(payrollId) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('Solo el Administrador de RRHH puede sellar lotes de liquidación.');
    }

    const payroll = this.payrolls.find(p => p.id === payrollId && p.companyId === this.activeSession.companyId);
    if (!payroll) throw new Error('Liquidación no encontrada.');

    payroll.status = 'EMITTED';
    payroll.sealedAt = new Date().toISOString();
    payroll.sealedBy = this.activeSession.name || 'Administrador RRHH';

    this._saveAll();
    this.notify();
    return payroll;
  }

  signPayslip(payrollId, payslipId, { signature, signatureHash, ipAddress = '127.0.0.1' }) {
    if (!this.isAuthenticated()) {
      throw new Error('Debe iniciar sesión para firmar el recibo de sueldo.');
    }

    const payroll = this.payrolls.find(p => p.id === payrollId && p.companyId === this.activeSession.companyId);
    if (!payroll) throw new Error('Liquidación no encontrada.');

    const payslip = payroll.payslips.find(ps => ps.id === payslipId);
    if (!payslip) throw new Error('Recibo de sueldo no encontrado.');

    // Confinamiento: El empleado solo puede firmar su propio recibo
    if (this.activeSession.role === 'EMPLOYEE' && payslip.employeeId !== this.activeSession.employeeId) {
      throw new Error('No autorizado para firmar recibos de otros colaboradores.');
    }

    payslip.status = 'SIGNED';
    payslip.signedAt = new Date().toISOString();
    payslip.signature = signature;
    payslip.signatureHash = signatureHash;
    payslip.ipAddress = ipAddress;

    this._saveAll();
    this.notify();
    return payslip;
  }

  getCctCatalog() {
    const catalog = JSON.parse(JSON.stringify(CCT_CATALOG));
    for (const [cctId, overrides] of Object.entries(this.cctConfigs)) {
      if (catalog[cctId]) {
        catalog[cctId] = { ...catalog[cctId], ...overrides };
      }
    }
    return catalog;
  }

  updateCctCategory(cctId, categoryId, newBasicSalary) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('Solo el Administrador de RRHH puede actualizar escalas paritarias.');
    }

    if (!this.cctConfigs[cctId]) {
      this.cctConfigs[cctId] = JSON.parse(JSON.stringify(CCT_CATALOG[cctId] || {}));
    }

    const cat = this.cctConfigs[cctId].categories.find(c => c.id === categoryId);
    if (cat) {
      cat.basicSalary = Number(newBasicSalary);
      if (cat.hourlyRate) cat.hourlyRate = Math.round(Number(newBasicSalary) / 176);
    }

    this._saveAll();
    this.notify();
    return this.cctConfigs[cctId];
  }

  deletePayroll(payrollId) {
    if (!this.isAuthenticated() || this.activeSession.role !== 'HR_ADMIN') {
      throw new Error('Solo el Administrador de RRHH puede eliminar liquidaciones.');
    }

    const index = this.payrolls.findIndex(p => p.id === payrollId && p.companyId === this.activeSession.companyId);
    if (index === -1) return false;

    this.payrolls.splice(index, 1);
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Storage Internals ---
  _saveAll() {
    this._setStorageJSON('companies', this.companies);
    this._setStorageJSON('users', this.users);
    this._setStorageJSON('employees', this.employees);
    this._setStorageJSON('courses', this.courses);
    this._setStorageJSON('eppDeliveries', this.eppDeliveries);
    this._setStorageJSON('leaves', this.leaves);
    this._setStorageJSON('payrolls', this.payrolls);
    this._setStorageJSON('cctConfigs', this.cctConfigs);
    if (this.activeSession) {
      this._setStorageJSON('session', this.activeSession);
    }
  }

  _getStorageItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (_) {}
    return this._memoryFallbackStorage.get(key) || null;
  }

  _setStorageItem(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
        return;
      }
    } catch (_) {}
    this._memoryFallbackStorage.set(key, String(val));
  }

  _removeStorageItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    this._memoryFallbackStorage.delete(key);
  }

  _getStorageJSON(key) {
    try {
      const raw = this._getStorageItem(STORAGE_KEY_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  _setStorageJSON(key, val) {
    try {
      this._setStorageItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
    } catch (_) {}
  }
}

export const store = new Store();
