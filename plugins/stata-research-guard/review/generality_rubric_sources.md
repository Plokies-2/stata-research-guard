# Stata 재사용 코드 심사표: 외부 근거와 적용 경계

이 문서는 `annotations/generality_rubric.json`의 판정 영역을 위한 근거 목록이다. 범위는 **Stata 코드의 정적 품질·이식성·재현 가능성·템플릿 적합성**이다. 높은 점수는 추정량의 식별, 변수 의미, 인과적 타당성, 실행 성공 또는 research-practice 승인를 뜻하지 않는다.

## 근거를 쓰는 방식

- StataCorp 자료는 명령의 상태·문법·실제 위험(예: merge key)을 뒷받침한다.
- Data Editor와 Lars Vilhuber의 가이드는 재현성 패키지의 실무 기준을 뒷받침한다. Vilhuber는 Data Editor가 직접 참조하는 경제학 재현성 가이드의 저자다.
- loop depth 1 우선, 검토된 두 plain 반복축에 한한 depth 2 예외, depth 3 차단, program 안의 연구논리 가시성, minimal adaptation의 강제, 점수 가중치·cutoff는 **플러그인 정책**이다. Stata가 해당 문법을 금지한다고 주장하지 않는다.
- StataCorp의 공식 블로그가 구분하듯, 고정된 입력·작업·산출물은 do-file script에 두고 여러 상황에서 인자를 받아 반복 사용할 진짜 command만 ado/program으로 올리는 것을 기본 판정 원칙으로 삼는다. 이는 program 전면 금지가 아니라 필요성·범용성 증명 요구다.
- 구체적인 변수명·key·파일명·wide/long 구조는 연구 코드의 정상적인 binding이다. 이들이 `minimal_edit_fields`에 고립되어 있으면 감점 사유가 아니다. 판정 대상은 이름 자체가 아니라 이름을 바꾸기 위해 제어흐름이나 여러 파일을 다시 짜야 하는지다.

