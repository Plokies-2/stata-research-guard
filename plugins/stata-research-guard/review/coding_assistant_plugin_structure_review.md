# 유사 코딩 어시스턴트 구조 검토

검토일: 2026-08-24

2026-08-24에 Aider, Cline, Continue, OpenHands의 GitHub 정본을 다시 확인했다. 공통점은 전체 규칙을 매번 싣기보다 짧은 저장소 지도나 현재 경로·키워드에 맞는 규칙만 불러오고, 저장소 전용 지침과 재사용 지식을 분리한다는 점이다. 현재 플러그인의 `requested headword`, source-evidenced `input_signature`, semantic `sheet_group`, 별도 physical `sheet_plan`이 이미 이 역할을 한다. 따라서 새 rule engine이나 agent 계층을 추가하지 않고, 실제 blind test에서 확인된 multiline Stata 호출 parsing과 workbook/sheet placement 검증만 강화한다.

## 현재 플러그인의 부분 작업 경계

`plan_dictionary_repairs`는 사용자 요청을 사전 표제어로 변환한 뒤, 요청하지 않은 단계와 기존 입력·출력·호출 interface를 `preserve`로 고정한다. `summary stats만 만들어주세요`는 `descriptives.entity_collapse`만, `regression만 돌려주세요`는 `estimation.conventional`만 intervention에 남는다. 두 경우 모두 기존 파일의 임의 수정 권한은 생기지 않으며, 전체 제출 패키지나 master·표·그림 단계가 자동으로 따라오지 않는다.

이 동작은 `tests/server.test.cjs`의 `summary-only and regression-only requests do not expand into a full package` 회귀 테스트로 고정했다. 전체 패키지는 사용자가 `overhaul`, `full rebuild`, 제출용 패키지처럼 범위를 명시했을 때만 별도 경로로 들어간다.

## 비교한 구조와 배울 점

