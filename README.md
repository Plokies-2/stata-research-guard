# Stata Research Guard

Stata Research Guard는 모델이 현재 연구 상황에 맞는 Stata 코드를 스스로 판단해 작성할 수 있도록 근거를 제공하는 Codex 플러그인입니다. 특정 명령이나 코드를 정답으로 고르거나, 생성 코드를 채점하거나, 연구 설계를 자동 인증하지 않습니다.

현재 배포 버전은 `0.3.0+codex.20260828222007`입니다.

## 핵심 설계

플러그인은 모델의 판단을 대신하지 않고, 판단에 사용할 근거의 범위와 역할을 분명하게 나눕니다.

1. 첫 MCP 호출에서 본문 없이 109개 canonical command 사전과 기능 label을 보여 줍니다.
2. 모델이 사용자의 현재 요구와 프로젝트 문맥을 바탕으로 필요한 명령을 하나 이상 직접 고릅니다.
3. 두 번째 호출에서 선택된 명령의 근거만 반환합니다.
4. 사전에 없는 명령이 반드시 필요하면 비슷한 명령을 추측하거나 기능을 수동 구현하지 않고 중단합니다.

선택 응답에 들어가는 네 근거는 역할이 다릅니다.

| 근거 | 제공하는 정보 | 결정하지 않는 것 |
| --- | --- | --- |
| 전체 가이드북 | 공식 또는 maintainer 문법, option, warning, example, postestimation, stored result와 version semantics | 현재 프로젝트의 estimand, sample, estimator, FE, VCE와 출력 설계 |
| 논문의 고품질 예시 | 선택 명령이 실제 연구 흐름에서 작동하는 앞뒤 문맥 | 재사용할 정답 템플릿과 주변 명령·연구 선택의 강제 |
| 현재 프로젝트 관찰 | 파일, 줄, command, option, 입력·출력, `.do` 호출과 estimate handoff | 기존 관행의 우선순위나 승자 선정 |
| `general-rules.md` | 단순하고 읽기 쉬운 Stata를 위한 공통 작성 원칙 | 점수, 자동 pass/fail 또는 연구 타당성 판정 |

따라서 모델은 현재 요구로 명령을 고르고, 가이드북으로 문법과 의미를 확인하고, 논문 예시로 실제 사용 맥락을 이해한 뒤, general rule에 맞춰 현재 프로젝트용 코드를 작성합니다.

## 전체 가이드북 제공

짧은 발췌만으로는 필요한 option, warning, stored result 또는 postestimation 정보가 빠질 수 있습니다. 이를 피하기 위해 전체 가이드가 준비된 명령은 선택 응답 한 번에 정제된 전문을 자르지 않고 제공합니다.

- 공식 Stata 명령은 StataCorp manual/help를, user-written 명령은 maintainer help·repository·SSC/RePEc 문서를 우선합니다.
- HTML, PDF와 SMCL의 navigation·viewer·presentation 요소만 제거합니다.
- syntax, abbreviation boundary, option 설명, warning, example, postestimation, stored result, reference와 external link는 원래 순서대로 보존합니다.
- source URL·version·commit과 raw/clean SHA-256을 함께 고정합니다.
- 파일 누락, path escape, invalid UTF-8 또는 hash 불일치가 있으면 서버 시작 단계에서 중단합니다.
- discovery에는 가이드 본문을 넣지 않고, 모델이 선택한 명령의 전문만 전달합니다.

전체 가이드 전달 구조는 모든 사전 명령을 받을 수 있도록 구현되어 있지만, 실제 bundle에는 명령별 정제와 독립감사를 통과한 자료만 추가합니다. 현재 포함된 pilot은 `reghdfe` maintainer help 전문입니다. 아직 전체 가이드가 준비되지 않은 명령은 확인된 공식·maintainer 발췌만 사용하며, 누락된 내용을 추측하거나 임의로 축약한 전문을 만들지 않습니다.

## 논문 코드는 템플릿이 아니라 고품질 예시

