# Stata Research Guard

Stata Research Guard는 모델이 Stata 코드를 스스로 판단해 작성할 수 있도록 근거를 공급하는 Codex 플러그인입니다. 모델이 쓴 코드를 채점하거나, 하나의 명령·template을 정답으로 승격하거나, 연구 설계를 자동 인증하지 않습니다.

현재 배포 버전은 `0.3.0+codex.20260828195056`입니다.

## 제공하는 것

MCP 도구는 `get_stata_command_evidence` 하나입니다. 요청을 기능 단위로 나누어 다음 자료를 반환합니다.

- 기능별 Stata command 후보와 package·alias·입출력 interface
- StataCorp 공식 문서 또는 user-written command maintainer 문서의 실제 구문·예제 발췌
- 기존 프로젝트에서 관찰한 파일, 줄, command, option, 입력·출력, do-file 호출과 estimate handoff
- 특정 논문에서 command가 사용된 문맥. 현재 검토된 paper usage card가 없으면 없다고 명시
- 아직 문서나 현재 프로젝트에서 확인되지 않은 사실

응답에는 winner, 점수, pass/fail, 자동 선택, template 승격 상태가 없습니다. 공식·maintainer 문서는 문법의 권위이고, 논문 코드는 특정 연구 맥락의 사용례입니다. 현재 연구 설계와 구현은 사용자 요구, 프로젝트 사실과 이 근거를 읽은 모델이 결정합니다.

## 작성 원칙

- 기존 프로젝트의 구조와 interface를 먼저 보존합니다.
- 표본, estimand, treatment, fixed effects, VCE와 출력 구조를 추측하지 않습니다.
- Stata의 native factor-variable와 raw `e(b)` 이름을 보존합니다.
- 한 번만 쓰는 framework, registry, dispatcher, 불필요한 `program`과 깊은 loop를 만들지 않습니다.
- 표는 Excel, 그림은 PDF, 재사용 추정치는 `.ster`로 둡니다.
- runtime 관찰, 정적 코드 검토와 연구 설계의 타당성을 서로 다른 사실로 보고합니다.

승인된 `outreg2_xlsx` 다중-sheet formatter는 내부 구현 artifact로 남아 있지만 estimator, outcome, sample, specification이나 sheet grouping을 선택하지 않습니다.

## 설치

```powershell
gh repo clone Plokies-2/stata-research-guard
Set-Location .\stata-research-guard
codex plugin marketplace add (Get-Location).Path
codex plugin add stata-research-guard@stata-research-guard-team
codex plugin list
```

설치 후 새 Codex task를 열어 skill과 MCP 도구를 로드하세요.

## 검증 범위

배포 bundle은 79개 파일의 정확한 inventory와 SHA-256을 기록합니다. 현재 회귀 검증은 Node 19개와 Python 6개이며, MCP transport·schema·경로 containment·근거 비채점 계약·source hash·bundle 무결성을 확인합니다. `outreg2_xlsx`는 실제 StataMP smoke run도 포함합니다. 이 검증은 소프트웨어와 근거 전달 경계를 확인할 뿐, 생성된 연구 코드나 인과추론 결과를 채점하지 않습니다.

플러그인 상세 계약은 [`plugins/stata-research-guard/README.md`](plugins/stata-research-guard/README.md)를 참고하세요.
