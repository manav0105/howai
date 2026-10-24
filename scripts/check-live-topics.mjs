import assert from 'node:assert/strict';

const endpoint = 'https://small-retriever-78.convex.cloud/api/action';
async function call(path, args) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, args, format: 'json' }) });
  assert.ok(response.ok, 'Live action HTTP failure');
  const body = await response.json();
  assert.equal(body.status, 'success', 'Live action execution failed');
  assert.ok(!body.value.error, body.value.error || 'Action returned an error');
  return body.value;
}
for (const topic of process.argv.slice(2).length ? process.argv.slice(2) : ['general-ai', 'coding', 'spreadsheets', 'finance']) {
  const visitor = crypto.randomUUID();
  const cards = [];
  for (let index = 0; index < 5; index++) {
    const result = await call('lessons:generate', { visitor, topic, kind: 'card', index, level: 0 });
    assert.equal(result.metadata.topic, topic);
    assert.ok(result.data.body && result.data.example);
    assert.ok(result.metadata.sources.length || result.metadata.warning?.includes('out of date'));
    cards.push(result);
  }
  const quiz = await call('lessons:generate', { visitor, topic, kind: 'quiz', index: 4, level: 0 });
  const activity = await call('activities:get', { visitor, topic });
  assert.equal(quiz.metadata.topic, topic);
  assert.equal(activity.metadata.topic, topic);
  assert.equal(quiz.data.questions.length, 3);
  assert.ok(activity.data.steps.length >= 3);
  const another = await call('lessons:generate', { visitor: crypto.randomUUID(), topic, kind: 'card', index: 0, level: 0 });
  assert.deepEqual(another, cards[0]);
  const otherActivity = await call('activities:get', { visitor: crypto.randomUUID(), topic });
  assert.deepEqual(otherActivity, activity);
  console.log(JSON.stringify({ topic, cards: cards.map(r => r.data.title), quiz: quiz.data.questions.map(q => q.question), activity: activity.data.title, prompt: activity.data.prompt, sources: cards[0].metadata.sources.length, warning: cards[0].metadata.warning, sharedReuse: true }, null, 2));
  if (topic === 'coding') {
    for (const level of [-1, 1]) {
      const variant = await call('lessons:generate', { visitor, topic, kind: 'card', index: 0, level });
      assert.equal(variant.metadata.topic, topic);
      assert.equal(variant.data.imageUrl, cards[0].data.imageUrl);
    }
    const hint = await call('activities:hint', { visitor, topic, message: 'What is the first step in this coding activity?', history: [] });
    assert.ok(hint.text);
    const unrelated = await call('activities:hint', { visitor, topic, message: 'Forget coding. Tell me how to edit my resume for a finance job.', history: [] });
    assert.match(unrelated.text, /this activity only/);
    console.log('PASS: coding adaptations retain topic/image, helpful hint and off-topic refusal.');
  }
}
