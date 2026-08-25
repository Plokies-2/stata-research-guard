# Stata Research Guard

연구자가 읽을 수 있는 Stata 코드를 만들고, 재현성을 해치는 실수를 작업 전반에서 막아 주는 Codex 플러그인입니다.

단순한 코드 조각 모음이 아닙니다. 사람이 선별하고 검토한 연구 코드를 130개 checkpoint로 정리해 두었고, 현재 데이터 구조와 작업 상태에 맞는지 비교한 뒤 가져옵니다. 가까운 template이 있으면 필요한 부분만 바꾸고, 맞는 template이 없으면 억지로 끼워 맞추지 않고 좁은 범위의 fallback으로 전환합니다.

현재 배포 버전은 `0.2.0+codex.20260824221905`입니다.

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

- 입력 자료의 형태, 관측 단위, 시간 구조, key와 변수 특성을 비교한 뒤 후보를 고릅니다.
- 서로 다른 대안 template을 임의로 이어 붙이지 않습니다.
- 가장 가까운 후보라도 실제로 맞지 않으면 nonbinding hint로만 참고합니다.
- template 선택과 fallback 사용 구간을 `report.md`에 남겨 나중에 판단 근거를 확인할 수 있습니다.

### 코드 생성 이후까지 점검합니다

- 개별 do-file lint와 여러 파일에 걸친 프로젝트 audit을 제공합니다.
- master call, estimate handoff, Excel sheet 구성과 event-study axis 계약을 함께 검사합니다.
- static lint 결과를 실행 성공으로 포장하지 않습니다.
- 요청한 log, 산출물 개수와 실제 파일 hash를 확인해야 최종 검증으로 인정합니다.

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

## 배포본 검증

```powershell
node plugins/stata-research-guard/scripts/verify_plugin_bundle.cjs `
  --plugin-root plugins/stata-research-guard
```

현재 배포본의 검증 상태는 다음과 같습니다.

- bundle manifest: 191개 파일, 통과
- Node test: 226/226 통과
- Python test: 15/15 통과
- plugin validator와 skill validator: 통과
- private GitHub 원격 clean clone 재검증: 통과
- tracked 개인 절대경로와 비밀정보 pattern: 0건

MCP launcher는 `CODEX_MCP_NODE_PATH`, Codex에 포함된 Node.js, `PATH`의 `node.exe` 순서로 실행 파일을 찾습니다.

## 판단 경계

이 플러그인은 논문이나 분석의 실질적 타당성을 인증하지 않습니다. 정적 검사는 정적 증거이며, 실제 실행과 산출물 검증은 별도로 수행해야 합니다. 회귀식, 표본, 처치 정의와 식별 전략이 확정되지 않았다면 이를 임의로 채우지 않고 연구자의 결정을 기다립니다.
