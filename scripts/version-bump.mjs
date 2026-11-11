import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const packageJsonPath = path.join(projectRoot, 'package.json');
const publicDir = path.join(projectRoot, 'public');
const versionJsonPath = path.join(publicDir, 'version.json');
const swPath = path.join(projectRoot, 'service-worker.js');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = pkg.version || '1.0.00';

const parts = currentVersion.split('.');
const major = parseInt(parts[0], 10) || 1;
const minor = parseInt(parts[1], 10) || 0;
let patch = parseInt(parts[2], 10) || 0;

patch += 1;
const newPatchStr = patch < 10 ? `0${patch}` : `${patch}`;
const nextVersion = `${major}.${minor}.${newPatchStr}`;

pkg.version = nextVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// Escribir public/version.json
const versionData = {
  version: `v${nextVersion}`,
  rawVersion: nextVersion,
  updatedAt: new Date().toISOString(),
  appName: 'TalentTrack'
};
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');

// Actualizar nombre de cache en service-worker.js si existe
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf-8');
  swContent = swContent.replace(/const CACHE_NAME = 'talenttrack-v[^']+';/, `const CACHE_NAME = 'talenttrack-v${nextVersion}';`);
  fs.writeFileSync(swPath, swContent);
}

console.log(`🚀 Version bumped successfully: v${currentVersion} -> v${nextVersion}`);
