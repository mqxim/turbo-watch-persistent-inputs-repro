import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('./src/message.txt', import.meta.url), 'utf8').trim();
const distUrl = new URL('./dist/', import.meta.url);

mkdirSync(distUrl, { recursive: true });
writeFileSync(
  new URL('./index.mjs', distUrl),
  `export const frameworkMessage = ${JSON.stringify(source)};\n`,
);

console.log(`[framework-build] wrote dist/index.mjs message="${source}"`);

console.log(`[framework-build] wrote dist/index.mjs message="${source}"`);

