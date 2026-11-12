# 👥 TalentTrack — SaaS de Recursos Humanos, Liquidación de Sueldos, EPP, Vacaciones & Capacitaciones

> **Versión:** `v1.0.11` • **Estándar:** `AiAppFactory Standard` • **Arquitectura:** PWA Offline-First Multi-Empresa • **Tests:** 204/204 (100% PASS) • **AppSec:** 100/100 (0 vulnerabilidades)

**TalentTrack** es una plataforma SaaS de Recursos Humanos diseñada para empresas operativas (logística, alimentos, industria, distribución y construcción) que necesitan liquidar haberes multiconvenio (LCT 20.744) bajo las escalas paritarias de los 5 CCTs más importantes de Argentina, exportar el archivo plano normativo de 500 bytes para el **Libro de Sueldos Digital (LSD ARCA / AFIP)**, emitir recibos de sueldo oficiales (Art. 140 LCT) con constancia de acreditación bancaria (Art. 124 LCT) y firma digital táctil con validez judicial (Res. MTEySS 346/2019 y Ley 25.506), gestionar el ciclo completo de vacaciones y licencias médicas con cálculo de antigüedad y adjunto de certificados, controlar entregas de EPP bajo Resolución SRT 299/11 con constancias selladas criptográficamente, despachar alertas preventivas por WhatsApp, y monitorear habilitaciones bajo un estricto semáforo preventivo.

---

## 🌟 Capacidades Clave del Sistema

### 1. 💵 Módulo de Liquidación de Sueldos Multiconvenio (LCT 20.744)
- **Top 5 Convenios Colectivos de Trabajo (CCTs) de Argentina:**
  - **Comercio (FAECYS - CCT 130/75):** Básico por categoría, presentismo (8.33% Art. 40), antigüedad (1% anual), aportes a SEC y OSECAC.
  - **Camioneros (FEDACAM - CCT 40/89):** Categorías de choferes (primera, semirremolques, larga distancia), adicional por kilómetros recorridos (Art. 4.2.3), plus de descarga en ruta y viático especial comida no remunerativo (Art. 4.1.4).
  - **Industria de la Alimentación (STIA - CCT 244/94):** Operarios de elaboración y envasado, presentismo de planta (9%), adicionales por cámara frigorífica y congelados (12%), antigüedad (1.5% anual).
  - **Construcción (UOCRA - CCT 76/75 & Ley 22.250):** Jornalizados por hora, quincenas típicas (88 hs), presentismo quincenal y aporte al Fondo de Cese Laboral IERIC (12% 1er año / 8% subsiguientes).
  - **Metalúrgicos (UOM - CCT 260/75):** Oficiales múltiples, torneros y soldadores TIG, adicional por título secundario técnico (8%), horas extras al 50% y 100%.
- **Retenciones de Ley Automáticas:** Deducción legal exacta de Jubilación SIPA Ley 24.241 (11% con tope máximo ARCA), INSSJyP PAMI Ley 19.032 (3%), Obra Social Ley 23.660 (3%) y Cuota Sindical según CCT.
- **Contribuciones Patronales Informativas (F.931):** Cálculo de SIPA Patronal (10.77%), INSSJyP Patronal (1.59%), Asignaciones Familiares (4.70%), Fondo Nacional de Empleo (0.94%), Obra Social Patronal (6.00%), ART y Seguro Colectivo de Vida Obligatorio.
- **Plus Vacacional y SAC (Aguinaldo):** Cómputo del plus vacacional por división por 25 (Art. 155 LCT) y liquidación del Sueldo Anual Complementario (50% de la mayor remuneración devengada en el semestre).
- **Conversor Numérico a Letras en Español:** Generación automática del importe neto en palabras (Art. 140 Inc. b LCT) en pesos y centavos.
- **Escalas Paritarias Editables:** Panel de configuración donde RRHH y contadores pueden actualizar sueldos básicos y adicionales sin tocar código.

### 2. 📄 Exportador Normativo Libro de Sueldos Digital (LSD ARCA / AFIP)
- **Resolución General AFIP 3781:** Generación del archivo plano `.txt` con longitud fija estricta de **500 caracteres por línea**:
  - **Registro 01 (Carátula):** CUIT empleador, período AAAAMM, tipo de liquidación (M/Q/S), número de liquidación.
  - **Registro 02 (Trabajadores):** CUIL, situación de revista, modalidad contractual y las 10 bases imponibles de seguridad social.
  - **Registro 03 (Conceptos):** Desglose línea por línea de haberes remunerativos (C), no remunerativos (N) y retenciones/descuentos (D) con códigos homologados ARCA.
  - **Registro 04 (Totales):** Totales netos de la liquidación del colaborador.
