# Corpus usage occurrence 추출 보고서

이 문서는 독립 occurrence audit를 release-safe support ledger로 변환한 결과다. 논문 raw code는 복제하지 않으며, 모든 row는 `reference_only`, `promotion_prohibited=true`, `auto_selectable=false`다.

## 결과

- ledger rows: `132`
- corpus occurrence schema: `2.0`
- pass_reference_only (research_usage `occurrence_support`로 추가 가능): `38`
- needs_manual_followup (generation에서 제외): `13`
- reject (generation에서 제외): `81`
- exact contract proposal rows: `21`
- superseded dedup rows retained as audit provenance only: `32186`
- repository kinds: `{"openicpsr": 105, "zenodo": 27}`

## 불변 안전 계약

- 모든 row: `code_available=false`, `runtime_status=not_run`, `selector_status=not_run`.
- source path, line span, source-file hash, span hash, source-container hash와 catalog DOI/URL을 함께 보존한다.
- exact contract 제안은 감사가 완결된 21건의 제안만 저장하며, 나머지는 `unmapped_reason` 또는 감사 사유로 남긴다.
- corpus occurrence input schema는 `2.0`이며 기존 19건 AEA exact support ledger의 `1.0` 계약과 구분된다.

## 입력 및 산출물 SHA-256

- `representative_usage.jsonl`: `d3e1b61d73f65586103d236aa0d29af17790b2fd287a3d28d5831fee5579595c`
- `independent_occurrence_audit.jsonl`: `c9816b20054a72541b28c3e5c5b07d905da5340b6508a473b6d35f519e41fd44`
- `superseded_dedup.jsonl`: `f4e82b648a61b0651ff029ea42887ded0f53551eaefe1b183a0eeaf5f222b89c`
- `usage_reduction_summary.json`: `97e21439879eb58324a10efbfdfaf738378e5b479fcf5ff95b8dd8459c043846`
- `package_metadata.csv`: `c1e2eb967bb9afdce01a131be52e0eb721eaf0f7da6a9fbc22d4bfc17c84f651`
- `code_files.csv`: `79bf0a346de6a86ce79c164ba9901db96e1a873ff3930636bc9c07beba32f739`
- `archive_manifest.csv`: `142d0bc36623ed185e3e5e65fcb53f71ba057f787e99cdf9b620087b70d18cc0`
- `output`: `db828f61d2973fe96c98ca33be57dbe0d989a6dd1f2e320f7ce3a688be6e515d`

재현 명령은 `build_corpus_usage_occurrences.py`의 인자 기본값을 사용하거나, 위 입력 파일을 명시적으로 지정하면 된다.
