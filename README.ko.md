# Stata Research Guard

<p align="center">
  <img src="assets/research-owl.png" alt="책상에 앉은 부엉이 연구자가 지휘봉으로 방향을 잡고, GPT의 작은 작업 팔이 코드와 결과표를 만드는 모습" width="360">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.4.0-245B78?style=flat-square" alt="Version 0.4.0">
  <img src="https://img.shields.io/badge/Codex-plugin-222222?style=flat-square" alt="Codex plugin">
  <img src="https://img.shields.io/badge/developed_with-Stata_18-1A6B70?style=flat-square" alt="Developed with Stata 18">
  <a href="https://hub.xerj.org/contributors/Plokies-2"><img src="https://hub.xerj.org/contributors/Plokies-2/badge.svg" alt="XERJ Corpus Hub contributor"></a>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-245B78?style=flat-square" alt="English"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/Language-%ED%95%9C%EA%B5%AD%EC%96%B4-245B78?style=flat-square" alt="한국어"></a>
</p>

**연구자가 읽고, 고치고, 이어갈 수 있는 Stata 코드.**

현재 빌드: `0.4.0+codex.2026110102`. [변경 기록](plugins/stata-research-guard/CHANGELOG.md)을 참고하세요.

자료·표본 구성부터 회귀 사양, 추정치 저장, 표·그림까지 연구자가 직접 따라갈 수 있는 Stata 코드를 작성하도록 돕는 Codex 플러그인입니다. 명령 사전, 공식·maintainer 도움말, 실제 논문 코드와 독립 검토를 제공합니다. 연구 선택은 사용자와 모델이 합니다.

