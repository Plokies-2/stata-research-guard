# Package × checkpoint coverage / 패키지별 체크포인트 범위

> 이 문서는 35개 package의 모든 `.do` 파일을 라벨 수와 별도로 accounting합니다. `end_to_end_read`는 reviewer의 전수 독해 attestation이며, builder가 별도로 전 파일의 경로·행 수·SHA-256과 인용 span을 검증합니다.

## 현재 범위

- package: 35개
- `.do`: 639개 / 183794행
- review level: {'end_to_end_read': 35}
- 라벨 출처가 있는 package: 21개; 없는 package: 14개
- 아직 라벨로 승격하지 않은 안전 후보: 0개
- 해결되지 않은 연구·자료 질문: 26개

## Package accounting

| package | journal | review level | files | lines | labels | reusable | unlabeled candidates | unresolved | entrypoint |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| `111707` | American Economic Journal: Applied Economics | end_to_end_read | 5/5 | 4271/4271 | 0 | 0 | 0 | 1 | Regression-and-Event-Study-Analyses.do |
| `115162` | American Economic Journal: Applied Economics | end_to_end_read | 9/9 | 5475/5475 | 1 | 1 | 0 | 0 | Master.do |
| `120068` | American Economic Journal: Economic Policy | end_to_end_read | 4/4 | 2408/2408 | 11 | 11 | 0 | 1 | Democracy and Aid Donorship replication file MAIN.do |
| `124641` | AEA Papers and Proceedings | end_to_end_read | 5/5 | 1672/1672 | 0 | 0 | 0 | 0 | Master.do |
| `148522` | American Economic Journal: Economic Policy | end_to_end_read | 15/15 | 3261/3261 | 7 | 7 | 0 | 0 | 0.master.do |
| `154781` | American Economic Review | end_to_end_read | 1/1 | 2478/2478 | 0 | 0 | 0 | 1 | run_figures_tables.do |
| `160101` | American Economic Journal: Economic Policy | end_to_end_read | 17/17 | 14386/14386 | 0 | 0 | 0 | 2 | master.do |
| `173341` | American Economic Review | end_to_end_read | 6/6 | 5412/5412 | 17 | 14 | 0 | 1 | dofiles/0. Master.do |
| `175582` | American Economic Review | end_to_end_read | 15/15 | 4844/4844 | 11 | 11 | 0 | 1 | Code/Master_file.do |
| `185181` | AEA Papers and Proceedings | end_to_end_read | 6/6 | 1234/1234 | 0 | 0 | 0 | 1 | dofile - 0 - master.do |
| `185943` | Journal of Economic Perspectives | end_to_end_read | 16/16 | 4180/4180 | 0 | 0 | 0 | 1 | 00_doall.do |
| `191751` | American Economic Journal: Economic Policy | end_to_end_read | 11/11 | 9545/9545 | 14 | 13 | 0 | 2 | master.do |
| `193441` | American Economic Review | end_to_end_read | 35/35 | 5380/5380 | 5 | 5 | 0 | 1 | replicate_information/1_build/build.do |
| `194561` | American Economic Journal: Applied Economics | end_to_end_read | 14/14 | 2675/2675 | 23 | 19 | 0 | 0 | code/0_master.do |
| `195983` | American Economic Review | end_to_end_read | 15/15 | 9956/9956 | 1 | 1 | 0 | 1 | nafta_politics_replication_submission_PUBLIC/do_files/master.do |
| `196012` | American Economic Review | end_to_end_read | 195/195 | 29090/29090 | 2 | 2 | 0 | 0 | Do/Master.do |
| `202444` | American Economic Review | end_to_end_read | 33/33 | 8801/8801 | 1 | 1 | 0 | 2 | code/0. runall.do |
| `209030` | American Economic Review | end_to_end_read | 31/31 | 2258/2258 | 1 | 1 | 0 | 0 | AER_ReplicationPackage/Code/(1) STATA - Build Dataset/Build Dataset.do |
| `209484` | American Economic Journal: Economic Policy | end_to_end_read | 11/11 | 1398/1398 | 3 | 2 | 0 | 1 | Data and Code for AEJPol-2023-0668/MASTER.do |
| `237291` | American Economic Journal: Economic Policy | end_to_end_read | 18/18 | 8463/8463 | 0 | 0 | 0 | 2 | GPP_Hurricanes_ReplicationPackage/DoFiles/master.do |
| `z10611203` | The Review of Economic Studies | end_to_end_read | 2/2 | 2048/2048 | 0 | 0 | 0 | 0 | MS28862/DoFiles/ACGGH_main.do |
| `z14968164` | The Review of Economic Studies | end_to_end_read | 4/4 | 1328/1328 | 0 | 0 | 0 | 0 | GxE_metrics_replication_package/0_code/0_runall.do |
| `z15288849` | The Review of Economic Studies | end_to_end_read | 18/18 | 20970/20970 | 1 | 1 | 0 | 1 | master_setup.do |
| `z17712099` | The Review of Economic Studies | end_to_end_read | 4/4 | 365/365 | 1 | 1 | 0 | 0 | jregress/example.do |
| `z18399359` | The Review of Economic Studies | end_to_end_read | 23/23 | 9550/9550 | 0 | 0 | 0 | 2 | data_usoc/setup_usoc_data.do |
| `z21562174` | The Review of Economic Studies | end_to_end_read | 13/13 | 4510/4510 | 3 | 3 | 0 | 0 | Code/_master.do |
| `z4602567` | The Review of Economic Studies | end_to_end_read | 3/3 | 842/842 | 2 | 2 | 0 | 0 | Replication_files/0_masterfile.do |
| `z4665536` | The Review of Economic Studies | end_to_end_read | 26/26 | 988/988 | 1 | 0 | 0 | 1 | Stata code/Code tables/Table_4.do |
| `z4733035` | The Review of Economic Studies | end_to_end_read | 14/14 | 4494/4494 | 0 | 0 | 0 | 1 | Replication Package_MS25930_2May2021/A_Generate_BANK_dataset.do |
| `z5338362` | The Review of Economic Studies | end_to_end_read | 12/12 | 1432/1432 | 1 | 1 | 0 | 1 | ReproductionFiles/MASTER.do |
| `z5652443` | The Review of Economic Studies | end_to_end_read | 1/1 | 142/142 | 0 | 0 | 0 | 0 | qobsims_reverse_engineer.do |
| `z5652808` | The Review of Economic Studies | end_to_end_read | 7/7 | 1219/1219 | 0 | 0 | 0 | 1 | ReplicationPackage/EmpiricalAnalysis/master.do |
| `z6976241` | The Review of Economic Studies | end_to_end_read | 1/1 | 139/139 | 1 | 1 | 0 | 0 | Replication/Table 1 Section 5/Code/CleanData.do |
| `z7901559` | The Review of Economic Studies | end_to_end_read | 16/16 | 4801/4801 | 0 | 0 | 0 | 0 | 1_1_prep_firm_data.do |
| `z8376886` | The Review of Economic Studies | end_to_end_read | 33/33 | 3779/3779 | 2 | 2 | 0 | 1 | replication package/master_clean.do |

## 해석

- `end_to_end_read`: reviewer가 package의 모든 `.do`를 읽고 11개 stage를 판정했다고 attestation한 상태입니다. Builder는 전 파일을 다시 열어 hash·행 수·근거 경로를 검증하지만 인간의 주의나 Stata runtime을 증명하지는 않습니다.
- `targeted_search_only`: 특정 명령·표·그림·추정법을 전수검색했지만 전체 workflow 독해는 아직 아닙니다.
- `inventory_only`: 파일과 자동 stage 신호만 확인됐으며 사람의 end-to-end 판정이 필요합니다.
- 라벨이 없다는 사실은 stage가 없다는 뜻이 아닙니다. 양성 블록 부재, 안전성 탈락, 중복, TeX·중첩 loop 제외를 별도로 봐야 합니다.
