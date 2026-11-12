/**
 * cctCatalog.js - Catálogo Normativo de los 5 Convenios Colectivos Clave de Argentina
 * Basado en las escalas salariales y adicionales vigentes de la legislación laboral argentina:
 * 1. Comercio (FAECYS CCT 130/75)
 * 2. Camioneros (FEDACAM CCT 40/89)
 * 3. Industria de la Alimentación (STIA CCT 244/94)
 * 4. Construcción (UOCRA CCT 76/75 & Ley 22.250)
 * 5. Metalúrgicos (UOM CCT 260/75)
 */

export const LEGAL_DEDUCTIONS = {
  JUBILACION: { code: '110000', label: 'Jubilación (SIPA Ley 24.241)', rate: 0.11, afipCode: '110000' },
  INSSJYP: { code: '120000', label: 'Ley 19.032 (INSSJyP / PAMI)', rate: 0.03, afipCode: '120000' },
  OBRA_SOCIAL: { code: '130000', label: 'Obra Social (Ley 23.660)', rate: 0.03, afipCode: '130000' },
  CUOTA_SINDICAL_DEFAULT: { code: '210000', label: 'Aporte Sindical / Solidario', rate: 0.02, afipCode: '210000' }
};

export const EMPLOYER_CONTRIBUTIONS = {
  SIPAPATRONAL: { label: 'SIPA Patronal', rate: 0.1077 },
  INSSJYPPATRONAL: { label: 'PAMI Patronal', rate: 0.0159 },
  ASIGNACIONES: { label: 'Asignaciones Familiares', rate: 0.0470 },
  FONDO_EMPLEO: { label: 'Fondo Nacional de Empleo', rate: 0.0094 },
  OBRA_SOCIAL_PATRONAL: { label: 'Obra Social Patronal', rate: 0.0600 },
  ART_ESTIMADA: { label: 'ART Cuota Media', rate: 0.0350 },
  SEGURO_VIDA: { label: 'Seguro Colectivo Dto. 1567/74', fixedPerEmp: 1250 }
};

