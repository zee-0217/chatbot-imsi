const form = document.querySelector('#chat-form');
const input = document.querySelector('#message');
const messagesEl = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const errorEl = document.querySelector('#error');
const conversation = document.querySelector('#conversation');
let history = [];
let busy = false;

function addMessage(role, content, pending = false) {
  const row = document.createElement('div');
  row.className = `message ${role}${pending ? ' pending' : ''}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '나' : '✳';
  avatar.setAttribute('aria-hidden', 'true');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  row.append(avatar, bubble);
  messagesEl.append(row);
  conversation.scrollTop = conversation.scrollHeight;
  return row;
}
function setBusy(value) {
  busy = value;
  document.querySelector('#send').disabled = value;
  document.querySelector('#new-chat').disabled = value;
  input.disabled = value;
  form.setAttribute('aria-busy', String(value));
}
function resize() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }
input.addEventListener('input', resize);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content || busy) return;
  errorEl.hidden = true;
  const candidate = [...history, { role: 'user', content }];
  if (candidate.length > 61 || candidate.reduce((sum, m) => sum + m.content.length, 0) > 60000) {
    errorEl.textContent = '대화가 길어졌습니다. 새 대화를 시작해 주세요.';
    errorEl.hidden = false;
    return;
  }
  welcome.hidden = true;
  const userRow = addMessage('user', content);
  const pending = addMessage('assistant', '생각을 정리하고 있어요…', true);
  input.value = '';
  resize();
  setBusy(true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: candidate }), signal: AbortSignal.timeout(55000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '응답을 가져오지 못했습니다.');
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('빈 응답입니다. 다시 시도해 주세요.');
    history = [...candidate, { role: 'assistant', content: data.reply }];
    pending.remove();
    addMessage('assistant', data.reply);
  } catch (error) {
    pending.remove(); userRow.remove();
    input.value = content; resize();
    welcome.hidden = history.length > 0;
    errorEl.textContent = error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : error.message;
    errorEl.hidden = false;
  } finally { setBusy(false); input.focus(); }
});
document.querySelector('#new-chat').addEventListener('click', () => {
  if (busy) return;
  history = []; messagesEl.replaceChildren(); welcome.hidden = false;
  errorEl.hidden = true; input.value = ''; resize(); input.focus();
});
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  input.value = button.dataset.prompt; resize(); input.focus();
}));
