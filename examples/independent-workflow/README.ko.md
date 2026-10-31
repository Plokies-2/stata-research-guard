# 독립 작성으로 비교한 전체 분석 예제

[English](README.md) · **한국어**

이 폴더는 두 사양을 비교한 앞선 소규모 사례입니다. 현재 대표 예제는 결과변수 3개·표본 2개·사양 3개를 다룬 [새 세션 비교](../fresh-session-workflow/README.ko.md)입니다. 아래 코드와 관찰 결과는 이 폴더의 원래 실행을 설명합니다.

2026-10-22에 GPT-6 Sol / high 작성자 두 명에게 같은 자연어 과제를 전달했습니다. 각 작성자는 새 문맥과 빈 폴더에서 시작했으며, 기존 예제 코드나 상대방의 코드를 받지 않았습니다. 두 작성자 모두 사용자·프로젝트 AGENTS.md와 memories를 읽거나 적용하지 않도록 했습니다. before 작성자는 Guard 스킬·도구도 사용하지 않도록 했고, after 작성자는 현재 Guard의 workflow 지침, 명령 도움말과 논문 용례를 읽도록 했습니다. 주 작성자가 두 결과를 읽고 비교했습니다.

[before.do](before.do)는 Guard 없이 작성한 코드, [after.do](after.do)는 Guard를 적용해 별도로 작성한 코드입니다. 한쪽을 다른 쪽의 입력이나 수정 기준으로 제공하지 않았습니다. 각 작성자는 같은 파일에서 실행 오류를 고치고 산출물을 확인했습니다. 적용본에서 처음 발생한 로그 파일 중복 점유도 같은 do-file에서 수정했습니다.

## 공통 과제

Stata 기본 데이터 `nlsw88`을 불러온 뒤 `wage hours age grade ttl_exp tenure union`이 모두 관측되고 `wage > 0`, `hours > 0`인 공통 표본을 만듭니다. `ln_wage = ln(wage)`를 생성하고 변수 라벨과 Excel 코드북에 정의·출처·단위·결측 처리를 기록합니다.

`wage`, `ln_wage`, `hours` 각각에 다음 OLS 두 사양을 추정합니다. 두 사양 모두 `vce(robust)`를 사용합니다.

| 사양 | 설명변수 |
| --- | --- |
| 1 | `age grade` |
| 2 | `age grade ttl_exp tenure union` |

분석자료 DTA 1개, 코드북 XLSX 1개, outcome별 두 사양을 나란히 담은 Excel 회귀표 3개, 분포 그림 PDF 3개, 추정치 STER 6개를 저장합니다. 회귀표에는 계수·표준오차·N·R²·회귀 표본의 종속변수 평균을 담습니다. 분석은 한 do-file에 작성하고, 불러오기부터 내보내기까지 실제로 실행해 자료·로그·표·그림을 읽고 필요한 부분을 고칩니다. 특정 명령, 코드 길이, loop 사용, Excel 셀 위치·표시 자릿수와 그림 서식은 지정하지 않았습니다.

## 실행하기

Stata에서 저장소 루트를 작업 폴더로 두고 아래를 실행합니다. 원자료는 Stata 기본 데이터입니다. 분석·회귀표·그림에는 Stata 내장 명령을 사용하고, after 코드북의 열 너비·행 높이 정리에는 `python`으로 호출할 수 있는 Python과 `openpyxl`이 필요합니다. Stata 18에서 실행을 확인했습니다.

```stata
local repo "`c(pwd)'"
capture mkdir "`repo'/tmp"
capture mkdir "`repo'/tmp/independent-before"
capture mkdir "`repo'/tmp/independent-after"
do "`repo'/examples/independent-workflow/before.do" "`repo'/tmp/independent-before"
do "`repo'/examples/independent-workflow/after.do" "`repo'/tmp/independent-after"
cd "`repo'"
```

공개본에서는 개인 절대경로로 작업 폴더를 지정하던 한 줄을 `args output_dir`와 `cd` 두 줄로 바꾸고 마지막 빈줄을 정리했습니다. 분석·내보내기 코드는 그대로이며, 공개본도 별도 폴더에서 실행했습니다. 원작성본은 75줄과 62줄, 공개본은 75줄과 63줄입니다. 실행 로그와 생성 산출물은 공개 저장소에 포함하지 않습니다.

## 관찰한 결과

두 작성본 모두 원자료 2,246명에서 공통 표본 1,865명을 구성했고, 요구한 산출물 14개를 저장했습니다. 정렬된 변수 순서를 맞춰 읽은 분석자료의 값은 같았습니다. 저장된 STER 6쌍을 Stata에서 다시 읽어 전체 계수·robust 표준오차·N·R²를 나란히 확인했으며 유효숫자 15자리 표시에서 일치했습니다. 회귀 표본 평균은 임금 7.589755656, 로그 임금 1.893820732, 근로시간 37.607506702입니다.

before 작성본은 변수 행과 계수·표준오차·요약통계를 `putexcel` 셀 주소에 직접 배치했습니다. after 작성본은 저장한 두 추정치를 `etable`로 내보냈습니다. 전체 공개 코드는 75줄에서 63줄로 16% 줄었으며, 표의 행과 셀 좌표를 관리하는 작업이 없어졌습니다. 두 회귀식은 적용본에서도 본문에 보입니다.

Excel 회귀표 6개의 계수·표준오차·요약통계와 코드북을 읽고 PDF 6장을 렌더해 확인했습니다. before의 표준오차는 숫자 셀이고 after는 소수 세 자리 괄호 문자열이며, 히스토그램의 세로축도 각각 비율과 빈도입니다. 같은 자료와 추정 결과를 서로 다른 서식으로 출력한 것으로, 파일 내용이나 그림 모양이 동일하다는 뜻은 아닙니다. 동일 과제 한 건을 각각 작성한 사례입니다.
