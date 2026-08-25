# Stata workflow 사전 검토 대기열

이 문서는 사람이 결정해야 할 라벨링 순서와 중간 checkpoint를 기록한다. 자동 builder가 덮어쓰지 않는다.

## 완료한 package 단위 독해

| package | 독해 범위 | 현재 상태 |
|---|---|---|
| `173341` | setup부터 clean, variable construction, voting integration, final DTA, non-TeX figure까지 | 병렬 전수 독해 완료, 범용성이 높은 원자 블록부터 사전에 반영 |
| `194561` | setup, import, gravity merge, sample thresholds, cohort timing, JWDID/TWFE, handoff까지 | 병렬 전수 독해 완료, 안전한 용례와 drop 반례를 사전에 반영 |
| `191751` | cross-language master, panel timing, e(sample), TWFE, descriptives, figures까지 | 병렬 전수 독해 완료, Stata-native 조건부 용례만 반영하고 수동/TeX bridge는 제외 |
| `120068` | config, master, full preparation, panel OLS/IV, e(sample), heterogeneity까지 | 전수 독해 완료, 10개 용례 반영 |
| `148522` | master, sample/arm construction, attrition flow, cgmreg, summary, heterogeneity까지 | 전수 독해 완료, 7개 용례 반영 |
| 전체 35개 | integrity, event-study, jackknife, estimator comparison, deterministic dedup 표적검색 | 639개 do-file 대상 보강검색 완료 |

## 현재 사용자 검토가 필요한 표제어

1. `integrity.adjacency_dedup`: 35개 전수검색에서도 equality/assert 또는 deterministic selection 뒤 `isid`까지 갖춘 양성 원문이 없었다. 실제 요청이 오면 공식 문법 확인 뒤 selection rule을 사용자에게 묻는다.
2. `postest.estimator_comparison_unsafe`: 공통표본 key와 estimator별 `e(sample)`을 검증하는 양성 원문이 없었다. 비교 요청에서는 임의 glue를 만들지 말고 사용자에게 비교 estimand와 common-support 규칙을 묻는다.
3. `estimation.conventional`: OLS, panel FE OLS/IV, `cgmreg` variants가 추가됐다. estimator·FE·cluster 선택 조건이 충분한지 검토한다.
4. `final_excel_assembly`: 세 가지 상태 variant는 있으나, 실제 runtime pass는 `.ster` 복원형만 있다. live e-class형도 합성자료 runtime 검증이 필요하다.
5. `clean.derive_variables`: broad `clean.transform`을 식별자·처치군·윈저화·표준화에서 분리했다. 남은 두 용례가 실제로 같은 일반 재코딩 표제어에 속하는지 검토한다.
6. `panel.treatment_cohort`, `panel.turnover_event_time`, `feature.aggregate_household`, `feature.aggregate_section_exposure` 등 남은 11개 prototype은 corpus 전수검색에서 정확한 두 번째 방법이 없었다. 실제 요청과 맞는 package가 있을 때만 표적 보강한다.

## 다음 병렬 배치 규칙

- 작업자 한 명이 package 하나를 setup부터 최종 non-TeX output까지 읽는다.
- 먼저 단계 경계를 제안하고, 각 블록에 입력 상태·출력 상태·선택 조건·최소 수정·금지 변경·원문 span을 붙인다.
- 같은 표제어의 다른 연구자 방법은 함께 보존한다. 단순 문법 차이는 duplicate로 표시한다.
- 2중 이상 loop, TeX output, 수동 coefficient bridge, 검증 없는 duplicate/merge drop은 기본 재사용에서 제외한다.
- 한 배치가 끝날 때 `dictionary_toc.md`와 `labeling_review.md`를 재생성하고 사용자 검토를 받는다.

## 다음 중간 checkpoint

- [ ] 사전 목차 1차 검토: 현재 한글·영어 병기 37개 표제어의 이름과 경계
- [ ] 라벨 1차 검토: 현재 반영된 91개 용례의 keep/conditional/drop
- [x] broad 표제어 6종 분할 및 source span 오류 2건 교정
- [x] dangling composition/label relationship 자동 실패 검사 추가
- [x] package 3개 병렬 독해 및 35개 전체 표적 재검색
- [x] command anchor·state signal 기반 retrieval index와 fallback chain 공개
- [ ] 사용자 검토 후 prototype 표제어의 다음 표적검색 순서 확정
