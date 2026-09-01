# Stata Research Guard

Stata Research Guard는 Codex가 연구 목적에 맞는 Stata 명령을 고르고, 정확한 문법과 실제 연구에서의 사용 맥락을 확인한 뒤 읽기 쉬운 코드를 작성하도록 돕는 플러그인입니다.

플러그인은 명령 사전, 공식·maintainer 가이드, 실제 논문 코드 예시, 공통 작성 원칙을 제공합니다. 표본, 회귀 사양, fixed effects, VCE와 출력 방식 같은 연구 선택은 현재 프로젝트를 이해하는 모델이 맡습니다.

## 제공하는 자료

| 자료 | 내용 | 활용 방식 |
| --- | --- | --- |
| Command index | 115개 등록 명령의 command, family, stage와 한 줄 역할 | 모델이 현재 작업에 필요한 명령을 고를 때 사용하는 간결한 출발점 |
| Command help | 115개 명령의 Stata-rendered 공식·maintainer help: 113개 `available`, 2개 `unavailable` | 선택한 명령의 기본 문법, option, warning, stored result 확인 |
| Live exact help | 사전 밖 exact command의 활성 Stata `.sthlp`·`.hlp` | 등록되지 않은 명령도 Guard 안에서 온디맨드로 문법 확인 |
| Expanded documentation | 공식 명령 69개의 설치된 Stata 18 PDF command entry, `jregress` 저자 보충문서 1개 | help만으로 부족할 때 Phase 3에서 선택 명령별로 추가 확인 |
| Paper example | 166개 실제 논문 코드 블록과 target occurrence | 선택한 명령이 데이터 준비, 추정, 저장, 표·그림 작성과 이어지는 방식 참고 |
| Raw log and artifact | 논문 블록과 직접 연결된 12개 원문 log 또는 artifact 정보 | 해당 코드가 남긴 원문 실행 기록과 산출물 위치 확인 |
| General rules | 직접적이고 읽기 쉬운 Stata를 위한 공통 원칙 | 현재 프로젝트용 코드를 작성할 때 함께 적용 |

`jregress`와 `jwdidstacked`는 별도 help가 없어 `help_status=unavailable`로 반환합니다. `jregress`의 저자 PDF guide는 Phase 3에서 보충 설명으로만 제공하며, 문법 근거를 대신하지 않습니다. `cgmreg`는 인터넷에서 확인한 Judson Caskey 배포판의 실제 `cgmreg.hlp`를 사용하며, 원 저자 배포본과 일치한다고 단정할 수 없다는 제한도 함께 보냅니다. `collect_style`은 Stata 18에 존재하는 19개 하위 help를 모두 제공해 Stata 18 범위에서는 `available`입니다. 이후 Stata 19에 추가된 `collect style smcl`과 `collect style txt`는 Stata 18 대상 문법에 섞지 않습니다.

## 사용하는 방법

`stataResearchGuard` MCP 서버는 다음 도구 하나를 제공합니다.

```text
get_stata_command_evidence
```

Phase 1은 명령이 아직 불명확할 때 쓰는 선택적 discovery입니다. 이미 중요한 명령을 알고 있으면 Phase 1을 건너뛰고 Phase 2로 바로 갈 수 있습니다. 읽기 전용 설명·검토, 주석·북마크·공백·formatting만의 수정, command interface를 바꾸지 않는 literal 교체와 기존 block의 그대로 이동에는 Guard lookup이 필요하지 않습니다. Phase 1을 쓸 때는 `general-rules.md` 전문이 한 번 들어가고, Phase 2·3은 같은 규칙의 path와 SHA-256만 반환합니다.

### 1. 명령 선택

명령을 아직 고르지 못했을 때만 연구 요청을 보냅니다.

```json
{
  "request": "패널 자료에서 개체 고정효과 모형을 추정한다."
}
```

응답의 `command_dictionary`에는 115개 등록 명령의 command, family, stage와 한 줄 역할만 담깁니다. 모델은 연구 목적과 현재 프로젝트를 바탕으로 사용할 exact command를 직접 고릅니다. 이 목록은 출발점이지 닫힌 실행 경계가 아닙니다.

### 2. 선택한 명령의 help와 논문 목록 확인

