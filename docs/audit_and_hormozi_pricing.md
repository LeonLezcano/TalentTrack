# 📊 Auditoría Integral de TalentTrack: Benchmark LatAm & Estrategia Hormozi

> **Fecha**: 12 de Noviembre, 2026  
> **Workspace**: `QM / TalentTrack`  
> **Frameworks Aplicados**: *AiAppFactory Standard*, *Alex Hormozi ($100M Offers / Value Equation)*, *Competitive Moats Analysis*.

---

## 1. 🔍 Auditoría Exhaustiva de TalentTrack (Estado Actual)

### Lo que TalentTrack TIENE (Nuestros Moats / Ventajas Competitivas Únicas)
1. **Semáforo Preventivo de Vencimientos con Notificación Directa por WhatsApp**:
   - Detección multinivel: `VENCIDO (rojo)`, `URGENTE < 7d (naranja)`, `PREVENTIVO < 15d (amarillo)`, `VIGENTE (verde)`.
   - Disparo con 1 clic al WhatsApp del colaborador con mensaje pre-armado y formato internacional.
2. **Entrega y Control de EPP conforme a Res. SRT 299/11 (Normativa Argentina)**:
   - Catálogo oficial con Sellos S e IRAM.
   - Firma biométrica/táctil en pantalla con estampado de **Hash Criptográfico Forense** inviolable.
   - Exportación nativa a planilla oficial SRT 299/11 en CSV con BOM UTF-8 para Excel.
3. **Talent Hunter (Radar de Habilidades y Oficios Ocultos)**:
   - Descubre habilidades de experiencia previa que el colaborador posee pero que no utiliza en su rol actual (ej. un chofer con oficio previo de soldador TIG/MIG). Evita contratar afuera.
4. **Almacenamiento Multi-Nube Resiliente con Optimización Preventiva**:
   - Compresión en cliente a 1920x1080px (ahorro de 95% en peso).
   - Primario Cloudinary + Fallback automático ImgBB + Respaldo Offline-First.
5. **Gestión de Vacaciones, Licencias & Ausentismo (LCT 20.744)**:
   - Cálculo legal de días según antigüedad (14, 21, 28, 35 días).
   - Prevención de solapamientos y adjunto de certificados médicos en la nube.
6. **Motor de Liquidación Multiconvenio & Recibos Digitales (LCT 20.744 / Res. 346/2019 / RG AFIP 3781)**:
   - Top 5 CCTs de Argentina (Comercio, Camioneros, Alimentación, UOCRA, UOM).
   - Exportador Libro de Sueldos Digital (LSD ARCA) en formato plano de 500 bytes por línea.
   - Recibos oficiales Art. 140 LCT con constancia bancaria Art. 124 LCT y firma digital táctil forense con hash SHA-256 e IP.
7. **Arquitectura Zero-Leak & Zero-Backdoor**:
   - Aislamiento estricto por Tenant y portal restringido por DNI y PIN para colaboradores.

---

## 2. 🥊 Benchmark contra la Competencia en Latinoamérica

Analizamos a los líderes en la región: **Buk** (Chile, Perú, Colombia, México), **Humand** (Argentina, LatAm), **Sesame HR** (México, España, LatAm), **Factorial** y **Runa**:

| Capacidad / Módulo | **TalentTrack** | **Humand** | **Buk** | **Sesame HR** | **Factorial** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Control de EPP con Res. SRT 299/11 y Firma Forense** | 🟢 **Nativo (Único)** | 🔴 No tiene | 🔴 No tiene | 🔴 No tiene | 🔴 No tiene |
| **Semáforo de Vencimientos + WhatsApp Directo** | 🟢 **Nativo (1 Clic)** | 🟡 Requiere chat app | 🔴 Solo email | 🔴 Solo email/notif | 🔴 Solo email |
| **Talent Hunter (Oficios y Skills Ocultas)** | 🟢 **Nativo** | 🔴 No | 🟡 Básico (CV) | 🟡 Evaluación | 🟡 Desempeño |
| **Almacenamiento Redundante & Offline-First** | 🟢 **Nativo** | 🟡 Solo app móvil | 🔴 Cloud-only | 🔴 Cloud-only | 🔴 Cloud-only |
| **Liquidación de Sueldos / Nómina Multiconvenio** | 🟢 **Nativo (5 CCTs)** | 🔴 No | 🟢 Muy fuerte | 🟡 Integraciones | 🟢 Fuerte |
| **Exportador LSD ARCA / AFIP (500 bytes RG 3781)** | 🟢 **Nativo (Oficial)** | 🔴 No | 🟢 Fuerte | 🔴 No | 🔴 No |
| **Recibos de Sueldo Digitales con Firma Forense** | 🟢 **Nativo (Art. 140)** | 🟢 Fuerte | 🟢 Fuerte | 🟡 Básico | 🟢 Fuerte |
| **Gestión de Vacaciones, Licencias y Ausentismo** | 🟢 **Nativo (LCT)** | 🟢 Básico | 🟢 Fuerte | 🟢 Muy fuerte | 🟢 Fuerte |
| **Control Horario / Fichaje Georreferenciado** | 🟡 *Siguiente fase* | 🟢 Fuerte | 🟢 Fuerte | 🟢 Muy fuerte | 🟢 Fuerte |
| **Evaluaciones de Desempeño 360° / Clima Laboral** | 🟡 *Siguiente fase* | 🟢 Fuerte | 🟢 Fuerte | 🟢 Fuerte | 🟢 Fuerte |

---

## 3. 🧩 Motores Recomendados para Incorporar a TalentTrack (Roadmap de Expansión)

Para consolidar a TalentTrack como la plataforma más completa para PyMEs y empresas con personal en planta o en calle:

