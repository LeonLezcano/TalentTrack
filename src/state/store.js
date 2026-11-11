/**
 * TalentTrack Central Reactive Store (AiAppFactory Standard)
 * Multi-company state, offline-first persistence, tombstone support,
 * and zero-ghost seeding invariant (mipcontrol_demo_purged).
 */

import { INITIAL_COMPANIES, INITIAL_EMPLOYEES, INITIAL_COURSES } from './initialData.js';

const STORAGE_KEY_PREFIX = 'talenttrack_';
const PURGE_FLAG_KEY = 'mipcontrol_demo_purged';

class Store {
  constructor() {
    this.companies = [];
    this.employees = [];
    this.courses = [];
    this.currentCompanyId = null;
    this.currentUserRole = 'HR_ADMIN'; // 'HR_ADMIN' | 'EMPLOYEE'
    this.currentEmployeeId = null;
    this.listeners = new Set();
    this.isInitialized = false;
    this._memoryFallbackStorage = new Map();
  }

  /**
   * Initializes the store from storage or initial seed.
   */
  init() {
    if (this.isInitialized) return;

    const isPurged = this._getStorageItem(PURGE_FLAG_KEY) === 'true';

    if (isPurged) {
      // Si fue purgado expresamente, no re-sembrar fantasmas
      this.companies = this._getStorageJSON('companies') || [];
      this.employees = this._getStorageJSON('employees') || [];
      this.courses = this._getStorageJSON('courses') || [];
    } else {
      // Cargar persistido o sembrar inicial
      const storedCompanies = this._getStorageJSON('companies');
      const storedEmployees = this._getStorageJSON('employees');
      const storedCourses = this._getStorageJSON('courses');

      this.companies = (storedCompanies && storedCompanies.length > 0) ? storedCompanies : JSON.parse(JSON.stringify(INITIAL_COMPANIES));
      this.employees = (storedEmployees && storedEmployees.length > 0) ? storedEmployees : JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
      this.courses = (storedCourses && storedCourses.length > 0) ? storedCourses : JSON.parse(JSON.stringify(INITIAL_COURSES));

      this._saveAll();
    }

    if (this.companies.length > 0 && !this.currentCompanyId) {
      this.currentCompanyId = this.companies[0].id;
    }
    if (this.employees.length > 0 && !this.currentEmployeeId) {
      this.currentEmployeeId = this.employees[0].id;
    }

    this.isInitialized = true;
    this.notify();
  }

  // --- Subscriptions & Reactivity ---
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

  // --- Companies ---
  getCompanies() {
    return [...this.companies];
  }

  getCurrentCompany() {
    return this.companies.find(c => c.id === this.currentCompanyId) || this.companies[0] || null;
  }

  setCurrentCompany(companyId) {
    if (this.companies.some(c => c.id === companyId)) {
      this.currentCompanyId = companyId;
      this.notify();
    }
  }

  addCompany(company) {
    const id = company.id || `comp_${Date.now()}`;
    const newCompany = { ...company, id };
    this.companies.push(newCompany);
    this._saveAll();
    this.notify();
    return newCompany;
  }

  // --- Employees ---
  getEmployees(companyId = null) {
    const targetCompany = companyId || this.currentCompanyId;
    if (!targetCompany) return [...this.employees];
    return this.employees.filter(e => e.companyId === targetCompany && e.active !== false);
  }

  getAllEmployees() {
    return this.employees.filter(e => e.active !== false);
  }

  getEmployeeById(id) {
    return this.employees.find(e => e.id === id) || null;
  }

  addEmployee(empData) {
    const id = empData.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEmp = {
      id,
      companyId: empData.companyId || this.currentCompanyId,
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
    const idx = this.employees.findIndex(e => e.id === id);
    if (idx === -1) return null;

    this.employees[idx] = {
      ...this.employees[idx],
      ...updates,
      id // id inmutable
    };

    this._saveAll();
    this.notify();
    return this.employees[idx];
  }

  deleteEmployee(id) {
    // Soft delete (tombstone pattern)
    const idx = this.employees.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.employees[idx].active = false;
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Skills inside Employee ---
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

    // Si ya existe la misma habilidad, actualizar nivel
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

  removeSkillFromEmployee(employeeId, skillId) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp || !emp.skills) return false;

    emp.skills = emp.skills.filter(s => s.id !== skillId);
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Credentials / Carnets inside Employee ---
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
      documentAttachment: cred.documentAttachment || null
    };

