# 👥 TalentTrack — SaaS de Recursos Humanos, Skills, EPP & Capacitaciones

> **Versión:** `v1.0.03` • **Estándar:** `AiAppFactory Standard` • **Arquitectura:** PWA Offline-First Multi-Empresa • **Tests:** 101/101 (100% PASS) • **AppSec:** 100/100 (0 vulnerabilidades)

**TalentTrack** es una plataforma SaaS de Recursos Humanos diseñada para empresas operativas (logística, alimentos, industria, distribución y servicios) que necesitan gestionar de manera integral sus legajos laborales, explotar habilidades previas ocultas para búsquedas internas, planificar capacitaciones normativas con firma digital táctil, controlar entregas de EPP bajo Resolución SRT 299/11 con constancias selladas criptográficamente, despachar alertas preventivas por WhatsApp, y monitorear habilitaciones vehiculares o sanitarias bajo un estricto semáforo preventivo con fotos respaldatorias adjuntas.

---

## 🌟 Capacidades Clave del Sistema

### 1. 🧭 Interfaz de Usuario Moderna, Responsive & Barra Lateral Colapsable
- **Menú Lateral Minimalista (White / Light-Gray Theme):** Navegación lateral limpia con bordes sutiles, agrupando módulos en *Operaciones Diarias* y *Desarrollo & Normativa*.
- **Colapso a Modo Iconos en Desktop:** En pantallas de escritorio, la barra lateral puede colapsarse de `w-64` a `w-20` con un clic, optimizando el área visual de trabajo mientras preserva tooltips informativos.
- **Drawer Deslizante en Smartphones:** En pantallas móviles, cuenta con cabecera compacta, botón hamburguesa (`☰`) y panel deslizante con fondo translúcido (*backdrop blur*).
- **Insignias de Estado Blindadas:** Eliminación de roturas de etiquetas (`whitespace-nowrap` + `inline-flex`), garantizando que los estados de semáforo jamás se deformen o dividan a la mitad.
- **WakeLock Limpio sin Ruido:** Optimización del ciclo de vida de pantalla activa para roles de campo/conducción con cero spam en la consola del navegador.

### 1. 🔐 Autenticación Robusta & Cero Fachadas (Reglas 1, 23 & 24)
- **Cero Selectores Simulados:** Eliminación total de dropdowns simulados. Todo ingreso al sistema exige autenticación formal con contraseña o PIN.
- **Roles y Permisos (RBAC):**
  - **Administrador de RRHH (`HR_ADMIN`):** Acceso integral a dashboard, nómina de empleados, asignación de cursos, gestión de carnets, entregas de EPP y reportes de auditoría.
  - **Colaborador / Operario (`EMPLOYEE`):** Confinamiento estricto a su propio portal móvil (zero cross-tenant leak), donde consulta sus cursos, su nivel de cumplimiento normativo, su dotación de EPP y sus habilitaciones.
- **Protección contra Fuerza Bruta:** Implementación de `RateLimiter` con bloqueo temporal exponencial ante reintentos fallidos de login.
- **Salado Criptográfico:** Contraseñas hasheadas con SHA-256 + salt único por usuario.

### 2. 🦺 Módulo de Entrega y Control de EPP (Resolución SRT 299/11)
- **Marco Normativo Argentino:** Implementación fidedigna de la planilla oficial de entrega de Elementos de Protección Personal (Res. SRT 299/11).
- **Catálogo EPP Normado:** Calzado con Sello S (Res. SICyM 896/99 / IRAM 3610), Chalecos retrorreflectivos (IRAM 3859), Protección auditiva (IRAM 4060 / ANSI S3.19), Cascos Tipo 1 (IRAM 3620), Guantes de manipulación (IRAM 3607), Antiparras (IRAM 3630), Fajas lumbares ergonómicas (Res. SRT 886/15).
- **Dotación Obligatoria según Puesto:** Auditoría de kit mandatorio por puesto operativo (ej. Chofer exige Calzado y Chaleco; Operario exige Calzado y Guantes) con cálculo dinámico del porcentaje de cobertura.
- **Doble Declaración y Firma Táctil:** Captura de firma digital en pantalla táctil del trabajador acreditando la instrucción de uso (Art. 3 Res. SRT 299/11) con sellado forense SHA-256.
- **Semáforo de Recambio Periódico:** Control de vida útil y fechas de recambio con alertas integradas al semáforo general y botón directo de notificación por WhatsApp.
- **Exportación Oficial Planilla SRT 299/11:** Descarga instantánea en formato CSV con BOM UTF-8 y hash forense de recepción, lista para auditorías de ART, Ministerio de Trabajo o inspectores de la SRT.

