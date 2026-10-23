# Contract - 룰 수정 + 서버 오류 수정 (2026-10-23)

No load-bearing decision absent from this contract proceeds: stop and bring the question.

Pin: start commit dede029
Approval: operator 2026-10-23 - verification state at approval: server/client `tsc --noEmit` 통과, 서버 엔진 프로브로 오류 4건(중복 타일 페어, 타일 위조, 빈 판 패스, 이탈 시 턴 고착) 재현됨

## Completion conditions

All conditions must hold. Partial progress is not completion.

1. 스트레이트: 덱 1..max에서 자연 연속(1-2-3-4-5, 2-3-4-5-6, …)과 위쪽 끝 연결((max-3)..max-1, (max-2)..max-1-2)이 유효하고, 1·2를 사이에 두고 넘어가는 연결(max-1-2-3, max-1-2-3-4 등)은 무효다. 3·4·5인 덱 모두에서 성립한다. 서버와 클라이언트 `rules.ts`가 같은 판정을 한다.
2. 스트레이트 서열: 끝 숫자 기준으로 1-2-3-4-5가 최약, (max-2)-(max-1)-max-1-2가 최강. 끝 숫자가 같으면 끝 타일의 문양으로 비교한다. 스트레이트 플러시도 같은 규칙.
3. 정산: 남은 타일 수에 2^(보유한 2 타일 개수)를 곱한 값을 유효 타일 수로 쓴다(0장이면 0). 결과 화면의 배수 표시가 실제 배수(×2, ×4, …)를 보여준다.
4. 서버 검증: 클라이언트가 보낸 타일은 id로 서버가 가진 손패 타일을 찾아 그 값을 쓰고, 중복 id·미보유 id는 거부한다. 판이 비었을 때의 패스와 게임 진행 중이 아닐 때의 패스는 거부한다.
5. 재접속: 브라우저에 저장된 플레이어 토큰으로 같은 자리에 복귀하고, 복귀 시 손패·차례·판 상태가 복구된다. 끊긴 동안 다른 플레이어 화면에 재접속 대기 표시가 나온다. 직접 나가거나 60초 안에 복귀하지 않으면 그 라운드는 정산 없이 무효가 되고 모두 로비로 돌아간다. 대기실(로비)에서 끊긴 사람은 지금처럼 제거된다.
6. 작은 문제: `roundEnded`의 상태가 정산 후 점수를 담는다. 서버가 거부한 패는 손패에 복구된다. README의 인원 표기가 3~5인이다.
7. `lexio_rules.md`: 스트레이트 항목·경계 케이스가 1·2와 같이 갱신되고, 9장이 "꼴등은 획득 0이지만 다른 모든 플레이어와 유효 타일 수 차이만큼 칩을 주고받는 제로섬 교환으로 칩을 잃는다"를 명시하며, 2 배수 예시가 2^개수 규칙과 맞는다.

Verification (oracles): server·client `npx tsc --noEmit`, 루트 `npm run build`; scratchpad의 tsx 프로브 스크립트(룰/정산, 서버 검증, 소켓 재접속 시나리오) 각각 종료 코드 0; 문서·README는 grep 확인.
Not answered: 게임 종료 조건(칩 소진 시 `gameEnded`), 실제 모바일 기기에서의 재접속 체감 테스트, 공식 렉시오 룰과의 일치 여부(운영자 결정을 따름).

## Forbidden rows

