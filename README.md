# Stata Research Guard

Stata Research Guard는 Codex가 연구 목적에 맞는 Stata 명령을 고르고, 공식 문법과 실제 논문의 사용 맥락을 확인해 현재 프로젝트용 코드를 작성하도록 돕는 플러그인입니다.

현재 배포 준비 버전은 `0.3.0+codex.20260829223728`입니다.

## 주요 기능

- 109개 canonical Stata command의 역할, 기능, 입력 상태, 출력 형태와 주요 tradeoff를 한눈에 볼 수 있는 command dictionary
- 선택한 명령에 대해서만 제공되는, Stata가 직접 text로 렌더링한 공식 또는 maintainer help
- help로 충분하지 않을 때 명령별로 골라 받는 63개 공식 Stata 18 PDF command entry와 `jregress` 저자 보충문서
- 데이터 준비부터 추정, 결과 저장, 표·그림 작성까지의 흐름을 담은 166개 실제 논문 코드 예시
- 논문 코드와 직접 연결된 경우 함께 제공되는 원문 log와 artifact 정보
- 직접적이고 읽기 쉬운 Stata 코드를 위한 공통 작성 원칙

플러그인은 연구자가 정한 목적과 현재 프로젝트의 맥락을 모델이 해석할 수 있도록 필요한 자료를 제공합니다. 표본, 회귀 사양, fixed effects, VCE와 출력 형식은 모델이 현재 연구에 맞게 결정합니다.

## 작동 방식

`stataResearchGuard` MCP 서버는 `get_stata_command_evidence` 도구 하나를 제공합니다. 이 도구는 세 단계로 사용합니다.

1. 연구 요청을 보내 109개 command dictionary를 읽고 필요한 명령을 고릅니다.
2. 선택한 명령의 help와 관련 논문 profile 목록을 확인합니다.
3. help로 충분하지 않으면 `expanded: true`와 exact `expanded_commands` subset으로 필요한 명령의 Stata 18 확장문서만 받고, 도움이 되는 profile이 있을 때는 exact block의 원문 코드와 연결 log 또는 artifact를 독립적으로 선택합니다.

모든 단계에는 `general-rules.md`가 함께 제공됩니다. Phase 2는 help와 compact paper profile만 전달하고, 긴 확장문서와 raw paper code는 주입하지 않습니다. help가 사용자가 하려는 행동을 모두 설명하고, 코드가 직접 따라 나오며 어렵지 않고, version·option 상호작용·returned result·후속 interface에 중요한 의문이 없으면 추가 자료 없이 작성합니다. 그렇지 않으면 결합 Phase 3에서 긴 문서가 필요한 명령만 `expanded_commands`로 고르고, 논문 예시도 필요할 때만 별도로 고릅니다. 문서만, 논문만, 둘을 함께 요청할 수 있습니다.

109개 명령 가운데 107개는 Stata 18 범위의 help가 완비되어 있습니다. `collect_style`은 Stata 18에서 확인되는 19개 help topic을 모두 담고, Stata 19에서 새로 추가된 `collect style smcl`과 `collect style txt`는 Stata 18 문법에 섞지 않습니다. 설치된 `areg`와 `xtreg` 문서에 함께 표시되는 StataNow-only 기능은 base Stata 18 기능으로 취급하지 않습니다. `jregress`와 `jwdidstacked`는 확인 가능한 help를 찾지 못해 미제공으로 표시됩니다. `jregress` 저자 PDF는 확장 단계의 보충 설명으로만 제공하고, `cgmreg`는 Judson Caskey가 관리하는 배포본의 help와 그 출처 한계를 함께 기록했습니다.

## 논문 예시 활용

논문 코드는 선택한 명령이 실제 연구 과정에서 어떻게 쓰였는지 보여 주는 참고 예시입니다. 현재 프로젝트의 연구 설계나 회귀 사양보다 앞서지 않습니다.

예를 들어 `outreg2` 예시 주변에 `areg`나 `reghdfe`가 등장하더라도, 현재 프로젝트가 `regress`를 사용한다면 estimator는 바꾸지 않고 `outreg2`의 표 작성 방식만 참고합니다. 연결된 원문 log와 artifact 역시 당시 실행을 이해하는 자료로 사용합니다.

## 포함된 자료

| 자료 | 수량 |
| --- | ---: |
| Canonical commands | 109 |
| Command help content | 107 (Stata 18 scope complete) |
| Commands without help | 2 |
| Stata 18 official expanded entries | 63 |
| Author supplement | 1 (`jregress`) |
| Paper profiles and code blocks | 166 |
| Optional raw log or artifact attachments | 12 |

## 설치

```powershell
gh repo clone Plokies-2/stata-research-guard
Set-Location .\stata-research-guard
codex plugin marketplace add (Get-Location).Path
codex plugin add stata-research-guard@stata-research-guard-team
```

설치 후 새 Codex task를 열면 갱신된 skill과 MCP 서버를 사용할 수 있습니다.

도구 호출 예시와 자료별 활용 방법은 [`plugins/stata-research-guard/README.md`](plugins/stata-research-guard/README.md)에 설명되어 있습니다.
