import { spawnSync } from 'node:child_process';

// Keep frontend uploads and backend updates on HowAI's existing production deployment.
const env = { ...process.env, CONVEX_DEPLOYMENT: 'prod:small-retriever-78' };
for (const args of [
  ['node_modules/convex/bin/main.js', 'deploy'],
  ['node_modules/@convex-dev/static-hosting/dist/cli/index.js', 'upload', '--build', '--prod'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
