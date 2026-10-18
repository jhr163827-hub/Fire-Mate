# FIRE MATE 6단계 최종 마무리 기록
상태: 최소 수정 및 실패 3개 재검증 완료. 전체 테스트/CI/Pages 최종 확인 중.
업데이트: 2026-10-18 11:26 KST

## 승인된 범위와 보존 조건
- 사용자 2026-10-18 11:23 요청에 따라 홈·가계부의 확인된 기존 오류만 최소 수정 허용.
- 기존 자산 UI 개선, 계산 로직, localStorage 키/저장 구조, API 제한은 변경 금지.
- 검증 삭제/skip/기대값 완화 금지. 실제 휴대전화 검증은 완료로 주장하지 않는다.

## 원격 작업 이력
- 5단계 기준: cdbd7861e4b26660d050ac116099c9a59e02392c
- 자산 UI: 0eba3a6f951e3bb64cad8b201db17e09c13c131c
- 기존 자산 회귀 선택자 교정: 5f9c30c0bf4d0d00993df77e5a98417c97bf82d3
- 이번 작업 시작 기준: 630ef40ab06aa8a85289ced384beef7a2c910094
- 이 문서와 함께 홈·가계부 최소 CSS 및 예산 테스트 선택자 교정을 커밋한다.

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

## 완료 확인 전 남은 작업
- npm run test:finance
- npm run test:e2e
- Python 추가 회귀 43개 전체 실행
- 최신 앱 커밋의 quality / Home responsive regression / safety / Pages 결과 확인
- 실제 Pages HTML 및 sw.js 응답에서 v3.5.33 확인
- 모두 통과하면 이 문서의 결과를 갱신하고 6단계 완료 처리

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
