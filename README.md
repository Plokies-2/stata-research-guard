# Stata Research Guard

Stata Research Guard는 모델이 Stata 코드를 스스로 판단해 작성할 수 있도록 근거를 공급하는 Codex 플러그인입니다. 모델이 쓴 코드를 채점하거나, 하나의 명령·template을 정답으로 승격하거나, 연구 설계를 자동 인증하지 않습니다.

현재 배포 버전은 `0.3.0+codex.20260828211411`입니다.

## 제공하는 것

MCP 도구는 `get_stata_command_evidence` 하나입니다. 첫 호출은 109개 canonical command 사전을 보여 주고, 모델이 하나 이상의 명령을 직접 고른 뒤 두 번째 호출에서 선택된 명령의 자료만 반환합니다. 사전에 없는 명령이 필요하면 임의 구현이나 대체 없이 중단하고 누락 기능을 보고합니다.

- 109개 Stata command의 canonical key·invocation·기능 label
- 선택된 명령의 package·alias·입출력 interface
- StataCorp 공식 문서 또는 user-written command maintainer 문서의 실제 구문·예제 발췌
- 기존 프로젝트에서 관찰한 파일, 줄, command, option, 입력·출력, do-file 호출과 estimate handoff
- 함께 설치된 검수 occurrence·109-command index에서 선택 명령에 정확히 연결된 수정하지 않은 논문 원문 occurrence. 검수본이 없으면 guide-only fallback을 명시
- 모든 명령에 공통으로 적용되는 간결한 `general-rules.md`
- 아직 문서나 현재 프로젝트에서 확인되지 않은 사실

응답에는 winner, 점수, pass/fail, 자동 선택, template 승격 상태가 없습니다. 공식·maintainer 문서는 문법의 권위이고, 논문 코드는 선택 명령의 실제 사용 예시입니다. 주변 estimator와 연구 설계는 참고 문맥일 뿐 현재 프로젝트의 선택을 덮어쓰지 않습니다. 가까운 예시는 선택 명령 주변을 조화시키는 출발점으로, 먼 예시는 비구속적 참고로 사용합니다.

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

배포 bundle은 80개 파일의 정확한 inventory와 SHA-256을 기록합니다. 현재 회귀 검증은 Node 23개와 Python 6개이며, MCP transport·2단계 schema·사전 밖 명령 abort·선택 명령만의 evidence·검수 occurrence/index의 hash·ID·command 연결·경로 containment·근거 비채점 계약·source hash·bundle 무결성을 확인합니다. `outreg2_xlsx`는 실제 StataMP smoke run도 포함합니다. 이 검증은 소프트웨어와 근거 전달 경계를 확인할 뿐, 생성된 연구 코드나 인과추론 결과를 채점하지 않습니다.

플러그인 상세 계약은 [`plugins/stata-research-guard/README.md`](plugins/stata-research-guard/README.md)를 참고하세요.
