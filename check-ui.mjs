import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import assert from 'node:assert/strict';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://howai.test', pretendToBeVisual: true, runScripts: 'outside-only' });
const calls = [];
let fail = false;
dom.window.testGenerate = async args => {
  calls.push(args);
  if (fail) return { error: 'Test generation failed. Try again.' };
  return { data: args.kind === 'quiz' ? { questions: [0,1,2].map(i => ({ question: `Question ${i}`, options: ['Yes','No','Maybe'], answer: 0, explanation: 'Test explanation' })) } : { title: `Card ${args.index} level ${args.level}`, body: 'A short lesson.', example: 'A short example.', imageUrl: args.index === 0 ? 'https://howai.test/shared-card-0.webp' : null } };
};
const bundled = await build({ entryPoints: ['src/main.jsx'], bundle: true, write: false, format: 'iife', define: { 'import.meta.env.VITE_CONVEX_URL': '"https://test.convex.cloud"', 'process.env.NODE_ENV': '"production"' }, loader: { '.css': 'empty' }, plugins: [{ name: 'mock-server', setup(b) {
  b.onResolve({ filter: /^convex\/react$/ }, () => ({ path: 'convex', namespace: 'mock' }));
  b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const ConvexProvider=({children})=>children; export class ConvexReactClient{}; export const useAction=()=>window.testGenerate;', loader: 'js' }));
} }] });
dom.window.eval(bundled.outputFiles[0].text);
const tick = () => new Promise(r => setTimeout(r, 35));
const text = () => dom.window.document.body.textContent;
const button = label => [...dom.window.document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(label));
async function click(label) { const b = button(label); assert.ok(b && !b.disabled, label); b.click(); await tick(); }
await tick();
await click('Let’s learn'); assert.match(text(), /Card 0 level 0/);
const imageUrl = dom.window.document.querySelector('.example-image').src;
assert.equal(dom.window.document.querySelector('.example-image').nextElementSibling.textContent, 'A short example.');
await click("Didn't get it"); assert.equal(calls.at(-1).level, -1); assert.match(text(), /Card 0 level -1/);
assert.equal(dom.window.document.querySelector('.example-image').src, imageUrl);
await click('Go deeper'); assert.equal(calls.at(-1).level, 0);
await click('Go deeper'); assert.equal(calls.at(-1).level, 1);
assert.equal(dom.window.document.querySelector('.example-image').src, imageUrl);
dom.window.document.querySelector('.example-image').dispatchEvent(new dom.window.Event('error'));
assert.ok(dom.window.document.querySelector('.example-image').hidden);
assert.match(text(), /A short example/);
fail = true; await click("Didn't get it"); assert.match(text(), /Test generation failed/); assert.match(text(), /Card 0 level 1/); fail = false;
function swipe(from, to) { const card = dom.window.document.querySelector('article'); for (const [type,x] of [['touchstart',from],['touchend',to]]) { const e = new dom.window.Event(type,{bubbles:true}); Object.defineProperty(e,type==='touchstart'?'touches':'changedTouches',{value:[{clientX:x,clientY:100}]}); card.dispatchEvent(e); } }
swipe(280,50); await tick(); assert.match(text(), /Card 1 level 0/);
assert.equal(dom.window.document.querySelector('.example-image'), null);
const count = calls.length; swipe(50,280); await tick(); assert.match(text(), /Card 0 level 1/); assert.equal(calls.length,count);
for(let i=0;i<5;i++) await click('Next');
assert.equal(dom.window.document.querySelectorAll('fieldset').length,3);
assert.ok(button('Check my answers').disabled);
for(const field of dom.window.document.querySelectorAll('fieldset')) { field.querySelector('input').click(); await tick(); }
await click('Check my answers'); assert.match(text(),/3 out of 3/);
await click('Review the cards'); assert.match(text(),/Card 0 level 1/);
assert.equal(dom.window.localStorage.length,1);
console.log('PASS: start, simpler, deeper, failure recovery, swipe both ways, next, 3-question quiz, scoring, review, visitor-only storage.');
dom.window.close();