export const CCT_CATALOG = {
  CCT_130_75: {
    id: 'CCT_130_75',
    name: 'Comercio (FAECYS - CCT 130/75)',
    industry: 'Comercio & Servicios',
    periodType: 'MONTHLY',
    categories: [
      { id: 'MAE_A', label: 'Maestranza y Servicios A', basicSalary: 885000 },
      { id: 'MAE_B', label: 'Maestranza y Servicios B', basicSalary: 890000 },
      { id: 'ADM_A', label: 'Administrativo A', basicSalary: 915000 },
      { id: 'ADM_B', label: 'Administrativo B', basicSalary: 922000 },
      { id: 'VEN_A', label: 'Personal Auxiliar / Ventas A', basicSalary: 928000 },
      { id: 'VEN_B', label: 'Ventas Especializado B', basicSalary: 945000 }
    ],
    rules: {
      antiguedadPctPerYear: 0.01, // 1% por año cumplido
      presentismoPct: 0.0833, // 8.33% (doceava parte) Art. 40 CCT 130/75 sobre Básico + Antigüedad
      sindicatoPct: 0.02, // 2% SEC / FAECYS
      faecysOsecacFijo: 1000,
      allowsNonTaxableAllowance: true
    }
  },

  CCT_40_89: {
    id: 'CCT_40_89',
    name: 'Camioneros (FEDACAM - CCT 40/89)',
    industry: 'Transporte & Logística',
    periodType: 'MONTHLY',
    categories: [
      { id: 'CHOF_1', label: 'Chofer de Primera Carga General', basicSalary: 1120000 },
      { id: 'CHOF_SEMI', label: 'Chofer de Semirremolque y Articulados', basicSalary: 1260000 },
      { id: 'CHOF_2', label: 'Chofer de Segunda / Distribución', basicSalary: 1060000 },
      { id: 'PEON_LOG', label: 'Peón General de Carga y Descarga', basicSalary: 980000 }
    ],
    rules: {
      antiguedadPctPerYear: 0.01, // 1% anual
      viaticoComidaFijo: 165000, // Concepto No Remunerativo Art. 4.1.4 CCT 40/89
      plusDescargaPct: 0.10, // Plus de descarga 10% s/básico
      plusKmLargaDistancia: 120, // $120 por km recorrido Art. 4.2.3 CCT 40/89
      sindicatoPct: 0.03, // 3% Federación de Camioneros
      allowsNonTaxableAllowance: true
    }
  },

  CCT_244_94: {
    id: 'CCT_244_94',
    name: 'Alimentación (STIA - CCT 244/94)',
    industry: 'Industria de la Alimentación',
    periodType: 'MONTHLY',
    categories: [
      { id: 'OPER_CALIF', label: 'Operario Calificado Elaboración', basicSalary: 995000 },
      { id: 'ENVAS_A', label: 'Operario Envasado y Fraccionamiento', basicSalary: 940000 },
      { id: 'FRIGO_ESP', label: 'Operador de Cámaras y Congelados', basicSalary: 1080000 },
      { id: 'SUP_PLANTA', label: 'Supervisor de Turno / Calidad', basicSalary: 1350000 }
    ],
    rules: {
      antiguedadPctPerYear: 0.015, // 1.5% por año
      presentismoPerfectoPct: 0.09, // 9% por asistencia y puntualidad perfecta
      adicionalCamaraPct: 0.12, // 12% para cámaras de frío
      sindicatoPct: 0.025, // 2.5% STIA
      allowsNonTaxableAllowance: true
    }
  },

  CCT_76_75: {
    id: 'CCT_76_75',
    name: 'Construcción (UOCRA - CCT 76/75 & Ley 22.250)',
    industry: 'Construcción & Obras Civiles',
    periodType: 'BIWEEKLY', // Quincenal jornalizado
    categories: [
      { id: 'OF_ESP', label: 'Oficial Especializado', hourlyRate: 6400, basicSalary: 1126400 }, // 176 hs/mes base
      { id: 'OFIC', label: 'Oficial Albañil / Encofrador', hourlyRate: 5450, basicSalary: 959200 },
      { id: 'MEDIO_OF', label: 'Medio Oficial', hourlyRate: 5020, basicSalary: 883520 },
      { id: 'AYUDANTE', label: 'Ayudante General', hourlyRate: 4610, basicSalary: 811360 }
    ],
    rules: {
      isHourly: true,
      hoursPerQuincenaDefault: 88, // 88 hs quincena típica
      fondoCeseLaboralFirstYearPct: 0.12, // 12% aporte mensual/quincenal al fondo de desempleo IERIC
      fondoCeseLaboralNextYearsPct: 0.08, // 8% en años posteriores
      asistenciaQuincenalPct: 0.08, // 8% presentismo quincenal UOCRA
      sindicatoPct: 0.025, // 2.5% UOCRA
      allowsNonTaxableAllowance: true
    }
  },

  CCT_260_75: {
    id: 'CCT_260_75',
    name: 'Metalúrgicos (UOM - CCT 260/75)',
    industry: 'Industria Metalmecánica',
    periodType: 'MONTHLY',
    categories: [
      { id: 'OF_MULT', label: 'Oficial Múltiple / Tornero / Soldador TIG', basicSalary: 1090000 },
      { id: 'OFIC_UOM', label: 'Oficial Metalúrgico', basicSalary: 1010000 },
      { id: 'MEDIO_OF_UOM', label: 'Medio Oficial de Mantenimiento', basicSalary: 935000 },
      { id: 'OPER_CALIF_UOM', label: 'Operario Especializado Metalúrgico', basicSalary: 890000 }
    ],
    rules: {
      antiguedadPctPerYear: 0.01, // 1% anual
      adicionalTituloTecnicoPct: 0.08, // 8% por título secundario técnico
      asistenciaMensualPct: 0.07, // 7% asistencia
      sindicatoPct: 0.025, // 2.5% UOM
      allowsNonTaxableAllowance: true
    }
  }
};
