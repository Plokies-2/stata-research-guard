# Stata workflow 라벨링 진행상황 / Labeling progress

이 문서는 현재 배치의 진행상태를 사람이 바로 감독할 수 있게 기록한다. 완료 전 결과도 숨기지 않고, 확정 라벨은 builder가 생성하는 `dictionary_toc.md`와 `labeling_review.md`에 반영한다.

## 현재 확정 상태 / Current adjudicated state

| 항목 | 현재 값 |
|---|---:|
| 수집 package | 35 |
| 사전 표제어 / Dictionary headwords | 40 |
| 라벨 용례 / Labeled variants | 121 |
| keep | 15 |
| conditional_keep | 96 |
| drop | 10 |
| 범용 / General | 50 |
| 방법특화 / Method-specific | 56 |
| 프로젝트특화 / Project-specific | 5 |
| 부정 예제 / Negative | 10 |
| 심사표 preferred / conditional / reference / exclude | 24 / 31 / 56 / 10 |
| 자동 선택 가능 / Auto-selectable | 55 |
| reference-only | 56 |
| exclude | 10 |
| 금지 사례만 존재 / Negative-only headwords | 2 |

## 현재 생성·심사 상태 / Current generated and reviewed state

| 항목 | 현재 값 | 비고 |
|---|---|---|
| broad stage demotion | 17 | broad label을 원자적 checkpoint로 분해 |
| atomic replacement | 8 | 이전 넓은 span을 상태 전이 하나로 교체 |
| 과거 clean-test blocker 범주 | 5 | 모두 해결하거나 명시적으로 차단함; 현재 template·metadata·action blocker는 전수 감사 기준 0건 |
| corpus | 충분 | 추가 다운로드 불필요 |

## 직전 교정 / Latest adjudication

- 이번 atomic/parsimony refactor에서 panel FE OLS·IV는 각각 single active-estimator span으로 분리했고, composite first-stage handoff와 synthetic binary scatter는 reference-only로 내렸다. collapse·weighted collapse·coefplot·stage-log span은 필요한 상태 전이만 남겼다. manual path와 direct master call은 prompt/기존 interface를 따르는 reference이며, positional matrix evidence에서 새 scatter template을 만들지 않았다.
- `merge.retain_matched_rows_m1.v1`을 `193441/replicate_information/1_build/build.do:879`에서 추가했다. 파일 SHA-256은 `e1d6d62ac20ffd78a1d8f38ced9526a521b1f926dccf3d944e780154b9458ecb`, code SHA-256은 `c63c42457e593e9bb596201769d41548a1867d9df28ebe3162727b2728d5f8f6`이다. 869–877행은 repeated master를 확장하고 finer `g_pair rfrnc_yr rfrnc_week` key를 `isid`로 확인한 직후 `merge m:1 nbs6 rfrnc_yr rfrnc_week …, keep(match) nogen`을 실행한다. `120068/Prepare data.do:1233`의 country-metadata merge보다 many-side master state가 가까이 보이므로 이 후보를 채택했다. using-side city_week uniqueness는 confidential source의 span 밖이라 caller의 선행 `isid` 계약으로 명시하고 추정하지 않는다. cardinality는 editable field가 아니며, keys·using path·keepusing·indicator policy만 바꾼다.
- `export.figure_pdf.v1`을 `175582/Code/Analysis/Figures_MainText/Figures_MainText.do:139`에서 추가했다. 파일 SHA-256은 `23b3e7875eefd46bc9fa0deb17b66841cba3e3db8fdbea47f3600d71b1492577`, code SHA-256은 builder가 생성한 `eb8b15676194337bfac49989ad9c3d1c31a60c00218fdf5fb773fea62797e769`이다. source의 133–145행 문맥에서 active graph가 이미 만들어진 점을 읽었지만, 생성 span에는 `graph export "$REPLICATION/Figure 1.pdf", replace` 한 줄만 남겼다. 따라서 descriptive scatter/coefplot/event-study의 연구설계와 분리된 built-in PDF export checkpoint이며, active graph와 PDF 요청이 있을 때 output path만 바꾸는 preferred general 후보다.
- `figure.coefplot_named_estimates_labels.v1`을 `175582/Code/Analysis/Figures_MainText/Figures_MainText.do:548-560`에서 추가했다. 파일 SHA-256은 `23b3e7875eefd46bc9fa0deb17b66841cba3e3db8fdbea47f3600d71b1492577`이다. 542-545의 estimate-store loop는 문맥으로만 읽었고, 생성 span에는 넣지 않았다. named estimates, coefficient keep/order·labels, common x-scale/CI, PDF export를 상태 계약으로 기록했다. PDF export가 GPH를 만들지는 않으므로 GPH는 target의 명시적 `graph save` 계약에서만 요구한다.
- `111707/Regression-and-Event-Study-Analyses.do:583-601`(SHA-256 `f8e69d1daa92712f5dbf6137b17dba1fd634cba4117f07f0885dc99875d5800a`)은 `zero=-1` baseline과 specific mortality event-study specification에 묶인 conditional/reference fragment로만 남겼다. generic coefplot label과 중복 추가하지 않았다.
- `237291/tables/Table3_Main.do:42-121`(SHA-256 `a9ab7b18cbb723a20fa8986fb49c74e6cf791ad70f2729049982406c303615d4`)는 `foreach var` 안의 `foreach rhsvar`, six research-specific `reghdfe` specifications, TeX `outreg2` export를 결합한다. nested-loop/TeX/hidden global bindings의 bad/reference-only 근거로 기록하며 생성 후보로 승격하지 않았다.
- 현재 CPI Excel-to-long 흐름에는 `input.excel_firstrow_clear.v1`과 `reshape.excel_year_stub_long.v1`이 있으므로 범용 템플릿 gap이 아니다. 실제 식별열과 year stub은 target binding으로만 바꾼다. 연구별 `reghdfe` specification 묶음과 특정 `.ster` 파일명 연결부도 broad template로 만들지 않고, 기존 atomic label로 덮이지 않는 최소 연결부만 direct-fallback 계약 아래 직접 쓴다.

