import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'artifacts/api-server/package.json'));

// Loopback-only preview intentionally loads no database, AI credentials or workspace dotenv.
export async function startSolanaDemoPreview(port = 0) {
  const express = require('express');
  const helmet = require('helmet');
  const route = require(path.join(root, 'tmp/colosseum/solana-monitor.cjs')).default;
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({limit: '2kb'}));
  app.use('/api/sigil', route);
  app.use('/api', (_req, res) => res.status(501).json({error: 'preview_scope', message: 'This loopback preview serves only the Solana API. EVM tools use the existing full API deployment.'}));
  app.use(express.static(path.join(root, 'artifacts/sigil/dist/public')));
  app.use((req, res) => {
    if (req.method !== 'GET') {res.sendStatus(405); return;}
    res.sendFile(path.join(root, 'artifacts/sigil/dist/public/index.html'));
  });
  const server = await new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
  return {server, url: `http://127.0.0.1:${server.address().port}`};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 5175);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
  const {server, url} = await startSolanaDemoPreview(port);
  console.log(`Solana-only loopback preview: ${url}/solana`);
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
