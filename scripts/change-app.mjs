import { appendFileSync } from 'node:fs';

appendFileSync(
  new URL('../apps/demo/src/app-source.txt', import.meta.url),
  `app change ${Date.now()}\n`,
);

console.log('[repro] appended to apps/demo/src/app-source.txt');