- `clean.transform`을 식별자 정규화, 일반 변수생성·재코딩, 처치군 매핑, 윈저화, 추정표본 표준화로 분해했다.
- `sample_construction`, `panel_treatment_timing`, `feature.aggregate_group`, `postest.result_handoff`, `dataset.finalize`도 서로 다른 입력·출력 상태별 표제어로 분리했다.
- 순차 import 용례의 loop 닫는 줄을 source span에 복원했고, 일반 cleaning 용례에서 별도 duplicate 진단 구간을 제거했다.
- 가구 성인수 집계와 자산 recode를 별개 라벨로 나눴다.
- 모든 표제어는 한글명과 영문명을 함께 갖고, 끊어진 composition 또는 label relationship이 있으면 builder가 실패한다.
- 모든 라벨에 line-leading Stata 명령 anchor와 관측 가능한 상태 신호를 기록했다. 주석·변수명·파일명 속 부분 문자열은 명령 검색에 쓰지 않는다.
- `integrity.audit`는 엄격한 merge-state, asymmetric match, `isid` panel-key, time-invariant field 검증 용례로 채웠다.
- `figures.event_study`는 `did_imputation`, `did_multiplegt`, `csdid`, `eventstudyinteract`, 조건부 TWFE의 estimate-to-`event_plot` 용례로 채웠다. 원문의 PNG/미출력은 PDF 한 줄 치환을 필수 수정으로 명시했다.
- `robustness.jackknife`는 package-local `jregress` e-class delete-cluster 구현을 조건부 양성으로 추가했다. dependency 버전·획득 경로 기록과 identification 확인 없이는 선택하지 않으며, 분석 do-file에 package-presence probe를 추가하지 않는다.
- 두 번째 researcher variant로 numeric-only ID 정규화, weighted entity collapse, aggregate wage의 양측 winsorization, wide-year-family reshape, dynamic DID pre-period placebo를 추가했다.
- 기존과 같은 명령을 다른 파일에서 반복한 `.ster` 저장, checkpoint 의미가 다른 estimate scatter, `append, force`, e(sample)이 아닌 control-reference 표준화는 용례 수를 부풀리지 않기 위해 제외했다.
- 신규 프로젝트의 root `README.md`, master, do-file, data, `ster`, `table`, `figures` 역할과 경로는 승인된 prompt 또는 pre-write plan으로 정한다. manual path와 direct master call 예시는 강제 정본이 아니며, README에는 승인된 실제 폴더 역할과 새 persistent 변수의 연구자용 설명을 남긴다. 기존 프로젝트에서는 기존 인터페이스 보존이 우선한다.
- 변수명·key·파일명·wide/long shape는 기본적으로 `expected_binding`이다. 이것만으로 project-specific 또는 exclude로 내리지 않고, 숨은 sentinel·author-only helper/global·분산된 다중 수정·프로젝트 연구판단이 제어흐름에 박힌 경우만 `harmful_coupling`으로 본다.
- 과잉기각 점검 뒤 conditional cutoff를 55점으로 보정했다. 현재 56개는 `reference_only`로 보존하고 자동 조립은 preferred/conditional 55개만 허용한다. 자동 후보가 없는 표제어는 project-specific cleanup과 의도적 negative-only 두 단계뿐이다.
- `forval`/`forv` 약어를 loop parser가 놓치던 오류를 수정했다. 중첩 loop 반례는 negative evidence로만 남고 재사용 라벨의 active loop depth는 모두 1 이하다.

