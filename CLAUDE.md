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
- 예시 데이터는 저장된 기록이 없을 때만 들어가고, 들어가기 전 기록은 `firemate_demo_backup_v1`에 보관했다가 나올 때 되돌린다.
- Google 드라이브 백업(`firemate_drive_*`)은 앱 전용 폴더(drive.appdata) 한 파일만 쓴다. 토큰은 백업에 넣지 않는다. 앱의 Google 프로젝트에 Drive API가 켜져 있어야 동작한다.
- FIRE 진행률·남은 금액·도달 예상은 `fireLiquid()`(FIRE 운용자산) 기준이고, 순자산(`netAsset()`)은 자산 표시용이다. 저장되는 `data.fire.asset`은 예전처럼 순자산으로 둔다. 새 계좌는 FIRE 포함이 기본값.
- 시세 백업: `scripts/refresh_live_quotes.py`(워크플로 `refresh-live-quotes.yml`, 평일 30분마다)가 `chart-symbols.json` 종목의 현재가·프리장·애프터 가격을 `chart-data/live-quotes.json`에 저장한다. 앱은 실시간 조회가 실패하거나 미국 API 키가 없을 때 이 가격을 쓰고(`quoteAt`은 그 시세의 시각), 프리장·애프터는 저장하지 않고 화면에만 표시한다. 새 종목은 `chart-symbols.json`에 추가해야 받아진다. 시장 지수(`chart-symbols.json`의 `indices`)는 같은 파일에 `IDX-<키>`로 현재값이 들어가고, 10년 일별 종가는 `refresh_charts.py`가 `chart-data/IDX-<키>.json`에 저장한다(자산 → 시장 탭, 홈 한 줄). 한국 장중에는 코스피·코스닥을 네이버 실시간(`SERVICE_INDEX`, 1분마다, 10분 지나면 파일 값)으로 덮어 보여 준다(메모리만). 홈의 `#fmHomeDiv`는 `dividends.json`(지난 배당락일만 있음)에서 종목별 마지막 간격으로 다음 배당을 추정해 7일 안 것만 보여 준다.
- FIRE: 메인(`#view-fire`)은 도달 예상 카드(지난 1년 세후 배당으로 생활비 몇 % 커버하는지와 같은 배당률이면 배당만으로 생활비를 내는 해를 `#fmFireDiv` 한 줄로) + 계획 조정 + 접힌 미래 자산 예상 + "🧪 FIRE 실험실" 줄만. 실험실(`#view-firelab`)에 은퇴 준비 점검과 생활비(`firelife`)·배당 vs 매도(`retire`)·목표 바꿔 보기(`firecalc`)로 가는 메뉴. 생활비·전략 화면의 뒤로는 실험실로.
- 설정 순서: 게임 아케이드 → 내 자격증(`firemate_certificates_v1`, 백업 extras에 포함. 누르면 `#fmCertOverlay` 전용 화면: 등급·취득/도전 중 카드, `goal:true`는 도전 중이며 `date`는 시험일 → D-day) → 위시리스트(`firemate_wishlist_v1`, 백업 extras에 포함. `#fmWishOverlay`: 이름·가격 추가, 항목을 누르면 편집 시트(가격·모은 돈·링크·메모·🔥꼭), 담은 날 `at`부터 30일 고민 표시, 남은 금액을 FIRE 월 적립(`data.fire.monthly`)으로 며칠치인지 표시, 체크하면 산 것, 지우기는 시트에서 fmAsk) → 월급 주기 계획(`firemate_month_plan_v1`: 항목별 만원 + 월급날 `pay`, 홈 `#fmHomePlan`은 보기만) → 내 데이터 보관(접힌 `<details id="fmStorage">`, 닫힌 줄에 드라이브 백업 상태만. 열면 파일 백업·복원, 드라이브, 뱅크샐러드 가져오기 설정. `fmOpenImport`가 열어 줌) → 데이터 초기화. 메일 백업 버튼·시세/환율·가져오기/내보내기 묶음은 숨김(코드와 홈 백업 알림은 그대로).
- 뱅크샐러드 `이체`는 금액 부호가 방향이다(나감 −). 저장되는 금액은 양수라서 방향은 `firemate_xfer_dir_v1`(bankExcelKey → −1/1)에 따로 두고, 다시 가져오면 예전 줄도 채워진다. 이체는 결제 취소로 보지 않는다. 은행에서 나간 카드대금(대분류 `금융`, 내용이 `삼성카드`처럼 카드사 이름, 결제수단이 카드가 아님)은 카드로 산 지출과 겹치므로 이체로 가져오고, 예전 것은 `firemate_cardbill_fix_v1`로 한 번 옮기며 원래 분류는 `firemate_cardbill_backup_v1`에 보관. 월급 주기 계획: 투자 = 증권·거래소 이름 또는 추적 안 되는 내 계좌로 나간 내계좌이체(짝 없는 것), 비상금 = 세이프박스에 보관 + 토스 '비상금' 통장으로 나간 돈(꺼낸 돈은 옆에 따로 표시), 월급날은 7일 안에 `급여` 수입이 있으면 그날. 방향이 저장 안 된 예전 줄도 뱅크샐러드 메모(채우기·꺼내기·보관)와 짝(같은 날·금액·90초 안)으로 판단한다. 가계부에서 이체 분류를 `투자`/`저축`/`기타 이체`로 바꾸면 그게 우선(계획 줄을 누르면 그 거래 편집이 열림). 같은 결제가 두 번 찍힌 지출(같은 날·내용·금액, 다른 결제수단, 5초 안)은 가져올 때 하나만 넣고, 예전 것은 `firemate_dupfix_v1`로 한 번 정리하며 빼낸 줄은 `firemate_dup_backup_v1`에 보관. 계획 펼침 맨 아래 `📈 지난 N번 계획`은 지난 6주기의 줄별 ✓ 표, 최근 90일 이체 중 방향이 저장 안 된 게 5건 이상이면 맨 위에 다시 가져오기 안내(`fmOpenImport`).
- 자산 분석의 `💱 환율 효과`(#fmFxCard): 미국 주식(type USD) 원화 수익을 주가(수량×(현재가−매입가)×지금 환율)와 환율(수량×매입가×(지금 환율−산 환율))로 나눈다. 산 환율은 종목별로 `firemate_buy_fx_v1`(백업 extras 포함)에 두고, 없으면 `IDX-USDKRW` 지난 1년 평균을 '추정'으로 쓴다. 기존 수익 계산은 그대로.
- 소비 분석의 `🔁 고정비`(#fmBillsCard): 지난 4달 중 3달 이상 같은 이름(숫자 뺀 것)·비슷한 금액(15%)·비슷한 날(5일)로 나간 지출을 자동으로 찾아 이번 달 나감/예정을 보여 준다. 저장하지 않음. 3만 원 이하이고 보험·통신·공과금이 아닌 건 구독으로 묶어 1년 합계(`#fmBillsSubs`), 아직 안 나간 고정비는 월급 주기 계획 펼침에도 한 줄. 홈 `이번 달 흐름`에는 지난달 이맘때보다 가장 많이 늘어난 카테고리 한 줄. 예전 수동 고정비(`#fmFixedList`, `rec`)는 계속 없음. `📅 다음 3달 예상`(#fmOutlookCard): 지난 3달 평균 수입(작은 이자 제외)·지출 − 계획의 투자·청약·비상금 − 작년 같은 달의 10만 원 이상 한 번성 지출. `fmFireDays(원)`은 저장된 FIRE 계획으로 그 돈만큼 FIRE가 며칠 늦어지는지(음수면 앞당김) 계산해 예산 초과·구독 1년·월말 스토리에 쓴다. 고정비의 이번 달 나감은 평소 금액 ±15% 결제, 없으면 평소 날 ±5일의 한 건(금액이 바뀐 달). 3달 예상의 작년 한 번성 지출은 보험·세금·자동차·회비·교육·검진 같은 해마다 나가는 종류만. FIRE 메인 `#fmFireSave`: 지난 6번 월급 주기 저축률((수입−지출)/수입). 홈 `#fmHomeAlert`: 최근 7일 지출 중 같은 카테고리 평소(지난 90일 중앙값)의 3배 이상(10만 원 이상)이거나 같은 곳 하루 3번 이상인 것 한 줄, 누르면 거래가 열리고 `firemate_alert_seen_v1`에 남아 다시 안 뜸. 가계부 `모은 돈`은 이번 달 `급여` 수입 전이면 `월급 전`(회색). 목록은 200건씩 `더 보기`. 가게 분류는 회사 단어를 뺀 앞 네 글자(`fmBrandKey`, 6글자 이상일 때)가 같으면 같은 가게로 묶어 함께 바꾸고 규칙 `expense|~키`로 다음 가져오기에도 적용. 가져오기 결과의 0원 줄은 `0원 N건 제외`. 소비 분석 `✂️ 줄이면 FIRE가 빨라져요`(#fmTrimCard): 지난 3달 평균 월 5만 원 이상 카테고리(기타 제외) 상위 3개를 20% 줄여 그만큼 매달 더 모으면 FIRE가 며칠 빨라지는지(`fmFireDays(0, 월 추가 적립)`). 소비 분석 `🌱 무지출 잔디`(#fmGrassCard): 최근 26주 지출 없는 날 초록 칸, 올해 무지출·지금 연속·최장 연속. 자산 분석 순자산 그래프에 월급·50만 원 이상 지출·1만 원 이상 배당 날 이모지 점, 아래 `📌 크게 움직인 날`(10만 원 이상, 상위 3개, 그날 일이 없으면 `주가·환율 변동`). 위시리스트 목표 달(저금통)은 사용자가 별로라 해서 뺐다. 자산 → 배당 탭 맨 아래(월별 상세 다음) `🎯 배당 월급`(#fmDivGoal, 목표는 `firemate_div_goal_v1`에 세후 월 원 단위, 백업 extras 포함): 지난 12개월 세후 배당(USD 85%, KRW 84.6%)/12 대 목표, FIRE 계획(같은 배당률)으로 목표 닿는 해, 갭을 바로 채우려면 배당률 높은 보유 종목 2개를 몇 주 더 사야 하는지, 종목별 1년 배당 성장(최근 12개월 주당 합 vs 그 전 12개월, 그 전 12개월 지급 횟수가 75% 미만이면 새 종목이라 뺌, 칸 카드로). 소비 분석 `💸 지난 월급이 어디로 갔나`(#fmFlowCard): 지난 월급 주기(월급날~다음 월급날 전)의 수입을 투자(`fmIsInvest`, 청약 제외)·비상금(`fmSafeSign>0`)·청약·고정비(`fmFixedBills` 키)·생활비·남은 돈으로 나눈 막대와 목록, 넘치면 `모자란 돈`. `💳 카드 실적`(#fmCardCard): 결제수단에 `카드`가 들어간 이번 달·지난달 지출, 누르면 실적 기준(만 원) 입력 → `firemate_card_goal_v1`(결제수단 이름 → 원, 백업 extras). FIRE 메인 `#fmFireReal`: 순자산 기록 90일 이상일 때 (순자산 변화 − 기간 수입 + 기간 지출) / (시작 + 저축/2)를 연율로(−30~40% 범위) 보여 주고, 계획 수익률 대비 FIRE가 몇 년 몇 개월 빨라/늦어지는지. 자산 → 시장 탭 `💱 환율 … 원 아래면 홈에 알려 주기`(`firemate_fx_goal_v1`, 백업 extras), 환율이 그 이하면 홈 `#fmHomeFx` 한 줄(누르면 시장 탭). ☀️ 오늘 알림(`fmHomeBrief`): 하루 처음 열 때 한 번만 아래에서 올라오는 팝업(`.fm-brief-pop`, 본 날은 `firemate_brief_seen_v1`, 테스트는 `__fmBriefTest`), 홈 줄은 없음 — 오늘·내일 나갈 고정비, 오늘·내일 카드값, 3일 안 배당락(같은 날끼리 묶음), 내일 월급날, 월말 7일 안에 실적 못 채운 카드. 배당 자료를 받은 뒤에 띄운다. 카드 실적 칸에서 결제일(`firemate_card_day_v1`)을 넣으면 `🗓️ 다음 카드값`(결제일이 있는 달의 전달 사용분, `fmCardDue`). 소비 분석 접힌 줄 `🧳 여행·이벤트`(`firemate_trips_v1`: 이름·기간 → 고정비 뺀 지출 합계·상위 카테고리·하루 평균, 지우기는 fmAsk). 종목 상세 `➕ 추가 매수 기록`: 수량·단가(·환율) 또는 체결 알림 붙여넣기 → fmAsk 후 수량·평균 매수가 갱신, 저장된 산 환율이 있으면 가중 평균, `firemate_buy_log_v1`에 이전 값과 함께 남겨 `마지막 매수 취소`. 위시리스트 화면 `🤔 살까 말까`(#fmBuyForm): 금액 → FIRE 며칠(`fmFireDays`), 이번 달 예산 남음/넘음, S&P500(`IDX-GSPC` 10년 연평균, 없으면 계획 수익률)에 10년 두면, 월 적립 며칠치. 자산 분석 `🩺 내 돈 건강검진`(#fmHealthCard): 비상금(현금+안전자산 계좌 / 최근 3달 평균 지출, 6개월↑🟢 3↑🟡), 레버리지 비중(QLD·TQQQ 등, 10%↓🟢 30%↓🟡), 달러 자산(80%↓🟢), 가장 큰 종목(35%↓🟢 55%↓🟡), 부채(순자산 20%↓🟡). 소비 분석 카드 순서: 월급 흐름 → 고정비 → 카드 실적 → 접힌 줄 3개(`.fm-fold` details: 3달 예상·줄이면 FIRE·무지출 잔디·여행, 닫힌 줄에 핵심 숫자 `#fmOutlookSum` `#fmTrimSum` `#fmGrassSum`). 더치페이(`fmSplitApply`, 앱 시작 뒤·가져오기 뒤): 카카오·토스로 들어온 남의 이체(방향 +1, 투자·저축·내계좌 아님)가 2일 안 1만 원 이상 지출의 1/n 또는 (n−1)/n(n=2~8, ±100원)이면 그 지출을 내 몫으로 줄이고(`splitFrom`에 원래 금액) 이체 분류를 `정산`으로, 짝은 `firemate_split_v1`; 식비·카페·술·여행·문화 지출만, n=2~6, ±10원(더 느슨했던 v3.5.196 규칙으로 저장된 짝은 시작할 때 다시 확인해 안 맞으면 원래 금액으로); 월급 흐름 카드의 `되돌리기`는 원래대로 + `firemate_split_off_v1`로 다시 안 함. 거래 편집 창 `#entryShop`: 같은 가게(`fmBrandKey`) 올해 횟수·합계·월평균(2번 이상일 때). FIRE 메인 `#fmFireRaise`: 최근 40일 안 달의 급여가 그 전 3달 중앙값보다 3% 이상 많으면 인상분과 절반을 더 모을 때 FIRE 몇 개월 빨라지는지, 아니면 30일 안 `상여금`을 투자할 때 며칠 앞당기는지, 누르면 계획 조정. 연간 결산(`yearReport`)에도 `🎬 스토리로 보기`(`fmShowStory`). 홈 월간 결산 카드의 `🎬 스토리로 보기`는 결산·가장 많이 쓴 곳·순자산·배당·칭찬 카드를 넘겨 보는 전체 화면(`.fm-story`, 저장 없음).
- 화면 글자를 다시 숫자로 읽지 않는다. 계산 결과는 `window.fmFireViewState` 같은 공통 값에서 가져온다.

- 뱅크샐러드 `뱅샐현황` 시트(가져오기 때, 고객정보 칸은 읽지 않음, 섹션 제목 열 기준 상대 위치): `firemate_bs_snapshot_v1`{at,cash,invest,ins}. 자유입출금·현금·전자금융 잔고는 이름이 같은 앱 계좌(투자 계좌 제외, 저축성 포함)에 넣고 나머지 합을 `balance.cash`로, 이전 값은 `firemate_bs_backup_v1` → 가져오기 칸 아래 `#fmBsNote`의 되돌리기. 자산 분석 `🔄 뱅크샐러드와 다른 종목`(#fmBsCard): 평가금액이 5%·10만 원 넘게 다른 보유 종목(누르면 종목 상세)과 앱에 없는 종목(`FM_BS_ETF`로 이름→티커), 카드 이름은 `🔄 뱅크샐러드 기준`: 맨 위 `📈 증권사 기준 원금 → 평가`(투자현황 합계), 다른 종목, 아래 `🧩 앱에 없는 자산`(1만 원 이상, 투자성·연금·실물·저축성 항목 중 앱 계좌 이름에 없는 것 + 앱 종목과 안 맞는 투자 상품, 기본은 체크 안 됨) → fmAsk 후 계좌로 추가(투자성·연금→investment, 실물→physical, 나머지→safe), 만든 id는 `firemate_bs_added_v1` → `방금 추가한 계좌 지우기`. 접힌 `🛡️ 보험`(#fmInsCard): 가계부 보험사 이름 출금 최근 3달 평균 = 월 보험료와 월급 대비 %, 뱅크샐러드 보험 목록(만기 30일 안이면 오늘 알림). 설정 `🏠 홈에 보일 것`(`firemate_home_hide_v1` → `body[data-home-hide]`). 카테고리 예산 `최근 3달 평균으로 채우기`(만 원 올림, 저장은 사용자가).
- 속도: `fmVer`(persist·`fmXferDirAdd` 때 증가)로 `fmIsInvest`·`fmSafeSign`는 거래별 WeakMap 캐시, `fmFixedBills`는 버전·오늘·거래 수로 캐시, `fmHomePlan`은 의존 값이 같으면 다시 그리지 않는다. 데이터를 바꾸면 반드시 persist를 거칠 것.
- 소비 분석 접힌 `🏷️ 태그`(#fmTagCard): 메모의 `#태그`별 올해 지출 합계, 누르면 목록 검색(올해). 앱을 열 때 하루 한 번(`firemate_auto_gmail_day_v1`), Gmail 로그인이 아직 유효하고(약 1시간, 창이 안 뜸) 마지막 가져오기가 12시간 넘었으면 홈 가져오기(`fmImportFromHome`)를 실행(테스트는 `__fmAutoGmailTest`).
- 설정 `내 데이터 보관`을 열면 `#fmStorageUse`: 이 사이트 저장 공간(약 5M자) 사용률과 지금 가져오기 속도로 몇 년 더 쓸 수 있는지, 60%부터 경고(닫힌 줄에도 `⚠️ 저장 공간 N%`). 거래 저장 구조는 그대로(옮기는 건 별도 결정). 그 안 `🧾 자동 변경 기록`(#fmAutoLog): 카드대금 이체·중복 결제 정리·더치페이·가게 자동 분류·잔고 맞추기·추가한 계좌를 한곳에서 건수와 되돌리기(fmAsk).
- 소비 분석 위 `요약 · 돈 흐름 · 더 보기`(카드의 `data-part`, 보기는 `#view-insights[data-ins-part]`, 세션에 기억, 기본 요약; 브라우저 테스트는 전부 보임). `fmMonthsBack(n)`: 이번 달 전 n달 'YYYY-MM'. 3달 예상은 월급 주기 계획을 저장한 적 없으면 지난 3달 실제 투자·비상금·청약 평균을 쓴다. 건강검진 비상금은 안전자산 계좌 + 이름이 세이프박스·비상금·파킹·CMA·예금·적금·모으기인 투자 외 계좌. 분류가 필요한 가게의 묶인 지점 이름도 보여 준다.
- 화면 문구는 짧게: 카드 아래 설명 문단은 두지 않는다(건강검진은 🟡·🔴일 때만 이유 한 줄).

## 코드 구조
- `index.html`: 마크업 → 앞부분 작은 스크립트 2개(접근성, 첫 화면 순자산) → 메인 스크립트(전역 IIFE: `data`, `persist()`, `getTx()`, `render*()`, 모든 화면의 기본 그리기) → `fm-pwa-updates`(업데이트, 인라인 유지) → `js/features.js`.
  - 메인 스크립트와 `const BUILD=`는 index.html에 있어야 한다. `sw.js`의 `validPage`가 이 문자열과 100KB 이상 크기를 확인한다.
- 화면 배치는 index.html 마크업이 최종 구조다(앱이 켜질 때 재배치하지 않는다). 화면 구조를 바꿀 땐 마크업을 직접 고친다.
- `js/features.js`: 화면별 기능 블록 12개. 맨 위 목차에 블록별 화면이 적혀 있다. 원래 순서대로 실행되고, 블록마다 try/catch로 감싸 한 기능의 오류가 다른 기능을 막지 않는다.
- 스타일은 `app.css`. body 안의 `<style id="fm-premium-finance">` 1개만 인라인으로 남아 있다(옮기면 `!important`가 app.css 상한을 넘음).
- 메인 스크립트가 내보내는 도우미: `fmGo`, `fmOpenEntry`, `fmFireViewState`, `fmRefreshNetWorth`, `fmOpenImport`, `fmLiveData()`(메모리의 현재 데이터, 읽기 전용으로 쓸 것). `fmAsk`도 메인 스크립트에 있다.
- 소스 문자열을 검사하는 테스트는 `tests/app-source.cjs`(index.html + js 파일 합친 것)를 쓴다.
- 테스트 전용 표시 플래그: `__fmMonthReportAnyDay`, `__fmWeekReportAnyDay`, `__fmMilestoneTest`, `__fmStartTest`, `__fmYearAnyDay`(홈 연말 결산 줄).

## 코드를 늘리지 않는 규칙 (자동 검사)
- **새 기능은 새 `<script>`/`<style>` 블록이나 `js/features.js` 블록을 덧붙이지 말고 해당 화면의 기존 코드를 고친다.**
- `scripts/check_app.py`가 `scripts/code_budget.json`의 상한(스크립트·스타일 블록 수, `js/` 크기, `index.html`+`js/` 합계 크기, 기능 블록 수, `app.css`의 `!important` 수)을 넘으면 실패한다. 기능 블록을 메인 스크립트로 합치면 index.html은 커져도 합계가 줄면 통과한다.
- 정리해서 숫자가 줄면 상한도 같이 낮춘다(다시 늘어나지 않게). 상한은 필요한 만큼만 올리고(사용자가 묻지 말고 진행하라고 함), PR 본문에 올린 폭을 적는다.

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
