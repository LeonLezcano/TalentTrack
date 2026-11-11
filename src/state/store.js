/**
 * TalentTrack Central Reactive Store (AiAppFactory Standard - Rule #6, #10 & #24)
 * Multi-tenant state, session management, file attachment handling,
 * and position requirements engine.
 */

import { INITIAL_COMPANIES, INITIAL_USERS, INITIAL_EMPLOYEES, INITIAL_COURSES } from './initialData.js';

const STORAGE_KEY_PREFIX = 'talenttrack_vault_';
const PURGE_FLAG_KEY = 'mipcontrol_demo_purged';
const SESSION_KEY = 'talenttrack_active_session';

class Store {
  constructor() {
    this.companies = [];
    this.users = [];
    this.employees = [];
    this.courses = [];
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
    } else {
      const storedCompanies = this._getStorageJSON('companies');
      const storedUsers = this._getStorageJSON('users');
      const storedEmployees = this._getStorageJSON('employees');
      const storedCourses = this._getStorageJSON('courses');

      this.companies = (storedCompanies && storedCompanies.length > 0) ? storedCompanies : JSON.parse(JSON.stringify(INITIAL_COMPANIES));
      this.users = (storedUsers && storedUsers.length > 0) ? storedUsers : JSON.parse(JSON.stringify(INITIAL_USERS));
      this.employees = (storedEmployees && storedEmployees.length > 0) ? storedEmployees : JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
      this.courses = (storedCourses && storedCourses.length > 0) ? storedCourses : JSON.parse(JSON.stringify(INITIAL_COURSES));

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
    if (!comp || !comp.positionRequirements) return null;
    return comp.positionRequirements.find(r => r.role.toLowerCase() === (roleName || '').toLowerCase()) || null;
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

  // --- Storage Internals ---
  _saveAll() {
    this._setStorageJSON('companies', this.companies);
    this._setStorageJSON('users', this.users);
    this._setStorageJSON('employees', this.employees);
    this._setStorageJSON('courses', this.courses);
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
