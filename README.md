# Stata Research Guard

Stata Research Guard는 Codex가 연구 목적에 맞는 Stata 명령을 고르고, 공식 문법과 실제 논문의 사용 맥락을 확인해 현재 프로젝트용 코드를 작성하도록 돕는 플러그인입니다.

현재 배포 버전은 `0.3.0+codex.20260903104025`입니다.

## 주요 기능

- 115개 canonical Stata command의 이름, family, 단계와 역할만 담은 compact command index
- 선택한 명령에 대해서만 제공되는, Stata가 직접 text로 렌더링한 공식 또는 maintainer help
- index 밖의 exact command topic을 Guard MCP가 설치된 Stata에서 직접 찾아 렌더링하는 live help fallback
- help로 충분하지 않을 때 명령별로 골라 받는 69개 공식 Stata 18 PDF command entry와 `jregress` 저자 보충문서
- 데이터 준비부터 추정, 결과 저장, 표·그림 작성까지의 흐름을 담은 166개 실제 논문 코드 예시
- 논문 코드와 직접 연결된 경우 함께 제공되는 원문 log와 artifact 정보
- 직접적이고 읽기 쉬운 Stata 코드를 위한 공통 작성 원칙
- 모든 evidence phase에서 빠짐없이 전달되는 압축 공통 작성 원칙 본문

플러그인은 연구자가 정한 목적과 현재 프로젝트의 맥락을 모델이 해석할 수 있도록 필요한 자료를 제공합니다. 표본, 회귀 사양, fixed effects, VCE와 출력 형식은 모델이 현재 연구에 맞게 결정합니다.

## 작동 방식

`stataResearchGuard` MCP 서버는 `get_stata_command_evidence` 도구 하나를 제공합니다. 이 도구는 세 단계로 사용합니다.

1. 중요한 명령이 아직 불명확할 때만 연구 요청을 보내 공통 규칙과 115개 compact command index를 읽고 필요한 명령을 고릅니다. 명령이 이미 명확하면 Phase 1을 건너뜁니다.
2. 선택한 중요한 명령의 help와 관련 논문 profile 목록을 확인합니다. Index 밖 exact topic이면 Guard MCP가 설치된 Stata help를 조회합니다. `export excel` 같은 실제 Stata 표기는 내부 key로 투명하게 연결되고, `global`·`local` 등은 공식 `macro` help로 연결됩니다.
3. help로 충분하지 않으면 `expanded: true`와 exact `expanded_commands` subset으로 필요한 명령의 Stata 18 확장문서만 받고, 도움이 되는 profile이 있을 때는 exact block의 원문 코드와 연결 log 또는 artifact를 독립적으로 선택합니다.

`general-rules.md` 본문과 path, SHA-256은 모든 Phase에서 전달됩니다. 따라서 명령을 이미 알아 Phase 1을 건너뛰고 Phase 2로 바로 가도 공통 작성 원칙이 빠지지 않습니다. Phase 2는 help와 compact paper profile만 전달하고, 긴 확장문서와 raw paper code는 주입하지 않습니다. help가 사용자가 하려는 행동을 모두 설명하고, 코드가 직접 따라 나오며 어렵지 않고, version·option 상호작용·returned result·후속 interface에 중요한 의문이 없으면 추가 자료 없이 작성합니다. 그렇지 않으면 결합 Phase 3에서 긴 문서가 필요한 등록 명령만 `expanded_commands`로 고르고, 논문 예시도 필요할 때만 별도로 고릅니다. 문서만, 논문만, 둘을 함께 요청할 수 있습니다.

기존 분석, robustness check, placebo, permutation 또는 export를 보존하라는 요청은 그 자체로 새 runtime mode, positional argument, dispatcher 또는 조건 분기를 만들라는 뜻이 아닙니다. 그런 interface는 사용자가 명시적으로 요청했거나 현재 프로젝트가 이미 요구할 때만 추가합니다.

두 MCP가 호출 가능한 상태라면 데이터·코드·기존 로그·표·그림의 읽기 전용 확인은 매번 Phase 2를 거치지 않아도 됩니다. 읽기 전용 설명, 주석·formatting만의 수정, literal 교체와 기존 block의 그대로 이동도 lookup 대상이 아닙니다. Material command 작성·수정, 데이터 변경·저장, 추정·검정, export와 중요한 returned result 해석 전에는 관련 interface의 Phase 2 근거를 확인합니다.

115개 명령 가운데 113개는 Stata 18 범위의 help가 완비되어 있습니다. `collect_style`은 Stata 18에서 확인되는 19개 help topic을 모두 담고, Stata 19에서 새로 추가된 `collect style smcl`과 `collect style txt`는 Stata 18 문법에 섞지 않습니다. 설치된 `areg`와 `xtreg` 문서에 함께 표시되는 StataNow-only 기능은 base Stata 18 기능으로 취급하지 않습니다. `jregress`와 `jwdidstacked`는 확인 가능한 help를 찾지 못해 미제공으로 표시됩니다. `jregress` 저자 PDF는 확장 단계의 보충 설명으로만 제공하고, `cgmreg`는 Judson Caskey가 관리하는 배포본의 help와 그 출처 한계를 함께 기록했습니다.

Index 밖 live help는 mcpStata의 help 기능을 복구한 것이 아닙니다. Guard 서버가 exact topic만 받아 설치된 Stata의 `.sthlp` 또는 `.hlp`를 찾고 `smcl2txt`로 렌더링합니다. 찾지 못하면 그 topic만 unavailable로 남기며 다른 명령의 근거 반환은 계속합니다.

## 논문 예시 활용

논문 코드는 선택한 명령이 실제 연구 과정에서 어떻게 쓰였는지 보여 주는 참고 예시입니다. 현재 프로젝트의 연구 설계나 회귀 사양보다 앞서지 않습니다.

예를 들어 `outreg2` 예시 주변에 `areg`나 `reghdfe`가 등장하더라도, 현재 프로젝트가 `regress`를 사용한다면 estimator는 바꾸지 않고 `outreg2`의 표 작성 방식만 참고합니다. 연결된 원문 log와 artifact 역시 당시 실행을 이해하는 자료로 사용합니다.

## 포함된 자료

| 자료 | 수량 |
| --- | ---: |
| Canonical commands | 115 |
| Command help content | 113 (Stata 18 scope complete) |
| Commands without help | 2 |
| Stata 18 official expanded entries | 69 |
| Author supplement | 1 (`jregress`) |
| Paper profiles and code blocks | 166 |
| Optional raw log or artifact attachments | 12 |
| Bundle files | 319 |
| Automated smoke/runtime tests | 30 |

## 설치

```powershell
gh repo clone Plokies-2/stata-research-guard
Set-Location .\stata-research-guard
codex plugin marketplace add (Get-Location).Path
codex plugin add stata-research-guard@stata-research-guard-team
```

설치 후 새 Codex task를 열면 갱신된 skill과 MCP 서버를 사용할 수 있습니다.

도구 호출 예시와 자료별 활용 방법은 [`plugins/stata-research-guard/README.md`](plugins/stata-research-guard/README.md)에 설명되어 있습니다.
