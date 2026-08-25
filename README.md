# Stata Research Guard

연구자가 읽을 수 있는 Stata 코드를 만들고, 재현성을 해치는 실수를 작업 전반에서 막아 주는 Codex 플러그인입니다.

단순한 코드 조각 모음이 아닙니다. legacy selector label 148개, 독립 감사를 통과한 신규 가이드 mechanics 262개, 그리고 별도로 생성한 research-usage example 128개를 서로 다른 격으로 관리합니다. 전체 guide card는 기존 공식-manual reference 2개를 포함한 264개이며 자동선택은 0개입니다. 선택한 명령의 공식·maintainer 가이드는 항상 함께 보여 주되 template 점수 경쟁에는 넣지 않고, 연구 코드용례가 현재 데이터 구조와 작업 상태에 정확히 맞을 때만 별도 template으로 고릅니다. 맞는 용례가 없으면 가이드에 근거한 좁은 fallback으로 전환합니다.

현재 배포 버전은 `0.2.0+codex.20260825225433`입니다.

## 무엇이 좋은가

### Stata의 의미를 끝까지 보존합니다

- factor-variable interaction을 `treat_y2015` 같은 수동 변수로 바꾸지 않습니다.
- coefficient, standard error, omitted/base 상태와 `e(b)`의 실제 이름을 표와 event study까지 그대로 전달합니다.
- `outreg2`가 만든 원래 행을 임의로 걸러내거나 다시 조립하지 않습니다.
- 재사용 추정치는 `.ster`, 표는 Excel, 그림은 PDF로 관리합니다.

### 기존 연구 프로젝트를 함부로 흔들지 않습니다

- 수정 전에 프로젝트 구조와 실행 흐름을 읽기 전용으로 조사합니다.
- 만들거나 바꿀 파일, 진입점과 실행 명령을 먼저 제시하고 승인을 기다립니다.
- 전체 재작성보다 필요한 부분만 고치는 partial repair를 기본으로 삼습니다.
- 불필요한 framework, dispatcher, 깊은 loop와 한 번만 쓰는 program을 만들지 않습니다.

### template을 쓰되 template에 끌려가지 않습니다

- `resolve_transition_evidence`가 가이드 1개와 연구용례 최대 1개를 서로 독립적으로 돌려줍니다.
- 가이드 코드는 문법과 상태 전이의 교과서 역할만 하며 표본·estimand·모형·FE·VCE·sheet 같은 연구 결정을 대신하지 않습니다.
- 입력 자료의 형태, 관측 단위, 시간 구조, key와 변수 특성을 비교한 뒤 후보를 고릅니다.
- 서로 다른 대안 template을 임의로 이어 붙이지 않습니다.
- 가장 가까운 후보라도 실제로 맞지 않으면 nonbinding hint로만 참고합니다.
- template 선택과 fallback 사용 구간을 `report.md`에 남겨 나중에 판단 근거를 확인할 수 있습니다.

### 좁은 범위 fallback은 무엇을 따르나

fallback은 즉흥적으로 코드를 만드는 우회로가 아닙니다. 플러그인에 포함된 [`general-rule-fallback.md`](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rule-fallback.md)를 지침으로 삼습니다.

1. 먼저 현재 입력 구조와 작업 상태에 맞는 template을 dictionary와 승인된 corpus에서 찾습니다.
2. 적합한 template이 없거나, 선택한 template이 lint·실행·산출물 증거에서 맞지 않는다고 확인된 경우에만 fallback으로 전환합니다.
3. 검색 순위상 가장 가까운 후보는 명령 순서나 상태 처리 방식을 참고하는 nonbinding hint일 뿐, 호환성을 보장하지 않습니다.
4. fallback은 이미 정해진 하나의 입력→출력 전이만 가장 짧고 읽기 쉬운 Stata 코드로 구현합니다.
5. 표본, estimand, merge key, treatment rule, model, event-study axis, sheet 구성과 출력 위치가 정해지지 않았다면 추측하지 않고 멈춥니다.

