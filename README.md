# Stata Research Guard

연구자가 읽을 수 있는 Stata 코드를 만들고, 재현성을 해치는 실수를 작업 전반에서 막아 주는 Codex 플러그인입니다.

단순한 코드 조각 모음이 아닙니다. 공식 manual과 maintainer 문서에서 확인한 454개 command mechanics는 코드 없는 metadata로만 관리하고, 109개 deposited research-code block과 57개 code-unavailable support record는 별도 research-usage layer에 둡니다. 가이드 metadata는 template 점수나 선택 가중치에 들어가지 않으며, 연구 코드도 정확한 상태 계약과 provenance gate를 모두 통과할 때만 제한적으로 검토됩니다. 내부 작성 실행 코드는 사용자 승인 `outreg2_xlsx` 다중-sheet formatter 하나만 예외로 남습니다.

현재 배포 버전은 `0.3.0+codex.20260828164500`입니다.

이번 버전은 내부·합성 command example을 전수 정리했습니다. 승인 formatter 외 derived implementation 35개, project snapshot 1개, legacy manual-derived label 2개와 관련 source/archive bytes를 제거했고, 454개 guide record를 authoritative URL 기반 code-free metadata로 다시 만들었습니다. 명령어별 정리본은 100개 command group과 395개 material contract를 계속 전수 기록합니다.

## 무엇이 좋은가

### 이 플러그인의 house style

아래 규칙은 보편적인 Stata 교과서 규칙이나 AEA 적합성 판정이 아니라, 이 플러그인이 새로 생성하거나 범위를 정해 수정하는 코드에 적용하는 연구자 가독성 house style입니다.

- 새 workflow는 전처리를 끝까지 수행해 cleaned analysis panel 하나를 먼저 만들고, summary와 regression이 이를 각각 독립적으로 다시 엽니다.
- 새 `masters.do`에는 정확한 영구 Input/Output 파일과 각 `do` 호출의 Input/Output 계약을 적습니다.
- 한 번만 쓰는 값은 직접 적고, 반복되는 이름은 소비 do-file에서 descriptive `global`로 정의합니다. 공통 경로는 master에, outcome global은 regression 파일에 둡니다.
- 새로 생성하거나 수정하는 regression에서는 event window, controls, sample, fixed effects, weights와 VCE를 estimator block에 직접 보여 substantive reference depth를 0으로 둡니다. 기존 프로젝트 감사에서는 무조건 error로 만들지 않습니다.
- `local`은 loop·program 상태, temp object, iteration scratch와 즉시 소비하는 `r()`·`e()` 값처럼 lexical 범위가 분명한 경우에만 사용합니다. 모든 Stata 문맥의 필요성을 기계적으로 판정하지 않습니다.
- active loop는 한 단계의 평면 구조를 우선합니다. 약 1000줄의 응집된 do-file은 section heading으로 충분할 수 있으며, durable artifact·독립 재실행·실제 재사용·ownership·명확히 다른 책임이 있을 때만 나눕니다.
- runtime과 exact raw `e(b)` 이름을 확인하지 않았다면 event-study는 level별 native 항을 사용합니다. compact selected-level 문법은 runtime 확인 뒤에만 고정된 프로젝트 형식으로 사용합니다.
- 중요한 filter와 retained-state merge 뒤에는 이름 있는 관측치 수를 기록하고, direct one-sheet 회귀표의 종속변수 평균은 `quietly summarize <depvar> if e(sample), meanonly`로 계산합니다.

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

### general rules를 따르고, 맞는 template만 선택합니다

- `resolve_transition_evidence`가 가이드 1개와 연구용례 최대 1개를 서로 독립적으로 돌려줍니다.
- 가이드 metadata는 명령이 지원하는 문법과 상태 전이만 설명하며 코드 본문을 제공하지 않고, 표본·estimand·모형·FE·VCE·sheet 같은 연구 결정을 대신하지 않습니다.
- general rules는 직접 구현뿐 아니라 template 선택·binding·변형·검증에도 항상 적용됩니다.
- 입력 자료의 형태, 관측 단위, 시간 구조, key와 변수 특성을 비교하고, 허용된 binding 뒤에도 원자적 전이 전체가 유지될 때만 template을 고릅니다.
- 서로 다른 대안 template을 임의로 이어 붙이지 않습니다.
- frame, algorithm, control flow, interface 또는 output contract를 바꿔야 한다면 더 이상 template으로 부르지 않습니다. 자연스러운 state boundary에서 나누거나 `general_rule`로 구현합니다.
- 가장 가까운 후보라도 실제로 맞지 않으면 nonbinding hint로만 참고합니다.
- template 선택과 substantive `general_rule` 구간을 `report.md`에 남겨 나중에 판단 근거를 확인할 수 있습니다.

### general rules는 무엇을 정하나

general rules는 예외 경로가 아니라 모든 Stata 코드 작성의 기본 계약입니다. 플러그인에 포함된 [`general-rules.md`](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md)를 따릅니다.

