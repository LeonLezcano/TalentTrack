# 👥 TalentTrack — SaaS de Recursos Humanos, Skills & Capacitaciones

> **Versión:** `v1.0.00` • **Estándar:** `AiAppFactory Standard` • **Arquitectura:** PWA Offline-First Multi-Empresa

**TalentTrack** es una plataforma SaaS de Recursos Humanos diseñada para empresas operativas (logística, alimentos, industria, distribución y servicios) que necesitan gestionar de manera integral sus legajos laborales, explotar habilidades previas ocultas para búsquedas internas, planificar capacitaciones normativas con firma digital táctil, y monitorear habilitaciones vehiculares o sanitarias bajo un estricto semáforo preventivo.

---

## 🌟 Capacidades Clave del Sistema

### 1. 🗂️ Legajos 360° y Gestión Multi-Empresa
- **Estructura Multi-Tenant:** Aislamiento total de datos por empresa cliente o sede operativa.
- **Ficha Integral de Empleado:** Datos personales, contacto (teléfono con formateo, email), puesto, área/departamento, fecha de ingreso y estado activo.
- **Tombstones & Persistencia:** Borrado lógico protegido y sincronización local inmediata (Offline-First).

### 2. 🎯 Buscador de Talento Interno (Skills & Competencias Previas)
- **Detección de Habilidades Ocultas:** Registro de habilidades que el colaborador posee por trabajos anteriores u oficios pero que no ejerce en su puesto actual (ej. un operario que sabe soldar TIG o un chofer que domina facturación/ERP).
- **Matriz de Niveles 1 a 4:** Clasificación estandarizada (Básico, Intermedio, Avanzado, Experto/Capacitador).
- **Filtros Avanzados:** Búsqueda en tiempo real por palabra clave, nivel mínimo y origen de la experiencia (solo previas, solo puesto actual o todas).

### 3. 🎓 Agenda de Capacitaciones & Actas con Firma Digital Táctil
- **Ciclo Completo de Capacitación:** Convocatoria masiva de empleados por puesto o sede, temario, duración y docente asignado.
- **Doble Firma Táctil en Pantalla (HTML5 Canvas):** Captura de trazo digital del instructor y de los participantes en smartphone, tablet o desktop.
- **Sellado Criptográfico Forense:** Generación de hash SHA-256 con timestamp y datos del firmante para validez en auditorías (SENASA, SRT, ART, ISO 9001).
- **Acreditación Automática:** Al cerrar un curso, las habilidades y constancias se sincronizan automáticamente en el legajo de los aprobados.

### 4. 🚦 Semáforo Preventivo de Vencimientos & Habilitaciones Legales
- **Tipos de Habilitaciones Soportadas:**
  - Carnets de conducir profesionales (Categorías A, B, C, D, E, LNH CNRT Cargas Generales y Peligrosas).
  - Libreta sanitaria y carnet de manipulación de alimentos (BPM / POES).
  - Exámenes médicos ocupacionales periódicos (ART).
  - Habilitación de autoelevadores (Res. SRT 960/15) y trabajo en altura.
- **Rangos de Alerta:**
  - 🔴 **Vencido / Crítico:** < 0 días o < 7 días (Alerta inmediata).
  - 🟠 **Alerta Alta:** 8 a 15 días previos al vencimiento.
  - 🟡 **Atención Preventiva:** 16 a 30 días previos al vencimiento.
  - 🟢 **Vigente:** > 30 días.
- **Notificaciones Internas:** Sistema visual reactivo en dashboard y campana de estado.

### 5. 📱 Portal Móvil del Colaborador (Autoservicio)
- Interfaz 100% optimizada para smartphones (probada en viewport `393x852`).
- Consulta de cronograma de cursos convocados.
- Firma directa de asistencia en el móvil.
- Consulta de carnets personales y carga de renovaciones.
- Integración con **Screen Wake Lock API** para roles operativos en calle y vehículos.

### 6. 📊 Informes & Exportación Universal CSV (Excel Ready)
- **Universal CSV Exporter:** Exportación nativa con BOM UTF-8 (`\uFEFF`) sin librerías externas, garantizando compatibilidad directa con Microsoft Excel en Windows.
- **Informes Disponibles:**
  - Nómina completa de personal con habilidades previas.
  - Auditoría de vencimientos clasificada por semáforo para ART o SENASA.
  - Acta oficial de asistencia a cursos con hashes de firma.