완성된 fallback 구간은 `report.md`에 실제 파일과 줄 범위, 가장 가까운 후보, 전환 이유와 빌린 아이디어를 기록합니다. 연구 코드 안에는 내부 provenance marker를 넣지 않습니다. 깊이 3 이상의 loop, registry·dispatcher, positional job string, 한 번만 쓰는 program, 수동 event dummy와 coefficient 재조립도 허용하지 않습니다.

### 명시적인 overhaul도 통제합니다

기본 동작은 partial repair입니다. overhaul은 사용자가 명시적으로 요청했거나, 기존 interface로 목표를 달성할 수 없다는 구체적인 증거가 있을 때만 시작합니다.

쓰기 전에는 생성·수정·이동·이름 변경·삭제 대상을 모두 담은 파일 tree를 보여 줍니다. 새 persistent analysis variable이 있다면 정의, 원천 또는 계산식, 단위와 관측 수준, 생성 파일, 기간·지역, coding·missing rule과 사용처까지 함께 제시합니다. 프로젝트 README 반영 계획도 밝힌 뒤 승인을 기다립니다. 기존 프로젝트에서는 호환되는 구조와 interface를 보존하며, 새 프로젝트용 폴더 구성을 자동으로 덮어씌우지 않습니다.

### 코드 생성 이후까지 점검합니다

- 개별 do-file lint와 여러 파일에 걸친 프로젝트 audit을 제공합니다.
- master call, estimate handoff, Excel sheet 구성과 event-study axis 계약을 함께 검사합니다.
- static lint 결과를 실행 성공으로 포장하지 않습니다.
- 요청한 log, 산출물 개수와 실제 파일 hash를 확인해야 최종 검증으로 인정합니다.

### 회귀 앞뒤의 연구 workflow도 다룹니다

- StataCorp 공식 manual을 페이지 단위로 찾고, 실제 실행으로 확인한 official example과 code hash를 별도 증거로 제공합니다.
- Top 50 명령군의 203개 주요 변형과 추가 user-written 명령군 15개의 48개 변형을 계약으로 관리합니다.
- 공식 명령과 주요 community package를 43개 명령군·109개 canonical command anchor로 관리하며, 개별 estimator 이름을 끝없이 탐지기에 추가하지 않고 상태 호환 원자 template으로 확장합니다.
- import, integrity check, cleaning·label, merge·reshape, panel 구성, descriptive statistics, sample flow, estimation·robustness, figure·table export와 master orchestration을 한 흐름으로 점검합니다.
- summary 작업은 평균·표준편차·관측치 수를 하나의 named dataset에 저장하고, Excel 표와 PDF 그림이 같은 자료를 읽도록 설계할 수 있습니다.
- 기존 프로젝트에서는 `plan_dictionary_repairs`가 call graph, 산출물과 estimate handoff를 살핀 뒤 요청 범위 밖 단계는 `preserve`로 남깁니다.
- `workflow_reproduction_check`와 `research_output_check`는 의미상 workflow 계약, log, 정확한 산출물 수와 직접 계산한 hash를 나누어 확인합니다.
- 한 sheet workbook은 눈에 보이는 direct `outreg2` 흐름을, 여러 sheet workbook은 정해진 canonical formatter를 사용합니다. 어느 쪽이든 raw model·coefficient·standard-error·omitted/base·note 행을 다시 만들거나 걸러내지 않습니다.

## 특히 잘 맞는 작업

- raw data부터 최종 표·그림까지 이어지는 Stata 연구 workflow 작성
- 기존 `.do` 파일의 구조 보존형 audit과 부분 수정
- 여러 outcome·sample·specification을 포함한 회귀표 구성
- factor-variable 기반 event study와 raw coefficient selector 검증
- 2SLS first stage를 포함한 여러 sheet의 Excel 결과 정리
- summary dataset, descriptive Excel과 PDF figure 사이의 일관성 점검

## Toy example: 자동차 가격 robust 회귀

