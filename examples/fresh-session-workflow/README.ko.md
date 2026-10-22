# 대화 이력을 공유하지 않는 새 세션의 전체 분석 비교

[English](README.md) · **한국어**

2026-10-22, **GPT-6.1 Sol / medium** Codex 채팅 두 개에서 동일한 과제를 독립적으로 작성·실행했습니다. 이전 대화, 예제 코드, 상대 작성본을 전달하지 않았습니다. before에는 비교용이므로 개인·프로젝트 `AGENTS.md`의 코딩 지침, 스킬과 memories를 무시하고 Guard를 쓰지 말라고 명시했습니다. after는 현재 Guard 지침·정확한 도움말·논문 용례를 읽었습니다. 동일 과제 자체에서는 exporter, 셀 배치, 루프 구조, 코드 길이와 그림 서식을 정하지 않았습니다.

[before.do](before.do)와 [after.do](after.do)는 실행한 코드 전문입니다. 각 작성자가 실행 오류를 고치고 실제 산출물을 확인했습니다. 공개용 before에는 `args output_dir`와 `cd`를 추가하고, after에서는 개인 기본 작업 경로만 제거했습니다. 분석과 표 명령은 바꾸지 않았으며, 공개본도 각각 빈 출력 폴더에서 다시 돌렸습니다.

## 동일 과제

Stata 기본 제공 `nlsw88`을 불러옵니다. `wage hours age grade ttl_exp tenure union south smsa married` 10개 변수가 모두 관측되고 `wage > 0`, `hours > 0`인 공통 표본을 구성합니다. `ln_wage = ln(wage)`를 생성·라벨링하고 분석 DTA와 정의·출처·단위·결측 처리를 기록한 Excel 코드북을 저장합니다.

전체 공통 표본과 그중 `married == 1`인 표본 각각에서 `wage ln_wage hours`를 결과변수로 세 OLS 사양을 추정합니다. 모두 상수항과 `vce(robust)`를 사용합니다.

| 모형 | 설명변수 |
| --- | --- |
| 1 | `age grade` |
| 2 | `age grade ttl_exp tenure` |
| 3 | `age grade ttl_exp tenure union i.south i.smsa` |

추정치 STER 18개, 결과변수·표본별 세 모형을 나란히 놓은 Excel 회귀표 6개, 전체 표본 분포 PDF 3개를 저장합니다. 표에는 모든 계수·robust 표준오차·N·R²와 각 회귀 표본의 종속변수 평균을 넣습니다. do-file 하나에서 불러오기→처리→추정→정리→내보내기를 실제 실행하고 자료·로그·표·코드북·그림을 읽어 필요한 오류를 고칩니다.

## 실행

저장소 루트에서 Stata로 실행합니다.

```stata
local repo "`c(pwd)'"
capture mkdir "`repo'/tmp"
capture mkdir "`repo'/tmp/fresh-before"
capture mkdir "`repo'/tmp/fresh-after"
do "`repo'/examples/fresh-session-workflow/before.do" "`repo'/tmp/fresh-before"
do "`repo'/examples/fresh-session-workflow/after.do" "`repo'/tmp/fresh-after"
cd "`repo'"
```

기본 제공 데이터와 Mata Excel 인터페이스를 포함한 Stata 내장 명령을 사용합니다. mcpStata, Python, user-written exporter는 필요하지 않습니다. 실행은 Stata 18에서 확인했습니다. before는 출력 폴더의 `outputs/` 아래에, after는 `estimates/`·`tables/`·`figures/`와 출력 폴더 루트에 저장합니다. Excel·자료·추정치·PDF·실행 로그는 공개 저장소에 넣지 않으며, 코드를 실행하면 다시 생성됩니다.

## 실제 관찰

두 코드 모두 원자료 2,246명 중 1,865명을 선택했고, 기혼 표본은 1,214명이었습니다. 각각 DTA 1개, 코드북 1개, 회귀표 XLSX 6개, PDF 3개, STER 18개로 요청 산출물 29개를 저장했습니다. 공통 변수 11개의 값은 같았습니다. before는 사용하지 않는 원자료 변수 7개를 제외하고, after는 원자료 변수 17개와 `ln_wage`를 보존합니다.

Stata에서 저장 추정치 18쌍을 모두 읽었으며 계수·robust 표준오차·N·R²는 유효숫자 15자리 표시에서 일치했습니다. 회귀표 12개도 읽었습니다. 각 작성자는 코드북을 읽고 PDF 3개를 렌더링해 확인했습니다. before 표는 원래 정밀도의 계수·SE를 별도 열에 쓰고 기준범주 계수·SE를 0으로 표시합니다. after는 소수점 6자리 값으로 SE를 계수 아래에 배치하고 기준범주를 `(base)`로 표시합니다. 요청한 모델 통계량과 표본 평균은 양쪽 모두 들어 있습니다. 그림 구간과 서식은 다릅니다.

before는 표본·결과변수·사양 루프 안에서 계수별 루프를 돌며 `e(b)`·`e(V)`를 Excel 셀에 옮깁니다. after는 2중 루프 안에 세 `regress`를 직접 쓰고, 저장 모형을 다시 읽어 `estimates table`로 구성한 표를 `putexcel A3=etable`로 내보냅니다. 작은 eclass helper `store_ymean`은 관측한 회귀 표본 평균을 저장 결과에 추가하며 회귀 명령을 감추지 않습니다. 작성 후 exporter를 교체하지 않았습니다.

## 줄 수 산정

| 구분 | Before | After |
| --- | ---: | ---: |
| 주석·빈줄을 포함한 공개 코드 전체 | 146 | 118 |
| 빈줄 제외 | 139 | 111 |
| 코드북 작성·서식 블록 제외 | 107 | 91 |
| 빈줄·코드북 블록 제외 | 101 | 85 |

제외한 연속 구간은 before 32–70행, after 31–57행으로, 코드북 주석부터 서식 처리 뒤 빈줄까지입니다. 작성된 코드의 분량을 센 것이며 코드북을 뺀 별도 실행본은 만들지 않았습니다. 전체 줄 수는 19.2%, 해당 블록을 제외하면 15.0% 줄었습니다. 루트 README는 실제 표 작성·회귀 관련 줄을 골라 보여주며 자료 처리·결과 저장·서식은 생략합니다. 변수 정의와 전체 실행 순서는 링크한 전문에서 확인할 수 있습니다. 한 과제의 관찰 사례이며, 코드 품질 점수나 다른 과제에 대한 보장은 아닙니다.
