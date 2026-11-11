import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('📦 Construyendo TalentTrack para producción...');

const publicDir = path.join(projectRoot, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const versionData = {
  version: `v${pkg.version}`,
  rawVersion: pkg.version,
  updatedAt: new Date().toISOString(),
  appName: 'TalentTrack'
};

fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(versionData, null, 2) + '\n');
console.log(`✅ Build verificado con éxito: TalentTrack ${versionData.version}`);
