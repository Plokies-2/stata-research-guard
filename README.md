# Stata Research Guard

Stata Research Guard는 모델이 Stata 명령과 연구 사양을 스스로 고를 수 있도록 정리된 자료를 제공하는 Codex 플러그인입니다. 서버는 명령이나 논문 예시를 점수화·추천·승격·자동 선택하지 않습니다.

현재 배포 버전은 `0.3.0+codex.20260829160356`입니다.

## 단순한 3단계 계약

`stataResearchGuard` MCP 서버는 `get_stata_command_evidence` 도구 하나만 제공합니다. 모든 응답에는 공통 `general-rules.md`가 포함됩니다.

1. Phase 1은 109개 canonical command dictionary만 보여 줍니다. 각 record에는 역할, 기능, 필요한 입력 상태, 출력 형태와 핵심 tradeoff가 있으며, 모델이 exact command key를 직접 고릅니다.
2. Phase 2는 선택한 command의 전체 StataCorp 또는 maintainer guide와 해당 command의 논문 profile catalog만 보여 줍니다. 전체 guide가 없으면 대체 명령·논문 예시·수동 구현 없이 중단합니다.
3. Phase 3은 모델이 선택한 exact paper block, 연결된 원문 occurrence, 그리고 있으면 직접 대응되는 raw log excerpt나 artifact metadata만 보여 줍니다. 없으면 `paper_log_contexts=[]`입니다.

현재 bundle에는 109개 command, 107개 전체 guide, 166개 수기 paper block/profile, 12개 선택적 raw-log/artifact attachment가 있습니다. 12개 attachment는 coverage 목표가 아닙니다.

## 자료의 역할

논문 예시는 template·정답·oracle이 아니라 고품질 힌트입니다. 현재 프로젝트, 모델이 이미 고른 command와 연구 사양이 우선합니다. 예를 들어 `outreg2` 예시 주변의 `areg`나 `reghdfe`는 현재 `regress` 선택을 바꾸지 않습니다.

서버는 사용자 프로젝트를 scan하지 않으며 `command_paper_index`, paper review summary, integrity audit, 전수 hash/span 재검사, score, ranking, winner, INCLUDE/EXCLUDE, promotion, pass/fail, `audit_pending`, 결과 해석 계층 또는 semantic validation을 사용하지 않습니다. 논문 코드를 coverage 목적으로 다시 실행하지도 않습니다.

## 설치

```powershell
gh repo clone Plokies-2/stata-research-guard
Set-Location .\stata-research-guard
codex plugin marketplace add (Get-Location).Path
codex plugin add stata-research-guard@stata-research-guard-team
```

설치 후 새 Codex task에서 갱신된 skill과 MCP 서버를 로드하세요.

## 검증 범위

배포 bundle은 303개 파일의 inventory와 SHA-256을 기록합니다. Node 테스트 18개는 MCP transport shape, exact selection, guide와 raw code/log 전달, formatter/runtime smoke, bundle 무결성만 확인합니다. plugin/skill validator도 manifest와 skill 구조만 확인합니다. 어떤 검사도 논문 결과, 생성된 Stata 의미, 연구 사양, 코드 품질 또는 인과 타당성을 판정하지 않습니다.

플러그인의 상세 계약은 [`plugins/stata-research-guard/README.md`](plugins/stata-research-guard/README.md)를 참고하세요.
