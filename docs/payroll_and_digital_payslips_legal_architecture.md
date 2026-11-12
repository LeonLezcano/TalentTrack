# ⚖️ Arquitectura de Liquidación Salarial Multiconvenio & Análisis de Validez Legal de la Firma Digital (Argentina)

> **Normativa de Referencia:** Ley de Contrato de Trabajo LCT 20.744 • Ley 24.241 • Ley 23.660 • Ley 25.506 • CCCN Art. 288 • Resolución MTEySS 346/2019 • Resolución General AFIP 3781  
> **Workspace:** `QM / TalentTrack`  
> **Estándar:** `AiAppFactory Standard`

---

## 🏛️ 1. Validez Legal ante la Justicia Laboral

### ¿Qué ocurre si un empleado demanda judicialmente a la empresa alegando falta de pago de haberes?

El sistema de TalentTrack implementa un **doble escudo legal inquebrantable**:

```
                                  ESCUDO LEGAL DOBLE (LCT)
              ┌──────────────────────────────────────────────────────────────┐
              │                                                              │
              │  1. EXTINCIÓN DE LA DEUDA                                    │
              │     Art. 124 LCT: Acreditación Bancaria en Cuenta Sueldo     │
              │     (Extracto bancario oficial = Prueba madre e irrebatible) │
              │                                                              │
              │  2. RECEPCIÓN Y CONFORMIDAD                                  │
              │     Res. MTEySS 346/2019 & Ley 25.506 / Art. 288 CCCN        │
              │     (Canvas táctil + Hash SHA-256 + Timestamp UTC + IP)      │
              │                                                              │
              │  3. CONDICIÓN LEGAL DEL RECIBO                               │
              │     Art. 260 LCT: Todo recibo opera como "Pago a Cuenta"     │
              │                                                              │
              └──────────────────────────────────────────────────────────────┘
```

#### 1. La Prueba Madre del Pago (Art. 124 LCT):
- Según el **Artículo 124 de la Ley de Contrato de Trabajo (LCT 20.744)**, el pago de las remuneraciones en dinero debe realizarse mediante depósito en cuenta bancaria a nombre del trabajador en instituciones autorizadas.
- La doctrina y jurisprudencia uniforme de la Cámara Nacional de Apelaciones del Trabajo (CNAT) y tribunales provinciales sostienen que **el extracto bancario oficial y el comprobante de transferencia bancaria son la prueba extintiva primaria e irrebatible de la entrega de los fondos**. 
- La firma del recibo no acredita la existencia física del dinero; la acredita la acreditación interbancaria. Por tanto, el empleador demuestra la cancelación de la obligación monetaria mediante el asiento bancario.

#### 2. La Validez Probatoria de la Firma Electrónica (Res. MTEySS 346/2019 & Ley 25.506):
- **Resolución MTEySS 346/2019:** Faculta a los empleadores a emitir recibos de sueldo en formato digital, eliminando la obligatoriedad del papel tradicional.
- **Ley de Firma Digital 25.506 (Art. 5) y Código Civil y Comercial (Art. 288):** Distinguen entre firma digital (con certificado licenciado) y firma electrónica. La firma manuscrita sobre pantalla táctil acompañada por:
  1. **Hash criptográfico SHA-256 inmutable** calculado en tiempo real sobre los datos del recibo, píxeles de la firma, ID del colaborador y timestamp.
  2. **Timestamp UTC certificado.**
  3. **Registro de dirección IP y User-Agent** del dispositivo firmante.
- Si un trabajador impugna su firma, la carga de la prueba le exige demostrar la falsedad del trazo o la intrusión en su dispositivo. El informe pericial informático sobre los logs del servidor y la coincidencia del hash forense brindan plena fuerza convictiva ante los magistrados laborales.

#### 3. Invariante Art. 260 LCT ("Pago a Cuenta"):
- La LCT establece el principio protectorio inquebrantable de que **cualquier recibo de pago opera únicamente como "pago a cuenta del total adeudado"**, aún cuando contenga la leyenda impresa "recibí conforme y sin nada más que reclamar".
- Por ende, el recibo digital protege a la empresa contra alegaciones de retención indebida o falta de entrega de recibos, garantizando a la vez que si existieran diferencias salariales por reclamos paritarios o adicionales mal encuadrados, las mismas se diriman por su sustancia sin invalidar el instrumento de cobro.

---

## ⚙️ 2. Motor de Liquidación Multiconvenio (`payrollEngine.js`)

TalentTrack modela los 5 Convenios Colectivos de Trabajo de mayor representatividad en el mercado argentino:

### 1. FAECYS CCT 130/75 (Comercio & Servicios)
- Categorías: Maestranza A/B, Administrativo A/B, Ventas A/B.
- Presentismo (Art. 40 CCT 130/75): 8.33% (la doceava parte) sobre básico + antigüedad.
- Antigüedad: 1.0% por año cumplido.
- Aportes sindicales: 2% SEC y aporte solidario OSECAC.

