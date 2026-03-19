# FILES_MAP — 파일 역할 지도

## 1) 웹 페이지(정적 HTML)
- **public/index.html**
  - 고객 배송정보 입력 폼
  - 주소 검색(카카오 우편번호) + 제출 후 접수증 표시
  - API 호출: `/api/submit`

- **public/status.html**
  - 고객 접수 조회 페이지
  - API 호출: `/api/status`

- **public/tracking.html**
  - 운영자용 송장번호 자동 반영
  - CJ 엑셀을 브라우저에서 읽고(서버 업로드 X), 필요한 값만 `/api/tracking-import`로 전송
  - 옵션: 덮어쓰기 / 출고완료 자동 / 미일치 상태 확인(느림) / 조회기간

---

## 2) Cloudflare Pages Functions
- **functions/api/submit.js**
  - 배송정보를 Notion에 저장(접수 생성)
  - env: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_DATA_SOURCE_ID(선택)`

- **functions/api/status.js**
  - 접수번호로 상태 조회
  - env: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_DATA_SOURCE_ID(선택)`

- **functions/api/recover.js**
  - 고객명 / 연락처 / 날짜로 접수번호 다시 찾기
  - env: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_DATA_SOURCE_ID(선택)`

- **functions/api/tracking-import.js**
  - 송장 반영 엔진(출고준비 매칭 → 송장번호 업데이트)
  - env: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `TRACKING_ADMIN_PASS`, `NOTION_DATA_SOURCE_ID(선택)`
  - 주요 설정값: `DEFAULT_LOOKBACK_DAYS`, `UPDATE_DELAY_MS`, `MISS_CHECK_DELAY_MS`, `MAX_MISS_STATUS_CHECK`

---

## 3) 공통 유틸
- **functions/_lib/security.js**
  - 보안 헤더 / same-origin 체크 / rate limit / 공통 JSON 응답

- **functions/_lib/notion-data-source.js**
  - database ID 기준으로 data source ID를 찾는 헬퍼
  - `NOTION_DATA_SOURCE_ID`가 있으면 우선 사용

---

## 4) 기타
- **package.json**
  - 의존성(@notionhq/client 등) 및 프로젝트 정보

- **wrangler.jsonc**
  - Cloudflare Pages 런타임 / compatibility 설정

- **docs/**
  - 운영/유지보수 문서