1. 사용자·프로젝트 계약이 표본, estimand, merge key, treatment rule, model, event-study axis, sheet 구성과 출력 위치를 정합니다.
2. general rules가 모든 구현과 template 변형의 가독성·안전·출력 계약을 정합니다.
3. template은 허용된 binding만으로 하나의 입력→출력 전이 전체를 덮을 때 선택합니다.
4. 구조를 바꿔야 하면 template 주장을 중단하고, 자연스러운 state boundary에서 나누거나 가장 짧고 읽기 쉬운 `general_rule` 구현을 사용합니다.
5. 검색 순위상 가장 가까운 후보는 명령 순서나 상태 처리 방식을 참고하는 nonbinding hint일 뿐, 호환성을 보장하지 않습니다.

완성된 substantive `general_rule` 구간은 `report.md`에 실제 파일과 줄 범위, 가장 가까운 후보, template 상태와 빌린 아이디어를 기록합니다. 연구 코드 안에는 내부 provenance marker를 넣지 않습니다. 깊이 3 이상의 loop, registry·dispatcher, positional job string, 한 번만 쓰는 program, 수동 event dummy와 coefficient 재조립도 허용하지 않습니다.

### 명시적인 overhaul도 통제합니다

기본 동작은 partial repair입니다. overhaul은 사용자가 명시적으로 요청했거나, 기존 interface로 목표를 달성할 수 없다는 구체적인 증거가 있을 때만 시작합니다.

쓰기 전에는 생성·수정·이동·이름 변경·삭제 대상을 모두 담은 파일 tree를 보여 줍니다. 새 persistent analysis variable이 있다면 정의, 원천 또는 계산식, 단위와 관측 수준, 생성 파일, 기간·지역, coding·missing rule과 사용처까지 함께 제시합니다. 프로젝트 README 반영 계획도 밝힌 뒤 승인을 기다립니다. 기존 프로젝트에서는 호환되는 구조와 interface를 보존하며, 새 프로젝트용 폴더 구성을 자동으로 덮어씌우지 않습니다.

### 코드 생성 이후까지 점검합니다

- 개별 do-file lint와 여러 파일에 걸친 프로젝트 audit을 제공합니다.
- master call, estimate handoff, Excel sheet 구성과 event-study axis 계약을 함께 검사합니다.
- static lint 결과를 실행 성공으로 포장하지 않습니다.
- 요청한 log, 산출물 개수와 실제 파일 hash를 확인해야 최종 검증으로 인정합니다.

### 회귀 앞뒤의 연구 workflow도 다룹니다

- StataCorp 공식 manual을 페이지 단위로 찾습니다. 공식 문서에서 변형한 runtime fixture 9개는 비원문·비선택·비독립 검증 입력으로 격리하고, 일반 template이나 command authority로 사용하지 않습니다.
- Top 100 명령군의 395개 주요 변형과 추가 user-written 명령군 15개의 48개 변형을 계약으로 관리합니다. 단순 명령은 하나의 mechanics record로 충분할 수 있지만, 복잡 명령은 입력 상태·문법·추정·추론·반환 상태·후속 handoff가 달라질 때마다 서로 다른 metadata record를 요구합니다. 단일 Markdown 정본에는 454개 guide metadata와 별도의 109개 deposited paper-code block을 보존하고 candidate/reference/excluded, unmapped, code-free exact support와 gap을 분리합니다.
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

- bundle manifest: 207개 파일, 통과
- Node regression test: 277/277 통과(실제 Stata runtime fixture 포함)
- bundle-manifest regression test: 5/5 통과
- Python test: 55/55 통과
- Top 100 coverage: 100개 명령군·395개 variant 전부 적재, frozen Top 50은 50개 명령군·203개 variant로 보존
- supplemental coverage: 15개 명령군·48개 variant, 전체 계약 443개
- runtime label index: 564개 중 code-bearing 110개(외부 deposited research code 109개와 승인 formatter 1개)
- guide promotion audit: code-free metadata 454/454 reference-only, 자동선택 0
- generated evidence: guide metadata card 454개, research-usage record 166개, 두 layer 자동선택 0
- source archive: 외부 corpus 원문 48개와 승인 formatter 1개, 합계 49개
- Top 100 metadata ledger: guide 454개; 별도 deposited paper-code ledger 109개(candidate 46·reference 53·excluded 10), command-context mapped/unmapped 96/13, code-free exact support 33개
- official runtime fixtures: adapted 9개, 전부 비원문·비선택·비독립으로 격리
- paper corpus occurrence audit: 132개 후보 중 통과 38개·추가 검토 13개·제외 81개; 통과 항목만 support evidence로 적재

MCP launcher는 `CODEX_MCP_NODE_PATH`, Codex에 포함된 Node.js, `PATH`의 `node.exe` 순서로 실행 파일을 찾습니다.

## 판단 경계

이 플러그인은 논문이나 분석의 실질적 타당성을 인증하지 않습니다. 정적 검사는 정적 증거이며, 실제 실행과 산출물 검증은 별도로 수행해야 합니다. 회귀식, 표본, 처치 정의와 식별 전략이 확정되지 않았다면 이를 임의로 채우지 않고 연구자의 결정을 기다립니다.
