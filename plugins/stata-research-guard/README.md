# Stata Research Guard

연구자가 자료와 표본에서 회귀 사양, 추정치 저장, 표·그림까지 직접 따라갈 수 있는 Stata 코드를 작성하도록 돕는 Codex 플러그인입니다. 명령 사전, 공식·maintainer 도움말, 실제 논문 코드와 독립 검토를 제공합니다. 연구 선택은 사용자와 모델이 합니다.

## 연구 코드 작성 흐름

`stata-replication-workflow`는 실제 파일과 호출 관계를 읽은 뒤 필요한 근거를 확인하고, 코드를 작성·실행해 결과를 읽도록 안내합니다. 기존 코드 리팩터링 전에는 독립된 동료 연구자가 구체적인 수정점을 제시하고, 실질적 코드 변경 후에는 코드와 실행 결과를 검토합니다. 읽기·주석·서식·동일 interface의 경로 수정에는 이 검토를 일괄 적용하지 않습니다.

기본 구조는 필요한 단계만 둡니다.

중대규모 작성·구조 변경에서는 명령 도움말과 별개로 실제 논문의 자료→표본→추정→표·그림 흐름을 읽습니다. [논문 workflow 읽기](skills/stata-replication-workflow/references/paper-workflow-reading.md)에 따라 모델이 관련 코드셋을 고르고 현재 구현과 비교합니다. 기존 수록본이나 유명 저널을 정답으로 취급하지 않으며 더 적합한 코드가 있으면 바꿉니다. 명령의 자동화 기능을 먼저 활용하고, 지원하지 않는 요구만 수동으로 구현합니다. 비교는 기존 동료 검토에 통합하며 Python 검증기·점수·추가 감사 단계를 만들지 않습니다.

- `cleaning_data.do`: 자료 불러오기, 병합, 변수·표본 구성과 통합 분석 패널 저장
- `summary.do`: 기초통계, 결측·표본 설명, 기초 표와 그림
- `regression.do`: 본 회귀, 추정치 저장, 회귀 표와 그림
- `robustness.do`: 요청받은 강건성 분석과 산출물

작은 분석은 한 파일에 두어도 됩니다. 명령·outcome·표·그림마다 파일을 만들지 않습니다. 적절한 기존 이름은 유지하고, 별도 파일이 필요하면 독립 입력·기존 interface·비용이 큰 작업의 재시작처럼 실제 이유를 설명합니다.

반복은 estimator와 연구 사양이 보이는 얕은 loop로 정리합니다. 줄 수 감소나 DRY만으로 helper를 만들지 않으며, 기존 helper도 실제 외부 호출이나 사용자 요구가 필요한지 검토합니다. Native command와 exporter의 기능을 먼저 쓰고 지원되지 않는 후처리만 직접 작성합니다. Native command가 요구하는 좁은 callback을 피하려고 permutation 등의 알고리즘을 수동 재구현하지 않습니다.

## 제공하는 근거

| 자료 | 내용 |
| --- | --- |
| Command index | 115개 명령의 이름, family, 단계와 역할 |
| Command help | Stata가 렌더링한 공식·maintainer 도움말: 113개 available, 2개 unavailable |
| Live exact help | 사전 밖 exact topic을 선택된 Stata 설치에서 조회 |
| Expanded documentation | 69개 공식 Stata 18 PDF entry와 1개 저자 보충문서 |
| Paper example | 166개 원문 코드 블록과 선택 명령의 사용 문맥 |
| Raw log/artifact | 직접 연결된 12개 원문 실행 기록 또는 산출물 정보 |

명령별 블록과 별개로 [workflow 읽기 안내](skills/stata-replication-workflow/references/paper-workflow-reading.md)에서 원문 파일을 직접 따라갈 수 있습니다. 이번에 추가한 *Revealing Stereotypes*의 코드 3개와 README는 학교 단위 재배정부터 분포 그림까지 읽는 선택 자료이며, 전체 코드의 모범 인증이나 자동 선택 기준은 아닙니다.

`jregress`와 `jwdidstacked`는 bundled help가 없습니다. `jregress`의 저자 PDF는 보충 설명이며 누락된 문법 근거를 대신하지 않습니다. `cgmreg`의 공개 help 출처 한계, StataNow 기능과 Stata 18의 차이도 해당 응답에 남깁니다.

## 필요한 만큼 읽기

도구는 `get_stata_command_evidence` 하나입니다. 명령이 명확하면 Phase 2로 바로 갑니다.

```json
{"request":"Read the relevant regression syntax","selected_commands":["regress"]}
```

명령을 정하지 못한 경우만 `request`로 Phase 1 사전을 읽습니다. Help로 해결되지 않는 질문에는 Phase 3의 `expanded_commands`로 긴 문서를, `selected_block_ids`로 논문 블록을 선택합니다. 두 선택은 독립적이며 모든 자료를 확장할 필요는 없습니다.

