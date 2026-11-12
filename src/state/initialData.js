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
    // Matriz de Requisitos Obligatorios por Puesto 100% Configurable (Capacitaciones + EPP SRT 299/11)
    positionRequirements: [
      {
        role: 'Chofer de Reparto Pesado',
        mandatoryCredentials: ['DRIVER_LICENSE'],
        mandatoryTrainings: ['MANEJO_DEFENSIVO'],
        mandatoryEpp: ['CALZADO_SEGURIDAD', 'CHALECO_REFLECTIVO']
      },
      {
        role: 'Operaria de Elaboración & Envasado',
        mandatoryCredentials: ['FOOD_HANDLER_BPM'],
        mandatoryTrainings: ['ALIMENTOS_BPM'],
        mandatoryEpp: ['CALZADO_SEGURIDAD', 'PROTECTOR_AUDITIVO', 'GUANTES_NITRILO']
      },
      {
        role: 'Supervisor de Planta & Calidad',
        mandatoryCredentials: ['FOOD_HANDLER_BPM'],
        mandatoryTrainings: ['ALIMENTOS_BPM', 'SEGURIDAD_HIGIENE'],
        mandatoryEpp: ['CALZADO_SEGURIDAD', 'CASCO_SEGURIDAD', 'PROTECTOR_AUDITIVO']
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
        mandatoryTrainings: ['MANEJO_DEFENSIVO'],
        mandatoryEpp: ['CALZADO_SEGURIDAD', 'CHALECO_REFLECTIVO']
      },
      {
        role: 'Chofer de Reparto Urbano',
        mandatoryCredentials: ['DRIVER_LICENSE'],
        mandatoryTrainings: ['MANEJO_DEFENSIVO'],
        mandatoryEpp: ['CALZADO_SEGURIDAD', 'CHALECO_REFLECTIVO']
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
    cuil: '20-32458912-4',
    cctId: 'CCT_40_89',
    cctCategoryId: 'CHOF_SEMI',
    bank: 'Banco Santander Argentina',
    cbu: '0720123488000032458912',
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
    cuil: '27-36874521-3',
    cctId: 'CCT_244_94',
    cctCategoryId: 'OPER_CALIF',
    bank: 'Banco Provincia de Buenos Aires',
    cbu: '0140999803000036874521',
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
    cuil: '20-29334120-6',
    cctId: 'CCT_244_94',
    cctCategoryId: 'SUP_PLANTA',
    bank: 'Banco Galicia',
    cbu: '0070111244000029334120',
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
    cuil: '20-34901654-2',
    cctId: 'CCT_40_89',
    cctCategoryId: 'CHOF_1',
    bank: 'Banco Macro',
    cbu: '2850100430000034901654',
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
    cuil: '20-40125789-7',
    cctId: 'CCT_130_75',
    cctCategoryId: 'ADM_A',
    bank: 'Banco BBVA Argentina',
    cbu: '0170001220000040125789',
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

// Catálogo Oficial de EPP con Certificaciones Técnicas (Res. SRT 299/11)
export const EPP_CATALOG = {
  CALZADO_SEGURIDAD: {
    id: 'CALZADO_SEGURIDAD',
    name: 'Calzado de Seguridad con Puntera de Acero',
    category: 'Protección de Pies',
    standard: 'Sello S (Res. SICyM 896/99) / IRAM 3610',
    renewalDays: 180, // Recambio semestral obligatorio
    icon: '👢'
  },
  CHALECO_REFLECTIVO: {
    id: 'CHALECO_REFLECTIVO',
    name: 'Chaleco de Alta Visibilidad Retrorreflectivo',
    category: 'Visibilidad / Seguridad Vial',
    standard: 'IRAM 3859 / Clase 2',
    renewalDays: 365,
    icon: '🦺'
  },
  PROTECTOR_AUDITIVO: {
    id: 'PROTECTOR_AUDITIVO',
    name: 'Protector Auditivo de Copa / Endoaural',
    category: 'Protección Auditiva',
    standard: 'IRAM 4060 / ANSI S3.19',
    renewalDays: 180,
    icon: '🎧'
  },
  CASCO_SEGURIDAD: {
    id: 'CASCO_SEGURIDAD',
    name: 'Casco de Seguridad Industrial Clase B con Barbijo',
    category: 'Protección Craneana',
    standard: 'IRAM 3620 / Tipo 1',
    renewalDays: 730,
    icon: '⛑️'
  },
  GUANTES_NITRILO: {
    id: 'GUANTES_NITRILO',
    name: 'Guantes de Nitrilo para Manipulación de Alimentos',
    category: 'Protección de Manos',
    standard: 'IRAM 3607 / EN 388',
    renewalDays: 60,
    icon: '🧤'
  },
  ANTIPARRAS_SEGURIDAD: {
    id: 'ANTIPARRAS_SEGURIDAD',
    name: 'Antiparras de Seguridad Antimpacto y Salpicaduras',
    category: 'Protección Ocular',
    standard: 'IRAM 3630 / ANSI Z87.1',
    renewalDays: 365,
    icon: '🥽'
  },
  FAJA_LUMBAR: {
    id: 'FAJA_LUMBAR',
    name: 'Faja Lumbar Ergonómica con Tensores',
    category: 'Ergonomía / Levantamiento de Cargas',
    standard: 'Res. SRT 886/15',
    renewalDays: 365,
    icon: '🥋'
  }
};

// Entregas Iniciales de EPP con Firmas Táctiles Reales (Res. SRT 299/11)
export const INITIAL_EPP_DELIVERIES = [
  {
    id: 'epp_del_cg_01',
    companyId: 'comp_alimentos',
    employeeId: 'emp_carlos_gomez',
    employeeName: 'Carlos Alberto Gómez',
    dni: '32.458.912',
    eppId: 'CALZADO_SEGURIDAD',
    eppName: 'Calzado de Seguridad con Puntera de Acero',
    brandModel: 'Voran Energy Sport T42',
    standard: 'Sello S / IRAM 3610',
    quantity: 1,
    deliveryDate: '2026-06-01',
    expirationDate: '2026-11-28', // En ~17 días -> WARNING_MEDIUM
    trainedInUse: true,
    signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xNSAyNSBRIDM1IDEwIDcwIDMwIFQgMTEwIDIwIiBzdHJva2U9ImJsdWUiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
    signatureHash: 'sig-hash-epp-cg-calzado',
    signedAt: '2026-06-01T10:00:00.000Z',
    deliveredBy: 'Ing. Claudio Mendoza (Seguridad e Higiene)'
  },
  {
    id: 'epp_del_cg_02',
    companyId: 'comp_alimentos',
    employeeId: 'emp_carlos_gomez',
    employeeName: 'Carlos Alberto Gómez',
    dni: '32.458.912',
    eppId: 'CHALECO_REFLECTIVO',
    eppName: 'Chaleco de Alta Visibilidad Retrorreflectivo',
    brandModel: '3M Scotchlite Clase 2',
    standard: 'IRAM 3859',
    quantity: 1,
    deliveryDate: '2026-01-15',
    expirationDate: '2027-01-15', // Vigente
    trainedInUse: true,
    signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xNSAyNSBRIDM1IDEwIDcwIDMwIFQgMTEwIDIwIiBzdHJva2U9ImJsdWUiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
    signatureHash: 'sig-hash-epp-cg-chaleco',
    signedAt: '2026-01-15T09:30:00.000Z',
    deliveredBy: 'Ing. Claudio Mendoza (Seguridad e Higiene)'
  },
  {
    id: 'epp_del_ml_01',
    companyId: 'comp_alimentos',
    employeeId: 'emp_mariana_lopez',
    employeeName: 'Mariana Soledad López',
    dni: '36.874.521',
    eppId: 'CALZADO_SEGURIDAD',
    eppName: 'Calzado de Seguridad con Puntera de Acero',
    brandModel: 'Ombú Krypton Dama T37',
    standard: 'Sello S / IRAM 3610',
    quantity: 1,
    deliveryDate: '2026-04-10',
    expirationDate: '2026-10-10', // VENCIDO (-31 días -> EXPIRED)
    trainedInUse: true,
    signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCAyNSBRIDQwIDUgNjAgMjAgVCAxMTAgMTUiIHN0cm9rZT0iYmxhY2siIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
    signatureHash: 'sig-hash-epp-ml-calzado',
    signedAt: '2026-04-10T11:15:00.000Z',
    deliveredBy: 'Ing. Claudio Mendoza (Seguridad e Higiene)'
  }
];

export const INITIAL_LEAVES = [
  {
    id: 'leave_cg_vacation_01',
    companyId: 'comp_alimentos',
    employeeId: 'emp_carlos_gomez',
    employeeName: 'Carlos Alberto Gómez',
    type: 'VACATION',
    startDate: '2026-01-12',
    endDate: '2026-01-25',
    days: 14,
    reason: 'Vacaciones de verano período ordinario',
    status: 'APPROVED',
    requestedAt: '2025-12-01T10:00:00.000Z',
    reviewedBy: 'Lic. Paula Santillán',
    reviewedAt: '2025-12-03T11:30:00.000Z',
    certificateUrl: null
  },
  {
    id: 'leave_ml_medical_01',
    companyId: 'comp_alimentos',
    employeeId: 'emp_mariana_lopez',
    employeeName: 'Mariana Soledad López',
    type: 'MEDICAL',
    startDate: '2026-11-10',
    endDate: '2026-11-13',
    days: 4,
    reason: 'Cuadro de gastroenteritis aguda con reposo prescripto',
    status: 'PENDING',
    requestedAt: '2026-11-10T08:30:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    certificateUrl: 'https://res.cloudinary.com/ebfnvo2l/image/upload/v1794492372/dmhka62zkbs34isprluv.png'
  }
];

export const INITIAL_PAYROLLS = [
  {
    id: 'pay_alimentos_202610',
    companyId: 'comp_alimentos',
    period: '2026-10',
    periodStr: 'Octubre 2026',
    periodType: 'MONTHLY',
    runNumber: 1,
    status: 'EMITTED', // EMITTED = sellado por la empresa, listo para firma del colaborador
    createdAt: '2026-10-31T18:00:00.000Z',
    sealedAt: '2026-10-31T18:30:00.000Z',
    sealedBy: 'Lic. Paula Santillán',
    bankPaymentDate: '2026-11-04',
    totalBruto: 4185000,
    totalRemunerativo: 4020000,
    totalNoRemunerativo: 165000,
    totalDescuentos: 763800,
    totalNeto: 3421200,
    totalContribucionesPatronales: 1145700,
    payslips: [
      {
        id: 'ps_cg_202610',
        companyId: 'comp_alimentos',
        payrollId: 'pay_alimentos_202610',
        employeeId: 'emp_carlos_gomez',
        employeeName: 'Carlos Alberto Gómez',
        cuil: '20-32458912-4',
        cctId: 'CCT_40_89',
        cctName: 'Camioneros (FEDACAM - CCT 40/89)',
        cctCategory: 'Chofer de Semirremolque y Articulados',
        periodStr: 'Octubre 2026',
        periodType: 'MONTHLY',
        bank: 'Banco Santander Argentina',
        cbu: '0720123488000032458912',
        depositDate: '2026-11-04',
        status: 'SIGNED', // Ya firmado por Carlos
        signedAt: '2026-11-05T09:15:00.000Z',
        signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCAzMCBRIDMwIDUgNTAgMjAgVCA5MCAxMCIgc3Ryb2tlPSIjMWUzYThhIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
        signatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ipAddress: '190.183.45.12',
        totalRemunerativo: 1323000,
        totalNoRemunerativo: 165000,
        totalBruto: 1488000,
        totalDescuentos: 251370,
        totalNeto: 1236630,
        netoInWords: 'Un millón doscientos treinta y seis mil seiscientos treinta pesos con 00/100',
        items: [
          { code: '1000', description: 'Sueldo Básico (Chofer de Semirremolque y Articulados)', type: 'REMUNERATIVO', quantity: 30, amount: 1260000 },
          { code: '1010', description: 'Antigüedad (5 años - 5.0%)', type: 'REMUNERATIVO', quantity: 5, amount: 63000 },
          { code: '2010', description: 'Viático Especial Comida (Art. 4.1.4 CCT 40/89)', type: 'NO_REMUNERATIVO', quantity: 1, amount: 165000 },
          { code: '5000', description: 'Jubilación (SIPA Ley 24.241)', type: 'RETENCION', quantity: 11, amount: 145530 },
          { code: '5010', description: 'Ley 19.032 (INSSJyP / PAMI)', type: 'RETENCION', quantity: 3, amount: 39690 },
          { code: '5020', description: 'Obra Social (Ley 23.660)', type: 'RETENCION', quantity: 3, amount: 39690 },
          { code: '5030', description: 'Aporte Sindical (2.0%)', type: 'RETENCION', quantity: 2, amount: 26460 }
        ]
      },
      {
        id: 'ps_ml_202610',
        companyId: 'comp_alimentos',
        payrollId: 'pay_alimentos_202610',
        employeeId: 'emp_mariana_lopez',
        employeeName: 'Mariana Soledad López',
        cuil: '27-36874521-3',
        cctId: 'CCT_244_94',
        cctName: 'Alimentación (STIA - CCT 244/94)',
        cctCategory: 'Operario Calificado Elaboración',
        periodStr: 'Octubre 2026',
        periodType: 'MONTHLY',
        bank: 'Banco Provincia de Buenos Aires',
        cbu: '0140999803000036874521',
        depositDate: '2026-11-04',
        status: 'PENDING_SIGNATURE', // Pendiente de firma
        signedAt: null,
        signature: null,
        signatureHash: null,
        ipAddress: null,
        totalRemunerativo: 1144250,
        totalNoRemunerativo: 0,
        totalBruto: 1144250,
        totalDescuentos: 223129,
        totalNeto: 921121,
        netoInWords: 'Novecientos veintiún mil ciento veintiún pesos con 00/100',
        items: [
          { code: '1000', description: 'Sueldo Básico (Operario Calificado Elaboración)', type: 'REMUNERATIVO', quantity: 30, amount: 995000 },
          { code: '1010', description: 'Antigüedad (4 años - 6.0%)', type: 'REMUNERATIVO', quantity: 4, amount: 59700 },
          { code: '1020', description: 'Presentismo / Asistencia (9.00%)', type: 'REMUNERATIVO', quantity: 1, amount: 89550 },
          { code: '5000', description: 'Jubilación (SIPA Ley 24.241)', type: 'RETENCION', quantity: 11, amount: 125868 },
          { code: '5010', description: 'Ley 19.032 (INSSJyP / PAMI)', type: 'RETENCION', quantity: 3, amount: 34328 },
          { code: '5020', description: 'Obra Social (Ley 23.660)', type: 'RETENCION', quantity: 3, amount: 34328 },
          { code: '5030', description: 'Aporte Sindical (2.5%)', type: 'RETENCION', quantity: 3, amount: 28606 }
        ]
      },
      {
        id: 'ps_er_202610',
        companyId: 'comp_alimentos',
        payrollId: 'pay_alimentos_202610',
        employeeId: 'emp_esteban_rojas',
        employeeName: 'Esteban Rojas',
        cuil: '20-29334120-6',
        cctId: 'CCT_244_94',
        cctName: 'Alimentación (STIA - CCT 244/94)',
        cctCategory: 'Supervisor de Turno / Calidad',
        periodStr: 'Octubre 2026',
        periodType: 'MONTHLY',
        bank: 'Banco Galicia',
        cbu: '0070111244000029334120',
        depositDate: '2026-11-04',
        status: 'SIGNED',
        signedAt: '2026-11-04T19:00:00.000Z',
        signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCAyMCBMIDMwIDEwIEwgNTAgMzAgTCA5MCAxNSIgc3Ryb2tlPSIjMTU4MDNkIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
        signatureHash: '4a44dc81014a938c525f23bc117183eef53e2069cb6e1b6f00e9323c9ff4c295',
        ipAddress: '181.44.120.9',
        totalRemunerativo: 1552500,
        totalNoRemunerativo: 0,
        totalBruto: 1552500,
        totalDescuentos: 302738,
        totalNeto: 1249762,
        netoInWords: 'Un millón doscientos cuarenta y nueve mil setecientos sesenta y dos pesos con 00/100',
        items: [
          { code: '1000', description: 'Sueldo Básico (Supervisor de Turno / Calidad)', type: 'REMUNERATIVO', quantity: 30, amount: 1350000 },
          { code: '1010', description: 'Antigüedad (7 años - 10.5%)', type: 'REMUNERATIVO', quantity: 7, amount: 141750 },
          { code: '1020', description: 'Presentismo / Asistencia (9.00%)', type: 'REMUNERATIVO', quantity: 1, amount: 60750 },
          { code: '5000', description: 'Jubilación (SIPA Ley 24.241)', type: 'RETENCION', quantity: 11, amount: 170775 },
          { code: '5010', description: 'Ley 19.032 (INSSJyP / PAMI)', type: 'RETENCION', quantity: 3, amount: 46575 },
          { code: '5020', description: 'Obra Social (Ley 23.660)', type: 'RETENCION', quantity: 3, amount: 46575 },
          { code: '5030', description: 'Aporte Sindical (2.5%)', type: 'RETENCION', quantity: 3, amount: 38813 }
        ]
      }
    ]
  }
];