[시작하기](#시작하기) · [사용 예시](#사용-예시) · [전체 분석 흐름의 실행 비교](#전체-분석-흐름의-실행-비교) · [문서](#문서) · [문의·버그 제보](https://github.com/Plokies-2/stata-research-guard/issues)

## AI가 이렇게 짠 Stata 코드, Guard를 쓰면 이렇게 달라집니다

새 Codex 세션 하나는 회귀표 셀을 직접 조립하고, 회귀 사양을 중첩 매크로에 담았습니다. Guard를 사용한 별도 세션은 회귀식을 직접 드러내고 표 구성은 Stata에 맡겼습니다. 실제 작성본에서 두 부분을 골랐습니다.

**1. 계수마다 셀 주소를 관리하던 표를 명령에 맡깁니다**

Before · 계수 목록과 모델별 Excel 열을 따로 정하고, 추정치를 셀에 옮깁니다.

```stata
local terms "age grade ttl_exp tenure union 0b.south 1.south 0b.smsa 1.smsa _cons"
local bcols "B D F"
local secols "C E G"

            matrix b = e(b)
            matrix V = e(V)
            local bc : word `spec' of `bcols'
            local sc : word `spec' of `secols'
            local row = 3
            foreach term of local terms {
                local j = colnumb(b, "`term'")
                if `j' < . {
                    putexcel `bc'`row'=(b[1,`j']) `sc'`row'=(sqrt(V[`j',`j']))
                }
                local ++row
            }
```

Guard 적용 후 · 세 모형을 `M1`–`M3`로 다시 불러온 뒤, Stata가 만든 표를 내보냅니다.

```stata
estimates table M1 M2 M3, b(%10.6f) se(%10.6f) stats(N r2 ymean) allbaselevels nofvlabel
putexcel set "tables/`outcome'_`sample'.xlsx", replace open sheet(OLS)
putexcel A1=("`outcome': `sample' sample")
putexcel A3=etable
```

`A3=etable`은 Stata가 구성한 표 전체를 쓰는 명령입니다. 계수·표준오차를 하나씩 꺼내 셀에 배치하지 않습니다.

**2. 매크로를 풀어야 읽히던 회귀식을 직접 보여줍니다**

Before · 세 번째 루프에서 중첩 매크로로 설명변수를 고릅니다.

```stata
local rhs1 "age grade"
local rhs2 "age grade ttl_exp tenure"
local rhs3 "age grade ttl_exp tenure union ib0.south ib0.smsa"

forvalues spec = 1/3 {
    regress `y' `rhs`spec'' `restriction', vce(robust)
}
```

Guard 적용 후 · 세 회귀식의 차이가 그대로 보입니다.

```stata
regress `outcome' age grade `restriction', vce(robust)
regress `outcome' age grade ttl_exp tenure `restriction', vce(robust)
regress `outcome' age grade ttl_exp tenure union i.south i.smsa `restriction', vce(robust)
```

위 코드는 발췌이며, 두 번째 비교에서는 회귀 관련 줄만 보여줍니다. 전체 코드에서 `y`/`outcome`은 `wage ln_wage hours`, `restriction`은 전체·기혼 표본 조건, `spec`은 사양 1–3입니다. 자료 처리·평균 계산·저장·서식을 포함한 [before 전문](examples/fresh-session-workflow/before.do), [after 전문](examples/fresh-session-workflow/after.do)도 공개합니다.

두 작성자는 대화 이력과 예제 코드를 공유하지 않는 별도 Codex 채팅에서 전 과정을 작성·실행했습니다. [동일 과제와 실행 조건](examples/fresh-session-workflow/README.ko.md)에서 확인할 수 있습니다.

## 핵심 특징

| 특징 | 연구에서 하는 일 |
| --- | --- |
| **읽기 쉬운 분석 코드** | 자료 → 표본 → 추정 → 저장 → 표·그림의 흐름을 드러내고 연구자가 변수와 사양을 직접 바꾸기 쉽게 작성합니다. |
| **원문에 근거한 명령 사용** | 공식·maintainer 도움말과 확장 문서에서 필요한 문법·옵션·반환값을 확인합니다. |
| **실제 논문의 앞뒤 문맥** | 명령 한 줄과 함께 자료·표본 구성, 추정치 저장과 후속 출력 코드를 읽습니다. |
| **실행에서 결과 확인까지** | 실제 데이터·로그·표·그림을 읽고 필요한 수정을 이어갑니다. |
| **동료 연구자의 검토** | 실질적인 분석을 추가하거나 분석 구조를 바꿀 때는 별도 문맥의 동료가 코드와 결과를 한 번 읽고 구체적인 개선 의견을 제안합니다. |

기존 분석은 같은 `.do` 파일에서 이어가고 기계적인 반복은 얕은 loop로 정리합니다. 추정 방법·표본·고정효과·추론 방식은 코드 본문에서 읽을 수 있게 유지합니다. 연구자와 모델이 도구에서 확인한 근거를 보고 판단하며 실행 성공과 연구 결과의 타당성을 구분합니다.

## 우리가 겨냥한 문제

실제 분석 코드를 작성하고 고치면서 반복해서 마주친 문제에서 출발했습니다.

| 불편했던 코드 | 작성할 때 확인하는 것 |
| --- | --- |
| 내장 기능의 수동 재구현과 불필요한 설정 추가 | 현재 도구의 기본값·내장 기능·지원 옵션부터 확인합니다. 요구를 이미 충족하면 그대로 사용하고, 지원되지 않는 부분만 구현합니다. 명시적인 사용자·프로젝트·템플릿 요구와 근거 재사용 원칙은 유지합니다. |
| 짧은 변수 목록과 옵션까지 `local`로 흩어져 사양을 따라가기 어려움 | 짧은 목록은 명령이나 바로 둘러싼 loop에 적습니다. 공통 경로, 실제 공유 설정, loop 변수처럼 목적이 분명한 매크로는 유지합니다. |
| 회귀와 저장을 helper·`program` 안에 숨겨 연구자가 바꾸기 어려움 | 추정 명령·표본·통제변수·FE·VCE·저장 경로가 분석 본문에서 보이게 둡니다. |
| 표·그림을 저장하다 실패할 때마다 추정부터 다시 실행 | 완료된 추정과 출력 실패를 구분하고, 적절한 저장 추정치를 복원해 필요한 출력만 다시 만듭니다. |

## 시작하기

Node.js와 플러그인을 지원하는 Codex를 설치한 뒤 PowerShell에서 공개 저장소를 등록하고 플러그인을 설치합니다.

```powershell
codex plugin marketplace add Plokies-2/stata-research-guard --ref main
codex plugin add stata-research-guard@stata-research-guard-team
```

Windows에서는 일반 PowerShell에서 설치 명령을 실행합니다. Codex 기본 사용자 폴더(`%USERPROFILE%\.codex`)를 사용하고, `CODEX_HOME`을 따로 지정한다면 캐시 활성화·경로 길이 오류를 피할 수 있도록 동기화되지 않는 짧은 로컬 경로를 사용하세요.

마켓플레이스 식별자는 `stata-research-guard-team`입니다. 새 Codex 채팅을 열어 플러그인이 활성화되어 있는지 확인하고, `get_stata_command_evidence`로 `regress`의 공식 도움말을 읽어달라고 요청합니다. 실제 도움말 응답이 와야 MCP 연결까지 확인한 것이며, 설치 성공만으로 연결을 확인한 것은 아닙니다. 설치 명령은 [공식 Codex CLI 문서](https://learn.chatgpt.com/docs/developer-commands#codex-plugin-marketplace)를 따릅니다.

연구 파일을 열고 `stata-replication-workflow`로 요청합니다.

```text
$stata-replication-workflow
이 프로젝트의 regression.do와 연결된 자료를 읽고 분석을 이어가줘.
현재 표본·추정 방법·고정효과·표준오차 설정을 유지하고,
실행한 뒤 표본 수와 회귀표를 확인해줘.
```

**필요한 도구:** Codex와 Node.js. 실제 분석 실행과 설치 도움말 조회에는 사용자의 Stata 설치를 사용합니다. Stata 18에서 개발했습니다. 실행 수단은 모델이 작업에 맞춰 기존 runner·Stata 배치·Python 연동 등을 고릅니다.

설치와 MCP 실행 스크립트는 Windows에서 확인했습니다. macOS 호환은 구현과 실행 확인이 필요합니다.

## 사용 예시

아래는 Codex에 보낼 수 있는 요청 예시입니다. 변수명·파일명·산출물은 현재 프로젝트에 맞춰 지정합니다.

**예전에 작성했거나 유지보수가 필요한 코드 검토하기**

기존 코드를 고치기 전에는 `stata-peer-audit`으로 검토를 요청하세요. 연구 동료의 관점에서 코드와 확인 가능한 결과를 읽고, 파일을 직접 수정하지 않으면서 구체적인 유지보수 문제와 개선안을 제안합니다.

```text
$stata-peer-audit
예전에 작성한 analysis.do와 연결된 코드, 확인 가능한 자료·로그·표·그림을 읽어줘.
표본·회귀 사양·저장 결과·출력의 흐름을 이해하고 유지보수하기 어렵게 만드는
부분을 찾아서, 파일·줄 번호와 함께 바꿀 이유를 구체적으로 알려줘.
검토만 하고 파일은 수정하지 마. 현재 연구 선택은 유지해줘.
```

**흩어진 원자료에서 논문용 표·그림까지**

```text
$stata-replication-workflow
원자료 폴더와 프로젝트 README를 읽고 분석을 이어가줘.
병합키와 관측단위를 확인해 분석 패널을 만들고,
README에 정한 표본·회귀 사양·표준오차 설정으로 추정해줘.
추정치는 .ster, 회귀표는 Excel, 그림은 PDF로 저장해줘.
자료에서 표·그림까지 따라갈 수 있게 코드를 쓰고 실제 결과도 확인해줘.
```

**논문 복제 패키지에서 핵심 결과 재현하기**

```text
$stata-replication-workflow
이 논문의 복제 패키지에서 핵심 회귀표와 event-study 그림을 찾아줘.
원자료·표본·추정·출력의 연결을 읽고 원래 사양대로 재현해줘.
명령의 옵션과 반환값은 공식·maintainer 도움말로 확인하고,
논문의 보고값과 실제 실행 결과를 비교해줘.
자료나 패키지 버전 때문에 재현하지 못한 부분은 구체적으로 알려줘.
```

**회귀는 끝났는데 표·그림 저장에서 멈췄다면**

```text
$stata-replication-workflow
회귀 뒤 결과표를 저장하다가 멈췄어. 코드와 로그, 저장된 .ster를 읽고
완료된 추정과 실패한 출력 단계를 구분해줘.
재사용할 수 있는 추정치는 그대로 쓰고 실패한 표·그림만 복구해줘.
현재 회귀 사양과 원자료는 유지하고 실제로 저장된 결과를 확인해줘.
```

## 전체 분석 흐름의 실행 비교

대화 이력을 물려받지 않는 **GPT-6.1 Sol / medium Codex 채팅 두 개**에 동일한 자연어 과제를 전달했습니다. 기존 예제와 서로의 코드는 주지 않았습니다. before에는 비교용이므로 개인·프로젝트 `AGENTS.md`의 코딩 지침, 스킬과 memories를 무시하고 Guard를 사용하지 말라고 명시했습니다. 다른 채팅은 현재 Guard의 지침·도움말·논문 용례를 활용했습니다. 특정 exporter나 루프 구조는 지정하지 않았습니다.

과제는 `nlsw88` 불러오기 → 공통 표본·로그 임금 생성 → **결과변수 3개 × 표본 2개 × robust OLS 사양 3개** → 자료·코드북·회귀표·그림·추정치 저장입니다. 두 코드 모두 **native Stata 배치 실행**으로 전 과정을 마쳤습니다.

| 비교 항목 | Guard 없이 작성 | Guard 적용 |
| --- | ---: | ---: |
| 공개 코드 전체 줄 수 | 146 | 118 |
| 코드북 작성·서식 블록을 제외한 줄 수 | 107 | 91 |
| 회귀 명령을 감싼 루프 중첩 | 3중 | 2중 |
| 계수·SE 셀 직접 매핑 | 있음 | 없음 |
| 실행한 회귀 / 저장한 `.ster` | 18 / 18 | 18 / 18 |
| 전체 / 기혼 표본 수 | 1,865 / 1,214 | 1,865 / 1,214 |
| 분석 DTA / 코드북 XLSX / 회귀표 XLSX / PDF | 1 / 1 / 6 / 3 | 1 / 1 / 6 / 3 |

차이는 회귀식이 직접 보이고 표 구성을 명령에 맡긴다는 점입니다. 전체 분량은 19.2%, 코드북 블록을 빼면 15.0% 줄었습니다. 저장 추정치 18쌍을 모두 다시 읽었고, 계수·robust 표준오차·N·R²는 유효숫자 15자리 표시에서 일치했습니다. 공통 분석 변수 11개의 값도 같았습니다. before는 변수 11개를 저장하고, after는 원자료 변수 17개와 로그 임금을 보존합니다.

회귀표 12개를 모두 읽었고, 각 작성자는 코드북과 렌더링한 PDF를 확인했습니다. before 표는 원래 정밀도의 값과 기준범주의 0을 저장하며, after 표는 소수점 6자리 값과 기준범주 표시 `(base)`를 내보냅니다. 그림 구간과 서식도 다릅니다. 한 과제에서 관찰한 사례이며, 모든 생성 코드가 같은 결과를 낸다는 뜻은 아닙니다.

[before 전문](examples/fresh-session-workflow/before.do) · [after 전문](examples/fresh-session-workflow/after.do) · [동일 과제·줄 수 산정 범위·실행 기록](examples/fresh-session-workflow/README.ko.md). 공개를 위해 before에는 출력 폴더 인자를 추가하고, after에서는 개인 기본 경로만 제거했습니다. 표 작성 방식은 독립 작성본 그대로입니다.

<details>
<summary>예제 실행하기</summary>

저장소 루트에서 Stata로 실행합니다. 기본 제공 데이터와 Mata Excel 인터페이스를 포함한 Stata 내장 명령을 사용하며, user-written exporter나 Python 패키지는 필요하지 않습니다.

```stata
local repo "`c(pwd)'"
capture mkdir "`repo'/tmp"
capture mkdir "`repo'/tmp/fresh-before"
capture mkdir "`repo'/tmp/fresh-after"
do "`repo'/examples/fresh-session-workflow/before.do" "`repo'/tmp/fresh-before"
do "`repo'/examples/fresh-session-workflow/after.do" "`repo'/tmp/fresh-after"
cd "`repo'"
```

각 출력 폴더에 별도로 저장합니다. 실행은 2026-10-22 Stata 18에서 확인했습니다.

</details>

## 제공하는 근거

논문 원문과 출처를 보존하고 일부 구체적인 전달 오류에는 별도로 표시한 `editorial_adaptation`을 함께 제공합니다. 수정 내용과 적용 가정을 확인해 현재 연구에 맞게 판단하며, 원문 실행 로그를 수정 예시의 실행 결과로 해석하지 않습니다. 원문·수정 예시 재사용에는 [출처와 라이선스 고지](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md)가 적용됩니다.

| 자료 | 내용 |
| --- | --- |
| Command index | 115개 명령의 이름, family, 단계와 역할 |
| Command help | Stata가 렌더링한 공식·maintainer 도움말: 기본 topic 5개를 포함해 118개 available, 2개 unavailable |
| Live exact help | 저장된 도움말이 없는 exact topic 또는 명시한 installed 조회를 선택된 Stata 설치에서 수행 |
| Expanded documentation | 69개 공식 Stata 18 PDF entry와 1개 저자 보충문서 |
| Paper example | 166개 원문 코드 블록과 선택 명령의 사용 문맥 |
| Raw log/artifact | 직접 연결된 12개 원문 실행 기록 또는 산출물 정보 |

명령별 블록과 별개로 [workflow 읽기 안내](plugins/stata-research-guard/skills/stata-replication-workflow/references/paper-workflow-reading.md)에서 논문의 원문 파일을 따라가며 전체 분석 흐름을 읽을 수 있습니다.

[짧은 코드 비교 예시](plugins/stata-research-guard/skills/stata-replication-workflow/references/code-examples.md)는 사양을 드러내는 반복, native 예측, 반환값과 해당 결과의 연결, 작은 수정의 범위를 설명합니다. 모형별 요약과 의도한 공통 통계량을 구분하면서 요청한 표본 정책을 보존합니다. 구현을 선택할 때 관련 예시를 참고할 수 있습니다.

<details>
<summary>MCP 도구 직접 사용하기</summary>

`get_stata_command_evidence`로 필요한 명령의 도움말과 논문 용례를 조회합니다. 예를 들어 `regress`의 도움말만 읽으려면 다음과 같이 요청합니다.

```json
{"request":"Read the relevant regression syntax","selected_commands":["regress"],"include_paper_catalog":false}
```

긴 도움말의 구획 선택, 설치 버전 조회, 논문 코드·로그 연결은 [조회 사용법](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md)을 참고하세요.

</details>

<details>
<summary>실행 환경과 패키지 설치 안내</summary>

이 플러그인을 설치하고 활성화하면 지원하는 user-written 명령과 실행에 필요한 의존 패키지를 SSC 또는 공식 maintainer 출처에서 필요할 때 내려받아 주 Stata 환경의 일반 공유 ado 위치에 설치·사용하는 데 동의한 것으로 취급합니다. 사용자가 범위를 제한하면 그 지시를 따릅니다. 명령 전체를 미리 설치하거나 격리된 ado 환경을 만들지 않으며, 이 승인 범위의 설치를 반복 확인하지 않습니다. Codex 자체의 승인 제어를 해제하는 설정은 아닙니다.

연구 결과표는 요청한 출력과 연구 목적에 맞고 결과·추론을 보존하는, 문서화된 표·내보내기 명령으로 작성합니다. 계수·표준오차 행을 수동으로 조립하기 전에 명령이 지원하는 표 기능을 확인합니다. 선택한 명령의 미설치 자체는 추정·추론 방식을 바꾸는 이유가 아닙니다.

도표는 연구 맥락 안에서 읽습니다. 변수·사양·축·통계량·집단을 구분하는 짧은 표지만 남기고, 정의와 상세한 방법은 본문이나 README에 둡니다. 구체적인 오독을 막을 때만 짧은 주석을 쓰며 중복 제목과 과대한 글자를 피합니다.

Stata 18에서 개발했습니다. `CODEX_MCP_NODE_PATH`로 Node 실행 파일을, `STATA_PATH`로 live help용 Stata 실행 파일을 지정할 수 있습니다. 분석 실행에는 현재 환경에서 허용된 기존 실행 스크립트, Stata 배치 실행 또는 공식 Python 연동 등을 사용합니다. 실행 수단 자체가 없으면 가능한 코드 작성·검토를 진행하고 실제 실행하지 못한 범위를 명확히 보고합니다.

플러그인 갱신 뒤에는 Codex를 새로고침하고 새 작업에서 실제 도구 호출을 확인합니다. CLI 설치 성공이나 파일 readback만으로 실행 중인 앱이 새 MCP를 로드했다고 판단하지 않습니다. 새 작업에서도 초기 연결이 실패하면 앱 로그의 시작 오류를 확인하고, 재시작 후 다시 호출합니다. 연구 코드 작성·실행 확인은 이 연결 확인과 구분합니다.

</details>

## 문서

| 하고 싶은 일 | 읽을 문서 |
| --- | --- |
| 분석 작성·수정 시작 | [연구 workflow](plugins/stata-research-guard/skills/stata-replication-workflow/SKILL.md) |
| 코드 구성과 작성 원칙 확인 | [공통 작성 원칙](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md) |
| 실제 논문의 분석 흐름 읽기 | [논문 workflow 읽기](plugins/stata-research-guard/skills/stata-replication-workflow/references/paper-workflow-reading.md) |
| Stata 실행과 산출물 확인 | [실행과 결과 확인](plugins/stata-research-guard/skills/stata-replication-workflow/references/execution-and-results.md) |
| MCP 조회 옵션과 원문 재사용 | [Command evidence](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md) |
| 동료 연구자의 코드·결과 검토 | [Peer audit](plugins/stata-research-guard/skills/stata-peer-audit/SKILL.md) |
| 원문 자료의 출처·이용 조건 확인 | [출처와 라이선스 고지](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md) |

## 기여하기

실증 연구자가 더 편하게 쓸 수 있도록 함께 개선할 분을 찾습니다. 특히 Claude와 macOS 호환 작업에 함께해주시면 좋겠습니다.

- **Claude 환경 호환:** Claude Code 등에서 스킬과 MCP 도구를 사용할 수 있도록 연결·설치 방법을 구현하고 실제 사용 흐름을 확인해주세요.
- **macOS 호환:** Mac의 Stata 실행 경로와 MCP 시작 스크립트, 설치 안내를 정리하고 실제 환경에서 실행을 확인해주세요.

두 환경의 호환성은 아직 확인되지 않았습니다. 재현 가능한 버그 보고, 문서 개선, 연구에서 유용했던 사용 예시도 환영합니다. [Issue](https://github.com/Plokies-2/stata-research-guard/issues)에서 제안하거나 [Pull Request](https://github.com/Plokies-2/stata-research-guard/pulls)로 참여해주세요.

<details>
<summary>개발 시 최소 기능 검사</summary>

변경한 호출·원문 전달·bundle 구성을 확인합니다. 저장소 루트에서 다음과 같이 실행할 수 있습니다.

```powershell
cd plugins/stata-research-guard
node --test tests/server.test.cjs tests/live-help.test.cjs tests/help-sections.test.cjs tests/optional-evidence.test.cjs tests/plugin_bundle_manifest.test.cjs
node scripts/verify_plugin_bundle.cjs
```

이 검사는 호출·원문 전달·설치 구성을 확인합니다. 일반 테스트 실행이 Stata를 직접 실행해 연구 표의 수치·행 구성을 정답과 비교하지 않도록 과거 runtime fixture는 활성 테스트와 배포 묶음에서 분리했습니다. 코드의 가독성이나 연구 타당성은 실제 코드·로그·표·그림을 읽어 판단하며 자동 점수나 합격 판정으로 바꾸지 않습니다.

</details>

## 라이선스

자체 작성한 플러그인 소프트웨어에는 [MIT 라이선스](LICENSE)를 적용합니다. 수록 논문 코드·Stata 문서·maintainer 도움말 등 제3자 자료는 비상업적 이용 제한을 포함한 각 원래 조건을 유지합니다. MIT로 재허가하는 것이 아니며, 자료별 조건은 [제3자 고지](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md)를 따릅니다.
