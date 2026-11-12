# 🗺️ TalentTrack: Plan de Expansión Estratégica & Roadmap 360°

> **Propósito:** Hoja de ruta técnica y comercial para evolucionar TalentTrack de un sistema especializado en legajos operativos, skills y vencimientos hacia una plataforma integral de Recursos Humanos y Capital Humano para empresas industriales, alimenticias y logísticas en Argentina y la región.

---

## 🎯 Visión del Producto: El "Océano Azul" de los RRHH Operativos

A diferencia de los sistemas tradicionales centrados en empleados de escritorio (*white-collar*) o en la compleja liquidación contable de haberes (Tango, Bejerman, Buk), **TalentTrack** se enfoca prioritariamente en resolver los dolores no resueltos de las empresas con personal de planta y choferes:
1. **Pérdida de talento interno:** No saber qué oficios previos u habilidades tienen los operarios para cubrir vacantes críticas sin contratar afuera.
2. **Riesgos legales y multas millonarias:** Carnets de conducir profesionales (CNRT/LNH), libretas sanitarias bromatológicas (BPM) y exámenes médicos vencidos sin control preventivo en tiempo real.
3. **Auditorías de Higiene, Seguridad y Calidad:** Actas de entrega de EPP (Res. SRT 299/11) y actas de capacitación en papel, sin firma digital ni sellado forense para presentar ante SENASA, ART o normas ISO 9001/FSSC 22000.
4. **Desconexión con el operario:** El personal de planta y los choferes no usan correo corporativo; TalentTrack conecta vía WhatsApp directo y portal móvil offline-first.

---

## 🚀 Fases de Evolución (5 Etapas Modulares)

```mermaid
flowchart LR
    F1["Fase 1: Núcleo Operativo & EPP (Actual)"] --> F2["Fase 2: Ausentismo & Licencias CCT"]
    F2 --> F3["Fase 3: Polivalencia & Evaluación 9-Box"]
    F3 --> F4["Fase 4: Nube Multi-Tenant Soberana"]
    F4 --> F5["Fase 5: Conectores de Nómina & ARCA"]
```

---

### 🔹 Fase 1: Núcleo Operativo, Vencimientos & EPP (Versión Activa v1.0.02)
- **Legajos 360° Multi-Empresa:** Altas, modificaciones y bajas lógicas protegidas con tombstones.
- **Buscador de Talentos Ocultos (*Skills Hunter*):** Indexación de oficios previos, matriz de 4 niveles y filtros inteligentes.
- **Capacitaciones con Doble Firma Táctil:** Convocatoria por puesto, captura de firma en pantalla de docente y participantes, cálculo de hash criptográfico SHA-256 y sellado forense.
- **Semáforo Preventivo 30/15/7 Días:** Alertas tempranas de habilitaciones vehiculares y sanitarias con botón de despacho directo a WhatsApp.
- **Módulo de EPP bajo Res. SRT 299/11:**
  - Catálogo de elementos normalizados con sello IRAM y Sello S de Seguridad.
  - Requisitos de EPP obligatorios según el puesto de trabajo.
  - Acta de entrega con firma táctil digital de recepción y capacitación.
  - Vencimiento de recambios (semestral/periódico) conectado al Semáforo.
  - Exportación de la planilla oficial de entrega en CSV con BOM UTF-8 y vista para impresión limpia.
- **Portal Móvil del Colaborador (PWA Offline-First):** Autoservicio de cursos, carnets y EPP con Screen Wake Lock para choferes.

---

### 🔹 Fase 2: Control de Ausentismo, Turnos & Licencias por Convenio (CCT)
- **Calendarios Laborales por Convenio:** Parametrización de días no laborables y feriados según CCT (Camioneros 40/89, Alimentación 244/94, Comercio 130/75, UOM, etc.).
- **Solicitud y Aprobación de Licencias:**
  - Flujo de solicitud desde el Portal del Colaborador (vacaciones, enfermedad, examen, nacimiento, duelo).
  - Adjunto de certificados médicos con foto/PDF desde el celular.
  - Aprobación o rechazo por parte del supervisor o RRHH con notificación automática.
- **Panel de Ausentismo Operativo:** Métrica diaria de dotación presente en planta, tasa de ausentismo por sector y alerta de reemplazos urgentes activando el *Skills Hunter*.

---

### 🔹 Fase 3: Matriz de Polivalencia & Evaluación de Desempeño en Terreno
- **Matriz de Polivalencia de Puestos (ILU / 4 Niveles):**
  - Mapeo visual de operarios capacitados para operar cada máquina, autoelevador o línea de envasado.
  - Identificación de "cuellos de botella" (puestos con un solo operario habilitado).
- **Evaluaciones de Desempeño Operativo (9-Box de Planta):**
  - Evaluaciones periódicas completables por supervisores de turno en tablet.
  - Criterios objetivos: Seguridad (uso de EPP), Calidad (rechazos/desvíos), Productividad y Trabajo en equipo.
  - Registro de incidentes y reconocimientos en el legajo del colaborador.

---

### 🔹 Fase 4: Arquitectura Cloud Multi-Tenant Soberana & Notificaciones Serverless
- **Persistencia en la Nube:** Migración del almacenamiento local actual a base de datos multi-tenant administrada (Cloud Firestore con seguridad RBAC validada o Supabase PostgreSQL).
- **Cron Jobs de Alertas Serverless:** Ejecución diaria automatizada a las 8:00 AM para escanear vencimientos y enviar avisos proactivos por WhatsApp Business API / Twilio sin requerir intervención manual.
- **Módulo de Encuestas de Clima & Buzón de Sugerencias:** Encuestas anónimas o identificadas para medir satisfacción laboral y detección temprana de conflictos en planta.

---

### 🔹 Fase 5: Conectores de Nómina & Libro de Sueldos Digital (ARCA)
- **Puente con Sistemas Contables:** Exportación de novedades de nómina (altas, bajas, ausencias injustificadas, licencias por ART, horas trabajadas) en formatos compatibles con Tango Software, Bejerman y SAP.
- **Asistente de Cumplimiento ARCA (ex-AFIP):** Auditoría previa de datos de legajo (CUIL, domicilio, CBU bancario, categoría CCT) para evitar rechazos en la carga del Formulario 931 y Libro de Sueldos Digital.
- **Firma Digital con Certificado Remoto (Ley 25.506):** Integración opcional con proveedores autorizados de firma digital (ONTI) para empresas que deseen emitir y firmar recibos de sueldo directamente en la plataforma.

---

## 📈 Métricas de Éxito del Roadmap
1. **0 Multas en Auditorías:** 100% de cumplimiento en inspecciones de SENASA, SRT y ART.
2. **Reducción del 80% en tiempo de reemplazos:** Localización de personal polivalente interno en menos de 2 minutos.
3. **100% Despapelización de Higiene y Seguridad:** Eliminación total de planillas físicas de entrega de EPP y actas de cursos en depósitos y fábricas.