    emp.credentials.push(newCred);
    this._saveAll();
    this.notify();
    return true;
  }

  removeCredentialFromEmployee(employeeId, credentialId) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp || !emp.credentials) return false;

    emp.credentials = emp.credentials.filter(c => c.id !== credentialId);
    this._saveAll();
    this.notify();
    return true;
  }

  // --- Courses & LMS ---
  getCourses(companyId = null) {
    const target = companyId || this.currentCompanyId;
    if (!target) return [...this.courses];
    return this.courses.filter(c => c.companyId === target);
  }

  getCourseById(id) {
    return this.courses.find(c => c.id === id) || null;
  }

  addCourse(courseData) {
    const id = courseData.id || `course_${Date.now()}`;
    const newCourse = {
      id,
      companyId: courseData.companyId || this.currentCompanyId,
      title: courseData.title || 'Curso de Capacitación',
      category: courseData.category || 'SEGURIDAD_HIGIENE',
      description: courseData.description || '',
      date: courseData.date || new Date().toISOString().split('T')[0],
      durationHours: Number(courseData.durationHours) || 2,
      instructorName: courseData.instructorName || '',
      instructorSignature: courseData.instructorSignature || null,
      instructorSignatureHash: courseData.instructorSignatureHash || null,
      status: courseData.status || 'SCHEDULED', // SCHEDULED, IN_PROGRESS, COMPLETED
      participants: courseData.participants || []
    };

    this.courses.push(newCourse);
    this._saveAll();
    this.notify();
    return newCourse;
  }

  updateCourse(id, updates) {
    const idx = this.courses.findIndex(c => c.id === id);
    if (idx === -1) return null;

    this.courses[idx] = {
      ...this.courses[idx],
      ...updates,
      id
    };

    this._saveAll();
    this.notify();
    return this.courses[idx];
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

    // Sincronizar automáticamente con las habilidades y legajo de los aprobados
    (course.participants || []).forEach(p => {
      if (p.attended && p.passed) {
        const emp = this.getEmployeeById(p.employeeId);
        if (emp) {
          // Si el curso aporta una skill conocida
          let skillName = course.title;
          if (course.category === 'ALIMENTOS_BPM') skillName = 'Buenas Prácticas de Manufactura (BPM)';
          if (course.category === 'MANEJO_DEFENSIVO') skillName = 'Manejo Defensivo y Seguridad Vial';

          this.addSkillToEmployee(emp.id, {
            name: skillName,
            level: 3,
            source: 'CURRENT_ROLE',
            notes: `Capacitación aprobada: ${course.title} (${course.date})`
          });
        }
      }
    });

    this._saveAll();
    this.notify();
    return true;
  }

  // --- Purge & Demo Management (Anti-Siembra Fantasma Invariant) ---
  purgeAllData() {
    this.companies = [];
    this.employees = [];
    this.courses = [];
    this.currentCompanyId = null;
    this.currentEmployeeId = null;

    this._setStorageItem(PURGE_FLAG_KEY, 'true');
    this._saveAll();
    this.notify();
  }

  restoreDemoData() {
    this._removeStorageItem(PURGE_FLAG_KEY);
    this.companies = JSON.parse(JSON.stringify(INITIAL_COMPANIES));
    this.employees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
    this.courses = JSON.parse(JSON.stringify(INITIAL_COURSES));
    this.currentCompanyId = this.companies[0]?.id || null;
    this.currentEmployeeId = this.employees[0]?.id || null;

    this._saveAll();
    this.notify();
  }

  // --- Storage Helpers ---
  _saveAll() {
    this._setStorageJSON('companies', this.companies);
    this._setStorageJSON('employees', this.employees);
    this._setStorageJSON('courses', this.courses);
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
