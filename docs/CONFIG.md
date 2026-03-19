# CONFIG — 환경변수/설정값/운영 튜닝 가이드

## 1) Cloudflare Pages Variables and Secrets (필수)
Cloudflare Pages 프로젝트 → **Settings → Variables and Secrets** 에 아래를 등록합니다.

### 필수
- **NOTION_TOKEN**  
  Notion Integration Token (secret)

- **NOTION_DATABASE_ID**  
  Notion DB ID (출고 접수 관리 database ID)

- **TRACKING_ADMIN_PASS**  
  송장 반영(운영자 페이지) 실행용 비밀번호

### 선택
- **NOTION_DATA_SOURCE_ID**  
  Notion data source ID  
  비워두면 코드가 `NOTION_DATABASE_ID`로 database를 읽고 첫 번째 data source를 자동 탐색합니다.

⚠️ 주의  
- 이 값들은 **GitHub에 커밋/문서 저장 금지**
- 값 수정 후에는 **새 배포**가 반영되어야 실제 런타임에서 사용됩니다.

---

## 2) 노션 속성명(필수 일치)
코드에서 문자열로 참조하는 속성명

- 접수번호(Title)
- 고객명(Rich text)
- 연락처(Rich text)
- 우편번호(Rich text)
- 기본주소(Rich text)
- 상세주소(Rich text)
- 요청사항(Rich text)
- 처리상태(Status)
- 송장번호(Rich text)
- 출고일시(Date)
- 접수일시(Created time)

속성명이 다르면 조회/반영 실패가 발생합니다.

---

## 3) Notion SDK / API 구조(중요)
현재 코드는 **Notion SDK v5** 기준입니다.

- 조회: `notion.dataSources.query()`
- 생성: `parent: { data_source_id: ... }`
- data source ID는
  - `NOTION_DATA_SOURCE_ID`를 직접 쓰거나
  - `NOTION_DATABASE_ID`에서 자동 탐색합니다.

즉 예전처럼 `notion.databases.query()` 기준으로 보면 안 됩니다.

---

## 4) 성능/운영 설정값(매우 중요)

### A. CHUNK (클라이언트/프론트에서 분할 전송 단위)
- 의미: 송장 반영에서 엑셀 아이템을 **몇 개씩 나눠서 API로 보낼지**
- CHUNK가 **작아질수록**
  - ✅ 한 번 실패해도 영향 범위가 작음
  - ❌ API 호출 횟수(Functions Requests)가 증가 → Cloudflare 무료 한도에 불리
- CHUNK가 **커질수록**
  - ✅ 호출 횟수 감소
  - ❌ 한 번 실패하면 실패 범위가 커짐 / 요청 크기 증가

권장:
- 기본: 100~150
- 엑셀 건수가 1,000건 이상일 때: 150~250 시도(문제 생기면 다시 낮추기)

---

### B. UPDATE_DELAY_MS (서버에서 Notion 업데이트 사이 지연)
- 의미: Notion pages.update 호출을 너무 빠르게 연속 실행하면 제한/실패 가능
- 값을 **올리면**
  - ✅ 안정성 증가
  - ❌ 실행시간 증가
- 값을 **내리면**
  - ✅ 빨라짐
  - ❌ Notion API 제한에 걸릴 확률 증가

권장:
- 기본: 300~500ms
- 오류가 잦으면: 700~1200ms

---

### C. DEFAULT_LOOKBACK_DAYS (최근 N일 조회)
- 의미: “출고준비” 상태인 페이지를 최근 N일에서만 찾음
- 값을 **늘리면**
  - ✅ 오래된 접수도 매칭 가능
  - ❌ 조회량 증가 → 느려짐/호출 증가

권장:
- 기본: 14
- 간헐적으로 오래된 건 반영 필요 시: 21~30

---

### D. (옵션) 미일치 상태 확인 — MISS_CHECK_DELAY_MS / MAX_MISS_STATUS_CHECK
송장 반영 “미리보기”에서 **미일치 건의 이유를 노션에서 추가 조회**하는 기능

- MISS_CHECK_DELAY_MS
  - 미일치 1건 조회 후 대기(ms)
  - 권장: 80~200ms

- MAX_MISS_STATUS_CHECK
  - 미일치 상태 확인을 **최대 몇 건까지 할지(성능 보호)**
  - 권장: 30 (기본)
  - 늘리면 원인 파악은 쉬워지지만 느려지고 호출/CPU 사용 증가

운영 권장:
- 기본 OFF
- 원인 파악이 필요할 때만 ON

---

## 5) Cloudflare 무료 사용량 관점(운영 감각)
Cloudflare Pages / Functions 무료 구간에서는 **요청 수와 실행량**을 아껴 쓰는 운영이 중요합니다.

운영 팁:
- CHUNK를 너무 작게 하지 않기
- “미일치 상태 확인(느림)”은 평소 OFF
- 엑셀 반영은 꼭 필요한 때에만 실행
- 대량 반영 후에는 샘플 2~3건만 검증하고 반복 실행을 줄이기

---

## 6) 문서 업데이트 규칙
- 설정값을 바꾸면 `CHANGELOG.md`에 기록
- 설정값의 의미 / 권장값 / 왜 조정했는지 함께 남기기
