# 렉시오 온라인 — 친구들과 멀티플레이 하기

지금은 `localhost`(내 컴퓨터)에서만 접속되는 상태입니다.
친구들이 접속하려면 아래 두 방법 중 하나를 쓰세요.

---

## 방법 1: 터널 (지금 당장 · 무료 · 코드 수정 불필요)

내 컴퓨터를 켜둔 채 임시 공개 주소를 만드는 방식입니다. 친구들이 그 주소로 바로 접속합니다.

### 1단계 — 개발 서버 2개 실행

```bash
cd ~/Desktop/Lexio
npm run dev          # server(:3001) + client(:3000) 동시 실행
```

### 2단계 — 터널 실행 (새 터미널)

```bash
npx localtunnel --port 3000
```

출력되는 주소(예: `https://xxxx.loca.lt`)를 친구에게 알려주면 됩니다.
- localtunnel은 처음 접속 시 안내 페이지가 뜰 수 있습니다(터널 비밀번호 = 내 공인 IP, `https://loca.lt/mytunnelpassword`에서 확인).

### ngrok을 더 선호한다면

```bash
# https://ngrok.com 에서 무료 가입 후 authtoken 등록
ngrok http 3000
```
ngrok이 주는 `https://xxxx.ngrok-free.app` 주소를 공유하세요.

> ⚠️ 내 컴퓨터를 끄거나 터미널을 닫으면 접속이 끊깁니다. 주소도 매번 바뀝니다.
> Vite(:3000)가 소켓 통신(:3001)을 자동으로 넘겨주므로 **포트 3000 하나만** 터널링하면 됩니다.

---

## 방법 2: 클라우드 영구 배포 (24시간 · 고정 주소)

서버가 빌드된 클라이언트를 함께 서빙하도록 이미 설정되어 있습니다
(`npm run build` → `npm start`, 하나의 포트에서 웹+소켓 모두 처리).

### Render.com (추천 · 무료 플랜)

1. 이 폴더를 GitHub 저장소에 올립니다.
   ```bash
   cd ~/Desktop/Lexio
   git init && git add -A && git commit -m "Lexio online"
   # GitHub에 새 repo 만든 뒤
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. [render.com](https://render.com) 가입 → **New → Blueprint** → 저장소 선택.
   - 저장소의 `render.yaml`을 자동으로 읽어 빌드/실행합니다.
3. 배포 완료 후 나오는 주소(예: `https://lexio.onrender.com`)를 친구에게 공유.

> 무료 플랜은 일정 시간 미사용 시 잠들어, 첫 접속이 30초쯤 느릴 수 있습니다.

### Railway / Fly.io 도 동일하게 가능

- **빌드 명령:** `npm run build`
- **실행 명령:** `npm start`
- **포트:** 환경변수 `PORT`를 서버가 자동으로 읽습니다(기본 3001).

---

## 로컬에서 프로덕션 모드 미리 보기

배포 후 모습을 미리 확인하려면:

```bash
npm run build        # 클라이언트 + 서버 빌드
npm start            # 단일 서버 실행 → http://localhost:3001
```

이제 `http://localhost:3001` 하나에서 게임 전체가 돌아갑니다.
