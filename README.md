# 렉시오 온라인 (Lexio Online)

포커 기반 클라이밍 보드게임 **렉시오**의 온라인 멀티플레이어 웹 게임. 2~6인 실시간 플레이.

![players](https://img.shields.io/badge/players-2~6-blue) ![stack](https://img.shields.io/badge/stack-React%20%2B%20Socket.io-green)

## 기능

- 🎴 실시간 멀티플레이어 (Socket.io) — 방 코드로 친구 초대
- 🀱 고화질 타일 스프라이트 렌더링
- 📜 전체 룰 구현: 싱글·페어·트리플·스트레이트·플러시·풀하우스·포카드+1·스티플
- ☁️ 구름 3 보유자 선(先) 결정, 5장 족보 교차 대결
- 🔀 손패 정렬: 자동(숫자순/문양순) ↔ 수동 드래그앤드롭 토글
- 🪙 점수 칩 시각화 (1·5·10·50·100점), 2 타일 ×2 페널티

## 로컬 실행

```bash
npm run install:all   # server + client 의존성 설치
npm run dev           # server(:3001) + client(:3000) 동시 실행
```

브라우저에서 http://localhost:3000 접속.

## 프로덕션 (단일 서버)

```bash
npm run build         # 클라이언트 빌드 + 서버 컴파일
npm start             # http://localhost:3001 하나에서 웹+소켓 모두 서빙
```

## 배포 / 친구와 멀티플레이

[DEPLOY.md](./DEPLOY.md) 참고 — 터널(즉시) 또는 Render/Railway 영구 배포 방법.
저장소에 포함된 `render.yaml`로 Render에서 원클릭 배포 가능.

## 구조

```
server/   Express + Socket.io 게임 서버 (룰 엔진, 방 관리)
client/   React + Vite 프론트엔드
lexio_rules.md   게임 룰 원문
```
