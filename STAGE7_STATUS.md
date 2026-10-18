# FIRE MATE 7단계 진행 기록
상태: 7단계 완료. 로컬/CI 93개 모두 통과, 안전성 검사 및 Pages 배포 성공.
기준: 2026-10-18 KST / f165ae14e7b984518e6fd63ef2de807f8a154fc3 / v3.5.33
현재 앱/캐시: v3.5.34 / fire-mate-v3-5-34

## 작업 단위와 최신 소스
- 가계부 UI 구현: 2894d33114fb644c0bf83d966ff3882570d7fb33
- 기존 Python 가계부 회귀 강화 및 진행 기록: 86bdd1947ecf2ea06b6e7236dc74cc555e932e45 (테스트 개수 43개 유지).
- 최종 결과는 후속 문서 커밋으로 기록한다. 해당 문서 커밋은 앱/테스트 파일을 바꾸지 않는다.
- 재개 시 최신 main을 fetch하고 이 문서를 읽는다. 완료된 6단계 자산 UI를 다시 수정하지 않는다.

## 확인한 실제 문제
- 320px에서 월 수입/지출 및 예산 금액이 중간 줄바꿈됨.
- 기존 달력 셀 폭 약 39px, 높이 49px로 두 종류 금액이 잘리고 오늘/선택 상태 구분이 약함.
- 거래 행마다 그룹 제목과 같은 날짜가 반복됨.
- 달력에서 특정 날짜를 선택해도 추가 버튼은 오늘 날짜를 사용함.
- 거래 금액 입력의 시각적 강조가 약하고 저장/취소 구분 및 짧은 키보드 화면 대응이 부족함.
- 6개월 지출 추이는 계산되지만 hidden 상태라 가계부에서 볼 수 없음.

## 구현 완료
- 월 요약을 2열로 정리하고 예산 편집 아이콘을 금액에서 분리.
- 320px 달력은 화면 폭을 사용해 셀 너비 44px 확보, 높이 58px로 수입/지출 두 줄 보존.
- 오늘 aria-current와 표시, 선택 날짜 aria-pressed 및 강조. 날짜별 축약 금액은 소수 한 자리로 보완.
- 가계부 행에서 중복 날짜만 제거. 다른 탭 거래 행은 원래 날짜 표시 유지.
- 달력 모드 추가는 선택 날짜 사용, 목록 모드의 오늘 날짜 기본값은 유지.
- 입력 금액 크게 표시, 취소 버튼 추가, 수정 저장 구분, sticky 저장 영역과 visualViewport 기반 입력 시트 높이 동기화.
- 기존 6개월 지출 추이를 접기 영역에서 제공. 막대마다 원 단위 전체 금액 접근성 레이블/툴팁 유지.
- 상세 분석 버튼과 비교 설명을 가계부 분석 영역으로 이동. 카테고리 요약은 바로 표시.
- 자산 CSS, 금융 계산, 저장 키/구조, 가져오기/중복 제거, API/PWA 갱신 로직 유지.

## 검증 완료
- 320/360/390/430px × 다크/라이트: 달력·목록·입력 화면 캡처/가로 넘침 검사(24개 조합).
- 위 8개 기기/테마 조합 모두에서 터치로 날짜 선택 → 추가 → 취소(거래 데이터 동일), 저장 → 수정 → 삭제, 검색, 6개월 추이 펼치기 통과.
- 짧은 viewport 360px 높이에서 저장 버튼이 보임을 검증. 실제 모바일 키보드는 별도 미검증.
- 기존 가계부/예산/공통 폼 표적 회귀 3개 통과.
- 강화한 가계부 회귀 1개(4개 너비) 통과.
- 로컬/CI 모두 금융 2개 + E2E 48개 + 추가 회귀 43개 = 93개 통과/실패 0/skip 0.
- 전체 회귀는 선택 날짜/44px 달력 터치/입력 시트 420px viewport/취소 시 거래 데이터 보존 검증을 포함한다. 기존 금액/계산 기대값은 완화하지 않았다.
- 정적 무결성/금융 계산/저장 롤백/PWA 업데이트 검사 통과.
- 원본 자산 전용 스타일 및 저장/월 수입·지출 계산/가계부 전환 함수 소스 보존 검사 통과.

## 최종 CI / 배포 확인
검증 커밋: 86bdd1947ecf2ea06b6e7236dc74cc555e932e45 (앱 소스 2894d33114fb644c0bf83d966ff3882570d7fb33과 동일)
- quality 성공(2+48): https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39091083677
- Home responsive regression 성공(43개 및 비교 캡처/아티팩트): https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39091083616
- 앱 소스 safety 성공: https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39091009993
- Pages 성공: https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39091083127
- 실제 배포 HTML 및 sw.js HTTP 200, VERSION='3.5.34' 및 CACHE='fire-mate-v3-5-34' 응답 확인.
- 파일 가져오기/중복 제거, persist, history/뒤로가기 처리, 자산 계산 소스가 기준 커밋과 동일함을 별도 확인.
- 7단계 범위의 미완료 구현/실패 테스트 없음. 사용자 지시에 따라 Android 뒤로가기 제스처는 별도 과제로 유지한다.
- 향후 재개 시 최신 main 및 이 문서를 먼저 읽고 검증 완료 사항을 다시 변경하지 않는다.

## 별도 과제: 이번 완료 조건에서 제외
- 사용자가 보고한 실제 Android 뒤로가기 제스처 실패는 수정하지 않았다. 기존 history/뒤로가기 처리 구조를 변경하지 않는다.
- 실제 휴대전화 키보드/네이티브 날짜 선택기/설치형 PWA 캐시 교체는 직접 검증하지 않았다.
- 현재 원본 코드의 파일 가져오기 경로는 XLSX/XLS이며 그대로 유지했다. 네이티브 CSV 업로드 경로는 원본에서 확인되지 않아 임의로 새로 추가하지 않았다. 실제 파일 업로드는 이번 검증에서 수행하지 않았다.

## 재개 명령
```sh
git fetch origin main
npm install --no-audit --no-fund
npx playwright install --with-deps chromium
npm run test:finance
npm run test:e2e
pip install playwright pillow
python -m playwright install --with-deps chromium
# 별도 터미널:
python3 -m http.server 8000 --bind 127.0.0.1
# 테스트 터미널:
FIRE_MATE_URL=http://127.0.0.1:8000 python -m unittest discover -s tests -p test_home_responsive.py -v
```
Work 로컬 표준 브라우저 다운로드가 손상될 경우 기존 임시 /tmp/fm-chromium을 사용했다.
- Node: npm run test:e2e -- --config playwright.local.cjs
- Python: PYTHONPATH=/tmp/fm-py-playwright PLAYWRIGHT_CHROMIUM_PATH=/tmp/fm-chromium 으로 unittest 실행.
- 임시 브라우저·의존성·캡처·설정은 커밋하지 않는다. CI는 표준 Chromium으로 검증한다.
