import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';

const rootUrl = new URL('../', import.meta.url);
const appSourceUrl = new URL('../apps/demo/src/app-source.txt', import.meta.url);
const originalAppSource = readFileSync(appSourceUrl, 'utf8');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate, timeoutMs, label) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }

    await wait(100);
  }

  throw new Error(`Timed out waiting for ${label}`);
};

const requestHealth = () =>
  new Promise((resolve) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port: 41731,
        path: '/',
        method: 'GET',
        timeout: 1000,
      },
      (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode === 200));
      },
    );

    req.once('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.once('error', () => resolve(false));
    req.end();
  });

let output = '';
let ready = false;
let interrupted = false;

const child = spawn(
  'pnpm',
  [
    'turbo',
    'watch',
    'dev',
    '--filter=demo',
    '--ui=stream',
    '--log-prefix=task',
    '--output-logs=full',
    '--log-order=stream',
    '--verbosity=2',
  ],
  {
    cwd: rootUrl,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

const handleChunk = (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);

  if (text.includes('[demo-dev] DEV_READY')) {
    ready = true;
  }

  if (text.includes('[demo-dev] DEV_SIGNAL')) {
    interrupted = true;
  }
};

child.stdout.on('data', handleChunk);
child.stderr.on('data', handleChunk);

let exitCode = 0;

try {
  await waitFor(() => ready, 60_000, 'dev server readiness');

  appendFileSync(appSourceUrl, `automated app change ${Date.now()}\n`);
  console.log('[repro] appended to apps/demo/src/app-source.txt');

  await wait(5_000);

  const healthy = await requestHealth();

  if (interrupted || !healthy) {
    console.error(
      '[repro] BUG REPRODUCED: dev task was interrupted after app source change.',
    );
    exitCode = 1;
  } else {
    console.log('[repro] dev server stayed alive after app source change');
  }
} catch (error) {
  console.error(`[repro] ${error instanceof Error ? error.message : String(error)}`);
  exitCode = 1;
} finally {
  child.kill('SIGINT');

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    wait(5_000).then(() => {
      child.kill('SIGTERM');
    }),
  ]);

  writeFileSync(appSourceUrl, originalAppSource);
}

process.exit(exitCode);
