# Validation policy and diet

이 문서는 검증을 늘리는 것이 아니라, 현재 검증 inventory를 오류탐지 효용·실행비용·false positive·blocking 위험으로 재평가한 정본이다. `runtime_success`, `static_audit`, `substantive_validity`는 서로 대체하지 않는다. 이 표의 `기본 판정`은 프로젝트별 명시 계약이 없는 경우의 기본값이며, 사용자가 명시한 더 엄격한 계약은 별도로 기록한다.

| 검증 영역 | 기본 판정 | 처분 | 비용 대비 효용과 회귀 근거 |
|---|---|---|---|
| active entrypoint/reachable call graph | `scope.entrypoints` 또는 선택된 top-level master의 active workflow만 blocking 대상 | 유지·기본 | 비도달 파일을 active master와 합산하면 false positive와 실행 범위가 커진다. fixture에서는 도달 가능한 producer만 active이고, 비도달 파일은 inactive advisory여야 한다. top-level 후보가 여러 개면 하나를 임의 선택하지 않고 `needs_review`로 명시적 entrypoint를 요구한다. |
| `scope.mode: all`, `scope.include_paths`, `scope.exclude_paths` | caller가 명시할 때만 확장 | 유지·명시 옵션 | 일반 프로젝트의 범위를 표현하면서 기본 실행비용을 늘리지 않는다. exclude는 active 기본값을 바꾸는 case-specific 예외가 아니라 scope 계약이며, 디렉터리는 discovery cap과 call-graph 생성 전에 가지치기한다. call target은 suffix index로 해석해 파일 수와 호출 수의 곱만큼 반복 탐색하지 않는다. |
| unreachable file finding | discovery advisory, nonblocking, default full lint 생략 | 하향·분리·비용 절감 | 보존·정리 대상과 미검사 경계는 남기되 현재 workflow를 차단하거나 전체 lint 비용을 부과하지 않는다. `scope.mode: all` 또는 `scope.include_paths`로 명시 승격하면 full lint한다. 1,001개 비활성 fixture에서도 active 파일만 lint하는지 회귀한다. |
| review-only intent (KO/EN) | `code_required=false`, `write_authorization.status=not_requested` | 유지·blocking write guard | 읽기 전용 요청을 `add_feature`로 오분류하는 오류는 실제 write risk가 높고 intent 분류 비용은 낮다. no-change는 incidental “add/improve”뿐 아니라 caller의 overhaul mode보다도 우선한다. |
| master role comment | new error, modified warning, existing audit nonblocking | 통합·severity 조정 | 새 master의 역할 주석은 독자 효용이 높지만 legacy 전수 보정은 과도하다. authoring state별 동일 fixture로 세 severity를 확인한다. |
| `report.md` 행·line bound | caller-authored substantive `authored_spans`만 coverage | 통합·범위 축소 | 행 형식만 보는 검사는 substantive 누락을 놓치고, 전체 legacy/provenance 강제는 비용과 false positive가 높다. substantive transition span은 row+contiguous one-based range로 검사한다. |
| `report_policy` | code-writing plan·output check는 `required`, standalone read-only audit는 `optional`, `disabled`는 파일 생성/수정 금지 | 통합·명시 우선 | 대상별 report 필요성은 caller 계약이다. 명시 no-report가 required보다 우선해야 산출물을 만들지 않는다. `require_report`는 명시 policy가 없을 때만 required alias다. |
| provenance marker in research code | 기본 요구 없음 | 기본 제외 | provenance는 session/audit evidence에서 충분히 추적하며 연구 코드 오염과 과도한 강제를 피한다. report coverage와 혼동하지 않는다. |
| multi-sheet/output multiplicity | execution-order와 call-time macro를 반영한 project-level producer-consumer evidence | 통합·비차단 pending | 개별 do-file은 workbook/sheet/estimate multiplicity를 모를 수 있다. 서로 연결되지 않은 workflow component 사이에는 estimate, durable state, macro, workbook, sheet state를 공유하지 않는다. consumer보다 뒤의 producer나 단순 `.ster` save는 active stored estimate로 인정하지 않는다. 동적 이름은 `context_pending`으로 남긴다. |
| static lint deterministic blockers | 확실한 source defect만 blocking | 유지 | merge m:m, destructive command, loop depth 3 등은 실행 전에 높은 효용으로 탐지된다. static clean은 runtime/substantive pass가 아니다. |
| native Stata Python integration | `python script <declared .py>, args(...)`는 explicit integration, runtime/output은 별도 검증 | 유지·구분 | Stata-native 호출은 shell/winexec/bang/inline escape와 다르므로 process_escape로 차단하면 false positive다. 다만 script 성공·산출물·substantive effect는 static clean으로 대체하지 않는다. |
| structural nesting | `structural_depth >= 4` review warning | 하향 | 읽기 어려움은 유용한 신호지만 loop depth와 같은 blocking 효용은 낮다. loop depth 3와 독립 수치로 보고하여 의미 혼동을 막는다. |
| loop nesting | `loop_depth >= 3` blocking; depth 2는 substantial repetition 조건 | 유지 | opaque/deep repetition은 specification을 숨긴다. plain axes·mechanical body·substantial reduction을 함께 요구해 false positive를 줄인다. |
| estimability static scan | source에서 확실한 구조 위험만 보고 | 유지·범위 축소 | firm-specific trend, endpoint omission, interaction 구조는 정적으로 확실한 경우에만 경고한다. 추정 가능 여부를 static clean으로 단정하지 않는다. |
| runtime `e(b)` readback | runtime evidence가 있을 때 nonempty declared nonreference contract와 exact token/omitted/collinear 확인 | 유지·분리 | raw coefficient identity와 omitted endpoint는 Stata 반환 상태가 필요하다. 선언 term이 비어 있으면 `incomplete`이며, 실행비용이 있더라도 static 대체는 불가하다. |
| substantive validity | 별도 researcher judgment/status | 유지·분리 | estimand, identifying variation, interpretation은 lint나 runtime 성공만으로 판정할 수 없다. 결과 보고에서 세 status를 함께 표시하되 합치지 않는다. |
| derived/self-lineage provenance | `independent_support=false`; external count 제외 | 유지 | 같은 lineage를 외부 독립 근거로 재사용하면 evidence inflation이 발생한다. lineage evidence는 보존하되 독립 count에서 제외한다. |
| workflow reproduction / semantic contract | requested blind/reproduction audit에서 실행 | 유지·조건부 | source similarity는 leakage 탐지일 뿐 semantic/runtime 대체가 아니다. 요청 없는 프로젝트에는 실행비용을 기본 부과하지 않는다. |
| numerical coefficient comparison | declared baseline이 있을 때 전체 contract 전수 비교 | 유지·조건부 | 대표 cell smoke test보다 효용이 높지만 baseline이 없으면 적용할 수 없다. outcome/sample/specification별 coefficient, SE, omitted/base를 묶어서 비교한다. |
| valid JSON / artifact counts / hashes | named output contract에 있을 때 | 유지·조건부 | 산출물 존재만으로는 충분하지 않지만, 모든 프로젝트에 강제하면 비용이 커진다. caller가 선언한 JSON/output만 parser/count/hash로 확인한다. |
| workbook/PDF render | paper-facing workbook/figure가 요청될 때 | 유지·조건부 | 렌더 오류 탐지 효용은 높지만 결과물이 없는 workflow에는 불필요하다. 실제 declared artifact에만 적용한다. |
| template reuse manifest | explicit audit/strict enforcement 요청 때만 | 기본 제외·advisory | template 적합성은 유용하지만 manifest 강제는 code writing을 막고 비용이 크다. 기본 report는 substantive authored span 중심으로 유지한다. |
| package/dependency probes in research do-files | 금지, 별도 설치 점검 없음 | 기본 제외 | 실행 중 설치·`which`/`findfile` probe는 portability와 reproducibility를 해치고 연구 workflow를 부풀린다. 명령이 없으면 plain failure와 별도 환경 조치를 구분한다. |

## Status contract

- `runtime_success`: 승인된 entrypoint가 오류 없이 실행되고 선언된 runtime artifact가 생성되었는지. log를 받지 않은 output check는 artifact hash가 있어도 `not_checked`다.
- `static_audit`: lint/audit가 확실한 deterministic defect를 찾았는지. `static_clean`은 runtime 또는 substantive validity를 의미하지 않는다.
- `substantive_validity`: estimand, identification, sample, outcome meaning, estimability 해석이 연구 계약에 맞는지. 이는 별도 evidence와 연구자 판단이 필요하다.
- `context_pending`: producer-consumer 또는 runtime evidence가 없어 현재 결정할 수 없는 상태. 명시적 high-risk defect가 아니면 nonblocking advisory로 둔다.

이 정책에서 제거·통합·하향한 검증은 오류탐지 효용이 낮거나 동일 사실을 중복 확인하거나, active 범위를 잘못 넓히거나, static 결과를 runtime/substantive 판정으로 오인하게 만드는 경우다. 보류(pending)는 누락을 숨기는 성공 판정이 아니라 다음 evidence가 필요한 명시적 상태다.
