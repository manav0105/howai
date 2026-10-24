import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { getFunctionName } from 'convex/server';
import { topics } from './shared/topics.js';

const bundle = await build({ stdin: { contents: 'export * from "./convex/topicContent.ts"; export { isFresh, MAX_AGE } from "./convex/topicModel.ts";', resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', plugins: [{ name: 'fake-google', setup(b) {
  b.onResolve({ filter: /^@google\/genai$/ }, () => ({ path: 'google', namespace: 'fake' }));
  b.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export class GoogleGenAI { constructor() { this.models={generateContent:config=>globalThis.howaiTestGemini(config)}; } }' }));
} }] });
const module = { exports: {} };
new Function('module', 'exports', bundle.outputFiles[0].text)(module, module.exports);
const { generateJSON, ensureLesson, lessonMetadata, cardSchema, validCard, isFresh, MAX_AGE } = module.exports;
assert.equal(topics.length, 16);
assert.equal(new Set(topics.map(t => t.id)).size, 16);
assert.equal(isFresh(100, 100 + MAX_AGE - 1), true);
assert.equal(isFresh(100, 100 + MAX_AGE), false);
assert.equal(isFresh(undefined), false);

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
process.env.GEMINI_MODEL = 'test-model';
let requests = [];
let mode = 'grounded';
let reservations = 0;
const rows = new Map();
const visitor = '00000000-0000-4000-a000-000000000099';
const ctx = {
  runQuery: async (ref, args) => {
    assert.equal(getFunctionName(ref), 'topicStore:read');
    return rows.get(args.topic) || null;
  },
  runMutation: async (ref, args) => {
    const name = getFunctionName(ref);
    if (name === 'usage:reserve') { reservations++; return true; }
    const row = rows.get(args.topic);
    if (name === 'topicStore:claim') return { status: 'claimed', row };
    if (name === 'topicStore:finish') {
      if (!args.result) return row;
      const stored = { topic: args.topic, generatedAt: Date.now(), ...args.result };
      rows.set(args.topic, stored);
      return stored;
    }
    throw new Error(`Unexpected mutation ${name}`);
  },
};
globalThis.howaiTestGemini = async request => {
  requests.push(request);
  assert.equal(request.config.maxOutputTokens, 300);
  const schema = request.config.responseJsonSchema;
  const topic = schema.properties.topic.enum[0];
  if (mode === 'failure' || mode === 'fallback' && request.config.tools) throw Object.assign(new Error('Test failure'), { status: 429 });
  let data;
  if (schema.properties.questions) data = { questions: [0,1,2].map(i => ({ question: `${topic} question ${i}`, options: ['Yes','No','Maybe'], answer: 0, explanation: 'Test answer' })) };
  else if (schema.properties.steps) data = { title: `${topic} activity`, steps: ['Open Gemini', 'Try this topic', 'Check the result'], prompt: `Practice ${topic}`, reflection: `How does AI help ${topic}?` };
  else data = { title: `${topic} card`, body: `Learn AI for ${topic}`, example: `Use AI for ${topic}` };
  return { text: JSON.stringify({ topic: mode === 'wrong-topic' ? 'unrelated' : topic, onTopic: true, ...data }), candidates: [{ finishReason: 'STOP', ...(request.config.tools && mode !== 'no-sources' ? { groundingMetadata: { groundingChunks: [{ web: { uri: 'https://ai.google.dev/test', title: 'Official docs' } }, { web: { uri: 'javascript:bad', title: 'Unsafe' } }], searchEntryPoint: { renderedContent: '<p>Google Search</p>' } } } : {}) }] };
};
try {
  const grounded = await generateJSON(ctx, visitor, 'coding', 'Coding card', cardSchema, validCard);
  assert.deepEqual(requests.at(-1).config.tools, [{ googleSearch: {} }]);
  assert.equal(grounded.ungrounded, false);
  assert.equal(grounded.sources.length, 1);
  assert.equal(grounded.sources[0].url, 'https://ai.google.dev/test');
  mode = 'fallback';
  const count = reservations;
  const fallback = await generateJSON(ctx, visitor, 'coding', 'Coding card', cardSchema, validCard);
  assert.equal(reservations - count, 2);
  assert.equal(fallback.ungrounded, true);
  assert.equal(fallback.sources.length, 0);
  mode = 'no-sources';
  assert.equal((await generateJSON(ctx, visitor, 'coding', 'Coding card', cardSchema, validCard)).ungrounded, true);
  mode = 'wrong-topic';
  await assert.rejects(generateJSON(ctx, visitor, 'coding', 'Coding card', cardSchema, validCard));
  const beforeInvalid = requests.length;
  await assert.rejects(ensureLesson(ctx, visitor, 'not-a-real-topic'));
  assert.equal(requests.length, beforeInvalid);
  mode = 'grounded';
  const first = await ensureLesson(ctx, visitor, 'coding');
  assert.equal(first.row.content.cards.length, 5);
  assert.equal(first.row.content.questions.length, 3);
  assert.match(first.row.content.activity.prompt, /coding/);
  const beforeCached = requests.length;
  const second = await ensureLesson(ctx, '00000000-0000-4000-a000-000000000098', 'coding');
  assert.deepEqual(second.row, first.row);
  assert.equal(requests.length, beforeCached);
  const spreadsheet = await ensureLesson(ctx, visitor, 'spreadsheets');
  assert.match(spreadsheet.row.content.cards[0].body, /spreadsheets/);
  assert.notDeepEqual(spreadsheet.row.content, first.row.content);
  rows.get('coding').generatedAt = Date.now() - MAX_AGE - 1;
  const beforeRefresh = requests.length;
  const refreshed = await ensureLesson(ctx, visitor, 'coding');
  assert.equal(requests.length - beforeRefresh, 7);
  assert.equal(isFresh(refreshed.row.generatedAt), true);
  rows.get('coding').generatedAt = Date.now() - MAX_AGE - 1;
  mode = 'failure';
  const stale = await ensureLesson(ctx, visitor, 'coding');
  assert.ok(stale.row.content);
  assert.match(lessonMetadata(stale.row, stale.warning).warning, /out of date/);
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(generateJSON(ctx, visitor, 'coding', 'Coding card', cardSchema, validCard), /GEMINI_API_KEY is missing/);
  console.log('PASS: 16 topic IDs, 30-day boundary/refresh, shared reuse, topic isolation/rejection, grounded sources, missing-source warning, grounding fallback, stale lesson recovery, 300-token cap, missing-key error.');
} finally {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = originalModel;
  delete globalThis.howaiTestGemini;
}
