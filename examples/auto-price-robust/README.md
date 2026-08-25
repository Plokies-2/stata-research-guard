# 자동차 가격 robust 회귀 toy example

Stata 내장 `auto` 자료에서 자동차 모형을 관측단위로 삼아 `price`와 `mpg`의 관계를 살펴봅니다. `mpg`를 중심 설명변수로 유지하면서 차량 특성을 단계적으로 추가한 네 개의 OLS 사양을 비교하며, 모든 표준오차는 `vce(robust)`로 계산합니다.

이 예시는 작은 자료에서도 Stata Research Guard가 다음 사항을 어떻게 드러내는지 보여 줍니다.

- 분석 전에 key와 결측치를 확인합니다.
- 각 회귀의 outcome, sample, specification과 VCE를 코드 가까이에 둡니다.
- `i.foreign`을 native factor-variable 형태로 유지합니다.
- 각 모형의 `e(sample)`에서 종속변수 평균을 계산합니다.
- 한 sheet workbook에는 별도 program 없이 direct `outreg2 replace/append`를 사용합니다.
- template과 좁은 fallback의 실제 줄 범위를 `report.md`에 남깁니다.

## 실행

Stata의 현재 작업 폴더를 이 예시 폴더로 설정하고 다음 명령을 실행합니다.

```stata
do price_models.do
```

Stata 18과 이미 사용 가능한 `outreg2`를 전제로 합니다. 플러그인은 실행 중 패키지를 설치하거나 설치 여부를 우회 검사하지 않습니다.

## 파일

```text
auto-price-robust/
├─ README.md
├─ price_models.do
└─ report.md
```

실행하면 `price_models.log`와 `price_robust_models.xls`가 생성됩니다. 회귀에는 Stata 내장 자료의 원변수만 사용하며 새 persistent analysis variable은 만들지 않습니다. 검증 당시 내장 자료 74개 관측치가 네 사양에 모두 사용되었습니다.

이 예시는 플러그인의 작업 분해와 출력 계약을 설명하기 위한 toy workflow입니다. 경제적 해석이나 논문 수준의 분석 타당성을 인증하는 예시는 아닙니다.
