# Stata Research Guard

연구자가 자료와 표본에서 회귀 사양, 추정치 저장, 표·그림까지 직접 따라갈 수 있는 Stata 코드를 작성하도록 돕는 Codex 플러그인입니다. 명령 사전, 공식·maintainer 도움말, 실제 논문 코드와 독립 검토를 제공합니다. 연구 선택은 사용자와 모델이 합니다.

## 연구 코드 작성 흐름

`stata-replication-workflow`는 실제 파일과 호출 관계를 읽은 뒤 필요한 근거를 확인하고, 코드를 작성·실행해 결과를 읽도록 안내합니다. 기존 코드 리팩터링 전에는 독립된 동료 연구자가 구체적인 수정점을 제시하고, 실질적 코드 변경 후에는 코드와 실행 결과를 검토합니다. 읽기·주석·서식·동일 interface의 경로 수정에는 이 검토를 일괄 적용하지 않습니다.

기본 구조는 필요한 단계만 둡니다.

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

`jregress`와 `jwdidstacked`는 bundled help가 없습니다. `jregress`의 저자 PDF는 보충 설명이며 누락된 문법 근거를 대신하지 않습니다. `cgmreg`의 공개 help 출처 한계, StataNow 기능과 Stata 18의 차이도 해당 응답에 남깁니다.

## 필요한 만큼 읽기

도구는 `get_stata_command_evidence` 하나입니다. 명령이 명확하면 Phase 2로 바로 갑니다.

```json
{"request":"Read the relevant regression syntax","selected_commands":["regress"]}
```

명령을 정하지 못한 경우만 `request`로 Phase 1 사전을 읽습니다. Help로 해결되지 않는 질문에는 Phase 3의 `expanded_commands`로 긴 문서를, `selected_block_ids`로 논문 블록을 선택합니다. 두 선택은 독립적이며 모든 자료를 확장할 필요는 없습니다.

전체 원문 help가 기본입니다. 큰 문서 중 `outreg2`와 `collect_style`는 원문 구획을 그대로 선택할 수도 있습니다. `help_view: "catalog"`로 목록을 확인하거나 이미 아는 ID를 바로 요청합니다.

```json
{
  "request":"Read syntax, stored-estimate handling, and Excel output",
  "selected_commands":["outreg2"],
  "help_sections":{"outreg2":["reference","example-3","example-12"]}
}
```

`reference`는 description·syntax·모든 options를 포함합니다. 예시는 maintainer가 나눈 단위 전체이며, `collect_style`는 각 공식 help topic 전체입니다. 고정 줄 수나 자동 요약으로 문법을 잘라내지 않습니다. 선택하지 않은 문맥이 필요하면 추가 구획이나 전체 help를 읽습니다. Catalog는 본문을 읽었다는 증거가 아니며, source map이 오래되면 전체 help로 돌아갑니다.

공통 규칙은 기본 응답에 본문을 포함합니다. 이미 읽은 동일 본문이 현재 문맥에 남아 있을 때만 `known_rules_sha256`를 보내 중복을 생략할 수 있습니다. 새 작업이나 압축 후 본문이 없으면 hash를 보내지 않습니다. 서버가 읽기 상태를 추측하거나 다른 작업의 hash만 보고 규칙을 읽었다고 처리하지 않습니다.

Live help는 성공한 설치 시점의 snapshot을 재사용합니다. 패키지 설치·변경 뒤에는 `refresh_live_help: true`로 다시 읽습니다. 실패와 partial 응답은 캐시하지 않고, 누락·순환 INCLUDE를 명시합니다. 조회 작업은 대기를 포함해 55초로 제한하고 다른 bundled 요청을 막지 않습니다.

선택한 논문 블록은 앞·target·뒤 원문과 연결된 raw log를 유지합니다. 논문의 다른 estimator·표본·중첩 loop는 현재 프로젝트의 지시가 아닙니다. 논문 예시나 log가 없어도 도움말로 해결되면 진행합니다.

## 설치와 개발

Node.js와 Stata 18 환경을 기본으로 사용합니다. `CODEX_MCP_NODE_PATH`로 Node 실행 파일을, `STATA_PATH`로 live help용 Stata 실행 파일을 지정할 수 있습니다. Stata 분석 실행과 산출물 관찰은 별도 mcpStata가 담당합니다.

플러그인 갱신 뒤에는 Codex를 새로고침하고 새 작업에서 실제 도구 호출을 확인합니다. CLI 설치 성공이나 파일 readback만으로 실행 중인 앱이 새 MCP를 로드했다고 판단하지 않습니다. 새 작업에서도 초기 연결이 실패하면 앱 로그의 시작 오류를 확인하고, 재시작 후 다시 호출합니다. 연구 코드 작성·실행 확인은 이 연결 확인과 구분합니다.

- [연구 workflow](skills/stata-replication-workflow/SKILL.md)
- [공통 작성 원칙](skills/stata-replication-workflow/references/general-rules.md)
- [조회·재사용·선택 구획 사용법](skills/stata-replication-workflow/references/command-evidence.md)
- [독립 검토](skills/stata-peer-audit/SKILL.md)

변경이 모인 뒤 해당 transport와 bundle을 확인합니다. 예를 들어 서버·live help 변경은 다음 명령으로 검사합니다.

```powershell
node --test tests/server.test.cjs tests/live-help.test.cjs tests/plugin_bundle_manifest.test.cjs
node scripts/verify_plugin_bundle.cjs
```

이 검사는 호출·원문 전달·설치 구성을 확인합니다. 코드의 가독성이나 연구 타당성은 실제 코드·로그·표·그림을 읽어 판단하며 자동 점수나 합격 판정으로 바꾸지 않습니다.

배포 버전: `0.3.0+codex.20260904214914`. 서버·live help·bundle 기능 검사 35개 통과. 연구 코드 가독성의 자동 인증을 의미하지 않습니다.