- **Descarga Directa en 1 Clic:** Botón de exportación inmediata listo para subir a la web con clave fiscal de ARCA.

### 3. ✍️ Recibo de Sueldo Digital & Validez Legal de la Firma (Res. MTEySS 346/2019)
- **Formato Oficial Art. 140 LCT:** Visualización y descarga del recibo formal con datos de la empresa, CUIT, período, CBU y banco de acreditación de haberes (Art. 124 LCT).
- **Firma Digital / Electrónica Táctil:**
  - Lienzo HTML5 Canvas para rúbrica manual del colaborador desde su smartphone o PC.
  - Sellado criptográfico forense con hash SHA-256 inmutable, timestamp UTC y registro de dirección IP del dispositivo firmante.
- **Doble Blindaje Legal ante la Justicia Laboral:**
  1. *Acreditación de Pago (Art. 124 LCT):* La constancia bancaria en cuenta sueldo es la prueba madre e irrebatible de la entrega del dinero.
  2. *Recepción y Conformidad (Res. MTEySS 346/2019 & Ley 25.506):* La firma electrónica con rastro forense e IP demuestra la notificación y entrega del recibo al trabajador.
  3. *Invariante Art. 260 LCT:* El recibo firmado se considera legalmente "pago a cuenta" del total adeudado, garantizando transparencia y previniendo nulidades judiciales.
- **Despacho Directo por WhatsApp:** Envío de notificación con aviso de liquidación disponible y recordatorio de firma con 1 clic.

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

### 3. 🏖️ Módulo de Vacaciones, Licencias & Ausentismo (LCT 20.744)
- **Cálculo Legal de Vacaciones (Art. 150 LCT):** Cómputo normativo exacto de días corridos correspondientes según antigüedad acumulada al 31 de diciembre del año en curso:
  - Antigüedad menor a 5 años: **14 días corridos**.
  - Antigüedad de 5 a 10 años: **21 días corridos**.
  - Antigüedad de 10 a 20 años: **28 días corridos**.
  - Antigüedad mayor a 20 años: **35 días corridos**.
- **Gestión Integral de Licencias:** Catálogo normativo con soporte para Vacaciones Ordinarias, Licencia Médica / Enfermedad Inculpable (Art. 208 LCT), Maternidad / Paternidad, Duelo Familiar, Examen de Estudio y Licencia Sin Goce de Sueldo.
- **Adjunto de Certificados Médicos en la Nube:** Subida directa de certificados médicos con redimensionamiento automático a 1080p y alojamiento con failover dual (Cloudinary principal / ImgBB secundario / respaldo local offline).
- **Prevención de Solapamiento:** Motor de validación que bloquea solicitudes duplicadas o intersectadas con licencias activas o pendientes.
- **Flujo de Aprobación RBAC:** Los colaboradores solicitan ausencias desde su portal y los administradores de RRHH aprueban o rechazan con motivo formal, descontando los días automáticamente del saldo de vacaciones.

### 4. 🗂️ Legajos 360°, Requisitos de Puesto & Adjuntos Reales
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

TalentTrack cuenta con una suite completa de **204 pruebas automatizadas** que cubren las 5 capas obligatorias con 100% de aprobación:

```bash
pnpm test
```

| Capa | Descripción | Tests | Estado |
|---|---|:---:|:---:|
| **Capa 1** | Unitarias, Fuzzing caótico, algoritmos de semáforo, hashing, EPP, Vacaciones, Motor Multiconvenio (5 CCTs), Plus Vacacional, SAC, Letras y LSD 500 bytes | 69 | PASS |
| **Capa 2** | Integración, aislamiento multi-empresa, ciclo EPP, gestión de licencias, liquidación de sueldos, firma digital y paritarias | 58 | PASS |
| **Capa 3** | Componentes, Talent Hunter, matriz de puestos y actas oficiales SRT 299/11 | 15 | PASS |
| **Capa 4** | Seguridad XSS en DOM sinks, cabeceras en `firebase.json` y escaneo de secretos | 12 | PASS |
| **Capa 5** | End-to-End: Alta -> Carnet -> Alerta -> Curso -> Firma -> SRT 299 -> Vacaciones -> Liquidación -> LSD ARCA -> Firma Recibo | 50 | PASS |
| **Total** | **Suite Completa Automatizada** | **204** | **100% PASS** |

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
