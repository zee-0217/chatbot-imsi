# 찌에게 뭐든지 물어봐요!

HTML, CSS, JavaScript와 Node.js / Express로 만든 한국어 AI 챗봇입니다. OpenAI `gpt-4o-mini`를 사용합니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```powershell
npm.cmd install
```

`.env.example`을 참고하여 프로젝트 루트의 `.env`에 다음 값을 설정하세요. 기존 `.env`가 있다면 덮어쓰지 말고 필요한 항목을 확인하세요.

```dotenv
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

```powershell
npm.cmd start
```

브라우저에서 http://localhost:3000 을 여세요. macOS/Linux에서는 `npm install`, `npm start`를 사용하면 됩니다.

## Vercel 배포

1. 이 프로젝트를 GitHub 저장소에 올립니다. `.env`와 `node_modules`는 제외됩니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다.
3. Express 자동 감지를 사용하세요. 수동 설정이 필요한 경우 Framework Preset은 **Other**, Install Command는 `npm install`입니다. 별도 Build Command와 Output Directory는 지정하지 않습니다.
4. Vercel 프로젝트의 **Settings → Environment Variables**에 `OPENAI_API_KEY`를 추가하고 Production 및 Preview 등 사용할 환경에 적용합니다.
5. Deploy를 실행하세요. 환경 변수를 나중에 변경하면 다시 배포하세요.

`server.js`의 default export가 Vercel의 Express 진입점이며 `POST /api/chat` 요청을 처리합니다. 로컬에서는 Express가 정적 파일을 제공하고, Vercel에서는 `public/` 파일을 CDN에서 제공합니다. `vercel.json`은 함수 최대 실행 시간을 60초로 설정합니다. 로컬 `.env`는 Vercel로 자동 전달되지 않습니다.

## 대화와 키 관리

- 브라우저 메모리에 대화를 유지하고 매 요청에 이전 user/assistant 메시지를 함께 전달합니다. 서버 인스턴스가 바뀌어도 탭이 유지되는 동안 문맥을 전달할 수 있습니다.
- 새로고침하거나 탭을 닫거나 **새 대화 시작**을 누르면 기록이 초기화됩니다. 데이터베이스, 쿠키, localStorage를 사용하지 않습니다.
- 최대 31번의 사용자 질문과 전체 60,000자까지 문맥을 전송합니다. 한 메시지는 최대 12,000자입니다. 한도 초과 시 새 대화를 안내하며 기록을 조용히 잘라내지 않습니다.
- OpenAI 호출은 서버에서만 수행하므로 API 키가 브라우저에 전달되지 않습니다. 키나 API 원본 오류를 로그에 출력하지 않습니다.
- OpenAI에 대화 내용이 전송됩니다. `store: false`를 지정하였으며 OpenAI 측 보관 정책은 별도로 적용됩니다.
- 이 예제에는 로그인과 사용자별 사용량 제한이 없습니다. 공개 배포하면 방문자의 요청이 소유자의 API 사용량으로 청구됩니다. 공개 운영 시 Vercel 접근 보호나 별도의 인증 및 사용량 제한을 추가하세요.
- 응답은 일반 텍스트로 안전하게 표시합니다. Markdown 문법은 변환하지 않습니다.

## 검증

```powershell
npm.cmd test
node --check server.js
node --check public/app.js
```

테스트는 OpenAI 응답을 대체하여 이전 대화 전달, 모델 선택, 잘못된 요청, 키 누락, API 오류 처리와 정적 파일 제공을 확인합니다. 실제 API 호출이나 비용은 발생하지 않습니다.

## 파일 구조

```text
public/
  index.html       페이지
  style.css        반응형 스타일
  app.js           대화 UI와 메모리 기록
server.js          Express 서버와 OpenAI 호출
vercel.json        Vercel 함수 설정
.env.example       환경 변수 예시
test/chat.test.js  서버 검증
```

공식 참고: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
