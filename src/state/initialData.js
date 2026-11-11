/**
 * TalentTrack Realistic Demo Seed Data (Updated with real password hashes & multi-tenant users)
 */

export const INITIAL_COMPANIES = [
  {
    id: 'comp_alimentos',
    name: 'Frigorífico & Lácteos La Huella S.A.',
    cuit: '30-71458923-4',
    industry: 'Alimentos & Bebidas',
    location: 'Parque Industrial Pilar, Buenos Aires',
    // Matriz de Requisitos Obligatorios por Puesto 100% Configurable
    positionRequirements: [
      {
        role: 'Chofer de Reparto Pesado',
        mandatoryCredentials: ['DRIVER_LICENSE'],
        mandatoryTrainings: ['MANEJO_DEFENSIVO']
      },
      {
        role: 'Operaria de Elaboración & Envasado',
        mandatoryCredentials: ['FOOD_HANDLER_BPM'],
        mandatoryTrainings: ['ALIMENTOS_BPM']
      },
      {
        role: 'Supervisor de Planta & Calidad',
        mandatoryCredentials: ['FOOD_HANDLER_BPM'],
        mandatoryTrainings: ['ALIMENTOS_BPM', 'SEGURIDAD_HIGIENE']
      }
    ]
  },
  {
    id: 'comp_logistica',
    name: 'TransAndina Logística & Cargas S.R.L.',
    cuit: '30-68954120-7',
    industry: 'Transporte & Distribución',
    location: 'Rosario, Santa Fe',
    positionRequirements: [
      {
        role: 'Chofer de Larga Distancia',
        mandatoryCredentials: ['DRIVER_LICENSE'],
        mandatoryTrainings: ['MANEJO_DEFENSIVO']
      },
      {
        role: 'Chofer de Reparto Urbano',
        mandatoryCredentials: ['DRIVER_LICENSE'],
        mandatoryTrainings: ['MANEJO_DEFENSIVO']
      }
    ]
  }
];

// Usuarios Administradores de RRHH reales por empresa
export const INITIAL_USERS = [
  {
    id: 'usr_admin_alimentos',
    companyId: 'comp_alimentos',
    name: 'Lic. Paula Santillán',
    email: 'rrhh@lahuella.com',
    salt: 'lahuella_salt_2026',
    passwordHash: '4c11ff4a3b31ad6eed10c30f1c9f0ce9606d272be10ac7835304f6cb90db09f7',
    role: 'HR_ADMIN'
  },
  {
    id: 'usr_admin_logistica',
    companyId: 'comp_logistica',
    name: 'Dr. Fernando Quiroga',
    email: 'rrhh@transandina.com',
    salt: 'transandina_salt_2026',
    passwordHash: '48f2892e4c28f8bbb883ee8de56dd5357200dbdbec47e18757a7c3f0b753631b',
    role: 'HR_ADMIN'
  }
];

