# Stata Research Guard

<p align="center">
  <img src="assets/research-owl.png" alt="책상에 앉은 부엉이 연구자가 지휘봉으로 방향을 잡고, GPT의 작은 작업 팔이 코드와 결과표를 만드는 모습" width="240">
</p>

<p align="center">
  <a href="https://github.com/Plokies-2/stata-research-guard/releases/latest"><img src="https://img.shields.io/badge/version-0.5.1-245B78?style=flat-square" alt="Version 0.5.1"></a>
  <img src="https://img.shields.io/badge/works_with-Codex_%7C_Claude_Code-222222?style=flat-square" alt="Works with Codex and Claude Code">
  <img src="https://img.shields.io/badge/developed_with-Stata_18-1A6B70?style=flat-square" alt="Developed with Stata 18">
  <a href="https://hub.xerj.org/contributors/Plokies-2"><img src="https://hub.xerj.org/contributors/Plokies-2/badge.svg" alt="XERJ Corpus Hub contributor"></a>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-245B78?style=flat-square" alt="English"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/Language-%ED%95%9C%EA%B5%AD%EC%96%B4-245B78?style=flat-square" alt="한국어"></a>
</p>

<h3 align="center">신중한 공저자가 쓴 것처럼 읽히는, AI가 쓴 Stata 코드.</h3>

<p align="center">
  모든 회귀는 실행되는 자리에서 표본, 통제변수, 고정효과, 표준오차를 보여줍니다.<br>
  명령 선택은 실제 도움말로 확인하고, 모든 수정은 검토를 거쳐 diff로 보여줍니다.
</p>

<p align="center">
  <a href="#1분-설치">설치</a> ·
  <a href="#guard-사용-전후">Guard 사용 전후</a> ·
  <a href="#모든-수정은-diff로-한-줄씩-검사받고-돌아옵니다">diff와 검사</a> ·
  <a href="#guard가-판단하는-방식">판단 방식</a> ·
  <a href="#guard가-지키는-것">지키는 것</a> ·
  <a href="#써-보기">사용 예시</a> ·
  <a href="#문서">문서</a> ·
  <a href="https://github.com/Plokies-2/stata-research-guard/issues">문의</a>
</p>

---

## 왜 필요한가

AI 코딩 에이전트가 쓴 Stata는 *돌아는 갑니다*. 하지만 연구자가 확인하고, 고치고, 재현 담당자에게 넘길 수 있는 코드와는 다릅니다. 그냥 두면 에이전트는 흔히 이렇게 씁니다.

- 통제변수를 회귀문에서 멀리 떨어진 숫자 붙은 `local`에 숨겨, 모형 `m3`가 실제로 무엇인지 보이지 않게 합니다.
- `etable`, `esttab`, `collect`가 이미 해 주는 표를 `putexcel`로 셀마다 다시 조립합니다.
- 기존 전역변수에 이미 있는 변수 목록을 새 전역변수로 또 만들거나, 첫 `collapse` 옆에 두 번째 `collapse`를 추가합니다.
- 표 내보내기 하나가 실패하면 회귀를 전부 다시 돌립니다.
- 작업 흐름을 담당하는 파일을 고치는 대신 `analysis_v2.do`, `analysis_fix.do` 같은 형제 스크립트를 늘립니다.

Stata Research Guard는 **Codex**와 **Claude Code**용 플러그인으로, 에이전트를 반대 방향으로 이끕니다. 사양은 보이게, 명령은 문서대로, 추정치는 저장하고, 작업 흐름마다 유지하는 `.do`는 하나로 두며, 보고하기 전에 수정한 구간을 다시 검토합니다. 연구 선택은 사용자에게 남깁니다.

에이전트용 Stata 도구는 대개 할 수 있는 일을 늘립니다. 문법을 더 알려 주고, Stata를 실행하게 하고, 분석 방법을 자동화합니다. Guard는 반대로 절제를 더합니다. 시키지 않은 일은 하지 않게 하고, 모든 연구 결정을 눈에 보이는 자리에 남깁니다.

## 1분 설치

Node.js와 플러그인을 지원하는 Codex 또는 Claude Code가 필요합니다. 두 환경 모두 `plugins/stata-research-guard`의 같은 묶음을 설치합니다.

**Claude Code**

```powershell
claude plugin marketplace add Plokies-2/stata-research-guard
claude plugin install stata-research-guard@stata-research-guard-team
```

세션 안에서는 `/plugin marketplace add Plokies-2/stata-research-guard`와 `/plugin install stata-research-guard@stata-research-guard-team`로 같은 일을 할 수 있습니다.

**Codex** (PowerShell)

```powershell
codex plugin marketplace add Plokies-2/stata-research-guard --ref main
codex plugin add stata-research-guard@stata-research-guard-team
```