### 2. FEDACAM CCT 40/89 (Camioneros & Logística)
- Categorías: Chofer de Primera Carga General, Chofer de Semirremolque y Articulados, Chofer de Distribución, Peón General.
- Conceptos No Remunerativos: Viático Especial Comida (Art. 4.1.4 CCT 40/89).
- Adicionales de Ruta: Kilómetros recorridos de larga distancia (Art. 4.2.3) y Plus de Control y Descarga en Ruta (10% s/básico).
- Antigüedad: 1.0% anual.

### 3. STIA CCT 244/94 (Industria de la Alimentación)
- Categorías: Operario Calificado Elaboración, Operario Envasado, Frigorífico & Congelados, Supervisor de Turno.
- Adicionales de Planta: Presentismo y puntualidad perfecta (9%), Adicional trabajo en cámara de frío (12%).
- Antigüedad: 1.5% por año cumplido.

### 4. UOCRA CCT 76/75 & Ley 22.250 (Construcción)
- Régimen: Jornalizado horario con liquidación quincenal (88 hs base).
- Categorías: Oficial Especializado, Oficial Albañil, Medio Oficial, Ayudante.
- Fondo de Cese Laboral IERIC: 12% durante el primer año de servicio; 8% a partir del segundo año (reemplaza la indemnización por antigüedad tradicional).
- Presentismo quincenal: 8%.

### 5. UOM CCT 260/75 (Metalúrgicos)
- Categorías: Oficial Múltiple / Tornero / Soldador TIG, Oficial Metalúrgico, Medio Oficial, Operario Especializado.
- Adicionales: Título Secundario Técnico (8% s/básico), Horas extras al 50% y al 100% (feriados y descansos).
- Antigüedad: 1.0% anual.

---

## 🏛️ 3. Retenciones de Ley y Aportes Patronales (Seguridad Social)

### Retenciones al Empleado (Deducciones Legales):
- **Jubilación SIPA (Ley 24.241):** 11.00% (aplicable hasta el tope mensual de base imponible de ARCA).
- **INSSJyP / PAMI (Ley 19.032):** 3.00%.
- **Obra Social (Ley 23.660):** 3.00%.
- **Cuota Sindical:** 2.0% a 3.0% según convenio.

### Contribuciones Patronales Informativas (Formulario F.931 ARCA / AFIP):
- SIPA Patronal: 10.77%
- INSSJyP PAMI Patronal: 1.59%
- Fondo Nacional de Empleo (FNE): 0.94%
- Asignaciones Familiares: 4.70%
- Obra Social Patronal: 6.00%
- ART estimada: 3.50%
- Seguro Colectivo de Vida Obligatorio (Dto. 1567/74): Fijo por cápita.

---

## 📄 4. Exportador Normativo Libro de Sueldos Digital (LSD ARCA / AFIP)

Conforme a la **Resolución General AFIP 3781**, el archivo plano debe respetar de manera matemática la especificación de **500 bytes de longitud fija por línea**:

1. **Registro 01 (Carátula del Lote):**
   - Posición 1-2: Tipo de Registro (`01`).
   - Posición 3-13: CUIT del Empleador (11 dígitos).
   - Posición 14-19: Período en formato AAAAMM (6 dígitos).
   - Posición 20: Tipo de Liquidación (`M` = Mensual, `Q` = Quincenal, `S` = SAC).
   - Posición 21-25: Número de Liquidación (5 dígitos).
   - Relleno hasta 500 caracteres con espacios en blanco.

2. **Registro 02 (Datos del Trabajador & 10 Bases Imponibles):**
   - Posición 1-2: Tipo de Registro (`02`).
   - Posición 3-13: CUIL del Trabajador (11 dígitos).
   - Situación de Revista (`001` Activo), Condición (`001` Servicios comunes), Actividad, Modalidad de Contratación (`008` Tiempo indeterminado).
   - Bases imponibles de centavos formateadas a 12 dígitos con ceros a la izquierda.
   - Relleno hasta 500 caracteres.

3. **Registro 03 (Detalle de Conceptos Liquidados):**
   - Posición 1-2: Tipo de Registro (`03`).
   - Posición 3-13: CUIL.
   - Código del concepto (10 caracteres).
   - Cantidad o unidades (5 dígitos).
   - Indicador de tipo: `C` (Crédito / Remunerativo), `N` (No Remunerativo), `D` (Débito / Retención).
   - Importe en centavos a 15 dígitos.
   - Relleno hasta 500 caracteres.

4. **Registro 04 (Totales Generales por Empleado):**
   - Posición 1-2: Tipo de Registro (`04`).
   - Posición 3-13: CUIL.
   - Importe neto a 15 dígitos.
   - Relleno hasta 500 caracteres.