export const INITIAL_EMPLOYEES = [
  {
    id: 'emp_carlos_gomez',
    companyId: 'comp_alimentos',
    firstName: 'Carlos Alberto',
    lastName: 'Gómez',
    dni: '32.458.912',
    email: 'carlos.gomez@lahuella.com',
    phone: '+54 9 11 4455-8899',
    role: 'Chofer de Reparto Pesado',
    department: 'Logística & Despacho',
    hireDate: '2021-03-15',
    active: true,
    skills: [
      { id: 'chofer_pesado', name: 'Conducción Camión Pesado / Articulado', level: 3, source: 'CURRENT_ROLE', yearsExperience: 5 },
      { id: 'cadena_frio', name: 'Gestión de Cadena de Frío y Cámaras', level: 2, source: 'CURRENT_ROLE', yearsExperience: 3 },
      { id: 'soldadura', name: 'Soldadura TIG / MIG', level: 3, source: 'PREVIOUS_EXPERIENCE', yearsExperience: 4, notes: 'Trabajó 4 años en taller metalúrgico antes de ingresar' },
      { id: 'mantenimiento_mec', name: 'Mantenimiento Electromecánico', level: 2, source: 'PREVIOUS_EXPERIENCE', yearsExperience: 3, notes: 'Reparación de bombas y motores diésel' }
    ],
    credentials: [
      {
        id: 'cred_cg_lic',
        type: 'DRIVER_LICENSE',
        customLabel: 'Licencia Nacional de Conducir',
        number: '32458912',
        categories: ['C (Camión sin acoplado)', 'E (Articulados/Acoplado)', 'LNH (CNRT Cargas Generales)'],
        issueDate: '2024-05-10',
        expirationDate: '2026-11-23', // Vence en ~12 días: ALERTA NARANJA PREVENTIVA
        notes: 'Examen psicofísico aprobado',
        attachment: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" rx="10" fill="%23e2e8f0"/><text x="20" y="40" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231e293b">LICENCIA NACIONAL DE CONDUCIR</text><text x="20" y="70" font-size="12" fill="%23475569">Titular: Carlos Alberto Gómez</text><text x="20" y="95" font-size="12" fill="%23475569">DNI: 32.458.912</text><text x="20" y="120" font-size="12" fill="%23475569">Clases: C, E, LNH CNRT</text><text x="20" y="150" font-size="12" font-weight="bold" fill="%23dc2626">Vence: 23/11/2026</text></svg>'
      },
      {
        id: 'cred_cg_bpm',
        type: 'FOOD_HANDLER_BPM',
        customLabel: 'Libreta Sanitaria Alimentos',
        number: 'LS-99823',
        issueDate: '2025-01-10',
        expirationDate: '2027-01-10',
        notes: 'Renovación bianual',
        attachment: null
      }
    ]
  },
  {
    id: 'emp_mariana_lopez',
    companyId: 'comp_alimentos',
    firstName: 'Mariana Soledad',
    lastName: 'López',
    dni: '36.874.521',
    email: 'mariana.lopez@lahuella.com',
    phone: '+54 9 11 6589-3214',
    role: 'Operaria de Elaboración & Envasado',
    department: 'Planta de Producción',
    hireDate: '2022-08-01',
    active: true,
    skills: [
      { id: 'bpm', name: 'Buenas Prácticas de Manufactura (BPM)', level: 3, source: 'CURRENT_ROLE', yearsExperience: 4 },
      { id: 'control_calidad', name: 'Control de Calidad en Línea', level: 2, source: 'CURRENT_ROLE', yearsExperience: 2 },
      { id: 'excel_avanzado', name: 'Excel Avanzado / Tablas Dinámicas', level: 3, source: 'PREVIOUS_EXPERIENCE', yearsExperience: 3, notes: 'Conocimientos avanzados de planillas y estadística' },
      { id: 'ingles_intermedio', name: 'Inglés Profesional Intermedio/Avanzado', level: 2, source: 'PREVIOUS_EXPERIENCE', yearsExperience: 2, notes: 'Nivel B2 con certificación' }
    ],
    credentials: [
      {
        id: 'cred_ml_bpm',
        type: 'FOOD_HANDLER_BPM',
        customLabel: 'Carnet de Manipulador de Alimentos',
        number: 'CMA-4458',
        issueDate: '2024-11-01',
        expirationDate: '2026-11-05', // Vencido hace pocos días: ROJO CRÍTICO
        notes: 'Requiere curso de actualización urgente',
        attachment: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" rx="10" fill="%23fee2e2"/><text x="20" y="40" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23991b1b">CARNET MANIPULADOR ALIMENTOS (BPM)</text><text x="20" y="70" font-size="12" fill="%237f1d1d">Mariana Soledad López</text><text x="20" y="95" font-size="12" fill="%237f1d1d">DNI: 36.874.521</text><text x="20" y="140" font-size="12" font-weight="bold" fill="%23b91c1c">ESTADO: VENCIDO (05/11/2026)</text></svg>'
      },
      {
        id: 'cred_ml_art',
        type: 'MEDICAL_ART',
        customLabel: 'Apto Médico Periódico ART',
        number: 'ART-2026-88',
        issueDate: '2026-02-15',
        expirationDate: '2027-02-15',
        notes: 'Sin observaciones',
        attachment: null
      }
    ]
  },
  {
    id: 'emp_esteban_rojas',
    companyId: 'comp_alimentos',
    firstName: 'Esteban',
    lastName: 'Rojas',
    dni: '29.334.120',
    email: 'esteban.rojas@lahuella.com',
    phone: '+54 9 11 5566-7788',
    role: 'Supervisor de Planta & Calidad',
    department: 'Aseguramiento de la Calidad',
    hireDate: '2019-01-10',
    active: true,
    skills: [
      { id: 'bpm', name: 'Buenas Prácticas de Manufactura (BPM)', level: 4, source: 'CURRENT_ROLE', yearsExperience: 8 },
      { id: 'haccp', name: 'Análisis de Peligros y Puntos Críticos (HACCP)', level: 3, source: 'CURRENT_ROLE', yearsExperience: 6 },
      { id: 'primeros_auxilios', name: 'Primeros Auxilios y RCP', level: 3, source: 'CURRENT_ROLE', yearsExperience: 5 }
    ],
    credentials: [
      {
        id: 'cred_er_bpm',
        type: 'FOOD_HANDLER_BPM',
        customLabel: 'Libreta Sanitaria Nacional',
        number: 'LS-33019',
        issueDate: '2026-06-01',
        expirationDate: '2028-06-01',
        notes: 'Habilitación provincial y nacional',
        attachment: null
      }
    ]
  },
  {
    id: 'emp_martin_vargas',
    companyId: 'comp_logistica',
    firstName: 'Martín',
    lastName: 'Vargas',
    dni: '34.901.654',
    email: 'martin.vargas@transandina.com',
    phone: '+54 9 341 487-9900',
    role: 'Chofer de Larga Distancia',
    department: 'Flota Pesada',
    hireDate: '2020-05-18',
    active: true,
    skills: [
      { id: 'chofer_pesado', name: 'Conducción Camión Pesado / Articulado', level: 4, source: 'CURRENT_ROLE', yearsExperience: 10 },
      { id: 'cargas_peligrosas', name: 'Transporte de Cargas Peligrosas', level: 3, source: 'CURRENT_ROLE', yearsExperience: 6 },
      { id: 'autoelevador', name: 'Operación de Autoelevador / Clark', level: 2, source: 'PREVIOUS_EXPERIENCE', yearsExperience: 2, notes: 'Manejaba autoelevador en depósito anterior' }
    ],
    credentials: [
      {
        id: 'cred_mv_lic',
        type: 'DRIVER_LICENSE',
        customLabel: 'Licencia Nacional de Conducir',
        number: '34901654',
        categories: ['E (Articulados/Acoplado)', 'LNH (CNRT Peligrosas)'],
        issueDate: '2025-08-20',
        expirationDate: '2027-08-20',
        notes: 'Cargas generales y peligrosas al día',
        attachment: null
      }
    ]
  },
  {
    id: 'emp_lucas_benitez',
    companyId: 'comp_logistica',
    firstName: 'Lucas',
    lastName: 'Benítez',
    dni: '40.125.789',
    email: 'lucas.benitez@transandina.com',
    phone: '+54 9 341 555-1234',
    role: 'Chofer de Reparto Urbano',
    department: 'Distribución Local',
    hireDate: '2024-02-01',
    active: true,
    skills: [
      { id: 'ruteo_urbano', name: 'Ruteo y Reparto Urbano de Alimentos', level: 2, source: 'CURRENT_ROLE', yearsExperience: 2 },
      { id: 'facturacion_erp', name: 'Facturación AFIP y Gestión ERP', level: 2, source: 'PREVIOUS_EXPERIENCE', yearsExperience: 2, notes: 'Fue administrativo de facturación antes de pasar a chofer' }
    ],
    credentials: [
      {
        id: 'cred_lb_lic',
        type: 'DRIVER_LICENSE',
        customLabel: 'Licencia Municipal de Conducir',
        number: '40125789',
        categories: ['B (Auto/Camioneta)', 'C (Camión sin acoplado)'],
        issueDate: '2024-11-15',
        expirationDate: '2026-11-17', // Vence en ~6 días: CRÍTICO ROJO
        notes: 'Debe gestionar turno de renovación inmediatamente',
        attachment: null
      }
    ]
  }
];

