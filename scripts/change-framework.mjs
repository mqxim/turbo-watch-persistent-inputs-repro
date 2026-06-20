import { appendFileSync } from 'node:fs';

appendFileSync(
  new URL('../packages/framework/src/message.txt', import.meta.url),
  `\nframework change ${Date.now()}`,
);

console.log('[repro] appended to packages/framework/src/message.txt');