고른 명령을 `selected_commands`에 넣습니다.

```json
{
  "request": "패널 자료에서 개체 고정효과 모형을 추정한다.",
  "selected_commands": ["xtreg", "cgmreg"]
}
```

응답의 `command_evidence`에는 요청 순서대로 command별 packet이 들어갑니다. 등록 명령에는 Stata가 `smcl2txt`로 렌더링한 bundled help, expanded-documentation 상태와 논문 profile이 들어갑니다. 사전 밖 exact command는 Guard가 활성 Stata ado-path에서 `.sthlp` 또는 `.hlp`를 찾아 같은 방식으로 렌더링하며 `registry_status=outside_dictionary`로 표시합니다. 이 live fallback에는 bundled PDF expansion이나 paper catalog가 없습니다. exact help도 없으면 해당 command branch만 중단합니다.

실제 Stata 표기인 `export excel`과 `import excel`은 각각 등록 key `export_excel`, `import_excel`로 투명하게 정규화되고 그 mapping을 응답에 남깁니다. `global`, `local`, `tempfile`, `tempname`은 요청 label을 유지하면서 공식 `macro` help를 조회합니다. programming `if`의 help topic은 `ifcmd`이고, `if` topic은 observation qualifier입니다. 한 block의 모든 보조 token을 나열하지 말고 실제로 문법·option·returned result가 쟁점인 command만 선택합니다.

help에 사용자가 하려는 행동이 모두 설명되어 있고, 그 설명을 직접 적용해 어렵지 않게 코드를 쓸 수 있으며, version·option 상호작용·returned result·후속 표/그림/저장 연결에 중요한 의문이 남지 않으면 여기서 멈춥니다. 명령이 통계 명령이거나 user-written이라는 이유, 데이터를 바꾸거나 출력과 이어진다는 이유만으로 더 긴 자료를 요구하지 않습니다.

### 3. 필요한 확장 문서와 논문 코드 확인

help만으로 위 종료 조건을 만족하지 못하면 `expanded: true`를 보내되, 긴 문서가 실제로 필요한 command만 `expanded_commands`에 넣습니다. `selected_commands`는 Phase 2에서 고른 전체 명령 경계이고, `expanded_commands`는 그 안의 exact subset입니다. 논문 profile도 도움이 될 때만 exact block ID를 `selected_block_ids`로 함께 보냅니다. 문서만, 논문만, 둘을 함께 요청할 수 있지만 두 선택이 모두 비어 있을 수는 없습니다.

```json
{
  "request": "패널 자료에서 개체 고정효과 모형을 추정한다.",
  "selected_commands": ["xtreg", "margins"],
  "expanded": true,
  "expanded_commands": ["xtreg"],
  "selected_block_ids": ["block-139-184-033"]
}
```

응답의 `expanded_command_evidence`에는 `expanded_commands`로 고른 명령만 들어갑니다. 위 예에서는 `margins`도 Phase 2의 선택 경계 안에 있지만 긴 문서는 `xtreg` 하나만 주입됩니다. 공식 명령은 Stata 18 PDF command entry를 반환합니다. user-written 명령은 Phase 2 help와 원자료가 같으면 `same_source_as_help`로 표시하고 같은 글을 다시 주입하지 않습니다. `jregress`만 저자 PDF를 `supplemental`로 반환합니다.

`paper_usage_cards`는 선택한 원문 code span과 필요한 출처만 담는 얇은 카드입니다. parser 내부정보와 중복된 occurrence 전체를 되풀이하지 않습니다. 같은 논문 패키지에 직접 연결된 log나 artifact가 있으면 원문 excerpt와 직접 metadata만 포함하며, 없으면 빈 배열입니다. 매우 긴 nuisance-coefficient 표 하나는 자동 길이 제한이 아니라 사람이 고른 정확한 원문 행 범위로 줄였습니다.

## 자료를 읽는 기준

