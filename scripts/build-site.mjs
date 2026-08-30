import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

cpSync(resolve(root, 'site'), output, { recursive: true });
cpSync(resolve(root, 'ai-1115-la', 'dist'), resolve(output, 'ai1115'), {
  recursive: true,
});

console.log('Built deployment bundle:');
console.log('  /        Coursework directory');
console.log('  /ai1115  AI-1115 Linear Algebra');