export const INITIAL_COURSES = [
  {
    id: 'course_bpm_2026',
    companyId: 'comp_alimentos',
    title: 'Capacitación Oficial BPM e Inocuidad Alimentaria',
    category: 'ALIMENTOS_BPM',
    description: 'Normas de higiene, prevención de contaminación cruzada, POES y control de puntos críticos en planta elaboradora.',
    date: '2026-11-20',
    durationHours: 4,
    instructorName: 'Lic. Romina Valenzuela (Bromatóloga)',
    instructorSignature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCAyNSBRIDQwIDUgNjAgMjAgVCAxMTAgMTUiIHN0cm9rZT0iYmxhY2siIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
    instructorSignatureHash: 'sig-hash-bpm-instructor-2026',
    status: 'SCHEDULED',
    participants: [
      {
        employeeId: 'emp_mariana_lopez',
        employeeName: 'Mariana Soledad López',
        attended: false,
        passed: false,
        score: null,
        signature: null,
        signatureHash: null,
        signedAt: null
      },
      {
        employeeId: 'emp_esteban_rojas',
        employeeName: 'Esteban Rojas',
        attended: false,
        passed: false,
        score: null,
        signature: null,
        signatureHash: null,
        signedAt: null
      }
    ]
  },
  {
    id: 'course_manejo_defensivo_2026',
    companyId: 'comp_alimentos',
    title: 'Manejo Defensivo y Prevención de Accidentes Viales',
    category: 'MANEJO_DEFENSIVO',
    description: 'Técnicas de conducción segura en ruta y zona urbana, distancia de frenado, condiciones climáticas y normativa de tránsito.',
    date: '2026-10-15',
    durationHours: 6,
    instructorName: 'Ing. Claudio Mendoza (Seguridad Vial)',
    instructorSignature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCAyMCBRIDMwIDEwIDUwIDI1IFQgMTAwIDE1IiBzdHJva2U9ImJsYWNrIiBmaWxsPSJ0cmFuc3BhcmVudCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
    instructorSignatureHash: 'sig-hash-vial-instructor-994',
    status: 'COMPLETED',
    participants: [
      {
        employeeId: 'emp_carlos_gomez',
        employeeName: 'Carlos Alberto Gómez',
        attended: true,
        passed: true,
        score: 9.5,
        signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xNSAyNSBRIDM1IDEwIDcwIDMwIFQgMTEwIDIwIiBzdHJva2U9ImJsdWUiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
        signatureHash: 'sig-hash-cg-vial-completed',
        signedAt: '2026-10-15T17:30:00.000Z'
      }
    ]
  }
];