## 최근 사용자 제안 반영 / Retrieval and fallback decisions

1. 분류는 현재 40개 세부 표제어로 유지하고, 한영 alias·대표 command anchor·입력/출력 state·selection condition 순으로 찾는다. `canonical_default`는 상태가 맞은 후보 사이의 마지막 tie-break일 뿐이다.
2. 찾는 순서는 `라벨 사전 → 전체 수집 예제 → 공식 Stata 매뉴얼 → 사용자 질의`다. 매뉴얼은 문법·returned result·command state만 확정하며 연구 사양을 대신 고르지 않는다.
3. 신규 구축의 경로와 master call은 승인된 prompt 또는 pre-write plan을 따른다. 기존 프로젝트 경로·macro·호출부는 변경하지 않는다.
4. 현재 35개 기존 코퍼스와 매뉴얼·공식 자료는 충분하며 추가 다운로드를 하지 않는다. 변수명·key·data shape가 구체적이라는 이유만으로 빈칸으로 판정하지 않으며, 교체 가능한 binding과 해로운 project coupling을 구분한다.

현재 최우선 완료조건은 심사표 자체가 아니라 새 정보격리 SA가 default style 요구 산출물을 연구자식 do-file module로 전부 만들고, 중첩 loop·불필요한 program·과잉 추상화 없이 검증된 template을 최소 수정 재사용했음을 확인하는 것이다.

공식 매뉴얼 단계까지 확인한 결과도 금지 판정을 바꾸지 않았다. `duplicates drop`은 첫 관측치를 남길 뿐 충돌 레코드의 실질적 대표 규칙을 정하지 않고, `isid`는 유일성만 검사한다. `suest`는 같거나 겹치거나 다른 표본의 저장 추정치를 결합할 수 있지만 목표 비교가 표본 교집합을 써야 하는지 정하지 않는다. 따라서 두 negative-only 표제어는 실제 요청에서 사용자의 equality/aggregation/priority rule 또는 comparison estimand/common-support rule을 받은 뒤에만 새 양성 라벨을 만들 수 있다.

## 전수 package 검토 / Full package review

- 35개 package의 catalog `.do` 639개, 183,794행에 대해 reviewer의 `end_to_end_read` attestation을 기록했다.
- Builder가 639개 파일을 모두 다시 열어 catalog SHA-256·행 수와 모든 evidence path/span을 검증했다. 이는 auditable file coverage이며 인간의 주의나 Stata runtime을 증명하지는 않는다.
- 새 안전 후보는 0개다. 21개 package는 전수 검토됐지만 기존 라벨과 중복되거나, 프로젝트 종속·TeX·중첩 loop·manual matrix·unsafe merge 문제 때문에 새 양성 블록으로 승격하지 않았다.
- 자료 접근성·선택 사양·실행환경 관련 26개 질문은 package별 `unresolved_questions`로 격리했다. 전체 표는 `package_checkpoint_coverage.md`에서 중간 검토할 수 있다.

## 다음 사용자 검토 지점 / Next review points

1. `prototype` 표제어의 이름과 경계가 충분히 원자적인가.
2. 전수검색에서도 안전한 양성이 없었던 `integrity.adjacency_dedup`과 `postest.estimator_comparison_unsafe`를 금지 표제어로 유지할 것인가.
3. 같은 checkpoint의 다른 연구자 방법을 alternative로 함께 둘지, 단순 문법 중복으로 판정할지.
4. event-study 다섯 방법의 선택 조건이 실제 연구 설계를 구분하기에 충분한가.
