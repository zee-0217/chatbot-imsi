import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const systemMessage = { role: 'system', content: '당신은 친절하고 정확한 AI 도우미입니다. 이전 대화의 맥락을 반영하고, 사용자의 언어로 답하세요. 모르는 내용은 솔직하게 설명하세요.' };

export function createApp({ apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    next();
  });
  app.use(express.json({ limit: '128kb' }));
  app.post('/api/chat', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 61 ||
        messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? 'user' : 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 12000) ||
        messages.at(-1).role !== 'user' || messages.reduce((sum, m) => sum + m.content.length, 0) > 60000) {
      return res.status(400).json({ error: '대화 형식 또는 길이가 올바르지 않습니다. 새 대화를 시작하거나 메시지를 줄여 주세요.' });
    }
    if (!apiKey) return res.status(503).json({ error: '서버에 OPENAI_API_KEY를 설정해 주세요.' });
    try {
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [systemMessage, ...messages.map(({ role, content }) => ({ role, content }))], max_completion_tokens: 1500, store: false }),
        signal: AbortSignal.timeout(45000)
      });
      if (!response.ok) {
        const status = response.status === 429 ? 429 : 502;
        return res.status(status).json({ error: status === 429 ? 'API 사용량 또는 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.' : 'AI 서비스 연결에 실패했습니다. 서버의 API 키와 모델 접근 권한을 확인해 주세요.' });
      }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty response');
      return res.json({ reply });
    } catch (error) {
      return res.status(502).json({ error: error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });
  app.use('/api', (req, res) => res.status(404).json({ error: '존재하지 않는 API입니다.' }));
  app.use(express.static(path.join(root, 'public')));
  app.use((error, req, res, next) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? '메시지가 너무 큽니다.' : '올바른 JSON 요청을 보내 주세요.' });
  });
  return app;
}

const app = createApp();
export default app;
if (!process.env.VERCEL && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(process.env.PORT || 3000, () => console.log(`Chat app: http://localhost:${process.env.PORT || 3000}`));
}
