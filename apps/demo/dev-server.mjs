import { createServer } from 'node:http';
import { readFileSync, watch } from 'node:fs';

import { frameworkMessage } from '@repro/framework';

const config = JSON.parse(readFileSync(new URL('./dev.config.json', import.meta.url), 'utf8'));
const appSourceUrl = new URL('./src/app-source.txt', import.meta.url);

let appSource = readFileSync(appSourceUrl, 'utf8');

const server = createServer((_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      ok: true,
      pid: process.pid,
      frameworkMessage,
      appSourceLength: appSource.length,
    }),
  );
});

const sourceWatcher = watch(appSourceUrl, { persistent: true }, (eventType) => {
  appSource = readFileSync(appSourceUrl, 'utf8');
  console.log(
    `[demo-dev] APP_SOURCE_CHANGED event=${eventType} bytes=${appSource.length}`,
  );
});

const close = (signal) => {
  console.log(`[demo-dev] DEV_SIGNAL signal=${signal}`);
  sourceWatcher.close();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', close);
process.on('SIGTERM', close);

server.listen(config.port, () => {
  console.log(
    `[demo-dev] DEV_READY pid=${process.pid} port=${config.port} framework="${frameworkMessage}"`,
  );
});