| 프로젝트 | 확인한 구조 | 이 플러그인과의 관계 | 판단 |
|---|---|---|---|
| [Aider repo map](https://github.com/Aider-AI/aider/blob/main/aider/website/docs/repomap.md) | 전체 저장소의 파일·핵심 symbol을 요약하고 요청과 가까운 부분을 token 예산 안에서 우선 제공한다. | 현재 `scanProjectForDictionary`도 파일별 stage, call site, 입력·출력, estimate handoff를 모으지만 relevance ranking은 단순하다. | 대형 Stata 저장소가 실제 병목이 될 때 `requested headword → 관련 파일` 순위를 더 정교하게 만드는 데 참고할 만하다. 지금 바로 graph ranking을 넣으면 현재 규모에는 과한 구현이다. |
| [Cline Rules](https://github.com/cline/cline/blob/main/docs/customization/cline-rules.mdx) | workspace rule과 global rule을 나누고 path 조건으로 필요한 rule만 활성화한다. | 현재 checkpoint contract와 stage별 intervention이 사실상 조건부 rule 역할을 한다. | 새 분류 체계를 더 만들기보다 기존 `checkpoint`, `stage_files`, `preserved_scope`를 유지하는 편이 낫다. 경로 조건이 필요한 규칙은 checkpoint metadata에 좁게 추가한다. |
| [Continue config](https://github.com/continuedev/continue/blob/main/docs/reference.mdx) | models, rules, tools, context provider를 분리한다. | 이 플러그인도 manifest, skill, MCP 도구, annotation·dictionary data가 나뉘어 있다. | 구조를 새로 나눌 필요는 없다. 항상 적용되는 짧은 정책은 skill에, 검색 가능한 세부 예제는 dictionary에 두는 현재 경계를 유지한다. |
| [OpenHands skills와 microagents](https://github.com/OpenHands/OpenHands/blob/main/skills/README.md) | repository 지침과 공유 skill을 분리하고 trigger가 맞을 때 전문 지식을 불러온다. | 한글·영문 alias와 exact command anchor가 trigger 역할을 하며, project-specific label은 기본 검색에서 제외된다. | 현재 방식이 더 촘촘하다. 별도 microagent를 늘리면 사용자가 우려한 분류 과잉과 오선택 위험이 커지므로 채택하지 않는다. |
| [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) | 항상 필요한 단순 규칙은 custom instructions에, 특정 작업의 상세 절차·script·자료는 skill에 둔다. | 이 플러그인의 maintained contract·SKILL·MCP dictionary 분리와 같은 방향이다. | 전역 금지 규칙과 단계별 템플릿을 한 파일에 섞지 않는 원칙을 계속 지킨다. |
| [GitHub Copilot custom agents](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-custom-agents) | explore, task, review처럼 역할과 tool 권한을 분리하고 별도 context에서 실행한다. | 현재 플러그인은 읽기 계획과 lint·audit 도구를 분리하지만, 별도 agent 정의는 두지 않는다. | 독립 감사에는 유용하지만 Stata 코드 생성 경로를 여러 agent로 쪼개면 handoff가 늘어난다. 검증이 무거운 경우에만 외부 실행 방식으로 사용하고 플러그인의 기본 구조에는 넣지 않는다. |
| [Claude Code plugin hooks](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) | write 전후와 종료 시점에 hook을 걸어 정책 검사를 자동 실행한다. | 현재 skill은 do-file 변경 뒤 `lint_do_file` 호출을 요구하지만 호출 여부는 agent 실행에 달려 있다. | 가장 유용한 후보다. 다만 Codex plugin의 검증된 write hook interface가 없는 상태에서 다른 제품의 형식을 복제하면 안 된다. 공식 지원이 확인될 때만 lint hook을 추가한다. |

## 적용 결론

현재 부분 작업 구조는 이미 요청 범위를 표제어 하나로 좁히고 나머지 workflow를 동결한다. 이번 비교에서 즉시 구조를 갈아엎을 이유는 없었다. 다음 세 가지 원칙만 유지한다.

1. 전체 workflow 생성은 명시적 overhaul 요청에만 허용한다. 배포·제출 package는 이 플러그인의 기본 범위가 아니다.
2. 작은 요청은 `requested headword`, `preserved_scope`, `mutable_existing_files`로 범위를 잠근다.
3. 대형 저장소에서 검색 지연이나 오선택이 실제로 확인될 때만 Aider식 관련 파일 ranking을 추가한다. hook은 Codex가 공식 interface를 제공할 때 검토한다.

이번에 추가한 interaction raw-name, event-study 영문화, 한글 graph의 `Malgun Gothic` 규칙도 같은 원칙을 따른다. 새 하위 agent나 범용 framework를 만들지 않고, 전역 작성 계약·checkpoint contract·정적 lint·회귀 테스트에만 좁게 반영했다.

## 요청 규모와 사전 적재 경계

사용자가 제안한 `규모 판정 → 키워드 변환 → 해당 범위만 검색` 순서가 맞다. 다만 규모는 예상 코드 줄 수가 아니라 현재 입력 상태를 원하는 출력 상태로 바꾸는 state transition 수로 잰다. 짧은 명령도 upstream 자료나 estimate가 없으면 한 단계가 아닐 수 있고, 긴 변수 목록도 같은 transition을 반복하는 일이라면 checkpoint 하나일 수 있기 때문이다.

`plan_dictionary_repairs`는 이제 코드가 필요한지 먼저 판정한다. 검토·감사·설명만 요청하면 `no_write`로 끝내며 writable template을 적재하지 않는다. 코드가 필요하면 다음 범위 중 하나로 고정한다.

| scale | 판정 기준 | 적재 범위 |
|---|---|---|
| `atomic_substep` | Stata 명령 하나 또는 명시한 substep 하나 | 해당 headword의 호환 코드 1개 |
| `checkpoint` | state transition 한 종류 | 해당 headword의 호환 코드 1개 |
| `multi_checkpoint` | 사용자가 요구한 transition이 여러 개 | 선택된 headword마다 호환 코드 1개 |
| `overhaul` | 명시적 전면 구축 또는 입증된 호환 불가 | 필요한 headword마다 호환 코드 1개 |

각 headword 안에서는 모든 label의 metadata를 결정론적으로 비교할 수 있다. 하지만 모델 context에 들어가는 writable code는 선택된 variant 하나뿐이다. 대안은 최대 세 개의 metadata만 남기고, corpus fallback도 headword마다 근거 세 개까지만 노출한다. 따라서 검색 정확도를 위해 사전 metadata를 훑는 작업과 불필요한 코드를 context에 싣는 작업을 구분한다.

이 경계는 exact Stata command, checkpoint ID, `common_commands`, bilingual alias, 관측된 input/output state로 구성한 `retrieval_plan`에 기록한다. 선택되지 않은 headword는 기존처럼 `preserve`이며, 작은 요청을 master·전처리·표·그림 전체로 넓히지 않는다.

## Synthetic event alias 교정

`treat_y2015 = treat2019*(year==2015)`처럼 직접 만든 변수도 raw factor-variable coefficient가 아니다. 이전 규칙은 `coefplot rename()`만 차단해 이 경로를 놓쳤다. 새 lint는 수동 생성식, event-term macro, 회귀 RHS, event-study selector를 각각 검사해 `synthetic_event_term_alias`로 차단한다. 올바른 흐름은 factor-variable expression을 추정식에 직접 쓰고, Excel과 graph selector가 `e(b)`의 raw coefficient token을 그대로 소비하는 방식이다.
