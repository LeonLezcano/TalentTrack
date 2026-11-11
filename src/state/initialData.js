/**
 * TalentTrack Realistic Demo Seed Data
 * Designed for immediate evaluation of Multi-Empresa, Skills Matrix, Training LMS and Expiration Traffic Lights.
 */

export const INITIAL_COMPANIES = [
  {
    id: 'comp_alimentos',
    name: 'Frigorífico & Lácteos La Huella S.A.',
    cuit: '30-71458923-4',
    industry: 'Alimentos & Bebidas',
    location: 'Parque Industrial Pilar, Buenos Aires',
    employeesCount: 3
  },
  {
    id: 'comp_logistica',
    name: 'TransAndina Logística & Cargas S.R.L.',
    cuit: '30-68954120-7',
    industry: 'Transporte & Distribución',
    location: 'Rosario, Santa Fe',
    employeesCount: 2
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
    phone: '+54 11 4455-8899',
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
        notes: 'Examen psicofísico aprobado'
      },
      {
        id: 'cred_cg_bpm',
        type: 'FOOD_HANDLER_BPM',
        customLabel: 'Libreta Sanitaria Alimentos',
        number: 'LS-99823',
        issueDate: '2025-01-10',
        expirationDate: '2027-01-10', // Vigente
        notes: 'Renovación bianual'
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
    phone: '+54 11 6589-3214',
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
        notes: 'Requiere curso de actualización urgente'
      },
      {
        id: 'cred_ml_art',
        type: 'MEDICAL_ART',
        customLabel: 'Apto Médico Periódico ART',
        number: 'ART-2026-88',
        issueDate: '2026-02-15',
        expirationDate: '2027-02-15', // Vigente
        notes: 'Sin observaciones'
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
    phone: '+54 11 5566-7788',
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
        expirationDate: '2028-06-01', // Vigente
        notes: 'Habilitación provincial y nacional'
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
    phone: '+54 341 487-9900',
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
        expirationDate: '2027-08-20', // Vigente
        notes: 'Cargas generales y peligrosas al día'
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
    phone: '+54 341 555-1234',
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
        notes: 'Debe gestionar turno de renovación inmediatamente'
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
    instructorSignature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M10 25 Q 40 5 60 20 T 110 15" stroke="black" fill="transparent" stroke-width="2"/></svg>',
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
    instructorSignature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M10 20 Q 30 10 50 25 T 100 15" stroke="black" fill="transparent" stroke-width="2"/></svg>',
    instructorSignatureHash: 'sig-hash-vial-instructor-994',
    status: 'COMPLETED',
    participants: [
      {
        employeeId: 'emp_carlos_gomez',
        employeeName: 'Carlos Alberto Gómez',
        attended: true,
        passed: true,
        score: 9.5,
        signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M15 25 Q 35 10 70 30 T 110 20" stroke="blue" fill="transparent" stroke-width="2"/></svg>',
        signatureHash: 'sig-hash-cg-vial-completed',
        signedAt: '2026-10-15T17:30:00.000Z'
      }
    ]
  }
];
