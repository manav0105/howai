import { spawn } from 'node:child_process';

function run(path, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/convex/bin/main.js', 'run', '--prod', path, JSON.stringify(args)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    // Do not echo CLI/SDK errors or request parameters.
    child.stderr.resume();
    child.on('error', () => reject(new Error(`Could not start ${path}`)));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`Could not run ${path}`));
      try { resolve(JSON.parse(output)); } catch { reject(new Error(`Invalid response from ${path}`)); }
    });
  });
}

const existing = await run('illustrationStore:report', {});
// Read saved canonical cards directly; never create or refresh lesson data here.
const lesson = await run('topicStore:read', { topic: 'general-ai' });
if (lesson?.content?.cards?.length !== 5) throw new Error('Five saved canonical cards are required');
await Promise.all(Array.from({ length: 5 }, async (_, index) => {
  const source = lesson.content.cards[index].example;
  const row = existing.find(row => row.index === index);
  if (row) {
    if (row.status === 'failed' && process.argv.includes('--retry-failed')) {
      const result = await run('illustrations:generateOnce', { index, source, retryFailed: true });
      console.log(`Card ${index + 1}: ${result.status}${result.code ? ` (HTTP ${result.code})` : ''}${result.bytes ? ` (${result.bytes} bytes)` : ''}`);
    }
    return;
  }
  const result = await run('illustrations:generateOnce', { index, source });
  console.log(`Card ${index + 1}: ${result.status}${result.code ? ` (HTTP ${result.code})` : ''}${result.bytes ? ` (${result.bytes} bytes)` : ''}`);
}));
const report = await run('illustrationStore:report', {});
console.log(JSON.stringify(report.map(({ url, ...row }) => row), null, 2));
console.log(`Saved ${report.filter(row => row.status === 'ready').length} images, ${report.reduce((sum, row) => sum + row.bytes, 0)} bytes total.`);