[`examples/auto-price-robust/`](examples/auto-price-robust/)에는 Stata 내장 `auto` 자료로 실행하는 작은 예시를 두었습니다. `price`를 결과변수로 놓고 설명변수를 단계적으로 추가한 네 개의 OLS 사양을 `vce(robust)`로 비교합니다.

이 예시는 다음 흐름을 짧게 보여 줍니다.

```text
내장 자료 로드 → key·결측 점검 → 네 개 사양 추정
→ 각 e(sample)의 종속변수 평균 계산 → 한 sheet Excel 표 조립
```

Stata의 현재 작업 폴더를 예시 폴더로 맞춘 뒤 실행합니다.

```stata
do price_models.do
```

실행하면 `price_robust_models.xls`가 생성됩니다. 예시에 포함된 [`report.md`](examples/auto-price-robust/report.md)에서는 어느 줄이 template이고 어느 줄이 좁은 fallback인지 확인할 수 있습니다. 이 toy workflow는 기능과 코드 구조를 보여 주기 위한 것이며, 실증 결과의 일반성이나 학술적 타당성을 주장하지 않습니다.

## 설치

이 저장소에 접근할 수 있는 GitHub 계정으로 clone합니다.

```powershell
gh repo clone Plokies-2/stata-research-guard
Set-Location .\stata-research-guard
```

clone한 저장소를 팀 marketplace로 등록하고 플러그인을 설치합니다.

```powershell
$repoRoot = (Get-Location).Path
codex plugin marketplace add $repoRoot
codex plugin add stata-research-guard@stata-research-guard-team
codex plugin list
```

설치가 끝나면 새 Codex task를 열어야 skill과 MCP 도구가 로드됩니다.

## 이렇게 시작해 보세요

```text
이 Stata 프로젝트의 구조와 실행 흐름을 먼저 읽기 전용으로 조사해 주세요.
수정이 필요하면 바꿀 파일과 실행 명령을 제시하고 승인을 기다리세요.
```

```text
이 회귀표가 모든 outcome × sample × specification에서 coefficient,
standard error와 omitted/base 상태를 빠짐없이 보존하는지 audit해 주세요.
```

```text
이 event study가 native factor-variable 이름을 유지하는지 확인하고,
표의 raw row와 figure selector가 같은 e(b) 이름을 쓰는지 검사해 주세요.
```

```text
이 기존 Stata workflow를 overhaul해 주세요. 코드를 쓰기 전에 바뀌는 파일 tree와
새 persistent analysis variable의 정의·산식·단위·생성 위치·결측 규칙을 보여 주고
제 승인을 기다리세요. 호환되는 기존 interface는 보존하세요.
```

## 배포본 검증

```powershell
node plugins/stata-research-guard/scripts/verify_plugin_bundle.cjs `
  --plugin-root plugins/stata-research-guard
```

현재 배포본의 검증 상태는 다음과 같습니다.

- bundle manifest: 236개 파일, 통과
- Node test: 22/22 test file 통과(실제 Stata runtime fixture 포함)
- Python test: 38/38 통과
- Top 50 coverage: 50개 명령군·203개 variant 전부 적재(직접 primitive 19, reference-only guide coverage 184)
- 신규 guide promotion audit: 262/262 reference-only, 자동선택 0
- generated evidence: guide card 264개, research-usage example 128개(자동선택 가능 46개), AEA/openICPSR support 19개·제외 9개

MCP launcher는 `CODEX_MCP_NODE_PATH`, Codex에 포함된 Node.js, `PATH`의 `node.exe` 순서로 실행 파일을 찾습니다.

## 판단 경계

이 플러그인은 논문이나 분석의 실질적 타당성을 인증하지 않습니다. 정적 검사는 정적 증거이며, 실제 실행과 산출물 검증은 별도로 수행해야 합니다. 회귀식, 표본, 처치 정의와 식별 전략이 확정되지 않았다면 이를 임의로 채우지 않고 연구자의 결정을 기다립니다.
