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

## 코드 구조 (`index.html`)
- 본문 마크업 → 메인 스크립트(전역 `data`, `persist()`, `getTx()`, `render*()`) → 기능별 `<script id="fm-...">` 블록 → `</body></html>`.
- 스타일은 `app.css`. body 안의 `<style>` 2개는 JS가 head에 넣는 스타일보다 뒤에 있어야 해서 인라인으로 둔다.
- 전역 도우미: `fmGo`, `fmOpenEntry`, `fmFireViewState`, `fmRefreshNetWorth`, `fmOpenImport`, `fmAsk`, `fmToast`.
- 테스트 전용 표시 플래그: `__fmMonthReportAnyDay`, `__fmWeekReportAnyDay`, `__fmMilestoneTest`, `__fmStartTest`.

## 코드를 늘리지 않는 규칙 (자동 검사)
- **새 기능은 새 `<script>`/`<style>` 블록을 덧붙이지 말고 해당 화면의 기존 코드를 고친다.**
- `scripts/check_app.py`가 `scripts/code_budget.json`의 상한(스크립트 블록 수, 스타일 블록 수, `index.html` 크기, `app.css`의 `!important` 수)을 넘으면 실패한다.
- 정리해서 숫자가 줄면 상한도 같이 낮춘다(다시 늘어나지 않게). 상한을 올리는 건 사용자 동의가 있을 때만.

## 버전 올리기 (index.html·sw.js·app.css를 바꿨을 때)
`<title>`, `firemate-release`, `const BUILD='fire-mate-v3-5-XX',VERSION='3.5.XX'`, `sw.js`의 `CACHE`, `app.css?v=`(링크와 sw ASSETS) — 한 번에:
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