- **Blindaje de Impresión Limpia (`@media print`):** Ocultamiento estricto de barras de navegación y botones al imprimir o guardar en PDF.

---

## 🏗️ Arquitectura Técnica

```
TalentTrack/
├── index.html                  # Shell SPA y vistas principales
├── package.json                # Configuración y scripts pnpm
├── firebase.json               # Hosting y cabeceras estrictas CSP
├── firestore.rules             # Reglas de seguridad RBAC y multi-tenant
├── service-worker.js           # PWA offline-first caching
├── manifest.json               # Manifiesto PWA para instalación móvil
├── src/
│   ├── main.js                 # Controlador principal y enrutador SPA
│   ├── state/
│   │   ├── store.js            # Tienda reactiva central y persistencia
│   │   └── initialData.js      # Seed realista con empresas de logística y alimentos
│   ├── modules/
│   │   ├── compliance/         # Motor de semáforo de vencimientos
│   │   ├── skills/             # Motor de competencias y Talent Hunter
│   │   ├── training/           # Motor LMS y cursos obligatorios
│   │   └── reports/            # Exportador universal CSV con UTF-8 BOM
│   ├── utils/
│   │   ├── sanitizer.js        # Blindaje XSS con renderTemplate (0 innerHTML)
│   │   ├── signature.js        # Canvas táctil y hash forense SHA-256
│   │   └── notifier.js         # Toasts reactivos y Screen Wake Lock
│   └── styles/
│       └── app.css             # Estilos utilitarios y @media print
├── tests/
│   ├── run_tests.js            # Ejecutor central multi-capa
│   ├── unit.test.js            # Capa 1: Algoritmos y fuzzing
│   ├── integration.test.js     # Capa 2: Estado y anti-siembras
│   ├── components.test.js      # Capa 3: Talent Hunter y LMS
│   ├── security.test.js        # Capa 4: Neutralización XSS y CSP
│   └── e2e.test.js             # Capa 5: Flujo de vida completo
└── scripts/
    ├── build.mjs               # Build y verificación
    ├── serve.mjs               # Servidor de preview local
    └── version-bump.mjs        # Versionado semántico vX.Y.ZZ
```

---

## 🧪 Batería de Pruebas Multi-Capa (Test Guardian)

TalentTrack cuenta con una suite completa de **78 pruebas automatizadas** que cubren las 5 capas obligatorias con 100% de aprobación:

```bash
pnpm test
```

| Capa | Descripción | Tests | Estado |
|---|---|:---:|:---:|
| **Capa 1** | Unitarias, Fuzzing caótico, algoritmos de semáforo y hashing | 20 | PASS |
| **Capa 2** | Integración, aislamiento multi-empresa y purga anti-fantasmas | 12 | PASS |
| **Capa 3** | Componentes, Talent Hunter y matriz de puestos por rol | 10 | PASS |
| **Capa 4** | Seguridad XSS en DOM sinks, cabeceras en `firebase.json` y escaneo de secretos | 9 | PASS |
| **Capa 5** | End-to-End: Alta -> Carnet -> Alerta -> Curso -> Firma -> CSV | 27 | PASS |
| **Total** | **Suite Completa Automatizada** | **78** | **100% PASS** |

---

## 🛡️ Auditoría de Seguridad (AppSec Guardian)

```bash
pnpm run security:full
# o
node ../AiAppFactory/tools/security-guardian/index.mjs .
```
- **Puntaje:** 100/100
- **Vulnerabilidades:** 0 Críticas, 0 Altas, 0 Medias, 0 Bajas.
- **CSP Cualitativa:** Sin `'unsafe-eval'`, sin comodines `*`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `HSTS` estricto.

---

## 🚀 Guía de Uso Rápido

1. **Instalación y Dependencias:**
   ```bash
   pnpm install
   ```
2. **Ejecutar Pruebas:**
   ```bash
   pnpm test
   ```
3. **Auditar Seguridad:**
   ```bash
   pnpm run test:security
   ```
4. **Iniciar Servidor Local:**
   ```bash
   node scripts/serve.mjs
   ```
   Abrir en el navegador en `http://127.0.0.1:8095`.

---

© 2026 TalentTrack • Desarrollado bajo los estándares de ingeniería de **AiAppFactory**.
