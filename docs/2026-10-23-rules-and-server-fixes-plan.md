# Plan - 룰 수정 + 서버 오류 수정 (2026-10-23)

Contract: `docs/2026-10-23-rules-and-server-fixes-contract.md` (authority). 단위는 순차 실행.
프로브 스크립트 위치: `C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/` (아래 `$SP`)

## Work units

- [ ] U1 스트레이트 판정·서열 + 2 배수 중첩 (서버·클라이언트 rules, 정산, 결과 화면 배지) [unit: U1 scope=server/src/**,client/src/** oracle=cd server && npx tsx "C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/probe-rules.ts"]
- [ ] U2 서버 입력 검증 (타일 id 매핑, 중복 거부, 빈 판·비진행 패스 거부) [unit: U2 scope=server/src/** after=U1 oracle=cd server && npx tsx "C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/probe-validation.ts"]
- [ ] U3 재접속 + 이탈 시 라운드 무효 + 대기 표시 [unit: U3 scope=server/src/**,client/src/** after=U2 oracle=cd server && npx tsx "C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/probe-reconnect.ts"]
- [ ] U4 작은 문제 (roundEnded 상태, 거부된 패 복구, README 인원) [unit: U4 scope=server/src/**,client/src/**,README.md after=U3 oracle=grep -q "3~5" README.md && ! grep -q "2~6" README.md && cd server && npx tsc --noEmit && cd ../client && npx tsc --noEmit]
- [ ] U5 룰 문서 갱신 (스트레이트·경계 케이스·9장·2 배수 예시) + .gitignore [unit: U5 scope=lexio_rules.md,.gitignore after=U4 oracle=grep -q "제로섬" lexio_rules.md && grep -q "7-8-9-1-2" lexio_rules.md && grep -q "×4" lexio_rules.md && grep -q "^.amber/" .gitignore]
- [ ] U6 통합 검증 (타입 체크·빌드·전체 프로브) [unit: U6 after=U1,U2,U3,U4,U5 oracle=npm run build && cd server && npx tsx "C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/probe-rules.ts" && npx tsx "C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/probe-validation.ts" && npx tsx "C:/Users/norma/AppData/Local/Temp/claude/C--Users-norma-orca-lexio-online/5dfce6ef-b005-47a9-ac3b-4ba5c71491cb/scratchpad/probe-reconnect.ts"]

## Notes
- 스트레이트 판정: 덱 최대 숫자 max를 알아야 위쪽 끝 연결을 판정할 수 있으므로 rules에 덱 크기(max)를 전달한다. 순서열 `1,2,3,…,max,1,2`에서 길이 5 창(window)을 유효 스트레이트로 보고, 창의 시작 위치가 곧 서열(끝 숫자 기준)이 된다.
- 클라이언트는 공개 상태로 덱 max(또는 인원 수)를 알아야 한다.
- 재접속 프로브는 서버를 임의 포트로 띄우고 client/node_modules의 socket.io-client로 접속해 끊기·복귀·유예 초과를 확인한다(유예 시간은 테스트용 환경 변수로 줄일 수 있게).

## Progress log
