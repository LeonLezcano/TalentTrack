# 📚 Índice Central de Documentación — TalentTrack

Bienvenido al repositorio central de documentación de **TalentTrack**, plataforma SaaS de Gestión de Recursos Humanos, Cumplimiento Normativo (SRT/LCT), Liquidación Multiconvenio y Recibos con Firma Digital Forense.

---

## 📑 Índice de Documentos Técnicos y Estratégicos

### 1. 📊 Auditoría & Estrategia Comercial (Hormozi)
* 📄 **[audit_and_hormozi_pricing.md](./audit_and_hormozi_pricing.md)**
  * Auditoría exhaustiva de capacidades del producto frente a la competencia de Latinoamérica (**Buk, Humand, Sesame HR, Factorial**).
  * Matriz de brechas y ventajas competitivas (*Moats*).
  * Estrategia de pricing y planes bajo el framework de **Alex Hormozi ($100M Offers / Value Equation)**.
  * Tiers de monetización: Inicial ($49/mes), Pro ($3.50/emp/mes) y Enterprise ($4.90/emp/mes).
  * Garantía Grand Slam ("Blindaje Cero-Multas 60 Días").

### 2. ⚖️ Liquidación de Sueldos & Validez Legal de Firma Digital
* 📄 **[payroll_and_digital_payslips_legal_architecture.md](./payroll_and_digital_payslips_legal_architecture.md)**
  * Análisis de validez jurídica de la firma digital de recibos de sueldo ante la justicia laboral argentina.
  * El **Doble Escudo Legal**: Art. 124 LCT (acreditación bancaria como prueba madre de pago) + Res. MTEySS 346/2019 y Ley 25.506 (notificación y conformidad con hash SHA-256 e IP).
  * El principio de "Pago a Cuenta" (Art. 260 LCT).
  * Arquitectura matemática del motor salarial (`payrollEngine.js`) y catálogo de los **5 CCTs clave de Argentina**:
    * Comercio (FAECYS CCT 130/75)
    * Camioneros (FEDACAM CCT 40/89)
    * Industria de la Alimentación (STIA CCT 244/94)
    * Construcción (UOCRA CCT 76/75 & Ley 22.250)
    * Metalúrgicos (UOM CCT 260/75)
  * Especificación técnica del archivo plano de **500 bytes de longitud fija** para el **Libro de Sueldos Digital (LSD ARCA / AFIP)** según RG 3781.

### 3. 🧪 Walkthrough & Evidencia de Verificación
* 📄 **[walkthrough_v1.0.11.md](./walkthrough_v1.0.11.md)**
  * Informe completo de verificación técnica y fáctica de la versión `v1.0.11`.
  * Resultados de la suite automatizada de **204 pruebas en 5 capas** (100% PASS).
  * Resultados del auditor **AppSec Guardian (100/100, 0 vulnerabilidades)**.
  * Reporte de inspección visual con Playwright MCP (**0 errores de consola**).

### 4. 🧭 Estudio de Mercado & Roadmap
* 📄 **[market_research.md](./market_research.md)**: Estudio de mercado comparativo 1 vs Todos frente al ecosistema de HR Tech en Argentina y la región.
* 📄 **[ROADMAP_360.md](./ROADMAP_360.md)**: Hoja de ruta estratégica en 5 fases de evolución del producto.

---

© 2026 TalentTrack • Desarrollado bajo los estándares de ingeniería de **AiAppFactory**.