논문 코드는 문법 권위나 정답 템플릿이 아닙니다. 선택 명령이 실제 연구 코드에서 어떻게 연결되어 작동하는지를 보여 주는 고품질 예시입니다.

- 후보 occurrence 184건을 수기로 전수 검토해 168건을 포함하고 16건을 제외했습니다.
- 고정 줄 수나 sliding window로 자르지 않고, 명령이 실제로 작동하는 데 필요한 문맥을 사람이 판단해 166개 block으로 경계를 정했습니다.
- 고품질 block은 77개 명령을 다루며, 예시가 없는 32개 명령은 guide-only로 명시합니다.
- `outreg2`는 서로 다른 실제 사용 맥락을 보여 줄 수 있도록 고품질 block 4개를 제공합니다.
- materially different variant가 있으면 한 명령에 두 개 이상의 예시를 반환할 수 있습니다.
- raw occurrence, source path, span과 hash는 그대로 보존하고, 미검토 corpus나 기계 분할물을 generation 입력으로 노출하지 않습니다.

예시에서 집중할 부분은 선택된 `focus_command`입니다. 앞뒤 estimator, sample, FE, VCE, output format과 다른 명령은 `reference_context`일 뿐 현재 프로젝트의 선택을 소유하지 않습니다. 예를 들어 현재 코드가 `regress`와 `outreg2`를 골랐다면, `outreg2` 예시에 `areg`가 등장해도 `regress`를 `areg`로 바꾸지 않습니다.

가까운 예시는 선택 명령 주변을 현재 코드와 가이드북 문법에 맞게 최소 수정하는 출발점으로 쓸 수 있습니다. 상황이 먼 예시는 참고만 하고 템플릿처럼 복제하지 않습니다. 논문 예시가 없으면 새 예시를 합성하지 않고 가이드북만 제공합니다.

## 작성 원칙

- 기존 프로젝트의 구조와 호환되는 interface를 우선 보존합니다.
- sample, estimand, treatment, fixed effects, VCE와 output grouping을 추측하지 않습니다.
- Stata의 native factor-variable와 raw `e(b)` 이름을 보존합니다.
- 일회성 framework, registry, dispatcher, 불필요한 `program`과 깊은 loop를 만들지 않습니다.
- scratch 삭제나 output 존재를 재확인하기 위한 `capture confirm file`–`_rc`–`exit` 수동 확인 블록을 프로젝트 `.do`에 넣지 않습니다. 요청된 검증은 실행 세션이나 산출물 감사에서 수행합니다.
- 표는 Excel, 그림은 PDF, 재사용 추정치는 `.ster`로 둡니다.
- runtime 관찰, 정적 검토와 연구·인과 타당성을 서로 다른 판단으로 보고합니다.

승인된 `outreg2_xlsx` 다중-sheet formatter는 내부 구현 artifact로 남아 있지만 estimator, outcome, sample, specification이나 sheet grouping을 선택하지 않습니다.

## 설치

```powershell
gh repo clone Plokies-2/stata-research-guard
Set-Location .\stata-research-guard
codex plugin marketplace add (Get-Location).Path
codex plugin add stata-research-guard@stata-research-guard-team
codex plugin list
```

설치 후 새 Codex task를 열어 갱신된 skill과 MCP 도구를 로드하세요.

## 검증 범위

배포 bundle은 89개 파일의 정확한 inventory와 SHA-256을 기록합니다. 현재 회귀 검증은 Node 24개와 Python 8개이며 다음을 확인합니다.

- MCP transport와 2단계 schema
- 사전 밖 명령 abort와 선택 명령만의 evidence 전달
- 전체 가이드의 source/content hash와 무절단 전달
- 검수 occurrence·index·block·summary·audit의 hash, ID와 command 연결
- project path containment와 근거 비채점 계약
- bundle 무결성과 실제 StataMP `outreg2_xlsx` smoke run

이 검증은 소프트웨어와 근거 전달 경계를 확인할 뿐, 생성된 연구 코드나 인과추론 결과를 채점하지 않습니다.

플러그인의 세부 계약은 [`plugins/stata-research-guard/README.md`](plugins/stata-research-guard/README.md)를 참고하세요.
