# Stata Research Guard

Stata Research Guard는 Codex가 연구 목적에 맞는 Stata 명령을 고르고, 정확한 문법과 실제 연구에서의 사용 맥락을 확인한 뒤 읽기 쉬운 코드를 작성하도록 돕는 플러그인입니다.

플러그인은 명령 사전, 공식·maintainer 가이드, 실제 논문 코드 예시, 공통 작성 원칙을 제공합니다. 표본, 회귀 사양, fixed effects, VCE와 출력 방식 같은 연구 선택은 현재 프로젝트를 이해하는 모델이 맡습니다.

## 제공하는 자료

| 자료 | 내용 | 활용 방식 |
| --- | --- | --- |
| Command dictionary | 109개 canonical Stata command의 역할, 기능, 입력 상태, 출력 형태와 주요 tradeoff | 모델이 현재 작업에 필요한 명령을 고를 때 사용 |
| Full command guide | 107개 명령의 전체 StataCorp 또는 maintainer guide | 선택한 명령의 문법, option, warning, stored result와 postestimation 확인 |
| Paper example | 166개 실제 논문 코드 블록과 target occurrence | 선택한 명령이 데이터 준비, 추정, 저장, 표·그림 작성과 이어지는 방식 참고 |
| Raw log and artifact | 논문 블록과 직접 연결된 12개 원문 log 또는 artifact 정보 | 해당 코드가 남긴 원문 실행 기록과 산출물 위치 확인 |
| General rules | 직접적이고 읽기 쉬운 Stata를 위한 공통 원칙 | 현재 프로젝트용 코드를 작성할 때 함께 적용 |

`cgmreg`와 `jwdidstacked`는 전체 공식·maintainer guide가 준비되어 있지 않습니다. 두 명령을 선택하면 불완전한 자료로 코드를 만들지 않고 필요한 guide가 없다고 알립니다.

## 사용하는 방법

`stataResearchGuard` MCP 서버는 다음 도구 하나를 제공합니다.

```text
get_stata_command_evidence
```

모든 응답에는 `general-rules.md`가 `main_rules`로 함께 들어갑니다. 자료는 세 단계로 불러옵니다.

### 1. 명령 선택

처음에는 연구 요청만 보냅니다.

```json
{
  "request": "패널 자료에서 개체 고정효과 모형을 추정한다."
}
```

응답의 `command_dictionary`에는 109개 명령의 간결한 설명이 담깁니다. 모델은 연구 목적과 현재 프로젝트를 바탕으로 사용할 command key를 직접 고릅니다.

### 2. 선택한 명령의 가이드와 논문 목록 확인

고른 명령을 `selected_commands`에 넣습니다.

```json
{
  "request": "패널 자료에서 개체 고정효과 모형을 추정한다.",
  "selected_commands": ["xtreg"]
}
```

응답에는 `xtreg`의 전체 guide와 관련 논문 profile 목록이 들어갑니다. 이 단계에서는 각 논문의 제목, 연구 맥락, 코드 블록 식별자처럼 예시를 고르는 데 필요한 요약을 확인합니다.

### 3. 필요한 논문 코드 확인

참고할 profile을 정했다면 exact block ID를 보냅니다.

```json
{
  "request": "패널 자료에서 개체 고정효과 모형을 추정한다.",
  "selected_commands": ["xtreg"],
  "selected_block_ids": ["block-139-184-033"]
}
```

응답의 `paper_usage_cards`에는 선택한 실제 코드 블록과 target occurrence가 들어갑니다. 같은 논문 패키지에 직접 연결된 log나 artifact가 있으면 `paper_log_contexts`에 원문 그대로 포함되고, 없으면 빈 배열로 반환됩니다.

## 자료를 읽는 기준

전체 guide는 명령 문법의 기준입니다. 명령의 option, stored result, postestimation과 version별 주의사항은 guide를 따라 확인합니다.

논문 코드는 실제 연구자가 그 명령을 어떻게 사용했는지 보여 주는 고품질 참고 예시입니다. 현재 프로젝트의 표본과 회귀 사양을 대신하는 template은 아닙니다. 예를 들어 `outreg2` 예시 주변에 `areg`나 `reghdfe`가 있더라도, 현재 모형이 `regress`라면 estimator는 그대로 두고 `outreg2` 사용 부분만 참고합니다.

가까운 예시는 선택한 명령의 앞뒤 흐름을 현재 코드에 맞게 조화시키는 데 활용할 수 있습니다. 연구 환경이 다른 예시는 일반적인 사용 방식만 참고합니다. 원문 log와 artifact 정보도 당시 실행을 이해하기 위한 자료이며, 현재 연구 결과를 대신하지 않습니다.

## Stata 코드 작성 원칙

번들에 포함된 skill은 표본, 모형, fixed effects, weights, VCE, event axis와 출력 결정을 실제 명령 가까이에 드러내는 코드를 지향합니다. Stata의 factor-variable 문법과 raw `e(b)` 이름을 유지하고, 현재 작업에 필요하지 않은 `program`, 깊은 loop, positional dispatcher와 사전 package 확인 코드는 만들지 않습니다.

주요 참고 문서는 다음과 같습니다.

- `skills/stata-replication-workflow/references/general-rules.md`
- `skills/stata-replication-workflow/references/command-evidence.md`
- `skills/stata-replication-workflow/references/authoring-conventions.md`
- `skills/stata-replication-workflow/references/workflow-taxonomy.md`

## 개발 확인

플러그인을 수정한 뒤에는 MCP 응답과 bundle 구성이 정상인지 다음 명령으로 확인합니다.

```powershell
node --test tests/server.test.cjs
Get-ChildItem tests\*.test.cjs | ForEach-Object { node --test $_.FullName }
node scripts\verify_plugin_bundle.cjs
```

이 검사는 도구 호출, 선택한 guide·code·log 전달과 bundle 구성을 확인합니다.