### 3. 🗂️ Legajos 360°, Requisitos de Puesto & Adjuntos Reales
- **Estructura Multi-Tenant:** Aislamiento total de datos por empresa cliente o sede operativa.
- **Ficha Integral de Empleado:** Datos personales, contacto (teléfono con formateo para WhatsApp, email), puesto, área/departamento, fecha de ingreso y estado activo.
- **Requisitos de Puesto Configurables:** Cada empresa define qué capacitaciones son obligatorias según el puesto (ej. Chofer exige Manejo Defensivo; Operaria de Alimentos exige BPM) y el sistema calcula en tiempo real la tasa de cumplimiento del legajo.
- **Adjuntos de Carnet Reales:** Carga y visualización de fotos (PNG/JPG) o comprobantes PDF de licencias y libretas con visor modal y límite de seguridad de 5 MB.
- **Tombstones & Persistencia:** Borrado lógico protegido y sincronización local inmediata (Offline-First).

### 3. 🎯 Buscador de Talento Interno (Skills & Competencias Previas)
- **Detección de Habilidades Ocultas:** Registro de habilidades que el colaborador posee por trabajos anteriores u oficios pero que no ejerce en su puesto actual (ej. un chofer con experiencia previa en soldadura TIG/MIG o una operaria bilingüe con Excel avanzado).
- **Matriz de Niveles 1 a 4:** Clasificación estandarizada (1-Básico, 2-Intermedio, 3-Avanzado, 4-Experto/Capacitador).
- **Filtros Avanzados:** Búsqueda en tiempo real por palabra clave, nivel mínimo y origen de la experiencia (solo previas, solo puesto actual o todas).

### 4. 🎓 Agenda de Capacitaciones & Actas con Firma Digital Táctil
- **Ciclo Completo de Capacitación:** Convocatoria masiva de empleados por puesto o sede, temario, duración y docente asignado.
- **Doble Firma Táctil en Pantalla (HTML5 Canvas):** Captura de trazo digital del instructor y de los participantes en smartphone, tablet o desktop.
- **Sellado Criptográfico Forense:** Generación de hash SHA-256 con timestamp UTC y datos del firmante para validez en auditorías (SENASA, SRT, ART, ISO 9001).
- **Acreditación Automática:** Al completar un curso, las habilidades y constancias se sincronizan automáticamente en el legajo de los aprobados.

### 5. 🚦 Semáforo Preventivo & Despacho Directo por WhatsApp
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
- **Despacho Directo por WhatsApp:** Generación de enlaces universales `https://wa.me/549...?text=...` con mensajes pre-armados personalizados informando los días restantes y solicitando la renovación.

### 6. 📱 Portal Móvil del Colaborador (Autoservicio)
- Interfaz 100% optimizada para smartphones (probada en viewport `393x852`).
- Consulta de cronograma de cursos convocados y firma de actas en pantalla.
- Consulta de carnets personales, visualización de fotos adjuntas y carga de renovaciones.
- Integración con **Screen Wake Lock API** para roles operativos en calle y vehículos.

### 7. 📊 Informes & Exportación Universal CSV (Excel Ready)
- **Universal CSV Exporter:** Exportación nativa con BOM UTF-8 (`\uFEFF`) sin librerías externas, garantizando compatibilidad directa con Microsoft Excel en Windows.
- **Informes Disponibles:**
  - Nómina completa de personal con habilidades previas.
  - Auditoría de vencimientos clasificada por semáforo para ART o SENASA.
  - Acta oficial de asistencia a cursos con hashes forenses de firma.
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

## 📚 Documentación Estratégica & Roadmap de Expansión

- **Estudio de Mercado Exhaustivo:** [docs/market_research.md](file:///c:/Users/Regondi%20Calidad/Desktop/QM/TalentTrack/docs/market_research.md) — Análisis 1 vs Todos frente al mercado argentino (Humand, Buk, Rankmi, Lucca, Workey, GeoVictoria), arquitectura técnica comparativa, estrategias de pricing (CAC vs LTV) y matriz de barreras de entrada.
- **Plan Maestro de Expansión HR 360°:** [docs/ROADMAP_360.md](file:///c:/Users/Regondi%20Calidad/Desktop/QM/TalentTrack/docs/ROADMAP_360.md) — Hoja de ruta estratégica en 5 fases (EPP Oficial, Ausentismo & Licencias CCT, Polivalencia & Matriz 9-Box, Infraestructura Multi-Tenant Soberana, y Conectores de Liquidación / ARCA Libro de Sueldos Digital).

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