### Motor 1: 📍 Control de Fichaje y Asistencia Georreferenciada (Mobile-First)
- **Por qué**: Esencial para choferes de larga distancia, preventistas, personal en ruta o cuadrillas de obra.
- **Qué hace**:
  - Check-in/Check-out con GPS, selfie biométrica y QR dinámico rotativo.
  - Detección de radio de tolerancia geográfico (geofencing por planta/depósito).
  - Integración directa con novedades de liquidación (llegadas tarde, horas extras al 50% y 100%).

### Motor 2: 📊 Matriz 9-Box y Evaluación de Desempeño Operativo
- **Por qué**: Retención de talento clave y planes de sucesión sin depender de planillas aisladas.
- **Qué hace**:
  - Cruce de Potencial vs Desempeño en cuadrante interactivo.
  - Evaluaciones periódicas 180° y 360° con cuestionarios simplificados para supervisores de planta.

---

## 4. 💰 Estrategia de Precios & Planes (Framework Alex Hormozi)

### La Ecuación de Valor de Hormozi:
$$\text{Valor Percibido} = \frac{\text{Resultado Soñado} \times \text{Probabilidad Percibida de Éxito}}{\text{Demora de Tiempo} \times \text{Esfuerzo y Sacrificio}}$$

1. **Resultado Soñado**: *"Cero multas de ART/SRT, cero choferes o máquinas paradas por licencias vencidas, liquidación salarial multiconvenio en minutos, y todo el personal con recibos firmados digitalmente sin papel."*
2. **Probabilidad Percibida**: 100% (porque las actas SRT 299/11 y los recibos Art. 140 tienen hash SHA-256 inmutable, y el semáforo avisa a WhatsApp antes de cualquier vencimiento).
3. **Demora de Tiempo**: Cero (se implementa en 24 horas importando la nómina de empleados).
4. **Esfuerzo y Sacrificio**: Mínimo (el colaborador firma en 5 segundos desde su celular sin instalar apps pesadas).

---

### Benchmark de Precios en el Mercado LatAm:
- **Sesame HR**: USD $4.50 a $8.00 / empleado / mes (mínimo USD $65 a $120/mes).
- **Humand**: USD $4.00 a $6.00 / empleado / mes.
- **Factorial**: USD $4.00 a $7.00 / empleado / mes (mínimo 15 empleados).
- **Buk**: USD $5.00 a $9.00 / empleado / mes (orientado a corporaciones).

---

### Propuesta de Tiers & "Grand Slam Offer" para TalentTrack

Hormozi enseña: **No compitas por precio hacia abajo; arma una oferta tan completa que sea irracional decir que no.**

```
                                  ┌────────────────────────┐
                                  │   PLAN ESCALA COMPLETO │
                                  │    USD $4.90 / emp/mes │
                                  │  (Mínimo 30 empleados) │
                                  ├────────────────────────┤
                                  │   PLAN COMPLIANCE & HR │
                                  │    USD $3.50 / emp/mes │
                                  │  (Mínimo 15 empleados) │
                                  ├────────────────────────┤
                                  │   PLAN INICIAL BLINDAJE│
                                  │    USD $49 / mes plano │
                                  │   (Hasta 15 empleados) │
                                  └────────────────────────┘
```

#### 🥉 1. Plan Inicial "Blindaje ART & Carnets" (USD $49 / mes fijo)
* **Público**: Pequeñas empresas (talleres, distribuidoras, plantas de 5 a 15 empleados).
* **Incluye**:
  - Hasta 15 colaboradores.
  - Semáforo de Vencimientos completo.
  - Avisos por WhatsApp con 1 clic.
  - Módulo EPP Res. SRT 299/11 con firma digital forense y exportación Excel.
  - Almacenamiento seguro de imágenes y carnets.
  - Portal de auto-consulta para colaboradores.

#### 🥈 2. Plan Pro "Compliance & Talento" (USD $3.50 / empleado / mes - Mínimo $70/mes)
* **Público**: Medianas empresas (20 a 100 empleados: industrias, plantas embotelladoras, logística).
* **Incluye todo lo anterior más**:
  - **Talent Hunter**: Radar de oficios y habilidades ocultas ilimitado.
  - **Gestor de Vacaciones & Licencias Médicas** con aprobación digital.
  - Matriz de Puestos y Competencias obligatorias con tasa de cobertura en tiempo real.
  - Múltiples administradores y sucursales.
  - Auditoría de exportación para inspectores de trabajo y ART.

#### 🥇 3. Plan Enterprise "Full Suite Operativa" (USD $4.90 / empleado / mes - Mínimo $200/mes)
* **Público**: Empresas de más de 50 empleados que quieren erradicar el papel y unificar liquidación y cumplimiento.
* **Incluye todo lo anterior más**:
  - **Liquidación Multiconvenio (5 CCTs)** y Exportador Libro de Sueldos Digital ARCA (500 bytes RG 3781).
  - Distribución y firma de Recibos de Sueldo digitales con custodia de hash SHA-256 e IP.
  - Soporte prioritario con SLA de 2 horas.
  - Migración y carga inicial asistida de legajos por nuestro equipo.

---

### 🎁 La "Grand Slam Guarantee" (Garantía Hormozi)
> **"Garantía Blindaje Cero-Multas 60 Días"**:  
> *"Si en tus primeros 60 días de uso recibes una intimación o desvío de tu ART por planillas de entrega de EPP defectuosas o colaboradores operando con carnets cargados en TalentTrack vencidos sin que el sistema te haya alertado, te devolvemos el 100% de tu dinero y te pagamos un mes de asesoría de Higiene y Seguridad."*