**연결 확인:** 새 대화를 열고 `get_stata_command_evidence`로 `regress`의 공식 도움말을 가져오라고 요청하세요. 도움말이 오면 Guard MCP 서버가 연결된 것입니다. 설치가 성공했다는 것만으로는 연결을 확인할 수 없습니다.

<details>
<summary>Codex: 경로, 훅 신뢰, 문제 해결</summary>

Windows에서는 일반 PowerShell 터미널에서 설치하세요. Codex 기본 사용자 폴더(`%USERPROFILE%\.codex`)를 쓰고, `CODEX_HOME`을 따로 지정했다면 캐시 활성화와 경로 길이 오류를 피하도록 동기화 폴더 밖의 짧은 로컬 경로를 고르세요. 이 명령은 [Codex CLI 공식 문서](https://learn.chatgpt.com/docs/developer-commands#codex-plugin-marketplace)를 따릅니다.

검토와 diff 알림을 켜려면 **Settings → Hooks** 또는 CLI의 `/hooks`에서 플러그인의 `PreToolUse`, `PostToolUse`, `Stop` 훅을 검토하고 신뢰하세요. 플러그인을 갱신할 때마다 다시 신뢰하세요. 훅 파일이 바뀌어도 Codex는 경고하지 않고, 다시 신뢰할 때까지 훅을 건너뜁니다. 편집 뒤 훅 안내가 오지 않으면 에이전트가 그 사실을 알리고 검사를 직접 돌립니다. `PreToolUse` 항목은 Claude Code에서 쓰며, Codex에서는 아무것도 반환하지 않습니다. [Codex 훅 신뢰](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)

플러그인을 업데이트한 뒤에는 Codex를 새로 고치고 새 작업에서 도구를 호출하세요. 그래도 연결되지 않으면 앱 시작 로그를 확인하고 재시작한 뒤 다시 시도하세요.

</details>

<details>
<summary>Claude Code: MCP 실행과 훅</summary>

Claude Code 매니페스트(`.claude-plugin/plugin.json`)는 `node`로 MCP 서버를 직접 실행합니다. 실시간 도움말에 특정 Stata 실행 파일을 쓰려면 `STATA_PATH`를 지정하세요. 훅은 `Edit`, `Write`, `MultiEdit`로 바꾼 유지 대상 `.do`와, `Bash`나 `PowerShell` 명령으로 다시 쓴 `.do`(명령 전후 수정 시각 비교)를 감지합니다. 훅 상태는 플러그인 데이터 폴더에 저장됩니다. [Claude Code 플러그인](https://code.claude.com/docs/en/plugins)

</details>

**Stata:** 분석 실행과 실시간 도움말은 사용자의 Stata를 씁니다(Stata 18로 개발). 특정 Stata 연동은 필요하지 않습니다. 에이전트는 기존 실행기, Stata batch mode, 공식 Python 연동처럼 쓸 수 있는 경로를 고릅니다. 실행 경로가 전혀 없어도 코드를 쓰고 검토할 수 있으며, 무엇을 실행하지 못했는지 밝힙니다. 설치와 MCP 실행기는 Windows에서 확인했고, macOS는 아직 확인하지 않았습니다.

## Guard 사용 전후

같은 과제를 새로 시작한 AI 세션 두 개에 주었습니다. 하나는 Guard 없이, 하나는 Guard와 함께. `nlsw88`을 불러와 결과변수 3개에 강건 OLS 사양 2개를 추정하고, 결과변수마다 계수, 표준오차, N, R², 결과변수 평균을 담은 회귀표를 내보내는 과제입니다. codebook, 히스토그램, 추정치 저장도 과제에 포함됐습니다. 아래는 두 스크립트 전체입니다.

### [Guard 없이](examples/independent-workflow/before.do): 셀을 하나하나 손으로 배치 (75줄)

```stata
version 18.0
clear all
set more off
args output_dir
cd "`output_dir'"

* Keep one complete, positive-wage and positive-hours sample for every model.
sysuse nlsw88, clear
count
local n_original = r(N)
keep if !missing(wage, hours, age, grade, ttl_exp, tenure, union) ///
    & wage > 0 & hours > 0
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
order wage ln_wage hours age grade ttl_exp tenure union
count
local n_analysis = r(N)
display as text "Original observations: `n_original'"
display as text "Common analysis observations: `n_analysis'"
assert !missing(wage, ln_wage, hours, age, grade, ttl_exp, tenure, union)
isid idcode
summarize wage ln_wage hours age grade ttl_exp tenure union
save "nlsw88_analysis.dta", replace

* Record the derived variable and the input fields used to construct the sample.
putexcel set "codebook.xlsx", replace
putexcel A1=("Variable") B1=("Definition") C1=("Source") D1=("Unit") E1=("Missing-value treatment")
putexcel A2=("wage") B2=("Hourly wage") C2=("Stata nlsw88.wage") D2=("US dollars per hour") E2=("Required observed and >0")
putexcel A3=("ln_wage") B3=("Natural logarithm of wage") C3=("Generated as ln(wage) from nlsw88.wage") D3=("log US dollars per hour") E3=("Computed only after complete-case selection and wage>0; no missing values remain")
putexcel A4=("hours") B4=("Hours worked per week") C4=("Stata nlsw88.hours") D4=("hours per week") E4=("Required observed and >0")
putexcel A5=("age") B5=("Respondent age") C5=("Stata nlsw88.age") D5=("years") E5=("Required observed")
putexcel A6=("grade") B6=("Highest grade completed") C6=("Stata nlsw88.grade") D6=("years of schooling") E6=("Required observed")
putexcel A7=("ttl_exp") B7=("Total work experience") C7=("Stata nlsw88.ttl_exp") D7=("years") E7=("Required observed")
putexcel A8=("tenure") B8=("Job tenure") C8=("Stata nlsw88.tenure") D8=("years") E8=("Required observed")
putexcel A9=("union") B9=("Union membership") C9=("Stata nlsw88.union") D9=("indicator (0/1)") E9=("Required observed")
putexcel A11=("Sample rule") B11=("Complete on all seven source variables, wage>0, hours>0")
putexcel A12=("Original N") B12=(`n_original')
putexcel A13=("Analysis N") B13=(`n_analysis')

foreach outcome in wage ln_wage hours {
    histogram `outcome', percent title("Distribution of `outcome'") ///
        xtitle("`outcome'") ytitle("Percent") name(g_`outcome', replace)
    graph export "`outcome'_distribution.pdf", replace
    graph drop g_`outcome'

    putexcel set "`outcome'_regression.xlsx", replace
    putexcel A1=("Outcome: `outcome'")
    putexcel A2=("Term") B2=("Model 1: age, grade") C2=("Model 2: age, grade, ttl_exp, tenure, union")
    putexcel A3=("Coefficient followed by robust standard error")
    putexcel A4=("age") A5=("Robust SE") A6=("grade") A7=("Robust SE")
    putexcel A8=("ttl_exp") A9=("Robust SE") A10=("tenure") A11=("Robust SE")
    putexcel A12=("union") A13=("Robust SE") A14=("Constant") A15=("Robust SE")
    putexcel A16=("N") A17=("R-squared") A18=("Outcome mean in regression sample")

    regress `outcome' age grade, vce(robust)
    estimates save "`outcome'_m1.ster", replace
    local model_n = e(N)
    local model_r2 = e(r2)
    quietly summarize `outcome' if e(sample)
    local outcome_mean = r(mean)
    putexcel B4=(_b[age]) B5=(_se[age]) B6=(_b[grade]) B7=(_se[grade])
    putexcel B14=(_b[_cons]) B15=(_se[_cons])
    putexcel B16=(`model_n') B17=(`model_r2') B18=(`outcome_mean')

    regress `outcome' age grade ttl_exp tenure union, vce(robust)
    estimates save "`outcome'_m2.ster", replace
    local model_n = e(N)
    local model_r2 = e(r2)
    quietly summarize `outcome' if e(sample)
    local outcome_mean = r(mean)
    putexcel C4=(_b[age]) C5=(_se[age]) C6=(_b[grade]) C7=(_se[grade])
    putexcel C8=(_b[ttl_exp]) C9=(_se[ttl_exp]) C10=(_b[tenure]) C11=(_se[tenure])
    putexcel C12=(_b[union]) C13=(_se[union]) C14=(_b[_cons]) C15=(_se[_cons])
    putexcel C16=(`model_n') C17=(`model_r2') C18=(`outcome_mean')
}
```

### [Guard 사용](examples/independent-workflow/after.do): Stata가 이미 만드는 표 그대로 (63줄)

```stata
version 18.0
clear all
set more off
capture log close _all
args output_dir
cd "`output_dir'"
log using "run_details.log", text replace

* The same complete-case sample supports all three outcomes and both OLS specifications.
sysuse nlsw88, clear
describe wage hours age grade ttl_exp tenure union
count
keep if !missing(wage, hours, age, grade, ttl_exp, tenure, union) & wage > 0 & hours > 0
count
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
assert !missing(ln_wage)
save "nlsw88_analysis.dta", replace

* Record the derived variable and its original Stata source in a five-column codebook.
putexcel set "codebook.xlsx", sheet("Variables") replace open
putexcel A1 = "varname"
putexcel B1 = "Item"
putexcel C1 = "Item Name"
putexcel D1 = "format / unit"
putexcel E1 = "note"
putexcel A2 = "ln_wage"
putexcel C2 = "Natural logarithm of hourly wage"
putexcel D2 = "Natural log of wage's original hourly monetary unit"
putexcel E2 = "Source: Stata sysuse nlsw88, wage. Generated as ln(wage) after retaining observations with nonmissing wage, hours, age, grade, ttl_exp, tenure and union, wage>0, hours>0. No missing ln_wage remains in the saved analysis data."
putexcel A1:E1, bold font("Malgun Gothic", 11)
putexcel A2:E2, font("Malgun Gothic", 10) txtwrap
putexcel save
* Set readable widths after Stata has written the five codebook fields.
shell python -c "from openpyxl import load_workbook; p='codebook.xlsx'; w=load_workbook(p); s=w.active; s.column_dimensions['A'].width=17; s.column_dimensions['B'].width=12; s.column_dimensions['C'].width=38; s.column_dimensions['D'].width=55; s.column_dimensions['E'].width=95; s.row_dimensions[2].height=62; s.freeze_panes='A2'; w.save(p)"

* Each outcome uses the identical saved sample; its mean is attached to each fitted model.
foreach y in wage ln_wage hours {
    regress `y' age grade, vce(robust)
    quietly summarize `y' if e(sample), meanonly
    local mean_y = r(mean)
    estimates store `y'_short
    estimates save "`y'_short.ster", replace

    regress `y' age grade ttl_exp tenure union, vce(robust)
    assert e(N) == _N
    estimates store `y'_full
    estimates save "`y'_full.ster", replace

    etable, estimates(`y'_short `y'_full) column(estimates) ///
        mstat(N, label("N")) mstat(r2, label("R-squared")) ///
        mstat(mean_y=`mean_y', label("Outcome mean")) ///
        title("`y': OLS with robust standard errors") ///
        note("Common complete-case sample; standard errors in parentheses.") ///
        export("table_`y'.xlsx", replace)

    histogram `y', frequency bins(30) ///
        title("Distribution of `y'") xtitle("`y'") ytitle("Number of observations") ///
        xsize(8) ysize(5)
    graph export "distribution_`y'.pdf", replace
}

log close
```

<sub>두 스크립트 전체를 공개본 그대로 실었습니다. [과제와 실행 기록](examples/independent-workflow/README.ko.md)</sub>

왼쪽에 통제변수를 하나 추가하면 두 열의 행 번호를 손으로 다시 매겨야 합니다. 오른쪽은 `regress` 줄에 추가하면 끝입니다. 숫자는 같습니다. 두 세션 모두 같은 1,865개 관측치를 골랐고, 저장된 추정치 여섯 쌍의 계수, 강건 표준오차, N, R²가 유효숫자 15자리까지 일치했습니다.

**규모를 키워도 같습니다.** 결과변수 3개 × 표본 2개 × 사양 3개(회귀 18개)로 돌린 두 번째 실행에서도 같은 양상이 나왔습니다. 통제변수는 숫자 붙은 매크로 대신 각 `regress` 줄에 적혔고, 셀 단위 기록 대신 `putexcel A3=etable`로 Stata의 표를 그대로 내보냈으며, 추정치 18쌍이 모두 일치했습니다. [before 전체](examples/fresh-session-workflow/before.do) · [after 전체](examples/fresh-session-workflow/after.do) · [과제와 실행 기록](examples/fresh-session-workflow/README.ko.md)

관찰한 두 사례이며, 모든 생성 코드에 대한 보장은 아닙니다.

<details>
<summary>예제 직접 실행하기</summary>

저장소 루트에서 Stata로 실행합니다. 두 쌍 모두 Stata 내장 자료를 씁니다. independent-workflow의 after 스크립트는 codebook 열 너비 설정에 `openpyxl`이 설치된 `python`도 호출합니다.

```stata
local repo "`c(pwd)'"
foreach d in tmp tmp/independent-before tmp/independent-after tmp/fresh-before tmp/fresh-after {
    capture mkdir "`repo'/`d'"
}
do "`repo'/examples/independent-workflow/before.do" "`repo'/tmp/independent-before"
do "`repo'/examples/independent-workflow/after.do" "`repo'/tmp/independent-after"
do "`repo'/examples/fresh-session-workflow/before.do" "`repo'/tmp/fresh-before"
do "`repo'/examples/fresh-session-workflow/after.do" "`repo'/tmp/fresh-after"
cd "`repo'"
```

Stata 18에서 실행을 확인했습니다. 공개본은 원본과 출력 경로 처리만 다르며, fresh-session after 스크립트는 codebook을 영어로 옮겼습니다. 자세한 내용은 각 예제의 기록을 보세요.

</details>

## 모든 수정은 diff로, 한 줄씩 검사받고 돌아옵니다

에이전트가 `.do` 파일을 고치면, 답변이 오기 전에 `Stop` 훅이 바뀐 줄을 읽습니다. 연구 판단은 하지 않고, 꼼꼼한 공저자라면 남기지 않을 코드를 짚습니다. 아래는 이벤트 스터디 반복문의 첫 초안입니다. 고정효과를 `$main_fe`로 빼고, 회귀를 `quietly`로 감싸고, 같은 저장 이름을 두 반복문에서 다시 계산하고, 추정치를 메모리에만 두고, `///`를 들쭉날쭉하게 남겼습니다. 훅이 돌려보낸 내용을 경로만 줄여 그대로 옮깁니다.

```text
Lines to fix in the changed .do files:
- event_study.do lines 6, 10: repeated expression: subinstr("`y'", "wins_", "", 1)
- event_study.do lines 5: quietly hides log output: quietly reghdfe `y' ib2019.year##i.treated, absorb($main_fe) vce(cluster firm)
- event_study.do lines 5: model argument hidden in a global: write it in the command: quietly reghdfe `y' ...
- event_study.do lines 5: estimates kept only in memory: add estimates save after each model: quietly reghdfe `y' ...

The /// markers of these edited commands are not in one column. Run the aligner, which changes only the spaces before ///:
node hooks/stata-align.cjs event_study.do --lines 11-12
```

그리고 최종 답변입니다. 바뀐 부분만 담은 diff와 줄 수, 에이전트가 다시 읽은 범위로 끝납니다.

```diff
 global outcomes "roa roe leverage"
-global main_fe "firm year industry#year"
 
 foreach y of global outcomes {
-    quietly reghdfe `y' ib2019.year##i.treated, absorb($main_fe) vce(cluster firm)
-    local name = subinstr("`y'", "wins_", "", 1)
-    estimates store `name'
+    reghdfe `y' ib2019.year##i.treated, absorb(firm year industry#year) vce(cluster firm)
+    estimates save "$ster_dir/event_`y'.ster", replace
+    estimates store `y'
 }
 foreach y of global outcomes {
-    local name = subinstr("`y'", "wins_", "", 1)
-    coefplot `name', keep(2017.year#1.treated 2018.year#1.treated) ///
-        vertical yline(0) ///
+    coefplot `y', keep(2017.year#1.treated 2018.year#1.treated) ///
+        vertical yline(0)                                       ///
         xtitle("Year")
-    graph export "event_`name'.pdf", replace
+    graph export "event_`y'.pdf", replace
 }
```

event_study.do: +6 -8 (net -2)

> 수정 코드 주변과 관련 정의를 읽어 중복 구현을 확인했다. (event_study.do 1-13행)

고친 파일로 다시 돌리면 훅은 아무것도 돌려주지 않습니다. 위 두 출력은 배포된 훅을 이 짧은 예제에 실제로 돌린 결과이고, 정렬 도구는 `///` 앞의 공백만 바꿨습니다. 훅은 이번 턴에 고친 줄만 보므로, 건드리지 않은 예전 코드에는 조용합니다.

## Guard가 판단하는 방식

일반 소프트웨어에서 반복 코드는 고칠 대상입니다. 하지만 `.do` 파일에서는 회귀문 한 줄이 곧 연구 설계입니다. 표본, 통제변수, 고정효과, 표준오차가 모두 그 줄에 있습니다. Guard는 기계적인 반복은 접게 하고, 연구 결정은 풀어 쓰게 합니다.

### 기계적인 반복은 접고, 결정은 풀어 씁니다

| 코드의 대상 | Guard의 기본값 |
| --- | --- |
| 같은 방식으로 추정하는 결과변수 묶음 | 이름 붙인 `global` 하나(`$pay`)와 얕은 반복문 하나 |
| 통제변수, `absorb()` 고정효과, `vce()`, 표본 조건 | 각 명령에 직접 씁니다 |
| 회귀표 | 셀을 손으로 채우기 전에 Stata의 `etable`, `esttab`, `collect`를 씁니다 |
| 추정한 모형 | `.ster`로 저장하고 표와 그림에 다시 씁니다 |
| 기존 작업 흐름 | 그 파일을 고치고, 표본, 추정량, 설정을 유지합니다 |

### 작은 수정은 가볍게, 설계 변경은 꼼꼼하게

축 이름 변경과 추정량 변경에 같은 수준의 검토가 필요하지는 않습니다. 스킬은 요청이 무엇을 바꾸는지 보고 읽을 범위와 확인할 범위를 정합니다.

| 요청 | 에이전트가 하는 일 |
| --- | --- |
| 주석, 라벨, 공백 | 가장 작은 수정만 하고, 영향을 받는 호출이나 산출물만 확인합니다 |
| 코드 위치 이동 | 호출 순서, 매크로 범위, 저장 결과를 쓰는 곳을 유지합니다 |
| 통제변수, 표본 규칙, 추정량 추가 | 바뀌는 표본, 사양, 추론을 짚고 그 인터페이스의 도움말을 읽습니다 |
| 추정 후 표나 그림 수정 | 저장한 추정치를 불러와 산출물만 다시 만듭니다 |
| 파일 전체 개편 | 독립 동료 검토를 더합니다 |
| 새 프로젝트 구성 | AEA 재현 패키지에서 가져온 구성안을 제시하고 사용자가 고르게 합니다 |

이미 확인한 근거는 다시 쓰고, 평범한 `foreach`, `if`, local 매크로 문법은 도움말을 찾지 않습니다.

### 지시하고, 검사하고, 한 번 더 읽습니다

| 계층 | 실행되는 것 | 에이전트에게 지키게 하는 것 |
| --- | --- | --- |
| 스킬 | `SKILL.md`와 참조 문서 | 언제 무엇을 읽을지, 위의 작성 규칙 |
| 근거 | `get_stata_command_evidence` | 옵션과 저장 결과를 기억이 아니라 Stata가 렌더링한 도움말, 매뉴얼 항목, 출판 논문 코드에서 가져옵니다 |
| 훅 | `PreToolUse`, `PostToolUse`, `Stop` | `.do` 수정을 모두 추적하고, 고친 줄을 검사하며, 검토 확인 줄이나 diff가 빠진 답변은 돌려보냅니다 |
| 검토 | `stata-peer-audit` | 별도의 읽기 전용 맥락에서 실제 파일과 결과를 읽습니다. 지적은 조언이고, 반영 여부는 사용자가 정합니다 |

스킬이 할 일을 알려 주고, 훅이 했는지 확인하고, 독립 검토자가 결과를 읽습니다. 무엇을 남길지는 언제나 사용자가 정합니다.

### Guard가 하지 않는 것

- 줄 검사는 Stata의 논리 행에 적용하는 패턴 규칙이며 완전한 파서가 아닙니다. 동적으로 만든 명령, `#delimit ;`, Mata, 파일을 넘나드는 제어 흐름은 놓치거나 잘못 걸릴 수 있습니다.
- `quietly`처럼 맥락을 보지 않고 거는 경고도 있습니다. 에이전트는 경고받은 줄을 이유와 함께 남길 수 있습니다.
- `Stop` 훅은 답변이 다시 읽은 범위를 적었는지 확인할 뿐, 얼마나 잘 읽었는지는 확인하지 못합니다.
- 더 나은 코드에 대한 근거는 위의 두 사례이며, 여러 과제와 모델에 걸친 벤치마크는 아닙니다.
- 설치는 Windows에서만 확인했고, 패키지는 격리된 환경이 아니라 평소 쓰는 ado 위치에 설치됩니다.

## Guard가 지키는 것

| | 얻는 것 |
| --- | --- |
| 🔍 **수정 구간 검토** | 최종 수정 뒤 에이전트가 300줄 이하 파일은 전체를, 더 긴 파일은 각 변경 구간과 앞뒤 50줄을 다시 읽고, 그 구간에서 쓰는 매크로와 변수가 정의된 곳도 찾아 읽습니다. 기존 전역변수에 넣으면 될 목록을 새 전역변수로 만들거나 `collapse`를 두 번 하는 것처럼 이미 같은 일을 하는 코드가 있는지 보고, 읽은 줄 범위를 적은 확인 문장으로 답을 마칩니다. 그 문장이 없으면 `Stop` 훅이 한 번 더 검토하게 합니다. [자세히](plugins/stata-research-guard/README.md#설치와-개발) |
| 🔁 **줄 단위 검사** | 이번 턴에 고친 줄에서 `hooks/stata-repeats.cjs`가 두 번 계산한 값, 반복되는 명령, 다시 적거나 이름만 바꾼 결과변수 목록, `if`로 묶음 소속을 확인하는 분기, `quietly`, global로 뺀 고정효과나 군집, `estimates save` 없이 표나 그림에 쓰는 추정 결과, `e(b)`/`e(V)`를 행렬로 옮긴 저장 결과, 반복문 변수로 이름을 만든 매크로, `use` 안에서 고른 표본, `merge m:m`, `keep if _merge == 3`, 패키지 확인 명령, 너무 깊은 반복문과 `if` 블록을 짚습니다. `hooks/stata-align.cjs`는 `///` 앞의 공백만 바꿔 한 열로 맞춥니다. 명령마다 반복되는 게 맞는 옵션은 건드리지 않습니다. [실제 모습 보기](#모든-수정은-diff로-한-줄씩-검사받고-돌아옵니다) |
| 🏷️ **이름 붙인 global을 끝까지 이어 쓰기 (작성자 취향)** | 결과변수 묶음마다 내용을 드러내는 이름의 `global` 하나를 둡니다(`$employment`, `$pay`, `$financial`). 맨 위에서 한 번 정의하고 추정, 기초통계, 그림, 표에서 계속 불러 쓰므로, 정의를 찾아 위로 올라가지 않아도 이름만 보고 내용을 짐작할 수 있습니다. 통제변수, `absorb()` 고정효과, `vce()`, 표본 조건, `keep()` 범위, 축 옵션처럼 모형과 산출물을 만드는 인자는 각 명령에 그대로 적어, `reghdfe`나 `coefplot`만 봐도 핵심 구현을 알 수 있게 합니다. `local`은 반복문 변수, 반복마다 계산하는 값, tempfile, 보관할 반환 결과에만 씁니다. 작성자의 선호이니 입맛에 맞게 바꿔 쓰세요. [general-rules.md](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md)의 `Globals for outcome groups`, `Keep what a command does inside the command` 규칙과 [SKILL.md](plugins/stata-research-guard/skills/stata-replication-workflow/SKILL.md), [code-examples.md](plugins/stata-research-guard/skills/stata-replication-workflow/references/code-examples.md)의 관련 예시를 고치면 됩니다. |
| 🧾 **확인할 수 있는 diff** | 답변마다 유지 대상 `.do`의 파일별 전후 diff를 보여줍니다. 200줄 이상 바꾼 수정이나 작업 흐름 전체 개편은 `diff 생략:` 줄에 생략을 밝히고 변경 사항을 링크합니다. diff마다 `+추가 -삭제 (net N)` 줄 수를 붙이고, 훅이 수정을 추적해 빠진 diff와 틀린 줄 수를 잡아냅니다. |
| 📚 **Guard MCP: 실제 명령 근거** | `get_stata_command_evidence`가 Stata로 렌더링한 공식·maintainer 도움말, Stata 18 매뉴얼 확장 항목, 출판 논문의 원본 코드 블록을 돌려줍니다. 옵션과 저장 결과를 기억이 아니라 원문에서 가져옵니다. |
| 🗂️ **AEA 재현 패키지에서 가져온 프로젝트 구성** | 프로젝트를 새로 시작하거나 전체를 재구성할 때, AEA 재현 패키지에서 뽑은 네 가지 구성(번호 붙은 단계, build/analysis, 표·그림마다 파일 하나, 중첩 master) 중 두세 가지를 제안하고 하나를 추천한 뒤, 파일을 만들기 전에 사용자가 고르게 합니다. |
| 🧑‍🔬 **독립 동료 검토** | `stata-peer-audit`가 별도의 읽기 전용 문맥에서 동료처럼 코드와 결과를 읽고, 파일을 고치지 않은 채 구체적인 파일·줄 단위 지적을 돌려줍니다. |
| ♻️ **결과를 아는 복구** | 추정은 끝났는데 내보내기가 실패했다면 전부 다시 돌리지 않고 저장된 추정치를 불러와 실패한 부분만 다시 만듭니다. |

함께 제공하는 근거:

| 자료 | 내용 |
| --- | --- |
| 명령 색인 | 명령 115개의 이름, 계열, 단계, 역할 |
| 명령 도움말 | Stata로 렌더링한 공식·maintainer 도움말 118개 주제(기본 주제 5개 포함), 2개는 제공 불가 |
| 실시간 정확한 도움말 | 번들에 없는 주제나 명시적으로 요청한 설치본 도움말을 사용자의 Stata에서 가져옴 |
| 확장 문서 | Stata 18 공식 PDF 항목 69개와 저자 보충 자료 1개 |
| 논문 용례 | 선택한 명령의 맥락을 담은 원본 코드 블록 166개 |
| 원본 로그·산출물 | 직접 첨부한 원본 실행 로그 또는 산출물 기록 12개 |

원본 논문 자료와 출처 표기는 그대로 보존합니다. 몇몇 구체적인 이식 오류에는 `editorial_adaptation`으로 따로 표시한 예시가 있으니, 적용하기 전에 바뀐 점과 가정을 읽으세요. 재사용 조건은 [제3자 고지](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md)를 따릅니다.

## 써 보기

프로젝트를 열고 스킬을 부르세요.

**분석 이어가기**

```text
$stata-replication-workflow
이 프로젝트의 regression.do와 연결된 데이터를 읽고 분석을 이어가 줘.
현재 표본, 추정량, 고정효과, 표준오차 설정은 유지해 줘.
실행해서 표본 크기와 회귀표를 확인해 줘.
```

**논문의 주요 표 재현하기**

```text
$stata-replication-workflow
이 논문 재현 패키지에서 주요 회귀표와 event-study 그림을 찾아 줘.
원자료, 표본, 추정, 출력을 따라가서 원래 사양을 재현해 줘.
논문에 보고된 값과 실제 실행 결과를 비교하고, 자료나 패키지 버전 때문에 막힌 부분을 알려 줘.
```

**오래된 코드에 대한 의견 받기**

```text
$stata-peer-audit
이 오래된 analysis.do와 연결된 코드, 로그, 표, 그림을 읽어 줘.
표본, 사양, 저장 결과, 출력을 더 따라가기 쉽게 만들 변경을 찾아 줘.
파일·줄 단위로 지적하고, 검토는 읽기 전용으로 해 줘.
```

<details>
<summary>더 많은 요청: 원자료에서 표까지, 실패한 내보내기</summary>

```text
$stata-replication-workflow
원자료 폴더와 프로젝트 README를 읽고 분석을 이어가 줘.
분석 패널을 만들기 전에 병합 키와 관측 단위를 확인해 줘.
README에 적힌 표본, 회귀 사양, 표준오차로 추정해 줘.
추정치는 .ster, 회귀표는 Excel, 그림은 PDF로 저장해 줘.
데이터에서 표와 그림까지 따라갈 수 있게 쓰고, 실제 결과를 확인해 줘.
```

```text
$stata-replication-workflow
회귀가 끝난 뒤 결과를 저장하다가 실행이 멈췄어.
코드, 로그, 저장된 .ster 파일을 읽어서 끝난 추정과 실패한 출력을 구분해 줘.
유효한 저장 추정치는 다시 쓰고 실패한 표와 그림만 고친 뒤, 실제로 저장된 것을 확인해 줘.
```

</details>

<details>
<summary>MCP 도구 직접 호출하기</summary>

필요한 명령을 넣어 `get_stata_command_evidence`를 호출하세요. 논문 용례가 필요하면 `"include_paper_catalog":true`를 추가합니다.

```json
{"request":"Read the relevant regression syntax","selected_commands":["regress"]}
```

긴 도움말의 절 선택, 설치 버전 조회, 첨부된 논문 코드와 로그는 [명령 근거 안내](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md)를 보세요.

</details>

<details>
<summary>실행 환경과 패키지 설치</summary>

이 플러그인을 설치하고 켜면, 지원하는 사용자 작성 명령과 필요한 의존성을 필요할 때 SSC나 공식 maintainer 출처에서 내려받아 주 Stata 환경의 일반 공유 ado 위치에 설치하는 데 동의하는 것입니다. 사용자가 정한 범위 제한이 우선합니다. 모든 명령을 미리 설치하거나 격리된 ado 환경을 만들지 않으며, 이 범위 안의 설치를 매번 다시 묻지 않습니다. Codex나 Claude Code 자체의 승인 설정은 그대로 작동합니다.

연구 표는 요청한 출력에 맞고 결과와 추론을 보존하는, 문서화된 표·내보내기 인터페이스를 고르고, 계수와 표준오차 행을 손으로 조립하기 전에 그 인터페이스의 기능을 먼저 씁니다. 설치되지 않았다는 이유만으로 추정이나 추론을 바꾸지 않습니다.

`CODEX_MCP_NODE_PATH`로 Node 실행 파일을, `STATA_PATH`로 실시간 도움말용 Stata 실행 파일을 지정할 수 있습니다.

</details>

## 문서

| 목적 | 읽을 문서 |
| --- | --- |
| 분석 시작 또는 수정 | [연구 작업 흐름](plugins/stata-research-guard/skills/stata-replication-workflow/SKILL.md) |
| 코드 구조와 작성 원칙 | [일반 규칙](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md) |
| 짧은 작성 비교 | [코드 예시](plugins/stata-research-guard/skills/stata-replication-workflow/references/code-examples.md) |
| 새 프로젝트 구성 | [프로젝트 작업 흐름 패턴](plugins/stata-research-guard/skills/stata-replication-workflow/references/project-workflows.md) |
| 논문의 전체 분석 따라가기 | [논문 작업 흐름 읽기](plugins/stata-research-guard/skills/stata-replication-workflow/references/paper-workflow-reading.md) |
| Stata 실행과 결과 확인 | [실행과 결과](plugins/stata-research-guard/skills/stata-replication-workflow/references/execution-and-results.md) |
| MCP 옵션과 원자료 재사용 | [명령 근거](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md) |
| 동료 검토 요청 | [동료 검토](plugins/stata-research-guard/skills/stata-peer-audit/SKILL.md) |
| 출처와 사용 조건 | [제3자 고지](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md) |
| 변경 사항 | [변경 기록](plugins/stata-research-guard/CHANGELOG.md) |

## 기여하기

도움을 환영합니다. 특히 **macOS**: Mac Stata 경로, MCP 시작 스크립트, 설치 절차를 문서화하고 실제 Mac에서 시험하는 일입니다. 재현 가능한 버그 제보, 문서 수정, 연구 예시도 환영합니다. [issue](https://github.com/Plokies-2/stata-research-guard/issues)나 [pull request](https://github.com/Plokies-2/stata-research-guard/pulls)를 열어 주세요.

<details>
<summary>개발 점검</summary>

저장소 루트에서:

```powershell
cd plugins/stata-research-guard
node --test tests/*.test.cjs
node scripts/verify_plugin_bundle.cjs
```

도구 호출, 원자료 전달, 묶음 구조를 점검합니다. Stata를 실행하거나 연구 표를 채점하지 않으며, 가독성과 타당성은 실제 코드, 로그, 표, 그림을 읽고 판단합니다.

</details>

## 라이선스

플러그인 원본 소프트웨어는 [MIT](LICENSE)입니다. 함께 담긴 논문 발췌, Stata 문서, maintainer 도움말 등 제3자 자료는 비상업 제한을 포함한 각자의 조건을 따릅니다. [제3자 고지](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md)를 보세요.
