# Claude에게 넘길 통합 안내

## 이번 PR의 변경 범위

`arcade/moonward/` 신규 파일만 추가했다. `index.html`, `app.css`, `sw.js`, `js/`, `scripts/`, 공용 설정·의존성·워크플로, 기존 게임 파일은 변경하지 않았다. 병합·배포는 수행하지 않는다.

## 1. 아케이드 메뉴

최신 main을 기준으로 별도 통합 작업에서 `arcade/index.html`의 `.grid`에 아래 링크를 기존 카드 스타일로 추가한다. 이미지 경로는 아케이드 인덱스 기준이다.

```html
<a class="game" href="./moonward/">
  <img src="./moonward/art/archer.webp" alt="" width="88" height="88" loading="lazy">
  <div><strong>월광 수호단</strong><small>랜덤 소환 · 합성 · 18웨이브 방어</small></div>
</a>
```

금융 앱 내부에도 게임 목록이 있다면 담당자가 현재 네비게이션 규칙에 맞춰 `./arcade/moonward/`로 연결한다. 게임 모듈을 금융 앱에 import하거나 게임 아트를 금융 첫 화면에서 preload하지 않는다. 현재 게임 나가기 목적지는 `../index.html`이며 아케이드 목록으로 돌아간다.

## 2. PWA 캐시

검토 기준 main: `47097df4a42a84fec6ac5645d8a1b0e64bbeb87a`.
이 버전의 `sw.js`는 `/arcade/` 리소스를 이미 network-first로 가져오고 성공 응답을 현재 앱 캐시에 넣는다. 따라서 게임 진입 후 로드가 완료된 자산은 그 기존 정책의 대상이다. **이번 작업은 설치형 PWA/실기기 오프라인 검증을 하지 않았다.**

무조건 전체 게임을 금융 앱의 `ASSETS`에 추가하면 첫 설치·업데이트 때 아트를 모두 내려받게 된다. 이 게임은 진입 때만 로드한다는 요구에 맞춰 기존 arcade 런타임 캐시 정책을 우선 유지하고, 다음을 통합 후 확인한다.

- 메뉴와 `arcade/moonward/` 및 `arcade/moonward/index.html` 경로의 오프라인 재진입.
- `style.css`, `app.mjs`, `engine.mjs`, `data.mjs`, `art.mjs`.
- `art/forest.webp`, `art/archer.webp`, `art/ember.webp`, `art/frost.webp`, `art/thorn.webp`, `art/bell.webp`, `art/wisp.webp`, `art/wolf.webp`, `art/beetle.webp`, `art/boss.webp`.
- 버전 업데이트 후 구 캐시 삭제와 새 자산 재로드. 최초 진입 전에는 오프라인 플레이가 보장되지 않는다.

캐시 이름·버전을 수정해야 한다면 저장소의 최신 CLAUDE.md 버전 갱신 규칙에 따라 금융 담당자가 동기화한다. 게임이 공용 service worker를 등록하거나 기존 캐시를 삭제하게 만들지 않는다.

## 3. 저장·종료·확인

- 저장 키 `firemate_moonward_v1`을 금융 데이터 초기화나 마이그레이션과 섞지 않는다.
- iframe 대신 독립 페이지 링크가 기본이다. iframe 통합을 원하면 별도 수명주기 계약과 숨김/닫힘 검증이 필요하다.
- 메뉴 진입 → 3명 소환 → 전투 → 합성 → 저장 후 나가기 → 이어하기를 실제 기기에서 확인한다.
- 금융 앱 데이터, 기존 게임, 뒤로가기, PWA 업데이트가 그대로 작동하는지 통합 회귀를 수행한다.
- 320px에서는 세로 스크롤을 허용한다. 화면 높이를 강제로 고정해 하단 조작을 잘라내지 않는다.