| 평가 영역 | 직접 근거 (페이지/섹션) | 짧은 근거 요약 | rubric 적용 |
|---|---|---|---|
| state visibility | [Stata Programming Reference Manual, `macro`, p. 307](https://www.stata.com/manuals17/p.pdf) | global macro는 넓게 남지만 local macro는 do-file/program 범위에 한정된다. | `global`, `local`, active `e()`, `preserve/restore`를 source span과 이웃 문맥에서 찾아야 한다. 숨은 global 의존은 감점한다. |
| deterministic state | [Stata Programming Reference Manual, `set sortrngstate`, Reproducibility, pp. 544–545](https://www.stata.com/manuals17/p.pdf) | 동률 sort의 결과는 실행마다 달라질 수 있고, seed/state로 제어할 수 있다. | randomization 또는 order-sensitive tie가 있으면 `set seed`/명시적 tie rule/state 보존을 확인한다. |
| input/output contract | [Data Editor, Step 1: Main file, Scenario A/B](https://aeadataeditor.github.io/aea-de-guidance/preparing-replication-package-step1) | research-practice 예시는 main에서 root를 잡고 preparation, table, figure do-file을 순서대로 호출한다. | block의 `use/import`, `save`, estimate/table/figure export 및 overwrite 의미가 contract와 맞는지 평가한다. |
| portability | [Data Editor, Step 1: Important](https://aeadataeditor.github.io/aea-de-guidance/preparing-replication-package-step1) | 개인 컴퓨터 경로를 hard-code하지 말고 project root를 동적으로 설정하라고 명시한다. | username, Dropbox, drive-letter, author binary path는 `general` default에서 hard fail; 승인된 하나의 root placeholder는 조건부 허용이다. |
| master orchestration | [Vilhuber, Hands-off running: Creating a controller script, TL;DR and Stata](https://larsvilhuber.github.io/self-checking-reproducibility/02-hands_off_running.html) | 처음부터 끝까지 사용자 개입 없이 오류 없이 실행되어 모든 표·그림·숫자를 만들어야 하며, main은 파일을 올바른 순서로 호출해야 한다. | 한 entrypoint, 직접적인 ordered `do` 호출, 로그·생성물 연결을 가점한다. interactive selection이나 `capture run`으로 호출을 숨기는 것은 감점한다. |
| reproducibility evidence | [Vilhuber, Hands-off running: Takeaways](https://larsvilhuber.github.io/self-checking-reproducibility/02-hands_off_running.html) | 재실행은 모든 output을 만들고 inspectable log를 남겨야 하며 다른 컴퓨터에서도 돌아가야 한다. | log, seed, durable output, top-level call order를 별도 차원에서 평가한다. 정적 점수는 fresh run 증거를 대체하지 않는다. |
| dependency/version | [Data Editor, Step 3: Dependencies, Stata packages](https://aeadataeditor.github.io/aea-de-guidance/preparing-replication-package-step3) | 동일 version의 user-written package가 필요하며 version drift는 재현 실패의 흔한 원인이다. project-local ado와 `which` 확인을 제시한다. | external command마다 command/version/source/preflight 또는 bundled evidence가 없으면 reproducible default에서 제외한다. runtime install을 했다는 사실만으로 고득점이 되지 않는다. |
| dependency isolation | [Vilhuber, Environments in Stata, TL;DR; `adopath`; Using environments](https://larsvilhuber.github.io/self-checking-reproducibility/12-environments-in-stata.html) | Stata의 search path와 `which`가 어떤 command를 찾는지 드러내며, project environment는 안정성과 portability를 높인다. | `adopath`, `sysdir`, `which`, tested source/version 기록을 dependency visibility로 채점한다. |
| merge/key integrity | [Stata `merge` manual, `assert()`/`keep()`, pp. 3–4](https://www.stata.com/manuals/dmerge.pdf) | `assert()`는 허용되지 않은 match result에 오류를 내어 검증하고, `keep()`은 단지 관측치를 선택한다. | merge 뒤 `_merge`를 무검증 drop하는 block은 0점/제외. cardinality와 허용 state를 code 또는 immediate assertion으로 보여야 한다. |
| merge cardinality | [Stata `merge` manual, key variables and 1:1/m:1, pp. 6–9](https://www.stata.com/manuals/dmerge.pdf) | 1:1 key는 양 file에서 unique여야 하며, m:1은 using 측 key uniqueness가 요구된다. | `isid`, duplicates audit, declared `merge 1:1/m:1/1:m`, row-count/key postcheck를 찾는다. `joinby`는 명시적 pair construction contract 없이는 일반 default가 아니다. |
| panel key | [Stata FAQ, repeated time values within panel, “Do identifier and time uniquely identify the data?”](https://www.stata.com/support/faqs/data-management/repeated-time-values/) | panel은 id-time 조합이 최대 한 번이어야 하며 `isid id time` 또는 `bysort ...: assert _N == 1`로 점검할 수 있다. | panel declaration·lag·event-time 전에 key assertion이 있는지 평가한다. |
| duplicate merge risk | [Stata FAQ, match merging with duplicate IDs, “Why does my merge produce a dataset with too many observations?”](https://www.stata.com/support/faqs/data-management/merging-with-duplicate-ids/) | duplicate ID는 match merge에서 뜻밖의 관측치 증가를 낳을 수 있고 `duplicates`와 `isid`가 진단에 쓰인다. | force drop이나 무근거 de-duplication은 source-specific anti-pattern으로 기록하고 generic generation에서 배제한다. |
| loops/programs | [Stata Programming Reference Manual, table of contents: `foreach`, `forvalues`, `program`, `macro`](https://www.stata.com/bookstore/programming-reference-manual/index.html) | Stata는 loop·macro·program을 정식 programming 도구로 제공한다. 이 자체는 품질 결함이 아니다. | nested loop 금지와 opaque research program review는 가독성·검토 가능성을 위한 plugin policy이다. loop는 한 개의 명시적 반복축을 줄일 때만 고득점, program은 공통 기계적 동작을 캡슐화하고 추정/표본 결정은 call site에서 보일 때 고득점이다. |
| do-file와 reusable command의 경계 | [Stata Blog, “Programming an estimation command in Stata: Where to store your stuff”](https://blog.stata.com/2015/10/27/programing-an-estimation-command-in-stata-where-to-store-your-stuff/) | 고정된 task/input/output을 반복하는 것은 do-file script이고, 인자를 받아 다양한 입력에 적용하는 범용 작업은 command로 만드는 구분을 제시한다. | 프로젝트 고유 추정·표본·merge를 program으로 숨기면 감점/수동심사한다. 명시적 `syntax`, 좁은 I/O, 여러 call site에서 실제 재사용되는 기계적 helper만 program 고득점 후보로 둔다. |
| do-file 재현성 | [Stata Blog, “Revealed preference: Stata for reproducible research”](https://blog.stata.com/2020/06/04/revealed-preference-stata-for-reproducible-research/) | 연구 결과와 산출물을 do-file로 다시 만들 수 있어야 한다는 실행 가능한 재현성 관점을 제시한다. | interactive 복사·붙여넣기나 문서화되지 않은 수동 transfer는 감점하고, master에서 호출되는 실행 가능한 do-file module을 가점한다. |
| project-specific coupling | [Data Editor, Step 1: Important](https://aeadataeditor.github.io/aea-de-guidance/preparing-replication-package-step1) | 동적 root의 목적은 다른 컴퓨터에서 수정 없이 실행하는 것이다. | `source_specific_elements`를 expected binding(변수/key/file/data shape)과 harmful coupling(undocumented sentinel, author-only helper/global, scattered edits, project research choice in control flow)으로 나눈다. expected binding이 구체적이라는 이유만으로 project-specific 판정을 내리지 않는다. |
| minimal adaptation | [Data Editor, Step 1: Main file, opening note](https://aeadataeditor.github.io/aea-de-guidance/preparing-replication-package-step1) | 기존 main이 있으면 새 이름의 main을 만들기보다 상황에 맞게 기존 main을 업데이트할 수 있다고 안내한다. | plugin의 더 강한 계약: existing interface·call order는 보존하고 `minimal_edit_fields`와 `required_changes` 밖 구조 변경은 minimal reuse에서 제외한다. 이 강화 규칙은 외부 문서의 직접 요구가 아니라 provenance-safe generation policy다. |
| environment documentation | [Data Editor, Finalize README](https://aeadataeditor.github.io/aea-de-guidance/preparing-replication-package-finalize) | Stata variant/version, cores, memory, OS, expected runtime을 정확히 기록하라고 안내한다. | package-level audit에서는 dependency/version과 runtime evidence에 반영한다. 작은 atomic span에 없다는 이유만으로 감점하지 않으며, package/root context에서 충족될 수 있다. |

## 기계 적용 절차

1. `label_id`, `source_path`, `source_spans`, source-file hash, span hash를 검증하고, span 양쪽의 의미 있는 명령을 최소 두 개씩 읽는다.
2. `decision=drop` 또는 `reuse_scope=negative`를 즉시 generation 제외한다. target의 `selection_conditions`, `state_signature.requires`, `input_contract/output_contract`가 맞지 않아도 그 target에서는 제외한다. 다만 raw span의 안전 결손이 좁고 검증 가능한 `required_changes`로 명시되어 있으면 그 block은 conditional/reference로 보존하고, 수정 전 preferred exact reuse만 금지한다.
3. merge/panel 관련 span에는 merge/key 차원을, estimation·sample·post-estimation·export 관련 span에는 estimand/sample 차원을 적용한다. 관련 없는 차원은 score 0이 아니라 denominator에서 제외한다.
4. applicable 차원을 각각 0–5로 채점하고, JSON의 renormalized weighted formula를 쓴다. 좋은 가독성이 merge contract 부재나 sample 불투명성을 상쇄하지 못한다.
5. score band 뒤에는 contract match, explicit canonical exception, reuse scope, minimal adaptation, readability 순으로 tie-break한다. 높은 점수의 project-specific code가 호환되는 general block을 이기지 못한다.
6. 점수가 낮더라도 provenance가 유효한 block은 reference-only로 보존한다. 실제 exclude/drop은 잘못된 source, 명확한 anti-pattern, 계약상 생성 금지에 한정하며 점수 cutoff만으로 자료를 버리지 않는다.
7. 조건부 후보 cutoff는 55점으로 보정했다. 70점을 그대로 쓰면 input, merge/reshape, winsorization, wave stacking, treatment cohort 등 12개 표제어가 비어 atomic-block 심사 목적에 맞지 않았다. 55–84.9점 block은 자유 자동복사가 아니라 state contract·`required_changes`·provenance 검증을 모두 통과할 때만 조립한다.

## 불확실성과 금지된 해석

- 정적 span review만으로 data value, external package version, analysis sample, output 수치를 검증할 수 없다. fresh environment에서 master를 실행하고 logs/output hashes를 확인해야 한다.
- short atomic span은 앞 단계에서 만들어진 global/local macro 또는 active estimate에 합법적으로 의존할 수 있다. 따라서 absent를 자동 결함으로 보지 말고 annotation contract와 adjacent context로 근거를 남긴다.
- `minimal_edit_fields: []`가 명시돼 있으면 결함이 아니라 **무수정 exact-copy 계약**이다. 해당 필드가 아예 없거나 선언 밖을 바꾸려 할 때만 minimal reuse에서 제외한다.
- 변수 구조의 구체성은 곧 project-specific coupling이 아니다. 이름·키·shape를 선언된 자리에서 치환할 수 있고 핵심 command sequence와 state transition이 유지되면 범용 후보가 될 수 있다.
- 이 rubric은 재현성 code-review aid다. Data Editor가 이 점수·가중치·hard fail을 승인했다는 뜻이 아니며, research-practice submission acceptance를 예측하지 않는다.
- `program define`, loop, `capture`, community command은 일률적 오류가 아니다. 사용 목적·contract·state visibility가 불명확할 때만 policy finding으로 기록한다.