Phase 2에서는 공식·maintainer help가 명령 문법의 첫 기준입니다. Phase 3의 공식 명령 확장문서는 설치된 Stata 18 PDF에서 command entry 전체를 뽑아 version을 맞췄습니다. help와 확장문서에 StataNow-only로 표시된 기능은 현재 환경이 해당 StataNow 기능을 제공할 때만 사용합니다. 다시 빌드하는 데 필요한 maintainer 원문과 `jregress` 보충자료는 작은 source catalog로 보존하고, 요청과 빌드에 쓰지 않는 이전 Stata 19 PDF·중복 정리본은 번들에 두지 않습니다. 논문 code와 log, `jregress` 저자 PDF는 실제 사용 맥락을 돕는 보충자료이며 문법 근거를 대신하지 않습니다.

논문 코드는 실제 연구자가 그 명령을 어떻게 사용했는지 보여 주는 고품질 참고 예시입니다. 현재 프로젝트의 표본과 회귀 사양을 대신하는 template은 아닙니다. 예를 들어 `outreg2` 예시 주변에 `areg`나 `reghdfe`가 있더라도, 현재 모형이 `regress`라면 estimator는 그대로 두고 `outreg2` 사용 부분만 참고합니다.

가까운 예시는 선택한 명령의 앞뒤 흐름을 현재 코드에 맞게 조화시키는 데 활용할 수 있습니다. 연구 환경이 다른 예시는 일반적인 사용 방식만 참고합니다. 원문 log와 artifact 정보도 당시 실행을 이해하기 위한 자료이며, 현재 연구 결과를 대신하지 않습니다.

## 읽기와 실행의 경계

Guard와 mcpStata가 모두 연결됐다면 세션 목록, 메모리 안으로의 데이터 로드, 구조화된 metadata·count·variable·value·row·log·graph 목록과 returned-state 확인 같은 읽기 전용 inspection은 매 행동마다 Phase 2를 다시 받지 않고 진행할 수 있습니다. Material Stata command를 쓰거나 고칠 때, 데이터를 변경·저장할 때, 추정·검정·export를 할 때, 반환 상태를 후속 코드가 실질적으로 소비할 때는 해당 interface의 Phase 2 help를 확인합니다. 같은 command·version·material option·returned interface·downstream use라면 기존 packet을 재사용하며, 주석·layout·literal path·코드 위치만 달라졌다고 다시 조회하지 않습니다.

## Stata 코드 작성 원칙

번들에 포함된 skill은 적절한 command가 명확하면 하나만 고르고, 여러 단계에 서로 다른 command가 필요하거나 실제 대안이 남을 때만 관련 후보를 함께 받아 공식·maintainer 문법, 입력 상태, 출력, tradeoff와 incompatibility를 비교하게 합니다. 핵심 회귀문에는 outcome, treatment·event term, 중요한 sample, controls, fixed effects, weights와 VCE 변수명을 macro로 숨기지 않고 직접 적습니다. Stata의 factor-variable 문법과 raw `e(b)` 이름을 유지하고, 실제 제어흐름 밖의 들여쓰기, 현재 작업에 필요하지 않은 `program`, 깊은 loop, positional dispatcher와 미래용 추상화를 만들지 않습니다.

주요 참고 문서는 다음과 같습니다.

- `skills/stata-replication-workflow/references/general-rules.md`
- `skills/stata-replication-workflow/references/command-evidence.md`
- `skills/stata-replication-workflow/references/authoring-conventions.md`
- `skills/stata-replication-workflow/references/workflow-taxonomy.md`

## 개발 확인

플러그인을 수정한 뒤에는 MCP 응답과 bundle 구성이 정상인지 다음 명령으로 확인합니다. `data/command_source_catalog.json`은 115개 명령의 Stata manual code와 보존할 maintainer 원문을 연결합니다. help를 다시 렌더링할 때는 `scripts/build_command_help_guides.cjs`가 이 catalog에서 Stata용 do-file을 준비하고, 그 do-file을 mcpStata에서 실행한 뒤 같은 스크립트의 `finalize` 단계로 index를 갱신합니다. Stata 18 PDF 원문을 다시 추출할 때는 Poppler `-layout` text를 준비한 뒤 `scripts/build_expanded_command_guides.py`에 해당 폴더를 넘깁니다.

```powershell
node --test tests/server.test.cjs
Get-ChildItem tests\*.test.cjs | ForEach-Object { node --test $_.FullName }
node scripts\verify_plugin_bundle.cjs
```

이 검사는 도구 호출, 선택한 help·code·log 전달과 bundle 구성을 확인합니다.