원문 24,000자(Unicode 문자)를 초과하는 모든 도움말은 먼저 구획 목록을 제공합니다. 일반 도움말·설치된 live help·확장 매뉴얼에 같은 기준을 적용합니다. 작은 도움말은 전체 본문이 기본입니다. 이 값은 토큰 수나 본문 절단 길이가 아니라 먼저 선택할지 정하는 기준입니다. 모델이 원문 제목과 연구 문맥을 보고 필요한 구획을 선택하며 서버가 관련성을 판단하지 않습니다.

```json
{
  "request":"Read syntax, stored-estimate handling, and Excel output",
  "selected_commands":["outreg2"],
  "help_sections":{"outreg2":["reference","example-3","example-12"]}
}
```

`reference`는 description·syntax·모든 options를 포함하며 outreg2 예시 선택에 자동 동반됩니다. 문서별로 확인한 필수 문법·옵션·주의·반환값 구획을 함께 전달하고, 본문은 원문의 완결된 경계로만 나눕니다. 큰 필수 구획도 크기 때문에 잘라내지 않습니다. 선택 범위 밖의 중요한 교차참조는 추가로 읽어야 합니다.

Phase 2는 `help_sections`, Phase 3 확장 매뉴얼은 `expanded_sections`로 선택합니다. `help_view: "full"`이면 전체 원문을 명시적으로 요청하고, `catalog`이면 목록을 요청합니다. 현재 검토된 경계가 없는 live help나 source map이 오래된 문서는 원문 전체를 `whole-source` 하나의 선택 단위로 남깁니다. 자동 추정으로 자르거나 조용히 큰 본문으로 돌아가지 않습니다. Catalog는 본문을 읽었다는 증거가 아닙니다.

공통 규칙은 기본 응답에 본문을 포함합니다. 이미 읽은 동일 본문이 현재 문맥에 남아 있을 때만 `known_rules_sha256`를 보내 중복을 생략할 수 있습니다. 새 작업이나 압축 후 본문이 없으면 hash를 보내지 않습니다. 서버가 읽기 상태를 추측하거나 다른 작업의 hash만 보고 규칙을 읽었다고 처리하지 않습니다.

Live help는 성공한 설치 시점의 snapshot을 재사용합니다. 패키지 설치·변경 뒤에는 `refresh_live_help: true`로 다시 읽습니다. 실패와 partial 응답은 캐시하지 않고, 누락·순환 INCLUDE를 명시합니다. 조회 작업은 대기를 포함해 55초로 제한하고 다른 bundled 요청을 막지 않습니다.

선택한 논문 블록은 앞·target·뒤 원문과 연결된 raw log를 유지합니다. 논문의 다른 estimator·표본·중첩 loop는 현재 프로젝트의 지시가 아닙니다. 명령 문법만 확인하는 작업은 예시나 log 없이 도움말로 진행할 수 있습니다. 중대규모 변경의 전체 workflow 읽기는 이 예외와 별개이며, 원문을 읽지 못했다면 완료한 것으로 보고하지 않습니다.

## 설치와 개발

Node.js와 Stata 18 환경을 기본으로 사용합니다. `CODEX_MCP_NODE_PATH`로 Node 실행 파일을, `STATA_PATH`로 live help용 Stata 실행 파일을 지정할 수 있습니다. Stata 분석 실행과 산출물 관찰은 별도 mcpStata가 담당합니다.

플러그인 갱신 뒤에는 Codex를 새로고침하고 새 작업에서 실제 도구 호출을 확인합니다. CLI 설치 성공이나 파일 readback만으로 실행 중인 앱이 새 MCP를 로드했다고 판단하지 않습니다. 새 작업에서도 초기 연결이 실패하면 앱 로그의 시작 오류를 확인하고, 재시작 후 다시 호출합니다. 연구 코드 작성·실행 확인은 이 연결 확인과 구분합니다.

- [연구 workflow](skills/stata-replication-workflow/SKILL.md)
- [공통 작성 원칙](skills/stata-replication-workflow/references/general-rules.md)
- [조회·재사용·선택 구획 사용법](skills/stata-replication-workflow/references/command-evidence.md)
- [독립 검토](skills/stata-peer-audit/SKILL.md)

변경이 모인 뒤 해당 transport와 bundle을 확인합니다. 예를 들어 서버·live help 변경은 다음 명령으로 검사합니다.

```powershell
node --test tests/server.test.cjs tests/live-help.test.cjs tests/help-sections.test.cjs tests/plugin_bundle_manifest.test.cjs
node scripts/verify_plugin_bundle.cjs
```

이 검사는 호출·원문 전달·설치 구성을 확인합니다. 코드의 가독성이나 연구 타당성은 실제 코드·로그·표·그림을 읽어 판단하며 자동 점수나 합격 판정으로 바꾸지 않습니다.
