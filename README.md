# Stata Research Guard

Stata Research Guard는 Codex가 연구 목적에 맞는 Stata 명령을 고르고, 공식 문법과 실제 논문의 사용 맥락을 확인해 현재 프로젝트용 코드를 작성하도록 돕는 플러그인입니다.

현재 배포 버전은 `0.3.0+codex.20260829163957`입니다.

## 주요 기능

- 109개 canonical Stata command의 역할, 기능, 입력 상태, 출력 형태와 주요 tradeoff를 한눈에 볼 수 있는 command dictionary
- 선택한 명령에 대해서만 제공되는 전체 StataCorp 또는 maintainer guide
- 데이터 준비부터 추정, 결과 저장, 표·그림 작성까지의 흐름을 담은 166개 실제 논문 코드 예시
- 논문 코드와 직접 연결된 경우 함께 제공되는 원문 log와 artifact 정보
- 직접적이고 읽기 쉬운 Stata 코드를 위한 공통 작성 원칙

플러그인은 연구자가 정한 목적과 현재 프로젝트의 맥락을 모델이 해석할 수 있도록 필요한 자료를 제공합니다. 표본, 회귀 사양, fixed effects, VCE와 출력 형식은 모델이 현재 연구에 맞게 결정합니다.

## 작동 방식

`stataResearchGuard` MCP 서버는 `get_stata_command_evidence` 도구 하나를 제공합니다. 이 도구는 세 단계로 사용합니다.

1. 연구 요청을 보내 109개 command dictionary를 읽고 필요한 명령을 고릅니다.
2. 선택한 명령의 전체 guide와 관련 논문 profile 목록을 확인합니다.
3. 도움이 되는 profile의 exact block을 골라 실제 코드, target occurrence, 연결된 원문 log 또는 artifact를 읽습니다.

모든 단계에는 `general-rules.md`가 함께 제공됩니다. 선택한 명령에 전체 guide가 없으면 필요한 자료가 없다고 알리고 작업을 중단합니다. 현재 `cgmreg`와 `jwdidstacked`가 여기에 해당합니다.

## 논문 예시 활용

논문 코드는 선택한 명령이 실제 연구 과정에서 어떻게 쓰였는지 보여 주는 참고 예시입니다. 현재 프로젝트의 연구 설계나 회귀 사양보다 앞서지 않습니다.

예를 들어 `outreg2` 예시 주변에 `areg`나 `reghdfe`가 등장하더라도, 현재 프로젝트가 `regress`를 사용한다면 estimator는 바꾸지 않고 `outreg2`의 표 작성 방식만 참고합니다. 연결된 원문 log와 artifact 역시 당시 실행을 이해하는 자료로 사용합니다.

## 포함된 자료

| 자료 | 수량 |
| --- | ---: |
| Canonical commands | 109 |
| Complete command guides | 107 |
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
