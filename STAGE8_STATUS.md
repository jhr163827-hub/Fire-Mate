# FIRE MATE 8단계 진행 기록

상태: 진행 중. 계산 정확성 기준 검증 완료, 전략 비교·포트폴리오·UI·최종 CI/배포 미완료.
기준/마지막 정상 배포: cce198220aafbca0485675227d104fd853c67274 / v3.5.34 / fire-mate-v3-5-34.

## 완료 및 기준
- 최신 main 및 STAGE7_STATUS.md 직접 확인. 기존 FIRE/은퇴/전략 화면과 저장 구조 분석.
- 변경 전 금융 2개, E2E 48개 통과. Python 43개 통과(83.567초). 기준 93개 실패 0/skip 0.
- 독립 폐쇄형 연금종가 계산으로 실제 생산 projection/series의 5·10·20·30년 결과를 대조: 초기 자산 0/15000, 월 투자 0/300, 연 수익률 -30/0/7/40%. 목표 최초 도달 월과 월말 추가 투자, 잘못된 입력도 검증. 금융 테스트 1개 추가, 3개 통과.
- 연 수익률을 유효 월 수익률로 변환하는 기존 수식은 정확해 변경하지 않음. 기존 93개 테스트 유지.

## 발견 및 남은 작업
- 분석 기간 소수 입력 시 배열의 소수 인덱스 조회로 최종 자산이 잘못 표시될 수 있음. 30년 고정 문구도 실제 분석 기간과 불일치.
- 자가배당 종목 수익률 입력은 음수를 막지만 계산기는 음수를 지원함.
- 잉여 배당 현금이 재투자되지 않는 기존 가정이 숨겨져 있음. 명시/선택 및 실질 금액 표시 점검 필요.
- 모바일 종목 삭제 버튼 폭 42px. FIRE/은퇴 화면의 여백·요약·목표 차액/비중/분류 및 중복 목표 보유액 집계 점검 필요.
- 단계: 계산 기준 → 전략 비교 → 포트폴리오 → 모바일 UI → 전체 검증/CI/Pages.
- 앱 변경은 버전/캐시 함께 증가, 로컬 전체 검증 후 main에 반영. 실패 상태는 정상 배포로 기록하지 않음.
- Android 뒤로가기 제스처는 별도 과제이며 수정하지 않음.

## 재개 명령
```sh
git fetch origin main
git switch main
git pull --ff-only origin main
cat STAGE8_STATUS.md
npm install --no-audit --no-fund
npx playwright install --with-deps chromium
npm run test:finance
npm run test:e2e
pip install playwright pillow
python -m playwright install --with-deps chromium
# 별도 터미널에서 python3 -m http.server 8000 --bind 127.0.0.1
FIRE_MATE_URL=http://127.0.0.1:8000 python -m unittest discover -s tests -p test_home_responsive.py -v
```
Work 브라우저 설치 대안과 기존 검증 내역은 STAGE7_STATUS.md 참조. 이미 완료한 계산 기준 검증은 반복 구현하지 않는다. 재개 시 최신 main과 기록을 대조한다.
