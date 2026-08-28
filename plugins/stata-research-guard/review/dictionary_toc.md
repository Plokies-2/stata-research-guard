# Stata workflow dictionary 목차

> 이 문서는 라벨링이 끝나기 전에도 현재 사전 상태를 검토할 수 있도록 builder가 갱신합니다.

## 현재 규모

- 표제어: 72개
- 용례: 602개
- 판정: keep 15 / conditional_keep 577 / drop 10
- 심사표: preferred 20 / conditional 50 / reference 522 / exclude 10
- 검색 구조: 단계 표제어 → 상태 계약 → 연구자별 variant → 원문 코드 조각

## 표제어별 현황

| 한글 표제어 | English name | checkpoint | 대표 명령 / Common commands | 찾는 특징 / Retrieval features | 성숙도 | 용례 | 자동선택 | 참고전용 | keep | conditional | drop | 상태 신호 있음 | 사람 직접기록 |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 분석변수 생성·재코딩 | Analysis-variable derivation and recoding | `clean.derive_variables` | generate; rename; replace; egen; keep | preparation; loaded data; substantive variable definitions and missing-value rules | comparative | 5 | 0 | 5 | 0 | 5 | 0 | 5/5 | 2/5 |
| 식별자 정규화 | Identifier normalization | `clean.id_normalize` | destring; use; keep | preparation; loaded identifier field; documented identifier semantics including leading zeros | comparative | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 1/2 |
| 임시파일 정리 | Temporary-file cleanup | `cleanup` | erase | cleanup; known project-owned temporary files; only disposable task-created intermediates removed | prototype | 2 | 0 | 1 | 0 | 1 | 1 | 2/2 | 0/2 |
| 분석자료 확정·라벨·저장 | Finalize, label, and save analysis data | `dataset.finalize_keep_label_save` | keep; save; label; compress; use | preparation; completed variable construction; known downstream variable requirements | comparative | 4 | 0 | 4 | 0 | 4 | 0 | 4/4 | 3/4 |
| 기초통계 명령 결과 | Descriptive command result | `descriptives.command_result` |  | preparation_validation; fixed analysis sample; declared variables, groups, weights, and statistics | guide_only | 18 | 0 | 18 | 0 | 18 | 0 | 18/18 | 18/18 |
| 개체단위 기초통계 집계 | Entity-level descriptive collapse | `descriptives.entity_collapse` | collapse; gcollapse; local; label | preparation; validated lower-level data; declared entity key | comparative | 9 | 3 | 6 | 0 | 9 | 0 | 9/9 | 8/9 |
| 활성 estpost 요약결과 | Active estpost summary result | `descriptives.estpost_active_result` | estpost | preparation_validation; analysis sample and variables already fixed; declared statistic or two-group comparison | comparative | 8 | 4 | 4 | 0 | 8 | 0 | 8/8 | 8/8 |
| 표본 흐름 자료 | Named sample-flow dataset | `descriptives.sample_flow` | tempname; postfile; post; postclose | preparation_validation; ordered sample transitions already declared by the study; one readable checkpoint name and current observation count at each transition | prototype | 4 | 1 | 3 | 0 | 4 | 0 | 4/4 | 4/4 |
| 추정표본 종속변수 평균 | Estimation-sample dependent-variable mean | `descriptives.sample_mean` | estadd; distinct; local; summarize; su | post_estimation; active or restored estimation result; dependent variable available in the estimation data | comparative | 3 | 1 | 2 | 0 | 3 | 0 | 3/3 | 2/3 |
| 기초통계 정본 자료 | Canonical summary-statistics dataset | `descriptives.summary_dataset` | collapse; preserve; tempfile; save; restore | preparation_validation; analysis sample and observation unit already fixed; declared grouping keys, variables, and statistics | comparative | 8 | 3 | 5 | 0 | 8 | 0 | 8/8 | 8/8 |
| 표시 제어 진단 | Display-control diagnostics | `diagnostics.display` |  | diagnostic; active data or an active result; a declared command whose display behavior is relevant | guide_only | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 2/2 |
| 표준 회귀 추정 | Conventional regression estimation | `estimation.conventional` | regress; reghdfe; local; estadd_obs; estadd_mean_y | estimation; analysis sample; visible outcome, treatment, controls, fixed effects, and clustering choices | comparative | 174 | 6 | 168 | 4 | 170 | 0 | 174/174 | 170/174 |
| 차분의 차분 추정 | Difference-in-differences estimation | `estimation.difference_in_differences` |  | estimation; declared outcome, treatment, group and time variables; declared panel or repeated-cross-section form | guide_only | 5 | 0 | 5 | 0 | 5 | 0 | 5/5 | 5/5 |
| 회귀불연속 추정 | Regression-discontinuity estimation | `estimation.rdrobust_suite` |  | estimation; declared outcome and running variable; declared cutoff | guide_only | 6 | 0 | 6 | 0 | 6 | 0 | 6/6 | 6/6 |
| 시차 도입 DID 추정 | Staggered-adoption DID estimation | `estimation.staggered_did` | local; jwdid; estat; estadd; count | estimation; validated panel; cohort or first-treatment variable | comparative | 10 | 7 | 3 | 1 | 9 | 0 | 10/10 | 6/10 |
| 복합표본 설계 | Survey-design declaration and estimation | `estimation.survey_design` |  | estimation; declared survey design variables and weight semantics; a stated subpopulation or estimation target when used | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 합성통제 추정 | Synthetic-control estimation | `estimation.synthetic_control` |  | estimation; declared unit and time identity; declared treated unit and treatment period | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 자료 파일 내보내기 | Dataset-file export | `exports.dataset_file` |  | post_estimation_export; active finalized dataset; declared variable schema, destination, and overwrite role | guide_only | 6 | 0 | 6 | 0 | 6 | 0 | 6/6 | 6/6 |
| 기초통계 Excel 시트 | Descriptive-statistics Excel sheet | `exports.descriptive_excel_sheet` | preserve; collapse; export excel; restore; keep | post_estimation_export; finalized in-memory descriptive table at the intended row unit; declared workbook path and sheet name | comparative | 2 | 2 | 0 | 0 | 2 | 0 | 2/2 | 2/2 |
| 추정치 CSV 표 | Estimate CSV table | `exports.estimate_text_table` | esttab | post_estimation_export; one or more named compatible estimates; declared CSV output path and overwrite role | prototype | 4 | 1 | 3 | 0 | 4 | 0 | 4/4 | 4/4 |
| 행렬·collection Excel 내보내기 | Matrix or collection Excel export | `exports.matrix_excel` | putexcel; collect export | post_estimation_export; a named matrix or an already populated Stata collection; declared workbook path, sheet role, and overwrite semantics | comparative | 4 | 2 | 2 | 0 | 4 | 0 | 4/4 | 4/4 |
| 가구단위 집계변수 | Household-level aggregate features | `feature.aggregate_household` | generate; egen | preparation; validated household key; person-level member definitions | prototype | 1 | 1 | 0 | 0 | 1 | 0 | 1/1 | 0/1 |
| 구역단위 노출 집계 | Section-level exposure aggregation | `feature.aggregate_section_exposure` | egen; label variable; generate; label; drop | preparation; validated section key; person-level treatment and subgroup indicators | prototype | 1 | 0 | 1 | 0 | 1 | 0 | 1/1 | 0/1 |
| 구간 산점도 | Binned scatter plot | `figures.binned_scatter` |  | figure; declared analysis sample and x/y variables; declared bin count or compatible precomputed bin identifier when used | guide_only | 7 | 0 | 7 | 0 | 7 | 0 | 7/7 | 7/7 |
| 명명된 추정치 계수 그림 | Named-estimate coefficient plot | `figures.coefplot_named_estimates` | coefplot | post_estimation_export; named stored estimates compatible with coefplot; declared coefficient keep/order mapping and display labels | prototype | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 기초통계 막대그림 | Descriptive bar chart | `figures.descriptive_bar` | graph bar | post_estimation_export; precomputed descriptive values at a declared category or group unit; declared value, category, and optional series variables | prototype | 1 | 0 | 1 | 0 | 1 | 0 | 1/1 | 1/1 |
| 일반 기초통계 그림 | General descriptive graph | `figures.descriptive_graph` |  | post_estimation_export; active data or compatible post-estimation result; declared plot variables, sample, geometry, and axis meaning | guide_only | 11 | 0 | 11 | 0 | 11 | 0 | 11/11 | 11/11 |
| 기초통계 산점도 | Descriptive scatter plot | `figures.descriptive_scatter` | graph export; twoway; use; collapse; scatter | post_estimation_export; named analysis dataset; declared plotting unit and variable units | comparative | 3 | 1 | 2 | 0 | 3 | 0 | 3/3 | 2/3 |
| 이벤트 스터디 그림 | Event-study figure | `figures.event_study` | event_plot; local; estimates; estimates use; estimates store | post_estimation_export; named event-time coefficients with one declared design reference; validated event window and estimation sample | comparative | 16 | 0 | 15 | 0 | 15 | 1 | 16/16 | 15/16 |
| PDF 그림 내보내기 | Figure PDF export | `figures.export_pdf` | graph export | post_estimation_export; active Stata graph exists in memory; PDF output is requested | prototype | 5 | 1 | 4 | 0 | 5 | 0 | 5/5 | 5/5 |
| 한계효과 그림 | Margins plot | `figures.marginsplot` | marginsplot | post_estimation_export; active margins result; declared figure geometry and confidence-interval style | prototype | 1 | 1 | 0 | 0 | 1 | 0 | 1/1 | 1/1 |
| 명명된 그림 결합 | Named graph composition | `figures.named_graph_combine` | graph combine | post_estimation_export; two or more named graphs already in memory; declared component order and rows or columns | prototype | 1 | 1 | 0 | 0 | 1 | 0 | 1/1 | 1/1 |
| 최종 Excel 회귀표 조립 | Final Excel regression-table assembly | `final_excel_assembly` | preserve; local; outreg2; import delimited; display | post_estimation_export; approved .ster states restored under readable in-memory estimate names, including explicitly identified 2SLS first-stage model-role results when requested; each sheet_plan placement lists ordered estimate_names matching the declared outcomes and specification_order | comparative | 13 | 1 | 10 | 1 | 10 | 2 | 13/13 | 11/13 |
| 다중 원자료 결합 | Multi-source input combination | `input_load.combine` | append; insheet; generate; drop; destring | preparation; source files with a stable shared schema; documented source order | comparative | 5 | 1 | 4 | 0 | 5 | 0 | 5/5 | 4/5 |
| 단일 원자료 불러오기 | Single-source input loading | `input_load.single_source` | replace; save; import excel; use; drop | preparation; documented source file; source-specific codebook or crosswalk | comparative | 12 | 3 | 9 | 2 | 10 | 0 | 12/12 | 10/12 |
| 인접행 중복 제거 | Adjacency-based deduplication | `integrity.adjacency_dedup` | drop; sort; rename; keep; label | validation; repeated lower-level observations with unproven within-group equality; comparison-only warning, never a finalized dataset | negative_only | 1 | 0 | 0 | 0 | 0 | 1 | 1/1 | 0/1 |
| 무결성 진단 | Integrity audit | `integrity.audit` | merge; assert; drop; isid; tabulate | validation; candidate key and expected ranges or code values; explicit pass or diagnostic evidence without silently changing observations | comparative | 24 | 6 | 17 | 1 | 22 | 1 | 24/24 | 22/24 |
| 결측자료 점검과 MI 상태 | Missing-data and MI state | `integrity.missing_data` |  | validation; declared missing-value semantics; declared imputation scope and variables when MI is used | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 자료 병합·형태 변환 | Data integration and reshape | `merge_reshape.integration` | merge; drop; use; reshape; replace | preparation; merge branch: validated keys on every input, with declared join cardinality and unmatched-row policy; reshape branch: declared i() and j() identifiers whose combination is unique, explicit stub/suffix topology, and the required wide or long downstream state | comparative | 35 | 7 | 27 | 1 | 33 | 1 | 35/35 | 31/35 |
| 이상치 윈저화 | Outlier winsorization | `outlier.winsorize` | winsor2; label; preserve; use; generate | preparation; continuous variable; pre-specified tail cutoff and overwrite policy | comparative | 7 | 1 | 6 | 0 | 7 | 0 | 7/7 | 6/7 |
| 패널 시점 격자 생성 | Panel time-grid materialization | `panel.materialize_time_grid` | tsfill | preparation; unique entity-time data already declared with xtset or tsset; explicit decision to create rows for internal missing time points | prototype | 3 | 1 | 2 | 0 | 3 | 0 | 3/3 | 3/3 |
| 조사시점 적층 | Survey-wave stacking | `panel.stack_waves` | generate; replace; keep; use; save | preparation; one-row-per-unit wide data with wave-specific variables; explicit cross-wave variable mapping | comparative | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 1/2 |
| 시계열 연산자 | Time-series operator state | `panel.time_operator` |  | preparation; declared tsset or xtset-compatible time ordering; declared variable and boundary treatment | guide_only | 5 | 0 | 5 | 0 | 5 | 0 | 5/5 | 5/5 |
| 패널 처치 코호트 | Panel treatment cohort | `panel.treatment_cohort` | use; rename; egen; xtset; generate | preparation; unit-time panel; treatment timing definition | prototype | 1 | 0 | 1 | 0 | 1 | 0 | 1/1 | 1/1 |
| 교체 사건시점 | Turnover event timing | `panel.turnover_event_time` | egen; drop; generate; replace; xtset | preparation; validated unit-time panel; leader or state identifier | prototype | 1 | 0 | 1 | 0 | 1 | 0 | 1/1 | 0/1 |
| 사후추정 명령 결과 | Post-estimation command result | `postest.command_result` |  | post_estimation; compatible active estimation state; caller-declared post-estimation target | guide_only | 32 | 0 | 32 | 0 | 32 | 0 | 32/32 | 32/32 |
| 미검증 추정량 비교 | Unsafe estimator comparison | `postest.estimator_comparison_unsafe` | use; merge; keep; drop; generate | validation; multiple estimator outputs with uncertain sample alignment; comparison-only warning, never a reusable implementation | negative_only | 1 | 0 | 0 | 0 | 0 | 1 | 1/1 | 0/1 |
| 추정표본 키 내보내기 | Export estimation-sample keys | `postest.export_sample_keys` | preserve; keep; save; restore | post_estimation; named estimation-sample flag; validated unique observation keys | prototype | 1 | 1 | 0 | 0 | 1 | 0 | 1/1 | 1/1 |
| 사후 예측·한계효과 | Post-estimation margins | `postest.margins` | margins | post_estimation; a compatible active estimation result; declared focal variable and requested values or contrasts | prototype | 3 | 1 | 2 | 0 | 3 | 0 | 3/3 | 3/3 |
| 추정결과 영구 저장 | Persist estimation result | `postest.persist_estimate` | estimates save; estimates use; estimates restore; estimates store; xtivreg2 | post_estimation; active e-class estimation result or a declared named or numbered stored result; declared downstream consumer, result path, and state order when a collection is used | comparative | 15 | 7 | 8 | 1 | 14 | 0 | 15/15 | 15/15 |
| 추정표본 표시자 고정 | Estimation-sample flag capture | `postest.sample_flag` | generate; replace; label; regress | post_estimation; active main e-class estimation result; data used by that estimate still in memory | comparative | 3 | 2 | 1 | 2 | 1 | 0 | 3/3 | 2/3 |
| 그룹별 처리 | By-group processing | `preparation.by_group` |  | preparation; active data; declared group key and required ordering | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 표시 형식 메타데이터 | Display-format metadata | `preparation.display_metadata` |  | preparation; active variable with unchanged substantive meaning; declared display format | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 저장형식 메타데이터 | Storage-type metadata | `preparation.storage_metadata` |  | preparation; active data; declared variable meaning and required precision | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 임시 객체 상태 | Temporary-object state | `preparation.temporary_state` |  | preparation; active Stata session; declared immediate consumer for each temporary object | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 일반 자료 변환 | General data transformation | `preparation.transform` |  | preparation; active data; caller-declared variables and transformation semantics | guide_only | 28 | 0 | 28 | 0 | 28 | 0 | 28/28 | 28/28 |
| 변수목록 해석 | Varlist resolution | `preparation.varlist_resolution` |  | preparation; active dataset; declared variable-selection rule or explicit varlist | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 프로젝트 경로 설정 | Project path setup | `project_setup.paths` | global; mkdir; clear; log; set | setup; known project root or a user-approved root placeholder; observed existing folder layout | comparative | 3 | 1 | 1 | 1 | 1 | 1 | 3/3 | 1/3 |
| 부트스트랩 추론 | Bootstrap inference | `robustness.bootstrap_inference` | boottest | post_estimation; compatible active estimate; declared target coefficient and null hypothesis | prototype | 9 | 1 | 8 | 0 | 9 | 0 | 9/9 | 9/9 |
| 이질성 분석 | Heterogeneity analysis | `robustness.heterogeneity` | local; generate; use; label variable; regress | post_estimation; baseline design; pre-specified subgroup or interaction variable | comparative | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 0/3 |
| 잭나이프 검정 | Jackknife analysis | `robustness.jackknife` | jregress | post_estimation; baseline design; declared resampling unit and seed | prototype | 2 | 1 | 0 | 0 | 1 | 1 | 2/2 | 1/2 |
| 다중검정 보정 | Multiple-testing adjustment | `robustness.multiple_testing` |  | robustness; declared model-to-target mapping; declared testing family and resampling plan | guide_only | 4 | 0 | 4 | 0 | 4 | 0 | 4/4 | 4/4 |
| 위약 검정 | Placebo test | `robustness.placebo` | rename; local; reghdfe; distinct; summarize | post_estimation; baseline design; pre-specified placebo treatment, timing, or outcome | comparative | 5 | 0 | 5 | 0 | 5 | 0 | 5/5 | 4/5 |
| 재표본·시뮬레이션 | Resampling and simulation | `robustness.resampling_simulation` |  | robustness; declared statistic or command; declared repetitions, seed, and assignment or strata design | guide_only | 3 | 0 | 3 | 0 | 3 | 0 | 3/3 | 3/3 |
| 처치군·응답 적격 표본 | Arm and response eligibility sample | `sample.arm_response_eligibility` | drop; keep; destring; compress; save | preparation; cleaned respondent or unit data; declared arm and response eligibility rules | comparative | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 0/2 |
| 명시적 표본 제한 | Declared sample restriction | `sample.restriction` |  | preparation; active data; caller-declared eligibility, time-window, or required-variable rule | guide_only | 7 | 0 | 7 | 0 | 7 | 0 | 7/7 | 7/7 |
| 무역비중 임계값 표본 | Trade-share threshold sample | `sample.trade_share_threshold` | use; keep; collapse; sort; generate | preparation; integrated trade data; pre-specified cumulative share threshold and country roles | comparative | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 0/2 |
| 추정표본 기준 표준화 | Estimation-sample standardization | `scale.standardize_esample` | generate; summarize; egen; drop; replace | preparation; named estimation-sample flag; declared components and missing-component rule | comparative | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 1/2 |
| 표 collection 결과 | Table collection result | `tables.collection_result` |  | post_estimation_export; active data or compatible estimation result; declared rows, columns, statistics, model set, and Stata-version interface | guide_only | 11 | 0 | 11 | 0 | 11 | 0 | 11/11 | 11/11 |
| 처치군 매핑 | Treatment-arm mapping | `treatment.arm_mapping` | generate; replace; label; drop; keep | preparation; documented randomized or observational treatment arms; declared estimand and comparison group | comparative | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 0/2 |
| 선언된 파일 실행 | Declared file execution | `workflow_orchestration.file_execution` |  | orchestration; declared file path; user-approved execution order and path context | guide_only | 2 | 0 | 2 | 0 | 2 | 0 | 2/2 | 2/2 |
| 마스터 실행 흐름 | Master workflow orchestration | `workflow_orchestration.master` | do; log; clear; drop; version | orchestration; resolved role paths; ordered list of workflow stages | comparative | 3 | 1 | 2 | 1 | 2 | 0 | 3/3 | 0/3 |

## 검토 기준

- 용례가 1개뿐이면 아직 연구자 간 변형이 충분하지 않을 수 있습니다.
- `prototype`은 재사용 가능 용례가 1개, `comparative`는 2개 이상, `negative_only`는 금지 사례만 있다는 뜻입니다.
- `drop`만 있는 표제어는 안전한 대체 용례가 없는 빈칸입니다.
- `상태 신호 있음`은 원문 코드에서 관측 가능한 command/state 신호가 기록됐다는 뜻입니다.
- `사람 직접기록`이 낮으면 상태 신호는 코드에서 자동 추출됐고, 연구자별 handoff 의미는 아직 사람이 세분하지 않았다는 뜻입니다.
- 같은 표제어의 variant는 함께 보존하되 selection condition이 겹치면 중복 또는 통합 여부를 검토합니다.
