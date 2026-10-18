# FIRE MATE 6단계 최종 마무리 기록
상태: 6단계 완료. 로컬/CI의 필수 50개와 추가 회귀 43개 전부 통과. 안전성 검사와 Pages 배포 성공.
최종 확인: 2026-10-18 (KST)

## 승인된 범위와 보존 조건
- 사용자 2026-10-18 11:23 요청에 따라 홈·가계부의 확인된 기존 오류만 최소 수정 허용.
- 기존 자산 UI 개선, 계산 로직, localStorage 키/저장 구조, API 제한은 변경 금지.
- 검증 삭제/skip/기대값 완화 금지. 실제 휴대전화 검증은 완료로 주장하지 않는다.

## 원격 작업 이력
- 5단계 기준: cdbd7861e4b26660d050ac116099c9a59e02392c
- 자산 UI: 0eba3a6f951e3bb64cad8b201db17e09c13c131c
- 기존 자산 회귀 선택자 교정: 5f9c30c0bf4d0d00993df77e5a98417c97bf82d3
- 이번 작업 시작 기준: 630ef40ab06aa8a85289ced384beef7a2c910094
- 홈·가계부 최소 CSS 및 예산 테스트 선택자 교정: ffd6311b9fe17beabac5f4aa4a69ea0d35431d70
- 최종 검증 결과와 재개 절차는 후속 문서 커밋으로 보존한다.

## 실제 로그와 5단계 비교
CI 로그: https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39089488587
- CI 43개 중 41 통과/2 실패/0 skip: 예산 편집기 선택자와 버튼 높이.
- 로컬 43개 중 40 통과/3 실패/0 skip: 위 두 건 및 320px 홈 요약의 1px 겹침.
- 5단계 cdbd786의 원본 index.html/sw.js를 별도 서버에서 열어 동일한 세 테스트를 다시 실행했고 3개 모두 같은 지점에서 실패했다. 신규 자산 개선의 회귀가 아니다.

## 원인별 최소 수정 (v3.5.33)
1. 테스트 오류: 예산 편집 UI는 모달인데 테스트가 폐기된 fmLedgerBudgetInline을 기대했다. fmLedgerBudgetOverlay 선택자만 수정했다. 모든 금액·비율·CRUD 기대값은 그대로다.
2. 실제 UI 오류: 가계부 예산 수정 아이콘의 CSS가 36×40px로 44px 터치 기준을 덮어썼다. 해당 버튼만 44×44px로 수정.
3. 실제 UI 오류: 350px 이하 홈 요약에서 금액 상단과 갱신 버튼 하단이 로컬 글꼴 환경에서 1px 겹쳤다. 기존 작은 화면 여백 16px→20px만 조정.
4. 앱 버전 및 서비스워커 캐시 동시 증가: v3.5.33 / fire-mate-v3-5-33.
- 자산 탭 CSS/HTML/전환/금융 계산/저장 구조는 변경하지 않았다.
- 실패했던 3개 테스트를 수정 후 로컬에서 재실행: 3 통과/0 실패/0 skip.

## 최종 검증 결과
수정 커밋 ffd6311b9fe17beabac5f4aa4a69ea0d35431d70 기준:
- 로컬/CI 모두: 금융 2 통과, E2E 48 통과, 추가 Python 회귀 43 통과. 합계 93 통과/0 실패/0 skip.
- 로컬 추가 검사: 정적 무결성, 금융 계산, 저장 롤백, PWA 업데이트 검사 전부 통과.
- quality 성공: https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39090037530
- Home responsive regression 성공(43개 및 화면 캡처/아티팩트 생성 포함): https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39090037600
- safety 성공: https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39090037588
- Pages 성공: https://github.com/jhr163827-hub/Fire-Mate/actions/runs/39090037537
- 실제 배포 HTML/SW 모두 HTTP 200 및 v3.5.33 / fire-mate-v3-5-33 응답 확인.
- 기존 자산 전용 스타일은 직전 버전과 바이트 단위 동일함을 확인했다.
- 앱 JavaScript 8개 블록은 출시 버전 문자열을 제외하면 직전 버전과 동일함을 확인했다. 금융 데이터 저장 구조/계산/시세/API 제한 변경 없음.
- 남은 코드 수정/실패 테스트 없음. 6단계 완료.

## 중단 또는 후속 작업 재개
- 먼저 최신 main 및 이 문서를 읽고, 과거 완료 작업을 다시 수정하지 않는다.
- 위 CI 실행은 검증한 앱 소스 커밋의 결과다. 후속 문서 커밋은 앱/테스트 파일을 바꾸지 않는다.
- 재실행이 필요할 때만 아래 명령을 사용한다. 새로운 기능 개발은 이 단계에 포함하지 않는다.

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
이 환경에서는 표준 Chromium 다운로드 응답이 손상되어, 임시 Chromium /tmp/fm-chromium으로 로컬 검증한다.
- Node: npm run test:e2e -- --config playwright.local.cjs
- Python: PYTHONPATH=/tmp/fm-py-playwright PLAYWRIGHT_CHROMIUM_PATH=/tmp/fm-chromium 으로 위 unittest 실행.
- 임시 설정/브라우저/의존성은 저장소에 커밋하지 않는다. GitHub Actions는 표준 Chromium으로 별도 확인한다.

## 실제 기기 한계
실제 Android 설치형 PWA의 제스처/기기 캐시 교체/사용자 원본 저장 데이터는 직접 확인하지 않았다. 기존 32개 모바일 화면 조합 및 fixture 금융 데이터 보존 검증은 유지한다.
