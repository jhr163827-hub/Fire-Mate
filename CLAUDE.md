# FIRE MATE — 작업 규칙

정적 PWA(빌드 도구 없음). GitHub Pages로 배포되고, 사용자의 금융 데이터는 전부 브라우저 localStorage에 있다.

## 담당
- 금융 앱(`index.html`, `app.css`, `sw.js`)과 레스토랑 게임(`arcade/restaurant*`): Claude
- NIGHTFALL(`arcade/nightfall*`, `.github/workflows/nightfall.yml`, `tests/nightfall-*`): ChatGPT 담당 — **수정 금지**

## 진행 방식
- 작업 브랜치 → 테스트 → PR → CI 통과 후 squash 병합. **main에 직접 커밋 금지.**
- 같은 브랜치에 열린 PR이 있으면 새 작업을 푸시하지 않는다(덮어쓰게 됨). 병합 후 `origin/main`에서 브랜치를 다시 만든다.
- 보고할 때 "확인함"과 "실기기 미확인"을 나눠서 쓴다.

## 지켜야 할 것
- 금융 데이터, localStorage 키 이름, 계산식, PWA 업데이트 구조(`fm-pwa-updates`, `sw.js`)는 바꾸지 않는다. 키를 새로 만들 땐 `firemate_<이름>_v1` 형식의 별도 키로.
- 기존 기능을 임의로 지우지 않는다.
- 비밀번호·이메일·토큰·API 키를 코드, 테스트, PR에 넣지 않는다. 테스트용 ZIP 비밀번호는 가짜 값 `qa-zip-pass`만 쓴다. 백업 `extras`에도 비밀값은 넣지 않는다.
- 브라우저 기본 창(`alert`/`confirm`/`prompt`) 대신 `await window.fmAsk(문구,{ok,cancel})`와 `window.fmToast(문구)`를 쓴다. `window.toast`는 함수가 아니라 #toast 요소다.
- 사용자가 손으로 분류·확인하게 만들지 않는다(자동 분류 + 되돌리기).

## 코드 구조
- `index.html`: 마크업 → 앞부분 작은 스크립트 2개(접근성, 첫 화면 순자산) → 메인 스크립트(전역 IIFE: `data`, `persist()`, `getTx()`, `render*()`, 모든 화면의 기본 그리기) → `fm-pwa-updates`(업데이트, 인라인 유지) → `js/features.js`.
  - 메인 스크립트와 `const BUILD=`는 index.html에 있어야 한다. `sw.js`의 `validPage`가 이 문자열과 100KB 이상 크기를 확인한다.
- `js/features.js`: 화면별 기능 블록 17개. 맨 위 목차에 블록별 화면이 적혀 있다. 원래 순서대로 실행되고, 블록마다 try/catch로 감싸 한 기능의 오류가 다른 기능을 막지 않는다.
- 스타일은 `app.css`. body 안의 `<style>` 2개는 JS가 head에 넣는 스타일보다 뒤에 있어야 해서 인라인으로 둔다.
- 메인 스크립트가 내보내는 도우미: `fmGo`, `fmOpenEntry`, `fmFireViewState`, `fmRefreshNetWorth`, `fmOpenImport`, `fmLiveData()`(메모리의 현재 데이터, 읽기 전용으로 쓸 것). 기능 블록이 내보내는 것: `fmAsk`, `fmToast`.
- 소스 문자열을 검사하는 테스트는 `tests/app-source.cjs`(index.html + js 파일 합친 것)를 쓴다.
- 테스트 전용 표시 플래그: `__fmMonthReportAnyDay`, `__fmWeekReportAnyDay`, `__fmMilestoneTest`, `__fmStartTest`.

## 코드를 늘리지 않는 규칙 (자동 검사)
- **새 기능은 새 `<script>`/`<style>` 블록이나 `js/features.js` 블록을 덧붙이지 말고 해당 화면의 기존 코드를 고친다.**
- `scripts/check_app.py`가 `scripts/code_budget.json`의 상한(스크립트·스타일 블록 수, `js/` 크기, `index.html`+`js/` 합계 크기, 기능 블록 수, `app.css`의 `!important` 수)을 넘으면 실패한다. 기능 블록을 메인 스크립트로 합치면 index.html은 커져도 합계가 줄면 통과한다.
- 정리해서 숫자가 줄면 상한도 같이 낮춘다(다시 늘어나지 않게). 상한을 올리는 건 사용자 동의가 있을 때만.

## 버전 올리기 (index.html·sw.js·app.css를 바꿨을 때)
`<title>`, `firemate-release`, `const BUILD='fire-mate-v3-5-XX',VERSION='3.5.XX'`, `sw.js`의 `CACHE`, `app.css?v=`·`js/features.js?v=`(링크와 sw ASSETS) — 한 번에:
```
sed -i 's/fire-mate-v3-5-OLD/fire-mate-v3-5-NEW/g; s/3\.5\.OLD/3.5.NEW/g' index.html sw.js
```

## 검사
```
python3 scripts/check_app.py
node tests/pwa-update.test.cjs && node tests/storage-rollback.test.cjs && node scripts/test_calculations.cjs
npm run -s test:finance
python3 -m http.server 4180 &   # 이후 Playwright(tests/*.spec.cjs)와
FIRE_MATE_URL=http://127.0.0.1:4180 python3 -m unittest discover -s tests -p 'test_home_responsive.py'
```
커밋 전 `node_modules`, `test-results`, `tests/__pycache__`, `package-lock.json`을 지운다.

## 레스토랑
`arcade/restaurant.html` + `restaurant-engine.js` / `restaurant-room.js` / `restaurant-room.css`. 버전별 기록은 `RESTAURANT_STATUS.md`. 예전 테스트는 `__restaurantClassicGuests`로 고전 규칙에서 돈다.
