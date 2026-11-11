/**
 * TalentTrack Automated Multi-Layer Test Runner (AiAppFactory Standard)
 * Executes 5 mandatory layers: Unit, Integration, Component, Security, E2E.
 * Enforces 100% pass rate and minimum 50 tests.
 */

import { runUnitTests } from './unit.test.js';
import { runIntegrationTests } from './integration.test.js';
import { runComponentTests } from './components.test.js';
import { runSecurityTests } from './security.test.js';
import { runE2ETests } from './e2e.test.js';

class TestHarness {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.currentLayer = '';
  }

  setLayer(name) {
    this.currentLayer = name;
    console.log(`\n📌 [${name}] Ejecutando capa...`);
  }

  assert(condition, message) {
    this.total++;
    if (condition) {
      this.passed++;
      console.log(`  ✓ ${message}`);
    } else {
      this.failed++;
      this.failures.push({ layer: this.currentLayer, message });
      console.error(`  ✗ FALLÓ: ${message}`);
    }
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║       🛡️   TALENTTRACK MULTI-LAYER AUTOMATED TEST HARNESS          ║');
  console.log('║       AiAppFactory Standard: 5 Capas • Mínimo 50 Tests            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  const harness = new TestHarness();
  const startTime = Date.now();

  try {
    // Capa 1: Pruebas Unitarias
    harness.setLayer('Capa 1: Pruebas Unitarias & Fuzzing (Semáforo, Sanitizer, Firmas)');
    await runUnitTests(harness);

    // Capa 2: Pruebas de Integración
    harness.setLayer('Capa 2: Pruebas de Integración (Multi-Empresa, Legajos, Anti-Fantasmas)');
    await runIntegrationTests(harness);

    // Capa 3: Pruebas de Componentes
    harness.setLayer('Capa 3: Pruebas de Componentes (Talent Hunter, Matriz de Puestos)');
    await runComponentTests(harness);

    // Capa 4: Pruebas de Seguridad
    harness.setLayer('Capa 4: Pruebas de Seguridad (XSS Sinks, CSP en firebase.json, Secretos)');
    await runSecurityTests(harness);

    // Capa 5: Pruebas End-to-End
    harness.setLayer('Capa 5: Pruebas E2E (Flujo: Alta -> Alerta Vencimiento -> Curso -> Firma -> CSV)');
    await runE2ETests(harness);

  } catch (err) {
    console.error('\n💥 Excepción fatal durante la ejecución de pruebas:', err);
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;

  console.log('\n===================================================================');
  console.log(`📊 RESULTADOS FINALES:`);
  console.log(`   Total de pruebas ejecutadas: ${harness.total}`);
  console.log(`   Pruebas aprobadas:          ${harness.passed}`);
  console.log(`   Pruebas fallidas:           ${harness.failed}`);
  console.log(`   Tiempo de ejecución:        ${durationMs} ms`);
  console.log('===================================================================');

  if (harness.total < 50) {
    console.error(`❌ REGLA VIOLADA: Se requiere un mínimo de 50 pruebas (se ejecutaron ${harness.total}).`);
    process.exit(1);
  }

  if (harness.failed > 0) {
    console.error(`❌ FALLARON ${harness.failed} PRUEBAS:`);
    harness.failures.forEach(f => console.error(`  - [${f.layer}] ${f.message}`));
    process.exit(1);
  }

  console.log('🎉 100% DE PRUEBAS APROBADAS (PASS). Cumple estrictamente con el estándar AiAppFactory.\n');
  process.exit(0);
}

main();