- Write scope: 서버·클라이언트 소스, 룰 문서, README, 이 실행의 docs, .gitignore [machine: write-scope server/src/**]
- Write scope (client) [machine: write-scope client/src/**]
- Write scope (docs) [machine: write-scope docs/**]
- Write scope (rules doc) [machine: write-scope lexio_rules.md]
- Write scope (readme) [machine: write-scope README.md]
- Write scope (gitignore) [machine: write-scope .gitignore]
- 새 npm 의존성을 추가하거나 package.json을 바꾸지 않는다 [self-report]
- 게임 종료 조건(`gameEnded` 발송)은 구현하지 않는다 [self-report]
- Do not force-push [machine: bash-deny (?:^|[\n;&|])\s*git(?:\s+-[Cc]\s+\S+|\s+--\S+)*\s+push\b(?:[^\n;&|"']|"[^"\n]*"|'[^'\n]*')*(?:--force\b|--force-with-lease\b|-f\b|--mirror\b|--delete\b|\s\+[a-zA-Z0-9_/-])]
- Do not rewrite history or hard-reset [machine: bash-deny (?:^|[\n;&|])\s*git(?:\s+-[Cc]\s+\S+|\s+--\S+)*\s+(?:commit\b(?:[^\n;&|"']|"[^"\n]*"|'[^'\n]*')*--amend\b|rebase\b|filter-branch\b|filter-repo\b|reset\b(?:[^\n;&|"']|"[^"\n]*"|'[^'\n]*')*--hard\b)]
- Specify files explicitly when staging or committing [machine: bash-deny (?:^|[\n;&|])\s*git(?:\s+-[Cc]\s+\S+|\s+--\S+)*\s+(?:commit|add)\b(?:[^\n;&|"']|"[^"\n]*"|'[^'\n]*')*\s(?:-[aA]\b|-am\b|--all\b|\.(?=\s|$)|:/(?=\s|$))]
- Do not push to main [machine: bash-deny (?:^|[\n;&|])\s*git(?:\s+-[Cc]\s+\S+|\s+--\S+)*\s+push\b(?:[^\n;&|"']|"[^"\n]*"|'[^'\n]*')*\s(?:HEAD:)?(?:refs/heads/)?(?:main|release)(?=\s|$)]

## Budget
작업 단위 6개, 단위당 수정·검증 시도 3회. 한 단위가 3회 안에 검증을 통과하지 못하면: INCOMPLETE - RESUME REQUIRED (resume: `docs/2026-10-23-rules-and-server-fixes-plan.md`의 Progress log에서 마지막 미완료 단위를 확인하고 그 단위부터 재개).

## Settled decisions
- 스트레이트는 양 끝만 연결(1-2-3-4-5 쪽과 …-max-1-2 쪽), 중간 넘김 불가 (operator 2026-10-23)
- 스트레이트 서열은 끝 숫자 기준, …-max-1-2 최강 (operator 2026-10-23)
- 2 타일 배수는 보유 개수만큼 2배 중첩 (operator 2026-10-23)
- 9장은 "꼴등 획득 0, 잃는 칩은 제로섬 교환"을 명시하는 방향으로 문서를 고친다; 정산 코드의 제로섬 교환은 유지 (operator 2026-10-23)
- 이탈 처리: 재접속 + 60초 미복귀/직접 이탈 시 라운드 무효 (operator 2026-10-23)
- 추가 범위: 작은 문제 정리만 포함, 게임 종료 조건 제외, 독립 리뷰 없음 (operator 2026-10-23)

## Discretion
- 재접속 유예 시간: 60초 (서버 상수 하나로 둔다)
- 플레이어 토큰: 클라이언트가 생성해 localStorage에 저장, 접근 실패 시 세션 메모리로 대체
- 스트레이트 동률 비교 타일: 끝 숫자 타일(끝 숫자가 곧 "가장 높은 숫자")
- 검증 프로브는 저장소가 아닌 scratchpad에 둔다(테스트 프레임워크·스크립트 추가 없음)
- 소켓 이벤트 이름·페이로드 형태는 기존 스타일을 따라 필요한 만큼 추가
- `.amber/`를 .gitignore에 추가

## Standing rules

- End the run with the completion report (`references/reports.md`) once after the completion signal: show the deliverable, state what changed where and what verified it, and explain it for a reader with no context. The signal never replaces the report [self-report]
- Before the signal, semantically re-check the request, every required condition, current artifacts, and validation evidence. Missing, failed, unsuitable, or stale evidence means not complete; after any edit during re-check, re-validate and re-check [self-report]
- Incomplete, blocked, waiting, and status-only turns run no completion signal; the signal declares the contracted work itself complete, never an assessment, report, or attempt [self-report]
- Pass the re-check to `record.cjs done --review "<evidence summary>" --goal "<goal-test result>" --summary "<summary>"` (last tool call; no marker line in the message). On pass, S2 removes the pointer and `progress.json` [hook: S2]
- Numbers and claims carry provenance (verified / quoted / unverified)
- Plan units (when a plan exists) transition only via `record.cjs unit` (`.amber/progress.json`); announce any stop with open units via `amber:mark hold`. Parallel units use subagent worktrees; the main agent re-runs each oracle itself, records `unit verified --evidence`, and merges last (leftover worktree = not complete) [hook: E1, S2]

## Question handling
Default: on a discovery outside the contract, full stop plus a stop report (`references/reports.md`).
