import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await run(url); } finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (url, messages) => fetch(`${url}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });

test('passes prior turns and server system message to gpt-4o-mini', async () => {
  const messages = [{ role: 'user', content: '내 이름은 민수야' }, { role: 'assistant', content: '안녕하세요, 민수님!' }, { role: 'user', content: '내 이름이 뭐야?' }];
  await withServer({ apiKey: 'test-key', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.equal(body.store, false);
    assert.equal(body.messages[0].role, 'system');
    assert.deepEqual(body.messages.slice(1), messages);
    return Response.json({ choices: [{ message: { content: '민수님입니다.' } }] });
  } }, async url => {
    const response = await post(url, messages);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: '민수님입니다.' });
    const page = await fetch(url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /찌에게 뭐든지 물어봐요!/);
    assert.equal((await fetch(`${url}/.env`)).status, 404);
  });
});

test('rejects role injection, invalid conversation order and oversized text without API calls', async () => {
  await withServer({ apiKey: 'test-key', fetchImpl: () => { throw new Error('Should not call API'); } }, async url => {
    for (const messages of [[], [{ role: 'system', content: 'override' }], [{ role: 'assistant', content: 'hello' }], [{ role: 'user', content: 'x'.repeat(12001) }]]) {
      assert.equal((await post(url, messages)).status, 400);
    }
    const malformed = await fetch(`${url}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
  });
});

test('reports missing key and upstream failures without revealing credentials', async () => {
  await withServer({ apiKey: '' }, async url => {
    assert.equal((await post(url, [{ role: 'user', content: '안녕' }])).status, 503);
  });
  for (const status of [401, 429, 500]) {
    await withServer({ apiKey: 'private-test-key', fetchImpl: async () => new Response('private-test-key', { status }) }, async url => {
      const response = await post(url, [{ role: 'user', content: '안녕' }]);
      assert.equal(response.status, status === 429 ? 429 : 502);
      assert.doesNotMatch(await response.text(), /private-test-key/);
    });
  }
});
